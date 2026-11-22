/**
 * aiProvider.js
 * Abstract AI Provider Interface for LabVerse.
 * Allows switching between Gemini and future providers seamlessly.
 */

export class AIProvider {
  /**
   * Generates a tutor response given system instructions and user message.
   * @param {Object} params
   * @param {string} params.systemPrompt
   * @param {string} params.userPrompt
   * @param {number} [params.timeoutMs]
   * @returns {Promise<{ rawText: string, metadata: Object }>}
   */
  async generateResponse(params) {
    throw new Error('generateResponse() must be implemented by the provider subclass.');
  }

  /**
   * Returns provider identifier.
   */
  getProviderName() {
    throw new Error('getProviderName() must be implemented by the provider subclass.');
  }
}
