/**
 * Knowledge Corpus Validation Tests — P3-S1
 *
 * Deterministic tests ensuring the corpus is well-formed.
 * No network access required.
 */

import { describe, it, expect } from "vitest";
import { KNOWLEDGE_CORPUS } from "./corpus";
import { validateKnowledgeEntry } from "./validation";
import { APPROVED_LINKS } from "./links";

describe("KNOWLEDGE_CORPUS", () => {
  it("validates that all entries pass schema validation", () => {
    for (const entry of KNOWLEDGE_CORPUS) {
      const result = validateKnowledgeEntry(entry);
      expect(result.valid).toBe(true);
      if (!result.valid) {
        // Provide helpful error context if validation fails
        console.error(`Entry ${entry.id} failed:`, result.errors);
      }
      expect(result.errors).toEqual([]);
    }
  });

  it("validates that all entry IDs are unique", () => {
    const ids = KNOWLEDGE_CORPUS.map((entry) => entry.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);

    // If duplicates exist, report them
    if (uniqueIds.size !== ids.length) {
      const duplicates = ids.filter(
        (id, index) => ids.indexOf(id) !== index,
      );
      console.error("Duplicate IDs found:", duplicates);
    }
  });

  it("validates that all corpus URLs are in the approved allowlist", () => {
    for (const entry of KNOWLEDGE_CORPUS) {
      if (entry.approvedUrl) {
        expect(APPROVED_LINKS).toContain(entry.approvedUrl);
        if (!APPROVED_LINKS.includes(entry.approvedUrl)) {
          console.error(
            `Entry ${entry.id} has unapproved URL: ${entry.approvedUrl}`,
          );
        }
      }
    }
  });
});
