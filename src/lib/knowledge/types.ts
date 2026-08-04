/**
 * Knowledge Entry Schema — P3-S1
 *
 * Defines the typed structure for approved knowledge entries used in retrieval.
 * All entries must be validated before use. Schema version supports future evolution.
 *
 * IMPORTANT:
 * - All Cadre-specific content must be explicitly approved (decision gate D3).
 * - All URLs must be on the approved allowlist (decision gate D4).
 * - Placeholder entries are for schema testing only, not representative of Cadre services.
 */

/**
 * Schema version identifier for knowledge entries.
 * Current version: "v1"
 */
export type KnowledgeSchemaVersion = "v1";

/**
 * Structured knowledge entry containing approved Cadre information.
 *
 * Fields:
 * - `id`: Stable unique identifier (never changes across updates)
 * - `topic`: Human-readable subject (e.g., "AI Maturity Index")
 * - `content`: Approved factual content for retrieval
 * - `keywords`: Search/retrieval terms (e.g., ["maturity", "assessment"])
 * - `approvalNote`: Source or approval record for auditability
 * - `actionGuidance`: Optional plain-text next step (e.g., "Book a strategy call")
 * - `approvedUrl`: Optional exact URL from the approved allowlist
 * - `schemaVersion`: Version identifier for future compatibility
 * - `effectiveDate`: Optional timestamp for versioning (ISO 8601 string)
 */
export interface KnowledgeEntry {
  /** Stable unique identifier */
  id: string;

  /** Human-readable topic name */
  topic: string;

  /** Approved factual content for retrieval and grounding */
  content: string;

  /** Keywords for retrieval matching */
  keywords: string[];

  /** Source or approval record for auditability */
  approvalNote: string;

  /** Optional plain-text action guidance (e.g., "Book a strategy call") */
  actionGuidance?: string;

  /** Optional exact URL from the approved allowlist */
  approvedUrl?: string;

  /** Schema version identifier */
  schemaVersion: KnowledgeSchemaVersion;

  /** Optional effective date or version timestamp (ISO 8601) */
  effectiveDate?: string;
}
