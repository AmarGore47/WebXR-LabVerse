/**
 * assistantRadialMenu.js
 * 3D Holographic Radial Menu for LabVerse AI Lab Assistant.
 *
 * Spawns a circular holographic menu orbiting the existing 3D Lab Assistant avatar.
 * Exactly 6 primary educational options:
 * 1. Ask Anything (💬)
 * 2. Hints (💡)
 * 3. Next Step (👣)
 * 4. AI Video (🎥)
 * 5. Examples (📐)
 * 6. Questions & Answers (❓)
 *
 * Visual styling:
 * - Dark navy glass discs with subtle cyan-blue borders and glow.
 * - Smooth opening/closing scale and opacity transitions.
 * - Compatible with desktop raycast clicks and WebXR controller raycast / hand pinch.
 */

import * as THREE from 'three';

export const RADIAL_OPTIONS = [
  { id: 'radial_ask', label: 'Ask Anything', sublabel: 'Gemini AI Chat', icon: '💬', angleDeg: 90 },
  { id: 'radial_hints', label: 'Hints', sublabel: 'Progressive Clues', icon: '💡', angleDeg: 30 },
  { id: 'radial_next_step', label: 'Next Step', sublabel: 'Practical Guide', icon: '👣', angleDeg: 330 },
  { id: 'radial_video', label: 'AI Video', sublabel: 'Demonstrations', icon: '🎥', angleDeg: 270 },
  { id: 'radial_examples', label: 'Examples', sublabel: 'Calculations & Laws', icon: '📐', angleDeg: 210 },
  { id: 'radial_qna', label: 'Q & A', sublabel: 'Interactive MCQs', icon: '❓', angleDeg: 150 }
];

export class AssistantRadialMenu {
  constructor(options = {}) {
    this.assistant = options.assistant || null;
    this.scene = options.scene || null;
    this.onSelectOption = options.onSelectOption || (() => { });
    this.onClose = options.onClose || (() => { });

    this.group = new THREE.Group();
    this.group.name = 'AssistantRadialMenu';
    this.group.visible = false;

    // Radius from center of assistant to buttons
    this.radialRadius = 0.65; // 65 cm radius
    this.centerHeight = 1.25; // Eye/chest level

    // Animation state
    this.isOpen = false;
    this.animProgress = 0; // 0 to 1
    this.isAnimating = false;
    this.hoveredOptionId = null;

    // Button objects
    this.buttonMeshes = [];
    this.clickableObjects = [];

    this._buildCenterBackdrop();
    this._buildRadialNodes();
    this._buildCenterCloseButton();

    if (this.assistant && this.assistant.group) {
      this.assistant.group.add(this.group);
    } else if (this.scene) {
      this.scene.add(this.group);
    }
  }

  _buildCenterBackdrop() {
    // Holographic dashed circular orbit ring
    const ringGeo = new THREE.RingGeometry(this.radialRadius - 0.005, this.radialRadius + 0.005, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.orbitRing = new THREE.Mesh(ringGeo, ringMat);
    this.orbitRing.position.set(0, this.centerHeight, 0);
    this.group.add(this.orbitRing);

    // Inner subtle glow disc
    const discGeo = new THREE.CircleGeometry(this.radialRadius, 48);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide
    });
    this.glowDisc = new THREE.Mesh(discGeo, discMat);
    this.glowDisc.position.set(0, this.centerHeight, -0.002);
    this.group.add(this.glowDisc);
  }

  _buildRadialNodes() {
    RADIAL_OPTIONS.forEach((opt) => {
      const rad = (opt.angleDeg * Math.PI) / 180;
      const x = Math.cos(rad) * this.radialRadius;
      const y = this.centerHeight + Math.sin(rad) * this.radialRadius;

      // Canvas for node texture
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;

      // Draw initial state
      this._renderNodeCanvas(ctx, canvas.width, canvas.height, opt, false);
      texture.needsUpdate = true;

      // Holographic button disc
      const geo = new THREE.PlaneGeometry(0.24, 0.24);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, 0.015);

      // Hitbox collider (slightly larger for comfortable VR pinch & desktop clicks)
      const hitGeo = new THREE.BoxGeometry(0.25, 0.25, 0.05);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: true });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.set(x, y, 0.02);

      hitMesh.userData = {
        type: 'radial_button',
        optionId: opt.id,
        option: opt,
        visualMesh: mesh,
        canvas,
        ctx,
        texture,
        onPress: () => this.selectOption(opt.id)
      };

      this.group.add(mesh);
      this.group.add(hitMesh);
      this.buttonMeshes.push({ mesh, opt, canvas, ctx, texture, basePos: new THREE.Vector3(x, y, 0.015) });
      this.clickableObjects.push(hitMesh);
    });
  }

  _buildCenterCloseButton() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✖', 64, 66);
    texture.needsUpdate = true;

    const geo = new THREE.PlaneGeometry(0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, this.centerHeight, 0.02);

    const hitGeo = new THREE.BoxGeometry(0.14, 0.14, 0.05);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(0, this.centerHeight, 0.025);
    hitMesh.userData = {
      type: 'radial_button',
      optionId: 'radial_close',
      onPress: () => this.close()
    };

    this.group.add(mesh);
    this.group.add(hitMesh);
    this.clickableObjects.push(hitMesh);
  }

  _renderNodeCanvas(ctx, w, h, opt, isHovered) {
    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
    if (isHovered) {
      bgGrad.addColorStop(0, '#0284c7');
      bgGrad.addColorStop(1, '#0c2340');
    } else {
      bgGrad.addColorStop(0, '#0a1a33');
      bgGrad.addColorStop(1, '#050c18');
    }

    // Outer circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 8, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Border
    ctx.lineWidth = isHovered ? 8 : 4;
    ctx.strokeStyle = isHovered ? '#38bdf8' : '#0284c7';
    ctx.stroke();

    // Inner subtle ring
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 18, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.stroke();

    // Icon
    ctx.font = '54px "Segoe UI Emoji", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opt.icon, w / 2, h / 2 - 38);

    // Primary Label
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(opt.label, w / 2, h / 2 + 22);

    // Sublabel
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = isHovered ? '#bae6fd' : '#94a3b8';
    ctx.fillText(opt.sublabel, w / 2, h / 2 + 54);
  }

  setHoveredOption(optionId) {
    if (this.hoveredOptionId === optionId) return;
    this.hoveredOptionId = optionId;

    this.buttonMeshes.forEach((item) => {
      const isHov = item.opt.id === optionId;
      this._renderNodeCanvas(item.ctx, item.canvas.width, item.canvas.height, item.opt, isHov);
      item.texture.needsUpdate = true;
      item.mesh.scale.setScalar(isHov ? 1.12 : 1.0);
    });
  }

  open() {
    this.isOpen = true;
    this.group.visible = true;
    this.animProgress = 0;
    this.isAnimating = true;
    this.group.scale.set(0.01, 0.01, 0.01);
  }

  minimize() {
    if (!this.isOpen && !this.group.visible) return;
    this.isOpen = false;
    this.isAnimating = true;
    // Visually minimize without triggering onClose callback
  }

  close() {
    if (!this.isOpen && !this.group.visible) return;
    this.isOpen = false;
    this.isAnimating = true;
    if (typeof this.onClose === 'function') {
      this.onClose();
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  selectOption(optionId) {
    if (optionId === 'radial_close') {
      this.close();
      return;
    }

    // Play subtle audio if available
    if (this.assistant && this.assistant.sound && typeof this.assistant.sound.playBeep === 'function') {
      this.assistant.sound.playBeep();
    }

    if (typeof this.onSelectOption === 'function') {
      this.onSelectOption(optionId);
    }

    // Smoothly minimize radial menu while subpanel opens (do not trigger assistant close)
    this.minimize();
  }

  update(delta) {
    if (!this.group.visible) return;

    // Smooth opening / closing transition
    if (this.isAnimating) {
      const speed = delta * 5.0;
      if (this.isOpen) {
        this.animProgress = Math.min(1.0, this.animProgress + speed);
        // Smooth elastic / cubic ease out
        const t = this.animProgress;
        const scale = 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
        this.group.scale.setScalar(Math.max(0.01, scale));

        if (this.animProgress >= 1.0) {
          this.isAnimating = false;
          this.group.scale.setScalar(1.0);
        }
      } else {
        this.animProgress = Math.max(0, this.animProgress - speed * 1.5);
        this.group.scale.setScalar(Math.max(0.01, this.animProgress));

        if (this.animProgress <= 0) {
          this.isAnimating = false;
          this.group.visible = false;
        }
      }
    }

    // Gentle holographic floating rotation for orbit ring
    if (this.orbitRing) {
      this.orbitRing.rotation.z += delta * 0.12;
    }
  }

  getClickableObjects() {
    return this.group.visible ? this.clickableObjects : [];
  }
}
