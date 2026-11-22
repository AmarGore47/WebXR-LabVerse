import { GoogleGenAI } from '@google/genai';

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  // Let's test with v1beta or default
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

  try {
    console.log('Listing models with v1beta...');
    const response = await ai.models.list();
    console.log('Available models:');
    for await (const m of response) {
      if (m.supportedActions?.includes('generateContent') || m.supportedGenerationMethods?.includes('generateContent') || true) {
        console.log(`- ${m.name} (${m.displayName})`);
      }
    }
  } catch (e) {
    console.log('v1beta failed:', e.message);
    try {
      console.log('Trying with default apiVersion...');
      const ai2 = new GoogleGenAI({ apiKey });
      const resp2 = await ai2.models.list();
      for await (const m of resp2) {
        console.log(`- ${m.name}`);
      }
    } catch (e2) {
      console.log('default list failed:', e2.message);
    }
  }
}

listModels();
