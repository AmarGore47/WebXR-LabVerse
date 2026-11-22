/**
 * speechRecognitionService.js
 * Browser Speech Recognition service for LabVerse AI Virtual Tutor.
 *
 * Implements two-way voice input for desktop browsers and supported WebXR environments.
 * Complies with strict educational and privacy requirements:
 * - Capture microphone input ONLY after explicit user gesture.
 * - Handles Chrome, Edge, and WebXR browser implementations (SpeechRecognition / webkitSpeechRecognition).
 * - Multilingual support: English (en-IN / en-US), Hindi (hi-IN), Marathi (mr-IN).
 * - Full state lifecycle: 'idle' | 'listening' | 'processing' | 'success' | 'error'.
 * - Clean cancel/stop and timeout recovery.
 * - Graceful fallback when speech recognition is unsupported (e.g. Meta Quest Browser).
 */

export class SpeechRecognitionService {
  /**
   * @param {object} options
   * @param {string} [options.language='English'] - 'English' | 'Hindi' | 'Marathi'
   * @param {number} [options.silenceTimeoutMs=8000] - Auto-cancel timeout if no speech detected
   * @param {function} [options.onStateChange] - (state: string, meta: object) => void
   * @param {function} [options.onResult] - (transcript: string, isFinal: boolean) => void
   * @param {function} [options.onError] - (errorCode: string, errorMessage: string) => void
   */
  constructor(options = {}) {
    this.language = options.language || 'English';
    this.silenceTimeoutMs = options.silenceTimeoutMs || 8000;
    this.onStateChange = options.onStateChange || (() => {});
    this.onResult = options.onResult || (() => {});
    this.onError = options.onError || (() => {});

    // State machine: 'idle' | 'listening' | 'processing' | 'success' | 'error'
    this.state = 'idle';
    this.isListening = false;
    this.recognition = null;
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.silenceTimer = null;
    this.lastError = null;

    // Language code map (BCP-47)
    this.langMap = {
      English: 'en-IN',
      Hindi: 'hi-IN',
      Marathi: 'mr-IN'
    };

    // Detect browser support
    this.isSupported = this._checkSupport();
    if (this.isSupported) {
      this._initRecognitionInstance();
    }
  }

  /**
   * Check if SpeechRecognition API is available in current environment.
   */
  _checkSupport() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Get BCP-47 tag for current selected language.
   */
  getLanguageTag(lang = this.language) {
    return this.langMap[lang] || 'en-IN';
  }

  /**
   * Initialize browser SpeechRecognition instance.
   */
  _initRecognitionInstance() {
    if (!this.isSupported) return;

    try {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRec();
      this.recognition.continuous = false; // Stop after sentence/utterance
      this.recognition.interimResults = true; // Live interim text display
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.getLanguageTag(this.language);

      this.recognition.onstart = () => {
        this.isListening = true;
        this.interimTranscript = '';
        this.finalTranscript = '';
        this.lastError = null;
        this._setState('listening', { language: this.language });
        this._startSilenceTimer();
      };

      this.recognition.onresult = (event) => {
        this._clearSilenceTimer();
        let interim = '';
        let finalStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0] ? item[0].transcript : '';
          if (item.isFinal) {
            finalStr += transcript;
          } else {
            interim += transcript;
          }
        }

        this.interimTranscript = interim;
        if (finalStr) {
          this.finalTranscript = finalStr.trim();
        }

        const activeText = (this.finalTranscript || this.interimTranscript).trim();
        this.onResult(activeText, !!this.finalTranscript);

        // Restart silence timer for pause after words
        if (!this.finalTranscript) {
          this._startSilenceTimer();
        }
      };

      this.recognition.onerror = (event) => {
        this._clearSilenceTimer();
        this.isListening = false;
        const errType = event.error || 'unknown';
        this.lastError = errType;

        let userMsg = 'Speech recognition error occurred.';
        let errCode = 'RECOGNITION_ERROR';

        switch (errType) {
          case 'not-allowed':
          case 'permission-denied':
            errCode = 'PERMISSION_DENIED';
            userMsg = 'Microphone permission denied. Please allow microphone access in your browser.';
            break;
          case 'no-speech':
            errCode = 'NO_SPEECH';
            userMsg = 'No speech detected. Please speak clearly into your microphone.';
            break;
          case 'audio-capture':
            errCode = 'NO_MICROPHONE';
            userMsg = 'No microphone was detected on your device.';
            break;
          case 'network':
            errCode = 'NETWORK_ERROR';
            userMsg = 'Network error occurred during speech recognition.';
            break;
          case 'aborted':
            errCode = 'ABORTED';
            userMsg = 'Speech recognition was cancelled.';
            break;
          case 'language-not-supported':
            errCode = 'LANGUAGE_UNSUPPORTED';
            userMsg = `Voice recognition in ${this.language} is not supported by your browser.`;
            break;
          default:
            errCode = 'RECOGNITION_FAILED';
            userMsg = `Voice input error (${errType}). Try using text input instead.`;
        }

        this._setState('error', { code: errCode, message: userMsg, rawError: errType });
        this.onError(errCode, userMsg);
      };

      this.recognition.onend = () => {
        this._clearSilenceTimer();
        const wasListening = this.isListening;
        this.isListening = false;

        if (this.state === 'listening') {
          if (this.finalTranscript) {
            this._setState('success', { transcript: this.finalTranscript });
          } else if (this.interimTranscript) {
            this.finalTranscript = this.interimTranscript;
            this._setState('success', { transcript: this.finalTranscript });
          } else {
            // Finished without error and without speech
            this._setState('idle', { reason: 'ended_empty' });
          }
        }
      };
    } catch (e) {
      console.warn('[SpeechRecognitionService] Failed to initialize recognition engine:', e);
      this.isSupported = false;
    }
  }

  /**
   * Set service language ('English' | 'Hindi' | 'Marathi').
   */
  setLanguage(lang) {
    if (!lang) return;
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = this.getLanguageTag(lang);
    }
  }

  /**
   * Start listening for voice input.
   * Returns Promise resolving to final recognized text string.
   */
  async startListening() {
    if (!this.isSupported) {
      const errCode = 'UNSUPPORTED_BROWSER';
      const msg = 'Speech recognition is not supported in this browser. Please use text questions or quick buttons.';
      this._setState('error', { code: errCode, message: msg });
      this.onError(errCode, msg);
      throw new Error(msg);
    }

    if (this.isListening) {
      this.stopListening();
    }

    // Reset transcripts
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.lastError = null;

    // Explicit microphone permission check / warmup if getUserMedia available
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close warmup tracks immediately so SpeechRecognition has sole control
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr) {
        const errCode = 'PERMISSION_DENIED';
        const msg = 'Microphone permission was denied. Please allow microphone access in your browser address bar.';
        this._setState('error', { code: errCode, message: msg });
        this.onError(errCode, msg);
        throw new Error(msg);
      }
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      const handleResult = (transcript, isFinal) => {
        if (isFinal && transcript) {
          resolved = true;
          cleanup();
          resolve(transcript);
        }
      };

      const handleError = (code, msg) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error(msg));
        }
      };

      const handleState = (newState, meta) => {
        if (newState === 'success' && meta && meta.transcript && !resolved) {
          resolved = true;
          cleanup();
          resolve(meta.transcript);
        } else if (newState === 'idle' && !resolved) {
          resolved = true;
          cleanup();
          if (this.finalTranscript) {
            resolve(this.finalTranscript);
          } else {
            reject(new Error('No speech detected before recognition stopped.'));
          }
        }
      };

      const origOnResult = this.onResult;
      const origOnError = this.onError;
      const origOnStateChange = this.onStateChange;

      this.onResult = (text, isFin) => {
        origOnResult(text, isFin);
        handleResult(text, isFin);
      };

      this.onError = (code, msg) => {
        origOnError(code, msg);
        handleError(code, msg);
      };

      this.onStateChange = (st, meta) => {
        origOnStateChange(st, meta);
        handleState(st, meta);
      };

      const cleanup = () => {
        this.onResult = origOnResult;
        this.onError = origOnError;
        this.onStateChange = origOnStateChange;
      };

      try {
        if (this.recognition) {
          this.recognition.lang = this.getLanguageTag(this.language);
          this.recognition.start();
        } else {
          handleError('UNINITIALIZED', 'Speech recognition engine not ready.');
        }
      } catch (startErr) {
        handleError('START_FAILED', startErr.message || 'Failed to start speech recognition.');
      }
    });
  }

  /**
   * Stop listening and trigger finalization of captured speech.
   */
  stopListening() {
    this._clearSilenceTimer();
    if (this.recognition && this.isListening) {
      try {
        this._setState('processing', { transcript: this.interimTranscript });
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
  }

  /**
   * Cancel listening immediately and discard any captured speech.
   */
  cancelListening() {
    this._clearSilenceTimer();
    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort();
      } catch (e) {}
    }
    this.isListening = false;
    this.interimTranscript = '';
    this.finalTranscript = '';
    this._setState('idle', { reason: 'cancelled' });
  }

  _startSilenceTimer() {
    this._clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.isListening) {
        if (this.interimTranscript || this.finalTranscript) {
          this.stopListening();
        } else {
          this.cancelListening();
          const errCode = 'NO_SPEECH';
          const msg = 'Listening timed out. No speech was detected.';
          this._setState('error', { code: errCode, message: msg });
          this.onError(errCode, msg);
        }
      }
    }, this.silenceTimeoutMs);
  }

  _clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  _setState(newState, meta = {}) {
    this.state = newState;
    this.onStateChange(newState, meta);
  }

  /**
   * Diagnostics for status and audit reporting.
   */
  getDiagnostics() {
    return {
      isSupported: this.isSupported,
      state: this.state,
      isListening: this.isListening,
      language: this.language,
      languageTag: this.getLanguageTag(),
      hasMicrophonePermission: this.lastError !== 'PERMISSION_DENIED',
      lastError: this.lastError
    };
  }
}
