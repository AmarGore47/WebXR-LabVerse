/**
 * assistantSubpanels.js
 * Dedicated 3D Floating Glass Holographic Subpanels for LabVerse AI Assistant.
 *
 * Renders the 6 primary educational feature panels:
 * 1. Ask Anything (text question input, suggested questions, AI response, TTS)
 * 2. Hints (3-tier progressive hints: Conceptual, Directional, Actionable)
 * 3. Next Step (authoritative workflow manager stage, explanation, apparatus needed)
 * 4. AI Video (practical demonstration with chapters, playback controls)
 * 5. Examples (Ohm's law calculation cards, formula, graph slope, real-world)
 * 6. Questions & Answers (MCQs with 4 options, verified answer keys, explanations, score)
 *
 * Visual styling:
 * - Dark navy holographic glass chassis with cyan-blue accents.
 * - Positioned beside the 3D Lab Assistant (x ~ 0.88, y ~ 1.28, z ~ 0.42), facing student.
 * - Never covers the workbench, circuit, or apparatus.
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

    // Wall-Mounted 2D AI Assistant Interface on left wall (inside red-marked wall area)
    this.group = new THREE.Group();
    this.group.name = 'AssistantWallDisplay';
    this.group.position.set(-2.95, 1.55, 1.15);
    // Parallel to left wall, angled slightly (4.5 deg) towards student at workbench (0, 1.25, 0.82)
    this.group.rotation.set(0, Math.PI / 2 - 0.08, 0);

    // Permanent laboratory wall-mounted display: always present in scene
    this.group.visible = true;
    this.currentView = 'standby'; // 'standby' | 'menu' | 'ask_anything' | 'hints' | 'next_step' | 'video' | 'examples' | 'qna'
    this.aiError = null;
    this.currentRequestId = 0;

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

    // High-DPI Landscape Wall Display: 1600x920 canvas texture on 1.70m x 0.98m plane
    this.canvasW = 1600;
    this.canvasH = 920;
    this.panelW = 1.70;
    this.panelH = 0.98;
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
    // Wall-Mounted Outer Sleek Metallic Chassis
    const frameGeo = new THREE.BoxGeometry(this.panelW + 0.04, this.panelH + 0.04, 0.02);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x071326,
      roughness: 0.35,
      metalness: 0.85,
      emissive: 0x0284c7,
      emissiveIntensity: 0.06
    });
    this.frameMesh = new THREE.Mesh(frameGeo, frameMat);
    this.group.add(this.frameMesh);

    // Subtle Glowing Cyan Trim Border
    const trimGeo = new THREE.BoxGeometry(this.panelW + 0.045, this.panelH + 0.045, 0.005);
    const trimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.z = 0.008;
    this.group.add(trimMesh);
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
    this.screenMesh.position.z = 0.011;
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

  redraw() {
    if (!this.ctx) return;
    this._clearColliders();

    const ctx = this.ctx;
    const w = this.canvasW;
    const h = this.canvasH;

    // 1. Dark navy glass background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#06101e';
    ctx.fillRect(0, 0, w, h);

    // Subtle header gradient
    const headerGrad = ctx.createLinearGradient(0, 0, w, 0);
    headerGrad.addColorStop(0, '#0c2340');
    headerGrad.addColorStop(1, '#07162c');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, w, 90);

    // Bottom border for header
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 90);
    ctx.lineTo(w, 90);
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
    if (this.currentView === 'standby') {
      ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤖  AI Lab Assistant | Physics Practical Guide', 32, 42);

      ctx.font = '16px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Maharashtra State Board • SSC Std. 10 Physics • Ohm’s Law Practical', 78, 68);

      this._drawPillButton(ctx, w - 240, 22, 200, 46, '▶ Open Guidance', '#0284c7', '#ffffff');
      this._registerButton('hdr_open_menu', w - 240, 22, 200, 46, 'Open Menu', () => this.openMenu());
      return;
    }

    if (this.currentView === 'menu') {
      ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡  AI Assistant — Select Practical Guidance', 32, 42);

      ctx.font = '16px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Choose one of the 6 educational options below to explore Ohm’s Law', 78, 68);

      this._drawPillButton(ctx, w - 180, 22, 140, 46, '✖ Standby', '#475569', '#ffffff');
      this._registerButton('hdr_standby', w - 180, 22, 140, 46, 'Standby', () => this.openStandby());
      return;
    }

    const titles = {
      ask_anything: { icon: '💬', title: 'Ask Your AI Assistant', sub: 'Context-Aware Socratic Tutor' },
      hints: { icon: '💡', title: 'Progressive Hints', sub: '3-Tier Guidance (Maharashtra SSC)' },
      next_step: { icon: '👣', title: 'Next Practical Step', sub: 'Ohm’s Law Workflow Progression' },
      video: { icon: '🎥', title: 'AI Practical Video', sub: 'Laboratory Demonstration & Chapters' },
      examples: { icon: '📐', title: 'Ohm’s Law Examples', sub: 'Calculations, Formulas & Real-World' },
      qna: { icon: '❓', title: 'Questions & Answers', sub: 'Interactive MCQs with Instant Feedback' }
    };

    const cur = titles[this.currentView] || titles.ask_anything;

    // Title & Icon
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${cur.icon}  ${cur.title}`, 32, 42);

    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(cur.sub, 78, 68);

    // Top Controls: "⬅ All Options" and "✖ Standby"
    this._drawPillButton(ctx, w - 370, 22, 180, 46, '⬅ All Options', '#0284c7', '#ffffff');
    this._registerButton('hdr_back', w - 370, 22, 180, 46, 'Back', () => this.backToMenu());

    this._drawPillButton(ctx, w - 170, 22, 130, 46, '✖ Standby', '#475569', '#ffffff');
    this._registerButton('hdr_close', w - 170, 22, 130, 46, 'Close', () => this.close(true));
  }

  // ─── Standby View ─────────────────────────────────────────────────────────

  _renderStandbyView(ctx, w, h) {
    const cardX = 120;
    const cardY = 130;
    const cardW = w - 240;
    const cardH = 710;

    // Outer card
    ctx.fillStyle = '#07152b';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();

    // Inner header band
    ctx.fillStyle = '#0c2242';
    ctx.beginPath();
    ctx.roundRect(cardX + 4, cardY + 4, cardW - 8, 140, [18, 18, 0, 0]);
    ctx.fill();

    // Welcome title & subtitle
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🤖  AI Laboratory Assistant Standby', cardX + 40, cardY + 55);

    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Interactive Socratic Science Tutor for Maharashtra SSC Class 10 Physics', cardX + 40, cardY + 105);

    // Feature highlights preview
    const features = [
      { icon: '💬', title: 'Ask Anything', desc: 'Real-time Socratic AI dialogue for questions on meters, circuits & laws' },
      { icon: '💡', title: 'Progressive Hints', desc: '3-tier guided clues (Conceptual ➔ Directional ➔ Actionable)' },
      { icon: '👣', title: 'Next Practical Step', desc: 'Authoritative workflow progression and step-by-step guidance' },
      { icon: '🎥', title: 'AI Practical Video', desc: 'Demonstration video with chapter markers and procedure walkthrough' },
      { icon: '📐', title: 'Ohm’s Law Examples', desc: 'Detailed calculation cards, formulas, and V-I graph slope calculations' },
      { icon: '❓', title: 'Questions & Answers', desc: 'Maharashtra SSC curriculum MCQs with instant feedback and score' }
    ];

    const colW = (cardW - 120) / 2;
    const startY = cardY + 175;
    features.forEach((feat, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const fx = cardX + 40 + col * (colW + 40);
      const fy = startY + row * 110;

      ctx.fillStyle = '#0a1a33';
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(fx, fy, colW, 92, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.fillText(`${feat.icon}  ${feat.title}`, fx + 20, fy + 32);

      ctx.font = '15px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      this._wrapText(ctx, feat.desc, fx + 24, fy + 62, colW - 40, 20);
    });

    // Primary Call to Action Button at bottom
    const ctaW = 560;
    const ctaH = 68;
    const ctaX = cardX + (cardW - ctaW) / 2;
    const ctaY = cardY + cardH - 100;

    this._drawPillButton(ctx, ctaX, ctaY, ctaW, ctaH, '▶  Click Avatar or Tap Here to Open Assistant', '#0284c7', '#ffffff');
    this._registerButton('standby_cta', ctaX, ctaY, ctaW, ctaH, 'Open Assistant', () => this.activateSession());
    this._registerButton('standby_card', cardX, cardY, cardW, cardH - 110, 'Card Tap', () => this.activateSession());
  }

  // ─── Menu View: 6 Options Grid ───────────────────────────────────────────

  _renderMenuView(ctx, w, h) {
    const cards = [
      {
        id: 'ask_anything',
        icon: '💬',
        title: 'Ask Anything',
        subtitle: 'Socratic AI Dialogue',
        desc: 'Ask any question about Ohm’s law, meter connections, rheostat controls, or experiment theory. Powered by Gemini Socratic tutor.',
        badge: 'AI Powered',
        badgeColor: '#38bdf8',
        btnText: 'Open Chat & Voice ➔'
      },
      {
        id: 'hints',
        icon: '💡',
        title: 'Progressive Hints',
        subtitle: '3-Tier Scaffolding',
        desc: 'Step through Conceptual, Directional, and Actionable guidance without giving away direct answers immediately.',
        badge: 'Curriculum',
        badgeColor: '#f59e0b',
        btnText: 'View Clues ➔'
      },
      {
        id: 'next_step',
        icon: '👣',
        title: 'Next Practical Step',
        subtitle: 'Workflow Progression',
        desc: 'Check current stage status, next apparatus to connect, rheostat setting, or observation recording task.',
        badge: 'Live State',
        badgeColor: '#10b981',
        btnText: 'See Next Step ➔'
      },
      {
        id: 'video',
        icon: '🎥',
        title: 'AI Practical Video',
        subtitle: 'Demonstration & Chapters',
        desc: 'Watch laboratory demonstration video with navigable chapters covering aim, apparatus, wiring, and graph slope.',
        badge: 'Multimedia',
        badgeColor: '#ec4899',
        btnText: 'Watch Video ➔'
      },
      {
        id: 'examples',
        icon: '📐',
        title: 'Ohm’s Law Examples',
        subtitle: 'Formulas & Calculations',
        desc: 'Explore 4 detailed calculation cards: fundamental formula, 10 Ω resistor calculation, V-I graph slope, and fuse engineering.',
        badge: 'Math & Practice',
        badgeColor: '#a855f7',
        btnText: 'Explore Examples ➔'
      },
      {
        id: 'qna',
        icon: '❓',
        title: 'Questions & Answers',
        subtitle: 'Curriculum MCQs',
        desc: 'Test your understanding with 5 Maharashtra SSC multiple choice questions featuring instant feedback and scoring.',
        badge: 'Assessment',
        badgeColor: '#06b6d4',
        btnText: 'Start Quiz ➔'
      }
    ];

    const cardW = 480;
    const cardH = 360;
    const startX = 45;
    const gapX = 35;
    const startY = 120;
    const gapY = 35;

    cards.forEach((card, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);

      // Card Background
      ctx.fillStyle = '#0b1d38';
      ctx.strokeStyle = '#1e4370';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 16);
      ctx.fill();
      ctx.stroke();

      // Top accent strip
      ctx.fillStyle = card.badgeColor;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, 6, [16, 16, 0, 0]);
      ctx.fill();

      // Header: Icon + Title
      ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.icon, cx + 24, cy + 50);

      ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(card.title, cx + 78, cy + 42);

      ctx.font = '14px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(card.subtitle, cx + 78, cy + 66);

      // Badge
      ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
      const badgeText = card.badge.toUpperCase();
      const badgeW = ctx.measureText(badgeText).width + 18;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.strokeStyle = card.badgeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx + cardW - badgeW - 20, cy + 28, badgeW, 26, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = card.badgeColor;
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, cx + cardW - badgeW / 2 - 20, cy + 41);
      ctx.textAlign = 'left';

      // Divider
      ctx.strokeStyle = '#1e385b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 20, cy + 92);
      ctx.lineTo(cx + cardW - 20, cy + 92);
      ctx.stroke();

      // Description
      ctx.font = '16px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      this._wrapText(ctx, card.desc, cx + 24, cy + 128, cardW - 48, 24);

      // Card Action Button
      const btnH = 50;
      const btnW = cardW - 48;
      const btnX = cx + 24;
      const btnY = cy + cardH - btnH - 24;
      this._drawPillButton(ctx, btnX, btnY, btnW, btnH, card.btnText, '#0284c7', '#ffffff');

      // Register collider for both the button and whole card
      this._registerButton(`menu_btn_${card.id}`, btnX, btnY, btnW, btnH, card.title, () => this.openView(card.id));
      this._registerButton(`menu_card_${card.id}`, cx, cy, cardW, cardH - btnH - 30, card.title, () => this.openView(card.id));
    });
  }

  // ─── 1. View: Ask Anything ────────────────────────────────────────────────

  _renderAskAnythingView(ctx, w, h) {
    // 1. Text Input Bar
    ctx.fillStyle = '#0f1f38';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(24, 110, w - 48, 64, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Q: "${this.currentQuestionText}"`, 44, 142);

    // Register click on text bar for custom question input
    this._registerButton('ask_input_bar', 24, 110, w - 245, 64, 'Input Bar', () => {
      const customQ = window.prompt('Type your question for the AI Physics Assistant:', this.currentQuestionText);
      if (customQ && customQ.trim()) {
        this.currentQuestionText = customQ.trim();
        this.submitQuestion();
      }
    });

    // Send Button
    const sendLabel = this.isLoadingAI ? '⏳ Thinking...' : '🚀 Ask AI';
    const sendBg = this.isLoadingAI ? '#78350f' : '#0284c7';
    this._drawPillButton(ctx, w - 210, 118, 170, 48, sendLabel, sendBg, '#ffffff');
    this._registerButton('ask_btn_send', w - 210, 118, 170, 48, 'Send', () => this.submitQuestion());

    // 2. Suggested Questions Chips
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Suggested Topics & Questions:', 24, 205);

    const suggestions = [
      'Why is ammeter in series?',
      'Why is voltmeter in parallel?',
      'What is rheostat function?',
      'How do I calculate resistance?',
      'What happens if resistance increases?'
    ];

    let chipX = 24;
    let chipY = 225;
    suggestions.forEach((sug, idx) => {
      const chipW = ctx.measureText(sug).width + 36;
      if (chipX + chipW > w - 24) {
        chipX = 24;
        chipY += 46;
      }
      this._drawPillButton(ctx, chipX, chipY, chipW, 36, `⚡ ${sug}`, '#1e293b', '#bae6fd');
      const sugText = sug;
      this._registerButton(`sug_${idx}`, chipX, chipY, chipW, 36, sug, () => {
        this.currentQuestionText = sugText;
        this.submitQuestion();
      });
      chipX += chipW + 12;
    });

    // 3. AI Response Area Card
    const cardY = 330;
    const cardH = 560;
    ctx.fillStyle = '#0b192e';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(24, cardY, w - 48, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Response Header
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('🤖 Socratic Physics Tutor Response', 48, cardY + 38);

    // Audio Voice Controls & Retry Button
    let voiceBtnX = w - 220;
    if (this.aiError) {
      voiceBtnX = w - 200;
      this._drawPillButton(ctx, w - 370, cardY + 20, 155, 42, '🔄 Retry', '#d97706', '#ffffff');
      this._registerButton('ask_btn_retry', w - 370, cardY + 20, 155, 42, 'Retry', () => this.submitQuestion());
    }

    const voiceLabel = this.isSpeakingVoice ? '⏹️ Stop Voice' : '🔊 Listen Voice';
    const voiceBg = this.isSpeakingVoice ? '#ef4444' : '#10b981';
    this._drawPillButton(ctx, voiceBtnX, cardY + 20, 175, 42, voiceLabel, voiceBg, '#ffffff');
    this._registerButton('ask_btn_voice', voiceBtnX, cardY + 20, 175, 42, 'Voice', () => this.toggleVoiceSpeech());

    // Response Content
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    this._wrapText(ctx, this.aiResponse.message || '', 48, cardY + 90, w - 96, 28);

    // Physics Explanation Box
    const explY = cardY + 200;
    ctx.fillStyle = '#07162c';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, explY, w - 88, 140, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('📖 Detailed Physics Explanation:', 60, explY + 30);

    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    this._wrapText(ctx, this.aiResponse.explanation || '', 60, explY + 60, w - 120, 26);

    // Suggested Action Box
    const actY = cardY + 360;
    ctx.fillStyle = '#0f291e';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, actY, w - 88, 80, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('🎯 Recommended Next Practical Action:', 60, actY + 28);

    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    this._wrapText(ctx, this.aiResponse.suggestedAction || 'Check your connections matching schematic.', 60, actY + 56, w - 120, 24);

    // Status Footer
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Connected to Secure Gemini Tutor API · Authoritative Maharashtra SSC Physics Model', 48, cardY + cardH - 24);
  }

  // ─── 2. View: Hints ───────────────────────────────────────────────────────

  _renderHintsView(ctx, w, h) {
    // Determine active mistake or current stage hint
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

    // Tier Selector / Indicator Bar
    const tiers = [
      { num: 1, label: 'Level 1: Conceptual', desc: 'Guiding clue without revealing direct answer', bg: '#0369a1' },
      { num: 2, label: 'Level 2: Directional', desc: 'Points toward apparatus & connections', bg: '#0284c7' },
      { num: 3, label: 'Level 3: Actionable', desc: 'Specific corrective instruction', bg: '#0ea5e9' }
    ];

    tiers.forEach((t, idx) => {
      const bx = 24 + idx * 324;
      const isCur = this.currentHintTier === t.num;
      const bg = isCur ? t.bg : '#0f172a';
      const border = isCur ? '#38bdf8' : '#334155';

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = isCur ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(bx, 110, 310, 70, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = isCur ? '#ffffff' : '#94a3b8';
      ctx.fillText(t.label, bx + 16, 138);

      ctx.font = '14px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = isCur ? '#bae6fd' : '#64748b';
      ctx.fillText(t.desc, bx + 16, 162);

      this._registerButton(`hint_tier_${t.num}`, bx, 110, 310, 70, t.label, () => {
        this.currentHintTier = t.num;
        this.redraw();
      });
    });

    // Main Hint Card
    const cardY = 210;
    const cardH = 670;
    ctx.fillStyle = '#0b192e';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(24, cardY, w - 48, cardH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`💡 Progressive Guidance: Level ${this.currentHintTier} of 3`, 48, cardY + 45);

    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(topicName, 48, cardY + 80);

    // Active Hint Content Box
    let activeHintText = tier1;
    let hintBadge = 'CONCEPTUAL REFLECTION';
    let badgeColor = '#38bdf8';
    if (this.currentHintTier === 2) {
      activeHintText = tier2;
      hintBadge = 'DIRECTIONAL ORIENTATION';
      badgeColor = '#fbbf24';
    } else if (this.currentHintTier === 3) {
      activeHintText = tier3;
      hintBadge = 'ACTIONABLE RESOLUTION';
      badgeColor = '#34d399';
    }

    ctx.fillStyle = '#07162c';
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, cardY + 120, w - 88, 320, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = badgeColor;
    ctx.fillText(`[ ${hintBadge} ]`, 64, cardY + 160);

    ctx.font = '22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    this._wrapText(ctx, activeHintText, 64, cardY + 210, w - 128, 36);

    // Navigation Controls
    const btnY = cardY + 480;
    if (this.currentHintTier > 1) {
      this._drawPillButton(ctx, 48, btnY, 240, 56, '⬅ Previous Hint', '#1e293b', '#ffffff');
      this._registerButton('hint_prev', 48, btnY, 240, 56, 'Prev', () => {
        this.currentHintTier--;
        this.redraw();
      });
    }

    if (this.currentHintTier < 3) {
      this._drawPillButton(ctx, 320, btnY, 260, 56, 'Show Next Hint ➡', '#0284c7', '#ffffff');
      this._registerButton('hint_next', 320, btnY, 260, 56, 'Next', () => {
        this.currentHintTier++;
        this.redraw();
      });
    }

    this._drawPillButton(ctx, w - 340, btnY, 290, 56, '🔄 Refresh Circuit Status', '#065f46', '#34d399');
    this._registerButton('hint_refresh', w - 340, btnY, 290, 56, 'Refresh', () => {
      this.redraw();
    });
  }

  // ─── 3. View: Next Step ───────────────────────────────────────────────────

  _renderNextStepView(ctx, w, h) {
    let stageInfo = null;
    let stepNum = 4;
    let totalSteps = 11;
    let stageTitle = 'Circuit Assembly';
    let instruction = 'Connect the 7 circuit wires according to the schematic.';
    let explanation = 'Ohm’s Law requires a closed series circuit with a parallel voltmeter across the resistor coil.';
    let apparatus = 'Battery, Resistor, Rheostat, Plug Key, Ammeter, Voltmeter';
    let prerequisites = 'Identify all 6 instruments on the table.';

    if (this.workflowManager && typeof this.workflowManager.getCurrentStageInfo === 'function') {
      stageInfo = this.workflowManager.getCurrentStageInfo();
      if (stageInfo) {
        stepNum = stageInfo.step || 4;
        totalSteps = stageInfo.totalStages || 11;
        stageTitle = stageInfo.title || stageTitle;
        instruction = stageInfo.description || instruction;
        prerequisites = stageInfo.prerequisites || prerequisites;
      }
    }

    // Progress Bar
    const pct = Math.round((stepNum / totalSteps) * 100);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(24, 110, w - 48, 20, 10);
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(24, 110, (w - 48) * (pct / 100), 20, 10);
    ctx.fill();

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Stage ${stepNum} of ${totalSteps} (${pct}% Complete)`, 24, 155);

    // Main Stage Card
    const cardY = 175;
    const cardH = 705;
    ctx.fillStyle = '#0b192e';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(24, cardY, w - 48, cardH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`Current Practical Stage: ${stageTitle}`, 48, cardY + 45);

    // Next Instruction Box
    const boxY = cardY + 75;
    ctx.fillStyle = '#07162c';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, boxY, w - 88, 140, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('📋 Next Required Action / Instruction:', 64, boxY + 36);

    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    this._wrapText(ctx, instruction, 64, boxY + 70, w - 128, 28);

    // Apparatus Needed
    const appY = boxY + 160;
    ctx.fillStyle = '#07162c';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, appY, w - 88, 100, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('🔬 Relevant Apparatus:', 64, appY + 32);

    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(apparatus, 64, appY + 65);

    // Prerequisites Checklist
    const preY = appY + 120;
    ctx.fillStyle = '#07162c';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, preY, w - 88, 120, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('⚠️ Prerequisite Validation Gate:', 64, preY + 34);

    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    this._wrapText(ctx, prerequisites, 64, preY + 68, w - 128, 26);

    // Action Buttons
    const btnY = cardY + 520;
    this._drawPillButton(ctx, 48, btnY, 320, 56, 'Advance Stage (Validate)', '#059669', '#ffffff');
    this._registerButton('step_advance', 48, btnY, 320, 56, 'Advance', () => {
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

    this._drawPillButton(ctx, 400, btnY, 260, 56, '🔄 Check Circuit State', '#0284c7', '#ffffff');
    this._registerButton('step_check', 400, btnY, 260, 56, 'Check', () => {
      this.redraw();
    });
  }

  // ─── 4. View: Video ───────────────────────────────────────────────────────

  _renderVideoView(ctx, w, h) {
    const vid = PRACTICAL_VIDEOS.ohmsLaw;

    // Video Screen Simulation Frame
    const screenY = 110;
    const screenH = 420;
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(24, screenY, w - 48, screenH, 16);
    ctx.fill();
    ctx.stroke();

    // Video Graphics / Watermark
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(`🎥 ${vid.title}`, w / 2, screenY + 160);

    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    const curChapter = vid.chapters.find((c) => c.id === this.videoState.currentChapter) || vid.chapters[0];
    ctx.fillText(`Current Chapter: ${curChapter.title}`, w / 2, screenY + 210);

    // Play / Pause Icon
    const playIcon = this.videoState.isPlaying ? '⏸️ PAUSE' : '▶️ PLAY VIDEO';
    this._drawPillButton(ctx, w / 2 - 120, screenY + 270, 240, 54, playIcon, '#0284c7', '#ffffff');
    this._registerButton('vid_play', w / 2 - 120, screenY + 270, 240, 54, 'Play', () => {
      this.videoState.isPlaying = !this.videoState.isPlaying;
      this.redraw();
    });

    // Timeline Scrubber Bar
    const scrubY = screenY + screenH - 45;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(48, scrubY, w - 96, 12, 6);
    ctx.fill();

    const progPct = this.videoState.duration > 0 ? this.videoState.currentTime / this.videoState.duration : 0.25;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(48, scrubY, (w - 96) * progPct, 12, 6);
    ctx.fill();

    // Chapter Buttons List
    const chapY = 560;
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText('Select Chapter / Practical Demonstration:', 24, chapY);

    vid.chapters.forEach((chap, idx) => {
      const cy = chapY + 20 + idx * 62;
      const isCur = this.videoState.currentChapter === chap.id;
      const bg = isCur ? '#0284c7' : '#0f172a';
      const border = isCur ? '#38bdf8' : '#1e293b';

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(24, cy, w - 48, 52, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = isCur ? '#ffffff' : '#e2e8f0';
      ctx.fillText(chap.title, 48, cy + 32);

      ctx.font = '15px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = isCur ? '#bae6fd' : '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText(chap.desc, w - 48, cy + 32);
      ctx.textAlign = 'left';

      this._registerButton(`vid_chap_${chap.id}`, 24, cy, w - 48, 52, chap.title, () => {
        this.videoState.currentChapter = chap.id;
        this.videoState.currentTime = chap.time;
        this.videoState.isPlaying = true;
        this.redraw();
      });
    });
  }

  // ─── 5. View: Examples ────────────────────────────────────────────────────

  _renderExamplesView(ctx, w, h) {
    const ex = EXAMPLES_DATA[this.currentExampleIndex] || EXAMPLES_DATA[0];

    // Example Tabs
    EXAMPLES_DATA.forEach((item, idx) => {
      const tx = 24 + idx * 242;
      const isCur = this.currentExampleIndex === idx;
      const bg = isCur ? '#0284c7' : '#0f172a';
      const border = isCur ? '#38bdf8' : '#1e293b';

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = isCur ? 3 : 1;
      ctx.beginPath();
      ctx.roundRect(tx, 110, 230, 50, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = isCur ? '#ffffff' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(`Card ${idx + 1}: ${item.topic.split(' ')[0]}`, tx + 115, 140);

      this._registerButton(`ex_tab_${idx}`, tx, 110, 230, 50, item.title, () => {
        this.currentExampleIndex = idx;
        this.redraw();
      });
    });

    // Main Card
    const cardY = 180;
    const cardH = 700;
    ctx.fillStyle = '#0b192e';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(24, cardY, w - 48, cardH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${ex.title} — ${ex.topic}`, 48, cardY + 45);

    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    this._wrapText(ctx, ex.description, 48, cardY + 85, w - 96, 26);

    // Formula & Given Values Box
    const fY = cardY + 150;
    ctx.fillStyle = '#07162c';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, fY, w - 88, 120, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`📐 Mathematical Formula:  ${ex.formula}`, 64, fY + 40);

    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#f8fafc';
    this._wrapText(ctx, `Given: ${ex.given}`, 64, fY + 80, w - 128, 24);

    // Step-by-Step Calculation Box
    const cY = fY + 145;
    ctx.fillStyle = '#07162c';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, cY, w - 88, 140, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('🧮 Step-by-Step Calculation & Final Result:', 64, cY + 36);

    ctx.font = '20px "Consolas", monospace, sans-serif';
    ctx.fillStyle = '#ffffff';
    this._wrapText(ctx, ex.calculation, 64, cY + 75, w - 128, 28);

    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Result: ${ex.result}`, 64, cY + 115);

    // Explanation Box
    const eY = cY + 165;
    ctx.fillStyle = '#07162c';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, eY, w - 88, 100, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('💡 Pedagogical Explanation:', 64, eY + 30);

    ctx.font = '17px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    this._wrapText(ctx, ex.explanation, 64, eY + 62, w - 128, 24);

    // Navigation Buttons
    const btnY = cardY + 590;
    if (this.currentExampleIndex > 0) {
      this._drawPillButton(ctx, 48, btnY, 240, 54, '⬅ Previous Card', '#1e293b', '#ffffff');
      this._registerButton('ex_prev', 48, btnY, 240, 54, 'Prev', () => {
        this.currentExampleIndex--;
        this.redraw();
      });
    }

    if (this.currentExampleIndex < EXAMPLES_DATA.length - 1) {
      this._drawPillButton(ctx, w - 288, btnY, 240, 54, 'Next Card ➡', '#0284c7', '#ffffff');
      this._registerButton('ex_next', w - 288, btnY, 240, 54, 'Next', () => {
        this.currentExampleIndex++;
        this.redraw();
      });
    }
  }

  // ─── 6. View: Questions & Answers (MCQs) ──────────────────────────────────

  _renderQnAView(ctx, w, h) {
    const q = MCQS_DATA[this.currentMCQIndex] || MCQS_DATA[0];

    // Score Badge
    const scorePct = this.sessionScore.total > 0 ? Math.round((this.sessionScore.correct / this.sessionScore.total) * 100) : 0;
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText(`Question ${this.currentMCQIndex + 1} of ${MCQS_DATA.length}`, 24, 135);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`Session Score: ${this.sessionScore.correct} / ${this.sessionScore.total} (${scorePct}%)`, w - 24, 135);
    ctx.textAlign = 'left';

    // Main Card
    const cardY = 160;
    const cardH = 720;
    ctx.fillStyle = '#0b192e';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(24, cardY, w - 48, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Question Prompt
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    this._wrapText(ctx, `Q: ${q.question}`, 48, cardY + 45, w - 96, 30);

    // 4 Selectable Options
    const optStartY = cardY + 115;
    q.options.forEach((optText, idx) => {
      const oy = optStartY + idx * 72;
      const isSelected = this.selectedOptionIndex === idx;
      const isCorrect = idx === q.correctIndex;

      let bg = '#07162c';
      let border = '#334155';
      let textCol = '#e2e8f0';

      if (this.isAnswerSubmitted) {
        if (isCorrect) {
          bg = '#064e3b';
          border = '#10b981';
          textCol = '#a7f3d0';
        } else if (isSelected) {
          bg = '#7f1d1d';
          border = '#ef4444';
          textCol = '#fecaca';
        }
      } else if (isSelected) {
        bg = '#0284c7';
        border = '#38bdf8';
        textCol = '#ffffff';
      }

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = (isSelected || (this.isAnswerSubmitted && isCorrect)) ? 3 : 1;
      ctx.beginPath();
      ctx.roundRect(44, oy, w - 88, 58, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = textCol;
      ctx.fillText(optText, 64, oy + 34);

      if (!this.isAnswerSubmitted) {
        this._registerButton(`mcq_opt_${idx}`, 44, oy, w - 88, 58, optText, () => {
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
      const explY = optStartY + 305;

      ctx.fillStyle = isCorrect ? '#06291a' : '#2b1212';
      ctx.strokeStyle = isCorrect ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(44, explY, w - 88, 130, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = isCorrect ? '#34d399' : '#f87171';
      ctx.fillText(isCorrect ? '✅ Correct Answer!' : '❌ Incorrect Selection', 64, explY + 30);

      ctx.font = '17px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#f8fafc';
      this._wrapText(ctx, q.explanation, 64, explY + 62, w - 128, 24);

      // Bottom Navigation Buttons
      const btnY = cardY + 580;
      if (!isCorrect) {
        this._drawPillButton(ctx, 48, btnY, 220, 54, '🔄 Try Again', '#d97706', '#ffffff');
        this._registerButton('mcq_retry', 48, btnY, 220, 54, 'Retry', () => {
          this.isAnswerSubmitted = false;
          this.selectedOptionIndex = null;
          this.redraw();
        });
      }

      const nextLabel = (this.currentMCQIndex < MCQS_DATA.length - 1) ? 'Next Question ➡' : '🔄 Restart Quiz';
      this._drawPillButton(ctx, w - 288, btnY, 240, 54, nextLabel, '#0284c7', '#ffffff');
      this._registerButton('mcq_next', w - 288, btnY, 240, 54, 'Next', () => {
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

  _drawPillButton(ctx, x, y, w, h, text, bg, fg) {
    ctx.fillStyle = bg;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
  }

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
    this.currentRequestId = (this.currentRequestId || 0) + 1;
    const reqId = this.currentRequestId;

    if (this.assistant) {
      if (this.assistant.state) this.assistant.state.aiRequestState = 'loading';
      if (typeof this.assistant.setTutorState === 'function') {
        this.assistant.setTutorState('thinking');
      }
    }
    this.redraw();

    try {
      if (this.tutorClient && typeof this.tutorClient.askQuestion === 'function') {
        const simContext = (this.bridge && typeof this.bridge.getAIContext === 'function')
          ? this.bridge.getAIContext()
          : null;

        const res = await this.tutorClient.askQuestion({
          question: this.currentQuestionText,
          language: 'English',
          simulationContext: simContext,
          customContext: simContext
        });

        if (this.currentRequestId !== reqId) return; // Stale request, ignore

        // Check whether request succeeded and has valid payload
        const payload = (res && res.response) ? res.response : res;
        const isSuccess = Boolean(res && (res.success !== false) && (payload.message || payload.answer));

        if (isSuccess) {
          this.aiError = null;
          this.aiResponse = {
            message: payload.message || payload.answer || 'Thank you for your question.',
            explanation: payload.explanation || 'Ohm’s Law establishes V = I * R across a metallic conductor.',
            hint: payload.hint || 'Check circuit connections.',
            suggestedAction: payload.suggestedAction || 'Observe instrument needles.'
          };

          if (this.assistant) {
            if (this.assistant.state) this.assistant.state.aiRequestState = 'success';
            if (typeof this.assistant.setTutorState === 'function') {
              this.assistant.setTutorState('speaking', { text: this.aiResponse.message });
            }
          }

          // Trigger voice speech
          if (this.speechService && typeof this.speechService.speak === 'function') {
            this.speechService.speak(this.aiResponse.message);
            this.isSpeakingVoice = true;
            if (this.assistant && this.assistant.state) {
              this.assistant.state.speechState = 'speaking';
            }
          }
        } else {
          // Failure / server error
          const errMsg = res?.error?.message || 'Server returned error or invalid response.';
          this.aiError = { code: res?.error?.code || 'ERROR', message: errMsg };
          this.aiResponse = {
            message: `Notice: ${errMsg}`,
            explanation: 'Curriculum Fallback (Maharashtra SSC Std. 10 Ch. 4): Potential difference V is directly proportional to current I (V = I × R).',
            hint: 'Use the progressive hints tab or click Retry to reconnect.',
            suggestedAction: 'Check your circuit wiring and ensure plug key is closed.'
          };

          if (this.assistant) {
            if (this.assistant.state) this.assistant.state.aiRequestState = 'error';
            if (typeof this.assistant.setTutorState === 'function') {
              this.assistant.setTutorState('warning', { text: 'AI unavailable. Showing curriculum fallback.' });
            }
          }
        }
      } else {
        // Fallback when tutorClient is unassigned
        this.aiError = null;
        this.aiResponse = {
          message: 'An ammeter has very low internal resistance (~0.2 Ω) and is connected in series.',
          explanation: 'Series connection ensures all electrons in the loop flow through the meter for accurate current measurement.',
          hint: 'Keep Ammeter in the main loop and Voltmeter across the resistor coil.',
          suggestedAction: 'Observe the 3D tabletop instruments and adjust the rheostat.'
        };
        if (this.assistant && this.assistant.state) {
          this.assistant.state.aiRequestState = 'success';
        }
      }
    } catch (err) {
      if (this.currentRequestId !== reqId) return;
      console.warn('[AssistantSubpanels] Error asking tutor client:', err);
      this.aiError = { code: 'NETWORK_ERROR', message: err.message || 'Connection error' };
      this.aiResponse = {
        message: 'Could not connect to Gemini AI backend. Offline curriculum guidance active.',
        explanation: 'Ohm’s Law verifies V ∝ I across a metallic conductor under constant physical conditions (R = V / I).',
        hint: 'Use the progressive hints tab for offline practical guidance.',
        suggestedAction: 'Click on Hints tab or Retry Question.'
      };
      if (this.assistant) {
        if (this.assistant.state) this.assistant.state.aiRequestState = 'error';
        if (typeof this.assistant.setTutorState === 'function') {
          this.assistant.setTutorState('warning', { text: 'Backend offline. Standard guidance active.' });
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
