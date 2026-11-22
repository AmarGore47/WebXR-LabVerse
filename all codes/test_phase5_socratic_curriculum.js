/**
 * test_phase5_socratic_curriculum.js
 * LabVerse — Phase 5 Socratic Tutoring Intelligence, Error Diagnosis & Maharashtra SSC Class 10 Curriculum Test Suite.
 *
 * Verifies:
 * 1. Maharashtra SSC Class 10 Physics Curriculum Grounding (Balbharati Ch 4 & Ch 3)
 * 2. Deterministic Error Diagnosis from Authoritative Simulation Telemetry
 * 3. 3-Tier Progressive Hint System (English, Hindi, Marathi; zero answer leakage at L1)
 * 4. Ephemeral In-Memory Student Learning State Tracking & Scoring
 * 5. Socratic Tutoring Engine Pedagogical Strategies & Socratic Rules
 * 6. End-to-End TutorService Integration with Fallback & Gemini Prompt Grounding
 */

import http from 'node:http';
import { MAHARASHTRA_SSC_CURRICULUM } from './server/curriculum/maharashtraSSC/class10Physics.js';
import { ErrorDiagnosisService } from './server/services/errorDiagnosisService.js';
import { ProgressiveHintService } from './server/services/progressiveHintService.js';
import { StudentLearningState } from './server/services/studentLearningState.js';
import { SocraticTutorEngine } from './server/services/socraticTutorEngine.js';
import { TutorService } from './server/services/tutorService.js';
import { createApp } from './server/index.js';
import { SimulationStateBridge } from './src/guidance/simulationStateBridge.js';
import { CircuitState } from './src/circuit/circuitState.js';
import { OhmsLawSimulation } from './src/experiments/ohmsLaw/ohmsLawSimulation.js';

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

console.log('\n=== RUNNING LABVERSE PHASE 5 SOCRATIC & CURRICULUM TEST SUITE ===\n');

// =========================================================================
// SECTION 1: Maharashtra SSC Class 10 Curriculum Grounding
// =========================================================================
console.log('--- 1. Maharashtra SSC Class 10 Curriculum Grounding ---');

const ohmsLawCurriculum = MAHARASHTRA_SSC_CURRICULUM.practicals.ohms_law;
assert(!!ohmsLawCurriculum, 'Ohm\'s Law practical is registered in curriculum');
assert(ohmsLawCurriculum.chapterNumber === 4, 'Textbook chapter is Chapter 4 (Effects of Electric Current)');
assert(MAHARASHTRA_SSC_CURRICULUM.standard.includes('10'), 'Target standard is Maharashtra SSC Standard 10');
assert(MAHARASHTRA_SSC_CURRICULUM.board.includes('MSBSHSE'), 'Board is MSBSHSE');
assert(Array.isArray(ohmsLawCurriculum.learningObjectives) && ohmsLawCurriculum.learningObjectives.length >= 4, 'Contains at least 4 learning objectives');
assert(ohmsLawCurriculum.scientificFormulae.some(f => f.symbol.includes('V = I * R')), 'Ohm\'s Law formula is V = I * R');
assert(ohmsLawCurriculum.scientificFormulae.some(f => f.symbol.includes('Slope')), 'Slope formula represents resistance R');
assert(Array.isArray(ohmsLawCurriculum.commonMisconceptions) && ohmsLawCurriculum.commonMisconceptions.length === 5, 'Contains exactly 5 common student misconceptions');

// Check that other practicals are flagged as pending research
assert(MAHARASHTRA_SSC_CURRICULUM.practicals.light_refraction.status === 'pending_curriculum_research', 'Light refraction practical is flagged pending_curriculum_research');

// =========================================================================
// SECTION 2: Deterministic Error Diagnosis Service
// =========================================================================
console.log('\n--- 2. Deterministic Student Error Diagnosis Service ---');

const diagnosisService = new ErrorDiagnosisService();

// 2.1 Guard against missing or malformed telemetry
const noContextDiag = diagnosisService.diagnose(null);
assert(noContextDiag.status === 'insufficient_evidence', 'Rejects null context with insufficient_evidence');

const invalidContextDiag = diagnosisService.diagnose({});
assert(invalidContextDiag.status === 'insufficient_evidence', 'Rejects empty context with insufficient_evidence');

// 2.2 Clean circuit diagnosis
const cleanTelemetry = {
  simulationAvailable: true,
  circuitAvailable: true,
  circuitTopology: {
    isComplete: true,
    mistakes: [],
    mistakeCount: 0
  },
  switchState: { isClosed: true },
  observations: { readingsCount: 3, observationsRecorded: true },
  rheostat: { resistance: 15 }
};
const cleanDiag = diagnosisService.diagnose(cleanTelemetry);
assert(cleanDiag.status === 'ok', 'Clean circuit diagnosed with status: ok');
assert(cleanDiag.hasErrors === false, 'Clean circuit hasErrors is false');
assert(cleanDiag.primaryError === null, 'Clean circuit has no primary error');

// 2.3 Critical error: Ammeter in parallel
const ammeterParallelTelemetry = {
  simulationAvailable: true,
  circuitAvailable: true,
  circuitTopology: {
    isComplete: false,
    mistakes: ['Ammeter connected in parallel across resistor'],
    mistakeCount: 1
  },
  switchState: { isClosed: false },
  observations: { readingsCount: 0 }
};
const ammeterDiag = diagnosisService.diagnose(ammeterParallelTelemetry);
assert(ammeterDiag.hasErrors === true, 'Ammeter parallel mistake detected');
assert(ammeterDiag.primaryError.code === 'ERR_AMMETER_SHORT', 'Diagnosed authoritative code ERR_AMMETER_SHORT');
assert(ammeterDiag.primaryError.severity === 'critical', 'Ammeter in parallel severity is critical');
assert(ammeterDiag.primaryError.teachingStrategy === 'misconception_correction', 'Recommends misconception_correction strategy');

// 2.4 Critical error: Voltmeter in series
const voltmeterSeriesTelemetry = {
  simulationAvailable: true,
  circuitAvailable: true,
  circuitTopology: {
    isComplete: false,
    mistakes: ['Voltmeter connected in series in circuit loop'],
    mistakeCount: 1
  },
  switchState: { isClosed: false },
  observations: { readingsCount: 0 }
};
const voltDiag = diagnosisService.diagnose(voltmeterSeriesTelemetry);
assert(voltDiag.primaryError.code === 'ERR_VOLTMETER_IN_SERIES', 'Diagnosed authoritative code ERR_VOLTMETER_IN_SERIES');
assert(voltDiag.primaryError.severity === 'critical', 'Voltmeter in series severity is critical');

// 2.5 Reversed polarity error
const polarityTelemetry = {
  simulationAvailable: true,
  circuitAvailable: true,
  circuitTopology: {
    isComplete: false,
    mistakes: ['Reversed polarity on Voltmeter: (+) terminal connected to ground/negative rail'],
    mistakeCount: 1
  },
  switchState: { isClosed: false },
  observations: { readingsCount: 0 }
};
const polDiag = diagnosisService.diagnose(polarityTelemetry);
assert(polDiag.primaryError.code === 'ERR_REVERSED_POLARITY', 'Diagnosed code ERR_REVERSED_POLARITY');

// 2.6 Short circuit error
const shortTelemetry = {
  simulationAvailable: true,
  circuitAvailable: true,
  circuitTopology: {
    isComplete: false,
    mistakes: ['Dead short circuit detected across power supply terminals'],
    mistakeCount: 1
  },
  switchState: { isClosed: false },
  observations: { readingsCount: 0 }
};
const shortDiag = diagnosisService.diagnose(shortTelemetry);
assert(shortDiag.primaryError.code === 'ERR_SHORT_CIRCUIT', 'Diagnosed code ERR_SHORT_CIRCUIT');

// 2.7 Key open warning
const keyOpenTelemetry = {
  simulationAvailable: true,
  circuitAvailable: true,
  circuitTopology: {
    isComplete: true,
    mistakes: [],
    mistakeCount: 0
  },
  switchState: { isClosed: false },
  observations: { readingsCount: 0 }
};
const keyDiag = diagnosisService.diagnose(keyOpenTelemetry);
assert(keyDiag.primaryError.code === 'WARN_KEY_OPEN', 'Diagnosed procedural warning WARN_KEY_OPEN');

// 2.8 Incomplete circuit warning
const incompleteTelemetry = {
  simulationAvailable: true,
  circuitAvailable: true,
  circuitTopology: {
    isComplete: false,
    mistakes: [],
    mistakeCount: 0
  },
  switchState: { isClosed: false },
  observations: { readingsCount: 0 }
};
const incompDiag = diagnosisService.diagnose(incompleteTelemetry);
assert(incompDiag.primaryError.code === 'ERR_INCOMPLETE_CIRCUIT', 'Diagnosed incomplete circuit code ERR_INCOMPLETE_CIRCUIT');

// 2.9 Supporting Evidence for All 8 Diagnostic Conditions
assert(!!ammeterDiag.primaryError.evidence, 'ERR_AMMETER_SHORT has supporting evidence');
assert(!!voltDiag.primaryError.evidence, 'ERR_VOLTMETER_IN_SERIES has supporting evidence');
assert(!!polDiag.primaryError.evidence, 'ERR_REVERSED_POLARITY has supporting evidence');
assert(!!shortDiag.primaryError.evidence, 'ERR_SHORT_CIRCUIT has supporting evidence');
assert(!!keyDiag.primaryError.evidence, 'WARN_KEY_OPEN has supporting evidence');
assert(!!incompDiag.primaryError.evidence, 'ERR_INCOMPLETE_CIRCUIT has supporting evidence');

// 2.10 Dynamic Resistance Calculation from Observations (R = ΔV / ΔI, not assumed 10 Ω)
console.log('\n--- 2b. Dynamic Resistance & Slope Verification ---');

// Test with 5 Ω resistor (non-10 Ω)
const sim5 = new OhmsLawSimulation({ fixedResistor: 5.0 });
sim5.setCircuitReady(true);
sim5.setKeyClosed(true);

// Vary rheostat across 5 readings: 16 Ω, 12 Ω, 8 Ω, 4 Ω, 0.5 Ω
const rheoSteps = [16.0, 12.0, 8.0, 4.0, 0.5];
rheoSteps.forEach(r => {
  sim5.setRheostatResistance(r);
  sim5.recordReading();
});
const stats5 = sim5.calculateReadingStatistics();
assert(stats5.count === 5, 'Recorded 5 observations for 5 Ω resistor');
assert(Math.abs(stats5.slopeResistance - 5.0) < 0.25, `Dynamic slope calculates to ~5.0 Ω (actual: ${stats5.slopeResistance} Ω)`);
assert(stats5.isVerified === true, 'Verification succeeds when 5 readings are recorded');

// Test with 15 Ω resistor (non-10 Ω)
const sim15 = new OhmsLawSimulation({ fixedResistor: 15.0 });
sim15.setCircuitReady(true);
sim15.setKeyClosed(true);
rheoSteps.forEach(r => {
  sim15.setRheostatResistance(r);
  sim15.recordReading();
});
const stats15 = sim15.calculateReadingStatistics();
assert(Math.abs(stats15.slopeResistance - 15.0) < 0.35, `Dynamic slope calculates to ~15.0 Ω (actual: ${stats15.slopeResistance} Ω)`);

// Test edge case: Zero readings
const simZero = new OhmsLawSimulation();
const statsZero = simZero.calculateReadingStatistics();
assert(statsZero.count === 0, 'Zero readings count is 0');
assert(statsZero.slopeResistance === 0.0, 'Slope resistance is 0.0 when no readings exist');
assert(statsZero.isVerified === false, 'isVerified is false when no readings exist');

// Test edge case: Single reading (N < 2)
simZero.setCircuitReady(true);
simZero.setKeyClosed(true);
simZero.recordReading();
const statsSingle = simZero.calculateReadingStatistics();
assert(statsSingle.count === 1, 'Single reading recorded');
assert(statsSingle.isVerified === false, 'isVerified is false with only 1 reading (insufficient range)');

// =========================================================================
// SECTION 3: 3-Tier Progressive Hint System
// =========================================================================
console.log('\n--- 3. Progressive 3-Tier Hint Engine ---');

const hintService = new ProgressiveHintService();

// Test English hint progression for ERR_AMMETER_SHORT
const hint1 = hintService.getHint({ topic: 'ERR_AMMETER_SHORT', language: 'en' });
assert(hint1.level === 1, 'First hint is Level 1');
assert(hint1.text.length > 20, 'Level 1 hint provides substantive text');
// Level 1 conceptual check: must NOT leak direct action steps like "disconnect" or "swap"
assert(!hint1.text.toLowerCase().includes('disconnect') && !hint1.text.toLowerCase().includes('parallel'), 'Level 1 hint does NOT leak answer / action commands');

const hint2 = hintService.getHint({ topic: 'ERR_AMMETER_SHORT', language: 'en' });
assert(hint2.level === 2, 'Second hint advances to Level 2');
assert(hint2.text.includes('internal resistance') || hint2.text.includes('series'), 'Level 2 hint provides directional physics guidance');

const hint3 = hintService.getHint({ topic: 'ERR_AMMETER_SHORT', language: 'en' });
assert(hint3.level === 3, 'Third hint advances to Level 3');
assert(hint3.text.includes('Disconnect') || hint3.text.includes('series'), 'Level 3 hint provides direct actionable steps');

// Staying at Level 3
const hint4 = hintService.getHint({ topic: 'ERR_AMMETER_SHORT', language: 'en' });
assert(hint4.level === 3, 'Subsequent hint stays capped at Level 3');

// Multi-lingual hints: Hindi and Marathi
const hintHi = hintService.getHint({ topic: 'ERR_VOLTMETER_IN_SERIES', language: 'hi', levelOverride: 1 });
assert(hintHi.language === 'hi', 'Hindi hint generated');
assert(/[\u0900-\u097F]/.test(hintHi.text), 'Hindi hint contains Devanagari characters');

const hintMr = hintService.getHint({ topic: 'ERR_VOLTMETER_IN_SERIES', language: 'mr', levelOverride: 1 });
assert(hintMr.language === 'mr', 'Marathi hint generated');
assert(/[\u0900-\u097F]/.test(hintMr.text), 'Marathi hint contains Devanagari characters');

// Reset topic
hintService.resetTopic('ERR_AMMETER_SHORT');
const hintReset = hintService.getHint({ topic: 'ERR_AMMETER_SHORT', language: 'en' });
assert(hintReset.level === 1, 'Hint tier resets back to Level 1 after issue resolution');

// =========================================================================
// SECTION 4: Session-Level In-Memory Learning State Tracker
// =========================================================================
console.log('\n--- 4. Session Learning State & Score Tracker ---');

const learningState = new StudentLearningState();
assert(learningState.totalQuestionsAsked === 0, 'Initial questions asked is 0');
assert(learningState.understandingScore === 0, 'Initial score is 0 before concepts are understood');

// Rule 1: Asking questions does NOT increase understanding score
learningState.recordTurn({
  studentQuestion: 'Why is ammeter connected in series?',
  strategy: 'concept_explanation',
  tutorResponse: 'Ammeters have low resistance to measure full current without dropping potential.',
  diagnosis: null
});
assert(learningState.totalQuestionsAsked === 1, 'Total questions incremented to 1');
assert(learningState.understandingScore === 0, 'Asking question does NOT increase understanding score');
assert(learningState.dialogueTurns.length >= 1, 'Dialogue turn stored in memory');

// Rule 2: Hint usage does NOT increase understanding score
learningState.recordTutorResponse({
  message: 'Here is a hint',
  strategy: 'progressive_hint',
  hintLevel: 2,
  topic: 'ERR_AMMETER_SHORT'
});
assert(learningState.understandingScore === 0, 'Hint usage does NOT increase understanding score');

// Rule 3: Correct conceptual answers increase understanding score
learningState.markConceptUnderstood('concept_ohms_law');
assert(learningState.understandingScore === 5, 'Understanding score increased to 5% after mastering 1 concept');
learningState.markConceptUnderstood('concept_ammeter_series');
assert(learningState.understandingScore === 10, 'Understanding score increased to 10% after mastering 2 concepts');

// Rule 4: Practical milestones contribute appropriately
const fullSimulationContext = {
  circuitTopology: { isComplete: true, mistakeCount: 0 },
  switchState: { isClosed: true },
  observations: { readingsCount: 5, isOhmLawVerified: true },
  detectedMistakes: []
};
const fullScore = learningState.calculateUnderstandingScore(fullSimulationContext);
assert(fullScore === 90, 'Full practical milestones + 2 concepts = 90%');

// Rule 5: Session reset clears all learning state
learningState.reset();
assert(learningState.totalQuestionsAsked === 0, 'Reset clears questions asked');
assert(learningState.understandingScore === 0, 'Reset clears understanding score to 0');
assert(learningState.dialogueTurns.length === 0, 'Reset clears dialogue history');

// =========================================================================
// SECTION 5: Socratic Tutoring Engine & Pedagogical Strategies
// =========================================================================
console.log('\n--- 5. Socratic Tutoring Engine Pedagogical Strategies ---');

const socraticEngine = new SocraticTutorEngine({
  hintService,
  diagnosisService,
  learningState
});

// 5.1 Explicit action overrides
assert(
  socraticEngine.determineStrategy({ requestedAction: 'hint' }) === 'progressive_hint',
  'requestedAction "hint" maps to progressive_hint'
);
assert(
  socraticEngine.determineStrategy({ requestedAction: 'explain' }) === 'concept_explanation',
  'requestedAction "explain" maps to concept_explanation'
);
assert(
  socraticEngine.determineStrategy({ requestedAction: 'guided_question' }) === 'guided_question',
  'requestedAction "guided_question" maps to guided_question'
);
assert(
  socraticEngine.determineStrategy({ requestedAction: 'check_understanding' }) === 'final_assessment',
  'requestedAction "check_understanding" maps to final_assessment'
);

// 5.2 Direct explanation preference when student asks "tell me" or "explain"
const directQueryStrategy = socraticEngine.determineStrategy({
  question: 'Please tell me why the current is not flowing',
  simulationContext: cleanTelemetry
});
assert(directQueryStrategy === 'concept_explanation', 'Student asking "tell me" receives concept_explanation instead of evasive questions');

// 5.3 Anti-Repetition Check
const question1 = socraticEngine.generateGuidedQuestion({
  simulationContext: ammeterParallelTelemetry,
  diagnosis: ammeterDiag
});
assert(typeof question1 === 'string' && question1.endsWith('?'), 'Generated Socratic guided question ending with question mark');
// Count question marks in guiding prompt (must be exactly ONE question)
const questionMarkCount = (question1.match(/\?/g) || []).length;
assert(questionMarkCount === 1, 'Socratic rule enforced: Exactly ONE guiding question at a time');

// Set previous question and generate next — should not be identical
learningState.lastGuidingQuestion = question1;
const question2 = socraticEngine.generateGuidedQuestion({
  simulationContext: ammeterParallelTelemetry,
  diagnosis: ammeterDiag
});
assert(question2 !== question1, 'Anti-repetition enforced: next guiding question is distinct from previous');

// 5.4 Offline / Fallback Socratic generation
const fallbackResponse = socraticEngine.generateDeterministicResponse({
  strategy: 'misconception_correction',
  question: 'Why did the ammeter spark?',
  simulationContext: ammeterParallelTelemetry,
  diagnosis: ammeterDiag,
  language: 'en'
});
assert(fallbackResponse.includes('ammeter') || fallbackResponse.includes('resistor'), 'Deterministic fallback provides relevant physics explanation');
assert(fallbackResponse.length > 50, 'Deterministic fallback is comprehensive and educational');

// =========================================================================
// SECTION 6: End-to-End TutorService Integration & HTTP Server API
// =========================================================================
console.log('\n--- 6. End-to-End TutorService & API Validation ---');

const cs = new CircuitState();
const sim = new OhmsLawSimulation();
const bridge = new SimulationStateBridge({ circuitState: cs, simulation: sim });
const liveContext = bridge.getAIContext();

// Create Express app with mocked GeminiProvider to test tutor pipeline with Socratic Engine
const mockGemini = {
  isConfigured: () => true,
  generateResponse: async ({ systemPrompt, userPrompt }) => {
    return {
      rawText: JSON.stringify({
        message: "Socratic Guide: Let's inspect your current setup. What does the ammeter measure?",
        explanation: "Ammeters measure current in series.",
        hint: "Check the series connection.",
        suggestedAction: "Inspect meters",
        responseType: "guidance",
        strategy: "guided_question"
      }),
      metadata: { provider: 'mock_gemini' }
    };
  }
};

const tutorService = new TutorService({ provider: mockGemini });
const app = createApp({ tutorService });
const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;

  function makePost(body) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/tutor',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  try {
    // 6.1 Test POST /api/tutor with actionType 'guided_question'
    const resGuide = await makePost({
      question: 'What should I do next?',
      simulationContext: liveContext,
      actionType: 'guided_question',
      language: 'en'
    });
    assert(resGuide.status === 200, 'POST /api/tutor returns 200 OK for guided_question');
    assert(resGuide.body.strategy === 'guided_question', 'Response confirms active strategy: guided_question');
    assert(!!resGuide.body.diagnosis, 'Response includes authoritative diagnosis telemetry');
    assert(!!resGuide.body.learningSnapshot, 'Response includes learning state snapshot');

    // 6.2 Test POST /api/tutor with actionType 'hint'
    const resHint = await makePost({
      question: 'Can you give me a hint?',
      simulationContext: liveContext,
      actionType: 'hint',
      language: 'en'
    });
    assert(resHint.status === 200, 'POST /api/tutor returns 200 OK for hint');
    assert(resHint.body.strategy === 'progressive_hint', 'Response confirms strategy: progressive_hint');
    assert(!!resHint.body.hint, 'Response includes progressive hint object');
    assert(resHint.body.hint.level >= 1, 'Progressive hint tier is >= 1');

    // 6.3 Test POST /api/tutor with Marathi language
    const resMr = await makePost({
      question: 'मला मार्गदर्शन करा',
      simulationContext: liveContext,
      actionType: 'explain',
      language: 'mr'
    });
    assert(resMr.status === 200, 'POST /api/tutor returns 200 OK for Marathi language query');
    assert(resMr.body.language === 'mr', 'Response preserves requested language');

    // 6.4 Test fallback when provider throws
    const failingGemini = {
      isConfigured: () => true,
      generateResponse: async () => {
        const err = new Error('Gemini quota exceeded');
        err.code = 'RATE_LIMIT';
        throw err;
      }
    };
    const fallbackTutorService = new TutorService({ provider: failingGemini });
    const fallbackResult = await fallbackTutorService.processTutorRequest({
      question: 'Why is the voltmeter reading zero?',
      simulationContext: liveContext,
      actionType: 'explain',
      language: 'en'
    });
    assert(fallbackResult.metadata?.provider === 'deterministic_fallback', 'Gracefully switches to deterministic fallback on provider error');
    assert(typeof (fallbackResult.response?.message || fallbackResult.response) === 'string', 'Fallback delivers complete educational response without failing');
    assert(fallbackResult.strategy === 'concept_explanation', 'Strategy retained during fallback');

    // 6.5 Verify learning score persistence across session turns
    const currentScore = tutorService.getLearningState().getSnapshot().understandingScore;
    assert(typeof currentScore === 'number' && currentScore >= 0, 'Session learning state persists across multiple queries');

  } catch (err) {
    console.error('API Test Error:', err);
    failed++;
  } finally {
    server.close(() => {
      console.log(`\n======================================================`);
      console.log(`Phase 5 Test Suite Finished: ${passed} Passed, ${failed} Failed`);
      console.log(`======================================================\n`);
      process.exit(failed > 0 ? 1 : 0);
    });
  }
});
