import { AnthropicProvider } from './AnthropicProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { GoogleProvider } from './GoogleProvider.js';
import { PROVIDER_CONFIG, isProviderAvailable } from './config.js';

export class ProviderFactory {
  // Cache provider instances keyed by "provider:model"
  static _cache = new Map();

  /**
   * Create or retrieve a cached provider instance
   * @param {string} provider - Provider name (anthropic, openai, google)
   * @param {string} model - Model ID (optional, uses default if not provided)
   * @returns {BaseProvider} Provider instance
   */
  static create(provider, model) {
    // Validate provider
    if (!PROVIDER_CONFIG[provider]) {
      throw new Error(`Unknown provider: ${provider}. Valid providers: ${Object.keys(PROVIDER_CONFIG).join(', ')}`);
    }

    // Check if API key is available
    if (!isProviderAvailable(provider)) {
      throw new Error(`API key not configured for provider: ${provider}. Set ${PROVIDER_CONFIG[provider].envKey} environment variable.`);
    }

    // Use default model if not specified
    if (!model) {
      const defaultModel = PROVIDER_CONFIG[provider].models.find(m => m.default);
      model = defaultModel ? defaultModel.id : PROVIDER_CONFIG[provider].models[0].id;
    }

    // Return cached instance if available
    const cacheKey = `${provider}:${model}`;
    if (ProviderFactory._cache.has(cacheKey)) {
      return ProviderFactory._cache.get(cacheKey);
    }

    console.log(`[ProviderFactory] Creating ${provider} provider with model: ${model}`);

    let instance;
    switch (provider) {
      case 'anthropic':
        instance = new AnthropicProvider(model);
        break;
      case 'openai':
        instance = new OpenAIProvider(model);
        break;
      case 'google':
        instance = new GoogleProvider(model);
        break;
      default:
        throw new Error(`Provider not implemented: ${provider}`);
    }

    ProviderFactory._cache.set(cacheKey, instance);
    return instance;
  }

  /**
   * Get provider info for display
   * @param {string} provider - Provider name
   * @param {string} model - Model ID
   * @returns {{providerName: string, modelName: string}}
   */
  static getInfo(provider, model) {
    const config = PROVIDER_CONFIG[provider];
    if (!config) {
      return { providerName: provider, modelName: model };
    }

    const modelInfo = config.models.find(m => m.id === model);
    return {
      providerName: config.name,
      modelName: modelInfo ? modelInfo.name : model,
    };
  }
}
