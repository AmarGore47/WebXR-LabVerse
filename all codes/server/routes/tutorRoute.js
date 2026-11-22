/**
 * tutorRoute.js
 * Express router for /api/tutor endpoint.
 */

import { Router } from 'express';
import { validateTutorRequest } from '../middleware/requestValidation.js';
import { TutorService } from '../services/tutorService.js';

export function createTutorRouter(options = {}) {
  const router = Router();
  const tutorService = options.tutorService ?? new TutorService(options);

  // Health check for tutor service
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'labverse-ai-tutor',
      provider: tutorService.provider?.getProviderName() ?? 'gemini',
      timestamp: Date.now()
    });
  });

  // Main student tutor query endpoint
  router.post('/', validateTutorRequest, async (req, res) => {
    try {
      const result = await tutorService.handleStudentQuestion(req.sanitized);
      return res.status(200).json(result);
    } catch (err) {
      // Safe diagnostic logging without exposing secrets
      console.error(`[AI Tutor Backend Error] Code: ${err.code || 'UNKNOWN'}, Message: ${err.message}`);

      // Map error codes to HTTP status and clean client message
      if (err.code === 'API_KEY_MISSING') {
        return res.status(503).json({
          success: false,
          error: {
            code: 'API_KEY_MISSING',
            message: 'AI Tutor service is temporarily unavailable: GEMINI_API_KEY is not configured on the server.'
          }
        });
      }

      if (err.code === 'API_KEY_INVALID') {
        return res.status(502).json({
          success: false,
          error: {
            code: 'API_KEY_INVALID',
            message: 'AI Tutor service authentication error: configured API key is invalid.'
          }
        });
      }

      if (err.code === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Gemini AI rate limit or quota exceeded. Please wait a moment before asking again.'
          }
        });
      }

      if (err.code === 'API_TIMEOUT') {
        return res.status(504).json({
          success: false,
          error: {
            code: 'API_TIMEOUT',
            message: 'The AI Tutor did not respond within the time limit. Please try asking again.'
          }
        });
      }

      if (err.code === 'NETWORK_ERROR') {
        return res.status(503).json({
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Unable to connect to Google AI servers. Please check server internet connectivity.'
          }
        });
      }

      if (err.code === 'MODEL_NOT_FOUND') {
        return res.status(502).json({
          success: false,
          error: {
            code: 'MODEL_NOT_FOUND',
            message: 'The configured Gemini model is unavailable.'
          }
        });
      }

      // Default safe error response
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: 'An error occurred while generating tutor guidance. Please try again.'
        }
      });
    }
  });

  return router;
}
