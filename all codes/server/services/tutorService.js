/**
 * tutorService.js
 * Socratic Pedagogical Orchestration Service for LabVerse AI Virtual Lab Tutor.
 *
 * Integrates:
 * - Deterministic Error Diagnosis (CircuitValidator authority)
 * - Socratic Tutoring Engine (8 pedagogical strategies)
 * - Progressive Three-Tier Hint Service (Level 1, 2, 3)
 * - Session-level Student Learning State
 * - Maharashtra SSC Class 10 Curriculum Grounding
 * - Gemini Provider & Resilient Fallback Architecture
 */

import { buildTutorSystemPrompt } from '../prompts/tutorSystemPrompt.js';
import { GeminiProvider } from './geminiProvider.js';
import { ErrorDiagnosisService } from './errorDiagnosisService.js';
import { ProgressiveHintService } from './progressiveHintService.js';
import { StudentLearningState } from './studentLearningState.js';
import { SocraticTutorEngine } from './socraticTutorEngine.js';
import { MAHARASHTRA_SSC_CURRICULUM } from '../curriculum/maharashtraSSC/class10Physics.js';

const VALID_RESPONSE_TYPES = new Set([
  'explanation',
  'guidance',
  'hint',
  'correction',
  'encouragement',
  'observation_analysis'
]);

export class TutorService {
  constructor(options = {}) {
    this.provider = options.provider ?? new GeminiProvider();
    this.timeoutMs = options.timeoutMs ?? (Number(process.env.AI_REQUEST_TIMEOUT_MS) || 10000);

    this.enableFallback = options.enableFallback ?? true;

    // Pedagogical sub-services
    this.diagnosisService = options.diagnosisService ?? new ErrorDiagnosisService();
    this.hintService = options.hintService ?? new ProgressiveHintService();
    this.learningState = options.learningState ?? new StudentLearningState();
    this.socraticEngine = options.socraticEngine ?? new SocraticTutorEngine({
      hintService: this.hintService,
      diagnosisService: this.diagnosisService,
      learningState: this.learningState
    });

    this.curriculum = MAHARASHTRA_SSC_CURRICULUM;
  }

  /**
   * Handles student question with live simulation context and Socratic pedagogical orchestration.
   */
  async handleStudentQuestion({ question, language = 'English', simulationContext, actionType = null }) {
    // 1. Authoritative deterministic error diagnosis
    const diagnosis = this.diagnosisService.diagnose(simulationContext);

    // 2. Record student interaction in learning state
    this.learningState.recordStudentInteraction({
      question,
      detectedMistakes: simulationContext?.detectedMistakes || []
    });

    // 3. Determine pedagogical tutoring strategy
    const strategy = this.socraticEngine.determineStrategy({
      question,
      simulationContext,
      diagnosis,
      requestedAction: actionType
    });

    // 4. Handle progressive hints if requested
    let hintInfo = null;
    const topic = diagnosis.primaryError?.errorCode || 'concept_ohms_law';
    if (strategy === 'progressive_hint' || actionType === 'hint') {
      hintInfo = actionType === 'hint'
        ? this.hintService.advanceHint(topic, language)
        : this.hintService.getHint(topic, null, language);
    }

    // 5. Construct Socratic instructions
    const socraticInstructions = this.socraticEngine.buildSocraticInstructions({
      strategy,
      diagnosis,
      language,
      simulationContext
    });

    // 6. Build enhanced system prompt
    const systemPrompt = buildTutorSystemPrompt({
      simulationContext,
      language,
      diagnosis,
      strategy,
      socraticInstructions,
      learningState: this.learningState.getSummary(simulationContext),
      hintInfo
    });

    // 7. Invoke Gemini AI Provider with timeout handling
    let aiResult;
    let parsedResponse;

    try {
      aiResult = await this.provider.generateResponse({
        systemPrompt,
        userPrompt: question,
        timeoutMs: this.timeoutMs
      });
      parsedResponse = this._parseAndValidateResponse(aiResult.rawText, strategy);
    } catch (err) {
      if (this.enableFallback === false) {
        throw err;
      }
      // If LLM provider fails (e.g. timeout or network), use deterministic Socratic fallback
      console.warn(`[TutorService] Provider error (${err.code || err.message}), applying deterministic Socratic fallback.`);
      parsedResponse = this.socraticEngine.getDeterministicFallback({
        strategy,
        diagnosis,
        language,
        question
      });

      aiResult = {
        metadata: {
          provider: 'deterministic_fallback',
          model: 'fallback-socratic-rules',
          latencyMs: 0
        }
      };
    }

    // 8. Track tutor response in learning state
    this.learningState.recordTutorResponse({
      message: parsedResponse.message,
      strategy: parsedResponse.strategy || strategy,
      hintLevel: hintInfo?.level || null,
      topic
    });

    return {
      success: true,
      response: parsedResponse,
      strategy,
      language,
      hint: hintInfo,
      diagnosis: {
        status: diagnosis.status,
        hasErrors: diagnosis.hasErrors,
        primaryError: diagnosis.primaryError,
        summary: diagnosis.summary
      },
      learningSnapshot: this.learningState.getSummary(simulationContext),
      metadata: {
        provider: aiResult.metadata?.provider ?? 'gemini',
        practical: simulationContext?.practical ?? 'ohms_law',
        model: aiResult.metadata?.model ?? 'gemini-2.5-flash',
        latencyMs: aiResult.metadata?.latencyMs ?? 0,
        strategy,
        curriculum: 'Maharashtra SSC Class 10 Science Part 1'
      }
    };
  }

  getLearningState() {
    return this.learningState;
  }

  async processTutorRequest(params) {
    return this.handleStudentQuestion(params);
  }

  /**
   * Safely parses and validates JSON returned by the LLM.
   */
  _parseAndValidateResponse(rawText, defaultStrategy = 'guided_question') {
    if (!rawText || typeof rawText !== 'string') {
      return this._getSafeFallbackResponse('Empty response from model.', defaultStrategy);
    }

    let parsed;
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      return this._getSafeFallbackResponse(rawText, defaultStrategy);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return this._getSafeFallbackResponse(rawText, defaultStrategy);
    }

    // Validate fields and ensure non-empty strings
    const message = (typeof parsed.message === 'string' && parsed.message.trim().length > 0)
      ? parsed.message.trim()
      : 'Here is guidance on your current practical step.';

    const explanation = (typeof parsed.explanation === 'string' && parsed.explanation.trim().length > 0)
      ? parsed.explanation.trim()
      : 'In this practical, current through the nichrome coil is directly proportional to potential difference across it (V = I * R).';

    const hint = (typeof parsed.hint === 'string' && parsed.hint.trim().length > 0)
      ? parsed.hint.trim()
      : 'Check your circuit wires and apparatus settings on the table.';

    const suggestedAction = (typeof parsed.suggestedAction === 'string' && parsed.suggestedAction.trim().length > 0)
      ? parsed.suggestedAction.trim()
      : 'Observe your meters and proceed with the current practical step.';

    const responseType = (typeof parsed.responseType === 'string' && VALID_RESPONSE_TYPES.has(parsed.responseType))
      ? parsed.responseType
      : 'guidance';

    const strategy = (typeof parsed.strategy === 'string' && parsed.strategy.trim().length > 0)
      ? parsed.strategy.trim()
      : defaultStrategy;

    return {
      message,
      explanation,
      hint,
      suggestedAction,
      responseType,
      strategy
    };
  }

  _getSafeFallbackResponse(rawText, defaultStrategy = 'guided_question') {
    return {
      message: (typeof rawText === 'string' && rawText.trim().length > 0)
        ? rawText.trim().substring(0, 240)
        : 'Let’s check the circuit connections and meter deflections.',
      explanation: 'According to Ohm’s law (V = I * R), potential difference across a conductor is directly proportional to current at constant temperature.',
      hint: 'Inspect the tabletop circuit schematic and ensure the ammeter is in series and voltmeter in parallel.',
      suggestedAction: 'Observe the circuit connections and verify meter polarity.',
      responseType: 'guidance',
      strategy: defaultStrategy
    };
  }
}
