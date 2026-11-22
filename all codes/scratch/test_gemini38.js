import { GoogleGenAI } from '@google/genai';

async function testGemini38() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

  console.log('Sending request to Gemini 3.8 Flash via v1beta...');
  const startTime = Date.now();
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: 'You are the LabVerse Maharashtra SSC Class 10 Physics AI Tutor. A student asks: "Why is an ammeter connected in series?". Give a short Socratic explanation.',
    config: {
      temperature: 0.2
    }
  });

  const latency = Date.now() - startTime;
  console.log(`\n=== REAL GEMINI 3.8 FLASH RESPONSE (Latency: ${latency}ms) ===`);
  console.log(response.text);
}

testGemini38().catch(console.error);
