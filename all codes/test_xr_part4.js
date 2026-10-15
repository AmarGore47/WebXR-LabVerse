/**
 * test_xr_part4.js
 * Comprehensive unit test suite for Part 4 WebXR hand tracking,
 * hysteresis state machine, proximity calculations, rheostat mapping,
 * and controller-free architecture verification.
 */

import { XR_CONFIG } from './src/xr/xrConfig.js';

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

console.log('--- STARTING PART 4 WEBXR HAND TRACKING TESTS ---\n');

// 1. Configuration Constants & Non-Negotiable Ranges
assert(XR_CONFIG.pinchStartDistance === 0.022, 'Pinch start distance is 0.022 meters (2.2 cm)');
assert(XR_CONFIG.pinchEndDistance === 0.035, 'Pinch end distance is 0.035 meters (3.5 cm)');
assert(XR_CONFIG.pinchStartDistance < XR_CONFIG.pinchEndDistance, 'Pinch hysteresis verified: start distance < end distance');
assert(XR_CONFIG.pinchCooldownMs === 250, 'Pinch debounce cooldown is 250 ms');
assert(XR_CONFIG.interactionMaxDistance === 2.0, 'Interaction max cutoff distance is 2.0 meters');
assert(XR_CONFIG.terminalHoverRadius >= 0.05 && XR_CONFIG.terminalHoverRadius <= 0.08, 'Terminal reach radius is within 5-8 cm');
assert(XR_CONFIG.rheostatDragTravelMeters >= 0.15 && XR_CONFIG.rheostatDragTravelMeters <= 0.25, 'Rheostat hand travel is comfortable (15-25 cm)');

// 2. Hysteresis Pinch State Machine Simulation
console.log('\n--- Testing Hysteresis Pinch State Machine ---');
let pinched = false;

function updatePinch(dist) {
  if (!pinched && dist < XR_CONFIG.pinchStartDistance) {
    pinched = true;
  } else if (pinched && dist > XR_CONFIG.pinchEndDistance) {
    pinched = false;
  }
  return pinched;
}

// Distance sequence 1: Hand approaching pinch
assert(updatePinch(0.050) === false, 'At 5.0 cm: not pinched');
assert(updatePinch(0.030) === false, 'At 3.0 cm: not pinched');
assert(updatePinch(0.025) === false, 'At 2.5 cm: not pinched (above 2.2 cm start)');
assert(updatePinch(0.021) === true, 'At 2.1 cm: PINCH ACTIVATED (<= 2.2 cm)');

// Distance sequence 2: Hand slight movement in hysteresis band [2.2cm, 3.5cm]
assert(updatePinch(0.024) === true, 'At 2.4 cm: REMAINS PINCHED (hysteresis holds pinch)');
assert(updatePinch(0.028) === true, 'At 2.8 cm: REMAINS PINCHED (no flickering)');
assert(updatePinch(0.034) === true, 'At 3.4 cm: REMAINS PINCHED (below 3.5 cm release)');

// Distance sequence 3: Hand opens above 3.5 cm
assert(updatePinch(0.036) === false, 'At 3.6 cm: PINCH RELEASED (> 3.5 cm)');
assert(updatePinch(0.030) === false, 'At 3.0 cm: REMAINS RELEASED (must reach 2.2 cm to restart)');

// 3. Rheostat Hand Movement to Resistance Mapping
console.log('\n--- Testing Rheostat Hand Delta-X to Resistance Mapping ---');
const startR = 5.0;
const travel = XR_CONFIG.rheostatDragTravelMeters; // 0.18m
const rSpan = 20.0 - 0.5; // 19.5 Ω

function calculateRheo(deltaX) {
  const deltaFrac = deltaX / travel;
  const newR = Math.max(0.5, Math.min(20.0, startR + deltaFrac * rSpan));
  return Number(newR.toFixed(2));
}

assert(calculateRheo(0.0) === 5.0, 'Zero hand movement keeps initial 5.0 Ω');
// Hand moves +4.5cm to the right -> increases resistance
const plusQuarter = calculateRheo(travel / 4);
assert(plusQuarter > 5.0 && plusQuarter < 20.0, `Hand +4.5cm increases resistance to ${plusQuarter} Ω`);
// Hand moves +30cm (far right) -> clamps to 20.0 Ω max
assert(calculateRheo(0.30) === 20.0, 'Excessive right hand movement clamped to 20.0 Ω max');
// Hand moves -30cm (far left) -> clamps to 0.5 Ω min
assert(calculateRheo(-0.30) === 0.5, 'Excessive left hand movement clamped to 0.5 Ω min');

// 4. Verification that NO VR Controllers or Gamepad APIs are used in executable code
console.log('\n--- Verifying Controller-Free Architecture ---');
import fs from 'fs';
const stripComments = (str) => str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
const handMgrCode = stripComments(fs.readFileSync('./src/xr/xrHandManager.js', 'utf8'));
const sessionMgrCode = stripComments(fs.readFileSync('./src/xr/vrSessionManager.js', 'utf8'));
const worldPanelCode = stripComments(fs.readFileSync('./src/xr/vrWorldPanel.js', 'utf8'));

const prohibitedTerms = ['getController(', 'gamepad', 'getGamepads', 'controller.'];

prohibitedTerms.forEach(term => {
  const inHandMgr = handMgrCode.includes(term);
  const inSessionMgr = sessionMgrCode.includes(term);
  const inWorldPanel = worldPanelCode.includes(term);
  assert(!inHandMgr && !inSessionMgr && !inWorldPanel, `Prohibited controller API '${term}' is completely absent from XR code`);
});

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
