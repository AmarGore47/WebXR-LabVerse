/**
 * assistantSubpanels.js
 * Professional Wall-Mounted Scientific Information Display for LabVerse Physics Laboratory.
 *
 * Designed as a precision laboratory digital console mounted flush on the left wall:
 * - Matte dark navy aluminum bezel (2.20m x 1.24m, 16:9 ratio).
 * - High-DPI 1920x1080 canvas texture with architectural laboratory typography.
 * - Deep navy (#071326), cyan (#38bdf8), teal (#0d9488) accents, white text (#ffffff), slate secondary (#cbd5e1).
 * - Thin 1px borders, subtle 4-6px corner radii, clean rectangular buttons.
 * - Single consistent visual system across Standby, 6-Option Menu Grid, and all Feature Views.
 *
 * 6 Primary Educational Guidance Modules:
 * 1. Ask Anything (Socratic AI dialogue, suggested question chips, voice speech)
 * 2. Hints (3-tier progressive guidance: Conceptual, Directional, Actionable)
 * 3. Next Step (Authoritative workflow manager stage progression & apparatus checklist)
 * 4. AI Video (Laboratory practical demonstration with 5 chapters & playback scrubber)
 * 5. Examples (4 verified Ohm's law calculation cards: formula, 10 Ω resistor, graph slope, safety fuses)
 * 6. Questions & Answers (5 curriculum MCQs with instant feedback, scoring & textbook explanations)
 */

import * as THREE from 'three';
import { STAGE_METADATA, WORKFLOW_STAGES } from '../experiments/ohmsLaw/ohmsLawWorkflowManager.js';

export const PRACTICAL_VIDEOS = {
  ohmsLaw: {
    title: "Ohm's Law Practical Demonstration",
    videoUrl: '/videos/ohms-law.mp4',
    chapters: [
      { id: 1, title: '1. Introduction & Aim', time: 0, desc: "Aim, formula V = I * R, and safety" },
      { id: 2, title: '2. Apparatus Overview', time: 45, desc: "Battery, Rheostat, Key, Resistor, Meters" },
      { id: 3, title: '3. Circuit Wiring', time: 90, desc: "Series loop and parallel voltmeter setup" },
      { id: 4, title: '4. Taking Readings', time: 150, desc: "Adjusting rheostat and recording 5 V-I pairs" },
      { id: 5, title: '5. Graph Analysis & Slope', time: 220, desc: "Plotting V-I line and calculating R = ΔV / ΔI" }
    ]
  }
};

export const EXAMPLES_DATA = [
  {
    id: 1,
    title: "Basic Ohm's Law Formula",
    topic: "Fundamental Principle",
    description: "At constant temperature, potential difference (V) across a metallic conductor is directly proportional to current (I) flowing through it.",
    formula: "V = I × R  |  I = V / R  |  R = V / I",
    given: "Potential Difference V, Current I, Constant Resistance R",
    calculation: "V ∝ I  ⟹  V / I = Constant = R",
    result: "Linear V-I relationship with unit of resistance Ohm (Ω).",
    explanation: "This principle holds true for metallic conductors (Ohmic devices) under constant physical conditions such as temperature and mechanical strain."
  },
  {
    id: 2,
    title: "Standard Resistor Calculation",
    topic: "Practical Laboratory Problem",
    description: "Calculate resistance when voltmeter and ammeter take direct readings across the coil.",
    formula: "R = V / I",
    given: "Measured Potential Difference V = 4.0 V\nMeasured Current I = 0.40 A",
    calculation: "R = 4.0 V / 0.40 A = 10.0 Ω",
    result: "Resistance R = 10.0 Ω",
    explanation: "The value corresponds to our laboratory standard resistor coil. Notice that units (Volts / Amperes) simplify directly into Ohms (Ω)."
  },
  {
    id: 3,
    title: "V-I Graph Slope Calculation",
    topic: "Graphical Slope Method",
    description: "Calculating resistance from two distinct points on the linear V-I observation graph.",
    formula: "Slope = ΔV / ΔI = (V2 - V1) / (I2 - I1) = R",
    given: "Point 1: (I1 = 0.10 A, V1 = 1.0 V)\nPoint 2: (I2 = 0.50 A, V2 = 5.0 V)",
    calculation: "ΔV = 5.0 - 1.0 = 4.0 V\nΔI = 0.50 - 0.10 = 0.40 A\nR = 4.0 / 0.40 = 10.0 Ω",
    result: "Empirical Resistance R = 10.0 Ω",
    explanation: "The straight line passing through the origin proves that V is directly proportional to I. The reciprocal of slope (ΔI / ΔV) gives Conductance (G)."
  },
  {
    id: 4,
    title: "Real-World Engineering Applications",
    topic: "Practical Electricity",
    description: "How Ohm's Law governs everyday electrical components and circuits.",
    formula: "P = V × I = I²R = V² / R",
    given: "1. Heating Elements (Nichrome wire)\n2. Rheostat Light Dimmers\n3. Circuit Breakers & Safety Fuses",
    calculation: "When resistance R is varied in a rheostat, circuit current I inversely changes, controlling speed or brightness.",
    result: "Safe and controlled electrical energy distribution.",
    explanation: "In safety fuses, exceeding the current limit generates excessive Joule heat (H = I²Rt), melting the fuse wire and breaking the circuit."
  }
];

export const MCQS_DATA = [
  {
    id: 1,
    question: "Why is an ammeter always connected in series in an electric circuit?",
    options: [
      "A. To measure the potential difference across components",
      "B. To measure the full electric current flowing through the loop",
      "C. To prevent the battery from discharging rapidly",
      "D. To increase the total equivalent circuit resistance"
    ],
    correctIndex: 1,
    explanation: "In a series circuit, current remains the same throughout all components. An ammeter has very low internal resistance (~0.2 Ω) so it measures current without impeding the flow."
  },
  {
    id: 2,
    question: "Why must a voltmeter be connected in parallel across the resistor?",
    options: [
      "A. It has very low internal resistance",
      "B. To measure potential difference between two distinct points without drawing significant current",
      "C. To allow high current to bypass the resistor",
      "D. To prevent reversed polarity"
    ],
    correctIndex: 1,
    explanation: "A voltmeter measures the work done in moving a unit charge between two points. It has very high internal resistance (~1 MΩ), so connecting it in parallel ensures negligible current flows through the meter itself."
  },
  {
    id: 3,
    question: "What is the primary role of the rheostat in the Ohm's Law practical?",
    options: [
      "A. To convert alternating current (AC) to direct current (DC)",
      "B. To vary circuit resistance and obtain multiple distinct V-I observation readings",
      "C. To step up the battery voltage to dangerous levels",
      "D. To act as a permanent short-circuit jumper"
    ],
    correctIndex: 1,
    explanation: "The rheostat acts as a variable resistor. By sliding its contact, we alter total circuit resistance, allowing us to record at least 5 different voltage and current pairs to plot our graph."
  },
  {
    id: 4,
    question: "In a graph plotting Potential Difference V (y-axis) vs Current I (x-axis), what does the slope represent?",
    options: [
      "A. Electrical Power (P)",
      "B. Total Electric Charge (Q)",
      "C. Resistance (R = ΔV / ΔI)",
      "D. Electric Current Density (J)"
    ],
    correctIndex: 2,
    explanation: "According to Ohm's Law, V = I * R. When V is plotted against I, the linear equation y = mx + c has m = R. Hence the gradient of the straight line equals the resistance of the resistor."
  },
  {
    id: 5,
    question: "If potential difference across a 10 Ω resistor is doubled from 2.0 V to 4.0 V, what happens to the current?",
    options: [
      "A. Current remains unchanged at 0.20 A",
      "B. Current doubles from 0.20 A to 0.40 A",
      "C. Current drops to zero due to overheating",
      "D. Current quadruples to 0.80 A"
    ],
    correctIndex: 1,
    explanation: "Since I = V / R and resistance R is constant at 10 Ω: at 2.0 V, I = 2/10 = 0.20 A. At 4.0 V, I = 4/10 = 0.40 A. Current is directly proportional to voltage."
  }
];

export class AssistantSubpanels {
  constructor(options = {}) {
    this.assistant = options.assistant || null;
    this.scene = options.scene || null;
    this.tutorClient = options.tutorClient || null;
    this.bridge = options.bridge || null;
    this.workflowManager = options.workflowManager || (this.bridge ? this.bridge.workflowManager : null);
    this.speechService = options.speechService || null;
    this.sound = options.sound || null;
    this.onBackToMenu = options.onBackToMenu || (() => { });
    this.onClose = options.onClose || (() => { });

    // Wall-Mounted 2D AI Assistant Interface on left wall
    this.group = new THREE.Group();
    this.group.name = 'AssistantWallDisplay';

    // Flush mounted on left wall inside red-marked area, centered at adult eye level
    this.group.position.set(-2.95, 1.52, 1.15);
    // Parallel to left wall, subtle tilt inward toward student at workbench
    this.group.rotation.set(0, Math.PI / 2 - 0.04, 0);

    // Permanent laboratory wall-mounted display: always present in scene
    this.group.visible = true;
    this.currentView = 'standby'; // 'standby' | 'menu' | 'ask_anything' | 'hints' | 'next_step' | 'video' | 'examples' | 'qna'
    this.aiError = null;
    this.currentRequestId = 0;
    this.showDiagnostics = false;
    this.developerMode = typeof window !== 'undefined' && Boolean(
      window.location?.search?.includes('dev=1') ||
      window.location?.search?.includes('diag=1') ||
      window.localStorage?.getItem('labverse_dev') === '1'
    );

    // Feature States
    // 1. Ask Anything
    this.currentQuestionText = 'Why is the ammeter connected in series?';
    this.aiResponse = {
      message: 'An ammeter has very low internal resistance (~0.2 Ω) and measures the total electric current flowing through the circuit loop.',
      explanation: 'If placed in parallel, its near-zero resistance would short-circuit the component, causing high current and risking equipment damage.',
      hint: 'Always wire Ammeter (+) and (-) in a continuous loop with the switch and resistor.',
      suggestedAction: 'Verify the series ammeter wire connection on your table.'
    };
    this.isLoadingAI = false;
    this.isSpeakingVoice = false;

    // 2. Hints
    this.currentHintTier = 1; // 1: Conceptual, 2: Directional, 3: Actionable

    // 3. Next Step
    this.currentStageViewIndex = 0;

    // 4. Video
    this.videoState = { isPlaying: false, currentTime: 0, duration: 260, volume: 1.0, currentChapter: 1 };

    // 5. Examples
    this.currentExampleIndex = 1; // default to card 2 (10 ohm resistor)

    // 6. Q&A
    this.currentMCQIndex = 0;
    this.selectedOptionIndex = null;
    this.isAnswerSubmitted = false;
    this.sessionScore = { correct: 0, total: 0 };

    // High-resolution 16:9 Display: 1920x1080 canvas texture on 2.20m x 1.24m precision plane
    this.canvasW = 1920;
    this.canvasH = 1080;
    this.panelW = 2.20;
    this.panelH = 1.24;
    this.clickableButtons = [];

    this._buildPhysicalFrame();
    this._initCanvas();

    if (this.scene) {
      this.scene.add(this.group);
    }

    this._setupKeyboardListener();
    this.redraw();
  }

  _setupKeyboardListener() {
    window.addEventListener('keydown', (e) => {
      if (!this.group.visible || this.currentView !== 'ask_anything') return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Enter') {
        this.submitQuestion();
      } else if (e.key === 'Backspace') {
        this.currentQuestionText = this.currentQuestionText.slice(0, -1);
        this.redraw();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (this.currentQuestionText.length < 90) {
          this.currentQuestionText += e.key;
          this.redraw();
        }
      }
    });
  }

  _buildPhysicalFrame() {
    // Professional Thin-Bezel Laboratory Wall Chassis (Dark navy aluminum / slate with cyan rim)
    const frameGeo = new THREE.BoxGeometry(this.panelW + 0.03, this.panelH + 0.03, 0.016);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x071326,
      roughness: 0.5,
      metalness: 0.6
    });
    this.frameMesh = new THREE.Mesh(frameGeo, frameMat);
    this.group.add(this.frameMesh);

    // Thin cyan accent rim wireframe around bezel
    const rimGeo = new THREE.BoxGeometry(this.panelW + 0.034, this.panelH + 0.034, 0.018);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    this.group.add(rimMesh);
  }

  _initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvasW;
    this.canvas.height = this.canvasH;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const screenGeo = new THREE.PlaneGeometry(this.panelW, this.panelH);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });
    this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.screenMesh.position.z = 0.008;
    this.group.add(this.screenMesh);
  }

  setPosition(pos, targetLook = new THREE.Vector3(0.0, 1.25, 0.82)) {
    this.group.position.copy(pos);
    const angle = Math.atan2(targetLook.x - pos.x, targetLook.z - pos.z);
    this.group.rotation.set(0, angle, 0);
  }

  openMenu() {
    this.currentView = 'menu';
    this.group.visible = true;
    if (this.assistant && this.assistant.state) {
      this.assistant.state.activeSubpanel = 'menu';
      this.assistant.state.radialMenuOpen = false;
      this.assistant.state.interactionActive = true;
    }
    this.redraw();
  }

  openStandby() {
    this.currentView = 'standby';
    if (this.assistant && this.assistant.state) {
      this.assistant.state.activeSubpanel = null;
      this.assistant.state.radialMenuOpen = false;
      this.assistant.state.interactionActive = false;
    }
    this.redraw();
  }

  openView(viewName) {
    this.currentView = viewName;
    this.group.visible = true;
    if (this.assistant && this.assistant.state) {
      this.assistant.state.activeSubpanel = viewName;
      this.assistant.state.radialMenuOpen = false;
      this.assistant.state.interactionActive = true;
    }
    this.redraw();
  }

  activateSession() {
    if (this.assistant && typeof this.assistant.onStudentClick === 'function') {
      this.assistant.onStudentClick();
    } else {
      this.openMenu();
    }
  }

  backToMenu() {
    this.currentView = 'menu';
    if (this.assistant && this.assistant.state) {
      this.assistant.state.activeSubpanel = 'menu';
      this.assistant.state.radialMenuOpen = false;
      this.assistant.state.interactionActive = true;
    }
    this.redraw();
    if (typeof this.onBackToMenu === 'function') {
      this.onBackToMenu();
    }
  }

  backToRadial() {
    this.backToMenu();
  }

  close(isExplicitAssistantClose = false) {
    this.currentView = 'standby';
    if (this.assistant && this.assistant.state) {
      this.assistant.state.activeSubpanel = null;
      this.assistant.state.radialMenuOpen = false;
      this.assistant.state.interactionActive = false;
      this.assistant.state.speechState = 'idle';
      if (typeof this.assistant.setTutorState === 'function') {
        this.assistant.setTutorState('idle');
      }
    }
    if (isExplicitAssistantClose && this.speechService && this.isSpeakingVoice) {
      this.speechService.stop();
      this.isSpeakingVoice = false;
    }
    if (isExplicitAssistantClose && typeof this.onClose === 'function') {
      this.onClose();
    }
    this.redraw();
  }

  // ─── Drawing & Button Collider Registration ───────────────────────────────

  _registerButton(id, x, y, w, h, label, callback) {
    const normCenterX = (x + w / 2) / this.canvasW;
    const normCenterY = (y + h / 2) / this.canvasH;
    const posX = (normCenterX - 0.5) * this.panelW;
    const posY = (0.5 - normCenterY) * this.panelH;
    const sizeX = (w / this.canvasW) * this.panelW;
    const sizeY = (h / this.canvasH) * this.panelH;

    const colGeo = new THREE.BoxGeometry(sizeX, sizeY, 0.04);
    const colMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: true });
    const colMesh = new THREE.Mesh(colGeo, colMat);
    colMesh.position.set(posX, posY, 0.02);

    colMesh.userData = {
      type: 'subpanel_button',
      buttonId: id,
      label,
      onPress: () => {
        if (this.sound && typeof this.sound.playBeep === 'function') {
          this.sound.playBeep();
        }
        callback();
      }
    };

    this.group.add(colMesh);
    this.clickableButtons.push(colMesh);
  }

  _clearColliders() {
    this.clickableButtons.forEach((b) => {
      if (b.parent) b.parent.remove(b);
    });
    this.clickableButtons = [];
  }

  _drawButton(ctx, x, y, w, h, text, bg = '#0284c7', border = 'rgba(56, 189, 248, 0.45)', fg = '#FFFFFF', font = '600 15px "Inter", "Segoe UI", sans-serif') {
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = font;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
  }

  _drawTag(ctx, x, y, w, h, text, bg = '#0c2340', fg = '#38bdf8', font = '600 12px "Inter", "Segoe UI", sans-serif') {
    ctx.fillStyle = bg;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = font;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
  }

  _drawPillButton(ctx, x, y, w, h, text, bg = '#0284c7', fg = '#FFFFFF') {
    this._drawButton(ctx, x, y, w, h, text, bg, 'rgba(56, 189, 248, 0.45)', fg);
  }

  redraw() {
    if (!this.ctx) return;
    this._clearColliders();

    const ctx = this.ctx;
    const w = this.canvasW;
    const h = this.canvasH;

    // Professional Navy-and-Cyan Laboratory Workstation
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#071326';
    ctx.fillRect(0, 0, w, h);

    // Dark Navy header bar
    ctx.fillStyle = '#0b1a2e';
    ctx.fillRect(0, 0, w, 75);

    // Subtle Cyan divider
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 75);
    ctx.lineTo(w, 75);
    ctx.stroke();

    // 2. Render Global Navigation Header
    this._renderHeader(ctx, w);

    // 3. Render View Specific Content
    switch (this.currentView) {
      case 'standby':
        this._renderStandbyView(ctx, w, h);
        break;
      case 'menu':
        this._renderMenuView(ctx, w, h);
        break;
      case 'ask_anything':
        this._renderAskAnythingView(ctx, w, h);
        break;
      case 'hints':
        this._renderHintsView(ctx, w, h);
        break;
      case 'next_step':
        this._renderNextStepView(ctx, w, h);
        break;
      case 'video':
        this._renderVideoView(ctx, w, h);
        break;
      case 'examples':
        this._renderExamplesView(ctx, w, h);
        break;
      case 'qna':
        this._renderQnAView(ctx, w, h);
        break;
      default:
        this._renderStandbyView(ctx, w, h);
    }

    this.texture.needsUpdate = true;
  }

  _renderHeader(ctx, w) {
    // Top-left breadcrumb & title
    ctx.font = '600 12px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MAHARASHTRA SSC STD. 10 • SCIENCE & TECHNOLOGY PART 1', 36, 26);

    if (this.currentView === 'standby') {
      ctx.font = 'bold 24px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Ohm’s Law Virtual Laboratory • Interactive Wall Workstation', 36, 52);

      // Status indicator tag
      this._drawTag(ctx, w - 380, 22, 120, 32, '● READY / ONLINE', '#0c2340', '#38bdf8');

      // Standby CTA button in Cyan
      this._drawButton(ctx, w - 240, 18, 200, 40, 'Open Assistant →', '#0284c7', 'rgba(56, 189, 248, 0.5)', '#FFFFFF');
      this._registerButton('hdr_open_menu', w - 240, 18, 200, 40, 'Open Menu', () => this.openMenu());
      return;
    }

    if (this.currentView === 'menu') {
      ctx.font = 'bold 24px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Laboratory AI Assistant • Select Practical Guidance Module', 36, 52);

      this._drawTag(ctx, w - 320, 22, 140, 32, '6 MODULES ACTIVE', '#0c2340', '#38bdf8');

      this._drawButton(ctx, w - 160, 18, 124, 40, 'Standby', '#0c2340', 'rgba(56, 189, 248, 0.3)', '#cbd5e1');
      this._registerButton('hdr_standby', w - 160, 18, 124, 40, 'Standby', () => this.openStandby());
      return;
    }

    const titles = {
      ask_anything: { code: '01 / AI TUTOR', title: 'Ask Anything — Socratic Physics Dialogue' },
      hints: { code: '02 / GUIDANCE', title: 'Progressive Hints — 3-Tier Scaffolding' },
      next_step: { code: '03 / WORKFLOW', title: 'Next Practical Step — Workflow Progression' },
      video: { code: '04 / MEDIA', title: 'Practical Demonstration Video & Chapter Navigation' },
      examples: { code: '05 / THEORY', title: 'Ohm’s Law Calculation Examples & Graph Slope' },
      qna: { code: '06 / EVALUATION', title: 'Questions & Answers — Curriculum Assessment' }
    };

    const cur = titles[this.currentView] || titles.ask_anything;

    ctx.font = '600 12px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(cur.code, 36, 26);

    ctx.font = 'bold 24px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(cur.title, 36, 52);

    // Top Controls: "← Back to Options" in Cyan and "✖ Close Assistant"
    this._drawButton(ctx, w - 340, 18, 170, 40, '← Back to Options', '#0284c7', 'rgba(56, 189, 248, 0.45)', '#FFFFFF');
    this._registerButton('hdr_back', w - 340, 18, 170, 40, 'Back', () => this.backToMenu());

    this._drawButton(ctx, w - 150, 18, 120, 40, '✖ Close', '#0c2340', 'rgba(56, 189, 248, 0.35)', '#cbd5e1');
    this._registerButton('hdr_close', w - 150, 18, 120, 40, 'Close', () => this.close(true));
  }

  // ─── Standby View ─────────────────────────────────────────────────────────

  _renderStandbyView(ctx, w, h) {
    const cardX = 80;
    const cardY = 105;
    const cardW = w - 160;
    const cardH = 920;

    // Outer console panel: Dark Navy #0b1a2e with Cyan border
    ctx.fillStyle = '#0b1a2e';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // Top bar inside panel
    ctx.fillStyle = '#08162b';
    ctx.fillRect(cardX, cardY, cardW, 58);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.moveTo(cardX, cardY + 58);
    ctx.lineTo(cardX + cardW, cardY + 58);
    ctx.stroke();

    ctx.font = 'bold 18px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('LABVERSE AI TUTOR WORKSTATION', cardX + 28, cardY + 29);

    this._drawTag(ctx, cardX + cardW - 150, cardY + 15, 120, 28, '● OPERATIONAL', '#0c2340', '#38bdf8');

    // Main content: Two Columns
    const leftColX = cardX + 44;
    const leftColW = 820;
    const colStartY = cardY + 90;

    ctx.font = '600 12px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('PRACTICAL SPECIFICATION', leftColX, colStartY);

    ctx.font = 'bold 26px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Verification of Ohm’s Law (V = I × R)', leftColX, colStartY + 36);

    ctx.font = '15px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    const specDesc = 'This interactive scientific simulation guides Class 10 students through circuit wiring, taking 5 sets of voltage and current observations, plotting the linear V-I relationship, and verifying resistance via slope R = ΔV / ΔI.';
    this._wrapText(ctx, specDesc, leftColX, colStartY + 72, leftColW, 24);

    // Apparatus checklist box: Card surface #0d223f
    const appY = colStartY + 165;
    ctx.fillStyle = '#0d223f';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(leftColX, appY, leftColW, 230, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 15px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('REQUIRED APPARATUS & INSTRUMENTS', leftColX + 24, appY + 30);

    const apparatusList = [
      '• Standard Resistor Coil (10 Ω calibrated load)',
      '• DC Power Supply Battery (0 – 10 V adjustable)',
      '• DC Ammeter (0 – 1 A, connected in series)',
      '• DC Voltmeter (0 – 10 V, connected in parallel)',
      '• Rheostat (Variable sliding resistor for current adjustment)',
      '• Plug Key Switch (Single-pole circuit contact)'
    ];
    ctx.font = '14px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    apparatusList.forEach((item, idx) => {
      ctx.fillText(item, leftColX + 24, appY + 62 + idx * 26);
    });

    // Right Column: 6 Modules Overview
    const rightColX = cardX + 910;
    const rightColW = cardW - 954;

    ctx.font = '600 12px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('INTEGRATED GUIDANCE MODULES', rightColX, colStartY);

    const modules = [
      { id: '01', title: 'Ask Anything', desc: 'Real-time Socratic AI dialogue for theory & errors' },
      { id: '02', title: 'Progressive Hints', desc: '3-tier guided clues (Conceptual → Directional → Actionable)' },
      { id: '03', title: 'Next Practical Step', desc: 'Authoritative 11-stage workflow manager progression' },
      { id: '04', title: 'AI Practical Video', desc: 'Practical demonstration video & chapter markers' },
      { id: '05', title: 'Ohm’s Law Examples', desc: 'Calculation cards, formulas, and graph slope method' },
      { id: '06', title: 'Questions & Answers', desc: 'Curriculum MCQs with instant validation & scoring' }
    ];

    modules.forEach((mod, idx) => {
      const my = colStartY + 26 + idx * 72;
      ctx.fillStyle = '#0d223f';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(rightColX, my, rightColW, 60, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 14px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(mod.id, rightColX + 18, my + 30);

      ctx.font = 'bold 15px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(mod.title, rightColX + 54, my + 24);

      ctx.font = '13px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(mod.desc, rightColX + 54, my + 44);
    });

    // Bottom Action Strip across panel
    const botY = cardY + cardH - 130;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX, botY);
    ctx.lineTo(cardX + cardW, botY);
    ctx.stroke();

    const ctaW = 540;
    const ctaH = 52;
    const ctaX = cardX + (cardW - ctaW) / 2;
    const ctaY = botY + 24;

    this._drawButton(ctx, ctaX, ctaY, ctaW, ctaH, 'Activate Practical Guidance Display →', '#0284c7', 'rgba(56, 189, 248, 0.5)', '#FFFFFF', '600 16px "Inter", "Segoe UI", sans-serif');
    this._registerButton('standby_cta', ctaX, ctaY, ctaW, ctaH, 'Open Menu', () => this.activateSession());

    ctx.font = '14px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('Click or pinch your 3D Lab Assistant to begin guidance, or tap this display.', cardX + cardW / 2, botY + 98);
    ctx.textAlign = 'left';

    // Register full card area
    this._registerButton('standby_card', cardX, cardY, cardW, cardH, 'Card Tap', () => this.activateSession());
  }

  // ─── Menu View: 6 Options Grid ───────────────────────────────────────────

  _renderMenuView(ctx, w, h) {
    const cards = [
      {
        id: 'ask_anything',
        code: '01 / AI TUTOR',
        title: 'Ask Anything',
        desc: 'Ask questions regarding circuit connections, meter polarities, rheostat function, or Ohm’s law theory. Powered by Gemini Socratic tutor.'
      },
      {
        id: 'hints',
        code: '02 / GUIDANCE',
        title: 'Progressive Hints',
        desc: 'Receive structured, step-by-step scaffolding clues (Conceptual, Directional, and Actionable) without revealing solutions immediately.'
      },
      {
        id: 'next_step',
        code: '03 / WORKFLOW',
        title: 'Next Practical Step',
        desc: 'Inspect current experiment stage progress, prerequisite checklist, apparatus requirements, and stage validation gates.'
      },
      {
        id: 'video',
        code: '04 / MEDIA',
        title: 'AI Practical Video',
        desc: 'Review practical laboratory video demonstration with navigable chapters covering aim, apparatus, wiring, readings, and graph slope.'
      },
      {
        id: 'examples',
        code: '05 / THEORY',
        title: 'Ohm’s Law Examples',
        desc: 'Review 4 verified calculation cards: fundamental formula, standard 10 Ω resistor, V-I graph slope method, and real-world safety fuses.'
      },
      {
        id: 'qna',
        code: '06 / EVALUATION',
        title: 'Questions & Answers',
        desc: 'Test your understanding with 5 curriculum multiple-choice questions featuring instant verification, explanations, and scoring.'
      }
    ];

    const cardW = 560;
    const cardH = 430;
    const startX = 80;
    const gapX = 40;
    const startY = 120;
    const gapY = 40;

    cards.forEach((card, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);

      // Card Background: Dark Navy surface #0d223f with thin Cyan border
      ctx.fillStyle = '#0d223f';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 8);
      ctx.fill();
      ctx.stroke();

      // Top subtle accent line in Cyan (2px)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy + 2);
      ctx.lineTo(cx + cardW - 2, cy + 2);
      ctx.stroke();

      // Card Header: Code & Title
      ctx.font = '600 12px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.code, cx + 24, cy + 32);

      ctx.font = 'bold 22px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(card.title, cx + 24, cy + 68);

      // Divider line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 24, cy + 96);
      ctx.lineTo(cx + cardW - 24, cy + 96);
      ctx.stroke();

      // Description text: Clean line-height
      ctx.font = '15px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#CBD5E1';
      this._wrapText(ctx, card.desc, cx + 24, cy + 128, cardW - 48, 24);

      // Clean rectangular action button across bottom in Cyan
      const btnW = cardW - 48;
      const btnH = 46;
      const btnX = cx + 24;
      const btnY = cy + cardH - btnH - 24;

      this._drawButton(ctx, btnX, btnY, btnW, btnH, 'Open Module →', '#0284c7', 'rgba(56, 189, 248, 0.45)', '#FFFFFF', '600 15px "Inter", "Segoe UI", sans-serif');

      // Register click collider for button and entire card
      this._registerButton(`menu_btn_${card.id}`, btnX, btnY, btnW, btnH, card.title, () => this.openView(card.id));
      this._registerButton(`menu_card_${card.id}`, cx, cy, cardW, cardH - btnH - 28, card.title, () => this.openView(card.id));
    });
  }

  // ─── 1. View: Ask Anything ────────────────────────────────────────────────

  _renderAskAnythingView(ctx, w, h) {
    const startX = 80;
    const contentW = w - 160;

    // 1. Text Input Bar
    ctx.fillStyle = '#0d223f';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, 100, contentW, 58, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '500 16px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Question: "${this.currentQuestionText}"`, startX + 24, 129);

    // Register click on text bar for custom question input
    this._registerButton('ask_input_bar', startX, 100, contentW - 190, 58, 'Input Bar', () => {
      const customQ = window.prompt('Type your question for the AI Physics Assistant:', this.currentQuestionText);
      if (customQ && customQ.trim()) {
        this.currentQuestionText = customQ.trim();
        this.submitQuestion();
      }
    });

    // Send Button in Cyan
    const sendLabel = this.isLoadingAI ? 'Thinking…' : 'Submit Question →';
    const sendBg = this.isLoadingAI ? '#0b1a2e' : '#0284c7';
    this._drawButton(ctx, startX + contentW - 180, 108, 168, 42, sendLabel, sendBg, 'rgba(56, 189, 248, 0.45)', '#FFFFFF', '600 14px "Inter", sans-serif');
    this._registerButton('ask_btn_send', startX + contentW - 180, 108, 168, 42, 'Send', () => this.submitQuestion());

    // 2. Suggested Questions Chips
    ctx.font = '600 12px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('QUICK SUGGESTIONS:', startX, 185);

    const suggestions = [
      'Why is ammeter in series?',
      'Why is voltmeter in parallel?',
      'What is rheostat function?',
      'How do I calculate resistance?',
      'What happens if resistance increases?'
    ];

    let chipX = startX;
    let chipY = 205;
    suggestions.forEach((sug, idx) => {
      ctx.font = '14px "Inter", "Segoe UI", sans-serif';
      const chipW = ctx.measureText(sug).width + 32;
      if (chipX + chipW > startX + contentW) {
        chipX = startX;
        chipY += 42;
      }
      this._drawButton(ctx, chipX, chipY, chipW, 34, sug, '#0c2340', 'rgba(56, 189, 248, 0.3)', '#cbd5e1', '14px "Inter", sans-serif');
      const sugText = sug;
      this._registerButton(`sug_${idx}`, chipX, chipY, chipW, 34, sug, () => {
        this.currentQuestionText = sugText;
        this.submitQuestion();
      });
      chipX += chipW + 12;
    });

    // 3. AI Response Area Card
    const cardY = chipY + 55;
    const cardH = h - cardY - 45;
    ctx.fillStyle = '#0b1a2e';
    ctx.strokeStyle = this.aiError ? 'rgba(239, 68, 68, 0.45)' : 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, cardY, contentW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // Response Header
    ctx.font = 'bold 16px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = this.aiError ? '#f87171' : '#38bdf8';
    ctx.fillText(this.aiError ? 'AI TUTOR NOTICE' : 'SOCRATIC PHYSICS TUTOR RESPONSE', startX + 28, cardY + 32);

    // Audio Voice Controls, Retry Button & Developer Diagnostics Toggle
    let voiceBtnX = startX + contentW - 160;
    if (this.aiError) {
      voiceBtnX = startX + contentW - 150;
      this._drawButton(ctx, startX + contentW - 280, cardY + 18, 120, 36, '🔄 Retry', '#ef4444', 'rgba(239, 68, 68, 0.5)', '#FFFFFF', '600 14px "Inter", sans-serif');
      this._registerButton('ask_btn_retry', startX + contentW - 280, cardY + 18, 120, 36, 'Retry', () => this.submitQuestion());
    }

    const diagLabel = this.showDiagnostics ? 'Hide Report' : '🛠️ Diagnostics';
    const diagX = this.aiError ? (startX + contentW - 425) : (startX + contentW - 305);
    this._drawButton(ctx, diagX, cardY + 18, 135, 36, diagLabel, '#0c2340', 'rgba(56, 189, 248, 0.4)', '#38bdf8', '600 13px "Inter", sans-serif');
    this._registerButton('ask_btn_diag', diagX, cardY + 18, 135, 36, 'Diagnostics', () => {
      this.showDiagnostics = !this.showDiagnostics;
      if (this.showDiagnostics && this.tutorClient && typeof this.tutorClient.checkHealth === 'function') {
        this.tutorClient.checkHealth().then(() => this.redraw());
      }
      this.redraw();
    });

    const voiceLabel = this.isSpeakingVoice ? 'Stop Voice' : 'Listen Voice';
    const voiceBg = this.isSpeakingVoice ? '#0284c7' : '#0c2340';
    const voiceBorder = 'rgba(56, 189, 248, 0.4)';
    const voiceFg = '#FFFFFF';
    this._drawButton(ctx, voiceBtnX, cardY + 18, 140, 36, voiceLabel, voiceBg, voiceBorder, voiceFg, '600 14px "Inter", sans-serif');
    this._registerButton('ask_btn_voice', voiceBtnX, cardY + 18, 140, 36, 'Voice', () => this.toggleVoiceSpeech());

    if (this.showDiagnostics) {
      // ─── VISIBLE DEVELOPER DIAGNOSTIC REPORT ─────────────────────────────
      const diag = (this.tutorClient && typeof this.tutorClient.getDiagnostics === 'function')
        ? this.tutorClient.getDiagnostics()
        : {
          apiBaseUrl: '/api/tutor',
          healthBaseUrl: '/api/health',
          backendReachable: false,
          apiHealthStatus: 'UNKNOWN',
          tutorHealthStatus: 'UNKNOWN',
          keyConfigured: false,
          selectedModelName: 'unknown',
          lastResponseStatus: null,
          lastRequestLatencyMs: null,
          lastErrorCode: this.aiError ? this.aiError.code : 'NONE'
        };

      const diagY = cardY + 70;
      const diagW = contentW - 56;
      const diagH = cardH - 95;

      ctx.fillStyle = '#050c18';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(startX + 28, diagY, diagW, diagH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 15px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('LABVERSE AI TUTOR — DEVELOPER DIAGNOSTIC REPORT', startX + 48, diagY + 30);

      const items = [
        { label: 'Frontend API Base URL', val: diag.apiBaseUrl || '/api/tutor' },
        { label: 'API Health Status (GET /api/health)', val: diag.apiHealthStatus },
        { label: 'Tutor Health Status (GET /api/tutor/health)', val: diag.tutorHealthStatus },
        { label: 'Backend Reachable', val: diag.backendReachable ? 'YES (Connected)' : 'NO (Unreachable)' },
        { label: 'Exact Safe Error Code', val: this.aiError ? this.aiError.code : (diag.lastErrorCode || 'NONE (OK)') },
        { label: 'Server GEMINI_API_KEY Configured', val: diag.keyConfigured ? 'YES (Configured on server)' : 'NO (Missing)' },
        { label: 'Selected Gemini Model', val: diag.selectedModelName || 'gemini-1.5-flash' },
        { label: 'Response Status & Latency', val: `${diag.lastResponseStatus ?? 'N/A'} (Latency: ${diag.lastRequestLatencyMs ? diag.lastRequestLatencyMs + 'ms' : '--'})` }
      ];

      ctx.font = '14px "Inter", "Segoe UI", monospace';
      items.forEach((item, idx) => {
        const rowY = diagY + 65 + idx * 32;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`• ${item.label}:`, startX + 48, rowY);
        ctx.fillStyle = item.label.includes('Error Code') && item.val !== 'NONE (OK)'
          ? '#f87171'
          : (item.val === 'YES (Connected)' || item.val === 'YES (Configured on server)' || item.val === 'OK')
            ? '#4ade80'
            : '#FFFFFF';
        ctx.fillText(String(item.val), startX + 390, rowY);
      });

      ctx.font = '12px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Note: GEMINI_API_KEY value is kept strictly server-side and never exposed to the client.', startX + 48, diagY + diagH - 18);
    } else {
      // Primary Response Message: If error, shows "AI Tutor unavailable — use Guided Steps"
      ctx.font = 'bold 22px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = this.aiError ? '#fbbf24' : '#FFFFFF';
      const mainMsg = this.aiError ? 'AI Tutor unavailable — use Guided Steps' : (this.aiResponse.message || '');
      this._wrapText(ctx, mainMsg, startX + 28, cardY + 85, contentW - 56, 28);

      // In Developer Mode, show exact safe diagnostic code below message
      if (this.aiError && (this.developerMode || this.showDiagnostics)) {
        ctx.font = '600 13px "Inter", monospace';
        ctx.fillStyle = '#f87171';
        ctx.fillText(`[SAFE DIAGNOSTIC CODE: ${this.aiError.code}]`, startX + 28, cardY + 145);
      }

      // Physics Explanation Box: Card surface #0d223f
      const explY = cardY + 185;
      ctx.fillStyle = '#0d223f';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(startX + 28, explY, contentW - 56, 180, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 15px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('DETAILED EXPLANATION', startX + 48, explY + 30);

      ctx.font = '16px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#CBD5E1';
      this._wrapText(ctx, this.aiResponse.explanation || '', startX + 48, explY + 65, contentW - 96, 26);

      // Suggested Action Box
      const actY = explY + 205;
      ctx.fillStyle = '#08162b';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(startX + 28, actY, contentW - 56, 95, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 15px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('RECOMMENDED PRACTICAL ACTION', startX + 48, actY + 30);

      ctx.font = '16px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      this._wrapText(ctx, this.aiResponse.suggestedAction || 'Verify tabletop instruments and observe readings.', startX + 48, actY + 62, contentW - 96, 24);

      // Status Footer
      ctx.font = '12px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Verified Maharashtra SSC Class 10 Physics Model • Gemini AI Service', startX + 24, cardY + cardH - 20);
    }
  }

  // ─── 2. View: Hints ───────────────────────────────────────────────────────

  _renderHintsView(ctx, w, h) {
    const startX = 60;
    const contentW = w - 120;

    let topicName = "Ohm's Law Circuit Guidance";
    let tier1 = "Think about how current flows through the circuit loop like water in a pipe.";
    let tier2 = "Verify whether the ammeter measures total current and voltmeter measures potential difference across the coil.";
    let tier3 = "Ensure Ammeter is in series, Voltmeter in parallel across resistor, and plug key is closed.";

    if (this.bridge && typeof this.bridge.getDetectedMistakes === 'function') {
      const mistakes = this.bridge.getDetectedMistakes();
      if (mistakes && mistakes.length > 0) {
        const m = mistakes[0];
        topicName = `Detected Circuit Issue: ${m.title || m.code}`;
        tier1 = m.hintLevel1 || "Observe the component connections and consider its electrical function.";
        tier2 = m.hintLevel2 || "Check the tabletop schematic terminals highlighted in blue.";
        tier3 = m.hintLevel3 || m.remediation || "Connect the highlighted terminals matching the circuit diagram.";
      }
    }

    // Tier Selector Tabs
    const tiers = [
      { num: 1, label: 'Tier 1: Conceptual', desc: 'Guiding clue without revealing direct answer' },
      { num: 2, label: 'Tier 2: Directional', desc: 'Points toward apparatus & connections' },
      { num: 3, label: 'Tier 3: Actionable', desc: 'Specific corrective instruction' }
    ];

    const tabW = (contentW - 30) / 3;
    tiers.forEach((t, idx) => {
      const bx = startX + idx * (tabW + 15);
      const isCur = this.currentHintTier === t.num;
      const bg = isCur ? '#142337' : '#0e1622';
      const border = isCur ? '#0284c7' : '#1e2d42';

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = isCur ? 1.5 : 1;
      ctx.beginPath();
      ctx.roundRect(bx, 95, tabW, 64, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 15px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = isCur ? '#38bdf8' : '#94a3b8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label, bx + 16, 118);

      ctx.font = '12px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = isCur ? '#cbd5e1' : '#64748b';
      ctx.fillText(t.desc, bx + 16, 142);

      this._registerButton(`hint_tab_${t.num}`, bx, 95, tabW, 64, t.label, () => {
        this.currentHintTier = t.num;
        this.redraw();
      });
    });

    // Main Clue Card
    const cardY = 180;
    const cardH = 680;
    ctx.fillStyle = '#111b2b';
    ctx.strokeStyle = '#20324d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, cardY, contentW, cardH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0ea5e9';
    ctx.fillText('DIAGNOSTIC GUIDANCE CONTEXT', startX + 24, cardY + 32);

    ctx.font = '600 22px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(topicName, startX + 24, cardY + 68);

    // Clue Content Box
    const clueBoxY = cardY + 110;
    ctx.fillStyle = '#0a111a';
    ctx.strokeStyle = '#1e2d42';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX + 24, clueBoxY, contentW - 48, 220, 4);
    ctx.fill();
    ctx.stroke();

    const activeHintText = this.currentHintTier === 1 ? tier1 : (this.currentHintTier === 2 ? tier2 : tier3);

    ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`ACTIVE TIER ${this.currentHintTier} CLUE`, startX + 44, clueBoxY + 32);

    ctx.font = '18px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    this._wrapText(ctx, activeHintText, startX + 44, clueBoxY + 74, contentW - 88, 28);

    // Navigation Controls
    const btnY = cardY + cardH - 80;
    if (this.currentHintTier > 1) {
      this._drawButton(ctx, startX + 24, btnY, 180, 44, '← Previous Tier', '#0e1622', '#1e2d42', '#cbd5e1');
      this._registerButton('hint_prev', startX + 24, btnY, 180, 44, 'Prev', () => {
        this.currentHintTier--;
        this.redraw();
      });
    }

    if (this.currentHintTier < 3) {
      this._drawButton(ctx, startX + 220, btnY, 180, 44, 'Next Tier →', '#142337', '#0284c7', '#38bdf8');
      this._registerButton('hint_next', startX + 220, btnY, 180, 44, 'Next', () => {
        this.currentHintTier++;
        this.redraw();
      });
    }

    this._drawButton(ctx, startX + contentW - 224, btnY, 200, 44, 'Refresh Status ↻', '#0e1622', '#1e2d42', '#38bdf8');
    this._registerButton('hint_refresh', startX + contentW - 224, btnY, 200, 44, 'Refresh', () => {
      this.redraw();
    });
  }

  // ─── 3. View: Next Step ───────────────────────────────────────────────────

  _renderNextStepView(ctx, w, h) {
    const startX = 60;
    const contentW = w - 120;

    let stageInfo = null;
    let stepNum = 4;
    let totalSteps = 11;
    if (this.workflowManager && typeof this.workflowManager.getCurrentStageInfo === 'function') {
      stageInfo = this.workflowManager.getCurrentStageInfo();
      stepNum = stageInfo.step;
      totalSteps = stageInfo.total;
    }

    const title = stageInfo ? stageInfo.title : "Circuit Assembly & Wiring Verification";
    const desc = stageInfo ? stageInfo.objective : "Connect all 7 circuit wires in sequence according to the Maharashtra SSC standard schematic.";
    const prerequisites = stageInfo ? stageInfo.prerequisites : "1. Wire battery to key switch.\n2. Connect ammeter in series.\n3. Connect voltmeter in parallel.";

    const cardY = 95;
    const cardH = 765;
    ctx.fillStyle = '#111b2b';
    ctx.strokeStyle = '#20324d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, cardY, contentW, cardH, 6);
    ctx.fill();
    ctx.stroke();

    // Stage Progress Header
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0ea5e9';
    ctx.fillText(`WORKFLOW PROGRESSION • STAGE ${stepNum} OF ${totalSteps}`, startX + 24, cardY + 32);

    ctx.font = '600 24px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, startX + 24, cardY + 68);

    // Progress Bar
    const progY = cardY + 100;
    ctx.fillStyle = '#0a111a';
    ctx.beginPath();
    ctx.roundRect(startX + 24, progY, contentW - 48, 8, 4);
    ctx.fill();

    const pct = Math.min(1.0, stepNum / totalSteps);
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(startX + 24, progY, (contentW - 48) * pct, 8, 4);
    ctx.fill();

    // Objective Box
    const objY = progY + 36;
    ctx.fillStyle = '#0a111a';
    ctx.strokeStyle = '#1e2d42';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX + 24, objY, contentW - 48, 120, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CURRENT STAGE OBJECTIVE', startX + 44, objY + 28);

    ctx.font = '15px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    this._wrapText(ctx, desc, startX + 44, objY + 60, contentW - 88, 24);

    // Prerequisite Checklist Box
    const preY = objY + 144;
    ctx.fillStyle = '#0a111a';
    ctx.strokeStyle = '#1e2d42';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX + 24, preY, contentW - 48, 140, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('PREREQUISITE VALIDATION GATES', startX + 44, preY + 28);

    ctx.font = '14px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    this._wrapText(ctx, prerequisites, startX + 44, preY + 58, contentW - 88, 24);

    // Action Buttons
    const btnY = cardY + cardH - 80;
    this._drawButton(ctx, startX + 24, btnY, 240, 44, 'Advance Stage (Validate)', '#142337', '#0284c7', '#38bdf8', '600 14px "Inter", sans-serif');
    this._registerButton('step_advance', startX + 24, btnY, 240, 44, 'Advance', () => {
      if (this.workflowManager && typeof this.workflowManager.advanceStage === 'function') {
        const res = this.workflowManager.advanceStage();
        if (this.assistant && this.assistant.setTutorState) {
          this.assistant.setTutorState(res.success ? 'speaking' : 'warning', {
            text: res.message || (res.success ? 'Stage advanced successfully!' : 'Prerequisite incomplete.')
          });
        }
        this.redraw();
      }
    });

    this._drawButton(ctx, startX + 280, btnY, 200, 44, 'Check Circuit State ↻', '#0e1622', '#1e2d42', '#cbd5e1', '14px "Inter", sans-serif');
    this._registerButton('step_check', startX + 280, btnY, 200, 44, 'Check', () => {
      this.redraw();
    });
  }

  // ─── 4. View: Video ───────────────────────────────────────────────────────

  _renderVideoView(ctx, w, h) {
    const startX = 60;
    const contentW = w - 120;
    const vid = PRACTICAL_VIDEOS.ohmsLaw;

    // Simulated Video Monitor Viewport
    const screenY = 95;
    const screenH = 380;
    ctx.fillStyle = '#060a12';
    ctx.strokeStyle = '#20324d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, screenY, contentW, screenH, 4);
    ctx.fill();
    ctx.stroke();

    // Video Graphics / Watermark
    ctx.font = '600 22px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(vid.title, startX + contentW / 2, screenY + 140);

    ctx.font = '14px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    const curChapter = vid.chapters.find((c) => c.id === this.videoState.currentChapter) || vid.chapters[0];
    ctx.fillText(`Active Chapter: ${curChapter.title}`, startX + contentW / 2, screenY + 175);

    // Play / Pause Button
    const playIcon = this.videoState.isPlaying ? '⏸ Pause' : '▶ Play Demonstration';
    this._drawButton(ctx, startX + contentW / 2 - 100, screenY + 220, 200, 42, playIcon, '#142337', '#0284c7', '#38bdf8', '600 14px "Inter", sans-serif');
    this._registerButton('vid_play', startX + contentW / 2 - 100, screenY + 220, 200, 42, 'Play', () => {
      this.videoState.isPlaying = !this.videoState.isPlaying;
      this.redraw();
    });

    // Timeline Scrubber Bar
    const scrubY = screenY + screenH - 30;
    ctx.fillStyle = '#111a28';
    ctx.beginPath();
    ctx.roundRect(startX + 24, scrubY, contentW - 48, 6, 3);
    ctx.fill();

    const progPct = this.videoState.duration > 0 ? this.videoState.currentTime / this.videoState.duration : 0.25;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(startX + 24, scrubY, (contentW - 48) * progPct, 6, 3);
    ctx.fill();

    // Chapter List Table
    const chapY = screenY + screenH + 24;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0ea5e9';
    ctx.textAlign = 'left';
    ctx.fillText('DEMONSTRATION CHAPTER MARKERS', startX, chapY);

    vid.chapters.forEach((chap, idx) => {
      const cy = chapY + 18 + idx * 56;
      const isCur = this.videoState.currentChapter === chap.id;
      const bg = isCur ? '#142337' : '#111b2b';
      const border = isCur ? '#0284c7' : '#1e2d42';

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(startX, cy, contentW, 46, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 14px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = isCur ? '#38bdf8' : '#e2e8f0';
      ctx.fillText(chap.title, startX + 20, cy + 24);

      ctx.font = '13px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = isCur ? '#cbd5e1' : '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText(chap.desc, startX + contentW - 20, cy + 24);
      ctx.textAlign = 'left';

      this._registerButton(`vid_chap_${chap.id}`, startX, cy, contentW, 46, chap.title, () => {
        this.videoState.currentChapter = chap.id;
        this.videoState.currentTime = chap.time;
        this.videoState.isPlaying = true;
        this.redraw();
      });
    });
  }

  // ─── 5. View: Examples ────────────────────────────────────────────────────

  _renderExamplesView(ctx, w, h) {
    const startX = 60;
    const contentW = w - 120;
    const ex = EXAMPLES_DATA[this.currentExampleIndex] || EXAMPLES_DATA[0];

    // Example Tabs
    const tabW = (contentW - 30) / EXAMPLES_DATA.length;
    EXAMPLES_DATA.forEach((item, idx) => {
      const tx = startX + idx * (tabW + 10);
      const isCur = this.currentExampleIndex === idx;
      const bg = isCur ? '#142337' : '#0e1622';
      const border = isCur ? '#0284c7' : '#1e2d42';

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, 95, tabW, 44, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = isCur ? '#38bdf8' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Card ${idx + 1}: ${item.topic.split(' ')[0]}`, tx + tabW / 2, 117);
      ctx.textAlign = 'left';

      this._registerButton(`ex_tab_${idx}`, tx, 95, tabW, 44, item.title, () => {
        this.currentExampleIndex = idx;
        this.redraw();
      });
    });

    // Main Card
    const cardY = 155;
    const cardH = 705;
    ctx.fillStyle = '#111b2b';
    ctx.strokeStyle = '#20324d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, cardY, contentW, cardH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0ea5e9';
    ctx.fillText(`THEORY CARD 0${ex.id} / 04`, startX + 24, cardY + 28);

    ctx.font = '600 22px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${ex.title} — ${ex.topic}`, startX + 24, cardY + 58);

    ctx.font = '14px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    this._wrapText(ctx, ex.description, startX + 24, cardY + 92, contentW - 48, 22);

    // Formula & Given Values Box
    const fY = cardY + 140;
    ctx.fillStyle = '#0a111a';
    ctx.strokeStyle = '#1e2d42';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX + 24, fY, contentW - 48, 95, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`MATHEMATICAL FORMULA: ${ex.formula}`, startX + 44, fY + 28);

    ctx.font = '14px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    this._wrapText(ctx, `Given parameters: ${ex.given}`, startX + 44, fY + 58, contentW - 88, 22);

    // Step-by-Step Calculation Box
    const cY = fY + 115;
    ctx.fillStyle = '#0a141d';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX + 24, cY, contentW - 48, 120, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('STEP-BY-STEP CALCULATION', startX + 44, cY + 28);

    ctx.font = '500 15px "Consolas", monospace';
    ctx.fillStyle = '#ffffff';
    this._wrapText(ctx, ex.calculation, startX + 44, cY + 58, contentW - 88, 24);

    ctx.font = '600 14px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Result: ${ex.result}`, startX + 44, cY + 96);

    // Pedagogical Explanation Box
    const eY = cY + 140;
    ctx.fillStyle = '#0a111a';
    ctx.strokeStyle = '#1e2d42';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX + 24, eY, contentW - 48, 100, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('CURRICULUM PEDAGOGICAL CONTEXT', startX + 44, eY + 28);

    ctx.font = '14px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    this._wrapText(ctx, ex.explanation, startX + 44, eY + 56, contentW - 88, 22);

    // Navigation Buttons
    const btnY = cardY + cardH - 70;
    if (this.currentExampleIndex > 0) {
      this._drawButton(ctx, startX + 24, btnY, 180, 42, '← Previous Card', '#0e1622', '#1e2d42', '#cbd5e1');
      this._registerButton('ex_prev', startX + 24, btnY, 180, 42, 'Prev', () => {
        this.currentExampleIndex--;
        this.redraw();
      });
    }

    if (this.currentExampleIndex < EXAMPLES_DATA.length - 1) {
      this._drawButton(ctx, startX + contentW - 204, btnY, 180, 42, 'Next Card →', '#142337', '#0284c7', '#38bdf8');
      this._registerButton('ex_next', startX + contentW - 204, btnY, 180, 42, 'Next', () => {
        this.currentExampleIndex++;
        this.redraw();
      });
    }
  }

  // ─── 6. View: Questions & Answers (MCQs) ──────────────────────────────────

  _renderQnAView(ctx, w, h) {
    const startX = 60;
    const contentW = w - 120;
    const q = MCQS_DATA[this.currentMCQIndex] || MCQS_DATA[0];

    // Score & Progress Header
    const scorePct = this.sessionScore.total > 0 ? Math.round((this.sessionScore.correct / this.sessionScore.total) * 100) : 0;

    const cardY = 95;
    const cardH = 765;
    ctx.fillStyle = '#111b2b';
    ctx.strokeStyle = '#20324d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, cardY, contentW, cardH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0ea5e9';
    ctx.fillText(`CURRICULUM ASSESSMENT • QUESTION ${this.currentMCQIndex + 1} OF ${MCQS_DATA.length}`, startX + 24, cardY + 30);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`SCORE: ${this.sessionScore.correct} / ${this.sessionScore.total} (${scorePct}%)`, startX + contentW - 24, cardY + 30);
    ctx.textAlign = 'left';

    // Question Prompt
    ctx.font = '600 20px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    this._wrapText(ctx, q.question, startX + 24, cardY + 68, contentW - 48, 28);

    // 4 Selectable Options
    const optStartY = cardY + 130;
    q.options.forEach((optText, idx) => {
      const oy = optStartY + idx * 64;
      const isSelected = this.selectedOptionIndex === idx;
      const isCorrect = idx === q.correctIndex;

      let bg = '#0e1622';
      let border = '#1e2d42';
      let textCol = '#cbd5e1';

      if (this.isAnswerSubmitted) {
        if (isCorrect) {
          bg = '#064e3b';
          border = '#10b981';
          textCol = '#a7f3d0';
        } else if (isSelected) {
          bg = '#451a1a';
          border = '#ef4444';
          textCol = '#fecaca';
        }
      } else if (isSelected) {
        bg = '#142337';
        border = '#0284c7';
        textCol = '#38bdf8';
      }

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(startX + 24, oy, contentW - 48, 50, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = '500 15px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = textCol;
      ctx.fillText(optText, startX + 44, oy + 26);

      if (!this.isAnswerSubmitted) {
        this._registerButton(`mcq_opt_${idx}`, startX + 24, oy, contentW - 48, 50, optText, () => {
          this.selectedOptionIndex = idx;
          this.isAnswerSubmitted = true;
          this.sessionScore.total++;
          if (idx === q.correctIndex) {
            this.sessionScore.correct++;
            if (this.assistant && this.assistant.setTutorState) {
              this.assistant.setTutorState('speaking', { text: 'Correct! Excellent physics reasoning!' });
            }
          } else {
            if (this.assistant && this.assistant.setTutorState) {
              this.assistant.setTutorState('explaining', { text: 'Incorrect. Let me explain why...' });
            }
          }
          this.redraw();
        });
      }
    });

    // Explanation Box (Shown after submission)
    if (this.isAnswerSubmitted) {
      const isCorrect = this.selectedOptionIndex === q.correctIndex;
      const explY = optStartY + 276;

      ctx.fillStyle = isCorrect ? '#06291a' : '#2b1212';
      ctx.strokeStyle = isCorrect ? '#059669' : '#dc2626';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(startX + 24, explY, contentW - 48, 140, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = isCorrect ? '#34d399' : '#f87171';
      ctx.fillText(isCorrect ? 'CORRECT ASSESSMENT' : 'INCORRECT ASSESSMENT', startX + 44, explY + 28);

      ctx.font = '14px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#f8fafc';
      this._wrapText(ctx, q.explanation, startX + 44, explY + 58, contentW - 88, 22);

      // Bottom Navigation Buttons
      const btnY = cardY + cardH - 70;
      if (!isCorrect) {
        this._drawButton(ctx, startX + 24, btnY, 180, 42, 'Try Again ↻', '#142337', '#0284c7', '#38bdf8');
        this._registerButton('mcq_retry', startX + 24, btnY, 180, 42, 'Retry', () => {
          this.isAnswerSubmitted = false;
          this.selectedOptionIndex = null;
          this.redraw();
        });
      }

      const nextLabel = (this.currentMCQIndex < MCQS_DATA.length - 1) ? 'Next Question →' : 'Restart Assessment ↻';
      this._drawButton(ctx, startX + contentW - 204, btnY, 180, 42, nextLabel, '#142337', '#0284c7', '#38bdf8');
      this._registerButton('mcq_next', startX + contentW - 204, btnY, 180, 42, 'Next', () => {
        if (this.currentMCQIndex < MCQS_DATA.length - 1) {
          this.currentMCQIndex++;
        } else {
          this.currentMCQIndex = 0;
        }
        this.selectedOptionIndex = null;
        this.isAnswerSubmitted = false;
        this.redraw();
      });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    const words = text.split(' ');
    let line = '';
    let curY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  }

  async submitQuestion() {
    if (!this.currentQuestionText || this.isLoadingAI) return;

    this.isLoadingAI = true;
    this.aiError = null;
    const reqId = ++this.currentRequestId;
    this.redraw();

    if (this.assistant && this.assistant.state) {
      this.assistant.state.aiRequestState = 'loading';
      if (typeof this.assistant.setTutorState === 'function') {
        this.assistant.setTutorState('thinking', { text: `Thinking about: "${this.currentQuestionText}"` });
      }
    }

    try {
      if (this.tutorClient && typeof this.tutorClient.askQuestion === 'function') {
        const simulationCtx = this.bridge ? this.bridge.getAIContext() : null;
        const payload = {
          question: this.currentQuestionText,
          language: 'English',
          customContext: simulationCtx
        };

        const res = await this.tutorClient.askQuestion(payload);
        if (this.currentRequestId !== reqId) return;

        if (res && res.success && res.response) {
          this.aiResponse = {
            message: res.response.message || 'Under Ohm’s law, V = I * R.',
            explanation: res.response.explanation || 'Potential difference across a conductor is proportional to current.',
            hint: res.response.hint || 'Check terminal connections.',
            suggestedAction: res.response.suggestedAction || 'Observe instrument readings.'
          };
          this.aiError = null;
          if (this.assistant) {
            if (this.assistant.state) this.assistant.state.aiRequestState = 'success';
            if (typeof this.assistant.setTutorState === 'function') {
              this.assistant.setTutorState('speaking', { text: this.aiResponse.message });
            }
          }
        } else {
          const errObj = (res && res.error) ? res.error : { code: 'AI_UNAVAILABLE', message: 'Tutor backend unavailable' };
          this.aiError = errObj;
          this.aiResponse = {
            message: 'AI Tutor unavailable — use Guided Steps',
            explanation: 'Under Maharashtra SSC Std. 10 Ch. 4: Ohm’s Law establishes V = I * R for metallic conductors at constant temperature.',
            hint: 'Review the apparatus connections and observe tabletop meter readings.',
            suggestedAction: 'Use Guided Practical Steps or Progressive Hints; practical continues normally.'
          };
          if (this.assistant) {
            if (this.assistant.state) this.assistant.state.aiRequestState = 'error';
            if (typeof this.assistant.setTutorState === 'function') {
              this.assistant.setTutorState('warning', { text: 'AI Tutor unavailable — use Guided Steps' });
            }
          }
        }
      } else {
        this.aiError = { code: 'CLIENT_UNINITIALIZED', message: 'AI Tutor client is not initialized.' };
        this.aiResponse = {
          message: 'AI Tutor unavailable — use Guided Steps',
          explanation: 'Under Maharashtra SSC Std. 10 Ch. 4: Ohm’s Law establishes V = I * R for metallic conductors at constant temperature.',
          hint: 'Observe the 3D tabletop instruments and adjust the rheostat.',
          suggestedAction: 'Use Guided Practical Steps or Progressive Hints.'
        };
        if (this.assistant && this.assistant.state) {
          this.assistant.state.aiRequestState = 'error';
        }
      }
    } catch (err) {
      if (this.currentRequestId !== reqId) return;
      console.warn('[AssistantSubpanels] Error asking tutor client:', err);
      this.aiError = { code: 'NETWORK_ERROR', message: err.message || 'Connection error' };
      this.aiResponse = {
        message: 'AI Tutor unavailable — use Guided Steps',
        explanation: 'Ohm’s Law verifies V ∝ I across a metallic conductor under constant physical conditions (R = V / I).',
        hint: 'Follow the guided practical steps on the clipboard stand.',
        suggestedAction: 'Click on Next Practical Step or Progressive Hints.'
      };
      if (this.assistant) {
        if (this.assistant.state) this.assistant.state.aiRequestState = 'error';
        if (typeof this.assistant.setTutorState === 'function') {
          this.assistant.setTutorState('warning', { text: 'AI Tutor unavailable — use Guided Steps' });
        }
      }
    } finally {
      if (this.currentRequestId === reqId) {
        this.isLoadingAI = false;
        this.redraw();
      }
    }
  }

  toggleVoiceSpeech() {
    if (!this.speechService) return;

    if (this.sound && typeof this.sound.unlock === 'function') {
      this.sound.unlock();
    }

    if (this.isSpeakingVoice) {
      this.speechService.stop();
      this.isSpeakingVoice = false;
      if (this.assistant && this.assistant.state) {
        this.assistant.state.speechState = 'idle';
      }
    } else {
      const txt = (this.aiResponse && this.aiResponse.message) ? this.aiResponse.message : 'Welcome to Ohm’s Law.';
      try {
        this.speechService.speak(txt);
        this.isSpeakingVoice = true;
        if (this.assistant && this.assistant.state) {
          this.assistant.state.speechState = 'speaking';
        }
      } catch (e) {
        console.warn('[AssistantSubpanels] Speech failed:', e);
        if (this.assistant && this.assistant.state) {
          this.assistant.state.speechState = 'error';
        }
      }
    }
    this.redraw();
  }

  getClickableObjects() {
    return this.group.visible ? this.clickableButtons : [];
  }
}
