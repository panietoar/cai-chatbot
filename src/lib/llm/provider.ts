/**
 * Anthropic provider module.
 *
 * Encapsulates all Anthropic API integration, error handling, normalization,
 * and structured logging. The module abstracts provider-specific details
 * and normalizes responses into a provider-neutral interface.
 *
 * This module is server-only and never accessed from client code.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getProviderConfig, getApiKey } from "./config";

// ============================================================================
// Type Definitions
// ============================================================================

export type FinishReason = "stop" | "max_tokens" | "end_turn";

export type ErrorCode =
  | "TIMEOUT"
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "PROVIDER_ERROR";

export interface UserMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderRequest {
  systemPrompt: string;
  userMessages: UserMessage[];
  maxTokens: number;
  temperature: number;
  requestId?: string;
}

export interface ProviderSuccessResponse {
  type: "success";
  text: string;
  finishReason: FinishReason;
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderErrorResponse {
  type: "error";
  errorCode: ErrorCode;
  userSafeMessage: string;
}

export type ProviderResponse = ProviderSuccessResponse | ProviderErrorResponse;

// ============================================================================
// Logging
// ============================================================================

interface StructuredLog {
  timestamp: string;
  model: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string | null;
  requestId?: string;
  errorCode?: string;
}

function logStructuredEvent(event: StructuredLog): void {
  const safeEvent = {
    timestamp: event.timestamp,
    model: event.model,
    durationMs: event.durationMs,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    finishReason: event.finishReason,
    requestId: event.requestId,
    errorCode: event.errorCode,
  };
  console.log(JSON.stringify(safeEvent));
}

// ============================================================================
// Error Mapping
// ============================================================================

interface ErrorMapEntry {
  errorCode: ErrorCode;
  userSafeMessage: string;
}

function mapErrorToResponse(error: unknown): ErrorMapEntry {
  const isAbortError = error instanceof Error && error.name === "AbortError";
  if (isAbortError) {
    return {
      errorCode: "TIMEOUT",
      userSafeMessage:
        "The request timed out. Please try again in a moment.",
    };
  }

  // Check for HTTP error status codes
  // Handle both real Anthropic.APIError and mocked versions
  const hasStatus = (e: unknown): e is { status?: number } => {
    return (
      typeof e === "object" &&
      e !== null &&
      ("status" in e || e instanceof Error)
    );
  };

  if (hasStatus(error) || (error instanceof Error && error.name === "APIError")) {
    const status = hasStatus(error) ? error.status : undefined;

    if (status === 401 || status === 403) {
      return {
        errorCode: "AUTH_FAILED",
        userSafeMessage:
          "An authentication error occurred. Please contact support.",
      };
    }

    if (status === 429) {
      return {
        errorCode: "RATE_LIMITED",
        userSafeMessage:
          "The system is temporarily busy. Please try again shortly.",
      };
    }

    if (status === 400) {
      return {
        errorCode: "BAD_REQUEST",
        userSafeMessage:
          "The request could not be processed. Please try again.",
      };
    }

    // Check if it's an API error without a recognized status code
    if (error instanceof Error && error.name === "APIError") {
      return {
        errorCode: "PROVIDER_ERROR",
        userSafeMessage:
          "An unexpected error occurred. Please try again later.",
      };
    }
  }

  // Unknown or network error
  return {
    errorCode: "PROVIDER_ERROR",
    userSafeMessage:
      "An unexpected error occurred. Please try again later.",
  };
}

// ============================================================================
// Response Normalization
// ============================================================================

function normalizeFinishReason(anthropicReason: string | null): FinishReason {
  // Map Anthropic stop reasons to normalized finishReason
  if (!anthropicReason) {
    return "stop";
  }

  switch (anthropicReason) {
    case "end_turn":
      return "stop";
    case "max_tokens":
      return "max_tokens";
    case "stop_sequence":
      return "stop";
    default:
      return "stop";
  }
}

// ============================================================================
// Main Provider Function
// ============================================================================

/**
 * Generate a response from the Anthropic LLM.
 *
 * Normalizes the request, calls the Anthropic API with a 30-second timeout,
 * normalizes the response, and logs structured events. All errors are caught
 * and mapped to typed error responses; the function never throws.
 *
 * @param request - The provider request containing prompt, messages, and parameters
 * @param requestId - Optional request identifier for tracing (typically passed by orchestration layer)
 * @returns A ProviderResponse (success or error), never throws
 */
export async function generateResponse(
  request: ProviderRequest
): Promise<ProviderResponse> {
  const startTime = Date.now();
  const config = getProviderConfig();
  const apiKey = getApiKey();
  const requestId = request.requestId;

  try {
    // Initialize Anthropic client with timeout
    const client = new Anthropic({
      apiKey,
      timeout: 30_000, // 30-second timeout as per spec
    });

    // Make API call
    const response = await client.messages.create({
      model: config.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      system: request.systemPrompt,
      messages: request.userMessages,
    });

    // Extract and normalize response
    const firstContent = response.content[0];
    if (!firstContent || firstContent.type !== "text") {
      throw new Error("Unexpected response format: no text content");
    }

    const durationMs = Date.now() - startTime;

    const successResponse: ProviderSuccessResponse = {
      type: "success",
      text: firstContent.text,
      finishReason: normalizeFinishReason(response.stop_reason),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };

    // Log structured event
    logStructuredEvent({
      timestamp: new Date().toISOString(),
      model: config.model,
      durationMs,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      finishReason: response.stop_reason,
      requestId,
    });

    return successResponse;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMapping = mapErrorToResponse(error);

    // Log error event
    logStructuredEvent({
      timestamp: new Date().toISOString(),
      model: config.model,
      durationMs,
      requestId,
      errorCode: errorMapping.errorCode,
    });

    const errorResponse: ProviderErrorResponse = {
      type: "error",
      errorCode: errorMapping.errorCode,
      userSafeMessage: errorMapping.userSafeMessage,
    };

    return errorResponse;
  }
}
