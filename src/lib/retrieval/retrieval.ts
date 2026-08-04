/**
 * Deterministic Knowledge Retrieval — P3-S2
 *
 * Keyword-based retrieval with normalization, scoring, and ranking.
 * Designed for small in-memory corpus. No network access or external dependencies.
 */

import { KNOWLEDGE_CORPUS } from "../knowledge/corpus";
import type { KnowledgeEntry } from "../knowledge/types";
import type {
  RetrievalResult,
  RetrievalOptions,
  ScoredEntry,
} from "./types";

/**
 * Common English stop words to remove during normalization.
 * These words add little semantic value for keyword matching.
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "has",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "which",
  "will",
  "would",
  "you",
]);

/**
 * Default retrieval options.
 */
const DEFAULT_OPTIONS: RetrievalOptions = {
  threshold: 1,
  maxResults: 3,
};

/**
 * Normalize a user query into tokens for keyword matching.
 *
 * Process:
 * 1. Convert to lowercase
 * 2. Remove punctuation
 * 3. Split on whitespace
 * 4. Remove stop words
 * 5. Filter empty strings
 *
 * @param query - Raw user query string
 * @returns Array of normalized tokens
 */
export function normalizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

/**
 * Calculate relevance score for a knowledge entry against normalized query tokens.
 *
 * Scoring rules:
 * - Exact topic match (case-insensitive): 10 points (exclusive, no keyword scoring)
 * - Partial topic match (topic substring in query): 5 points + keyword matches
 * - Keyword matches only: 1 point per keyword
 *
 * @param queryTokens - Normalized query tokens
 * @param entry - Knowledge entry to score
 * @returns Relevance score (0 or higher)
 */
export function scoreEntry(
  queryTokens: string[],
  entry: KnowledgeEntry
): number {
  let score = 0;

  const normalizedTopic = entry.topic.toLowerCase().replace(/[^\w\s]/g, "");
  const queryString = queryTokens.join(" ");

  // Check for exact topic match (all query tokens match topic exactly)
  if (normalizedTopic === queryString) {
    // Exact match is exclusive - return 10 without keyword scoring
    return 10;
  }

  // Check for partial topic match (topic appears as substring in query)
  if (queryTokens.some((token) => normalizedTopic.includes(token))) {
    score += 5;
  }

  // Count keyword matches
  const normalizedKeywords = entry.keywords.map((k) => k.toLowerCase());
  for (const token of queryTokens) {
    if (normalizedKeywords.includes(token)) {
      score += 1;
    }
  }

  return score;
}

/**
 * Retrieve relevant knowledge entries for a user query.
 *
 * Process:
 * 1. Normalize query into tokens
 * 2. Score all corpus entries
 * 3. Filter by minimum threshold
 * 4. Sort by score descending, then by ID for ties (stable sort)
 * 5. Limit to maxResults
 *
 * @param query - User query string
 * @param options - Optional retrieval configuration
 * @returns Retrieval result with matched entries and metadata
 */
export function retrieveKnowledge(
  query: string,
  options?: Partial<RetrievalOptions>
): RetrievalResult {
  const config: RetrievalOptions = { ...DEFAULT_OPTIONS, ...options };

  // Normalize query
  const queryTokens = normalizeQuery(query);

  // Empty query returns no results
  if (queryTokens.length === 0) {
    return {
      matches: [],
      metadata: {
        totalEntries: KNOWLEDGE_CORPUS.length,
        matchedCount: 0,
        threshold: config.threshold,
        maxResults: config.maxResults,
      },
    };
  }

  // Score all entries
  const scored: ScoredEntry[] = KNOWLEDGE_CORPUS.map((entry) => ({
    entry,
    score: scoreEntry(queryTokens, entry),
  }));

  // Filter by threshold and sort
  const filtered = scored
    .filter((item) => item.score >= config.threshold)
    .sort((a, b) => {
      // Sort by score descending
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Stable tie-breaking by ID
      return a.entry.id.localeCompare(b.entry.id);
    });

  // Limit results
  const matches = filtered.slice(0, config.maxResults);

  return {
    matches,
    metadata: {
      totalEntries: KNOWLEDGE_CORPUS.length,
      matchedCount: filtered.length,
      threshold: config.threshold,
      maxResults: config.maxResults,
    },
  };
}
