/**
 * wireRenderer.js
 * Renders physical 3D curved tube wires with realistic droop, color coding,
 * brass terminal crimps, connection animations, raycast picking, and
 * real-time animated electron streams drifting along the 3D curves.
 */

import * as THREE from 'three';

export class WireRenderer {
  constructor(scene) {
    this.scene = scene;
    this.wireMeshMap = new Map(); // connectionId -> Group

    // Shared reusable dummy for electron instanced transformations
    this.dummy = new THREE.Object3D();

    // Insulated laboratory wire materials with vibrant, high-contrast colors and subtle glass sheen
    this.materials = {
      positive: new THREE.MeshStandardMaterial({
        color: 0xef4444, // Vibrant Red
        roughness: 0.25,
        metalness: 0.15,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.88
      }),
      negative: new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Dark Slate / Black
        roughness: 0.3,
        metalness: 0.25,
        emissive: 0x475569, // High-contrast slate sheen so it stands out on dark tables
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.88
      }),
      series: new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Vibrant Amber / Yellow
        roughness: 0.25,
        metalness: 0.15,
        emissive: 0xd97706,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.88
      }),
      meter: new THREE.MeshStandardMaterial({
        color: 0x06b6d4, // Vibrant Cyan / Blue
        roughness: 0.25,
        metalness: 0.15,
        emissive: 0x0891b2,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.88
      }),
      warning: new THREE.MeshStandardMaterial({
        color: 0xf97316, // Orange warning
        roughness: 0.3,
        metalness: 0.2,
        emissive: 0xc2410c,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.88
      }),
      error: new THREE.MeshStandardMaterial({
        color: 0xdc2626, // Bright danger red
        roughness: 0.3,
        metalness: 0.2,
        emissive: 0x991b1b,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.88
      })
    };

    // Polished brass terminal lug ferrule material
    this.lugMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x78350f,
      emissiveIntensity: 0.2
    });

    // Luminous glowing electron particle sphere geometry & materials
    this.electronGeo = new THREE.SphereGeometry(0.0048, 10, 10);
    this.electronMaterials = {
      cyan: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      amber: new THREE.MeshBasicMaterial({ color: 0xfde047 }),
      red: new THREE.MeshBasicMaterial({ color: 0xf87171 })
    };
  }

  getMaterialForConnection(conn) {
    if (conn.status === 'error') return this.materials.error;
    if (conn.status === 'warning') return this.materials.warning;

    switch (conn.wireType) {
      case 'positive':
        return this.materials.positive;
      case 'negative':
        return this.materials.negative;
      case 'meter':
        return this.materials.meter;
      case 'series':
      default:
        return this.materials.series;
    }
  }

  /**
   * Generates a 3D curved wire that arches gracefully ABOVE the table surface
   * and loops over tabletop instruments without clipping.
   */
  createWireCurve(posA, posB) {
    const dist = posA.distanceTo(posB);
    const TABLE_SURFACE_Y = 0.804;

    // Midpoint between terminals
    const mid = posA.clone().lerp(posB, 0.5);

    // Natural upward arch height: ensures wires never dip into tabletop or instruments
    // Short wires loop up 7-10 cm, long spans loop up 14-22 cm
    const arch = Math.min(0.22, 0.07 + dist * 0.14);

    // Bow forward (+Z) towards the user so long wires loop in front of table instruments
    // instead of clipping straight through apparatus casings
    mid.z += Math.min(0.18, 0.04 + dist * 0.12);

    // Midpoint Y must always clear the tabletop (0.804m) and highest apparatus (rheostat ~0.89m)
    mid.y = Math.max(0.92, Math.max(posA.y, posB.y) + arch);

    // Cubic control points rising vertically from terminal binding posts before curving towards mid
    const cp1 = posA.clone();
    cp1.y += Math.max(0.06, arch * 0.6);
    cp1.lerp(mid, 0.35);

    const cp2 = posB.clone();
    cp2.y += Math.max(0.06, arch * 0.6);
    cp2.lerp(mid, 0.35);

    return new THREE.CubicBezierCurve3(posA.clone(), cp1, cp2, posB.clone());
  }

  /**
   * Render a virtual wire between two 3D positions with an inner live electron stream.
   */
  addWire(connection, posA, posB) {
    const curve = this.createWireCurve(posA, posB);
    // Insulated 12.5mm laboratory patch cord (prominent, thick, clearly visible)
    const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.0125, 12, false);
    const material = this.getMaterialForConnection(connection).clone(); // Clone material so per-wire pulses work

    const wireGroup = new THREE.Group();
    wireGroup.name = `Wire_${connection.id}`;

    const tubeMesh = new THREE.Mesh(tubeGeo, material);
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;
    tubeMesh.renderOrder = 4;
    tubeMesh.userData = { connectionId: connection.id, isWire: true };
    wireGroup.add(tubeMesh);

    // Generous invisible hit tube (38mm radius) for responsive raycast and finger pinch picking
    const hitGeo = new THREE.TubeGeometry(curve, 24, 0.038, 8, false);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData = { connectionId: connection.id, isWire: true, tubeMesh };
    wireGroup.add(hitMesh);

    // Brass crimp terminal rings at both ends
    [posA, posB].forEach((pos) => {
      const lugGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.025, 16);
      const lug = new THREE.Mesh(lugGeo, this.lugMaterial);
      lug.position.copy(pos);
      lug.rotation.x = Math.PI / 2;
      wireGroup.add(lug);
    });

    // 🔬 Inner Live Electron Flow Stream (24 glowing spherical beads along the curve)
    const ELECTRON_COUNT = 24;
    const electronMat =
      connection.wireType === 'positive'
        ? this.electronMaterials.amber
        : (connection.wireType === 'negative'
            ? this.electronMaterials.cyan
            : this.electronMaterials.cyan);

    const instancedElectrons = new THREE.InstancedMesh(this.electronGeo, electronMat, ELECTRON_COUNT);
    instancedElectrons.renderOrder = 6;
    instancedElectrons.frustumCulled = false;

    // Initialize progressive distribution along curve [0, 1]
    const electronProgress = new Float32Array(ELECTRON_COUNT);
    for (let i = 0; i < ELECTRON_COUNT; i++) {
      electronProgress[i] = i / ELECTRON_COUNT;
      const pt = curve.getPointAt(electronProgress[i]);
      this.dummy.position.copy(pt);
      this.dummy.scale.set(0.7, 0.7, 0.7);
      this.dummy.updateMatrix();
      instancedElectrons.setMatrixAt(i, this.dummy.matrix);
    }
    instancedElectrons.instanceMatrix.needsUpdate = true;
    wireGroup.add(instancedElectrons);

    wireGroup.userData = {
      connectionId: connection.id,
      connection,
      tubeMesh,
      hitMesh,
      curve,
      material,
      baseEmissive: material.emissiveIntensity,
      instancedElectrons,
      electronProgress,
      electronCount: ELECTRON_COUNT,
      isWire: true
    };

    // Connection electrical surge animation: flash emissive intensity
    const baseEmissive = material.emissiveIntensity;
    material.emissiveIntensity = 1.4;
    let flashStep = 0;
    const flashInterval = setInterval(() => {
      flashStep++;
      if (material && material.emissiveIntensity !== undefined) {
        material.emissiveIntensity = Math.max(baseEmissive, 1.4 - flashStep * 0.2);
      }
      if (flashStep >= 6) {
        if (material) material.emissiveIntensity = baseEmissive;
        clearInterval(flashInterval);
      }
    }, 35);

    this.scene.add(wireGroup);
    this.wireMeshMap.set(connection.id, wireGroup);
    return wireGroup;
  }

  /**
   * Update electrical energy pulse and real-time electron drift stream.
   * @param {number} time - Elapsed time in seconds
   * @param {number} current - Live electric current in Amperes
   * @param {number} delta - Frame delta time in seconds
   */
  update(time, current = 0, delta = 0.016) {
    if (this.wireMeshMap.size === 0) return;

    const isFlowing = current > 0.005;
    // Physical electron drift velocity proportional to electric current (I = n * e * A * v_d)
    const driftSpeed = isFlowing ? Math.min(2.8, 0.25 + current * 1.65) : 0;
    const wirePulse = isFlowing ? Math.sin(time * 7.0) * 0.14 : 0;

    this.wireMeshMap.forEach((wireGroup) => {
      const data = wireGroup.userData;
      if (!data) return;

      // 1. Subtle wire material pulse with current
      if (data.material) {
        const base = data.baseEmissive || 0.45;
        data.material.emissiveIntensity = base + wirePulse;
      }

      // 2. Animate Electron Stream along the 3D Bézier curve
      const instancedElectrons = data.instancedElectrons;
      const progress = data.electronProgress;
      const curve = data.curve;
      const count = data.electronCount || 24;

      if (instancedElectrons && progress && curve) {
        for (let i = 0; i < count; i++) {
          if (isFlowing) {
            // Forward drift along curve towards target terminal
            progress[i] = (progress[i] + driftSpeed * delta) % 1.0;
            const pt = curve.getPointAt(progress[i]);
            this.dummy.position.copy(pt);

            // Subtle pulsing of electrons while in energetic motion
            const pulseScale = 1.0 + Math.sin(time * 9.0 + i) * 0.18;
            this.dummy.scale.set(pulseScale, pulseScale, pulseScale);
          } else {
            // Stationary with microscopic thermal Brownian jiggle (< 0.4mm)
            const pt = curve.getPointAt(progress[i]);
            const jiggle = Math.sin(time * 4.0 + i) * 0.0003;
            this.dummy.position.set(pt.x, pt.y + jiggle, pt.z);
            this.dummy.scale.set(0.65, 0.65, 0.65);
          }

          this.dummy.updateMatrix();
          instancedElectrons.setMatrixAt(i, this.dummy.matrix);
        }
        instancedElectrons.instanceMatrix.needsUpdate = true;
      }
    });
  }

  /**
   * Remove a wire mesh by connection ID.
   */
  removeWire(connectionId) {
    const wireGroup = this.wireMeshMap.get(connectionId);
    if (wireGroup) {
      this.scene.remove(wireGroup);
      wireGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      this.wireMeshMap.delete(connectionId);
    }
  }

  /**
   * Remove all rendered wire meshes.
   */
  clearAllWires() {
    this.wireMeshMap.forEach((wireGroup) => {
      this.scene.remove(wireGroup);
      wireGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    });
    this.wireMeshMap.clear();
  }

  /**
   * Get all clickable tube meshes for raycast selection/removal.
   */
  getClickableWireMeshes() {
    const list = [];
    this.wireMeshMap.forEach((wireGroup) => {
      if (wireGroup.userData) {
        if (wireGroup.userData.hitMesh) list.push(wireGroup.userData.hitMesh);
        if (wireGroup.userData.tubeMesh) list.push(wireGroup.userData.tubeMesh);
      }
    });
    return list;
  }
}
