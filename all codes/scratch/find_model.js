import { GoogleGenAI } from '@google/genai';

async function findWorkingModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing with API key:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');
  const ai = new GoogleGenAI({ apiKey });

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp'
  ];

  for (const model of candidateModels) {
    try {
      console.log(`Trying model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: 'Hello! Please respond with {"status": "ok"}.',
        config: {
          responseMimeType: 'application/json'
        }
      });
      console.log(`>>> MODEL ${model} WORKS! Response:`, response.text);
      return model;
    } catch (err) {
      console.log(`Model ${model} failed:`, err.status || err.code || err.message);
    }
  }
}

findWorkingModel().catch(console.error);
