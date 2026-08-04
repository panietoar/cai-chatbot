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
  it("renders Cadre AI Support Assistant chat interface", () => {
    const html = renderToString(<Home />);

    expect(html).toContain("Cadre AI Support Assistant");
    expect(html).toContain("Ask questions about Cadre");
    expect(html).toContain("AI services");
    expect(html).toContain("This assistant cannot answer private account");
    expect(html).toContain("chat-interface");
  });
});
