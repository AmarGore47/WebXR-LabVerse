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

    // Insulated laboratory wire materials
    this.materials = {
      positive: new THREE.MeshStandardMaterial({
        color: 0xef4444, // Red
        roughness: 0.35,
        metalness: 0.15,
        emissive: 0x220000,
        emissiveIntensity: 0.2
      }),
      negative: new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Dark/black
        roughness: 0.45,
        metalness: 0.1,
        emissive: 0x050b14,
        emissiveIntensity: 0.2
      }),
      series: new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Amber / Yellow
        roughness: 0.35,
        metalness: 0.15,
        emissive: 0x221100,
        emissiveIntensity: 0.2
      }),
      meter: new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Cyan / Blue
        roughness: 0.35,
        metalness: 0.15,
        emissive: 0x001122,
        emissiveIntensity: 0.2
      }),
      warning: new THREE.MeshStandardMaterial({
        color: 0xf97316, // Orange warning
        roughness: 0.4,
        metalness: 0.2,
        emissive: 0x331100,
        emissiveIntensity: 0.3
      }),
      error: new THREE.MeshStandardMaterial({
        color: 0xdc2626, // Bright danger red
        roughness: 0.4,
        metalness: 0.2,
        emissive: 0x440000,
        emissiveIntensity: 0.4
      })
    };

    // Brass terminal lug material
    this.lugMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.85
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
   * without ever dipping into the wooden workbench.
   */
  createWireCurve(posA, posB) {
    const dist = posA.distanceTo(posB);
    const TABLE_SURFACE_Y = 0.804;

    // Midpoint between terminals
    const mid = posA.clone().lerp(posB, 0.5);

    // Natural upward arch height based on span distance
    // Short wires loop up 4-7 cm, long wires arch 8-15 cm above the table
    const arch = Math.min(0.14, 0.035 + dist * 0.09);

    // If the wire is long (e.g. Battery (-) to Resistor Right),
    // bow it slightly forward towards the student (+Z) like an authentic lab return cable
    if (dist > 0.40) {
      mid.z += Math.min(0.14, dist * 0.12);
    }

    // Midpoint Y must always clear the tabletop by at least 3.5 cm
    mid.y = Math.max(TABLE_SURFACE_Y + 0.035, Math.max(posA.y, posB.y) + arch);

    // Cubic control points rising from terminals
    const cp1 = posA.clone().lerp(mid, 0.45);
    cp1.y = Math.max(TABLE_SURFACE_Y + 0.025, Math.max(posA.y + 0.035, mid.y - 0.015));

    const cp2 = posB.clone().lerp(mid, 0.45);
    cp2.y = Math.max(TABLE_SURFACE_Y + 0.025, Math.max(posB.y + 0.035, mid.y - 0.015));

    return new THREE.CubicBezierCurve3(posA.clone(), cp1, cp2, posB.clone());
  }

  /**
   * Render a virtual wire between two 3D positions.
   */
  addWire(connection, posA, posB) {
    const curve = this.createWireCurve(posA, posB);
    // Insulated 10mm laboratory wire
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.0095, 10, false);
    const material = this.getMaterialForConnection(connection);

    const wireGroup = new THREE.Group();
    wireGroup.name = `Wire_${connection.id}`;

    const tubeMesh = new THREE.Mesh(tubeGeo, material);
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;
    tubeMesh.userData = { connectionId: connection.id, isWire: true };
    wireGroup.add(tubeMesh);

    // Generous invisible hit tube (35mm radius) for responsive raycast and finger pinch picking
    const hitGeo = new THREE.TubeGeometry(curve, 20, 0.035, 8, false);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData = { connectionId: connection.id, isWire: true, tubeMesh };
    wireGroup.add(hitMesh);

    // Brass crimp terminal rings at both ends
    [posA, posB].forEach((pos) => {
      const lugGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12);
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
      isWire: true
    };

    // Connection pulse animation
    tubeMesh.scale.set(0.2, 0.2, 0.2);
    let scale = 0.2;
    const animInterval = setInterval(() => {
      scale += 0.2;
      if (scale >= 1.0) {
        tubeMesh.scale.set(1, 1, 1);
        clearInterval(animInterval);
      } else {
        tubeMesh.scale.set(scale, scale, scale);
      }
    }, 20);

    this.scene.add(wireGroup);
    this.wireMeshMap.set(connection.id, wireGroup);
    return wireGroup;
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
