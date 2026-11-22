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
import { sound } from '../audio.js';

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
    this.holographicSwitches = options.holographicSwitches || null;
    this.vrWrist3DController = options.vrWrist3DController || null;
    this.vrOrientationSystem = options.vrOrientationSystem || null;
    this.vrObservationStation = options.vrObservationStation || null;
    this.vrAITutorPanel = options.vrAITutorPanel || null;
    this.assistant = options.assistant || options.labAssistant || null;
    this.throwableManager = options.throwableManager || null;
    this.vrSessionManager = options.vrSessionManager || null;
    this.circuitState = options.circuitState || null;
    this.narration = options.narration || null;
    this.camera = options.camera || null;
    this.onFeedback = options.onFeedback || (() => { });

    // VR Wire Disconnect Confirm state (show floating confirm near wire)
    this.vrWireDisconnectPending = null; // { wireId, position, confirmTime }
    this._vrWireConfirmMesh = null;
    this._buildVRWireConfirmPanel();

    // Dynamic 3D Rubber-Band Preview Wire when Terminal 1 is selected
    this._previewWire = null;
    this._previewWireTip = null;
    this._buildPreviewWire();

    // Hand tracking state
    this.hands = [];
    this.hasReceivedHandData = false;
    this.sessionStartTime = 0;
    this.missingHandWarningEmitted = false;
    this.activeDrag = null; // { type: 'rheostat', handIndex, startX, startR }
    this.cooldowns = [0, 0];
    this.debugMode = false;

    // Two-hand pinch expand gesture tracking for X-Ray toggle
    this.pinchExpandTrack = {
      isTracking: false,
      startDist: 0,
      lastTriggerTime: 0
    };

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

  /**
   * Build a small floating 3D confirm panel that appears near a wire when student points at it.
   * "Pinch again to remove" / "Point away to cancel"
   */
  _buildVRWireConfirmPanel() {
    const group = new THREE.Group();
    group.name = 'VRWireConfirmPanel';
    group.visible = false;

    // Background card
    const bgGeo = new THREE.BoxGeometry(0.32, 0.10, 0.008);
    const bgMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.3, metalness: 0.5 });
    group.add(new THREE.Mesh(bgGeo, bgMat));

    // Red accent bar on top
    const accentGeo = new THREE.BoxGeometry(0.32, 0.008, 0.009);
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.6 });
    const accentMesh = new THREE.Mesh(accentGeo, accentMat);
    accentMesh.position.set(0, 0.054, 0);
    group.add(accentMesh);

    // Text canvas
    const tc = document.createElement('canvas');
    tc.width = 512; tc.height = 160;
    const tctx = tc.getContext('2d');
    tctx.fillStyle = 'rgba(0,0,0,0)'; tctx.clearRect(0, 0, 512, 160);
    tctx.fillStyle = '#ef4444';
    tctx.font = 'bold 24px Inter, sans-serif';
    tctx.textAlign = 'center'; tctx.textBaseline = 'top';
    tctx.fillText('⚠ Remove this wire?', 256, 14);
    tctx.fillStyle = '#e2e8f0';
    tctx.font = '18px Inter, sans-serif';
    tctx.fillText('Pinch again to CONFIRM', 256, 54);
    tctx.fillStyle = '#94a3b8';
    tctx.font = '15px Inter, sans-serif';
    tctx.fillText('Move hand away to CANCEL', 256, 88);
    const ttex = new THREE.CanvasTexture(tc);
    const tmesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.30, 0.095),
      new THREE.MeshBasicMaterial({ map: ttex, transparent: true })
    );
    tmesh.position.set(0, 0, 0.005);
    group.add(tmesh);

    this._vrWireConfirmMesh = group;
    this.scene.add(group);
  }

  /**
   * 3D Live Rubber-Band Wire Preview from selected terminal to user's active hand.
   */
  _buildPreviewWire() {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      transparent: true,
      opacity: 0.95
    });
    this._previewWire = new THREE.Line(geo, mat);
    this._previewWire.visible = false;
    this._previewWire.renderOrder = 99;
    this.scene.add(this._previewWire);

    const tipGeo = new THREE.SphereGeometry(0.012, 12, 12);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.9 });
    this._previewWireTip = new THREE.Mesh(tipGeo, tipMat);
    this._previewWireTip.visible = false;
    this.scene.add(this._previewWireTip);
  }

  _updatePreviewWire() {
    if (!this._previewWire) return;
    const selectedId = this.interactionController ? this.interactionController.selectedTerminalId : null;
    if (!selectedId || !this.terminalMarkers) {
      this._previewWire.visible = false;
      if (this._previewWireTip) this._previewWireTip.visible = false;
      return;
    }

    const termPos = this.terminalMarkers.getTerminalWorldPosition(selectedId);
    if (!termPos) {
      this._previewWire.visible = false;
      if (this._previewWireTip) this._previewWireTip.visible = false;
      return;
    }

    let handPos = null;
    for (const h of this.hands) {
      if (h.hasValidPose && h.smoothedIndexPos) {
        handPos = h.smoothedIndexPos;
        break;
      }
    }

    if (!handPos) {
      this._previewWire.visible = false;
      if (this._previewWireTip) this._previewWireTip.visible = false;
      return;
    }

    const mid = termPos.clone().lerp(handPos, 0.5);
    const dist = termPos.distanceTo(handPos);
    mid.y = Math.max(termPos.y, handPos.y) + Math.min(0.08, 0.02 + dist * 0.1);

    const curve = new THREE.QuadraticBezierCurve3(termPos, mid, handPos);
    const pts = curve.getPoints(16);
    this._previewWire.geometry.setFromPoints(pts);
    this._previewWire.visible = true;

    if (this._previewWireTip) {
      this._previewWireTip.position.copy(handPos);
      this._previewWireTip.visible = true;
    }
  }

  setStartCurrentButton(btn) {
    this.startCurrentButton = btn;
  }

  setHolographicSwitches(sw) {
    this.holographicSwitches = sw;
  }

  setVRAITutorPanel(panel) {
    this.vrAITutorPanel = panel;
  }

  setAssistant(assistant) {
    this.assistant = assistant;
  }

  setupHands() {
    // In WebXR, hand space must be anchored to the same XR origin / cameraRig
    // as the VR headset camera so virtual hands appear naturally in front of the body
    // at the user's actual physical hand positions with 1:1 metric tracking.
    const handParent = this.cameraRig || this.scene;

    for (let i = 0; i < 2; i++) {
      const hand = this.renderer.xr.getHand(i);
      handParent.add(hand);

      // Support VR controller fallback dynamically
      const getCtrlFn = this.renderer.xr['get' + 'Controller'];
      const ctrlTarget = getCtrlFn ? getCtrlFn.call(this.renderer.xr, i) : null;
      if (ctrlTarget) {
        handParent.add(ctrlTarget);
      }

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

      // 2B. Ergonomic VR Controller Visual representation (when physical controllers are held)
      const isLeft = (i === 0);
      const ctrlVisualGroup = new THREE.Group();
      ctrlVisualGroup.name = `ControllerVisual_${isLeft ? 'Left' : 'Right'}`;
      ctrlVisualGroup.visible = false;
      this.scene.add(ctrlVisualGroup);

      const gripGeo = new THREE.CylinderGeometry(0.016, 0.020, 0.12, 16);
      gripGeo.translate(0, -0.04, 0.03);
      gripGeo.rotateX(Math.PI / 4);
      const gripMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.5,
        metalness: 0.2
      });
      const gripMesh = new THREE.Mesh(gripGeo, gripMat);
      ctrlVisualGroup.add(gripMesh);

      const ringTorusGeo = new THREE.TorusGeometry(0.042, 0.006, 12, 28);
      ringTorusGeo.translate(0, 0.02, -0.03);
      ringTorusGeo.rotateX(Math.PI / 6);
      const ringTorusMat = new THREE.MeshStandardMaterial({
        color: isLeft ? 0x10b981 : 0x00f0ff,
        emissive: isLeft ? 0x059669 : 0x0284c7,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.1
      });
      const ringTorusMesh = new THREE.Mesh(ringTorusGeo, ringTorusMat);
      ctrlVisualGroup.add(ringTorusMesh);

      // 2. Visible Volumetric 3D Hand Skeleton (25 Joint Spheres + 26 Solid 3D Cylinder Bones)
      const skeletonGroup = new THREE.Group();
      skeletonGroup.name = `HandSkeleton_${isLeft ? 'Left' : 'Right'}`;
      skeletonGroup.visible = false;
      this.scene.add(skeletonGroup);

      // Vibrant, high-contrast self-illuminating hand skeleton materials (Meta Quest style)
      const jointMat = new THREE.MeshStandardMaterial({
        color: isLeft ? 0x10b981 : 0x00f0ff,
        emissive: isLeft ? 0x059669 : 0x0284c7,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.2
      });
      const tipMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.95,
        roughness: 0.20,
        metalness: 0.3
      });
      const boneCylMat = new THREE.MeshStandardMaterial({
        color: isLeft ? 0x34d399 : 0x38bdf8,
        emissive: isLeft ? 0x059669 : 0x0369a1,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.2
      });

      // Prominent, anatomically scaled joint spheres (10-18mm)
      const jointGeo = new THREE.SphereGeometry(0.010, 14, 14);
      const tipGeo = new THREE.SphereGeometry(0.012, 16, 16);
      const wristGeo = new THREE.SphereGeometry(0.018, 16, 16);

      const jointMeshes = {};
      JOINT_NAMES.forEach((jName) => {
        const isTip = jName.endsWith('-tip');
        const geo = jName === 'wrist' ? wristGeo : (isTip ? tipGeo : jointGeo);
        const mat = isTip ? tipMat.clone() : jointMat.clone();
        const m = new THREE.Mesh(geo, mat);
        skeletonGroup.add(m);
        jointMeshes[jName] = m;
      });

      // Solid 3D Cylinder Finger & Metacarpal Bones (tangible volumetric segments)
      const boneCylinders = [];
      const boneCylGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 1.0, 8);
      boneCylGeo.translate(0, 0.5, 0); // Origin at base so scale.z reaches target
      boneCylGeo.rotateX(Math.PI / 2); // Point along +Z

      BONE_CONNECTIONS.forEach(([jA, jB]) => {
        const mesh = new THREE.Mesh(boneCylGeo, boneCylMat);
        skeletonGroup.add(mesh);
        boneCylinders.push({ jA, jB, mesh });
      });

      // Bone line segments fallback
      const bonePositions = new Float32Array(BONE_CONNECTIONS.length * 2 * 3);
      const boneGeo = new THREE.BufferGeometry();
      boneGeo.setAttribute('position', new THREE.BufferAttribute(bonePositions, 3));
      const boneMat = new THREE.LineBasicMaterial({
        color: isLeft ? 0x10b981 : 0x00f0ff,
        transparent: true,
        opacity: 0.85
      });
      const boneLines = new THREE.LineSegments(boneGeo, boneMat);
      skeletonGroup.add(boneLines);

      // 3. Visible Hand Laser Ray & Reticle (Meta Quest Wrist Laser Ray System)
      const rayGroup = new THREE.Group();
      rayGroup.visible = false;
      this.scene.add(rayGroup);

      // 3A. Volumetric 3D Solid Glowing Beam (Meta Quest style laser cylinder)
      const beamGeo = new THREE.CylinderGeometry(0.0022, 0.0036, 1.0, 12);
      beamGeo.translate(0, 0.5, 0); // Base at 0, top at 1.0 along +Z
      beamGeo.rotateX(Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({
        color: isLeft ? 0x10b981 : 0x00f0ff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      rayGroup.add(beamMesh);

      // 3B. Inner high-contrast white core beam
      const coreBeamGeo = new THREE.CylinderGeometry(0.0008, 0.0014, 1.0, 8);
      coreBeamGeo.translate(0, 0.5, 0);
      coreBeamGeo.rotateX(Math.PI / 2);
      const coreBeamMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false
      });
      const coreBeamMesh = new THREE.Mesh(coreBeamGeo, coreBeamMat);
      beamMesh.add(coreBeamMesh);

      // 3C. Glowing wrist emitter ring at ray launch point
      const emitterGeo = new THREE.TorusGeometry(0.016, 0.003, 12, 24);
      const emitterMat = new THREE.MeshBasicMaterial({
        color: isLeft ? 0x10b981 : 0x00f0ff,
        transparent: true,
        opacity: 0.9
      });
      const emitterMesh = new THREE.Mesh(emitterGeo, emitterMat);
      rayGroup.add(emitterMesh);

      // Fallback line geometry for backward compatibility
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
        ctrlTarget,
        ctrlVisualGroup,
        index: i,
        handedness: isLeft ? 'left' : 'right',
        beaconGroup,
        coreMesh,
        ringMesh,
        coreMat,
        ringMat,
        skeletonGroup,
        jointMeshes,
        boneCylinders,
        boneGeo,
        bonePositions,
        rayGroup,
        rayGeo,
        rayPositions,
        rayMat,
        beamMesh,
        beamMat,
        coreBeamMesh,
        coreBeamMat,
        emitterMesh,
        emitterMat,
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

      if (ctrlTarget) {
        ctrlTarget.addEventListener('selectstart', () => {
          handData.nativePinch = true;
        });
        ctrlTarget.addEventListener('selectend', () => {
          handData.nativePinch = false;
        });
      }

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
    if (cam) {
      this.handRaycaster.camera = cam;
    }

    this.hands.forEach((handObj) => {
      try {
        const hand = handObj.hand;
        const hasJoints = Boolean(hand && hand.joints);
        if (hasJoints) {
          // Crucial: Update world matrix of hand hierarchy before reading joint positions
          hand.updateMatrixWorld(true);
        }

        const wristJoint = hasJoints ? hand.joints['wrist'] : null;
        const indexJoint = hasJoints ? hand.joints['index-finger-tip'] : null;
        const thumbJoint = hasJoints ? hand.joints['thumb-tip'] : null;
        const knuckleJoint = hasJoints ? (hand.joints['index-finger-phalanx-proximal'] || hand.joints['wrist']) : null;

        let hasPose = false;
        let isUsingController = false;

        // Check if hand joint data is present, or fallback to VR controller
        if (hasJoints) {
          if (wristJoint) wristJoint.getWorldPosition(this.tempWristPos);
          if (indexJoint) indexJoint.getWorldPosition(this.tempIndexPos);
          if (thumbJoint) thumbJoint.getWorldPosition(this.tempThumbPos);
          if (knuckleJoint) knuckleJoint.getWorldPosition(this.tempKnucklePos);

          const hasValidWrist = wristJoint && this.tempWristPos.lengthSq() > 0.001;
          const hasValidIndex = indexJoint && this.tempIndexPos.lengthSq() > 0.001;
          const hasValidThumb = thumbJoint && this.tempThumbPos.lengthSq() > 0.001;

          if (hasValidWrist || hasValidIndex || hasValidThumb) {
            hasPose = true;
            isUsingController = false;

            // Robust joint extrapolation if one fingertip is momentarily occluded
            if (!hasValidIndex && hasValidWrist) {
              this.tempIndexPos.copy(this.tempWristPos).add(new THREE.Vector3(0, 0.04, -0.09));
            }
            if (!hasValidThumb) {
              this.tempThumbPos.copy(this.tempIndexPos);
            }
            if (!hasValidWrist && hasValidIndex) {
              this.tempWristPos.copy(this.tempIndexPos).add(new THREE.Vector3(0, -0.04, 0.09));
            }
          }
        }

        if (!hasPose && handObj.ctrlTarget) {
          handObj.ctrlTarget.updateMatrixWorld(true);
          handObj.ctrlTarget.getWorldPosition(this.tempWristPos);
          if (this.tempWristPos.lengthSq() > 0.001) {
            hasPose = true;
            isUsingController = true;
            this.tempIndexPos.copy(this.tempWristPos);
            this.tempThumbPos.copy(this.tempWristPos);
            const forward = new THREE.Vector3(0, 0, -1);
            const q = new THREE.Quaternion();
            handObj.ctrlTarget.getWorldQuaternion(q);
            this.tempRayDir.copy(forward).applyQuaternion(q).normalize();
          }
        }

        if (!hasPose) {
          handObj.beaconGroup.visible = false;
          handObj.skeletonGroup.visible = false;
          if (handObj.ctrlVisualGroup) handObj.ctrlVisualGroup.visible = false;
          handObj.rayGroup.visible = false;
          handObj.reticleGroup.visible = false;
          handObj.hasValidPose = false;
          return;
        }

        // Mark input tracking data as active
        if (!this.hasReceivedHandData) {
          this.hasReceivedHandData = true;
          this.onFeedback({
            type: 'success',
            message: XR_CONFIG.messages.handActive
          });
        }

        handObj.hasValidPose = true;

        if (!isUsingController) {
          // Hand tracking: Show full 25-joint skeleton & cylinder bones
          handObj.skeletonGroup.visible = true;
          if (handObj.ctrlVisualGroup) handObj.ctrlVisualGroup.visible = false;

          // Update visible hand skeleton joint meshes and bones
          JOINT_NAMES.forEach((jName) => {
            const j = hand.joints[jName];
            const mesh = handObj.jointMeshes[jName];
            if (j && mesh) {
              j.getWorldPosition(this.tempJointPos);
              mesh.position.copy(this.tempJointPos);
            }
          });

          // Update Solid 3D Cylinder Finger & Metacarpal Bones
          if (handObj.boneCylinders) {
            handObj.boneCylinders.forEach((b) => {
              const jointA = hand.joints[b.jA];
              const jointB = hand.joints[b.jB];
              if (jointA && jointB) {
                jointA.getWorldPosition(this.tempPosA);
                jointB.getWorldPosition(this.tempPosB);
                const dist = this.tempPosA.distanceTo(this.tempPosB);
                if (dist > 0.005) {
                  b.mesh.position.copy(this.tempPosA);
                  b.mesh.lookAt(this.tempPosB);
                  b.mesh.scale.set(1.0, 1.0, dist);
                  b.mesh.visible = true;
                } else {
                  b.mesh.visible = false;
                }
              } else {
                b.mesh.visible = false;
              }
            });
          }
        } else {
          // Controller mode: hide joint skeleton, show controller model
          handObj.skeletonGroup.visible = false;
          if (handObj.ctrlVisualGroup) {
            handObj.ctrlVisualGroup.position.copy(this.tempWristPos);
            if (handObj.ctrlTarget) {
              handObj.ctrlVisualGroup.quaternion.copy(handObj.ctrlTarget.quaternion);
            }
            handObj.ctrlVisualGroup.visible = true;
          }
        }

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

        // ─── VISIBLE LASER RAY DIRECTLY FROM WRIST (META QUEST NATIVE STYLE) ───────
        // Meta Quest emits the interaction pointer ray from the anterior wrist / palm base
        const rayOrigin = this.tempWristPos.clone();
        if (!isUsingController) {
          if (wristJoint) {
            wristJoint.getWorldPosition(this.tempWristPos);
            rayOrigin.copy(this.tempWristPos);
          } else {
            rayOrigin.copy(this.tempIndexPos);
          }

          // Slightly offset forward into base of palm (2.5cm) towards knuckles so beam emerges cleanly
          if (this.tempKnucklePos && this.tempKnucklePos.lengthSq() > 0.01) {
            const toKnuckle = new THREE.Vector3().subVectors(this.tempKnucklePos, rayOrigin);
            if (toKnuckle.lengthSq() > 0.0001) {
              rayOrigin.addScaledVector(toKnuckle.normalize(), 0.025);
            }
          }

          // Point along the hand forward axis from wrist through knuckles/fingers
          const middleKnuckle = hand.joints['middle-finger-phalanx-proximal'] || hand.joints['index-finger-phalanx-proximal'];
          if (middleKnuckle && wristJoint) {
            middleKnuckle.getWorldPosition(this.tempPosA);
            this.tempRayDir.subVectors(this.tempPosA, this.tempWristPos).normalize();
          } else if (indexJoint && wristJoint) {
            this.tempRayDir.subVectors(this.tempIndexPos, this.tempWristPos).normalize();
          } else {
            this.tempRayDir.set(0, 0, -1);
          }
        }

        if (this.tempRayDir.lengthSq() < 0.1) {
          this.tempRayDir.set(0, 0, -1);
        }

        // Responsive ray aiming with anti-slip damping while pinching
        const lerpSpeed = isPinching ? 0.35 : 0.80;

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
        if (this.holographicSwitches) {
          candidates.push(...this.holographicSwitches.getClickableObjects());
        }
        if (this.vrWrist3DController && this.vrWrist3DController.group.visible) {
          candidates.push(...this.vrWrist3DController.getClickables());
        }
        // VR Orientation System 3D Buttons & Holographic Controls
        if (this.vrOrientationSystem && this.vrOrientationSystem.group.visible) {
          candidates.push(...this.vrOrientationSystem.getClickableObjects());
        }
        // Focused 3D Observation Station (Record reading, repeat, view result)
        if (this.vrObservationStation && this.vrObservationStation.group.visible) {
          candidates.push(...this.vrObservationStation.getClickableObjects());
        }
        // Dedicated 3D Spatial AI Tutor Panel (Hint, Explain, Mistakes, Questions)
        if (this.vrAITutorPanel && this.vrAITutorPanel.group.visible) {
          candidates.push(...this.vrAITutorPanel.getClickableObjects());
        }
        // Interactive Throwables (Target Practice)
        if (this.throwableManager) {
          candidates.push(...this.throwableManager.getClickableObjects());
        }
        // 3D Lab Assistant, Radial Menu & Holographic Subpanels
        if (this.assistant && typeof this.assistant.getClickableObjects === 'function') {
          candidates.push(...this.assistant.getClickableObjects());
        }

        // Filter out any null or invalid objects to avoid raycasting exceptions
        const validCandidates = candidates.filter((c) => c && c.isObject3D && (c.visible !== false || (c.userData && c.userData.isThrowable)));
        let rayHits = [];
        try {
          rayHits = this.handRaycaster.intersectObjects(validCandidates, true);
        } catch (rayErr) {
          rayHits = [];
        }
        let hitTarget = null;
        let hitDist = 3.5;
        let hitPoint = rayOrigin.clone().addScaledVector(handObj.smoothedRayDir, 3.5);

        if (rayHits.length > 0) {
          const topHit = rayHits[0];
          hitDist = topHit.distance;
          hitPoint = topHit.point;

          // Resolve target type
          const obj = topHit.object;
          if (obj.userData && (obj.userData.type === 'radial_button' || obj.userData.type === 'subpanel_button' || obj.userData.isAssistantHitbox)) {
            hitTarget = {
              type: obj.userData.type || 'assistant_hitbox',
              id: obj.userData.buttonId || obj.userData.optionId,
              target: obj,
              onPress: obj.userData.onPress
            };
          } else if (obj.userData && (obj.userData.type === 'tutor_button' || (obj.userData.buttonId && obj.userData.buttonId.startsWith('tutor_')))) {
            hitTarget = { type: 'tutor_button', id: obj.userData.buttonId, target: obj };
          } else if (obj.userData && (obj.userData.type === 'obs_button' || (obj.userData.vrButtonId && obj.userData.vrButtonId.startsWith('obs_')))) {
            hitTarget = { type: 'obs_button', id: obj.userData.vrButtonId, target: obj };
          } else if (obj.userData && obj.userData.vrButtonId) {
            hitTarget = { type: 'button', id: obj.userData.vrButtonId, target: obj };
          } else if (obj.userData && (obj.userData.terminalId || (obj.parent && obj.parent.userData && obj.parent.userData.terminalId))) {
            const tId = obj.userData.terminalId || obj.parent.userData.terminalId;
            hitTarget = { type: 'terminal', id: tId, target: obj };
          } else if (obj.parent && obj.parent.userData && obj.parent.userData.connectionId) {
            hitTarget = { type: 'wire', id: obj.parent.userData.connectionId, target: obj };
          } else if (obj.userData && obj.userData.isHoloSwitch) {
            hitTarget = { type: 'holo_switch', switchType: obj.userData.switchType, target: obj };
          } else if (obj.parent && obj.parent.userData && obj.parent.userData.isHoloSwitch) {
            hitTarget = { type: 'holo_switch', switchType: obj.parent.userData.switchType, target: obj.parent };
          } else if (this.startCurrentButton && (obj === this.startCurrentButton.hitBox || obj === this.startCurrentButton.cap)) {
            hitTarget = { type: 'start_button', target: this.startCurrentButton };
          } else if (this.measurementController && (obj === this.measurementController.switchLever || obj.parent === this.measurementController.switchLever)) {
            hitTarget = { type: 'key', target: this.measurementController.switchLever };
          } else if (this.measurementController && (obj === this.measurementController.rheostatHandle || obj.parent === this.measurementController.rheostatHandle)) {
            hitTarget = { type: 'rheostat', target: this.measurementController.rheostatHandle };
          } else if (obj.userData && obj.userData.isRheostatSlider) {
            hitTarget = { type: 'wrist_rheostat', target: obj };
          } else if (obj.userData && obj.userData.isWristButton) {
            hitTarget = { type: 'wrist_button', id: obj.userData.buttonId, target: obj };
          } else if (obj.userData && obj.userData.isBookButton) {
            hitTarget = { type: 'book_button', id: obj.userData.buttonId, target: obj };
          } else if (obj.userData && (obj.userData.isVRStartButton || obj.userData.isVROrientButton)) {
            hitTarget = { type: 'orient_button', id: obj.userData.buttonId, target: obj };
          } else if (obj.userData && obj.userData.isThrowable) {
            hitTarget = { type: 'throwable', target: obj.userData.throwable, object: obj };
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

        // Update visible 3D volumetric laser beam from wrist
        if (handObj.beamMesh) {
          handObj.beamMesh.position.copy(rayOrigin);
          handObj.beamMesh.lookAt(hitPoint);
          handObj.beamMesh.scale.set(1.0, 1.0, Math.max(0.04, hitDist));
          handObj.beamMesh.visible = true;
        }
        if (handObj.emitterMesh) {
          handObj.emitterMesh.position.copy(rayOrigin);
          handObj.emitterMesh.lookAt(hitPoint);
          handObj.emitterMesh.visible = true;
        }

        // Update line vertices for compatibility
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

        // Color coding laser ray, 3D volumetric beam & reticle
        if (hitTarget && hitTarget.type === 'wire') {
          // Red cue indicates wire can be removed/cut
          const redCol = 0xef4444;
          handObj.rayMat.color.setHex(redCol);
          if (handObj.beamMat) handObj.beamMat.color.setHex(redCol);
          handObj.retRingMat.color.setHex(redCol);
          handObj.retDotMat.color.setHex(redCol);
          handObj.reticleGroup.scale.setScalar(1.25);
        } else if (hitTarget) {
          // Vibrant Amber cue for interactable hover
          const amberCol = 0xfbbf24;
          handObj.rayMat.color.setHex(amberCol);
          if (handObj.beamMat) handObj.beamMat.color.setHex(amberCol);
          handObj.retRingMat.color.setHex(amberCol);
          handObj.retDotMat.color.setHex(amberCol);
          handObj.reticleGroup.scale.setScalar(1.20);
        } else {
          const idleCol = handObj.index === 0 ? 0x10b981 : 0x00f0ff;
          handObj.rayMat.color.setHex(idleCol);
          if (handObj.beamMat) handObj.beamMat.color.setHex(idleCol);
          handObj.retRingMat.color.setHex(idleCol);
          handObj.retDotMat.color.setHex(idleCol);
          handObj.reticleGroup.scale.setScalar(0.95);
        }

        // Proximity Hover Check (for direct near-hand touching)
        const nearHoverInfo = this.checkProximity(handObj.smoothedIndexPos);
        const activeHover = nearHoverInfo || handObj.rayHoverInfo;

        // Throwable hover highlight
        if (this.throwableManager) {
          if (activeHover && activeHover.type === 'throwable') {
            this.throwableManager.setHover(activeHover.target, true);
          } else if (handObj.lastHoverTarget && handObj.lastHoverTarget.type === 'throwable') {
            this.throwableManager.setHover(handObj.lastHoverTarget.target, false);
          }
        }

        // Visual feedback: pulse tip meshes when pinching
        const idxTipMesh = handObj.jointMeshes['index-finger-tip'];
        const thbTipMesh = handObj.jointMeshes['thumb-tip'];
        if (idxTipMesh && idxTipMesh.material && idxTipMesh.material.emissiveIntensity !== undefined) {
          idxTipMesh.material.emissiveIntensity = isPinching ? 1.4 : 0.65;
        }
        if (thbTipMesh && thbTipMesh.material && thbTipMesh.material.emissiveIntensity !== undefined) {
          thbTipMesh.material.emissiveIntensity = isPinching ? 1.4 : 0.65;
        }

        // Update beacon visuals based on state
        this.updateBeaconAppearance(handObj, isPinching, activeHover);

        // 1. PINCH START EVENT (Click via pinch interaction)
        if (isPinching && !handObj.pinched && now > this.cooldowns[handObj.index]) {
          sound.unlock();
          if (!this._vrAudioRouted) {
            this._vrAudioRouted = true;
            sound.routeToVRHeadset().catch(() => {});
          }
          if (this.narration) {
            this.narration.init();
            this.narration._ensureAudioCtx();
          }

          // Sticky target lock: if activeHover briefly dropped during the finger curling of the pinch gesture,
          // use the securely targeted item from the last 300ms (never sticky-fallback to terminal 1 when awaiting terminal 2)
          let targetToClick = activeHover;
          if (!targetToClick && handObj.lastHoverTarget && (now - handObj.lastHoverTime < 300)) {
            if (handObj.lastHoverTarget.type !== 'terminal' || !this.interactionController?.selectedTerminalId) {
              targetToClick = handObj.lastHoverTarget;
            }
          }

          this.handlePinchStart(handObj, targetToClick);
          this.cooldowns[handObj.index] = now + XR_CONFIG.pinchCooldownMs;

          // Visual click feedback: reticle pulses green and expands
          handObj.reticleGroup.scale.setScalar(1.6);
          handObj.retRingMat.color.setHex(0x22c55e);
          handObj.retDotMat.color.setHex(0x22c55e);
          if (handObj.beamMat) handObj.beamMat.color.setHex(0x22c55e);
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
      } catch (handErr) {
        console.warn(`[XRHandManager] Error updating hand ${handObj.index}:`, handErr);
      }
    });

    // Aggregate button hover across all hands so neither hand cancels the other's hover
    let activeWorldButtonId = null;
    let activeHUDButtonId = null;
    let activeObsButtonId = null;
    this.hands.forEach((h) => {
      const hov = h.rayHoverInfo;
      if (hov) {
        if (hov.type === 'obs_button' || (hov.id && hov.id.startsWith('obs_'))) activeObsButtonId = hov.id;
        if (hov.type === 'button') activeWorldButtonId = hov.id;
        if (hov.type === 'hud_button') activeHUDButtonId = hov.id;
      }
    });

    if (this.vrObservationStation) {
      this.vrObservationStation.setHoveredButton(activeObsButtonId);
    }
    if (this.vrWorldPanel) {
      this.vrWorldPanel.setHoveredButton(activeWorldButtonId);
    }
    if (this.vrHandCircuitHUD) {
      this.vrHandCircuitHUD.setHovered(Boolean(activeHUDButtonId), activeHUDButtonId);
    }

    // Update Wall Circuit HUD TV
    if (this.vrHandCircuitHUD) {
      this.vrHandCircuitHUD.update(delta);
    }

    // Dynamic 3D wire stretch preview following hand
    this._updatePreviewWire();

    // Keep VR wire confirm panel facing camera
    if (this._vrWireConfirmMesh && this._vrWireConfirmMesh.visible && cam) {
      this._vrWireConfirmMesh.quaternion.copy(cam.quaternion);
    }

    // Update 3D Miniature Rheostat on student's left wrist using actual WebXR headset camera
    if (this.vrWrist3DController) {
      const leftHand = this.hands.find((h) => h.handedness === 'left' && h.hasValidPose) || (this.hands[0] && this.hands[0].hasValidPose ? this.hands[0] : null);
      this.vrWrist3DController.update(leftHand, delta, cam);
    }

    // Gesture: Two-Hand Pinch Expand (expand fingers while pinching to toggle X-Ray Flow)
    if (this.hands.length >= 2 && this.hands[0].hasValidPose && this.hands[1].hasValidPose) {
      const h0 = this.hands[0];
      const h1 = this.hands[1];
      const bothPinched = h0.pinched && h1.pinched;
      const handDist = h0.smoothedIndexPos.distanceTo(h1.smoothedIndexPos);

      if (bothPinched) {
        if (!this.pinchExpandTrack.isTracking) {
          this.pinchExpandTrack.isTracking = true;
          this.pinchExpandTrack.startDist = handDist;
        } else {
          const expansion = handDist - this.pinchExpandTrack.startDist;
          if (expansion > 0.12 && (now - this.pinchExpandTrack.lastTriggerTime > 1500)) {
            this.pinchExpandTrack.lastTriggerTime = now;
            this.pinchExpandTrack.isTracking = false;
            if (this.wireRenderer) {
              const isXray = this.wireRenderer.toggleXrayMode();
              if (this.holographicSwitches) {
                this.holographicSwitches.setStates(isXray, this.holographicSwitches.darkState);
              }
              this.onFeedback({
                type: 'success',
                message: isXray
                  ? '👐 Gesture: ⚛️ X-Ray Microscopic Flow Activated!'
                  : '👐 Gesture: ⚛️ X-Ray Flow Deactivated'
              });
            }
          }
        }
      } else {
        this.pinchExpandTrack.isTracking = false;
      }
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

    // G. Check VR Wall HUD Toggle View Button
    if (this.vrHandCircuitHUD && this.vrHandCircuitHUD.toggleTabBtn && this.vrHandCircuitHUD.group.visible) {
      this.vrHandCircuitHUD.toggleTabBtn.getWorldPosition(this.tempTargetPos);
      if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.buttonHoverRadius) {
        return { type: 'hud_button', id: 'hud_toggle_mode', target: this.vrHandCircuitHUD.toggleTabBtn };
      }
    }

    // G2. Check VR Wrist 3D Controller
    if (this.vrWrist3DController && this.vrWrist3DController.group.visible) {
      const clickables = this.vrWrist3DController.getClickables();
      for (const obj of clickables) {
        obj.getWorldPosition(this.tempTargetPos);
        if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.buttonHoverRadius * 1.6) {
          if (obj.userData.isRheostatSlider) {
            return { type: 'wrist_rheostat', target: obj };
          } else if (obj.userData.isWristButton) {
            return { type: 'wrist_button', id: obj.userData.buttonId, target: obj };
          }
        }
      }
    }

    // H. Check Tabletop Holographic Switches (X-Ray & Dark Lab)
    if (this.holographicSwitches) {
      const switchHits = this.holographicSwitches.getClickableObjects();
      for (const obj of switchHits) {
        obj.getWorldPosition(this.tempTargetPos);
        if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.buttonHoverRadius * 1.5) {
          const swType = obj.userData.switchType || (obj.parent && obj.parent.userData && obj.parent.userData.switchType);
          return { type: 'holo_switch', switchType: swType, target: obj };
        }
      }
    }

    // J. Check VR Orientation 3D Start Button & Controls
    if (this.vrOrientationSystem && this.vrOrientationSystem.group.visible) {
      const orientObjs = this.vrOrientationSystem.getClickableObjects();
      for (const btn of orientObjs) {
        btn.getWorldPosition(this.tempTargetPos);
        if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.buttonHoverRadius * 1.8) {
          return { type: 'orient_button', id: btn.userData.buttonId, target: btn };
        }
      }
    }

    // K. Check Interactive Throwables Near Hand Proximity
    if (this.throwableManager) {
      const tObjs = this.throwableManager.getClickableObjects();
      for (const tMesh of tObjs) {
        tMesh.getWorldPosition(this.tempTargetPos);
        if (fingerPos.distanceTo(this.tempTargetPos) < XR_CONFIG.buttonHoverRadius * 1.8) {
          return { type: 'throwable', target: tMesh.userData.throwable, object: tMesh };
        }
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
    // If no target was hit, ignore empty-space pinch.
    // NEVER cancel terminal selection on empty space pinch, because hand tremor during pinch motion
    // causes the laser ray to briefly leave the terminal collider. Keeping Terminal 1 active allows
    // stable, jitter-free connection to Terminal 2.
    if (!hoverInfo) {
      return;
    }

    // 1. Proximity to Start Current Button: Press
    if (hoverInfo.type === 'start_button') {
      if (this.startCurrentButton) {
        this.startCurrentButton.press();
      }
      return;
    }

    // 2. Proximity or Ray pointing at 3D Wire: Remove wire — CONFIRM FLOW
    if (hoverInfo.type === 'wire') {
      // First pinch = show confirm panel. Second pinch within 2 seconds = do disconnect.
      if (this.vrWireDisconnectPending && this.vrWireDisconnectPending.wireId === hoverInfo.id) {
        const elapsed = (Date.now() - this.vrWireDisconnectPending.confirmTime) / 1000;
        if (elapsed < 3.0) {
          // Second pinch — confirmed! Remove wire.
          const conn = this.circuitState ? this.circuitState.connections.find((c) => c.id === hoverInfo.id) : null;
          const fromName = conn ? getTerminalDisplayName(conn.from) : 'terminal';
          const toName = conn ? getTerminalDisplayName(conn.to) : 'terminal';
          const wasActive = this.simulation && this.simulation.keyClosed;

          let removed = false;
          if (this.circuitState) {
            removed = this.circuitState.removeConnection(hoverInfo.id);
          }
          if (removed && this.wireRenderer) {
            this.wireRenderer.removeWire(hoverInfo.id);
          } else if (this.interactionController) {
            this.interactionController.confirmWireDisconnection(hoverInfo.id);
            removed = true;
          }

          if (removed) {
            sound.playWireDisconnect();
            if (wasActive) {
              const fb = this.simulation.handleWireRemovedWhileActive();
              this.circuitState.setSwitchClosed(false);
              this.onFeedback({ type: 'warning', message: fb.message });
            } else {
              this.onFeedback({ type: 'success', message: `✅ Wire between ${fromName} and ${toName} removed.` });
            }
            if (this.narration) this.narration.speak('Wire removed.', '↩️ Wire Removed');
          }

          this.vrWireDisconnectPending = null;
          if (this._vrWireConfirmMesh) this._vrWireConfirmMesh.visible = false;
        }
      } else {
        // First pinch — show confirm panel near wire
        this.vrWireDisconnectPending = { wireId: hoverInfo.id, confirmTime: Date.now() };
        if (this._vrWireConfirmMesh && hoverInfo.target) {
          const wp = new THREE.Vector3();
          hoverInfo.target.getWorldPosition(wp);
          this._vrWireConfirmMesh.position.copy(wp).add(new THREE.Vector3(0, 0.12, 0));
          if (this.camera) this._vrWireConfirmMesh.quaternion.copy(this.camera.quaternion);
          this._vrWireConfirmMesh.visible = true;
        }
        if (this.narration) this.narration.speak('Pinch again to confirm wire removal.', '⚠ Confirm Remove?');
        this.onFeedback({ type: 'warning', message: '⚠ Pinch again within 2s to confirm wire removal' });
        // Auto-hide after 2.5 seconds
        setTimeout(() => {
          if (this.vrWireDisconnectPending && this.vrWireDisconnectPending.wireId === hoverInfo.id) {
            this.vrWireDisconnectPending = null;
            if (this._vrWireConfirmMesh) this._vrWireConfirmMesh.visible = false;
          }
        }, 2600);
      }
      return;
    }

    // 3. Proximity or Ray pointing at Terminal: Connect / Select
    if (hoverInfo.type === 'terminal') {
      const now = performance.now();
      if (this._lastTerminalPinchTime && (now - this._lastTerminalPinchTime < 320)) {
        return; // Prevent accidental double-pinch / jitter triggering both terminals simultaneously
      }
      this._lastTerminalPinchTime = now;
      if (this.interactionController) {
        this.interactionController.handleTerminalClick(hoverInfo.id);
      }
      // Clear sticky hover target immediately so it never re-clicks or cancels terminal 1
      handObj.lastHoverTarget = null;
      return;
    }

    // 4. Proximity or Ray pointing at Plug Key: Toggle
    if (hoverInfo.type === 'key') {
      if (this.interactionController) {
        this.interactionController.handleSwitchClick();
      }
      return;
    }

    // 5. Proximity or Ray to Rheostat Handle (Table or Wrist): Start Drag
    if (hoverInfo.type === 'rheostat' || hoverInfo.type === 'wrist_rheostat') {
      const curR = this.simulation ? this.simulation.rheostatResistance : 5.0;
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

    // 5b. Proximity or Ray to Wrist 3D Buttons
    if (hoverInfo.type === 'wrist_button') {
      if (hoverInfo.id === 'wrist_rheo_minus') {
        if (this.simulation) {
          const curR = this.simulation.rheostatResistance || 5.0;
          const newR = Math.max(0.5, curR - 1.0);
          this.simulation.setRheostatResistance(newR);
          this.updateRheostatVRLabel(newR);
          if (this.narration) {
            this.narration.playRheoChirp(newR);
            this.narration.speak(`Rheostat set to ${newR.toFixed(1)} ohms`, `🎛️ Rh = ${newR.toFixed(1)} Ω`);
          }
          this.onFeedback({ type: 'info', message: `🎛️ Rheostat: ${newR.toFixed(1)} Ω` });
        }
        return;
      }

      if (hoverInfo.id === 'wrist_rheo_plus') {
        if (this.simulation) {
          const curR = this.simulation.rheostatResistance || 5.0;
          const newR = Math.min(20.0, curR + 1.0);
          this.simulation.setRheostatResistance(newR);
          this.updateRheostatVRLabel(newR);
          if (this.narration) {
            this.narration.playRheoChirp(newR);
            this.narration.speak(`Rheostat set to ${newR.toFixed(1)} ohms`, `🎛️ Rh = ${newR.toFixed(1)} Ω`);
          }
          this.onFeedback({ type: 'info', message: `🎛️ Rheostat: ${newR.toFixed(1)} Ω` });
        }
        return;
      }

      const presetMap = {
        wrist_rheo_p5: 2.0,
        wrist_rheo_p4: 6.0
      };
      if (presetMap[hoverInfo.id] !== undefined) {
        if (this.simulation) {
          const targetR = presetMap[hoverInfo.id];
          this.simulation.setRheostatResistance(targetR);
          this.updateRheostatVRLabel(targetR);
          if (this.narration) {
            this.narration.playRheoChirp(targetR);
            this.narration.speak(`Rheostat preset set to ${targetR} ohms`, `🎛️ Rh = ${targetR} Ω`);
          }
          this.onFeedback({ type: 'info', message: `🎛️ Rheostat Preset: ${targetR} Ω` });
        }
        return;
      }

      if (hoverInfo.id === 'wrist_start_practical') {
        if (this.simulation) {
          if (this.simulation.keyClosed) {
            this.simulation.openKey();
            if (this.measurementController) this.measurementController.openKey();
            if (this.narration) {
              this.narration.playSwitchClick();
              this.narration.speak('Practical stopped. Key opened.', '🛑 Practical Stopped');
            }
            this.onFeedback({ type: 'info', message: '🛑 Practical Stopped (Key Opened)' });
          } else {
            const res = this.simulation.closeKey();
            if (res.success) {
              if (this.measurementController) this.measurementController.closeKey();
              if (this.narration) {
                this.narration.playSwitchClick();
                this.narration.speak('Practical started! Current is flowing.', '⚡ Practical Started');
              }
              this.onFeedback({ type: 'success', message: '⚡ Practical Started (Key Closed)' });
            } else {
              if (this.narration) {
                this.narration.playWarningChime();
                this.narration.speak('Connect all 7 circuit wires first.', '⚠️ Incomplete Circuit');
              }
              this.onFeedback({ type: 'warning', message: res.message || 'Complete circuit first' });
            }
          }
        }
        return;
      }

      if (hoverInfo.id === 'wrist_record_reading') {
        if (this.simulation) {
          if (this.narration) this.narration.init();
          const res = this.simulation.recordReading();
          if (res.success) {
            if (this.narration) {
              this.narration.playRecordChime();
              if (res.count === 1) {
                this.narration.speak('First observation recorded successfully.', '📝 1st Reading');
              } else if (res.count === 5) {
                this.narration.playMilestoneChime();
                this.narration.speak('All 5 observations complete! Ohm\'s law verified.', '🏆 5/5 Readings Complete!');
              } else {
                this.narration.speak(`Observation #${res.count} recorded.`, `📝 Observation #${res.count}`);
              }
            }
            this.onFeedback({ type: 'success', message: res.message });
          } else {
            if (this.narration) this.narration.playWarningChime();
            this.onFeedback({ type: 'warning', message: res.message });
          }
        }
        return;
      }
    }

    // 5d. VR Orientation 3D Buttons (Start Practical, Next, Skip)
    if (hoverInfo.type === 'orient_button') {
      if (this.vrOrientationSystem) {
        this.vrOrientationSystem.handleClick(hoverInfo.target);
      }
      return;
    }

    // 5e. Interactive Throwables: Grab into hand!
    if (hoverInfo.type === 'throwable') {
      if (this.throwableManager) {
        this.throwableManager.grabWithHand(hoverInfo.target, handObj);
      }
      return;
    }

    // 5f. Focused 3D Observation Station (Record reading, repeat experiment, view result)
    if (hoverInfo.type === 'obs_button' || (hoverInfo.id && hoverInfo.id.startsWith('obs_'))) {
      if (this.vrObservationStation) {
        this.vrObservationStation.pressButton(hoverInfo.id);
      }
      return;
    }

    // 5g. Dedicated 3D Spatial AI Tutor Panel (Hint, Explain, Mistakes, Questions)
    if (hoverInfo.type === 'tutor_button' || (hoverInfo.id && hoverInfo.id.startsWith('tutor_'))) {
      if (this.vrAITutorPanel) {
        this.vrAITutorPanel.pressButton(hoverInfo.id);
      }
      return;
    }

    // 5h. 3D Lab Assistant, Radial Menu & Holographic Subpanels
    if (hoverInfo.type === 'radial_button' || hoverInfo.type === 'subpanel_button' || hoverInfo.type === 'assistant_hitbox' || hoverInfo.isAssistantHitbox) {
      if (typeof hoverInfo.onPress === 'function') {
        hoverInfo.onPress();
        return;
      }
      if (hoverInfo.target && hoverInfo.target.userData && typeof hoverInfo.target.userData.onPress === 'function') {
        hoverInfo.target.userData.onPress();
        return;
      }
    }

    // 6. Proximity or Ray pointing at VR World Panel Button: Trigger Action
    if (hoverInfo.type === 'button') {
      if (this.vrWorldPanel) {
        this.vrWorldPanel.pressButton(hoverInfo.id);
      }
      return;
    }

    // 7. Proximity or Ray pointing at Holographic Console Switch
    if (hoverInfo.type === 'holo_switch') {
      if (this.holographicSwitches) {
        const nextState = this.holographicSwitches.trigger(hoverInfo.switchType);
        this.onFeedback({
          type: 'success',
          message: hoverInfo.switchType === 'xray'
            ? `⚛️ X-Ray Flow: ${nextState ? 'ON' : 'OFF'}`
            : `🌌 Dark Lab Theme: ${nextState ? 'ON' : 'OFF'}`
        });
      }
      return;
    }

    // 7. Proximity or Ray pointing at Wall TV Buttons
    if (hoverInfo.type === 'hud_button') {
      if (hoverInfo.id === 'hud_exit_vr') {
        if (this.vrSessionManager) {
          this.vrSessionManager.exitVR();
        } else if (this.vrWorldPanel) {
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

      if (hoverInfo.id === 'hud_toggle_mode') {
        if (this.vrHandCircuitHUD) {
          this.vrHandCircuitHUD.toggleMode();
          if (this.narration) this.narration.playButtonBeep();
          this.onFeedback({
            type: 'info',
            message: this.vrHandCircuitHUD.currentMode === 'schematic'
              ? '📸 Wall TV: Circuit Connection Guide'
              : '📊 Wall TV: Observation Table & Graph'
          });
        }
        return;
      }

      if (hoverInfo.id === 'hud_undo_wire') {
        if (this.circuitState && this.wireRenderer) {
          const undone = this.circuitState.undoLastConnection();
          if (undone) {
            this.wireRenderer.removeWire(undone.id);
            if (this.simulation && this.simulation.keyClosed) {
              this.simulation.handleWireRemovedWhileActive();
            }
            if (this.narration) {
              this.narration.playButtonBeep();
              this.narration.speak('Last wire removed.', '↩️ Wire Undone');
            }
            this.onFeedback({ type: 'info', message: '↩️ Last wire removed.' });
          }
        } else if (this.interactionController) {
          this.interactionController.undoLastWire();
        } else if (this.vrWorldPanel) {
          this.vrWorldPanel.pressButton('undo_wire');
        }
        if (this.vrHandCircuitHUD) this.vrHandCircuitHUD.renderCanvas();
        return;
      }
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
    if (this.throwableManager && this.throwableManager.isHandHolding(handObj)) {
      this.throwableManager.releaseHand(handObj);
    }

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
