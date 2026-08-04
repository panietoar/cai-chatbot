import { describe, expect, it } from "vitest";
import {
  mapValidationFailureToHttp422,
  validateChatRequest,
} from "./chat-request";

describe("mapValidationFailureToHttp422", () => {
  it("maps validation failures to user-safe structured 422 responses", () => {
    const validation = validateChatRequest({
      message: "",
      history: [],
      topLevelExtra: true,
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      const response = mapValidationFailureToHttp422(validation);

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe("INVALID_REQUEST");
      expect(response.body.error.message).toBe(
        "Your request could not be processed. Check the message and try again.",
      );
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          {
            path: "message",
            code: "empty",
            message: "Message must not be empty or whitespace only.",
          },
          {
            path: "topLevelExtra",
            code: "unknown_field",
            message: "Unknown field is not allowed.",
          },
        ]),
      );

      expect(response.body).not.toHaveProperty("stack");
      expect(response.body.error).not.toHaveProperty("stack");
      expect(response.body.error).not.toHaveProperty("internal");
    }
  });
});
