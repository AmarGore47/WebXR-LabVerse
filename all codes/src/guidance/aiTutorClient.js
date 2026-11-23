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

    // Safe Developer Diagnostics Report Data
    this.diagnostics = {
      apiBaseUrl: this.apiBaseUrl,
      healthBaseUrl: this.healthBaseUrl,
      backendReachable: false,
      apiHealthStatus: 'UNKNOWN',
      tutorHealthStatus: 'UNKNOWN',
      keyConfigured: false,
      selectedModelName: 'unknown',
      lastResponseStatus: null,
      lastRequestLatencyMs: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      timestamp: Date.now()
    };
  }

  /**
   * Return copy of current developer diagnostics report.
   */
  getDiagnostics() {
    return { ...this.diagnostics };
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
   * Full reliable backend & tutor health check with latency measurement.
   */
  async checkHealth() {
    this._setState(TUTOR_STATES.CONNECTING, { action: 'health_check' });
    const startTime = Date.now();

    let apiHealthy = false;
    let tutorHealthy = false;
    let apiStatus = null;
    let tutorStatus = null;

    // 1. Check Global /api/health
    try {
      const response = await fetch(this.healthBaseUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      apiStatus = response.status;
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.status === 'healthy') {
          apiHealthy = true;
          this.diagnostics.apiHealthStatus = 'OK';
        } else {
          this.diagnostics.apiHealthStatus = 'UNEXPECTED_RESPONSE';
        }
      } else if (response.status === 404) {
        this.diagnostics.apiHealthStatus = '404_NOT_FOUND';
      } else {
        this.diagnostics.apiHealthStatus = `HTTP_${response.status}`;
      }
    } catch (err) {
      this.diagnostics.apiHealthStatus = 'UNREACHABLE';
    }

    // 2. Check /api/tutor/health
    try {
      const tutorHealthUrl = `${this.apiBaseUrl}/health`;
      const response = await fetch(tutorHealthUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      tutorStatus = response.status;
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.status === 'ok') {
          tutorHealthy = true;
          this.diagnostics.tutorHealthStatus = 'OK';
          this.diagnostics.keyConfigured = Boolean(data.keyConfigured);
          this.diagnostics.selectedModelName = data.modelName ?? 'unknown';
        } else {
          this.diagnostics.tutorHealthStatus = 'UNEXPECTED_RESPONSE';
        }
      } else if (response.status === 404) {
        this.diagnostics.tutorHealthStatus = '404_NOT_FOUND';
      } else {
        this.diagnostics.tutorHealthStatus = `HTTP_${response.status}`;
      }
    } catch (err) {
      this.diagnostics.tutorHealthStatus = 'UNREACHABLE';
    }

    const latency = Date.now() - startTime;
    this.diagnostics.lastRequestLatencyMs = latency;
    this.diagnostics.backendReachable = apiHealthy || tutorHealthy;
    this.diagnostics.timestamp = Date.now();

    if (apiHealthy && tutorHealthy) {
      this._setState(TUTOR_STATES.READY, { health: 'healthy' });
      return { healthy: true, status: 200, diagnostics: this.getDiagnostics() };
    }

    const safeCode = !this.diagnostics.backendReachable
      ? 'BACKEND_OFFLINE'
      : (tutorStatus === 404 ? 'API_NOT_FOUND' : 'SERVICE_UNHEALTHY');

    this.diagnostics.lastErrorCode = safeCode;
    this._setState(TUTOR_STATES.ERROR, { code: safeCode });
    return { healthy: false, status: apiStatus ?? tutorStatus, diagnostics: this.getDiagnostics() };
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
    const reqStartTime = Date.now();

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
      const reqLatency = Date.now() - reqStartTime;
      this.diagnostics.lastRequestLatencyMs = reqLatency;
      this.diagnostics.lastResponseStatus = response.status;
      this.diagnostics.timestamp = Date.now();

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let safeCode = data?.error?.code;
        let safeMsg = data?.error?.message;

        if (response.status === 404) {
          safeCode = 'API_NOT_FOUND';
          safeMsg = `AI route ${this.apiBaseUrl} not found (404).`;
        } else if (!safeCode) {
          safeCode = `HTTP_${response.status}`;
          safeMsg = `Server returned HTTP ${response.status}: ${response.statusText}`;
        }

        const errObj = {
          code: safeCode,
          message: safeMsg
        };

        this.diagnostics.lastErrorCode = safeCode;
        this.diagnostics.lastErrorMessage = safeMsg;
        this._setState(TUTOR_STATES.ERROR, errObj);
        return {
          success: false,
          error: errObj,
          diagnostics: this.getDiagnostics()
        };
      }

      // Validate response structure
      if (!data || typeof data !== 'object' || !data.success || !data.response) {
        const schemaErr = {
          code: 'INVALID_RESPONSE_SCHEMA',
          message: 'Received unexpected response structure from AI Tutor server.'
        };
        this.diagnostics.lastErrorCode = 'INVALID_RESPONSE_SCHEMA';
        this.diagnostics.lastErrorMessage = schemaErr.message;
        this._setState(TUTOR_STATES.ERROR, schemaErr);
        return {
          success: false,
          error: schemaErr,
          diagnostics: this.getDiagnostics()
        };
      }

      this.diagnostics.lastErrorCode = null;
      this.diagnostics.lastErrorMessage = null;
      this.diagnostics.backendReachable = true;
      this._setState(TUTOR_STATES.RESPONDING, { response: data.response });

      // After brief responding transition, settle in READY
      setTimeout(() => {
        if (this.currentState === TUTOR_STATES.RESPONDING) {
          this._setState(TUTOR_STATES.READY);
        }
      }, 1500);

      return {
        ...data,
        diagnostics: this.getDiagnostics()
      };
    } catch (err) {
      clearTimeout(timer);
      const reqLatency = Date.now() - reqStartTime;
      this.diagnostics.lastRequestLatencyMs = reqLatency;
      this.diagnostics.timestamp = Date.now();

      let errResult;
      if (err.name === 'AbortError') {
        errResult = {
          code: 'REQUEST_TIMEOUT',
          message: 'Tutor request timed out. Please check your connection and retry.'
        };
      } else {
        errResult = {
          code: 'NETWORK_FAILURE',
          message: 'Backend unreachable. Check if dev server is running or proxy is active.'
        };
      }

      this.diagnostics.lastErrorCode = errResult.code;
      this.diagnostics.lastErrorMessage = errResult.message;
      this.diagnostics.backendReachable = false;
      this._setState(TUTOR_STATES.ERROR, errResult);
      return {
        success: false,
        error: errResult,
        diagnostics: this.getDiagnostics()
      };
    } finally {
      this.isLoading = false;
    }
  }
}
