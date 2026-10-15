/**
 * test_guidance_part6.js
 * Automated tests for Part 6: Guided Mode, Narration, Start Current Button,
 * Practical Flow Panel.
 * Uses ES module syntax (project type: "module").
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CircuitState } from './src/circuit/circuitState.js';
import { CircuitValidator } from './src/circuit/circuitValidator.js';
import { REQUIRED_CONNECTIONS } from './src/circuit/circuitConfig.js';
import { OhmsLawSimulation } from './src/experiments/ohmsLaw/ohmsLawSimulation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ---------------------------------------------------------------- */
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++; }
  else       { console.error(`  ❌ FAIL: ${msg}`); failed++; }
}
function assertContains(str, sub, msg) {
  assert(str.includes(sub), `${msg} (looking for: "${sub}")`);
}
function assertNotContains(str, sub, msg) {
  assert(!str.includes(sub), `${msg} (must NOT contain: "${sub}")`);
}
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/* Read source files for static analysis */
const root = __dirname;
const configSrc    = readFileSync(join(root, 'src/guidance/guidedModeConfig.js'), 'utf-8');
const narrationSrc = readFileSync(join(root, 'src/guidance/narrationSystem.js'), 'utf-8');
const startBtnSrc  = readFileSync(join(root, 'src/guidance/startCurrentButton.js'), 'utf-8');
const guidedCtrlSrc= readFileSync(join(root, 'src/guidance/guidedModeController.js'), 'utf-8');
const flowPanelSrc = readFileSync(join(root, 'src/guidance/practicalFlowPanel.js'), 'utf-8');
const mainSrc      = readFileSync(join(root, 'src/main.js'), 'utf-8');
const interactSrc  = readFileSync(join(root, 'src/circuit/interactionController.js'), 'utf-8');

console.log('\n--- STARTING PART 6 GUIDED MODE & NARRATION TESTS ---\n');

/* ================================================================
   Suite 1: Guided step config — canonical terminal IDs only
   ================================================================ */
console.log('--- Suite 1: Guided Step Config — Canonical Terminal IDs ---');

const CANONICAL_IDS = [
  'battery_positive','battery_negative','switch_left','switch_right',
  'ammeter_positive','ammeter_negative','rheostat_in','rheostat_out',
  'resistor_left','resistor_right','voltmeter_positive','voltmeter_negative'
];
const LEGACY_IDS = [
  'battery_pos','battery_neg','switch_term1','switch_term2',
  'ammeter_pos','ammeter_neg','rheostat_top','rheostat_slider',
  'voltmeter_pos','voltmeter_neg','resistor_a','resistor_b'
];

const fromMatches = [...configSrc.matchAll(/from:\s*'([^']+)'/g)].map(m => m[1]);
const toMatches   = [...configSrc.matchAll(/to:\s*'([^']+)'/g)].map(m => m[1]);

assert(fromMatches.length === 7, `guidedModeConfig defines 7 'from' terminals (found: ${fromMatches.length})`);
assert(toMatches.length === 7,   `guidedModeConfig defines 7 'to' terminals (found: ${toMatches.length})`);
[...fromMatches, ...toMatches].forEach(id =>
  assert(CANONICAL_IDS.includes(id), `Terminal '${id}' in guided steps is canonical`)
);
LEGACY_IDS.forEach(lid =>
  assertNotContains(configSrc, `'${lid}'`, `guidedModeConfig does not use legacy ID '${lid}'`)
);

/* ================================================================
   Suite 2: Exact 7-step sequence with instruction + reason + narration
   ================================================================ */
console.log('\n--- Suite 2: 7 Steps — Instruction, Reason, NarrationEn ---');

const expectedSteps = [
  { from: 'battery_positive',   to: 'switch_left',      n: 1 },
  { from: 'switch_right',       to: 'ammeter_positive',  n: 2 },
  { from: 'ammeter_negative',   to: 'rheostat_in',       n: 3 },
  { from: 'rheostat_out',       to: 'resistor_left',     n: 4 },
  { from: 'resistor_right',     to: 'battery_negative',  n: 5 },
  { from: 'voltmeter_positive', to: 'resistor_left',     n: 6 },
  { from: 'voltmeter_negative', to: 'resistor_right',    n: 7 }
];
expectedSteps.forEach(s => {
  assertContains(configSrc, `'${s.from}'`, `Step ${s.n}: from='${s.from}'`);
  assertContains(configSrc, `'${s.to}'`,   `Step ${s.n}: to='${s.to}'`);
});

const nInstr  = [...configSrc.matchAll(/instruction:/g)].length;
const nReason = [...configSrc.matchAll(/reason:/g)].length;
const nNarr   = [...configSrc.matchAll(/narrationEn:/g)].length;
assert(nInstr  >= 7, `At least 7 instruction fields (found: ${nInstr})`);
assert(nReason >= 7, `At least 7 reason fields (found: ${nReason})`);
assert(nNarr   >= 7, `At least 7 narrationEn fields (found: ${nNarr})`);

assertContains(configSrc, 'Connect the positive terminal of the battery to the plug key',
  'Step 1 instruction text is correct');
assertContains(configSrc, 'plug key safely opens or closes the circuit',
  'Step 1 reason text is correct');
assertContains(configSrc, 'voltmeter must be connected in parallel',
  'Step 7 reason explains parallel voltmeter');
assertContains(configSrc, 'ammeter is in series and the voltmeter is parallel',
  'Completion message describes final topology');
assertContains(configSrc, 'narrationMr',
  'Marathi narration placeholder exists for future localisation');
assertContains(configSrc, 'wireRemovedWhileActive',
  'GUIDED_NARRATION_EVENTS includes wireRemovedWhileActive');
assertContains(configSrc, 'A wire was removed while current was flowing',
  'wireRemovedWhileActive narration text is present');

/* ================================================================
   Suite 3: Start Current Button — safety and validation delegation
   ================================================================ */
console.log('\n--- Suite 3: Start Current Button — Safety Enforcement ---');

assertContains(startBtnSrc, 'CircuitValidator.validateFullCircuit',
  'StartCurrentButton delegates to CircuitValidator.validateFullCircuit');
assertContains(startBtnSrc, 'simulation.toggleKey',
  'StartCurrentButton calls simulation.toggleKey (existing API, no bypass)');
assertContains(startBtnSrc, 'isFullyValid',
  'StartCurrentButton checks isFullyValid before starting');
assertContains(startBtnSrc, 'hasShortCircuit',
  'StartCurrentButton checks hasShortCircuit');
assertContains(startBtnSrc, 'errorCount',
  'StartCurrentButton checks errorCount');
assertNotContains(stripComments(startBtnSrc), 'keyClosed = true',
  'StartCurrentButton does NOT directly set keyClosed=true (no bypass)');
assertNotContains(stripComments(startBtnSrc), 'circuitReady = true',
  'StartCurrentButton does NOT set circuitReady=true directly');
assertContains(startBtnSrc, 'Complete the correct circuit before starting current',
  'StartCurrentButton shows incomplete-circuit message');
assertContains(startBtnSrc, 'STOP CURRENT',
  'StartCurrentButton label changes to STOP CURRENT when active');
assertContains(startBtnSrc, 'syncState()',
  'StartCurrentButton has syncState() for external state sync');
assertContains(startBtnSrc, 'getClickableObjects()',
  'StartCurrentButton exposes getClickableObjects() for raycasting');

/* ================================================================
   Suite 4: Start Current functional test via real simulation APIs
   ================================================================ */
console.log('\n--- Suite 4: Start Current — Real Simulation API Tests ---');

// 4a. Incomplete circuit blocks key close
const st1 = new CircuitState();
const sim1 = new OhmsLawSimulation();
const emptyVal = CircuitValidator.validateFullCircuit(st1);
assert(!emptyVal.isFullyValid, 'Empty circuit: isFullyValid = false (Start Current blocked)');
const blockResult = sim1.setKeyClosed(true);
assert(!blockResult.success, 'simulation.setKeyClosed(true) returns success:false when circuit not ready');
assert(!sim1.keyClosed, 'Key remains OPEN when circuit incomplete');
assert(sim1.current === 0.0, 'Current = 0 when circuit incomplete');

// 4b. Valid circuit allows start
const st2 = new CircuitState();
const sim2 = new OhmsLawSimulation();
REQUIRED_CONNECTIONS.forEach(req => {
  const v = CircuitValidator.validateProposedConnection(req.from, req.to, st2);
  st2.addConnection(req.from, req.to, v);
});
const fullVal2 = CircuitValidator.validateFullCircuit(st2);
assert(fullVal2.isFullyValid, 'Full 7-wire circuit: isFullyValid = true');
sim2.setCircuitReady(true);
const startRes = sim2.setKeyClosed(true);
assert(startRes.success, 'simulation.setKeyClosed(true) succeeds for valid circuit');
assert(sim2.keyClosed, 'Key is CLOSED after start');
assert(sim2.current > 0, `Current flows after start (I = ${sim2.current.toFixed(3)} A)`);
assert(sim2.resistorVoltage > 0, `Voltage across resistor (V = ${sim2.resistorVoltage.toFixed(3)} V)`);

/* ================================================================
   Suite 5: Stop Current opens key and current becomes zero
   ================================================================ */
console.log('\n--- Suite 5: Stop Current — Key Opens, Current = 0 ---');

const stopRes = sim2.setKeyClosed(false);
assert(stopRes.success, 'setKeyClosed(false) succeeds');
assert(!sim2.keyClosed, 'Key is OPEN after stop');
assert(sim2.current === 0.0, 'Current = 0 after key is opened');
assert(sim2.resistorVoltage === 0.0, 'Voltage = 0 after key is opened');

// Toggle convenience method
sim2.setKeyClosed(true);
assert(sim2.keyClosed, 'Pre-test: key closed via setKeyClosed');
const toggleRes = sim2.toggleKey();
assert(toggleRes.success, 'toggleKey() succeeds');
assert(!sim2.keyClosed, 'toggleKey() opens the key');
assert(sim2.current === 0.0, 'Current = 0 after toggleKey()');

/* ================================================================
   Suite 6: Wire removal while current flows stops current safely
   ================================================================ */
console.log('\n--- Suite 6: Wire Removal While Current Flows ---');

const st3 = new CircuitState();
const sim3 = new OhmsLawSimulation();
REQUIRED_CONNECTIONS.forEach(req => {
  const v = CircuitValidator.validateProposedConnection(req.from, req.to, st3);
  st3.addConnection(req.from, req.to, v);
});
sim3.setCircuitReady(true);
sim3.setKeyClosed(true);
assert(sim3.keyClosed, 'Pre-test: key is closed and current is flowing');
assert(sim3.current > 0, `Pre-test: current > 0 (I = ${sim3.current.toFixed(3)} A)`);

const wireRemovedResult = sim3.handleWireRemovedWhileActive();
assert(!sim3.keyClosed,    'After wire removal: key is OPEN');
assert(!sim3.circuitReady, 'After wire removal: circuitReady = false');
assert(sim3.current === 0.0, 'After wire removal: current = 0');
assert(wireRemovedResult.message.includes('Wire removed while circuit was active'),
  'handleWireRemovedWhileActive() returns correct safety message');

// main.js must narrate this event
assertContains(mainSrc, 'GUIDED_NARRATION_EVENTS.wireRemovedWhileActive',
  'main.js triggers wireRemovedWhileActive narration on wire removal');
assertContains(mainSrc, "narration.speakOnce('wire_removed_active'",
  "main.js uses speakOnce with key 'wire_removed_active'");

/* ================================================================
   Suite 7: No controller or gamepad APIs in guidance files
   ================================================================ */
console.log('\n--- Suite 7: No Controller or Gamepad APIs in Guidance Files ---');

const guidanceFiles = {
  'guidedModeConfig.js':    configSrc,
  'narrationSystem.js':     narrationSrc,
  'startCurrentButton.js':  startBtnSrc,
  'guidedModeController.js':guidedCtrlSrc,
  'practicalFlowPanel.js':  flowPanelSrc
};
const prohibited = [
  { p: 'getController(',  l: 'xr.getController()' },
  { p: 'getGamepads(',    l: 'navigator.getGamepads()' },
  { p: 'gripButton',      l: 'gripButton' },
  { p: 'triggerButton',   l: 'triggerButton' },
  { p: 'teleport',        l: 'teleport locomotion' },
  { p: 'XRInputSource',   l: 'XRInputSource controller' }
];
Object.entries(guidanceFiles).forEach(([fname, src]) => {
  const stripped = stripComments(src);
  prohibited.forEach(({ p, l }) =>
    assertNotContains(stripped, p, `No '${l}' in src/guidance/${fname}`)
  );
});

/* ================================================================
   Suite 8: NarrationSystem graceful fallback
   ================================================================ */
console.log('\n--- Suite 8: NarrationSystem Graceful Fallback ---');

assertContains(narrationSrc, 'window.speechSynthesis',
  'NarrationSystem checks window.speechSynthesis');
assertContains(narrationSrc, 'this.available = false',
  'NarrationSystem sets available=false when SpeechSynthesis missing');
assertContains(narrationSrc, 'try {',
  'NarrationSystem wraps speak() in try/catch');
assertContains(narrationSrc, "e.error !== 'interrupted'",
  'NarrationSystem ignores benign interrupted errors');
assertContains(narrationSrc, 'speakOnce(',
  'NarrationSystem has speakOnce() cooldown method');
assertContains(narrationSrc, 'cooldownMs',
  'NarrationSystem has cooldown to prevent rapid repetition');
assertContains(narrationSrc, 'replay()',
  'NarrationSystem has replay() for current step');
assertContains(narrationSrc, 'stop()',
  'NarrationSystem has stop()');
assertContains(narrationSrc, 'synth.cancel()',
  'NarrationSystem calls synth.cancel() on stop');
assertContains(narrationSrc, 'this.rate = 0.9',
  'NarrationSystem default rate 0.9 (within 0.85-0.95 range)');
assertContains(narrationSrc, 'this.initialized',
  'NarrationSystem requires initialization after user gesture');
assertContains(narrationSrc, 'init()',
  'NarrationSystem has init() method');

/* ================================================================
   Suite 9: Practical Flow Panel — 6 workflow steps
   ================================================================ */
console.log('\n--- Suite 9: Practical Flow Panel — 6 Workflow Steps ---');

['Connect circuit','Start current','Adjust rheostat',
 'Record 5 readings','View V',"Verify Ohm"].forEach((label, i) =>
  assertContains(flowPanelSrc, label, `Flow panel step ${i+1}: "${label}"`)
);
const has6Steps = (flowPanelSrc.match(/icon:/g) || []).length >= 6;
const generatesWhyBtns = flowPanelSrc.includes('flow-why-btn') && flowPanelSrc.includes('flow-why-${idx}');
assert(has6Steps && generatesWhyBtns, 'Flow panel generates Why? buttons for all 6 steps in FLOW_STEPS');
assertContains(flowPanelSrc, 'simulation.subscribe',
  'Flow panel subscribes to simulation for live sync');
assertContains(flowPanelSrc, 'workflowStep',
  'Flow panel reads workflowStep from simulation state');
assertContains(flowPanelSrc, 'flow-step-complete', 'Flow panel applies complete class');
assertContains(flowPanelSrc, 'flow-step-current',  'Flow panel applies current class');
assertContains(flowPanelSrc, 'narration.speak(',    'Flow panel triggers narration on Why?');

/* ================================================================
   Suite 10: main.js integration wiring
   ================================================================ */
console.log('\n--- Suite 10: main.js Integration Wiring ---');

[
  ["./guidance/narrationSystem.js",     'NarrationSystem import'],
  ["./guidance/guidedModeController.js",'GuidedModeController import'],
  ["./guidance/startCurrentButton.js",  'StartCurrentButton import'],
  ["./guidance/practicalFlowPanel.js",  'PracticalFlowPanel import'],
  ["./guidance/guidedModeConfig.js",    'GUIDED_NARRATION_EVENTS import']
].forEach(([m, desc]) => assertContains(mainSrc, m, desc));

[
  ['guidedMode.refresh()',            'guidedMode.refresh() called on circuit change'],
  ['startCurrentButton.syncState()',  'startCurrentButton.syncState() called on state change'],
  ['guidedMode.onTerminalSelected(',  'terminal selection wired to guidedMode'],
  ['guidedMode.onSelectionCancelled()','selection cancel wired to guidedMode'],
  ['guidedMode.onWireConnected(',     'wire connection wired to guidedMode'],
  ['toggle-guided-btn',               'toggle-guided-btn HTML button wired'],
  ['narration-toggle-btn',            'narration toggle button wired'],
  ['narration-replay-btn',            'narration replay button wired'],
  ['narration-stop-btn',              'narration stop button wired'],
  ['narration-volume-slider',         'volume slider wired'],
  ['guidedMode.update(camera)',        'guidedMode.update called in render loop'],
  ['startCurrentButton.update(delta)', 'startCurrentButton.update called in render loop'],
  ['registerExtraClickables(',         'start button registered for raycasting']
].forEach(([text, desc]) => assertContains(mainSrc, text, desc));

assertContains(interactSrc, 'registerExtraClickables(',
  'InteractionController has registerExtraClickables()');
assertContains(interactSrc, 'extraClickables',
  'InteractionController stores extra clickables array');
assertContains(interactSrc, 'userData.onPress',
  'InteractionController calls userData.onPress for extra clickables');
assertContains(interactSrc, 'this.onWireConnected',
  'InteractionController has onWireConnected callback hook');

/* ================================================================
   Final Results
   ================================================================ */
console.log('\n========================================');
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('========================================\n');
if (failed > 0) process.exit(1);
