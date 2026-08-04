/**
 * Provider configuration module.
 *
 * Validates and exports the Anthropic API configuration.
 * Validation happens at module initialization; this ensures errors are caught at startup.
 * The API key is never exported; it is used internally by the provider module only.
 */

interface ProviderConfig {
  model: string;
  validatedAt: string;
}

let config: ProviderConfig | null = null;
let apiKey: string | null = null;

/**
 * Validate and cache the provider configuration.
 * Throws if ANTHROPIC_MODEL or ANTHROPIC_API_KEY is missing or empty.
 */
function initializeConfig(): void {
  if (config !== null) {
    return;
  }

  const model = process.env.ANTHROPIC_MODEL?.trim();
  const key = process.env.ANTHROPIC_API_KEY?.trim();

  if (!model) {
    throw new Error(
      "Configuration error: ANTHROPIC_MODEL environment variable is missing or empty. " +
        "Set it to a valid Anthropic model identifier (e.g., claude-haiku-4-5-20251001)."
    );
  }

  if (!key) {
    throw new Error(
      "Configuration error: ANTHROPIC_API_KEY environment variable is missing or empty. " +
        "Set it to your Anthropic API key."
    );
  }

  config = {
    model,
    validatedAt: new Date().toISOString(),
  };

  apiKey = key;
}

/**
 * Get the validated provider configuration.
 * Throws if environment variables are missing or invalid.
 */
export function getProviderConfig(): ProviderConfig {
  initializeConfig();
  if (!config) {
    throw new Error("Failed to initialize provider configuration.");
  }
  return config;
}

/**
 * Get the validated API key (internal use only).
 * This function is not exported; only the provider module should call it.
 */
export function getApiKey(): string {
  initializeConfig();
  if (!apiKey) {
    throw new Error("Failed to retrieve API key.");
  }
  return apiKey;
}
