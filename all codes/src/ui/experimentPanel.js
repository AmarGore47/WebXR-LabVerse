/**
 * experimentPanel.js
 * Master UI controller for Part 3 Ohm's Law Experiment:
 * - Guided practical workflow stepper (Steps 1-6)
 * - Digital meters HUD (Ammeter & Voltmeter) with Over-Range warning
 * - Interactive Rheostat slider with quick buttons & educational hints
 * - Plug Key toggle button
 * - Tabbed container for Observation Table, V–I Graph, and Result & Precautions
 * - "Restart Experiment" action
 */

import { ObservationTable } from './observationTable.js';
import { ViGraph } from './viGraph.js';

export class ExperimentPanel {
  constructor(options) {
    this.container = options.container;
    this.simulation = options.simulation;
    this.onFeedback = options.onFeedback || (() => {});

    this.activeTab = 'table'; // 'table' | 'graph' | 'result'
    this.pendingRestartConfirm = false;

    this.render();
    this.simulation.subscribe(() => this.update());
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="exp-panel-card" id="exp-master-panel">
        <!-- Panel Header -->
        <div class="exp-panel-header">
          <div class="exp-panel-title">
            <span class="status-indicator" id="exp-status-indicator"></span>
            <div>
              <h3>Ohm’s Law Experiment</h3>
              <p id="exp-status-text">Step 1: Assemble Circuit</p>
            </div>
          </div>
          <div class="exp-header-controls">
            <button id="exp-restart-btn" class="btn btn-subtle" title="Restart experiment (clears readings, keeps wired circuit)">
              <span>🔁</span> Restart Experiment
            </button>
            <button id="exp-toggle-collapse-btn" class="btn-icon" title="Minimize / expand panel">
              <span id="exp-collapse-icon">▼</span>
            </button>
          </div>
        </div>

        <!-- Collapsible Content Body -->
        <div class="exp-panel-body" id="exp-panel-body">
          <!-- 1. Guided Practical Workflow Stepper -->
          <div class="workflow-stepper">
            <div class="step-item" id="wf-step-1">
              <span class="step-num">1</span>
              <span class="step-label">Wire Circuit</span>
            </div>
            <div class="step-sep"></div>
            <div class="step-item" id="wf-step-2">
              <span class="step-num">2</span>
              <span class="step-label">Check Setup</span>
            </div>
            <div class="step-sep"></div>
            <div class="step-item" id="wf-step-3">
              <span class="step-num">3</span>
              <span class="step-label">Close Key</span>
            </div>
            <div class="step-sep"></div>
            <div class="step-item" id="wf-step-4">
              <span class="step-num">4</span>
              <span class="step-label">Adjust Rheostat</span>
            </div>
            <div class="step-sep"></div>
            <div class="step-item" id="wf-step-5">
              <span class="step-num">5</span>
              <span class="step-label">Record 5 Data</span>
            </div>
            <div class="step-sep"></div>
            <div class="step-item" id="wf-step-6">
              <span class="step-num">6</span>
              <span class="step-label">Verify Ohm's Law</span>
            </div>
          </div>

          <!-- 2. Live Digital Meters & Rheostat Control Grid -->
          <div class="meters-controls-grid">
            <!-- Ammeter Digital Card -->
            <div class="meter-card ammeter-card" id="ammeter-digital-card">
              <div class="meter-card-header">
                <span class="meter-symbol">A</span>
                <span class="meter-name">Ammeter (Series)</span>
                <span class="meter-badge" id="ammeter-badge">0–0.6 A</span>
              </div>
              <div class="meter-value-display">
                <span id="ammeter-val" class="meter-val">0.00</span>
                <span class="meter-unit">A</span>
              </div>
              <div id="over-range-warning" class="over-range-tag" style="display: none;">
                ⚠️ OVER SAFE LIMIT (0.50 A)
              </div>
            </div>

            <!-- Voltmeter Digital Card -->
            <div class="meter-card voltmeter-card" id="voltmeter-digital-card">
              <div class="meter-card-header">
                <span class="meter-symbol">V</span>
                <span class="meter-name">Voltmeter (Parallel)</span>
                <span class="meter-badge">0–6.0 V</span>
              </div>
              <div class="meter-value-display">
                <span id="voltmeter-val" class="meter-val">0.00</span>
                <span class="meter-unit">V</span>
              </div>
              <div class="meter-subtitle">Across 10 Ω Resistor</div>
            </div>
          </div>

          <!-- 3. Key Toggle & Rheostat Adjuster Section -->
          <div class="circuit-actuators-section">
            <!-- Key Toggle Button & End Practical -->
            <div class="key-control-box" style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="toggle-key-btn" class="btn btn-key" title="Toggle plug key" style="flex: 1; min-width: 240px;">
                <span id="key-icon">🔌</span>
                <span id="key-text">Key is OPEN (Click to Close)</span>
              </button>
              <button id="end-practical-btn" class="btn btn-subtle" title="End practical safely and verify Ohm's Law" style="display: none; background: #b45309; color: #ffffff; font-weight: 700; border: 1.5px solid #fde047;">
                <span>🏆</span> End Practical & Verify
              </button>
            </div>

            <!-- Rheostat Variable Resistor Controller -->
            <div class="rheostat-control-box">
              <div class="rheostat-header">
                <label for="rheostat-slider"><strong>Rheostat Resistance (Rh):</strong></label>
                <span id="rheostat-val-badge" class="rheo-val-badge">12.00 Ω</span>
              </div>
              <div class="rheostat-slider-row">
                <input
                  type="range"
                  id="rheostat-slider"
                  min="0.5"
                  max="20.0"
                  step="0.1"
                  value="12.0"
                  class="range-slider"
                />
              </div>
              <div class="rheo-quick-buttons" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                <span style="font-size: 11.5px; font-weight: 700; color: #38bdf8;">5 Presets:</span>
                <button class="btn-micro" id="rheo-p1-btn" title="Reading 1: Set 18.0 Ω">1️⃣ 18 Ω</button>
                <button class="btn-micro" id="rheo-p2-btn" title="Reading 2: Set 14.0 Ω">2️⃣ 14 Ω</button>
                <button class="btn-micro" id="rheo-p3-btn" title="Reading 3: Set 10.0 Ω">3️⃣ 10 Ω</button>
                <button class="btn-micro" id="rheo-p4-btn" title="Reading 4: Set 6.0 Ω">4️⃣ 6 Ω</button>
                <button class="btn-micro" id="rheo-p5-btn" title="Reading 5: Set 2.0 Ω">5️⃣ 2 Ω</button>
                <button class="btn-micro" id="rheo-minus-btn" title="Decrease resistance by 1.0 Ω">-1.0 Ω</button>
                <button class="btn-micro" id="rheo-plus-btn" title="Increase resistance by 1.0 Ω">+1.0 Ω</button>
                <button class="btn-micro" id="rheo-min-btn" title="Set minimum resistance (0.5 Ω)">Min</button>
                <button class="btn-micro" id="rheo-max-btn" title="Set maximum resistance (20.0 Ω)">Max</button>
                <span class="rheo-hint-text">💡 Click presets 1–5 to vary current for 5 table observations.</span>
              </div>
            </div>
          </div>

          <!-- 4. Tabs Navigation Bar -->
          <div class="exp-tabs-nav">
            <button class="tab-btn active" data-tab="table" id="tab-btn-table">
              <span>📋</span> Observation Table
            </button>
            <button class="tab-btn" data-tab="graph" id="tab-btn-graph">
              <span>📈</span> V–I Graph
            </button>
            <button class="tab-btn" data-tab="result" id="tab-btn-result">
              <span>🎯</span> Result & Precautions
              <span id="result-lock-icon" class="lock-icon">🔒</span>
            </button>
          </div>

          <!-- 5. Tab Content Views -->
          <div class="tab-views-container">
            <!-- Tab View 1: Observation Table -->
            <div class="tab-pane active" id="tab-pane-table">
              <div id="observation-table-container"></div>
            </div>

            <!-- Tab View 2: V–I Graph -->
            <div class="tab-pane" id="tab-pane-graph" style="display: none;">
              <div id="vi-graph-container"></div>
            </div>

            <!-- Tab View 3: Result & Precautions -->
            <div class="tab-pane" id="tab-pane-result" style="display: none;">
              <div id="result-view-container">
                <!-- Result content injected here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize Subcomponents
    this.obsTable = new ObservationTable({
      container: this.container.querySelector('#observation-table-container'),
      simulation: this.simulation,
      onFeedback: this.onFeedback
    });

    this.viGraph = new ViGraph({
      container: this.container.querySelector('#vi-graph-container'),
      simulation: this.simulation
    });

    this.cacheDOMElements();
    this.setupEventListeners();
    this.update();
  }

  cacheDOMElements() {
    this.panelBody = this.container.querySelector('#exp-panel-body');
    this.collapseBtn = this.container.querySelector('#exp-toggle-collapse-btn');
    this.collapseIcon = this.container.querySelector('#exp-collapse-icon');
    this.statusIndicator = this.container.querySelector('#exp-status-indicator');
    this.statusText = this.container.querySelector('#exp-status-text');
    this.restartBtn = this.container.querySelector('#exp-restart-btn');

    this.ammeterVal = this.container.querySelector('#ammeter-val');
    this.voltmeterVal = this.container.querySelector('#voltmeter-val');
    this.overRangeWarning = this.container.querySelector('#over-range-warning');

    this.toggleKeyBtn = this.container.querySelector('#toggle-key-btn');
    this.keyIcon = this.container.querySelector('#key-icon');
    this.keyText = this.container.querySelector('#key-text');

    this.rheoSlider = this.container.querySelector('#rheostat-slider');
    this.rheoValBadge = this.container.querySelector('#rheostat-val-badge');

    this.resultContainer = this.container.querySelector('#result-view-container');
    this.resultLockIcon = this.container.querySelector('#result-lock-icon');

    this.tabButtons = this.container.querySelectorAll('.tab-btn');
    this.tabPanes = {
      table: this.container.querySelector('#tab-pane-table'),
      graph: this.container.querySelector('#tab-pane-graph'),
      result: this.container.querySelector('#tab-pane-result')
    };
  }

  setupEventListeners() {
    // Collapse toggle
    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', () => {
        const isCollapsed = this.panelBody.classList.toggle('collapsed');
        this.collapseIcon.textContent = isCollapsed ? '▲' : '▼';
      });
    }

    // Key toggle
    if (this.toggleKeyBtn) {
      this.toggleKeyBtn.addEventListener('click', () => {
        const res = this.simulation.toggleKey();
        this.onFeedback({
          type: res.success ? 'success' : 'warning',
          message: res.message
        });
      });
    }

    // Rheostat slider
    if (this.rheoSlider) {
      this.rheoSlider.addEventListener('input', (e) => {
        this.simulation.setRheostatResistance(Number(e.target.value));
      });
    }

    // 5 Discrete preset buttons
    const p1 = this.container.querySelector('#rheo-p1-btn');
    const p2 = this.container.querySelector('#rheo-p2-btn');
    const p3 = this.container.querySelector('#rheo-p3-btn');
    const p4 = this.container.querySelector('#rheo-p4-btn');
    const p5 = this.container.querySelector('#rheo-p5-btn');
    if (p1) p1.addEventListener('click', () => this.simulation.setRheostatResistance(18.0));
    if (p2) p2.addEventListener('click', () => this.simulation.setRheostatResistance(14.0));
    if (p3) p3.addEventListener('click', () => this.simulation.setRheostatResistance(10.0));
    if (p4) p4.addEventListener('click', () => this.simulation.setRheostatResistance(6.0));
    if (p5) p5.addEventListener('click', () => this.simulation.setRheostatResistance(2.0));

    // End Practical Button
    const endBtn = this.container.querySelector('#end-practical-btn');
    if (endBtn) {
      endBtn.addEventListener('click', () => {
        const res = this.simulation.endPractical();
        if (res.success) {
          this.setActiveTab('graph');
          this.onFeedback({
            type: 'success',
            message: `🏆 Practical Complete! Mean R = ${res.stats.meanResistance} Ω. Plug key opened safely.`
          });
        }
      });
    }

    // Quick rheostat buttons
    const minBtn = this.container.querySelector('#rheo-min-btn');
    const maxBtn = this.container.querySelector('#rheo-max-btn');
    const minusBtn = this.container.querySelector('#rheo-minus-btn');
    const plusBtn = this.container.querySelector('#rheo-plus-btn');

    if (minBtn) minBtn.addEventListener('click', () => this.simulation.setRheostatResistance(0.5));
    if (maxBtn) maxBtn.addEventListener('click', () => this.simulation.setRheostatResistance(20.0));
    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        this.simulation.setRheostatResistance(this.simulation.rheostatResistance - 1.0);
      });
    }
    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        this.simulation.setRheostatResistance(this.simulation.rheostatResistance + 1.0);
      });
    }

    // Tabs navigation
    this.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.setActiveTab(tab);
      });
    });

    // Restart experiment with inline 2nd-click confirm
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        if (!this.pendingRestartConfirm) {
          this.pendingRestartConfirm = true;
          this.restartBtn.textContent = '⚠️ Confirm Restart?';
          this.restartBtn.classList.add('confirming');

          setTimeout(() => {
            this.pendingRestartConfirm = false;
            if (this.restartBtn) {
              this.restartBtn.innerHTML = '<span>🔁</span> Restart Experiment';
              this.restartBtn.classList.remove('confirming');
            }
          }, 3500);
          return;
        }

        this.pendingRestartConfirm = false;
        this.restartBtn.innerHTML = '<span>🔁</span> Restart Experiment';
        this.restartBtn.classList.remove('confirming');

        const res = this.simulation.restartExperiment();
        this.onFeedback({
          type: 'info',
          message: res.message
        });
      });
    }
  }

  setActiveTab(tab) {
    this.activeTab = tab;

    this.tabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    Object.keys(this.tabPanes).forEach((key) => {
      const pane = this.tabPanes[key];
      if (pane) {
        pane.style.display = key === tab ? 'block' : 'none';
      }
    });

    // If graph became active, resize canvas
    if (tab === 'graph' && this.viGraph) {
      this.viGraph.handleResize();
    }
  }

  update() {
    const state = this.simulation.getState();

    // 1. Update meters display
    if (this.ammeterVal) {
      this.ammeterVal.textContent = state.current.toFixed(2);
    }
    if (this.voltmeterVal) {
      this.voltmeterVal.textContent = state.resistorVoltage.toFixed(2);
    }
    if (this.overRangeWarning) {
      this.overRangeWarning.style.display = state.isOverRange ? 'block' : 'none';
    }

    // 2. Update Key Toggle Button & End Practical Button
    if (this.toggleKeyBtn) {
      if (!state.circuitReady) {
        this.toggleKeyBtn.disabled = true;
        this.toggleKeyBtn.className = 'btn btn-key disabled';
        this.keyIcon.textContent = '🔒';
        this.keyText.textContent = 'Plug Key (Assemble Circuit First)';
      } else if (state.keyClosed) {
        this.toggleKeyBtn.disabled = false;
        this.toggleKeyBtn.className = 'btn btn-key active-on';
        this.keyIcon.textContent = '⚡';
        this.keyText.textContent = 'Key is CLOSED (Circuit ON — Click to Open)';
      } else {
        this.toggleKeyBtn.disabled = false;
        this.toggleKeyBtn.className = 'btn btn-key ready-to-close';
        this.keyIcon.textContent = '⚡';
        this.keyText.textContent = '⚡ START PRACTICAL / CHALU KAREIN';
      }
    }

    const endBtn = this.container.querySelector('#end-practical-btn');
    if (endBtn) {
      endBtn.style.display = (state.readingCount >= 5) ? 'inline-flex' : 'none';
    }

    // 3. Update Rheostat controls
    if (this.rheoSlider) {
      this.rheoSlider.value = state.rheostatResistance;
    }
    if (this.rheoValBadge) {
      this.rheoValBadge.textContent = `${state.rheostatResistance.toFixed(2)} Ω`;
    }

    // 4. Update Header Status Indicator & Subtitle
    if (this.statusIndicator && this.statusText) {
      switch (state.experimentStatus) {
        case 'unwired':
          this.statusIndicator.className = 'status-indicator incomplete';
          this.statusText.textContent = 'Step 1: Assemble all 7 circuit connections';
          break;
        case 'ready':
          this.statusIndicator.className = 'status-indicator ready';
          this.statusText.textContent = 'Step 3: Circuit complete. Close the plug key.';
          break;
        case 'over_range':
          this.statusIndicator.className = 'status-indicator danger';
          this.statusText.textContent = '⚠️ Current exceeds 0.50 A safe limit! Increase resistance.';
          break;
        case 'active':
          this.statusIndicator.className = 'status-indicator active';
          this.statusText.textContent = `⚡ Circuit ON · ${state.readingCount} of ${state.minReadings} readings recorded`;
          break;
      }
    }

    // 5. Update Workflow Stepper
    this.updateWorkflowSteps(state);

    // 6. Update Result & Precautions Card
    this.updateResultCard(state);
  }

  updateWorkflowSteps(state) {
    const steps = [1, 2, 3, 4, 5, 6];
    steps.forEach((s) => {
      const el = this.container.querySelector(`#wf-step-${s}`);
      if (!el) return;

      if (state.workflowStep > s) {
        el.className = 'step-item completed';
      } else if (state.workflowStep === s) {
        el.className = 'step-item active';
      } else {
        el.className = 'step-item';
      }
    });
  }

  updateResultCard(state) {
    if (!this.resultContainer) return;

    const stats = state.statistics;
    const isUnlocked = state.hasEnoughReadings;

    if (this.resultLockIcon) {
      this.resultLockIcon.textContent = isUnlocked ? '✅' : '🔒';
    }

    if (!isUnlocked) {
      this.resultContainer.innerHTML = `
        <div class="result-locked-card">
          <div class="lock-icon-large">🔒</div>
          <h4>Ohm’s Law Verification Card Locked</h4>
          <p>
            Record at least <strong>5 distinct observations</strong> across the rheostat resistance range to calculate the verified slope and unlock the conclusion card.
          </p>
          <div class="locked-progress-bar">
            <div class="locked-progress-fill" style="width: ${(state.readingCount / state.minReadings) * 100}%"></div>
          </div>
          <span class="locked-counter">${state.readingCount} / ${state.minReadings} Readings Completed</span>
        </div>
      `;
      return;
    }

    // Unlocked Card
    const info = this.simulation.config.experimentInfo;
    this.resultContainer.innerHTML = `
      <div class="result-unlocked-card">
        <div class="result-badge-success">🎉 Ohm's Law Verified</div>
        <h4 class="result-aim-title">${info.title}</h4>

        <div class="result-section">
          <h5>🎯 Aim:</h5>
          <p>${info.aim}</p>
        </div>

        <div class="result-stats-grid">
          <div class="stat-box">
            <span class="stat-label">Observations:</span>
            <span class="stat-val">${state.readingCount}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Mean V / I Ratio:</span>
            <span class="stat-val" style="color: #38bdf8;">${stats.meanRatio.toFixed(2)} Ω</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">V–I Graph Slope (R):</span>
            <span class="stat-val" style="color: #2dd4bf;">${stats.slopeResistance.toFixed(2)} Ω</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Fixed Resistor Value:</span>
            <span class="stat-val" style="color: #fbbf24;">10.00 Ω</span>
          </div>
        </div>

        <div class="result-section conclusion-box">
          <h5>📜 Conclusion:</h5>
          <p>${info.conclusionText}</p>
        </div>

        <div class="result-section precautions-box">
          <h5>⚠️ Standard Practical Precautions:</h5>
          <ul>
            ${info.precautions.map((p) => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }
}
