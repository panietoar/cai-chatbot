/**
 * Context Assembly Types — P4-S2
 *
 * Defines typed contracts for system prompt versioning and context assembly.
 * Keeps types provider-neutral while supporting Anthropic message format.
 */

import type { ScoredEntry } from "../retrieval/types";

/**
 * Request to assemble context for model invocation.
 *
 * All fields are required and must be validated before assembly.
 * Context assembly does not perform semantic validation of content.
 */
export interface ContextAssemblyRequest {
  /** Version identifier for the system prompt (e.g., "v1.0") */
  systemPromptVersion: string;

  /** Validated knowledge entries to include (from retrieval guardrails) */
  knowledge: ScoredEntry[];

  /**
   * Conversation history limited to 10 turns max.
   * Assumed to be validated at API boundary (P2-S1).
   */
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;

  /** Current user query or message */
  currentQuery: string;

  /** Request ID for tracing and observability */
  requestId: string;
}

/**
 * Assembled context ready for model invocation.
 *
 * Provides structured context with distinct sections and metadata.
 */
export interface AssembledContext {
  /** System instruction string */
  systemPrompt: string;

  /** Version of the system prompt used */
  promptVersion: string;

  /** Messages array in Anthropic format (conversation + current query) */
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;

  /** Metadata for observability and debugging */
  metadata: {
    /** IDs of knowledge entries included in context */
    knowledgeIds: string[];

    /** Number of conversation history turns included */
    historyTurns: number;

    /** Request ID for tracing */
    requestId: string;

    /** Timestamp when context was assembled (ISO 8601) */
    assembledAt: string;
  };
}

/**
 * Error context returned when assembly fails validation.
 */
export interface ContextAssemblyError {
  reason: string;
  details?: Record<string, unknown>;
}
