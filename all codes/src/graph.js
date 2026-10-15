/**
 * graph.js - High-Precision 2D Canvas Scientific V-I Graph for Maharashtra Std. 10 Physics.
 * Plots Potential Difference (V) vs Current (I) with least-squares linear fit and slope calculation.
 */

export class VIGraph {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.maxV = 6.0;   // Volts
    this.maxI = 1.2;   // Amperes
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (rect.width > 0 && rect.height > 0) {
      this.canvas.width = Math.floor(rect.width * dpr);
      this.canvas.height = Math.floor(rect.height * dpr);
    }
  }

  render(readings = []) {
    const c = this.canvas;
    const g = this.ctx;
    const w = c.width;
    const h = c.height;

    if (!w || !h) return;

    g.clearRect(0, 0, w, h);

    // Dark sleek lab background
    const bgGrad = g.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a192f');
    bgGrad.addColorStop(1, '#051020');
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, w, h);

    // Margins
    const padL = Math.max(46, Math.floor(w * 0.12));
    const padR = Math.max(24, Math.floor(w * 0.06));
    const padT = Math.max(26, Math.floor(h * 0.1));
    const padB = Math.max(36, Math.floor(h * 0.14));

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Coordinate conversion
    const toScreenX = (iVal) => padL + (iVal / this.maxI) * plotW;
    const toScreenY = (vVal) => padT + plotH - (vVal / this.maxV) * plotH;

    // Grid lines - fine physics lab graph paper
    // Sub-grid
    g.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    g.lineWidth = 1;
    for (let i = 0; i <= 24; i++) {
      const x = padL + (i / 24) * plotW;
      g.beginPath();
      g.moveTo(x, padT);
      g.lineTo(x, padT + plotH);
      g.stroke();
    }
    for (let v = 0; v <= 24; v++) {
      const y = padT + (v / 24) * plotH;
      g.beginPath();
      g.moveTo(padL, y);
      g.lineTo(padL + plotW, y);
      g.stroke();
    }

    // Major grid lines
    g.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    g.lineWidth = 1;
    // Current ticks: every 0.2 A
    g.fillStyle = '#94a3b8';
    g.font = `${Math.max(10, Math.floor(h * 0.045))}px Inter, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'top';

    for (let iVal = 0; iVal <= this.maxI + 0.001; iVal += 0.2) {
      const x = toScreenX(iVal);
      g.beginPath();
      g.moveTo(x, padT);
      g.lineTo(x, padT + plotH);
      g.stroke();
      g.fillText(iVal.toFixed(1), x, padT + plotH + 6);
    }

    // Voltage ticks: every 1.0 V
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let vVal = 0; vVal <= this.maxV + 0.001; vVal += 1.0) {
      const y = toScreenY(vVal);
      g.beginPath();
      g.moveTo(padL, y);
      g.lineTo(padL + plotW, y);
      g.stroke();
      g.fillText(vVal.toFixed(1), padL - 8, y);
    }

    // Main Axes
    g.strokeStyle = '#38bdf8';
    g.lineWidth = 2;
    g.beginPath();
    // Y-axis (V)
    g.moveTo(padL, padT);
    g.lineTo(padL, padT + plotH);
    // X-axis (I)
    g.lineTo(padL + plotW, padT + plotH);
    g.stroke();

    // Axis Labels
    g.fillStyle = '#38bdf8';
    g.font = `bold ${Math.max(11, Math.floor(h * 0.05))}px Inter, sans-serif`;
    g.textAlign = 'center';
    g.fillText('Electric Current I (A) →', padL + plotW / 2, h - 10);

    g.save();
    g.translate(14, padT + plotH / 2);
    g.rotate(-Math.PI / 2);
    g.fillText('Potential Difference V (V) →', 0, 0);
    g.restore();

    // Origin (0,0) mark
    g.fillStyle = '#64748b';
    g.font = '10px Inter, sans-serif';
    g.textAlign = 'right';
    g.fillText('0', padL - 6, padT + plotH + 6);

    // Plot best-fit line if readings exist
    if (readings.length > 0) {
      // Calculate slope m = sum(I * V) / sum(I^2) (line passing through origin)
      let sumIV = 0;
      let sumI2 = 0;
      readings.forEach((r) => {
        sumIV += r.i * r.v;
        sumI2 += r.i * r.i;
      });
      const slope = sumI2 > 0 ? sumIV / sumI2 : 5.0;

      // Draw linear fit line through origin
      const maxLineI = Math.min(this.maxI, this.maxV / slope);
      const startX = toScreenX(0);
      const startY = toScreenY(0);
      const endX = toScreenX(maxLineI);
      const endY = toScreenY(maxLineI * slope);

      g.strokeStyle = '#2dd4bf';
      g.lineWidth = 2.5;
      g.setLineDash([6, 3]);
      g.beginPath();
      g.moveTo(startX, startY);
      g.lineTo(endX, endY);
      g.stroke();
      g.setLineDash([]);

      // Plotted points
      readings.forEach((r, idx) => {
        const px = toScreenX(r.i);
        const py = toScreenY(r.v);

        // Point glow
        g.fillStyle = 'rgba(251, 191, 36, 0.35)';
        g.beginPath();
        g.arc(px, py, 9, 0, Math.PI * 2);
        g.fill();

        // Point center
        g.fillStyle = '#fbbf24';
        g.beginPath();
        g.arc(px, py, 4.5, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.5;
        g.stroke();

        // Coordinate text
        g.fillStyle = '#f8fafc';
        g.font = 'bold 9px Inter, sans-serif';
        g.textAlign = 'left';
        g.fillText(`(${r.i.toFixed(2)}A, ${r.v.toFixed(2)}V)`, px + 8, py - 6);
      });

      // Slope box badge in top right corner
      g.fillStyle = 'rgba(15, 23, 42, 0.85)';
      g.strokeStyle = '#2dd4bf';
      g.lineWidth = 1;
      const badgeW = Math.max(140, Math.floor(plotW * 0.42));
      const badgeH = 34;
      const badgeX = padL + plotW - badgeW - 6;
      const badgeY = padT + 6;
      g.fillRect(badgeX, badgeY, badgeW, badgeH);
      g.strokeRect(badgeX, badgeY, badgeW, badgeH);

      g.fillStyle = '#2dd4bf';
      g.font = `bold ${Math.max(10, Math.floor(h * 0.045))}px Inter, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`Slope = ΔV/ΔI = ${slope.toFixed(2)} Ω`, badgeX + badgeW / 2, badgeY + badgeH / 2);
    } else {
      // Empty hint
      g.fillStyle = 'rgba(148, 163, 184, 0.6)';
      g.font = 'italic 12px Inter, sans-serif';
      g.textAlign = 'center';
      g.fillText('Take readings to plot V–I characteristic graph', padL + plotW / 2, padT + plotH / 2);
    }
  }
}
