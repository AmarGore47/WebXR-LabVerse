import fs from 'fs';
import * as THREE from 'three';
import '../test_dom_mock.js';

// Parse index.html and create all element IDs in a mock document
const html = fs.readFileSync('all codes/index.html', 'utf-8');
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
const elementMap = {};

function createMockEl(id) {
  const el = {
    id,
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, force) {
        if (force !== undefined) {
          if (force) this._classes.add(c);
          else this._classes.delete(c);
          return force;
        }
        if (this._classes.has(c)) { this._classes.delete(c); return false; }
        this._classes.add(c); return true;
      },
      contains(c) { return this._classes.has(c); }
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    value: '',
    textContent: '',
    innerHTML: '',
    width: 1920,
    height: 1080,
    getContext: () => ({})
  };
  return el;
}

idMatches.forEach(id => {
  elementMap[id] = createMockEl(id);
});

global.document.getElementById = (id) => elementMap[id] || createMockEl(id);
global.document.querySelector = (sel) => {
  if (sel.startsWith('#')) return elementMap[sel.slice(1)] || null;
  return createMockEl('query');
};
global.document.querySelectorAll = () => [];
global.window.innerWidth = 1920;
global.window.innerHeight = 1080;
global.window.devicePixelRatio = 1;
global.performance = { now: () => Date.now() };

// Mock WebGLRenderer
class MockWebGLRenderer {
  constructor() {
    this.domElement = createMockEl('canvas');
    this.xr = {
      enabled: false,
      isPresenting: false,
      addEventListener: () => {},
      setSession: () => {},
      getSession: () => null,
      setReferenceSpaceType: () => {},
      setAnimationLoop: () => {}
    };
    this.shadowMap = { enabled: false, type: 0 };
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
  }
  setSize() {}
  setPixelRatio() {}
  render() {}
  setAnimationLoop(fn) { this._loop = fn; }
  dispose() {}
}
THREE.WebGLRenderer = MockWebGLRenderer;

try {
  await import('../src/main.js');
  console.log('MAIN.JS INITIALIZED AND EXECUTED COMPLETELY WITH 0 ERRORS!');
} catch (err) {
  console.error('ERROR INITIALIZING MAIN.JS:', err);
}
