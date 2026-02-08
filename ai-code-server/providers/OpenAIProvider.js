import OpenAI from 'openai';
import { BaseProvider } from './BaseProvider.js';

export class OpenAIProvider extends BaseProvider {
  constructor(model = 'gpt-4o') {
    super(model);
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  getProviderName() {
    return 'OpenAI';
  }

  async generateCode(systemPrompt, userMessage, maxTokens = 8192) {
    console.log(`[OpenAIProvider] Generating with model: ${this.model}`);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const choice = response.choices[0];

    return {
      text: choice.message.content || '',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      model: response.model,
      stopReason: choice.finish_reason,
    };
  }
}
