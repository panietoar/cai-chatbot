/**
 * Tests for the Anthropic provider module.
 *
 * These tests verify:
 * - Successful response normalization
 * - Error handling for all error categories
 * - Structured logging (mocked)
 * - API key security (never logged)
 * - Configuration validation
 * - Token counting and finishReason mapping
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateResponse,
  type ProviderRequest,
  type ProviderSuccessResponse,
  type ProviderErrorResponse,
} from "./provider";
import * as configModule from "./config";

// ============================================================================
// Setup: Mock Anthropic and Config
// ============================================================================

// Mock the Anthropic client
vi.mock("@anthropic-ai/sdk", () => {
  const MockAPIError = class MockAPIError extends Error {
    status?: number;

    constructor(message: string, options?: { status?: number }) {
      super(message);
      this.name = "APIError";
      this.status = options?.status;
    }
  };

  return {
    default: vi.fn(),
    APIError: MockAPIError,
  };
});

// Mock the config module
vi.mock("./config", () => ({
  getProviderConfig: vi.fn(),
  getApiKey: vi.fn(),
}));

// Mock console.log to capture logging
const consoleLogMock = vi.spyOn(console, "log").mockImplementation(() => {});

// Helper functions to create mock errors
// ============================================================================

function createMockAPIError(message: string, status?: number): Error {
  // Create a plain error object that has the APIError properties
  const error = Object.create(Error.prototype);
  error.message = message;
  error.name = "APIError";
  error.status = status;
  return error as Error;
}

beforeEach(() => {
  consoleLogMock.mockClear();
  vi.clearAllMocks();

  // Default config mock
  vi.mocked(configModule.getProviderConfig).mockReturnValue({
    model: "claude-haiku-4-5-20251001",
    validatedAt: new Date().toISOString(),
  });

  vi.mocked(configModule.getApiKey).mockReturnValue("test-api-key");
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Test Cases
// ============================================================================

describe("provider.ts - generateResponse", () => {
  // ========================================================================
  // Successful Response Tests
  // ========================================================================

  it("should return success response with normalized fields", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: "This is a test response.",
        },
      ],
      stop_reason: "end_turn",
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    });

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "You are helpful.",
      userMessages: [{ role: "user", content: "Hello" }],
      maxTokens: 500,
      temperature: 0.7,
      requestId: "req-123",
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("success");
    const successResponse = response as ProviderSuccessResponse;
    expect(successResponse.text).toBe("This is a test response.");
    expect(successResponse.inputTokens).toBe(100);
    expect(successResponse.outputTokens).toBe(50);
  });

  it("should map Anthropic stop_reason 'end_turn' to finishReason 'stop'", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Response" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("success");
    const successResponse = response as ProviderSuccessResponse;
    expect(successResponse.finishReason).toBe("stop");
  });

  it("should preserve finishReason 'max_tokens'", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Response" }],
      stop_reason: "max_tokens",
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("success");
    const successResponse = response as ProviderSuccessResponse;
    expect(successResponse.finishReason).toBe("max_tokens");
  });

  it("should log structured event on success", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Response" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
      requestId: "req-456",
    };

    await generateResponse(request);

    expect(consoleLogMock).toHaveBeenCalled();
    const logCall = consoleLogMock.mock.calls[0]?.[0];
    expect(typeof logCall).toBe("string");

    const logData = JSON.parse(logCall as string);
    expect(logData.model).toBe("claude-haiku-4-5-20251001");
    expect(logData.inputTokens).toBe(100);
    expect(logData.outputTokens).toBe(50);
    expect(logData.finishReason).toBe("end_turn");
    expect(logData.requestId).toBe("req-456");
    expect(logData.errorCode).toBeUndefined();
    // Verify API key is not in logs
    expect(JSON.stringify(logData)).not.toContain("test-api-key");
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  it("should return error code TIMEOUT for AbortError", async () => {
    const mockCreate = vi.fn().mockRejectedValue(
      Object.assign(new Error("Timeout"), { name: "AbortError" })
    );

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("error");
    const errorResponse = response as ProviderErrorResponse;
    expect(errorResponse.errorCode).toBe("TIMEOUT");
    expect(errorResponse.userSafeMessage).toBeDefined();
    expect(errorResponse.userSafeMessage).not.toContain("AbortError");
  });

  it("should return error code AUTH_FAILED for 401 status", async () => {
    const mockCreate = vi.fn().mockRejectedValue(
      createMockAPIError("Unauthorized", 401)
    );

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("error");
    const errorResponse = response as ProviderErrorResponse;
    expect(errorResponse.errorCode).toBe("AUTH_FAILED");
  });

  it("should return error code AUTH_FAILED for 403 status", async () => {
    const mockCreate = vi.fn().mockRejectedValue(
      createMockAPIError("Forbidden", 403)
    );

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("error");
    const errorResponse = response as ProviderErrorResponse;
    expect(errorResponse.errorCode).toBe("AUTH_FAILED");
  });

  it("should return error code RATE_LIMITED for 429 status", async () => {
    const mockCreate = vi.fn().mockRejectedValue(
      createMockAPIError("Too Many Requests", 429)
    );

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("error");
    const errorResponse = response as ProviderErrorResponse;
    expect(errorResponse.errorCode).toBe("RATE_LIMITED");
  });

  it("should return error code BAD_REQUEST for 400 status", async () => {
    const mockCreate = vi.fn().mockRejectedValue(
      createMockAPIError("Bad Request", 400)
    );

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("error");
    const errorResponse = response as ProviderErrorResponse;
    expect(errorResponse.errorCode).toBe("BAD_REQUEST");
  });

  it("should return error code PROVIDER_ERROR for 5xx status", async () => {
    const mockCreate = vi.fn().mockRejectedValue(
      createMockAPIError("Internal Server Error", 500)
    );

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("error");
    const errorResponse = response as ProviderErrorResponse;
    expect(errorResponse.errorCode).toBe("PROVIDER_ERROR");
  });

  it("should return error code PROVIDER_ERROR for unknown error", async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error("Network error"));

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("error");
    const errorResponse = response as ProviderErrorResponse;
    expect(errorResponse.errorCode).toBe("PROVIDER_ERROR");
  });

  it("should log error event with error code", async () => {
    const mockCreate = vi.fn().mockRejectedValue(
      createMockAPIError("Unauthorized", 401)
    );

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
      requestId: "req-789",
    };

    await generateResponse(request);

    expect(consoleLogMock).toHaveBeenCalled();
    const logCall = consoleLogMock.mock.calls[0]?.[0];
    const logData = JSON.parse(logCall as string);
    expect(logData.errorCode).toBe("AUTH_FAILED");
    expect(logData.requestId).toBe("req-789");
    expect(logData.inputTokens).toBeUndefined();
    expect(logData.outputTokens).toBeUndefined();
  });

  // ========================================================================
  // API Key Security Tests
  // ========================================================================

  it("should not log the API key in success logs", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Response" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    await generateResponse(request);

    const allLogs = consoleLogMock.mock.calls
      .map((call) => JSON.stringify(call[0]))
      .join("");
    expect(allLogs).not.toContain("test-api-key");
  });

  it("should not log the API key in error logs", async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error("Some error"));

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    await generateResponse(request);

    const allLogs = consoleLogMock.mock.calls
      .map((call) => JSON.stringify(call[0]))
      .join("");
    expect(allLogs).not.toContain("test-api-key");
  });

  it("should never return the API key in response", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Response" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(JSON.stringify(response)).not.toContain("test-api-key");
  });

  // ========================================================================
  // Config Validation Tests
  // ========================================================================

  it("should call getProviderConfig and getApiKey on each invocation", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Response" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    await generateResponse(request);

    expect(vi.mocked(configModule.getProviderConfig)).toHaveBeenCalled();
    expect(vi.mocked(configModule.getApiKey)).toHaveBeenCalled();
  });

  // ========================================================================
  // Token Counting Tests
  // ========================================================================

  it("should capture and return accurate token counts", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Response" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 1234, output_tokens: 5678 },
    });

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("success");
    const successResponse = response as ProviderSuccessResponse;
    expect(successResponse.inputTokens).toBe(1234);
    expect(successResponse.outputTokens).toBe(5678);
  });

  // ========================================================================
  // Multiple Request Tests
  // ========================================================================

  it("should handle multiple calls with different requestIds", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Response" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request1: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q1" }],
      maxTokens: 100,
      temperature: 0.5,
      requestId: "req-001",
    };

    const request2: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q2" }],
      maxTokens: 100,
      temperature: 0.5,
      requestId: "req-002",
    };

    await generateResponse(request1);
    await generateResponse(request2);

    expect(consoleLogMock).toHaveBeenCalledTimes(2);

    const log1 = JSON.parse(
      consoleLogMock.mock.calls[0]?.[0] as string
    );
    const log2 = JSON.parse(
      consoleLogMock.mock.calls[1]?.[0] as string
    );

    expect(log1.requestId).toBe("req-001");
    expect(log2.requestId).toBe("req-002");
  });

  // ========================================================================
  // User-Safe Message Tests
  // ========================================================================

  it("should include user-safe message in error response", async () => {
    const mockCreate = vi.fn().mockRejectedValue(
      createMockAPIError("Unauthorized", 401)
    );

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    const response = await generateResponse(request);

    expect(response.type).toBe("error");
    const errorResponse = response as ProviderErrorResponse;
    expect(errorResponse.userSafeMessage).toBeDefined();
    expect(errorResponse.userSafeMessage.length).toBeGreaterThan(0);
    // Should not contain internal error details
    expect(errorResponse.userSafeMessage).not.toContain("Unauthorized");
    expect(errorResponse.userSafeMessage).not.toContain("401");
  });

  // ========================================================================
  // Never Throws Test
  // ========================================================================

  it("should never throw, always return a ProviderResponse", async () => {
    const mockCreate = vi.fn().mockRejectedValue(
      new Error("Catastrophic failure")
    );

    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as unknown as Anthropic));

    const request: ProviderRequest = {
      systemPrompt: "System",
      userMessages: [{ role: "user", content: "Q" }],
      maxTokens: 100,
      temperature: 0.5,
    };

    let didThrow = false;
    let response: unknown;

    try {
      response = await generateResponse(request);
    } catch {
      didThrow = true;
    }

    expect(didThrow).toBe(false);
    expect(response).toBeDefined();
    expect((response as ProviderErrorResponse).type).toBe("error");
  });
});
