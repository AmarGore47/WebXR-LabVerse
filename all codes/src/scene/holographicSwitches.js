/**
 * holographicSwitches.js
 * 3D Interactive Tabletop Sci-Fi Consoles:
 * 1. ⚛️ "X-Ray Microscopic Electron Flow" Switch
 * 2. 🌌 "Dark Lab / Tony Stark Sci-Fi" Switch
 *
 * Placed physically on the workbench so students can click them via mouse
 * or touch/pinch them directly with WebXR hands in VR!
 */

import * as THREE from 'three';

export class HolographicSwitches {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onToggleXray = options.onToggleXray || (() => {});
    this.onToggleTheme = options.onToggleTheme || (() => {});

    this.group = new THREE.Group();
    this.group.name = 'TabletopHolographicSwitches';

    this.clickables = [];
    this.xrayState = false;
    this.darkState = true; // default scifi

    // References for animations
    this.animatedRings = [];
    this.xrayCore = null;
    this.darkCore = null;
    this.xrayBadgeMesh = null;
    this.darkBadgeMesh = null;

    this.createConsoles();
    this.scene.add(this.group);
  }

  createConsoles() {
    // Mount pedestal on table front-left edge
    // Tabletop is at Y ~ 0.80 - 0.93 depending on models
    const baseY = 0.825;
    const originX = -0.72;
    const originZ = 0.42;

    // ── 1. Sci-Fi Pedestal Base Dock ──────────────────────────────────────
    const dockGeo = new THREE.BoxGeometry(0.38, 0.024, 0.18);
    const dockMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.85,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25
    });
    const dock = new THREE.Mesh(dockGeo, dockMat);
    dock.position.set(originX, baseY, originZ);
    dock.receiveShadow = true;
    this.group.add(dock);

    // Neon edge trim for the dock
    const trimGeo = new THREE.BoxGeometry(0.386, 0.006, 0.186);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(originX, baseY + 0.012, originZ);
    this.group.add(trim);

    // ── 2. X-RAY CONSOLE (Left side of dock) ──────────────────────────────
    const xrayX = originX - 0.095;
    const xrayGroup = this.createConsoleUnit({
      name: 'xray',
      posX: xrayX,
      posY: baseY + 0.02,
      posZ: originZ,
      themeColor: 0x00ffff,
      altColor: 0xfbbf24,
      title: '⚛️ X-RAY FLOW',
      subtitle: 'INSIDE WIRES'
    });
    this.group.add(xrayGroup);

    // ── 3. DARK LAB CONSOLE (Right side of dock) ──────────────────────────
    const darkX = originX + 0.095;
    const darkGroup = this.createConsoleUnit({
      name: 'darklab',
      posX: darkX,
      posY: baseY + 0.02,
      posZ: originZ,
      themeColor: 0x8b5cf6,
      altColor: 0x06b6d4,
      title: '🌌 DARK LAB',
      subtitle: 'TONY STARK HUD'
    });
    this.group.add(darkGroup);
  }

  createConsoleUnit(cfg) {
    const unit = new THREE.Group();
    unit.position.set(cfg.posX, cfg.posY, cfg.posZ);

    // Beveled cylindrical console stand
    const standGeo = new THREE.CylinderGeometry(0.045, 0.052, 0.03, 24);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25,
      emissive: cfg.themeColor,
      emissiveIntensity: 0.35
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 0.015;
    unit.add(stand);

    // Holographic glowing interactive lens / button pad
    const lensGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.012, 24);
    const lensMat = new THREE.MeshStandardMaterial({
      color: cfg.themeColor,
      emissive: cfg.themeColor,
      emissiveIntensity: 1.8,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.y = 0.032;
    lens.userData = {
      isHoloSwitch: true,
      switchType: cfg.name,
      lensMat,
      standMat,
      cfg,
      onPress: () => this.trigger(cfg.name)
    };
    unit.add(lens);
    this.clickables.push(lens);

    // Floating Holographic Core / Rotating Gyro Ring
    const ringGeo = new THREE.TorusGeometry(0.036, 0.0028, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: cfg.altColor,
      transparent: true,
      opacity: 0.9
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.065;
    ring.rotation.x = Math.PI / 3;
    unit.add(ring);
    this.animatedRings.push({ mesh: ring, speed: cfg.name === 'xray' ? 1.8 : -1.4 });

    // Inner floating atom/energy core
    const coreGeo = new THREE.OctahedronGeometry(0.012, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: cfg.themeColor,
      wireframe: true
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.065;
    unit.add(core);

    if (cfg.name === 'xray') {
      this.xrayCore = core;
      this.xrayLensMat = lensMat;
    } else {
      this.darkCore = core;
      this.darkLensMat = lensMat;
    }

    // Floating 3D Holographic Badge / Label
    const badge = this.createConsoleBadge(cfg.title, cfg.subtitle, cfg.themeColor);
    badge.position.set(0, 0.125, 0);
    unit.add(badge);

    if (cfg.name === 'xray') {
      this.xrayBadgeMesh = badge;
    } else {
      this.darkBadgeMesh = badge;
    }

    // Generous touch hit sphere for finger proximity and raycast
    const hitGeo = new THREE.SphereGeometry(0.075, 12, 12);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitSphere = new THREE.Mesh(hitGeo, hitMat);
    hitSphere.position.y = 0.06;
    hitSphere.userData = {
      isHoloSwitch: true,
      switchType: cfg.name,
      lensMesh: lens,
      onPress: () => this.trigger(cfg.name)
    };
    unit.add(hitSphere);
    this.clickables.push(hitSphere);

    return unit;
  }

  createConsoleBadge(title, subtitle, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');

    this.renderBadgeCanvas(ctx, canvas.width, canvas.height, title, subtitle, colorHex, false);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const geo = new THREE.PlaneGeometry(0.16, 0.06);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.y = 0;
    mesh.rotation.x = -0.32; // Angled comfortably towards standing/sitting user
    mesh.userData = { canvas, ctx, texture, title, subtitle, colorHex };
    return mesh;
  }

  renderBadgeCanvas(ctx, w, h, title, subtitle, colorHex, isActive) {
    ctx.clearRect(0, 0, w, h);

    const hexStr = typeof colorHex === 'string' ? colorHex : '#' + colorHex.toString(16).padStart(6, '0');

    // Holographic glass backing
    ctx.fillStyle = isActive ? 'rgba(8, 28, 48, 0.92)' : 'rgba(3, 10, 22, 0.82)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(6, 6, w - 12, h - 12, 18) : ctx.rect(6, 6, w - 12, h - 12);
    ctx.fill();

    // Border glow
    ctx.strokeStyle = isActive ? hexStr : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = isActive ? 5 : 2;
    ctx.stroke();

    // Title
    ctx.font = 'bold 32px "JetBrains Mono", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isActive ? '#ffffff' : '#cbd5e1';
    ctx.shadowColor = hexStr;
    ctx.shadowBlur = isActive ? 16 : 4;
    ctx.fillText(title, w / 2, 54);

    // Status pill
    const statusText = isActive ? '● ACTIVE' : '○ STANDBY';
    ctx.font = 'bold 22px "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = isActive ? (hexStr) : '#64748b';
    ctx.shadowBlur = isActive ? 12 : 0;
    ctx.fillText(`${subtitle} · ${statusText}`, w / 2, 100);
  }

  updateBadge(badgeMesh, isActive) {
    if (!badgeMesh || !badgeMesh.userData) return;
    const { canvas, ctx, texture, title, subtitle, colorHex } = badgeMesh.userData;
    this.renderBadgeCanvas(ctx, canvas.width, canvas.height, title, subtitle, colorHex, isActive);
    texture.needsUpdate = true;
  }

  getClickableObjects() {
    return this.clickables;
  }

  setStates(xrayActive, darkActive) {
    this.xrayState = !!xrayActive;
    this.darkState = !!darkActive;

    if (this.xrayLensMat) {
      this.xrayLensMat.emissiveIntensity = this.xrayState ? 3.5 : 1.2;
      this.xrayLensMat.color.setHex(this.xrayState ? 0x00ffff : 0x0369a1);
    }
    if (this.darkLensMat) {
      this.darkLensMat.emissiveIntensity = this.darkState ? 3.5 : 1.2;
      this.darkLensMat.color.setHex(this.darkState ? 0xa855f7 : 0x475569);
    }

    if (this.xrayBadgeMesh) {
      this.updateBadge(this.xrayBadgeMesh, this.xrayState);
    }
    if (this.darkBadgeMesh) {
      this.updateBadge(this.darkBadgeMesh, this.darkState);
    }
  }

  trigger(switchType) {
    if (switchType === 'xray') {
      const next = !this.xrayState;
      this.onToggleXray(next);
      this.setStates(next, this.darkState);
      return next;
    } else if (switchType === 'darklab') {
      const next = !this.darkState;
      this.onToggleTheme(next);
      this.setStates(this.xrayState, next);
      return next;
    }
  }

  update(time, delta = 0.016) {
    // 1. Rotate gyro rings
    for (const item of this.animatedRings) {
      item.mesh.rotation.z += item.speed * delta;
      item.mesh.rotation.y += (item.speed * 0.7) * delta;
    }

    // 2. Rotate core crystals and float gently
    if (this.xrayCore) {
      this.xrayCore.rotation.x = time * 2.2;
      this.xrayCore.rotation.y = time * 1.8;
      this.xrayCore.position.y = 0.065 + Math.sin(time * 3.5) * 0.005;
    }
    if (this.darkCore) {
      this.darkCore.rotation.y = time * 2.0;
      this.darkCore.rotation.z = time * 1.5;
      this.darkCore.position.y = 0.065 + Math.sin(time * 3.2 + 1.2) * 0.005;
    }

    // 3. Floating badges subtle levitation
    if (this.xrayBadgeMesh) {
      this.xrayBadgeMesh.position.y = 0.125 + Math.sin(time * 2.8) * 0.003;
    }
    if (this.darkBadgeMesh) {
      this.darkBadgeMesh.position.y = 0.125 + Math.sin(time * 2.8 + 1.5) * 0.003;
    }
  }
}
