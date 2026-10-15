/**
 * labUI.js
 * User interface overlay for Part 1:
 * - Loading screen & progress bar
 * - Error banner with fallback message
 * - Laptop controls: Reset View, Toggle Labels, Toggle Terminals, Camera Presets
 * - Apparatus Legend card
 */

export class LabUI {
  constructor(options = {}) {
    this.onResetView = options.onResetView || (() => {});
    this.onToggleLabels = options.onToggleLabels || (() => {});
    this.onToggleTerminals = options.onToggleTerminals || (() => {});
    this.onSelectPreset = options.onSelectPreset || (() => {});

    this.initDOM();
  }

  initDOM() {
    // 1. Loading Overlay
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.loadingProgressBar = document.getElementById('loading-progress-bar');
    this.loadingStatusText = document.getElementById('loading-status-text');

    // 2. Error Banner
    this.errorBanner = document.getElementById('error-banner');
    this.errorMessage = document.getElementById('error-message');

    // 3. UI Buttons
    this.resetViewBtn = document.getElementById('reset-view-btn');
    this.toggleLabelsBtn = document.getElementById('toggle-labels-btn');
    this.toggleTerminalsBtn = document.getElementById('toggle-terminals-btn');
    this.legendToggleBtn = document.getElementById('legend-toggle-btn');
    this.legendCard = document.getElementById('apparatus-legend-card');

    // Attach listeners
    if (this.resetViewBtn) {
      this.resetViewBtn.addEventListener('click', () => this.onResetView());
    }

    if (this.toggleLabelsBtn) {
      this.toggleLabelsBtn.addEventListener('click', () => {
        const isVisible = this.onToggleLabels();
        this.toggleLabelsBtn.classList.toggle('active', isVisible);
        this.toggleLabelsBtn.innerHTML = `<span>🏷️</span> Labels: ${isVisible ? 'ON' : 'OFF'}`;
      });
    }

    if (this.toggleTerminalsBtn) {
      this.toggleTerminalsBtn.addEventListener('click', () => {
        const isVisible = this.onToggleTerminals();
        this.toggleTerminalsBtn.classList.toggle('active', isVisible);
        this.toggleTerminalsBtn.innerHTML = `<span>📍</span> Terminals: ${isVisible ? 'ON' : 'OFF'}`;
      });
    }

    if (this.legendToggleBtn && this.legendCard) {
      this.legendToggleBtn.addEventListener('click', () => {
        const isHidden = this.legendCard.classList.toggle('hidden');
        this.legendToggleBtn.innerHTML = `<span>ℹ️</span> Legend: ${isHidden ? 'OFF' : 'ON'}`;
      });
    }

    // Camera preset buttons
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset;
        this.onSelectPreset(preset);
      });
    });
  }

  /**
   * Update loading progress.
   */
  setProgress(percent, statusMessage) {
    if (this.loadingProgressBar) {
      this.loadingProgressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    if (this.loadingStatusText && statusMessage) {
      this.loadingStatusText.textContent = statusMessage;
    }
  }

  /**
   * Hide the loading screen with smooth transition.
   */
  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('fade-out');
      setTimeout(() => {
        this.loadingOverlay.style.display = 'none';
      }, 450);
    }
  }

  /**
   * Display visible friendly fallback message if GLB fails to load.
   */
  showError(message) {
    if (this.errorBanner && this.errorMessage) {
      this.errorMessage.textContent = message || 'Could not load Untitled.glb. A fallback workbench is active.';
      this.errorBanner.style.display = 'flex';
    }
    this.hideLoading();
  }
}
