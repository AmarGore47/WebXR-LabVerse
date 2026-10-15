/**
 * diagnosticsPanel.js
 * Developer-Only Diagnostics & WebXR Engine Telemetry.
 * Disabled by default for students.
 * Toggled via:
 * - Keyboard shortcut: Ctrl + Shift + D
 * - URL parameter: ?debug=1 or ?dev=1
 * - Header/Toolbar developer toggle
 */

export class DiagnosticsPanel {
  constructor(options = {}) {
    this.vrSessionManager = options.vrSessionManager;
    this.xrHandManager = options.xrHandManager;
    this.modelLoader = options.modelLoader;
    this.renderer = options.renderer;

    this.panelEl = document.getElementById('dev-diagnostics-panel');
    this.closeBtn = document.getElementById('close-diag-btn');
    this.toggleBtn = document.getElementById('toggle-diag-btn');

    this.isVisible = false;
    this.pollInterval = null;

    // FPS calculation tracking
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.currentFps = 60;
    this.currentFrameTimeMs = 16.6;

    this.init();
  }

  init() {
    // 1. Close button
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }

    // 2. Toolbar Toggle button (if present)
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }

    // 3. Developer Keyboard Shortcut: Ctrl + Shift + D
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        this.toggle();
      }
    });

    // 4. Check URL parameter for auto-activation in development: ?debug=1 or ?dev=1
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debug') === '1' || params.get('dev') === '1') {
        this.show();
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  /**
   * Called by the animation loop to calculate real-time FPS with low overhead.
   */
  recordFrame(now) {
    this.frameCount++;
    const elapsed = now - this.lastFpsUpdate;
    if (elapsed >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.currentFrameTimeMs = (elapsed / this.frameCount).toFixed(1);
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  show() {
    this.isVisible = true;
    if (this.panelEl) {
      this.panelEl.classList.remove('hidden');
      this.panelEl.setAttribute('aria-hidden', 'false');
    }
    if (this.toggleBtn) {
      this.toggleBtn.classList.add('active');
    }

    this.updateDiagnosticsUI();
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => this.updateDiagnosticsUI(), 300);
    }
  }

  hide() {
    this.isVisible = false;
    if (this.panelEl) {
      this.panelEl.classList.add('hidden');
      this.panelEl.setAttribute('aria-hidden', 'true');
    }
    if (this.toggleBtn) {
      this.toggleBtn.classList.remove('active');
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  updateDiagnosticsUI() {
    if (!this.isVisible || !this.panelEl) return;

    // A. WebXR API
    const elXrApi = document.getElementById('diag-xr-api');
    const hasXR = typeof navigator !== 'undefined' && Boolean(navigator.xr);
    if (elXrApi) {
      elXrApi.textContent = hasXR ? 'Available' : 'Unavailable';
      elXrApi.className = `diag-val ${hasXR ? 'status-good' : 'status-bad'}`;
    }

    // B. Immersive-VR Support
    const elImmVR = document.getElementById('diag-immersive-vr');
    const sessionDiag = this.vrSessionManager ? this.vrSessionManager.getDiagnostics() : { isSupported: false, sessionActive: false };
    if (elImmVR) {
      elImmVR.textContent = sessionDiag.isSupported ? 'Supported' : 'Unsupported';
      elImmVR.className = `diag-val ${sessionDiag.isSupported ? 'status-good' : 'status-warn'}`;
    }

    // C. VR Session Active
    const elVRSession = document.getElementById('diag-vr-session');
    const isPresenting = Boolean(this.renderer && this.renderer.xr && this.renderer.xr.isPresenting);
    if (elVRSession) {
      elVRSession.textContent = isPresenting ? 'Active' : 'Inactive';
      elVRSession.className = `diag-val ${isPresenting ? 'status-good' : ''}`;
    }

    // D. Hand Tracking Diagnostics
    const handDiag = this.xrHandManager ? this.xrHandManager.getDiagnostics() : null;
    const elHandData = document.getElementById('diag-hand-data');
    if (elHandData) {
      if (handDiag && handDiag.hasReceivedHandData) {
        elHandData.textContent = 'Active (WebXR Joints)';
        elHandData.className = 'diag-val status-good';
      } else if (isPresenting) {
        elHandData.textContent = 'Waiting for Hands…';
        elHandData.className = 'diag-val status-warn';
      } else {
        elHandData.textContent = 'Not in VR';
        elHandData.className = 'diag-val';
      }
    }

    // E. Left & Right Hand State
    const elLeft = document.getElementById('diag-left-hand');
    if (elLeft) {
      if (handDiag && handDiag.leftHand.active) {
        elLeft.textContent = handDiag.leftHand.pinched ? 'Tracked (PINCHED)' : 'Tracked (Open)';
        elLeft.className = `diag-val ${handDiag.leftHand.pinched ? 'status-warn' : 'status-good'}`;
      } else {
        elLeft.textContent = 'No Pose';
        elLeft.className = 'diag-val';
      }
    }

    const elRight = document.getElementById('diag-right-hand');
    if (elRight) {
      if (handDiag && handDiag.rightHand.active) {
        elRight.textContent = handDiag.rightHand.pinched ? 'Tracked (PINCHED)' : 'Tracked (Open)';
        elRight.className = `diag-val ${handDiag.rightHand.pinched ? 'status-warn' : 'status-good'}`;
      } else {
        elRight.textContent = 'No Pose';
        elRight.className = 'diag-val';
      }
    }

    // F. Pinch / Drag Status
    const elPinch = document.getElementById('diag-pinch-status');
    if (elPinch) {
      if (handDiag && handDiag.activeDrag) {
        elPinch.textContent = `Dragging (${handDiag.activeDrag})`;
        elPinch.className = 'diag-val status-warn';
      } else if (handDiag && (handDiag.leftHand.pinched || handDiag.rightHand.pinched)) {
        elPinch.textContent = 'Pinching';
        elPinch.className = 'diag-val status-warn';
      } else {
        elPinch.textContent = 'None';
        elPinch.className = 'diag-val';
      }
    }

    // G. GLB Status
    const elGlb = document.getElementById('diag-glb-status');
    if (elGlb) {
      const status = this.modelLoader ? this.modelLoader.loadStatus : 'unknown';
      if (status === 'loaded') {
        elGlb.textContent = `Loaded (${this.modelLoader.loadedPath || '/models/Untitled.glb'})`;
        elGlb.className = 'diag-val status-good';
      } else if (status === 'failed') {
        elGlb.textContent = 'Failed (Fallback)';
        elGlb.className = 'diag-val status-bad';
      } else {
        elGlb.textContent = status;
        elGlb.className = 'diag-val';
      }
    }

    // H. FPS / Frame Time
    const elFps = document.getElementById('diag-fps');
    if (elFps) {
      elFps.textContent = `${this.currentFps} FPS (${this.currentFrameTimeMs} ms)`;
      elFps.className = `diag-val ${this.currentFps >= 50 ? 'status-good' : (this.currentFps >= 30 ? 'status-warn' : 'status-bad')}`;
    }
  }
}
