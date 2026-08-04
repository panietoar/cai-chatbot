/**
 * Context Assembly — P4-S2
 *
 * Deterministic assembly of model invocation context.
 * Combines system prompt, validated knowledge, conversation history, and current query
 * into a structured context ready for the Anthropic provider.
 *
 * CRITICAL PROPERTIES:
 * - User input is NEVER concatenated into the system instruction string
 * - Only validated knowledge entries reach model context
 * - Input validation is strict; errors are returned, not raised
 * - Output structure is compatible with Anthropic message format
 */

import { SYSTEM_PROMPT_V1 } from "./system-prompt";
import type {
  ContextAssemblyRequest,
  AssembledContext,
  ContextAssemblyError,
} from "./types";

/**
 * Validate context assembly request for required fields and constraints.
 *
 * Returns error if validation fails; throws are never used.
 */
function validateRequest(
  request: ContextAssemblyRequest
): ContextAssemblyError | null {
  // Check for null/undefined systemPromptVersion
  if (
    request.systemPromptVersion === null ||
    request.systemPromptVersion === undefined
  ) {
    return {
      reason: "systemPromptVersion is required",
    };
  }

  // Check for null/undefined currentQuery
  if (request.currentQuery === null || request.currentQuery === undefined) {
    return {
      reason: "currentQuery is required",
    };
  }

  // currentQuery cannot be empty after trim
  if (typeof request.currentQuery === "string") {
    const trimmed = request.currentQuery.trim();
    if (trimmed.length === 0) {
      return {
        reason: "currentQuery cannot be empty",
      };
    }
  }

  // Check for null/undefined knowledge
  if (request.knowledge === null || request.knowledge === undefined) {
    return {
      reason: "knowledge array is required",
    };
  }

  // Check for null/undefined conversationHistory
  if (
    request.conversationHistory === null ||
    request.conversationHistory === undefined
  ) {
    return {
      reason: "conversationHistory array is required",
    };
  }

  // Validate conversationHistory length (max 10 turns)
  if (request.conversationHistory.length > 10) {
    return {
      reason: "conversationHistory exceeds maximum length",
      details: {
        max: 10,
        actual: request.conversationHistory.length,
      },
    };
  }

  // Check for null/undefined requestId
  if (request.requestId === null || request.requestId === undefined) {
    return {
      reason: "requestId is required",
    };
  }

  return null;
}

/**
 * Format knowledge entries as a readable text section.
 *
 * Produces delimited blocks with topic and content, making it clear in logs
 * and easier for the model to parse than JSON.
 */
function formatKnowledgeSection(
  scoredEntries: Array<{ entry: { id: string; topic: string; content: string }; score: number }>
): string {
  if (scoredEntries.length === 0) {
    return "--- APPROVED KNOWLEDGE ---\n(No matching knowledge entries)\n---";
  }

  const entries = scoredEntries
    .map((scored) => {
      const { entry } = scored;
      return `Topic: ${entry.topic}\nContent: ${entry.content}`;
    })
    .join("\n---\n");

  return `--- APPROVED KNOWLEDGE ---\n${entries}\n---`;
}

/**
 * Assemble context for model invocation.
 *
 * Validates all inputs, formats knowledge, assembles messages array,
 * and returns structured context with metadata.
 *
 * Never throws; validation errors are returned as error context.
 *
 * @param request - The context assembly request with validated inputs
 * @returns - Assembled context ready for provider, or error context
 */
export function assembleContext(
  request: ContextAssemblyRequest
): AssembledContext | ContextAssemblyError {
  // Validate request
  const validationError = validateRequest(request);
  if (validationError) {
    return validationError;
  }

  // Get the system prompt (in real implementation, could select by version)
  const baseSystemPrompt = SYSTEM_PROMPT_V1;

  // Format knowledge section
  const knowledgeSection = formatKnowledgeSection(request.knowledge);

  // Replace placeholder in system prompt
  const systemPrompt = baseSystemPrompt.replace(
    "{KNOWLEDGE_PLACEHOLDER}",
    knowledgeSection
  );

  // Build messages array from history + current query
  // History is assumed to already be validated (P2-S1)
  const messages = [
    ...request.conversationHistory,
    {
      role: "user" as const,
      content: request.currentQuery,
    },
  ];

  // Extract knowledge IDs for metadata
  const knowledgeIds = request.knowledge.map((scored) => scored.entry.id);

  // Build metadata
  const metadata = {
    knowledgeIds,
    historyTurns: request.conversationHistory.length,
    requestId: request.requestId,
    assembledAt: new Date().toISOString(),
  };

  return {
    systemPrompt,
    promptVersion: request.systemPromptVersion,
    messages,
    metadata,
  };
}
