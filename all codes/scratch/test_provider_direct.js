import { GeminiProvider } from '../server/services/geminiProvider.js';

async function testProviderDirect() {
  const provider = new GeminiProvider();
  console.log('API Key length:', provider.apiKey.length);
  console.log('Model Name:', provider.modelName);

  try {
    const res = await provider.generateResponse({
      systemPrompt: 'You are a tutor. Return JSON: {"message": "ok"}',
      userPrompt: 'Hello'
    });
    console.log('Provider success:', res);
  } catch (e) {
    console.error('Provider error code:', e.code);
    console.error('Provider error message:', e.message);
    console.error('Provider error stack:', e.stack);
  }
}

testProviderDirect();
