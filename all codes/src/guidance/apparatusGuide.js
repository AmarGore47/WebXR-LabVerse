/**
 * apparatusGuide.js
 * Phase 1: Guided Apparatus Identification & Inspection.
 *
 * Provides:
 * - 3D glowing beacon aura around each apparatus on the workbench
 * - Floating 3D informative billboard badge with Name, Scientific Role, and Rule
 * - Synchronized voice narration for each instrument
 * - Desktop click & WebXR hand interaction to inspect each component
 * - Progression tracking (0/6 to 6/6 identified) unlocking Phase 2 (Wiring)
 */

import * as THREE from 'three';

export const APPARATUS_DATA = [
  {
    id: 'battery',
    title: 'DC Power Supply (6V)',
    hindiName: 'DC Voltage Source',
    meshName: 'PowerSupply_body',
    pos: [-0.52, 0.96, 0.08],
    symbol: '🔋 [ + | - ]',
    role: 'Provides steady electrical energy and creates potential difference across the circuit.',
    rule: 'Positive (Red) connects to Plug Key; Negative (Black) connects to Resistor loop.',
    narration: 'This is the 6 Volt DC Battery. It supplies the continuous voltage and potential difference that drives electric current through our circuit.',
    color: '#ef4444'
  },
  {
    id: 'switch',
    title: 'Plug Key / Switch',
    hindiName: 'Circuit Safety Switch',
    meshName: 'PlugKey_base',
    pos: [-0.22, 0.94, -0.03],
    symbol: '🔑 [ (•) ]',
    role: 'Safely closes or breaks the electrical circuit loop.',
    rule: 'Keep key OPEN while wiring and between observations to prevent resistor heating.',
    narration: 'This is the Plug Key. It acts as our circuit safety switch. Keep it open while wiring and close it only when recording readings.',
    color: '#fbbf24'
  },
  {
    id: 'rheostat',
    title: 'Rheostat (Variable Resistor)',
    hindiName: 'Variable Current Controller',
    meshName: 'Rheostat_rail',
    pos: [0.05, 0.98, -0.05],
    symbol: '🎚️ [ ⮂ ]',
    role: 'Smoothly changes circuit resistance to vary current without altering battery voltage.',
    rule: 'Connect top slider terminal to Ammeter (-) and bottom base terminal to Resistor.',
    narration: 'This is the Rheostat. By moving its slider, we smoothly change resistance to take 5 different current readings for our graph.',
    color: '#f59e0b'
  },
  {
    id: 'ammeter',
    title: 'DC Ammeter (0–1 A)',
    hindiName: 'Series Current Meter',
    meshName: 'ammeter_body',
    pos: [0.34, 0.96, 0.01],
    symbol: '⚡ [ (A) ]',
    role: 'Measures electric current flowing through the circuit in Amperes (A).',
    rule: 'CRITICAL: Must ALWAYS be connected in SERIES. Has very low internal resistance.',
    narration: 'This is the Ammeter. It measures electric current in Amperes. Remember: an Ammeter must ALWAYS be connected in series with the circuit.',
    color: '#38bdf8'
  },
  {
    id: 'resistor',
    title: 'Standard Resistor (10 Ω)',
    hindiName: 'Ohmic Specimen Conductor',
    meshName: 'ResistorBoard',
    pos: [0.10, 0.93, 0.16],
    symbol: '📦 [ -/\/\/- ]',
    role: 'The ohmic conductor across which voltage and current are measured to verify V = IR.',
    rule: 'Connected in series with the battery loop; Voltmeter connects across it in parallel.',
    narration: 'This is the standard 5 Ohm Resistor coil. It is our specimen conductor. We will measure the voltage across it and verify Ohm\'s Law.',
    color: '#a855f7'
  },
  {
    id: 'voltmeter',
    title: 'DC Voltmeter (0–5 V)',
    hindiName: 'Parallel Potential Meter',
    meshName: 'voltmeter_body',
    pos: [0.48, 0.96, 0.20],
    symbol: '📊 [ (V) ]',
    role: 'Measures potential difference (voltage) across the 10 Ω resistor in Volts (V).',
    rule: 'CRITICAL: Must ALWAYS be connected in PARALLEL across the resistor.',
    narration: 'This is the Voltmeter. It measures electrical potential difference. It must ALWAYS be connected in parallel across the resistor, never in series.',
    color: '#2dd4bf'
  }
];

export class ApparatusGuide {
  constructor({ scene, narration, onFeedback, onComplete }) {
    this.scene = scene;
    this.narration = narration;
    this.onFeedback = onFeedback || (() => {});
    this.onComplete = onComplete || (() => {});

    this.group = new THREE.Group();
    this.group.name = 'ApparatusGuideGroup';
    this.group.visible = false;

    this.currentIndex = -1;
    this.identifiedSet = new Set();
    this.activeBeacon = null;
    this.activeCardSprite = null;

    this._buildBeacon();
    this.scene.add(this.group);
  }

  _buildBeacon() {
    this.beaconGroup = new THREE.Group();
    this.beaconGroup.name = 'ApparatusBeacon';

    // 1. Glowing ground ring
    const ringGeo = new THREE.TorusGeometry(0.12, 0.008, 16, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85
    });
    this.beaconRing = new THREE.Mesh(ringGeo, ringMat);
    this.beaconRing.rotation.x = Math.PI / 2;
    this.beaconGroup.add(this.beaconRing);

    // 2. Translucent vertical beacon cylinder
    const cylGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.28, 32, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beaconCylinder = new THREE.Mesh(cylGeo, cylMat);
    this.beaconCylinder.position.y = 0.14;
    this.beaconGroup.add(this.beaconCylinder);

    // 2b. Vertical holographic laser pointer beam connecting ground beacon to elevated card
    const stemGeo = new THREE.CylinderGeometry(0.0018, 0.0018, 0.32, 8);
    const stemMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.65
    });
    this.beaconStem = new THREE.Mesh(stemGeo, stemMat);
    this.beaconStem.position.y = 0.38;
    this.beaconGroup.add(this.beaconStem);

    // 3. Floating 3D Info Card Canvas Sprite (Elevated comfortably above instrument line)
    this.cardCanvas = document.createElement('canvas');
    this.cardCanvas.width = 640;
    this.cardCanvas.height = 360;
    this.cardCtx = this.cardCanvas.getContext('2d');
    this.cardTexture = new THREE.CanvasTexture(this.cardCanvas);
    this.cardTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.cardTexture,
      transparent: true,
      depthTest: false
    });
    this.cardSprite = new THREE.Sprite(spriteMat);
    this.cardSprite.scale.set(0.42, 0.24, 1.0);
    this.cardSprite.position.set(0, 0.58, 0);
    this.beaconGroup.add(this.cardSprite);

    this.group.add(this.beaconGroup);
  }

  /**
   * Start sequential apparatus identification phase.
   */
  startTour() {
    this.group.visible = true;
    this.currentIndex = 0;
    this.showApparatus(0);

    if (this.narration) {
      this.narration.init();
      this.narration.speak(
        'Welcome to Phase 1: Apparatus Identification. Look around the workbench to identify all 6 instruments before connecting the circuit.',
        '🔍 Phase 1: Apparatus Identification (1/6)'
      );
    }
    this.onFeedback({
      type: 'info',
      message: '🔍 Phase 1: Apparatus Identification started! Inspect all 6 instruments.'
    });
  }

  /**
   * Focus a specific apparatus by index or id.
   */
  showApparatus(indexOrId) {
    let index = typeof indexOrId === 'number' ? indexOrId : APPARATUS_DATA.findIndex(a => a.id === indexOrId);
    if (index < 0 || index >= APPARATUS_DATA.length) return;

    this.currentIndex = index;
    const item = APPARATUS_DATA[index];
    this.identifiedSet.add(item.id);

    // Position beacon at apparatus
    this.beaconGroup.position.set(item.pos[0], item.pos[1] - 0.02, item.pos[2]);

    // Render 3D info card canvas
    this._renderCard(item);

    // Color theme beacon
    const hexColor = new THREE.Color(item.color);
    this.beaconRing.material.color = hexColor;
    this.beaconCylinder.material.color = hexColor;
    if (this.beaconStem) this.beaconStem.material.color = hexColor;

    // Speak narration
    if (this.narration) {
      this.narration.speak(item.narration, `🔍 ${item.title}: ${item.role}`);
    }

    this.onFeedback({
      type: 'info',
      message: `🔍 [${this.identifiedSet.size}/6 Identified] ${item.title}: ${item.role}`
    });

    if (this.identifiedSet.size >= APPARATUS_DATA.length) {
      this._onAllIdentified();
    }
  }

  next() {
    if (this.currentIndex < APPARATUS_DATA.length - 1) {
      this.showApparatus(this.currentIndex + 1);
    } else {
      this.showApparatus(0);
    }
  }

  _onAllIdentified() {
    if (this.narration) {
      this.narration.playObservationSuccessChime();
      this.narration.speak(
        'Excellent! All 6 apparatus have been identified. You are now ready for Phase 2: Connecting the 7 circuit wires.',
        '🎉 All 6 Instruments Identified! Proceed to Wiring.'
      );
    }
    this.onFeedback({
      type: 'success',
      message: '🎉 Phase 1 Complete! All 6 apparatus identified. Ready for Phase 2: Circuit Connections.'
    });
    this.onComplete();
  }

  _renderCard(item) {
    const ctx = this.cardCtx;
    const w = this.cardCanvas.width;
    const h = this.cardCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Sleek obsidian glass card with glowing border
    ctx.fillStyle = 'rgba(7, 18, 36, 0.94)';
    ctx.strokeStyle = item.color || '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 20);
    ctx.fill();
    ctx.stroke();

    // Top Header Pill
    ctx.fillStyle = item.color || '#38bdf8';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${item.symbol}  ${item.title.toUpperCase()}`, 28, 48);

    // Hindi translation subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillText(item.hindiName || '', 28, 78);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(28, 92);
    ctx.lineTo(w - 28, 92);
    ctx.stroke();

    // Role
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('⚡ Scientific Role:', 28, 126);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '19px Inter, sans-serif';
    this._wrapText(ctx, item.role, 28, 156, w - 56, 26);

    // Rule Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(24, 210, w - 48, 84);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.strokeRect(24, 210, w - 48, 84);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText('📌 Connection Rule:', 38, 238);

    ctx.fillStyle = '#fef3c7';
    ctx.font = '17px Inter, sans-serif';
    this._wrapText(ctx, item.rule, 38, 266, w - 76, 22);

    // Progress counter badge
    const countText = `Identified: ${this.identifiedSet.size} / 6`;
    ctx.fillStyle = this.identifiedSet.size >= 6 ? '#22c55e' : '#38bdf8';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(countText, w - 28, 48);

    this.cardTexture.needsUpdate = true;
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
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

  /**
   * Sync apparatus guide with loaded 3D GLTF model node positions.
   */
  syncWithModel(model) {
    if (!model) return;
    const tempPos = new THREE.Vector3();
    APPARATUS_DATA.forEach((cfg) => {
      const obj = model.getObjectByName(cfg.meshName);
      if (obj) {
        obj.getWorldPosition(tempPos);
        cfg.pos = [tempPos.x, tempPos.y + 0.05, tempPos.z];
      }
    });
    if (this.currentIndex >= 0) {
      this.showApparatus(this.currentIndex);
    }
  }

  /**
   * Per-frame animation for beacon pulsing & gentle card hover.
   */
  update(delta, time) {
    if (!this.group.visible) return;

    // Rotate beacon ring
    this.beaconRing.rotation.z = time * 1.5;

    // Pulse beacon opacity
    const pulse = 0.5 + Math.sin(time * 4.0) * 0.35;
    this.beaconRing.material.opacity = pulse;
    this.beaconCylinder.material.opacity = pulse * 0.3;

    // Gentle vertical bobbing for floating card
    this.cardSprite.position.y = 0.30 + Math.sin(time * 2.5) * 0.02;
  }

  hide() {
    this.group.visible = false;
  }

  show() {
    this.group.visible = true;
  }
}
