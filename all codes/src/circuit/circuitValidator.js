/**
 * circuitValidator.js
 * Graph-based electrical validation for Maharashtra Std. 10 Ohm's Law setup.
 * Provides student-friendly pedagogical feedback for both valid steps and recoverable mistakes.
 */

import {
  REQUIRED_CONNECTIONS,
  getMaxConnectionsForTerminal,
  getTerminalDisplayName
} from './circuitConfig.js';

export class CircuitValidator {
  /**
   * Validate a newly proposed wire connection between two terminals.
   */
  static validateProposedConnection(from, to, circuitState) {
    // 1. Terminal cannot connect to itself
    if (from === to) {
      return {
        allowed: false,
        status: 'error',
        message: 'A terminal cannot connect to itself. Select a different terminal.'
      };
    }

    // 2. Prevent duplicate wire
    if (circuitState.hasConnection(from, to)) {
      return {
        allowed: false,
        status: 'error',
        message: 'These two terminals are already connected with a wire.'
      };
    }

    // 3. Check connection capacity limits
    const fromCount = circuitState.getConnectionCountForTerminal(from);
    const fromMax = getMaxConnectionsForTerminal(from);
    if (fromCount >= fromMax) {
      return {
        allowed: false,
        status: 'error',
        message: `${getTerminalDisplayName(from)} already has the maximum allowed connections (${fromMax}). Only resistor terminals allow a second connection for the voltmeter.`
      };
    }

    const toCount = circuitState.getConnectionCountForTerminal(to);
    const toMax = getMaxConnectionsForTerminal(to);
    if (toCount >= toMax) {
      return {
        allowed: false,
        status: 'error',
        message: `${getTerminalDisplayName(to)} already has the maximum allowed connections (${toMax}). Only resistor terminals allow a second connection for the voltmeter.`
      };
    }

    // 4. Prohibited direct battery short-circuit
    if (
      (from === 'battery_positive' && to === 'battery_negative') ||
      (from === 'battery_negative' && to === 'battery_positive')
    ) {
      return {
        allowed: true, // Allow user to make mistake so they can see and recover
        status: 'error',
        role: 'short_circuit',
        wireType: 'error',
        message: '⚠️ Danger: Direct Short Circuit! Connecting battery positive directly to battery negative bypasses all resistance and will cause excessive current.'
      };
    }

    // 5. Prohibited voltmeter in series in main current path
    const isVoltmeterInSeries =
      (from.startsWith('voltmeter') && (to === 'switch_left' || to === 'switch_right' || to === 'ammeter_positive' || to === 'ammeter_negative' || to === 'rheostat_in' || to === 'rheostat_out')) ||
      (to.startsWith('voltmeter') && (from === 'switch_left' || from === 'switch_right' || from === 'ammeter_positive' || from === 'ammeter_negative' || from === 'rheostat_in' || from === 'rheostat_out'));

    if (isVoltmeterInSeries) {
      return {
        allowed: true,
        status: 'warning',
        role: 'voltmeter_in_series',
        wireType: 'warning',
        message: '⚠️ Voltmeter in Series! A voltmeter has very high internal resistance (~10,000 Ω) and will block current if placed in series. Voltmeter must be connected in PARALLEL across the resistor.'
      };
    }

    // 6. Prohibited ammeter parallel across power supply
    if (
      (from === 'battery_positive' && to === 'ammeter_negative') ||
      (from === 'battery_negative' && to === 'ammeter_positive')
    ) {
      return {
        allowed: true,
        status: 'warning',
        role: 'ammeter_short',
        wireType: 'warning',
        message: '⚠️ Ammeter Placement Warning: An ammeter has near-zero resistance and must be connected in series with the load, never directly across the power supply.'
      };
    }

    // 7. Voltmeter polarity reversed across resistor
    if (
      (from === 'voltmeter_positive' && to === 'resistor_right') ||
      (from === 'resistor_right' && to === 'voltmeter_positive') ||
      (from === 'voltmeter_negative' && to === 'resistor_left') ||
      (from === 'resistor_left' && to === 'voltmeter_negative')
    ) {
      return {
        allowed: true,
        status: 'warning',
        role: 'reversed_polarity',
        wireType: 'warning',
        message: '⚠️ Voltmeter Polarity Reversed! Connect Voltmeter (+) to the high-potential side (Resistor Left) and Voltmeter (-) to the low-potential side (Resistor Right).'
      };
    }

    // 8. Check if matching one of the required standard connections
    const matchedRequired = REQUIRED_CONNECTIONS.find(
      (req) => (req.from === from && req.to === to) || (req.from === to && req.to === from)
    );

    if (matchedRequired) {
      return {
        allowed: true,
        status: 'valid',
        role: matchedRequired.role,
        wireType: matchedRequired.wireType,
        ruleId: matchedRequired.id,
        message: `Good: Connected ${matchedRequired.name}. ${matchedRequired.description}`
      };
    }

    // 9. Recoverable non-standard connection
    return {
      allowed: true,
      status: 'warning',
      role: 'non_standard',
      wireType: 'warning',
      message: `Non-standard connection: Connected ${getTerminalDisplayName(from)} to ${getTerminalDisplayName(to)}. This wire is not part of the standard Ohm’s Law practical setup.`
    };
  }

  /**
   * Validate the complete circuit topology against the scientific Ohm's Law requirement.
   */
  static validateFullCircuit(circuitState) {
    const activeConnections = circuitState.connections;

    // Check each required connection
    const missing = [];
    const satisfied = [];

    REQUIRED_CONNECTIONS.forEach((req) => {
      const isConnected = circuitState.hasConnection(req.from, req.to);
      if (isConnected) {
        satisfied.push(req);
      } else {
        missing.push(req);
      }
    });

    // Check for short circuits or erroneous wires
    const errorWires = activeConnections.filter((c) => c.status === 'error');
    const warningWires = activeConnections.filter((c) => c.status === 'warning');

    const hasShortCircuit = errorWires.some((c) => c.role === 'short_circuit');
    const seriesPathComplete =
      circuitState.hasConnection('battery_positive', 'switch_left') &&
      circuitState.hasConnection('switch_right', 'ammeter_positive') &&
      circuitState.hasConnection('ammeter_negative', 'rheostat_in') &&
      circuitState.hasConnection('rheostat_out', 'resistor_left') &&
      circuitState.hasConnection('resistor_right', 'battery_negative');

    const voltmeterParallelComplete =
      circuitState.hasConnection('voltmeter_positive', 'resistor_left') &&
      circuitState.hasConnection('voltmeter_negative', 'resistor_right');

    const isFullyValid =
      missing.length === 0 &&
      errorWires.length === 0 &&
      warningWires.length === 0 &&
      seriesPathComplete &&
      voltmeterParallelComplete;

    let feedbackMessage = '';
    if (hasShortCircuit) {
      feedbackMessage = '⚠️ Short circuit detected! Remove the direct battery wire before proceeding.';
    } else if (warningWires.length > 0) {
      feedbackMessage = '⚠️ Circuit has misplaced wires. Remove them to complete the standard Ohm’s Law setup.';
    } else if (isFullyValid) {
      feedbackMessage = '🎉 Circuit correctly assembled! The ammeter is in series and voltmeter is in parallel across the resistor. Close the key to start the experiment.';
    } else if (seriesPathComplete && !voltmeterParallelComplete) {
      feedbackMessage = 'Series path complete! Connect the voltmeter in parallel across the resistor.';
    } else {
      feedbackMessage = `Incomplete circuit: ${satisfied.length} of ${REQUIRED_CONNECTIONS.length} required connections made.`;
    }

    return {
      isFullyValid,
      seriesPathComplete,
      voltmeterParallelComplete,
      hasShortCircuit,
      errorCount: errorWires.length,
      warningCount: warningWires.length,
      totalConnected: activeConnections.length,
      requiredSatisfiedCount: satisfied.length,
      requiredTotalCount: REQUIRED_CONNECTIONS.length,
      missingConnections: missing,
      feedbackMessage
    };
  }
}
