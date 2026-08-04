/**
 * Knowledge Corpus — P3-S1
 *
 * Approved knowledge entries for retrieval and grounding.
 *
 * CRITICAL DECISION GATE D3:
 * - This corpus contains PLACEHOLDER ENTRIES ONLY with fictional content.
 * - Real Cadre-specific content requires explicit user approval per decision gate D3.
 * - The placeholder content below is NOT representative of actual Cadre services.
 * - Do NOT use this content for real customer interactions.
 *
 * CRITICAL DECISION GATE D4:
 * - Exact verified URLs for strategy calls, contact, and portal are not yet available.
 * - URLs must be verified and added to the allowlist before production use.
 *
 * Before P3-S2 (retrieval implementation), the user must provide:
 * 1. Approved content for each topic area (see spec for list).
 * 2. Verified URLs for strategy call booking, portal login, and contact.
 *
 * Schema: See `types.ts` for field definitions.
 */

import type { KnowledgeEntry } from "./types";

/**
 * Approved knowledge corpus for retrieval.
 *
 * Each entry MUST pass validation before being added.
 * All entries MUST be unique by ID.
 * All URLs MUST be in the approved allowlist.
 */
export const KNOWLEDGE_CORPUS: readonly KnowledgeEntry[] = [
  {
    id: "placeholder-company-overview",
    topic: "Company Overview (PLACEHOLDER)",
    content:
      "This is a placeholder entry with fictional content. Real Cadre-specific information about what the company does, its mission, and core value proposition must be provided by the user and approved per decision gate D3. Do not use this placeholder content in production.",
    keywords: ["company", "overview", "about", "cadre"],
    approvalNote: "Placeholder for schema testing only — D3 unresolved",
    actionGuidance: "Book a strategy call to learn more",
    approvedUrl: "https://example.com/placeholder-strategy-call",
    schemaVersion: "v1",
    effectiveDate: "2026-08-04T00:00:00Z",
  },
  {
    id: "placeholder-escalation",
    topic: "Escalation Instructions (PLACEHOLDER)",
    content:
      "This is a placeholder entry with fictional escalation guidance. Real instructions for when the chatbot cannot answer a question confidently must be provided by the user and approved per decision gate D3. Do not use this placeholder content in production.",
    keywords: ["help", "escalate", "contact", "support"],
    approvalNote: "Placeholder for schema testing only — D3 unresolved",
    // No URL or actionGuidance to test optional fields
    schemaVersion: "v1",
  },
] as const;
