/**
 * Knowledge Entry Validation — P3-S1
 *
 * Runtime validation for knowledge entries. Rejects malformed, incomplete,
 * or unapproved entries before retrieval or model invocation.
 */

import type { KnowledgeEntry } from "./types";
import { isApprovedLink } from "./links";

/**
 * Validation result for a knowledge entry.
 */
export interface ValidationResult {
  /** Whether the entry is valid */
  valid: boolean;

  /** List of validation errors (empty if valid) */
  errors: string[];
}

/**
 * Validate a knowledge entry against the schema requirements.
 *
 * Checks:
 * - Entry is a plain object
 * - All required fields are present
 * - Required string fields are non-empty
 * - Keywords is a non-empty array
 * - Schema version is recognized
 * - URL (if present) is in the approved allowlist
 *
 * @param entry - The entry to validate (unknown type for runtime safety)
 * @returns Validation result with errors if invalid
 */
export function validateKnowledgeEntry(entry: unknown): ValidationResult {
  const errors: string[] = [];

  // Check that entry is a plain object
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return {
      valid: false,
      errors: ["Entry must be a plain object"],
    };
  }

  const e = entry as Record<string, unknown>;

  // Check required fields presence
  const requiredFields = [
    "id",
    "topic",
    "content",
    "keywords",
    "approvalNote",
    "schemaVersion",
  ];

  for (const field of requiredFields) {
    if (!(field in e)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // If required fields are missing, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Check required string fields are non-empty
  if (typeof e.id !== "string" || e.id.trim() === "") {
    errors.push("id must be a non-empty string");
  }

  if (typeof e.topic !== "string" || e.topic.trim() === "") {
    errors.push("topic must be a non-empty string");
  }

  if (typeof e.content !== "string" || e.content.trim() === "") {
    errors.push("content must be a non-empty string");
  }

  if (typeof e.approvalNote !== "string" || e.approvalNote.trim() === "") {
    errors.push("approvalNote must be a non-empty string");
  }

  // Check keywords is a non-empty array
  if (!Array.isArray(e.keywords)) {
    errors.push("keywords must be an array");
  } else if (e.keywords.length === 0) {
    errors.push("keywords must not be empty");
  } else {
    // Check that all keywords are strings
    const invalidKeywords = e.keywords.filter(
      (k) => typeof k !== "string" || k.trim() === "",
    );
    if (invalidKeywords.length > 0) {
      errors.push("keywords must contain only non-empty strings");
    }
  }

  // Check schema version
  if (e.schemaVersion !== "v1") {
    errors.push(`Unknown schema version: ${e.schemaVersion}`);
  }

  // Check optional action guidance if present
  if ("actionGuidance" in e) {
    if (
      typeof e.actionGuidance !== "string" ||
      e.actionGuidance.trim() === ""
    ) {
      errors.push("actionGuidance must be a non-empty string when present");
    }
  }

  // Check optional URL if present
  if ("approvedUrl" in e && e.approvedUrl !== undefined) {
    if (typeof e.approvedUrl !== "string") {
      errors.push("approvedUrl must be a string when present");
    } else if (!isApprovedLink(e.approvedUrl)) {
      errors.push(`URL not in approved allowlist: ${e.approvedUrl}`);
    }
  }

  // Check optional effective date if present
  if ("effectiveDate" in e && e.effectiveDate !== undefined) {
    if (typeof e.effectiveDate !== "string") {
      errors.push("effectiveDate must be a string when present");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard to check if an entry is a valid KnowledgeEntry.
 * Throws if validation fails.
 *
 * @param entry - The entry to validate
 * @returns The entry typed as KnowledgeEntry
 * @throws Error if validation fails
 */
export function assertValidEntry(entry: unknown): asserts entry is KnowledgeEntry {
  const result = validateKnowledgeEntry(entry);
  if (!result.valid) {
    throw new Error(
      `Invalid knowledge entry: ${result.errors.join(", ")}`,
    );
  }
}
