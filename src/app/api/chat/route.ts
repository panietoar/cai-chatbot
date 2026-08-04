import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  validateChatRequest,
  mapValidationFailureToHttp422,
} from "../../../lib/validation/chat-request";
import { checkInputGuardrails } from "../../../lib/guardrails/input-guardrails";
import { retrieveKnowledge } from "../../../lib/retrieval/retrieval";
import {
  checkRetrievalGuardrails,
  SAFE_FALLBACK_MESSAGE,
} from "../../../lib/guardrails/retrieval-guardrails";
import { assembleContext } from "../../../lib/prompts/context";
import { generateResponse } from "../../../lib/llm/provider";
import { checkOutputGuardrails } from "../../../lib/guardrails/output-guardrails";
import { getProviderConfig } from "../../../lib/llm/config";
import type { ChatSuccessResponse, ChatErrorResponse } from "../../../lib/chat/contracts";
import type { UserMessage } from "../../../lib/llm/provider";

const USER_SAFE_UNSAFE_INPUT_MESSAGE =
  "Your request could not be processed due to policy restrictions. Please rephrase your question.";

const USER_SAFE_INTERNAL_ERROR_MESSAGE =
  "An unexpected error occurred. Please try again later.";

// ============================================================================
// Structured Logging
// ============================================================================

interface OrchestrationLogEvent {
  timestamp: string;
  requestId: string;
  durationMs: number;
  outcome: "success" | "fallback" | "error";
  retrievalMatchCount?: number;
  retrievalIds?: string[];
  promptVersion?: string;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: string;
  reason?: string;
  originalText?: string;
}

function logOrchestration(event: OrchestrationLogEvent): void {
  // Include all fields that have values, omit undefined ones
  const safeEvent: Record<string, unknown> = {
    timestamp: event.timestamp,
    requestId: event.requestId,
    durationMs: event.durationMs,
    outcome: event.outcome,
  };

  if (event.retrievalMatchCount !== undefined) {
    safeEvent.retrievalMatchCount = event.retrievalMatchCount;
  }
  if (event.retrievalIds !== undefined) {
    safeEvent.retrievalIds = event.retrievalIds;
  }
  if (event.promptVersion !== undefined) {
    safeEvent.promptVersion = event.promptVersion;
  }
  if (event.modelName !== undefined) {
    safeEvent.modelName = event.modelName;
  }
  if (event.inputTokens !== undefined) {
    safeEvent.inputTokens = event.inputTokens;
  }
  if (event.outputTokens !== undefined) {
    safeEvent.outputTokens = event.outputTokens;
  }
  if (event.errorCode !== undefined) {
    safeEvent.errorCode = event.errorCode;
  }
  if (event.reason !== undefined) {
    safeEvent.reason = event.reason;
  }
  // Only log originalText for debugging rejected outputs, never for normal flow
  if (event.originalText !== undefined) {
    safeEvent.originalText = event.originalText;
  }

  console.log(JSON.stringify(safeEvent));
}

// ============================================================================
// History Conversion
// ============================================================================

/**
 * Convert ChatRequest history to UserMessage[] format.
 * Each ChatTurn with {userMessage, assistantMessage} becomes two UserMessages.
 */
function convertHistoryToMessages(
  history: Array<{ userMessage: string; assistantMessage: string }>
): UserMessage[] {
  const messages: UserMessage[] = [];

  for (const turn of history) {
    messages.push({
      role: "user",
      content: turn.userMessage,
    });
    messages.push({
      role: "assistant",
      content: turn.assistantMessage,
    });
  }

  return messages;
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  let requestId = "";

  try {
    // Generate request ID for tracing
    requestId = randomUUID();

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ChatErrorResponse = {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON in request body.",
          details: [
            {
              path: "",
              code: "parse_error",
              message: "The request body must be valid JSON.",
            },
          ],
        },
      };
      return NextResponse.json(errorResponse, { status: 422 });
    }

    // Validate request structure
    const validationResult = validateChatRequest(body);

    if (!validationResult.ok) {
      const httpResponse = mapValidationFailureToHttp422(validationResult);
      return NextResponse.json(httpResponse.body, { status: httpResponse.status });
    }

    // Check input guardrails
    const guardrailResult = checkInputGuardrails(validationResult.data.message);

    if (!guardrailResult.safe) {
      const errorResponse: ChatErrorResponse = {
        error: {
          code: "UNSAFE_INPUT",
          message: USER_SAFE_UNSAFE_INPUT_MESSAGE,
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // ========================================================================
    // Retrieval Pipeline
    // ========================================================================

    const retrievalResult = retrieveKnowledge(validationResult.data.message);
    const retrievalGuardrailResult = checkRetrievalGuardrails(retrievalResult);

    if (!retrievalGuardrailResult.safe) {
      const durationMs = Date.now() - startTime;
      logOrchestration({
        timestamp: new Date().toISOString(),
        requestId,
        durationMs,
        outcome: "fallback",
        reason: retrievalGuardrailResult.reason,
        retrievalMatchCount: retrievalResult.matches.length,
      });

      const successResponse: ChatSuccessResponse = {
        message: SAFE_FALLBACK_MESSAGE,
      };
      return NextResponse.json(successResponse, { status: 200 });
    }

    // ========================================================================
    // Context Assembly
    // ========================================================================

    const convertedHistory = convertHistoryToMessages(
      validationResult.data.history
    );

    const contextResult = assembleContext({
      systemPromptVersion: "v1",
      knowledge: retrievalGuardrailResult.validEntries,
      currentQuery: validationResult.data.message,
      conversationHistory: convertedHistory,
      requestId,
    });

    // Check if context assembly returned an error
    if ("reason" in contextResult) {
      const durationMs = Date.now() - startTime;
      logOrchestration({
        timestamp: new Date().toISOString(),
        requestId,
        durationMs,
        outcome: "error",
        reason: contextResult.reason,
        errorCode: "CONTEXT_ASSEMBLY_FAILED",
      });

      const errorResponse: ChatErrorResponse = {
        error: {
          code: "INTERNAL_ERROR",
          message: USER_SAFE_INTERNAL_ERROR_MESSAGE,
        },
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // ========================================================================
    // Provider Invocation
    // ========================================================================

    const providerResponse = await generateResponse({
      systemPrompt: contextResult.systemPrompt,
      userMessages: contextResult.messages,
      maxTokens: 1000,
      temperature: 0.3,
      requestId,
    });

    if (providerResponse.type === "error") {
      const durationMs = Date.now() - startTime;
      logOrchestration({
        timestamp: new Date().toISOString(),
        requestId,
        durationMs,
        outcome: "error",
        errorCode: providerResponse.errorCode,
      });

      const errorResponse: ChatErrorResponse = {
        error: {
          code: "INTERNAL_ERROR",
          message: providerResponse.userSafeMessage,
        },
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // ========================================================================
    // Output Guardrails
    // ========================================================================

    const outputGuardrailResult = checkOutputGuardrails(providerResponse.text);

    if (!outputGuardrailResult.safe) {
      const durationMs = Date.now() - startTime;
      logOrchestration({
        timestamp: new Date().toISOString(),
        requestId,
        durationMs,
        outcome: "fallback",
        reason: outputGuardrailResult.reason,
        originalText: outputGuardrailResult.originalText,
      });

      const successResponse: ChatSuccessResponse = {
        message: SAFE_FALLBACK_MESSAGE,
      };
      return NextResponse.json(successResponse, { status: 200 });
    }

    // ========================================================================
    // Success Path
    // ========================================================================

    const durationMs = Date.now() - startTime;
    logOrchestration({
      timestamp: new Date().toISOString(),
      requestId,
      durationMs,
      outcome: "success",
      retrievalMatchCount: retrievalGuardrailResult.validEntries.length,
      retrievalIds: retrievalGuardrailResult.validEntries.map(
        (entry) => entry.entry.id
      ),
      promptVersion: contextResult.promptVersion,
      modelName: getProviderConfig().model,
      inputTokens: providerResponse.inputTokens,
      outputTokens: providerResponse.outputTokens,
    });

    const successResponse: ChatSuccessResponse = {
      message: providerResponse.text,
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    // Log error server-side but don't expose details to client
    console.error("Unexpected error in /api/chat:", error);

    const durationMs = Date.now() - startTime;
    logOrchestration({
      timestamp: new Date().toISOString(),
      requestId,
      durationMs,
      outcome: "error",
      errorCode: "UNEXPECTED_ERROR",
    });

    const errorResponse: ChatErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: USER_SAFE_INTERNAL_ERROR_MESSAGE,
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
