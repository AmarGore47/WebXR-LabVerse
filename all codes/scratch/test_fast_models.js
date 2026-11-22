import { GoogleGenAI } from '@google/genai';

async function testFastModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

  const testList = [
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-pro-latest'
  ];

  for (const m of testList) {
    process.stdout.write(`Testing ${m}... `);
    const t0 = Date.now();
    try {
      const abortCtrl = new AbortController();
      const timeout = setTimeout(() => abortCtrl.abort(), 10000);

      const res = await ai.models.generateContent({
        model: m,
        contents: 'Say {"test":"ok"} in JSON',
        config: {
          abortSignal: abortCtrl.signal,
          responseMimeType: 'application/json'
        }
      });
      clearTimeout(timeout);
      console.log(`SUCCESS in ${Date.now() - t0}ms:`, res.text.trim());
      return m;
    } catch (err) {
      console.log(`FAILED (${Date.now() - t0}ms):`, err.message || err.status);
    }
  }
}

testFastModels().catch(console.error);
