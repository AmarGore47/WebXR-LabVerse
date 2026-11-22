/**
 * narrationSystem.js
 * Educational audio narration using Web Speech API / SpeechSynthesis.
 *
 * Design rules:
 * - No external audio files or paid services.
 * - SpeechSynthesis is optional; app must not crash if unavailable.
 * - Audio only after a user gesture (init() must be called after gesture).
 * - Never narrate repeatedly every animation frame.
 * - Cancel old narration before starting new one.
 * - Rate 0.85–0.95 for comfortable listening.
 * - Always pair narration with captions (text).
 * - Structured for Marathi addition later.
 */

import { sound, getSharedAudioContext } from '../audio.js';

export class NarrationSystem {
  constructor({ onCaptionUpdate } = {}) {
    this.enabled = true;
    this.initialized = false; // Must init after user gesture
    this.onCaptionUpdate = onCaptionUpdate || (() => {});
    this.synth = null;
    this.available = false;
    this.currentUtterance = null;
    this.volume = 0.8;
    this.rate = 0.9;
    this.lang = 'en-US';

    // Caption & narration state
    this.captionText = '';
    this.narrationCooldown = new Map(); // eventKey → timestamp (prevent rapid repeat)
    this.cooldownMs = 2000;

    // High-fidelity pre-rendered audio cache for WebXR & Meta Quest 3S
    this.audioCache = new Map();
    this.currentAudioSource = null;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      this.available = true;
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', () => {
          if (this.synth && typeof this.synth.getVoices === 'function') {
            this.synth.getVoices();
          }
        });
      }
    }
  }

  /**
   * Returns diagnostic summary for audio testing
   */
  getDiagnostics() {
    const voices = (this.synth && typeof this.synth.getVoices === 'function') ? this.synth.getVoices() : [];
    const best = this._getBestVoice();
    return {
      enabled: this.enabled,
      initialized: this.initialized,
      hasSpeechSynthesis: this.available,
      voicesCount: voices ? voices.length : 0,
      bestVoice: best ? best.name : 'None (Quest WebXR Mode)'
    };
  }

  _getBestVoice() {
    if (!this.synth || typeof this.synth.getVoices !== 'function') return null;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Prefer offline, zero-latency local voices (David, Zira, Mark, or localService=true)
    const localEn = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.localService === true ||
          v.name.includes('Desktop') ||
          v.name.includes('David') ||
          v.name.includes('Zira') ||
          v.name.includes('Mark'))
    );
    if (localEn) return localEn;

    // 2. Any English voice
    const anyEn = voices.find((v) => v.lang.startsWith('en'));
    if (anyEn) return anyEn;

    return voices[0] || null;
  }

  playMilestoneChime() {
    this.playSuccessMilestone();
  }

  playObservationSuccessChime() {
    this.playSuccessMilestone();
  }

  playWarningChime() {
    this.playErrorSound();
  }

  /**
   * Must be called after a user gesture (Enter VR, Start Guided, etc.)
   * to comply with browser autoplay policies.
   */
  init() {
    this.initialized = true;

    // Use unified singleton Web Audio context to prevent hitting browser context limits
    this.audioCtx = this._ensureAudioCtx();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      this.available = true;
      try {
        if (this.synth.speaking || this.synth.pending) {
          this.synth.cancel();
        }
        if (typeof this.synth.resume === 'function') {
          this.synth.resume();
        }
      } catch (e) {}
    } else {
      this.available = false;
      this.onCaptionUpdate(
        '🔇 Audio narration not available in this browser. Captions will be shown.',
        'warning'
      );
    }
  }

  _ensureAudioCtx() {
    this.audioCtx = getSharedAudioContext();
    return this.audioCtx;
  }

  /**
   * Harmonious ascending chime on valid wire connection.
   */
  playWireChime() {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 783.99]; // C5 -> G5
    notes.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.22 * this.volume, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      } catch (err) {}
    });
  }

  /**
   * Triumphant chime for all 7 wires or Ohm's Law verification.
   */
  playSuccessMilestone() {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    chord.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.65);
      } catch (err) {}
    });
  }

  /**
   * Harmonious sci-fi spatial orientation chimes for 3D walkthrough phases.
   */
  playPhaseChime(phase) {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      if (phase === 'welcome') {
        // Sci-Fi C-Major harmonic sweep [C5, E5, G5, C6]
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0, now + idx * 0.07);
          gain.gain.linearRampToValueAtTime(0.18 * this.volume, now + idx * 0.07 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.38);
        });
      } else if (phase === 'objectives') {
        // High-tech harmonic dual-tone chime [G5, D6]
        const freqs = [783.99, 1174.66];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0, now + idx * 0.09);
          gain.gain.linearRampToValueAtTime(0.16 * this.volume, now + idx * 0.09 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.38);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.40);
        });
      } else if (phase === 'blueprint' || phase === 'ready') {
        // Sci-Fi energy activation chord [E5, B5, E6]
        const freqs = [659.25, 987.77, 1318.51];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0, now + idx * 0.06);
          gain.gain.linearRampToValueAtTime(0.20 * this.volume, now + idx * 0.06 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.42);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.45);
        });
      }
    } catch (e) {}
  }

  /**
   * Warning audio feedback for invalid connections.
   */
  playErrorSound() {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.2);

      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch (err) {}
  }

  /**
   * High soft blip when clicking an orientation card or step.
   */
  playStepChime() {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15 * this.volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (err) {}
  }

  /**
   * Crisp digital camera / multimeter observation capture sound.
   */
  playRecordChime() {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Dual-tone high pitch capture beep
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1174.66, now); // D6
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760.0, now + 0.04); // A6

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.08);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.20);
    } catch (err) {}
  }

  /**
   * Solid mechanical relay / plug key insertion sound.
   */
  playSwitchClick() {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(0.28 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.10);
    } catch (err) {}
  }

  /**
   * Crisp button click sound.
   */
  playButtonBeep() {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      gain.gain.setValueAtTime(0.16 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (err) {}
  }

  /**
   * Dynamic tonal frequency feedback when rheostat resistance changes.
   * Lower resistance (higher current) gives higher energetic pitch.
   */
  playRheoChirp(resistance = 12.0) {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const freq = 340 + (20.0 - resistance) * 30; // 340 Hz (20Ω) to 925 Hz (0.5Ω)
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (err) {}
  }

  _resolveAudioKey(text, captionText = '', opts = {}) {
    if (opts.audioKey) return opts.audioKey;
    const combined = `${text} ${captionText}`.toLowerCase();

    if (combined.includes('step 1') || combined.includes('positive terminal of the battery')) return 'step_1';
    if (combined.includes('step 2') || combined.includes('positive terminal of the ammeter')) return 'step_2';
    if (combined.includes('step 3') || combined.includes('input of the rheostat')) return 'step_3';
    if (combined.includes('step 4') || combined.includes('output of the rheostat')) return 'step_4';
    if (combined.includes('step 5') || combined.includes('right terminal of the resistor')) return 'step_5';
    if (combined.includes('step 6') || combined.includes('positive terminal of the voltmeter')) return 'step_6';
    if (combined.includes('step 7') || combined.includes('negative terminal of the voltmeter')) return 'step_7';

    if (combined.includes('audio test successful')) return 'audio_test';
    if (combined.includes('welcome to the ohm') || combined.includes('virtual practical')) return 'welcome';
    if (combined.includes('correct connection')) return 'correct_wire';
    if (combined.includes('not correct') || combined.includes('wrong connection')) return 'wrong_connection';
    if (combined.includes('excellent! the circuit is now complete') || combined.includes('close the plug key and begin')) return 'circuit_complete_msg';
    if (combined.includes('circuit is complete')) return 'circuit_complete';
    if (combined.includes('current is now flowing') || combined.includes('practical started')) return 'current_start';
    if (combined.includes('practical stopped') || combined.includes('key opened')) return 'practical_stopped';
    if (combined.includes('connect all 7') || combined.includes('connect all seven')) return 'incomplete_circuit';
    if (combined.includes('first observation')) return 'first_reading';
    if (combined.includes('observation #2') || combined.includes('observation 2')) return 'reading_2';
    if (combined.includes('observation #3') || combined.includes('observation 3')) return 'reading_3';
    if (combined.includes('observation #4') || combined.includes('observation 4')) return 'reading_4';
    if (combined.includes('5 observations complete') || combined.includes('all 5 observations')) return 'reading_complete';
    if (combined.includes('rheostat resistance increases') || combined.includes('safely vary the current')) return 'rheostat_adjust';
    if (combined.includes('reading recorded')) return 'reading_saved';
    if (combined.includes('straight line') || combined.includes('ohm\'s law is verified')) return 'five_readings';
    if (combined.includes('removed while current was flowing')) return 'wire_removed_active';
    if (combined.includes('pinch again to confirm')) return 'confirm_remove';
    if (combined.includes('wire removed') || combined.includes('wire undone')) return 'wire_removed';

    // Lab Assistant voice lines
    if (combined.includes('throwing things at me') || combined.includes('ouch!')) return 'assistant_ouch';
    if (combined.includes('stop throwing')) return 'assistant_stop';
    if (combined.includes('really hurts') || combined.includes('pay attention')) return 'assistant_hurts';
    if (combined.includes('target practice')) return 'assistant_not_target';
    if (combined.includes('turn off the main battery') || combined.includes('one more item')) return 'assistant_enough';
    if (combined.includes('direct hit') || combined.includes('aaargh')) return 'assistant_direct_hit';
    if (combined.includes('professor')) return 'assistant_professor';
    if (combined.includes('really stung') || combined.includes('aim right there')) return 'assistant_stung';
    if (combined.includes('mercy') || combined.includes('sympathy')) return 'assistant_mercy';

    return null;
  }

  async _playAudioFile(audioKey) {
    const ctx = this._ensureAudioCtx();
    if (!ctx) return false;

    try {
      let buffer = this.audioCache.get(audioKey);
      if (!buffer) {
        const urls = [
          `./audio/narration/${audioKey}.mp3`,
          `./audio/narration/${audioKey}.wav`
        ];
        for (const url of urls) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              buffer = await ctx.decodeAudioData(arrayBuf);
              this.audioCache.set(audioKey, buffer);
              break;
            }
          } catch (fetchErr) {}
        }
      }

      if (!buffer) return false;

      if (this.currentAudioSource) {
        try {
          this.currentAudioSource.stop();
          this.currentAudioSource.disconnect();
        } catch (e) {}
        this.currentAudioSource = null;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.volume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      source.onended = () => {
        if (this.currentAudioSource === source) {
          this.currentAudioSource = null;
        }
      };

      this.currentAudioSource = source;
      source.start(0);
      return true;
    } catch (err) {
      console.warn('[NarrationSystem] Failed to play audio file:', err);
      return false;
    }
  }

  /**
   * Speak a text string.
   * @param {string} text - The text to speak.
   * @param {string} [captionText] - Override caption text (defaults to text).
   * @param {object} [opts] - Optional overrides: { rate, volume, lang, audioKey }.
   */
  speak(text, captionText, opts = {}) {
    if (!text) return;
    if (!this.enabled) {
      // Still show caption even if audio disabled
      this._showCaption(captionText || text);
      return;
    }

    if (!this.initialized) {
      this.init();
    }

    // Cancel any currently playing narration
    this.stop();

    this._showCaption(captionText || text);

    // 1. High-Fidelity Pre-Rendered Spoken Voice (guaranteed clear audio on Meta Quest 3S)
    const audioKey = this._resolveAudioKey(text, captionText, opts);
    if (audioKey) {
      this._playAudioFile(audioKey).then((played) => {
        if (!played) {
          this._fallbackSpeak(text, opts);
        }
      });
      return;
    }

    // 2. Dynamic TTS fallback
    this._fallbackSpeak(text, opts);
  }

  _fallbackSpeak(text, opts = {}) {
    if (!this.available || !this.synth) {
      this._playSpeechChimeTone(text);
      return;
    }

    try {
      if (typeof this.synth.resume === 'function') {
        this.synth.resume();
      }

      const voice = this._getBestVoice();
      if (!voice) {
        // Meta Quest 3S / Quest Browser has 0 system voices installed:
        // Use soft melodic dual-tone chime accompaniment
        this._playSpeechChimeTone(text);
        return;
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = opts.rate || this.rate;
      utter.volume = opts.volume !== undefined ? opts.volume : this.volume;
      utter.lang = opts.lang || this.lang;
      utter.voice = voice;

      utter.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('[NarrationSystem] SpeechSynthesis error, falling back to chime:', e.error);
          this._playSpeechChimeTone(text);
        }
        this.currentUtterance = null;
      };

      utter.onend = () => {
        this.currentUtterance = null;
      };

      this.currentUtterance = utter;

      // Watchdog timeout to prevent speech queue from ever hanging
      setTimeout(() => {
        if (this.currentUtterance === utter) {
          this.currentUtterance = null;
        }
      }, 7500);

      setTimeout(() => {
        try {
          if (this.synth && this.currentUtterance === utter) {
            this.synth.speak(utter);
          }
        } catch (err) {
          console.warn('[NarrationSystem] speak() failed, falling back:', err);
          this._playSpeechChimeTone(text);
        }
      }, 10);
    } catch (err) {
      console.warn('[NarrationSystem] speak() failed, falling back to chime:', err);
      this._playSpeechChimeTone(text);
    }
  }

  /**
   * Pleasant synthesized robotic speech accompaniment for VR environments.
   */
  _playSpeechChimeTone(text) {
    if (!this.enabled) return;
    const ctx = this._ensureAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Generates a quick pleasant 2-tone melodic chirp (e.g. 587Hz -> 880Hz)
      const isQuestion = text.includes('?');
      const isExclamation = text.includes('!');
      const freq1 = isQuestion ? 493.88 : (isExclamation ? 659.25 : 523.25);
      const freq2 = isQuestion ? 783.99 : (isExclamation ? 1046.50 : 659.25);

      [freq1, freq2].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.18 * this.volume, now + i * 0.08 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.18);
      });
    } catch (e) {}
  }

  /**
   * Speak with a cooldown key to prevent repeated rapid narration.
   * @param {string} eventKey - Unique identifier for this event.
   * @param {string} text - Text to narrate.
   * @param {string} [captionText] - Caption override.
   * @param {number} [cooldownMs] - Override cooldown (default: this.cooldownMs).
   */
  speakOnce(eventKey, text, captionText, cooldownMs) {
    const cooldown = cooldownMs !== undefined ? cooldownMs : this.cooldownMs;
    const lastTime = this.narrationCooldown.get(eventKey) || 0;
    const now = Date.now();
    if (now - lastTime < cooldown) return;
    this.narrationCooldown.set(eventKey, now);
    this.speak(text, captionText);
  }

  /**
   * Replay current caption text as audio.
   */
  replay() {
    if (this.captionText) {
      // Reset cooldown for replay
      const text = this.captionText;
      this.stop();
      this.speak(text);
    }
  }

  /**
   * Stop any in-progress narration.
   */
  stop() {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch (e) {}
      this.currentAudioSource = null;
    }
    if (this.synth && this.available) {
      try {
        this.synth.cancel();
      } catch (e) {
        // Ignore
      }
    }
    this.currentUtterance = null;
  }

  /**
   * Enable or disable audio narration.
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stop();
    }
  }

  /**
   * Set volume (0.0–1.0).
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, Number(vol)));
  }

  /**
   * Set speech rate (0.5–2.0, recommended 0.85–0.95).
   */
  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.0, Number(rate)));
  }

  _showCaption(text) {
    this.captionText = text;
    this.onCaptionUpdate(text);
  }
}
