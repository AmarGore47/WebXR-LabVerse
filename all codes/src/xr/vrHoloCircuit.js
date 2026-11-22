/**
 * vrHoloCircuit.js
 * Tony Stark-style Tabletop 3D Holographic Circuit Blueprint.
 *
 * Renders a glowing 3D wireframe schematic in the air above the workbench:
 * - Holographic projector base on the table with vertical light emitter cone
 * - Series circuit loop (Cyan) showing Battery -> Key -> Ammeter -> Rheostat -> Resistor
 * - Parallel voltmeter branch (Gold/Amber) across the 5 Ohm resistor
 * - Animated flowing electron particles tracing current flow
 * - High-definition floating 3D billboard labels for each apparatus
 */

import * as THREE from 'three';

export class VRHoloCircuit {
  constructor({ scene, apparatusPositions = {} } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'VRHoloCircuit';
    this.group.visible = false;

    // Component coordinates (hovering ~50cm above table surface at y = 1.45, well clear of physical apparatus)
    this.baseH = 1.45;
    const baseH = this.baseH;
    this.positions = {
      battery: new THREE.Vector3(-0.50, baseH, 0.08),
      switch: new THREE.Vector3(-0.22, baseH, -0.03),
      rheostat: new THREE.Vector3(0.05, baseH, -0.05),
      ammeter: new THREE.Vector3(0.34, baseH, 0.01),
      resistor: new THREE.Vector3(0.10, baseH, 0.16),
      voltmeter: new THREE.Vector3(0.48, baseH, 0.20),
      ...apparatusPositions
    };

    this.particles = [];
    this.labels = [];
    this.curves = [];
    this.currentScale = 0;
    this.targetScale = 0;

    this._buildProjectorBase();
    this._buildCircuitPaths();
    this._buildNodeMarkers();
    this._buildFloatingLabels();
    this._buildFlowParticles();

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  _buildProjectorBase() {
    this.baseGroup = new THREE.Group();
    this.baseGroup.position.set(0, 0.932, 0.08);

    // Outer projector emitter ring
    const ringGeo = new THREE.RingGeometry(0.55, 0.60, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    this.baseRing = new THREE.Mesh(ringGeo, ringMat);
    this.baseGroup.add(this.baseRing);

    // Inner concentric ring
    const innerRingGeo = new THREE.RingGeometry(0.28, 0.31, 36);
    innerRingGeo.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    this.baseInnerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    this.baseGroup.add(this.baseInnerRing);

    // Upward holographic cone beam
    const coneGeo = new THREE.ConeGeometry(0.68, 0.32, 32, 1, true);
    coneGeo.translate(0, 0.16, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.beamCone = new THREE.Mesh(coneGeo, coneMat);
    this.baseGroup.add(this.beamCone);

    this.group.add(this.baseGroup);
  }

  _buildCircuitPaths() {
    this.pathsGroup = new THREE.Group();

    // 1. Series Circuit Loop: Battery(+) -> Switch -> Ammeter(+) -> Ammeter(-) -> Rheostat -> Resistor -> Battery(-)
    const seriesPoints = [
      this.positions.battery.clone().add(new THREE.Vector3(0.05, 0, 0)),
      this.positions.switch.clone().add(new THREE.Vector3(-0.04, 0, 0)),
      this.positions.switch.clone().add(new THREE.Vector3(0.04, 0, 0)),
      this.positions.ammeter.clone().add(new THREE.Vector3(-0.04, 0, 0)),
      this.positions.ammeter.clone().add(new THREE.Vector3(0.04, 0, 0)),
      this.positions.rheostat.clone().add(new THREE.Vector3(0.06, 0, 0)),
      this.positions.rheostat.clone().add(new THREE.Vector3(-0.06, 0, 0)),
      this.positions.resistor.clone().add(new THREE.Vector3(-0.05, 0, 0)),
      this.positions.resistor.clone().add(new THREE.Vector3(0.05, 0, 0)),
      this.positions.battery.clone().add(new THREE.Vector3(-0.05, 0, 0)),
      this.positions.battery.clone().add(new THREE.Vector3(0.05, 0, 0)) // loop close
    ];

    const seriesCurve = new THREE.CatmullRomCurve3(seriesPoints, true, 'catmullrom', 0.15);
    this.curves.push({ curve: seriesCurve, type: 'series', speed: 0.08 });

    const seriesGeo = new THREE.TubeGeometry(seriesCurve, 80, 0.0038, 8, true);
    const seriesMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85
    });
    this.seriesMesh = new THREE.Mesh(seriesGeo, seriesMat);
    this.pathsGroup.add(this.seriesMesh);

    // 2. Parallel Voltmeter Branch: Resistor Left -> Voltmeter (+) & Voltmeter (-) -> Resistor Right
    const voltPoints1 = [
      this.positions.resistor.clone().add(new THREE.Vector3(-0.05, 0, 0)),
      new THREE.Vector3(0.28, this.baseH + 0.04, 0.22),
      this.positions.voltmeter.clone().add(new THREE.Vector3(-0.04, 0, 0))
    ];
    const voltCurve1 = new THREE.CatmullRomCurve3(voltPoints1, false, 'catmullrom', 0.2);
    this.curves.push({ curve: voltCurve1, type: 'parallel', speed: 0.06 });

    const voltGeo1 = new THREE.TubeGeometry(voltCurve1, 30, 0.0032, 8, false);
    const voltMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85
    });
    this.pathsGroup.add(new THREE.Mesh(voltGeo1, voltMat));

    const voltPoints2 = [
      this.positions.voltmeter.clone().add(new THREE.Vector3(0.04, 0, 0)),
      new THREE.Vector3(0.35, this.baseH + 0.02, 0.18),
      this.positions.resistor.clone().add(new THREE.Vector3(0.05, 0, 0))
    ];
    const voltCurve2 = new THREE.CatmullRomCurve3(voltPoints2, false, 'catmullrom', 0.2);
    this.curves.push({ curve: voltCurve2, type: 'parallel', speed: 0.06 });

    const voltGeo2 = new THREE.TubeGeometry(voltCurve2, 30, 0.0032, 8, false);
    this.pathsGroup.add(new THREE.Mesh(voltGeo2, voltMat));

    this.group.add(this.pathsGroup);
  }

  _buildNodeMarkers() {
    this.nodesGroup = new THREE.Group();

    Object.entries(this.positions).forEach(([key, pos]) => {
      const isVolt = key === 'voltmeter';
      const nodeColor = isVolt ? 0xf59e0b : 0x00f3ff;

      // Glowing spherical node beacon
      const sphereGeo = new THREE.SphereGeometry(0.018, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: 0.95
      });
      const nodeMesh = new THREE.Mesh(sphereGeo, sphereMat);
      nodeMesh.position.copy(pos);
      this.nodesGroup.add(nodeMesh);

      // Vertical guide beam dropping down to tabletop instrument
      const dropLen = 0.48;
      const dropGeo = new THREE.CylinderGeometry(0.0015, 0.0015, dropLen, 6);
      dropGeo.translate(0, -dropLen / 2, 0);
      const dropMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: 0.35
      });
      const dropBeam = new THREE.Mesh(dropGeo, dropMat);
      dropBeam.position.copy(pos);
      this.nodesGroup.add(dropBeam);
    });

    this.group.add(this.nodesGroup);
  }

  _buildFloatingLabels() {
    this.labelsGroup = new THREE.Group();

    const labelDefs = [
      { id: 'battery', title: 'DC BATTERY (6V)', subtitle: 'Power Source (+/-)', color: '#ef4444', pos: this.positions.battery },
      { id: 'switch', title: 'PLUG KEY', subtitle: 'Safety Switch [Series]', color: '#fbbf24', pos: this.positions.switch },
      { id: 'ammeter', title: 'AMMETER (0–0.6A)', subtitle: 'Measures Current (I) [Series]', color: '#38bdf8', pos: this.positions.ammeter },
      { id: 'rheostat', title: 'RHEOSTAT', subtitle: 'Variable Resistance [Series]', color: '#f59e0b', pos: this.positions.rheostat },
      { id: 'resistor', title: 'RESISTOR (10 Ω)', subtitle: 'Specimen Conductor', color: '#a855f7', pos: this.positions.resistor },
      { id: 'voltmeter', title: 'VOLTMETER (0–6V)', subtitle: 'Measures Voltage (V) [Parallel]', color: '#fbbf24', pos: this.positions.voltmeter }
    ];

    labelDefs.forEach((def) => {
      const sprite = this._createHoloLabelSprite(def.title, def.subtitle, def.color);
      sprite.position.copy(def.pos).add(new THREE.Vector3(0, 0.12, 0));
      sprite.scale.set(0.24, 0.09, 1);
      this.labelsGroup.add(sprite);
      this.labels.push(sprite);
    });

    this.group.add(this.labelsGroup);
  }

  _createHoloLabelSprite(title, subtitle, accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    // Cyberpunk holographic glass card
    ctx.fillStyle = 'rgba(6, 15, 30, 0.88)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 176, 16);
    ctx.fill();
    ctx.stroke();

    // Top glowing bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(20, 16, 472, 6);

    // Title
    ctx.font = 'bold 38px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 76);

    // Subtitle
    ctx.font = '600 26px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = accentColor;
    ctx.fillText(subtitle, 256, 126);

    // Bottom subtle indicator
    ctx.font = '500 20px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('⚡ 3D HOLOGRAPHIC BLUEPRINT', 256, 158);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    });

    return new THREE.Sprite(spriteMat);
  }

  _buildFlowParticles() {
    this.particlesGroup = new THREE.Group();
    const particleCount = 18;

    const pGeo = new THREE.SphereGeometry(0.007, 8, 8);
    const pMatSeries = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.95
    });
    const pMatVolt = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95
    });

    for (let i = 0; i < particleCount; i++) {
      const isVoltCurve = i >= 12;
      const mesh = new THREE.Mesh(pGeo, isVoltCurve ? pMatVolt : pMatSeries);
      const curveEntry = isVoltCurve ? this.curves[1] : this.curves[0];
      const offset = (i % 12) / 12;

      this.particles.push({
        mesh,
        curve: curveEntry.curve,
        offset,
        speed: curveEntry.speed
      });
      this.particlesGroup.add(mesh);
    }

    this.group.add(this.particlesGroup);
  }

  show() {
    this.group.visible = true;
    this.targetScale = 1.0;
  }

  hide() {
    this.targetScale = 0.0;
  }

  update(delta, time) {
    if (!this.group.visible && this.targetScale === 0) return;

    // Smooth scale lerp in/out
    this.currentScale += (this.targetScale - this.currentScale) * Math.min(delta * 5.0, 1.0);
    this.group.scale.setScalar(this.currentScale);

    if (this.currentScale < 0.01 && this.targetScale === 0) {
      this.group.visible = false;
      return;
    }

    // Rotate projector base rings
    if (this.baseRing) this.baseRing.rotation.z += delta * 0.4;
    if (this.baseInnerRing) this.baseInnerRing.rotation.z -= delta * 0.6;

    // Pulse beam cone opacity
    if (this.beamCone) {
      this.beamCone.material.opacity = 0.10 + Math.sin(time * 3.0) * 0.04;
    }

    // Gentle float bobbing for schematic wireframe
    if (this.pathsGroup) {
      this.pathsGroup.position.y = Math.sin(time * 2.0) * 0.012;
    }
    if (this.nodesGroup) {
      this.nodesGroup.position.y = Math.sin(time * 2.0) * 0.012;
    }
    if (this.labelsGroup) {
      this.labelsGroup.position.y = Math.sin(time * 2.0) * 0.012;
    }

    // Animate flow particles along curves
    this.particles.forEach((p) => {
      p.offset = (p.offset + delta * p.speed) % 1.0;
      const point = p.curve.getPoint(p.offset);
      if (point) {
        p.mesh.position.copy(point);
        p.mesh.position.y += Math.sin(time * 2.0) * 0.012;
      }
    });
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}

