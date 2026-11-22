/**
 * requestValidation.js
 * Request validation and input sanitization middleware for LabVerse AI Tutor API.
 */

const ALLOWED_LANGUAGES = new Set(['English', 'Hindi', 'Marathi', 'en', 'hi', 'mr', 'english', 'hindi', 'marathi']);
const MAX_QUESTION_LENGTH = 500;
const MIN_QUESTION_LENGTH = 2;

/**
 * Sanitizes student question text to strip non-printable characters and prompt injection delimiters
 * while preserving legitimate physics notation (V = I*R, Ω, ΔV, etc.).
 */
export function sanitizeQuestionText(rawText) {
  if (typeof rawText !== 'string') return '';

  return rawText
    // Remove null bytes and non-printable control characters (except newline and tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Neutralize common LLM instruction override tokens
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/\[SYSTEM_INSTRUCTION\]/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .trim();
}

/**
 * Validates the student question request payload.
 */
export function validateTutorRequest(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Request body must be a valid JSON object.'
      }
    });
  }

  // 1. Question validation
  if (typeof body.question !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUESTION',
        message: 'Student question is required and must be a string.'
      }
    });
  }

  const sanitizedQuestion = sanitizeQuestionText(body.question);

  if (sanitizedQuestion.length < MIN_QUESTION_LENGTH) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'EMPTY_QUESTION',
        message: 'Please ask a valid question with at least 2 characters.'
      }
    });
  }

  if (sanitizedQuestion.length > MAX_QUESTION_LENGTH) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'QUESTION_TOO_LONG',
        message: `Question exceeds the maximum length of ${MAX_QUESTION_LENGTH} characters.`
      }
    });
  }

  // 2. Language validation
  let language = body.language ?? 'English';
  if (typeof language !== 'string' || !ALLOWED_LANGUAGES.has(language)) {
    language = 'English'; // Fallback to English if unrecognized
  }

  // 3. Simulation Context validation
  if (!body.simulationContext || typeof body.simulationContext !== 'object' || Array.isArray(body.simulationContext)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_SIMULATION_CONTEXT',
        message: 'Simulation context from SimulationStateBridge is required.'
      }
    });
  }

  // 4. Optional actionType validation
  const allowedActions = new Set([
    'hint',
    'explain',
    'mistakes',
    'guided_question',
    'check_understanding',
    'show_explanation'
  ]);
  const actionType = (typeof body.actionType === 'string' && allowedActions.has(body.actionType))
    ? body.actionType
    : null;

  // Attach sanitized data to request
  req.sanitized = {
    question: sanitizedQuestion,
    language,
    simulationContext: body.simulationContext,
    actionType
  };

  next();
}
