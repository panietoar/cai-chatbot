/**
 * Tests for the provider configuration module.
 *
 * These tests verify:
 * - Environment variable validation at initialization
 * - Proper error handling when variables are missing
 * - Default values for optional configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("config.ts - environment variable validation", () => {
  // Save original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module cache and env vars before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it("should export functions that validate environment", async () => {
    process.env.OPENROUTER_MODEL = "anthropic/claude-3.5-haiku";
    process.env.OPENROUTER_API_KEY = "test-key-123";

    // Dynamically import the module to capture the fresh environment
    const config = await import("./config");

    const cfg = config.getProviderConfig();
    expect(cfg.model).toBe("anthropic/claude-3.5-haiku");
    expect(cfg.validatedAt).toBeDefined();
    expect(cfg.siteUrl).toBe("");
    expect(cfg.appName).toBe("Cadre AI Support Chatbot");
  });

  it("should use optional OPENROUTER_SITE_URL when provided", async () => {
    process.env.OPENROUTER_MODEL = "anthropic/claude-3.5-haiku";
    process.env.OPENROUTER_API_KEY = "test-key-123";
    process.env.OPENROUTER_SITE_URL = "https://example.com";

    const config = await import("./config");

    const cfg = config.getProviderConfig();
    expect(cfg.siteUrl).toBe("https://example.com");
  });

  it("should use optional OPENROUTER_APP_NAME when provided", async () => {
    process.env.OPENROUTER_MODEL = "anthropic/claude-3.5-haiku";
    process.env.OPENROUTER_API_KEY = "test-key-123";
    process.env.OPENROUTER_APP_NAME = "Custom App Name";

    const config = await import("./config");

    const cfg = config.getProviderConfig();
    expect(cfg.appName).toBe("Custom App Name");
  });

  it("should throw if OPENROUTER_MODEL is missing", async () => {
    delete process.env.OPENROUTER_MODEL;
    process.env.OPENROUTER_API_KEY = "test-key-123";

    // Dynamically import the module to capture the fresh environment
    const config = await import("./config");

    expect(() => {
      config.getProviderConfig();
    }).toThrow(/OPENROUTER_MODEL/i);
  });

  it("should throw if OPENROUTER_API_KEY is missing", async () => {
    process.env.OPENROUTER_MODEL = "anthropic/claude-3.5-haiku";
    delete process.env.OPENROUTER_API_KEY;

    // Dynamically import the module to capture the fresh environment
    const config = await import("./config");

    expect(() => {
      config.getProviderConfig();
    }).toThrow(/OPENROUTER_API_KEY/i);
  });
});
