import { GoogleGenAI } from '@google/genai';

async function testErrorDetail() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Hi'
    });
    console.log(res);
  } catch (err) {
    console.error('Full Error:', {
      message: err.message,
      status: err.status,
      stack: err.stack,
      errorDetails: err.errorDetails || err.details || err.response
    });
  }
}

testErrorDetail();
