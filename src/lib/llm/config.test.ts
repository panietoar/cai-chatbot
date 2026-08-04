/**
 * Tests for the provider configuration module.
 *
 * These tests verify:
 * - Environment variable validation at initialization
 * - Proper error handling when variables are missing
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
    process.env.ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
    process.env.ANTHROPIC_API_KEY = "test-key-123";

    // Dynamically import the module to capture the fresh environment
    const config = await import("./config");

    const cfg = config.getProviderConfig();
    expect(cfg.model).toBe("claude-haiku-4-5-20251001");
    expect(cfg.validatedAt).toBeDefined();
  });

  it("should throw if ANTHROPIC_MODEL is missing", async () => {
    delete process.env.ANTHROPIC_MODEL;
    process.env.ANTHROPIC_API_KEY = "test-key-123";

    // Dynamically import the module to capture the fresh environment
    const config = await import("./config");

    expect(() => {
      config.getProviderConfig();
    }).toThrow(/ANTHROPIC_MODEL/i);
  });

  it("should throw if ANTHROPIC_API_KEY is missing", async () => {
    process.env.ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
    delete process.env.ANTHROPIC_API_KEY;

    // Dynamically import the module to capture the fresh environment
    const config = await import("./config");

    expect(() => {
      config.getProviderConfig();
    }).toThrow(/ANTHROPIC_API_KEY/i);
  });
});
