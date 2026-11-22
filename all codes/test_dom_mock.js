// test_dom_mock.js
// Lightweight Canvas, DOM, Speech and Web Audio mock for Node.js test environment

const mockCtx = {
  clearRect: () => {},
  beginPath: () => {},
  closePath: () => {},
  roundRect: () => {},
  fill: () => {},
  stroke: () => {},
  fillText: () => {},
  strokeText: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  ellipse: () => {},
  setLineDash: () => {},
  quadraticCurveTo: () => {},
  bezierCurveTo: () => {},
  rect: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  clip: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  measureText: (text) => ({ width: (text || '').length * 8 }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  set strokeStyle(v) {},
  set fillStyle(v) {},
  set lineWidth(v) {},
  set font(v) {},
  set textAlign(v) {},
  set textBaseline(v) {},
  set shadowColor(v) {},
  set shadowBlur(v) {},
  set shadowOffsetX(v) {},
  set shadowOffsetY(v) {}
};

const mockCanvas = {
  width: 1024,
  height: 1024,
  getContext: () => mockCtx
};

if (typeof global.document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') return { ...mockCanvas, width: 1024, height: 1024, getContext: () => mockCtx };
      return {
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} }
      };
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.lang = 'en-US';
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.mockSpeech = null;
    this.mockError = null;
  }
  start() {
    setTimeout(() => {
      if (this.mockError) {
        if (this.onerror) this.onerror({ error: this.mockError });
        if (this.onend) this.onend();
        return;
      }
      if (this.onstart) this.onstart();
      if (this.mockSpeech) {
        if (this.onresult) {
          this.onresult({
            resultIndex: 0,
            results: [Object.assign([{ transcript: this.mockSpeech }], { isFinal: true })]
          });
        }
        if (this.onend) this.onend();
      }
    }, 10);
  }
  stop() {
    setTimeout(() => {
      if (this.onend) this.onend();
    }, 5);
  }
  abort() {
    setTimeout(() => {
      if (this.onend) this.onend();
    }, 5);
  }
}

class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text || '';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.lang = 'en-US';
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.onpause = null;
    this.onresume = null;
  }
}

const mockVoices = [
  { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US', default: true, localService: true },
  { name: 'Google हिन्दी', lang: 'hi-IN', default: false, localService: false },
  { name: 'Google मराठी', lang: 'mr-IN', default: false, localService: false },
  { name: 'Microsoft Heera - English (India)', lang: 'en-IN', default: false, localService: true }
];

const mockSpeechSynthesis = {
  speaking: false,
  pending: false,
  paused: false,
  getVoices: () => mockVoices,
  speak: function(utter) {
    this.speaking = true;
    if (utter.onstart) utter.onstart();
    setTimeout(() => {
      this.speaking = false;
      if (utter.onend) utter.onend();
    }, 20);
  },
  cancel: function() {
    this.speaking = false;
  },
  pause: function() { this.paused = true; },
  resume: function() { this.paused = false; },
  addEventListener: () => {}
};

if (typeof global.Image === 'undefined') {
  global.Image = class {
    constructor() {
      this.src = '';
      this.onload = null;
      this.onerror = null;
    }
  };
}

if (typeof global.window === 'undefined') {
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    SpeechRecognition: MockSpeechRecognition,
    webkitSpeechRecognition: MockSpeechRecognition,
    SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
    speechSynthesis: mockSpeechSynthesis,
    AudioContext: class {
      constructor() {
        this.destination = {};
        this.state = 'suspended';
        this.sampleRate = 44100;
      }
      resume() { this.state = 'running'; return Promise.resolve(); }
      createGain() { return { gain: { value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {} }; }
      createOscillator() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
      createBuffer() { return {}; }
      createBufferSource() { return { connect: () => {}, start: () => {} }; }
    },
    webkitAudioContext: null
  };
} else {
  if (!global.window.addEventListener) global.window.addEventListener = () => {};
  if (!global.window.removeEventListener) global.window.removeEventListener = () => {};
  if (!global.window.SpeechRecognition) global.window.SpeechRecognition = MockSpeechRecognition;
  if (!global.window.webkitSpeechRecognition) global.window.webkitSpeechRecognition = MockSpeechRecognition;
  if (!global.window.SpeechSynthesisUtterance) global.window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  if (!global.window.speechSynthesis) global.window.speechSynthesis = mockSpeechSynthesis;
}

if (typeof global.navigator === 'undefined') {
  global.navigator = {
    mediaDevices: {
      getUserMedia: () => Promise.resolve({
        getTracks: () => [{ stop: () => {} }]
      }),
      enumerateDevices: () => Promise.resolve([])
    }
  };
} else if (!global.navigator.mediaDevices) {
  global.navigator.mediaDevices = {
    getUserMedia: () => Promise.resolve({
      getTracks: () => [{ stop: () => {} }]
    }),
    enumerateDevices: () => Promise.resolve([])
  };
}
