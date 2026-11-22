/**
 * aiTutorClient.js
 * Frontend client service for interacting with the LabVerse AI Tutor API.
 * Connects the WebXR experience to the backend /api/tutor and /api/health endpoints.
 *
 * Implements full 7-stage AI request lifecycle:
 * IDLE -> CONNECTING -> READY -> THINKING -> RESPONDING -> ERROR -> RETRYING
 */

export const TUTOR_STATES = Object.freeze({
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  READY: 'READY',
  THINKING: 'THINKING',
  RESPONDING: 'RESPONDING',
  ERROR: 'ERROR',
  RETRYING: 'RETRYING'
});

export class AITutorClient {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? '/api/tutor';
    this.healthBaseUrl = options.healthBaseUrl ?? '/api/health';
    this.timeoutMs = options.timeoutMs ?? 20000;
    this.bridge = options.bridge ?? null;
    this.isLoading = false;
    this.currentState = TUTOR_STATES.IDLE;
    this.stateListeners = [];
    this.lastStudentQuestion = '';
  }

  /**
   * Set or update the active SimulationStateBridge instance.
   */
  setBridge(bridge) {
    this.bridge = bridge;
  }

  /**
   * Register a callback to observe AI request lifecycle changes.
   */
  onStateChange(callback) {
    if (typeof callback === 'function') {
      this.stateListeners.push(callback);
      // Immediately fire current state
      callback(this.currentState, {});
      return () => {
        this.stateListeners = this.stateListeners.filter((cb) => cb !== callback);
      };
    }
    return () => {};
  }

  _setState(newState, details = {}) {
    this.currentState = newState;
    this.stateListeners.forEach((cb) => {
      try {
        cb(newState, details);
      } catch (e) {
        console.error('[AITutorClient] State listener error:', e);
      }
    });
  }

  /**
   * Reliable backend health check.
   */
  async checkHealth() {
    this._setState(TUTOR_STATES.CONNECTING, { action: 'health_check' });
    try {
      const response = await fetch(this.healthBaseUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        this._setState(TUTOR_STATES.READY, { health: data });
        return { healthy: true, status: response.status, data };
      }
      this._setState(TUTOR_STATES.ERROR, { code: `HTTP_${response.status}` });
      return { healthy: false, status: response.status };
    } catch (err) {
      this._setState(TUTOR_STATES.ERROR, { error: err.message });
      return { healthy: false, error: err.message };
    }
  }

  /**
   * Ask the AI Tutor a question about the Ohm's Law practical.
   * @param {Object} params
   * @param {string} params.question - Student's question
   * @param {string} [params.language='English'] - 'English' | 'Hindi' | 'Marathi'
   * @param {Object} [params.customContext] - Optional override for simulation context
   * @param {string} [params.actionType] - Optional pedagogical action ('hint' | 'explain' | 'mistakes' | 'check_understanding' | 'guided_question')
   * @param {boolean} [params.isRetry=false] - Whether this is a retry attempt
   * @returns {Promise<{ success: boolean, response?: Object, metadata?: Object, error?: Object }>}
   */
  async askQuestion({ question, language = 'English', customContext = null, actionType = null, isRetry = false }) {
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'CLIENT_EMPTY_QUESTION',
          message: 'Question cannot be empty.'
        }
      };
    }

    // Prevent duplicate concurrent requests
    if (this.isLoading) {
      return {
        success: false,
        error: {
          code: 'REQUEST_IN_PROGRESS',
          message: 'A tutor request is already in progress. Please wait.'
        }
      };
    }

    // Preserve the student's question for retry
    this.lastStudentQuestion = question.trim();

    // Retrieve simulation context from bridge
    const simulationContext = customContext ?? (this.bridge ? this.bridge.getAIContext() : null);
    if (!simulationContext) {
      this._setState(TUTOR_STATES.ERROR, { code: 'CLIENT_MISSING_CONTEXT' });
      return {
        success: false,
        error: {
          code: 'CLIENT_MISSING_CONTEXT',
          message: 'Simulation state context is unavailable.'
        }
      };
    }

    this.isLoading = true;
    if (isRetry) {
      this._setState(TUTOR_STATES.RETRYING, { question: this.lastStudentQuestion });
    }
    this._setState(TUTOR_STATES.THINKING, { question: this.lastStudentQuestion });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: this.lastStudentQuestion,
          language,
          simulationContext,
          actionType
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errObj = data?.error ?? {
          code: `HTTP_${response.status}`,
          message: `Server returned error (${response.status}): ${response.statusText}`
        };
        this._setState(TUTOR_STATES.ERROR, errObj);
        return {
          success: false,
          error: errObj
        };
      }

      // Validate response structure
      if (!data || typeof data !== 'object' || !data.success || !data.response) {
        const schemaErr = {
          code: 'INVALID_RESPONSE_SCHEMA',
          message: 'Received unexpected response structure from AI Tutor server.'
        };
        this._setState(TUTOR_STATES.ERROR, schemaErr);
        return {
          success: false,
          error: schemaErr
        };
      }

      this._setState(TUTOR_STATES.RESPONDING, { response: data.response });

      // After brief responding transition, settle in READY
      setTimeout(() => {
        if (this.currentState === TUTOR_STATES.RESPONDING) {
          this._setState(TUTOR_STATES.READY);
        }
      }, 1500);

      return data;
    } catch (err) {
      clearTimeout(timer);

      let errResult;
      if (err.name === 'AbortError') {
        errResult = {
          code: 'REQUEST_TIMEOUT',
          message: 'Tutor request timed out. Please check your connection and retry.'
        };
      } else {
        errResult = {
          code: 'NETWORK_FAILURE',
          message: err.message ?? 'Failed to connect to the LabVerse AI Tutor service.'
        };
      }

      this._setState(TUTOR_STATES.ERROR, errResult);
      return {
        success: false,
        error: errResult
      };
    } finally {
      this.isLoading = false;
    }
  }
}
