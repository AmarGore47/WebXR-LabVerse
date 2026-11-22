/**
 * wireRenderer.js
 * Renders physical 3D curved tube wires with realistic droop, color coding,
 * brass terminal crimps, connection animations, raycast picking, and
 * REAL-TIME X-RAY animated electron streams drifting along the 3D curves.
 *
 * X-Ray / Microscopic Mode:
 *  - Wire insulation becomes transparent holographic neon glass
 *  - Large glowing electron spheres drift inside representing live current
 *  - Speed & density scale physically with electric current (I ∝ v_drift)
 */

import * as THREE from 'three';

export class WireRenderer {
  constructor(scene) {
    this.scene = scene;
    this.wireMeshMap = new Map(); // connectionId -> Group

    // --- X-Ray / Electron Mode State ---
    this.xrayMode = false;

    // Shared reusable dummy for electron instanced transformations
    this.dummy = new THREE.Object3D();

    // Standard insulated laboratory wire materials
    this.materials = {
      positive: new THREE.MeshStandardMaterial({
        color: 0xef4444, roughness: 0.22, metalness: 0.12,
        emissive: 0xb91c1c, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.92
      }),
      negative: new THREE.MeshStandardMaterial({
        color: 0x1e293b, roughness: 0.28, metalness: 0.22,
        emissive: 0x1e3a5f, emissiveIntensity: 0.65,
        transparent: true, opacity: 0.95
      }),
      series: new THREE.MeshStandardMaterial({
        color: 0xf59e0b, roughness: 0.22, metalness: 0.12,
        emissive: 0xd97706, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.92
      }),
      meter: new THREE.MeshStandardMaterial({
        color: 0x06b6d4, roughness: 0.22, metalness: 0.12,
        emissive: 0x0891b2, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.92
      }),
      warning: new THREE.MeshStandardMaterial({
        color: 0xf97316, roughness: 0.28, metalness: 0.18,
        emissive: 0xc2410c, emissiveIntensity: 0.55,
        transparent: true, opacity: 0.92
      }),
      error: new THREE.MeshStandardMaterial({
        color: 0xdc2626, roughness: 0.28, metalness: 0.18,
        emissive: 0x991b1b, emissiveIntensity: 0.65,
        transparent: true, opacity: 0.92
      })
    };

    // X-Ray Mode wire materials — neon holographic glow, very transparent
    this.xrayMaterials = {
      positive: new THREE.MeshStandardMaterial({
        color: 0xff6b6b, roughness: 0.04, metalness: 0.85,
        emissive: 0xff0040, emissiveIntensity: 2.8,
        transparent: true, opacity: 0.18, depthWrite: false
      }),
      negative: new THREE.MeshStandardMaterial({
        color: 0x00f0ff, roughness: 0.04, metalness: 0.85,
        emissive: 0x00f0ff, emissiveIntensity: 2.8,
        transparent: true, opacity: 0.18, depthWrite: false
      }),
      series: new THREE.MeshStandardMaterial({
        color: 0xffd700, roughness: 0.04, metalness: 0.85,
        emissive: 0xffaa00, emissiveIntensity: 2.8,
        transparent: true, opacity: 0.18, depthWrite: false
      }),
      meter: new THREE.MeshStandardMaterial({
        color: 0x00f0ff, roughness: 0.04, metalness: 0.85,
        emissive: 0x00d4ff, emissiveIntensity: 2.8,
        transparent: true, opacity: 0.18, depthWrite: false
      }),
      warning: new THREE.MeshStandardMaterial({
        color: 0xff8c00, roughness: 0.04, metalness: 0.85,
        emissive: 0xff6600, emissiveIntensity: 2.8,
        transparent: true, opacity: 0.18, depthWrite: false
      }),
      error: new THREE.MeshStandardMaterial({
        color: 0xff0000, roughness: 0.04, metalness: 0.85,
        emissive: 0xff0000, emissiveIntensity: 3.2,
        transparent: true, opacity: 0.22, depthWrite: false
      })
    };

    // Polished brass terminal lug ferrule material
    this.lugMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, roughness: 0.2, metalness: 0.9,
      emissive: 0x78350f, emissiveIntensity: 0.2
    });

    // Standard electron bead (sleek, subtle)
    this.electronGeoStandard = new THREE.SphereGeometry(0.0022, 8, 8);
    // X-Ray electron bead (radiant, clearly visible inside transparent insulation)
    this.electronGeoXray = new THREE.SphereGeometry(0.0035, 12, 12);

    // Standard mode electron materials
    this.electronMaterials = {
      cyan:  new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      amber: new THREE.MeshBasicMaterial({ color: 0xfde047 }),
      red:   new THREE.MeshBasicMaterial({ color: 0xf87171 })
    };

    // X-Ray mode electron materials — vivid plasma glow
    this.xrayElectronMaterials = {
      positive: new THREE.MeshBasicMaterial({ color: 0xffee44 }),  // Gold charge carriers
      negative: new THREE.MeshBasicMaterial({ color: 0x00ffff }),  // Cyan plasma
      series:   new THREE.MeshBasicMaterial({ color: 0x55ff99 }),  // Green energy
      meter:    new THREE.MeshBasicMaterial({ color: 0x00ddff }),  // Blue photon
      warning:  new THREE.MeshBasicMaterial({ color: 0xff8800 }),
      error:    new THREE.MeshBasicMaterial({ color: 0xff2200 })
    };
  }

  getMaterialForConnection(conn) {
    if (conn.status === 'error') return this.materials.error;
    if (conn.status === 'warning') return this.materials.warning;
    switch (conn.wireType) {
      case 'positive': return this.materials.positive;
      case 'negative': return this.materials.negative;
      case 'meter':    return this.materials.meter;
      case 'series':
      default:         return this.materials.series;
    }
  }

  getXrayMaterialForConnection(conn) {
    if (conn.status === 'error') return this.xrayMaterials.error;
    if (conn.status === 'warning') return this.xrayMaterials.warning;
    switch (conn.wireType) {
      case 'positive': return this.xrayMaterials.positive;
      case 'negative': return this.xrayMaterials.negative;
      case 'meter':    return this.xrayMaterials.meter;
      case 'series':
      default:         return this.xrayMaterials.series;
    }
  }

  _getXrayElectronMat(conn) {
    if (conn.status === 'error') return this.xrayElectronMaterials.error;
    if (conn.status === 'warning') return this.xrayElectronMaterials.warning;
    switch (conn.wireType) {
      case 'positive': return this.xrayElectronMaterials.positive;
      case 'negative': return this.xrayElectronMaterials.negative;
      case 'meter':    return this.xrayElectronMaterials.meter;
      case 'series':
      default:         return this.xrayElectronMaterials.series;
    }
  }

  /**
   * Generates a 3D curved wire that arches gracefully ABOVE the table surface.
   */
  createWireCurve(posA, posB) {
    const dist = posA.distanceTo(posB);
    const mid = posA.clone().lerp(posB, 0.5);
    // Natural graceful curve that arches visibly above the table surface
    const arch = Math.min(0.065, 0.022 + dist * 0.05);
    // Subtle forward bend so wire does not clip through apparatus bases
    mid.z += Math.min(0.045, 0.015 + dist * 0.035);
    mid.y = Math.max(posA.y, posB.y) + 0.024 + arch;

    const cp1 = posA.clone();
    cp1.y += 0.035; // Gentle upward rise from terminal binding post
    cp1.lerp(mid, 0.35);

    const cp2 = posB.clone();
    cp2.y += 0.035;
    cp2.lerp(mid, 0.35);

    return new THREE.CubicBezierCurve3(posA.clone(), cp1, cp2, posB.clone());
  }

  /**
   * Render a virtual wire between two 3D positions with an inner live electron stream.
   */
  addWire(connection, posA, posB) {
    const curve = this.createWireCurve(posA, posB);
    // Bold, authentic laboratory patch wire gauge (~11.6mm diameter) for crisp VR visibility
    const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.0058, 12, false);

    // Choose material based on current xray state
    const stdMat  = this.getMaterialForConnection(connection).clone();
    const xrayMat = this.getXrayMaterialForConnection(connection).clone();
    const material = this.xrayMode ? xrayMat : stdMat;
    material.depthWrite = true;

    const wireGroup = new THREE.Group();
    wireGroup.name = `Wire_${connection.id}`;

    const tubeMesh = new THREE.Mesh(tubeGeo, material);
    tubeMesh.castShadow = !this.xrayMode;
    tubeMesh.receiveShadow = !this.xrayMode;
    tubeMesh.renderOrder = 8;
    tubeMesh.userData = { connectionId: connection.id, isWire: true };
    wireGroup.add(tubeMesh);

    // Compact invisible hit tube for responsive raycast and picking without blocking terminals
    const hitGeo = new THREE.TubeGeometry(curve, 24, 0.014, 8, false);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData = { connectionId: connection.id, isWire: true, tubeMesh };
    wireGroup.add(hitMesh);

    // Brass crimp terminal rings at both ends
    [posA, posB].forEach((pos) => {
      const lugGeo = new THREE.CylinderGeometry(0.0065, 0.0065, 0.016, 16);
      const lugM = this.xrayMode
        ? new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffa000, emissiveIntensity: 2.2, transparent: true, opacity: 0.65 })
        : this.lugMaterial;
      const lug = new THREE.Mesh(lugGeo, lugM);
      lug.position.copy(pos);
      lug.rotation.x = Math.PI / 2;
      wireGroup.add(lug);
    });

    // ⚡ Electron Stream — X-Ray has dense volumetric electron swarm (56 per wire)
    const ELECTRON_COUNT = this.xrayMode ? 56 : 24;
    const electronGeo = this.xrayMode ? this.electronGeoXray : this.electronGeoStandard;
    const electronMat = this.xrayMode
      ? this._getXrayElectronMat(connection)
      : (connection.wireType === 'positive' ? this.electronMaterials.amber : this.electronMaterials.cyan);

    const instancedElectrons = new THREE.InstancedMesh(electronGeo, electronMat, ELECTRON_COUNT);
    instancedElectrons.renderOrder = 6;
    instancedElectrons.frustumCulled = false;

    const electronProgress = new Float32Array(ELECTRON_COUNT);
    const electronOffsets = new Float32Array(ELECTRON_COUNT * 2); // Radial X/Y offsets for volumetric swarm
    for (let i = 0; i < ELECTRON_COUNT; i++) {
      electronProgress[i] = i / ELECTRON_COUNT;
      const angle = (i * 2.399) % (Math.PI * 2); // Golden ratio spiral
      const radius = this.xrayMode ? 0.0022 : 0.0008;
      electronOffsets[i * 2]     = Math.cos(angle) * radius;
      electronOffsets[i * 2 + 1] = Math.sin(angle) * radius;

      const pt = curve.getPointAt(electronProgress[i]);
      this.dummy.position.set(
        pt.x + electronOffsets[i * 2],
        pt.y + electronOffsets[i * 2 + 1],
        pt.z
      );
      this.dummy.scale.set(1, 1, 1);
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
      stdMat,
      xrayMat,
      baseEmissive: material.emissiveIntensity,
      instancedElectrons,
      electronProgress,
      electronOffsets,
      electronCount: ELECTRON_COUNT,
      isWire: true
    };

    // Connection electrical surge animation
    const baseEmissive = material.emissiveIntensity;
    material.emissiveIntensity = this.xrayMode ? 4.5 : 1.6;
    let flashStep = 0;
    const flashInterval = setInterval(() => {
      flashStep++;
      if (material && material.emissiveIntensity !== undefined) {
        material.emissiveIntensity = Math.max(baseEmissive, (this.xrayMode ? 4.5 : 1.6) - flashStep * 0.28);
      }
      if (flashStep >= 8) {
        if (material) material.emissiveIntensity = baseEmissive;
        clearInterval(flashInterval);
      }
    }, 28);

    this.scene.add(wireGroup);
    this.wireMeshMap.set(connection.id, wireGroup);
    return wireGroup;
  }

  /**
   * Set Sci-Fi / Dark Lab theme for wires (neon laser threads).
   */
  setSciFiMode(isSciFi) {
    this.sciFiMode = !!isSciFi;
    this.wireMeshMap.forEach((wireGroup) => {
      const data = wireGroup.userData;
      if (!data || !data.material) return;
      if (!this.xrayMode) {
        // Boost emissive to neon laser thread in Dark Lab mode
        data.material.emissiveIntensity = this.sciFiMode ? 1.4 : 0.5;
        data.baseEmissive = data.material.emissiveIntensity;
      }
    });
  }

  /**
   * Toggle X-Ray / Microscopic Electron Flow mode.
   * Wires become transparent neon tubes; electrons become large glowing plasma beads.
   * @returns {boolean} new xray state
   */
  toggleXrayMode() {
    this.xrayMode = !this.xrayMode;
    this._applyXrayToAll();
    return this.xrayMode;
  }

  setXrayMode(enabled) {
    this.xrayMode = !!enabled;
    this._applyXrayToAll();
  }

  _applyXrayToAll() {
    this.wireMeshMap.forEach((wireGroup) => {
      const data = wireGroup.userData;
      if (!data) return;

      // Swap tube material
      if (data.tubeMesh) {
        const mat = this.xrayMode ? data.xrayMat : data.stdMat;
        data.tubeMesh.material = mat;
        data.tubeMesh.castShadow = !this.xrayMode;
        data.material = mat;
        data.baseEmissive = mat.emissiveIntensity;
        // Quick surge on toggle
        const targetGlow = this.xrayMode ? 4.5 : (this.sciFiMode ? 1.4 : 0.5);
        mat.emissiveIntensity = targetGlow;
        setTimeout(() => { mat.emissiveIntensity = data.baseEmissive; }, 400);
      }

      // Rebuild electron instanced mesh with new size/material/count
      if (data.instancedElectrons && data.curve) {
        wireGroup.remove(data.instancedElectrons);

        const ELECTRON_COUNT = this.xrayMode ? 56 : 24;
        const electronGeo = this.xrayMode ? this.electronGeoXray : this.electronGeoStandard;
        const conn = data.connection;
        const electronMat = this.xrayMode
          ? this._getXrayElectronMat(conn)
          : (conn.wireType === 'positive' ? this.electronMaterials.amber : this.electronMaterials.cyan);

        const newInst = new THREE.InstancedMesh(electronGeo, electronMat, ELECTRON_COUNT);
        newInst.renderOrder = 6;
        newInst.frustumCulled = false;

        const electronProgress = new Float32Array(ELECTRON_COUNT);
        const electronOffsets = new Float32Array(ELECTRON_COUNT * 2);
        for (let i = 0; i < ELECTRON_COUNT; i++) {
          electronProgress[i] = i / ELECTRON_COUNT;
          const angle = (i * 2.399) % (Math.PI * 2);
          const radius = this.xrayMode ? 0.0035 : 0.001;
          electronOffsets[i * 2]     = Math.cos(angle) * radius;
          electronOffsets[i * 2 + 1] = Math.sin(angle) * radius;

          const pt = data.curve.getPointAt(electronProgress[i]);
          this.dummy.position.set(
            pt.x + electronOffsets[i * 2],
            pt.y + electronOffsets[i * 2 + 1],
            pt.z
          );
          this.dummy.scale.set(1, 1, 1);
          this.dummy.updateMatrix();
          newInst.setMatrixAt(i, this.dummy.matrix);
        }
        newInst.instanceMatrix.needsUpdate = true;
        wireGroup.add(newInst);

        data.instancedElectrons = newInst;
        data.electronProgress = electronProgress;
        data.electronOffsets = electronOffsets;
        data.electronCount = ELECTRON_COUNT;
      }
    });
  }

  /**
   * Update electrical energy pulse and real-time electron drift stream.
   * LIVE PHYSICS SYNC:
   * - Rheostat resistance high -> Current low -> Electrons crawl in visible slow motion.
   * - Rheostat resistance low -> High current -> Electrons fast sprint.
   * - High current load (I > 0.35A) -> Wire warms with glowing thermal pulse.
   * @param {number} time    - Elapsed time in seconds
   * @param {number} current - Live electric current in Amperes
   * @param {number} delta   - Frame delta time in seconds
   */
  update(time, current = 0, delta = 0.016) {
    if (this.wireMeshMap.size === 0) return;

    const isFlowing = current > 0.005;

    // Physical Drift Velocity (I = n * A * q * v_d)
    // Scaled for dramatic educational perception in WebXR:
    // Low current (e.g. 0.08A) -> driftSpeed ~ 0.22 (Slow motion crawl)
    // High current (e.g. 0.60A) -> driftSpeed ~ 4.2 - 5.5 (Hypersonic sprint!)
    let driftSpeed = 0;
    if (isFlowing) {
      if (this.xrayMode) {
        // Dramatic dynamic range in X-Ray mode
        driftSpeed = 0.18 + Math.pow(Math.min(current, 1.2), 1.3) * 6.8;
      } else {
        driftSpeed = 0.12 + Math.min(current, 1.0) * 1.8;
      }
    }

    // Thermal Joule Heating effect (P = I^2 * R)
    // Wire warms and emits a thermal throb when current exceeds 0.30 A
    const heatLoad = isFlowing ? Math.min(1.0, Math.max(0.0, (current - 0.28) / 0.38)) : 0;
    const isWarming = heatLoad > 0.05;
    const thermalPulse = isWarming ? Math.sin(time * 9.0) * (0.4 + heatLoad * 0.8) : 0;

    // Standard wire emissive breathing
    const pulseAmp  = this.xrayMode ? 0.9 : (this.sciFiMode ? 0.35 : 0.14);
    const pulseFreq = this.xrayMode ? 10.0 : 7.0;
    const wirePulse = isFlowing ? Math.sin(time * pulseFreq) * pulseAmp : 0;

    this.wireMeshMap.forEach((wireGroup) => {
      const data = wireGroup.userData;
      if (!data) return;

      // 1. Wire material emissive pulse & Thermal Warming
      if (data.material) {
        const base = data.baseEmissive || (this.xrayMode ? 2.8 : (this.sciFiMode ? 1.4 : 0.5));
        data.material.emissiveIntensity = base + wirePulse + thermalPulse;

        // If wire is warm, tint emissive towards fiery thermo-electric orange
        if (isWarming && this.xrayMode) {
          data.material.emissive.setHex(0xff3b00);
        } else if (this.xrayMode) {
          // Restore native connection emissive
          const origXray = this.getXrayMaterialForConnection(data.connection);
          data.material.emissive.copy(origXray.emissive);
        }
      }

      // 2. Animate electron stream along the 3D Bézier curve
      const instancedElectrons = data.instancedElectrons;
      const progress           = data.electronProgress;
      const offsets            = data.electronOffsets;
      const curve              = data.curve;
      const count              = data.electronCount || 24;

      if (instancedElectrons && progress && curve) {
        for (let i = 0; i < count; i++) {
          const offX = offsets ? offsets[i * 2] : 0;
          const offY = offsets ? offsets[i * 2 + 1] : 0;

          if (isFlowing) {
            progress[i] = (progress[i] + driftSpeed * delta) % 1.0;
            const pt = curve.getPointAt(progress[i]);
            this.dummy.position.set(pt.x + offX, pt.y + offY, pt.z);

            // Scale pulsing: electrons sprint and surge
            let pulseScale;
            if (this.xrayMode) {
              const sprintFactor = Math.min(1.5, 1.0 + heatLoad * 0.5);
              pulseScale = (1.0 + Math.sin(time * 16.0 + i * 0.6) * 0.45) * sprintFactor;
            } else {
              pulseScale = 1.0 + Math.sin(time * 9.0 + i) * 0.18;
            }
            this.dummy.scale.set(pulseScale, pulseScale, pulseScale);
          } else {
            // Stationary: microscopic Brownian thermal jiggle
            const pt     = curve.getPointAt(progress[i]);
            const jiggle = this.xrayMode
              ? Math.sin(time * 6.0 + i) * 0.0012
              : Math.sin(time * 4.0 + i) * 0.0003;
            this.dummy.position.set(pt.x + offX, pt.y + offY + jiggle, pt.z);
            const sz = this.xrayMode ? 0.5 : 0.65;
            this.dummy.scale.set(sz, sz, sz);
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
