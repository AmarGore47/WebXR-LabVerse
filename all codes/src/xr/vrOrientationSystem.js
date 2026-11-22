/**
 * vrOrientationSystem.js
 * Tony Stark-Style 3D Spatial Holographic Orientation & Procedure System.
 *
 * Zero 2D HTML screens in VR:
 * - Floating JARVIS-style AI Core / Orb with rotating gyro rings
 * - 3D Holographic Greeting & Objective Cards hovering above table (English)
 * - Tabletop Holographic Circuit Projection (VRHoloCircuit)
 * - Physical 3D Workbench Push Button (VRStartButton3D)
 * - High-clarity English SpeechSynthesis AI voice narration
 * - Wrist laser ray & pinch hand-tracking interaction
 */

import * as THREE from 'three';
import { sound } from '../audio.js';
import { VRHoloCircuit } from './vrHoloCircuit.js';
import { VRStartButton3D } from './vrStartButton3D.js';

export const ORIENTATION_PHASES = {
  IDLE: 'idle',
  WELCOME: 'welcome',
  OBJECTIVES: 'objectives',
  BLUEPRINT: 'blueprint',
  READY: 'ready',
  COMPLETED: 'completed'
};

export class VROrientationSystem {
  constructor({
    scene,
    camera,
    narration,
    guidedMode,
    apparatusGuide,
    onFeedback = () => {},
    onStartPractical = () => {}
  } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.narration = narration;
    this.guidedMode = guidedMode;
    this.apparatusGuide = apparatusGuide;
    this.onFeedback = onFeedback;
    this.onStartPractical = onStartPractical;

    this.group = new THREE.Group();
    this.group.name = 'VROrientationSystem';

    this.currentPhase = ORIENTATION_PHASES.IDLE;
    this.phaseTime = 0;

    // Subcomponents
    this.holoCircuit = new VRHoloCircuit({ scene: this.group });
    this.startButton = new VRStartButton3D({
      scene: this.group,
      position: new THREE.Vector3(0.55, 0.84, 0.32),
      onPress: () => this.handleStartPractical()
    });

    this._buildAICore();
    this._buildHoloCards();
    this._buildFloatingControls();
    this._buildHydraulicAnalogy();

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  /* -------------------------------------------------------------
   * 1. 3D Floating JARVIS AI Holographic Core
   * ------------------------------------------------------------- */
  _buildAICore() {
    this.coreGroup = new THREE.Group();
    // Position comfortably above orientation cards, well clear of table apparatus
    this.coreGroup.position.set(0, 2.14, -0.22);

    // Glowing energy nucleus
    const sphereGeo = new THREE.SphereGeometry(0.048, 24, 24);
    this.coreSphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: false,
      transparent: true,
      opacity: 0.92
    });
    this.coreSphere = new THREE.Mesh(sphereGeo, this.coreSphereMat);
    this.coreGroup.add(this.coreSphere);

    // Inner wireframe lattice
    const latticeGeo = new THREE.IcosahedronGeometry(0.058, 1);
    const latticeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    this.coreLattice = new THREE.Mesh(latticeGeo, latticeMat);
    this.coreGroup.add(this.coreLattice);

    // Outer Gyroscope Rings (Arc Reactor / Jarvis aesthetic)
    const ringGeo1 = new THREE.TorusGeometry(0.082, 0.0028, 16, 48);
    this.ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.8 });
    this.ring1 = new THREE.Mesh(ringGeo1, this.ringMat1);
    this.coreGroup.add(this.ring1);

    const ringGeo2 = new THREE.TorusGeometry(0.098, 0.0024, 16, 48);
    this.ringMat2 = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 });
    this.ring2 = new THREE.Mesh(ringGeo2, this.ringMat2);
    this.ring2.rotation.x = Math.PI / 3;
    this.coreGroup.add(this.ring2);

    // 3D Floating Banner Label
    this.bannerSprite = this._createBannerSprite();
    this.bannerSprite.position.set(0, 0.16, 0);
    this.bannerSprite.scale.set(0.68, 0.18, 1);
    this.coreGroup.add(this.bannerSprite);

    this.group.add(this.coreGroup);
  }

  _createBannerSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Holographic gradient pill
    ctx.fillStyle = 'rgba(6, 18, 38, 0.88)';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(12, 12, 1000, 232, 32);
    ctx.fill();
    ctx.stroke();

    // Cyan glowing header stripe
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(40, 24, 944, 8);

    // AI Title
    ctx.font = 'bold 50px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('🔷 JARVIS AI · PHYSICS VR SIMULATION', 512, 98);

    // Subtitle
    ctx.font = '600 36px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText("Maharashtra Std 10 · Verification of Ohm's Law (V = I × R)", 512, 162);

    ctx.font = '500 28px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('⚡ 3D SPATIAL ORIENTATION & PRACTICAL GUIDE', 512, 214);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 16;

    const bannerGeo = new THREE.PlaneGeometry(0.70, 0.18);
    const bannerMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });

    return new THREE.Mesh(bannerGeo, bannerMat);
  }

  /* -------------------------------------------------------------
   * 2. 3D Floating Holographic Cards
   * ------------------------------------------------------------- */
  _buildHoloCards() {
    this.cardsGroup = new THREE.Group();
    // Position comfortably above table apparatus line, tilted back slightly to face student at eye level (~1.82m)
    this.cardsGroup.position.set(0, 1.82, -0.16);
    this.cardsGroup.rotation.x = -0.10;
    this.cardsGroup.visible = false;

    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1080;
    this.cardCanvas = canvas;
    this.cardCtx = canvas.getContext('2d');

    this.cardTexture = new THREE.CanvasTexture(canvas);
    this.cardTexture.colorSpace = THREE.SRGBColorSpace;
    this.cardTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.cardTexture.generateMipmaps = true;
    this.cardTexture.anisotropy = 16;

    const cardGeo = new THREE.PlaneGeometry(0.92, 0.48);
    const cardMat = new THREE.MeshBasicMaterial({
      map: this.cardTexture,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide
    });

    this.cardMesh = new THREE.Mesh(cardGeo, cardMat);
    this.cardsGroup.add(this.cardMesh);

    // Subtle dark glass backing for readability from both sides
    const backGeo = new THREE.PlaneGeometry(0.93, 0.49);
    const backMat = new THREE.MeshBasicMaterial({
      color: 0x060f20,
      transparent: true,
      opacity: 0.82,
      side: THREE.BackSide
    });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.position.z = -0.002;
    this.cardsGroup.add(backMesh);

    this.group.add(this.cardsGroup);
  }

  _renderCard(phase) {
    const ctx = this.cardCtx;
    ctx.save();
    ctx.clearRect(0, 0, 2048, 1080);
    ctx.scale(2, 2);
    const w = 1024;
    const h = 540;

    // Glass panel
    ctx.fillStyle = 'rgba(6, 15, 32, 0.94)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 24);
    ctx.fill();
    ctx.stroke();

    if (phase === ORIENTATION_PHASES.WELCOME) {
      this._renderWelcomeContent(ctx, w, h);
    } else if (phase === ORIENTATION_PHASES.OBJECTIVES) {
      this._renderObjectivesContent(ctx, w, h);
    } else if (phase === ORIENTATION_PHASES.BLUEPRINT || phase === ORIENTATION_PHASES.READY) {
      this._renderBlueprintContent(ctx, w, h);
    }

    ctx.restore();
    this.cardTexture.needsUpdate = true;
  }

  _renderWelcomeContent(ctx, w, h) {
    // Top cyan header accent
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(30, 20, w - 60, 6);

    // Title
    ctx.font = 'bold 38px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText("🎯 Scientific Aim & Laboratory Overview", 50, 75);

    // Step Indicator
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'right';
    ctx.fillText("PHASE 1 OF 3", w - 50, 75);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 95);
    ctx.lineTo(w - 50, 95);
    ctx.stroke();

    // Aim Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(50, 115, w - 100, 120, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText("🎯 The Core Principle in Simple Terms:", 75, 150);

    ctx.font = '21px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    this._wrapCanvasText(
      ctx,
      "Electric Current (I) is like water flowing through a pipe. Voltage (V) is the pump pressure pushing it, and Resistance (R) is the narrowness of the pipe. If you double the push (V), the flow (I) doubles: V = I × R!",
      75,
      182,
      w - 150,
      28
    );

    // 3 Key Concept Pillars
    const pillars = [
      {
        icon: '🔋',
        title: "Voltage (V) · Push",
        desc: "Electrical pressure from 6V DC battery. Pushes electrons through the circuit.",
        color: '#38bdf8'
      },
      {
        icon: '🌊',
        title: "Current (I) · Flow",
        desc: "Rate of electron flow in Amperes (A). Measured by Ammeter in SERIES loop.",
        color: '#a855f7'
      },
      {
        icon: '📦',
        title: "Resistance (R) · Obstacle",
        desc: "Friction opposing current (Ohms Ω). Measured across Resistor in PARALLEL.",
        color: '#10b981'
      }
    ];

    const pW = 295;
    const pY = 255;
    pillars.forEach((p, idx) => {
      const pX = 50 + idx * 315;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(pX, pY, pW, 190, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '32px "Segoe UI", sans-serif';
      ctx.fillText(p.icon, pX + 20, pY + 45);

      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.title, pX + 65, pY + 44);

      ctx.font = '19px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      this._wrapCanvasText(ctx, p.desc, pX + 20, pY + 85, pW - 35, 24);
    });

    // Bottom prompt
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ Tap the 3D Valve on the table to test flow, or pinch [ NEXT: OBJECTIVES ] to proceed', w / 2, h - 22);
  }

  _renderObjectivesContent(ctx, w, h) {
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(30, 20, w - 60, 6);

    ctx.font = 'bold 38px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText("📋 Practical Learning Path & Core Objectives", 50, 75);

    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'right';
    ctx.fillText("PHASE 2 OF 3", w - 50, 75);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 95);
    ctx.lineTo(w - 50, 95);
    ctx.stroke();

    const items = [
      {
        num: '1',
        title: "Ohm's Law Concept (V ∝ I)",
        desc: "Potential difference across a conductor is directly proportional to current when temperature remains constant.",
        sub: "Formula: V = I × R with constant resistance slope R",
        color: '#38bdf8'
      },
      {
        num: '2',
        title: "Complete Circuit Assembly (7 Wires)",
        desc: "Connect Battery, Switch, Rheostat, and Ammeter in series, with Voltmeter in parallel across the resistor.",
        sub: "Strict polarity matching (+ to -) and circuit safety",
        color: '#a855f7'
      },
      {
        num: '3',
        title: "Rheostat Current Variation & 5 Readings",
        desc: "Move the rheostat slider across 5 distinct positions to record current and voltage pairs safely.",
        sub: "Dual analog meters and precision holographic HUD",
        color: '#f59e0b'
      },
      {
        num: '4',
        title: "V–I Linear Graph & Law Verification",
        desc: "Plot observations on millimeter graph paper to verify a straight best-fit line passing through origin.",
        sub: "Slope ΔV / ΔI = Specimen Resistance R = 10.00 Ω",
        color: '#10b981'
      }
    ];

    const boxW = 445;
    const boxH = 175;
    const coords = [
      { x: 50, y: 115 },
      { x: 525, y: 115 },
      { x: 50, y: 310 },
      { x: 525, y: 310 }
    ];

    items.forEach((item, idx) => {
      const c = coords[idx];
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, boxW, boxH, 14);
      ctx.fill();
      ctx.stroke();

      // Number badge
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(c.x + 32, c.y + 36, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(item.num, c.x + 32, c.y + 44);

      ctx.font = 'bold 23px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(item.title, c.x + 62, c.y + 43);

      ctx.font = '19px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      this._wrapCanvasText(ctx, item.desc, c.x + 20, c.y + 80, boxW - 35, 24);

      ctx.font = 'bold 17px "Segoe UI", sans-serif';
      ctx.fillStyle = item.color;
      ctx.fillText(`💡 ${item.sub}`, c.x + 20, c.y + 152);
    });

    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ Pinch [ NEXT: 3D SCHEMATIC ] to inspect the tabletop holographic circuit blueprint', w / 2, h - 22);
  }

  _renderBlueprintContent(ctx, w, h) {
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(30, 20, w - 60, 6);

    ctx.font = 'bold 38px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText("⚡ Tabletop Holographic Circuit Schematic", 50, 75);

    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'right';
    ctx.fillText("PHASE 3 OF 3", w - 50, 75);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 95);
    ctx.lineTo(w - 50, 95);
    ctx.stroke();

    // Summary Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(50, 115, w - 100, 115, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 23px "Segoe UI", sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'left';
    ctx.fillText("✅ Holographic Projection Active on Workbench Table", 75, 150);

    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    this._wrapCanvasText(
      ctx,
      "Inspect the glowing 3D circuit layout directly on the tabletop. Wires 1 through 5 form the series current loop. Wires 6 and 7 connect the voltmeter in parallel across the specimen resistor.",
      75,
      180,
      w - 150,
      26
    );

    // Two Column Rules
    const colW = 445;
    const c1X = 50;
    const c2X = 525;
    const colY = 250;
    const colH = 195;

    // Col 1: Series Loop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(c1X, colY, colW, colH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText("🔵 Series Current Loop (Wires 1–5)", c1X + 20, colY + 36);

    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText("1. Battery (+) ➔ Plug Key (Left)", c1X + 20, colY + 70);
    ctx.fillText("2. Plug Key (Right) ➔ Ammeter (+)", c1X + 20, colY + 102);
    ctx.fillText("3. Ammeter (-) ➔ Rheostat Slider", c1X + 20, colY + 134);
    ctx.fillText("4. Rheostat Base ➔ Resistor (Left)", c1X + 20, colY + 166);

    // Col 2: Parallel Branch & Ground
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(c2X, colY, colW, colH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.fillText("🟣 Parallel Voltmeter & Return (Wires 5–7)", c2X + 20, colY + 36);

    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText("5. Resistor (Right) ➔ Battery (-)", c2X + 20, colY + 70);
    ctx.fillText("6. Voltmeter (+) ➔ Resistor (Left)", c2X + 20, colY + 102);
    ctx.fillText("7. Voltmeter (-) ➔ Resistor (Right)", c2X + 20, colY + 134);
    ctx.fillStyle = '#4ade80';
    ctx.fillText("⚡ Complete circuit unlocks physical switch!", c2X + 20, colY + 166);

    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText("⚡ Pinch [ START PRACTICAL ] or press the physical workbench button to begin wiring", w / 2, h - 22);
  }

  _wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
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

  /* -------------------------------------------------------------
   * 3. 3D Floating Control Buttons (Back, Next/Start, Skip)
   * ------------------------------------------------------------- */
  _buildFloatingControls() {
    this.controlsGroup = new THREE.Group();
    // Position comfortably above apparatus line directly beneath orientation card, angled to face student's eyes
    this.controlsGroup.position.set(0, 1.54, -0.08);
    this.controlsGroup.rotation.x = -0.10;

    this.clickables = [];

    // 1. Back button (Left)
    this.backBtn = this._createFloatingBtn('◀ BACK', 'orient_back', -0.30, 0x475569);
    this.backBtn.visible = false;
    this.controlsGroup.add(this.backBtn);
    this.clickables.push(this.backBtn.userData.colMesh, this.backBtn.userData.labelMesh);

    // 2. Next / Start button (Center)
    this.nextBtn = this._createFloatingBtn('⏩ NEXT: OBJECTIVES', 'orient_next', 0.0, 0x0284c7);
    this.controlsGroup.add(this.nextBtn);
    this.clickables.push(this.nextBtn.userData.colMesh, this.nextBtn.userData.labelMesh);

    // 3. Skip to Lab button (Right)
    this.skipBtn = this._createFloatingBtn('⏭️ SKIP TO LAB', 'orient_skip', 0.30, 0x334155);
    this.controlsGroup.add(this.skipBtn);
    this.clickables.push(this.skipBtn.userData.colMesh, this.skipBtn.userData.labelMesh);

    this.group.add(this.controlsGroup);
  }

  _createFloatingBtn(label, btnId, xOffset, hexColor) {
    const btnGroup = new THREE.Group();
    btnGroup.position.set(xOffset, 0, 0);

    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    this._drawButtonCanvas(ctx, label, hexColor);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 16;

    // 1. Solid metallic chassis backplate (tangible 3D button)
    const backGeo = new THREE.BoxGeometry(0.245, 0.065, 0.012);
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.7
    });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.position.set(0, 0, -0.006);
    btnGroup.add(backMesh);

    // 2. High-contrast crisp canvas label plane
    const labelGeo = new THREE.PlaneGeometry(0.24, 0.062);
    const labelMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.set(0, 0, 0.001);
    btnGroup.add(labelMesh);

    // 3. Generous invisible raycast collider box for effortless hand laser pointing
    const colGeo = new THREE.BoxGeometry(0.26, 0.078, 0.035);
    const colMat = new THREE.MeshBasicMaterial({ visible: false });
    const colMesh = new THREE.Mesh(colGeo, colMat);
    btnGroup.add(colMesh);

    const btnUserData = {
      isVROrientButton: true,
      buttonId: btnId,
      canvas,
      ctx,
      texture,
      labelMesh,
      backMesh,
      colMesh,
      group: btnGroup,
      onPress: () => this.handleClick(btnGroup)
    };

    btnGroup.userData = btnUserData;
    colMesh.userData = btnUserData;
    labelMesh.userData = btnUserData;
    backMesh.userData = btnUserData;

    return btnGroup;
  }

  _drawButtonCanvas(ctx, label, hexColor) {
    ctx.save();
    ctx.clearRect(0, 0, 768, 192);
    ctx.scale(2, 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = `#${hexColor.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(6, 6, 372, 84, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 28px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 192, 48);
    ctx.restore();
  }

  _updateBtn(btnGroup, label, btnId, hexColor) {
    if (!btnGroup || !btnGroup.userData) return;
    btnGroup.userData.buttonId = btnId;
    if (btnGroup.userData.colMesh) btnGroup.userData.colMesh.userData.buttonId = btnId;
    if (btnGroup.userData.labelMesh) btnGroup.userData.labelMesh.userData.buttonId = btnId;
    this._drawButtonCanvas(btnGroup.userData.ctx, label, hexColor);
    btnGroup.userData.texture.needsUpdate = true;
  }

  /* -------------------------------------------------------------
   * 4. 3D Interactive Tabletop Hydraulic Analogy (Water-Pipe Model)
   * ------------------------------------------------------------- */
  _buildHydraulicAnalogy() {
    this.hydraulicGroup = new THREE.Group();
    this.hydraulicGroup.name = '3DHydraulicAnalogyModel';
    // Positioned neatly on tabletop (y = 0.88, z = 0.22)
    this.hydraulicGroup.position.set(0, 0.88, 0.22);
    this.hydraulicGroup.visible = false;

    // 1. Sleek metallic plinth
    const baseGeo = new THREE.BoxGeometry(0.72, 0.024, 0.32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.95
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    this.hydraulicGroup.add(baseMesh);

    // Glowing base rim
    const rimGeo = new THREE.BoxGeometry(0.73, 0.006, 0.33);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.6 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = 0.012;
    this.hydraulicGroup.add(rimMesh);

    // 2. Clear Glass U-Tube Pipe loop
    const curvePoints = [
      new THREE.Vector3(-0.24, 0.06,  0.08),
      new THREE.Vector3(-0.24, 0.06, -0.08),
      new THREE.Vector3( 0.24, 0.06, -0.08),
      new THREE.Vector3( 0.24, 0.06,  0.08),
      new THREE.Vector3(-0.24, 0.06,  0.08)
    ];
    this.pipeCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'catmullrom', 0.2);
    const pipeGeo = new THREE.TubeGeometry(this.pipeCurve, 64, 0.016, 16, true);
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    this.hydraulicGroup.add(pipeMesh);

    // 3. Water Pump Housing (Voltage V - Push) on left
    const pumpGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.065, 20);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7 });
    const pumpMesh = new THREE.Mesh(pumpGeo, pumpMat);
    pumpMesh.position.set(-0.24, 0.06, 0.0);
    this.hydraulicGroup.add(pumpMesh);

    // Rotating impeller / turbine blades inside pump
    const rotorGeo = new THREE.BoxGeometry(0.06, 0.012, 0.012);
    const rotorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.pumpRotor = new THREE.Mesh(rotorGeo, rotorMat);
    this.pumpRotor.position.set(-0.24, 0.06, 0.0);
    this.hydraulicGroup.add(this.pumpRotor);

    // 4. Constriction Valve (Resistance R - Narrowing) in front center
    const valveGroup = new THREE.Group();
    valveGroup.position.set(0.0, 0.06, 0.08);

    // Squeeze clamp collar
    const collarGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.038, 16);
    collarGeo.rotateZ(Math.PI / 2);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });
    this.valveCollar = new THREE.Mesh(collarGeo, collarMat);
    valveGroup.add(this.valveCollar);

    // Handwheel stem and wheel
    const stemGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.045, 12);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.position.y = 0.035;
    valveGroup.add(stemMesh);

    const wheelGeo = new THREE.TorusGeometry(0.028, 0.006, 12, 24);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5, roughness: 0.3, emissive: 0x7f1d1d, emissiveIntensity: 0.4 });
    this.valveWheel = new THREE.Mesh(wheelGeo, wheelMat);
    this.valveWheel.position.y = 0.058;
    valveGroup.add(this.valveWheel);

    // Invisible Hit Box for Pinching Valve Wheel
    const wheelHitGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.07, 12);
    const wheelHitMat = new THREE.MeshBasicMaterial({ visible: false });
    const wheelHit = new THREE.Mesh(wheelHitGeo, wheelHitMat);
    wheelHit.position.y = 0.045;
    wheelHit.userData = {
      isVROrientButton: true,
      buttonId: 'orient_valve',
      onPress: () => this.toggleHydraulicValve()
    };
    valveGroup.add(wheelHit);
    this.clickables.push(wheelHit);

    this.hydraulicGroup.add(valveGroup);

    // 5. Flowing Water / Electron Particles
    this.waterParticles = [];
    this.waterParticleCount = 28;
    this.particleSpeeds = [0.45, 0.25, 0.10]; // for Low (2Ω), Med (6Ω), High (12Ω)
    this.valveState = 0; // 0 = 2Ω (open), 1 = 6Ω (med), 2 = 12Ω (tight)
    const pGeo = new THREE.SphereGeometry(0.006, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.85 });

    for (let i = 0; i < this.waterParticleCount; i++) {
      const pMesh = new THREE.Mesh(pGeo, pMat);
      this.hydraulicGroup.add(pMesh);
      this.waterParticles.push({
        mesh: pMesh,
        u: i / this.waterParticleCount
      });
    }

    // 6. Floating 3D Text Tag Plaque
    const tagCanvas = document.createElement('canvas');
    tagCanvas.width = 512;
    tagCanvas.height = 128;
    const tagCtx = tagCanvas.getContext('2d');
    this.tagCtx = tagCtx;
    this.tagCanvas = tagCanvas;
    this.tagTexture = new THREE.CanvasTexture(tagCanvas);
    this._renderHydraulicTag();

    const tagPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.09),
      new THREE.MeshBasicMaterial({ map: this.tagTexture, transparent: true, side: THREE.DoubleSide })
    );
    tagPlane.position.set(0, 0.165, 0.08);
    tagPlane.rotation.x = -0.25;
    this.hydraulicGroup.add(tagPlane);

    this.group.add(this.hydraulicGroup);
  }

  _renderHydraulicTag() {
    const ctx = this.tagCtx;
    if (!ctx) return;
    const w = 512;
    const h = 128;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 14);
    ctx.fill();
    ctx.stroke();

    const resistances = ['2.0 Ω (WIDE OPEN)', '6.0 Ω (HALF CLOSED)', '12.0 Ω (TIGHT PINCH)'];
    const currents = ['I = 3.00 A (MAX FLOW)', 'I = 1.00 A (MEDIUM FLOW)', 'I = 0.50 A (SLOW FLOW)'];
    const colors = ['#10b981', '#f59e0b', '#ef4444'];

    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.fillStyle = colors[this.valveState || 0];
    ctx.textAlign = 'center';
    ctx.fillText(`🔧 VALVE: ${resistances[this.valveState || 0]}`, w / 2, 42);

    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`🌊 CURRENT: ${currents[this.valveState || 0]}`, w / 2, 80);

    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('👉 Tap/Pinch Valve to change Resistance!', w / 2, 112);

    if (this.tagTexture) this.tagTexture.needsUpdate = true;
  }

  toggleHydraulicValve() {
    this.valveState = ((this.valveState || 0) + 1) % 3;
    if (this.valveWheel) {
      this.valveWheel.rotation.y += Math.PI / 3;
    }
    if (this.valveCollar) {
      const scaleX = this.valveState === 2 ? 0.45 : (this.valveState === 1 ? 0.75 : 1.0);
      this.valveCollar.scale.set(scaleX, 1, 1);
    }
    this._renderHydraulicTag();
    sound.playSliderTick(1.0 + this.valveState * 0.4);

    const voiceLines = [
      "Valve wide open. Low resistance of 2 ohms allows maximum electric current of 3 amperes.",
      "Valve partially closed. Resistance increased to 6 ohms, reducing current to 1 ampere.",
      "Valve tightly pinched. High resistance of 12 ohms chokes current down to 0.5 amperes."
    ];
    const captions = [
      "🟢 Low R (2Ω) → Max Current (3.0A) | V = I × R holds true!",
      "🟡 Medium R (6Ω) → Medium Current (1.0A)",
      "🔴 High R (12Ω) → Choked Current (0.5A) | Ohm's Law in 3D"
    ];
    if (this.narration) {
      this.narration.speak(voiceLines[this.valveState], captions[this.valveState]);
    }
  }

  /* -------------------------------------------------------------
   * Lifecycle & Phase Progression
   * ------------------------------------------------------------- */
  startOrientation() {
    this.group.visible = true;
    this.setPhase(ORIENTATION_PHASES.WELCOME);
  }

  setPhase(phase) {
    this.currentPhase = phase;
    this.phaseTime = 0;

    if (this.narration) {
      this.narration.init();
      if (typeof this.narration.playPhaseChime === 'function') {
        this.narration.playPhaseChime(phase);
      }
    }

    switch (phase) {
      case ORIENTATION_PHASES.WELCOME: {
        this.coreGroup.visible = true;
        this.cardsGroup.visible = true;
        this._renderCard(ORIENTATION_PHASES.WELCOME);
        this.holoCircuit.hide();
        this.startButton.setVisible(false);
        if (this.hydraulicGroup) this.hydraulicGroup.visible = true;

        this.backBtn.visible = false;
        this._updateBtn(this.nextBtn, '⏩ NEXT: OBJECTIVES', 'orient_next', 0x0284c7);

        const welcomeVoice =
          "Welcome to the Physics VR Simulation. Maharashtra State Board, Standard 10 Physics. " +
          "Today, we will study and verify Ohm's Law: potential difference V equals electric current I multiplied by resistance R.";
        const welcomeCaption = "🔷 JARVIS AI: Welcome to Physics VR Simulation! Verifying Ohm's Law (V = I × R).";
        if (this.narration) {
          this.narration.init();
          this.narration.speak(welcomeVoice, welcomeCaption, { rate: 0.92 });
        }
        break;
      }

      case ORIENTATION_PHASES.OBJECTIVES: {
        this.coreGroup.visible = true;
        this.cardsGroup.visible = true;
        this._renderCard(ORIENTATION_PHASES.OBJECTIVES);
        this.holoCircuit.hide();
        this.startButton.setVisible(false);
        if (this.hydraulicGroup) this.hydraulicGroup.visible = false;

        this.backBtn.visible = true;
        this._updateBtn(this.nextBtn, '⏩ NEXT: 3D SCHEMATIC', 'orient_next', 0x0284c7);

        const objVoice =
          "In this practical, you will assemble the complete circuit using 7 wires. " +
          "Then, you will insert the plug key, control the current with the rheostat, and observe the direct linear relationship between voltage and electric current.";
        const objCaption = "📋 Learning Objectives: 1. Ohm's Law (V ∝ I) → 2. Circuit Assembly (7 Wires) → 3. Rheostat Readings → 4. V-I Graph.";
        if (this.narration) {
          this.narration.speak(objVoice, objCaption, { rate: 0.92 });
        }
        break;
      }

      case ORIENTATION_PHASES.BLUEPRINT:
      case ORIENTATION_PHASES.READY: {
        this.coreGroup.visible = true;
        this.cardsGroup.visible = true;
        this._renderCard(ORIENTATION_PHASES.BLUEPRINT);
        this.holoCircuit.show();
        this.startButton.setVisible(true);
        if (this.hydraulicGroup) this.hydraulicGroup.visible = false;

        this.backBtn.visible = true;
        this._updateBtn(this.nextBtn, '⚡ START PRACTICAL', 'orient_start', 0x10b981);

        const blueVoice =
          "This is your 3D holographic circuit blueprint. " +
          "Notice carefully: the ammeter is connected in series to measure total current, and the voltmeter is connected in parallel across the specimen resistor. " +
          "Press Start Practical to begin wiring.";
        const blueCaption = "⚡ Holographic Blueprint: Ammeter in SERIES with circuit; Voltmeter in PARALLEL across 5-ohm resistor.";
        if (this.narration) {
          this.narration.speak(blueVoice, blueCaption, { rate: 0.92 });
        }
        break;
      }

      case ORIENTATION_PHASES.COMPLETED: {
        this.holoCircuit.hide();
        this.cardsGroup.visible = false;
        this.coreGroup.visible = false;
        this.controlsGroup.visible = false;
        this.startButton.setVisible(false);
        if (this.hydraulicGroup) this.hydraulicGroup.visible = false;
        break;
      }
    }
  }

  handleStartPractical() {
    if (this.currentPhase === ORIENTATION_PHASES.COMPLETED) return;
    this.setPhase(ORIENTATION_PHASES.COMPLETED);

    if (this.narration) {
      this.narration.playSwitchClick();
      this.narration.speak(
        "Practical mode activated. Follow the glowing guidance beacons to connect Wire 1: from battery positive to the plug key switch.",
        "⚡ Practical Started! Connect Wire 1: Battery (+) to Plug Key switch."
      );
    }

    if (this.onFeedback) {
      this.onFeedback({
        type: 'success',
        message: '⚡ Practical Mode Active! Follow guided terminal indicators.'
      });
    }

    if (this.guidedMode) {
      this.guidedMode.setEnabled(true);
      this.guidedMode.start();
    }

    if (typeof this.onStartPractical === 'function') {
      this.onStartPractical();
    }
  }

  skipOrientation() {
    this.handleStartPractical();
  }

  nextPhase() {
    if (this.currentPhase === ORIENTATION_PHASES.WELCOME) {
      this.setPhase(ORIENTATION_PHASES.OBJECTIVES);
    } else if (this.currentPhase === ORIENTATION_PHASES.OBJECTIVES) {
      this.setPhase(ORIENTATION_PHASES.BLUEPRINT);
    } else {
      this.handleStartPractical();
    }
  }

  previousPhase() {
    if (this.currentPhase === ORIENTATION_PHASES.BLUEPRINT || this.currentPhase === ORIENTATION_PHASES.READY) {
      this.setPhase(ORIENTATION_PHASES.OBJECTIVES);
    } else if (this.currentPhase === ORIENTATION_PHASES.OBJECTIVES) {
      this.setPhase(ORIENTATION_PHASES.WELCOME);
    }
  }

  getClickableObjects() {
    if (!this.group.visible) return [];
    const list = [...this.clickables];
    if (this.startButton) {
      list.push(...this.startButton.getClickableObjects());
    }
    return list;
  }

  handleClick(object) {
    if (!object) return;

    if (object.userData && object.userData.isVRStartButton) {
      this.startButton.press();
      return;
    }

    const buttonId =
      (object.userData && object.userData.buttonId) ||
      (object.parent && object.parent.userData && object.parent.userData.buttonId);

    if (buttonId) {
      if (this.narration) this.narration.playButtonBeep();

      if (buttonId === 'orient_valve') {
        this.toggleHydraulicValve();
      } else if (buttonId === 'orient_next') {
        this.nextPhase();
      } else if (buttonId === 'orient_back') {
        this.previousPhase();
      } else if (buttonId === 'orient_start') {
        this.handleStartPractical();
      } else if (buttonId === 'orient_skip') {
        this.skipOrientation();
      }
    }
  }

  update(delta, time) {
    if (!this.group.visible) return;

    this.phaseTime += delta;

    // Animate AI Core Orb
    if (this.coreGroup && this.coreGroup.visible) {
      if (this.ring1) this.ring1.rotation.y += delta * 1.2;
      if (this.ring2) this.ring2.rotation.z -= delta * 1.5;
      if (this.coreLattice) {
        this.coreLattice.rotation.x += delta * 0.5;
        this.coreLattice.rotation.y += delta * 0.8;
      }
      if (this.coreSphere) {
        const pulse = 1.0 + Math.sin(time * 6.0) * 0.08;
        this.coreSphere.scale.setScalar(pulse);
      }
      this.coreGroup.position.y = 1.84 + Math.sin(time * 2.5) * 0.015;
    }

    // Animate holographic circuit
    if (this.holoCircuit) {
      this.holoCircuit.update(delta, time);
    }

    // Animate physical start button
    if (this.startButton) {
      this.startButton.update(delta, time);
    }

    // Floating bob for cards & controls
    if (this.cardsGroup && this.cardsGroup.visible) {
      this.cardsGroup.position.y = 1.56 + Math.sin(time * 2.0) * 0.008;
    }
    if (this.controlsGroup && this.controlsGroup.visible) {
      this.controlsGroup.position.y = 1.28 + Math.sin(time * 2.0) * 0.008;
    }

    // Animate 3D Hydraulic Analogy on tabletop
    if (this.hydraulicGroup && this.hydraulicGroup.visible) {
      const speed = this.particleSpeeds[this.valveState || 0] || 0.25;
      if (this.pumpRotor) {
        this.pumpRotor.rotation.y += delta * (speed * 18);
      }
      if (this.waterParticles && this.pipeCurve) {
        for (const p of this.waterParticles) {
          p.u = (p.u + delta * speed * 0.45) % 1.0;
          const pos = this.pipeCurve.getPointAt(p.u);
          p.mesh.position.copy(pos);
        }
      }
    }
  }

  dispose() {
    if (this.holoCircuit) this.holoCircuit.dispose();
    if (this.startButton) this.startButton.dispose();
    if (this.group.parent) this.group.parent.remove(this.group);
  }
}
