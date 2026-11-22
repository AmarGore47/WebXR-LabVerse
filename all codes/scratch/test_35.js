import { GoogleGenAI } from '@google/genai';

async function test35() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

  for (const m of ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash-preview']) {
    const t0 = Date.now();
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Say {"model":"' + m + '","ready":true} in JSON',
        config: { responseMimeType: 'application/json' }
      });
      console.log(`Model ${m} SUCCESS in ${Date.now() - t0}ms:`, res.text.trim());
    } catch (e) {
      console.log(`Model ${m} FAILED:`, e.message);
    }
  }
}

test35().catch(console.error);
