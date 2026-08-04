import {
  CHAT_MAX_HISTORY_TURNS,
  CHAT_MAX_MESSAGE_LENGTH,
  ChatErrorResponse,
  ChatRequest,
  ChatTurn,
} from "../chat/contracts";

type ValidationCode =
  | "required"
  | "type"
  | "empty"
  | "max_length"
  | "max_items"
  | "unknown_field";

export interface ChatRequestValidationIssue {
  path: string;
  code: ValidationCode;
  message: string;
}

export interface ChatRequestValidationSuccess {
  ok: true;
  data: ChatRequest;
}

export interface ChatRequestValidationFailure {
  ok: false;
  issues: ChatRequestValidationIssue[];
}

export type ChatRequestValidationResult =
  | ChatRequestValidationSuccess
  | ChatRequestValidationFailure;

export interface ValidationErrorHttpResponse {
  status: 422;
  body: ChatErrorResponse;
}

const USER_SAFE_VALIDATION_MESSAGE =
  "Your request could not be processed. Check the message and try again.";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addUnknownFieldIssues(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  pathPrefix: string,
  issues: ChatRequestValidationIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      const fieldPath = pathPrefix ? `${pathPrefix}.${key}` : key;

      issues.push({
        path: fieldPath,
        code: "unknown_field",
        message: "Unknown field is not allowed.",
      });
    }
  }
}

function validateMessageField(
  value: unknown,
  path: string,
  issues: ChatRequestValidationIssue[],
): string | null {
  if (typeof value !== "string") {
    issues.push({
      path,
      code: "type",
      message: "Expected a string value.",
    });
    return null;
  }

  if (value.trim().length === 0) {
    issues.push({
      path,
      code: "empty",
      message: "Message must not be empty or whitespace only.",
    });
    return null;
  }

  if (value.length > CHAT_MAX_MESSAGE_LENGTH) {
    issues.push({
      path,
      code: "max_length",
      message: `Message must be at most ${CHAT_MAX_MESSAGE_LENGTH} characters.`,
    });
    return null;
  }

  return value;
}

function validateTurn(
  value: unknown,
  index: number,
  issues: ChatRequestValidationIssue[],
): ChatTurn | null {
  const path = `history[${index}]`;

  if (!isPlainObject(value)) {
    issues.push({
      path,
      code: "type",
      message: "Expected an object for each history turn.",
    });
    return null;
  }

  addUnknownFieldIssues(value, ["userMessage", "assistantMessage", "actions"], path, issues);

  const hasUserMessage = Object.prototype.hasOwnProperty.call(value, "userMessage");
  const hasAssistantMessage = Object.prototype.hasOwnProperty.call(
    value,
    "assistantMessage",
  );

  if (!hasUserMessage) {
    issues.push({
      path: `${path}.userMessage`,
      code: "required",
      message: "Required field is missing.",
    });
  }

  if (!hasAssistantMessage) {
    issues.push({
      path: `${path}.assistantMessage`,
      code: "required",
      message: "Required field is missing.",
    });
  }

  const userMessage = hasUserMessage
    ? validateMessageField(value.userMessage, `${path}.userMessage`, issues)
    : null;
  const assistantMessage = hasAssistantMessage
    ? validateMessageField(value.assistantMessage, `${path}.assistantMessage`, issues)
    : null;

  if (userMessage === null || assistantMessage === null) {
    return null;
  }

  return {
    userMessage,
    assistantMessage,
  };
}

export function validateChatRequest(input: unknown): ChatRequestValidationResult {
  const issues: ChatRequestValidationIssue[] = [];

  if (!isPlainObject(input)) {
    issues.push({
      path: "",
      code: "type",
      message: "Expected a JSON object request body.",
    });
    return {
      ok: false,
      issues,
    };
  }

  addUnknownFieldIssues(input, ["message", "history"], "", issues);

  const hasMessage = Object.prototype.hasOwnProperty.call(input, "message");

  if (!hasMessage) {
    issues.push({
      path: "message",
      code: "required",
      message: "Required field is missing.",
    });
  }

  const message = hasMessage
    ? validateMessageField(input.message, "message", issues)
    : null;

  const historyValue = input.history;
  const history: ChatTurn[] = [];

  if (historyValue !== undefined) {
    if (!Array.isArray(historyValue)) {
      issues.push({
        path: "history",
        code: "type",
        message: "Expected an array of history turns.",
      });
    } else {
      if (historyValue.length > CHAT_MAX_HISTORY_TURNS) {
        issues.push({
          path: "history",
          code: "max_items",
          message: `History must be at most ${CHAT_MAX_HISTORY_TURNS} turns.`,
        });
      }

      for (const [index, turnValue] of historyValue.entries()) {
        const validatedTurn = validateTurn(turnValue, index, issues);
        if (validatedTurn) {
          history.push(validatedTurn);
        }
      }
    }
  }

  if (issues.length > 0 || message === null) {
    return {
      ok: false,
      issues,
    };
  }

  return {
    ok: true,
    data: {
      message,
      history,
    },
  };
}

export function mapValidationFailureToHttp422(
  failure: ChatRequestValidationFailure,
): ValidationErrorHttpResponse {
  return {
    status: 422,
    body: {
      error: {
        code: "INVALID_REQUEST",
        message: USER_SAFE_VALIDATION_MESSAGE,
        details: failure.issues.map((issue) => ({
          path: issue.path,
          code: issue.code,
          message: issue.message,
        })),
      },
    },
  };
}
