/**
 * vrSessionManager.js
 * Manages WebXR session lifecycle for standalone headsets (Meta Quest):
 * - Checks 'immersive-vr' hardware/browser compatibility
 * - Requests session with optionalFeatures: ['hand-tracking', 'local-floor']
 * - Binds renderer.xr.setSession
 * - Handles headset session end and restores laptop mode seamlessly
 * - Provides student-friendly status feedback
 */

import { XR_CONFIG } from './xrConfig.js';
import { sound } from '../audio.js';

export class VRSessionManager {
  constructor(options = {}) {
    this.renderer = options.renderer;
    this.scene = options.scene || null;
    this.onFeedback = options.onFeedback || (() => {});
    this.onSessionStart = options.onSessionStart || (() => {});
    this.onSessionEnd = options.onSessionEnd || (() => {});

    this.currentSession = null;
    this.isSupported = false;

    this.button = document.getElementById('enter-vr-btn');
    this.init();
  }

  async init() {
    this.renderer.xr.enabled = true;

    // WebXR Audio lifecycle: Resume AudioContext immediately when entering immersive-vr session
    this.renderer.xr.addEventListener('sessionstart', async () => {
      console.log('🎧 [VRSessionManager] WebXR sessionstart: Resuming Web Audio for Meta Quest...');
      try {
        await sound.unlock();
        await sound.resumeContext();
        await sound.routeToVRHeadset().catch(() => {});
        if (typeof window !== 'undefined' && window.labCircuit && window.labCircuit.narration) {
          window.labCircuit.narration.init();
        }
      } catch (err) {
        console.warn('[VRSessionManager] Audio resume on sessionstart error:', err);
      }
    });

    this.renderer.xr.addEventListener('sessionend', () => {
      console.log('🎧 [VRSessionManager] WebXR sessionend: Session ended.');
      if (typeof window !== 'undefined' && window.labCircuit) {
        if (window.labCircuit.vrAITutorPanel) {
          window.labCircuit.vrAITutorPanel.stopVoice();
        }
      }
    });

    // Set high-resolution WebXR framebuffer scale factor for crisp text and sharp visuals in Quest 2/3/3S/Pro
    if (this.renderer.xr.setFramebufferScaleFactor) {
      try {
        this.renderer.xr.setFramebufferScaleFactor(1.75);
      } catch (e) {
        console.warn('[VRSessionManager] Failed to set framebuffer scale factor:', e);
      }
    }

    if (!navigator.xr) {
      const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const msg = !isSecure
        ? '🔒 WebXR requires HTTPS over Wi-Fi. Please open https://' + window.location.host + window.location.pathname
        : XR_CONFIG.messages.unsupported;
      this.updateButtonState(false, msg);
      return;
    }

    try {
      this.updateButtonState(false, XR_CONFIG.messages.checking);
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      this.isSupported = supported;

      if (supported) {
        this.updateButtonState(true, XR_CONFIG.messages.supported);
      } else {
        this.updateButtonState(false, XR_CONFIG.messages.unsupported);
      }
    } catch (err) {
      console.warn('[VRSessionManager] Error checking WebXR support:', err);
      this.updateButtonState(false, XR_CONFIG.messages.unsupported);
    }

    if (this.button) {
      this.button.addEventListener('click', () => this.handleButtonClick());
    }
  }

  updateButtonState(enabled, text) {
    if (!this.button) return;

    if (enabled) {
      this.button.disabled = false;
      this.button.innerHTML = `<span>🥽</span> ${text}`;
      this.button.className = 'btn btn-vr active';
      this.button.title = 'Enter WebXR immersive VR mode with hand tracking';
    } else {
      this.button.disabled = true;
      this.button.innerHTML = `<span>🥽</span> ${text}`;
      this.button.className = 'btn btn-vr disabled';
      this.button.title = text;
    }
  }

  async handleButtonClick() {
    // Unblock and pre-warm Web Audio Context & SpeechSynthesis immediately on direct user click
    try {
      sound.unlock();
      if (typeof window !== 'undefined' && window.labCircuit && window.labCircuit.narration) {
        window.labCircuit.narration.init();
        window.labCircuit.narration._ensureAudioCtx();
      }
    } catch (e) {}

    if (this.currentSession) {
      await this.exitVR();
    } else {
      await this.enterVR();
    }
  }

  async enterVR() {
    if (!navigator.xr) {
      const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      const errText = !isSecure
        ? '🔒 WebXR requires HTTPS when accessing over Wi-Fi. Please use the https:// link.'
        : XR_CONFIG.messages.unsupported;
      this.onFeedback({ type: 'error', message: errText });
      return;
    }

    try {
      // Set high-resolution WebXR framebuffer scale factor BEFORE setSession
      if (this.renderer.xr.setFramebufferScaleFactor) {
        try {
          this.renderer.xr.setFramebufferScaleFactor(1.75);
        } catch (e) {}
      }

      // 1. Request room-scale WebXR session with REQUIRED hand tracking
      let session = null;
      try {
        session = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: ['local-floor', 'hand-tracking'],
          optionalFeatures: ['bounded-floor', 'layers']
        });
        this.renderer.xr.setReferenceSpaceType('local-floor');
      } catch (handErr) {
        console.warn('[VRSessionManager] Hand tracking required session failed, checking headset capability:', handErr);
        try {
          session = await navigator.xr.requestSession('immersive-vr', {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hand-tracking', 'bounded-floor', 'layers']
          });
          this.renderer.xr.setReferenceSpaceType('local-floor');

          const hasHands = session.enabledFeatures && session.enabledFeatures.includes('hand-tracking');
          if (!hasHands) {
            this.onFeedback({
              type: 'warning',
              message: '✋ WebXR Hand Tracking is required for LabVerse. Please put down controllers and enable Hand Tracking.'
            });
          }
        } catch (fallbackErr) {
          throw new Error('✋ WebXR Hand Tracking is required for LabVerse. Please enable Hand Tracking in your headset settings.');
        }
      }

      this.currentSession = session;
      await this.renderer.xr.setSession(session);

      if (this.button) {
        this.button.innerHTML = '<span>🚪</span> Exit VR';
        this.button.className = 'btn btn-vr active-session';
      }

      this.onFeedback({
        type: 'info',
        message: XR_CONFIG.messages.starting
      });

      document.body.classList.add('in-vr-mode');
      if (this.scene) {
        this.scene.userData = this.scene.userData || {};
        this.scene.userData.isInVR = true;
      }

      // Unlock hardware Web Audio for Meta Quest Headset and route to VR audio sink
      sound.unlock();
      sound.routeToVRHeadset().catch(() => {});
      session.addEventListener('selectstart', () => {
        sound.unlock();
        sound.routeToVRHeadset().catch(() => {});
      });
      session.addEventListener('select', () => {
        sound.unlock();
        sound.routeToVRHeadset().catch(() => {});
      });
      session.addEventListener('squeezestart', () => {
        sound.unlock();
        sound.routeToVRHeadset().catch(() => {});
      });

      this.onSessionStart(session);

      session.addEventListener('end', () => {
        this.handleSessionEnded();
      });
    } catch (err) {
      document.body.classList.remove('in-vr-mode');
      if (this.scene && this.scene.userData) {
        this.scene.userData.isInVR = false;
      }
      console.error('[VRSessionManager] Failed to start WebXR session:', err);
      const isSecurity = String(err).includes('SecurityError') || String(err).includes('secure context');
      const displayMsg = isSecurity
        ? '🔒 Security Error: WebXR is blocked on HTTP. Please open using HTTPS (https://' + window.location.host + ')'
        : `Could not start VR session: ${err.message || err}`;
      this.onFeedback({
        type: 'error',
        message: displayMsg
      });
    }
  }

  async exitVR() {
    if (this.currentSession) {
      try {
        await this.currentSession.end();
      } catch (err) {
        console.warn('[VRSessionManager] Error while ending session:', err);
      }
    }
  }

  handleSessionEnded() {
    this.currentSession = null;
    document.body.classList.remove('in-vr-mode');
    if (this.scene && this.scene.userData) {
      this.scene.userData.isInVR = false;
    }

    if (this.button) {
      this.button.innerHTML = `<span>🥽</span> ${XR_CONFIG.messages.supported}`;
      this.button.className = 'btn btn-vr active';
    }

    this.onFeedback({
      type: 'info',
      message: XR_CONFIG.messages.sessionEnded
    });

    this.onSessionEnd();
  }

  getDiagnostics() {
    return {
      hasNavigatorXR: Boolean(typeof navigator !== 'undefined' && navigator.xr),
      isSupported: this.isSupported,
      sessionActive: Boolean(this.currentSession)
    };
  }
}
