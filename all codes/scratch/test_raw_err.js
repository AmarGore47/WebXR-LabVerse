import { GoogleGenAI } from '@google/genai';

async function testRawError() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: 'Hello',
      config: {
        systemInstruction: 'You are a physics tutor.',
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });
    console.log('SUCCESS! Text:', response.text);
  } catch (err) {
    console.error('Error status:', err.status);
    console.error('Error message:', err.message);
    console.error('Full err object:', JSON.stringify(err, null, 2));
  }
}

testRawError();
