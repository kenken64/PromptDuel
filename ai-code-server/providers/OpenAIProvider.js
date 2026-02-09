import OpenAI from 'openai';
import { BaseProvider } from './BaseProvider.js';

export class OpenAIProvider extends BaseProvider {
  constructor(model = 'gpt-4o') {
    super(model);
    // Codex models can take much longer (agentic processing)
    const timeoutMs = this._isCodexModel(model) ? 180_000 : 120_000;
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: timeoutMs,
    });
  }

  _isCodexModel(model = this.model) {
    return model.includes('codex');
  }

  getProviderName() {
    return 'OpenAI';
  }

  // Codex models use the Responses API, not Chat Completions
  _isResponsesModel() {
    return this._isCodexModel();
  }

  async generateCode(systemPrompt, userMessage, maxTokens = 8192) {
    // Codex models need higher token limits — they do internal processing
    const effectiveMaxTokens = this._isCodexModel() ? Math.max(maxTokens, 32768) : maxTokens;
    console.log(`[OpenAIProvider] Generating with model: ${this.model}, maxTokens: ${effectiveMaxTokens}`);

    try {
      if (this._isResponsesModel()) {
        return await this._generateWithResponses(systemPrompt, userMessage, effectiveMaxTokens);
      }
      return await this._generateWithChatCompletions(systemPrompt, userMessage, effectiveMaxTokens);
    } catch (error) {
      console.error(`[OpenAIProvider] API Error:`);
      console.error(`[OpenAIProvider]   Message: ${error.message}`);
      console.error(`[OpenAIProvider]   Status:  ${error.status || 'N/A'}`);
      console.error(`[OpenAIProvider]   Code:    ${error.code || 'N/A'}`);
      console.error(`[OpenAIProvider]   Type:    ${error.type || error.constructor.name}`);
      if (error.error) {
        console.error(`[OpenAIProvider]   Detail:  ${JSON.stringify(error.error)}`);
      }
      console.error(`[OpenAIProvider]   Stack:   ${error.stack}`);
      throw error;
    }
  }

  async _generateWithChatCompletions(systemPrompt, userMessage, maxTokens) {
    console.log(`[OpenAIProvider] Using Chat Completions API`);

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

  async _generateWithResponses(systemPrompt, userMessage, maxTokens) {
    console.log(`[OpenAIProvider] Using Responses API (codex model)`);

    const response = await this.client.responses.create({
      model: this.model,
      max_output_tokens: maxTokens,
      instructions: systemPrompt,
      input: userMessage,
    });

    // Extract text — output_text is the primary source, but fall back to
    // scanning the raw output array for any text content
    let text = response.output_text || '';

    if (!text && response.output && response.output.length > 0) {
      console.log(`[OpenAIProvider] output_text empty, scanning raw output (${response.output.length} items)...`);
      const texts = [];
      for (const item of response.output) {
        if (item.type === 'message' && item.content) {
          for (const content of item.content) {
            if (content.text) texts.push(content.text);
          }
        }
      }
      text = texts.join('\n');
      console.log(`[OpenAIProvider] Extracted ${text.length} chars from raw output`);
    }

    if (response.status === 'incomplete') {
      console.warn(`[OpenAIProvider] Response incomplete — model hit token limit (${maxTokens}). Output length: ${text.length}`);
    }

    return {
      text,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      model: response.model,
      stopReason: response.status,
    };
  }
}
