/**
 * orientationModal.js
 * Comprehensive Experiment Orientation & Step-by-Step Circuit Connection Guide.
 * Explains:
 * 1. Project Overview & Scientific Aim (Ohm's Law, Std. 10 Physics, Formula V = I × R)
 * 2. Sequential Circuit Connection Sequence (1st, 2nd, 3rd... to 7th connection)
 * 3. Operational Steps (What happens at the last: Plug Key -> Rheostat -> 5 Readings -> Graph)
 * Live synchronized with CircuitState to show real-time progress for each step.
 */

import { REQUIRED_CONNECTIONS } from '../circuit/circuitConfig.js';

export class OrientationModal {
  constructor({ circuitState, simulation, guidedMode, narration, onFeedback }) {
    this.circuitState = circuitState;
    this.simulation = simulation;
    this.guidedMode = guidedMode;
    this.narration = narration;
    this.onFeedback = onFeedback || (() => {});

    this.modal = document.getElementById('orientation-modal');
    this.closeBtn = document.getElementById('close-orientation-btn');
    this.toggleBtns = [
      document.getElementById('toggle-orientation-btn'),
      document.getElementById('toggle-orientation-toolbar-btn')
    ].filter(Boolean);
    this.tourBtn = document.getElementById('orient-tour-btn');

    this.activeTab = 'circuit'; // 'overview' | 'circuit' | 'procedure'
    this.tourTimer = null;

    this.initEventListeners();
    this.initTabNavigation();
    this.initCardInteractions();

    // Subscribe to state changes to update wire badges live
    if (this.circuitState) {
      this.circuitState.subscribe(() => this.updateLiveBadges());
    }
    if (this.simulation) {
      this.simulation.subscribe(() => this.updateLiveBadges());
    }

    this.updateLiveBadges();
  }

  initEventListeners() {
    this.toggleBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.open());
    });

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.tourBtn) {
      this.tourBtn.addEventListener('click', () => this.startTour());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // Escape key to close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  initCardInteractions() {
    // Make cards 1 to 7 click-to-highlight in 3D
    for (let i = 1; i <= 7; i++) {
      const card = document.getElementById(`orient-step-card-${i}`);
      if (card) {
        card.style.cursor = 'pointer';
        card.setAttribute('title', `Click to highlight Wire ${i} terminals in 3D & hear voice guide`);
        card.addEventListener('click', () => {
          if (this.guidedMode) {
            this.guidedMode.highlightStep(i);
            this.onFeedback({
              type: 'info',
              message: `Highlighted Step ${i} terminals on workbench with voice guide!`
            });
          }
        });
      }
    }
  }

  startTour() {
    if (!this.guidedMode) return;
    if (this.narration) this.narration.init();

    let step = 1;
    this.onFeedback({
      type: 'info',
      message: '🌟 Starting 3D Sequential Glow Tour...'
    });

    const run = () => {
      if (step > 7) {
        this.onFeedback({ type: 'success', message: '🌟 3D Connection Tour Complete!' });
        this.guidedMode.refresh();
        return;
      }
      this.guidedMode.highlightStep(step);
      step++;
      this.tourTimer = setTimeout(run, 4500);
    };

    clearTimeout(this.tourTimer);
    run();
  }

  initTabNavigation() {
    const tabs = document.querySelectorAll('.orient-nav-btn');
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab) return;

        this.activeTab = targetTab;
        tabs.forEach((t) => t.classList.toggle('active', t === btn));

        document.querySelectorAll('.orient-tab-content').forEach((panel) => {
          panel.classList.toggle('active', panel.id === `orient-content-${targetTab}`);
        });
      });
    });
  }

  open() {
    if (!this.modal) return;
    this.modal.classList.add('open');
    this.updateLiveBadges();
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('open');
  }

  isOpen() {
    return this.modal && this.modal.classList.contains('open');
  }

  updateLiveBadges() {
    if (!this.circuitState) return;

    // Check each of the 7 connections
    REQUIRED_CONNECTIONS.forEach((req, idx) => {
      const isConn = this.circuitState.hasConnection(req.from, req.to);
      const badge = document.getElementById(`orient-wire-status-${idx + 1}`);
      const card = document.getElementById(`orient-step-card-${idx + 1}`);

      if (badge) {
        if (isConn) {
          badge.className = 'status-tag success';
          badge.innerHTML = '✅ Connected';
        } else {
          badge.className = 'status-tag incomplete';
          badge.innerHTML = `⏳ Wire ${idx + 1} Pending`;
        }
      }

      if (card) {
        card.classList.toggle('wire-connected', isConn);
      }
    });

    // Update overall circuit summary badge
    const totalCount = this.circuitState.connections.length;
    const summaryBadge = document.getElementById('orient-summary-badge');
    if (summaryBadge) {
      summaryBadge.textContent = `${totalCount} / 7 Wires Connected`;
      summaryBadge.className = totalCount >= 7 ? 'count-badge badge-success' : 'count-badge';
    }

    // Update operational key & simulation state
    const simState = this.simulation ? this.simulation.getState() : {};
    const keyBadge = document.getElementById('orient-key-status');
    if (keyBadge) {
      if (simState.keyClosed) {
        keyBadge.className = 'status-tag success';
        keyBadge.innerHTML = '⚡ Closed (Current Flowing)';
      } else if (totalCount >= 7) {
        keyBadge.className = 'status-tag warning';
        keyBadge.innerHTML = '👉 Circuit Ready · Close Key';
      } else {
        keyBadge.className = 'status-tag incomplete';
        keyBadge.innerHTML = '🔒 Open (Awaiting Wires)';
      }
    }

    const readingsBadge = document.getElementById('orient-readings-status');
    if (readingsBadge) {
      const rCount = (simState.readings ? simState.readings.length : simState.readingCount) || 0;
      readingsBadge.textContent = `${rCount} / 5 Readings Recorded`;
    }
  }
}
