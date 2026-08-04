/**
 * Approved Link Allowlist — P3-S1
 *
 * Explicit, auditable list of exact URLs that may appear in knowledge entries
 * or be returned to users. Pattern-based or wildcard matching is out of scope.
 *
 * URL validation uses exact string matching. Subdomain patterns are not supported.
 */

/**
 * Approved URLs that may appear in knowledge entries or responses.
 * 
 * Decision D4 resolved on 2026-08-04:
 * - Strategy call: https://www.cadreai.com/contact
 * - Client portal: https://send.reignmakerapp.com/login
 */
export const APPROVED_LINKS: readonly string[] = [
  "https://www.cadreai.com/",
  "https://www.cadreai.com/strategy",
  "https://www.cadreai.com/ai-engineering",
  "https://www.cadreai.com/industries",
  "https://www.cadreai.com/departments",
  "https://www.cadreai.com/contact",
  "https://www.cadreai.com/articles/ai-readiness-starts-with-your-data-not-the-model",
  "https://send.reignmakerapp.com/login",
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
