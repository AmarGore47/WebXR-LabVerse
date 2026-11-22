/**
 * ohmsLawWorkflowManager.js
 * End-to-End Practical Workflow Manager for LabVerse WebXR Ohm's Law Practical.
 *
 * Implements the 11-stage Maharashtra SSC Class 10 practical sequence:
 * 1.  NOT_STARTED               — Initialization & Welcome
 * 2.  INTRODUCTION              — Practical Aim, Learning Objectives & Safety
 * 3.  APPARATUS_IDENTIFICATION  — Component Inspection (Battery, Resistor, Rheostat, Key, Ammeter, Voltmeter)
 * 4.  CIRCUIT_ASSEMBLY          — Wire Connection (7 circuit connections)
 * 5.  CIRCUIT_VALIDATION        — Verification of Polarity, Series Ammeter & Parallel Voltmeter
 * 6.  EXPERIMENT_RUNNING        — Switch Closing & Current Flow Establishment
 * 7.  OBSERVATION_RECORDING     — 5 V–I Readings across Distinct Rheostat Settings
 * 8.  GRAPH_ANALYSIS            — V–I Linearity Plot & Slope Calculation (R = ΔV / ΔI)
 * 9.  RESULT_VERIFICATION       — Numerical & Tolerance Verification against Nominal Value
 * 10. STUDENT_ASSESSMENT        — Conceptual Socratic Assessment Questions
 * 11. COMPLETED                 — Completion Certificate & Performance Summary
 *
 * Enforces strict prerequisite gates:
 * - Cannot run experiment without a topologically valid circuit and closed key.
 * - Cannot analyze graph without >= 5 distinct readings.
 * - Cannot complete practical without satisfying assessment.
 */

import { CircuitValidator } from '../../circuit/circuitValidator.js';
import { OHMS_LAW_CONFIG } from './ohmsLawConfig.js';

export const WORKFLOW_STAGES = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  INTRODUCTION: 'INTRODUCTION',
  APPARATUS_IDENTIFICATION: 'APPARATUS_IDENTIFICATION',
  CIRCUIT_ASSEMBLY: 'CIRCUIT_ASSEMBLY',
  CIRCUIT_VALIDATION: 'CIRCUIT_VALIDATION',
  EXPERIMENT_RUNNING: 'EXPERIMENT_RUNNING',
  OBSERVATION_RECORDING: 'OBSERVATION_RECORDING',
  GRAPH_ANALYSIS: 'GRAPH_ANALYSIS',
  RESULT_VERIFICATION: 'RESULT_VERIFICATION',
  STUDENT_ASSESSMENT: 'STUDENT_ASSESSMENT',
  COMPLETED: 'COMPLETED'
});

export const STAGE_ORDER = Object.freeze([
  WORKFLOW_STAGES.NOT_STARTED,
  WORKFLOW_STAGES.INTRODUCTION,
  WORKFLOW_STAGES.APPARATUS_IDENTIFICATION,
  WORKFLOW_STAGES.CIRCUIT_ASSEMBLY,
  WORKFLOW_STAGES.CIRCUIT_VALIDATION,
  WORKFLOW_STAGES.EXPERIMENT_RUNNING,
  WORKFLOW_STAGES.OBSERVATION_RECORDING,
  WORKFLOW_STAGES.GRAPH_ANALYSIS,
  WORKFLOW_STAGES.RESULT_VERIFICATION,
  WORKFLOW_STAGES.STUDENT_ASSESSMENT,
  WORKFLOW_STAGES.COMPLETED
]);

export const STAGE_METADATA = Object.freeze({
  NOT_STARTED: {
    step: 1,
    id: 'NOT_STARTED',
    label: 'Not Started',
    title: 'Verification of Ohm’s Law',
    description: 'Welcome to the Maharashtra SSC Class 10 Physics Laboratory.',
    prerequisites: 'Initiate the practical to begin.'
  },
  INTRODUCTION: {
    step: 2,
    id: 'INTRODUCTION',
    label: 'Introduction & Aim',
    title: 'Aim and Learning Objectives',
    description: 'Understand the aim: V = I * R, circuit schematic, and apparatus functions.',
    prerequisites: 'Review aim and safety precautions.'
  },
  APPARATUS_IDENTIFICATION: {
    step: 3,
    id: 'APPARATUS_IDENTIFICATION',
    label: 'Apparatus Identification',
    title: 'Inspect & Identify Apparatus',
    description: 'Identify all 6 instruments: Battery, Key, Rheostat, Ammeter, Voltmeter, and Resistor coil.',
    prerequisites: 'Inspect and confirm all apparatus components.'
  },
  CIRCUIT_ASSEMBLY: {
    step: 4,
    id: 'CIRCUIT_ASSEMBLY',
    label: 'Circuit Assembly',
    title: 'Assemble Circuit Wiring',
    description: 'Connect all 7 wire connections between apparatus terminals according to the circuit diagram.',
    prerequisites: 'Connect all 7 circuit wires.'
  },
  CIRCUIT_VALIDATION: {
    step: 5,
    id: 'CIRCUIT_VALIDATION',
    label: 'Circuit Validation',
    title: 'Validate Circuit Configuration',
    description: 'Verify ammeter is in series, voltmeter is in parallel across resistor, and polarity is correct.',
    prerequisites: 'Circuit must be complete with zero short circuits or topological errors.'
  },
  EXPERIMENT_RUNNING: {
    step: 6,
    id: 'EXPERIMENT_RUNNING',
    label: 'Experiment Running',
    title: 'Close Key & Verify Current Flow',
    description: 'Insert the plug key to establish electric current flow and observe needle deflections.',
    prerequisites: 'Circuit must be verified and plug key closed.'
  },
  OBSERVATION_RECORDING: {
    step: 7,
    id: 'OBSERVATION_RECORDING',
    label: 'Observation Recording',
    title: 'Record 5 Distinct V–I Observations',
    description: 'Adjust rheostat across 5 distinct settings and record Voltage and Current pairs.',
    prerequisites: 'Record at least 5 distinct readings across varied rheostat settings.'
  },
  GRAPH_ANALYSIS: {
    step: 8,
    id: 'GRAPH_ANALYSIS',
    label: 'Graph Analysis',
    title: 'Plot & Analyze V–I Graph',
    description: 'Plot Potential Difference (V) vs Current (I) and calculate linear slope R = ΔV / ΔI.',
    prerequisites: 'At least 5 readings recorded and slope calculated.'
  },
  RESULT_VERIFICATION: {
    step: 9,
    id: 'RESULT_VERIFICATION',
    label: 'Result Verification',
    title: 'Verify Resistance Value',
    description: 'Compare the experimental resistance from graph slope against nominal resistance within tolerance.',
    prerequisites: 'Experimental resistance verified within acceptable tolerance.'
  },
  STUDENT_ASSESSMENT: {
    step: 10,
    id: 'STUDENT_ASSESSMENT',
    label: 'Student Assessment',
    title: 'Conceptual Assessment',
    description: 'Answer Socratic conceptual questions on Ohm’s Law, meter design, and resistance factors.',
    prerequisites: 'Answer all assessment questions.'
  },
  COMPLETED: {
    step: 11,
    id: 'COMPLETED',
    label: 'Practical Completed',
    title: 'Practical Completed Successfully',
    description: 'Congratulations! You have completed the Ohm’s Law practical in accordance with the Maharashtra SSC Board curriculum.',
    prerequisites: 'None.'
  }
});

export const REQUIRED_APPARATUS = Object.freeze([
  'battery',
  'plug_key',
  'rheostat',
  'ammeter',
  'voltmeter',
  'resistor'
]);

export const DEFAULT_ASSESSMENT_QUESTIONS = Object.freeze([
  {
    id: 'q1',
    question: 'Why must an ammeter always be connected in series with the circuit?',
    options: [
      'Because it has very low internal resistance so it measures total current without reducing it.',
      'Because it has very high internal resistance and prevents short circuits.',
      'Because voltage is constant across components connected in series.',
      'Because ammeter requires high voltage to operate its needle mechanism.'
    ],
    correctAnswerIndex: 0,
    explanation: 'An ideal ammeter has near zero internal resistance. Connecting it in series ensures the entire circuit current passes through it without significantly altering the circuit total resistance.'
  },
  {
    id: 'q2',
    question: 'What physical quantity is represented by the slope of a Voltage (V) vs Current (I) graph?',
    options: [
      'Resistance (R = ΔV / ΔI)',
      'Conductance (G = ΔI / ΔV)',
      'Electric Power (P = V * I)',
      'Electric Charge (Q = I * t)'
    ],
    correctAnswerIndex: 0,
    explanation: 'According to Ohm’s Law V = I * R, the ratio ΔV / ΔI represents the electrical resistance (R) of the conductor.'
  },
  {
    id: 'q3',
    question: 'If the length of a uniform conducting wire is doubled while keeping temperature and material constant, what happens to its resistance?',
    options: [
      'Resistance is doubled (R ∝ l)',
      'Resistance is halved (R ∝ 1/l)',
      'Resistance remains unchanged',
      'Resistance becomes four times larger'
    ],
    correctAnswerIndex: 0,
    explanation: 'Resistance is directly proportional to length (R = ρ * l / A). Doubling length doubles the resistance.'
  },
  {
    id: 'q4',
    question: 'In this practical, what does the straight-line graph passing through the origin indicate?',
    options: [
      'Current is directly proportional to potential difference (I ∝ V), confirming Ohm’s Law.',
      'The resistor value changes with varying voltage.',
      'The power supply has internal resistance.',
      'The circuit contains a non-ohmic device.'
    ],
    correctAnswerIndex: 0,
    explanation: 'A straight line through the origin on a V–I graph proves constant proportionality (V/I = constant), verifying Ohm’s Law for ohmic conductors.'
  }
]);

export class OhmsLawWorkflowManager {
  constructor(options = {}) {
    this.simulation = options.simulation ?? null;
    this.circuitState = options.circuitState ?? null;
    this.config = options.config ?? (this.simulation ? this.simulation.config : OHMS_LAW_CONFIG) ?? OHMS_LAW_CONFIG;

    this.currentStage = options.initialStage ?? WORKFLOW_STAGES.NOT_STARTED;
    this.identifiedApparatus = new Set();
    this.assessmentAnswers = new Map();
    this.assessmentQuestions = options.assessmentQuestions ?? DEFAULT_ASSESSMENT_QUESTIONS;

    this.startTime = Date.now();
    this.completionTime = null;
    this.listeners = [];
  }

  // ─── Stage Queries ────────────────────────────────────────────────────────

  getCurrentStage() {
    return this.currentStage;
  }

  getCurrentStageInfo() {
    return STAGE_METADATA[this.currentStage] ?? STAGE_METADATA.NOT_STARTED;
  }

  getStageIndex(stage = this.currentStage) {
    return STAGE_ORDER.indexOf(stage);
  }

  // ─── Apparatus Identification ─────────────────────────────────────────────

  identifyApparatus(apparatusId) {
    const id = apparatusId?.toLowerCase()?.trim();
    if (REQUIRED_APPARATUS.includes(id)) {
      this.identifiedApparatus.add(id);
      this._notifyChange({ type: 'apparatus_identified', apparatusId: id });
      return true;
    }
    return false;
  }

  identifyAllApparatus() {
    REQUIRED_APPARATUS.forEach((id) => this.identifiedApparatus.add(id));
    this._notifyChange({ type: 'all_apparatus_identified' });
  }

  getIdentifiedApparatus() {
    return Array.from(this.identifiedApparatus);
  }

  areAllApparatusIdentified() {
    return REQUIRED_APPARATUS.every((id) => this.identifiedApparatus.has(id));
  }

  // ─── Prerequisite Validation ──────────────────────────────────────────────

  canAdvanceTo(targetStage) {
    const targetIdx = STAGE_ORDER.indexOf(targetStage);
    const currentIdx = STAGE_ORDER.indexOf(this.currentStage);

    if (targetIdx < 0) {
      return { allowed: false, reason: `Unknown target stage: ${targetStage}` };
    }

    // Resetting or going backwards is always allowed
    if (targetIdx <= currentIdx) {
      return { allowed: true };
    }

    // Step-by-step prerequisite verification
    switch (targetStage) {
      case WORKFLOW_STAGES.INTRODUCTION:
        return { allowed: true };

      case WORKFLOW_STAGES.APPARATUS_IDENTIFICATION:
        return { allowed: true };

      case WORKFLOW_STAGES.CIRCUIT_ASSEMBLY:
        if (!this.areAllApparatusIdentified()) {
          const missing = REQUIRED_APPARATUS.filter((id) => !this.identifiedApparatus.has(id));
          return {
            allowed: false,
            reason: 'All apparatus components must be identified first.',
            blocker: `Missing apparatus identification: ${missing.join(', ')}`
          };
        }
        return { allowed: true };

      case WORKFLOW_STAGES.CIRCUIT_VALIDATION: {
        const wireCount = this.circuitState?.connections?.length ?? 0;
        if (wireCount < 7) {
          return {
            allowed: false,
            reason: 'All 7 circuit wire connections must be assembled before validation.',
            blocker: `Only ${wireCount}/7 wires connected.`
          };
        }
        return { allowed: true };
      }

      case WORKFLOW_STAGES.EXPERIMENT_RUNNING: {
        const validation = this.circuitState ? CircuitValidator.validateFullCircuit(this.circuitState) : null;
        if (validation && (validation.hasShortCircuit || validation.hasErrors || validation.errorCount > 0)) {
          return {
            allowed: false,
            reason: 'Circuit wiring contains topological errors or short circuits.',
            blocker: validation.hasShortCircuit ? 'Short circuit danger.' : 'Resolve circuit errors.'
          };
        }
        if (!validation || !validation.isFullyValid) {
          return {
            allowed: false,
            reason: 'Circuit is incomplete. Connect all 7 required wires.',
            blocker: 'Circuit incomplete.'
          };
        }
        const keyClosed = this.simulation ? Boolean(this.simulation.isKeyClosed?.() ?? this.simulation.getState?.().keyClosed) : false;
        if (!keyClosed) {
          return {
            allowed: false,
            reason: 'The plug key must be inserted (closed) to run the experiment.',
            blocker: 'Plug key is open.'
          };
        }
        return { allowed: true };
      }

      case WORKFLOW_STAGES.OBSERVATION_RECORDING: {
        const simState = this.simulation?.getState?.() ?? null;
        if (!simState || !simState.keyClosed) {
          return {
            allowed: false,
            reason: 'Plug key must be closed to start recording observations.',
            blocker: 'Plug key open.'
          };
        }
        const current = simState.current ?? 0;
        if (current <= 0) {
          return {
            allowed: false,
            reason: 'No electric current is flowing through the circuit.',
            blocker: 'Current is 0.00 A.'
          };
        }
        return { allowed: true };
      }

      case WORKFLOW_STAGES.GRAPH_ANALYSIS: {
        const readingCount = this.simulation?.getState?.()?.readingCount ?? 0;
        const minReadings = this.config.minReadingsForVerification ?? 5;
        if (readingCount < minReadings) {
          return {
            allowed: false,
            reason: `At least ${minReadings} distinct readings are required to plot and analyze the V–I graph.`,
            blocker: `Only recorded ${readingCount}/${minReadings} observations.`
          };
        }
        return { allowed: true };
      }

      case WORKFLOW_STAGES.RESULT_VERIFICATION: {
        const simState = this.simulation?.getState?.() ?? null;
        const stats = simState?.statistics ?? null;
        const readingCount = simState?.readingCount ?? 0;
        const minReadings = this.config.minReadingsForVerification ?? 5;

        if (readingCount < minReadings) {
          return {
            allowed: false,
            reason: `Need at least ${minReadings} readings before result verification.`,
            blocker: `Readings: ${readingCount}/${minReadings}`
          };
        }
        if (!stats || !stats.isVerified) {
          return {
            allowed: false,
            reason: 'Observation readings do not satisfy Ohm’s Law linear verification criteria.',
            blocker: stats?.reason ?? 'V–I readings do not exhibit linear proportionality.'
          };
        }
        return { allowed: true };
      }

      case WORKFLOW_STAGES.STUDENT_ASSESSMENT: {
        const simState = this.simulation?.getState?.() ?? null;
        const isVerified = Boolean(simState?.statistics?.isVerified);
        if (!isVerified) {
          return {
            allowed: false,
            reason: 'Practical results must be verified before proceeding to student assessment.',
            blocker: 'Ohm’s Law not verified.'
          };
        }
        return { allowed: true };
      }

      case WORKFLOW_STAGES.COMPLETED: {
        const assessment = this.getAssessmentScore();
        if (!assessment.completed) {
          return {
            allowed: false,
            reason: 'All assessment questions must be answered before practical completion.',
            blocker: `Answered ${assessment.answered}/${assessment.total} assessment questions.`
          };
        }
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  }

  // ─── Stage Transitions ───────────────────────────────────────────────────

  advance() {
    const currentIdx = STAGE_ORDER.indexOf(this.currentStage);
    if (currentIdx >= STAGE_ORDER.length - 1) {
      return { success: false, error: 'Already at final stage.', currentStage: this.currentStage };
    }
    const nextStage = STAGE_ORDER[currentIdx + 1];
    return this.goToStage(nextStage);
  }

  goToStage(targetStage) {
    const check = this.canAdvanceTo(targetStage);
    if (!check.allowed) {
      return {
        success: false,
        previousStage: this.currentStage,
        currentStage: this.currentStage,
        reason: check.reason,
        blocker: check.blocker
      };
    }

    const prevStage = this.currentStage;
    this.currentStage = targetStage;

    if (targetStage === WORKFLOW_STAGES.COMPLETED && !this.completionTime) {
      this.completionTime = Date.now();
    }

    this._notifyChange({
      type: 'stage_changed',
      previousStage: prevStage,
      currentStage: targetStage,
      info: this.getCurrentStageInfo()
    });

    return {
      success: true,
      previousStage: prevStage,
      currentStage: targetStage,
      info: this.getCurrentStageInfo()
    };
  }

  forceStage(targetStage) {
    if (!WORKFLOW_STAGES[targetStage]) {
      throw new Error(`Invalid stage: ${targetStage}`);
    }
    const prevStage = this.currentStage;
    this.currentStage = targetStage;
    this._notifyChange({
      type: 'stage_forced',
      previousStage: prevStage,
      currentStage: targetStage,
      info: this.getCurrentStageInfo()
    });
    return true;
  }

  // ─── Automated Sync with Physical Simulation ──────────────────────────────

  syncWithSimulation() {
    const simState = this.simulation?.getState?.() ?? null;
    const wires = this.circuitState?.connections ?? [];
    const validation = this.circuitState ? CircuitValidator.validateFullCircuit(this.circuitState) : null;

    if (this.currentStage === WORKFLOW_STAGES.NOT_STARTED) {
      // Auto-start if student began interacting
      if (wires.length > 0 || this.identifiedApparatus.size > 0) {
        this.goToStage(WORKFLOW_STAGES.INTRODUCTION);
        return this.currentStage;
      }
    } else if (this.currentStage === WORKFLOW_STAGES.INTRODUCTION) {
      if (this.identifiedApparatus.size > 0) {
        this.goToStage(WORKFLOW_STAGES.APPARATUS_IDENTIFICATION);
        return this.currentStage;
      }
    } else if (this.currentStage === WORKFLOW_STAGES.APPARATUS_IDENTIFICATION) {
      if (this.areAllApparatusIdentified() || wires.length > 0) {
        this.identifyAllApparatus();
        this.goToStage(WORKFLOW_STAGES.CIRCUIT_ASSEMBLY);
        return this.currentStage;
      }
    } else if (this.currentStage === WORKFLOW_STAGES.CIRCUIT_ASSEMBLY) {
      if (wires.length >= 7) {
        this.goToStage(WORKFLOW_STAGES.CIRCUIT_VALIDATION);
        return this.currentStage;
      }
    } else if (this.currentStage === WORKFLOW_STAGES.CIRCUIT_VALIDATION) {
      if (validation?.isFullyValid && !validation?.hasShortCircuit && simState?.keyClosed) {
        this.goToStage(WORKFLOW_STAGES.EXPERIMENT_RUNNING);
        return this.currentStage;
      }
    } else if (this.currentStage === WORKFLOW_STAGES.EXPERIMENT_RUNNING) {
      if (simState && simState.readingCount > 0) {
        this.goToStage(WORKFLOW_STAGES.OBSERVATION_RECORDING);
        return this.currentStage;
      }
    } else if (this.currentStage === WORKFLOW_STAGES.OBSERVATION_RECORDING) {
      const minReadings = this.config.minReadingsForVerification ?? 5;
      if (simState && simState.readingCount >= minReadings) {
        this.goToStage(WORKFLOW_STAGES.GRAPH_ANALYSIS);
        return this.currentStage;
      }
    } else if (this.currentStage === WORKFLOW_STAGES.GRAPH_ANALYSIS) {
      if (simState?.statistics?.isVerified) {
        this.goToStage(WORKFLOW_STAGES.RESULT_VERIFICATION);
        return this.currentStage;
      }
    }

    if (this.currentStage === WORKFLOW_STAGES.EXPERIMENT_RUNNING) {
      if (simState && simState.readingCount > 0) {
        this.goToStage(WORKFLOW_STAGES.OBSERVATION_RECORDING);
      }
    }

    if (this.currentStage === WORKFLOW_STAGES.OBSERVATION_RECORDING) {
      const minReadings = this.config.minReadingsForVerification ?? 5;
      if (simState && simState.readingCount >= minReadings) {
        this.goToStage(WORKFLOW_STAGES.GRAPH_ANALYSIS);
      }
    }

    if (this.currentStage === WORKFLOW_STAGES.GRAPH_ANALYSIS) {
      if (simState?.statistics?.isVerified) {
        this.goToStage(WORKFLOW_STAGES.RESULT_VERIFICATION);
      }
    }

    return this.currentStage;
  }

  // ─── Student Assessment ───────────────────────────────────────────────────

  submitAssessmentAnswer(questionId, selectedOptionIndex) {
    const q = this.assessmentQuestions.find((item) => item.id === questionId);
    if (!q) {
      return { success: false, error: `Question ${questionId} not found.` };
    }

    const isCorrect = selectedOptionIndex === q.correctAnswerIndex;
    this.assessmentAnswers.set(questionId, {
      selectedOptionIndex,
      isCorrect,
      explanation: q.explanation
    });

    this._notifyChange({
      type: 'assessment_answered',
      questionId,
      isCorrect
    });

    return {
      success: true,
      questionId,
      isCorrect,
      explanation: q.explanation
    };
  }

  getAssessmentScore() {
    const total = this.assessmentQuestions.length;
    const answered = this.assessmentAnswers.size;
    let correct = 0;

    for (const ans of this.assessmentAnswers.values()) {
      if (ans.isCorrect) correct += 1;
    }

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const completed = answered === total;

    return {
      total,
      answered,
      correct,
      percentage,
      completed
    };
  }

  // ─── Practical Completion Summary ─────────────────────────────────────────

  getCompletionSummary() {
    const durationMs = (this.completionTime || Date.now()) - this.startTime;
    const durationSeconds = Math.max(1, Math.round(durationMs / 1000));

    const simState = this.simulation?.getState?.() ?? null;
    const stats = simState?.statistics ?? null;
    const calculatedResistance = stats?.slopeResistance ?? 0;
    const nominalResistance = this.config.fixedResistor ?? 10.0;
    const percentageError = calculatedResistance > 0
      ? Math.abs(calculatedResistance - nominalResistance) / nominalResistance * 100
      : 0;

    const assessmentScore = this.getAssessmentScore();

    return {
      practical: 'ohms_law',
      curriculum: {
        standard: 'Maharashtra SSC Standard 10',
        subject: 'Science & Technology Part 1',
        chapter: 'Chapter 4: Effects of Electric Current',
        reference: 'Balbharati Textbook, Std 10 (Page 47-51) & Std 9 Chapter 3 (Page 33)'
      },
      durationSeconds,
      durationFormatted: `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
      readingsRecorded: simState?.readingCount ?? 0,
      nominalResistanceOhms: nominalResistance,
      calculatedResistanceOhms: Number(calculatedResistance.toFixed(2)),
      percentageError: Number(percentageError.toFixed(2)),
      isVerified: Boolean(stats?.isVerified),
      assessmentScore,
      masteryBadgeEarned: Boolean(stats?.isVerified && assessmentScore.percentage >= 75)
    };
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  resetPractical() {
    this.currentStage = WORKFLOW_STAGES.NOT_STARTED;
    this.identifiedApparatus.clear();
    this.assessmentAnswers.clear();
    this.startTime = Date.now();
    this.completionTime = null;

    if (this.simulation) {
      if (typeof this.simulation.resetAll === 'function') {
        this.simulation.resetAll();
      } else if (typeof this.simulation.resetCircuit === 'function') {
        this.simulation.resetCircuit();
      } else if (typeof this.simulation.clearReadings === 'function') {
        this.simulation.clearReadings();
      }
    }
    if (this.circuitState && typeof this.circuitState.reset === 'function') {
      this.circuitState.reset();
    } else if (this.circuitState && typeof this.circuitState.resetConnections === 'function') {
      this.circuitState.resetConnections();
    }

    this._notifyChange({
      type: 'practical_reset',
      currentStage: this.currentStage
    });

    return true;
  }

  // ─── Event Subscriptions ──────────────────────────────────────────────────

  onStageChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      return () => {
        this.listeners = this.listeners.filter((cb) => cb !== callback);
      };
    }
    return () => { };
  }

  _notifyChange(event) {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        console.error('[OhmsLawWorkflowManager] Listener error:', e);
      }
    });
  }
}
