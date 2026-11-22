/**
 * studentLearningState.js
 * In-memory Session-Level Learning State Tracker for LabVerse Socratic AI Tutor.
 *
 * Privacy & Security Constraints:
 * - NO persistent profiles, student accounts, or Personally Identifiable Information (PII).
 * - Ephemeral in-memory session tracking only.
 * - Resets on page reload, session restart, or practical reset.
 */

export class StudentLearningState {
  constructor() {
    this.reset();
  }

  /**
   * Resets learning state back to clean initial state.
   */
  reset() {
    this.sessionStartTime = Date.now();
    this.conceptsEncountered = new Set();
    this.conceptsUnderstood = new Set();
    this.questionsAskedCount = 0;
    this.hintLevelsUsed = new Map(); // topic -> max level reached
    this.misconceptionsDetected = new Set();
    this.mistakesResolved = new Set();
    this.recentDialogue = []; // Max 10 recent turns: { role, text, timestamp, strategy }
    this.lastSocraticQuestion = null;
    this.lastGuidingQuestion = null;
    this.consecutiveDirectAnswersGiven = 0;
    this.practicalCompleted = false;
  }

  get totalQuestionsAsked() {
    return this.questionsAskedCount;
  }

  get dialogueTurns() {
    return this.recentDialogue;
  }

  get understandingScore() {
    return this.calculateUnderstandingScore(null);
  }

  recordTurn({ studentQuestion, strategy, tutorResponse, diagnosis }) {
    this.recordStudentInteraction({
      question: studentQuestion,
      detectedMistakes: diagnosis?.diagnosedErrors || []
    });
    this.recordTutorResponse({
      message: typeof tutorResponse === 'string' ? tutorResponse : (tutorResponse?.response || tutorResponse?.message || ''),
      strategy
    });
  }

  markConceptUnderstood(conceptId) {
    this.verifyConceptUnderstood(conceptId);
  }

  getSnapshot(simulationContext = null) {
    const summary = this.getSummary(simulationContext);
    return {
      ...summary,
      conceptsUnderstood: Array.from(this.conceptsUnderstood),
      mistakesResolved: Array.from(this.mistakesResolved),
      summary: `Student has asked ${this.questionsAskedCount} questions, mastered ${this.conceptsUnderstood.size} concepts, with an understanding score of ${summary.understandingScore}%.`
    };
  }

  /**
   * Records a student question or action.
   */
  recordStudentInteraction({ question, detectedMistakes = [] }) {
    this.questionsAskedCount++;

    // Track active mistakes as potential misconceptions
    detectedMistakes.forEach((m) => {
      const code = typeof m === 'string' ? m : m.code;
      if (code) {
        this.misconceptionsDetected.add(code);
      }
    });

    this.recentDialogue.push({
      role: 'student',
      text: question,
      timestamp: Date.now()
    });

    if (this.recentDialogue.length > 10) {
      this.recentDialogue.shift();
    }
  }

  /**
   * Records tutor response and pedagogical strategy applied.
   */
  recordTutorResponse({ message, strategy, socraticQuestion = null, hintLevel = null, topic = null }) {
    if (socraticQuestion) {
      this.lastSocraticQuestion = socraticQuestion;
      this.consecutiveDirectAnswersGiven = 0;
    } else {
      this.consecutiveDirectAnswersGiven++;
    }

    if (hintLevel && topic) {
      const prev = this.hintLevelsUsed.get(topic) || 0;
      this.hintLevelsUsed.set(topic, Math.max(prev, hintLevel));
    }

    this.recentDialogue.push({
      role: 'tutor',
      text: message,
      strategy,
      timestamp: Date.now()
    });

    if (this.recentDialogue.length > 10) {
      this.recentDialogue.shift();
    }
  }

  /**
   * Mark a concept as introduced / encountered.
   */
  encounterConcept(conceptId) {
    if (conceptId) {
      this.conceptsEncountered.add(conceptId);
    }
  }

  /**
   * Mark a concept as understood following correct student action / answer.
   */
  verifyConceptUnderstood(conceptId) {
    if (conceptId) {
      this.conceptsUnderstood.add(conceptId);
    }
  }

  /**
   * Mark a diagnosed mistake as resolved following verified correction.
   */
  resolveMistake(mistakeCode) {
    if (mistakeCode) {
      this.mistakesResolved.add(mistakeCode);
    }
  }

  /**
   * Calculate dynamically an understanding score (0 - 100%) based on simulation milestones and error status.
   *
   * Pedagogical Scoring Rules:
   * 1. Asking questions does NOT increase understanding score.
   * 2. Hint usage does NOT increase understanding score.
   * 3. 7-wire circuit complete: 20%
   * 4. Clean circuit without active mistakes: 20% (penalized by active mistakes)
   * 5. Recorded 5 valid observations: 20% (4% per distinct reading)
   * 6. Ohm's Law verified (R = ΔV/ΔI confirmed linear): 20%
   * 7. Verified conceptual mastery & resolved mistakes: up to 20% (5% per understood concept/resolved mistake)
   */
  calculateUnderstandingScore(simulationContext) {
    let score = 0;
    if (!simulationContext) {
      return Math.min(20, this.conceptsUnderstood.size * 5 + this.mistakesResolved.size * 5);
    }

    const isComplete = simulationContext.circuitTopology?.isComplete ?? simulationContext.circuit?.isComplete ?? false;
    const isClosed = simulationContext.switchState?.isClosed ?? simulationContext.circuit?.keyClosed ?? false;
    const obsCount = simulationContext.observations?.readingsCount ?? simulationContext.observations?.count ?? 0;
    const isVerified = simulationContext.observations?.isOhmLawVerified ?? simulationContext.observations?.isVerified ?? false;
    const mistakesCount = simulationContext.detectedMistakes?.length ?? (simulationContext.circuitTopology?.mistakeCount ?? 0);

    // Milestone 1: 7-wire circuit complete (20%)
    if (isComplete) score += 20;

    // Milestone 2: Clean circuit without critical mistakes (20%)
    if (mistakesCount === 0 && isComplete) {
      score += 20;
    } else if (isComplete) {
      score += Math.max(0, 20 - mistakesCount * 10);
    }

    // Milestone 3: Recorded 5 observations (20% -> 4% per reading)
    score += Math.min(20, obsCount * 4);

    // Milestone 4: Ohm's Law verification complete (20%)
    if (isVerified) score += 20;

    // Milestone 5: Verified Conceptual Understanding & Resolved Practical Mistakes (up to 20%)
    const conceptualBonus = Math.min(15, this.conceptsUnderstood.size * 5);
    const resolvedBonus = Math.min(5, this.mistakesResolved.size * 5);
    score += (conceptualBonus + resolvedBonus);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generates a structured snapshot of learning state for prompt construction.
   */
  getSummary(simulationContext = null) {
    const understandingScore = this.calculateUnderstandingScore(simulationContext);

    return {
      questionsAsked: this.questionsAskedCount,
      conceptsIntroduced: Array.from(this.conceptsEncountered),
      conceptsUnderstood: Array.from(this.conceptsUnderstood),
      activeMisconceptions: Array.from(this.misconceptionsDetected),
      mistakesResolvedCount: this.mistakesResolved.size,
      lastSocraticQuestion: this.lastSocraticQuestion,
      consecutiveDirectAnswers: this.consecutiveDirectAnswersGiven,
      understandingScore,
      sessionDurationSec: Math.round((Date.now() - this.sessionStartTime) / 1000)
    };
  }
}

