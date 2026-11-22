/**
 * vrStartButton3D.js
 * Physical 3D Workbench Push-Button for VR Orientation & Practical Start.
 *
 * Placed physically on the lab workbench in front of the student:
 * - Cylindrical sci-fi pedestal with neon status ring
 * - Depressible glowing button cap with high-resolution canvas texture
 * - Audio click feedback & spark particle trigger
 * - Hand tracking pinch & desktop mouse raycast compatible
 */

import * as THREE from 'three';

export class VRStartButton3D {
  constructor({ scene, position = new THREE.Vector3(0, 0.932, 0.44), onPress = () => {} } = {}) {
    this.scene = scene;
    this.position = position;
    this.onPress = onPress;

    this.group = new THREE.Group();
    this.group.name = 'VRStartButton3D';
    this.group.position.copy(this.position);

    this.isPressed = false;
    this.isHovered = false;
    this.targetCapY = 0.024;
    this.currentCapY = 0.024;
    this.visible = true;

    this._buildButton();

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  _buildButton() {
    // 1. Heavy Metal Pedestal Base
    const baseGeo = new THREE.CylinderGeometry(0.088, 0.098, 0.022, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25
    });
    this.baseMesh = new THREE.Mesh(baseGeo, baseMat);
    this.baseMesh.position.y = 0.011;
    this.group.add(this.baseMesh);

    // 2. Glowing Neon Collar Ring
    const collarGeo = new THREE.TorusGeometry(0.078, 0.005, 16, 32);
    collarGeo.rotateX(Math.PI / 2);
    this.collarMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.85
    });
    this.collarMesh = new THREE.Mesh(collarGeo, this.collarMat);
    this.collarMesh.position.y = 0.022;
    this.group.add(this.collarMesh);

    // 3. Depressible Button Cap
    const capGeo = new THREE.CylinderGeometry(0.072, 0.074, 0.016, 32);
    const canvasTexture = this._createButtonTexture();

    const capSideMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.6,
      roughness: 0.3
    });
    const capTopMat = new THREE.MeshBasicMaterial({
      map: canvasTexture
    });

    // Multi-material for top face vs cylinder sides
    this.capMesh = new THREE.Mesh(capGeo, [capSideMat, capTopMat, capSideMat]);
    this.capMesh.position.y = this.currentCapY;
    this.capMesh.userData = {
      isVRStartButton: true,
      buttonId: 'start_practical_3d',
      onPress: () => this.press()
    };
    this.group.add(this.capMesh);

    // Hitbox for raycasting & near pinch
    const hitGeo = new THREE.BoxGeometry(0.18, 0.08, 0.18);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitBox = new THREE.Mesh(hitGeo, hitMat);
    this.hitBox.position.y = 0.03;
    this.hitBox.userData = {
      isVRStartButton: true,
      buttonId: 'start_practical_3d',
      onPress: () => this.press()
    };
    this.group.add(this.hitBox);

    // 4. Subtle Floating Prompt Sprite above button
    this._buildPromptBadge();
  }

  _createButtonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Circular dial face background
    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 256);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.7, '#0369a1');
    grad.addColorStop(1, '#082f49');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Outer neon ring
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.stroke();

    // Center Lightning Bolt Icon
    ctx.font = 'bold 110px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', 256, 200);

    // Label: START
    ctx.font = 'bold 54px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('START', 256, 290);

    // Sublabel: PRACTICAL
    ctx.font = 'bold 36px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('PRACTICAL', 256, 345);

    // Small instructional footer
    ctx.font = '600 24px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText('PINCH OR CLICK', 256, 400);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  _buildPromptBadge() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 112, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ READY TO CONNECT', 256, 52);

    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('Pinch to begin Guided Mode', 256, 92);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.92
    });
    this.promptSprite = new THREE.Sprite(spriteMat);
    this.promptSprite.position.set(0, 0.14, 0);
    this.promptSprite.scale.set(0.24, 0.06, 1);
    this.group.add(this.promptSprite);
  }

  getClickableObjects() {
    if (!this.group.visible) return [];
    return [this.hitBox, this.capMesh];
  }

  press() {
    if (this.isPressed) return;
    this.isPressed = true;
    this.targetCapY = 0.012; // Depressed position

    if (this.collarMat) {
      this.collarMat.color.setHex(0x10b981); // Bright green confirmation
    }

    // Trigger callback
    if (typeof this.onPress === 'function') {
      this.onPress();
    }

    // Spring back up after 300ms
    setTimeout(() => {
      this.targetCapY = 0.024;
      this.isPressed = false;
      if (this.collarMat) {
        this.collarMat.color.setHex(0x00f3ff);
      }
    }, 320);
  }

  setHover(hovered) {
    this.isHovered = hovered;
    if (this.collarMat) {
      this.collarMat.opacity = hovered ? 1.0 : 0.85;
      this.collarMat.color.setHex(hovered ? 0xfbbf24 : 0x00f3ff);
    }
    if (this.promptSprite) {
      this.promptSprite.scale.set(hovered ? 0.28 : 0.24, hovered ? 0.07 : 0.06, 1);
    }
  }

  setVisible(visible) {
    this.visible = visible;
    this.group.visible = visible;
  }

  update(delta, time) {
    if (!this.group.visible) return;

    // Smooth mechanical push animation
    this.currentCapY += (this.targetCapY - this.currentCapY) * Math.min(delta * 18.0, 1.0);
    this.capMesh.position.y = this.currentCapY;

    // Gentle pulse of collar glow
    if (!this.isHovered && this.collarMat) {
      this.collarMat.opacity = 0.70 + Math.sin(time * 4.0) * 0.25;
    }

    // Floating bob for prompt sprite
    if (this.promptSprite) {
      this.promptSprite.position.y = 0.14 + Math.sin(time * 3.0) * 0.008;
    }
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
