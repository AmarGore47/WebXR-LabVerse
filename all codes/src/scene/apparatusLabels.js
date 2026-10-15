/**
 * apparatusLabels.js
 * Camera-facing 3D billboard labels for each identified physics apparatus:
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

    // Configurable label list with world positions
    this.labelConfigs = [
      {
        id: 'battery',
        title: 'Battery',
        sub: 'DC Supply (6V)',
        pos: [-0.52, 1.06, 0.08],
        accentColor: '#38bdf8'
      },
      {
        id: 'switch',
        title: 'Key / Switch',
        sub: 'Plug Key',
        pos: [-0.22, 1.02, -0.03],
        accentColor: '#fbbf24'
      },
      {
        id: 'ammeter',
        title: 'Ammeter',
        sub: '0–1 A Range',
        pos: [0.34, 1.05, 0.01],
        accentColor: '#38bdf8'
      },
      {
        id: 'resistor',
        title: 'Resistor',
        sub: 'Standard 5 Ω Coil',
        pos: [0.10, 1.02, 0.16],
        accentColor: '#fbbf24'
      },
      {
        id: 'rheostat',
        title: 'Rheostat',
        sub: 'Variable Resistor',
        pos: [0.05, 1.06, -0.05],
        accentColor: '#f59e0b'
      },
      {
        id: 'voltmeter',
        title: 'Voltmeter',
        sub: '0–5 V Range',
        pos: [0.48, 1.05, 0.20],
        accentColor: '#38bdf8'
      }
    ];

    this.createLabels();
    this.scene.add(this.group);
  }

  createLabels() {
    this.labelConfigs.forEach((cfg) => {
      const sprite = this.createBadgeSprite(cfg.title, cfg.sub, cfg.accentColor);
      sprite.position.set(...cfg.pos);
      sprite.userData = { config: cfg };
      this.group.add(sprite);
    });
  }

  /**
   * Generates a high-resolution canvas texture for the 3D billboard sprite.
   */
  createBadgeSprite(title, sub, accentColor = '#38bdf8') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 130;
    const ctx = canvas.getContext('2d');

    // Translucent dark glassmorphism container
    ctx.fillStyle = 'rgba(7, 21, 38, 0.88)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 110, 22);
    ctx.fill();
    ctx.stroke();

    // Colored accent status indicator dot
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(36, 65, 8, 0, Math.PI * 2);
    ctx.fill();

    // Main apparatus title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, 60, 58);

    // Subtitle / spec
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillText(sub, 60, 96);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.55, 0.14, 1.0);
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
