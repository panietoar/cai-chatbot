/**
 * Deterministic Retrieval Tests — P3-S2
 *
 * Comprehensive tests for keyword-based retrieval with normalization, scoring, and ranking.
 * No network access required. Tests use placeholder corpus from P3-S1.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeQuery,
  scoreEntry,
  retrieveKnowledge,
} from "./retrieval";
import type { KnowledgeEntry } from "../knowledge/types";

describe("normalizeQuery", () => {
  describe("case normalization", () => {
    it('normalizes "What Does Cadre Do?" to lowercase tokens', () => {
      const result = normalizeQuery("What Does Cadre Do?");
      expect(result).toEqual(["cadre"]);
    });

    it("normalizes mixed-case query to lowercase", () => {
      const result = normalizeQuery("HELP Contact SUPPORT");
      expect(result).toEqual(["help", "contact", "support"]);
    });
  });

  describe("whitespace handling", () => {
    it("handles multiple spaces between words", () => {
      const result = normalizeQuery("  multiple   spaces  ");
      expect(result).toEqual(["multiple", "spaces"]);
    });

    it("handles leading and trailing whitespace", () => {
      const result = normalizeQuery("   cadre   ");
      expect(result).toEqual(["cadre"]);
    });
  });

  describe("stop word removal", () => {
    it('removes stop words from "What is the AI Maturity Index?"', () => {
      const result = normalizeQuery("What is the AI Maturity Index?");
      // "what", "is", "the" are stop words
      expect(result).toEqual(["ai", "maturity", "index"]);
    });

    it('removes stop words from "How do I contact you?"', () => {
      const result = normalizeQuery("How do I contact you?");
      // "how", "do", "i", "you" are stop words
      expect(result).toEqual(["contact"]);
    });

    it("returns empty array when query contains only stop words", () => {
      const result = normalizeQuery("a an the");
      expect(result).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      const result = normalizeQuery("");
      expect(result).toEqual([]);
    });
  });
});

describe("scoreEntry", () => {
  const testEntry: KnowledgeEntry = {
    id: "test-1",
    topic: "Company Overview",
    content: "Test content",
    keywords: ["company", "overview", "about"],
    approvalNote: "Test",
    schemaVersion: "v1",
  };

  describe("topic matching", () => {
    it("scores 10 for exact topic match", () => {
      const tokens = normalizeQuery("company overview");
      const score = scoreEntry(tokens, testEntry);
      expect(score).toBe(10);
    });

    it("scores 5 for partial topic match (topic substring in query)", () => {
      const tokens = normalizeQuery("tell me about the company");
      const score = scoreEntry(tokens, testEntry);
      // "company" is in topic, so partial match = 5
      // "company" is also in keywords, so +1
      // "about" is also in keywords, so +1
      expect(score).toBe(7);
    });

    it("scores 0 for no topic match", () => {
      const tokens = normalizeQuery("unrelated topic");
      const score = scoreEntry(tokens, testEntry);
      expect(score).toBe(0);
    });
  });

  describe("keyword matching", () => {
    it("scores 1 point per keyword match", () => {
      const entry: KnowledgeEntry = {
        id: "test-2",
        topic: "Escalation",
        content: "Test content",
        keywords: ["help", "contact", "support"],
        approvalNote: "Test",
        schemaVersion: "v1",
      };

      const tokens = normalizeQuery("help contact");
      const score = scoreEntry(tokens, entry);
      // "help" + "contact" = 2 keywords
      expect(score).toBe(2);
    });

    it("accumulates keyword and topic scores", () => {
      const tokens = normalizeQuery("company about");
      const score = scoreEntry(tokens, testEntry);
      // Partial topic match for "company" = 5
      // Keywords: "company" + "about" = 2
      expect(score).toBe(7);
    });
  });
});

describe("retrieveKnowledge", () => {
  describe("basic retrieval", () => {
    it("returns placeholder company entry for company overview query", () => {
      const result = retrieveKnowledge("company overview");

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].entry.id).toBe("placeholder-company-overview");
      expect(result.matches[0].score).toBeGreaterThan(0);
    });

    it("returns placeholder escalation entry for help contact query", () => {
      const result = retrieveKnowledge("help contact");

      expect(result.matches.length).toBeGreaterThan(0);
      const escalationMatch = result.matches.find(
        (m) => m.entry.id === "placeholder-escalation"
      );
      expect(escalationMatch).toBeDefined();
      expect(escalationMatch!.score).toBeGreaterThan(0);
    });

    it("ranks entries by score descending", () => {
      const result = retrieveKnowledge("company overview help");

      expect(result.matches.length).toBeGreaterThan(0);
      // Verify descending order
      for (let i = 1; i < result.matches.length; i++) {
        expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(
          result.matches[i].score
        );
      }
    });
  });

  describe("threshold filtering", () => {
    it("returns empty results when query has no matches", () => {
      const result = retrieveKnowledge("completely unrelated query xyzabc");

      expect(result.matches).toEqual([]);
      expect(result.metadata.matchedCount).toBe(0);
    });

    it("filters out entries below custom threshold", () => {
      const result = retrieveKnowledge("company", { threshold: 100 });

      expect(result.matches).toEqual([]);
      expect(result.metadata.matchedCount).toBe(0);
      expect(result.metadata.threshold).toBe(100);
    });

    it("includes entries meeting custom threshold", () => {
      const result = retrieveKnowledge("company", { threshold: 1 });

      expect(result.matches.length).toBeGreaterThan(0);
      result.matches.forEach((match) => {
        expect(match.score).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("result limiting", () => {
    it("respects maxResults limit", () => {
      const result = retrieveKnowledge("company overview help contact", {
        maxResults: 1,
      });

      expect(result.matches.length).toBeLessThanOrEqual(1);
      expect(result.metadata.maxResults).toBe(1);
    });

    it("returns fewer results than maxResults when matches are limited", () => {
      const result = retrieveKnowledge("company", { maxResults: 10 });

      // With placeholder corpus (2 entries), should return <= 2
      expect(result.matches.length).toBeLessThanOrEqual(2);
      expect(result.matches.length).toBeLessThanOrEqual(10);
    });
  });

  describe("tie-breaking", () => {
    it("uses stable ID sort for entries with equal scores", () => {
      // Query that matches both entries with same score
      const result = retrieveKnowledge("placeholder");

      if (result.matches.length >= 2) {
        const scores = result.matches.map((m) => m.score);
        const tiedScores = scores.filter((s, i) => scores.indexOf(s) !== i);

        if (tiedScores.length > 0) {
          // Verify tied entries are sorted by ID
          for (let i = 1; i < result.matches.length; i++) {
            if (result.matches[i - 1].score === result.matches[i].score) {
              expect(
                result.matches[i - 1].entry.id.localeCompare(
                  result.matches[i].entry.id
                )
              ).toBeLessThan(0);
            }
          }
        }
      }
    });
  });

  describe("edge cases", () => {
    it("returns empty results for empty query", () => {
      const result = retrieveKnowledge("");

      expect(result.matches).toEqual([]);
      expect(result.metadata.matchedCount).toBe(0);
    });

    it("returns empty results for query with only stop words", () => {
      const result = retrieveKnowledge("what is the");

      expect(result.matches).toEqual([]);
      expect(result.metadata.matchedCount).toBe(0);
    });

    it("handles single-word query", () => {
      const result = retrieveKnowledge("company");

      // Should match placeholder-company-overview by keyword
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("handles query longer than any entry content", () => {
      const longQuery =
        "this is a very long query with many words that probably exceeds any single entry content length but should still match based on keywords";

      const result = retrieveKnowledge(longQuery);

      // Should still work, matching on keywords present
      expect(result.metadata.totalEntries).toBe(2); // Placeholder corpus size
    });
  });

  describe("metadata", () => {
    it("includes correct totalEntries count", () => {
      const result = retrieveKnowledge("company");

      expect(result.metadata.totalEntries).toBe(2); // Placeholder corpus
    });

    it("includes correct matchedCount", () => {
      const result = retrieveKnowledge("company");

      expect(result.metadata.matchedCount).toBeGreaterThan(0);
      expect(result.metadata.matchedCount).toBeLessThanOrEqual(
        result.metadata.totalEntries
      );
    });

    it("includes default threshold when not specified", () => {
      const result = retrieveKnowledge("company");

      expect(result.metadata.threshold).toBe(1);
    });

    it("includes default maxResults when not specified", () => {
      const result = retrieveKnowledge("company");

      expect(result.metadata.maxResults).toBe(3);
    });

    it("includes custom options in metadata", () => {
      const result = retrieveKnowledge("company", {
        threshold: 5,
        maxResults: 10,
      });

      expect(result.metadata.threshold).toBe(5);
      expect(result.metadata.maxResults).toBe(10);
    });
  });

  describe("paraphrase detection", () => {
    it("matches paraphrased question via keywords", () => {
      // "help me contact Cadre" should match escalation entry with keywords "help", "contact"
      const result = retrieveKnowledge("help me contact cadre");

      const escalationMatch = result.matches.find(
        (m) => m.entry.id === "placeholder-escalation"
      );
      expect(escalationMatch).toBeDefined();
      expect(escalationMatch!.score).toBeGreaterThan(0);
    });
  });

  describe("determinism", () => {
    it("produces identical results for identical queries", () => {
      const query = "company overview";
      const result1 = retrieveKnowledge(query);
      const result2 = retrieveKnowledge(query);

      expect(result1.matches).toEqual(result2.matches);
      expect(result1.metadata).toEqual(result2.metadata);
    });

    it("produces identical scores for case-insensitive variants", () => {
      const result1 = retrieveKnowledge("Company Overview");
      const result2 = retrieveKnowledge("company overview");

      expect(result1.matches.length).toBe(result2.matches.length);
      result1.matches.forEach((match, i) => {
        expect(match.score).toBe(result2.matches[i].score);
        expect(match.entry.id).toBe(result2.matches[i].entry.id);
      });
    });
  });
});
