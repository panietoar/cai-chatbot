/**
 * Provider configuration module.
 *
 * Validates and exports the OpenRouter API configuration.
 * Validation happens at module initialization; this ensures errors are caught at startup.
 * The API key is never exported; it is used internally by the provider module only.
 */

interface ProviderConfig {
  model: string;
  siteUrl: string;
  appName: string;
  validatedAt: string;
}

let config: ProviderConfig | null = null;
let apiKey: string | null = null;

/**
 * Validate and cache the provider configuration.
 * Throws if OPENROUTER_MODEL or OPENROUTER_API_KEY is missing or empty.
 */
function initializeConfig(): void {
  if (config !== null) {
    return;
  }

  const model = process.env.OPENROUTER_MODEL?.trim();
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const siteUrl = process.env.OPENROUTER_SITE_URL?.trim() || "";
  const appName = process.env.OPENROUTER_APP_NAME?.trim() || "Cadre AI Support Chatbot";

  if (!model) {
    throw new Error(
      "Configuration error: OPENROUTER_MODEL environment variable is missing or empty. " +
        "Set it to a valid OpenRouter model identifier (e.g., anthropic/claude-3.5-haiku)."
    );
  }

  if (!key) {
    throw new Error(
      "Configuration error: OPENROUTER_API_KEY environment variable is missing or empty. " +
        "Set it to your OpenRouter API key."
    );
  }

  config = {
    model,
    siteUrl,
    appName,
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
