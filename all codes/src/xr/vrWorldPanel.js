/**
 * vrWorldPanel.js
 * High-Visibility 3D Spatial "Ohm's Law Experiment" Assistant Panel for WebXR.
 * - Ultra-crisp 1.5K Canvas texture rendering for Meta Quest & WebXR headsets
 * - Prominent "⬅️ Back / Exit VR" options (header + bottom bar)
 * - Complete Experiment Modal matching user design:
 *   - Header with workflow step & Restart button
 *   - Differentiated Ammeter & Voltmeter cards with high-contrast glowing readouts
 *   - Power flow status banner with dynamic color states
 *   - Rheostat Resistance slider & quick presets [Min, -1.0, +1.0, Max]
 *   - Tabs: [ 📋 Observation Table ], [ 📈 V–I Graph ], [ 🎯 Result & Precautions ], [ 📸 Photo Guide ]
 *   - Spacious Observation Table with Record Reading and Clear buttons (zero overlap)
 *   - Safety bottom bar: [ ↩️ Undo Wire ], [ ✕ Cancel Selection ], [ ⬅️ Back / Exit VR ]
 */

import * as THREE from 'three';
import { XR_CONFIG } from './xrConfig.js';

export class VRWorldPanel {
  constructor(options = {}) {
    this.scene = options.scene;
    this.callbacks = options.callbacks || {};

    this.group = new THREE.Group();
    this.group.name = 'VRWorldPanel';
    this.buttons = [];
    this.hoveredButtonId = null;
    this.selectedOrientStep = null;

    // UI state - default to 'orientation' so student in VR immediately sees the 7-wire step-by-step sequence
    this.activeTab = 'orientation'; // 'orientation' | 'table' | 'graph' | 'result' | 'guide'
    this.lastState = {
      instruction: 'Connect the apparatus terminals to complete the circuit.',
      circuitStatus: 'Incomplete',
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

    this.initBoardMesh();
    this.initButtons();

    // Position panel to the left of the lab workbench, angled towards student
    const cfg = XR_CONFIG.vrPanel;
    this.group.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
    this.group.rotation.y = cfg.rotationY;

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  initBoardMesh() {
    const cfg = XR_CONFIG.vrPanel;
    this.canvas = document.createElement('canvas');
    this.canvas.width = cfg.canvasWidth || 1536;
    this.canvas.height = cfg.canvasHeight || 1080;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;

    // Load user's photographic circuit connection diagram
    this.guideImg = new Image();
    this.guideImg.crossOrigin = 'anonymous';
    this.guideImg.src = '/images/ohms_law_circuit_guide.png';
    this.guideImg.onload = () => {
      this.renderCanvas();
    };

    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    // Panel dimensions in VR: 1.15m wide x 0.80m tall
    const geo = new THREE.PlaneGeometry(cfg.width || 1.15, cfg.height || 0.80);
    this.boardMesh = new THREE.Mesh(geo, mat);
    this.group.add(this.boardMesh);

    // Initial render
    this.renderCanvas();
  }

  initButtons() {
    const canvasW = 1536;
    const canvasH = 1080;
    const panelW = XR_CONFIG.vrPanel.width || 1.15;
    const panelH = XR_CONFIG.vrPanel.height || 0.80;

    // Helper: Converts canvas pixel bounds (cx, cy, cw, ch) to exact 3D hitbox coordinates
    const to3D = (cx, cy, cw, ch) => ({
      x: ((cx + cw / 2) / canvasW - 0.5) * panelW,
      y: (0.5 - (cy + ch / 2) / canvasH) * panelH,
      w: (cw / canvasW) * panelW,
      h: (ch / canvasH) * panelH
    });

    // Button pixel configurations with generous spacing and zero overlap
    const btnConfigs = [
      // 1. Top Header
      { id: 'exit_vr_top', label: '⬅️ Back / Exit VR', ...to3D(42, 18, 220, 50) },
      { id: 'start_practical', label: '⚡ Start Practical', ...to3D(860, 18, 390, 50) },
      { id: 'end_practical', label: '🏆 End Practical', ...to3D(860, 18, 390, 50) },
      { id: 'restart_exp', label: '🔄 Restart Exp', ...to3D(1274, 18, 220, 50) },

      // 2. Rheostat 5 Discrete Presets (for 5 Ohm's Law readings) + Step Adjusters
      { id: 'rheo_p1', label: '1️⃣ 18 Ω', ...to3D(620, 276, 95, 54) },
      { id: 'rheo_p2', label: '2️⃣ 14 Ω', ...to3D(725, 276, 95, 54) },
      { id: 'rheo_p3', label: '3️⃣ 10 Ω', ...to3D(830, 276, 95, 54) },
      { id: 'rheo_p4', label: '4️⃣ 6 Ω', ...to3D(935, 276, 95, 54) },
      { id: 'rheo_p5', label: '5️⃣ 2 Ω', ...to3D(1040, 276, 95, 54) },
      { id: 'rheo_sub', label: '-1.0 Ω', ...to3D(1145, 276, 125, 54) },
      { id: 'rheo_add', label: '+1.0 Ω', ...to3D(1280, 276, 125, 54) },

      // 3. Navigation Tabs (5 Tabs with Orientation)
      { id: 'tab_orientation', label: '🎯 Orientation', ...to3D(42, 364, 280, 50) },
      { id: 'tab_table', label: '📋 Observation Table', ...to3D(336, 364, 290, 50) },
      { id: 'tab_graph', label: '📈 V–I Graph', ...to3D(640, 364, 280, 50) },
      { id: 'tab_result', label: '🎯 Result & Precautions', ...to3D(934, 364, 290, 50) },
      { id: 'tab_guide', label: '📸 Photo Guide', ...to3D(1238, 364, 256, 50) },

      // 4. Observation Table Sub-actions (located below tabs with clean gap)
      { id: 'end_practical_table', label: '🏆 End Practical', ...to3D(460, 428, 410, 50) },
      { id: 'record_reading', label: '📝 Record Reading', ...to3D(890, 428, 290, 50) },
      { id: 'clear_readings', label: '🗑 Clear', ...to3D(1200, 428, 180, 50) },

      // 5. Voice & Tour Sub-actions in Orientation View
      { id: 'toggle_voice', label: '🔊 Voice Guide: ON', ...to3D(730, 438, 175, 36) },
      { id: 'tour_steps', label: '🌟 3D Glow Tour', ...to3D(915, 438, 175, 36) },

      // 6. Interactive 8 Orientation Step Cards (Pinch to highlight & speak)
      { id: 'orient_step_1', label: 'Step 1: Battery+ -> Key', ...to3D(60, 482, 696, 100) },
      { id: 'orient_step_2', label: 'Step 2: Key -> Ammeter+', ...to3D(60, 592, 696, 100) },
      { id: 'orient_step_3', label: 'Step 3: Ammeter- -> Rheostat', ...to3D(60, 702, 696, 100) },
      { id: 'orient_step_4', label: 'Step 4: Rheostat -> ResistorL', ...to3D(60, 812, 696, 100) },
      { id: 'orient_step_5', label: 'Step 5: ResistorR -> Battery-', ...to3D(780, 482, 696, 100) },
      { id: 'orient_step_6', label: 'Step 6: Voltmeter+ -> ResistorL', ...to3D(780, 592, 696, 100) },
      { id: 'orient_step_7', label: 'Step 7: Voltmeter- -> ResistorR', ...to3D(780, 702, 696, 100) },
      { id: 'orient_step_8', label: 'Step 8: Close Key & Verify', ...to3D(780, 812, 696, 100) },

      // 7. Bottom Safety Bar
      { id: 'undo_wire', label: '↩️ Undo Wire', ...to3D(42, 1000, 330, 56) },
      { id: 'cancel_selection', label: '✕ Cancel Selection', ...to3D(395, 1000, 390, 56) },
      { id: 'exit_vr', label: '⬅️ Back / Exit VR', ...to3D(1164, 1000, 330, 56) }
    ];

    btnConfigs.forEach((cfg) => {
      const btnGroup = new THREE.Group();
      btnGroup.position.set(cfg.x, cfg.y, 0.012);

      const boxGeo = new THREE.BoxGeometry(cfg.w, cfg.h, 0.02);
      // Invisible hit-box: colorWrite & depthWrite false ensures ZERO grey boxes or occlusion over 2D canvas text
      const boxMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      btnGroup.add(boxMesh);

      boxMesh.userData = {
        vrButtonId: cfg.id,
        label: cfg.label,
        boxMat,
        btnGroup,
        initialZ: 0.012
      };

      this.group.add(btnGroup);
      this.buttons.push(boxMesh);
    });
  }

  updateContent(state = {}) {
    this.lastState = { ...this.lastState, ...state };
    this.renderCanvas();
  }

  renderCanvas() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const state = this.lastState;

    ctx.clearRect(0, 0, w, h);

    // 1. Dark Obsidian Glassmorphism Container with smooth rounded corners
    ctx.fillStyle = 'rgba(7, 14, 28, 0.98)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(10, 10, w - 20, h - 20, 24) : ctx.fillRect(10, 10, w - 20, h - 20);
    ctx.fill();

    // Glowing Cyan Frame (high contrast)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 2. Header Bar
    // Top-Left: [ ⬅️ Back / Exit VR ]
    const isExitTopHov = this.hoveredButtonId === 'exit_vr_top';
    ctx.fillStyle = isExitTopHov ? '#dc2626' : '#991b1b';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(42, 18, 220, 50, 10) : ctx.fillRect(42, 18, 220, 50);
    ctx.fill();
    ctx.strokeStyle = isExitTopHov ? '#ffffff' : '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⬅️ Back / Exit VR', 152, 43);

    // Title & Live Step Indicator
    ctx.textBaseline = 'alphabetic';
    const statusDotColor = state.keyClosed ? '#22c55e' : (state.circuitStatus === 'Complete' ? '#38bdf8' : '#f59e0b');
    ctx.fillStyle = statusDotColor;
    ctx.beginPath();
    ctx.arc(300, 43, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("Ohm’s Law Experiment", 320, 42);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Inter, sans-serif';
    const stepTxt = state.instruction || 'Assemble all 7 circuit connections';
    ctx.fillText(stepTxt.length > 56 ? stepTxt.slice(0, 54) + '...' : stepTxt, 320, 64);

    // Top-Center Action Button: [ ⚡ START PRACTICAL ] or [ 🏆 END PRACTICAL ]
    if (state.circuitReady && !state.keyClosed) {
      const isStartHov = this.hoveredButtonId === 'start_practical';
      ctx.fillStyle = isStartHov ? '#15803d' : '#166534';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(860, 18, 390, 50, 10) : ctx.fillRect(860, 18, 390, 50);
      ctx.fill();
      ctx.strokeStyle = isStartHov ? '#86efac' : '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ START PRACTICAL / CHALU KAREIN', 1055, 43);
      ctx.textBaseline = 'alphabetic';
    } else if (state.readings && state.readings.length >= 5) {
      const isEndHov = this.hoveredButtonId === 'end_practical';
      ctx.fillStyle = isEndHov ? '#b45309' : '#92400e';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(860, 18, 390, 50, 10) : ctx.fillRect(860, 18, 390, 50);
      ctx.fill();
      ctx.strokeStyle = isEndHov ? '#fde047' : '#eab308';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏆 END PRACTICAL & VERIFY', 1055, 43);
      ctx.textBaseline = 'alphabetic';
    } else if (state.keyClosed) {
      ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(860, 18, 390, 50, 10) : ctx.fillRect(860, 18, 390, 50);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ Practical Running · Vary Rh (1-5)', 1055, 43);
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(860, 18, 390, 50, 10) : ctx.fillRect(860, 18, 390, 50);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏳ Awaiting Circuit Connections (0/7)', 1055, 43);
      ctx.textBaseline = 'alphabetic';
    }

    // Top-Right: [ 🔄 Restart Exp ]
    const isRestartHov = this.hoveredButtonId === 'restart_exp';
    ctx.fillStyle = isRestartHov ? '#0284c7' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(1274, 18, 220, 50, 10) : ctx.fillRect(1274, 18, 220, 50);
    ctx.fill();
    ctx.strokeStyle = isRestartHov ? '#38bdf8' : '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄 Restart Exp', 1384, 43);
    ctx.textBaseline = 'alphabetic';

    // 3. Dual Digital Meters (Clearly Differentiated Cards, Ultra-High Contrast)
    const meterY = 84;
    const meterH = 104;
    const meterW = 716;

    // --- Left Meter: Electric Current (I) in Amperes ---
    ctx.fillStyle = 'rgba(8, 24, 46, 0.98)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(42, meterY, meterW, meterH, 14) : ctx.fillRect(42, meterY, meterW, meterH);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Accent strip on left of card
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(42, meterY + 12, 6, meterH - 24);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ ELECTRIC CURRENT (I) — AMMETER:', 62, meterY + 34);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 54px "JetBrains Mono", monospace';
    const curVal = (state.current || 0.0).toFixed(2);
    ctx.fillText(`${curVal} A`, 62, meterY + 86);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Series Ammeter Reading', 42 + meterW - 24, meterY + 58);

    // --- Right Meter: Potential Difference (V) in Volts ---
    const voltX = 778;
    ctx.fillStyle = 'rgba(6, 36, 36, 0.98)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(voltX, meterY, meterW, meterH, 14) : ctx.fillRect(voltX, meterY, meterW, meterH);
    ctx.fill();
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Accent strip on left of card
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(voltX, meterY + 12, 6, meterH - 24);

    ctx.fillStyle = '#5eead4';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔋 POTENTIAL DIFFERENCE (V) — VOLTMETER:', voltX + 20, meterY + 34);

    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 54px "JetBrains Mono", monospace';
    const voltVal = (state.voltage || 0.0).toFixed(2);
    ctx.fillText(`${voltVal} V`, voltX + 20, meterY + 86);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Across 10 Ω Resistor', voltX + meterW - 24, meterY + 58);

    // 4. Circuit Flow Status Banner
    const statusY = 202;
    const statusH = 46;
    let statBg = 'rgba(30, 41, 59, 0.9)';
    let statBorder = '#475569';
    let statColor = '#cbd5e1';
    let statText = '🔒 Plug Key (Assemble Circuit First)';

    if (state.circuitStatus !== 'Complete' && !state.circuitReady) {
      statBg = 'rgba(69, 26, 3, 0.9)';
      statBorder = '#f59e0b';
      statColor = '#fef08a';
      statText = '⚠️ Circuit Incomplete — Assemble all 7 wires between apparatus terminals';
    } else if (!state.keyClosed) {
      statBg = 'rgba(15, 34, 56, 0.95)';
      statBorder = '#38bdf8';
      statColor = '#7dd3fc';
      statText = '🔑 Circuit Complete — Click [ ⚡ START PRACTICAL ] above to close key & start current';
    } else {
      statBg = 'rgba(6, 78, 59, 0.98)';
      statBorder = '#22c55e';
      statColor = '#86efac';
      statText = `⚡ Current Flowing: ${curVal} A at ${voltVal} V · Resistor Active · Power: ${((state.current || 0) * (state.voltage || 0)).toFixed(2)} W`;
    }

    ctx.fillStyle = statBg;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(42, statusY, w - 84, statusH, 10) : ctx.fillRect(42, statusY, w - 84, statusH);
    ctx.fill();
    ctx.strokeStyle = statBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = statColor;
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statText, w / 2, statusY + statusH / 2);
    ctx.textBaseline = 'alphabetic';

    // 5. Rheostat Resistance (Rh) Section
    const rheoY = 258;
    const rheoH = 92;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(42, rheoY, w - 84, rheoH, 14) : ctx.fillRect(42, rheoY, w - 84, rheoH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title & Live Value Badge
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Rheostat Resistance (Rh):', 64, rheoY + 34);

    const rhVal = (state.rheostatResistance || 12.0).toFixed(2);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillText(`${rhVal} Ω`, 340, rheoY + 34);

    // Track Bar
    const trackX = 64;
    const trackY = rheoY + 50;
    const trackW = 520;
    ctx.fillStyle = 'rgba(51, 65, 85, 0.9)';
    ctx.fillRect(trackX, trackY, trackW, 10);

    const rhFrac = Math.max(0, Math.min(1, ((state.rheostatResistance || 12) - 0.5) / (20.0 - 0.5)));
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(trackX, trackY, trackW * rhFrac, 10);

    // Slider Thumb
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(trackX + trackW * rhFrac, trackY + 5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Tip caption
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '15px Inter, sans-serif';
    ctx.fillText('💡 Click presets 1–5 to vary current and record 5 observations in table.', 64, rheoY + 80);

    // 5 Discrete Presets (18Ω, 14Ω, 10Ω, 6Ω, 2Ω) + Step Adjusters (-1Ω, +1Ω)
    const presets = [
      { id: 'rheo_p1', label: '1️⃣ 18Ω', rhVal: 18.0, x: 620, w: 95 },
      { id: 'rheo_p2', label: '2️⃣ 14Ω', rhVal: 14.0, x: 725, w: 95 },
      { id: 'rheo_p3', label: '3️⃣ 10Ω', rhVal: 10.0, x: 830, w: 95 },
      { id: 'rheo_p4', label: '4️⃣ 6Ω', rhVal: 6.0, x: 935, w: 95 },
      { id: 'rheo_p5', label: '5️⃣ 2Ω', rhVal: 2.0, x: 1040, w: 95 },
      { id: 'rheo_sub', label: '➖ -1.0 Ω', x: 1145, w: 125 },
      { id: 'rheo_add', label: '➕ +1.0 Ω', x: 1280, w: 125 }
    ];

    presets.forEach((p) => {
      const isHov = this.hoveredButtonId === p.id;
      const isSel = p.rhVal && Math.abs((state.rheostatResistance || 12.0) - p.rhVal) < 0.25;
      ctx.fillStyle = isSel ? '#0284c7' : (isHov ? '#0369a1' : '#1e293b');
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(p.x, 276, p.w, 54, 8) : ctx.fillRect(p.x, 276, p.w, 54);
      ctx.fill();
      ctx.strokeStyle = isSel ? '#38bdf8' : (isHov ? '#7dd3fc' : '#475569');
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();

      ctx.fillStyle = isSel ? '#ffffff' : '#f8fafc';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, p.x + p.w / 2, 276 + 27);
      ctx.textBaseline = 'alphabetic';
    });

    // 6. Navigation Tabs Strip (5 Tabs cleanly spaced)
    const tabY = 364;
    const tabH = 50;
    const tabs = [
      { id: 'tab_orientation', mode: 'orientation', label: '🎯 Orientation', x: 42, w: 280 },
      { id: 'tab_table', mode: 'table', label: '📋 Observation Table', x: 336, w: 290 },
      { id: 'tab_graph', mode: 'graph', label: '📈 V–I Graph', x: 640, w: 280 },
      { id: 'tab_result', mode: 'result', label: '🎯 Result & Precautions', x: 934, w: 290 },
      { id: 'tab_guide', mode: 'guide', label: '📸 Photo Guide', x: 1238, w: 256 }
    ];

    tabs.forEach((t) => {
      const isActive = this.activeTab === t.mode;
      const isHov = this.hoveredButtonId === t.id;
      ctx.fillStyle = isActive ? '#0284c7' : (isHov ? '#1e293b' : '#0f172a');
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(t.x, tabY, t.w, tabH, 8) : ctx.fillRect(t.x, tabY, t.w, tabH);
      ctx.fill();
      ctx.strokeStyle = isActive ? '#38bdf8' : '#334155';
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.stroke();

      // Active tab bottom indicator
      if (isActive) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(t.x + 20, tabY + tabH - 4, t.w - 40, 4);
      }

      ctx.fillStyle = isActive ? '#ffffff' : '#cbd5e1';
      ctx.font = 'bold 19px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label, t.x + t.w / 2, tabY + tabH / 2 - (isActive ? 2 : 0));
      ctx.textBaseline = 'alphabetic';
    });

    // 7. Active Tab View Render (starts at y = 428, zero overlap with tabs)
    if (this.activeTab === 'orientation') {
      this.drawOrientationView(ctx, w, h, state);
    } else if (this.activeTab === 'guide') {
      this.drawGuideView(ctx, w, h, state);
    } else if (this.activeTab === 'graph') {
      this.drawGraphView(ctx, w, h, state);
    } else if (this.activeTab === 'result') {
      this.drawResultView(ctx, w, h, state);
    } else {
      this.drawObservationTableView(ctx, w, h, state);
    }

    // 8. Bottom Safety Bar: [ ↩️ Undo Wire ] [ ✕ Cancel Selection ] [ ⬅️ Back / Exit VR ]
    const bottomBarY = 1000;
    const bottomH = 56;
    const bottomBtns = [
      { id: 'undo_wire', label: '↩️ Undo Wire', x: 42, w: 330, color: '#1e293b', border: '#38bdf8' },
      { id: 'cancel_selection', label: '✕ Cancel Selection', x: 395, w: 390, color: '#78350f', border: '#f59e0b' },
      { id: 'exit_vr', label: '⬅️ Back / Exit VR', x: 1164, w: 330, color: '#991b1b', border: '#f87171' }
    ];

    bottomBtns.forEach((b) => {
      const isHov = this.hoveredButtonId === b.id;
      ctx.fillStyle = isHov ? '#0284c7' : b.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(b.x, bottomBarY, b.w, bottomH, 10) : ctx.fillRect(b.x, bottomBarY, b.w, bottomH);
      ctx.fill();
      ctx.strokeStyle = isHov ? '#ffffff' : b.border;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, bottomBarY + bottomH / 2);
      ctx.textBaseline = 'alphabetic';
    });

    this.texture.needsUpdate = true;
  }

  drawObservationTableView(ctx, w, h, state) {
    // Content starts at y = 428 (14px below the tab row)
    const contentY = 428;

    // Sub-header Bar: Observation Table Label + Readings Badge + [Record Reading] + [Clear]
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Observation Table', 56, contentY + 34);

    // Readings Badge e.g. "0 / 5 Readings"
    const count = (state.readings ? state.readings.length : state.readingCount) || 0;
    ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(280, contentY + 4, 175, 42, 8) : ctx.fillRect(280, contentY + 4, 175, 42);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${count} / 5 Readings`, 367, contentY + 31);

    // Center Action Button: [ 🏆 End Practical & Verify ] or [ ⚡ Start Practical ]
    const readings = state.readings || [];
    if (readings.length >= 5) {
      const isEndHov = this.hoveredButtonId === 'end_practical_table';
      ctx.fillStyle = isEndHov ? '#b45309' : '#92400e';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(460, contentY, 410, 50, 10) : ctx.fillRect(460, contentY, 410, 50);
      ctx.fill();
      ctx.strokeStyle = isEndHov ? '#fde047' : '#eab308';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏆 End Practical & Verify Law', 665, contentY + 25);
      ctx.textBaseline = 'alphabetic';
    } else if (!state.keyClosed && state.circuitReady) {
      const isStartHov = this.hoveredButtonId === 'start_practical';
      ctx.fillStyle = isStartHov ? '#15803d' : '#166534';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(460, contentY, 410, 50, 10) : ctx.fillRect(460, contentY, 410, 50);
      ctx.fill();
      ctx.strokeStyle = isStartHov ? '#86efac' : '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ Start Practical / Chalu Karein', 665, contentY + 25);
      ctx.textBaseline = 'alphabetic';
    } else if (state.keyClosed) {
      ctx.fillStyle = 'rgba(6, 78, 59, 0.7)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(460, contentY, 410, 50, 10) : ctx.fillRect(460, contentY, 410, 50);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⚡ Current Active · ${Math.max(0, 5 - count)} readings remaining`, 665, contentY + 25);
      ctx.textBaseline = 'alphabetic';
    }

    // Button: [ 📝 Record Reading ] (Cleanly placed on right, y = 428)
    const isRecordHov = this.hoveredButtonId === 'record_reading';
    ctx.fillStyle = isRecordHov ? '#059669' : '#047857';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(890, contentY, 290, 50, 10) : ctx.fillRect(890, contentY, 290, 50);
    ctx.fill();
    ctx.strokeStyle = isRecordHov ? '#6ee7b7' : '#10b981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📝 Record Reading', 1035, contentY + 25);

    // Button: [ 🗑 Clear ] (Cleanly placed, y = 428)
    const isClearHov = this.hoveredButtonId === 'clear_readings';
    ctx.fillStyle = isClearHov ? '#dc2626' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(1200, contentY, 180, 50, 10) : ctx.fillRect(1200, contentY, 180, 50);
    ctx.fill();
    ctx.strokeStyle = isClearHov ? '#fca5a5' : '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 19px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🗑 Clear', 1290, contentY + 25);
    ctx.textBaseline = 'alphabetic';

    // Observation Table Container
    const boxY = 488;
    const boxH = 470;
    ctx.fillStyle = 'rgba(10, 18, 34, 0.96)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(42, boxY, w - 84, boxH, 14) : ctx.fillRect(42, boxY, w - 84, boxH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Table Header Row
    ctx.fillStyle = 'rgba(20, 32, 54, 0.98)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(42, boxY, w - 84, 54, [14, 14, 0, 0]) : ctx.fillRect(42, boxY, w - 84, 54);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 19px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#', 90, boxY + 34);
    ctx.fillText('Rheostat Rh (Ω)', 270, boxY + 34);
    ctx.fillText('Current I (A)', 550, boxY + 34);
    ctx.fillText('Voltage V (V)', 830, boxY + 34);
    ctx.fillText('Ratio V / I (Ω)', 1110, boxY + 34);
    ctx.fillText('Verification', 1360, boxY + 34);

    if (readings.length === 0) {
      // Empty state text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No observations recorded yet.', w / 2, boxY + 160);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '19px Inter, sans-serif';
      ctx.fillText('1. Complete all 7 wires  ➔  2. Click [ ⚡ START PRACTICAL ]  ➔  3. Click Rheostat Presets (1–5)  ➔  4. Click [ 📝 Record Reading ]', w / 2, boxY + 215);
    } else {
      // Draw rows (up to 5 readings)
      readings.slice(0, 5).forEach((r, idx) => {
        const rowY = boxY + 54 + idx * 62;
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(15, 27, 48, 0.6)' : 'rgba(20, 36, 64, 0.6)';
        ctx.fillRect(42, rowY, w - 84, 58);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.beginPath();
        ctx.moveTo(42, rowY + 58);
        ctx.lineTo(w - 42, rowY + 58);
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${idx + 1}`, 90, rowY + 38);

        ctx.fillStyle = '#fde047';
        ctx.fillText(`${r.rheostatResistance.toFixed(2)} Ω`, 270, rowY + 38);

        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${r.current.toFixed(2)} A`, 550, rowY + 38);

        ctx.fillStyle = '#2dd4bf';
        ctx.fillText(`${r.voltage.toFixed(2)} V`, 830, rowY + 38);

        ctx.fillStyle = '#34d399';
        ctx.fillText(`${r.ratio.toFixed(2)} Ω`, 1110, rowY + 38);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillText('✓ Valid', 1360, rowY + 36);
      });

      // Mean Resistance Footer Banner
      if (readings.length >= 2) {
        const stats = state.statistics;
        const meanR = stats && stats.meanRatio ? stats.meanRatio : 10.0;
        const footY = boxY + boxH - 52;

        ctx.fillStyle = 'rgba(6, 78, 59, 0.65)';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(56, footY, w - 112, 42, 8) : ctx.fillRect(56, footY, w - 112, 42);
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🎉 Mean Resistance R = ${meanR.toFixed(2)} Ω (Theoretical: 10.00 Ω, V ∝ I) · Ohm’s Law Verified!`, w / 2, footY + 28);
      }
    }
  }

  drawGraphView(ctx, w, h, state) {
    const boxY = 428;
    const boxH = 530;
    ctx.fillStyle = 'rgba(10, 18, 34, 0.96)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(42, boxY, w - 84, boxH, 16) : ctx.fillRect(42, boxY, w - 84, boxH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📈 V–I Characteristic Graph (Potential Difference vs Electric Current)', 68, boxY + 40);

    // Coordinate Axes
    const origX = 140;
    const origY = boxY + boxH - 75;
    const plotW = 1220;
    const plotH = 340;

    // Grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 5; i++) {
      const y = origY - (plotH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(origX, y);
      ctx.lineTo(origX + plotW, y);
      ctx.stroke();
    }
    for (let i = 1; i <= 6; i++) {
      const x = origX + (plotW / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, origY);
      ctx.lineTo(x, origY - plotH);
      ctx.stroke();
    }

    // Main Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(origX, origY - plotH);
    ctx.lineTo(origX, origY);
    ctx.lineTo(origX + plotW, origY);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Electric Current I (Amperes) →', origX + plotW / 2, origY + 45);
    ctx.fillText('Voltage V (Volts) ↑', origX - 55, origY - plotH / 2);

    const readings = state.readings || [];
    if (readings.length > 0) {
      const maxI = 0.60;
      const maxV = 6.00;

      // Draw trendline
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      readings.forEach((r, idx) => {
        const px = origX + (r.current / maxI) * plotW;
        const py = origY - (r.voltage / maxV) * plotH;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Draw data points
      readings.forEach((r) => {
        const px = origX + (r.current / maxI) * plotW;
        const py = origY - (r.voltage / maxV) * plotH;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      const stats = state.statistics;
      if (stats && stats.isVerified) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('🎉 Linear Trendline Verified (V ∝ I, Slope R ≈ 10.00 Ω)', origX + plotW, origY - plotH + 20);
      }
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Record readings from the Observation Table to plot points and view graph slope.', origX + plotW / 2, origY - plotH / 2);
    }
  }

  drawResultView(ctx, w, h, state) {
    const boxY = 428;
    const boxH = 530;
    ctx.fillStyle = 'rgba(10, 18, 34, 0.96)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(42, boxY, w - 84, boxH, 16) : ctx.fillRect(42, boxY, w - 84, boxH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎯 Result & Scientific Precautions', 68, boxY + 44);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText('1. Ohm’s Law Principle (Maharashtra Std. 10 Physics):', 68, boxY + 95);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('• The ratio of potential difference (V) to electric current (I) is constant: V / I = R (Resistance).', 88, boxY + 135);
    ctx.fillText('• Electric current through a conductor is directly proportional to potential difference across it (V ∝ I).', 88, boxY + 175);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText('2. Laboratory Safety Precautions:', 68, boxY + 245);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '19px Inter, sans-serif';
    ctx.fillText('• All apparatus terminal connections must be tight, insulated, and correctly polarized.', 88, boxY + 285);
    ctx.fillText('• The voltmeter must ALWAYS be connected in parallel across the resistor.', 88, boxY + 325);
    ctx.fillText('• The ammeter must ALWAYS be connected in series with the circuit.', 88, boxY + 365);
    ctx.fillText('• The plug key should be inserted only when recording readings to avoid heating.', 88, boxY + 405);
  }

  drawGuideView(ctx, w, h, state) {
    const boxY = 428;
    const boxH = 530;
    if (this.guideImg && this.guideImg.complete && this.guideImg.naturalWidth > 0) {
      const maxW = w - 84;
      const maxH = boxH - 20;
      let imgH = maxH;
      let imgW = imgH * 2; // 2:1 native aspect ratio
      if (imgW > maxW) {
        imgW = maxW;
        imgH = imgW / 2;
      }
      const imgX = (w - imgW) / 2;
      const imgY = boxY + (boxH - imgH) / 2;

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(imgX - 4, imgY - 4, imgW + 8, imgH + 8, 12) : ctx.fillRect(imgX - 4, imgY - 4, imgW + 8, imgH + 8);
      ctx.fill();
      ctx.drawImage(this.guideImg, imgX, imgY, imgW, imgH);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📸 Loading Photographic Circuit Connection Guide...', w / 2, boxY + 220);
    }
  }

  drawOrientationView(ctx, w, h, state) {
    const boxY = 428;
    const boxH = 530;
    ctx.fillStyle = 'rgba(10, 18, 34, 0.96)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(42, boxY, w - 84, boxH, 16) : ctx.fillRect(42, boxY, w - 84, boxH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Section title & Live Connected Count
    const branches = state.connectedBranches || {};
    const w1 = Boolean(branches.wire1);
    const w2 = Boolean(branches.wire2);
    const w3 = Boolean(branches.wire3);
    const w4 = Boolean(branches.wire4);
    const w5 = Boolean(branches.wire5);
    const w6 = Boolean(branches.wire6);
    const w7 = Boolean(branches.wire7);

    let connCount = 0;
    if (w1) connCount++;
    if (w2) connCount++;
    if (w3) connCount++;
    if (w4) connCount++;
    if (w5) connCount++;
    if (w6) connCount++;
    if (w7) connCount++;
    if (connCount === 0 && state.connectionsCount) connCount = state.connectionsCount;

    // Determine the next expected wire
    let nextWire = 1;
    if (w1 && !w2) nextWire = 2;
    else if (w1 && w2 && !w3) nextWire = 3;
    else if (w1 && w2 && w3 && !w4) nextWire = 4;
    else if (w1 && w2 && w3 && w4 && !w5) nextWire = 5;
    else if (w1 && w2 && w3 && w4 && w5 && !w6) nextWire = 6;
    else if (w1 && w2 && w3 && w4 && w5 && w6 && !w7) nextWire = 7;
    else if (w1 && w2 && w3 && w4 && w5 && w6 && w7) nextWire = 8;

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎯 7-Wire Connection Orientation & Procedure', 64, boxY + 34);

    // 1. Voice Guide Button [ 🔊 Voice Guide: ON/OFF ]
    const isVoiceHov = this.hoveredButtonId === 'toggle_voice';
    const voiceOn = this.voiceEnabled !== false;
    ctx.fillStyle = isVoiceHov ? 'rgba(2, 132, 199, 0.45)' : (voiceOn ? 'rgba(6, 78, 59, 0.85)' : 'rgba(30, 41, 59, 0.85)');
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(690, boxY + 12, 185, 34, 8) : ctx.fillRect(690, boxY + 12, 185, 34);
    ctx.fill();
    ctx.strokeStyle = voiceOn ? '#10b981' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = voiceOn ? '#4ade80' : '#94a3b8';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(voiceOn ? '🔊 Voice Guide: ON' : '🔇 Voice Guide: OFF', 782, boxY + 34);

    // 2. Sequential 3D Tour Button [ 🌟 3D Glow Tour ]
    const isTourHov = this.hoveredButtonId === 'tour_steps';
    ctx.fillStyle = isTourHov ? 'rgba(56, 189, 248, 0.45)' : 'rgba(14, 43, 72, 0.85)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(890, boxY + 12, 160, 34, 8) : ctx.fillRect(890, boxY + 12, 160, 34);
    ctx.fill();
    ctx.strokeStyle = isTourHov ? '#00ffff' : '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText('🌟 3D Glow Tour', 970, boxY + 34);

    // 3. Summary badge on top right
    ctx.fillStyle = connCount >= 7 ? 'rgba(6, 78, 59, 0.85)' : 'rgba(2, 132, 199, 0.3)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(1065, boxY + 12, 385, 34, 8) : ctx.fillRect(1065, boxY + 12, 385, 34);
    ctx.fill();
    ctx.strokeStyle = connCount >= 7 ? '#10b981' : '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = connCount >= 7 ? '#4ade80' : '#38bdf8';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.fillText(`${connCount} / 7 Wires Connected (Follow 1st ➔ 7th)`, 1257, boxY + 34);

    // 8 Cards Layout: 2 Columns × 4 Rows
    const colW = 696;
    const col1X = 60;
    const col2X = 780;
    const rowH = 100;
    const rowGap = 10;
    const startY = boxY + 54;

    const isKeyClosed = Boolean(state.keyClosed);
    const readingCount = (state.readings ? state.readings.length : state.readingCount) || 0;
    const isVerified = Boolean(state.isVerified);

    const steps = [
      // Left Column: Wires 1, 2, 3, 4
      {
        col: 0,
        row: 0,
        stepNumVal: 1,
        btnId: 'orient_step_1',
        stepNum: '1',
        wireBadge: '🔴 Red Wire · Series',
        title: '1️⃣ 1st: Battery (+) ➔ Plug Key (Left)',
        path: 'battery_positive ──[Red Wire]──► switch_left',
        desc: '6V DC Supply (+) to safety key input terminal.',
        status: w1 ? '✅ Connected' : (nextWire === 1 ? '👉 Connect 1st' : '⏳ Pending'),
        statusColor: w1 ? '#22c55e' : (nextWire === 1 ? '#00ffff' : '#64748b'),
        done: w1
      },
      {
        col: 0,
        row: 1,
        stepNumVal: 2,
        btnId: 'orient_step_2',
        stepNum: '2',
        wireBadge: '🔴 Red Wire · Series',
        title: '2️⃣ 2nd: Plug Key (Right) ➔ Ammeter (+)',
        path: 'switch_right ──[Red Wire]──► ammeter_positive',
        desc: 'Key output to Ammeter (+) terminal (must be in series).',
        status: w2 ? '✅ Connected' : (nextWire === 2 ? '👉 Connect 2nd' : '⏳ Pending'),
        statusColor: w2 ? '#22c55e' : (nextWire === 2 ? '#00ffff' : '#64748b'),
        done: w2
      },
      {
        col: 0,
        row: 2,
        stepNumVal: 3,
        btnId: 'orient_step_3',
        stepNum: '3',
        wireBadge: '🔵 Blue Wire · Series',
        title: '3️⃣ 3rd: Ammeter (-) ➔ Rheostat (Slider)',
        path: 'ammeter_negative ──[Blue Wire]──► rheostat_in',
        desc: 'Ammeter (-) to upper slider of variable Rheostat.',
        status: w3 ? '✅ Connected' : (nextWire === 3 ? '👉 Connect 3rd' : '⏳ Pending'),
        statusColor: w3 ? '#22c55e' : (nextWire === 3 ? '#00ffff' : '#64748b'),
        done: w3
      },
      {
        col: 0,
        row: 3,
        stepNumVal: 4,
        btnId: 'orient_step_4',
        stepNum: '4',
        wireBadge: '🔵 Blue Wire · Series',
        title: '4️⃣ 4th: Rheostat (Base) ➔ Resistor (Left)',
        path: 'rheostat_out ──[Blue Wire]──► resistor_left',
        desc: 'Rheostat fixed base to unknown 10 Ω Resistor coil.',
        status: w4 ? '✅ Connected' : (nextWire === 4 ? '👉 Connect 4th' : '⏳ Pending'),
        statusColor: w4 ? '#22c55e' : (nextWire === 4 ? '#00ffff' : '#64748b'),
        done: w4
      },

      // Right Column: Wires 5, 6, 7 + Last Phase (8)
      {
        col: 1,
        row: 0,
        stepNumVal: 5,
        btnId: 'orient_step_5',
        stepNum: '5',
        wireBadge: '⚫ Black Wire · Loop Return',
        title: '5️⃣ 5th: Resistor (Right) ➔ Battery (-)',
        path: 'resistor_right ──[Black Wire]──► battery_negative',
        desc: 'Return path to battery (-). 🌟 Series Loop Complete!',
        status: w5 ? '✅ Connected' : (nextWire === 5 ? '👉 Connect 5th' : '⏳ Pending'),
        statusColor: w5 ? '#22c55e' : (nextWire === 5 ? '#00ffff' : '#64748b'),
        done: w5
      },
      {
        col: 1,
        row: 1,
        stepNumVal: 6,
        btnId: 'orient_step_6',
        stepNum: '6',
        wireBadge: '🔴 Red Wire · Parallel (V+)',
        title: '6️⃣ 6th: Voltmeter (+) ➔ Resistor (Left)',
        path: 'voltmeter_positive ──[Red Wire]──► resistor_left',
        desc: 'Connect Voltmeter (+) parallel across high-potential side.',
        status: w6 ? '✅ Connected' : (nextWire === 6 ? '👉 Connect 6th' : '⏳ Pending'),
        statusColor: w6 ? '#22c55e' : (nextWire === 6 ? '#00ffff' : '#64748b'),
        done: w6
      },
      {
        col: 1,
        row: 2,
        stepNumVal: 7,
        btnId: 'orient_step_7',
        stepNum: '7',
        wireBadge: '⚫ Black Wire · Parallel (V-)',
        title: '7️⃣ 7th: Voltmeter (-) ➔ Resistor (Right)',
        path: 'voltmeter_negative ──[Black Wire]──► resistor_right',
        desc: 'Connect Voltmeter (-) parallel across low-potential side.',
        status: w7 ? '✅ Connected' : (nextWire === 7 ? '👉 Connect 7th' : '⏳ Pending'),
        statusColor: w7 ? '#22c55e' : (nextWire === 7 ? '#00ffff' : '#64748b'),
        done: w7
      },
      {
        col: 1,
        row: 3,
        stepNumVal: 8,
        btnId: 'orient_step_8',
        stepNum: '🏁',
        wireBadge: '⚡ Plug Key & Rheostat',
        title: '🏁 At the Last: Close Key & Verify',
        path: 'Close Key ➔ Vary Rheostat (5 steps) ➔ V–I Graph',
        desc: 'Close key, vary resistance, record readings, confirm V ∝ I.',
        status: isVerified ? '🏆 Law Verified!' : (readingCount >= 5 ? '👉 View Graph' : (isKeyClosed ? `${readingCount} / 5 Readings` : (connCount >= 7 ? '👉 Close Key' : '⏳ Await 7 Wires'))),
        statusColor: isVerified ? '#22c55e' : (readingCount >= 5 ? '#38bdf8' : (isKeyClosed ? '#fde047' : '#64748b')),
        done: isVerified
      }
    ];

    steps.forEach((s) => {
      const cardX = s.col === 0 ? col1X : col2X;
      const cardY = startY + s.row * (rowH + rowGap);
      const isHovered = this.hoveredButtonId === s.btnId;
      const isActive = this.selectedOrientStep ? (this.selectedOrientStep === s.stepNumVal) : (nextWire === s.stepNumVal);

      // Card Background with glassmorphic depth
      if (s.done) {
        ctx.fillStyle = isHovered ? 'rgba(8, 48, 36, 0.98)' : 'rgba(6, 32, 24, 0.95)';
      } else if (isActive) {
        ctx.fillStyle = isHovered ? 'rgba(10, 42, 68, 0.98)' : 'rgba(8, 30, 52, 0.96)';
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(18, 36, 64, 0.98)';
      } else {
        ctx.fillStyle = 'rgba(12, 24, 46, 0.95)';
      }

      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cardX, cardY, colW, rowH, 10) : ctx.fillRect(cardX, cardY, colW, rowH);
      ctx.fill();

      // Card Border with glow accent
      if (isActive) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2.8;
      } else if (s.done) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.0;
      } else if (isHovered) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.2;
      } else {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1.2;
      }
      ctx.stroke();

      // Step Number Badge (Circle)
      const badgeX = cardX + 24;
      const badgeY = cardY + 22;
      ctx.fillStyle = s.done ? '#22c55e' : (isActive ? '#0284c7' : '#1e293b');
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.done ? '✓' : s.stepNum, badgeX, badgeY);

      // Title
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = s.done ? '#ecfdf5' : (isActive ? '#38bdf8' : '#ffffff');
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(s.title, cardX + 46, cardY + 27);

      // Wire Type Badge Pill (Next to title)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cardX + colW - 315, cardY + 10, 155, 26, 6) : ctx.fillRect(cardX + colW - 315, cardY + 10, 155, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.wireBadge, cardX + colW - 237, cardY + 27);

      // Status pill on right of card
      ctx.fillStyle = s.done ? 'rgba(6, 78, 59, 0.7)' : (isActive ? 'rgba(2, 132, 199, 0.7)' : 'rgba(15, 23, 42, 0.9)');
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cardX + colW - 150, cardY + 10, 138, 26, 6) : ctx.fillRect(cardX + colW - 150, cardY + 10, 138, 26);
      ctx.fill();
      ctx.strokeStyle = s.statusColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = s.statusColor;
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.status, cardX + colW - 81, cardY + 27);

      // Wire Path pill
      ctx.fillStyle = 'rgba(8, 18, 36, 0.9)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cardX + 14, cardY + 42, colW - 28, 24, 5) : ctx.fillRect(cardX + 14, cardY + 42, colW - 28, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(s.path, cardX + 22, cardY + 59);

      // Description text & Pinch Prompt
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText(s.desc, cardX + 16, cardY + 86);

      // Pinch to listen & glow badge
      ctx.fillStyle = isActive ? '#00ffff' : '#64748b';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🔊 Pinch to Listen & Glow ➔', cardX + colW - 20, cardY + 86);
    });

    // Bottom tip banner
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💡 Tip: Pinch any card above to hear voice instructions and glow the corresponding terminals in 3D on your workbench!', w / 2, boxY + boxH - 14);
  }

  getButtons() {
    return this.buttons;
  }

  setHoveredButton(btnId) {
    if (this.hoveredButtonId === btnId) return;
    this.hoveredButtonId = btnId;
    this.renderCanvas();
  }

  pressButton(btnId) {
    const btn = this.buttons.find((b) => b.userData.vrButtonId === btnId);
    if (!btn) return;

    // Exit VR (both top header button and bottom bar button)
    if (btnId === 'exit_vr' || btnId === 'exit_vr_top') {
      if (this.callbacks.onExitVR) this.callbacks.onExitVR();
      return;
    }

    // Tab Switching
    if (btnId === 'tab_orientation') {
      this.activeTab = 'orientation';
      this.renderCanvas();
      return;
    }
    if (btnId === 'tab_table') {
      this.activeTab = 'table';
      this.renderCanvas();
      return;
    }
    if (btnId === 'tab_graph') {
      this.activeTab = 'graph';
      this.renderCanvas();
      return;
    }
    if (btnId === 'tab_result') {
      this.activeTab = 'result';
      this.renderCanvas();
      return;
    }
    if (btnId === 'tab_guide') {
      this.activeTab = 'guide';
      this.renderCanvas();
      return;
    }

    // Voice Guide toggle
    if (btnId === 'toggle_voice') {
      this.voiceEnabled = this.voiceEnabled === false ? true : false;
      if (this.callbacks.onToggleVoice) this.callbacks.onToggleVoice(this.voiceEnabled);
      this.renderCanvas();
      return;
    }

    // Sequential 3D Glow Tour
    if (btnId === 'tour_steps') {
      if (this.callbacks.onTourSteps) this.callbacks.onTourSteps();
      return;
    }

    // Interactive Orientation Cards: Pinch to highlight in 3D & speak
    if (btnId.startsWith('orient_step_')) {
      const stepNum = parseInt(btnId.replace('orient_step_', ''), 10);
      this.selectedOrientStep = stepNum;
      this.renderCanvas();
      if (this.callbacks.onHighlightStep) {
        this.callbacks.onHighlightStep(stepNum);
      }
      return;
    }

    // Start Practical Action
    if (btnId === 'start_practical') {
      if (this.callbacks.onStartPractical) this.callbacks.onStartPractical();
      return;
    }

    // End Practical Action
    if (btnId === 'end_practical' || btnId === 'end_practical_table') {
      if (this.callbacks.onEndPractical) this.callbacks.onEndPractical();
      return;
    }

    // Rheostat 5 Discrete Presets (18Ω, 14Ω, 10Ω, 6Ω, 2Ω)
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

    // Rheostat step adjusters
    if (btnId === 'rheo_sub' && this.callbacks.onAdjustRheostat) {
      this.callbacks.onAdjustRheostat(-1.0);
      return;
    }
    if (btnId === 'rheo_add' && this.callbacks.onAdjustRheostat) {
      this.callbacks.onAdjustRheostat(1.0);
      return;
    }
    if (btnId === 'rheo_min' && this.callbacks.onSetRheostat) {
      this.callbacks.onSetRheostat(0.5);
      return;
    }
    if (btnId === 'rheo_max' && this.callbacks.onSetRheostat) {
      this.callbacks.onSetRheostat(20.0);
      return;
    }

    // Fire standard actions
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
  }
}
