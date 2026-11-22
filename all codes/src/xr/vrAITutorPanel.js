/**
 * vrAITutorPanel.js
 * Dedicated 3D Spatial AI Tutor Panel for LabVerse WebXR Physics Laboratory.
 *
 * Placed beside the Lab Assistant avatar (x = 0.95, y = 1.30, z = 0.35),
 * facing the student standing before the workbench at (0, 1.3, 0.82).
 *
 * Features:
 * - Direct AI Tutor conversation area displaying question, answer, explanation, hint & action.
 * - Socratic quick action buttons: "Give Hint", "Explain Step", "Check Mistakes", "Ohm's Law", "Why Ammeter Series?".
 * - Language selector: English, Hindi (हिन्दी), Marathi (मराठी).
 * - Interactive 3D colliders compatible with VR hand ray/pinch and desktop mouse clicks.
 * - Loading indicator with animated thinking states and student-friendly error display.
 */

import * as THREE from 'three';

export class VRAITutorPanel {
  constructor(options = {}) {
    this.scene = options.scene;
    this.assistant = options.assistant || null;
    this.tutorClient = options.tutorClient || null;
    this.bridge = options.bridge || null;
    this.workflowManager = options.workflowManager || (this.bridge ? this.bridge.workflowManager : null);
    this.narration = options.narration || null;
    this.sound = options.sound || null;
    this.speechRecognition = options.speechRecognition || null;
    this.speechService = options.speechService || null;
    this.onFeedback = options.onFeedback || (() => {});

    // Root Group positioned beside the Lab Assistant
    this.group = new THREE.Group();
    this.group.name = 'VRAITutorPanel';
    this.group.position.set(0.92, 1.28, 0.42);

    // Face student standing in front of table at (0, 1.3, 0.82)
    const targetLook = new THREE.Vector3(0.0, 1.25, 0.82);
    const angleToStudent = Math.atan2(targetLook.x - 0.92, targetLook.z - 0.42);
    this.group.rotation.set(0, angleToStudent, 0);

    // Initial visibility
    this.group.visible = true;
    this.isMinimized = false;

    // State tracking
    this.currentLanguage = 'English'; // 'English' | 'Hindi' | 'Marathi'
    this.isLoading = false;
    this.isVoiceListening = false;
    this.isVoiceSpeaking = false;
    this.loadingDots = 0;
    this.loadingTimer = null;
    this.lifecycleState = (this.tutorClient && this.tutorClient.state) ? this.tutorClient.state : 'READY';

    if (this.tutorClient && typeof this.tutorClient.onStateChange === 'function') {
      this.tutorClient.onStateChange((state) => {
        this.lifecycleState = state;
        this.needsRedraw = true;
        this.redraw();
      });
    }

    this.lastStudentQuestion = 'What should I do first?';
    this.lastTutorResponse = {
      message: 'Welcome to the Ohm’s Law practical! I am your AI Lab Assistant.',
      explanation: 'Our goal is to verify that potential difference (V) is directly proportional to current (I) across a standard resistor coil.',
      hint: 'Start by connecting the 7 circuit wires according to the tabletop schematic.',
      suggestedAction: 'Click on Battery (+) terminal to begin wiring.',
      responseType: 'guidance'
    };
    this.statusMessage = 'AI Tutor Ready · Ask questions or choose an action';
    this.statusType = 'info'; // 'info' | 'success' | 'warning' | 'error'

    // Button colliders for VR raycasting and desktop mouse clicks
    this.clickableButtons = [];
    this.hoveredButtonId = null;

    // Dimensions
    this.canvasW = 1024;
    this.canvasH = 1024;
    this.panelW = 0.86; // 86 cm wide in VR
    this.panelH = 0.86; // 86 cm tall in VR
    this.needsRedraw = true;

    this._buildPhysicalFrame();
    this._initCanvas();
    this._buildButtonColliders();

    if (this.scene) {
      this.scene.add(this.group);
    }

    this.redraw();
  }

  // ─── 1. Physical 3D Structure ─────────────────────────────────────────────

  _buildPhysicalFrame() {
    // 1. Sleek metallic slate chassis
    const frameGeo = new THREE.BoxGeometry(this.panelW + 0.035, this.panelH + 0.035, 0.02);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0a1628,
      roughness: 0.35,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.06
    });
    this.frameMesh = new THREE.Mesh(frameGeo, frameMat);
    this.frameMesh.name = 'AITutorPanel_Frame';
    this.group.add(this.frameMesh);

    // Subtle blue neon trim wireframe
    const trimGeo = new THREE.BoxGeometry(this.panelW + 0.04, this.panelH + 0.04, 0.005);
    const trimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.z = 0.008;
    this.group.add(trimMesh);

    // Slim metallic mount pole extending to the floor
    const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.75, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.85 });
    this.standPole = new THREE.Mesh(poleGeo, poleMat);
    this.standPole.position.set(0, -this.panelH / 2 - 0.35, -0.015);
    this.group.add(this.standPole);

    // Stand circular base
    const baseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.025, 24);
    this.standBase = new THREE.Mesh(baseGeo, poleMat);
    this.standBase.position.set(0, -this.panelH / 2 - 0.71, -0.015);
    this.group.add(this.standBase);
  }

  _initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvasW;
    this.canvas.height = this.canvasH;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;

    const screenGeo = new THREE.PlaneGeometry(this.panelW, this.panelH);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: false
    });

    this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.screenMesh.position.z = 0.011;
    this.screenMesh.name = 'AITutorPanel_Screen';
    this.group.add(this.screenMesh);
  }

  // ─── 2. Interactive Colliders ─────────────────────────────────────────────

  _buildButtonColliders() {
    // Clear existing colliders
    this.clickableButtons.forEach((b) => {
      if (b.parent) b.parent.remove(b);
    });
    this.clickableButtons = [];

    // Define interactive buttons in canvas coordinates (x, y, w, h)
    const buttonDefs = [
      // Top Navigation Controls
      { id: 'tutor_btn_mic', x: 420, y: 24, w: 145, h: 48, label: '🎙️ Speak' },
      { id: 'tutor_btn_stop_speech', x: 575, y: 24, w: 145, h: 48, label: '⏹️ Stop' },
      { id: 'tutor_lang', x: 730, y: 24, w: 175, h: 48, label: 'Language' },
      { id: 'tutor_close', x: 915, y: 24, w: 65, h: 48, label: 'Close' },

      // Quick Action Row 1
      { id: 'tutor_btn_hint', x: 44, y: 680, w: 220, h: 68, label: '💡 Give Hint' },
      { id: 'tutor_btn_explain', x: 280, y: 680, w: 220, h: 68, label: '📖 Explain Step' },
      { id: 'tutor_btn_mistakes', x: 516, y: 680, w: 220, h: 68, label: '⚠️ Check Mistakes' },
      { id: 'tutor_btn_retry', x: 752, y: 680, w: 228, h: 68, label: '🔄 Retry' },

      // Quick Action Row 2
      { id: 'tutor_btn_q_ammeter', x: 44, y: 770, w: 290, h: 68, label: '⚡ Ammeter Series?' },
      { id: 'tutor_btn_q_ohmslaw', x: 366, y: 770, w: 290, h: 68, label: '⚡ What is V = IR?' },
      { id: 'tutor_btn_repeat', x: 688, y: 770, w: 290, h: 68, label: '🔊 Repeat Voice' }
    ];

    buttonDefs.forEach((def) => {
      // Map canvas coordinates to 3D panel coordinates
      // In 3D: panel center is (0,0), width panelW, height panelH
      const normCenterX = (def.x + def.w / 2) / this.canvasW;
      const normCenterY = (def.y + def.h / 2) / this.canvasH;

      const posX = (normCenterX - 0.5) * this.panelW;
      const posY = (0.5 - normCenterY) * this.panelH;
      const sizeX = (def.w / this.canvasW) * this.panelW;
      const sizeY = (def.h / this.canvasH) * this.panelH;

      const colGeo = new THREE.BoxGeometry(sizeX, sizeY, 0.04);
      const colMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: true });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.set(posX, posY, 0.02);

      colMesh.userData = {
        type: 'tutor_button',
        buttonId: def.id,
        tutorPanel: this,
        onPress: () => this.pressButton(def.id)
      };

      this.group.add(colMesh);
      this.clickableButtons.push(colMesh);
    });
  }

  getClickableObjects() {
    return this.group.visible ? this.clickableButtons : [];
  }

  // ─── 3. Action Handling ───────────────────────────────────────────────────

  async pressButton(buttonId) {
    if (this.isLoading && buttonId !== 'tutor_close') return;

    if (this.sound && typeof this.sound.playBeep === 'function') {
      this.sound.playBeep();
    }

    switch (buttonId) {
      case 'tutor_btn_mic':
        await this.startVoiceInput();
        break;
      case 'tutor_btn_stop_speech':
        this.stopVoice();
        break;
      case 'tutor_lang':
        this.cycleLanguage();
        break;
      case 'tutor_close':
        this.toggleVisibility();
        break;
      case 'tutor_btn_retry':
        await this.retryLastQuestion();
        break;
      case 'tutor_btn_hint':
        await this.requestGuidance('hint', 'Can you give me a hint on what to do next?');
        break;
      case 'tutor_btn_explain':
        await this.requestGuidance('explain', 'Can you explain the current step of this practical?');
        break;
      case 'tutor_btn_mistakes':
        await this.requestGuidance('mistakes', 'Are there any circuit mistakes or warnings I need to fix?');
        break;
      case 'tutor_btn_q_ammeter':
        await this.askQuestion('Why is the ammeter connected in series and the voltmeter in parallel?');
        break;
      case 'tutor_btn_q_ohmslaw':
        await this.askQuestion('What is Ohm’s Law and how do we calculate V = I * R?');
        break;
      case 'tutor_btn_repeat':
        this.repeatLastResponse();
        break;
      default:
        console.warn(`[VRAITutorPanel] Unknown buttonId: ${buttonId}`);
    }
  }

  setSpeechRecognition(sr) {
    this.speechRecognition = sr;
  }

  setSpeechService(ss) {
    this.speechService = ss;
  }

  async startVoiceInput() {
    if (this.isLoading) return;

    if (!this.speechRecognition || !this.speechRecognition.isSupported) {
      this.statusMessage = 'Speech recognition not supported in this browser. Use text input.';
      this.statusType = 'warning';
      this.needsRedraw = true;
      this.redraw();
      return;
    }

    // Mutual exclusivity: cancel any playing speech
    if (this.speechService) {
      this.speechService.stop();
    }
    if (this.narration) {
      this.narration.stop();
    }

    this.isVoiceListening = true;
    this.statusMessage = `🎙️ Listening in ${this.currentLanguage}... Speak question now`;
    this.statusType = 'info';

    if (this.assistant && typeof this.assistant.setTutorState === 'function') {
      this.assistant.setTutorState('listening');
    }

    this.needsRedraw = true;
    this.redraw();

    try {
      this.speechRecognition.setLanguage(this.currentLanguage);
      const transcript = await this.speechRecognition.startListening();
      this.isVoiceListening = false;
      if (transcript && transcript.trim()) {
        this.statusMessage = `Recognized: "${transcript.trim()}"`;
        this.statusType = 'success';
        this.needsRedraw = true;
        this.redraw();
        await this.askQuestion(transcript.trim());
      } else {
        this.statusMessage = 'No speech detected.';
        this.statusType = 'warning';
        if (this.assistant && typeof this.assistant.setTutorState === 'function') {
          this.assistant.setTutorState('idle');
        }
        this.needsRedraw = true;
        this.redraw();
      }
    } catch (err) {
      this.isVoiceListening = false;
      this.statusMessage = `Voice error: ${err.message || 'Recognition stopped'}`;
      this.statusType = 'error';
      if (this.assistant && typeof this.assistant.setTutorState === 'function') {
        this.assistant.setTutorState('idle');
      }
      this.needsRedraw = true;
      this.redraw();
    }
  }

  stopVoice() {
    if (this.speechRecognition && this.speechRecognition.isListening) {
      this.speechRecognition.cancelListening();
    }
    if (this.speechService) {
      this.speechService.stop();
    }
    if (this.narration) {
      this.narration.stop();
    }
    this.isVoiceListening = false;
    this.isVoiceSpeaking = false;
    this.statusMessage = 'Voice stopped · AI Tutor Ready';
    this.statusType = 'info';
    if (this.assistant && typeof this.assistant.setTutorState === 'function') {
      this.assistant.setTutorState('idle');
    }
    this.needsRedraw = true;
    this.redraw();
  }

  cycleLanguage() {
    const langs = ['English', 'Hindi', 'Marathi'];
    const idx = langs.indexOf(this.currentLanguage);
    this.currentLanguage = langs[(idx + 1) % langs.length];
    this.statusMessage = `Language set to ${this.currentLanguage}`;
    this.statusType = 'info';
    if (this.speechRecognition) {
      this.speechRecognition.setLanguage(this.currentLanguage);
    }
    if (this.speechService) {
      this.speechService.setLanguage(this.currentLanguage);
    }
    this.needsRedraw = true;
    this.redraw();
  }

  toggleVisibility() {
    this.group.visible = !this.group.visible;
  }

  repeatLastResponse() {
    if (!this.lastTutorResponse) return;
    const msg = this.lastTutorResponse.message;
    if (!msg) return;

    if (this.speechService) {
      this.speechService.setLanguage(this.currentLanguage);
      this.speechService.speak(msg, { language: this.currentLanguage });
    } else if (this.narration) {
      this.narration.init();
      this.narration.speak(msg, `🤖 ${msg}`);
      if (this.assistant && typeof this.assistant.setTutorState === 'function') {
        this.assistant.setTutorState('speaking', { text: msg });
      }
    }
  }

  async retryLastQuestion() {
    if (this.isLoading) return;
    const q = this.lastStudentQuestion || 'What should I do next in this practical?';
    await this.askQuestion(q);
  }

  /**
   * Dispatches question to AI tutor client with live simulation context.
   */
  async askQuestion(questionText, options = {}) {
    if (!questionText || this.isLoading) return;

    this.lastStudentQuestion = questionText;
    this.isLoading = true;
    this.statusMessage = 'Consulting Gemini Socratic Tutor...';
    this.statusType = 'info';

    // Animate Assistant avatar into thinking state
    if (this.assistant && typeof this.assistant.setTutorState === 'function') {
      this.assistant.setTutorState('thinking');
    }

    this._startLoadingAnimation();
    this.needsRedraw = true;
    this.redraw();

    if (!this.tutorClient) {
      this._handleError('CLIENT_UNAVAILABLE', 'AI Tutor client service is not initialized.');
      return;
    }

    try {
      // Ensure tutorClient has bridge
      if (this.bridge && typeof this.tutorClient.setBridge === 'function') {
        this.tutorClient.setBridge(this.bridge);
      }

      const result = await this.tutorClient.askQuestion({
        question: questionText,
        language: this.currentLanguage,
        actionType: options.actionType || null
      });

      this._stopLoadingAnimation();
      this.isLoading = false;

      if (result.success && result.response) {
        this.lastTutorResponse = result.response;
        this.lastDiagnosis = result.diagnosis || null;
        this.lastLearningSnapshot = result.learningSnapshot || null;
        this.lastStrategy = result.metadata?.strategy || result.response.strategy || 'guided_question';
        this.statusMessage = `Tutor [${this.lastStrategy.toUpperCase()}] · ${this.currentLanguage}`;
        this.statusType = 'success';

        // Trigger Assistant avatar speaking/explaining state
        if (this.assistant && typeof this.assistant.setTutorState === 'function') {
          const respType = result.response.responseType;
          const avatarState = respType === 'correction'
            ? 'warning'
            : (respType === 'explanation' || respType === 'observation_analysis')
              ? 'explaining'
              : 'speaking';
          this.assistant.setTutorState(avatarState, { text: result.response.message });
        }

        // Voice response
        if (this.speechService && result.response.message) {
          this.speechService.setLanguage(this.currentLanguage);
          this.speechService.speak(result.response.message, { language: this.currentLanguage });
        } else if (this.narration && result.response.message) {
          this.narration.init();
          this.narration.speak(result.response.message, `🤖 Tutor: ${result.response.message}`);
        }
      } else {
        const err = result.error ?? { code: 'UNKNOWN_ERROR', message: 'Failed to generate guidance.' };
        this._handleError(err.code, err.message);
      }
    } catch (e) {
      this._stopLoadingAnimation();
      this.isLoading = false;
      this._handleError('NETWORK_ERROR', e.message ?? 'Network error connecting to AI tutor.');
    }

    this.needsRedraw = true;
    this.redraw();
  }

  /**
   * Action requests (hint, explain, mistakes, check_understanding, guided_question)
   */
  async requestGuidance(actionType, defaultPrompt) {
    let question = defaultPrompt;
    if (this.bridge) {
      const state = this.bridge.getCurrentState();
      if (actionType === 'mistakes') {
        if (state.detectedMistakes.length > 0) {
          const m = state.detectedMistakes[0];
          question = `I have a circuit issue: "${m.description}". How do I recover and fix this?`;
        } else {
          question = 'Is my circuit currently connected correctly according to Ohm’s Law?';
        }
      } else if (actionType === 'hint') {
        question = `I am at ${state.workflowStage.label}. What specific apparatus setting or wire connection should I check next?`;
      } else if (actionType === 'explain') {
        question = `Please explain the physics aim and theory behind ${state.workflowStage.label}.`;
      } else if (actionType === 'check_understanding') {
        question = 'Can you ask me a question to test my understanding of Ohm’s Law?';
      } else if (actionType === 'guided_question') {
        question = 'What should I think about next for this practical?';
      }
    }

    await this.askQuestion(question, { actionType });
  }

  _handleError(code, message) {
    this.lastError = { code, message, question: this.lastStudentQuestion };
    this.statusMessage = `⚠️ Error [${code}]: ${message}`;
    this.statusType = 'error';

    // Replace stale card display with explicit actionable error notice
    this.lastTutorResponse = {
      message: `Tutor Notice: Error [${code}]`,
      explanation: message || 'The AI physics tutor encountered a temporary connection issue. Please retry your question.',
      hint: 'Click "🔄 Retry" or ask another question to reconnect.',
      suggestedAction: 'Press the "🔄 Retry" button below to resubmit your query.',
      responseType: 'error'
    };

    if (this.assistant && typeof this.assistant.setTutorState === 'function') {
      this.assistant.setTutorState('warning');
      if (this.warningTimeout) clearTimeout(this.warningTimeout);
      this.warningTimeout = setTimeout(() => {
        if (this.assistant && typeof this.assistant.setTutorState === 'function') {
          this.assistant.setTutorState('idle');
        }
      }, 3500);
    }
  }

  _startLoadingAnimation() {
    this._stopLoadingAnimation();
    this.loadingTimer = setInterval(() => {
      this.loadingDots = (this.loadingDots + 1) % 4;
      this.redraw();
    }, 350);
  }

  _stopLoadingAnimation() {
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
      this.loadingTimer = null;
    }
  }

  // ─── 4. Canvas UI Rendering ───────────────────────────────────────────────

  redraw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvasW;
    const h = this.canvasH;

    // 1. Deep Space Tech Background
    ctx.fillStyle = '#060d1a';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. Header Area
    ctx.fillStyle = '#0b192e';
    ctx.fillRect(0, 0, w, 90);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, 90);

    // Header Title & Stage
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText('🤖 AI TUTOR', 30, 42);

    const stageLabel = (this.workflowManager && typeof this.workflowManager.getCurrentStageInfo === 'function')
      ? `Step ${this.workflowManager.getStageIndex() + 1}/11: ${this.workflowManager.getCurrentStageInfo().label}`
      : 'Class 10 Physics · Ohm’s Law';
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(stageLabel, 30, 68);

    // Status Pill with 7-Stage Lifecycle Rendering
    const currentState = this.lifecycleState || (this.isLoading ? 'THINKING' : 'READY');
    const stateColors = {
      IDLE: '#94a3b8',
      CONNECTING: '#fbbf24',
      READY: '#10b981',
      THINKING: '#f59e0b',
      RESPONDING: '#38bdf8',
      ERROR: '#ef4444',
      RETRYING: '#fb923c'
    };
    const pillColor = this.isVoiceListening ? '#ef4444' : (stateColors[currentState] || '#10b981');
    const pillText = this.isVoiceListening
      ? 'LISTENING...'
      : (currentState === 'THINKING' ? `THINKING${'.'.repeat(this.loadingDots)}` : currentState);

    ctx.fillStyle = pillColor;
    ctx.beginPath();
    ctx.arc(205, 48, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = pillColor;
    ctx.fillText(pillText, 220, 53);

    // Voice buttons
    const micBg = this.isVoiceListening ? '#b91c1c' : '#0e7490';
    const micBorder = this.isVoiceListening ? '#f87171' : '#38bdf8';
    const micLabel = this.isVoiceListening ? '🔴 Stop Mic' : '🎙️ Speak';
    this._renderButton(ctx, 420, 24, 145, 48, micLabel, micBg, micBorder);

    this._renderButton(ctx, 575, 24, 145, 48, '⏹️ Stop Voice', '#334155', '#94a3b8');

    // Language Button
    this._renderButton(ctx, 730, 24, 175, 48, `🌐 ${this.currentLanguage}`, '#0369a1', '#38bdf8');

    // Close Button
    this._renderButton(ctx, 915, 24, 65, 48, '✕', '#334155', '#94a3b8');

    // 3. Student Question Area
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(36, 110, w - 72, 85, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('STUDENT QUESTION:', 56, 138);

    ctx.font = 'italic 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#f8fafc';
    const qText = this.lastStudentQuestion.length > 70
      ? this.lastStudentQuestion.substring(0, 67) + '...'
      : this.lastStudentQuestion;
    ctx.fillText(`“${qText}”`, 56, 172);

    // 4. Conversation / Response Display Card
    ctx.fillStyle = '#0c1b33';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(36, 215, w - 72, 435, 18);
    ctx.fill();
    ctx.stroke();

    // Tutor Message Banner
    const isError = this.lastTutorResponse.responseType === 'error';
    const bannerBg = isError ? '#7f1d1d' : '#0369a1';
    const bannerTitle = isError
      ? '⚠️ TUTOR SERVICE NOTICE (ERROR)'
      : `💡 TUTOR GUIDANCE (${this.lastTutorResponse.responseType.toUpperCase()})`;

    ctx.fillStyle = bannerBg;
    ctx.beginPath();
    ctx.roundRect(36, 215, w - 72, 54, [18, 18, 0, 0]);
    ctx.fill();

    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bannerTitle, 56, 250);

    // Direct Message (Big & readable)
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#f8fafc';
    this._wrapText(ctx, this.lastTutorResponse.message, 56, 310, w - 112, 36);

    // Detailed Explanation Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(56, 380, w - 112, 120, 10);
    ctx.fill();

    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    this._wrapText(ctx, this.lastTutorResponse.explanation, 72, 412, w - 144, 28);

    // Hint & Action Row
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.roundRect(56, 520, w - 112, 48, 10);
    ctx.fill();
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`💡 HINT: ${this.lastTutorResponse.hint}`, 72, 551);

    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.roundRect(56, 580, w - 112, 50, 10);
    ctx.fill();
    ctx.font = 'bold 19px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`👉 ACTION: ${this.lastTutorResponse.suggestedAction}`, 72, 612);

    // 5. Quick Action Buttons
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('QUICK LAB ACTIONS & QUESTIONS:', 44, 668);

    // Row 1 (4 buttons)
    this._renderButton(ctx, 44, 680, 220, 68, '💡 Hint', '#047857', '#34d399');
    this._renderButton(ctx, 280, 680, 220, 68, '📖 Explain', '#0369a1', '#38bdf8');
    this._renderButton(ctx, 516, 680, 220, 68, '⚠️ Mistakes', '#b45309', '#fde047');
    this._renderButton(ctx, 752, 680, 228, 68, '🔄 Retry', '#991b1b', '#f87171');

    // Row 2 (3 buttons)
    this._renderButton(ctx, 44, 770, 290, 68, '⚡ Ammeter Series?', '#4338ca', '#818cf8');
    this._renderButton(ctx, 366, 770, 290, 68, '⚡ What is V = IR?', '#6d28d9', '#c084fc');
    this._renderButton(ctx, 688, 770, 290, 68, '🔊 Repeat Voice', '#334155', '#94a3b8');

    // 6. Status Footer Banner
    let footerBg = '#0b172a';
    let footerText = '#38bdf8';
    if (this.statusType === 'error') {
      footerBg = '#450a0a';
      footerText = '#f87171';
    } else if (this.statusType === 'success') {
      footerBg = '#064e3b';
      footerText = '#34d399';
    }

    ctx.fillStyle = footerBg;
    ctx.fillRect(0, 860, w, 164);
    ctx.strokeStyle = footerText;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 860, w, 164);

    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = footerText;
    ctx.fillText(this.statusMessage, 44, 910);

    // Pedagogical note
    ctx.font = 'italic 16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Class 10 Physics · Maharashtra State Board · Real-Time Simulation State Integration', 44, 946);

    this.texture.needsUpdate = true;
  }

  _renderButton(ctx, x, y, w, h, text, bg, border) {
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    const words = text.split(' ');
    let line = '';
    let currY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currY);
        line = words[n] + ' ';
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currY);
  }

  update(delta) {
    // Panel animations or periodic refresh if needed
  }

  dispose() {
    this._stopLoadingAnimation();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
