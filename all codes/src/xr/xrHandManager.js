/**
 * xrHandManager.js
 * Native WebXR Hand-Tracking Interaction Manager for Maharashtra Std. 10 Physics Lab.
 * STRICT NON-NEGOTIABLES:
 * - Hand tracking ONLY (index pointing, pointer rays, and thumb-index pinch).
 * - NO VR controllers, controller rays, lasers from gamepads, or gamepad APIs.
 * - Hysteresis pinch detection (start at 2.2 cm, release at 3.5 cm).
 * - Dual interaction mode: Direct near-hand proximity touch + Hand Pointer Ray for distance.
 * - Either left or right hand can point, select, wire, toggle, adjust, and remove wires independently.
 */

import * as THREE from 'three';
import { XR_CONFIG } from './xrConfig.js';
import { getTerminalDisplayName } from '../circuit/circuitConfig.js';

// Standard 25 WebXR Joint Names
const JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'
];

// 26 Skeletal Bone Links
const BONE_CONNECTIONS = [
  // Thumb
  ['wrist', 'thumb-metacarpal'],
  ['thumb-metacarpal', 'thumb-phalanx-proximal'],
  ['thumb-phalanx-proximal', 'thumb-phalanx-distal'],
  ['thumb-phalanx-distal', 'thumb-tip'],

  // Index
  ['wrist', 'index-finger-metacarpal'],
  ['index-finger-metacarpal', 'index-finger-phalanx-proximal'],
  ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate'],
  ['index-finger-phalanx-intermediate', 'index-finger-phalanx-distal'],
  ['index-finger-phalanx-distal', 'index-finger-tip'],

  // Middle
  ['wrist', 'middle-finger-metacarpal'],
  ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal'],
  ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate'],
  ['middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal'],
  ['middle-finger-phalanx-distal', 'middle-finger-tip'],

  // Ring
  ['wrist', 'ring-finger-metacarpal'],
  ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal'],
  ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate'],
  ['ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal'],
  ['ring-finger-phalanx-distal', 'ring-finger-tip'],

  // Pinky
  ['wrist', 'pinky-finger-metacarpal'],
  ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal'],
  ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate'],
  ['pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal'],
  ['pinky-finger-phalanx-distal', 'pinky-finger-tip'],

  // Metacarpal palm arches
  ['index-finger-metacarpal', 'middle-finger-metacarpal'],
  ['middle-finger-metacarpal', 'ring-finger-metacarpal'],
  ['ring-finger-metacarpal', 'pinky-finger-metacarpal']
];

export class XRHandManager {
  constructor(options = {}) {
    this.renderer = options.renderer;
    this.scene = options.scene;
    this.cameraRig = options.cameraRig || null;
    this.wireRenderer = options.wireRenderer || null;
    this.startCurrentButton = options.startCurrentButton || null;
    this.interactionController = options.interactionController;
    this.simulation = options.simulation;
    this.terminalMarkers = options.terminalMarkers;
    this.vrWorldPanel = options.vrWorldPanel;
    this.vrHandCircuitHUD = options.vrHandCircuitHUD;
    this.measurementController = options.measurementController;
    this.onFeedback = options.onFeedback || (() => {});

    // Hand tracking state
    this.hands = [];
    this.hasReceivedHandData = false;
    this.sessionStartTime = 0;
    this.missingHandWarningEmitted = false;
    this.activeDrag = null; // { type: 'rheostat', handIndex, startX, startR }
    this.cooldowns = [0, 0];
    this.debugMode = false;

    // Hand pointer raycaster with reach across the laboratory
    this.handRaycaster = new THREE.Raycaster();
    this.handRaycaster.far = 6.0;

    // Temporary math vectors
    this.tempWristPos = new THREE.Vector3();
    this.tempIndexPos = new THREE.Vector3();
    this.tempThumbPos = new THREE.Vector3();
    this.tempKnucklePos = new THREE.Vector3();
    this.tempRayDir = new THREE.Vector3();
    this.tempTargetPos = new THREE.Vector3();
    this.tempJointPos = new THREE.Vector3();
    this.tempPosA = new THREE.Vector3();
    this.tempPosB = new THREE.Vector3();

    // Floating Rheostat 3D Billboard label in VR
    this.initRheostatVRLabel();

    // Setup both WebXR hands (0 and 1)
    this.setupHands();
  }

  setStartCurrentButton(btn) {
    this.startCurrentButton = btn;
  }

  setupHands() {
    const handParent = this.cameraRig || this.scene;

    for (let i = 0; i < 2; i++) {
      const hand = this.renderer.xr.getHand(i);
      handParent.add(hand);

      // 1. Lightweight Fingertip Beacon (Sphere + Outer Ring)
      const beaconGroup = new THREE.Group();

      const coreGeo = new THREE.SphereGeometry(0.009, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: XR_CONFIG.colors.beaconIdle,
        transparent: true,
        opacity: 0.85
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      beaconGroup.add(coreMesh);

      const ringGeo = new THREE.RingGeometry(0.013, 0.016, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: XR_CONFIG.colors.beaconIdle,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      beaconGroup.add(ringMesh);

      beaconGroup.visible = false;
      this.scene.add(beaconGroup);

      // 2. Visible Hand Skeleton (25 Joint Spheres + 26 Cyber Bone Lines)
      const isLeft = (i === 0);
      const skeletonGroup = new THREE.Group();
      skeletonGroup.visible = false;
      this.scene.add(skeletonGroup);

      const jointMat = new THREE.MeshBasicMaterial({
        color: isLeft ? 0x34d399 : 0x38bdf8,
        transparent: true,
        opacity: 0.85
      });
      const tipMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.95
      });

      const jointGeo = new THREE.SphereGeometry(0.005, 10, 10);
      const tipGeo = new THREE.SphereGeometry(0.0065, 12, 12);
      const wristGeo = new THREE.SphereGeometry(0.009, 12, 12);

      const jointMeshes = {};
      JOINT_NAMES.forEach((jName) => {
        const isTip = jName.endsWith('-tip');
        const geo = jName === 'wrist' ? wristGeo : (isTip ? tipGeo : jointGeo);
        const mat = isTip ? tipMat : jointMat;
        const m = new THREE.Mesh(geo, mat);
        skeletonGroup.add(m);
        jointMeshes[jName] = m;
      });

      // Bone line segments
      const bonePositions = new Float32Array(BONE_CONNECTIONS.length * 2 * 3);
      const boneGeo = new THREE.BufferGeometry();
      boneGeo.setAttribute('position', new THREE.BufferAttribute(bonePositions, 3));
      const boneMat = new THREE.LineBasicMaterial({
        color: isLeft ? 0x10b981 : 0x0ea5e9,
        transparent: true,
        opacity: 0.65
      });
      const boneLines = new THREE.LineSegments(boneGeo, boneMat);
      skeletonGroup.add(boneLines);

      // 3. Visible Hand Laser Ray & Reticle (for pointing at UI, buttons, terminals, and wires)
      const rayGroup = new THREE.Group();
      rayGroup.visible = false;
      this.scene.add(rayGroup);

      const rayPositions = new Float32Array(6);
      const rayGeo = new THREE.BufferGeometry();
      rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPositions, 3));
      const rayMat = new THREE.LineBasicMaterial({
        color: isLeft ? 0x34d399 : 0x38bdf8,
        transparent: true,
        opacity: 0.85
      });
      const rayLine = new THREE.Line(rayGeo, rayMat);
      rayGroup.add(rayLine);

      // Laser dot & target reticle at ray endpoint
      const reticleGroup = new THREE.Group();
      reticleGroup.visible = false;
      this.scene.add(reticleGroup);

      const retRingGeo = new THREE.RingGeometry(0.012, 0.018, 24);
      const retRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const retRing = new THREE.Mesh(retRingGeo, retRingMat);
      reticleGroup.add(retRing);

      const retDotGeo = new THREE.CircleGeometry(0.005, 16);
      const retDotMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });
      const retDot = new THREE.Mesh(retDotGeo, retDotMat);
      reticleGroup.add(retDot);

      const handData = {
        hand,
        index: i,
        handedness: isLeft ? 'left' : 'right',
        beaconGroup,
        coreMesh,
        ringMesh,
        coreMat,
        ringMat,
        skeletonGroup,
        jointMeshes,
        boneGeo,
        bonePositions,
        rayGroup,
        rayGeo,
        rayPositions,
        rayMat,
        reticleGroup,
        retRingMat,
        retDotMat,
        rayHoverInfo: null,
        nativePinch: false,
        pinched: false,
        lastHoverTarget: null,
        lastHoverTime: 0,
        smoothedIndexPos: new THREE.Vector3(),
        smoothedThumbPos: new THREE.Vector3(),
        smoothedRayDir: new THREE.Vector3(0, 0, -1),
        hasInitRayDir: false,
        hasValidPose: false,
        hoveredTerminal: null,
        hoveredButton: null
      };

      hand.addEventListener('connected', (event) => {
        if (event.data && event.data.handedness) {
          handData.handedness = event.data.handedness;
          console.log(`[XRHandManager] Hand ${i} connected with handedness: ${handData.handedness}`);
        }
      });

      hand.addEventListener('disconnected', () => {
        handData.hasValidPose = false;
        handData.skeletonGroup.visible = false;
        handData.beaconGroup.visible = false;
        handData.rayGroup.visible = false;
        handData.reticleGroup.visible = false;
      });

      // Listen to native WebXR pinch events if dispatched by browser
      hand.addEventListener('pinchstart', () => {
        handData.nativePinch = true;
      });

      hand.addEventListener('pinchend', () => {
        handData.nativePinch = false;
      });

      this.hands.push(handData);
    }
  }

  initRheostatVRLabel() {
    this.rheoLabelCanvas = document.createElement('canvas');
    this.rheoLabelCanvas.width = 384;
    this.rheoLabelCanvas.height = 96;
    this.rheoLabelCtx = this.rheoLabelCanvas.getContext('2d');

    this.rheoLabelTex = new THREE.CanvasTexture(this.rheoLabelCanvas);
    const mat = new THREE.MeshBasicMaterial({ map: this.rheoLabelTex, transparent: true });
    const geo = new THREE.PlaneGeometry(0.24, 0.06);
    this.rheoLabelMesh = new THREE.Mesh(geo, mat);
    this.rheoLabelMesh.position.set(0.05, 1.10, -0.05);
    this.rheoLabelMesh.visible = false;
    this.scene.add(this.rheoLabelMesh);
  }

  updateRheostatVRLabel(val) {
    if (!this.rheoLabelCtx) return;
    const ctx = this.rheoLabelCtx;
    ctx.clearRect(0, 0, 384, 96);

    ctx.fillStyle = 'rgba(7, 21, 38, 0.9)';
    ctx.roundRect ? ctx.roundRect(4, 4, 376, 88, 12) : ctx.fillRect(4, 4, 376, 88);
    ctx.fill();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Rh: ${val.toFixed(2)} Ω`, 192, 48);

    this.rheoLabelTex.needsUpdate = true;

    // Anchor dynamically directly above physical slider handle
    if (this.measurementController && this.measurementController.rheostatHandle) {
      this.measurementController.rheostatHandle.getWorldPosition(this.tempTargetPos);
      this.rheoLabelMesh.position.set(this.tempTargetPos.x, this.tempTargetPos.y + 0.15, this.tempTargetPos.z);
    }
  }

  /**
   * Main per-frame hand tracking and raycast update.
   * Called by the animation loop during WebXR session.
   */
  update(delta) {
    if (!this.renderer.xr.isPresenting) {
      this.hands.forEach((h) => {
        h.beaconGroup.visible = false;
        if (h.skeletonGroup) h.skeletonGroup.visible = false;
        if (h.rayGroup) h.rayGroup.visible = false;
        if (h.reticleGroup) h.reticleGroup.visible = false;
      });
      if (this.rheoLabelMesh) this.rheoLabelMesh.visible = false;
      if (this.vrHandCircuitHUD) this.vrHandCircuitHUD.hide();
      this.hasReceivedHandData = false;
      this.sessionStartTime = 0;
      this.missingHandWarningEmitted = false;
      return;
    }

    const now = performance.now();

    if (!this.sessionStartTime) {
      this.sessionStartTime = now;
    }

    // Fallback: If VR session is active but headset hasn't sent real hand joint tracking after 4.5s
    if (
      !this.hasReceivedHandData &&
      !this.missingHandWarningEmitted &&
      now - this.sessionStartTime > 4500
    ) {
      this.missingHandWarningEmitted = true;
      this.onFeedback({
        type: 'warning',
        message: XR_CONFIG.messages.handMissing
      });
    }

    const cam = this.renderer.xr.getCamera();

    this.hands.forEach((handObj) => {
      const hand = handObj.hand;
      if (!hand.joints) {
        handObj.beaconGroup.visible = false;
        handObj.skeletonGroup.visible = false;
        handObj.rayGroup.visible = false;
        handObj.reticleGroup.visible = false;
        handObj.hasValidPose = false;
        return;
      }

      // Crucial: Update world matrix of hand hierarchy before reading joint positions
      hand.updateMatrixWorld(true);

      const wristJoint = hand.joints['wrist'];
      const indexJoint = hand.joints['index-finger-tip'];
      const thumbJoint = hand.joints['thumb-tip'];
      const knuckleJoint = hand.joints['index-finger-phalanx-proximal'] || hand.joints['wrist'];

      // Check if real joint data is present
      if (!indexJoint || !thumbJoint) {
        handObj.beaconGroup.visible = false;
        handObj.skeletonGroup.visible = false;
        handObj.rayGroup.visible = false;
        handObj.reticleGroup.visible = false;
        handObj.hasValidPose = false;
        return;
      }

      indexJoint.getWorldPosition(this.tempIndexPos);
      thumbJoint.getWorldPosition(this.tempThumbPos);
      if (wristJoint) wristJoint.getWorldPosition(this.tempWristPos);
      if (knuckleJoint) knuckleJoint.getWorldPosition(this.tempKnucklePos);

      // Verify position is valid (not at origin or NaN)
      if (this.tempIndexPos.lengthSq() < 0.001) {
        handObj.beaconGroup.visible = false;
        handObj.skeletonGroup.visible = false;
        handObj.rayGroup.visible = false;
        handObj.reticleGroup.visible = false;
        handObj.hasValidPose = false;
        return;
      }

      // Mark hand tracking data as successfully received
      if (!this.hasReceivedHandData) {
        this.hasReceivedHandData = true;
        this.onFeedback({
          type: 'success',
          message: XR_CONFIG.messages.handActive
        });
      }

      handObj.hasValidPose = true;
      handObj.skeletonGroup.visible = true;

      // Update visible hand skeleton joint meshes and bones
      JOINT_NAMES.forEach((jName) => {
        const j = hand.joints[jName];
        const mesh = handObj.jointMeshes[jName];
        if (j && mesh) {
          j.getWorldPosition(this.tempJointPos);
          mesh.position.copy(this.tempJointPos);
        }
      });

      let bIdx = 0;
      for (let c = 0; c < BONE_CONNECTIONS.length; c++) {
        const [jA, jB] = BONE_CONNECTIONS[c];
        const jointA = hand.joints[jA];
        const jointB = hand.joints[jB];
        if (jointA && jointB) {
          jointA.getWorldPosition(this.tempPosA);
          jointB.getWorldPosition(this.tempPosB);
          handObj.bonePositions[bIdx++] = this.tempPosA.x;
          handObj.bonePositions[bIdx++] = this.tempPosA.y;
          handObj.bonePositions[bIdx++] = this.tempPosA.z;
          handObj.bonePositions[bIdx++] = this.tempPosB.x;
          handObj.bonePositions[bIdx++] = this.tempPosB.y;
          handObj.bonePositions[bIdx++] = this.tempPosB.z;
        }
      }
      handObj.boneGeo.attributes.position.needsUpdate = true;

      // Apply light exponential smoothing to reduce tracking jitter
      const s = XR_CONFIG.smoothingFactor;
      handObj.smoothedIndexPos.lerp(this.tempIndexPos, 1.0 - s);
      handObj.smoothedThumbPos.lerp(this.tempThumbPos, 1.0 - s);

      // Position fingertip beacon at index fingertip
      handObj.beaconGroup.position.copy(handObj.smoothedIndexPos);
      handObj.beaconGroup.visible = true;

      // Measure Thumb-Index Pinch Distance
      const pinchDist = handObj.smoothedIndexPos.distanceTo(handObj.smoothedThumbPos);

      // Apply Hysteresis: pinch starts at 2.2 cm, releases at 3.5 cm
      let isPinching = handObj.pinched;
      if (!handObj.pinched && (pinchDist < XR_CONFIG.pinchStartDistance || handObj.nativePinch)) {
        isPinching = true;
      } else if (handObj.pinched && pinchDist > XR_CONFIG.pinchEndDistance && !handObj.nativePinch) {
        isPinching = false;
      }

      // ─── STABLE, PRECISE HAND LASER POINTER FROM WRIST ───────
      const rayOrigin = this.tempWristPos.lengthSq() > 0.001 ? this.tempWristPos : this.tempKnucklePos;

      // Rigid anatomical aim vector: use middle knuckle (MCP joint) as the exact anatomical centerline of the hand.
      // This completely eliminates any sideways slant (since middle finger is at X=0 on the forearm axis)
      // and does NOT flex when thumb and index fingers pinch!
      const midKnuckle = hand.joints['middle-finger-phalanx-proximal'] || hand.joints['middle-finger-metacarpal'];
      const idxKnuckle = hand.joints['index-finger-phalanx-proximal'];
      if (midKnuckle && idxKnuckle) {
        // Average position of index and middle knuckles: points right along the pinch line
        midKnuckle.getWorldPosition(this.tempPosA);
        idxKnuckle.getWorldPosition(this.tempPosB);
        this.tempPosA.add(this.tempPosB).multiplyScalar(0.5);
      } else if (midKnuckle) {
        midKnuckle.getWorldPosition(this.tempPosA);
      } else {
        this.tempPosA.copy(this.tempKnucklePos);
      }

      // Aim from wrist through the center knuckle bridge towards target
      this.tempRayDir.subVectors(this.tempPosA, rayOrigin).normalize();
      if (this.tempRayDir.lengthSq() < 0.5) {
        this.tempRayDir.set(0, 0, -1);
      } else {
        // Natural upward pitch bias (+10° / +0.14) so resting/relaxed hand points comfortably forward
        this.tempRayDir.y += 0.14;
        this.tempRayDir.normalize();
      }

      // Responsive aiming with pinch anti-slip damping:
      // While aiming: fast 0.65 lerp gives crisp, zero-latency cursor response.
      // While pinching: gentle 0.14 lerp locks the reticle firmly in place so curling fingers does not slip off target!
      const lerpSpeed = isPinching ? 0.14 : 0.65;

      if (!handObj.hasInitRayDir) {
        handObj.smoothedRayDir.copy(this.tempRayDir);
        handObj.hasInitRayDir = true;
      } else {
        handObj.smoothedRayDir.lerp(this.tempRayDir, lerpSpeed).normalize();
      }

      this.handRaycaster.set(rayOrigin, handObj.smoothedRayDir);

      // Gather candidate interactable objects in the scene
      const candidates = [];
      if (this.vrWorldPanel) {
        candidates.push(...this.vrWorldPanel.getButtons());
      }
      if (this.terminalMarkers) {
        candidates.push(...this.terminalMarkers.getClickableObjects());
      }
      if (this.wireRenderer) {
        candidates.push(...this.wireRenderer.getClickableWireMeshes());
      }
      if (this.startCurrentButton && this.startCurrentButton.getClickableObjects) {
        candidates.push(...this.startCurrentButton.getClickableObjects());
      }
      if (this.measurementController && this.measurementController.switchLever) {
        candidates.push(this.measurementController.switchLever);
      }
      if (this.measurementController && this.measurementController.rheostatHandle) {
        candidates.push(this.measurementController.rheostatHandle);
      }
      if (this.vrHandCircuitHUD && this.vrHandCircuitHUD.group.visible) {
        if (this.vrHandCircuitHUD.getButtons) {
          candidates.push(...this.vrHandCircuitHUD.getButtons());
        } else if (this.vrHandCircuitHUD.toggleTabBtn) {
          candidates.push(this.vrHandCircuitHUD.toggleTabBtn);
        }
        if (this.vrHandCircuitHUD.displayMesh) candidates.push(this.vrHandCircuitHUD.displayMesh);
      }

      const rayHits = this.handRaycaster.intersectObjects(candidates, true);
      let hitTarget = null;
      let hitDist = 3.5;
      let hitPoint = rayOrigin.clone().addScaledVector(handObj.smoothedRayDir, 3.5);

      if (rayHits.length > 0) {
        const topHit = rayHits[0];
        hitDist = topHit.distance;
        hitPoint = topHit.point;

        // Resolve target type
        const obj = topHit.object;
        if (obj.userData && obj.userData.vrButtonId) {
          hitTarget = { type: 'button', id: obj.userData.vrButtonId, target: obj };
        } else if (obj.userData && obj.userData.terminalId) {
          hitTarget = { type: 'terminal', id: obj.userData.terminalId, target: obj };
        } else if (obj.parent && obj.parent.userData && obj.parent.userData.connectionId) {
          hitTarget = { type: 'wire', id: obj.parent.userData.connectionId, target: obj };
        } else if (this.startCurrentButton && (obj === this.startCurrentButton.hitBox || obj === this.startCurrentButton.cap)) {
          hitTarget = { type: 'start_button', target: this.startCurrentButton };
        } else if (this.measurementController && (obj === this.measurementController.switchLever || obj.parent === this.measurementController.switchLever)) {
          hitTarget = { type: 'key', target: this.measurementController.switchLever };
        } else if (this.measurementController && (obj === this.measurementController.rheostatHandle || obj.parent === this.measurementController.rheostatHandle)) {
          hitTarget = { type: 'rheostat', target: this.measurementController.rheostatHandle };
        } else if (this.vrHandCircuitHUD && obj.userData && obj.userData.isHUDButton) {
          hitTarget = { type: 'hud_button', id: obj.userData.buttonId, target: obj };
        } else if (this.vrHandCircuitHUD && (obj === this.vrHandCircuitHUD.toggleTabBtn || obj.parent === this.vrHandCircuitHUD.toggleTabBtn || obj === this.vrHandCircuitHUD.displayMesh)) {
          hitTarget = { type: 'hud_button', id: 'hud_toggle_mode', target: this.vrHandCircuitHUD.toggleTabBtn };
        }
      }

      handObj.rayHoverInfo = hitTarget;
      if (hitTarget) {
        handObj.lastHoverTarget = hitTarget;
        handObj.lastHoverTime = now;
      }

      // Update visible laser beam vertices starting at the WRIST
      handObj.rayPositions[0] = rayOrigin.x;
      handObj.rayPositions[1] = rayOrigin.y;
      handObj.rayPositions[2] = rayOrigin.z;
      handObj.rayPositions[3] = hitPoint.x;
      handObj.rayPositions[4] = hitPoint.y;
      handObj.rayPositions[5] = hitPoint.z;
      handObj.rayGeo.attributes.position.needsUpdate = true;
      handObj.rayGroup.visible = true;

      // Update reticle dot at hit point
      handObj.reticleGroup.position.copy(hitPoint);
      if (cam) handObj.reticleGroup.quaternion.copy(cam.quaternion);
      handObj.reticleGroup.visible = true;

      // Color coding laser ray & reticle
      if (hitTarget && hitTarget.type === 'wire') {
        // Red cue indicates wire can be removed/cut
        handObj.rayMat.color.setHex(0xef4444);
        handObj.retRingMat.color.setHex(0xef4444);
        handObj.retDotMat.color.setHex(0xef4444);
        handObj.reticleGroup.scale.setScalar(1.25);
      } else if (hitTarget) {
        handObj.rayMat.color.setHex(0xfbbf24);
        handObj.retRingMat.color.setHex(0xfbbf24);
        handObj.retDotMat.color.setHex(0xfbbf24);
        handObj.reticleGroup.scale.setScalar(1.15);
      } else {
        const idleCol = handObj.index === 0 ? 0x34d399 : 0x38bdf8;
        handObj.rayMat.color.setHex(idleCol);
        handObj.retRingMat.color.setHex(idleCol);
        handObj.retDotMat.color.setHex(idleCol);
        handObj.reticleGroup.scale.setScalar(0.9);
      }

      // Proximity Hover Check (for direct near-hand touching)
      const nearHoverInfo = this.checkProximity(handObj.smoothedIndexPos);
      const activeHover = nearHoverInfo || handObj.rayHoverInfo;

      // Update beacon visuals based on state
      this.updateBeaconAppearance(handObj, isPinching, activeHover);

      // 1. PINCH START EVENT (Click via pinch interaction)
      if (isPinching && !handObj.pinched && now > this.cooldowns[handObj.index]) {
        // Sticky target lock: if activeHover briefly dropped during the finger curling of the pinch gesture,
        // use the securely targeted item from the last 450ms
        let targetToClick = activeHover;
        if (!targetToClick && handObj.lastHoverTarget && (now - handObj.lastHoverTime < 450)) {
          targetToClick = handObj.lastHoverTarget;
        }

        this.handlePinchStart(handObj, targetToClick);
        this.cooldowns[handObj.index] = now + XR_CONFIG.pinchCooldownMs;

        // Visual click feedback: reticle pulses green and expands
        handObj.reticleGroup.scale.setScalar(1.6);
        handObj.retRingMat.color.setHex(0x22c55e);
        handObj.retDotMat.color.setHex(0x22c55e);
      }

      // 2. ACTIVE DRAGGING (e.g. Rheostat Slider Handle)
      if (isPinching && this.activeDrag && this.activeDrag.handIndex === handObj.index) {
        this.handleActiveDrag(handObj.smoothedIndexPos);
      }

      // 3. PINCH END / RELEASE EVENT
      if (!isPinching && handObj.pinched) {
        this.handlePinchEnd(handObj);
      }

      handObj.pinched = isPinching;
    });

    // Aggregate button hover across all hands so neither hand cancels the other's hover
    let activeWorldButtonId = null;
    let activeHUDButtonId = null;
    this.hands.forEach((h) => {
      const hov = h.rayHoverInfo;
      if (hov) {
        if (hov.type === 'button') activeWorldButtonId = hov.id;
        if (hov.type === 'hud_button') activeHUDButtonId = hov.id;
      }
    });

    if (this.vrWorldPanel) {
      this.vrWorldPanel.setHoveredButton(activeWorldButtonId);
    }
    if (this.vrHandCircuitHUD) {
      this.vrHandCircuitHUD.setHovered(Boolean(activeHUDButtonId), activeHUDButtonId);
    }

    // Update Holographic Circuit HUD on tabletop
    if (this.vrHandCircuitHUD) {
      this.vrHandCircuitHUD.update(null, delta);
    }

    // Keep floating VR rheostat label facing user
    if (this.rheoLabelMesh && this.rheoLabelMesh.visible) {
      if (cam) this.rheoLabelMesh.quaternion.copy(cam.quaternion);
    }
  }

  /**
   * Check direct near-hand proximity to interactive apparatus elements.
   */
  checkProximity(fingerPos) {
    // A. Check Physical 3D "Start Current" Push Button
    if (this.startCurrentButton && this.startCurrentButton.group) {
      this.startCurrentButton.group.getWorldPosition(this.tempTargetPos);
      if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.buttonHoverRadius * 1.5) {
        return { type: 'start_button', target: this.startCurrentButton };
      }
    }

    // B. Check Apparatus Terminals
    if (this.terminalMarkers) {
      let closestTerm = null;
      let closestDist = XR_CONFIG.terminalHoverRadius;

      const clickables = this.terminalMarkers.getClickableObjects();
      for (const obj of clickables) {
        obj.getWorldPosition(this.tempTargetPos);
        const dist = fingerPos.distanceTo(this.tempTargetPos);
        if (dist < closestDist) {
          closestDist = dist;
          closestTerm = obj.userData.terminalId;
        }
      }

      if (closestTerm) {
        return { type: 'terminal', id: closestTerm };
      }
    }

    // C. Check Rheostat Slider Handle
    if (this.measurementController && this.measurementController.rheostatHandle) {
      this.measurementController.rheostatHandle.getWorldPosition(this.tempTargetPos);
      if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.rheostatHoverRadius) {
        return { type: 'rheostat', target: this.measurementController.rheostatHandle };
      }
    }

    // D. Check Physical Plug Key Lever
    if (this.measurementController && this.measurementController.switchLever) {
      this.measurementController.switchLever.getWorldPosition(this.tempTargetPos);
      if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.switchHoverRadius) {
        return { type: 'key', target: this.measurementController.switchLever };
      }
    }

    // E. Check 3D Wires for Direct Touch Disconnection
    if (this.wireRenderer) {
      const wireMeshes = this.wireRenderer.getClickableWireMeshes();
      for (const mesh of wireMeshes) {
        mesh.getWorldPosition(this.tempTargetPos);
        if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.terminalHoverRadius) {
          const wireGroup = mesh.parent;
          if (wireGroup && wireGroup.userData && wireGroup.userData.connectionId) {
            return { type: 'wire', id: wireGroup.userData.connectionId, target: mesh };
          }
        }
      }
    }

    // F. Check VR World Panel Buttons
    if (this.vrWorldPanel) {
      const buttons = this.vrWorldPanel.getButtons();
      for (const btn of buttons) {
        btn.getWorldPosition(this.tempTargetPos);
        if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.buttonHoverRadius) {
          return { type: 'button', id: btn.userData.vrButtonId, target: btn };
        }
      }
    }

    // G. Check VR Left Hand HUD Toggle View Button
    if (this.vrHandCircuitHUD && this.vrHandCircuitHUD.toggleTabBtn && this.vrHandCircuitHUD.group.visible) {
      this.vrHandCircuitHUD.toggleTabBtn.getWorldPosition(this.tempTargetPos);
      if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.buttonHoverRadius) {
        return { type: 'hud_button', id: 'toggle_view', target: this.vrHandCircuitHUD.toggleTabBtn };
      }
    }

    return null;
  }

  /**
   * Update fingertip visual beacon depending on state.
   */
  updateBeaconAppearance(handObj, isPinching, hoverInfo) {
    if (isPinching) {
      handObj.coreMat.color.setHex(XR_CONFIG.colors.beaconPinched);
      handObj.ringMat.color.setHex(XR_CONFIG.colors.beaconPinched);
      handObj.beaconGroup.scale.setScalar(1.35);
    } else if (hoverInfo) {
      handObj.coreMat.color.setHex(XR_CONFIG.colors.beaconHover);
      handObj.ringMat.color.setHex(XR_CONFIG.colors.beaconHover);
      handObj.beaconGroup.scale.setScalar(1.15);
    } else {
      handObj.coreMat.color.setHex(XR_CONFIG.colors.beaconIdle);
      handObj.ringMat.color.setHex(XR_CONFIG.colors.beaconIdle);
      handObj.beaconGroup.scale.setScalar(1.0);
    }
  }

  /**
   * Handle Discrete Pinch Start (Touch or Laser Ray).
   */
  handlePinchStart(handObj, hoverInfo) {
    // If no target was hit, but a terminal is currently selected -> Cancel Selection / Unselect
    if (!hoverInfo) {
      if (this.interactionController && this.interactionController.selectedTerminalId) {
        this.interactionController.cancelSelection();
        this.onFeedback({
          type: 'info',
          message: 'Selection cancelled.'
        });
      }
      return;
    }

    // 1. Proximity to Start Current Button: Press
    if (hoverInfo.type === 'start_button') {
      if (this.startCurrentButton) {
        this.startCurrentButton.press();
      }
      return;
    }

    // 2. Proximity or Ray pointing at 3D Wire: Remove wire
    if (hoverInfo.type === 'wire') {
      if (this.interactionController) {
        this.interactionController.handleWireClick(hoverInfo.id);
      }
      return;
    }

    // 3. Proximity or Ray pointing at Terminal: Connect / Select
    if (hoverInfo.type === 'terminal') {
      if (this.interactionController) {
        this.interactionController.handleTerminalClick(hoverInfo.id);
      }
      return;
    }

    // 4. Proximity or Ray pointing at Plug Key: Toggle
    if (hoverInfo.type === 'key') {
      if (this.interactionController) {
        this.interactionController.handleSwitchClick();
      }
      return;
    }

    // 5. Proximity to Rheostat Handle: Start Drag
    if (hoverInfo.type === 'rheostat') {
      const curR = this.simulation ? this.simulation.rheostatResistance : 12.0;
      this.activeDrag = {
        type: 'rheostat',
        handIndex: handObj.index,
        startX: handObj.smoothedIndexPos.x,
        startR: curR
      };
      if (this.rheoLabelMesh) {
        this.updateRheostatVRLabel(curR);
        this.rheoLabelMesh.visible = true;
      }
      return;
    }

    // 6. Proximity or Ray pointing at VR World Panel Button: Trigger Action
    if (hoverInfo.type === 'button') {
      if (this.vrWorldPanel) {
        this.vrWorldPanel.pressButton(hoverInfo.id);
      }
      return;
    }

    // 7. Proximity or Ray pointing at VR Tablet Buttons
    if (hoverInfo.type === 'hud_button') {
      if (hoverInfo.id === 'hud_exit_vr') {
        if (this.vrWorldPanel) {
          this.vrWorldPanel.pressButton('exit_vr');
        } else {
          const session = this.renderer.xr.getSession();
          if (session) session.end();
        }
        this.onFeedback({
          type: 'info',
          message: 'Exiting VR mode...'
        });
        return;
      }

      if (hoverInfo.id === 'hud_undo_wire') {
        if (this.interactionController) {
          this.interactionController.undoLastWire();
        } else if (this.vrWorldPanel) {
          this.vrWorldPanel.pressButton('undo_wire');
        }
        return;
      }

      if (this.vrHandCircuitHUD) {
        this.vrHandCircuitHUD.toggleMode();
        this.onFeedback({
          type: 'info',
          message:
            this.vrHandCircuitHUD.currentMode === 'schematic'
              ? '📸 Table HUD: Photographic Circuit Guide'
              : '📊 Table HUD: Observations & V–I Graph'
        });
      }
      return;
    }
  }

  /**
   * Handle continuous drag during active pinch (Rheostat).
   */
  handleActiveDrag(currentFingerPos) {
    if (!this.activeDrag || this.activeDrag.type !== 'rheostat') return;

    // Movement along X axis relative to drag start
    const deltaX = currentFingerPos.x - this.activeDrag.startX;
    const travel = XR_CONFIG.rheostatDragTravelMeters;

    // Map deltaX to resistance range [0.5, 20.0]
    const deltaFrac = deltaX / travel;
    const rSpan = 20.0 - 0.5;
    const newR = Math.max(0.5, Math.min(20.0, this.activeDrag.startR + deltaFrac * rSpan));

    if (this.simulation) {
      this.simulation.setRheostatResistance(newR);
      this.updateRheostatVRLabel(newR);
    }
  }

  /**
   * Handle Pinch Release.
   */
  handlePinchEnd(handObj) {
    if (this.activeDrag && this.activeDrag.handIndex === handObj.index) {
      this.activeDrag = null;
      if (this.rheoLabelMesh) {
        setTimeout(() => {
          if (!this.activeDrag && this.rheoLabelMesh) {
            this.rheoLabelMesh.visible = false;
          }
        }, 1200);
      }
    }
  }

  setDebug(enable) {
    this.debugMode = enable;
    console.log(`[XRHandManager] Hand tracking debug mode: ${enable}`);
  }

  getDiagnostics() {
    const isPresenting = Boolean(this.renderer && this.renderer.xr && this.renderer.xr.isPresenting);
    const left = this.hands[0];
    const right = this.hands[1];

    return {
      isPresenting,
      hasReceivedHandData: this.hasReceivedHandData,
      leftHand: {
        active: Boolean(left && left.hasValidPose),
        pinched: Boolean(left && left.pinched)
      },
      rightHand: {
        active: Boolean(right && right.hasValidPose),
        pinched: Boolean(right && right.pinched)
      },
      activeDrag: this.activeDrag ? this.activeDrag.type : null
    };
  }
}
