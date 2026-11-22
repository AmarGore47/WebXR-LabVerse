import { GoogleGenAI } from '@google/genai';
import { buildTutorSystemPrompt } from '../server/prompts/tutorSystemPrompt.js';
import { SocraticTutorEngine } from '../server/services/socraticTutorEngine.js';

async function testWhatCauses400() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

  const engine = new SocraticTutorEngine();
  const simulationContext = {
    circuitTopology: { isComplete: false, wireCount: 3 },
    switchState: { isClosed: false },
    measurements: { current: 0 }
  };

  const strategy = engine.determineStrategy({
    question: 'Why is the ammeter connected in series?',
    simulationContext,
    diagnosis: { hasErrors: false }
  });

  const socraticInstructions = engine.buildSocraticInstructions({
    strategy,
    language: 'English',
    simulationContext
  });

  const systemPrompt = buildTutorSystemPrompt({
    simulationContext,
    language: 'English',
    diagnosis: { hasErrors: false },
    strategy,
    socraticInstructions,
    learningState: {}
  });

  console.log('System prompt length:', systemPrompt.length);

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Why is the ammeter connected in series?',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });
    console.log('SUCCESS! Text:', res.text);
  } catch (err) {
    console.error('FAILED WITH 400! Message:', err.message);
    console.error('Details:', JSON.stringify(err, null, 2));
  }
}

testWhatCauses400();
