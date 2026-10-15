/**
 * observationTable.js
 * Renders the Maharashtra Std. 10 Ohm's Law observation table,
 * handles record reading actions, duplicates check, row deletion,
 * and summary mean resistance calculation.
 */

export class ObservationTable {
  constructor(options) {
    this.container = options.container;
    this.simulation = options.simulation;
    this.onFeedback = options.onFeedback || (() => {});

    this.pendingClearConfirm = false;

    this.render();
    this.simulation.subscribe(() => this.update());
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="obs-table-wrapper">
        <div class="obs-header">
          <div class="obs-title-area">
            <h4>📋 Observation Table</h4>
            <span id="obs-count-badge" class="badge">0 / 5 Readings</span>
          </div>
          <div class="obs-actions">
            <button id="end-table-btn" class="btn btn-subtle" style="display: none; background: #b45309; color: #fff; font-weight: 700; border: 1.5px solid #fde047;" title="End practical safely and verify Ohm's Law">
              <span>🏆</span> End Practical
            </button>
            <button id="record-reading-btn" class="btn btn-primary" title="Record current values into observation table">
              <span>📝</span> Record Reading
            </button>
            <button id="clear-readings-btn" class="btn btn-subtle" title="Clear recorded observations">
              <span>🗑️</span> Clear
            </button>
          </div>
        </div>

        <div class="table-scroll-container">
          <table class="obs-table" id="obs-data-table">
            <thead>
              <tr>
                <th style="width: 45px;">#</th>
                <th>Rheostat (Ω)</th>
                <th>Current I (A)</th>
                <th>Voltage V (V)</th>
                <th>V / I (Ω)</th>
                <th style="width: 50px;">Action</th>
              </tr>
            </thead>
            <tbody id="obs-table-body">
              <!-- Rows injected here -->
            </tbody>
            <tfoot id="obs-table-foot" style="display: none;">
              <tr>
                <td colspan="4" style="text-align: right; font-weight: 600;">Mean Resistance (R̄ = Σ(V/I) / N):</td>
                <td id="obs-mean-ratio" style="font-weight: 700; color: #38bdf8;">—</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <div id="obs-empty-msg" class="obs-empty-state">
            No readings recorded yet.<br>
            <span style="font-size: 11.5px; color: #94a3b8;">
              Assemble the valid circuit, close the plug key, adjust the rheostat, and click <strong>Record Reading</strong>.
            </span>
          </div>
        </div>
      </div>
    `;

    this.tbody = this.container.querySelector('#obs-table-body');
    this.tfoot = this.container.querySelector('#obs-table-foot');
    this.meanRatioEl = this.container.querySelector('#obs-mean-ratio');
    this.countBadge = this.container.querySelector('#obs-count-badge');
    this.emptyMsg = this.container.querySelector('#obs-empty-msg');
    this.recordBtn = this.container.querySelector('#record-reading-btn');
    this.clearBtn = this.container.querySelector('#clear-readings-btn');

    this.setupListeners();
    this.update();
  }

  setupListeners() {
    if (this.recordBtn) {
      this.recordBtn.addEventListener('click', () => {
        const res = this.simulation.recordReading();
        this.onFeedback({
          type: res.success ? 'success' : 'warning',
          message: res.message
        });
      });
    }

    this.endTableBtn = this.container.querySelector('#end-table-btn');
    if (this.endTableBtn) {
      this.endTableBtn.addEventListener('click', () => {
        const res = this.simulation.endPractical();
        if (res.success) {
          this.onFeedback({
            type: 'success',
            message: `🏆 Practical Complete! Mean R = ${res.stats.meanResistance} Ω. Plug key opened safely.`
          });
        }
      });
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        if (this.simulation.readings.length === 0) return;

        if (!this.pendingClearConfirm) {
          this.pendingClearConfirm = true;
          this.clearBtn.textContent = '⚠️ Confirm Clear?';
          this.clearBtn.classList.add('confirming');

          setTimeout(() => {
            this.pendingClearConfirm = false;
            if (this.clearBtn) {
              this.clearBtn.innerHTML = '<span>🗑️</span> Clear';
              this.clearBtn.classList.remove('confirming');
            }
          }, 3500);
          return;
        }

        this.pendingClearConfirm = false;
        this.clearBtn.innerHTML = '<span>🗑️</span> Clear';
        this.clearBtn.classList.remove('confirming');

        this.simulation.clearReadings();
        this.onFeedback({
          type: 'info',
          message: 'Observation table cleared.'
        });
      });
    }
  }

  update() {
    const state = this.simulation.getState();
    const readings = state.readings;

    // 1. Update count badge
    if (this.countBadge) {
      this.countBadge.textContent = `${readings.length} / ${state.minReadings} Readings`;
      if (readings.length >= state.minReadings) {
        this.countBadge.className = 'badge badge-success';
      } else {
        this.countBadge.className = 'badge';
      }
    }

    // 2. Update Record button availability
    if (this.recordBtn) {
      const canRecord =
        state.circuitReady &&
        state.keyClosed &&
        state.current > 0.001 &&
        readings.length < state.maxReadings;
      this.recordBtn.disabled = !canRecord;
    }

    // 3. Update Clear and End buttons availability
    if (this.clearBtn && !this.pendingClearConfirm) {
      this.clearBtn.disabled = readings.length === 0;
    }
    if (this.endTableBtn) {
      this.endTableBtn.style.display = (readings.length >= 5) ? 'inline-flex' : 'none';
    }

    // 4. Render Table rows
    if (!this.tbody) return;

    if (readings.length === 0) {
      this.tbody.innerHTML = '';
      if (this.emptyMsg) this.emptyMsg.style.display = 'block';
      if (this.tfoot) this.tfoot.style.display = 'none';
      return;
    }

    if (this.emptyMsg) this.emptyMsg.style.display = 'none';
    if (this.tfoot) this.tfoot.style.display = 'table-footer-group';

    this.tbody.innerHTML = '';

    readings.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: #94a3b8;">${idx + 1}</td>
        <td>${r.rheostatResistance.toFixed(2)} Ω</td>
        <td style="font-weight: 600; color: #38bdf8;">${r.current.toFixed(2)} A</td>
        <td style="font-weight: 600; color: #2dd4bf;">${r.voltage.toFixed(2)} V</td>
        <td style="font-weight: 700; color: #fbbf24;">${r.ratio.toFixed(2)} Ω</td>
        <td>
          <button class="row-del-btn" data-id="${r.id}" title="Delete this reading">✕</button>
        </td>
      `;

      const delBtn = tr.querySelector('.row-del-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        this.simulation.deleteReading(id);
        this.onFeedback({
          type: 'info',
          message: `Deleted observation #${idx + 1}.`
        });
      });

      this.tbody.appendChild(tr);
    });

    // 5. Update mean ratio in footer
    if (this.meanRatioEl) {
      this.meanRatioEl.textContent = `${state.statistics.meanRatio.toFixed(2)} Ω`;
    }
  }
}
