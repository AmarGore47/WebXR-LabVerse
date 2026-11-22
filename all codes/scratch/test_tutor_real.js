import { GeminiProvider } from '../server/services/geminiProvider.js';
import { TutorService } from '../server/services/tutorService.js';

async function testUpdatedGeminiProvider() {
  console.log('Testing GeminiProvider directly with real API...');
  const provider = new GeminiProvider();
  console.log('Provider initialized. Model:', provider.modelName);

  const tutorService = new TutorService(provider);
  const startTime = Date.now();

  const result = await tutorService.processTutorRequest({
    message: 'Why is the ammeter connected in series with the circuit?',
    telemetry: {
      circuitState: { isComplete: false, wireCount: 3 },
      simulationState: { keyClosed: false, current: 0 }
    },
    topic: 'circuit_instrumentation',
    language: 'en'
  });

  const latency = Date.now() - startTime;
  console.log(`\n=== REAL TUTOR SERVICE RESULT (Latency: ${latency}ms) ===`);
  console.log('Success:', result.success);
  console.log('Metadata:', result.metadata || result.response?.metadata);
  console.log('Strategy:', result.strategy || result.response?.strategy);
  console.log('Tutor Message:', result.response?.message || result.message);
}

testUpdatedGeminiProvider().catch(console.error);
