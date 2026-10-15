/**
 * test_experiment_part3.js
 * Comprehensive unit test suite for Part 3 scientific simulation,
 * deterministic Ohm's Law formulas, observation table, linear regression,
 * duplicate protection, and wire removal safety.
 */

import { OhmsLawSimulation } from './src/experiments/ohmsLaw/ohmsLawSimulation.js';
import { OHMS_LAW_CONFIG } from './src/experiments/ohmsLaw/ohmsLawConfig.js';

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

console.log('--- STARTING PART 3 OHM’S LAW SIMULATION TESTS ---\n');

// 1. Initial State
const sim = new OhmsLawSimulation();
const initial = sim.getState();

assert(initial.circuitReady === false, 'Circuit starts unwired (circuitReady=false)');
assert(initial.keyClosed === false, 'Key is initially OPEN');
assert(initial.current === 0.0, 'Current is initially 0.00 A');
assert(initial.resistorVoltage === 0.0, 'Resistor voltage is initially 0.00 V');
assert(initial.readingCount === 0, 'Observation table starts with 0 readings');
assert(initial.workflowStep === 1, 'Workflow starts at Step 1 (Wire Circuit)');

// 2. Prevent closing key before circuit is ready
const invalidKeyToggle = sim.setKeyClosed(true);
assert(!invalidKeyToggle.success, 'Cannot close key when circuit is incomplete');
assert(sim.keyClosed === false, 'Key remains OPEN');

// 3. Mark circuit as ready (valid circuit assembled)
sim.setCircuitReady(true);
const readyState = sim.getState();
assert(readyState.circuitReady === true, 'Circuit is now ready');
assert(readyState.keyClosed === false, 'Key remains OPEN until student clicks');
assert(readyState.current === 0.0, 'Current remains 0.00 A while key is open');

// 4. Close key with default rheostat (12.0 Ω)
// Total R = 10 (fixed) + 0.2 (ammeter) + 12 (rheostat) = 22.2 Ω
// I = 6 / 22.2 = 0.27027 A (~0.27 A)
// V = 0.27027 * 10 = 2.7027 V (~2.70 V)
// V / I = 10.00 Ω
const closeKeyRes = sim.setKeyClosed(true);
assert(closeKeyRes.success, 'Key successfully closes when circuit is ready');
const closedState = sim.getState();
assert(closedState.keyClosed === true, 'Key is CLOSED');
assert(closedState.current >= 0.26 && closedState.current <= 0.28, `Current at 12Ω is ${closedState.current} A (~0.27 A)`);
assert(closedState.resistorVoltage >= 2.65 && closedState.resistorVoltage <= 2.75, `Resistor voltage at 12Ω is ${closedState.resistorVoltage} V (~2.70 V)`);
const ratioDefault = closedState.resistorVoltage / closedState.current;
assert(Math.abs(ratioDefault - 10.0) < 0.2, `V/I ratio is close to 10.0 Ω (${ratioDefault.toFixed(2)} Ω)`);

// 5. Test Rheostat: Increase resistance to 20.0 Ω (Max) -> Current must DECREASE
// Total R = 10 + 0.2 + 20 = 30.2 Ω -> I = 6 / 30.2 = 0.1987 A (~0.20 A)
sim.setRheostatResistance(20.0);
const state20 = sim.getState();
assert(state20.current < closedState.current, `Current decreased from ${closedState.current} A to ${state20.current} A when resistance increased`);
assert(state20.current >= 0.19 && state20.current <= 0.21, `Current at 20Ω is ~0.20 A (${state20.current} A)`);
assert(state20.resistorVoltage >= 1.95 && state20.resistorVoltage <= 2.05, `Voltage at 20Ω is ~1.99 V (${state20.resistorVoltage} V)`);

// 6. Test Rheostat: Decrease resistance to 6.0 Ω -> Current must INCREASE
// Total R = 10 + 0.2 + 6 = 16.2 Ω -> I = 6 / 16.2 = 0.3704 A (~0.37 A)
sim.setRheostatResistance(6.0);
const state6 = sim.getState();
assert(state6.current > state20.current, `Current increased from ${state20.current} A to ${state6.current} A when resistance decreased`);
assert(state6.current >= 0.36 && state6.current <= 0.38, `Current at 6Ω is ~0.37 A (${state6.current} A)`);
assert(state6.resistorVoltage >= 3.65 && state6.resistorVoltage <= 3.75, `Voltage at 6Ω is ~3.70 V (${state6.resistorVoltage} V)`);

// 7. Test Safe Current Limit: Decrease to minimum resistance (0.5 Ω)
// Total R = 10 + 0.2 + 0.5 = 10.7 Ω -> I = 6 / 10.7 = 0.5607 A (> 0.50 A limit)
sim.setRheostatResistance(0.5);
const stateMin = sim.getState();
assert(stateMin.current >= 0.55, `Current at 0.5Ω is ${stateMin.current} A`);
assert(stateMin.isOverRange === true, 'Safe current limit triggered (isOverRange=true)');

// 8. Test Observation Table & Duplicate Rejection
console.log('\n--- Testing Observation Table & Duplicate Protection ---');
// Return to safe range: 18 Ω
sim.setRheostatResistance(18.0);
const rec1 = sim.recordReading();
assert(rec1.success, `Recorded Reading 1: I=${rec1.reading.current} A, V=${rec1.reading.voltage} V`);

// Attempt duplicate without moving rheostat -> Must be REJECTED
const dupRec = sim.recordReading();
assert(!dupRec.success, 'Duplicate reading correctly rejected when rheostat is not moved');

// Record 4 more distinct readings across range: 14 Ω, 10 Ω, 7 Ω, 4 Ω
const rheoSteps = [14.0, 10.0, 7.0, 4.0];
rheoSteps.forEach((rVal, idx) => {
  sim.setRheostatResistance(rVal);
  const rec = sim.recordReading();
  assert(rec.success, `Recorded Reading ${idx + 2} at ${rVal} Ω: I=${rec.reading.current} A, V=${rec.reading.voltage} V, V/I=${rec.reading.ratio} Ω`);
});

const state5 = sim.getState();
assert(state5.readingCount === 5, '5 readings recorded in table');
assert(state5.hasEnoughReadings === true, '5-reading milestone reached (hasEnoughReadings=true)');

// 9. V–I Graph Slope & Linear Regression Verification
console.log('\n--- Testing V–I Graph Linear Regression & Slope ---');
const stats = state5.statistics;
assert(stats.count === 5, 'Stats calculated from 5 readings');
assert(Math.abs(stats.slopeResistance - 10.0) < 0.15, `Calculated slope resistance R is ~10.00 Ω (${stats.slopeResistance} Ω)`);
assert(Math.abs(stats.meanRatio - 10.0) < 0.15, `Mean V/I ratio is ~10.00 Ω (${stats.meanRatio} Ω)`);
assert(stats.isVerified === true, 'Ohm’s Law verification unlocked (isVerified=true)');
assert(state5.workflowStep === 6, 'Workflow advanced to Step 6 (Verify Ohm’s Law)');

// 10. Test Wire Removal While Circuit is Active (Key is Closed)
console.log('\n--- Testing Safety: Wire Removal While Circuit Active ---');
assert(sim.keyClosed === true, 'Key is currently CLOSED and current is active');
const safeStop = sim.handleWireRemovedWhileActive();
const stoppedState = sim.getState();
assert(stoppedState.keyClosed === false, 'Key automatically OPENED upon wire removal');
assert(stoppedState.current === 0.0, 'Current immediately dropped to 0.00 A');
assert(stoppedState.resistorVoltage === 0.0, 'Voltage immediately dropped to 0.00 V');
assert(stoppedState.circuitReady === false, 'Circuit marked as not ready');

// 11. Test Restart Experiment
console.log('\n--- Testing Restart Experiment ---');
sim.setCircuitReady(true);
sim.setKeyClosed(true);
const restartRes = sim.restartExperiment();
const restartedState = sim.getState();
assert(restartRes.success, 'Restart experiment succeeded');
assert(restartedState.keyClosed === false, 'Key opened on restart');
assert(restartedState.current === 0.0, 'Meters reset to 0.00 on restart');
assert(restartedState.readingCount === 0, 'Readings cleared on restart');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
