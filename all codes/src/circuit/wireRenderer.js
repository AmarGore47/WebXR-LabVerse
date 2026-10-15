/**
 * wireRenderer.js
 * Renders physical 3D curved tube wires with realistic droop, color coding,
 * brass terminal crimps, connection animations, and raycast picking for wire removal.
 */

import * as THREE from 'three';

export class WireRenderer {
  constructor(scene) {
    this.scene = scene;
    this.wireMeshMap = new Map(); // connectionId -> Group

    // Insulated laboratory wire materials with vibrant, high-contrast colors and emissive glows
    this.materials = {
      positive: new THREE.MeshStandardMaterial({
        color: 0xef4444, // Vibrant Red
        roughness: 0.3,
        metalness: 0.15,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.45
      }),
      negative: new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Dark Slate / Black
        roughness: 0.35,
        metalness: 0.25,
        emissive: 0x475569, // High-contrast slate sheen so it stands out on dark tables
        emissiveIntensity: 0.45
      }),
      series: new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Vibrant Amber / Yellow
        roughness: 0.3,
        metalness: 0.15,
        emissive: 0xd97706,
        emissiveIntensity: 0.45
      }),
      meter: new THREE.MeshStandardMaterial({
        color: 0x06b6d4, // Vibrant Cyan / Blue
        roughness: 0.3,
        metalness: 0.15,
        emissive: 0x0891b2,
        emissiveIntensity: 0.45
      }),
      warning: new THREE.MeshStandardMaterial({
        color: 0xf97316, // Orange warning
        roughness: 0.35,
        metalness: 0.2,
        emissive: 0xc2410c,
        emissiveIntensity: 0.5
      }),
      error: new THREE.MeshStandardMaterial({
        color: 0xdc2626, // Bright danger red
        roughness: 0.35,
        metalness: 0.2,
        emissive: 0x991b1b,
        emissiveIntensity: 0.6
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
   * Render a virtual wire between two 3D positions.
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

    wireGroup.userData = {
      connectionId: connection.id,
      connection,
      tubeMesh,
      hitMesh,
      curve,
      material,
      baseEmissive: material.emissiveIntensity,
      isWire: true
    };

    // Connection electrical surge animation: flash emissive intensity without displacing wire geometry!
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
   * Update electrical energy pulse when current flows through the circuit.
   */
  update(time, current = 0) {
    if (current <= 0.01 || this.wireMeshMap.size === 0) return;

    const pulse = Math.sin(time * 6.0) * 0.12;
    this.wireMeshMap.forEach((wireGroup) => {
      const mat = wireGroup.userData.material;
      const base = wireGroup.userData.baseEmissive || 0.45;
      if (mat) {
        mat.emissiveIntensity = base + pulse;
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
