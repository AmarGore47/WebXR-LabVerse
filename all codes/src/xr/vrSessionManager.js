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

export class VRSessionManager {
  constructor(options = {}) {
    this.renderer = options.renderer;
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
      // Request immersive-vr with robust fallback options
      const sessionInit = {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
      };

      const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
      this.currentSession = session;

      // Try local-floor first, then fallback to local space if headset calibration requires it
      try {
        this.renderer.xr.setReferenceSpaceType('local-floor');
        await this.renderer.xr.setSession(session);
      } catch (refErr) {
        console.warn('[VRSessionManager] local-floor failed, trying local reference space:', refErr);
        try {
          this.renderer.xr.setReferenceSpaceType('local');
          await this.renderer.xr.setSession(session);
        } catch (localErr) {
          console.error('[VRSessionManager] setSession failed with both reference spaces:', localErr);
          throw localErr;
        }
      }

      if (this.button) {
        this.button.innerHTML = '<span>🚪</span> Exit VR';
        this.button.className = 'btn btn-vr active-session';
      }

      this.onFeedback({
        type: 'info',
        message: XR_CONFIG.messages.starting
      });

      document.body.classList.add('in-vr-mode');
      this.onSessionStart(session);

      session.addEventListener('end', () => {
        this.handleSessionEnded();
      });
    } catch (err) {
      document.body.classList.remove('in-vr-mode');
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
