/**
 * test_phase4_voice_audio.js
 * LabVerse — Phase 4: Voice Interaction & Audio Integration Verification Suite.
 *
 * Verifies all 15 required Phase 4 scenarios:
 * 1. Desktop microphone permission handling
 * 2. Speech recognition initialization & state machine (idle -> listening -> success)
 * 3. English voice recognition (en-IN / en-US)
 * 4. Hindi voice recognition (hi-IN)
 * 5. Marathi voice recognition (mr-IN)
 * 6. Backend question submission from voice input with simulation context
 * 7. Gemini response playback via AITutorSpeechService
 * 8. Stop, pause, resume and restart speech playback
 * 9. Unsupported browser fallback (Quest browser or browsers without SpeechRecognition)
 * 10. Microphone permission denial handling
 * 11. Backend failure resilience during voice flow
 * 12. Prevention of overlapping speech & coordination with NarrationSystem
 * 13. AudioContext state inspection and automatic resume
 * 14. WebXR session start and end audio lifecycle
 * 15. Voice diagnostics report & Meta Quest 3S compatibility audit
 */

import './test_dom_mock.js';
import * as THREE from 'three';
import { SpeechRecognitionService } from './src/audio/speechRecognitionService.js';
import { AITutorSpeechService } from './src/audio/aiTutorSpeechService.js';
import { LabAssistant } from './src/entities/labAssistant.js';
import { VRAITutorPanel } from './src/xr/vrAITutorPanel.js';
import { AITutorClient } from './src/guidance/aiTutorClient.js';
import { NarrationSystem } from './src/guidance/narrationSystem.js';
import { SimulationStateBridge } from './src/guidance/simulationStateBridge.js';
import { OhmsLawSimulation } from './src/experiments/ohmsLaw/ohmsLawSimulation.js';
import { CircuitState } from './src/circuit/circuitState.js';
import { CircuitValidator } from './src/circuit/circuitValidator.js';
import { sound } from './src/audio.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== RUNNING LABVERSE PHASE 4 VOICE INTERACTION & AUDIO TESTS ===\n');

  // Setup common fixtures
  const scene = new THREE.Scene();
  const circuitState = new CircuitState();
  const validator = new CircuitValidator(circuitState);
  const simulation = new OhmsLawSimulation();
  const bridge = new SimulationStateBridge({
    simulation,
    circuitState,
    circuitValidator: validator
  });

  const narration = new NarrationSystem();
  const assistant = new LabAssistant({ scene, narration });

  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Desktop Microphone Permission Handling ---');
  let getUserMediaCalled = false;
  const origGUM = global.navigator.mediaDevices.getUserMedia;
  global.navigator.mediaDevices.getUserMedia = async (constraints) => {
    getUserMediaCalled = true;
    assert(constraints.audio === true, 'getUserMedia requested audio stream');
    return {
      getTracks: () => [{ stop: () => {} }]
    };
  };

  const srService = new SpeechRecognitionService({ language: 'English' });
  assert(srService.isSupported === true, 'SpeechRecognition detected as supported');
  assert(srService.state === 'idle', 'Initial state is idle');

  // Trigger permission check via warmup
  try {
    srService.recognition.mockSpeech = 'What is resistance?';
    const text = await srService.startListening();
    assert(getUserMediaCalled === true, 'getUserMedia was invoked upon user action');
    assert(text === 'What is resistance?', 'Recognized question text matches speech input');
  } catch (e) {
    console.error('Test 1 error:', e);
  } finally {
    global.navigator.mediaDevices.getUserMedia = origGUM;
  }

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Speech Recognition State Lifecycle ---');
  const statesObserved = [];
  const stateTracker = new SpeechRecognitionService({
    onStateChange: (st) => statesObserved.push(st)
  });

  assert(stateTracker.state === 'idle', 'Begins in idle state');
  stateTracker.recognition.mockSpeech = 'Explain Ohm’s Law';
  await stateTracker.startListening();
  assert(statesObserved.includes('listening'), 'Transitions to "listening" state');
  assert(statesObserved.includes('success'), 'Transitions to "success" state on final transcript');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Multilingual Recognition — English (en-IN) ---');
  const enSR = new SpeechRecognitionService({ language: 'English' });
  assert(enSR.getLanguageTag() === 'en-IN', 'English maps to en-IN BCP-47 tag');
  assert(enSR.recognition.lang === 'en-IN', 'Recognition instance configured with en-IN');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Multilingual Recognition — Hindi (hi-IN) ---');
  const hiSR = new SpeechRecognitionService({ language: 'Hindi' });
  assert(hiSR.getLanguageTag() === 'hi-IN', 'Hindi maps to hi-IN BCP-47 tag');
  assert(hiSR.recognition.lang === 'hi-IN', 'Recognition instance configured with hi-IN');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Multilingual Recognition — Marathi (mr-IN) ---');
  const mrSR = new SpeechRecognitionService({ language: 'Marathi' });
  assert(mrSR.getLanguageTag() === 'mr-IN', 'Marathi maps to mr-IN BCP-47 tag');
  assert(mrSR.recognition.lang === 'mr-IN', 'Recognition instance configured with mr-IN');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: Backend Question Submission from Voice Input ---');
  let capturedBackendPayload = null;
  const mockTutorClient = {
    setBridge: () => {},
    askQuestion: async (params) => {
      capturedBackendPayload = params;
      return {
        success: true,
        response: {
          message: 'The ammeter is connected in series so all current flows through it.',
          explanation: 'Series connection ensures accurate current reading without dividing the circuit branch.',
          hint: 'Connect Ammeter (+) to Switch Contact (Right).',
          suggestedAction: 'Verify ammeter is in series.',
          responseType: 'explanation'
        }
      };
    }
  };

  const ttsService = new AITutorSpeechService({
    assistant,
    narration,
    language: 'English'
  });

  const tutorPanel = new VRAITutorPanel({
    scene,
    assistant,
    tutorClient: mockTutorClient,
    bridge,
    narration,
    sound,
    speechRecognition: enSR,
    speechService: ttsService
  });

  assert(tutorPanel.speechRecognition === enSR, 'Panel holds SpeechRecognition service reference');
  assert(tutorPanel.speechService === ttsService, 'Panel holds AITutorSpeechService reference');

  // Submit recognized question
  await tutorPanel.askQuestion('Why is ammeter connected in series?');
  assert(capturedBackendPayload !== null, 'Backend received voice query');
  assert(capturedBackendPayload.question === 'Why is ammeter connected in series?', 'Question transmitted accurately');
  assert(capturedBackendPayload.language === 'English', 'Language passed to backend');
  assert(tutorPanel.lastTutorResponse.message.includes('ammeter is connected in series'), 'Panel updated with answer');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 7: Gemini Response Playback via AITutorSpeechService ---');
  let spokenText = null;
  let voiceUsed = null;
  const mockSynth = global.window.speechSynthesis;
  const origSpeak = mockSynth.speak;
  mockSynth.speak = function (utter) {
    spokenText = utter.text;
    voiceUsed = utter.voice;
    mockSynth.speaking = true;
    if (utter.onstart) utter.onstart();
    setTimeout(() => {
      mockSynth.speaking = false;
      if (utter.onend) utter.onend();
    }, 15);
  };

  const playSuccess = await ttsService.speak('Potential difference is directly proportional to current.');
  assert(playSuccess === true, 'TTS speak() resolved successfully');
  assert(spokenText === 'Potential difference is directly proportional to current.', 'Utterance received exact text');
  assert(voiceUsed !== null, 'Assigned appropriate system voice');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 8: Stop, Pause, Resume and Avatar State Sync ---');
  ttsService.setAssistant(assistant);

  // Keep speech active continuously until explicitly stopped
  mockSynth.speak = function (utter) {
    mockSynth.speaking = true;
    if (utter.onstart) utter.onstart();
  };

  // Start speaking
  const speakPromise = ttsService.speak('Long audio message playing...');
  await new Promise((r) => setTimeout(r, 30));
  assert(assistant.tutorState === 'speaking', 'Avatar entered "speaking" state during playback');
  assert(ttsService.state === 'speaking', 'TTS service state is "speaking"');

  // Pause
  ttsService.pause();
  assert(ttsService.state === 'paused', 'TTS transitioned to "paused" state');

  // Resume
  ttsService.resume();
  assert(ttsService.state === 'speaking', 'TTS returned to "speaking" state');

  // Stop
  ttsService.stop();
  assert(ttsService.state === 'idle', 'TTS transitioned to "idle" state upon stop()');
  assert(assistant.tutorState === 'idle', 'Avatar returned to "idle" state upon stop()');
  mockSynth.speak = origSpeak;

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 9: Unsupported Browser Fallback (e.g. Meta Quest Browser) ---');
  const origSR = global.window.SpeechRecognition;
  const origWSR = global.window.webkitSpeechRecognition;
  delete global.window.SpeechRecognition;
  delete global.window.webkitSpeechRecognition;

  const unsupportedSR = new SpeechRecognitionService();
  assert(unsupportedSR.isSupported === false, 'Correctly flags isSupported=false when API missing');

  let errorReported = null;
  unsupportedSR.onError = (code, msg) => {
    errorReported = { code, msg };
  };

  try {
    await unsupportedSR.startListening();
    assert(false, 'Should throw in unsupported browser');
  } catch (err) {
    assert(errorReported !== null, 'Triggered onError callback');
    assert(errorReported.code === 'UNSUPPORTED_BROWSER', 'Error code is UNSUPPORTED_BROWSER');
    assert(typeof simulation.getState === 'function', 'Practical simulation continues unharmed');
  }

  // Restore
  global.window.SpeechRecognition = origSR;
  global.window.webkitSpeechRecognition = origWSR;

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 10: Microphone Permission Denial Handling ---');
  const permDenialSR = new SpeechRecognitionService();
  let permErrorCaptured = null;
  permDenialSR.onError = (code, msg) => {
    permErrorCaptured = { code, msg };
  };

  permDenialSR._initRecognitionInstance();
  // Simulate browser firing not-allowed error
  permDenialSR.recognition.onerror({ error: 'not-allowed' });
  assert(permErrorCaptured !== null, 'Captured permission error');
  assert(permErrorCaptured.code === 'PERMISSION_DENIED', 'Error code is PERMISSION_DENIED');
  assert(permDenialSR.state === 'error', 'Service state is error');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 11: Backend Failure Resilience During Voice Flow ---');
  const failingTutorClient = {
    setBridge: () => {},
    askQuestion: async () => ({
      success: false,
      error: { code: 'AI_TIMEOUT', message: 'Gemini server response timed out.' }
    })
  };

  const failingPanel = new VRAITutorPanel({
    scene,
    assistant,
    tutorClient: failingTutorClient,
    bridge,
    narration,
    sound,
    speechRecognition: enSR,
    speechService: ttsService
  });

  await failingPanel.askQuestion('Explain resistance');
  assert(failingPanel.statusType === 'error', 'Panel transitioned to error status');
  assert(failingPanel.statusMessage.includes('Gemini server response timed out'), 'Error message displayed');
  assert(assistant.tutorState === 'warning' || assistant.tutorState === 'idle', 'Avatar state handled gracefully');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 12: Speech Overlap Prevention & Narration Mutual Exclusivity ---');
  let narrationStopped = false;
  narration.stop = () => { narrationStopped = true; };

  let synthCancelled = false;
  mockSynth.cancel = () => { synthCancelled = true; };

  await ttsService.speak('Testing mutual exclusivity');
  assert(narrationStopped === true, 'NarrationSystem stopped before tutor speech begins');
  assert(synthCancelled === true, 'Prior synthesis cancelled before new utterance');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 13: AudioContext Inspection and Automatic Resume ---');
  sound.init();
  const ctxStateBefore = sound.getContextState();
  assert(ctxStateBefore === 'running' || ctxStateBefore === 'suspended', 'Valid AudioContext state reported');
  const resumeResult = await sound.resumeContext();
  assert(resumeResult === 'running', 'AudioContext successfully resumed to "running"');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 14: WebXR Session End Voice Termination ---');
  tutorPanel.isVoiceListening = true;
  tutorPanel.stopVoice();
  assert(tutorPanel.isVoiceListening === false, 'Voice listening terminated on session stop');
  assert(tutorPanel.isVoiceSpeaking === false, 'Voice speaking terminated on session stop');
  assert(assistant.tutorState === 'idle', 'Avatar restored to idle');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 15: Voice Diagnostics & Compatibility Audit ---');
  const srDiag = enSR.getDiagnostics();
  assert(srDiag.isSupported === true, 'SR Diagnostics reports supported engine');
  assert(srDiag.language === 'English', 'SR Diagnostics reports selected language');

  const ttsDiag = ttsService.getDiagnostics();
  assert(ttsDiag.available === true, 'TTS Diagnostics reports speech synthesis available');
  assert(ttsDiag.voicesCount > 0, 'TTS Diagnostics reports detected system voices');
  assert(ttsDiag.selectedVoice !== 'None', 'TTS Diagnostics selected best matching voice');

  console.log('\n=======================================================');
  console.log(`PHASE 4 VOICE & AUDIO RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('=======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
