import { GeminiProvider } from '../server/services/geminiProvider.js';
import { TutorService } from '../server/services/tutorService.js';

async function debugTutorServiceCall() {
  const provider = new GeminiProvider();
  const tutorService = new TutorService(provider, { enableFallback: false });

  try {
    const result = await tutorService.processTutorRequest({
      message: 'Why is the ammeter connected in series?',
      telemetry: {
        circuitState: { isComplete: false, wireCount: 3 },
        simulationState: { keyClosed: false, current: 0 }
      }
    });
    console.log('SUCCESS! Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('TUTOR SERVICE RAW ERROR:', err);
    console.error('Code:', err.code);
    console.error('Status:', err.status);
    console.error('Original cause:', err.cause);
  }
}

debugTutorServiceCall();
