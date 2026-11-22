/**
 * audit_execution_test.js
 * Empirical execution audit testing Phase 3, 4, and 5 scenarios against
 * the current codebase to document exact expected vs actual behavior.
 */

import { CircuitState } from '../src/circuit/circuitState.js';
import { CircuitValidator } from '../src/circuit/circuitValidator.js';
import { OhmsLawSimulation } from '../src/experiments/ohmsLaw/ohmsLawSimulation.js';
import { OHMS_LAW_CONFIG } from '../src/experiments/ohmsLaw/ohmsLawConfig.js';

console.log('=== RUNNING EMPIRICAL AUDIT TESTS ===\n');

// -------------------------------------------------------------
// PHASE 4: MISTAKE DETECTION TESTING
// -------------------------------------------------------------
console.log('--- PHASE 4: DELIBERATE MISTAKES ---');

const cs = new CircuitState();

// 1. Ammeter in parallel across power supply
const ammeterShort = CircuitValidator.validateProposedConnection('battery_positive', 'ammeter_negative', cs);
console.log('Mistake 1 (Ammeter in parallel):', {
  status: ammeterShort.status,
  role: ammeterShort.role,
  message: ammeterShort.message
});

// 2. Voltmeter in series
const voltSeries = CircuitValidator.validateProposedConnection('voltmeter_positive', 'ammeter_negative', cs);
console.log('Mistake 2 (Voltmeter in series):', {
  status: voltSeries.status,
  role: voltSeries.role,
  message: voltSeries.message
});

// 3. Voltmeter connected to incorrect terminals (e.g. switch)
const voltIncorrect = CircuitValidator.validateProposedConnection('voltmeter_positive', 'switch_left', cs);
console.log('Mistake 3 (Voltmeter incorrect):', {
  status: voltIncorrect.status,
  role: voltIncorrect.role,
  message: voltIncorrect.message
});

// 4. Direct battery short circuit
const battShort = CircuitValidator.validateProposedConnection('battery_positive', 'battery_negative', cs);
console.log('Mistake 4 (Battery short circuit):', {
  status: battShort.status,
  role: battShort.role,
  message: battShort.message
});

// 5. Reversed polarity voltmeter
const revPol = CircuitValidator.validateProposedConnection('voltmeter_positive', 'resistor_right', cs);
console.log('Mistake 5 (Reversed polarity):', {
  status: revPol.status,
  role: revPol.role,
  message: revPol.message
});

// 6. Switch left open
const sim = new OhmsLawSimulation();
sim.setCircuitReady(true);
sim.setKeyClosed(false);
console.log('Mistake 6 (Switch open):', {
  keyClosed: sim.keyClosed,
  current: sim.current,
  voltage: sim.voltage
});

// -------------------------------------------------------------
// PHASE 5: SCIENTIFIC CALCULATION TESTING
// -------------------------------------------------------------
console.log('\n--- PHASE 5: CALCULATION TESTING ---');

sim.setKeyClosed(true);

// Current config values:
console.log('Config parameters:', {
  supplyVoltageMax: OHMS_LAW_CONFIG.supplyVoltageMax,
  fixedResistor: OHMS_LAW_CONFIG.fixedResistor,
  ammeterInternalResistance: OHMS_LAW_CONFIG.ammeterInternalResistance,
  rheostatRange: [OHMS_LAW_CONFIG.rheostatMinimumResistance, OHMS_LAW_CONFIG.rheostatMaximumResistance]
});

// Case A: Target: V = 3V, R = 10Ω, Expected I = 0.3A
// Note: In current sim, supplyVoltage is fixed at 6.0V.
// With fixedResistor = 10Ω, ammeter = 0.2Ω, if rheostat = 9.8Ω -> Total R = 20Ω -> I = 6/20 = 0.30A.
// Then V across 10Ω resistor = 0.30A * 10Ω = 3.0V!
sim.setRheostatResistance(9.8);
console.log('Simulation Case A (V across resistor = 3.0V, R_fixed = 10Ω):', {
  rheostatR: sim.rheostatResistance,
  totalR: sim.totalResistance,
  current: sim.current,
  voltageAcrossResistor: sim.resistorVoltage,
  ratio: sim.resistorVoltage / sim.current
});

// Case B: Target: V = 6V, R = 10Ω, Expected I = 0.6A
// If rheostat = 0.5Ω (min) -> Total R = 10.7Ω -> I = 6/10.7 = 0.56A (Safe limit triggered at 0.50A)
sim.setRheostatResistance(0.5);
console.log('Simulation Case B (Min rheostat 0.5Ω, R_fixed = 10Ω):', {
  rheostatR: sim.rheostatResistance,
  totalR: sim.totalResistance,
  current: sim.current,
  voltageAcrossResistor: sim.resistorVoltage,
  isOverRange: sim.isOverRange
});

// Case C: Target: V = 6V (supply), Total R = 20Ω, Expected I = 0.3A
sim.setRheostatResistance(9.8);
console.log('Simulation Case C (Total R = 20Ω):', {
  totalR: sim.totalResistance,
  current: sim.current,
  voltageAcrossResistor: sim.resistorVoltage
});

console.log('\n=== AUDIT TESTS COMPLETE ===');
