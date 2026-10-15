/**
 * viGraph.js
 * Responsive HTML5 Canvas-based scientific V–I Graph for Ohm's Law.
 * Plots Voltage (V) on Y-axis vs Current (I) on X-axis,
 * renders best-fit straight line, calculates slope (R = ΔV/ΔI),
 * and verifies Ohm's Law proportionality.
 */

export class ViGraph {
  constructor(options) {
    this.container = options.container;
    this.simulation = options.simulation;

    this.canvas = null;
    this.ctx = null;
    this.slopeTextEl = null;
    this.verdictTextEl = null;

    this.render();
    this.simulation.subscribe(() => this.draw());
    window.addEventListener('resize', () => this.handleResize());
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="vi-graph-card">
        <div class="graph-header">
          <div>
            <h4>📈 V–I Graph (Potential Difference vs Current)</h4>
            <span class="graph-subtitle">X-axis: Current I (A) &nbsp;|&nbsp; Y-axis: Potential Difference V (V)</span>
          </div>
          <div class="slope-display-badge">
            <span class="badge-label">Graph Slope (R):</span>
            <span id="graph-slope-val" class="badge-val">— Ω</span>
          </div>
        </div>

        <div class="canvas-wrapper" style="position: relative; width: 100%; height: 260px;">
          <canvas id="vi-chart-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
          <div id="graph-empty-overlay" class="graph-empty-overlay">
            <span>Record at least 2 readings in the Observation Table to plot the V–I graph.</span>
          </div>
        </div>

        <div class="graph-footer">
          <p id="graph-verdict-text" class="verdict-text">
            Ohm’s Law Verification: Record 5 distinct readings across the rheostat range to unlock verified slope.
          </p>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#vi-chart-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.slopeTextEl = this.container.querySelector('#graph-slope-val');
    this.verdictTextEl = this.container.querySelector('#graph-verdict-text');
    this.emptyOverlay = this.container.querySelector('#graph-empty-overlay');

    this.handleResize();
  }

  handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = rect.width || 420;
    this.height = rect.height || 260;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    this.draw();
  }

  draw() {
    if (!this.ctx || !this.canvas) return;

    const state = this.simulation.getState();
    const readings = state.readings;
    const stats = state.statistics;

    const W = this.width;
    const H = this.height;

    // Clear background
    this.ctx.clearRect(0, 0, W, H);

    // Padding for axes & labels
    const padLeft = 45;
    const padBottom = 35;
    const padTop = 18;
    const padRight = 24;

    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    // Coordinate ranges: I: 0 to 0.60 A, V: 0 to 6.0 V
    const maxI = 0.60;
    const maxV = 6.00;

    const toX = (valI) => padLeft + (valI / maxI) * plotW;
    const toY = (valV) => padTop + plotH - (valV / maxV) * plotH;

    // 1. Draw Grid Lines & Ticks
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = '#64748b';
    this.ctx.font = '10px "JetBrains Mono", monospace';
    this.ctx.textAlign = 'center';

    // Horizontal grid lines (V: 1V, 2V, 3V, 4V, 5V, 6V)
    for (let v = 0; v <= maxV; v += 1.0) {
      const y = toY(v);
      this.ctx.beginPath();
      this.ctx.moveTo(padLeft, y);
      this.ctx.lineTo(padLeft + plotW, y);
      this.ctx.stroke();

      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${v.toFixed(0)}V`, padLeft - 6, y + 3.5);
    }

    // Vertical grid lines (I: 0.1A, 0.2A, 0.3A, 0.4A, 0.5A, 0.6A)
    for (let i = 0; i <= maxI + 0.001; i += 0.10) {
      const x = toX(i);
      this.ctx.beginPath();
      this.ctx.moveTo(x, padTop);
      this.ctx.lineTo(x, padTop + plotH);
      this.ctx.stroke();

      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${i.toFixed(1)}A`, x, padTop + plotH + 16);
    }

    // 2. Draw Solid Main Axes
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 1.8;
    this.ctx.beginPath();
    // Y-axis
    this.ctx.moveTo(padLeft, padTop);
    this.ctx.lineTo(padLeft, padTop + plotH);
    // X-axis
    this.ctx.lineTo(padLeft + plotW, padTop + plotH);
    this.ctx.stroke();

    // Axis Labels
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = 'bold 11px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Current I (A) →', padLeft + plotW / 2, H - 4);

    this.ctx.save();
    this.ctx.translate(14, padTop + plotH / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillText('Potential Difference V (V) →', 0, 0);
    this.ctx.restore();

    // If no readings or only 1, show overlay
    if (readings.length < 2) {
      if (this.emptyOverlay) this.emptyOverlay.style.display = 'flex';
      if (this.slopeTextEl) this.slopeTextEl.textContent = '— Ω';
      if (this.verdictTextEl) {
        this.verdictTextEl.innerHTML =
          'Ohm’s Law Verification: Record 5 distinct readings across the rheostat range to unlock verified slope.';
        this.verdictTextEl.className = 'verdict-text';
      }
      return;
    }

    if (this.emptyOverlay) this.emptyOverlay.style.display = 'none';

    // 3. Draw Best-Fit Straight Line (V = m * I)
    const slope = stats.slopeResistance;
    if (slope > 0) {
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 2.2;
      this.ctx.setLineDash([5, 4]);

      // Calculate line end point within bounds
      const endI = Math.min(maxI, maxV / slope);
      const endV = endI * slope;

      this.ctx.beginPath();
      this.ctx.moveTo(toX(0), toY(0));
      this.ctx.lineTo(toX(endI), toY(endV));
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // 4. Plot Observed Data Points
    readings.forEach((r, idx) => {
      const px = toX(r.current);
      const py = toY(r.voltage);

      // Glow halo
      this.ctx.fillStyle = 'rgba(45, 212, 191, 0.28)';
      this.ctx.beginPath();
      this.ctx.arc(px, py, 9, 0, Math.PI * 2);
      this.ctx.fill();

      // Outer ring
      this.ctx.strokeStyle = '#2dd4bf';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(px, py, 5, 0, Math.PI * 2);
      this.ctx.stroke();

      // Core point
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(px, py, 2.8, 0, Math.PI * 2);
      this.ctx.fill();

      // Coordinate label
      this.ctx.fillStyle = '#f0f9ff';
      this.ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`P${idx + 1}(${r.current.toFixed(2)}, ${r.voltage.toFixed(2)})`, px + 8, py - 6);
    });

    // 5. Update UI Badges & Verdict Banner
    if (this.slopeTextEl) {
      this.slopeTextEl.textContent = `${stats.slopeResistance.toFixed(2)} Ω`;
    }

    if (this.verdictTextEl) {
      if (stats.isVerified) {
        this.verdictTextEl.innerHTML = `
          🎉 <strong>Ohm’s Law Verified!</strong> The V–I graph is a straight line passing through the origin (Slope R = ${stats.slopeResistance.toFixed(2)} Ω ≈ 10.00 Ω). Therefore, potential difference $V$ is directly proportional to current $I$.
        `;
        this.verdictTextEl.className = 'verdict-text verified';
      } else {
        this.verdictTextEl.innerHTML = `
          Linear Trend Plotted (${readings.length} / ${state.minReadings} readings). Calculated slope $R = ${stats.slopeResistance.toFixed(2)}$ Ω. Record at least 5 readings to finalize scientific verification.
        `;
        this.verdictTextEl.className = 'verdict-text';
      }
    }
  }
}
