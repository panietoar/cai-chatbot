/**
 * Retrieval Guardrails Tests — P3-S3
 *
 * Comprehensive test coverage for retrieval guardrail validation.
 * Tests ensure that only approved, validated knowledge entries can reach
 * model invocation, and that invalid retrieval results trigger safe fallback.
 */

import { describe, it, expect } from "vitest";
import {
  checkRetrievalGuardrails,
  SAFE_FALLBACK_MESSAGE,
} from "./retrieval-guardrails";
import type { RetrievalResult } from "../retrieval/types";
import type { KnowledgeEntry } from "../knowledge/types";

/**
 * Helper to create a valid test knowledge entry.
 */
function createValidEntry(overrides?: Partial<KnowledgeEntry>): KnowledgeEntry {
  return {
    id: "test-1",
    topic: "Test Topic",
    content: "Test content",
    keywords: ["test", "keyword"],
    approvalNote: "Approved for testing",
    schemaVersion: "v1",
    ...overrides,
  };
}

/**
 * Helper to create an invalid test entry (bypasses type safety for testing purposes).
 * Used to test guardrails with intentionally invalid data.
 */
function createInvalidEntry(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: "test-1",
    topic: "Test Topic",
    content: "Test content",
    keywords: ["test", "keyword"],
    approvalNote: "Approved for testing",
    schemaVersion: "v1",
    ...overrides,
  };
}

/**
 * Helper to create a retrieval result with matches.
 */
function createRetrievalResult(
  entries: (KnowledgeEntry | Record<string, unknown>)[],
): RetrievalResult {
  return {
    matches: entries.map((entry) => ({
      entry: entry as KnowledgeEntry,
      score: 0.8,
    })),
    metadata: {
      totalEntries: 10,
      matchedCount: entries.length,
      threshold: 0.5,
      maxResults: 5,
    },
  };
}

describe("checkRetrievalGuardrails", () => {
  describe("Happy path — valid entries", () => {
    it("should pass a retrieval result with one valid entry", () => {
      const entry = createValidEntry();
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
      expect(result.validEntries[0].entry).toEqual(entry);
      expect(result.reason).toBeUndefined();
    });

    it("should pass a retrieval result with multiple valid entries", () => {
      const entry1 = createValidEntry({ id: "entry-1" });
      const entry2 = createValidEntry({ id: "entry-2" });
      const entry3 = createValidEntry({ id: "entry-3" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry1, entry2, entry3]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(3);
      expect(result.reason).toBeUndefined();
    });

    it("should filter out invalid entries and return only valid ones", () => {
      const validEntry = createValidEntry({ id: "valid" });
      const invalidEntry = createValidEntry({
        id: "invalid",
        approvalNote: "", // Empty approval note makes it invalid
      });
      const anotherValidEntry = createValidEntry({ id: "valid-2" });

      const result = checkRetrievalGuardrails(
        createRetrievalResult([validEntry, invalidEntry, anotherValidEntry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(2);
      expect(result.validEntries.map((v) => v.entry.id)).toEqual([
        "valid",
        "valid-2",
      ]);
      expect(result.reason).toBeUndefined();
    });
  });

  describe("Empty retrieval", () => {
    it("should return safe=false with reason=no_matches when retrieval has no matches", () => {
      const result = checkRetrievalGuardrails({
        matches: [],
        metadata: {
          totalEntries: 10,
          matchedCount: 0,
          threshold: 0.5,
          maxResults: 5,
        },
      });

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("no_matches");
    });

    it("should return safe=false with reason=no_matches when retrieval result is null matches", () => {
      const result = checkRetrievalGuardrails({
        matches: null as unknown as RetrievalResult["matches"],
        metadata: {
          totalEntries: 10,
          matchedCount: 0,
          threshold: 0.5,
          maxResults: 5,
        },
      });

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("no_matches");
    });
  });

  describe("Validation failures — approval note", () => {
    it("should reject entry with missing approvalNote", () => {
      const entry = createInvalidEntry({ approvalNote: undefined });
      delete entry.approvalNote;
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should reject entry with empty approvalNote", () => {
      const entry = createValidEntry({ approvalNote: "" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should reject entry with whitespace-only approvalNote", () => {
      const entry = createValidEntry({ approvalNote: "   \t\n  " });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });
  });

  describe("Validation failures — schema version", () => {
    it("should reject entry with invalid schema version", () => {
      const entry = createInvalidEntry({ schemaVersion: "v2" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should reject entry with unknown schema version", () => {
      const entry = createInvalidEntry({ schemaVersion: "v99" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should accept entry with correct schema version v1", () => {
      const entry = createValidEntry({ schemaVersion: "v1" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
    });
  });

  describe("Validation failures — effective date", () => {
    it("should reject entry with malformed effective date", () => {
      const entry = createValidEntry({ effectiveDate: "not-a-date" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should reject entry with empty string effective date", () => {
      const entry = createValidEntry({ effectiveDate: "" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should accept entry with valid ISO 8601 date (full timestamp)", () => {
      const entry = createValidEntry({
        effectiveDate: "2025-01-15T10:30:00Z",
      });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
    });

    it("should accept entry with valid ISO 8601 date (date only)", () => {
      const entry = createValidEntry({ effectiveDate: "2025-01-15" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
    });

    it("should accept entry without effective date (optional field)", () => {
      const entry = createValidEntry();
      delete entry.effectiveDate;
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
    });

    it("should accept entry with undefined effective date (optional field)", () => {
      const entry = createValidEntry({ effectiveDate: undefined });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
    });
  });

  describe("Validation failures — required fields", () => {
    it("should reject entry with empty id", () => {
      const entry = createValidEntry({ id: "" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should reject entry with empty topic", () => {
      const entry = createValidEntry({ topic: "" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should reject entry with empty content", () => {
      const entry = createValidEntry({ content: "" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should reject entry with empty keywords array", () => {
      const entry = createValidEntry({ keywords: [] });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should reject entry with keywords containing empty strings", () => {
      const entry = createValidEntry({ keywords: ["valid", "", "also-valid"] });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });
  });

  describe("Validation failures — approved URL allowlist", () => {
    it("should reject entry with URL not in approved allowlist", () => {
      const entry = createValidEntry({
        approvedUrl: "https://evil.com/phishing",
      });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should accept entry with approved URL from allowlist", () => {
      const entry = createValidEntry({
        approvedUrl: "https://example.com/placeholder-strategy-call",
      });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
    });

    it("should accept entry without approvedUrl field (optional field)", () => {
      const entry = createValidEntry();
      delete entry.approvedUrl;
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
    });

    it("should accept entry with undefined approvedUrl (optional field)", () => {
      const entry = createValidEntry({ approvedUrl: undefined });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
    });
  });

  describe("All-invalid scenarios", () => {
    it("should return all_invalid when all entries fail validation", () => {
      const entry1 = createValidEntry({ id: "" }); // Invalid: empty id
      const entry2 = createValidEntry({ topic: "" }); // Invalid: empty topic
      const entry3 = createInvalidEntry({ schemaVersion: "v2" }); // Invalid: wrong schema

      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry1, entry2, entry3]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });

    it("should return all_invalid when single entry is invalid", () => {
      const entry = createValidEntry({ content: "" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });
  });

  describe("Mixed valid and invalid entries", () => {
    it("should pass with valid entries even if some invalid ones are present", () => {
      const validEntry1 = createValidEntry({ id: "valid-1" });
      const invalidEntry = createValidEntry({ id: "invalid", content: "" });
      const validEntry2 = createValidEntry({ id: "valid-2" });
      const anotherInvalid = createValidEntry({
        id: "invalid-2",
        approvalNote: "",
      });

      const result = checkRetrievalGuardrails(
        createRetrievalResult([
          validEntry1,
          invalidEntry,
          validEntry2,
          anotherInvalid,
        ]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(2);
      expect(result.validEntries.map((v) => v.entry.id)).toEqual([
        "valid-1",
        "valid-2",
      ]);
      expect(result.reason).toBeUndefined();
    });
  });

  describe("Optional fields", () => {
    it("should accept entry with actionGuidance when provided", () => {
      const entry = createValidEntry({
        actionGuidance: "Book a strategy call",
      });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(true);
      expect(result.validEntries).toHaveLength(1);
    });

    it("should reject entry with empty actionGuidance when provided", () => {
      const entry = createValidEntry({ actionGuidance: "" });
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.safe).toBe(false);
      expect(result.validEntries).toHaveLength(0);
      expect(result.reason).toBe("all_invalid");
    });
  });

  describe("SAFE_FALLBACK_MESSAGE", () => {
    it("should be defined and non-empty", () => {
      expect(SAFE_FALLBACK_MESSAGE).toBeDefined();
      expect(typeof SAFE_FALLBACK_MESSAGE).toBe("string");
      expect(SAFE_FALLBACK_MESSAGE.length).toBeGreaterThan(0);
    });

    it("should be transparent and action-oriented", () => {
      // The fallback message should:
      // 1. Not apologize excessively
      // 2. Provide a next step
      // 3. Not expose internal details
      expect(SAFE_FALLBACK_MESSAGE).toContain("strategy call");
      expect(SAFE_FALLBACK_MESSAGE).not.toContain("sorry");
      expect(SAFE_FALLBACK_MESSAGE).not.toContain("sorry");
      expect(SAFE_FALLBACK_MESSAGE).not.toContain("error");
    });

    it("should reference booking a call without requiring a URL", () => {
      // The message should work as plain text even without a clickable link
      expect(SAFE_FALLBACK_MESSAGE).toContain("book");
      expect(SAFE_FALLBACK_MESSAGE).toContain("Cadre");
    });
  });

  describe("Result structure — RetrievalGuardrailResult", () => {
    it("should return typed result with safe=true and no reason", () => {
      const entry = createValidEntry();
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result).toHaveProperty("safe");
      expect(result).toHaveProperty("validEntries");
      expect(result).not.toHaveProperty("reason");
      expect(typeof result.safe).toBe("boolean");
      expect(Array.isArray(result.validEntries)).toBe(true);
    });

    it("should return typed result with safe=false and reason when no matches", () => {
      const result = checkRetrievalGuardrails({
        matches: [],
        metadata: {
          totalEntries: 0,
          matchedCount: 0,
          threshold: 0.5,
          maxResults: 5,
        },
      });

      expect(result).toHaveProperty("safe");
      expect(result).toHaveProperty("validEntries");
      expect(result).toHaveProperty("reason");
      expect(result.safe).toBe(false);
      expect(["no_matches", "all_invalid"]).toContain(result.reason);
    });

    it("should preserve scored entry structure in validEntries", () => {
      const entry = createValidEntry();
      const result = checkRetrievalGuardrails(
        createRetrievalResult([entry]),
      );

      expect(result.validEntries).toHaveLength(1);
      const scoredEntry = result.validEntries[0];
      expect(scoredEntry).toHaveProperty("entry");
      expect(scoredEntry).toHaveProperty("score");
      expect(typeof scoredEntry.score).toBe("number");
    });
  });
});
