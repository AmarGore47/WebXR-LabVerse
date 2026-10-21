/**
 * holographicMetersHUD.js
 * Tony Stark / Jarvis style 3D Holographic Floating Digital Readouts
 * hovering directly above the physical Voltmeter and Ammeter apparatus.
 *
 * Features:
 * - Floating glowing digital numbers (e.g. "1.90 V", "0.380 A")
 * - Dynamic circular holographic arc progress bar
 * - Live electron drift velocity & current status
 * - Vertical holographic projector beam anchoring down to the meter dials
 * - Subtle levitation and breathing neon glow in Dark Lab mode
 */

import * as THREE from 'three';

export class HolographicMetersHUD {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'HolographicMetersHUDGroup';

    this.visible = true;
    this.darkTheme = true;

    // Default 3D positions (elevated ~15cm above meters)
    this.ammeterWorldPos = new THREE.Vector3(0.34, 1.12, 0.01);
    this.voltmeterWorldPos = new THREE.Vector3(0.48, 1.12, 0.20);

    // Current displayed values (for smooth lerping)
    this.dispVoltage = 0.0;
    this.dispCurrent = 0.0;

    this.createMetersHUD();
    this.scene.add(this.group);
  }

  createMetersHUD() {
    // ── 1. AMMETER HOLOGRAPHIC READOUT ──────────────────────────────────
    this.ammeterHUD = this.createMeterCard({
      id: 'ammeter',
      title: 'CURRENT (I)',
      unit: 'A',
      accentColor: '#00f0ff',
      pos: this.ammeterWorldPos,
      maxVal: 1.0
    });
    this.group.add(this.ammeterHUD.group);

    // ── 2. VOLTMETER HOLOGRAPHIC READOUT ────────────────────────────────
    this.voltmeterHUD = this.createMeterCard({
      id: 'voltmeter',
      title: 'POTENTIAL DIFF (V)',
      unit: 'V',
      accentColor: '#fbbf24',
      pos: this.voltmeterWorldPos,
      maxVal: 5.0
    });
    this.group.add(this.voltmeterHUD.group);
  }

  createMeterCard(cfg) {
    const cardGroup = new THREE.Group();
    cardGroup.position.copy(cfg.pos);

    // Vertical holographic emitter beam pointing down to apparatus
    const beamGeo = new THREE.CylinderGeometry(0.003, 0.018, 0.12, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: cfg.accentColor,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = -0.06;
    cardGroup.add(beam);

    // Canvas for floating holographic display
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const planeGeo = new THREE.PlaneGeometry(0.24, 0.12);
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.x = -0.22; // Comfortable tilt towards student
    cardGroup.add(planeMesh);

    return {
      id: cfg.id,
      group: cardGroup,
      beam,
      beamMat,
      planeMesh,
      canvas,
      ctx,
      texture,
      cfg,
      baseY: cfg.pos.y
    };
  }

  /**
   * Sync positions directly with 3D model meshes if available.
   */
  syncWithModel(model) {
    if (!model) return;
    const tempPos = new THREE.Vector3();

    const ammeterObj = model.getObjectByName('ammeter_body');
    if (ammeterObj && this.ammeterHUD) {
      ammeterObj.getWorldPosition(tempPos);
      this.ammeterWorldPos.set(tempPos.x, tempPos.y + 0.13, tempPos.z);
      this.ammeterHUD.group.position.copy(this.ammeterWorldPos);
      this.ammeterHUD.baseY = this.ammeterWorldPos.y;
    }

    const voltmeterObj = model.getObjectByName('voltmeter_body');
    if (voltmeterObj && this.voltmeterHUD) {
      voltmeterObj.getWorldPosition(tempPos);
      this.voltmeterWorldPos.set(tempPos.x, tempPos.y + 0.13, tempPos.z);
      this.voltmeterHUD.group.position.copy(this.voltmeterWorldPos);
      this.voltmeterHUD.baseY = this.voltmeterWorldPos.y;
    }
  }

  setTheme(isDark) {
    this.darkTheme = !!isDark;
    const beamOpacity = this.darkTheme ? 0.45 : 0.2;
    if (this.ammeterHUD) this.ammeterHUD.beamMat.opacity = beamOpacity;
    if (this.voltmeterHUD) this.voltmeterHUD.beamMat.opacity = beamOpacity;
  }

  setVisible(visible) {
    this.visible = !!visible;
    this.group.visible = this.visible;
  }

  /**
   * Render high-resolution holographic graphic onto 2D canvas.
   */
  drawCardCanvas(hud, val, liveStatusText) {
    const { ctx, canvas, cfg } = hud;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const accent = cfg.accentColor;
    const isDark = this.darkTheme;

    // 1. Holographic glowing backdrop panel
    ctx.fillStyle = isDark ? 'rgba(3, 12, 28, 0.88)' : 'rgba(7, 24, 46, 0.80)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(8, 8, w - 16, h - 16, 20) : ctx.rect(8, 8, w - 16, h - 16);
    ctx.fill();

    // 2. Futuristic Tech Corner Brackets
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    const cl = 28; // corner length

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(12, 12 + cl); ctx.lineTo(12, 12); ctx.lineTo(12 + cl, 12);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(w - 12 - cl, 12); ctx.lineTo(w - 12, 12); ctx.lineTo(w - 12, 12 + cl);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(12, h - 12 - cl); ctx.lineTo(12, h - 12); ctx.lineTo(12 + cl, h - 12);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(w - 12 - cl, h - 12); ctx.lineTo(w - 12, h - 12); ctx.lineTo(w - 12, h - 12 - cl);
    ctx.stroke();

    // 3. Header title & small telemetry dot
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px "JetBrains Mono", monospace, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cfg.title, 34, 48);

    // Glowing status dot
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(w - 38, 42, 6, 0, Math.PI * 2);
    ctx.fill();

    // 4. Large Bold Holographic Floating Numbers
    ctx.textAlign = 'left';
    ctx.font = 'bold 74px "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = accent;
    ctx.shadowBlur = isDark ? 24 : 10;

    let displayStr;
    if (cfg.id === 'ammeter') {
      displayStr = val.toFixed(3);
    } else {
      displayStr = val.toFixed(2);
    }
    ctx.fillText(displayStr, 34, 138);

    // Unit suffix (A or V)
    ctx.font = 'bold 38px "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(` ${cfg.unit}`, 34 + ctx.measureText(displayStr).width + 8, 138);
    ctx.shadowBlur = 0; // reset

    // 5. Dynamic Holographic Horizontal Gauge Bar
    const pct = Math.min(1.0, Math.max(0.0, val / cfg.maxVal));
    const barX = 34;
    const barY = 162;
    const barW = w - 68;
    const barH = 12;

    // Track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(barX, barY, barW, barH);

    // Fill
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.shadowBlur = 0;

    // 6. Subtitle status / Drift physics telemetry
    ctx.font = '600 20px "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = pct > 0.01 ? '#38bdf8' : '#64748b';
    ctx.fillText(liveStatusText || 'STATIONARY · 0.00', 34, 212);

    // Range label on right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`RANGE 0–${cfg.maxVal} ${cfg.unit}`, w - 34, 212);

    hud.texture.needsUpdate = true;
  }

  /**
   * Update HUD readings and levitation animations each frame.
   * @param {number} time - elapsed time in seconds
   * @param {number} voltage - live voltage
   * @param {number} current - live current
   * @param {boolean} isXray - whether xray mode is on
   */
  update(time, voltage = 0, current = 0, isXray = false) {
    if (!this.visible) return;

    // Smooth value interpolation
    this.dispVoltage += (voltage - this.dispVoltage) * 0.22;
    this.dispCurrent += (current - this.dispCurrent) * 0.22;

    // Microscopic drift velocity description
    let ammeterStatus;
    if (this.dispCurrent < 0.005) {
      ammeterStatus = '○ NO CURRENT · CIRCUIT OPEN';
    } else if (this.dispCurrent < 0.18) {
      ammeterStatus = isXray ? '⚛️ SLOW MOTION DRIFT (v ≈ 0.2 mm/s)' : '● LOW CURRENT FLOW';
    } else if (this.dispCurrent < 0.42) {
      ammeterStatus = isXray ? '⚛️ ACTIVE DRIFT (v ≈ 1.8 mm/s)' : '● NORMAL CURRENT FLOW';
    } else {
      ammeterStatus = isXray ? '⚡ HIGH CURRENT SPRINT (WARM PULSE)' : '🔥 HIGH CURRENT LOAD';
    }

    let voltmeterStatus;
    if (this.dispVoltage < 0.05) {
      voltmeterStatus = '○ 0.0 V (SENSE OPEN)';
    } else {
      voltmeterStatus = '● PARALLEL DROP (V = I × R)';
    }

    // Gentle hover bobbing
    if (this.ammeterHUD) {
      this.ammeterHUD.group.position.y = this.ammeterHUD.baseY + Math.sin(time * 2.8) * 0.004;
      this.drawCardCanvas(this.ammeterHUD, this.dispCurrent, ammeterStatus);
    }
    if (this.voltmeterHUD) {
      this.voltmeterHUD.group.position.y = this.voltmeterHUD.baseY + Math.sin(time * 2.8 + 1.2) * 0.004;
      this.drawCardCanvas(this.voltmeterHUD, this.dispVoltage, voltmeterStatus);
    }
  }
}
