/**
 * test_hud_part5.js
 * Focused automated test suite for Wrist HUD accuracy, canonical terminal IDs,
 * scene audit verification, and controller-free WebXR architecture.
 */

import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { CircuitState } from './src/circuit/circuitState.js';
import { CircuitValidator } from './src/circuit/circuitValidator.js';
import { REQUIRED_CONNECTIONS } from './src/circuit/circuitConfig.js';
import { OhmsLawSimulation } from './src/experiments/ohmsLaw/ohmsLawSimulation.js';
import { getCircuitProgressForHUD } from './src/xr/vrHandCircuitHUD.js';
import { auditScene } from './src/scene/sceneAudit.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('--- STARTING PART 5 WRIST HUD & SCENE AUDIT UNIT TESTS ---\n');

// ============================================================================
// TEST SUITE 1: Wrist HUD Pure-Data Helper with Empty Circuit
// ============================================================================
console.log('--- Suite 1: Empty Circuit Wrist HUD State ---');
const circuitState = new CircuitState();
const simulation = new OhmsLawSimulation();

const initialProgress = getCircuitProgressForHUD(circuitState, simulation);

assert(initialProgress.connCount === 0, 'Initial wire count on wrist HUD is 0');
assert(initialProgress.satisfiedCount === 0, 'Initial satisfied required connections is 0 / 7');
assert(initialProgress.totalRequired === 7, 'Total required connections is 7');
assert(initialProgress.isFullyValid === false, 'Circuit is initially incomplete (isFullyValid = false)');
assert(initialProgress.isReady === false, 'Circuit is not ready initially (isReady = false)');
assert(initialProgress.isKeyClosed === false, 'Plug key is initially open on HUD');
assert(
  initialProgress.nextHint.includes('Battery (+) ↔ Switch (Left)'),
  `Initial step hint guides student to wire 1: "${initialProgress.nextHint}"`
);
assert(
  Object.values(initialProgress.branchStatus).every((st) => st === false),
  'All 7 branches report uncompleted initially'
);

// ============================================================================
// TEST SUITE 2: Incremental Wiring & Real-Time HUD Progress
// ============================================================================
console.log('\n--- Suite 2: Step-by-Step Wiring & Real-Time Status ---');

// Wire 1: Battery (+) -> Switch (Left)
circuitState.addConnection('battery_positive', 'switch_left', { isValid: true, status: 'valid', role: 'series' });
let prog = getCircuitProgressForHUD(circuitState, simulation);
assert(prog.connCount === 1, 'HUD tracks 1 active wire');
assert(prog.satisfiedCount === 1, 'HUD tracks 1 / 7 required branches satisfied');
assert(prog.branchStatus.batteryToSwitch === true, 'HUD branch batteryToSwitch is true');
assert(prog.branchStatus.switchToAmmeter === false, 'HUD branch switchToAmmeter is still false');
assert(prog.nextHint.includes('Switch (Right) ↔ Ammeter (+)'), `Next hint directs to step 2: "${prog.nextHint}"`);

// Wire 2: Switch (Right) -> Ammeter (+)
circuitState.addConnection('switch_right', 'ammeter_positive', { isValid: true, status: 'valid', role: 'series' });
prog = getCircuitProgressForHUD(circuitState, simulation);
assert(prog.satisfiedCount === 2, 'HUD tracks 2 / 7 branches satisfied');
assert(prog.branchStatus.switchToAmmeter === true, 'HUD branch switchToAmmeter is true');

// Wire 3: Ammeter (-) -> Rheostat (In)
circuitState.addConnection('ammeter_negative', 'rheostat_in', { isValid: true, status: 'valid', role: 'series' });
prog = getCircuitProgressForHUD(circuitState, simulation);
assert(prog.satisfiedCount === 3, 'HUD tracks 3 / 7 branches satisfied');
assert(prog.branchStatus.ammeterToRheostat === true, 'HUD branch ammeterToRheostat is true');

// Wire 4: Rheostat (Out) -> Resistor (Left)
circuitState.addConnection('rheostat_out', 'resistor_left', { isValid: true, status: 'valid', role: 'series' });
prog = getCircuitProgressForHUD(circuitState, simulation);
assert(prog.satisfiedCount === 4, 'HUD tracks 4 / 7 branches satisfied');
assert(prog.branchStatus.rheostatToResistor === true, 'HUD branch rheostatToResistor is true');

// Wire 5: Resistor (Right) -> Battery (-)
circuitState.addConnection('resistor_right', 'battery_negative', { isValid: true, status: 'valid', role: 'series' });
prog = getCircuitProgressForHUD(circuitState, simulation);
assert(prog.satisfiedCount === 5, 'HUD tracks 5 / 7 branches satisfied (series path complete)');
assert(prog.branchStatus.resistorToBattery === true, 'HUD branch resistorToBattery is true');

// Wire 6: Voltmeter (+) -> Resistor (Left)
circuitState.addConnection('voltmeter_positive', 'resistor_left', { isValid: true, status: 'valid', role: 'parallel' });
prog = getCircuitProgressForHUD(circuitState, simulation);
assert(prog.satisfiedCount === 6, 'HUD tracks 6 / 7 branches satisfied');
assert(prog.branchStatus.voltmeterPositive === true, 'HUD branch voltmeterPositive is true');
assert(prog.branchStatus.voltmeterNegative === false, 'HUD branch voltmeterNegative is still false');
assert(prog.nextHint.includes('Voltmeter (-) ↔ Resistor (Right)'), `Next hint guides to last parallel wire: "${prog.nextHint}"`);

// ============================================================================
// TEST SUITE 3: Full 7-Wire Valid Circuit Status
// ============================================================================
console.log('\n--- Suite 3: Fully Assembled 7-Wire Circuit ---');

// Wire 7: Voltmeter (-) -> Resistor (Right)
circuitState.addConnection('voltmeter_negative', 'resistor_right', { isValid: true, status: 'valid', role: 'parallel' });
prog = getCircuitProgressForHUD(circuitState, simulation);

assert(prog.connCount === 7, 'HUD shows exactly 7 active wires');
assert(prog.satisfiedCount === 7, 'HUD shows exactly 7 / 7 required branches satisfied');
assert(prog.isFullyValid === true, 'HUD reports circuit is fully valid (isFullyValid = true)');
assert(
  prog.branchStatus.batteryToSwitch &&
    prog.branchStatus.switchToAmmeter &&
    prog.branchStatus.ammeterToRheostat &&
    prog.branchStatus.rheostatToResistor &&
    prog.branchStatus.resistorToBattery &&
    prog.branchStatus.voltmeterPositive &&
    prog.branchStatus.voltmeterNegative,
  'All 7 individual branches report satisfied in wrist HUD data'
);
assert(
  prog.nextHint.includes('Pinch the Plug Key') || prog.nextHint.includes('close switch'),
  `Complete circuit hint directs student to close key: "${prog.nextHint}"`
);

// Simulation key closed test
simulation.setCircuitReady(true);
simulation.toggleKey();
const activeProg = getCircuitProgressForHUD(circuitState, simulation);
assert(activeProg.isKeyClosed === true, 'HUD reports key is closed when switch is closed');
assert(activeProg.nextHint.includes('Current is flowing'), `Active circuit hint reports current flowing: "${activeProg.nextHint}"`);

// ============================================================================
// TEST SUITE 4: Short Circuit Protection in HUD
// ============================================================================
console.log('\n--- Suite 4: Short Circuit Protection ---');
const badState = new CircuitState();
badState.addConnection('battery_positive', 'battery_negative', {
  isValid: false,
  status: 'error',
  role: 'short_circuit',
  message: 'Short circuit across DC power supply'
});
const badProg = getCircuitProgressForHUD(badState, simulation);
assert(badProg.nextHint.includes('Short circuit') || badProg.nextHint.includes('Error'), `HUD alerts student of short circuit: "${badProg.nextHint}"`);

// ============================================================================
// TEST SUITE 5: Static Inspection - Zero Legacy Terminal IDs in Wrist HUD
// ============================================================================
console.log('\n--- Suite 5: Static Analysis for Zero Legacy IDs in XR Code ---');
const hudFileContent = fs.readFileSync(path.join('src', 'xr', 'vrHandCircuitHUD.js'), 'utf8');

const oldTerminalIds = [
  'battery_pos',
  'switch_term1',
  'switch_term2',
  'ammeter_pos',
  'ammeter_neg',
  'rheostat_top',
  'rheostat_slider',
  'voltmeter_pos',
  'voltmeter_neg'
];

oldTerminalIds.forEach((oldId) => {
  // Exact word boundary check so battery_positive is not flagged for battery_pos
  const regex = new RegExp(`['"]${oldId}['"]`, 'g');
  const found = regex.test(hudFileContent);
  assert(!found, `vrHandCircuitHUD.js contains zero occurrences of legacy ID '${oldId}'`);
});

// Canonical IDs must be present
const canonicalIds = [
  'battery_positive',
  'switch_left',
  'switch_right',
  'ammeter_positive',
  'ammeter_negative',
  'rheostat_in',
  'rheostat_out',
  'resistor_left',
  'resistor_right',
  'battery_negative',
  'voltmeter_positive',
  'voltmeter_negative'
];

canonicalIds.forEach((canId) => {
  assert(hudFileContent.includes(canId), `vrHandCircuitHUD.js uses canonical ID '${canId}'`);
});

// ============================================================================
// TEST SUITE 6: Prohibited Controller/Gamepad APIs Absence Check
// ============================================================================
console.log('\n--- Suite 6: Prohibited Controller & Gamepad APIs Absence Check ---');
const xrDir = path.join('src', 'xr');
const xrFiles = fs.readdirSync(xrDir).filter((f) => f.endsWith('.js'));
const stripComments = (str) => str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

const prohibitedPatterns = [
  { pattern: /getController\s*\(/g, name: 'renderer.xr.getController()' },
  { pattern: /\bnavigator\.getGamepads\b/g, name: 'navigator.getGamepads()' },
  { pattern: /\bgamepad\b/gi, name: 'gamepad' },
  { pattern: /\bteleport\b/gi, name: 'teleport' }
];

xrFiles.forEach((f) => {
  const content = stripComments(fs.readFileSync(path.join(xrDir, f), 'utf8'));
  prohibitedPatterns.forEach((p) => {
    const matches = content.match(p.pattern);
    assert(!matches, `No prohibited ${p.name} in src/xr/${f}`);
  });
});

// ============================================================================
// TEST SUITE 7: Scene Audit Function
// ============================================================================
console.log('\n--- Suite 7: Scene Audit Function Verification ---');
const testScene = new THREE.Scene();

// 1. Add simulated GLB room root
const roomRoot = new THREE.Group();
roomRoot.name = 'LabApparatusModel';
roomRoot.userData.isModelRoot = true;
roomRoot.userData.isRoomRoot = true;

// Add 1 main table mesh inside the model
const tableMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1), new THREE.MeshBasicMaterial());
tableMesh.name = 'Experiment Tabletop';
tableMesh.visible = true;
roomRoot.add(tableMesh);
testScene.add(roomRoot);

// 2. Add simulated hidden procedural fallback table
const hiddenProcedural = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1), new THREE.MeshBasicMaterial());
hiddenProcedural.name = 'WoodenWorkbench Tabletop';
hiddenProcedural.visible = false; // Hidden when room is loaded
testScene.add(hiddenProcedural);

const auditResult = auditScene(testScene, circuitState);

assert(auditResult.modelRootCount === 1, `Scene audit reports exactly 1 model root (found: ${auditResult.modelRootCount})`);
assert(auditResult.roomRootCount === 1, `Scene audit reports exactly 1 room root (found: ${auditResult.roomRootCount})`);
assert(auditResult.tableCount === 1, `Scene audit reports exactly 1 visible physical table (found: ${auditResult.tableCount})`);
assert(auditResult.activeWireCount === 7, `Scene audit reports active wires correctly (found: ${auditResult.activeWireCount})`);

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n========================================');
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
