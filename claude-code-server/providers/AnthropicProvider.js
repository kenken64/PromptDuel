import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './BaseProvider.js';

export class AnthropicProvider extends BaseProvider {
  constructor(model = 'claude-sonnet-4-20250514') {
    super(model);
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  getProviderName() {
    return 'Anthropic';
  }

  async generateCode(systemPrompt, userMessage, maxTokens = 8192) {
    console.log(`[AnthropicProvider] Generating with model: ${this.model}`);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    return {
      text: response.content[0].text,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      model: response.model,
      stopReason: response.stop_reason,
    };
  }
}
