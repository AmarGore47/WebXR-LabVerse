/**
 * practicalFlowPanel.js
 * Compact 3D guided-progress panel (desktop HTML version).
 *
 * Shows the 6-step practical workflow with:
 * - Current / incomplete / complete state per step
 * - Icon + one-line instruction
 * - "Why?" button that triggers audio + caption for the current step
 *
 * Placed as a sidebar HTML overlay panel (not 3D mesh in scene) so it works
 * on both laptop and VR (via CSS).
 */

import { GUIDED_NARRATION_EVENTS } from './guidedModeConfig.js';

const FLOW_STEPS = [
  { icon: '🔌', label: 'Connect circuit',  description: '7 required wires — follow the guided terminals.' },
  { icon: '▶',  label: 'Start current',    description: 'Press the Start Current button after circuit is complete.' },
  { icon: '🎚',  label: 'Adjust rheostat', description: 'Slide the rheostat to change resistance and current.' },
  { icon: '📋', label: 'Record 5 readings', description: 'Record one reading per rheostat position (min. 5).' },
  { icon: '📈', label: 'View V–I graph',   description: 'Graph plots voltage vs current — should be linear.' },
  { icon: '✅', label: "Verify Ohm's Law", description: 'V/I = constant R confirms Ohm\'s Law.' }
];

export class PracticalFlowPanel {
  constructor({ simulation, circuitState, narration, onFeedback }) {
    this.simulation = simulation;
    this.circuitState = circuitState;
    this.narration = narration;
    this.onFeedback = onFeedback || (() => {});

    this.el = null;
    this._build();
    this._syncFromSimulation();

    // Subscribe to simulation changes
    if (this.simulation) {
      this.simulation.subscribe(() => this._syncFromSimulation());
    }
  }

  _build() {
    // Root panel
    const panel = document.createElement('aside');
    panel.id = 'practical-flow-panel';
    panel.setAttribute('aria-label', 'Practical Workflow Progress');
    panel.innerHTML = `
      <div class="flow-header">
        <span class="flow-title">📚 Practical Steps</span>
        <button class="flow-collapse-btn" id="flow-collapse-btn" title="Collapse panel">−</button>
      </div>
      <ol class="flow-steps" id="flow-steps-list"></ol>
    `;
    document.getElementById('app').appendChild(panel);
    this.el = panel;

    // Collapse toggle
    const collapseBtn = document.getElementById('flow-collapse-btn');
    const stepsList = document.getElementById('flow-steps-list');
    if (collapseBtn && stepsList) {
      collapseBtn.addEventListener('click', () => {
        const isCollapsed = stepsList.classList.toggle('collapsed');
        collapseBtn.textContent = isCollapsed ? '+' : '−';
      });
    }

    this._renderSteps();
  }

  _renderSteps() {
    const list = document.getElementById('flow-steps-list');
    if (!list) return;
    list.innerHTML = '';

    FLOW_STEPS.forEach((step, idx) => {
      const li = document.createElement('li');
      li.className = 'flow-step flow-step-incomplete';
      li.id = `flow-step-${idx}`;
      li.innerHTML = `
        <span class="flow-step-icon">${step.icon}</span>
        <div class="flow-step-body">
          <span class="flow-step-label">${step.label}</span>
          <span class="flow-step-desc">${step.description}</span>
        </div>
        <button class="flow-why-btn" id="flow-why-${idx}" title="Why is this step needed?">❓</button>
      `;
      list.appendChild(li);

      // "Why?" button: trigger narration + feedback for the current step
      const whyBtn = document.getElementById(`flow-why-${idx}`);
      if (whyBtn) {
        whyBtn.addEventListener('click', () => this._onWhyPressed(idx));
      }
    });
  }

  _onWhyPressed(stepIdx) {
    const step = FLOW_STEPS[stepIdx];
    const narrationTexts = [
      GUIDED_NARRATION_EVENTS.welcome,
      'Press the Start Current button once all 7 required wires are connected. This closes the plug key and starts current safely.',
      GUIDED_NARRATION_EVENTS.rheostatAdjust,
      GUIDED_NARRATION_EVENTS.readingSaved,
      'After recording your readings, open the V–I graph panel to see the plotted data. A straight line confirms Ohm\'s Law.',
      GUIDED_NARRATION_EVENTS.fiveReadings
    ];

    const text = narrationTexts[stepIdx] || step.description;
    if (this.narration) {
      this.narration.speak(text, `❓ ${step.label}: ${step.description}`);
    }
    this.onFeedback({ type: 'info', message: `ℹ️ ${step.label}: ${step.description}` });
  }

  /**
   * Sync visual state from simulation workflow step.
   */
  _syncFromSimulation() {
    if (!this.simulation) return;
    const state = this.simulation.getState();
    const workflowStep = state.workflowStep; // 1–6

    for (let i = 0; i < FLOW_STEPS.length; i++) {
      const li = document.getElementById(`flow-step-${i}`);
      if (!li) continue;

      const stepNumber = i + 1; // 1-indexed

      if (stepNumber < workflowStep) {
        li.className = 'flow-step flow-step-complete';
      } else if (stepNumber === workflowStep) {
        li.className = 'flow-step flow-step-current';
      } else {
        li.className = 'flow-step flow-step-incomplete';
      }
    }
  }

  show() {
    if (this.el) this.el.style.display = '';
  }

  hide() {
    if (this.el) this.el.style.display = 'none';
  }
}
