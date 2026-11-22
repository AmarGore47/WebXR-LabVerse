/**
 * socraticTutorEngine.js
 * Socratic Tutoring Intelligence Engine for LabVerse Virtual Science Lab.
 *
 * Implements 8 pedagogical tutoring strategies:
 * 1. guided_question: Asks one focused question to lead the student to self-discovery.
 * 2. concept_explanation: Direct, accessible physics explanation when requested or needed.
 * 3. progressive_hint: Delivers tier-appropriate hints (Level 1, 2, or 3).
 * 4. misconception_correction: Addresses physical misconceptions directly using relatable analogies.
 * 5. procedure_guidance: Practical step-by-step lab guidance.
 * 6. observation_interpretation: Guides analysis of V and I meter readings and V/I ratio.
 * 7. result_verification: Helps student verify linearity of the V-I plot and calculate slope R.
 * 8. final_assessment: Short conceptual check on Ohm’s Law mastery.
 *
 * Socratic Guidelines:
 * - Never ask more than ONE guiding question at a time.
 * - Do not force a question when the student explicitly asks for a direct explanation.
 * - Never repeat the exact same Socratic question consecutively.
 */

import { MAHARASHTRA_SSC_CURRICULUM } from '../curriculum/maharashtraSSC/class10Physics.js';

export class SocraticTutorEngine {
  /**
   * @param {Object} options
   * @param {Object} [options.hintService] - ProgressiveHintService instance
   * @param {Object} [options.diagnosisService] - ErrorDiagnosisService instance
   * @param {Object} [options.learningState] - StudentLearningState instance
   */
  constructor(options = {}) {
    this.hintService = options.hintService || null;
    this.diagnosisService = options.diagnosisService || null;
    this.learningState = options.learningState || null;
    this.curriculum = MAHARASHTRA_SSC_CURRICULUM.practicals.ohms_law;
  }

  /**
   * Evaluates student intent, active simulation mistakes, and past dialogue
   * to determine the optimal pedagogical strategy for the current turn.
   */
  determineStrategy({ question = '', simulationContext, diagnosis, requestedAction = null }) {
    const qLower = question.toLowerCase();

    // 1. Explicit UI Action button overrides
    if (requestedAction === 'hint') return 'progressive_hint';
    if (requestedAction === 'explain') return 'concept_explanation';
    if (requestedAction === 'mistakes') {
      return diagnosis && diagnosis.hasErrors ? 'misconception_correction' : 'concept_explanation';
    }
    if (requestedAction === 'guided_question') return 'guided_question';
    if (requestedAction === 'check_understanding') return 'final_assessment';

    // 2. Explicit student request for direct explanation
    const wantsDirectExplanation = (
      qLower.includes('tell me') ||
      qLower.includes('explain') ||
      qLower.includes('what is') ||
      qLower.includes('why is') ||
      qLower.includes('how to') ||
      qLower.includes('i don\'t know') ||
      qLower.includes('i don\'t understand') ||
      qLower.includes('समजले नाही') ||
      qLower.includes('सांगा') ||
      qLower.includes('समझ नहीं आया') ||
      qLower.includes('बताइए')
    );

    // 3. Student asking for a hint
    const wantsHint = (
      qLower.includes('hint') ||
      qLower.includes('clue') ||
      qLower.includes('help') ||
      qLower.includes('मदत') ||
      qLower.includes('मदद')
    );
    if (wantsHint) return 'progressive_hint';

    // Direct explanation preference when student asks for it
    if (wantsDirectExplanation) {
      return 'concept_explanation';
    }

    // 4. Critical topological mistake present in circuit
    if (diagnosis && diagnosis.hasErrors && diagnosis.primaryError) {
      if (diagnosis.primaryError.severity === 'critical') {
        return wantsDirectExplanation ? 'concept_explanation' : 'misconception_correction';
      }
      return 'guided_question';
    }

    // 5. Incomplete circuit or switch open procedure step
    if (simulationContext) {
      const isComplete = simulationContext.circuitTopology?.isComplete ?? false;
      const isClosed = simulationContext.switchState?.isClosed ?? false;
      const obsCount = simulationContext.observations?.readingsCount ?? 0;

      if (!isComplete) return 'procedure_guidance';
      if (!isClosed) return 'guided_question';
      if (obsCount > 0 && obsCount < 5) return 'observation_interpretation';
      if (obsCount >= 5) return 'result_verification';
    }

    // Default to concept explanation if student asked a direct query, otherwise guided question
    return wantsDirectExplanation ? 'concept_explanation' : 'guided_question';
  }

  /**
   * Generates curriculum-grounded Socratic guidance instructions for prompt construction.
   */
  buildSocraticInstructions({ strategy, diagnosis, language = 'English', simulationContext = null }) {
    let specificGuidance = '';

    const nominalR = simulationContext?.resistor?.fixedResistanceFormatted || (simulationContext?.resistor?.fixedResistanceOhms ? `${simulationContext.resistor.fixedResistanceOhms} Ω` : 'the fixed resistor');
    const meanR = simulationContext?.observations?.meanResistanceFormatted || (simulationContext?.observations?.meanResistanceOhms ? `${simulationContext.observations.meanResistanceOhms.toFixed(2)} Ω` : 'ΔV / ΔI');

    switch (strategy) {
      case 'guided_question':
        specificGuidance = `
STRATEGY: GUIDED QUESTION
- Ask exactly ONE thoughtful, focused Socratic question that prompts the student to think about the physical principle involved.
- Do NOT reveal the final answer in the question.
- Do NOT repeat this previous question: "${this.learningState ? this.learningState.lastSocraticQuestion || 'None' : 'None'}".
- Encourage the student to test or inspect a specific part of their virtual apparatus.`;
        break;

      case 'concept_explanation':
        specificGuidance = `
STRATEGY: CONCEPT EXPLANATION
- Provide a crystal-clear, direct explanation using verified Maharashtra SSC Class 10 concepts (Balbharati Chapter 4).
- Explain the physical reason behind the concept or apparatus role (e.g. why ammeter is low resistance in series, why voltmeter is high resistance in parallel).
- Include standard scientific formula (V = I × R) and appropriate units (Volts, Amperes, Ohms).`;
        break;

      case 'progressive_hint':
        specificGuidance = `
STRATEGY: PROGRESSIVE HINT
- Provide a graduated hint that leads the student forward without giving away the complete solution immediately.
- Point attention to the relevant apparatus component on the lab table.`;
        break;

      case 'misconception_correction':
        const err = diagnosis?.primaryError;
        specificGuidance = `
STRATEGY: MISCONCEPTION CORRECTION
- Address this specific verified mistake: "${err?.errorCode || 'Circuit Mistake'}" - ${err?.explanation || 'Incorrect wiring'}.
- Explain WHY this connection causes an issue in physics (e.g., short circuiting or blocking the main current path).
- Suggest the concrete physical correction: "${err?.suggestedCorrection || 'Check the tabletop schematic.'}".`;
        break;

      case 'procedure_guidance':
        specificGuidance = `
STRATEGY: PRACTICAL PROCEDURE GUIDANCE
- Guide the student on the next concrete physical action in the Ohm’s Law practical sequence.
- Keep the instruction simple, direct, and actionable in the 3D lab.`;
        break;

      case 'observation_interpretation':
        specificGuidance = `
STRATEGY: OBSERVATION INTERPRETATION
- Guide the student to inspect the live ammeter (I) and voltmeter (V) readings.
- Highlight the ratio V/I across the resistor coil (nominal: ${nominalR}).
- Remind the student to adjust the rheostat slider to obtain distinct observation rows.`;
        break;

      case 'result_verification':
        specificGuidance = `
STRATEGY: RESULT VERIFICATION
- The student has recorded observations!
- Explain how plotting V on the vertical axis and I on the horizontal axis yields a straight line passing through the origin.
- Highlight that the slope of this line equals the experimental resistance: R = ΔV / ΔI ≈ ${meanR} (nominal: ${nominalR}).
- Guide the student to verify linearity (R² ≈ 1.0) and acceptable experimental tolerance (±5–10%) according to Balbharati standards.`;
        break;

      case 'final_assessment':
        specificGuidance = `
STRATEGY: FINAL ASSESSMENT
- Ask one quick conceptual comprehension question from the Maharashtra SSC curriculum to verify the student has mastered Ohm's Law.`;
        break;

      default:
        specificGuidance = 'Teach gently and clearly, guiding the student towards understanding.';
    }

    return specificGuidance;
  }

  /**
   * Generates a deterministic fallback response tailored to the selected strategy
   * if the LLM provider fails or returns malformed output.
   */
  getDeterministicFallback({ strategy, diagnosis, language = 'English', question = '' }) {
    const err = diagnosis?.primaryError;

    if (strategy === 'misconception_correction' && err) {
      return {
        message: err.explanation,
        explanation: 'In electric circuits, instruments must be placed in harmony with their internal resistance.',
        hint: err.suggestedCorrection,
        suggestedAction: err.suggestedCorrection,
        responseType: 'correction',
        strategy: 'misconception_correction'
      };
    }

    if (strategy === 'progressive_hint' && this.hintService) {
      const topic = err?.errorCode || 'concept_ohms_law';
      const hintObj = this.hintService.getHint(topic, null, language);
      return {
        message: `Here is a hint (Level ${hintObj.level}):`,
        explanation: 'Think through the physical path of electric current.',
        hint: hintObj.hint,
        suggestedAction: 'Examine the apparatus on your lab table.',
        responseType: 'hint',
        strategy: 'progressive_hint'
      };
    }

    // Default Socratic fallback
    return {
      message: 'Let’s think about how current flows through the circuit loop. What is the role of each meter on your table?',
      explanation: 'Ohm’s law states that electric current is directly proportional to potential difference across a conductor at constant temperature (V = I * R).',
      hint: 'Check that the ammeter is in series and the voltmeter is in parallel across the resistor.',
      suggestedAction: 'Observe the circuit connections and meter deflections.',
      responseType: 'guidance',
      strategy: 'guided_question'
    };
  }

  /**
   * Generates a single targeted Socratic question with anti-repetition enforcement.
   */
  generateGuidedQuestion({ simulationContext, diagnosis }) {
    const errCode = diagnosis?.primaryError?.errorCode || diagnosis?.primaryError?.code;
    const lastQ = (this.learningState && this.learningState.lastGuidingQuestion) || this.lastGuidingQuestion;

    const questionPool = {
      ERR_AMMETER_SHORT: [
        'Why does connecting a low-resistance ammeter across a resistor divert current away from the resistor?',
        'What happens to the current path through the fixed resistor if a bypass with near-zero resistance is placed across it?'
      ],
      ERR_VOLTMETER_IN_SERIES: [
        'Since a voltmeter has extremely high internal resistance, how does placing it directly in the main series loop affect current flow?',
        'If an instrument acts like a massive obstacle to current, what happens to the ammeter reading when it is in series?'
      ],
      ERR_REVERSED_POLARITY: [
        'Which terminal of the battery should conventional current enter when flowing through the positive terminal of a DC meter?',
        'What causes a DC needle meter to deflect backwards below zero?'
      ],
      WARN_KEY_OPEN: [
        'Notice that all wires are connected but current is 0; what physical state is the plug key currently in?',
        'Can electric charges bridge the air gap in the plug key before it is inserted?'
      ],
      ERR_INCOMPLETE_CIRCUIT: [
        'What is needed to allow continuous electric current to circulate between the power supply and resistor?',
        'Which highlighted terminal pair on your lab table remains unconnected?'
      ],
      default: [
        'What is the relationship between the potential difference across a conductor and the electric current flowing through it?',
        'How does adjusting the sliding contact on the rheostat change the total resistance of your circuit?'
      ]
    };

    const candidates = questionPool[errCode] || questionPool.default;
    let selected = candidates[0];
    if (selected === lastQ && candidates.length > 1) {
      selected = candidates[1];
    }

    this.lastGuidingQuestion = selected;
    if (this.learningState) {
      this.learningState.lastGuidingQuestion = selected;
      this.learningState.lastSocraticQuestion = selected;
    }

    return selected;
  }

  /**
   * Generates a deterministic text response for offline or provider fallback.
   */
  generateDeterministicResponse({ strategy, question = '', simulationContext, diagnosis, language = 'English' }) {
    const fallback = this.getDeterministicFallback({ strategy, diagnosis, language, question });
    return `${fallback.message} ${fallback.explanation} ${fallback.hint}`.trim();
  }
}

