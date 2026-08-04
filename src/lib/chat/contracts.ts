export const CHAT_MAX_MESSAGE_LENGTH = 2000;
export const CHAT_MAX_HISTORY_TURNS = 10;

export interface ChatTurn {
  userMessage: string;
  assistantMessage: string;
}

export interface ChatRequest {
  message: string;
  history: ChatTurn[];
}

export interface ChatSuccessResponse {
  message: string;
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
