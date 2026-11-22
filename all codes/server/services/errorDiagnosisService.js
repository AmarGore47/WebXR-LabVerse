/**
 * errorDiagnosisService.js
 * Deterministic Student Error Diagnosis Service for LabVerse Virtual Science Lab.
 *
 * Strict Architecture Rules:
 * 1. CircuitValidator and SimulationStateBridge are the SOLE AUTHORITATIVE SOURCES OF TRUTH.
 * 2. LLMs must NEVER independently determine electrical correctness or fabricate faults.
 * 3. Produces structured, evidence-backed diagnostic profiles for the Socratic Tutoring Engine.
 * 4. If simulation data is absent, invalid, or insufficient, returns an explicit insufficient_evidence status.
 */

export class ErrorDiagnosisService {
  constructor() {
    // Diagnostic catalog mapping known authoritative error codes to pedagogical profiles
    this.diagnosticCatalog = {
      ERR_AMMETER_SHORT: {
        category: 'circuit_topology',
        severity: 'critical',
        explanation: 'The ammeter has near-zero internal resistance (~0.2 Ω). Connecting it in parallel across the resistor creates a low-resistance path that bypasses the resistor entirely and can overload the meter.',
        suggestedCorrection: 'Disconnect the ammeter from across the resistor and wire it in series so current flows through the ammeter and resistor sequentially.',
        teachingStrategy: 'misconception_correction',
        conceptId: 'misc_ammeter_parallel'
      },

      ERR_VOLTMETER_IN_SERIES: {
        category: 'circuit_topology',
        severity: 'critical',
        explanation: 'The voltmeter has an extremely high internal resistance (~10,000 Ω). Connecting it in series acts like a break in the circuit, reducing the current through the entire loop to near zero.',
        suggestedCorrection: 'Remove the voltmeter from the series loop. Connect it in parallel across the terminals of the fixed resistor (Resistor Left and Resistor Right).',
        teachingStrategy: 'misconception_correction',
        conceptId: 'misc_voltmeter_series'
      },

      ERR_REVERSED_POLARITY: {
        category: 'instrumentation',
        severity: 'warning',
        explanation: 'Analog and digital DC meters require conventional current to enter the positive (+) terminal and exit the negative (-) terminal. Reversed polarity causes meters to deflect backwards below zero or indicate negative values.',
        suggestedCorrection: 'Swap the wires connected to the meter terminals so positive (+) connects to the positive side of the DC supply.',
        teachingStrategy: 'procedure_guidance',
        conceptId: 'obj_instrument_placement'
      },

      ERR_SHORT_CIRCUIT: {
        category: 'circuit_topology',
        severity: 'critical',
        explanation: 'A direct zero-resistance conductive connection exists across the battery terminals without passing through any load resistor. This causes excessive current flow that trips the power supply.',
        suggestedCorrection: 'Remove the wire directly bridging the battery terminals. Ensure current passes through the resistor and rheostat.',
        teachingStrategy: 'socratic_question',
        conceptId: 'obj_instrument_placement'
      },

      WARN_KEY_OPEN: {
        category: 'procedure',
        severity: 'warning',
        explanation: 'All 7 circuit wires are correctly connected, but the one-way plug key is open. An open key leaves an air gap with infinite resistance, preventing electric current from circulating.',
        suggestedCorrection: 'Insert the plug key (or click "Start Current") to close the conductive loop and begin taking readings.',
        teachingStrategy: 'socratic_question',
        conceptId: 'misc_open_key_flow'
      },

      ERR_INCOMPLETE_CIRCUIT: {
        category: 'circuit_topology',
        severity: 'info',
        explanation: 'The circuit loop is incomplete. All seven wires must be placed between the battery, switch, ammeter, resistor, rheostat, and voltmeter to form a closed circuit.',
        suggestedCorrection: 'Inspect the tabletop circuit schematic and connect the remaining wires between the highlighted terminals.',
        teachingStrategy: 'procedure_guidance',
        conceptId: 'obj_formula'
      },

      WARN_NO_READINGS_RECORDED: {
        category: 'observation',
        severity: 'info',
        explanation: 'Current is flowing through the circuit, but no readings have been recorded in the observation table yet.',
        suggestedCorrection: 'Adjust the rheostat slider to a distinct resistance setting and click "Record Reading" on the Observation Station or desktop panel.',
        teachingStrategy: 'procedure_guidance',
        conceptId: 'obj_rheostat_control'
      },

      WARN_RHEOSTAT_STATIC: {
        category: 'observation',
        severity: 'warning',
        explanation: 'Successive observation readings were recorded at the exact same current and voltage values without moving the rheostat slider.',
        suggestedCorrection: 'Slide the rheostat contact to change total circuit resistance before capturing the next observation.',
        teachingStrategy: 'socratic_question',
        conceptId: 'obj_rheostat_control'
      }
    };
  }

  /**
   * Deterministically diagnoses student errors from authoritative simulation context.
   * @param {Object} simulationContext - Telemetry from SimulationStateBridge.getAIContext()
   * @returns {Object} Structured diagnostic report
   */
  diagnose(simulationContext) {
    // 1. Guard against missing or malformed telemetry
    if (
      !simulationContext ||
      typeof simulationContext !== 'object' ||
      Object.keys(simulationContext).length === 0 ||
      (simulationContext.validity && simulationContext.validity.isSimulationAvailable === false && !simulationContext.simulationAvailable)
    ) {
      return {
        status: 'insufficient_evidence',
        reason: 'Simulation telemetry is unavailable or uninitialized.',
        hasErrors: false,
        primaryError: null,
        diagnosedErrors: [],
        timestamp: Date.now()
      };
    }

    const rawMistakes = Array.isArray(simulationContext.detectedMistakes)
      ? simulationContext.detectedMistakes
      : (Array.isArray(simulationContext.circuitTopology?.mistakes) ? simulationContext.circuitTopology.mistakes : []);

    const isComplete = simulationContext.circuitTopology?.isComplete ?? simulationContext.circuit?.isComplete ?? false;
    const isSwitchClosed = simulationContext.switchState?.isClosed ?? simulationContext.circuit?.keyClosed ?? false;
    const current = simulationContext.measurements?.currentAmperes ?? simulationContext.circuit?.currentAmperes ?? 0;
    const wireCount = simulationContext.circuitTopology?.wireCount ?? simulationContext.circuit?.wireCount ?? 0;
    const observations = Array.isArray(simulationContext.observations?.readings)
      ? simulationContext.observations.readings
      : [];

    const diagnosedErrors = [];

    // Helper to resolve known error code from string or object
    const resolveErrorCode = (m) => {
      if (!m) return null;
      if (typeof m === 'object' && m.code) return m.code;
      const str = (typeof m === 'string' ? m : (m.description || m.message || '')).toLowerCase();
      if (str.includes('ammeter') && (str.includes('parallel') || str.includes('short'))) return 'ERR_AMMETER_SHORT';
      if (str.includes('voltmeter') && str.includes('series')) return 'ERR_VOLTMETER_IN_SERIES';
      if (str.includes('polarity') || str.includes('reversed')) return 'ERR_REVERSED_POLARITY';
      if (str.includes('short circuit') || str.includes('dead short')) return 'ERR_SHORT_CIRCUIT';
      if (str.includes('key open') || str.includes('switch open') || str.includes('plug key')) return 'WARN_KEY_OPEN';
      if (str.includes('incomplete')) return 'ERR_INCOMPLETE_CIRCUIT';
      return (typeof m === 'object' && m.code) ? m.code : null;
    };

    // 2. Evaluate authoritative mistakes reported by CircuitValidator
    rawMistakes.forEach((m) => {
      const code = resolveErrorCode(m) || (typeof m === 'object' ? m.code : 'UNKNOWN_MISTAKE');
      const catalogEntry = this.diagnosticCatalog[code];

      if (catalogEntry) {
        diagnosedErrors.push({
          code,
          errorCode: code,
          errorCategory: catalogEntry.category,
          severity: catalogEntry.severity,
          evidence: {
            reportedMistake: typeof m === 'string' ? m : (m.description || m.message),
            wireCount,
            isComplete,
            isSwitchClosed,
            measuredCurrent: current
          },
          explanation: catalogEntry.explanation,
          suggestedCorrection: catalogEntry.suggestedCorrection,
          teachingStrategy: catalogEntry.teachingStrategy,
          conceptId: catalogEntry.conceptId
        });
      } else {
        // Unknown or custom mistake
        diagnosedErrors.push({
          code: code || 'UNKNOWN_MISTAKE',
          errorCode: code || 'UNKNOWN_MISTAKE',
          errorCategory: (typeof m === 'object' && m.category) ? m.category : 'general',
          severity: (typeof m === 'object' && m.severity) ? m.severity : 'warning',
          evidence: { rawMistake: m },
          explanation: (typeof m === 'object' && m.description) ? m.description : (typeof m === 'string' ? m : 'An electrical or procedure mistake was flagged by the circuit validator.'),
          suggestedCorrection: 'Review the circuit connections against the schematic.',
          teachingStrategy: 'socratic_question',
          conceptId: 'obj_formula'
        });
      }
    });

    // 3. Evaluate Procedure / Observation States (if not already flagged in mistakes)
    if (wireCount < 7 && !isComplete && diagnosedErrors.length === 0) {
      const entry = this.diagnosticCatalog.ERR_INCOMPLETE_CIRCUIT;
      diagnosedErrors.push({
        code: 'ERR_INCOMPLETE_CIRCUIT',
        errorCode: 'ERR_INCOMPLETE_CIRCUIT',
        errorCategory: entry.category,
        severity: entry.severity,
        evidence: { wireCount, requiredWires: 7 },
        explanation: entry.explanation,
        suggestedCorrection: entry.suggestedCorrection,
        teachingStrategy: entry.teachingStrategy,
        conceptId: entry.conceptId
      });
    }

    // Circuit complete but switch open
    if (isComplete && !isSwitchClosed && !diagnosedErrors.some((e) => e.errorCode === 'WARN_KEY_OPEN')) {
      const entry = this.diagnosticCatalog.WARN_KEY_OPEN;
      diagnosedErrors.push({
        code: 'WARN_KEY_OPEN',
        errorCode: 'WARN_KEY_OPEN',
        errorCategory: entry.category,
        severity: entry.severity,
        evidence: { isComplete: true, isSwitchClosed: false, current },
        explanation: entry.explanation,
        suggestedCorrection: entry.suggestedCorrection,
        teachingStrategy: entry.teachingStrategy,
        conceptId: entry.conceptId
      });
    }

    // Switch closed and current active, but 0 observations after practical started
    if (isSwitchClosed && current > 0 && observations.length === 0) {
      const entry = this.diagnosticCatalog.WARN_NO_READINGS_RECORDED;
      diagnosedErrors.push({
        code: 'WARN_NO_READINGS_RECORDED',
        errorCode: 'WARN_NO_READINGS_RECORDED',
        errorCategory: entry.category,
        severity: entry.severity,
        evidence: { observationsRecorded: 0, current },
        explanation: entry.explanation,
        suggestedCorrection: entry.suggestedCorrection,
        teachingStrategy: entry.teachingStrategy,
        conceptId: entry.conceptId
      });
    }

    // Repeated identical observations (rheostat not varied)
    if (observations.length >= 2) {
      const lastObs = observations[observations.length - 1];
      const prevObs = observations[observations.length - 2];
      if (Math.abs(lastObs.current - prevObs.current) < 0.001 && Math.abs(lastObs.voltage - prevObs.voltage) < 0.001) {
        const entry = this.diagnosticCatalog.WARN_RHEOSTAT_STATIC;
        diagnosedErrors.push({
          code: 'WARN_RHEOSTAT_STATIC',
          errorCode: 'WARN_RHEOSTAT_STATIC',
          errorCategory: entry.category,
          severity: entry.severity,
          evidence: { lastCurrent: lastObs.current, prevCurrent: prevObs.current },
          explanation: entry.explanation,
          suggestedCorrection: entry.suggestedCorrection,
          teachingStrategy: entry.teachingStrategy,
          conceptId: entry.conceptId
        });
      }
    }

    // 4. Select Primary Error (highest severity: critical > warning > info)
    const severityRank = { critical: 3, warning: 2, info: 1 };
    diagnosedErrors.sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0));
    const primaryError = diagnosedErrors[0] || null;

    return {
      status: diagnosedErrors.length > 0 ? 'diagnosed' : 'ok',
      hasErrors: diagnosedErrors.length > 0,
      primaryError,
      diagnosedErrors,
      summary: primaryError ? primaryError.explanation : 'All connections and telemetry are operating normally according to Ohm’s Law.',
      timestamp: Date.now()
    };
  }
}

