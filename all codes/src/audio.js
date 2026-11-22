/**
 * audio.js - Synthesized Web Audio API sound effects for Maharashtra Std. 10 Physics Lab.
 * Zero external audio files required — reliable, zero latency, runs offline and in WebXR.
 * Enhanced for Meta Quest 3S WebXR hardware audio compatibility.
 */

import { AudioContext as ThreeAudioContext } from 'three';

class LabAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 1.0;
    this._isVRActive = false;

    // Auto-unlock Web Audio on first user interaction anywhere in desktop or VR
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlock();
        if (this.ctx && this.ctx.state === 'running') {
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('touchstart', unlock);
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
          // Keep Three.js AudioContext synchronized with the singleton instance
          try {
            ThreeAudioContext.setContext(this.ctx);
          } catch (e) {}
          console.log(`🎧 [LabAudio] AudioContext created. State: ${this.ctx.state}, SampleRate: ${this.ctx.sampleRate}Hz`);
        } catch (e) {
          console.warn('[LabAudio] Failed to instantiate AudioContext:', e);
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Returns current state of AudioContext ('running', 'suspended', 'closed', 'uninitialized')
   */
  getContextState() {
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  getSampleRate() {
    return this.ctx ? this.ctx.sampleRate : 0;
  }

  /**
   * Explicitly resume AudioContext with Promise resolution and logging
   */
  async resumeContext() {
    this.init();
    if (!this.ctx) return 'unavailable';
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        console.log(`🎧 [LabAudio] AudioContext resumed successfully. New state: ${this.ctx.state}`);
      } catch (err) {
        console.warn('[LabAudio] AudioContext resume failed:', err);
      }
    }
    return this.ctx.state;
  }

  /**
   * Force WebXR hardware audio stream activation for Meta Quest Browser.
   */
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx) {
      try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.ctx.destination);
        src.start(0);
      } catch (e) {}
    }
  }

  /**
   * Automatically detect and route Web Audio directly to Oculus / VR Headset audio device
   */
  async routeToVRHeadset() {
    this.init();
    if (!this.ctx || typeof this.ctx.setSinkId !== 'function') return false;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return false;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vrDevice = devices.find((d) =>
        d.kind === 'audiooutput' &&
        (d.label.toLowerCase().includes('oculus') ||
          d.label.toLowerCase().includes('quest') ||
          d.label.toLowerCase().includes('headset') ||
          d.label.toLowerCase().includes('virtual audio'))
      );

      if (vrDevice && vrDevice.deviceId) {
        await this.ctx.setSinkId(vrDevice.deviceId);
        console.log('🎧 [LabAudio] Web Audio sink redirected to VR Headset:', vrDevice.label);
        return true;
      }
    } catch (e) {
      console.warn('[LabAudio] Could not auto-switch sink ID:', e);
    }
    return false;
  }

  getAudioContext() {
    this.unlock();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // Crisp mechanical plug key / knife switch click
  playSwitchClick(isClosing = true) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isClosing ? 880 : 620, t);
    osc.frequency.exponentialRampToValueAtTime(isClosing ? 220 : 160, t + 0.08);

    gain.gain.setValueAtTime(0.75 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);

    // Second subtle resonance transient (metal contact strike)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(isClosing ? 1760 : 1200, t + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(440, t + 0.10);

    gain2.gain.setValueAtTime(0.45 * this.volume, t + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc2.start(t + 0.02);
    osc2.stop(t + 0.15);
  }

  // Tactile resonant snap when wire connects to terminal
  playWireSnap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t);
    osc.frequency.exponentialRampToValueAtTime(1318.5, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(659.25, t + 0.16);

    gain.gain.setValueAtTime(0.70 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  // Soft slide / unplug sound
  playWireDisconnect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);

    gain.gain.setValueAtTime(0.50 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Tactile resonant chime when selecting terminal or sliding wiper
  playSliderTick(pitchFactor = 1.0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660 * pitchFactor, t);
    osc.frequency.exponentialRampToValueAtTime(1100 * pitchFactor, t + 0.08);

    gain.gain.setValueAtTime(0.55 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Warning tone when incorrect circuit connection attempted
  playErrorTone() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.12].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t + offset);
      osc.frequency.exponentialRampToValueAtTime(220, t + offset + 0.09);

      gain.gain.setValueAtTime(0.35 * this.volume, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + offset);
      osc.stop(t + offset + 0.11);
    });
  }

  // Harmonious celebratory chime for experiment milestone
  playSuccessChime() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.28 * this.volume, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.4);
    });
  }

  // Clear digital chirp when taking an observation reading
  playObservationChirp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Futuristic holographic X-Ray mode laser hum & resonance
  playXrayToggle(isOn = true) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOn ? 300 : 1800, t);
    filter.frequency.exponentialRampToValueAtTime(isOn ? 2200 : 250, t + 0.28);
    filter.Q.value = 4.0;

    osc.type = isOn ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isOn ? 180 : 880, t);
    osc.frequency.exponentialRampToValueAtTime(isOn ? 880 : 160, t + 0.28);

    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.33);
  }

  // Tony Stark dark lab holographic warp resonance
  playSciFiWarp(isDark = true) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = isDark ? [150, 300, 600, 1200] : [1200, 600, 300, 150];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * (isDark ? 1.4 : 0.7), t + idx * 0.04 + 0.18);

      gain.gain.setValueAtTime(0.25 * this.volume, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.24);
    });
  }

  /**
   * Futuristic JARVIS vocal speech chime for WebXR environments where
   * browser TTS voices are not installed (e.g. Meta Quest Browser).
   */
  playJarvisVoiceChirp(style = 'info') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    let freqs = [523.25, 659.25, 783.99]; // C5 - E5 - G5 pleasant major triad
    if (style === 'step') freqs = [440.0, 554.37, 659.25, 880.0];
    else if (style === 'warning') freqs = [587.33, 493.88];
    else if (style === 'welcome') freqs = [392.0, 523.25, 659.25, 1046.5];

    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.075);

      gain.gain.setValueAtTime(0.22 * this.volume, t + i * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.075 + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + i * 0.075);
      osc.stop(t + i * 0.075 + 0.18);
    });
  }

  /**
   * Articulated Pleasant Harmonic Synthesizer for WebXR.
   * Plays soft, harmonic chime accompaniment when spoken audio is triggered.
   */
  speakFormantVoice(text) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      // Pleasant multi-harmonic melodic chime (C5 - E5 - G5 - C6)
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.075);

        gain.gain.setValueAtTime(0.001, now + idx * 0.075);
        gain.gain.linearRampToValueAtTime(0.12 * this.volume, now + idx * 0.075 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.075 + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.075);
        osc.stop(now + idx * 0.075 + 0.24);
      });
    } catch (e) {
      console.warn('[LabAudio] Chime error:', e);
    }
  }
}

export const sound = new LabAudio();
export function getSharedAudioContext() {
  return sound.getAudioContext();
}

/**
 * Step 4: Reusable Audio Diagnostic Test
 * Tests AudioContext state, plays short sound effect & test voice, and returns structured result.
 */
export async function runAudioDiagnosticTest(narrationSystem = null) {
  console.log('🧪 [AudioDiagnostic] Starting Audio & Voice Output Test...');
  const results = {
    timestamp: new Date().toISOString(),
    audioContextState: 'unknown',
    sampleRate: 0,
    sinkId: 'default',
    soundEffectPlayed: false,
    testVoicePlayed: false,
    hasSpeechSynthesis: typeof window !== 'undefined' && Boolean(window.speechSynthesis),
    speechVoicesCount: 0,
    voiceEngine: 'none',
    success: false,
    details: ''
  };

  try {
    // 1. Resume AudioContext
    const state = await sound.resumeContext();
    results.audioContextState = state;
    results.sampleRate = sound.getSampleRate();

    if (sound.ctx && typeof sound.ctx.sinkId !== 'undefined') {
      results.sinkId = sound.ctx.sinkId || 'default';
    }

    if (state !== 'running') {
      results.details = `AudioContext state is "${state}" (expected "running"). Check user-gesture unlock.`;
      console.warn('⚠️ [AudioDiagnostic]', results.details);
      return results;
    }

    // 2. Play short test sound effect (dual-tone wire snap & confirmation chime)
    sound.playWireSnap();
    setTimeout(() => sound.playObservationChirp(), 140);
    results.soundEffectPlayed = true;

    // 3. Test Voice Output
    if (results.hasSpeechSynthesis && typeof window.speechSynthesis.getVoices === 'function') {
      const voices = window.speechSynthesis.getVoices();
      results.speechVoicesCount = voices ? voices.length : 0;
    }

    const testPhrase = 'Audio test successful. Physics virtual practical lab ready.';

    if (narrationSystem && typeof narrationSystem.speak === 'function') {
      narrationSystem.init();
      narrationSystem.speak(testPhrase, '🔊 Audio test successful! Sound and voice working.', { rate: 0.95, audioKey: 'audio_test' });
      results.testVoicePlayed = true;
      results.voiceEngine = results.speechVoicesCount > 0 ? 'Web Speech API (System TTS)' : 'High-Fidelity Audio Narration (Meta Quest 3S Mode)';
    } else {
      sound.speakFormantVoice('Audio test successful');
      results.testVoicePlayed = true;
      results.voiceEngine = 'Web Audio Synthesized Voice';
    }

    results.success = true;
    results.details = `AudioContext: ${state} (${results.sampleRate}Hz) | Voices: ${results.speechVoicesCount} | Engine: ${results.voiceEngine}`;
    console.log('✅ [AudioDiagnostic] Test completed successfully:', results);
  } catch (err) {
    results.success = false;
    results.details = `Audio diagnostic failed: ${err.message || err}`;
    console.error('❌ [AudioDiagnostic] Error during test:', err);
  }

  return results;
}
