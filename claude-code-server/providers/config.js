// Provider configuration for AI models
export const PROVIDER_CONFIG = {
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', default: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    ],
    envKey: 'ANTHROPIC_API_KEY',
  },
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', default: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
    envKey: 'OPENAI_API_KEY',
  },
  google: {
    name: 'Google',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', default: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
    envKey: 'GOOGLE_API_KEY',
  },
};

// Get default model for a provider
export function getDefaultModel(provider) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) return null;
  const defaultModel = config.models.find(m => m.default);
  return defaultModel ? defaultModel.id : config.models[0]?.id;
}

// Check if provider API key is configured
export function isProviderAvailable(provider) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) return false;
  return !!process.env[config.envKey];
}

// Get list of available providers (those with API keys configured)
export function getAvailableProviders() {
  return Object.entries(PROVIDER_CONFIG)
    .filter(([key]) => isProviderAvailable(key))
    .map(([key, config]) => ({
      id: key,
      name: config.name,
      models: config.models,
    }));
}
