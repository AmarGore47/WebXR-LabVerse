/**
 * test_observation_station.js
 * Comprehensive automated unit and integration tests for VRObservationStation.
 * Zero external dependencies (no jsdom).
 */

import * as THREE from 'three';

// Lightweight zero-dependency Canvas and DOM mock for Node.js test environment
const mockCtx = {
  clearRect: () => {},
  beginPath: () => {},
  roundRect: () => {},
  fill: () => {},
  stroke: () => {},
  fillText: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  measureText: () => ({ width: 100 }),
  set strokeStyle(v) {},
  set fillStyle(v) {},
  set lineWidth(v) {},
  set font(v) {},
  set textAlign(v) {},
  set textBaseline(v) {}
};

const mockCanvas = {
  width: 1024,
  height: 1024,
  getContext: () => mockCtx
};

global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    return {};
  }
};
global.window = {};

// Import targets
import { OhmsLawSimulation } from './src/experiments/ohmsLaw/ohmsLawSimulation.js';
import { VRObservationStation } from './src/xr/vrObservationStation.js';

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

console.log('\n--- SUITE 1: Initialization, Placement & Colliders ---');

const scene = new THREE.Scene();
const simulation = new OhmsLawSimulation();
let lastFeedback = null;
const station = new VRObservationStation({
  scene,
  simulation,
  onFeedback: (fb) => { lastFeedback = fb; }
});

assert(station !== null, 'VRObservationStation instantiated successfully');
assert(station.group.position.x === -1.15, 'Position X is -1.15 m (left side of workbench)');
assert(station.group.position.y === 1.35, 'Position Y is 1.35 m (chest/eye height)');
assert(station.group.position.z === 0.15, 'Position Z is 0.15 m (beside table)');
assert(Math.abs(station.group.rotation.y - 0.45) < 0.01, 'Angled inward at 0.45 rad toward user');
assert(station.group.visible === false, 'Initially hidden during orientation and wiring');
assert(station.activeScreen === 'record', 'Initial active screen is "record"');
assert(station.clickableButtons.length === 3, 'Created exactly 3 button colliders (record, repeat, view)');

console.log('\n--- SUITE 2: Visibility & Mutual Exclusivity Rules ---');

// Mock Wall TV HUD
const mockWallTV = {
  group: { visible: true },
  setVisible(v) { this.group.visible = v; }
};

// 1. Incomplete circuit
station.syncWithSimulation();
assert(station.group.visible === false, 'Hidden when circuit is incomplete');

// 2. Complete circuit, but key is OPEN
simulation.setCircuitReady(true);
simulation.setKeyClosed(false);
station.syncWithSimulation();
assert(station.group.visible === false, 'Hidden when key is OPEN (current is 0)');

// 3. Complete circuit and key CLOSED (current flowing)
simulation.setKeyClosed(true);
station.syncWithSimulation();
assert(station.group.visible === true, 'Visible when circuit is ready, key closed, and current > 0');

// Test mutual exclusivity logic
if (station.group.visible && mockWallTV.group.visible) {
  mockWallTV.setVisible(false);
}
assert(mockWallTV.group.visible === false, 'Wall TV is hidden when Observation Station is active');

// 4. Key opened again -> Observation Station hides
simulation.setKeyClosed(false);
station.syncWithSimulation();
assert(station.group.visible === false, 'Hides again when key is opened');

if (!station.group.visible && !mockWallTV.group.visible) {
  mockWallTV.setVisible(true);
}
assert(mockWallTV.group.visible === true, 'Wall TV is restored when Observation Station hides');

console.log('\n--- SUITE 3: 5-Reading Recording Flow & Duplicate Prevention ---');

// Turn circuit back on
simulation.setKeyClosed(true);
station.syncWithSimulation();
assert(station.group.visible === true, 'Station active again with current flowing');

// Reading 1: Record at initial setting (12 Ω)
station.pressButton('obs_record_reading');
assert(simulation.readings.length === 1, 'Reading 1 recorded in simulation');
assert(station.statusFeedback.includes('Reading 1 of 5 saved'), 'Feedback shows Reading 1 saved');
assert(lastFeedback && lastFeedback.type === 'success', 'Success toast dispatched');

// Duplicate check: Record again without adjusting rheostat
station.pressButton('obs_record_reading');
assert(simulation.readings.length === 1, 'Duplicate reading correctly rejected when rheostat not moved');
assert(station.statusFeedbackType === 'warning', 'Status banner turns amber warning on duplicate attempt');

// Reading 2: Adjust rheostat to 16 Ω and record
simulation.setRheostatResistance(16.0);
station.syncWithSimulation();
station.pressButton('obs_record_reading');
assert(simulation.readings.length === 2, 'Reading 2 recorded at 16 Ω');
assert(station.statusFeedback.includes('Reading 2 of 5 saved'), 'Feedback shows Reading 2 saved');

// Reading 3: Adjust rheostat to 10 Ω and record
simulation.setRheostatResistance(10.0);
station.syncWithSimulation();
station.pressButton('obs_record_reading');
assert(simulation.readings.length === 3, 'Reading 3 recorded at 10 Ω');

// Reading 4: Adjust rheostat to 6 Ω and record
simulation.setRheostatResistance(6.0);
station.syncWithSimulation();
station.pressButton('obs_record_reading');
assert(simulation.readings.length === 4, 'Reading 4 recorded at 6 Ω');

// Reading 5: Adjust rheostat to 2 Ω and record
simulation.setRheostatResistance(2.0);
station.syncWithSimulation();
station.pressButton('obs_record_reading');
assert(simulation.readings.length === 5, 'Reading 5 recorded at 2 Ω');

console.log('\n--- SUITE 4: Completion Screen & Results Actions ---');

assert(station.activeScreen === 'completion', 'Automatically transitions to completion screen after 5 readings');
assert(station.recordBtnMesh.visible === false, 'Record Reading button collider hidden on completion screen');
assert(station.repeatBtnMesh.visible === true, 'Repeat Experiment button collider visible on completion screen');
assert(station.viewBtnMesh.visible === true, 'View Result button collider visible on completion screen');

// Toggle View Result
assert(station.completionViewMode === 'graph', 'Default completion view mode is "graph"');
station.pressButton('obs_view_result');
assert(station.completionViewMode === 'table', 'Toggled to "table" view mode');
station.pressButton('obs_view_result');
assert(station.completionViewMode === 'graph', 'Toggled back to "graph" view mode');

// Repeat Experiment
station.pressButton('obs_repeat_experiment');
assert(simulation.readings.length === 0, 'Readings cleared in simulation');
assert(simulation.keyClosed === false, 'Key opened safely on repeat');
assert(station.activeScreen === 'record', 'Active screen reset to "record"');
assert(station.recordBtnMesh.visible === true, 'Record Reading button collider restored');

console.log(`\n========================================`);
console.log(`OBSERVATION STATION TESTS: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
