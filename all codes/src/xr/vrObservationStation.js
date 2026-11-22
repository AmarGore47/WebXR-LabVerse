/**
 * vrObservationStation.js
 * Focused, physical-looking 3D Scientific Observation Station for WebXR Ohm's Law Practical.
 *
 * Placed to the left of the workbench (x = -1.15, y = 1.35, z = 0.15) at chest/eye height.
 * Visible ONLY when all 7 wires are valid and current is flowing (circuitReady && keyClosed && current > 0).
 * Hidden during orientation and wiring phases.
 * Mutually exclusive with Wall TV and orientation cards to provide a calm, distraction-free reading experience.
 *
 * Screen 1: Recording Screen
 * - Live Current (A) & Voltage (V) readouts
 * - State label: "Adjust rheostat", "Reading stable", "Record next reading"
 * - Large pinchable "Record Reading" button
 * - 5-row table (No. | V (V) | I (A) | R = V/I (Ω))
 *
 * Screen 2: Completion Screen (after 5 valid readings)
 * - V–I Graph with linear regression line & slope
 * - Complete observation table summary
 * - "Ohm's Law Verified" status badge
 * - Exactly two actions: "Repeat Experiment" and "View Result"
 *
 * STRICT: Compatible with hand ray pointer + pinch and direct proximity touch. No controller APIs.
 */

import * as THREE from 'three';

export class VRObservationStation {
  constructor(options = {}) {
    this.scene = options.scene;
    this.simulation = options.simulation;
    this.narration = options.narration || null;
    this.onFeedback = options.onFeedback || (() => {});
    this.sound = options.sound || null;

    // Root Group
    this.group = new THREE.Group();
    this.group.name = 'VRObservationStation';
    
    // Positioned to the left of workbench, exactly matching user specification & photo
    this.group.position.set(-1.15, 1.35, 0.15);
    // Angled inward towards the student standing in front of the table at (0, 1.3, 0.82)
    this.group.rotation.set(0, 0.45, 0);
    this.group.visible = false;

    // View state: 'record' (1-5 readings) | 'completion' (after 5 readings)
    this.activeScreen = 'record'; // 'record' | 'completion'
    this.completionViewMode = 'graph'; // 'graph' | 'table'

    // Interactive button colliders
    this.clickableButtons = [];
    this.hoveredButtonId = null;

    // Last recorded feedback text shown on the station
    this.statusFeedback = 'Adjust rheostat to begin taking readings';
    this.statusFeedbackType = 'info'; // 'info' | 'success' | 'warning'

    // Cached simulation state for change detection
    this.cachedState = {
      readingsCount: 0,
      current: 0.0,
      voltage: 0.0,
      rheostatResistance: 12.0,
      keyClosed: false,
      circuitReady: false
    };

    // Canvas Texture & Slate Dimensions
    this.canvasW = 1024;
    this.canvasH = 1024;
    this.panelW = 0.88; // 88 cm wide 3D slate
    this.panelH = 0.88; // 88 cm tall 3D slate

    this.needsRedraw = true;

    this._buildPhysicalPanel();
    this._initCanvas();
    this._createButtonColliders();

    if (this.scene) {
      this.scene.add(this.group);
    }

    // Subscribe to simulation changes
    if (this.simulation) {
      this.simulation.subscribe(() => this.syncWithSimulation());
    }
  }

  // ─── 1. Physical 3D Structure ─────────────────────────────────────────────

  _buildPhysicalPanel() {
    // 1. Dark Bezel / Slate Body
    const frameGeo = new THREE.BoxGeometry(this.panelW + 0.04, this.panelH + 0.04, 0.024);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x071322,
      roughness: 0.4,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.08
    });
    this.frameMesh = new THREE.Mesh(frameGeo, frameMat);
    this.frameMesh.name = 'ObservationSlate_Frame';
    this.group.add(this.frameMesh);

    // Subtle Cyan Glowing Trim Edge
    const trimGeo = new THREE.BoxGeometry(this.panelW + 0.046, this.panelH + 0.046, 0.006);
    const trimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.z = 0.008;
    this.group.add(trimMesh);

    // Slim metallic mount stand extending down to side table
    const standPoleGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.65, 16);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.85
    });
    this.standPole = new THREE.Mesh(standPoleGeo, standMat);
    this.standPole.position.set(0, -this.panelH / 2 - 0.30, -0.02);
    this.group.add(this.standPole);

    // Heavy round metallic pedestal base
    const baseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.03, 24);
    this.standBase = new THREE.Mesh(baseGeo, standMat);
    this.standBase.position.set(0, -this.panelH / 2 - 0.61, -0.02);
    this.group.add(this.standBase);
  }

  _initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvasW;
    this.canvas.height = this.canvasH;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const screenGeo = new THREE.PlaneGeometry(this.panelW, this.panelH);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: false
    });

    this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.screenMesh.position.z = 0.013;
    this.screenMesh.name = 'ObservationSlate_Screen';
    this.group.add(this.screenMesh);

    this.renderCanvas();
  }

  // ─── 2. Invisible 3D Button Colliders for Hand Ray + Pinch ────────────────

  _createButtonColliders() {
    this.clickableButtons = [];

    // Helper: convert canvas pixel rect to local 3D coordinates on the slate
    const makeButtonMesh = (id, label, cx, cy, cw, ch) => {
      // Canvas center is (512, 512). Local 3D plane center is (0, 0).
      // X maps from [0, 1024] to [-panelW/2, +panelW/2]
      // Y maps from [0, 1024] to [+panelH/2, -panelH/2] (inverted Y)
      const localX = ((cx + cw / 2) / this.canvasW - 0.5) * this.panelW;
      const localY = (0.5 - (cy + ch / 2) / this.canvasH) * this.panelH;
      const localW = (cw / this.canvasW) * this.panelW;
      const localH = (ch / this.canvasH) * this.panelH;

      const geo = new THREE.BoxGeometry(localW, localH, 0.04);
      const mat = new THREE.MeshBasicMaterial({
        visible: false,
        wireframe: true,
        transparent: true,
        opacity: 0.0
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(localX, localY, 0.02);
      mesh.userData = {
        vrButtonId: id,
        type: 'obs_button',
        label: label,
        onPress: () => this.pressButton(id)
      };

      this.group.add(mesh);
      this.clickableButtons.push(mesh);
      return mesh;
    };

    // 1. "Record Reading" Button Collider (Active on recording screen)
    // Canvas position: x = 112, y = 350, w = 800, h = 84
    this.recordBtnMesh = makeButtonMesh('obs_record_reading', 'Record Reading', 112, 350, 800, 84);

    // 2. "Repeat Experiment" Button Collider (Active on completion screen)
    // Canvas position: x = 112, y = 880, w = 380, h = 84
    this.repeatBtnMesh = makeButtonMesh('obs_repeat_experiment', 'Repeat Experiment', 112, 880, 380, 84);

    // 3. "View Result" Toggle Button Collider (Active on completion screen)
    // Canvas position: x = 532, y = 880, w = 380, h = 84
    this.viewBtnMesh = makeButtonMesh('obs_view_result', 'View Result', 532, 880, 380, 84);

    this._updateColliderVisibility();
  }

  _updateColliderVisibility() {
    const isRecord = this.activeScreen === 'record';
    if (this.recordBtnMesh) this.recordBtnMesh.visible = isRecord;
    if (this.repeatBtnMesh) this.repeatBtnMesh.visible = !isRecord;
    if (this.viewBtnMesh) this.viewBtnMesh.visible = !isRecord;
  }

  getClickableObjects() {
    return this.clickableButtons.filter((b) => b && b.visible);
  }

  setHoveredButton(btnId) {
    if (this.hoveredButtonId !== btnId) {
      this.hoveredButtonId = btnId;
      this.renderCanvas();
    }
  }

  // ─── 3. Action Dispatcher (Hand Pinch & Mouse Click) ──────────────────────

  pressButton(btnId) {
    if (!btnId) return;

    if (btnId === 'obs_record_reading') {
      this.handleRecordReading();
      return;
    }

    if (btnId === 'obs_repeat_experiment') {
      this.handleRepeatExperiment();
      return;
    }

    if (btnId === 'obs_view_result') {
      this.completionViewMode = this.completionViewMode === 'graph' ? 'table' : 'graph';
      this.renderCanvas();
      if (this.narration) this.narration.playButtonBeep();
      return;
    }
  }

  handleRecordReading() {
    if (!this.simulation) return;

    const res = this.simulation.recordReading();
    if (res.success) {
      const count = res.count || this.simulation.readings.length;
      this.statusFeedback = `Reading ${count} of 5 saved.`;
      this.statusFeedbackType = 'success';

      if (this.narration) {
        this.narration.playRecordChime();
        if (count === 1) {
          this.narration.speak('First reading saved. Adjust the rheostat for reading two.', '📝 Reading 1 Saved');
        } else if (count === 5) {
          this.narration.playMilestoneChime();
          this.narration.speak('All five readings recorded! Ohm’s Law verified.', '🏆 5/5 Readings Complete!');
        } else {
          this.narration.speak(`Reading ${count} of 5 saved. Adjust rheostat.`, `📝 Reading ${count} Saved`);
        }
      }

      this.onFeedback({
        type: 'success',
        message: `📝 Reading ${count} of 5 saved.`
      });

      if (count >= 5) {
        this.activeScreen = 'completion';
        this._updateColliderVisibility();
      }
    } else {
      this.statusFeedback = res.message || 'Cannot record reading.';
      this.statusFeedbackType = 'warning';

      if (this.narration) {
        this.narration.playWarningChime();
      }

      this.onFeedback({
        type: 'warning',
        message: res.message
      });
    }

    this.renderCanvas();
  }

  handleRepeatExperiment() {
    if (!this.simulation) return;

    this.simulation.restartExperiment();
    this.activeScreen = 'record';
    this.completionViewMode = 'graph';
    this.statusFeedback = 'Experiment restarted. Adjust rheostat to take new readings.';
    this.statusFeedbackType = 'info';

    this._updateColliderVisibility();
    this.renderCanvas();

    if (this.narration) {
      this.narration.playSwitchClick();
      this.narration.speak('Experiment restarted. Adjust rheostat and record readings.', '🔁 Experiment Restarted');
    }

    this.onFeedback({
      type: 'info',
      message: '🔁 Experiment restarted. Readings cleared.'
    });
  }

  // ─── 4. Visibility & Simulation Sync ─────────────────────────────────────

  /**
   * Called on simulation updates.
   * Auto-manages visibility: visible ONLY when circuit is complete, key closed, and current > 0.
   */
  syncWithSimulation() {
    if (!this.simulation) return;

    const state = this.simulation.getState();
    const shouldBeVisible = Boolean(state.circuitReady && state.keyClosed && state.current > 0.001);

    if (this.group.visible !== shouldBeVisible) {
      this.setVisible(shouldBeVisible);
    }

    // Check if readings reached 5
    if (state.readingCount >= 5 && this.activeScreen !== 'completion') {
      this.activeScreen = 'completion';
      this._updateColliderVisibility();
    } else if (state.readingCount < 5 && this.activeScreen !== 'record') {
      this.activeScreen = 'record';
      this._updateColliderVisibility();
    }

    // Check if values changed noticeably before re-rendering texture
    const currentChanged = Math.abs(this.cachedState.current - state.current) > 0.004;
    const voltageChanged = Math.abs(this.cachedState.voltage - state.voltage) > 0.04;
    const countChanged = this.cachedState.readingsCount !== state.readingCount;

    if (currentChanged || voltageChanged || countChanged) {
      this.cachedState = {
        readingsCount: state.readingCount,
        current: state.current,
        voltage: state.voltage,
        rheostatResistance: state.rheostatResistance,
        keyClosed: state.keyClosed,
        circuitReady: state.circuitReady
      };

      // Update dynamic state label
      if (this.activeScreen === 'record') {
        if (state.readingCount === 0) {
          this.statusFeedback = 'Reading stable — Pinch Record to save Reading #1';
          this.statusFeedbackType = 'success';
        } else {
          // Check if rheostat has been moved since last reading
          const lastReading = state.readings[state.readings.length - 1];
          if (lastReading) {
            const dCurrent = Math.abs(lastReading.current - state.current);
            const dRheo = Math.abs(lastReading.rheostatResistance - state.rheostatResistance);
            if (dCurrent < 0.015 && dRheo < 0.5) {
              this.statusFeedback = '⚠️ Adjust rheostat to vary current for next reading';
              this.statusFeedbackType = 'warning';
            } else {
              this.statusFeedback = `Reading stable — Pinch Record for Reading #${state.readingCount + 1}`;
              this.statusFeedbackType = 'success';
            }
          }
        }
      }

      this.renderCanvas();
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
    this._updateColliderVisibility();
    if (visible) {
      this.renderCanvas();
    }
  }

  // ─── 5. Canvas 2D Rendering ───────────────────────────────────────────────

  renderCanvas() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvasW;
    const h = this.canvasH;
    const state = this.simulation ? this.simulation.getState() : {};

    ctx.clearRect(0, 0, w, h);

    // Deep Dark Navy Slate Surface
    ctx.fillStyle = '#071322';
    ctx.beginPath();
    ctx.roundRect(16, 16, w - 32, h - 32, 28);
    ctx.fill();

    // Crisp Cyan Bezel Outline
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Subtle inner glowing border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(28, 28, w - 56, h - 56, 20);
    ctx.stroke();

    // Header Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText("OHM’S LAW — OBSERVATION", w / 2, 45);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText("V–I Proportionality Study  •  Std. 10 Science Practical", w / 2, 88);

    if (this.activeScreen === 'completion') {
      this._renderCompletionScreen(ctx, state);
    } else {
      this._renderRecordingScreen(ctx, state);
    }

    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  // ─── 5a. Screen 1: Recording UI ──────────────────────────────────────────

  _renderRecordingScreen(ctx, state) {
    const w = this.canvasW;
    const currentVal = (state.current || 0.0).toFixed(2);
    const voltageVal = (state.voltage || 0.0).toFixed(2);
    const readings = state.readings || [];

    // 1. Two Large Digital Measurement Cards (Current & Voltage)
    const cardY = 126;
    const cardW = 384;
    const cardH = 120;

    // Current Card (Left)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(112, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("CURRENT I (A) — AMMETER", 136, cardY + 18);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 50px "JetBrains Mono", monospace';
    ctx.fillText(`${currentVal} A`, 136, cardY + 48);

    // Voltage Card (Right)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(528, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText("VOLTAGE V (V) — VOLTMETER", 552, cardY + 18);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 50px "JetBrains Mono", monospace';
    ctx.fillText(`${voltageVal} V`, 552, cardY + 48);

    // 2. Dynamic Status / Advice Banner
    const isSuccess = this.statusFeedbackType === 'success';
    const isWarning = this.statusFeedbackType === 'warning';
    ctx.fillStyle = isSuccess ? 'rgba(22, 101, 52, 0.35)' : isWarning ? 'rgba(180, 83, 9, 0.35)' : 'rgba(30, 41, 59, 0.7)';
    ctx.beginPath();
    ctx.roundRect(112, 266, 800, 56, 12);
    ctx.fill();
    ctx.strokeStyle = isSuccess ? '#22c55e' : isWarning ? '#f59e0b' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isSuccess ? '#4ade80' : isWarning ? '#fbbf24' : '#cbd5e1';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.statusFeedback, w / 2, 282);

    // 3. Large Pinchable "RECORD READING" Button
    const isHovered = this.hoveredButtonId === 'obs_record_reading';
    const btnY = 350;
    const btnH = 84;

    ctx.fillStyle = isHovered ? '#15803d' : '#166534';
    ctx.beginPath();
    ctx.roundRect(112, btnY, 800, btnH, 18);
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#86efac' : '#22c55e';
    ctx.lineWidth = isHovered ? 3.5 : 2.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`📝 RECORD READING (${readings.length} / 5)`, w / 2, btnY + 26);

    // 4. Five-Row Structured Table
    const tableY = 464;
    const tableW = 800;
    const rowH = 68;

    // Table Header
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(112, tableY, tableW, 46, 8);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("No.", 160, tableY + 14);
    ctx.fillText("V (V)", 340, tableY + 14);
    ctx.fillText("I (A)", 520, tableY + 14);
    ctx.fillText("R = V/I (Ω)", 740, tableY + 14);

    // 5 Rows
    for (let i = 0; i < 5; i++) {
      const y = tableY + 54 + i * rowH;
      const reading = readings[i];
      const isRecorded = Boolean(reading);

      ctx.fillStyle = isRecorded ? (i % 2 === 0 ? 'rgba(30, 41, 59, 0.6)' : 'rgba(15, 23, 42, 0.6)') : 'rgba(15, 23, 42, 0.3)';
      ctx.beginPath();
      ctx.roundRect(112, y, tableW, rowH - 6, 8);
      ctx.fill();

      if (isRecorded) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.fillText(`${i + 1}`, 160, y + 18);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(reading.voltage.toFixed(2), 340, y + 18);
        ctx.fillText(reading.current.toFixed(2), 520, y + 18);

        ctx.fillStyle = '#4ade80';
        ctx.fillText(`${reading.ratio.toFixed(2)} Ω`, 740, y + 18);
      } else {
        ctx.fillStyle = '#475569';
        ctx.font = '20px "JetBrains Mono", monospace';
        ctx.fillText(`${i + 1}`, 160, y + 18);
        ctx.fillText("—", 340, y + 18);
        ctx.fillText("—", 520, y + 18);
        ctx.fillText("—", 740, y + 18);
      }
    }

    // Table Footer Summary
    const footY = tableY + 54 + 5 * rowH + 12;
    ctx.fillStyle = '#64748b';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Target: Record 5 distinct values by moving the rheostat slider on the table.", w / 2, footY);
  }

  // ─── 5b. Screen 2: Completion & Results ───────────────────────────────────

  _renderCompletionScreen(ctx, state) {
    const w = this.canvasW;
    const readings = state.readings || [];
    const stats = this.simulation ? this.simulation.calculateReadingStatistics() : null;
    const meanR = stats ? stats.meanRatio.toFixed(2) : '10.00';

    // 1. Success Verified Status Banner
    ctx.fillStyle = 'rgba(22, 101, 52, 0.45)';
    ctx.beginPath();
    ctx.roundRect(112, 126, 800, 68, 16);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🎉 OHM’S LAW VERIFIED: MEAN R = ${meanR} Ω (V ∝ I)`, w / 2, 146);

    // 2. Middle Visual Area: Graph View OR Table View
    if (this.completionViewMode === 'graph') {
      this._drawVIGraph(ctx, 112, 214, 800, 620, readings, stats);
    } else {
      this._drawSummaryTable(ctx, 112, 214, 800, 620, readings, stats);
    }

    // 3. Exactly Two Action Buttons at the bottom
    const btnY = 880;
    const btnH = 84;

    // Action 1: "Repeat Experiment"
    const isRepHov = this.hoveredButtonId === 'obs_repeat_experiment';
    ctx.fillStyle = isRepHov ? '#0369a1' : '#075985';
    ctx.beginPath();
    ctx.roundRect(112, btnY, 380, btnH, 16);
    ctx.fill();
    ctx.strokeStyle = isRepHov ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = isRepHov ? 3 : 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("🔁 Repeat Experiment", 112 + 190, btnY + 28);

    // Action 2: "View Result" (Toggle Graph / Table)
    const isViewHov = this.hoveredButtonId === 'obs_view_result';
    ctx.fillStyle = isViewHov ? '#1e293b' : 'rgba(30, 41, 59, 0.9)';
    ctx.beginPath();
    ctx.roundRect(532, btnY, 380, btnH, 16);
    ctx.fill();
    ctx.strokeStyle = isViewHov ? '#ffffff' : '#94a3b8';
    ctx.lineWidth = isViewHov ? 3 : 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText(this.completionViewMode === 'graph' ? "📋 View Table" : "📈 View Graph", 532 + 190, btnY + 28);
  }

  _drawVIGraph(ctx, gx, gy, gw, gh, readings, stats) {
    // Graph canvas background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(gx, gy, gw, gh, 16);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title inside graph
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("📈 V–I Graph (Potential Difference vs Current)", gx + 30, gy + 28);

    const padLeft = 90;
    const padBottom = 75;
    const padTop = 60;
    const padRight = 40;

    const plotW = gw - padLeft - padRight;
    const plotH = gh - padTop - padBottom;

    const maxI = 0.60;
    const maxV = 6.00;

    const toX = (valI) => gx + padLeft + (valI / maxI) * plotW;
    const toY = (valV) => gy + padTop + plotH - (valV / maxV) * plotH;

    // Grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    // Horizontal grid (V: 0 to 6V)
    for (let v = 0; v <= maxV; v += 1.0) {
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(gx + padLeft, y);
      ctx.lineTo(gx + padLeft + plotW, y);
      ctx.stroke();
      ctx.fillText(`${v.toFixed(0)}V`, gx + padLeft - 10, y + 5);
    }

    // Vertical grid (I: 0 to 0.6A)
    ctx.textAlign = 'center';
    for (let i = 0; i <= maxI + 0.001; i += 0.10) {
      const x = toX(i);
      ctx.beginPath();
      ctx.moveTo(x, gy + padTop);
      ctx.lineTo(x, gy + padTop + plotH);
      ctx.stroke();
      ctx.fillText(`${i.toFixed(1)}A`, x, gy + padTop + plotH + 24);
    }

    // Solid Axes
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx + padLeft, gy + padTop);
    ctx.lineTo(gx + padLeft, gy + padTop + plotH);
    ctx.lineTo(gx + padLeft + plotW, gy + padTop + plotH);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Current I (Amperes) ➔", gx + padLeft + plotW / 2, gy + padTop + plotH + 52);

    ctx.save();
    ctx.translate(gx + 26, gy + padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Potential Difference V (Volts) ➔", 0, 0);
    ctx.restore();

    // Best-fit straight line passing through origin (V = R * I)
    const slope = stats && stats.meanRatio ? stats.meanRatio : 10.0;
    const x0 = toX(0);
    const y0 = toY(0);
    const endI = Math.min(maxI, maxV / slope);
    const xEnd = toX(endI);
    const yEnd = toY(endI * slope);

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(xEnd, yEnd);
    ctx.stroke();

    // Plotted points
    readings.forEach((r, idx) => {
      const px = toX(r.current);
      const py = toY(r.voltage);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(`#${idx + 1}`, px + 14, py - 4);
    });

    // Slope badge inside graph
    ctx.fillStyle = 'rgba(7, 19, 34, 0.85)';
    ctx.beginPath();
    ctx.roundRect(gx + gw - 240, gy + 18, 210, 48, 10);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Slope R = ${slope.toFixed(2)} Ω`, gx + gw - 135, gy + 48);
  }

  _drawSummaryTable(ctx, gx, gy, gw, gh, readings, stats) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(gx, gy, gw, gh, 16);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("📋 Recorded Observations Summary", gx + 30, gy + 32);

    const tableY = gy + 65;
    const rowH = 68;

    // Header
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(gx + 20, tableY, gw - 40, 46, 8);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("No.", gx + 80, tableY + 14);
    ctx.fillText("Rheostat (Ω)", gx + 240, tableY + 14);
    ctx.fillText("V (V)", gx + 420, tableY + 14);
    ctx.fillText("I (A)", gx + 580, tableY + 14);
    ctx.fillText("R = V/I (Ω)", gx + 720, tableY + 14);

    readings.forEach((r, idx) => {
      const y = tableY + 54 + idx * rowH;
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.6)' : 'rgba(15, 23, 42, 0.6)';
      ctx.beginPath();
      ctx.roundRect(gx + 20, y, gw - 40, rowH - 6, 8);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px "JetBrains Mono", monospace';
      ctx.fillText(`${idx + 1}`, gx + 80, y + 18);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(r.rheostatResistance.toFixed(1), gx + 240, y + 18);
      ctx.fillText(r.voltage.toFixed(2), gx + 420, y + 18);
      ctx.fillText(r.current.toFixed(2), gx + 580, y + 18);

      ctx.fillStyle = '#4ade80';
      ctx.fillText(`${r.ratio.toFixed(2)} Ω`, gx + 720, y + 18);
    });

    const meanR = stats ? stats.meanRatio.toFixed(2) : '10.00';
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Mean Resistance R̄ = Σ(V/I) / N = ${meanR} Ω`, gx + gw / 2, tableY + 54 + 5 * rowH + 28);
  }
}
