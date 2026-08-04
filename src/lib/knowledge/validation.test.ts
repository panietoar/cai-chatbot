/**
 * Knowledge Entry Validation Tests — P3-S1
 *
 * Deterministic tests for schema validation logic.
 * No network access required.
 */

import { describe, it, expect } from "vitest";
import { validateKnowledgeEntry } from "./validation";

describe("validateKnowledgeEntry", () => {
  const validEntry = {
    id: "test-entry-1",
    topic: "Test Topic",
    content: "Test content for validation",
    keywords: ["test", "validation"],
    approvalNote: "Test approval note",
    schemaVersion: "v1",
  };

  describe("valid entries", () => {
    it("accepts a valid complete entry with all fields", () => {
      const entry = {
        ...validEntry,
        actionGuidance: "Test action guidance",
        approvedUrl: "https://www.cadreai.com/contact",
        effectiveDate: "2026-08-04T00:00:00Z",
      };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("accepts a valid entry without URL", () => {
      const result = validateKnowledgeEntry(validEntry);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("accepts a valid entry with approved URL", () => {
      const entry = {
        ...validEntry,
        approvedUrl: "https://www.cadreai.com/contact",
      };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("missing required fields", () => {
    it("rejects entry missing id", () => {
      const entry = { ...validEntry };
      delete (entry as Partial<typeof entry>).id;

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: id");
    });

    it("rejects entry missing topic", () => {
      const entry = { ...validEntry };
      delete (entry as Partial<typeof entry>).topic;

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: topic");
    });

    it("rejects entry missing content", () => {
      const entry = { ...validEntry };
      delete (entry as Partial<typeof entry>).content;

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: content");
    });

    it("rejects entry missing keywords", () => {
      const entry = { ...validEntry };
      delete (entry as Partial<typeof entry>).keywords;

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: keywords");
    });

    it("rejects entry missing approvalNote", () => {
      const entry = { ...validEntry };
      delete (entry as Partial<typeof entry>).approvalNote;

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: approvalNote");
    });

    it("rejects entry missing schemaVersion", () => {
      const entry = { ...validEntry };
      delete (entry as Partial<typeof entry>).schemaVersion;

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: schemaVersion");
    });
  });

  describe("empty values", () => {
    it("rejects entry with empty topic string", () => {
      const entry = { ...validEntry, topic: "" };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("topic must be a non-empty string");
    });

    it("rejects entry with whitespace-only topic", () => {
      const entry = { ...validEntry, topic: "   " };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("topic must be a non-empty string");
    });

    it("rejects entry with empty content string", () => {
      const entry = { ...validEntry, content: "" };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("content must be a non-empty string");
    });

    it("rejects entry with whitespace-only content", () => {
      const entry = { ...validEntry, content: "   " };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("content must be a non-empty string");
    });

    it("rejects entry with empty keywords array", () => {
      const entry = { ...validEntry, keywords: [] };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("keywords must not be empty");
    });
  });

  describe("schema version", () => {
    it("rejects entry with unknown schema version", () => {
      const entry = { ...validEntry, schemaVersion: "v2" };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Unknown schema version: v2");
    });

    it("rejects entry with invalid schema version type", () => {
      const entry = { ...validEntry, schemaVersion: 1 };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Unknown schema version: 1");
    });
  });

  describe("URL validation", () => {
    it("rejects entry with URL not in allowlist", () => {
      const entry = {
        ...validEntry,
        approvedUrl: "https://not-in-allowlist.com/path",
      };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "URL not in approved allowlist: https://not-in-allowlist.com/path",
      );
    });

    it("rejects entry with malformed URL (non-string)", () => {
      const entry = {
        ...validEntry,
        approvedUrl: 123,
      };

      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("approvedUrl must be a string when present");
    });
  });

  describe("malformed entries", () => {
    it("rejects non-object entry", () => {
      const result = validateKnowledgeEntry("not an object");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Entry must be a plain object");
    });

    it("rejects null entry", () => {
      const result = validateKnowledgeEntry(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Entry must be a plain object");
    });

    it("rejects array entry", () => {
      const result = validateKnowledgeEntry([validEntry]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Entry must be a plain object");
    });
  });
});
