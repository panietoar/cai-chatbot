/**
 * Output Guardrails — P4-S3
 *
 * Validates each model response to detect and block:
 * - Non-approved URLs
 * - Invented pricing figures
 * - Claims about unsupported Cadre capabilities
 * - Internal details leaked from prompts or knowledge
 * - Malformed or oversized output
 *
 * If validation fails, the response is replaced with the canonical safe fallback.
 *
 * Key decision: Output guardrails operate on the text string returned by the provider,
 * not on structured data or metadata. This keeps validation simple and deterministic.
 */

import { isApprovedLink } from "../knowledge/links";
import { SAFE_FALLBACK_MESSAGE } from "./retrieval-guardrails";

/**
 * Result of output guardrail validation.
 */
export interface OutputGuardrailResult {
  /** Whether the response passes all validation checks */
  safe: boolean;

  /** Reason for failure (undefined if safe=true) */
  reason?: OutputGuardrailFailureReason;

  /** The original response text (for logging, never sent to client) */
  originalText?: string;
}

/**
 * Reasons why output validation may fail.
 */
export type OutputGuardrailFailureReason =
  | "malformed"
  | "too_long"
  | "contains_url"
  | "contains_pricing"
  | "unsupported_capability"
  | "internal_detail_leak";

/**
 * Banned phrases that indicate unsupported capabilities.
 * These are high-confidence phrases that definitively indicate features
 * Cadre does not provide or claims not yet verified.
 *
 * Kept as a constant for maintainability and auditability.
 */
const BANNED_CAPABILITY_PHRASES = [
  "access the portal",
  "access your portal",
  "access the client portal",
  "book a live meeting",
  "book a live call",
  "schedule a live call",
  "schedule a call",
  "schedule a meeting",
  "integrate with salesforce",
  "integrate with hubspot",
  "integrate with your crm",
  "authenticate",
  "login",
  "real-time handoff",
  "authenticate to the system",
  "crm integration",
  "salesforce integration",
  "hubspot integration",
] as const;

/**
 * Phrases that indicate internal implementation details being leaked.
 * These should never appear in user-facing responses.
 */
const INTERNAL_DETAIL_LEAK_PHRASES = [
  "schema v1",
  "knowledge id",
  "retrieved from",
  "guardrail",
  "fallback message",
] as const;

/**
 * Regex patterns for detecting pricing figures in various currencies.
 * Matches common patterns like "$10,000", "€500", "£1000", "¥50000", etc.
 */
const PRICING_PATTERNS = [
  /\$\d+/g, // $X, $XX, $XXX, etc.
  /€\d+/g, // €X, €XX, etc.
  /£\d+/g, // £X, £XX, etc.
  /¥\d+/g, // ¥X, ¥XX, etc.
  /cost\s+is\s+\$\d+/gi, // "cost is $X"
  /price[^.]*\$\d+/gi, // "price: $X" or "price of $X"
] as const;

/**
 * Regex for detecting URLs in the response.
 * Matches http:// and https:// schemes.
 */
const URL_PATTERN = /https?:\/\/\S+/g;

/**
 * Maximum allowed response length in characters.
 * Helps detect runaway generation from the model.
 */
const MAX_RESPONSE_LENGTH = 5000;

/**
 * Validate a model response against output guardrails.
 *
 * Checks:
 * 1. Response is non-empty and non-null
 * 2. Response length does not exceed MAX_RESPONSE_LENGTH
 * 3. Response contains no non-approved URLs
 * 4. Response contains no pricing figures
 * 5. Response contains no unsupported capability claims
 * 6. Response contains no leaked internal details
 *
 * If any check fails, returns safe=false with the reason.
 * If all checks pass, returns safe=true.
 *
 * @param text - The model response text to validate
 * @returns OutputGuardrailResult with validation status and reason
 */
export function checkOutputGuardrails(text: unknown): OutputGuardrailResult {
  // Check 1: Validate text is a non-empty string
  if (text === null || text === undefined) {
    return {
      safe: false,
      reason: "malformed",
      originalText: undefined,
    };
  }

  if (typeof text !== "string") {
    return {
      safe: false,
      reason: "malformed",
      originalText: String(text),
    };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {
      safe: false,
      reason: "malformed",
      originalText: text,
    };
  }

  // Check 2: Validate response length
  if (text.length > MAX_RESPONSE_LENGTH) {
    return {
      safe: false,
      reason: "too_long",
      originalText: text,
    };
  }

  const lowerText = text.toLowerCase();

  // Check 3: Validate no non-approved URLs
  const urls = text.match(URL_PATTERN);
  if (urls) {
    for (const url of urls) {
      if (!isApprovedLink(url)) {
        return {
          safe: false,
          reason: "contains_url",
          originalText: text,
        };
      }
    }
  }

  // Check 4: Validate no pricing figures
  for (const pattern of PRICING_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: "contains_pricing",
        originalText: text,
      };
    }
  }

  // Check 5: Validate no unsupported capability claims (case-insensitive)
  for (const phrase of BANNED_CAPABILITY_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      return {
        safe: false,
        reason: "unsupported_capability",
        originalText: text,
      };
    }
  }

  // Check 6: Validate no internal detail leaks (case-insensitive)
  for (const phrase of INTERNAL_DETAIL_LEAK_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      return {
        safe: false,
        reason: "internal_detail_leak",
        originalText: text,
      };
    }
  }

  // All checks passed
  return {
    safe: true,
  };
}

/**
 * Export the safe fallback message for use in API routes.
 * This is the response returned when output validation fails.
 */
export { SAFE_FALLBACK_MESSAGE };
