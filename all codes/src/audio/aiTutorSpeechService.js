/**
 * aiTutorSpeechService.js
 * Text-to-Speech (TTS) synthesizer service for LabVerse AI Virtual Tutor.
 *
 * Implements natural voice responses for Maharashtra SSC Class 10 Physics students:
 * - Reads responses returned by the Gemini AI Tutor.
 * - Multilingual voice support: English (en-IN / en-US), Hindi (hi-IN), Marathi (mr-IN).
 * - Full playback controls: play, pause, resume, stop.
 * - Prevents overlapping speech by coordinating with NarrationSystem and cancelling pending speech.
 * - Synchronizes with LabAssistant avatar state machine (speaking -> idle).
 * - Robust error handling, missing voice fallbacks, and Chrome long-utterance keep-alive.
 */

import { sound, getSharedAudioContext } from '../audio.js';

export class AITutorSpeechService {
  /**
   * @param {object} options
   * @param {object} [options.assistant] - LabAssistant instance for state synchronization
   * @param {object} [options.narration] - NarrationSystem instance for mutual exclusivity
   * @param {string} [options.language='English'] - 'English' | 'Hindi' | 'Marathi'
   * @param {number} [options.rate=0.92] - Speech rate (0.85 to 1.0)
   * @param {number} [options.pitch=1.0] - Speech pitch
   * @param {number} [options.volume=1.0] - Volume (0.0 to 1.0)
   * @param {function} [options.onStateChange] - (state: string) => void
   */
  constructor(options = {}) {
    this.assistant = options.assistant || null;
    this.narration = options.narration || null;
    this.language = options.language || 'English';
    this.rate = options.rate ?? 0.92;
    this.pitch = options.pitch ?? 1.0;
    this.volume = options.volume ?? 1.0;
    this.onStateChange = options.onStateChange || (() => {});

    // State: 'idle' | 'speaking' | 'paused' | 'error'
    this.state = 'idle';
    this.synth = null;
    this.available = false;
    this.currentUtterance = null;
    this.availableVoices = [];
    this.keepAliveInterval = null;
    this.currentText = '';

    // Language code map (BCP-47)
    this.langMap = {
      English: ['en-IN', 'en-GB', 'en-US', 'en'],
      Hindi: ['hi-IN', 'hi'],
      Marathi: ['mr-IN', 'mr']
    };

    this._initSynth();
  }

  _initSynth() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      this.available = true;

      // Populate voices when loaded
      this._loadVoices();
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', () => this._loadVoices());
      } else if ('onvoiceschanged' in this.synth) {
        this.synth.onvoiceschanged = () => this._loadVoices();
      }
    } else {
      this.available = false;
    }
  }

  _loadVoices() {
    if (!this.synth || typeof this.synth.getVoices !== 'function') return;
    try {
      this.availableVoices = this.synth.getVoices() || [];
    } catch (e) {
      this.availableVoices = [];
    }
  }

  /**
   * Set assistant avatar reference.
   */
  setAssistant(assistant) {
    this.assistant = assistant;
  }

  /**
   * Set narration system reference.
   */
  setNarration(narration) {
    this.narration = narration;
  }

  /**
   * Set tutor voice language ('English' | 'Hindi' | 'Marathi').
   */
  setLanguage(lang) {
    if (!lang) return;
    this.language = lang;
  }

  /**
   * Find the most appropriate speech synthesis voice for the target language.
   */
  getBestVoice(lang = this.language) {
    if (!this.available || this.availableVoices.length === 0) {
      this._loadVoices();
    }
    const tags = this.langMap[lang] || this.langMap.English;

    // 1. Try exact language match from target tags
    for (const tag of tags) {
      const match = this.availableVoices.find((v) =>
        v.lang && (v.lang.toLowerCase() === tag.toLowerCase() || v.lang.toLowerCase().replace('_', '-').startsWith(tag.toLowerCase()))
      );
      if (match) return match;
    }

    // 2. Try partial match by language prefix (e.g. 'hi' for Hindi)
    const prefix = tags[0].split('-')[0];
    const prefixMatch = this.availableVoices.find((v) =>
      v.lang && v.lang.toLowerCase().startsWith(prefix)
    );
    if (prefixMatch) return prefixMatch;

    // 3. Fallback: Indian English voice if Hindi/Marathi not installed
    const indianEn = this.availableVoices.find((v) =>
      v.lang && (v.lang.toLowerCase() === 'en-in' || v.name.toLowerCase().includes('india'))
    );
    if (indianEn) return indianEn;

    // 4. Any English voice
    const anyEn = this.availableVoices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
    if (anyEn) return anyEn;

    // 5. Default device voice
    return this.availableVoices[0] || null;
  }

  /**
   * Speak the educational response text.
   * Cancels prior speech, prevents overlap, and synchronizes avatar state.
   */
  async speak(text, options = {}) {
    if (!text || typeof text !== 'string') return false;
    this.currentText = text;

    // 1. Prevent overlapping speech: Cancel any existing SpeechSynthesis & NarrationSystem
    this.stop();
    if (this.narration && typeof this.narration.stop === 'function') {
      this.narration.stop();
    }

    // 2. Ensure Web Audio context is active
    try {
      sound.unlock();
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (e) {}

    // 3. Fallback if SpeechSynthesis is unavailable
    if (!this.available || !this.synth) {
      console.warn('[AITutorSpeechService] SpeechSynthesis unavailable in browser.');
      this._setState('error', { reason: 'SYNTH_UNAVAILABLE' });
      return false;
    }

    const lang = options.language || this.language;
    const rate = options.rate ?? this.rate;
    const pitch = options.pitch ?? this.pitch;
    const volume = options.volume ?? this.volume;

    return new Promise((resolve) => {
      try {
        if (typeof this.synth.resume === 'function') {
          this.synth.resume();
        }

        const utter = new window.SpeechSynthesisUtterance(text);
        utter.rate = rate;
        utter.pitch = pitch;
        utter.volume = volume;

        const bestVoice = this.getBestVoice(lang);
        if (bestVoice) {
          utter.voice = bestVoice;
          utter.lang = bestVoice.lang;
        } else {
          utter.lang = this.langMap[lang] ? this.langMap[lang][0] : 'en-IN';
        }

        this.currentUtterance = utter;

        utter.onstart = () => {
          this._setState('speaking');
          this._startKeepAlive();
          if (this.assistant && typeof this.assistant.setTutorState === 'function') {
            this.assistant.setTutorState('speaking', { text });
          }
        };

        utter.onend = () => {
          this._stopKeepAlive();
          this.currentUtterance = null;
          this._setState('idle');
          if (this.assistant && typeof this.assistant.setTutorState === 'function') {
            this.assistant.setTutorState('idle');
          }
          resolve(true);
        };

        utter.onerror = (e) => {
          this._stopKeepAlive();
          this.currentUtterance = null;
          // Ignore benign cancellations when student clicks Stop or asks new question
          if (e && (e.error === 'interrupted' || e.error === 'canceled')) {
            this._setState('idle');
            if (this.assistant && typeof this.assistant.setTutorState === 'function') {
              this.assistant.setTutorState('idle');
            }
            resolve(false);
            return;
          }

          console.warn('[AITutorSpeechService] Utterance error:', e ? e.error : 'unknown');
          this._setState('error', { error: e ? e.error : 'unknown' });
          if (this.assistant && typeof this.assistant.setTutorState === 'function') {
            this.assistant.setTutorState('idle');
          }
          resolve(false);
        };

        utter.onpause = () => {
          this._setState('paused');
        };

        utter.onresume = () => {
          this._setState('speaking');
        };

        // Small delay avoids browser thread collision
        setTimeout(() => {
          if (this.synth && this.currentUtterance === utter) {
            this.synth.speak(utter);
          }
        }, 20);

      } catch (err) {
        console.warn('[AITutorSpeechService] speak() invocation failed:', err);
        this._stopKeepAlive();
        this._setState('error', { error: err.message });
        if (this.assistant && typeof this.assistant.setTutorState === 'function') {
          this.assistant.setTutorState('idle');
        }
        resolve(false);
      }
    });
  }

  /**
   * Pause speech playback.
   */
  pause() {
    if (this.synth && this.state === 'speaking') {
      try {
        this.synth.pause();
        this._setState('paused');
      } catch (e) {}
    }
  }

  /**
   * Resume speech playback.
   */
  resume() {
    if (this.synth && this.state === 'paused') {
      try {
        this.synth.resume();
        this._setState('speaking');
      } catch (e) {}
    }
  }

  /**
   * Stop speech playback and reset avatar to idle.
   */
  stop() {
    this._stopKeepAlive();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.currentUtterance = null;
    this._setState('idle');
    if (this.assistant && typeof this.assistant.setTutorState === 'function') {
      this.assistant.setTutorState('idle');
    }
  }

  /**
   * Chrome browser bug workaround: speech synthesis freezes on utterances > 15s.
   * Periodically pausing and resuming keeps the speech synthesis process alive.
   */
  _startKeepAlive() {
    this._stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.synth && this.state === 'speaking') {
        try {
          this.synth.pause();
          this.synth.resume();
        } catch (e) {}
      }
    }, 10000);
  }

  _stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  _setState(newState, meta = {}) {
    this.state = newState;
    this.onStateChange(newState, meta);
  }

  /**
   * Diagnostics for status and testing.
   */
  getDiagnostics() {
    const voice = this.getBestVoice();
    return {
      available: this.available,
      state: this.state,
      language: this.language,
      voicesCount: this.availableVoices.length,
      selectedVoice: voice ? voice.name : 'None',
      selectedVoiceLang: voice ? voice.lang : 'None',
      isSpeaking: this.state === 'speaking',
      rate: this.rate,
      volume: this.volume
    };
  }
}
