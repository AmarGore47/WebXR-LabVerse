/**
 * geminiProvider.js
 * Google Gemini implementation of AIProvider for LabVerse using @google/genai SDK.
 */

import { AIProvider } from './aiProvider.js';

export class GeminiProvider extends AIProvider {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.modelName = options.modelName ?? process.env.GEMINI_MODEL ?? 'gemini-3-flash-preview';
    this.fallbackModels = options.fallbackModels ?? ['gemini-3-flash-preview', 'gemini-3.5-flash-lite'];
    this.mockClient = options.mockClient ?? null;
  }

  getProviderName() {
    return 'gemini';
  }

  /**
   * Invokes Google Gemini API with timeout control and error handling.
   */
  async generateResponse({ systemPrompt, userPrompt, timeoutMs = 10000 }) {
    if (!this.apiKey && !this.mockClient) {
      const err = new Error('GEMINI_API_KEY is not configured on the server.');
      err.code = 'API_KEY_MISSING';
      throw err;
    }

    const startTime = Date.now();

    try {
      // 1. If mock client provided (for testing / offline verification)
      if (this.mockClient) {
        const result = await this._callWithTimeout(
          () => this.mockClient.generateContent({ systemPrompt, userPrompt }),
          timeoutMs
        );
        return {
          rawText: typeof result === 'string' ? result : (result.text ?? ''),
          metadata: {
            provider: 'gemini',
            model: this.modelName,
            latencyMs: Date.now() - startTime
          }
        };
      }

      // 2. Real Gemini SDK execution using @google/genai SDK with automatic resilient model fallback
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: this.apiKey, apiVersion: 'v1beta' });

      const modelsToTry = Array.from(new Set([this.modelName, ...this.fallbackModels]));
      let lastErr = null;
      let rawText = null;
      let successfulModel = this.modelName;

      for (const model of modelsToTry) {
        try {
          const callPromise = async () => {
            const response = await ai.models.generateContent({
              model,
              contents: userPrompt,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.2, // Low temperature for deterministic pedagogical correctness
                responseMimeType: 'application/json'
              }
            });
            return response.text;
          };

          rawText = await this._callWithTimeout(callPromise, timeoutMs);
          successfulModel = model;
          break;
        } catch (err) {
          lastErr = err;
          // If auth error, break immediately
          if (err.status === 401 || err.status === 403) throw err;
          console.warn(`[GeminiProvider] Model ${model} failed (${err.status || err.message}), attempting fallback model...`);
        }
      }

      if (!rawText) {
        throw lastErr || new Error('All candidate Gemini models failed to respond.');
      }

      return {
        rawText,
        metadata: {
          provider: 'gemini',
          model: successfulModel,
          latencyMs: Date.now() - startTime
        }
      };
    } catch (err) {
      if (err.code === 'TIMEOUT' || err.code === 'API_TIMEOUT') {
        const timeoutErr = new Error(`Gemini API request timed out after ${timeoutMs}ms.`);
        timeoutErr.code = 'API_TIMEOUT';
        throw timeoutErr;
      }

      const msg = (err.message || '').toLowerCase();

      // Check for authentication / invalid key error
      if (
        err.status === 400 ||
        err.status === 401 ||
        err.status === 403 ||
        msg.includes('api key') ||
        msg.includes('api_key_invalid') ||
        msg.includes('unauthenticated') ||
        msg.includes('permission_denied')
      ) {
        const authErr = new Error('The configured GEMINI_API_KEY is invalid or unauthorized.');
        authErr.code = 'API_KEY_INVALID';
        throw authErr;
      }

      // Check for quota / rate limit error
      if (
        err.status === 429 ||
        msg.includes('resource_exhausted') ||
        msg.includes('quota') ||
        msg.includes('rate limit')
      ) {
        const quotaErr = new Error('Gemini API quota or rate limit exceeded.');
        quotaErr.code = 'RATE_LIMIT_EXCEEDED';
        throw quotaErr;
      }

      // Check for network or DNS resolution failure
      if (
        err.code === 'ENOTFOUND' ||
        err.code === 'ECONNREFUSED' ||
        err.code === 'ETIMEDOUT' ||
        msg.includes('fetch failed') ||
        msg.includes('network error')
      ) {
        const netErr = new Error('Network error connecting to Google AI servers.');
        netErr.code = 'NETWORK_ERROR';
        throw netErr;
      }

      // Check for model not found
      if (err.status === 404 || msg.includes('model not found') || msg.includes('models/')) {
        const modelErr = new Error(`The requested Gemini model "${this.modelName}" is unavailable.`);
        modelErr.code = 'MODEL_NOT_FOUND';
        throw modelErr;
      }

      const apiErr = new Error(err.message ?? 'Unknown Gemini API error occurred.');
      apiErr.code = err.code ?? 'API_ERROR';
      throw apiErr;
    }
  }

  /**
   * Helper that wraps an async call in a timeout race.
   */
  async _callWithTimeout(fn, timeoutMs) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('Operation timed out');
        err.code = 'TIMEOUT';
        reject(err);
      }, timeoutMs);
    });

    try {
      const res = await Promise.race([fn(), timeoutPromise]);
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }
}
