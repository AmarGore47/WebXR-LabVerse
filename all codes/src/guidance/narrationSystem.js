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

    // Web Audio API context for pleasant low-latency sound cues
    this.audioCtx = null;
  }

  /**
   * Must be called after a user gesture (Enter VR, Start Guided, etc.)
   * to comply with browser autoplay policies.
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.audioCtx = new AudioCtx();
        } catch (e) {
          console.warn('[NarrationSystem] AudioContext init failed:', e);
        }
      }
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      this.available = true;
    } else {
      this.available = false;
      this.onCaptionUpdate(
        '🔇 Audio narration not available in this browser. Captions will be shown.',
        'warning'
      );
    }
  }

  _ensureAudioCtx() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.audioCtx = new AudioCtx();
        } catch (e) {}
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
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
   * Speak a text string.
   * @param {string} text - The text to speak.
   * @param {string} [captionText] - Override caption text (defaults to text).
   * @param {object} [opts] - Optional overrides: { rate, volume, lang }.
   */
  speak(text, captionText, opts = {}) {
    if (!text) return;
    if (!this.enabled) {
      // Still show caption even if audio disabled
      this._showCaption(captionText || text);
      return;
    }

    if (!this.initialized) {
      this._showCaption(captionText || text);
      return;
    }

    // Cancel any currently playing narration
    this.stop();

    this._showCaption(captionText || text);

    if (!this.available || !this.synth) return;

    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = opts.rate || this.rate;
      utter.volume = opts.volume !== undefined ? opts.volume : this.volume;
      utter.lang = opts.lang || this.lang;

      utter.onerror = (e) => {
        // Non-fatal: log but don't crash
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('[NarrationSystem] SpeechSynthesis error:', e.error);
        }
      };

      utter.onend = () => {
        this.currentUtterance = null;
      };

      this.currentUtterance = utter;
      this.synth.speak(utter);
    } catch (err) {
      console.warn('[NarrationSystem] speak() failed:', err);
    }
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
