/**
 * simulationStateBridge.js
 * Real-Time Simulation State Telemetry Bridge for LabVerse WebXR Physics Lab.
 *
 * Bridges the physical Ohm's Law calculation engine (OhmsLawSimulation)
 * and topological circuit graph validator (CircuitValidator) into a clean,
 * deterministic JSON interface for educational AI agents and telemetry.
 *
 * Exposes:
 * - getCurrentState(): Full structured JSON snapshot with physical units and validity metadata
 * - getCircuitStatus(): Direct circuit graph completion & validation metrics
 * - getDetectedMistakes(): Array of actionable mistake/warning objects with hints
 * - getPracticalProgress(): Step-by-step progress, percentages, and blockers
 * - getAIContext(): Compact, high-signal prompt payload for LLM injection
 * - subscribe(callback): Event-driven reactive listener
 * - destroy(): Complete cleanup of listeners, restoring original interaction callbacks
 */

import { CircuitValidator } from '../circuit/circuitValidator.js';
import { REQUIRED_CONNECTIONS, getTerminalDisplayName } from '../circuit/circuitConfig.js';
import { OHMS_LAW_CONFIG } from '../experiments/ohmsLaw/ohmsLawConfig.js';

export class SimulationStateBridge {
  constructor(options = {}) {
    this.simulation = options.simulation ?? null;
    this.circuitState = options.circuitState ?? null;
    this.interactionController = options.interactionController ?? null;
    this.workflowManager = options.workflowManager ?? null;
    this.config = options.config ?? (this.simulation ? this.simulation.config : OHMS_LAW_CONFIG) ?? OHMS_LAW_CONFIG;

    // Student interaction tracking
    this.lastStudentAction = 'Initialized simulation';
    this.lastStudentActionTime = Date.now();
    this.selectedTerminal = null;

    // Reactive subscribers
    this.subscribers = new Set();
    this._unsubscribers = [];

    // Cached state to avoid redundant notifications
    this._lastBroadcastHash = null;

    // Preserved interaction callback references for safe cleanup
    this._originalOnSelectionChanged = null;
    this._installedSelectionWrapper = null;

    this._setupEventListeners();
  }

  // ─── 1. Event-Based Architecture ──────────────────────────────────────────

  _setupEventListeners() {
    // 1. Listen to Circuit State changes (wires connected, removed, reset)
    if (this.circuitState && typeof this.circuitState.subscribe === 'function') {
      const unsubCircuit = this.circuitState.subscribe(() => {
        this.trackAction('Circuit wiring modified');
        this._notifySubscribers();
      });
      this._unsubscribers.push(unsubCircuit);
    }

    // 2. Listen to Simulation Engine changes (switch toggled, rheostat moved, readings recorded)
    if (this.simulation && typeof this.simulation.subscribe === 'function') {
      const unsubSim = this.simulation.subscribe(() => {
        this._notifySubscribers();
      });
      this._unsubscribers.push(unsubSim);
    }

    // 3. Listen to Interaction Controller terminal selections, cleanly wrapping original callback
    if (this.interactionController) {
      this._originalOnSelectionChanged = this.interactionController.onSelectionChanged;
      this._installedSelectionWrapper = (termId) => {
        this.selectedTerminal = termId;
        this.trackAction(termId ? `Selected terminal: ${getTerminalDisplayName(termId)}` : 'Cleared terminal selection');
        if (typeof this._originalOnSelectionChanged === 'function') {
          this._originalOnSelectionChanged(termId);
        }
        this._notifySubscribers();
      };
      this.interactionController.onSelectionChanged = this._installedSelectionWrapper;
    }
  }

  /**
   * Subscribe to state bridge updates.
   * Returns an unsubscribe function.
   */
  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Record a student interaction event.
   */
  trackAction(actionDescription) {
    if (!actionDescription) return;
    this.lastStudentAction = actionDescription;
    this.lastStudentActionTime = Date.now();
  }

  /**
   * Set or clear the actively selected terminal and notify subscribers if changed.
   */
  setSelectedTerminal(termId) {
    if (this.selectedTerminal === termId) return;
    this.selectedTerminal = termId;
    this.trackAction(termId ? `Selected terminal: ${getTerminalDisplayName(termId)}` : 'Cleared terminal selection');
    this._notifySubscribers();
  }

  _notifySubscribers() {
    if (this.subscribers.size === 0) return;
    const state = this.getCurrentState();
    
    // Comprehensive composite signature checking all critical state dimensions:
    // Supply voltage, current, resistor voltage, rheostat, wires, validation status, switch, observations, verification, terminal selection
    const mistakeCodes = state.detectedMistakes.map((m) => m.code).sort().join(',');
    const latestReadingNo = state.observations.readings.length > 0
      ? state.observations.readings[state.observations.readings.length - 1].readingNo
      : 0;

    const stateHash = [
      state.workflowStage.step,
      state.validity.isSimulationAvailable,
      state.validity.isCircuitAvailable,
      state.validity.hasLiveMeasurements,
      state.circuit.keyClosed,
      state.circuit.wireCount,
      state.circuit.completionStatus,
      state.circuit.currentAmperes,
      state.resistor.measuredVoltageVolts,
      state.powerSupply.voltageVolts,
      state.rheostat.resistanceOhms,
      state.observations.count,
      latestReadingNo,
      state.observations.isVerified,
      state.interaction.selectedTerminal,
      mistakeCodes,
      this.lastStudentAction
    ].join('|');

    if (stateHash === this._lastBroadcastHash) return;
    this._lastBroadcastHash = stateHash;

    this.subscribers.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error('[SimulationStateBridge] Error in subscriber callback:', err);
      }
    });
  }

  setWorkflowManager(workflowManager) {
    this.workflowManager = workflowManager;
  }

  // ─── 2. Core API Methods ──────────────────────────────────────────────────

  /**
   * Returns comprehensive, structured JSON state with strict physical units and validity metadata.
   */
  getCurrentState() {
    const isSimAvailable = Boolean(this.simulation && typeof this.simulation.getState === 'function');
    const isCircuitAvailable = Boolean(this.circuitState && Array.isArray(this.circuitState.connections));

    const simState = isSimAvailable ? this.simulation.getState() : null;

    const circuitStatus = this.getCircuitStatus();
    const mistakes = this.getDetectedMistakes();
    const progress = this.getPracticalProgress();
    const instruments = this._getInstrumentsState(simState);

    // Differentiate configured vs live vs fallback values using nullish coalescing (??)
    const supplyVoltage = this.config.supplyVoltageMax ?? 6.0;
    const fixedResistor = this.config.fixedResistor ?? 10.0;
    const defaultRheo = this.config.rheostatDefaultResistance ?? 12.0;

    const rheoR = simState ? simState.rheostatResistance : defaultRheo;
    const currentA = simState ? simState.current : null;
    const resistorV = simState ? simState.resistorVoltage : null;
    const totalR = simState ? simState.totalResistance : null;
    const keyClosed = simState ? Boolean(simState.keyClosed) : false;

    // Workflow stage labels
    let workflowStage;
    if (this.workflowManager && typeof this.workflowManager.getCurrentStageInfo === 'function') {
      const info = this.workflowManager.getCurrentStageInfo();
      workflowStage = {
        step: info.step,
        id: info.id,
        label: info.label,
        desc: info.description,
        prerequisites: info.prerequisites
      };
    } else {
      const stageMap = {
        1: { step: 1, label: 'Assemble Circuit Wires', desc: 'Connect all 7 circuit wire connections between terminals.' },
        2: { step: 2, label: 'Verify Circuit Setup', desc: 'Ensure voltmeter is in parallel and ammeter is in series.' },
        3: { step: 3, label: 'Close Plug Key', desc: 'Insert plug key to start electrical current flow.' },
        4: { step: 4, label: 'Adjust Rheostat', desc: 'Slide rheostat to set initial current reading.' },
        5: { step: 5, label: 'Record 5 Observations', desc: 'Record 5 distinct pairs of Voltage (V) and Current (I).' },
        6: { step: 6, label: 'Verify Ohm’s Law', desc: 'Inspect V–I straight-line graph and confirm verified slope.' }
      };
      const currentStepNum = simState ? simState.workflowStep : 1;
      workflowStage = stageMap[currentStepNum] ?? stageMap[1];
    }

    // Observations list
    const rawReadings = (simState && Array.isArray(simState.readings)) ? simState.readings : [];
    const formattedReadings = rawReadings.map((r, i) => ({
      readingNo: r.readingNo ?? (i + 1),
      voltageVolts: r.voltage,
      voltageFormatted: (typeof r.voltage === 'number') ? `${r.voltage.toFixed(2)} V` : '—',
      currentAmperes: r.current,
      currentFormatted: (typeof r.current === 'number') ? `${r.current.toFixed(2)} A` : '—',
      resistanceRatioOhms: r.ratio,
      resistanceRatioFormatted: (typeof r.ratio === 'number') ? `${r.ratio.toFixed(2)} Ω` : '—',
      rheostatResistanceOhms: r.rheostatResistance,
      rheostatResistanceFormatted: (typeof r.rheostatResistance === 'number') ? `${r.rheostatResistance.toFixed(1)} Ω` : '—',
      timestamp: r.timestamp ?? Date.now()
    }));

    const stats = (simState && simState.statistics) ? simState.statistics : null;
    const meanR = (stats && typeof stats.meanRatio === 'number') ? stats.meanRatio : null;

    return {
      practical: 'ohms_law',
      title: 'Verification of Ohm’s Law (Maharashtra Std. 10 Physics)',
      timestamp: Date.now(),
      validity: {
        isSimulationAvailable: isSimAvailable,
        isCircuitAvailable: isCircuitAvailable,
        hasLiveMeasurements: Boolean(isSimAvailable && keyClosed && simState?.circuitReady),
        isOverRange: simState ? Boolean(simState.isOverRange) : false
      },
      workflowStage,
      powerSupply: {
        type: 'Regulated DC Power Supply',
        voltageVolts: supplyVoltage,
        voltageFormatted: `${supplyVoltage.toFixed(2)} V`,
        isConfigured: true
      },
      resistor: {
        specimen: 'Standard Nichrome Wire Resistor Coil',
        fixedResistanceOhms: fixedResistor,
        fixedResistanceFormatted: `${fixedResistor.toFixed(2)} Ω`,
        measuredVoltageVolts: resistorV,
        measuredVoltageFormatted: (resistorV !== null) ? `${resistorV.toFixed(2)} V` : 'UNAVAILABLE',
        isLiveMeasurement: (resistorV !== null)
      },
      rheostat: {
        type: 'Wire-wound Sliding Rheostat',
        resistanceOhms: rheoR,
        resistanceFormatted: `${rheoR.toFixed(1)} Ω`,
        minimumOhms: this.config.rheostatMinimumResistance ?? 0.5,
        maximumOhms: this.config.rheostatMaximumResistance ?? 20.0,
        hasAdjusted: this.simulation
          ? Boolean(this.simulation.hasAdjustedRheostat)
          : (simState ? Boolean(simState.hasAdjustedRheostat) : false),
        isLive: isSimAvailable
      },
      circuit: {
        keyClosed: keyClosed,
        keyStatus: keyClosed ? 'CLOSED' : 'OPEN',
        isComplete: circuitStatus.isFullyValid,
        completionStatus: circuitStatus.hasShortCircuit
          ? 'SHORT_CIRCUIT'
          : circuitStatus.errorCount > 0
            ? 'HAS_ERRORS'
            : circuitStatus.isFullyValid
              ? 'COMPLETE'
              : 'INCOMPLETE',
        totalResistanceOhms: totalR,
        totalResistanceFormatted: (totalR !== null) ? `${totalR.toFixed(2)} Ω` : 'UNAVAILABLE',
        currentAmperes: currentA,
        currentFormatted: (currentA !== null) ? `${currentA.toFixed(2)} A` : 'UNAVAILABLE',
        isLiveMeasurement: (currentA !== null),
        isOverRange: simState ? Boolean(simState.isOverRange) : false,
        safeCurrentLimitAmperes: this.config.safeCurrentLimit ?? 0.50,
        wireCount: circuitStatus.totalConnected,
        requiredWireCount: circuitStatus.requiredTotalCount,
        activeConnections: circuitStatus.activeConnections,
        missingConnections: circuitStatus.missingConnections
      },
      instruments,
      observations: {
        count: formattedReadings.length,
        targetCount: this.config.minReadingsForVerification ?? 5,
        maxCount: this.config.maxReadings ?? 6,
        isVerified: stats ? Boolean(stats.isVerified) : false,
        meanResistanceOhms: meanR,
        meanResistanceFormatted: (meanR !== null) ? `${meanR.toFixed(2)} Ω` : '—',
        readings: formattedReadings
      },
      detectedMistakes: mistakes,
      practicalProgress: progress,
      interaction: {
        selectedTerminal: this.selectedTerminal,
        selectedTerminalName: this.selectedTerminal ? getTerminalDisplayName(this.selectedTerminal) : null,
        lastAction: this.lastStudentAction,
        lastActionAgeSeconds: Math.round((Date.now() - this.lastStudentActionTime) / 1000)
      }
    };
  }

  /**
   * Direct circuit status using deterministic CircuitValidator as authoritative source.
   */
  getCircuitStatus() {
    if (!this.circuitState) {
      return {
        isFullyValid: false,
        seriesPathComplete: false,
        voltmeterParallelComplete: false,
        hasShortCircuit: false,
        errorCount: 0,
        warningCount: 0,
        totalConnected: 0,
        requiredSatisfiedCount: 0,
        requiredTotalCount: REQUIRED_CONNECTIONS.length,
        missingConnections: [...REQUIRED_CONNECTIONS],
        activeConnections: [],
        feedbackMessage: 'Circuit state unavailable.'
      };
    }

    try {
      const fullVal = CircuitValidator.validateFullCircuit(this.circuitState);
      const activeConns = this.circuitState.connections.map((c) => ({
        id: c.id,
        from: c.from,
        to: c.to,
        fromName: getTerminalDisplayName(c.from),
        toName: getTerminalDisplayName(c.to),
        status: c.status,
        role: c.role,
        message: c.message
      }));

      const missingConns = (fullVal.missingConnections ?? []).map((m) => ({
        id: m.id,
        from: m.from,
        to: m.to,
        name: m.name,
        role: m.role,
        description: m.description
      }));

      return {
        isFullyValid: fullVal.isFullyValid,
        seriesPathComplete: fullVal.seriesPathComplete,
        voltmeterParallelComplete: fullVal.voltmeterParallelComplete,
        hasShortCircuit: fullVal.hasShortCircuit,
        errorCount: fullVal.errorCount,
        warningCount: fullVal.warningCount,
        totalConnected: fullVal.totalConnected,
        requiredSatisfiedCount: fullVal.requiredSatisfiedCount,
        requiredTotalCount: fullVal.requiredTotalCount,
        missingConnections: missingConns,
        activeConnections: activeConns,
        feedbackMessage: fullVal.feedbackMessage,
        instruments: fullVal.instruments ?? CircuitValidator.validateInstruments(this.circuitState)
      };
    } catch (err) {
      console.error('[SimulationStateBridge] Circuit validation error:', err);
      return {
        isFullyValid: false,
        seriesPathComplete: false,
        voltmeterParallelComplete: false,
        hasShortCircuit: false,
        errorCount: 1,
        warningCount: 0,
        totalConnected: 0,
        requiredSatisfiedCount: 0,
        requiredTotalCount: REQUIRED_CONNECTIONS.length,
        missingConnections: [],
        activeConnections: [],
        feedbackMessage: 'Validation exception occurred.',
        instruments: CircuitValidator.validateInstruments(null)
      };
    }
  }

  /**
   * Deterministically collects all circuit errors, warnings, and procedure mistakes.
   */
  getDetectedMistakes() {
    const mistakes = [];

    // 1. Inspect active wire mistakes from CircuitState
    if (this.circuitState && Array.isArray(this.circuitState.connections)) {
      this.circuitState.connections.forEach((conn) => {
        if (conn.status === 'error' || conn.status === 'warning') {
          let recoveryHint = 'Remove this wire and connect it according to the textbook schematic.';
          if (conn.role === 'short_circuit') {
            recoveryHint = 'Disconnect the direct wire between Battery (+) and Battery (-). Current must pass through the load.';
          } else if (conn.role === 'voltmeter_in_series') {
            recoveryHint = 'Remove the voltmeter from the series loop. Connect the voltmeter in PARALLEL across the resistor.';
          } else if (conn.role === 'ammeter_short') {
            recoveryHint = 'Remove the ammeter from across the battery. Connect the ammeter in SERIES with the circuit loop.';
          } else if (conn.role === 'reversed_polarity') {
            recoveryHint = 'Swap the voltmeter leads: connect (+) to the high potential side (resistor left) and (-) to the low potential side (resistor right).';
          }

          mistakes.push({
            id: `mistake_wire_${conn.id}`,
            code: conn.role ? `ERR_${conn.role.toUpperCase()}` : 'ERR_CIRCUIT_WIRE',
            severity: conn.status === 'error' ? 'error' : 'warning',
            category: 'circuit_topology',
            terminals: [conn.from, conn.to],
            terminalNames: [getTerminalDisplayName(conn.from), getTerminalDisplayName(conn.to)],
            description: conn.message ?? 'Incorrect wire connection.',
            recoveryHint
          });
        }
      });
    }

    // 2. Inspect procedure mistakes from simulation
    if (this.simulation) {
      const state = this.simulation.getState();

      // Procedure Mistake: Key left open while practical is in progress
      if (state.circuitReady && !state.keyClosed && state.workflowStep >= 3 && state.readings.length === 0) {
        mistakes.push({
          id: 'mistake_key_open',
          code: 'WARN_KEY_OPEN',
          severity: 'warning',
          category: 'procedure',
          terminals: ['switch_left', 'switch_right'],
          terminalNames: ['Plug Key Left', 'Plug Key Right'],
          description: 'Circuit is complete, but the plug key is open. Current cannot flow until the key is closed.',
          recoveryHint: 'Close the plug key (or press the green START PRACTICAL button on the table) to start current flow.'
        });
      }

      // Procedure Mistake: Over-range current limit exceeded
      if (state.isOverRange) {
        const limitStr = (this.config.safeCurrentLimit ?? 0.50).toFixed(2);
        mistakes.push({
          id: 'mistake_over_range',
          code: 'WARN_CURRENT_OVER_RANGE',
          severity: 'warning',
          category: 'safety',
          terminals: ['rheostat_in', 'rheostat_out'],
          terminalNames: ['Rheostat Slider', 'Rheostat Base'],
          description: `Electric current (${state.current.toFixed(2)} A) has exceeded the safe limit (${limitStr} A). Excessive current will heat the resistor coil.`,
          recoveryHint: 'Slide the rheostat to increase resistance and reduce current to a safe level.'
        });
      }

      // Procedure Mistake: Duplicate reading without moving rheostat
      const minVerify = this.config.minReadingsForVerification ?? 5;
      if (state.keyClosed && state.readings.length > 0 && state.readings.length < minVerify) {
        const lastReading = state.readings[state.readings.length - 1];
        if (lastReading) {
          const dCurrent = Math.abs(lastReading.current - state.current);
          const dRheo = Math.abs(lastReading.rheostatResistance - state.rheostatResistance);
          if (dCurrent < 0.015 && dRheo < 0.4) {
            mistakes.push({
              id: 'mistake_duplicate_rheostat',
              code: 'WARN_DUPLICATE_READING',
              severity: 'warning',
              category: 'observation',
              terminals: ['rheostat_in'],
              terminalNames: ['Rheostat Slider'],
              description: 'The rheostat has not been adjusted since the last recorded reading. Recording now would produce a duplicate data point.',
              recoveryHint: 'Slide the rheostat to a different position to vary the current before recording the next observation.'
            });
          }
        }
      }
    }

    return mistakes;
  }

  /**
   * Returns practical progress percentage, blockers, and milestone checks.
   * STRICT: 100% is awarded ONLY when actual Ohm's Law verification criteria are satisfied.
   */
  getPracticalProgress() {
    const simState = (this.simulation && typeof this.simulation.getState === 'function')
      ? this.simulation.getState()
      : null;

    const circuitStatus = this.getCircuitStatus();
    const mistakes = this.getDetectedMistakes();
    const errorCount = mistakes.filter((m) => m.severity === 'error').length;

    const step = simState ? simState.workflowStep : 1;
    const readingCount = simState ? simState.readingCount : 0;
    const minReadings = this.config.minReadingsForVerification ?? 5;
    const stats = simState?.statistics ?? null;
    const isVerified = Boolean(stats?.isVerified);

    // Calculate progression percentage with strict verification gate
    let percent = 0;
    if (circuitStatus.hasShortCircuit) {
      // Critical short-circuit danger halts progress entirely
      percent = 0;
    } else if (circuitStatus.errorCount > 0) {
      // Circuit has topological wiring errors: cap at 20%
      percent = Math.min(20, Math.round((circuitStatus.requiredSatisfiedCount / circuitStatus.requiredTotalCount) * 20));
    } else if (!circuitStatus.isFullyValid) {
      // Wiring phase in progress (no errors): 0 to 35%
      percent = Math.round((circuitStatus.requiredSatisfiedCount / circuitStatus.requiredTotalCount) * 35);
    } else {
      // Circuit valid
      if (simState && simState.keyClosed) {
        // Range 45% to 90% as observations 1..5 are recorded
        const readingProgress = Math.min(1.0, readingCount / minReadings);
        percent = 45 + Math.round(readingProgress * 45);

        // Strict 100% criteria: Must have >= minReadings AND statistical verification verified
        if (readingCount >= minReadings && isVerified) {
          percent = 100;
        } else if (percent >= 100 && !isVerified) {
          // If 5 readings recorded but verification slope criteria not met, cap at 90%
          percent = 90;
        }
      } else {
        percent = 40; // Circuit complete, ready to close plug key
      }
    }

    // Determine current blockers
    const blockers = [];
    if (circuitStatus.hasShortCircuit) {
      blockers.push('Critical short circuit present. Remove direct battery wire.');
    } else if (errorCount > 0) {
      blockers.push('Resolve circuit wiring errors before proceeding.');
    } else if (!circuitStatus.isFullyValid) {
      const remaining = circuitStatus.requiredTotalCount - circuitStatus.requiredSatisfiedCount;
      blockers.push(`Assemble ${remaining} remaining circuit wire(s).`);
    } else if (simState && !simState.keyClosed) {
      blockers.push('Plug key is open. Close key to start current flow.');
    } else if (simState && simState.isOverRange) {
      blockers.push('Current exceeds safe threshold. Increase rheostat resistance.');
    } else if (readingCount < minReadings) {
      blockers.push(`Record ${minReadings - readingCount} more observation reading(s) across distinct rheostat settings.`);
    } else if (!isVerified) {
      blockers.push('Observations do not satisfy Ohm’s Law proportionality. Vary rheostat across wider range.');
    }

    const canRecord = Boolean(
      circuitStatus.isFullyValid &&
      simState &&
      simState.keyClosed &&
      simState.current > 0.001 &&
      readingCount < (this.config.maxReadings ?? 6) &&
      !mistakes.some((m) => m.code === 'WARN_DUPLICATE_READING')
    );

    return {
      stepIndex: this.workflowManager ? (this.workflowManager.getStageIndex() + 1) : step,
      stageId: this.workflowManager ? this.workflowManager.getCurrentStage() : null,
      percentComplete: Math.min(100, Math.max(0, percent)),
      wiresComplete: `${circuitStatus.requiredSatisfiedCount} / ${circuitStatus.requiredTotalCount}`,
      readingsComplete: `${readingCount} / ${minReadings}`,
      isVerified: isVerified,
      canRecordReading: canRecord,
      blockers
    };
  }

  /**
   * Returns a structured prompt context optimized for LLM token efficiency and tutor awareness.
   * Guarantees zero fallback values masquerading as live measurements.
   */
  getAIContext() {
    const state = this.getCurrentState();

    const isSimAvailable = state.validity.isSimulationAvailable;
    const isCircuitAvailable = state.validity.isCircuitAvailable;
    const hasLiveMeasurements = state.validity.hasLiveMeasurements;
    const isCircuitComplete = state.circuit.isComplete;
    const isSwitchClosed = state.circuit.keyClosed;
    const isOhmLawVerified = state.observations.isVerified;
    const areReadingsValid = Boolean(
      isSimAvailable &&
      state.observations.count > 0 &&
      !state.validity.isOverRange &&
      state.observations.readings.every(
        (r) => typeof r.voltageVolts === 'number' && typeof r.currentAmperes === 'number' && r.currentAmperes > 0
      )
    );

    const mistakesFormatted = state.detectedMistakes.map((m) => ({
      code: m.code,
      severity: m.severity,
      category: m.category,
      description: m.description,
      recoveryHint: m.recoveryHint,
      terminals: m.terminalNames
    }));

    const observationsData = state.observations.readings.map((r) => ({
      readingNo: r.readingNo,
      voltageVolts: r.voltageVolts,
      voltageFormatted: r.voltageFormatted,
      currentAmperes: r.currentAmperes,
      currentFormatted: r.currentFormatted,
      resistanceRatioOhms: r.resistanceRatioOhms,
      resistanceRatioFormatted: r.resistanceRatioFormatted,
      rheostatResistanceOhms: r.rheostatResistanceOhms
    }));

    const readingsBrief = state.observations.readings.map(
      (r) => `#${r.readingNo}: V=${r.voltageFormatted}, I=${r.currentFormatted}, V/I=${r.resistanceRatioFormatted}`
    );

    // Live measurements: strictly null / 'UNAVAILABLE' if offline or switch open
    const liveMeasurements = hasLiveMeasurements
      ? {
          currentAmperes: state.circuit.currentAmperes,
          currentFormatted: state.circuit.currentFormatted,
          resistorVoltageVolts: state.resistor.measuredVoltageVolts,
          resistorVoltageFormatted: state.resistor.measuredVoltageFormatted,
          totalResistanceOhms: state.circuit.totalResistanceOhms,
          totalResistanceFormatted: state.circuit.totalResistanceFormatted,
          rheostatResistanceOhms: state.rheostat.resistanceOhms,
          rheostatResistanceFormatted: state.rheostat.resistanceFormatted
        }
      : {
          currentAmperes: null,
          currentFormatted: 'UNAVAILABLE',
          resistorVoltageVolts: null,
          resistorVoltageFormatted: 'UNAVAILABLE',
          totalResistanceOhms: null,
          totalResistanceFormatted: 'UNAVAILABLE',
          rheostatResistanceOhms: isSimAvailable ? state.rheostat.resistanceOhms : null,
          rheostatResistanceFormatted: isSimAvailable ? state.rheostat.resistanceFormatted : 'UNAVAILABLE'
        };

    return {
      practical: state.practical,
      aim: 'Verify Ohm’s Law (V = I * R) and determine the unknown resistance of a standard resistor coil.',
      stage: {
        step: state.workflowStage.step,
        label: state.workflowStage.label,
        description: state.workflowStage.desc
      },
      validity: {
        isSimulationAvailable: isSimAvailable,
        isCircuitAvailable: isCircuitAvailable,
        hasLiveMeasurements: hasLiveMeasurements,
        areReadingsValid: areReadingsValid,
        isCircuitComplete: isCircuitComplete,
        isSwitchClosed: isSwitchClosed,
        switchStatus: state.circuit.keyStatus,
        isOhmLawVerified: isOhmLawVerified
      },
      circuitOverview: `Status: ${state.circuit.completionStatus} (${state.circuit.wireCount}/${state.circuit.requiredWireCount} wires). Switch: ${state.circuit.keyStatus}.`,
      circuit: {
        completionStatus: state.circuit.completionStatus,
        isComplete: isCircuitComplete,
        wireCount: state.circuit.wireCount,
        requiredWireCount: state.circuit.requiredWireCount,
        switchClosed: isSwitchClosed,
        switchStatus: state.circuit.keyStatus
      },
      instruments: {
        ammeter: {
          status: state.instruments.ammeter.status,
          inSeries: state.instruments.ammeter.inSeries,
          isCorrect: state.instruments.ammeter.isCorrect,
          readingFormatted: state.instruments.ammeter.readingFormatted,
          isLive: state.instruments.ammeter.isLive
        },
        voltmeter: {
          status: state.instruments.voltmeter.status,
          inParallel: state.instruments.voltmeter.inParallel,
          isCorrect: state.instruments.voltmeter.isCorrect,
          readingFormatted: state.instruments.voltmeter.readingFormatted,
          isLive: state.instruments.voltmeter.isLive
        }
      },
      liveReadings: {
        supplyVoltage: state.powerSupply.voltageFormatted,
        fixedResistor: state.resistor.fixedResistanceFormatted,
        rheostat: liveMeasurements.rheostatResistanceFormatted,
        totalResistance: liveMeasurements.totalResistanceFormatted,
        current: liveMeasurements.currentFormatted,
        resistorVoltage: liveMeasurements.resistorVoltageFormatted
      },
      liveMeasurements,
      observations: {
        count: state.observations.count,
        targetCount: state.observations.targetCount,
        isVerified: isOhmLawVerified,
        areReadingsValid: areReadingsValid,
        meanResistanceOhms: state.observations.meanResistanceOhms,
        meanResistanceFormatted: state.observations.meanResistanceFormatted,
        readingsBrief: readingsBrief,
        readings: observationsData
      },
      activeMistakes: mistakesFormatted,
      studentAction: state.interaction.lastAction,
      practicalProgress: {
        percentComplete: state.practicalProgress.percentComplete,
        wiresComplete: state.practicalProgress.wiresComplete,
        readingsComplete: state.practicalProgress.readingsComplete,
        canRecordReading: state.practicalProgress.canRecordReading,
        blockers: state.practicalProgress.blockers
      }
    };
  }

  // ─── 3. Internal Instrument State Helper ──────────────────────────────────

  /**
   * Evaluates instrument connection status directly consuming CircuitValidator's authoritative results.
   * Completely eliminates duplicate terminal checking.
   */
  _getInstrumentsState(simState) {
    const instVal = this.circuitState
      ? CircuitValidator.validateInstruments(this.circuitState)
      : {
          ammeter: { status: 'DISCONNECTED', inSeries: false, hasShortError: false, isCorrect: false },
          voltmeter: { status: 'DISCONNECTED', inParallel: false, inSeriesWarning: false, reversedPolarity: false, isCorrect: false }
        };

    const currentA = (simState && simState.current !== null && simState.current !== undefined) ? simState.current : null;
    const resistorV = (simState && simState.resistorVoltage !== null && simState.resistorVoltage !== undefined) ? simState.resistorVoltage : null;

    return {
      ammeter: {
        name: 'DC Series Ammeter',
        status: instVal.ammeter.status,
        inSeries: instVal.ammeter.inSeries,
        hasShortError: instVal.ammeter.hasShortError,
        isCorrect: instVal.ammeter.isCorrect,
        readingAmperes: currentA,
        readingFormatted: (currentA !== null) ? `${currentA.toFixed(2)} A` : 'UNAVAILABLE',
        fullScale: '0–0.60 A',
        isLive: (currentA !== null)
      },
      voltmeter: {
        name: 'DC Parallel Voltmeter',
        status: instVal.voltmeter.status,
        inParallel: instVal.voltmeter.inParallel,
        inSeriesWarning: instVal.voltmeter.inSeriesWarning,
        reversedPolarity: instVal.voltmeter.reversedPolarity,
        isCorrect: instVal.voltmeter.isCorrect,
        readingVolts: resistorV,
        readingFormatted: (resistorV !== null) ? `${resistorV.toFixed(2)} V` : 'UNAVAILABLE',
        fullScale: '0–6.00 V',
        isLive: (resistorV !== null)
      }
    };
  }

  /**
   * Cleanup subscriptions and restore wrapped callbacks.
   */
  destroy() {
    // 1. Remove all underlying subscriptions
    this._unsubscribers.forEach((unsub) => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (e) {}
    });
    this._unsubscribers = [];

    // 2. Restore original interactionController.onSelectionChanged ONLY if our wrapper is still installed
    if (this.interactionController && this.interactionController.onSelectionChanged === this._installedSelectionWrapper) {
      this.interactionController.onSelectionChanged = this._originalOnSelectionChanged;
    }
    this._originalOnSelectionChanged = null;
    this._installedSelectionWrapper = null;

    // 3. Clear our external subscribers
    this.subscribers.clear();
  }
}
