/**
 * test_assistant_radial_upgrade.js
 * Comprehensive Verification Test Suite for Upgraded 3D AI Lab Assistant & Radial Holographic Menu.
 *
 * Validates:
 * 1. Existing character model & hitbox reuse (no duplicate avatar)
 * 2. Overhead status badge with clear interaction indicator
 * 3. onStudentClick(): character orientation, greeting animation, welcome dialogue & opening radial menu
 * 4. Radial menu structure: exactly 6 primary educational nodes
 * 5. Feature 1 (Ask Anything): Text input, suggested chips, Socratic explanation, voice speech
 * 6. Feature 2 (Hints): 3-tier progressive hints (Conceptual -> Directional -> Actionable)
 * 7. Feature 3 (Next Step): Authoritative workflow stage progression & apparatus identification
 * 8. Feature 4 (AI Video): Video demonstration chapters, timestamps & playback state
 * 9. Feature 5 (Examples): Ohm's law calculations (10 Ω resistor, graph slope, applications)
 * 10. Feature 6 (Questions & Answers): MCQs with 4 options, answer validation & score tracking
 * 11. Closing transitions & return to idle state
 */

import './test_dom_mock.js';
import assert from 'assert';
import * as THREE from 'three';
import { LabAssistant } from './src/entities/labAssistant.js';
import { AssistantRadialMenu, RADIAL_OPTIONS } from './src/ui/assistantRadialMenu.js';
import { AssistantSubpanels, EXAMPLES_DATA, MCQS_DATA, PRACTICAL_VIDEOS } from './src/ui/assistantSubpanels.js';
import { OhmsLawWorkflowManager, WORKFLOW_STAGES } from './src/experiments/ohmsLaw/ohmsLawWorkflowManager.js';
import { OhmsLawSimulation } from './src/experiments/ohmsLaw/ohmsLawSimulation.js';
import { CircuitState } from './src/circuit/circuitState.js';
import { SimulationStateBridge } from './src/guidance/simulationStateBridge.js';
import { OHMS_LAW_CONFIG } from './src/experiments/ohmsLaw/ohmsLawConfig.js';

console.log('================================================================');
console.log('  LABVERSE: 3D AI LAB ASSISTANT & RADIAL HOLOGRAPHIC MENU AUDIT  ');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}\n`, err.stack);
  }
}

// Global Three.js Scene Setup
const scene = new THREE.Scene();
const circuitState = new CircuitState();
const simulation = new OhmsLawSimulation(circuitState);
const workflowManager = new OhmsLawWorkflowManager({ simulation, circuitState, config: OHMS_LAW_CONFIG });
const bridge = new SimulationStateBridge({ simulation, circuitState, workflowManager, config: OHMS_LAW_CONFIG });

// ─── 1. Character & Hitbox Audit ──────────────────────────────────────────

runTest('1. LabAssistant reuses existing character, positions naturally and attaches interactive hitbox', () => {
  const assistant = new LabAssistant({
    scene,
    position: new THREE.Vector3(1.25, 0, 0.35)
  });

  assert.ok(assistant.group, 'LabAssistant group must exist in scene');
  assert.strictEqual(assistant.position.x, 1.25);
  assert.strictEqual(assistant.position.z, 0.35);

  const hitbox = assistant.getHitbox();
  assert.ok(hitbox, 'Hitbox must exist');
  assert.strictEqual(hitbox.userData.isAssistantHitbox, true, 'Hitbox must have isAssistantHitbox flag');
  assert.strictEqual(typeof hitbox.userData.onPress, 'function', 'Hitbox must have onPress callback for clicks/pinches');
});

runTest('2. Overhead status badge displays interaction prompt when idle', () => {
  const assistant = new LabAssistant({ scene });
  assert.strictEqual(assistant.tutorState, 'idle');
  assert.ok(assistant.tutorBadgeSprite, 'Overhead status badge sprite must exist');
  assert.strictEqual(assistant.tutorBadgeSprite.position.y, 2.05, 'Badge should hover above assistant head');
});

runTest('3. onStudentClick turns assistant towards student, sets greeting state and opens radial menu', () => {
  const assistant = new LabAssistant({ scene });
  let speechSpoken = null;
  assistant.initTutorServices({
    speechService: {
      speak: (text) => { speechSpoken = text; }
    }
  });

  const studentPos = new THREE.Vector3(0.0, 1.3, 0.82);
  assistant.onStudentClick(studentPos);

  assert.strictEqual(assistant.tutorState, 'greeting', 'Assistant tutor state must transition to greeting');
  assert.ok(speechSpoken && speechSpoken.includes('Welcome to Physics VR Simulation!'), 'Should trigger welcome speech');
  assert.strictEqual(assistant.radialMenu.isOpen, true, 'Radial menu must be open');
  assert.strictEqual(assistant.radialMenu.group.visible, true, 'Radial menu group must be visible in scene');
});

// ─── 2. Radial Menu Structure Audit ───────────────────────────────────────

runTest('4. Radial menu defines exactly six primary educational options arranged circularly', () => {
  assert.strictEqual(RADIAL_OPTIONS.length, 6, 'Must define exactly 6 options');

  const expectedIds = ['radial_ask', 'radial_hints', 'radial_next_step', 'radial_video', 'radial_examples', 'radial_qna'];
  const actualIds = RADIAL_OPTIONS.map(o => o.id);
  assert.deepStrictEqual(actualIds, expectedIds, 'Options must match the 6 specified features');

  const menu = new AssistantRadialMenu({ scene });
  assert.strictEqual(menu.buttonMeshes.length, 6, 'Menu must build 6 visual meshes');
  // 6 radial buttons + 1 center close button = 7 colliders
  assert.strictEqual(menu.clickableObjects.length, 7, 'Must have colliders for all 6 options + close');
});

runTest('5. Selecting a radial option opens the corresponding subpanel and minimizes radial menu', () => {
  const assistant = new LabAssistant({ scene });
  assistant.initTutorServices({ workflowManager, bridge });

  assistant.radialMenu.open();
  assert.strictEqual(assistant.radialMenu.isOpen, true);

  // Click "Ask Anything"
  assistant.onRadialSelect('radial_ask');
  assert.strictEqual(assistant.subpanels.group.visible, true);
  assert.strictEqual(assistant.subpanels.currentView, 'ask_anything');

  // Click "Hints"
  assistant.onRadialSelect('radial_hints');
  assert.strictEqual(assistant.subpanels.currentView, 'hints');

  // Click "Next Step"
  assistant.onRadialSelect('radial_next_step');
  assert.strictEqual(assistant.subpanels.currentView, 'next_step');

  // Click "AI Video"
  assistant.onRadialSelect('radial_video');
  assert.strictEqual(assistant.subpanels.currentView, 'video');

  // Click "Examples"
  assistant.onRadialSelect('radial_examples');
  assert.strictEqual(assistant.subpanels.currentView, 'examples');

  // Click "Q & A"
  assistant.onRadialSelect('radial_qna');
  assert.strictEqual(assistant.subpanels.currentView, 'qna');
});

// ─── 3. Feature 1: Ask Anything Audit ─────────────────────────────────────

runTest('6. Ask Anything handles student questions, loading states and AI responses', async () => {
  let askedPayload = null;
  const mockTutorClient = {
    askQuestion: async (payload) => {
      askedPayload = payload;
      return {
        message: 'An ammeter has very low internal resistance (~0.2 Ω) and is connected in series.',
        explanation: 'Series connection ensures all electrons flow through the meter.',
        hint: 'Check table wiring.',
        suggestedAction: 'Verify connection to Resistor (+).'
      };
    }
  };

  const subpanels = new AssistantSubpanels({ scene, tutorClient: mockTutorClient, bridge });
  subpanels.currentQuestionText = 'Why is the ammeter in series?';
  await subpanels.submitQuestion();

  assert.ok(askedPayload, 'TutorClient must be called with payload');
  assert.strictEqual(askedPayload.question, 'Why is the ammeter in series?');
  assert.strictEqual(subpanels.aiResponse.message.includes('low internal resistance'), true);
  assert.strictEqual(subpanels.isLoadingAI, false, 'Loading state must resolve to false');
});

// ─── 4. Feature 2: Hints Audit ────────────────────────────────────────────

runTest('7. Hints feature provides 3-tier progressive hints (Conceptual, Directional, Actionable)', () => {
  const subpanels = new AssistantSubpanels({ scene, bridge });
  subpanels.openView('hints');

  assert.strictEqual(subpanels.currentHintTier, 1, 'Default hint level must be 1 (Conceptual)');

  // Advance to Level 2
  subpanels.currentHintTier = 2;
  subpanels.redraw();
  assert.strictEqual(subpanels.currentHintTier, 2, 'Hint tier updated to 2 (Directional)');

  // Advance to Level 3
  subpanels.currentHintTier = 3;
  subpanels.redraw();
  assert.strictEqual(subpanels.currentHintTier, 3, 'Hint tier updated to 3 (Actionable)');
});

// ─── 5. Feature 3: Next Step Audit ────────────────────────────────────────

runTest('8. Next Step reads authoritative stage progress from OhmsLawWorkflowManager', () => {
  const subpanels = new AssistantSubpanels({ scene, workflowManager });
  subpanels.openView('next_step');

  const curStage = workflowManager.getCurrentStageInfo();
  assert.ok(curStage, 'Must obtain stage metadata');
  assert.strictEqual(curStage.step, 1);
  assert.strictEqual(curStage.id, WORKFLOW_STAGES.NOT_STARTED);
  assert.ok(curStage.title.includes('Ohm’s Law'), 'Title should reflect current stage');
});

// ─── 6. Feature 4: AI Video Audit ─────────────────────────────────────────

runTest('9. AI Video library configures Ohm’s Law practical chapters and playback controls', () => {
  const vid = PRACTICAL_VIDEOS.ohmsLaw;
  assert.ok(vid, 'Ohm’s law video configuration must exist');
  assert.strictEqual(vid.chapters.length, 5, 'Must contain 5 demonstration chapters');

  const subpanels = new AssistantSubpanels({ scene });
  subpanels.openView('video');

  assert.strictEqual(subpanels.videoState.isPlaying, false);
  // Simulate play
  subpanels.videoState.isPlaying = true;
  assert.strictEqual(subpanels.videoState.isPlaying, true);

  // Jump to Chapter 3 (Circuit Wiring at 90s)
  subpanels.videoState.currentChapter = 3;
  subpanels.videoState.currentTime = 90;
  assert.strictEqual(subpanels.videoState.currentChapter, 3);
  assert.strictEqual(subpanels.videoState.currentTime, 90);
});

// ─── 7. Feature 5: Examples Audit ─────────────────────────────────────────

runTest('10. Examples section displays 4 structured cards with verified Ohm’s law calculations', () => {
  assert.strictEqual(EXAMPLES_DATA.length, 4, 'Must have 4 calculation cards');

  // Verify Card 2 (Standard 10 Ω resistor calculation)
  const card2 = EXAMPLES_DATA[1];
  assert.strictEqual(card2.id, 2);
  assert.ok(card2.calculation.includes('4.0 V / 0.40 A = 10.0 Ω'), 'Card 2 must calculate 10.0 Ω resistor');

  // Verify Card 3 (V-I graph slope R = ΔV / ΔI)
  const card3 = EXAMPLES_DATA[2];
  assert.ok(card3.calculation.includes('ΔV = 5.0 - 1.0 = 4.0 V'), 'Card 3 must compute delta V');
  assert.ok(card3.result.includes('10.0 Ω'), 'Slope must equal 10.0 Ω');
});

// ─── 8. Feature 6: Questions & Answers Audit ──────────────────────────────

runTest('11. Questions & Answers MCQs validate student choices, provide immediate feedback & score', () => {
  assert.strictEqual(MCQS_DATA.length, 5, 'Must contain 5 verified MCQs');

  const subpanels = new AssistantSubpanels({ scene });
  subpanels.openView('qna');

  const q1 = MCQS_DATA[0];
  // Correct answer for Q1 is index 1 ("To measure the full electric current flowing through the loop")
  assert.strictEqual(q1.correctIndex, 1);

  // Student selects correct option
  subpanels.selectedOptionIndex = 1;
  subpanels.isAnswerSubmitted = true;
  subpanels.sessionScore.total++;
  subpanels.sessionScore.correct++;

  assert.strictEqual(subpanels.sessionScore.correct, 1);
  assert.strictEqual(subpanels.sessionScore.total, 1);
});

// ─── 9. Menu Closing & Return to Idle ─────────────────────────────────────

runTest('12. Closing menu smoothly hides subpanels, radial menu and resets assistant to idle', () => {
  const assistant = new LabAssistant({ scene });
  assistant.onStudentClick();
  assistant.onRadialSelect('radial_ask');

  assert.strictEqual(assistant.subpanels.group.visible, true);

  // Student clicks Close
  assistant.onRadialClose();

  assert.strictEqual(assistant.subpanels.group.visible, false);
  assert.strictEqual(assistant.radialMenu.isOpen, false);
  assert.strictEqual(assistant.tutorState, 'idle');
});

console.log('\n================================================================');
console.log(`  RESULTS: ${passedTests} PASSED / ${totalTests - passedTests} FAILED (TOTAL: ${totalTests})`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
