import * as THREE from 'three';
import { XRHandManager } from '../src/xr/xrHandManager.js';
import { CircuitState } from '../src/circuit/circuitState.js';

// Setup minimal mock objects
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const cameraRig = new THREE.Group();
cameraRig.add(camera);
scene.add(cameraRig);

// Mock renderer with xr
const mockJoints = {};
const jointNames = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'
];

const mockHand0 = new THREE.Group();
mockHand0.joints = {};
jointNames.forEach(name => {
  const j = new THREE.Group();
  j.position.set(0.1, 1.2, 0.8);
  mockHand0.add(j);
  mockHand0.joints[name] = j;
});

const mockHand1 = new THREE.Group();
mockHand1.joints = {};
jointNames.forEach(name => {
  const j = new THREE.Group();
  j.position.set(-0.1, 1.2, 0.8);
  mockHand1.add(j);
  mockHand1.joints[name] = j;
});

const mockRenderer = {
  xr: {
    enabled: true,
    isPresenting: true,
    getCamera: () => camera,
    getHand: (i) => (i === 0 ? mockHand0 : mockHand1)
  }
};

const circuitState = new CircuitState();

console.log('Instantiating XRHandManager...');
const handMgr = new XRHandManager({
  renderer: mockRenderer,
  scene,
  cameraRig,
  camera,
  circuitState,
  onFeedback: (fb) => console.log('[Feedback]', fb)
});

console.log('Testing handMgr.update(0.016) with active hands...');
try {
  for (let f = 0; f < 10; f++) {
    handMgr.update(0.016);
  }
  console.log('✅ handMgr.update succeeded for 10 frames without error!');
} catch (err) {
  console.error('❌ EXCEPTION in handMgr.update:', err);
}

