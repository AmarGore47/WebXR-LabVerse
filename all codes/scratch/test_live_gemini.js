import { GeminiProvider } from '../server/services/geminiProvider.js';
import { TutorService } from '../server/services/tutorService.js';
import { createApp } from '../server/index.js';
import http from 'http';

async function testRealGemini() {
  console.log('Testing Real Gemini API with configured key...');
  console.log('API Key configured:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}... (length: ${process.env.GEMINI_API_KEY.length})` : 'NONE');
  console.log('Model configured:', process.env.GEMINI_MODEL);

  const provider = new GeminiProvider({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: process.env.GEMINI_MODEL
  });

  try {
    const rawRes = await provider.generateResponse({
      systemPrompt: 'You are an AI physics tutor. Output valid JSON: {"message": "hello", "strategy": "direct_answer"}',
      userPrompt: 'Hello, what is Ohm\'s Law?',
      timeoutMs: 10000
    });
    console.log('SUCCESS! Real Gemini Response:', rawRes);
  } catch (err) {
    console.log('Gemini Provider Exception:', err.code, err.message);
  }
}

testRealGemini().catch(console.error);
