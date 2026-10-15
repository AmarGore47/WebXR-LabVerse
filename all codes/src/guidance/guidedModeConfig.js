/**
 * guidedModeConfig.js
 * Single source of truth for the guided wire orientation sequence.
 *
 * Rules:
 * - Uses ONLY canonical terminal IDs from circuitConfig.js.
 * - Each step has instruction, reason, narration text, and completion state.
 * - Do NOT hardcode this data anywhere else.
 * - Marathi narration can be added later by populating 'narrationMr' fields.
 */

export const GUIDED_STEPS = [
  {
    stepIndex: 0,
    stepNumber: 1,
    from: 'battery_positive',
    to: 'switch_left',
    connectionName: 'Battery (+) → Plug Key',
    instruction: 'Connect the positive terminal of the battery to the plug key.',
    reason: 'The plug key safely opens or closes the circuit before current flows.',
    narrationEn:
      'Step 1. Connect the positive terminal of the battery to the plug key. ' +
      'The plug key acts as a safety switch that safely opens or closes the circuit before current flows.',
    narrationMr: '', // Can be filled later
    fromGlow: 0x00ffff,  // Cyan glow for "from" terminal suggestion
    toGlow: 0x00ff88,    // Green-blue glow for valid target
    wireLabelColor: '#ef4444'
  },
  {
    stepIndex: 1,
    stepNumber: 2,
    from: 'switch_right',
    to: 'ammeter_positive',
    connectionName: 'Plug Key → Ammeter (+)',
    instruction: 'Connect the other terminal of the plug key to the positive terminal of the ammeter.',
    reason: 'An ammeter measures current, so it must be placed in series with the circuit.',
    narrationEn:
      'Step 2. Connect the other terminal of the plug key to the positive terminal of the ammeter. ' +
      'An ammeter measures electric current, so it must always be placed in series — that is, directly in the main current path.',
    narrationMr: '',
    fromGlow: 0x00ffff,
    toGlow: 0x00ff88,
    wireLabelColor: '#ef4444'
  },
  {
    stepIndex: 2,
    stepNumber: 3,
    from: 'ammeter_negative',
    to: 'rheostat_in',
    connectionName: 'Ammeter (-) → Rheostat',
    instruction: 'Connect the negative terminal of the ammeter to the rheostat.',
    reason: 'The rheostat changes total resistance and lets us control current safely.',
    narrationEn:
      'Step 3. Connect the negative terminal of the ammeter to the input of the rheostat. ' +
      'The rheostat is a variable resistor. By changing its resistance, we can safely vary the current through the circuit and record multiple readings.',
    narrationMr: '',
    fromGlow: 0x00ffff,
    toGlow: 0x00ff88,
    wireLabelColor: '#38bdf8'
  },
  {
    stepIndex: 3,
    stepNumber: 4,
    from: 'rheostat_out',
    to: 'resistor_left',
    connectionName: 'Rheostat → Resistor (Left)',
    instruction: 'Connect the rheostat output to one side of the resistor.',
    reason: 'The resistor is the component across which we study voltage and current.',
    narrationEn:
      'Step 4. Connect the output of the rheostat to the left terminal of the resistor. ' +
      'The resistor is the main component of this experiment. We will study the relationship between voltage across it and the current through it.',
    narrationMr: '',
    fromGlow: 0x00ffff,
    toGlow: 0x00ff88,
    wireLabelColor: '#38bdf8'
  },
  {
    stepIndex: 4,
    stepNumber: 5,
    from: 'resistor_right',
    to: 'battery_negative',
    connectionName: 'Resistor (Right) → Battery (-)',
    instruction: 'Connect the other side of the resistor to the negative terminal of the battery.',
    reason: 'This completes the main series circuit path.',
    narrationEn:
      'Step 5. Connect the right terminal of the resistor to the negative terminal of the battery. ' +
      'This completes the main series circuit path, forming a closed loop through battery, key, ammeter, rheostat, and resistor.',
    narrationMr: '',
    fromGlow: 0x00ffff,
    toGlow: 0x00ff88,
    wireLabelColor: '#94a3b8'
  },
  {
    stepIndex: 5,
    stepNumber: 6,
    from: 'voltmeter_positive',
    to: 'resistor_left',
    connectionName: 'Voltmeter (+) → Resistor (Left)',
    instruction: 'Connect the positive terminal of the voltmeter to the first side of the resistor.',
    reason: 'A voltmeter measures potential difference across a component.',
    narrationEn:
      'Step 6. Connect the positive terminal of the voltmeter to the left terminal of the resistor. ' +
      'A voltmeter measures electrical potential difference. Its positive terminal must connect to the high-potential side of the resistor.',
    narrationMr: '',
    fromGlow: 0x00ffff,
    toGlow: 0x00ff88,
    wireLabelColor: '#2dd4bf'
  },
  {
    stepIndex: 6,
    stepNumber: 7,
    from: 'voltmeter_negative',
    to: 'resistor_right',
    connectionName: 'Voltmeter (-) → Resistor (Right)',
    instruction: 'Connect the negative terminal of the voltmeter to the other side of the resistor.',
    reason: 'The voltmeter must be connected in parallel across the resistor, never in series.',
    narrationEn:
      'Step 7. Connect the negative terminal of the voltmeter to the right terminal of the resistor. ' +
      'The voltmeter is now connected in parallel across the resistor. This is essential — a voltmeter has very high internal resistance and would block current if placed in series.',
    narrationMr: '',
    fromGlow: 0x00ffff,
    toGlow: 0x00ff88,
    wireLabelColor: '#2dd4bf'
  }
];

export const GUIDED_COMPLETION_MESSAGE = {
  instruction: 'Circuit is complete. Press Start Current to close the key and begin the experiment.',
  reason: 'The ammeter is in series and the voltmeter is parallel across the resistor.',
  narrationEn:
    'Excellent! The circuit is now complete. ' +
    'The ammeter is connected in series to measure current, and the voltmeter is connected in parallel across the resistor to measure potential difference. ' +
    'Now press the Start Current button to close the plug key and begin the experiment.'
};

export const GUIDED_NARRATION_EVENTS = {
  welcome:
    'Welcome to the Ohm\'s Law virtual practical. ' +
    'We will connect the circuit step by step and understand why each component is used.',
  correctWire:
    'Correct connection! ',
  wrongConnection:
    'This connection is not correct for Ohm\'s Law. ' +
    'Follow the highlighted terminals and check whether the component must be in series or in parallel.',
  circuitComplete:
    'The circuit is complete. ' +
    'The ammeter is in series and the voltmeter is connected in parallel across the resistor.',
  currentStart:
    'Current is now flowing through the circuit. ' +
    'The ammeter shows current, while the voltmeter shows the potential difference across the resistor.',
  rheostatAdjust:
    'As rheostat resistance increases, current decreases. ' +
    'This helps us record different voltage and current values safely.',
  readingSaved:
    'Reading recorded. Change the rheostat before recording the next reading.',
  fiveReadings:
    'The V–I graph is approximately a straight line. ' +
    'Voltage is directly proportional to current, so Ohm\'s Law is verified.',
  wireRemovedWhileActive:
    'A wire was removed while current was flowing. ' +
    'The circuit is now open and current has stopped for safety. Please reconnect the wire to continue.'
};

/**
 * Get the guided step for a given terminal pair (canonical, order-independent).
 * Returns the step or null if not part of the guided sequence.
 */
export function getGuidedStepForConnection(from, to) {
  return (
    GUIDED_STEPS.find(
      (s) =>
        (s.from === from && s.to === to) ||
        (s.from === to && s.to === from)
    ) || null
  );
}

/**
 * Given the current circuitState, return which guided step is next (0-indexed),
 * or GUIDED_STEPS.length if all steps are done.
 */
export function getCurrentGuidedStepIndex(circuitState) {
  for (let i = 0; i < GUIDED_STEPS.length; i++) {
    const step = GUIDED_STEPS[i];
    if (!circuitState.hasConnection(step.from, step.to)) {
      return i;
    }
  }
  return GUIDED_STEPS.length; // All done
}
