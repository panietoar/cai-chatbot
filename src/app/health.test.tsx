import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { GET } from "./api/health/route";
import Home from "./page";

describe("/api/health", () => {
  it("returns a minimal health payload", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      status: "ok",
      service: "cadre-chatbot",
    });
    expect(payload).not.toHaveProperty("apiKey");
    expect(payload).not.toHaveProperty("model");
    expect(payload).not.toHaveProperty("secret");
  });
});

describe("Home page", () => {
  it("renders Cadre shell purpose and limitations", () => {
    const html = renderToString(<Home />);

    expect(html).toContain("Welcome to Cadre support insights");
    expect(html).toContain("This site provides a simple public shell describing Cadre’s AI support capabilities.");
    expect(html).toContain("What it cannot do yet");
    expect(html).toContain("Answer private account questions or access client data.");
  });
});
