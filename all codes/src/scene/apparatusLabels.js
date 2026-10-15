/**
 * apparatusLabels.js
 * Camera-facing compact 3D billboard labels for each identified physics apparatus:
 * - Battery / DC Power Supply
 * - Key / Switch
 * - Ammeter
 * - Rheostat
 * - Resistor
 * - Voltmeter
 */

import * as THREE from 'three';

export class ApparatusLabels {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'ApparatusLabelsGroup';
    this.visible = true;
    this.sprites = [];

    // Compact configurable label list with default world positions
    this.labelConfigs = [
      {
        id: 'battery',
        meshName: 'PowerSupply_body',
        title: 'Battery',
        sub: 'DC Supply (6V)',
        pos: [-0.52, 0.96, 0.08],
        accentColor: '#38bdf8'
      },
      {
        id: 'switch',
        meshName: 'PlugKey_base',
        title: 'Key / Switch',
        sub: 'Plug Key',
        pos: [-0.22, 0.94, -0.03],
        accentColor: '#fbbf24'
      },
      {
        id: 'ammeter',
        meshName: 'ammeter_body',
        title: 'Ammeter',
        sub: '0–1 A Range',
        pos: [0.34, 0.96, 0.01],
        accentColor: '#38bdf8'
      },
      {
        id: 'resistor',
        meshName: 'ResistorBoard',
        title: 'Resistor',
        sub: 'Standard 5 Ω Coil',
        pos: [0.10, 0.93, 0.16],
        accentColor: '#fbbf24'
      },
      {
        id: 'rheostat',
        meshName: 'Rheostat_rail',
        title: 'Rheostat',
        sub: 'Variable Resistor',
        pos: [0.05, 0.98, -0.05],
        accentColor: '#f59e0b'
      },
      {
        id: 'voltmeter',
        meshName: 'voltmeter_body',
        title: 'Voltmeter',
        sub: '0–5 V Range',
        pos: [0.48, 0.96, 0.20],
        accentColor: '#38bdf8'
      }
    ];

    this.createLabels();
    this.scene.add(this.group);
  }

  createLabels() {
    this.sprites = [];
    this.labelConfigs.forEach((cfg) => {
      const sprite = this.createBadgeSprite(cfg.title, cfg.sub, cfg.accentColor);
      sprite.position.set(...cfg.pos);
      sprite.userData = { config: cfg };
      this.group.add(sprite);
      this.sprites.push(sprite);
    });
  }

  /**
   * Snaps label positions directly above the actual 3D apparatus mesh inside the loaded model.
   */
  syncWithModel(model) {
    if (!model) return;
    const tempPos = new THREE.Vector3();
    this.sprites.forEach((sprite) => {
      const cfg = sprite.userData.config;
      if (!cfg || !cfg.meshName) return;
      const targetObj = model.getObjectByName(cfg.meshName);
      if (targetObj) {
        targetObj.getWorldPosition(tempPos);
        // Elevate label 10-12 cm above the top of the apparatus
        sprite.position.set(tempPos.x, tempPos.y + 0.11, tempPos.z);
      }
    });
  }

  /**
   * Generates a compact, high-resolution canvas texture for the 3D billboard sprite.
   * Dimensions are intentionally compact (24cm x 6cm in 3D world space)
   * so labels never clutter or obstruct instruments.
   */
  createBadgeSprite(title, sub, accentColor = '#38bdf8') {
    if (typeof document === 'undefined') {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
      sprite.scale.set(0.24, 0.06, 1.0);
      return sprite;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Translucent dark glassmorphism container
    ctx.fillStyle = 'rgba(7, 21, 38, 0.88)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(6, 6, 372, 84, 18);
    } else {
      ctx.rect(6, 6, 372, 84);
    }
    ctx.fill();
    ctx.stroke();

    // Colored accent status indicator dot
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(30, 48, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Subtle glow ring around dot
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(30, 48, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Main apparatus title (crisp, modern)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, 50, 44);

    // Subtitle / spec
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 17px Inter, system-ui, sans-serif';
    ctx.fillText(sub, 50, 72);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(material);
    // Compact scale: 0.24m wide x 0.06m high (was 0.55m x 0.14m - more than 50% smaller!)
    sprite.scale.set(0.24, 0.06, 1.0);
    return sprite;
  }

  /**
   * Toggle visibility of labels.
   */
  toggle() {
    this.visible = !this.visible;
    this.group.visible = this.visible;
    return this.visible;
  }

  setVisible(value) {
    this.visible = Boolean(value);
    this.group.visible = this.visible;
  }
}
