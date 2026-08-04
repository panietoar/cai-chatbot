/**
 * Retrieval Guardrails — P3-S3
 *
 * Validates each retrieved knowledge entry against approval state, schema version,
 * freshness metadata, and link allowlist. Ensures only safe, approved content
 * can reach prompt assembly and model invocation.
 *
 * Key decision: Retrieval guardrails operate on the RetrievalResult from P3-S2,
 * not on individual queries. This separates concerns: retrieval ranks and filters,
 * guardrails validate what was retrieved.
 */

import type { RetrievalResult } from "../retrieval/types";
import { validateKnowledgeEntry } from "../knowledge/validation";

/**
 * Result of retrieval guardrail validation.
 */
export interface RetrievalGuardrailResult {
  /** Whether the retrieval is safe to proceed with */
  safe: boolean;

  /** Validated entries that passed guardrails (empty if safe=false) */
  validEntries: RetrievalResult["matches"];

  /** Reason for fallback (undefined if safe=true) */
  reason?: "no_matches" | "all_invalid";
}

/**
 * Safe fallback message for when retrieval is unavailable or insufficient.
 *
 * This message is:
 * - Transparent: admits knowledge limitation without apology
 * - Action-oriented: provides a next step
 * - User-safe: no internal details, no stack traces
 * - No assumptions: references strategy call without assuming a clickable link exists
 *
 * Used when:
 * - Retrieval returns no matches
 * - All retrieved entries fail validation
 * - Knowledge base is unavailable
 */
export const SAFE_FALLBACK_MESSAGE =
  "I don't have verified information to answer that question. You can book a strategy call to discuss your needs directly with the Cadre team.";

/**
 * Validate effective date format (ISO 8601 string).
 *
 * Checks that if an effectiveDate is present, it is a non-empty string
 * in valid ISO 8601 format (e.g., "2025-01-15T10:30:00Z" or "2025-01-15").
 * Does not perform freshness comparison (e.g., "is this entry stale?").
 *
 * @param dateString - The date string to validate
 * @returns true if the date is valid ISO 8601, false otherwise
 */
function isValidISO8601(dateString: string): boolean {
  if (typeof dateString !== "string" || dateString.trim() === "") {
    return false;
  }

  // Check basic ISO 8601 format and that the date parses correctly
  const date = new Date(dateString);

  // Check if the parsed date is valid and the string format looks reasonable
  if (isNaN(date.getTime())) {
    return false;
  }

  // Ensure the string round-trips (common check for valid ISO 8601)
  // Allow both the original format and toISOString format
  const isoString = date.toISOString();
  // Accept if the input is close to the ISO format (not a strict round-trip)
  return dateString.startsWith(isoString.slice(0, 10)); // At least the date part matches
}

/**
 * Check if a retrieval result is safe to use for prompt assembly and model invocation.
 *
 * Validation steps:
 * 1. If retrieval has no matches, return safe=false with reason="no_matches"
 * 2. For each match, validate the knowledge entry using validateKnowledgeEntry()
 * 3. Additionally validate effective date format (ISO 8601) if present
 * 4. Collect entries that pass all validation
 * 5. If no valid entries remain, return safe=false with reason="all_invalid"
 * 6. If at least one valid entry remains, return safe=true with validEntries
 *
 * @param retrievalResult - The result from retrieval operation (P3-S2)
 * @returns Structured result indicating whether retrieval is safe and which entries are valid
 */
export function checkRetrievalGuardrails(
  retrievalResult: RetrievalResult,
): RetrievalGuardrailResult {
  // Early return: no matches is not an error, just triggers fallback
  if (!retrievalResult.matches || retrievalResult.matches.length === 0) {
    return {
      safe: false,
      validEntries: [],
      reason: "no_matches",
    };
  }

  // Validate each retrieved entry
  const validEntries = retrievalResult.matches.filter((scored) => {
    const entry = scored.entry;

    // First, use the existing knowledge validation
    const validationResult = validateKnowledgeEntry(entry);
    if (!validationResult.valid) {
      // This entry failed basic validation
      return false;
    }

    // Additional validation: effective date format (if present)
    if (entry.effectiveDate !== undefined && entry.effectiveDate !== null) {
      if (!isValidISO8601(entry.effectiveDate)) {
        // Invalid date format blocks the entry
        return false;
      }
    }

    // Entry passed all validations
    return true;
  });

  // If no entries survived validation, return fallback
  if (validEntries.length === 0) {
    return {
      safe: false,
      validEntries: [],
      reason: "all_invalid",
    };
  }

  // At least one entry is valid; safe to proceed
  return {
    safe: true,
    validEntries,
  };
}
