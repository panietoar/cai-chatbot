/**
 * Retrieval Types — P3-S2
 *
 * Type definitions for deterministic keyword-based knowledge retrieval.
 */

import type { KnowledgeEntry } from "../knowledge/types";

/**
 * Scored knowledge entry returned by retrieval.
 */
export interface ScoredEntry {
  /** The matched knowledge entry */
  entry: KnowledgeEntry;
  /** Relevance score calculated for this entry */
  score: number;
}

/**
 * Metadata about the retrieval operation for observability.
 */
export interface RetrievalMetadata {
  /** Total number of entries in the corpus */
  totalEntries: number;
  /** Number of entries that met the minimum threshold */
  matchedCount: number;
  /** Minimum relevance threshold applied */
  threshold: number;
  /** Maximum results limit applied */
  maxResults: number;
}

/**
 * Result of a retrieval operation.
 */
export interface RetrievalResult {
  /** Matched entries with scores, ordered by relevance descending */
  matches: ScoredEntry[];
  /** Retrieval operation metadata */
  metadata: RetrievalMetadata;
}

/**
 * Configurable options for retrieval.
 */
export interface RetrievalOptions {
  /** Minimum relevance score threshold (default: 1) */
  threshold: number;
  /** Maximum number of results to return (default: 3) */
  maxResults: number;
}
