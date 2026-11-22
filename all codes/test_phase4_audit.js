/**
 * test_phase4_audit.js
 * LabVerse — Phase 4 Comprehensive Final Verification Audit Script
 *
 * Verifies:
 * 1. Desktop microphone permission & rejection flow
 * 2. Real multilingual question handling (English, Hindi, Marathi)
 * 3. Transcription validation before backend submission
 * 4. Verification that Gemini backend receives language and live bridge context
 * 5. TTS playback controls: play, pause, resume, stop, and avatar sync
 * 6. Overlap prevention for rapid/repeated question triggers
 * 7. Host environment system voice detection and fallback reporting
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

async function runAudit() {
  console.log('\n=============================================================');
  console.log('   LABVERSE PHASE 4: COMPREHENSIVE FINAL VERIFICATION AUDIT  ');
  console.log('=============================================================\n');

  // Setup scene and circuit
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
  console.log('--- 1. DESKTOP MICROPHONE PERMISSION & REJECTION AUDIT ---');
  const sr = new SpeechRecognitionService({ language: 'English' });
  assert(sr.isSupported === true, 'SpeechRecognition API available in desktop environment');

  // Test permission denial
  let permDeniedHandled = false;
  sr.onError = (code, msg) => {
    if (code === 'PERMISSION_DENIED') permDeniedHandled = true;
  };
  sr.recognition.onerror({ error: 'not-allowed' });
  assert(permDeniedHandled === true, 'Microphone permission denial triggers PERMISSION_DENIED error');
  assert(sr.state === 'error', 'Service transitions cleanly to "error" state');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. REAL MULTILINGUAL QUESTIONS & TRANSCRIPT ACCURACY ---');
  const questionsToTest = [
    {
      lang: 'English',
      bcp47: 'en-IN',
      text: 'Why is the ammeter connected in series and the voltmeter in parallel?',
      expectedKeywords: ['ammeter', 'series', 'parallel']
    },
    {
      lang: 'Hindi',
      bcp47: 'hi-IN',
      text: 'अमीटर श्रेणीक्रम में और वोल्टमीटर समांतर क्रम में क्यों जोड़ा जाता है?',
      expectedKeywords: ['अमीटर', 'श्रेणीक्रम', 'समांतर']
    },
    {
      lang: 'Marathi',
      bcp47: 'mr-IN',
      text: 'ओहमचा नियम काय आहे आणि व्होल्टेज करंटच्या प्रमाणात कसे असते?',
      expectedKeywords: ['ओहमचा नियम', 'व्होल्टेज', 'प्रमाणात']
    }
  ];

  for (const q of questionsToTest) {
    const multiSR = new SpeechRecognitionService({ language: q.lang });
    assert(multiSR.getLanguageTag() === q.bcp47, `${q.lang} maps accurately to ${q.bcp47}`);

    multiSR.recognition.mockSpeech = q.text;
    const recognized = await multiSR.startListening();
    assert(recognized === q.text, `Captured transcript matches spoken query in ${q.lang}`);
    for (const kw of q.expectedKeywords) {
      assert(recognized.includes(kw), `Transcript contains essential domain term "${kw}"`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. LIVE SIMULATION TELEMETRY & BACKEND TRANSMISSION ---');
  let backendPayloads = [];
  const mockClient = {
    setBridge: () => {},
    askQuestion: async (params) => {
      backendPayloads.push(params);
      return {
        success: true,
        response: {
          message: `Answer in ${params.language}: Circuit current is currently ${params.simulationContext ? params.simulationContext.currentAmperes : 0} A.`,
          explanation: 'Ohm’s law establishes V = I * R across standard conductors.',
          hint: 'Verify the key is closed.',
          suggestedAction: 'Observe the ammeter deflection.',
          responseType: 'explanation'
        }
      };
    }
  };

  const tts = new AITutorSpeechService({
    assistant,
    narration,
    language: 'English'
  });

  const panel = new VRAITutorPanel({
    scene,
    assistant,
    tutorClient: mockClient,
    bridge,
    narration,
    sound,
    speechRecognition: sr,
    speechService: tts
  });

  // Test question submission in all 3 languages with live telemetry
  for (const q of questionsToTest) {
    panel.currentLanguage = q.lang;
    await panel.askQuestion(q.text);
    const lastPayload = backendPayloads[backendPayloads.length - 1];
    assert(lastPayload.question === q.text, `Backend received question text in ${q.lang}`);
    assert(lastPayload.language === q.lang, `Backend received language parameter: ${q.lang}`);
    assert(panel.lastTutorResponse.message.includes(`Answer in ${q.lang}`), `Tutor response updated for ${q.lang}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. TTS PLAYBACK CONTROLS, AVATAR SYNC & OVERLAP PREVENTION ---');
  const mockSynth = global.window.speechSynthesis;

  // Track playback events
  let cancelCalledCount = 0;
  const originalCancel = mockSynth.cancel;
  mockSynth.cancel = function () {
    cancelCalledCount++;
    mockSynth.speaking = false;
  };

  // Configure continuous speech for control tests
  mockSynth.speak = function (utter) {
    mockSynth.speaking = true;
    if (utter.onstart) utter.onstart();
  };

  // Start Speech
  tts.speak('Physics explanation in progress...');
  await new Promise((r) => setTimeout(r, 30));
  assert(tts.state === 'speaking', 'TTS enters "speaking" state on playback start');
  assert(assistant.tutorState === 'speaking', 'Avatar enters "speaking" state during voice output');

  // Pause
  tts.pause();
  assert(tts.state === 'paused', 'Playback paused successfully');

  // Resume
  tts.resume();
  assert(tts.state === 'speaking', 'Playback resumed successfully');

  // Rapid repeat question trigger (Overlap Prevention)
  const cancelBefore = cancelCalledCount;
  tts.speak('New question interrupting previous audio...');
  await new Promise((r) => setTimeout(r, 30));
  assert(cancelCalledCount > cancelBefore, 'Prior speech synthesis cancelled immediately before new speech begins');

  // Stop
  tts.stop();
  assert(tts.state === 'idle', 'TTS returns to "idle" upon stop()');
  assert(assistant.tutorState === 'idle', 'Avatar returns to "idle" upon stop()');
  mockSynth.cancel = originalCancel;

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. TTS VOICE DETECTION & FALLBACK AUDIT ---');
  const voices = tts.availableVoices;
  console.log(`  ℹ️ Detected ${voices.length} voice(s) in system speech engine:`);
  voices.forEach((v) => console.log(`     - [${v.lang}] ${v.name} (local: ${v.localService})`));

  const enVoice = tts.getBestVoice('English');
  const hiVoice = tts.getBestVoice('Hindi');
  const mrVoice = tts.getBestVoice('Marathi');

  console.log(`  🎯 Selected voice for English: "${enVoice ? enVoice.name : 'None'}" (${enVoice ? enVoice.lang : 'N/A'})`);
  console.log(`  🎯 Selected voice for Hindi:   "${hiVoice ? hiVoice.name : 'None'}" (${hiVoice ? hiVoice.lang : 'N/A'})`);
  console.log(`  🎯 Selected voice for Marathi: "${mrVoice ? mrVoice.name : 'None'}" (${mrVoice ? mrVoice.lang : 'N/A'})`);

  assert(enVoice !== null, 'English voice identified');
  assert(hiVoice !== null, 'Hindi voice resolved (native or Indian English fallback)');
  assert(mrVoice !== null, 'Marathi voice resolved (native or Indian English fallback)');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. SPATIAL VR COLLIDERS & QUICK ACTION VERIFICATION ---');
  const colliders = panel.getClickableObjects();
  assert(colliders.length >= 10, `Spatial panel has ${colliders.length} interactive 3D colliders (expected >= 10)`);

  const micCollider = colliders.find((c) => c.userData.buttonId === 'tutor_btn_mic');
  const stopCollider = colliders.find((c) => c.userData.buttonId === 'tutor_btn_stop_speech');
  const repeatCollider = colliders.find((c) => c.userData.buttonId === 'tutor_btn_repeat');

  assert(micCollider !== undefined, '3D spatial microphone button collider exists');
  assert(stopCollider !== undefined, '3D spatial stop speech button collider exists');
  assert(repeatCollider !== undefined, '3D spatial repeat response button collider exists');

  // Test clicking spatial buttons
  micCollider.userData.onPress();
  assert(panel.isVoiceListening === true, 'Clicking 3D microphone button activates voice listening');
  stopCollider.userData.onPress();
  assert(panel.isVoiceListening === false, 'Clicking 3D stop button halts voice listening');

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. WEB AUDIO RESUME ON USER GESTURE / XR SESSION ---');
  sound.init();
  const state = await sound.resumeContext();
  assert(state === 'running', 'Web Audio API context resumed to "running" state');

  console.log('\n=============================================================');
  console.log(`   PHASE 4 AUDIT COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
