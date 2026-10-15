/**
 * guidedModeController.js
 * Controls Guided Mode & Orientation Demonstration:
 * - Alternating 3D blinking on source & target terminals
 * - Animated glowing energy arc with travelling photon beads between terminals
 * - Floating 3D directional pins ([📍 START] & [🎯 CONNECT TO])
 * - World-space tooltips and synchronized voice narration
 *
 * Rules:
 * - Uses ONLY canonical IDs from guidedModeConfig.js & circuitConfig.js.
 * - Does NOT create a second circuit engine.
 * - Advisory only; works seamlessly in Desktop and VR.
 */

import * as THREE from 'three';
import {
  GUIDED_STEPS,
  GUIDED_COMPLETION_MESSAGE,
  GUIDED_NARRATION_EVENTS,
  getCurrentGuidedStepIndex,
  getGuidedStepForConnection
} from './guidedModeConfig.js';
import { getTerminalDisplayName } from '../circuit/circuitConfig.js';

export class GuidedModeController {
  constructor({ scene, terminalMarkers, narration, circuitState, simulation, onFeedback }) {
    this.scene = scene;
    this.terminalMarkers = terminalMarkers;
    this.narration = narration;
    this.circuitState = circuitState;
    this.simulation = simulation;
    this.onFeedback = onFeedback || (() => {});

    this.enabled = false;
    this.started = false;

    // Active preview curve and energy animation
    this.previewGroup = null;
    this.previewWireMesh = null;
    this.photonBeads = [];
    this.activeCurve = null;

    // Directional 3D billboard pins
    this.pinsGroup = null;
    this.pinFrom = null;
    this.pinTo = null;
    this.pinFromPos = null;
    this.pinToPos = null;

    // Tooltip group in world space
    this.tooltipGroup = null;
    this.tooltipVisible = false;

    // Terminal glow state tracking
    this.glowedTerminals = new Set();
    this.lastStepIndex = -1;

    this._buildPreviewWire();
    this._buildDirectionalPins();
    this._buildWorldTooltip();
  }

  /**
   * Enable or disable guided mode.
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this._clearAllGlows();
      this._hideTooltip();
      this._hidePreviewWire();
    } else {
      this._refresh();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Call after user gesture (Enter Guided, Enter VR, etc.)
   * Initialises narration and speaks the welcome message.
   */
  start() {
    if (this.started) return;
    this.started = true;
    if (this.narration) {
      this.narration.init();
      this.narration.speakOnce(
        'guided_welcome',
        GUIDED_NARRATION_EVENTS.welcome,
        GUIDED_NARRATION_EVENTS.welcome,
        0
      );
    }
    this._refresh();
  }

  /**
   * Refresh guided state based on current circuit progress.
   */
  refresh() {
    if (!this.enabled) return;
    this._refresh();
  }

  /**
   * Called by InteractionController when a terminal is selected (first click).
   * Shows green glow on valid target terminals.
   */
  onTerminalSelected(selectedTermId) {
    if (!this.enabled) return;
    this._clearAllGlows();

    const stepIdx = getCurrentGuidedStepIndex(this.circuitState);
    if (stepIdx >= GUIDED_STEPS.length) return;

    const step = GUIDED_STEPS[stepIdx];

    if (selectedTermId === step.from) {
      this._applyGlow(step.to, 'target');
    } else if (selectedTermId === step.to) {
      this._applyGlow(step.from, 'target');
    } else {
      this._applyGlow(step.from, 'next');
      this._applyGlow(step.to, 'next');
    }
  }

  /**
   * Called when terminal selection is cancelled.
   */
  onSelectionCancelled() {
    if (!this.enabled) return;
    this._clearAllGlows();
    this._refresh();
  }

  /**
   * Called after a wire is successfully connected.
   */
  onWireConnected(from, to, isValid) {
    this._clearAllGlows();
    this._hidePreviewWire();

    const stepData = getGuidedStepForConnection(from, to);

    if (isValid && stepData) {
      if (this.narration && this.narration.playWireChime) {
        this.narration.playWireChime();
      }

      const nextStepIdx = getCurrentGuidedStepIndex(this.circuitState);
      let nextText = '';
      if (nextStepIdx < GUIDED_STEPS.length) {
        const nextStep = GUIDED_STEPS[nextStepIdx];
        nextText = nextStep.narrationEn;
      } else {
        nextText = GUIDED_COMPLETION_MESSAGE.narrationEn;
        if (this.narration && this.narration.playSuccessMilestone) {
          this.narration.playSuccessMilestone();
        }
      }
      if (this.narration) {
        this.narration.speak(
          GUIDED_NARRATION_EVENTS.correctWire + nextText,
          `✅ Correct! ${stepData.instruction} — ${stepData.reason}`
        );
      }
    } else if (!isValid) {
      if (this.narration) {
        if (this.narration.playErrorSound) this.narration.playErrorSound();
        this.narration.speakOnce(
          'wrong_connection',
          GUIDED_NARRATION_EVENTS.wrongConnection,
          '⚠️ ' + GUIDED_NARRATION_EVENTS.wrongConnection
        );
      }
    }

    if (this.enabled) {
      this._refresh();
    }
  }

  /**
   * Highlight a specific connection step on the table (triggered by Orientation UI or Tour).
   */
  highlightStep(stepNumber) {
    const idx = typeof stepNumber === 'number' && stepNumber >= 1 && stepNumber <= GUIDED_STEPS.length
      ? stepNumber - 1
      : 0;
    const step = GUIDED_STEPS[idx];
    if (!step) return;

    this._clearAllGlows();

    // 1. Alternating 3D blinking on both terminals
    this._applyGlow(step.from, 'next');
    this._applyGlow(step.to, 'target');

    // 2. Show animated arched energy beam with flowing photons and 3D directional pins
    if (this.terminalMarkers) {
      const p1 = this.terminalMarkers.getTerminalWorldPosition(step.from, new THREE.Vector3());
      const p2 = this.terminalMarkers.getTerminalWorldPosition(step.to, new THREE.Vector3());
      if (p1 && p2 && p1.lengthSq() > 0 && p2.lengthSq() > 0) {
        const wireColor = step.wireLabelColor === '#ef4444' ? 0xef4444 : (step.wireLabelColor === '#38bdf8' ? 0x38bdf8 : 0x1e293b);
        this._showPreviewWire(p1, p2, wireColor, step);
      }
    }

    // 3. Show high-contrast world tooltip
    this._showTooltip(step.instruction, step.reason, step.from);

    // 4. Voice explanation
    if (this.narration) {
      if (this.narration.playStepChime) this.narration.playStepChime();
      this.narration.speak(step.narrationEn, `Step ${step.stepNumber}: ${step.instruction}`);
    }

    return step;
  }

  /**
   * Call in the render loop for preview wire position update.
   */
  updatePreviewWire(fromPosition, toPosition) {
    if (!fromPosition || !toPosition) {
      this._hidePreviewWire();
      return;
    }
    this._showPreviewWire(fromPosition, toPosition);
  }

  /**
   * Called when a wire is removed.
   */
  onWireRemoved() {
    this._clearAllGlows();
    if (this.enabled) {
      this._refresh();
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  _refresh() {
    const stepIdx = getCurrentGuidedStepIndex(this.circuitState);
    if (stepIdx === this.lastStepIndex) return;
    this.lastStepIndex = stepIdx;

    this._clearAllGlows();

    if (stepIdx >= GUIDED_STEPS.length) {
      this._hideTooltip();
      this._showTooltip(GUIDED_COMPLETION_MESSAGE.instruction, GUIDED_COMPLETION_MESSAGE.reason, null);
      if (this.narration && this.started) {
        this.narration.speakOnce(
          'guided_complete',
          GUIDED_COMPLETION_MESSAGE.narrationEn,
          GUIDED_COMPLETION_MESSAGE.instruction
        );
      }
      return;
    }

    const step = GUIDED_STEPS[stepIdx];

    // Glow both endpoints
    this._applyGlow(step.from, 'next');
    this._applyGlow(step.to, 'target');

    // Show glowing animated arc between terminals
    if (this.terminalMarkers) {
      const p1 = this.terminalMarkers.getTerminalWorldPosition(step.from, new THREE.Vector3());
      const p2 = this.terminalMarkers.getTerminalWorldPosition(step.to, new THREE.Vector3());
      if (p1 && p2 && p1.lengthSq() > 0 && p2.lengthSq() > 0) {
        const wireColor = step.wireLabelColor === '#ef4444' ? 0xef4444 : (step.wireLabelColor === '#38bdf8' ? 0x38bdf8 : 0x1e293b);
        this._showPreviewWire(p1, p2, wireColor, step);
      }
    }

    this._showTooltip(step.instruction, step.reason, step.from);

    if (this.narration && this.started) {
      this.narration.speakOnce(`step_instruction_${step.stepNumber}`, step.narrationEn, step.instruction);
    }
  }

  _applyGlow(termId, glowType) {
    if (!this.terminalMarkers) return;

    const color = glowType === 'target' ? 0x00ff88 : 0x00ffff;

    // Use terminalMarkers helper to update animated glow state with role
    if (this.terminalMarkers.setTerminalGlow) {
      this.terminalMarkers.setTerminalGlow(termId, true, color, glowType);
    }

    // Find the marker container and modify its material
    const markers = this.terminalMarkers.markerMeshes || [];
    const container = markers.find((m) => m.userData.terminalId === termId);
    if (!container) return;

    const dot = container.userData.dot;
    const ring = container.userData.ring;

    if (dot && dot.material) {
      dot.material.emissive.setHex(color);
      dot.material.emissiveIntensity = 1.4;
      dot.scale.setScalar(1.6);
    }
    if (ring && ring.material) {
      ring.material.color.setHex(color);
      ring.material.opacity = 1.0;
      ring.scale.setScalar(1.8);
    }

    this.glowedTerminals.add(termId);
  }

  _clearAllGlows() {
    this._hidePreviewWire();

    if (!this.terminalMarkers) return;

    const markers = this.terminalMarkers.markerMeshes || [];
    markers.forEach((container) => {
      const termId = container.userData.terminalId;
      if (this.terminalMarkers.setTerminalGlow) {
        this.terminalMarkers.setTerminalGlow(termId, false);
      }

      const config = container.userData.terminalConfig;
      if (!config) return;
      const dot = container.userData.dot;
      const ring = container.userData.ring;

      if (dot && dot.material) {
        dot.material.emissive.setHex(config.colorHex);
        dot.material.emissiveIntensity = 0.4;
        dot.scale.setScalar(1.0);
      }
      if (ring && ring.material) {
        ring.material.color.setHex(config.colorHex);
        ring.material.opacity = 0.8;
        ring.scale.setScalar(1.0);
      }
    });

    this.glowedTerminals.clear();
  }

  _buildPreviewWire() {
    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'GuidedPreviewGroup';

    // Glowing arched tube
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.previewWireMesh = new THREE.Mesh(geo, mat);
    this.previewGroup.add(this.previewWireMesh);

    // 4 Animated Flowing Energy Photon Spheres
    this.photonBeads = [];
    const beadGeo = new THREE.SphereGeometry(0.013, 14, 14);
    for (let i = 0; i < 4; i++) {
      const beadMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
      });
      const bead = new THREE.Mesh(beadGeo, beadMat);
      bead.visible = false;
      this.previewGroup.add(bead);
      this.photonBeads.push(bead);
    }

    this.previewGroup.visible = false;
    if (this.scene) this.scene.add(this.previewGroup);

    this.activeCurve = null;
  }

  _showPreviewWire(from, to, wireColorHex = 0x00ffff, step = null) {
    if (!this.previewGroup) return;

    // Arched height high enough to clear apparatus without clipping
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y = Math.max(from.y, to.y) + 0.16;

    this.activeCurve = new THREE.CatmullRomCurve3([from.clone(), mid, to.clone()]);
    const geo = new THREE.TubeGeometry(this.activeCurve, 24, 0.006, 8, false);

    if (this.previewWireMesh.geometry) this.previewWireMesh.geometry.dispose();
    this.previewWireMesh.geometry = geo;
    if (this.previewWireMesh.material) {
      this.previewWireMesh.material.color.setHex(wireColorHex);
    }

    this.photonBeads.forEach((bead) => {
      bead.visible = true;
    });
    this.previewGroup.visible = true;

    // Position and update the 3D Directional Pins
    if (this.pinsGroup && step) {
      const fromName = getTerminalDisplayName(step.from);
      const toName = getTerminalDisplayName(step.to);

      this._updatePinCanvas(this.pinFrom, `📍 START: ${fromName}`, 'rgba(8, 28, 52, 0.95)', '#38bdf8');
      this._updatePinCanvas(this.pinTo, `🎯 TO: ${toName}`, 'rgba(6, 48, 32, 0.95)', '#22c55e');

      this.pinFromPos = from.clone().add(new THREE.Vector3(0, 0.12, 0));
      this.pinToPos = to.clone().add(new THREE.Vector3(0, 0.12, 0));

      this.pinFrom.group.position.copy(this.pinFromPos);
      this.pinTo.group.position.copy(this.pinToPos);
      this.pinsGroup.visible = true;
    }
  }

  _hidePreviewWire() {
    if (this.previewGroup) {
      this.previewGroup.visible = false;
    }
    if (this.pinsGroup) {
      this.pinsGroup.visible = false;
    }
    this.activeCurve = null;
  }

  _buildDirectionalPins() {
    this.pinsGroup = new THREE.Group();
    this.pinsGroup.name = 'GuidedDirectionalPins';

    const createPin = (text, bgCol, borderCol) => {
      const canvas = document.createElement('canvas');
      canvas.width = 440;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.046),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
      );

      const stemGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.05, 8);
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = -0.035;

      const group = new THREE.Group();
      group.add(plane);
      group.add(stem);

      return { group, canvas, ctx, texture: tex, stemMat };
    };

    this.pinFrom = createPin('📍 START', 'rgba(8, 28, 52, 0.95)', '#38bdf8');
    this.pinTo = createPin('🎯 TO', 'rgba(6, 48, 32, 0.95)', '#22c55e');

    this.pinsGroup.add(this.pinFrom.group);
    this.pinsGroup.add(this.pinTo.group);
    this.pinsGroup.visible = false;

    if (this.scene) this.scene.add(this.pinsGroup);
  }

  _updatePinCanvas(pin, text, bgCol, borderCol) {
    if (!pin) return;
    const ctx = pin.ctx;
    const w = 440, h = 80;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = bgCol;
    roundRect(ctx, 4, 4, w - 8, h - 8, 12);
    ctx.fill();

    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 4;
    roundRect(ctx, 4, 4, w - 8, h - 8, 12);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    pin.texture.needsUpdate = true;
    if (pin.stemMat) {
      pin.stemMat.color.setStyle(borderCol);
    }
  }

  _buildWorldTooltip() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    this._tooltipCanvas = canvas;
    this._tooltipCtx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    this._tooltipTexture = texture;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.105),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
    );
    plane.name = 'GuidedTooltipPlane';

    this.tooltipGroup = new THREE.Group();
    this.tooltipGroup.name = 'GuidedTooltipGroup';
    this.tooltipGroup.add(plane);
    this.tooltipGroup.visible = false;

    if (this.scene) this.scene.add(this.tooltipGroup);
  }

  _showTooltip(instruction, reason, nearTermId) {
    if (!this.tooltipGroup) return;

    const ctx = this._tooltipCtx;
    const w = 512, h = 192;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(3, 18, 36, 0.94)';
    roundRect(ctx, 0, 0, w, h, 16);
    ctx.fill();

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    roundRect(ctx, 2, 2, w - 4, h - 4, 14);
    ctx.stroke();

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔗 ' + instruction, 18, 44);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px Inter, sans-serif';
    wrapText(ctx, '📖 ' + reason, 18, 80, w - 36, 22);

    this._tooltipTexture.needsUpdate = true;

    if (nearTermId && this.terminalMarkers) {
      const pos = this.terminalMarkers.getTerminalWorldPosition(nearTermId);
      this.tooltipGroup.position.set(pos.x, pos.y + 0.22, pos.z + 0.05);
    } else {
      this.tooltipGroup.position.set(0, 1.55, 0.15);
    }

    this.tooltipGroup.visible = true;
    this.tooltipVisible = true;
  }

  _hideTooltip() {
    if (this.tooltipGroup) {
      this.tooltipGroup.visible = false;
    }
    this.tooltipVisible = false;
  }

  /**
   * Update billboard orientations, animated photons, and floating pins.
   */
  update(camera, delta = 0.016, timeSec = 0) {
    if (!timeSec) timeSec = performance.now() / 1000;

    // 1. Animate flowing photon beads along the active connection arc
    if (this.activeCurve && this.previewGroup && this.previewGroup.visible) {
      const numBeads = this.photonBeads.length;
      for (let i = 0; i < numBeads; i++) {
        const bead = this.photonBeads[i];
        const progress = (timeSec * 0.95 + i * (1.0 / numBeads)) % 1.0;
        this.activeCurve.getPoint(progress, bead.position);
        const pulseScale = 1.0 + Math.sin(progress * Math.PI) * 0.45;
        bead.scale.setScalar(pulseScale);
      }
    }

    // 2. Billboard 3D directional pins towards camera and gentle bobbing
    if (this.pinsGroup && this.pinsGroup.visible && camera) {
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);

      if (this.pinFrom && this.pinFromPos) {
        this.pinFrom.group.position.y = this.pinFromPos.y + Math.sin(timeSec * 3.5) * 0.012;
        this.pinFrom.group.lookAt(camPos);
      }
      if (this.pinTo && this.pinToPos) {
        this.pinTo.group.position.y = this.pinToPos.y + Math.sin(timeSec * 3.5 + 1.2) * 0.012;
        this.pinTo.group.lookAt(camPos);
      }
    }

    // 3. Billboard tooltip
    if (this.tooltipGroup && this.tooltipGroup.visible && camera) {
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      this.tooltipGroup.lookAt(camPos);
    }
  }

  dispose() {
    this._clearAllGlows();
    this._hideTooltip();
    this._hidePreviewWire();
    if (this.previewGroup && this.scene) {
      this.scene.remove(this.previewGroup);
    }
    if (this.pinsGroup && this.scene) {
      this.scene.remove(this.pinsGroup);
    }
    if (this.tooltipGroup && this.scene) {
      this.scene.remove(this.tooltipGroup);
    }
  }
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}
