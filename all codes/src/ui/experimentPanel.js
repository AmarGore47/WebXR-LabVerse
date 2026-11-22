/**
 * experimentPanel.js
 * Master UI controller for Part 3 Ohm's Law Experiment:
 * Divided cleanly into 3 focused modes/tabs so the interface is never cluttered:
 *  - ⚡ Mode 1: Live Meters & Rheostat Controls
 *  - 📋 Mode 2: 6-Step Practical Guide & Narration
 *  - 📊 Mode 3: Observation Table & V–I Graph
 */

import { ObservationTable } from './observationTable.js';
import { ViGraph } from './viGraph.js';

export class ExperimentPanel {
  constructor(options) {
    this.container = options.container;
    this.simulation = options.simulation;
    this.workflowManager = options.workflowManager || null;
    this.circuitState = options.circuitState || null;
    this.onFeedback = options.onFeedback || (() => { });

    this.activeMode = 'meters'; // 'meters' | 'steps' | 'table_graph'
    this.activeTab = 'table';    // 'table' | 'graph' | 'quiz' | 'result'
    this.pendingRestartConfirm = false;

    this.render();
    this.simulation.subscribe(() => this.update());
    if (this.workflowManager && typeof this.workflowManager.onStageChange === 'function') {
      this.workflowManager.onStageChange(() => this.update());
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="exp-panel-card" id="exp-master-panel">
        <!-- 1. Panel Header with title and controls -->
        <div class="exp-panel-header">
          <div class="exp-panel-title">
            <span class="status-indicator" id="exp-status-indicator"></span>
            <div>
              <h3>Ohm’s Law Practical</h3>
              <p id="exp-status-text">Step 1: Assemble Circuit</p>
            </div>
          </div>
          <div class="exp-header-controls">
            <button id="exp-toggle-collapse-btn" class="btn-icon" title="Minimize / expand panel">
              <span id="exp-collapse-icon">−</span>
            </button>
          </div>
        </div>

        <!-- 2. Primary 3-Section Mode Selector Bar -->
        <div class="exp-mode-tabs-bar" role="tablist">
          <button class="mode-tab-btn active" data-mode="meters" id="mode-tab-meters" title="TAB 1 — Instruments: Live meters, plug key & rheostat">
            <span>⚡</span> Instruments
          </button>
          <button class="mode-tab-btn" data-mode="steps" id="mode-tab-steps" title="TAB 2 — Procedure: Maharashtra curriculum aim & step procedure">
            <span>📋</span> Procedure
          </button>
          <button class="mode-tab-btn" data-mode="table_graph" id="mode-tab-table-graph" title="TAB 3 — Observations: Recorded readings, V–I graph & resistance calculation">
            <span>📊</span> Observations
          </button>
        </div>

        <!-- 3. Collapsible Panel Body -->
        <div class="exp-panel-body" id="exp-panel-body">

          <!-- ═════ SECTION 1: METERS & RHEOSTAT CONTROLS ═════ -->
          <div class="exp-mode-section" id="section-mode-meters">
            <!-- Digital Meters Grid -->
            <div class="meters-controls-grid">
              <!-- Ammeter Card -->
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

              <!-- Voltmeter Card -->
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

            <!-- Key Toggle & Rheostat Controls -->
            <div class="circuit-actuators-section">
              <!-- Key Toggle Button -->
              <div class="key-control-box" style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button id="toggle-key-btn" class="btn btn-key" title="Toggle plug key" style="flex: 1; min-width: 220px;">
                  <span id="key-icon">🔌</span>
                  <span id="key-text">Key is OPEN (Click to Close)</span>
                </button>
                <button id="end-practical-btn" class="btn btn-subtle" title="End practical safely and verify Ohm's Law" style="display: none; background: #b45309; color: #ffffff; font-weight: 700; border: 1.5px solid #fde047;">
                  <span>🏆</span> End Practical & Verify
                </button>
              </div>

              <!-- Rheostat Variable Resistor -->
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
                <div class="rheo-quick-buttons" style="display: flex; flex-wrap: wrap; gap: 5px; align-items: center;">
                  <span style="font-size: 11px; font-weight: 700; color: #38bdf8;">5 Presets:</span>
                  <button class="btn-micro" id="rheo-p1-btn" title="Reading 1: Set 18.0 Ω">1️⃣ 18 Ω</button>
                  <button class="btn-micro" id="rheo-p2-btn" title="Reading 2: Set 14.0 Ω">2️⃣ 14 Ω</button>
                  <button class="btn-micro" id="rheo-p3-btn" title="Reading 3: Set 10.0 Ω">3️⃣ 10 Ω</button>
                  <button class="btn-micro" id="rheo-p4-btn" title="Reading 4: Set 6.0 Ω">4️⃣ 6 Ω</button>
                  <button class="btn-micro" id="rheo-p5-btn" title="Reading 5: Set 2.0 Ω">5️⃣ 2 Ω</button>
                  <button class="btn-micro" id="rheo-minus-btn" title="Decrease resistance by 1.0 Ω">-1.0 Ω</button>
                  <button class="btn-micro" id="rheo-plus-btn" title="Increase resistance by 1.0 Ω">+1.0 Ω</button>
                  <button class="btn-micro" id="rheo-min-btn" title="Set minimum resistance (0.5 Ω)">Min</button>
                  <button class="btn-micro" id="rheo-max-btn" title="Set maximum resistance (20.0 Ω)">Max</button>
                </div>
              </div>

              <!-- Quick Record Button right inside Meters view -->
              <button id="quick-record-reading-btn" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 10px; font-size: 13px; font-weight: 700; margin-top: 4px;" title="Save current voltage and current into observation table">
                <span>📝</span> Record Reading (<span id="quick-obs-count">0</span> / 5 Recorded)
              </button>
            </div>
          </div>

          <!-- ═════ SECTION 2: 6 PRACTICAL STEPS ═════ -->
          <div class="exp-mode-section" id="section-mode-steps" style="display: none;">
            <!-- Stepper Overview Bar -->
            <div class="workflow-stepper">
              <div class="step-item" id="wf-step-1">
                <span class="step-num">1</span>
                <span class="step-label">Wires</span>
              </div>
              <div class="step-sep"></div>
              <div class="step-item" id="wf-step-2">
                <span class="step-num">2</span>
                <span class="step-label">Check</span>
              </div>
              <div class="step-sep"></div>
              <div class="step-item" id="wf-step-3">
                <span class="step-num">3</span>
                <span class="step-label">Key</span>
              </div>
              <div class="step-sep"></div>
              <div class="step-item" id="wf-step-4">
                <span class="step-num">4</span>
                <span class="step-label">Rheo</span>
              </div>
              <div class="step-sep"></div>
              <div class="step-item" id="wf-step-5">
                <span class="step-num">5</span>
                <span class="step-label">5 Data</span>
              </div>
              <div class="step-sep"></div>
              <div class="step-item" id="wf-step-6">
                <span class="step-num">6</span>
                <span class="step-label">Verify</span>
              </div>
            </div>

            <!-- Detailed Steps List -->
            <ol class="practical-steps-detail" id="practical-steps-detail-list">
              <li class="step-card" id="step-detail-1">
                <div class="step-card-header">
                  <span class="step-badge">Step 1</span>
                  <strong>🔌 Connect Circuit (7 Wires)</strong>
                  <span class="step-state-tag" id="step-tag-1">In Progress</span>
                </div>
                <p>Connect battery, key, ammeter, rheostat, resistor, and parallel voltmeter.</p>
              </li>
              <li class="step-card" id="step-detail-2">
                <div class="step-card-header">
                  <span class="step-badge">Step 2</span>
                  <strong>🔍 Check Circuit Setup</strong>
                  <span class="step-state-tag" id="step-tag-2">Pending</span>
                </div>
                <p>Confirm series loop is unbroken and voltmeter is strictly parallel across resistor.</p>
              </li>
              <li class="step-card" id="step-detail-3">
                <div class="step-card-header">
                  <span class="step-badge">Step 3</span>
                  <strong>⚡ Start Current / Close Key</strong>
                  <span class="step-state-tag" id="step-tag-3">Pending</span>
                </div>
                <p>Click "Start Current" or press the 3D tabletop button to close the plug key.</p>
              </li>
              <li class="step-card" id="step-detail-4">
                <div class="step-card-header">
                  <span class="step-badge">Step 4</span>
                  <strong>🎚️ Adjust Rheostat</strong>
                  <span class="step-state-tag" id="step-tag-4">Pending</span>
                </div>
                <p>Change resistance using presets 1–5 to observe current & voltage variations.</p>
              </li>
              <li class="step-card" id="step-detail-5">
                <div class="step-card-header">
                  <span class="step-badge">Step 5</span>
                  <strong>📋 Record 5 Observations</strong>
                  <span class="step-state-tag" id="step-tag-5">Pending</span>
                </div>
                <p>Record at least 5 pairs of (V, I) values across the full rheostat range.</p>
              </li>
              <li class="step-card" id="step-detail-6">
                <div class="step-card-header">
                  <span class="step-badge">Step 6</span>
                  <strong>📈 Verify Ohm's Law</strong>
                  <span class="step-state-tag" id="step-tag-6">Pending</span>
                </div>
                <p>Verify that V / I is constant and V–I graph is a straight line through the origin.</p>
              </li>
            </ol>

            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button id="exp-restart-btn" class="btn btn-subtle" style="flex: 1; justify-content: center;" title="Restart experiment (clears readings, keeps circuit wired)">
                <span>🔁</span> Restart Experiment
              </button>
            </div>
          </div>

          <!-- ═════ SECTION 3: TABLE & GRAPH ═════ -->
          <div class="exp-mode-section" id="section-mode-table_graph" style="display: none;">
            <!-- Sub-Tabs Navigation Bar -->
            <div class="exp-tabs-nav">
              <button class="tab-btn active" data-tab="table" id="tab-btn-table">
                <span>📋</span> Table
              </button>
              <button class="tab-btn" data-tab="graph" id="tab-btn-graph">
                <span>📈</span> V–I Graph
              </button>
              <button class="tab-btn" data-tab="quiz" id="tab-btn-quiz">
                <span>📝</span> Quiz
                <span id="quiz-status-badge" style="font-size: 10px; margin-left: 3px; opacity: 0.85;">(4 Qs)</span>
              </button>
              <button class="tab-btn" data-tab="result" id="tab-btn-result">
                <span>🎯</span> Result
                <span id="result-lock-icon" class="lock-icon">🔒</span>
              </button>
            </div>

            <!-- Sub-Tab Content Views -->
            <div class="tab-views-container">
              <div class="tab-pane active" id="tab-pane-table">
                <div id="observation-table-container"></div>
              </div>
              <div class="tab-pane" id="tab-pane-graph" style="display: none;">
                <div id="vi-graph-container"></div>
              </div>
              <div class="tab-pane" id="tab-pane-quiz" style="display: none;">
                <div id="quiz-view-container"></div>
              </div>
              <div class="tab-pane" id="tab-pane-result" style="display: none;">
                <div id="result-view-container"></div>
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
    this.panelCard = this.container.querySelector('#exp-master-panel');
    this.panelBody = this.container.querySelector('#exp-panel-body');
    this.collapseBtn = this.container.querySelector('#exp-toggle-collapse-btn');
    this.collapseIcon = this.container.querySelector('#exp-collapse-icon');
    this.statusIndicator = this.container.querySelector('#exp-status-indicator');
    this.statusText = this.container.querySelector('#exp-status-text');
    this.restartBtn = this.container.querySelector('#exp-restart-btn');

    this.modeButtons = this.container.querySelectorAll('.mode-tab-btn');
    this.modeSections = {
      meters: this.container.querySelector('#section-mode-meters'),
      steps: this.container.querySelector('#section-mode-steps'),
      table_graph: this.container.querySelector('#section-mode-table_graph')
    };

    this.ammeterVal = this.container.querySelector('#ammeter-val');
    this.voltmeterVal = this.container.querySelector('#voltmeter-val');
    this.overRangeWarning = this.container.querySelector('#over-range-warning');

    this.toggleKeyBtn = this.container.querySelector('#toggle-key-btn');
    this.keyIcon = this.container.querySelector('#key-icon');
    this.keyText = this.container.querySelector('#key-text');

    this.rheoSlider = this.container.querySelector('#rheostat-slider');
    this.rheoValBadge = this.container.querySelector('#rheostat-val-badge');
    this.quickRecordBtn = this.container.querySelector('#quick-record-reading-btn');
    this.quickObsCount = this.container.querySelector('#quick-obs-count');

    this.resultContainer = this.container.querySelector('#result-view-container');
    this.resultLockIcon = this.container.querySelector('#result-lock-icon');
    this.quizContainer = this.container.querySelector('#quiz-view-container');

    this.tabButtons = this.container.querySelectorAll('.tab-btn');
    this.tabPanes = {
      table: this.container.querySelector('#tab-pane-table'),
      graph: this.container.querySelector('#tab-pane-graph'),
      quiz: this.container.querySelector('#tab-pane-quiz'),
      result: this.container.querySelector('#tab-pane-result')
    };
  }

  setupEventListeners() {
    // 1. Collapse toggle
    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', () => {
        const isCollapsed = this.panelBody.classList.toggle('collapsed');
        this.collapseIcon.textContent = isCollapsed ? '+' : '−';
      });
    }

    // 2. Mode tabs switching (Meters / Steps / Table & Graph)
    this.modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setActiveMode(mode);
      });
    });

    // 3. Sub-tabs navigation (Table / Graph / Result)
    this.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.setActiveTab(tab);
      });
    });

    // 4. Quick record reading button
    if (this.quickRecordBtn) {
      this.quickRecordBtn.addEventListener('click', () => {
        const res = this.simulation.recordReading();
        this.onFeedback({
          type: res.success ? 'success' : 'warning',
          message: res.message
        });
      });
    }

    // 5. Key toggle
    if (this.toggleKeyBtn) {
      this.toggleKeyBtn.addEventListener('click', () => {
        const res = this.simulation.toggleKey();
        this.onFeedback({
          type: res.success ? 'success' : 'warning',
          message: res.message
        });
      });
    }

    // 6. Rheostat slider
    if (this.rheoSlider) {
      this.rheoSlider.addEventListener('input', (e) => {
        this.simulation.setRheostatResistance(Number(e.target.value));
      });
    }

    // 7. Preset buttons
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
          this.setActiveMode('table_graph');
          this.setActiveTab('graph');
          this.onFeedback({
            type: 'success',
            message: `🏆 Practical Complete! Mean R = ${res.stats.meanResistance} Ω. Plug key opened safely.`
          });
        }
      });
    }

    // Quick rheostat step buttons
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

  setActiveMode(mode) {
    this.activeMode = mode;

    this.modeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    Object.keys(this.modeSections).forEach((key) => {
      const sec = this.modeSections[key];
      if (sec) {
        sec.style.display = key === mode ? 'block' : 'none';
      }
    });

    // Ensure graph canvas sizes properly if table_graph becomes active
    if (mode === 'table_graph' && this.activeTab === 'graph' && this.viGraph) {
      setTimeout(() => this.viGraph.handleResize(), 50);
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

    if (tab === 'graph' && this.viGraph) {
      setTimeout(() => this.viGraph.handleResize(), 50);
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
        this.keyText.textContent = '⚡ START CURRENT (Close Key)';
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
    if (this.quickObsCount) {
      this.quickObsCount.textContent = state.readingCount;
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

    // 5. Update Workflow Stepper & Detail Cards
    this.updateWorkflowSteps(state);

    // 6. Update Result & Precautions Card
    this.updateResultCard(state);

    // 7. Update Student Assessment Quiz View
    this.renderQuizView();
  }

  renderQuizView() {
    if (!this.quizContainer) return;

    const questions = this.workflowManager?.assessmentQuestions || [
      {
        id: 'q1',
        question: 'Why must an ammeter always be connected in series with the circuit?',
        options: [
          'Because it has very low internal resistance so it measures total current without reducing it.',
          'Because it has very high internal resistance and prevents short circuits.',
          'Because voltage is constant across components connected in series.',
          'Because ammeter requires high voltage to operate its needle mechanism.'
        ],
        correctAnswerIndex: 0,
        explanation: 'An ideal ammeter has near zero internal resistance. Connecting it in series ensures the entire circuit current passes through it without significantly altering the circuit total resistance.'
      },
      {
        id: 'q2',
        question: 'What physical quantity is represented by the slope of a Voltage (V) vs Current (I) graph?',
        options: [
          'Resistance (R = ΔV / ΔI)',
          'Conductance (G = ΔI / ΔV)',
          'Electric Power (P = V * I)',
          'Electric Charge (Q = I * t)'
        ],
        correctAnswerIndex: 0,
        explanation: 'According to Ohm’s Law V = I * R, the ratio ΔV / ΔI represents the electrical resistance (R) of the conductor.'
      },
      {
        id: 'q3',
        question: 'If the length of a uniform conducting wire is doubled while keeping temperature and material constant, what happens to its resistance?',
        options: [
          'Resistance is doubled (R ∝ l)',
          'Resistance is halved (R ∝ 1/l)',
          'Resistance remains unchanged',
          'Resistance becomes four times larger'
        ],
        correctAnswerIndex: 0,
        explanation: 'Resistance is directly proportional to length (R = ρ * l / A). Doubling length doubles the resistance.'
      },
      {
        id: 'q4',
        question: 'In this practical, what does the straight-line graph passing through the origin indicate?',
        options: [
          'Current is directly proportional to potential difference (I ∝ V), confirming Ohm’s Law.',
          'The resistor value changes with varying voltage.',
          'The power supply has internal resistance.',
          'The circuit contains a non-ohmic device.'
        ],
        correctAnswerIndex: 0,
        explanation: 'A straight line through the origin on a V–I graph proves constant proportionality (V/I = constant), verifying Ohm’s Law for ohmic conductors.'
      }
    ];

    const answers = this.workflowManager?.assessmentAnswers || new Map();
    const score = this.workflowManager?.getAssessmentScore?.() || {
      total: questions.length,
      answered: answers.size,
      correct: Array.from(answers.values()).filter(a => a.isCorrect).length,
      percentage: Math.round((Array.from(answers.values()).filter(a => a.isCorrect).length / questions.length) * 100),
      completed: answers.size === questions.length
    };

    // Update Quiz badge in header
    const quizBadge = this.container.querySelector('#quiz-status-badge');
    if (quizBadge) {
      if (score.completed) {
        quizBadge.textContent = `(${score.correct}/${score.total} ✓)`;
        quizBadge.style.color = score.percentage >= 75 ? '#4ade80' : '#f59e0b';
      } else if (score.answered > 0) {
        quizBadge.textContent = `(${score.answered}/${score.total})`;
      } else {
        quizBadge.textContent = `(${questions.length} Qs)`;
      }
    }

    let html = `
      <div class="quiz-panel-card" style="padding: 12px; background: rgba(8, 24, 42, 0.75); border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
          <div>
            <h4 style="margin: 0; color: #38bdf8; font-size: 14px;">📝 Maharashtra SSC Class 10 Assessment</h4>
            <span style="font-size: 11px; color: #94a3b8;">Effects of Electric Current · Chapter 4 Socratic Quiz</span>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 12px; font-weight: 700; color: ${score.percentage >= 75 ? '#4ade80' : '#38bdf8'};">
              Score: ${score.correct} / ${score.total} (${score.percentage}%)
            </span>
          </div>
        </div>
    `;

    questions.forEach((q, qIdx) => {
      const recorded = answers.get(q.id);
      const isAnswered = recorded !== undefined;

      html += `
        <div class="quiz-question-box" style="margin-bottom: 14px; padding: 10px; background: rgba(15, 23, 42, 0.6); border-radius: 6px; border-left: 3px solid ${isAnswered ? (recorded.isCorrect ? '#4ade80' : '#ef4444') : '#38bdf8'};">
          <div style="font-size: 12px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">
            Q${qIdx + 1}: ${q.question}
          </div>
          <div class="quiz-options-list" style="display: flex; flex-direction: column; gap: 6px;">
      `;

      q.options.forEach((opt, optIdx) => {
        const isSelected = recorded?.selectedOptionIndex === optIdx;
        let optBg = 'rgba(255, 255, 255, 0.04)';
        let optBorder = 'rgba(255, 255, 255, 0.1)';
        let optColor = '#cbd5e1';

        if (isAnswered) {
          if (optIdx === q.correctAnswerIndex) {
            optBg = 'rgba(34, 197, 94, 0.2)';
            optBorder = '#22c55e';
            optColor = '#4ade80';
          } else if (isSelected && !recorded.isCorrect) {
            optBg = 'rgba(239, 68, 68, 0.2)';
            optBorder = '#ef4444';
            optColor = '#f87171';
          }
        }

        html += `
          <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 11px; padding: 6px 8px; border-radius: 4px; background: ${optBg}; border: 1px solid ${optBorder}; color: ${optColor}; cursor: ${isAnswered ? 'default' : 'pointer'};">
            <input type="radio" name="quiz_q_${q.id}" value="${optIdx}" ${isSelected ? 'checked' : ''} ${isAnswered ? 'disabled' : ''} style="margin-top: 2px;" />
            <span>${opt}</span>
          </label>
        `;
      });

      html += `</div>`;

      if (isAnswered) {
        html += `
          <div style="margin-top: 8px; padding: 6px 8px; border-radius: 4px; font-size: 11px; background: ${recorded.isCorrect ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${recorded.isCorrect ? '#86efac' : '#fca5a5'};">
            <strong>${recorded.isCorrect ? '✓ Correct!' : '✗ Needs Attention:'}</strong> ${recorded.explanation || q.explanation}
          </div>
        `;
      } else {
        html += `
          <div style="margin-top: 6px; text-align: right;">
            <button class="btn btn-micro btn-submit-quiz-ans" data-qid="${q.id}" style="font-size: 10.5px; padding: 4px 10px; background: #0284c7; color: #ffffff; border-radius: 4px; cursor: pointer;">
              Submit Answer
            </button>
          </div>
        `;
      }

      html += `</div>`;
    });

    if (score.completed) {
      const passed = score.percentage >= 75;
      html += `
        <div style="margin-top: 12px; padding: 12px; background: ${passed ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)'}; border: 1.5px solid ${passed ? '#10b981' : '#f59e0b'}; border-radius: 6px; text-align: center;">
          <div style="font-size: 20px;">${passed ? '🏆' : '📚'}</div>
          <h5 style="margin: 4px 0; color: #f8fafc; font-size: 13px;">${passed ? 'Practical Assessment Passed!' : 'Practical Assessment Needs Review'}</h5>
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            ${passed
          ? 'Excellent understanding of Ohm’s Law and circuit instrumentation. Ready for Maharashtra SSC Practical Examination.'
          : 'Review standard textbook definitions for ammeter placement and V–I proportionality.'}
          </p>
        </div>
      `;
    }

    html += `</div>`;
    this.quizContainer.innerHTML = html;

    // Attach answer submission handlers
    this.quizContainer.querySelectorAll('.btn-submit-quiz-ans').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const qid = btn.dataset.qid;
        const selectedRadio = this.quizContainer.querySelector(`input[name="quiz_q_${qid}"]:checked`);
        if (!selectedRadio) {
          this.onFeedback({
            type: 'warning',
            message: 'Please select an option before submitting.'
          });
          return;
        }

        const selectedIdx = parseInt(selectedRadio.value, 10);
        if (this.workflowManager && typeof this.workflowManager.submitAssessmentAnswer === 'function') {
          const res = this.workflowManager.submitAssessmentAnswer(qid, selectedIdx);
          this.renderQuizView();
          this.onFeedback({
            type: res.isCorrect ? 'success' : 'info',
            message: res.isCorrect ? '✓ Correct answer!' : 'Review explanation for this question.'
          });
        }
      });
    });
  }

  updateWorkflowSteps(state) {
    const stageInfo = this.workflowManager?.getCurrentStageInfo?.();
    const stageIdx = this.workflowManager ? this.workflowManager.getStageIndex() : state.workflowStep;

    const steps = [1, 2, 3, 4, 5, 6];
    steps.forEach((s) => {
      const el = this.container.querySelector(`#wf-step-${s}`);
      const card = this.container.querySelector(`#step-detail-${s}`);
      const tag = this.container.querySelector(`#step-tag-${s}`);

      const isCompleted = state.workflowStep > s;
      const isActive = state.workflowStep === s;

      if (el) {
        if (isCompleted) el.className = 'step-item completed';
        else if (isActive) el.className = 'step-item active';
        else el.className = 'step-item';
      }

      if (card && tag) {
        if (isCompleted) {
          card.className = 'step-card completed';
          tag.textContent = '✓ Done';
          tag.className = 'step-state-tag done';
        } else if (isActive) {
          card.className = 'step-card current';
          tag.textContent = '● Active';
          tag.className = 'step-state-tag current';
        } else {
          card.className = 'step-card';
          tag.textContent = 'Pending';
          tag.className = 'step-state-tag pending';
        }
      }
    });

    // Update header status text if workflowManager is active
    if (stageInfo && this.statusText) {
      this.statusText.textContent = `Stage ${stageIdx + 1}/11: ${stageInfo.label}`;
    }
  }

  updateResultCard(state) {
    if (!this.resultContainer) return;

    const stats = state.statistics;
    const isUnlocked = state.hasEnoughReadings;
    const summary = this.workflowManager?.getCompletionSummary?.();

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
    const calcR = summary?.calculatedResistanceOhms ?? stats.slopeResistance;
    const nomR = summary?.nominalResistanceOhms ?? 10.0;
    const pErr = summary?.percentageError ?? Math.abs((calcR - nomR) / nomR * 100).toFixed(2);
    const mastery = summary?.masteryBadgeEarned ?? false;

    this.resultContainer.innerHTML = `
      <div class="result-unlocked-card">
        <div class="result-badge-success" style="display: flex; align-items: center; justify-content: space-between;">
          <span>🎉 Ohm's Law Verified (R = ΔV / ΔI)</span>
          ${mastery ? '<span style="background: #eab308; color: #0f172a; font-weight: 800; padding: 2px 8px; border-radius: 4px; font-size: 11px;">🏆 SSC MASTERY BADGE</span>' : ''}
        </div>
        <h4 class="result-aim-title">${info.title}</h4>

        <div class="result-section" style="background: rgba(14, 165, 233, 0.1); padding: 8px 12px; border-radius: 6px; margin: 8px 0;">
          <span style="font-size: 11px; color: #38bdf8; font-weight: 700;">Maharashtra SSC Class 10 Curriculum:</span>
          <p style="margin: 2px 0 0; font-size: 11.5px; color: #e2e8f0;">Science & Technology Part 1 · Chapter 4 (Effects of Electric Current, Balbharati pp. 47–51)</p>
        </div>

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
            <span class="stat-label">V–I Slope (R = ΔV/ΔI):</span>
            <span class="stat-val" style="color: #2dd4bf;">${calcR.toFixed(2)} Ω</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Nominal Resistor:</span>
            <span class="stat-val" style="color: #fbbf24;">${nomR.toFixed(2)} Ω</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.7); padding: 8px 12px; border-radius: 6px; margin: 8px 0; border: 1px solid rgba(255,255,255,0.06);">
          <span style="font-size: 11.5px; color: #94a3b8;">Experimental Error:</span>
          <span style="font-size: 12.5px; font-weight: 700; color: ${pErr <= 5.0 ? '#4ade80' : '#f59e0b'};">${pErr}% (Standard SSC Tolerance: &le; 10%)</span>
        </div>

        <div class="result-section conclusion-box">
          <h5>📜 Conclusion:</h5>
          <p>${info.conclusionText}</p>
        </div>

        <div style="margin: 10px 0; display: flex; gap: 8px;">
          <button id="open-quiz-tab-btn" class="btn btn-primary" style="flex: 1; justify-content: center; font-size: 12px;">
            <span>📝</span> View / Take Conceptual Quiz
          </button>
        </div>

        <div class="result-section precautions-box">
          <h5>⚠️ Standard Practical Precautions:</h5>
          <ul>
            ${info.precautions.map((p) => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    const openQuizBtn = this.resultContainer.querySelector('#open-quiz-tab-btn');
    if (openQuizBtn) {
      openQuizBtn.addEventListener('click', () => {
        this.setActiveMode('table_graph');
        this.setActiveTab('quiz');
      });
    }
  }
}
