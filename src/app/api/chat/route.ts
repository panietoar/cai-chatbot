import { NextRequest, NextResponse } from "next/server";
import {
  validateChatRequest,
  mapValidationFailureToHttp422,
} from "../../../lib/validation/chat-request";
import { checkInputGuardrails } from "../../../lib/guardrails/input-guardrails";
import type { ChatSuccessResponse, ChatErrorResponse } from "../../../lib/chat/contracts";

const USER_SAFE_UNSAFE_INPUT_MESSAGE =
  "Your request could not be processed due to policy restrictions. Please rephrase your question.";

const USER_SAFE_INTERNAL_ERROR_MESSAGE =
  "An unexpected error occurred. Please try again later.";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ChatErrorResponse = {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON in request body.",
          details: [
            {
              path: "",
              code: "parse_error",
              message: "The request body must be valid JSON.",
            },
          ],
        },
      };
      return NextResponse.json(errorResponse, { status: 422 });
    }

    // Validate request structure
    const validationResult = validateChatRequest(body);

    if (!validationResult.ok) {
      const httpResponse = mapValidationFailureToHttp422(validationResult);
      return NextResponse.json(httpResponse.body, { status: httpResponse.status });
    }

    // Check input guardrails
    const guardrailResult = checkInputGuardrails(validationResult.data.message);

    if (!guardrailResult.safe) {
      const errorResponse: ChatErrorResponse = {
        error: {
          code: "UNSAFE_INPUT",
          message: USER_SAFE_UNSAFE_INPUT_MESSAGE,
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Return placeholder response for valid, safe input
    const successResponse: ChatSuccessResponse = {
      message:
        "This is a placeholder response. The full chat pipeline is not yet connected.",
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    // Log error server-side but don't expose details to client
    console.error("Unexpected error in /api/chat:", error);

    const errorResponse: ChatErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: USER_SAFE_INTERNAL_ERROR_MESSAGE,
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
