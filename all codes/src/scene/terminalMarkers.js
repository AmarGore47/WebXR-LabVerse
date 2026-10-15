/**
 * terminalMarkers.js
 * Independent overlay displaying small colored terminal markers (dots)
 * for circuit snap points:
 * - Red dot = positive terminal (+)
 * - Dark/black dot = negative terminal (-)
 * - Yellow dot = normal connection terminal
 *
 * Governed by SHOW_DEBUG_TERMINALS from terminalDefinitions.js.
 */

import * as THREE from 'three';
import { TERMINAL_DEFINITIONS, SHOW_DEBUG_TERMINALS } from '../config/terminalDefinitions.js';

export class TerminalMarkers {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'DebugTerminalMarkersGroup';
    this.visible = SHOW_DEBUG_TERMINALS;

    this.markerMeshes = [];
    this.clickableHitSpheres = [];
    this.selectedTerminalId = null;

    this.createMarkers();
    this.scene.add(this.group);
    this.group.visible = this.visible;
  }

  createMarkers() {
    TERMINAL_DEFINITIONS.forEach((term) => {
      const container = new THREE.Group();
      container.position.set(...term.position);

      // 1. Colored terminal dot sphere
      const dotGeo = new THREE.SphereGeometry(0.018, 16, 16);
      const dotMat = new THREE.MeshStandardMaterial({
        color: term.colorHex,
        emissive: term.colorHex,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.5
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      container.add(dot);

      // 2. Outer alignment beacon ring
      const ringGeo = new THREE.RingGeometry(0.024, 0.036, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: term.colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = 0.018;
      container.add(ring);

      // 3. For negative terminals (black), add a contrasting white perimeter rim
      if (term.type === 'negative') {
        const rimGeo = new THREE.RingGeometry(0.018, 0.022, 24);
        const rimMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide
        });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.z = 0.019;
        container.add(rim);
      }

      // 4. Invisible enlarged hit sphere for comfortable laptop mouse & touch interaction
      const hitGeo = new THREE.SphereGeometry(0.065, 12, 12);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitSphere = new THREE.Mesh(hitGeo, hitMat);
      hitSphere.userData = {
        terminalId: term.id,
        terminalConfig: term,
        container,
        ring,
        dot
      };
      container.add(hitSphere);
      this.clickableHitSpheres.push(hitSphere);

      container.userData = {
        terminalId: term.id,
        terminalConfig: term,
        ring,
        dot
      };

      this.group.add(container);
      this.markerMeshes.push(container);
    });
  }

  /**
   * Snaps marker positions directly to corresponding named 3D meshes in the loaded model.
   */
  syncWithModel(model) {
    if (!model) return;
    const tempPos = new THREE.Vector3();
    this.markerMeshes.forEach((container) => {
      const termId = container.userData.terminalId;
      const targetMesh = model.getObjectByName(termId);
      if (targetMesh) {
        targetMesh.getWorldPosition(tempPos);
        container.position.copy(tempPos);
      }
    });
  }

  /**
   * Set visual highlight for selected terminal.
   */
  setSelectedTerminal(termId) {
    this.selectedTerminalId = termId;

    this.markerMeshes.forEach((container) => {
      const isSelected = container.userData.terminalId === termId;
      const ring = container.userData.ring;
      const dot = container.userData.dot;
      const config = container.userData.terminalConfig;

      if (isSelected) {
        // Bright neon cyan pulse state for selected terminal
        ring.material.color.setHex(0x38bdf8);
        ring.material.opacity = 1.0;
        ring.scale.set(1.4, 1.4, 1.4);
        dot.material.emissive.setHex(0x38bdf8);
        dot.material.emissiveIntensity = 0.8;
      } else if (!container.userData.isGlowed) {
        ring.material.color.setHex(config.colorHex);
        ring.material.opacity = 0.8;
        ring.scale.set(1.0, 1.0, 1.0);
        dot.material.emissive.setHex(config.colorHex);
        dot.material.emissiveIntensity = 0.4;
      }
    });
  }

  /**
   * Set animated sequence glow on specific terminal.
   * @param {string} termId
   * @param {boolean} isGlowed
   * @param {number} colorHex
   * @param {string} role - 'next' (source) or 'target' (destination)
   */
  setTerminalGlow(termId, isGlowed, colorHex = 0x00ffff, role = 'next') {
    const container = this.markerMeshes.find((m) => m.userData.terminalId === termId);
    if (!container) return;
    container.userData.isGlowed = Boolean(isGlowed);
    container.userData.glowColor = colorHex;
    container.userData.glowRole = role;
    const ring = container.userData.ring;
    const dot = container.userData.dot;
    const config = container.userData.terminalConfig;

    if (isGlowed) {
      if (ring && ring.material) {
        ring.material.color.setHex(colorHex);
        ring.material.opacity = 1.0;
      }
      if (dot && dot.material) {
        dot.material.emissive.setHex(colorHex);
        dot.material.emissiveIntensity = 1.4;
      }
    } else {
      if (ring && ring.material) {
        ring.material.color.setHex(config ? config.colorHex : 0xffffff);
        ring.material.opacity = 0.8;
        ring.scale.set(1.0, 1.0, 1.0);
      }
      if (dot && dot.material) {
        dot.material.emissive.setHex(config ? config.colorHex : 0x000000);
        dot.material.emissiveIntensity = 0.4;
        dot.scale.setScalar(1.0);
      }
    }
  }

  clearSelection() {
    this.setSelectedTerminal(null);
  }

  /**
   * Subtle pulsing animation on the outer rings to keep terminals distinguishable.
   * Glowing guided terminals pulse with energetic neon aura and alternating wave.
   */
  update(time, camera = null) {
    if (!this.visible) return;

    this.markerMeshes.forEach((m) => {
      const isSelected = m.userData.terminalId === this.selectedTerminalId;
      const isGlowed = Boolean(m.userData.isGlowed);
      const role = m.userData.glowRole || 'next';
      const ring = m.userData.ring;
      const dot = m.userData.dot;

      if (ring) {
        // Billboard ring towards camera if camera is available so ring never disappears edge-on
        if (camera && isGlowed) {
          ring.quaternion.copy(camera.quaternion);
        }

        if (isSelected) {
          const pulse = 1.35 + Math.sin(time * 9.0) * 0.2;
          ring.scale.set(pulse, pulse, 1.0);
        } else if (isGlowed) {
          // Alternating phase: source terminal pulses first, target pulses 1.3 rad later
          const phase = role === 'target' ? 1.4 : 0.0;
          const glowPulse = 1.75 + Math.sin(time * 8.0 - phase) * 0.55;
          ring.scale.set(glowPulse, glowPulse, 1.0);
          if (dot) {
            const dotPulse = 1.60 + Math.sin(time * 8.0 - phase) * 0.45;
            dot.scale.setScalar(dotPulse);
            if (dot.material) {
              dot.material.emissiveIntensity = 1.2 + Math.sin(time * 8.0 - phase) * 0.6;
            }
          }
        } else {
          const pulse = 1.0 + Math.sin(time * 4.5) * 0.12;
          ring.scale.set(pulse, pulse, 1.0);
          if (dot && dot.scale.x !== 1.0) {
            dot.scale.setScalar(1.0);
          }
        }
      }
    });
  }

  getClickableObjects() {
    return this.clickableHitSpheres;
  }

  getTerminalWorldPosition(termId, outVec = new THREE.Vector3()) {
    const found = this.markerMeshes.find((m) => m.userData.terminalId === termId);
    if (found) {
      return found.getWorldPosition(outVec);
    }
    const def = TERMINAL_DEFINITIONS.find((t) => t.id === termId);
    if (def) {
      return outVec.set(...def.position);
    }
    return outVec.set(0, 0, 0);
  }

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
