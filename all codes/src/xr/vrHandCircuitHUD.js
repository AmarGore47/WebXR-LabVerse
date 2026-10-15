/**
 * vrHandCircuitHUD.js
 * Holographic Wrist / Palm UI attached to the student's LEFT HAND in WebXR VR mode.
 *
 * Features:
 * - High-resolution Canvas texture rendering the Maharashtra Std. 10 Ohm's Law Circuit Diagram
 * - Live connection checklist & status (e.g. "4 / 7 Wires Connected", next suggested connection)
 * - Toggleable mode: [ 📐 Circuit Schematic ] vs [ 📊 Observation Table & Graph ]
 * - Glancing angle detection: naturally faces student when raising left wrist
 * - Seamless hand attachment using WebXR wrist / palm joint tracking
 */

import * as THREE from 'three';
import { REQUIRED_CONNECTIONS, getTerminalDisplayName } from '../circuit/circuitConfig.js';
import { CircuitValidator } from '../circuit/circuitValidator.js';

/**
 * Pure-data helper to evaluate real circuit wiring progress,
 * canonical branch status, and student guidance for the wrist HUD.
 */
export function getCircuitProgressForHUD(circuitState, simulation) {
  const connCount = circuitState ? circuitState.connections.length : 0;
  const fullVal = circuitState
    ? CircuitValidator.validateFullCircuit(circuitState)
    : {
        isFullyValid: false,
        missingConnections: REQUIRED_CONNECTIONS,
        requiredSatisfiedCount: 0,
        requiredTotalCount: REQUIRED_CONNECTIONS.length,
        seriesPathComplete: false,
        voltmeterParallelComplete: false,
        hasShortCircuit: false,
        errorCount: 0,
        warningCount: 0,
        feedbackMessage: 'Connect all 7 apparatus terminals with wires.'
      };

  const hasConn = (from, to) => Boolean(circuitState && circuitState.hasConnection(from, to));

  // Canonical branch statuses mapped to Maharashtra textbook circuit schematic
  const branchStatus = {
    // 1. Battery (+) ↔ Switch (Left)
    batteryToSwitch: hasConn('battery_positive', 'switch_left'),
    // 2. Switch (Right) ↔ Ammeter (+)
    switchToAmmeter: hasConn('switch_right', 'ammeter_positive'),
    // 3. Ammeter (-) ↔ Rheostat (In)
    ammeterToRheostat: hasConn('ammeter_negative', 'rheostat_in'),
    // 4. Rheostat (Out) ↔ Resistor (Left)
    rheostatToResistor: hasConn('rheostat_out', 'resistor_left'),
    // 5. Resistor (Right) ↔ Battery (-)
    resistorToBattery: hasConn('resistor_right', 'battery_negative'),
    // 6. Voltmeter (+) ↔ Resistor (Left)
    voltmeterPositive: hasConn('voltmeter_positive', 'resistor_left'),
    // 7. Voltmeter (-) ↔ Resistor (Right)
    voltmeterNegative: hasConn('voltmeter_negative', 'resistor_right')
  };

  const isReady = Boolean(simulation ? simulation.circuitReady : fullVal.isFullyValid);
  const isKeyClosed = Boolean(simulation && simulation.keyClosed);
  const isFullyValid = fullVal.isFullyValid;
  const satisfiedCount = fullVal.requiredSatisfiedCount;

  let nextHint = '';
  if (fullVal.hasShortCircuit) {
    nextHint = '⚠️ Short circuit detected! Undo wire immediately.';
  } else if (fullVal.errorCount > 0) {
    nextHint = '⚠️ Error: Incorrect wire placed. Undo last wire.';
  } else if (fullVal.missingConnections && fullVal.missingConnections.length > 0) {
    const nextReq = fullVal.missingConnections[0];
    nextHint = `Next Step: Connect ${nextReq.name}.`;
  } else if (isFullyValid && !isKeyClosed) {
    nextHint = '🎉 All 7 wires complete! Pinch the Plug Key lever to close switch.';
  } else if (isKeyClosed) {
    nextHint = '⚡ Current is flowing! Adjust Rheostat on table and Record Readings.';
  } else {
    nextHint = fullVal.feedbackMessage || 'Connect all 7 apparatus terminals with wires.';
  }

  return {
    connCount,
    satisfiedCount,
    totalRequired: REQUIRED_CONNECTIONS.length,
    isFullyValid,
    isReady,
    isKeyClosed,
    branchStatus,
    nextHint,
    missing: fullVal.missingConnections || []
  };
}

export class VRHandCircuitHUD {
  constructor(options = {}) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.circuitState = options.circuitState;
    this.simulation = options.simulation;
    this.renderer = options.renderer;

    this.group = new THREE.Group();
    this.group.name = 'VRWallCircuitHUD';
    this.group.visible = false;

    // Display modes: 'schematic' | 'readings'
    this.currentMode = 'schematic';

    // Mount on TV_OuterFrame on the lab wall directly facing the student
    this.group.position.set(-0.12, 1.94, -1.175);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.set(1.0, 1.0, 1.0);

    // Temp math vectors
    this.tempWristPos = new THREE.Vector3();
    this.tempIndexPos = new THREE.Vector3();
    this.tempLookTarget = new THREE.Vector3();
    this.tempTargetPos = new THREE.Vector3();
    this.smoothedPos = new THREE.Vector3();

    // Init canvas & 3D mesh
    this.initCanvasMesh();
    this.initInteractiveTabs();

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  alignToScreen(model) {
    if (!model) return;
    const tv = model.getObjectByName('TV_OuterFrame');
    if (tv) {
      tv.getWorldPosition(this.tempTargetPos);
      this.group.position.set(this.tempTargetPos.x, this.tempTargetPos.y, this.tempTargetPos.z + 0.026);
      this.group.rotation.set(0, 0, 0);
      this.group.scale.set(1.0, 1.0, 1.0);
    }
  }

  setVisible(visible) {
    this.group.visible = Boolean(visible);
    if (visible) this.renderCanvas();
  }

  initCanvasMesh() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1600;
    this.canvas.height = 900;
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

    // TV Screen display dimensions: 1.20m wide x 0.68m tall (matching TV_OuterFrame 1.23m x 0.71m)
    const hudW = 1.20;
    const hudH = 0.68;

    // 1. Sleek dark frame backing plate
    const backGeo = new THREE.BoxGeometry(hudW + 0.024, hudH + 0.024, 0.015);
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x050e1c,
      roughness: 0.35,
      metalness: 0.8
    });
    this.backMesh = new THREE.Mesh(backGeo, backMat);
    this.group.add(this.backMesh);

    // 2. Front display panel
    const frontGeo = new THREE.PlaneGeometry(hudW, hudH);
    const frontMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.FrontSide
    });
    this.displayMesh = new THREE.Mesh(frontGeo, frontMat);
    this.displayMesh.position.z = 0.009;
    this.group.add(this.displayMesh);

    // Initial render
    this.renderCanvas();
  }

  initInteractiveTabs() {
    this.buttons = [];

    const createBtn = (id, label, colorHex, xPos, w = 0.28) => {
      const btnGeo = new THREE.BoxGeometry(w, 0.055, 0.02);
      const btnMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.5
      });
      const btnMesh = new THREE.Mesh(btnGeo, btnMat);
      btnMesh.position.set(xPos, 0.385, 0.012);
      btnMesh.userData = {
        isHUDButton: true,
        buttonId: id,
        label,
        baseColor: colorHex
      };

      const lblCanvas = document.createElement('canvas');
      lblCanvas.width = 384;
      lblCanvas.height = 96;
      const lCtx = lblCanvas.getContext('2d');
      lCtx.fillStyle = '#ffffff';
      lCtx.font = 'bold 30px Inter, sans-serif';
      lCtx.textAlign = 'center';
      lCtx.textBaseline = 'middle';
      lCtx.fillText(label, 192, 48);

      const lTex = new THREE.CanvasTexture(lblCanvas);
      const lMat = new THREE.MeshBasicMaterial({ map: lTex, transparent: true });
      const lMesh = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.008, 0.050), lMat);
      lMesh.position.z = 0.012;
      btnMesh.add(lMesh);

      this.group.add(btnMesh);
      this.buttons.push(btnMesh);
      return btnMesh;
    };

    // Mode toggle button: [ ⇄ Switch View ]
    this.toggleTabBtn = createBtn('hud_toggle_mode', '⇄ Switch View', 0x0284c7, -0.36, 0.28);

    // Undo wire button: [ ↩️ Undo Wire ]
    this.undoWireBtn = createBtn('hud_undo_wire', '↩️ Undo Wire', 0xd97706, 0.00, 0.26);

    // Exit VR / Back button: [ ⬅️ Exit VR ]
    this.exitVRBtn = createBtn('hud_exit_vr', '⬅️ Exit VR', 0xdc2626, 0.35, 0.24);
  }

  getButtons() {
    return this.buttons || [this.toggleTabBtn, this.undoWireBtn, this.exitVRBtn].filter(Boolean);
  }

  toggleMode() {
    this.currentMode = this.currentMode === 'schematic' ? 'readings' : 'schematic';
    this.renderCanvas();
  }

  renderCanvas() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background: Dark glassmorphic card
    ctx.fillStyle = 'rgba(5, 15, 28, 0.94)';
    ctx.fillRect(0, 0, w, h);

    // Glowing cyan / aqua frame
    ctx.strokeStyle = this.currentMode === 'schematic' ? '#38bdf8' : '#2dd4bf';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    if (this.currentMode === 'schematic') {
      this.drawSchematicView(ctx, w, h);
    } else {
      this.drawReadingsView(ctx, w, h);
    }

    this.texture.needsUpdate = true;
  }

  drawSchematicView(ctx, w, h) {
    const progress = getCircuitProgressForHUD(this.circuitState, this.simulation);

    // Header bar
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("⚡ OHM'S LAW EXPERIMENT · CORRECT CIRCUIT CONNECTION", 30, 48);

    // Mode / Progress Pill
    const isDone = progress.satisfiedCount === progress.totalRequired;
    ctx.fillStyle = isDone ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)';
    ctx.fillRect(w - 300, 16, 270, 42);
    ctx.strokeStyle = isDone ? '#22c55e' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 300, 16, 270, 42);
    ctx.fillStyle = isDone ? '#22c55e' : '#fbbf24';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${progress.satisfiedCount} / ${progress.totalRequired} Wires Connected`, w - 165, 43);

    // If user's photographic circuit guide is loaded, draw it prominently and fit perfectly!
    if (this.guideImg && this.guideImg.complete && this.guideImg.naturalWidth > 0) {
      const maxW = w - 48;
      const maxH = h - 148;
      // Exact 2:1 native aspect ratio of uploaded photo (1024x512)
      let imgW = maxW;
      let imgH = imgW / 2;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH * 2;
      }
      const imgX = (w - imgW) / 2;
      const imgY = 66 + (maxH - imgH) / 2;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(imgX, imgY, imgW, imgH, 12) : ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.fill();
      ctx.drawImage(this.guideImg, imgX, imgY, imgW, imgH);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Bottom guidance bar
      const barY = h - 74;
      ctx.fillStyle = 'rgba(11, 23, 44, 0.96)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(24, barY, w - 48, 62, 10) : ctx.fillRect(24, barY, w - 48, 62);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(progress.nextHint, 42, barY + 28);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('💡 Point wrist ray & pinch: [⇄ Switch View] | [↩️ Undo Wire] to remove | [⬅️ Exit VR] to leave', 42, barY + 50);
      return;
    }

    // Draw Complete SVG/Canvas Circuit Diagram
    // Outer loop dimensions
    const topY = 160;
    const bottomY = 430;
    const leftX = 110;
    const rightX = 910;

    // Connection checks using canonical terminal IDs via getCircuitProgressForHUD
    const cBatKey = progress.branchStatus.batteryToSwitch;
    const cKeyAmm = progress.branchStatus.switchToAmmeter;
    const cAmmRheo = progress.branchStatus.ammeterToRheostat;
    const cRheoRes = progress.branchStatus.rheostatToResistor;
    const cResBat = progress.branchStatus.resistorToBattery;
    const cVmPos = progress.branchStatus.voltmeterPositive;
    const cVmNeg = progress.branchStatus.voltmeterNegative;

    // Helper to draw wire segment with live status
    const drawWireSegment = (x1, y1, x2, y2, isConnected) => {
      ctx.strokeStyle = isConnected ? '#22c55e' : 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = isConnected ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (isConnected) {
        // Draw small green check indicator along wire
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#022c22';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', mx, my);
      }
    };

    // 1. Battery (+) to Key
    drawWireSegment(leftX, topY, leftX + 80, topY, cBatKey);

    // 2. Key to Ammeter (+)
    drawWireSegment(leftX + 170, topY, leftX + 270, topY, cKeyAmm);

    // 3. Ammeter (-) to Rheostat (Top)
    drawWireSegment(leftX + 350, topY, leftX + 470, topY, cAmmRheo);

    // 4. Rheostat to Resistor (Left)
    drawWireSegment(leftX + 610, topY, leftX + 710, topY, cRheoRes);

    // 5. Resistor (Right) to Battery (-) via bottom return wire
    ctx.strokeStyle = cResBat ? '#22c55e' : 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = cResBat ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(rightX, topY);
    ctx.lineTo(rightX, bottomY);
    ctx.lineTo(leftX, bottomY);
    ctx.lineTo(leftX, topY + 80);
    ctx.stroke();
    if (cResBat) {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(rightX, (topY + bottomY) / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#022c22';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', rightX, (topY + bottomY) / 2);
    }

    // 1. BATTERY (6V DC Supply) on Left vertical leg
    const batY = 295;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(leftX - 28, batY - 22);
    ctx.lineTo(leftX + 28, batY - 22);
    ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftX - 16, batY);
    ctx.lineTo(leftX + 16, batY);
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(leftX - 28, batY + 22);
    ctx.lineTo(leftX + 28, batY + 22);
    ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftX - 16, batY + 44);
    ctx.lineTo(leftX + 16, batY + 44);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('+', leftX - 36, batY - 14);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('−', leftX - 36, batY + 50);

    ctx.fillStyle = '#f0f9ff';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Battery (6V)', leftX + 38, batY + 12);

    // 2. PLUG KEY (Switch) on top wire
    const keyX = leftX + 125;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(keyX - 25, topY, 6, 0, Math.PI * 2);
    ctx.arc(keyX + 25, topY, 6, 0, Math.PI * 2);
    ctx.fill();

    const isClosed = this.simulation ? this.simulation.keyClosed : false;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(keyX - 25, topY);
    if (isClosed) {
      ctx.lineTo(keyX + 25, topY);
    } else {
      ctx.lineTo(keyX + 15, topY - 24);
    }
    ctx.stroke();

    ctx.fillStyle = isClosed ? '#22c55e' : '#fbbf24';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isClosed ? 'Plug Key (Closed)' : 'Plug Key (Open)', keyX, topY + 32);

    // 3. AMMETER (Series)
    const ammX = leftX + 310;
    ctx.fillStyle = '#08223c';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ammX, topY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f0f9ff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', ammX, topY + 8);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('+', ammX - 38, topY - 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('−', ammX + 38, topY - 8);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText('Ammeter (Series)', ammX, topY + 48);

    // 4. RESISTOR (Standard 5 Ω)
    const resX = leftX + 540;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // Zig-zag resistor
    const zx = resX - 55;
    ctx.moveTo(zx, topY);
    ctx.lineTo(zx + 15, topY - 14);
    ctx.lineTo(zx + 30, topY + 14);
    ctx.lineTo(zx + 45, topY - 14);
    ctx.lineTo(zx + 60, topY + 14);
    ctx.lineTo(zx + 75, topY - 14);
    ctx.lineTo(zx + 90, topY + 14);
    ctx.lineTo(zx + 110, topY);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Resistor R (5 Ω)', resX, topY + 40);

    // 5. VOLTMETER (Parallel across Resistor)
    const vmY = topY - 75;
    const vmBothConnected = cVmPos && cVmNeg;
    ctx.strokeStyle = vmBothConnected ? '#22c55e' : (cVmPos || cVmNeg ? '#fbbf24' : 'rgba(56, 189, 248, 0.45)');
    ctx.lineWidth = vmBothConnected ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(resX - 60, topY);
    ctx.lineTo(resX - 60, vmY);
    ctx.lineTo(resX - 35, vmY);
    ctx.moveTo(resX + 35, vmY);
    ctx.lineTo(resX + 60, vmY);
    ctx.lineTo(resX + 60, topY);
    ctx.stroke();

    if (vmBothConnected) {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(resX, vmY - 32, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#022c22';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', resX, vmY - 32);
    }

    ctx.fillStyle = '#08223c';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(resX, vmY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f0f9ff';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('V', resX, vmY + 8);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('+', resX - 44, vmY - 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('−', resX + 44, vmY - 6);

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText('Voltmeter (Parallel)', resX, vmY - 34);

    // 6. RHEOSTAT (Variable Resistor) on right top wire
    const rheoX = leftX + 790;
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const rx = rheoX - 50;
    ctx.moveTo(rx, topY);
    ctx.lineTo(rx + 15, topY - 12);
    ctx.lineTo(rx + 30, topY + 12);
    ctx.lineTo(rx + 45, topY - 12);
    ctx.lineTo(rx + 60, topY + 12);
    ctx.lineTo(rx + 75, topY - 12);
    ctx.lineTo(rx + 90, topY + 12);
    ctx.lineTo(rx + 100, topY);
    ctx.stroke();

    // Arrow on Rheostat
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(rheoX - 30, topY + 28);
    ctx.lineTo(rheoX + 30, topY - 24);
    ctx.stroke();
    // Arrow tip
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(rheoX + 34, topY - 28);
    ctx.lineTo(rheoX + 22, topY - 24);
    ctx.lineTo(rheoX + 28, topY - 14);
    ctx.fill();

    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Rheostat (Rh)', rheoX, topY + 44);

    // BOTTOM STATUS STRIP
    const { connCount, satisfiedCount, isFullyValid, isReady, nextHint } = progress;

    ctx.fillStyle = isFullyValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(15, 34, 56, 0.85)';
    ctx.fillRect(30, 520, w - 60, 90);
    ctx.strokeStyle = isFullyValid ? '#22c55e' : 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 520, w - 60, 90);

    ctx.fillStyle = isFullyValid ? '#22c55e' : '#38bdf8';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      isFullyValid
        ? '🎉 Circuit Complete! (7 / 7 Wires Connected)'
        : `🔌 Circuit Status: ${connCount} Wires (${satisfiedCount} / 7 Required Connected)`,
      50,
      555
    );

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(nextHint, 50, 588);
  }

  drawReadingsView(ctx, w, h) {
    // Header
    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("📊 OBSERVATION TABLE & V–I GRAPH", 30, 48);

    // Mode Pill
    ctx.fillStyle = 'rgba(45, 212, 191, 0.2)';
    ctx.fillRect(780, 22, 200, 34);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(780, 22, 200, 34);
    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📋 Observation Data', 880, 45);

    const sim = this.simulation;
    const readings = sim ? sim.getReadings() : [];

    // Left Column: Table (width 540)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(30, 90, 540, 400);
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30, 90, 540, 400);

    // Table Header
    ctx.fillStyle = '#0f2942';
    ctx.fillRect(30, 90, 540, 44);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sr.', 60, 118);
    ctx.fillText('Current I (A)', 170, 118);
    ctx.fillText('Voltage V (V)', 310, 118);
    ctx.fillText('Ratio R = V/I (Ω)', 470, 118);

    // Table Rows
    const maxRows = 5;
    for (let i = 0; i < maxRows; i++) {
      const y = 144 + i * 56;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(7, 21, 38, 0.5)' : 'rgba(15, 23, 42, 0.5)';
      ctx.fillRect(30, y - 10, 540, 56);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.beginPath();
      ctx.moveTo(30, y + 46);
      ctx.lineTo(570, y + 46);
      ctx.stroke();

      const r = readings[i];
      if (r) {
        ctx.fillStyle = '#f0f9ff';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText(`${i + 1}`, 60, y + 25);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${r.current.toFixed(2)}`, 170, y + 25);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText(`${r.voltage.toFixed(2)}`, 310, y + 25);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`${r.resistance.toFixed(2)} Ω`, 470, y + 25);
      } else {
        ctx.fillStyle = '#475569';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText(`${i + 1}`, 60, y + 25);
        ctx.fillText('—', 170, y + 25);
        ctx.fillText('—', 310, y + 25);
        ctx.fillText('—', 470, y + 25);
      }
    }

    // Right Column: V–I Mini-Graph (width 400)
    const gx = 600;
    const gy = 90;
    const gw = 394;
    const gh = 400;

    ctx.fillStyle = 'rgba(7, 21, 38, 0.9)';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.3)';
    ctx.strokeRect(gx, gy, gw, gh);

    // Graph Title
    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 17px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('V–I Characteristic Graph', gx + 20, gy + 32);

    // Axes
    const origX = gx + 50;
    const origY = gy + gh - 55;
    const plotW = gw - 80;
    const plotH = gh - 120;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origX, origY - plotH);
    ctx.lineTo(origX, origY);
    ctx.lineTo(origX + plotW, origY);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('I (A) →', origX + plotW - 45, origY + 28);
    ctx.fillText('V (V) ↑', origX - 40, origY - plotH + 12);

    // Plot Points & Line
    if (readings.length > 0) {
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 3;
      ctx.beginPath();

      const maxI = 0.6;
      const maxV = 6.0;

      readings.forEach((pt, idx) => {
        const px = origX + (pt.current / maxI) * plotW;
        const py = origY - (pt.voltage / maxV) * plotH;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      readings.forEach((pt) => {
        const px = origX + (pt.current / maxI) * plotW;
        const py = origY - (pt.voltage / maxV) * plotH;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Bottom Stats
    ctx.fillStyle = 'rgba(15, 34, 56, 0.85)';
    ctx.fillRect(30, 520, w - 60, 90);
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30, 520, w - 60, 90);

    const stats = sim ? sim.calculateStatistics() : null;
    ctx.fillStyle = '#f0f9ff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      stats && stats.isVerified
        ? `🎉 Ohm's Law Verified! Mean Resistance R = ${stats.meanResistance.toFixed(2)} Ω (V ∝ I)`
        : `Record 5 readings at different rheostat settings to plot graph. (${readings.length} / 5 recorded)`,
      50,
      555
    );

    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px Inter, sans-serif';
    ctx.fillText('Pinch the "Record Reading" button on the VR Board or adjust Rheostat on table.', 50, 588);
  }

  /**
   * Per-frame tracking update in WebXR animation loop.
   * Attaches to the left wrist / forearm joint gracefully.
   */
  update(leftHandObj, delta) {
    if (!this.renderer || !this.renderer.xr.isPresenting) {
      this.group.visible = false;
      return;
    }

    // Fixed on table corner overlooking apparatus
    this.group.visible = true;
  }

  show() {
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  setHovered(isHovered, buttonId = null) {
    if (!this.buttons) return;
    this.buttons.forEach((btn) => {
      if (btn && btn.material) {
        const isThis = isHovered && (buttonId === btn.userData.buttonId || !buttonId);
        btn.material.color.setHex(isThis ? 0x38bdf8 : btn.userData.baseColor);
        btn.scale.setScalar(isThis ? 1.08 : 1.0);
      }
    });
  }
}

