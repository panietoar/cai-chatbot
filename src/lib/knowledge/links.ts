/**
 * Approved Link Allowlist — P3-S1
 *
 * Explicit, auditable list of exact URLs that may appear in knowledge entries
 * or be returned to users. Pattern-based or wildcard matching is out of scope.
 *
 * IMPORTANT (Decision Gate D4):
 * - Exact verified URLs for strategy call booking, contact, and portal are not yet available.
 * - This allowlist starts with safe placeholder links for schema testing only.
 * - Real production URLs must be verified and added before P4-S3 (output validation)
 *   and P5-S3 (render approved actions).
 * - Never return a URL that is not in this list.
 *
 * URL validation uses exact string matching. Subdomain patterns are not supported.
 */

/**
 * Approved URLs that may appear in knowledge entries or responses.
 * Empty or minimal in MVP until D4 is resolved.
 */
export const APPROVED_LINKS: readonly string[] = [
  // Placeholder for testing — not a verified production URL
  // Real URLs must be verified and explicitly added by the user
  "https://example.com/placeholder-strategy-call",
] as const;

/**
 * Check whether a URL is on the approved allowlist.
 * Uses exact string matching.
 *
 * @param url - The URL to validate
 * @returns true if the URL is in the allowlist, false otherwise
 */
export function isApprovedLink(url: string): boolean {
  return APPROVED_LINKS.includes(url);
}
