// Base provider class - abstract interface for AI providers
export class BaseProvider {
  constructor(model) {
    if (new.target === BaseProvider) {
      throw new Error('BaseProvider is abstract and cannot be instantiated directly');
    }
    this.model = model;
  }

  /**
   * Generate code based on the given prompts
   * @param {string} systemPrompt - The system prompt with instructions
   * @param {string} userMessage - The user's message/request
   * @param {number} maxTokens - Maximum tokens to generate
   * @returns {Promise<{text: string, inputTokens: number, outputTokens: number, model: string, stopReason: string}>}
   */
  async generateCode(systemPrompt, userMessage, maxTokens = 8192) {
    throw new Error('generateCode must be implemented by subclass');
  }

  /**
   * Get the provider name
   * @returns {string}
   */
  getProviderName() {
    throw new Error('getProviderName must be implemented by subclass');
  }
}
