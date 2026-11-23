/**
 * throwableManager.js
 * Interactive Lab Throwables System for WebXR & Desktop:
 * - 4 physical throwables on the workbench (Bouncy Ball, Chalk Eraser, Lab Flask, Newton's Apple)
 * - 6-DOF Hand Tracking & VR Controller grab, lift, move, place, and throw mechanics
 * - Natural release velocity calculation with gentle drop vs energetic toss detection
 * - Workbench tabletop (y = 0.93m) and laboratory floor & wall physics collisions
 * - Real-time collision detection against the Lab Assistant body hitbox
 * - 4.0-second automatic respawn cycle with energetic particle pop and chime
 */

import * as THREE from 'three';
import { getSharedAudioContext } from '../audio.js';

export class ThrowableManager {
  constructor({ scene, assistant, narration, onFeedback = () => { } } = {}) {
    this.scene = scene;
    this.assistant = assistant;
    this.narration = narration;
    this.onFeedback = onFeedback;

    this.group = new THREE.Group();
    this.group.name = 'ThrowableManager';

    // Dedicated tray along right edge of experiment workbench (matching user's drawing, rotated 90 degrees)
    this.trayPosition = new THREE.Vector3(0.76, 0.0, 0.08);
    this.group.position.copy(this.trayPosition);
    this.group.rotation.y = Math.PI / 2;

    this.throwables = [];
    this.heldObjects = new Map(); // holderId/handIndex -> throwable

    // Normal mode: throwables & target practice are disabled by default
    this.enabled = false;

    // Web Audio context for whoosh, grab, and bounce sounds
    this.audioCtx = null;

    this._buildTrayAndPedestals();
    this._buildThrowables();

    // Hide entire throwable tray and target practice billboard by default
    this.group.visible = false;

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  _ensureAudio() {
    this.audioCtx = getSharedAudioContext();
  }

  _playGrabSound() {
    this._ensureAudio();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) { }
  }

  _playThrowSound() {
    this._ensureAudio();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) { }
  }

  _playBounceSound() {
    this._ensureAudio();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) { }
  }

  _playRespawnSound() {
    this._ensureAudio();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.06); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) { }
  }

  _buildTrayAndPedestals() {
    // 1. Heavy stable circular floor base (r = 0.22m, h = 0.024m)
    const baseGeo = new THREE.CylinderGeometry(0.20, 0.24, 0.024, 32);
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25
    });
    const base = new THREE.Mesh(baseGeo, darkMetalMat);
    base.position.y = 0.012;
    base.receiveShadow = true;
    this.group.add(base);

    // Glowing base accent ring
    const baseRingGeo = new THREE.RingGeometry(0.19, 0.22, 32);
    baseRingGeo.rotateX(-Math.PI / 2);
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.75 });
    const baseRing = new THREE.Mesh(baseRingGeo, neonCyanMat);
    baseRing.position.y = 0.025;
    this.group.add(baseRing);

    // 2. Upright metallic pedestal pillar (h = 0.81m, r = 0.035m)
    const pillarGeo = new THREE.CylinderGeometry(0.032, 0.035, 0.81, 24);
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.9,
      roughness: 0.18
    });
    const pillar = new THREE.Mesh(pillarGeo, chromeMat);
    pillar.position.y = 0.425;
    pillar.castShadow = true;
    this.group.add(pillar);

    // 3. Side Table Top / Tray Deck (0.52m wide x 0.22m deep x 0.024m thick)
    const trayGeo = new THREE.BoxGeometry(0.52, 0.024, 0.22);
    const tray = new THREE.Mesh(trayGeo, darkMetalMat);
    tray.position.y = 0.835;
    tray.receiveShadow = true;
    tray.castShadow = true;
    this.group.add(tray);

    // Glowing cyan neon rim around the deck perimeter
    const rimGeo = new THREE.BoxGeometry(0.528, 0.004, 0.228);
    const rim = new THREE.Mesh(rimGeo, neonCyanMat);
    rim.position.y = 0.846;
    this.group.add(rim);

    // 4. Floating instructional billboard badge
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(6, 18, 38, 0.88)';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 112, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('🎯 TARGET PRACTICE', 256, 52);

    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('Grab & Throw at Assistant!', 256, 92);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 1.05, -0.06);
    sprite.scale.set(0.38, 0.095, 1);
    this.group.add(sprite);
  }

  _buildThrowables() {
    // 11 cm comfortable spacing between items so each can be grabbed individually
    const offsets = [-0.165, -0.055, 0.055, 0.165];

    // 1. 🎾 Bouncy Rubber Ball
    const ballMesh = this._createRubberBall();
    this._addThrowable({
      id: 'rubber_ball',
      name: 'Rubber Ball',
      mesh: ballMesh,
      localPos: new THREE.Vector3(offsets[0], 0.877, 0),
      radius: 0.030,
      bounciness: 0.70,
      mass: 0.12
    });

    // 2. 🧽 Chalkboard Eraser
    const eraserMesh = this._createChalkEraser();
    this._addThrowable({
      id: 'chalk_eraser',
      name: 'Chalk Eraser',
      mesh: eraserMesh,
      localPos: new THREE.Vector3(offsets[1], 0.865, 0),
      radius: 0.038,
      bounciness: 0.30,
      mass: 0.18
    });

    // 3. 🧪 Lab Flask
    const flaskMesh = this._createFlask();
    this._addThrowable({
      id: 'lab_flask',
      name: 'Lab Flask',
      mesh: flaskMesh,
      localPos: new THREE.Vector3(offsets[2], 0.847, 0),
      radius: 0.038,
      bounciness: 0.38,
      mass: 0.22
    });

    // 4. 🍎 Newton's Gravity Apple
    const appleMesh = this._createApple();
    this._addThrowable({
      id: 'gravity_apple',
      name: "Newton's Apple",
      mesh: appleMesh,
      localPos: new THREE.Vector3(offsets[3], 0.875, 0),
      radius: 0.034,
      bounciness: 0.42,
      mass: 0.15
    });
  }

  _createRubberBall() {
    const geo = new THREE.SphereGeometry(0.030, 20, 20);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x84cc16, // Vibrant tennis neon lime
      roughness: 0.35,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  _createChalkEraser() {
    const group = new THREE.Group();
    // Wooden top block
    const woodGeo = new THREE.BoxGeometry(0.045, 0.018, 0.075);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.5 });
    const wood = new THREE.Mesh(woodGeo, woodMat);
    wood.position.y = 0.009;
    wood.castShadow = true;
    group.add(wood);

    // Felt eraser bottom pad
    const feltGeo = new THREE.BoxGeometry(0.047, 0.014, 0.077);
    const feltMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
    const felt = new THREE.Mesh(feltGeo, feltMat);
    felt.position.y = -0.006;
    felt.castShadow = true;
    group.add(felt);

    return group;
  }

  _createFlask() {
    const group = new THREE.Group();
    // Glass cone base
    const coneGeo = new THREE.ConeGeometry(0.032, 0.052, 16);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.8
    });
    const cone = new THREE.Mesh(coneGeo, glassMat);
    cone.position.y = 0.026;
    cone.castShadow = true;
    group.add(cone);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.028, 12);
    const neck = new THREE.Mesh(neckGeo, glassMat);
    neck.position.y = 0.060;
    group.add(neck);

    // Brown Cork Stopper
    const corkGeo = new THREE.CylinderGeometry(0.009, 0.011, 0.012, 12);
    const corkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const cork = new THREE.Mesh(corkGeo, corkMat);
    cork.position.y = 0.076;
    group.add(cork);

    return group;
  }

  _createApple() {
    const group = new THREE.Group();
    // Red Apple sphere
    const appleGeo = new THREE.SphereGeometry(0.030, 16, 16);
    appleGeo.scale(1.0, 0.92, 1.0);
    const appleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const apple = new THREE.Mesh(appleGeo, appleMat);
    apple.castShadow = true;
    group.add(apple);

    // Brown Stem
    const stemGeo = new THREE.CylinderGeometry(0.0025, 0.003, 0.018, 6);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0.002, 0.032, 0);
    stem.rotation.z = 0.2;
    group.add(stem);

    // Green Leaf
    const leafGeo = new THREE.SphereGeometry(0.008, 8, 8);
    leafGeo.scale(1.8, 0.4, 0.9);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0.012, 0.034, 0);
    leaf.rotation.z = 0.4;
    group.add(leaf);

    return group;
  }

  _addThrowable({ id, name, mesh, localPos, radius, bounciness, mass }) {
    // Pedestal glow ring under each object on the side table surface
    const ringGeo = new THREE.RingGeometry(0.026, 0.034, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.65 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(localPos.x, 0.848, localPos.z);
    this.group.add(ring);

    // Hitbox for raycasting and comfortable near-hand grab
    const hitGeo = new THREE.SphereGeometry(radius * 1.5, 12, 12);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);

    mesh.position.copy(localPos);
    mesh.add(hitBox);
    this.group.add(mesh);

    const worldSpawn = new THREE.Vector3();
    mesh.getWorldPosition(worldSpawn);

    const throwable = {
      id,
      name,
      mesh,
      hitBox,
      ring,
      ringMat,
      localSpawnPos: localPos.clone(),
      worldSpawnPos: worldSpawn,
      radius,
      bounciness,
      mass,
      state: 'idle', // 'idle' | 'held' | 'flying' | 'landed'
      velocity: new THREE.Vector3(),
      angVelocity: new THREE.Vector3(),
      respawnTimer: 0,
      holder: null,
      history: [] // [{ pos, time }] for velocity estimation
    };

    mesh.userData = {
      isThrowable: true,
      throwableId: id,
      throwable,
      onPress: () => this.handleClick(throwable)
    };
    hitBox.userData = mesh.userData;

    this.throwables.push(throwable);
  }

  getClickableObjects() {
    if (!this.enabled || !this.group.visible) return [];
    const list = [];
    this.throwables.forEach((t) => {
      if (t.state === 'idle' || t.state === 'landed') {
        list.push(t.hitBox);
        list.push(t.mesh);
      }
    });
    return list;
  }

  /**
   * Set visual hover highlight when pointed at or near hand.
   */
  setHover(throwable, isHovered) {
    if (!throwable || !throwable.ringMat) return;
    if (isHovered) {
      throwable.ringMat.color.setHex(0xfbbf24);
      throwable.ringMat.opacity = 0.95;
      if (throwable.state === 'idle') {
        throwable.mesh.scale.setScalar(1.1);
      }
    } else {
      throwable.ringMat.color.setHex(0x00f3ff);
      throwable.ringMat.opacity = 0.65;
      if (throwable.state === 'idle') {
        throwable.mesh.scale.setScalar(1.0);
      }
    }
  }

  /**
   * Grab throwable into hand tracking hand.
   */
  grabWithHand(throwable, handObj) {
    if (!throwable || (throwable.state !== 'idle' && throwable.state !== 'landed')) return;

    this._ensureAudio();
    this._playGrabSound();

    throwable.state = 'held';
    throwable.holder = {
      type: 'hand',
      id: handObj.index,
      getPos: () => handObj.smoothedIndexPos,
      getQuat: () => null
    };
    throwable.history = [
      { pos: handObj.smoothedIndexPos.clone(), time: performance.now() }
    ];

    this.scene.attach(throwable.mesh);
    this.heldObjects.set(`hand_${handObj.index}`, throwable);

    this.onFeedback({
      type: 'info',
      message: `✊ Grabbed ${throwable.name}`
    });
  }

  /**
   * Release throwable from hand tracking hand.
   */
  releaseHand(handObj) {
    const key = `hand_${handObj.index}`;
    const throwable = this.heldObjects.get(key);
    if (!throwable) return;

    this.heldObjects.delete(key);
    this._executeRelease(throwable);
  }

  isHandHolding(handObj) {
    return this.heldObjects.has(`hand_${handObj.index}`);
  }

  _executeRelease(throwable) {
    throwable.holder = null;
    throwable.state = 'flying';
    throwable.respawnTimer = 4.5; // Auto-respawn after 4.5 seconds

    // Compute peak throw velocity from position history
    let computedVel = new THREE.Vector3(0, 0, 0);
    const hist = throwable.history;
    if (hist && hist.length >= 2) {
      let maxSpeed = 0;
      for (let i = 0; i < hist.length - 1; i++) {
        const p1 = hist[i];
        const p2 = hist[hist.length - 1];
        const dt = Math.max(0.016, (p2.time - p1.time) / 1000.0);
        const v = new THREE.Vector3().subVectors(p2.pos, p1.pos).divideScalar(dt);
        if (v.length() > maxSpeed) {
          maxSpeed = v.length();
          computedVel.copy(v);
        }
      }
    }

    const rawSpeed = computedVel.length();
    if (rawSpeed > 0.12) {
      // Deliberate throw with generous human-scale VR velocity boost (2.8x)
      computedVel.multiplyScalar(2.8);
      computedVel.y = Math.max(computedVel.y + 0.8, 1.2);

      // Intelligent aim assist: if student throws in the general forward/right direction,
      // gently guide the projectile towards the lab assistant's chest so a gentle throw easily reaches!
      const assistantChest = this.assistant
        ? this.assistant.position.clone().add(new THREE.Vector3(0, 1.15, 0))
        : new THREE.Vector3(1.05, 1.15, 0.05);
      const toAssistant = new THREE.Vector3().subVectors(assistantChest, throwable.mesh.position).normalize();
      const dot = computedVel.clone().normalize().dot(toAssistant);

      if (dot > -0.20) {
        // Blend player throw vector with assistant trajectory
        const speed = Math.max(computedVel.length(), 4.2);
        computedVel.lerp(toAssistant.multiplyScalar(speed), 0.60);
      }

      if (computedVel.length() > 14.0) computedVel.setLength(14.0);

      throwable.velocity.copy(computedVel);
      throwable.angVelocity.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16
      );
      this._playThrowSound();
      this.onFeedback({
        type: 'info',
        message: `🎯 Threw ${throwable.name}!`
      });
    } else {
      // Gentle drop / place down
      throwable.velocity.set(0, -0.4, 0);
      throwable.angVelocity.set(0, 0, 0);
      this.onFeedback({
        type: 'info',
        message: `Placed ${throwable.name}`
      });
    }
  }

  /**
   * Handle discrete click/pinch:
   * Gives a gentle playful hop and prompts student to grab and physically throw with hand.
   */
  handleClick(throwableObj) {
    if (!throwableObj || (throwableObj.state !== 'idle' && throwableObj.state !== 'landed')) return;

    // Gentle hop up so user can easily grab it in midair or with tracked hand
    throwableObj.velocity.set(0, 2.2, 0);
    throwableObj.angVelocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    throwableObj.state = 'flying';
    this._playThrowSound();

    this.onFeedback({
      type: 'info',
      message: `✋ Grab ${throwableObj.name} with your hand and throw!`
    });
  }

  /**
   * Launch throwable along a parabolic flight path to hit target.
   */
  launchBallistic(t, target, timeToTarget = 0.65) {
    if (t.state === 'held') return;

    // Reparent mesh from local group directly to scene during world flight
    t.mesh.getWorldPosition(t.mesh.position);
    t.mesh.getWorldQuaternion(t.mesh.quaternion);
    this.scene.attach(t.mesh);

    const start = t.mesh.position;
    const g = -9.8;

    const dx = target.x - start.x;
    const dz = target.z - start.z;
    const dy = target.y - start.y;

    t.velocity.set(
      dx / timeToTarget,
      (dy - 0.5 * g * timeToTarget * timeToTarget) / timeToTarget,
      dz / timeToTarget
    );

    t.angVelocity.set(
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 16
    );

    t.state = 'flying';
    t.respawnTimer = 4.0;

    this._playThrowSound();
  }

  _respawn(t) {
    t.state = 'idle';
    t.velocity.set(0, 0, 0);
    t.angVelocity.set(0, 0, 0);
    t.respawnTimer = 0;
    t.holder = null;
    t.history = [];

    // Re-attach to local group at spawn position
    t.mesh.scale.setScalar(1.0);
    this.group.attach(t.mesh);
    t.mesh.position.copy(t.localSpawnPos);
    t.mesh.rotation.set(0, 0, 0);

    this.setHover(t, false);
    this._playRespawnSound();
  }

  update(delta) {
    if (!this.enabled || !this.group.visible) return;
    // Buoyant aerodynamic gravity for satisfying VR throws across the lab
    const g = -4.2;
    const now = performance.now();

    const assistantHitbox = this.assistant ? this.assistant.getHitbox() : null;
    const assistantWorldPos = new THREE.Vector3();
    if (assistantHitbox) {
      assistantHitbox.getWorldPosition(assistantWorldPos);
    } else if (this.assistant) {
      assistantWorldPos.copy(this.assistant.position).add(new THREE.Vector3(0, 0.88, 0));
    }

    // Side Tabletop bounds (at x: 0.76, z: 0.08, surface y: 0.847m, rotated 90 deg along table depth)
    const sideTableMinX = 0.65;
    const sideTableMaxX = 0.87;
    const sideTableMinZ = -0.18;
    const sideTableMaxZ = 0.34;
    const sideTableY = 0.847;

    // Workbench Table bounds for collision (at x: ~0, z: ~0.06, y: ~0.815m)
    const mainTableMinX = -1.25;
    const mainTableMaxX = 1.25;
    const mainTableMinZ = -0.65;
    const mainTableMaxZ = 0.65;
    const mainTableY = 0.815;

    // Room boundaries (widened right wall boundary)
    const roomMinX = -3.8;
    const roomMaxX = 4.3;
    const roomMinZ = -4.5;
    const roomMaxZ = 3.5;

    this.throwables.forEach((t) => {
      // 1. Held in hand or controller
      if (t.state === 'held' && t.holder) {
        const curP = t.holder.getPos();
        if (curP) {
          t.mesh.position.copy(curP);

          // Update position history (14 frames window for smooth throw gesture velocity capture)
          t.history.push({ pos: curP.clone(), time: now });
          if (t.history.length > 14) {
            t.history.shift();
          }

          const curQ = t.holder.getQuat();
          if (curQ) {
            t.mesh.quaternion.copy(curQ);
          }
        }
        return;
      }

      // 2. Flying or Landed physics & collision
      if (t.state === 'flying' || t.state === 'landed') {
        t.respawnTimer -= delta;

        // Visual fade/shrink just before respawning
        if (t.respawnTimer <= 0.4 && t.respawnTimer > 0) {
          const shrink = Math.max(0.01, t.respawnTimer / 0.4);
          t.mesh.scale.setScalar(shrink);
        }

        // Auto-respawn triggered!
        if (t.respawnTimer <= 0) {
          this._respawn(t);
          return;
        }

        if (t.state === 'flying') {
          // Apply gravity
          t.velocity.y += g * delta;

          // Update position & tumbling rotation
          t.mesh.position.addScaledVector(t.velocity, delta);
          t.mesh.rotation.x += t.angVelocity.x * delta;
          t.mesh.rotation.y += t.angVelocity.y * delta;
          t.mesh.rotation.z += t.angVelocity.z * delta;

          const curP = t.mesh.position;

          // A. Collision check against Lab Assistant capsule
          if (this.assistant) {
            const dx = curP.x - assistantWorldPos.x;
            const dz = curP.z - assistantWorldPos.z;
            const distXZ = Math.sqrt(dx * dx + dz * dz);
            const inY = curP.y >= 0.10 && curP.y <= 1.95;

            if (distXZ < (0.45 + t.radius) && inY) {
              // Direct hit on assistant!
              t.state = 'landed';
              this.assistant.onHit(curP.clone(), t);

              // Bounce backwards with reaction impulse
              t.velocity.set(
                -dx * 2.5 + (Math.random() - 0.5),
                Math.random() * 1.5 + 0.5,
                -dz * 2.5 + (Math.random() - 0.5)
              );
              t.angVelocity.multiplyScalar(0.5);
              return;
            }
          }

          // B. Collision check against Side Tabletop
          if (curP.x >= sideTableMinX && curP.x <= sideTableMaxX && curP.z >= sideTableMinZ && curP.z <= sideTableMaxZ) {
            if (curP.y <= (sideTableY + t.radius)) {
              curP.y = sideTableY + t.radius;
              if (Math.abs(t.velocity.y) > 0.6) {
                t.velocity.y = -t.velocity.y * t.bounciness;
                t.velocity.x *= 0.65;
                t.velocity.z *= 0.65;
                this._playBounceSound();
              } else {
                t.velocity.set(0, 0, 0);
                t.angVelocity.set(0, 0, 0);
                t.state = 'landed';
              }
            }
          }

          // C. Collision check against Workbench Tabletop
          if (curP.x >= mainTableMinX && curP.x <= mainTableMaxX && curP.z >= mainTableMinZ && curP.z <= mainTableMaxZ) {
            if (curP.y <= (mainTableY + t.radius)) {
              curP.y = mainTableY + t.radius;
              if (Math.abs(t.velocity.y) > 0.6) {
                t.velocity.y = -t.velocity.y * t.bounciness;
                t.velocity.x *= 0.65;
                t.velocity.z *= 0.65;
                this._playBounceSound();
              } else {
                t.velocity.set(0, 0, 0);
                t.angVelocity.set(0, 0, 0);
                t.state = 'landed';
              }
            }
          }

          // C. Floor collision (floor at y = 0)
          if (curP.y <= t.radius) {
            curP.y = t.radius;
            if (Math.abs(t.velocity.y) > 0.6) {
              t.velocity.y = -t.velocity.y * t.bounciness;
              t.velocity.x *= 0.60;
              t.velocity.z *= 0.60;
              this._playBounceSound();
            } else {
              t.velocity.set(0, 0, 0);
              t.angVelocity.set(0, 0, 0);
              t.state = 'landed';
            }
          }

          // D. Laboratory Walls collision bounds
          if (curP.x < roomMinX) {
            curP.x = roomMinX;
            t.velocity.x = Math.abs(t.velocity.x) * 0.5;
          } else if (curP.x > roomMaxX) {
            curP.x = roomMaxX;
            t.velocity.x = -Math.abs(t.velocity.x) * 0.5;
          }
          if (curP.z < roomMinZ) {
            curP.z = roomMinZ;
            t.velocity.z = Math.abs(t.velocity.z) * 0.5;
          } else if (curP.z > roomMaxZ) {
            curP.z = roomMaxZ;
            t.velocity.z = -Math.abs(t.velocity.z) * 0.5;
          }
        }
      }
    });
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
