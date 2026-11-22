/**
 * test_simulation_state_bridge.js
 * LabVerse — Final Simulation State Bridge Validation Suite.
 *
 * Verifies all 15 required final validation scenarios:
 * 1. Correct circuit
 * 2. Incorrect ammeter connection
 * 3. Incorrect voltmeter connection
 * 4. Reversed polarity
 * 5. Short circuit
 * 6. Open switch
 * 7. Rheostat adjustment
 * 8. Multiple observations
 * 9. Missing simulation state
 * 10. Missing circuit state
 * 11. Multiple bridge instances
 * 12. Destroy and recreate bridge
 * 13. Verification below and above required criteria
 * 14. AI context validity
 * 15. Subscriber notification accuracy
 */

import { CircuitState } from './src/circuit/circuitState.js';
import { CircuitValidator } from './src/circuit/circuitValidator.js';
import { OhmsLawSimulation } from './src/experiments/ohmsLaw/ohmsLawSimulation.js';
import { SimulationStateBridge } from './src/guidance/simulationStateBridge.js';

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

console.log('\n=== RUNNING FINAL SIMULATION STATE BRIDGE VALIDATION ===\n');

const standard7Connections = [
  ['battery_positive', 'switch_left'],
  ['switch_right', 'ammeter_positive'],
  ['ammeter_negative', 'rheostat_in'],
  ['rheostat_out', 'resistor_left'],
  ['resistor_right', 'battery_negative'],
  ['voltmeter_positive', 'resistor_left'],
  ['voltmeter_negative', 'resistor_right']
];

// -------------------------------------------------------------
// TEST 1: Correct circuit
// -------------------------------------------------------------
console.log('--- TEST 1: Correct Circuit Assembly & Authoritative Validation ---');
const cs1 = new CircuitState();
const sim1 = new OhmsLawSimulation();
standard7Connections.forEach(([from, to]) => {
  const val = CircuitValidator.validateProposedConnection(from, to, cs1);
  cs1.addConnection(from, to, val);
});
sim1.setCircuitReady(true);
const bridge1 = new SimulationStateBridge({ circuitState: cs1, simulation: sim1 });

const s1 = bridge1.getCurrentState();
assert(s1.circuit.completionStatus === 'COMPLETE', 'Circuit completion status is COMPLETE');
assert(s1.circuit.isComplete === true, 'Circuit isComplete flag is true');
assert(s1.circuit.wireCount === 7, 'Wire count is 7/7');
assert(s1.instruments.ammeter.status === 'CONNECTED_SERIES', 'Authoritative ammeter status is CONNECTED_SERIES');
assert(s1.instruments.ammeter.isCorrect === true, 'Ammeter isCorrect is true');
assert(s1.instruments.ammeter.inSeries === true, 'Ammeter inSeries is true');
assert(s1.instruments.voltmeter.status === 'CONNECTED_PARALLEL', 'Authoritative voltmeter status is CONNECTED_PARALLEL');
assert(s1.instruments.voltmeter.isCorrect === true, 'Voltmeter isCorrect is true');
assert(s1.instruments.voltmeter.inParallel === true, 'Voltmeter inParallel is true');
assert(s1.detectedMistakes.filter((m) => m.category === 'circuit_topology').length === 0, 'Zero circuit topology mistakes in correct circuit');

// Once switch is closed and practical is active, all procedure warnings clear too
sim1.setKeyClosed(true);
assert(bridge1.getDetectedMistakes().length === 0, 'Zero mistakes of any kind once circuit is active and key closed');
sim1.setKeyClosed(false); // Reset to open for subsequent test scenarios

// -------------------------------------------------------------
// TEST 2: Incorrect ammeter connection (Parallel across battery)
// -------------------------------------------------------------
console.log('\n--- TEST 2: Incorrect Ammeter Connection ---');
const cs2 = new CircuitState();
const ammeterMistake = CircuitValidator.validateProposedConnection('battery_positive', 'ammeter_negative', cs2);
cs2.addConnection('battery_positive', 'ammeter_negative', ammeterMistake);
const bridge2 = new SimulationStateBridge({ circuitState: cs2, simulation: sim1 });

const s2 = bridge2.getCurrentState();
assert(s2.instruments.ammeter.status === 'CONNECTED_PARALLEL_ERROR', 'Ammeter reports CONNECTED_PARALLEL_ERROR');
assert(s2.instruments.ammeter.hasShortError === true, 'Ammeter hasShortError is true');
assert(s2.instruments.ammeter.isCorrect === false, 'Ammeter isCorrect is false');
assert(s2.detectedMistakes.some((m) => m.code === 'ERR_AMMETER_SHORT'), 'Flags ERR_AMMETER_SHORT');

// -------------------------------------------------------------
// TEST 3: Incorrect voltmeter connection (Voltmeter in series)
// -------------------------------------------------------------
console.log('\n--- TEST 3: Incorrect Voltmeter Connection (In Series) ---');
const cs3 = new CircuitState();
const voltSeriesMistake = CircuitValidator.validateProposedConnection('voltmeter_positive', 'switch_right', cs3);
cs3.addConnection('voltmeter_positive', 'switch_right', voltSeriesMistake);
const bridge3 = new SimulationStateBridge({ circuitState: cs3, simulation: sim1 });

const s3 = bridge3.getCurrentState();
assert(s3.instruments.voltmeter.status === 'CONNECTED_SERIES_WARNING', 'Voltmeter reports CONNECTED_SERIES_WARNING');
assert(s3.instruments.voltmeter.inSeriesWarning === true, 'Voltmeter inSeriesWarning is true');
assert(s3.instruments.voltmeter.isCorrect === false, 'Voltmeter isCorrect is false');
assert(s3.detectedMistakes.some((m) => m.code === 'ERR_VOLTMETER_IN_SERIES'), 'Flags ERR_VOLTMETER_IN_SERIES');

// -------------------------------------------------------------
// TEST 4: Reversed polarity (Voltmeter reversed across resistor)
// -------------------------------------------------------------
console.log('\n--- TEST 4: Reversed Polarity ---');
const cs4 = new CircuitState();
const revVal = CircuitValidator.validateProposedConnection('voltmeter_positive', 'resistor_right', cs4);
cs4.addConnection('voltmeter_positive', 'resistor_right', revVal);
const bridge4 = new SimulationStateBridge({ circuitState: cs4, simulation: sim1 });

const s4 = bridge4.getCurrentState();
assert(s4.instruments.voltmeter.status === 'REVERSED_POLARITY', 'Voltmeter reports REVERSED_POLARITY');
assert(s4.instruments.voltmeter.reversedPolarity === true, 'reversedPolarity flag is true');
assert(s4.instruments.voltmeter.isCorrect === false, 'isCorrect is false on reversed polarity');
assert(s4.detectedMistakes.some((m) => m.code === 'ERR_REVERSED_POLARITY'), 'Flags ERR_REVERSED_POLARITY');

// -------------------------------------------------------------
// TEST 5: Short circuit (Direct battery (+) to (-))
// -------------------------------------------------------------
console.log('\n--- TEST 5: Direct Short Circuit ---');
const cs5 = new CircuitState();
const shortVal = CircuitValidator.validateProposedConnection('battery_positive', 'battery_negative', cs5);
cs5.addConnection('battery_positive', 'battery_negative', shortVal);
const bridge5 = new SimulationStateBridge({ circuitState: cs5, simulation: sim1 });

const s5 = bridge5.getCurrentState();
assert(s5.circuit.completionStatus === 'SHORT_CIRCUIT', 'Identifies SHORT_CIRCUIT status');
assert(s5.detectedMistakes.some((m) => m.code === 'ERR_SHORT_CIRCUIT'), 'Flags ERR_SHORT_CIRCUIT');
assert(s5.practicalProgress.percentComplete === 0, 'Progress is 0% when short circuit is present');

// -------------------------------------------------------------
// TEST 6: Open switch
// -------------------------------------------------------------
console.log('\n--- TEST 6: Open Switch ---');
sim1.setKeyClosed(false);
const s6_open = bridge1.getCurrentState();
assert(s6_open.circuit.keyStatus === 'OPEN', 'Key status reports OPEN');
assert(s6_open.circuit.keyClosed === false, 'keyClosed is false');
assert(s6_open.circuit.currentFormatted === '0.00 A', 'Current is 0.00 A when key open');
assert(s6_open.validity.hasLiveMeasurements === false, 'hasLiveMeasurements is false when key is open');

sim1.setKeyClosed(true);
const s6_closed = bridge1.getCurrentState();
assert(s6_closed.circuit.keyStatus === 'CLOSED', 'Key status reports CLOSED');
assert(s6_closed.circuit.keyClosed === true, 'keyClosed is true');
assert(s6_closed.circuit.currentAmperes > 0.01, 'Current flows when key is closed');
assert(s6_closed.validity.hasLiveMeasurements === true, 'hasLiveMeasurements is true when key closed');

// -------------------------------------------------------------
// TEST 7: Rheostat adjustment
// -------------------------------------------------------------
console.log('\n--- TEST 7: Rheostat Adjustment & Physics Recalculation ---');
sim1.setRheostatResistance(4.0);
const s7 = bridge1.getCurrentState();
assert(s7.rheostat.resistanceFormatted === '4.0 Ω', 'Rheostat resistance formatted is 4.0 Ω');
assert(s7.rheostat.hasAdjusted === true, 'Rheostat hasAdjusted flag is true');
// Total R = 10 + 0.2 + 4 = 14.2 Ω -> I = 6 / 14.2 = 0.42 A, V = 0.42 * 10 = 4.23 V
assert(s7.circuit.currentFormatted === '0.42 A', 'Ohm’s law current recalculated to 0.42 A');
assert(s7.resistor.measuredVoltageFormatted === '4.23 V', 'Resistor voltage recalculated to 4.23 V');

// -------------------------------------------------------------
// TEST 8: Multiple observations & Duplicate prevention
// -------------------------------------------------------------
console.log('\n--- TEST 8: Multiple Observations & Duplicate Detection ---');
// Record reading 1 at 4.0 Ω
const r1 = sim1.recordReading();
assert(r1.success === true, 'Recorded Reading 1');

// Attempt duplicate without moving rheostat
const dupMistakes = bridge1.getDetectedMistakes();
assert(dupMistakes.some((m) => m.code === 'WARN_DUPLICATE_READING'), 'WARN_DUPLICATE_READING triggered when rheostat not moved');

// Move rheostat and record readings 2, 3, 4
sim1.setRheostatResistance(8.0);
assert(sim1.recordReading().success === true, 'Recorded Reading 2');
sim1.setRheostatResistance(12.0);
assert(sim1.recordReading().success === true, 'Recorded Reading 3');
sim1.setRheostatResistance(16.0);
assert(sim1.recordReading().success === true, 'Recorded Reading 4');

const s8 = bridge1.getCurrentState();
assert(s8.observations.count === 4, 'Observation count is 4');
assert(s8.observations.readings.length === 4, 'Readings array contains 4 records');
assert(s8.observations.readings[3].readingNo === 4, 'Reading #4 correctly indexed');

// -------------------------------------------------------------
// TEST 9: Missing simulation state
// -------------------------------------------------------------
console.log('\n--- TEST 9: Missing Simulation State Safe Handling ---');
const bridgeNoSim = new SimulationStateBridge({ circuitState: cs1, simulation: null });
const s9 = bridgeNoSim.getCurrentState();
assert(s9.validity.isSimulationAvailable === false, 'validity.isSimulationAvailable is false');
assert(s9.validity.hasLiveMeasurements === false, 'validity.hasLiveMeasurements is false');
assert(s9.circuit.currentAmperes === null, 'currentAmperes is null');
assert(s9.circuit.currentFormatted === 'UNAVAILABLE', 'currentFormatted is UNAVAILABLE');
assert(s9.resistor.measuredVoltageVolts === null, 'resistorVoltage is null');
assert(s9.resistor.measuredVoltageFormatted === 'UNAVAILABLE', 'resistorVoltageFormatted is UNAVAILABLE');
assert(s9.powerSupply.voltageFormatted === '6.00 V', 'Configured power supply fallback preserved');

// -------------------------------------------------------------
// TEST 10: Missing circuit state
// -------------------------------------------------------------
console.log('\n--- TEST 10: Missing Circuit State Safe Handling ---');
const bridgeNoCircuit = new SimulationStateBridge({ circuitState: null, simulation: sim1 });
const s10 = bridgeNoCircuit.getCurrentState();
assert(s10.validity.isCircuitAvailable === false, 'validity.isCircuitAvailable is false');
assert(s10.circuit.wireCount === 0, 'wireCount is 0');
assert(s10.circuit.isComplete === false, 'circuit.isComplete is false');
assert(s10.instruments.ammeter.status === 'DISCONNECTED', 'Ammeter reports DISCONNECTED when circuit missing');
assert(s10.instruments.voltmeter.status === 'DISCONNECTED', 'Voltmeter reports DISCONNECTED when circuit missing');

// -------------------------------------------------------------
// TEST 11: Multiple bridge instances
// -------------------------------------------------------------
console.log('\n--- TEST 11: Multiple Bridge Instances Operating Concurrently ---');
const sharedSim = new OhmsLawSimulation();
const sharedCircuit = new CircuitState();
const bridgeA = new SimulationStateBridge({ simulation: sharedSim, circuitState: sharedCircuit });
const bridgeB = new SimulationStateBridge({ simulation: sharedSim, circuitState: sharedCircuit });

let aEvents = 0;
let bEvents = 0;
bridgeA.subscribe(() => { aEvents++; });
bridgeB.subscribe(() => { bEvents++; });

sharedSim.setRheostatResistance(10.0);
assert(aEvents === 1, 'Bridge A notified of rheostat update');
assert(bEvents === 1, 'Bridge B notified of rheostat update');
assert(bridgeA.getCurrentState().rheostat.resistanceFormatted === '10.0 Ω', 'Bridge A state is accurate');
assert(bridgeB.getCurrentState().rheostat.resistanceFormatted === '10.0 Ω', 'Bridge B state is accurate');

bridgeA.destroy();
bridgeB.destroy();

// -------------------------------------------------------------
// TEST 12: Destroy and recreate bridge
// -------------------------------------------------------------
console.log('\n--- TEST 12: Destroy and Recreate Bridge & Callback Restoration ---');
let interactionCallCount = 0;
const mockController = {
  onSelectionChanged: (termId) => {
    interactionCallCount++;
  }
};
const originalFn = mockController.onSelectionChanged;

const bDest = new SimulationStateBridge({
  simulation: sharedSim,
  circuitState: sharedCircuit,
  interactionController: mockController
});
assert(mockController.onSelectionChanged !== originalFn, 'Interaction hook installed by bridge');

// Destroy
bDest.destroy();
assert(mockController.onSelectionChanged === originalFn, 'Original interaction callback restored cleanly');

// Recreate
const bRecreated = new SimulationStateBridge({
  simulation: sharedSim,
  circuitState: sharedCircuit,
  interactionController: mockController
});
assert(mockController.onSelectionChanged !== originalFn, 'New bridge cleanly re-installed interaction hook');
bRecreated.destroy();
assert(mockController.onSelectionChanged === originalFn, 'Restored again after second destroy');

// -------------------------------------------------------------
// TEST 13: Verification below and above required criteria
// -------------------------------------------------------------
console.log('\n--- TEST 13: Progress Percentage vs Verification Criteria ---');
const verSim = new OhmsLawSimulation();
const verCircuit = new CircuitState();
standard7Connections.forEach(([f, t]) => {
  verCircuit.addConnection(f, t, CircuitValidator.validateProposedConnection(f, t, verCircuit));
});
verSim.setCircuitReady(true);
verSim.setKeyClosed(true);

const verBridge = new SimulationStateBridge({ simulation: verSim, circuitState: verCircuit });

// 13a. Mock 5 readings but verification FAILS (slope / R^2 unacceptable)
verSim.readings = [
  { readingNo: 1, voltage: 1.0, current: 0.1, ratio: 10.0, rheostatResistance: 12.0 },
  { readingNo: 2, voltage: 2.0, current: 0.2, ratio: 10.0, rheostatResistance: 10.0 },
  { readingNo: 3, voltage: 3.0, current: 0.3, ratio: 10.0, rheostatResistance: 8.0 },
  { readingNo: 4, voltage: 4.0, current: 0.4, ratio: 10.0, rheostatResistance: 6.0 },
  { readingNo: 5, voltage: 5.0, current: 0.5, ratio: 10.0, rheostatResistance: 4.0 }
];
verSim.readingCount = 5;
verSim.calculateReadingStatistics = () => ({
  count: 5,
  meanRatio: 10.0,
  slopeResistance: 10.0,
  standardSlope: 10.0,
  rSquared: 0.82,
  isVerified: false // UNVERIFIED
});

const progUnverified = verBridge.getPracticalProgress();
assert(progUnverified.percentComplete <= 90, `Unverified progress capped at <=90% (actual: ${progUnverified.percentComplete}%)`);
assert(progUnverified.isVerified === false, 'progUnverified.isVerified is false');
assert(progUnverified.blockers.some((b) => b.includes('proportionality') || b.includes('satisfy')), 'Blockers explain verification failure');

// 13b. Mock verification PASS
verSim.calculateReadingStatistics = () => ({
  count: 5,
  meanRatio: 10.0,
  slopeResistance: 10.0,
  standardSlope: 10.0,
  rSquared: 0.999,
  isVerified: true // VERIFIED
});
const progVerified = verBridge.getPracticalProgress();
assert(progVerified.percentComplete === 100, 'Progress reaches exactly 100% when 5 readings are recorded AND verified');
assert(progVerified.isVerified === true, 'progVerified.isVerified is true');
assert(progVerified.blockers.length === 0, 'Zero blockers when verified at 100%');

verBridge.destroy();

// -------------------------------------------------------------
// TEST 14: AI context validity
// -------------------------------------------------------------
console.log('\n--- TEST 14: AI Context Validity & No Fallbacks as Measured Values ---');
// 14a. AI context with live active circuit
const aiCtxLive = bridge1.getAIContext();
assert(aiCtxLive.validity.isSimulationAvailable === true, 'Live AI context: isSimulationAvailable is true');
assert(aiCtxLive.validity.isCircuitAvailable === true, 'Live AI context: isCircuitAvailable is true');
assert(aiCtxLive.validity.hasLiveMeasurements === true, 'Live AI context: hasLiveMeasurements is true');
assert(aiCtxLive.validity.isCircuitComplete === true, 'Live AI context: isCircuitComplete is true');
assert(aiCtxLive.validity.isSwitchClosed === true, 'Live AI context: isSwitchClosed is true');
assert(aiCtxLive.validity.switchStatus === 'CLOSED', 'Live AI context: switchStatus is CLOSED');
assert(typeof aiCtxLive.liveMeasurements.currentAmperes === 'number', 'Live current measurement is number');
assert(typeof aiCtxLive.liveMeasurements.resistorVoltageVolts === 'number', 'Live voltage measurement is number');
assert(Array.isArray(aiCtxLive.observations.readings), 'Observations.readings is array');
assert(aiCtxLive.observations.readings.length === 4, 'Observations.readings has 4 items');

// 14b. AI context with offline / empty bridge
const aiCtxOffline = (new SimulationStateBridge({})).getAIContext();
assert(aiCtxOffline.validity.isSimulationAvailable === false, 'Offline AI context: isSimulationAvailable is false');
assert(aiCtxOffline.validity.isCircuitAvailable === false, 'Offline AI context: isCircuitAvailable is false');
assert(aiCtxOffline.validity.hasLiveMeasurements === false, 'Offline AI context: hasLiveMeasurements is false');
assert(aiCtxOffline.validity.isCircuitComplete === false, 'Offline AI context: isCircuitComplete is false');
assert(aiCtxOffline.validity.isSwitchClosed === false, 'Offline AI context: isSwitchClosed is false');
assert(aiCtxOffline.validity.areReadingsValid === false, 'Offline AI context: areReadingsValid is false');
assert(aiCtxOffline.liveMeasurements.currentAmperes === null, 'Offline current measurement is strictly null');
assert(aiCtxOffline.liveMeasurements.currentFormatted === 'UNAVAILABLE', 'Offline currentFormatted is strictly UNAVAILABLE');
assert(aiCtxOffline.liveMeasurements.resistorVoltageVolts === null, 'Offline voltage measurement is strictly null');
assert(aiCtxOffline.liveMeasurements.resistorVoltageFormatted === 'UNAVAILABLE', 'Offline voltageFormatted is strictly UNAVAILABLE');

// -------------------------------------------------------------
// TEST 15: Subscriber notification accuracy
// -------------------------------------------------------------
console.log('\n--- TEST 15: Subscriber Notification Accuracy & Deduplication ---');
const notifSim = new OhmsLawSimulation();
const notifCircuit = new CircuitState();
const notifBridge = new SimulationStateBridge({ simulation: notifSim, circuitState: notifCircuit });

let notificationCount = 0;
let lastReceived = null;
const unsub = notifBridge.subscribe((st) => {
  notificationCount++;
  lastReceived = st;
});

// 1. Terminal selection
notifBridge.setSelectedTerminal('battery_positive');
assert(notificationCount === 1, 'Notification triggered on terminal selection');
assert(lastReceived.interaction.selectedTerminal === 'battery_positive', 'Subscriber received selected terminal');

// Redundant selection of same terminal: should NOT fire
notifBridge.setSelectedTerminal('battery_positive');
assert(notificationCount === 1, 'Redundant terminal selection does NOT fire duplicate notification');

// 2. Wire connection
const w1 = CircuitValidator.validateProposedConnection('battery_positive', 'switch_left', notifCircuit);
notifCircuit.addConnection('battery_positive', 'switch_left', w1);
assert(notificationCount === 2, 'Notification triggered on wire connection');

// 3. Rheostat adjustment
notifSim.setRheostatResistance(15.0);
assert(notificationCount === 3, 'Notification triggered on rheostat adjustment');
assert(lastReceived.rheostat.resistanceFormatted === '15.0 Ω', 'Subscriber received rheostat value');

// 4. Manual unsubscribe
unsub();
notifSim.setRheostatResistance(5.0);
assert(notificationCount === 3, 'No notifications fired after calling unsub()');

notifBridge.destroy();

console.log(`\n=======================================================`);
console.log(`FINAL VALIDATION RESULTS: ${passed} Passed, ${failed} Failed`);
console.log(`=======================================================\n`);

if (failed > 0) process.exit(1);
