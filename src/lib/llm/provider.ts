/**
 * OpenRouter provider module.
 *
 * Encapsulates all OpenRouter API integration, error handling, normalization,
 * and structured logging. The module abstracts provider-specific details
 * and normalizes responses into a provider-neutral interface.
 *
 * This module is server-only and never accessed from client code.
 */

import { getProviderConfig, getApiKey } from "./config";

// ============================================================================
// Constants
// ============================================================================

const OPENROUTER_API_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000; // 30-second timeout as per spec

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
  const hasStatus = (e: unknown): e is { status?: number } => {
    return typeof e === "object" && e !== null && "status" in e;
  };

  if (hasStatus(error)) {
    const status = error.status;

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

    if (status && status >= 500) {
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

function normalizeFinishReason(openRouterReason: string | null | undefined): FinishReason {
  // Map OpenRouter finish reasons to normalized finishReason
  if (!openRouterReason) {
    return "stop";
  }

  switch (openRouterReason) {
    case "stop":
      return "stop";
    case "length":
      return "max_tokens";
    case "content_filter":
      return "stop";
    case "tool_calls":
      return "stop";
    default:
      return "stop";
  }
}

// ============================================================================
// Main Provider Function
// ============================================================================

/**
 * Generate a response from the OpenRouter LLM API.
 *
 * Normalizes the request, calls the OpenRouter API with a 30-second timeout,
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
    // Transform request to OpenRouter format
    const messages = [
      { role: "system", content: request.systemPrompt },
      ...request.userMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    const openRouterRequest = {
      model: config.model,
      messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
    };

    // Make API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(OPENROUTER_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": config.siteUrl,
          "X-Title": config.appName,
        },
        body: JSON.stringify(openRouterRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check response status
      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw { status: response.status, message: errorBody };
      }

      // Parse response
      const responseData = await response.json();

      // Validate response structure
      if (!responseData.choices || !Array.isArray(responseData.choices) || responseData.choices.length === 0) {
        throw new Error("Unexpected response format: no choices array");
      }

      const firstChoice = responseData.choices[0];
      if (!firstChoice.message || typeof firstChoice.message.content !== "string") {
        throw new Error("Unexpected response format: no message content");
      }

      const durationMs = Date.now() - startTime;

      const successResponse: ProviderSuccessResponse = {
        type: "success",
        text: firstChoice.message.content,
        finishReason: normalizeFinishReason(firstChoice.finish_reason),
        inputTokens: responseData.usage?.prompt_tokens || 0,
        outputTokens: responseData.usage?.completion_tokens || 0,
      };

      // Log structured event
      logStructuredEvent({
        timestamp: new Date().toISOString(),
        model: config.model,
        durationMs,
        inputTokens: successResponse.inputTokens,
        outputTokens: successResponse.outputTokens,
        finishReason: firstChoice.finish_reason,
        requestId,
      });

      return successResponse;
    } finally {
      clearTimeout(timeoutId);
    }
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
