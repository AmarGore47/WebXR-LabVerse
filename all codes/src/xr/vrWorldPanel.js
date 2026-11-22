/**
 * vrWorldPanel.js
 * Modular, Clean WebXR Assistant for Ohm's Law Virtual Practical.
 *
 * Divided into 2 focused, non-obtrusive components:
 * 1. HUD Pill: Floating compact step-by-step guidance pill floating above the workbench
 * 2. Stand: Separate observation & graph clipboard on the right-hand side stand
 *
 * STRICT: Hand-tracking & laser pinch compatible. No controller APIs.
 */

import * as THREE from 'three';

export class VRWorldPanel {
  constructor(options = {}) {
    this.scene = options.scene;
    this.callbacks = options.callbacks || {};
    this.apparatusLabels = options.apparatusLabels || null;
    this.labelsVisible = true;
    this.standVisible = true;

    this.group = new THREE.Group();
    this.group.name = 'VRWorldPanelGroup';
    this.group.position.set(0, 0, 0); // Root stays at origin; children positioned modularly
    this.group.visible = false; // Hidden on desktop, activated upon entering VR

    this.buttons = [];
    this.hoveredButtonId = null;
    this.selectedOrientStep = null;

    this.activeTab = 'table'; // 'table' | 'graph' | 'orientation'
    this.lastState = {
      instruction: 'Connect Battery (+) to Switch Contact (Left)',
      circuitStatus: 'Incomplete',
      circuitReady: false,
      keyClosed: false,
      voltage: 0.0,
      current: 0.0,
      rheostatResistance: 12.0,
      readingCount: 0,
      minReadings: 5,
      isVerified: false,
      readings: [],
      statistics: null,
      workflowStep: 1
    };

    this._buildHUD();
    this._buildStand();

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  // ─── 1. Floating Top Guidance HUD (Compact Pill) ──────────────────────────

  _buildHUD() {
    this.hudGroup = new THREE.Group();
    this.hudGroup.name = 'VR_HUD_StepPill';
    // Placed well above the table, angled comfortably down towards the student's eyes
    this.hudGroup.position.set(0.0, 1.58, -0.32);
    this.hudGroup.rotation.set(0.12, 0, 0);

    const canvasW = 1024;
    const canvasH = 240;
    this.hudCanvasW = canvasW;
    this.hudCanvasH = canvasH;
    this.hudPanelW = 0.66;
    this.hudPanelH = 0.155;

    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.width = canvasW;
    this.hudCanvas.height = canvasH;
    this.hudCtx = this.hudCanvas.getContext('2d');

    this.hudTexture = new THREE.CanvasTexture(this.hudCanvas);
    this.hudTexture.minFilter = THREE.LinearFilter;

    const mat = new THREE.MeshBasicMaterial({
      map: this.hudTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const geo = new THREE.PlaneGeometry(this.hudPanelW, this.hudPanelH);
    this.hudMesh = new THREE.Mesh(geo, mat);
    this.hudGroup.add(this.hudMesh);

    // Hitbox conversion helper
    const to3D = (cx, cy, cw, ch) => ({
      x: ((cx + cw / 2) / canvasW - 0.5) * this.hudPanelW,
      y: (0.5 - (cy + ch / 2) / canvasH) * this.hudPanelH,
      w: (cw / canvasW) * this.hudPanelW,
      h: (ch / canvasH) * this.hudPanelH
    });

    // Clean HUD buttons
    const hudButtons = [
      { id: 'undo_wire', label: '↩️ Undo Wire', ...to3D(630, 35, 88, 76) },
      { id: 'toggle_labels_vr', label: '🏷️ Labels', ...to3D(728, 35, 88, 76) },
      { id: 'toggle_stand', label: '📋 Stand', ...to3D(826, 35, 88, 76) },
      { id: 'exit_vr', label: '🚪 Exit VR', ...to3D(924, 35, 80, 76) }
    ];

    hudButtons.forEach((cfg) => {
      const bMesh = this._createHitbox(cfg);
      this.hudGroup.add(bMesh);
      this.buttons.push(bMesh);
    });

    this.group.add(this.hudGroup);
    this.renderHUD();
  }

  // ─── 2. Observation & Graph Clipboard Stand (Side Module) ────────────────

  _buildStand() {
    this.standGroup = new THREE.Group();
    this.standGroup.name = 'VR_Stand_Observation';
    // Placed to the right of the table, angled facing the student
    this.standGroup.position.set(1.16, 1.08, 0.12);
    this.standGroup.rotation.set(0, -1.02, 0);

    const canvasW = 1024;
    const canvasH = 820;
    this.standCanvasW = canvasW;
    this.standCanvasH = canvasH;
    this.standPanelW = 0.72;
    this.standPanelH = 0.58;

    this.standCanvas = document.createElement('canvas');
    this.standCanvas.width = canvasW;
    this.standCanvas.height = canvasH;
    this.standCtx = this.standCanvas.getContext('2d');

    this.standTexture = new THREE.CanvasTexture(this.standCanvas);
    this.standTexture.minFilter = THREE.LinearFilter;

    const mat = new THREE.MeshBasicMaterial({
      map: this.standTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const geo = new THREE.PlaneGeometry(this.standPanelW, this.standPanelH);
    this.standMesh = new THREE.Mesh(geo, mat);
    this.standGroup.add(this.standMesh);

    // Hitbox conversion helper
    const to3D = (cx, cy, cw, ch) => ({
      x: ((cx + cw / 2) / canvasW - 0.5) * this.standPanelW,
      y: (0.5 - (cy + ch / 2) / canvasH) * this.standPanelH,
      w: (cw / canvasW) * this.standPanelW,
      h: (ch / canvasH) * this.standPanelH
    });

    // Stand Buttons
    const standButtons = [
      // Navigation Tabs
      { id: 'tab_orient', label: '🎯 Orientation', ...to3D(36, 24, 186, 52) },
      { id: 'tab_table', label: '📋 Observation Table', ...to3D(230, 24, 196, 52) },
      { id: 'tab_graph', label: '📈 V–I Graph', ...to3D(434, 24, 186, 52) },
      { id: 'tab_result', label: '🎓 Result & Info', ...to3D(628, 24, 206, 52) },

      // Practical Actions
      { id: 'start_practical', label: '⚡ Start Practical', ...to3D(846, 24, 142, 52) },
      { id: 'end_practical', label: '🏆 End Practical', ...to3D(846, 24, 142, 52) },

      // Table Actions
      { id: 'record_reading', label: '📝 Record Reading', ...to3D(650, 680, 200, 56) },
      { id: 'clear_readings', label: '🗑 Clear', ...to3D(860, 680, 128, 56) },
      { id: 'restart_exp', label: '🔄 Reset All', ...to3D(36, 750, 160, 48) },

      // Rheostat Quick Presets
      { id: 'rheo_p1', label: '18Ω', ...to3D(40, 680, 100, 56) },
      { id: 'rheo_p2', label: '14Ω', ...to3D(150, 680, 100, 56) },
      { id: 'rheo_p3', label: '10Ω', ...to3D(260, 680, 100, 56) },
      { id: 'rheo_p4', label: '6Ω', ...to3D(370, 680, 100, 56) },
      { id: 'rheo_p5', label: '2Ω', ...to3D(480, 680, 100, 56) }
    ];

    standButtons.forEach((cfg) => {
      const bMesh = this._createHitbox(cfg);
      this.standGroup.add(bMesh);
      this.buttons.push(bMesh);
    });

    this.group.add(this.standGroup);
    this.renderStand();
  }

  _createHitbox(cfg) {
    const boxGeo = new THREE.BoxGeometry(cfg.w, cfg.h, 0.024);
    const boxMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.position.set(cfg.x, cfg.y, 0.012);
    boxMesh.userData = {
      vrButtonId: cfg.id,
      label: cfg.label
    };
    return boxMesh;
  }

  // ─── Rendering: Top HUD Pill ─────────────────────────────────────────────

  renderHUD() {
    if (!this.hudCtx) return;
    const ctx = this.hudCtx;
    const w = this.hudCanvasW;
    const h = this.hudCanvasH;
    const state = this.lastState;

    ctx.clearRect(0, 0, w, h);

    // Obsidian pill glass background
    ctx.fillStyle = 'rgba(7, 14, 28, 0.95)';
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 24);
    ctx.fill();

    // Subtle Cyan glowing border
    ctx.strokeStyle = state.keyClosed ? '#22c55e' : (state.circuitReady ? '#38bdf8' : '#0284c7');
    ctx.lineWidth = 3;
    ctx.stroke();

    // Header Tag
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText("🔬 OHM'S LAW PRACTICAL — STD. 10", 34, 28);

    // Current Status / Instruction
    let mainText = state.instruction || 'Assemble 7 circuit connections';
    if (state.keyClosed) {
      mainText = `⚡ Current Flowing: I = ${state.current.toFixed(2)} A | V = ${state.voltage.toFixed(2)} V (Adjust Rheostat)`;
    } else if (state.circuitReady) {
      mainText = '✅ Circuit Complete! Press the green START button on the table.';
    }

    ctx.fillStyle = state.keyClosed ? '#4ade80' : (state.circuitReady ? '#67e8f9' : '#f8fafc');
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText(mainText.length > 44 ? mainText.slice(0, 42) + '…' : mainText, 34, 62);

    // Wires status / Readings pill
    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Inter, sans-serif';
    const connCount = state.connectionsCount !== undefined ? state.connectionsCount : ((state.connections && state.connections.length) || 0);
    const sub = state.keyClosed
      ? `Observations: ${state.readingCount} / ${state.minReadings} Recorded | Rheostat: ${state.rheostatResistance.toFixed(1)} Ω`
      : `Connections: ${connCount}/7 assembled • Use pointer or pinch to connect`;
    ctx.fillText(sub, 34, 105);

    // Right Action Buttons
    const drawBtn = (id, label, icon, x, y, bw, bh, active = false) => {
      const isHov = this.hoveredButtonId === id;
      ctx.fillStyle = active ? '#0284c7' : isHov ? '#1e3a8a' : 'rgba(30, 41, 59, 0.9)';
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 12);
      ctx.fill();
      ctx.strokeStyle = isHov ? '#ffffff' : active ? '#38bdf8' : '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, x + bw / 2, y + bh / 2 - 12);
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(label, x + bw / 2, y + bh / 2 + 14);
    };

    drawBtn('undo_wire', 'Undo', '↩️', 630, 35, 88, 76);
    drawBtn('toggle_labels_vr', 'Labels', '🏷️', 728, 35, 88, 76, this.labelsVisible);
    drawBtn('toggle_stand', 'Stand', '📋', 826, 35, 88, 76, this.standVisible);
    drawBtn('exit_vr', 'Exit', '🚪', 924, 35, 80, 76);

    this.hudTexture.needsUpdate = true;
  }

  // ─── Rendering: Side Stand (Observation & Graph) ─────────────────────────

  renderStand() {
    if (!this.standCtx) return;
    const ctx = this.standCtx;
    const w = this.standCanvasW;
    const h = this.standCanvasH;
    const state = this.lastState;

    ctx.clearRect(0, 0, w, h);

    // Obsidian rounded stand backing
    ctx.fillStyle = 'rgba(7, 14, 28, 0.97)';
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 24);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Top Tabs
    const drawTab = (id, label, x, y, bw, bh, active) => {
      const isHov = this.hoveredButtonId === id;
      ctx.fillStyle = active ? '#0284c7' : isHov ? '#1e293b' : 'rgba(15, 23, 42, 0.8)';
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 12);
      ctx.fill();
      ctx.strokeStyle = active ? '#38bdf8' : isHov ? '#94a3b8' : '#334155';
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.stroke();

      ctx.fillStyle = active ? '#ffffff' : '#cbd5e1';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + bw / 2, y + bh / 2);
    };

    drawTab('tab_orient', '🎯 Orientation', 36, 24, 186, 52, this.activeTab === 'orientation');
    drawTab('tab_table', '📋 Table', 230, 24, 196, 52, this.activeTab === 'table');
    drawTab('tab_graph', '📈 Graph', 434, 24, 186, 52, this.activeTab === 'graph');
    drawTab('tab_result', '🎓 Result', 628, 24, 206, 52, this.activeTab === 'result');

    // Practical Action Button: [ ⚡ Start ] / [ 🏆 End Practical ]
    if (state.readingCount >= state.minReadings) {
      const isHov = this.hoveredButtonId === 'end_practical';
      ctx.fillStyle = isHov ? '#15803d' : '#166534';
      ctx.beginPath();
      ctx.roundRect(846, 24, 142, 52, 12);
      ctx.fill();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 Finish', 917, 50);
    } else {
      const isHov = this.hoveredButtonId === 'start_practical';
      ctx.fillStyle = isHov ? '#0369a1' : '#075985';
      ctx.beginPath();
      ctx.roundRect(846, 24, 142, 52, 12);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.keyClosed ? '⚡ Active' : '▶ Ready', 917, 50);
    }

    // Tab Content Area
    if (this.activeTab === 'graph') {
      this._renderGraphContent(ctx, state);
    } else if (this.activeTab === 'result') {
      this._renderResultContent(ctx, state);
    } else if (this.activeTab === 'orientation') {
      this._renderOrientationContent(ctx, state);
    } else {
      this._renderTableContent(ctx, state);
    }

    this.standTexture.needsUpdate = true;
  }

  _renderTableContent(ctx, state) {
    // Table Header
    const ty = 100;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(36, ty, 952, 50, 8);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S.No.', 80, ty + 25);
    ctx.fillText('Voltmeter V (V)', 260, ty + 25);
    ctx.fillText('Ammeter I (A)', 490, ty + 25);
    ctx.fillText('Resistance R = V / I (Ω)', 780, ty + 25);

    // Rows
    const readings = state.readings || [];
    for (let i = 0; i < 5; i++) {
      const rowY = ty + 60 + i * 56;
      const r = readings[i];

      ctx.fillStyle = i % 2 === 0 ? 'rgba(30, 41, 59, 0.45)' : 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.roundRect(36, rowY, 952, 48, 8);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '22px Inter, sans-serif';
      ctx.fillText(`${i + 1}`, 80, rowY + 24);

      if (r) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(Number(r.voltage).toFixed(2), 260, rowY + 24);
        ctx.fillStyle = '#4ade80';
        ctx.fillText(Number(r.current).toFixed(3), 490, rowY + 24);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(Number(r.resistance).toFixed(2), 780, rowY + 24);
      } else {
        ctx.fillStyle = '#475569';
        ctx.fillText('—', 260, rowY + 24);
        ctx.fillText('—', 490, rowY + 24);
        ctx.fillText('—', 780, rowY + 24);
      }
    }

    // Stats Bar
    const statsY = ty + 360;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(36, statsY, 952, 60, 10);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const stats = state.statistics;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    const meanText = stats && stats.meanResistance != null && typeof stats.meanResistance === 'number' ? `${stats.meanResistance.toFixed(2)} Ω` : '—';
    ctx.fillText(`Mean Resistance R̄: ${meanText}  |  Nominal Value: 5.00 Ω  |  Observations: ${state.readingCount} / ${state.minReadings}`, 56, statsY + 30);

    // Presets Row Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText('Quick Rheostat Presets:', 40, 655);

    // Draw Quick Rheostat Preset Buttons
    const presets = [
      { id: 'rheo_p1', label: '18 Ω', x: 40 },
      { id: 'rheo_p2', label: '14 Ω', x: 150 },
      { id: 'rheo_p3', label: '10 Ω', x: 260 },
      { id: 'rheo_p4', label: '6 Ω', x: 370 },
      { id: 'rheo_p5', label: '2 Ω', x: 480 }
    ];

    presets.forEach((p) => {
      const isHov = this.hoveredButtonId === p.id;
      ctx.fillStyle = isHov ? '#0284c7' : 'rgba(30, 41, 59, 0.9)';
      ctx.beginPath();
      ctx.roundRect(p.x, 680, 100, 56, 10);
      ctx.fill();
      ctx.strokeStyle = isHov ? '#ffffff' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x + 50, 708);
    });

    // Record Reading & Clear Buttons
    const isRecHov = this.hoveredButtonId === 'record_reading';
    ctx.fillStyle = isRecHov ? '#15803d' : '#166534';
    ctx.beginPath();
    ctx.roundRect(650, 680, 200, 56, 12);
    ctx.fill();
    ctx.strokeStyle = isRecHov ? '#ffffff' : '#22c55e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📝 Record', 750, 708);

    const isClearHov = this.hoveredButtonId === 'clear_readings';
    ctx.fillStyle = isClearHov ? '#7f1d1d' : 'rgba(69, 10, 10, 0.7)';
    ctx.beginPath();
    ctx.roundRect(860, 680, 128, 56, 12);
    ctx.fill();
    ctx.strokeStyle = isClearHov ? '#ffffff' : '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('🗑 Clear', 924, 708);
  }

  _renderGraphContent(ctx, state) {
    const gx = 100, gy = 120, gw = 820, gh = 520;

    // Graph Area background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(gx, gy, gw, gh, 12);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Axis
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx + 60, gy + gh - 50);
    ctx.lineTo(gx + gw - 30, gy + gh - 50); // X-axis (V)
    ctx.moveTo(gx + 60, gy + gh - 50);
    ctx.lineTo(gx + 60, gy + 30); // Y-axis (I)
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Potential Difference V (Volts) ➔', gx + gw / 2, gy + gh - 15);

    ctx.save();
    ctx.translate(gx + 25, gy + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('Current I (Amperes) ➔', 0, 0);
    ctx.restore();

    // Ideal linear slope line (V = I * R => I = V / 5)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx + 60, gy + gh - 50);
    ctx.lineTo(gx + gw - 40, gy + 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot recorded readings
    const readings = state.readings || [];
    readings.forEach((r, idx) => {
      const vFrac = Math.min(1.0, r.voltage / 4.0);
      const iFrac = Math.min(1.0, r.current / 0.8);
      const px = gx + 60 + vFrac * (gw - 100);
      const py = gy + gh - 50 - iFrac * (gh - 90);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`#${idx + 1} (${r.voltage.toFixed(1)}V, ${r.current.toFixed(2)}A)`, px + 10, py - 6);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Plotted Points: ${readings.length} / 5  |  Slope is constant => V ∝ I (Ohm's Law Verified)`, 56, 750);
  }

  _renderOrientationContent(ctx, state) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText("🎯 Experiment Orientation & Procedure Flow", 48, 100);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText("Verification of Ohm's Law (V = I × R) · Maharashtra Std. 10 Physics", 48, 136);

    // Aim & Principle Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(48, 170, 928, 115, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 19px Inter, sans-serif';
    ctx.fillText("📌 Scientific Aim & Core Principle:", 68, 188);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '17px Inter, sans-serif';
    ctx.fillText("At constant temperature, current (I) is directly proportional to potential difference (V).", 68, 218);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 19px "JetBrains Mono", monospace';
    ctx.fillText("V = I × R   ⟹   R = V / I = Constant (Nominal Specimen Coil = 5.00 Ω)", 68, 248);

    // 6-Phase Flow Cards
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText("📋 6-Phase Practical Flow Roadmap:", 48, 305);

    const phases = [
      { step: "1. Identify", icon: "🔍", desc: "Inspect Battery, Key, Rheostat, Ammeter, Resistor, Voltmeter", status: "Phase 1" },
      { step: "2. Connect", icon: "🔌", desc: "Connect 7 wires (Series loop + Voltmeter in parallel across R)", status: `${(state.connections && state.connections.length) || 0}/7 Wires` },
      { step: "3. Start", icon: "⚡", desc: "Close Plug Key or press green 3D Start button to start current", status: state.keyClosed ? "Active" : "Ready" },
      { step: "4. Record", icon: "📝", desc: "Adjust Rheostat slider across 5 positions, click Record Reading", status: `${state.readingCount}/5 Done` },
      { step: "5. Graph", icon: "📈", desc: "Plot Voltage vs Current on millimeter graph; verify straight line", status: "V vs I" },
      { step: "6. Verify", icon: "🏁", desc: "Calculate Slope = R; unlock achievement badges and conclusion", status: state.readingCount >= 5 ? "Verified" : "Pending" }
    ];

    phases.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px = 48 + col * 474;
      const py = 338 + row * 115;

      ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(px, py, 454, 100, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText(`${p.icon}  ${p.step}`, px + 18, py + 16);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(p.status, px + 436, py + 18);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '15px Inter, sans-serif';
      this._wrapTextStand(ctx, p.desc, px + 18, py + 48, 418, 22);
    });

    // Bottom Advice
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(48, 705, 928, 70, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText("💡 Quick VR Interaction Tip:", 68, 720);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText("Point index finger at any terminal and pinch thumb to connect wires. Tap 'Table' tab above anytime!", 68, 746);
  }

  _wrapTextStand(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currY);
        line = words[n] + ' ';
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currY);
  }

  _renderResultContent(ctx, state) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText("🎓 Result, Verification & Badges", 48, 105);

    const isDone = state.readingCount >= 5;
    const stats = state.statistics;
    const meanR = stats && stats.meanResistance != null ? stats.meanResistance : 5.00;

    // Result Card
    ctx.fillStyle = isDone ? 'rgba(240, 253, 244, 0.85)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isDone ? '#22c55e' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(48, 150, 928, 140, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDone ? '#15803d' : '#38bdf8';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(isDone ? "✅ VERIFIED RESULT: OHM'S LAW CONFIRMED" : "📌 SCIENTIFIC RESULT IN PROGRESS", 68, 168);

    ctx.fillStyle = isDone ? '#0f172a' : '#cbd5e1';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText(`1. Measured Mean Resistance: R̄ = ${isDone ? meanR.toFixed(2) : '—'} Ω (Nominal: 5.00 Ω).`, 68, 202);
    ctx.fillText("2. The V–I characteristic graph is a straight line passing through the origin (0, 0).", 68, 232);
    ctx.fillText("3. Statement: At constant temperature, Current (I) ∝ Potential Difference (V).", 68, 262);

    // Achievement Badges
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText("🏆 Student Achievement Badges:", 48, 310);

    const badges = [
      { icon: "🏆", name: "Circuit Master", desc: "7/7 wires correctly assembled", unlocked: state.connections && state.connections.length >= 7 },
      { icon: "⭐", name: "Precision Observer", desc: "5/5 readings recorded", unlocked: isDone },
      { icon: "🎓", name: "Ohm's Law Scholar", desc: "Linear graph & R confirmed", unlocked: isDone }
    ];

    badges.forEach((b, idx) => {
      const bx = 48 + idx * 316;
      ctx.fillStyle = b.unlocked ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.6)';
      ctx.strokeStyle = b.unlocked ? '#38bdf8' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, 345, 296, 120, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.icon, bx + 45, 385);

      ctx.textAlign = 'left';
      ctx.fillStyle = b.unlocked ? '#38bdf8' : '#64748b';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText(b.name, bx + 90, 375);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(b.desc, bx + 20, 415);

      ctx.fillStyle = b.unlocked ? '#4ade80' : '#475569';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(b.unlocked ? '✅ UNLOCKED' : '🔒 LOCKED', bx + 20, 442);
    });

    // Precautions
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText("⚠️ Key Precautions (Maharashtra Board):", 48, 495);

    const precautions = [
      "• All terminal connections must be clean, secure, and tightly fastened.",
      "• Plug key must only be inserted when recording readings to avoid heating the resistor coil.",
      "• Voltmeter is ALWAYS connected in parallel; Ammeter is ALWAYS connected in series.",
      "• Vary rheostat across distinct settings to obtain well-distributed observation points."
    ];

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px Inter, sans-serif';
    precautions.forEach((p, idx) => {
      ctx.fillText(p, 48, 535 + idx * 36);
    });
  }

  // ─── Public API (Maintained for full backward compatibility) ─────────────

  renderCanvas() {
    this.renderHUD();
    this.renderStand();
  }

  updateContent(state = {}) {
    this.lastState = { ...this.lastState, ...state };
    this.renderHUD();
    this.renderStand();
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.renderStand();
  }

  toggleStand() {
    this.standVisible = !this.standVisible;
    this.standGroup.visible = this.standVisible;
    this.renderHUD();
    return this.standVisible;
  }

  getButtons() {
    return this.buttons;
  }

  setHoveredButton(btnId) {
    if (this.hoveredButtonId !== btnId) {
      this.hoveredButtonId = btnId;
      this.renderHUD();
      this.renderStand();
    }
  }

  pressButton(btnId) {
    if (!btnId) return;

    // Tab Navigation
    if (btnId === 'tab_orient') {
      this.switchTab('orientation');
      return;
    }
    if (btnId === 'tab_table') {
      this.switchTab('table');
      return;
    }
    if (btnId === 'tab_graph') {
      this.switchTab('graph');
      return;
    }
    if (btnId === 'tab_result') {
      this.switchTab('result');
      return;
    }

    // Toggle Stand Visibility
    if (btnId === 'toggle_stand') {
      this.toggleStand();
      return;
    }

    // Toggle Labels
    if (btnId === 'toggle_labels_vr') {
      if (this.callbacks.onToggleLabels) {
        this.labelsVisible = this.callbacks.onToggleLabels();
        this.renderHUD();
      }
      return;
    }

    // Practical lifecycle
    if (btnId === 'start_practical' && this.callbacks.onStartPractical) {
      this.callbacks.onStartPractical();
      return;
    }
    if (btnId === 'end_practical' && this.callbacks.onEndPractical) {
      this.callbacks.onEndPractical();
      return;
    }

    // Exit VR
    if (btnId === 'exit_vr' && this.callbacks.onExitVR) {
      this.callbacks.onExitVR();
      return;
    }

    // Rheostat presets
    if (btnId === 'rheo_p1' && this.callbacks.onSetRheostat) {
      this.callbacks.onSetRheostat(18.0);
      return;
    }
    if (btnId === 'rheo_p2' && this.callbacks.onSetRheostat) {
      this.callbacks.onSetRheostat(14.0);
      return;
    }
    if (btnId === 'rheo_p3' && this.callbacks.onSetRheostat) {
      this.callbacks.onSetRheostat(10.0);
      return;
    }
    if (btnId === 'rheo_p4' && this.callbacks.onSetRheostat) {
      this.callbacks.onSetRheostat(6.0);
      return;
    }
    if (btnId === 'rheo_p5' && this.callbacks.onSetRheostat) {
      this.callbacks.onSetRheostat(2.0);
      return;
    }

    // Standard Actions
    switch (btnId) {
      case 'record_reading':
        if (this.callbacks.onRecordReading) this.callbacks.onRecordReading();
        break;
      case 'clear_readings':
        if (this.callbacks.onClearReadings) this.callbacks.onClearReadings();
        break;
      case 'undo_wire':
        if (this.callbacks.onUndoWire) this.callbacks.onUndoWire();
        break;
      case 'cancel_selection':
        if (this.callbacks.onCancelSelection) this.callbacks.onCancelSelection();
        break;
      case 'restart_exp':
        if (this.callbacks.onRestartExp) this.callbacks.onRestartExp();
        break;
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
    if (visible) {
      this.renderHUD();
      this.renderStand();
    }
  }
}
