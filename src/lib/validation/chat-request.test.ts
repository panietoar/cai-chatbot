import { describe, expect, it } from "vitest";
import {
  validateChatRequest,
  type ChatRequestValidationIssue,
} from "./chat-request";

function repeat(char: string, length: number): string {
  return char.repeat(length);
}

function getIssueCodes(issues: ChatRequestValidationIssue[]): string[] {
  return issues.map((issue) => `${issue.path}:${issue.code}`);
}

describe("validateChatRequest", () => {
  it("accepts a valid payload", () => {
    const result = validateChatRequest({
      message: "Tell me about Cadre AI.",
      history: [
        {
          userMessage: "What do you do?",
          assistantMessage: "We help with practical AI strategy and implementation.",
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        message: "Tell me about Cadre AI.",
        history: [
          {
            userMessage: "What do you do?",
            assistantMessage: "We help with practical AI strategy and implementation.",
          },
        ],
      },
    });
  });

  it("rejects when message is missing", () => {
    const result = validateChatRequest({ history: [] });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(getIssueCodes(result.issues)).toContain("message:required");
    }
  });

  it("rejects empty or whitespace-only message values", () => {
    const result = validateChatRequest({
      message: "   \n\t  ",
      history: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(getIssueCodes(result.issues)).toContain("message:empty");
    }
  });

  it("accepts exactly 2000 characters and rejects 2001 characters", () => {
    const maxAllowed = repeat("a", 2000);
    const tooLong = repeat("a", 2001);

    const validResult = validateChatRequest({ message: maxAllowed, history: [] });
    const invalidResult = validateChatRequest({ message: tooLong, history: [] });

    expect(validResult.ok).toBe(true);
    expect(invalidResult.ok).toBe(false);
    if (!invalidResult.ok) {
      expect(getIssueCodes(invalidResult.issues)).toContain("message:max_length");
    }
  });

  it("rejects malformed history payloads", () => {
    const result = validateChatRequest({
      message: "Valid",
      history: "not-an-array",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(getIssueCodes(result.issues)).toContain("history:type");
    }
  });

  it("rejects history with more than 10 turns", () => {
    const turns = Array.from({ length: 11 }, (_, index) => ({
      userMessage: `user-${index}`,
      assistantMessage: `assistant-${index}`,
    }));

    const result = validateChatRequest({
      message: "Valid",
      history: turns,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(getIssueCodes(result.issues)).toContain("history:max_items");
    }
  });

  it("rejects unknown top-level fields", () => {
    const result = validateChatRequest({
      message: "Valid",
      history: [],
      extra: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(getIssueCodes(result.issues)).toContain("extra:unknown_field");
    }
  });

  it("rejects unknown nested fields inside history turns", () => {
    const result = validateChatRequest({
      message: "Valid",
      history: [
        {
          userMessage: "hello",
          assistantMessage: "hi",
          unknownNested: "x",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(getIssueCodes(result.issues)).toContain(
        "history[0].unknownNested:unknown_field",
      );
    }
  });
});
