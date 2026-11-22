/**
 * vrWrist3DController.js
 * Pure 3D Physical Laboratory Rheostat Model.
 *
 * Requirements:
 * - Substantial, enlarged scale (~28cm long x 10cm wide x 16cm tall)
 * - PURE 3D APPARATUS ONLY (Zero 2D UI panels, zero text badges, zero buttons)
 * - Authentic Laboratory Rheostat Components:
 *     - Heavy cast-iron / dark metal lab chassis base with beveled edges
 *     - Sturdy end-bracket uprights with knurled brass terminal posts & red/black insulator collars
 *     - Large ceramic core mandrel wound with dense copper resistance coils
 *     - Polished chrome slider guide rail
 *     - Interactive 3D Slider Wiper Collar & Grip Handle:
 *         * Can be pinched & dragged with fingers or laser ray
 *         * Smoothly glides along rail (0.5 Ω – 20.0 Ω)
 *         * Full real-time two-way sync with the 3D table rheostat & simulation!
 * - Perfectly oriented in 3D:
 *     * Top face with coil, rod, and glowing knob ALWAYS faces up towards the student's eyes
 *     * Slides horizontally across field of view
 *     * Smoothly follows left wrist in WebXR; parks upright on workbench if hand is out of view
 *
 * STRICT: Native WebXR Hand-Tracking Only. No controller or gamepad APIs.
 */

import * as THREE from 'three';

export class VRWrist3DController {
  constructor(options = {}) {
    this.scene = options.scene;
    this.simulation = options.simulation;
    this.narration = options.narration;
    this.camera = options.camera;
    this.renderer = options.renderer;

    this.group = new THREE.Group();
    this.group.name = 'VRWrist3DController';
    // Always visible so user can see the 3D model immediately
    this.group.visible = true;

    // Resting position on left workbench surface in front of student (compact & easy to see)
    this.defaultPos = new THREE.Vector3(-0.32, 0.96, 0.28);
    this.group.position.copy(this.defaultPos);

    // Math vectors for hand tracking & orientation
    this.tempWristPos = new THREE.Vector3();
    this.tempCamPos = new THREE.Vector3();
    this.tempTargetPos = new THREE.Vector3();
    this.camDir = new THREE.Vector3();

    // Slider travel along local X axis (9 cm total travel for compact model)
    this.SLIDER_MIN_X = -0.045;
    this.SLIDER_MAX_X = 0.045;

    // Interactive objects array (pure 3D slider handle collider)
    this.clickables = [];

    // Build prominent, enlarged 3D Physical Rheostat (NO UI)
    this._build3DRheostat();

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  _build3DRheostat() {
    this.rheoGroup = new THREE.Group();
    this.rheoGroup.name = 'Wrist3DPhysicalRheostat';

    // Coordinate System of Rheostat:
    // +X : Along the length (sliding direction)
    // +Y : UP (Base -> Coil -> Guide Rail -> Knob Handle)
    // +Z : Depth (Front-to-back width)

    // 1. Laboratory Base Chassis – compact hand-scale size ~14cm long
    const baseW = 0.140; // 14 cm length
    const baseH = 0.012; // 1.2 cm thickness
    const baseD = 0.052; // 5.2 cm width

    const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.85
    });
    this.baseMesh = new THREE.Mesh(baseGeo, baseMat);
    this.baseMesh.position.set(0, baseH / 2, 0);
    this.rheoGroup.add(this.baseMesh);

    // Subtle brushed blue-steel trim plate on top of base
    const trimGeo = new THREE.BoxGeometry(baseW - 0.006, 0.0015, baseD - 0.006);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.9
    });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.set(0, baseH + 0.0008, 0);
    this.rheoGroup.add(trimMesh);

    // 2. Left & Right Support Brackets (End Uprights)
    const uprightW = 0.010;
    const uprightH = 0.040;
    const uprightD = 0.036;
    const bracketGeo = new THREE.BoxGeometry(uprightW, uprightH, uprightD);
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8
    });

    const leftX = -(baseW / 2 - uprightW / 2 - 0.004);
    const rightX = baseW / 2 - uprightW / 2 - 0.004;
    const uprightY = baseH + uprightH / 2;

    const leftUpright = new THREE.Mesh(bracketGeo, bracketMat);
    leftUpright.position.set(leftX, uprightY, 0);
    this.rheoGroup.add(leftUpright);

    const rightUpright = new THREE.Mesh(bracketGeo, bracketMat);
    rightUpright.position.set(rightX, uprightY, 0);
    this.rheoGroup.add(rightUpright);

    // 3. Brass Terminal Posts on both ends
    const termGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.012, 12);
    const termMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.2,
      metalness: 0.95
    });

    const leftTerm = new THREE.Mesh(termGeo, termMat);
    leftTerm.position.set(leftX, uprightY, 0.020);
    leftTerm.rotation.x = Math.PI / 2;
    this.rheoGroup.add(leftTerm);

    const rightTerm = new THREE.Mesh(termGeo, termMat);
    rightTerm.position.set(rightX, uprightY, 0.020);
    rightTerm.rotation.x = Math.PI / 2;
    this.rheoGroup.add(rightTerm);

    // Insulator collars under terminals (Red & Black)
    const insGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.003, 12);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });

    const leftIns = new THREE.Mesh(insGeo, redMat);
    leftIns.position.set(leftX, uprightY, 0.014);
    leftIns.rotation.x = Math.PI / 2;
    this.rheoGroup.add(leftIns);

    const rightIns = new THREE.Mesh(insGeo, blackMat);
    rightIns.position.set(rightX, uprightY, 0.014);
    rightIns.rotation.x = Math.PI / 2;
    this.rheoGroup.add(rightIns);

    // 4. Ceramic Core Mandrel with Copper Wire Windings
    const coilLength = 0.105;
    const coilRadius = 0.014; // 2.8 cm diameter
    const coilY = baseH + 0.022;

    const coreGeo = new THREE.CylinderGeometry(coilRadius, coilRadius, coilLength, 32);
    coreGeo.rotateZ(Math.PI / 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xb45309, // Authentic copper winding color
      roughness: 0.35,
      metalness: 0.85
    });
    this.coilMesh = new THREE.Mesh(coreGeo, coreMat);
    this.coilMesh.position.set(0, coilY, 0);
    this.rheoGroup.add(this.coilMesh);

    // Ribbed wire coil rings
    const numRings = 12;
    const ringSpacing = coilLength / (numRings + 1);
    const ringGeo = new THREE.TorusGeometry(coilRadius + 0.0005, 0.0007, 10, 20);
    ringGeo.rotateY(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.95
    });

    for (let i = 1; i <= numRings; i++) {
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(-coilLength / 2 + i * ringSpacing, coilY, 0);
      this.rheoGroup.add(ringMesh);
    }

    // 5. Chrome Top Slider Guide Rod
    const rodRadius = 0.0025;
    const rodLength = coilLength + 0.010;
    const rodY = coilY + coilRadius + 0.008;

    const rodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLength, 16);
    rodGeo.rotateZ(Math.PI / 2);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.1,
      metalness: 0.98
    });
    const rodMesh = new THREE.Mesh(rodGeo, rodMat);
    rodMesh.position.set(0, rodY, 0);
    this.rheoGroup.add(rodMesh);

    // 6. Interactive 3D Slider Collar & Knob Handle
    this.sliderCollar = new THREE.Group();
    this.sliderCollar.name = 'Wrist3DRheostatSliderCollar';
    this.sliderCollar.position.set(0, rodY, 0);

    // Gunmetal slide block
    const blockGeo = new THREE.BoxGeometry(0.018, 0.018, 0.018);
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.2,
      metalness: 0.9
    });
    const blockMesh = new THREE.Mesh(blockGeo, blockMat);
    this.sliderCollar.add(blockMesh);

    // Contact wiper spring
    const wiperGeo = new THREE.BoxGeometry(0.012, 0.008, 0.010);
    const wiperMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.2,
      metalness: 0.95
    });
    const wiperMesh = new THREE.Mesh(wiperGeo, wiperMat);
    wiperMesh.position.set(0, -0.009, 0);
    this.sliderCollar.add(wiperMesh);

    // Vibrant Amber Grip Knob
    const knobGeo = new THREE.CylinderGeometry(0.009, 0.007, 0.018, 16);
    const knobMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.7
    });
    const knobMesh = new THREE.Mesh(knobGeo, knobMat);
    knobMesh.position.set(0, 0.015, 0);
    this.sliderCollar.add(knobMesh);

    // Top indicator cap on knob
    const capGeo = new THREE.SphereGeometry(0.006, 12, 12);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.5
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(0, 0.025, 0);
    this.sliderCollar.add(capMesh);

    // Invisible collider for pinch & laser interaction
    const colliderGeo = new THREE.BoxGeometry(0.040, 0.045, 0.045);
    const colliderMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const colliderMesh = new THREE.Mesh(colliderGeo, colliderMat);
    colliderMesh.position.set(0, 0.012, 0);
    colliderMesh.userData = {
      isRheostatSlider: true,
      type: 'wrist_rheo_slider',
      sliderRef: this
    };
    this.sliderCollar.add(colliderMesh);
    this.sliderCollider = colliderMesh;
    this.clickables.push(colliderMesh);

    this.rheoGroup.add(this.sliderCollar);
    this.group.add(this.rheoGroup);
  }

  getClickables() {
    return this.clickables;
  }

  /**
   * Set slider handle position based on resistance in Ohms.
   */
  setResistance(ohms) {
    const rMin = 0.5;
    const rMax = 20.0;
    const frac = Math.max(0, Math.min(1, (ohms - rMin) / (rMax - rMin)));
    const targetX = this.SLIDER_MIN_X + frac * (this.SLIDER_MAX_X - this.SLIDER_MIN_X);
    if (this.sliderCollar) {
      this.sliderCollar.position.x = targetX;
    }
  }

  /**
   * Per-frame WebXR loop update.
   * Smoothly tracks student's left wrist and syncs slider.
   */
  update(leftHandObj, delta, camera) {
    this.group.visible = true;
    const cam = camera || this.camera;

    // Two-way synchronization: animate slider collar to match simulation.rheostatResistance
    if (this.simulation && this.sliderCollar) {
      const curR = this.simulation.rheostatResistance || 5.0;
      const rMin = 0.5;
      const rMax = 20.0;
      const frac = Math.max(0, Math.min(1, (curR - rMin) / (rMax - rMin)));
      const targetX = this.SLIDER_MIN_X + frac * (this.SLIDER_MAX_X - this.SLIDER_MIN_X);
      this.sliderCollar.position.x = THREE.MathUtils.lerp(
        this.sliderCollar.position.x,
        targetX,
        Math.min((delta || 0.016) * 16.0, 1.0)
      );
    }

    // Wrist attachment: check for left wrist joint
    let trackedWrist = null;
    if (leftHandObj && leftHandObj.hasValidPose) {
      if (leftHandObj.jointMeshes && leftHandObj.jointMeshes['wrist']) {
        trackedWrist = leftHandObj.jointMeshes['wrist'];
      } else if (leftHandObj.hand && leftHandObj.hand.joints && leftHandObj.hand.joints['wrist']) {
        trackedWrist = leftHandObj.hand.joints['wrist'];
      }
    }

    if (trackedWrist) {
      trackedWrist.getWorldPosition(this.tempWristPos);

      // Camera world position
      if (cam) {
        cam.getWorldPosition(this.tempCamPos);
      } else {
        this.tempCamPos.set(0, 1.5, 1.15);
      }

      // Direction vector from wrist to camera
      this.camDir.subVectors(this.tempCamPos, this.tempWristPos).normalize();

      // Target position: sit ~7.5 cm above wrist towards user's eyes
      this.tempTargetPos.copy(this.tempWristPos)
        .addScaledVector(this.camDir, 0.075)
        .add(new THREE.Vector3(0, 0.025, 0));

      this.group.position.lerp(this.tempTargetPos, 0.35);

      // Orientation:
      // Local +X = horizontal across user's vision (comfortable left-to-right sliding)
      // Local +Y = pointed UP & tilted towards user's eyes (coil & knob face student directly)
      // Local +Z = depth facing student
      if (this.camDir.lengthSq() > 0.01) {
        let up = new THREE.Vector3(0, 1, 0);
        if (Math.abs(this.camDir.y) > 0.92) {
          up.set(0, 0, 1);
        }
        const vX = new THREE.Vector3().crossVectors(up, this.camDir).normalize();
        if (vX.lengthSq() > 0.5) {
          const vY = new THREE.Vector3().copy(this.camDir).add(new THREE.Vector3(0, 0.40, 0)).normalize();
          const vZ = new THREE.Vector3().crossVectors(vX, vY).normalize();
          vY.crossVectors(vZ, vX).normalize();

          const rotMat = new THREE.Matrix4().makeBasis(vX, vY, vZ);
          const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMat);
          if (!isNaN(targetQuat.x) && !isNaN(targetQuat.y) && !isNaN(targetQuat.z)) {
            this.group.quaternion.slerp(targetQuat, 0.35);
          }
        }
      }
    } else {
      // Fallback: proudly parked upright on left workbench table in front of student
      this.group.position.lerp(this.defaultPos, 0.15);

      // Upright on table, facing student
      if (cam) {
        cam.getWorldPosition(this.tempCamPos);
        const lookDir = new THREE.Vector3(this.tempCamPos.x - this.defaultPos.x, 0, this.tempCamPos.z - this.defaultPos.z);
        if (lookDir.lengthSq() > 0.01) {
          lookDir.normalize();
          const vX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), lookDir).normalize();
          const vY = new THREE.Vector3(0, 1, 0);
          const vZ = new THREE.Vector3().crossVectors(vX, vY).normalize();
          const rotMat = new THREE.Matrix4().makeBasis(vX, vY, vZ);
          const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMat);
          if (!isNaN(targetQuat.x) && !isNaN(targetQuat.y)) {
            this.group.quaternion.slerp(targetQuat, 0.15);
          }
        }
      }
    }
  }
}
