/**
 * batterySparkEffect.js
 * Electric spark / arc effect near battery positive terminal.
 *
 * Triggers a burst of sparks every 4–5 seconds when the circuit key is closed
 * (current flowing). Sparks fly outward from the battery terminal area.
 *
 * Implementation: Simple particle system using BufferGeometry + Points,
 * plus thin line arcs for a "crackle" arc visual.
 */

import * as THREE from 'three';

const SPARK_COUNT      = 28;    // particles per burst
const SPARK_LIFETIME   = 0.55;  // seconds each spark lives
const BURST_INTERVAL_MIN = 4.0; // min seconds between bursts
const BURST_INTERVAL_MAX = 5.5; // max seconds between bursts

// Battery positive terminal world position (from terminalDefinitions.js)
const BATTERY_POS_WORLD = new THREE.Vector3(-0.545, 0.826, 0.112);

export class BatterySparkEffect {
  constructor(scene) {
    this.scene = scene;

    // State
    this.active = false;   // only spark when key is closed
    this._burstTimer     = 0;
    this._nextBurstAt    = this._randomInterval();
    this._sparkLifetimes = new Float32Array(SPARK_COUNT).fill(0);
    this._sparkVelocities = [];
    this._sparkActive    = false; // burst in progress?
    this._burstElapsed   = 0;

    // Arc lines state
    this._arcGroup = null;

    this._buildParticles();
    this._buildArcs();
  }

  // ──────────────────────────────────────────────────
  //  BUILD PARTICLE SYSTEM
  // ──────────────────────────────────────────────────
  _buildParticles() {
    const positions = new Float32Array(SPARK_COUNT * 3);
    const colors    = new Float32Array(SPARK_COUNT * 3);
    const sizes     = new Float32Array(SPARK_COUNT);

    for (let i = 0; i < SPARK_COUNT; i++) {
      positions[i * 3]     = BATTERY_POS_WORLD.x;
      positions[i * 3 + 1] = BATTERY_POS_WORLD.y;
      positions[i * 3 + 2] = BATTERY_POS_WORLD.z;
      colors[i * 3]     = 1.0;
      colors[i * 3 + 1] = 0.85;
      colors[i * 3 + 2] = 0.2;
      sizes[i] = 6.0;

      // Random velocity direction (hemispherical outward burst)
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.6;
      const speed = 0.18 + Math.random() * 0.28;
      this._sparkVelocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.5 + 0.08, // slight upward bias
        Math.sin(phi) * Math.sin(theta) * speed
      ));
    }

    this._sparkPositions = positions;
    this._sparkColors    = colors;
    this._sparkSizes     = sizes;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    this._sparkGeo = geo;

    const mat = new THREE.PointsMaterial({
      size: 0.018,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this._sparkPoints = new THREE.Points(geo, mat);
    this._sparkPoints.visible = false;
    this.scene.add(this._sparkPoints);
  }

  _buildArcs() {
    this._arcGroup = new THREE.Group();
    this._arcGroup.visible = false;
    this.scene.add(this._arcGroup);

    // 3 jagged arc lines
    this._arcLines = [];
    for (let a = 0; a < 3; a++) {
      const numPts = 6 + Math.floor(Math.random() * 4);
      const posArr = new Float32Array(numPts * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

      const mat = new THREE.LineBasicMaterial({
        color: a === 0 ? 0xfbbf24 : (a === 1 ? 0xf97316 : 0xfef08a),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const line = new THREE.Line(geo, mat);
      this._arcGroup.add(line);
      this._arcLines.push({ line, geo, posArr, numPts });
    }
  }

  // ──────────────────────────────────────────────────
  //  SPARK BURST TRIGGER
  // ──────────────────────────────────────────────────
  _triggerBurst() {
    this._sparkActive = true;
    this._burstElapsed = 0;

    // Reset each spark to origin with a fresh velocity
    for (let i = 0; i < SPARK_COUNT; i++) {
      this._sparkLifetimes[i] = SPARK_LIFETIME * (0.5 + Math.random() * 0.5);
      this._sparkPositions[i * 3]     = BATTERY_POS_WORLD.x + (Math.random() - 0.5) * 0.01;
      this._sparkPositions[i * 3 + 1] = BATTERY_POS_WORLD.y + (Math.random() - 0.5) * 0.01;
      this._sparkPositions[i * 3 + 2] = BATTERY_POS_WORLD.z + (Math.random() - 0.5) * 0.01;
      this._sparkSizes[i] = 5.0 + Math.random() * 5.0;

      // Randomize velocity each burst
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.55;
      const speed = 0.15 + Math.random() * 0.30;
      this._sparkVelocities[i].set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.35 + 0.05,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      // Hot yellow-white → orange-red color gradient
      this._sparkColors[i * 3]     = 1.0;
      this._sparkColors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
      this._sparkColors[i * 3 + 2] = 0.1 + Math.random() * 0.3;
    }

    this._sparkPoints.visible = true;
    this._arcGroup.visible    = true;

    this._refreshArcs();
  }

  _refreshArcs() {
    // Regenerate jagged arc paths each burst tick
    this._arcLines.forEach(({ geo, posArr, numPts }) => {
      // Start at battery terminal, arc outward randomly
      const endX = BATTERY_POS_WORLD.x + (Math.random() - 0.5) * 0.08;
      const endY = BATTERY_POS_WORLD.y + 0.03 + Math.random() * 0.06;
      const endZ = BATTERY_POS_WORLD.z + (Math.random() - 0.5) * 0.08;

      for (let j = 0; j < numPts; j++) {
        const t = j / (numPts - 1);
        const jitter = (1 - t) * 0.025; // decreasing jitter along arc
        posArr[j * 3]     = BATTERY_POS_WORLD.x + t * (endX - BATTERY_POS_WORLD.x) + (Math.random() - 0.5) * jitter;
        posArr[j * 3 + 1] = BATTERY_POS_WORLD.y + t * (endY - BATTERY_POS_WORLD.y) + (Math.random() - 0.5) * jitter * 0.5;
        posArr[j * 3 + 2] = BATTERY_POS_WORLD.z + t * (endZ - BATTERY_POS_WORLD.z) + (Math.random() - 0.5) * jitter;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  _randomInterval() {
    return BURST_INTERVAL_MIN + Math.random() * (BURST_INTERVAL_MAX - BURST_INTERVAL_MIN);
  }

  // ──────────────────────────────────────────────────
  //  PER-FRAME UPDATE
  // ──────────────────────────────────────────────────
  update(delta, simulation) {
    const keyClosed = simulation && simulation.keyClosed;
    this.active = Boolean(keyClosed);

    if (!this.active) {
      // Hide all effects when circuit is off
      if (this._sparkPoints.visible) {
        this._sparkPoints.visible = false;
        this._arcGroup.visible    = false;
        this._sparkActive = false;
      }
      return;
    }

    // Timer for next burst
    this._burstTimer += delta;
    if (this._burstTimer >= this._nextBurstAt) {
      this._burstTimer   = 0;
      this._nextBurstAt  = this._randomInterval();
      this._triggerBurst();
    }

    // Animate active burst
    if (this._sparkActive) {
      this._burstElapsed += delta;
      let anyAlive = false;

      for (let i = 0; i < SPARK_COUNT; i++) {
        if (this._sparkLifetimes[i] <= 0) continue;
        anyAlive = true;

        this._sparkLifetimes[i] -= delta;
        const life = Math.max(0, this._sparkLifetimes[i] / SPARK_LIFETIME);

        // Move particle
        this._sparkPositions[i * 3]     += this._sparkVelocities[i].x * delta;
        this._sparkPositions[i * 3 + 1] += this._sparkVelocities[i].y * delta;
        this._sparkPositions[i * 3 + 2] += this._sparkVelocities[i].z * delta;

        // Gravity
        this._sparkVelocities[i].y -= 0.28 * delta;

        // Fade out size and color
        this._sparkSizes[i] = life * 7.0;
        this._sparkColors[i * 3]     = life;
        this._sparkColors[i * 3 + 1] = life * 0.65;
        this._sparkColors[i * 3 + 2] = 0;
      }

      this._sparkGeo.attributes.position.needsUpdate = true;
      this._sparkGeo.attributes.color.needsUpdate    = true;
      this._sparkGeo.attributes.size.needsUpdate     = true;

      // Flicker arcs every 3 frames
      if (Math.random() < 0.35) this._refreshArcs();

      if (!anyAlive) {
        this._sparkActive           = false;
        this._sparkPoints.visible   = false;
        this._arcGroup.visible      = false;
      }
    }
  }

  dispose() {
    this._sparkGeo.dispose();
    this.scene.remove(this._sparkPoints);
    this.scene.remove(this._arcGroup);
  }
}
