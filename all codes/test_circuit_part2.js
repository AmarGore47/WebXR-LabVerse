/**
 * test_circuit_part2.js
 * Comprehensive automated verification of Circuit State, Data Model,
 * Graph Validation, and Ohm's Law constraints for Part 2.
 */

import { CircuitState } from './src/circuit/circuitState.js';
import { CircuitValidator } from './src/circuit/circuitValidator.js';
import { REQUIRED_CONNECTIONS, getTerminalDisplayName } from './src/circuit/circuitConfig.js';

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

console.log('--- STARTING CIRCUIT & VALIDATION UNIT TESTS ---\n');

// 1. Initial State
const state = new CircuitState();
assert(state.connections.length === 0, 'Initial circuit starts with 0 wires');
assert(state.switchClosed === false, 'Physical switch is initially open');

const initialValidation = CircuitValidator.validateFullCircuit(state);
assert(!initialValidation.isFullyValid, 'Initial empty circuit is not fully valid');
assert(initialValidation.requiredSatisfiedCount === 0, '0 of 7 required connections satisfied initially');

// 2. Self-connection prevention
const selfTest = CircuitValidator.validateProposedConnection('battery_positive', 'battery_positive', state);
assert(!selfTest.allowed && selfTest.status === 'error', 'Self-connection blocked with error');

// 3. Short-circuit detection (battery_positive <-> battery_negative)
const shortTest = CircuitValidator.validateProposedConnection('battery_positive', 'battery_negative', state);
assert(shortTest.allowed && shortTest.status === 'error' && shortTest.role === 'short_circuit',
  'Direct battery short circuit is flagged with status=error and role=short_circuit');

// Add the short circuit wire and check full circuit validation
const shortConn = state.addConnection('battery_positive', 'battery_negative', shortTest);
const fullWithShort = CircuitValidator.validateFullCircuit(state);
assert(fullWithShort.hasShortCircuit, 'Circuit reports hasShortCircuit = true');
assert(!fullWithShort.isFullyValid, 'Circuit with short circuit is invalid');

// 4. Duplicate connection prevention
const dupTest = CircuitValidator.validateProposedConnection('battery_positive', 'battery_negative', state);
assert(!dupTest.allowed, 'Duplicate connection is blocked');

// 5. Remove short circuit wire
const removedShort = state.removeConnection(shortConn.id);
assert(removedShort, 'Successfully removed short circuit wire');
assert(state.connections.length === 0, 'Connection count back to 0');

// 6. Voltmeter in series warning
const vmSeriesTest = CircuitValidator.validateProposedConnection('voltmeter_positive', 'switch_left', state);
assert(vmSeriesTest.allowed && vmSeriesTest.status === 'warning' && vmSeriesTest.role === 'voltmeter_in_series',
  'Voltmeter in series is flagged with status=warning');

// Add and undo it
const vmConn = state.addConnection('voltmeter_positive', 'switch_left', vmSeriesTest);
assert(state.connections.length === 1, 'Wire added to state');
const undone = state.undoLastConnection();
assert(undone && undone.id === vmConn.id, 'Undo last wire successfully removes voltmeter in series');
assert(state.connections.length === 0, 'State connections empty after undo');

// 7. Capacity limits (resistor allows 2, switch allows 1)
const conn1 = state.addConnection('switch_left', 'battery_positive', { status: 'valid' });
const capTest = CircuitValidator.validateProposedConnection('switch_left', 'ammeter_positive', state);
assert(!capTest.allowed, 'Switch left terminal blocks second connection exceeding capacity (max 1)');
state.removeConnection(conn1.id);

// 8. Full Ohm's Law Circuit assembly (all 7 required links)
const reqLinks = [
  ['battery_positive', 'switch_left'],
  ['switch_right', 'ammeter_positive'],
  ['ammeter_negative', 'rheostat_in'],
  ['rheostat_out', 'resistor_left'],
  ['resistor_right', 'battery_negative'],
  ['voltmeter_positive', 'resistor_left'],
  ['voltmeter_negative', 'resistor_right']
];

console.log('\n--- Assembling 7 Valid Connections ---');
reqLinks.forEach(([from, to], idx) => {
  const v = CircuitValidator.validateProposedConnection(from, to, state);
  assert(v.allowed && v.status === 'valid', `Step ${idx + 1}: Valid connection between ${from} and ${to}`);
  state.addConnection(from, to, v);
});

assert(state.connections.length === 7, 'All 7 connections present in state');

// 9. Full Circuit Validation of the complete setup
const fullComplete = CircuitValidator.validateFullCircuit(state);
assert(fullComplete.isFullyValid, 'Full circuit is recognised as completely valid');
assert(fullComplete.seriesPathComplete, 'Series path is complete');
assert(fullComplete.voltmeterParallelComplete, 'Voltmeter parallel branch is complete');
assert(fullComplete.missingConnections.length === 0, '0 missing connections');
assert(fullComplete.errorCount === 0, '0 errors');
assert(fullComplete.warningCount === 0, '0 warnings');

// 10. Switch activation guard
// Should allow closing when fully valid
assert(!state.switchClosed, 'Switch is open initially');
state.setSwitchClosed(true);
assert(state.switchClosed, 'Switch toggles to closed when circuit is valid');

// 11. Reset Circuit
console.log('\n--- Testing Reset Circuit ---');
state.reset();
assert(state.connections.length === 0, 'Reset cleared all connections');
assert(state.switchClosed === false, 'Reset opened switch');
const postResetValidation = CircuitValidator.validateFullCircuit(state);
assert(!postResetValidation.isFullyValid, 'Post-reset circuit is incomplete');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
