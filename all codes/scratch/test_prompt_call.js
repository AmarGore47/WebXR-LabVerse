import { GeminiProvider } from '../server/services/geminiProvider.js';
import { buildTutorSystemPrompt } from '../server/prompts/tutorSystemPrompt.js';
import { SocraticTutorEngine } from '../server/services/socraticTutorEngine.js';

async function testPromptBuilderCall() {
  const provider = new GeminiProvider();
  const engine = new SocraticTutorEngine();
  const strategy = 'concept_explanation';
  const language = 'English';

  const socraticInstructions = engine.buildSocraticInstructions({
    strategy,
    language
  });

  const systemPrompt = buildTutorSystemPrompt({
    language,
    strategy,
    socraticInstructions,
    learningState: {}
  });

  console.log('System prompt length:', systemPrompt.length);

  try {
    const res = await provider.generateResponse({
      systemPrompt,
      userPrompt: 'Why is an ammeter connected in series?',
      timeoutMs: 15000
    });
    console.log('PROVIDER CALL SUCCESS! Latency:', res.metadata.latencyMs);
    console.log('RAW RESPONSE TEXT:', res.rawText);
  } catch (err) {
    console.error('ERROR in generateResponse:', err);
  }
}

testPromptBuilderCall();
