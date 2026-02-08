import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProvider } from './BaseProvider.js';

export class GoogleProvider extends BaseProvider {
  constructor(model = 'gemini-2.0-flash') {
    super(model);
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }

  getProviderName() {
    return 'Google';
  }

  async generateCode(systemPrompt, userMessage, maxTokens = 8192) {
    console.log(`[GoogleProvider] Generating with model: ${this.model}`);

    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
      },
    });

    const response = result.response;
    const text = response.text();

    // Gemini API doesn't always provide token counts in the same way
    const usageMetadata = response.usageMetadata || {};

    return {
      text: text,
      inputTokens: usageMetadata.promptTokenCount || 0,
      outputTokens: usageMetadata.candidatesTokenCount || 0,
      model: this.model,
      stopReason: response.candidates?.[0]?.finishReason || 'STOP',
    };
  }
}
