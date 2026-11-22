import { GoogleGenAI } from '@google/genai';
import { buildTutorSystemPrompt } from '../server/prompts/tutorSystemPrompt.js';
import { SocraticTutorEngine } from '../server/services/socraticTutorEngine.js';

async function testWithModelFallback() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

  const engine = new SocraticTutorEngine();
  const socraticInstructions = engine.buildSocraticInstructions({
    strategy: 'concept_explanation',
    language: 'English'
  });
  const systemPrompt = buildTutorSystemPrompt({
    language: 'English',
    strategy: 'concept_explanation',
    socraticInstructions,
    learningState: {}
  });

  const models = ['gemini-3-flash-preview', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];

  for (const model of models) {
    try {
      console.log(`Trying ${model}...`);
      const t0 = Date.now();
      const response = await ai.models.generateContent({
        model,
        contents: 'Why is an ammeter connected in series?',
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });
      console.log(`\n🎉 SUCCESS with ${model} in ${Date.now() - t0}ms!`);
      console.log('RESPONSE:', response.text);
      return;
    } catch (e) {
      console.log(`Failed ${model}:`, e.message || e.status);
    }
  }
}

testWithModelFallback().catch(console.error);
