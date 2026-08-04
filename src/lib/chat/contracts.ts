export const CHAT_MAX_MESSAGE_LENGTH = 2000;
export const CHAT_MAX_HISTORY_TURNS = 10;

export interface ChatTurn {
  userMessage: string;
  assistantMessage: string;
  actions?: Array<{ label: string; url: string }>;
}

export interface ChatRequest {
  message: string;
  history: ChatTurn[];
}

/**
 * Chat response with optional server-approved action links.
 * Actions are extracted from knowledge entries and pre-validated against the allowlist.
 */
export interface ChatSuccessResponse {
  message: string;
  /** Server-approved action links (e.g., "Book a strategy call") */
  actions?: Array<{ label: string; url: string }>;
}

export type ChatErrorCode =
  | "INVALID_REQUEST"
  | "UNSAFE_INPUT"
  | "KNOWLEDGE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ChatErrorDetail {
  path: string;
  code: string;
  message: string;
}

export interface ChatErrorResponse {
  error: {
    code: ChatErrorCode;
    message: string;
    details?: ChatErrorDetail[];
  };
}
