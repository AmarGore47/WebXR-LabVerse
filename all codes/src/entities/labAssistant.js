/**
 * labAssistant.js
 * 3D Physics Laboratory Assistant Entity with Mixamo FBX animations,
 * ragdoll/hit reaction state machine, comic speech bubble, and procedural audio.
 */

import * as THREE from 'three';
import { getSharedAudioContext } from '../audio.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AssistantRadialMenu } from '../ui/assistantRadialMenu.js';
import { AssistantSubpanels } from '../ui/assistantSubpanels.js';

export const ASSISTANT_REACTIONS = [
  'pain',
  'defend',
  'headHit',
  'groinHit',
  'bodyHit',
  'flyBack',
  'fallForward',
  'crying',
  'taunt',
  'angryCast',
  'praying'
];

export const ANGRY_VOICE_LINES = [
  { key: "assistant_ouch", text: "Ouch! Why are you throwing things at me?! Focus on the practical!", caption: "😡 Assistant: Ouch! Focus on the practical!" },
  { key: "assistant_stop", text: "Hey! Stop throwing objects across the physics laboratory!", caption: "💢 Assistant: Stop throwing things in the lab!" },
  { key: "assistant_hurts", text: "Oww! That really hurts! Pay attention to the resistor circuit!", caption: "⚡ Assistant: That hurts! Focus on the circuit!" },
  { key: "assistant_not_target", text: "Ow! I am your laboratory assistant, not target practice!", caption: "💥 Assistant: I am your lab assistant, not target practice!" },
  { key: "assistant_enough", text: "Enough! If you throw one more item, I will turn off the main battery power!", caption: "🛑 Assistant: Stop, or I will turn off the power!" },
  { key: "assistant_direct_hit", text: "Aaargh! Direct hit! Oww ow ow!", caption: "😭 Assistant: Aaargh! Direct hit! Owww!" },
  { key: "assistant_professor", text: "What did I do to deserve this?! Should I call the physics professor?!", caption: "😤 Assistant: Should I call the professor?!" },
  { key: "assistant_stung", text: "Oof! Why would you aim right there?! That really stung!", caption: "🤕 Assistant: Oof! That really stung!" },
  { key: "assistant_mercy", text: "Mercy, please! Have some sympathy for your assistant!", caption: "🙏 Assistant: Have some mercy on your assistant!" }
];

export const COMIC_HIT_TEXTS = [
  '💢 OUCH!',
  '😡 HEY!',
  '💥 DIRECT HIT!',
  '⚡ WHY ME?!',
  '😭 OW OW OW!',
  '🛑 STOP IT!',
  '🤕 THAT HURTS!',
  '🎯 BULLSEYE!',
  '🥊 POW!'
];

export class LabAssistant {
  constructor({ scene, narration, position = new THREE.Vector3(1.40, 0.0, 0.0) } = {}) {
    this.scene = scene;
    this.narration = narration;
    this.position = position;

    this.group = new THREE.Group();
    this.group.name = 'LabAssistant';
    this.group.position.copy(this.position);

    // Face student and experiment table naturally
    const targetLook = new THREE.Vector3(0.0, 0.85, 0.40);
    const angleToTable = Math.atan2(targetLook.x - this.position.x, targetLook.z - this.position.z);
    this.group.rotation.y = angleToTable;

    // Explicit, single assistant state model (Priority 0)
    this.state = {
      assistantVisible: true,
      interactionActive: false,
      radialMenuOpen: false,
      activeSubpanel: null, // null | 'ask_anything' | 'hints' | 'next_step' | 'video' | 'examples' | 'qna'
      speechState: 'idle',  // 'idle' | 'speaking' | 'paused' | 'error'
      aiRequestState: 'idle' // 'idle' | 'loading' | 'success' | 'error' | 'retrying'
    };

    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;
    this.lastReaction = null;
    this.lastVoiceIdx = -1;
    this.isReacting = false;
    this.reactionTimeout = null;

    // Web Audio context for comic punch impact sounds
    this.audioCtx = null;

    // Floating speech/hit bubble
    this.bubbleSprite = null;
    this.bubbleLife = 0;

    // Hit particle system
    this.particles = [];
    this._buildParticleSystem();

    // Invisible Hitbox for reliable collision detection (height ~1.75m, radius ~0.35m)
    this._buildHitbox();

    // Floor shadow decal under feet
    this._buildFloorShadow();

    // AI Tutor State & Overhead Holographic Status Badge
    // Supported states: 'idle' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'explaining' | 'warning'
    this.tutorState = 'idle';
    this.tutorStateTime = 0;
    this.tutorBadgeCanvas = null;
    this.tutorBadgeCtx = null;
    this.tutorBadgeTex = null;
    this.tutorBadgeSprite = null;
    this._buildTutorStatusBadge();

    // Tutor services references
    this.tutorClient = null;
    this.bridge = null;
    this.workflowManager = null;
    this.speechService = null;
    this.sound = null;

    // 3D Holographic Radial Menu & Floating Subpanels
    this.radialMenu = new AssistantRadialMenu({
      assistant: this,
      scene: this.scene,
      onSelectOption: (id) => this.onRadialSelect(id),
      onClose: () => this.onRadialClose()
    });

    this.subpanels = new AssistantSubpanels({
      assistant: this,
      scene: this.scene,
      tutorClient: this.tutorClient,
      bridge: this.bridge,
      workflowManager: this.workflowManager,
      speechService: this.speechService,
      sound: this.sound,
      onBackToMenu: () => {
        this.onBackToRadial();
      },
      onClose: () => {
        this.onRadialClose();
      }
    });

    if (this.scene) {
      this.scene.add(this.group);
    }

    this._loadModelAndAnimations();
  }

  _ensureAudio() {
    this.audioCtx = getSharedAudioContext();
  }

  _playImpactSound() {
    this._ensureAudio();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      // Dual-tone comic punch / slap impact
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(140, now);
      osc1.frequency.exponentialRampToValueAtTime(35, now + 0.16);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(260, now);
      osc2.frequency.exponentialRampToValueAtTime(60, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);
    } catch (e) { }
  }

  _buildHitbox() {
    // Human capsule proxy (cylinder + spheres) for raycasting & physics collisions
    const hitGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.85, 12);
    const hitMat = new THREE.MeshBasicMaterial({
      visible: false,
      wireframe: true,
      color: 0x38bdf8
    });
    this.hitBox = new THREE.Mesh(hitGeo, hitMat);
    this.hitBox.position.set(0, 0.92, 0);
    this.hitBox.userData = {
      isAssistantHitbox: true,
      assistant: this,
      onPress: () => this.onStudentClick()
    };
    this.group.add(this.hitBox);
  }

  _buildFloorShadow() {
    const shadowGeo = new THREE.RingGeometry(0.05, 0.42, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050c18,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.004;
    this.group.add(shadowMesh);
  }

  _buildParticleSystem() {
    this.particleGroup = new THREE.Group();
    const count = 16;
    const pGeo = new THREE.SphereGeometry(0.024, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0
    });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(pGeo, pMat.clone());
      p.visible = false;
      this.particleGroup.add(p);
      this.particles.push({
        mesh: p,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1.0
      });
    }

    this.group.add(this.particleGroup);
  }

  _triggerHitParticles(localPos) {
    const basePos = localPos || new THREE.Vector3(0, 1.25, 0);
    const colors = [0xfbbf24, 0xef4444, 0x38bdf8, 0xffffff];

    this.particles.forEach((p, idx) => {
      p.mesh.position.copy(basePos);
      p.mesh.visible = true;
      p.mesh.scale.setScalar(0.8 + Math.random() * 0.5);
      p.mesh.material.color.setHex(colors[idx % colors.length]);
      p.mesh.material.opacity = 1.0;
      p.vel.set(
        (Math.random() - 0.5) * 2.8,
        Math.random() * 2.2 + 0.8,
        (Math.random() - 0.5) * 2.8
      );
      p.life = 0;
      p.maxLife = 0.55 + Math.random() * 0.35;
    });
  }

  _showComicBubble(text) {
    if (!this.bubbleSprite) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 200;
      this.bubbleCanvas = canvas;
      this.bubbleCtx = canvas.getContext('2d');
      this.bubbleTex = new THREE.CanvasTexture(canvas);

      const mat = new THREE.SpriteMaterial({
        map: this.bubbleTex,
        transparent: true,
        opacity: 0,
        depthTest: false
      });
      this.bubbleSprite = new THREE.Sprite(mat);
      this.bubbleSprite.scale.set(0.72, 0.28, 1);
      this.bubbleSprite.position.set(0, 1.95, 0);
      this.group.add(this.bubbleSprite);
    }

    const ctx = this.bubbleCtx;
    const w = 512;
    const h = 200;
    ctx.clearRect(0, 0, w, h);

    // Comic jagged explosion bubble background
    ctx.fillStyle = '#dc2626'; // Vivid angry red
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(14, 14, w - 28, h - 50, 28);
    ctx.fill();
    ctx.stroke();

    // Comic pointer triangle pointing down towards character's head
    ctx.beginPath();
    ctx.moveTo(w / 2 - 24, h - 48);
    ctx.lineTo(w / 2, h - 8);
    ctx.lineTo(w / 2 + 24, h - 48);
    ctx.closePath();
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.stroke();

    // Comic Text
    ctx.font = '900 52px "Segoe UI", Arial Black, Impact, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(text, w / 2, (h - 50) / 2 + 10);
    ctx.shadowBlur = 0;

    this.bubbleTex.needsUpdate = true;
    this.bubbleSprite.material.opacity = 1.0;
    this.bubbleLife = 1.8; // visible for 1.8 seconds
  }

  // ─── AI Tutor State Machine & Overhead Indicators ─────────────────────────

  _buildTutorStatusBadge() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 140;
    this.tutorBadgeCanvas = canvas;
    this.tutorBadgeCtx = canvas.getContext('2d');
    this.tutorBadgeTex = new THREE.CanvasTexture(canvas);
    this.tutorBadgeTex.minFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: this.tutorBadgeTex,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    });
    this.tutorBadgeSprite = new THREE.Sprite(mat);
    this.tutorBadgeSprite.scale.set(0.65, 0.18, 1);
    this.tutorBadgeSprite.position.set(0, 2.05, 0); // Above avatar head
    this.group.add(this.tutorBadgeSprite);

    this._updateTutorBadgeCanvas();
  }

  _updateTutorBadgeCanvas() {
    if (!this.tutorBadgeCtx) return;
    const ctx = this.tutorBadgeCtx;
    const w = 512;
    const h = 140;
    ctx.clearRect(0, 0, w, h);

    const isIdle = this.tutorState === 'idle';
    const isAlert = this.tutorState === 'warning';
    const isAction = !isIdle && !isAlert;

    // Strict 60/30/10 Palette:
    // Background: Aquamarine #0F3F49 (60%)
    // Action/Alert: Burgundy #7F0508 (30%)
    // Text/Border: Light Concrete #ECE6DF (10%)
    const bgColor = isAlert ? '#7F0508' : '#0F3F49';
    const borderColor = isAlert ? '#ECE6DF' : 'rgba(236, 230, 223, 0.4)';
    const accentColor = isAction ? '#7F0508' : '#ECE6DF';

    // Outer pill container
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(12, 12, w - 24, h - 24, 24);
    ctx.fill();
    ctx.stroke();

    // Subtle inner accent line
    ctx.strokeStyle = 'rgba(236, 230, 223, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(16, 16, w - 32, h - 32, 20);
    ctx.stroke();

    // Typography: Editorial Serif for headings, clean sans for guidance
    if (isIdle) {
      // Main Title: Editorial Serif
      ctx.font = 'bold 28px "Playfair Display", Georgia, serif';
      ctx.fillStyle = '#ECE6DF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AI Lab Assistant', w / 2, h / 2 - 16);

      // Subtitle: Clean Sans
      ctx.font = '500 19px "Inter", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(236, 230, 223, 0.85)';
      ctx.fillText('Click or pinch for help', w / 2, h / 2 + 22);
    } else {
      const stateLabels = {
        greeting: 'Welcome to LabVerse',
        listening: 'Listening…',
        thinking: 'Analyzing Circuit…',
        speaking: 'Explaining Step',
        explaining: 'Physics Guidance',
        warning: 'Circuit Alert'
      };
      const label = stateLabels[this.tutorState] || 'AI Assistant';

      ctx.font = 'bold 30px "Playfair Display", Georgia, serif';
      ctx.fillStyle = '#ECE6DF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2);
    }

    this.tutorBadgeTex.needsUpdate = true;
  }

  /**
   * Transition the Assistant into one of the 7 educational AI Tutor states:
   * 'idle' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'explaining' | 'warning'
   */
  setTutorState(newState, options = {}) {
    const validStates = ['idle', 'greeting', 'listening', 'thinking', 'speaking', 'explaining', 'warning'];
    if (!validStates.includes(newState)) {
      console.warn(`[LabAssistant] Invalid tutor state "${newState}", defaulting to "idle".`);
      newState = 'idle';
    }

    this.tutorState = newState;
    this.tutorStateTime = 0;
    this._updateTutorBadgeCanvas();

    // If speech text provided, show tutor speech bubble
    if (options.text) {
      this._showTutorSpeechBubble(options.text);
    }

    // Do not override hit reaction if currently reacting to a thrown item
    if (this.isReacting) return;

    // Trigger corresponding Mixamo animation clip if available
    switch (newState) {
      case 'greeting':
        if (this.actions.taunt) {
          this._playTemporaryAction(this.actions.taunt);
        }
        break;

      case 'explaining':
        // Explaining gesture: arm pointing gesture ('angryCast' or 'taunt')
        if (this.actions.angryCast) {
          this._playTemporaryAction(this.actions.angryCast);
        } else if (this.actions.taunt) {
          this._playTemporaryAction(this.actions.taunt);
        }
        break;

      case 'warning':
        // Warning posture: defensive/alert raised hands ('defend')
        if (this.actions.defend) {
          this._playTemporaryAction(this.actions.defend);
        }
        break;

      case 'thinking':
        // Thinking posture: hands clasped in concentration ('praying')
        if (this.actions.praying) {
          this._playTemporaryAction(this.actions.praying);
        }
        break;

      case 'speaking':
      case 'listening':
      case 'idle':
      default:
        // Return to natural idle loop
        if (this.actions.idle && this.currentAction !== this.actions.idle) {
          this.currentAction.crossFadeTo(this.actions.idle, 0.35, true);
          this.actions.idle.reset().play();
          this.currentAction = this.actions.idle;
        }
        break;
    }
  }

  _playTemporaryAction(targetAction) {
    if (!targetAction) return;
    if (this.currentAction && this.currentAction !== targetAction) {
      this.currentAction.crossFadeTo(targetAction, 0.25, true);
    }
    targetAction.reset().play();
    this.currentAction = targetAction;
  }

  _showTutorSpeechBubble(text) {
    if (!this.bubbleSprite) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 200;
      this.bubbleCanvas = canvas;
      this.bubbleCtx = canvas.getContext('2d');
      this.bubbleTex = new THREE.CanvasTexture(canvas);

      const mat = new THREE.SpriteMaterial({
        map: this.bubbleTex,
        transparent: true,
        opacity: 0,
        depthTest: false
      });
      this.bubbleSprite = new THREE.Sprite(mat);
      this.bubbleSprite.scale.set(0.78, 0.32, 1);
      this.bubbleSprite.position.set(0, 1.90, 0);
      this.group.add(this.bubbleSprite);
    }

    const ctx = this.bubbleCtx;
    const w = 512;
    const h = 200;
    ctx.clearRect(0, 0, w, h);

    // Calm Educational Bubble: Aquamarine #0F3F49, Concrete #ECE6DF
    ctx.fillStyle = '#0F3F49';
    ctx.strokeStyle = 'rgba(236, 230, 223, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(14, 14, w - 28, h - 50, 24);
    ctx.fill();
    ctx.stroke();

    // Pointer downward
    ctx.beginPath();
    ctx.moveTo(w / 2 - 20, h - 48);
    ctx.lineTo(w / 2, h - 10);
    ctx.lineTo(w / 2 + 20, h - 48);
    ctx.closePath();
    ctx.fillStyle = '#0F3F49';
    ctx.fill();
    ctx.stroke();

    // Text (truncated for speech bubble display)
    const displayText = text.length > 55 ? text.substring(0, 52) + '…' : text;
    ctx.font = '600 26px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#ECE6DF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🤖 ${displayText}`, w / 2, (h - 50) / 2 + 8);

    this.bubbleTex.needsUpdate = true;
    this.bubbleSprite.material.opacity = 1.0;
    this.bubbleLife = 3.5; // visible for 3.5 seconds
  }

  async _loadModelAndAnimations() {
    try {
      let characterModel = null;

      // 1. Load optimized binary GLB first (< 8.5MB, loads in <200ms without freezing WebXR)
      try {
        console.log('🔄 [LabAssistant] Loading fast binary GLB: ./models/labAssistant.glb');
        const gltfLoader = new GLTFLoader();
        const gltf = await new Promise((resolve, reject) => {
          gltfLoader.load('./models/labAssistant.glb', resolve, undefined, reject);
        });
        characterModel = gltf.scene;
        console.log('✅ [LabAssistant] Binary GLB loaded and parsed successfully!');
      } catch (glbErr) {
        console.warn('⚠️ [LabAssistant] GLB load failed, falling back to FBX:', glbErr);
        const fbxLoader = new FBXLoader();
        characterModel = await new Promise((resolve, reject) => {
          fbxLoader.load('./models/labAssistant.fbx', resolve, undefined, reject);
        });
      }

      this.model = characterModel;

      // Adjust model scale to standard human height (~1.75m)
      const box = new THREE.Box3().setFromObject(this.model);
      const size = box.getSize(new THREE.Vector3());
      if (size.y > 0) {
        const scaleFactor = 1.75 / size.y;
        this.model.scale.setScalar(scaleFactor);
      }

      // Ground model feet at y = 0 and center on local X & Z so root is exact
      box.setFromObject(this.model);
      this.model.position.y = -box.min.y;
      this.model.position.x = -(box.min.x + box.max.x) / 2;
      this.model.position.z = -(box.min.z + box.max.z) / 2;

      // Enhance materials and enable shadows
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Apply distinct professional colors to assistant garments
          if (child.name === 'Ch31_Sweater' || child.name === 'Ch31_Body') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xf8fafc,
              roughness: 0.65,
              metalness: 0.05
            });
          } else if (child.name === 'Ch31_Pants') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x1e293b,
              roughness: 0.8,
              metalness: 0.1
            });
          } else if (child.name === 'Ch31_Collar') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x2563eb,
              roughness: 0.6,
              metalness: 0.05
            });
          } else if (child.name === 'Ch31_Shoes') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x0f172a,
              roughness: 0.5,
              metalness: 0.2
            });
          } else if (child.name === 'Ch31_Hair') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x3e2723,
              roughness: 0.9,
              metalness: 0.0
            });
          } else if (child.material) {
            child.material.roughness = 0.65;
            child.material.metalness = 0.15;
          }
        }
      });

      this.group.add(this.model);

      // 2. Setup Animation Mixer
      this.mixer = new THREE.AnimationMixer(this.model);

      // 3. Load Animation Clips from JSON
      const animsRes = await fetch('./models/assistantAnimations.json');
      if (!animsRes.ok) {
        throw new Error(`Failed to load assistantAnimations.json: ${animsRes.statusText}`);
      }
      const animsData = await animsRes.json();

      Object.entries(animsData).forEach(([key, clipData]) => {
        try {
          const clip = THREE.AnimationClip.parse(clipData);
          const action = this.mixer.clipAction(clip);
          if (key === 'idle') {
            action.setLoop(THREE.LoopRepeat);
          } else {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
          }
          this.actions[key] = action;
        } catch (clipErr) {
          console.warn(`[LabAssistant] Could not parse animation clip "${key}":`, clipErr);
        }
      });

      // Start looping Idle animation by default
      if (this.actions.idle) {
        this.currentAction = this.actions.idle;
        this.currentAction.play();
      }

      // Listen for animation finish: smoothly return to idle
      this.mixer.addEventListener('finished', (e) => {
        if (this.actions.idle && e.action !== this.actions.idle) {
          this.isReacting = false;
          e.action.crossFadeTo(this.actions.idle, 0.35, true);
          this.actions.idle.reset().play();
          this.currentAction = this.actions.idle;
        }
      });

      console.log('✅ [LabAssistant] Character loaded with animations:', Object.keys(this.actions));
    } catch (err) {
      console.warn('[LabAssistant] Failed to load assistant FBX or animations, using fallback mannequin:', err);
      this._buildFallbackMannequin();
    }
  }

  _buildFallbackMannequin() {
    // Stylized fallback robotic lab assistant if FBX asset is missing
    const mannequinGroup = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6 });

    // Torso (Lab Coat)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.72, 16), coatMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    mannequinGroup.add(torso);

    // Tie
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.02), blueMat);
    tie.position.set(0, 1.15, 0.25);
    mannequinGroup.add(tie);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
    head.position.y = 1.56;
    head.castShadow = true;
    mannequinGroup.add(head);

    // Glasses
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.02), blueMat);
    glasses.position.set(0, 1.58, 0.14);
    mannequinGroup.add(glasses);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.70, 12);
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.11, 0.35, 0);
    leftLeg.castShadow = true;
    mannequinGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.11, 0.35, 0);
    rightLeg.castShadow = true;
    mannequinGroup.add(rightLeg);

    this.model = mannequinGroup;
    this.group.add(this.model);
  }

  /**
   * Called when a projectile hits the lab assistant.
   * @param {THREE.Vector3} hitPoint - World position of the hit.
   * @param {object} [projectile] - The thrown projectile details.
   */
  onHit(hitPoint, projectile) {
    // 1. Play comic impact sound
    this._playImpactSound();

    // 2. Spawn hit particles at local hit position
    const localHit = hitPoint ? this.group.worldToLocal(hitPoint.clone()) : new THREE.Vector3(0, 1.25, 0);
    this._triggerHitParticles(localHit);

    // 3. Choose a random reaction different from the previous one
    const available = ASSISTANT_REACTIONS.filter((r) => r !== this.lastReaction && this.actions[r]);
    const reactionKey = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : ASSISTANT_REACTIONS[Math.floor(Math.random() * ASSISTANT_REACTIONS.length)];
    this.lastReaction = reactionKey;

    // 4. Play reaction animation
    if (this.actions[reactionKey]) {
      const nextAction = this.actions[reactionKey];
      if (this.currentAction && this.currentAction !== nextAction) {
        this.currentAction.crossFadeTo(nextAction, 0.15, true);
      }
      nextAction.reset().play();
      this.currentAction = nextAction;
      this.isReacting = true;
    } else if (this.model) {
      // Procedural flinch animation for fallback mannequin
      this.model.position.z = -0.15;
      this.model.rotation.x = -0.22;
      setTimeout(() => {
        if (this.model) {
          this.model.position.z = 0;
          this.model.rotation.x = 0;
        }
      }, 450);
    }

    // 5. Show comic hit popup text
    const comicText = COMIC_HIT_TEXTS[Math.floor(Math.random() * COMIC_HIT_TEXTS.length)];
    this._showComicBubble(comicText);

    // 6. Speak angry voice line
    let voiceIdx = Math.floor(Math.random() * ANGRY_VOICE_LINES.length);
    if (voiceIdx === this.lastVoiceIdx) {
      voiceIdx = (voiceIdx + 1) % ANGRY_VOICE_LINES.length;
    }
    this.lastVoiceIdx = voiceIdx;
    const line = ANGRY_VOICE_LINES[voiceIdx];

    if (this.narration) {
      this.narration.init();
      this.narration.speak(line.text, line.caption, { rate: 1.05, pitch: 1.15, audioKey: line.key });
    }
  }

  initTutorServices({ tutorClient, bridge, workflowManager, speechService, sound } = {}) {
    if (tutorClient) {
      this.tutorClient = tutorClient;
      if (this.subpanels) this.subpanels.tutorClient = tutorClient;
    }
    if (bridge) {
      this.bridge = bridge;
      if (this.subpanels) this.subpanels.bridge = bridge;
    }
    if (workflowManager) {
      this.workflowManager = workflowManager;
      if (this.subpanels) this.subpanels.workflowManager = workflowManager;
    }
    if (speechService) {
      this.speechService = speechService;
      if (this.subpanels) this.subpanels.speechService = speechService;
    }
    if (sound) {
      this.sound = sound;
      if (this.subpanels) this.subpanels.sound = sound;
    }
  }

  onStudentClick(studentPos) {
    // If interaction session is already active, ignore hitbox click to prevent restart/flicker
    if (this.state.interactionActive) return;

    // 1. Audio unlock & context initialization
    this._ensureAudio();
    if (this.sound && typeof this.sound.unlock === 'function') {
      this.sound.unlock();
    }

    // 2. Transition state machine (Wall display is primary interface)
    this.state.interactionActive = true;
    this.state.radialMenuOpen = false;
    this.state.activeSubpanel = 'menu';

    // 3. Turn towards the student naturally
    const targetPos = studentPos || new THREE.Vector3(0.0, 1.3, 0.82);
    const angle = Math.atan2(targetPos.x - this.position.x, targetPos.z - this.position.z);
    this.group.rotation.y = angle;

    // 4. Play greeting animation if available
    if (this.actions.taunt) {
      this._playTemporaryAction(this.actions.taunt);
    }

    // 5. Display welcome message
    const welcomeMsg = 'Welcome to Physics VR Simulation! I am your AI Lab Assistant. How can I help you with your practical today?';
    this.setTutorState('greeting', { text: welcomeMsg });

    if (this.speechService && typeof this.speechService.speak === 'function') {
      this.speechService.speak(welcomeMsg);
      this.state.speechState = 'speaking';
    }

    // 6. Open Wall Display Menu with the 6 educational options
    if (this.subpanels) {
      this.subpanels.openMenu();
    }
  }

  onRadialSelect(optionId) {
    if (optionId === 'radial_close') {
      this.onRadialClose();
      return;
    }

    const viewMap = {
      radial_ask: 'ask_anything',
      radial_hints: 'hints',
      radial_next_step: 'next_step',
      radial_video: 'video',
      radial_examples: 'examples',
      radial_qna: 'qna'
    };

    const targetView = viewMap[optionId] || optionId;

    // State transition: subpanel active, interaction persists
    this.state.radialMenuOpen = false;
    this.state.activeSubpanel = targetView;

    if (this.subpanels) {
      this.subpanels.openView(targetView);
    }
  }

  onBackToRadial() {
    this.state.activeSubpanel = 'menu';
    this.state.radialMenuOpen = false;
    if (this.subpanels) {
      this.subpanels.openMenu();
    }
  }

  onRadialClose() {
    if (this._isClosing) return;
    this._isClosing = true;
    try {
      this.state.interactionActive = false;
      this.state.radialMenuOpen = false;
      this.state.activeSubpanel = null;
      this.state.speechState = 'idle';

      if (this.subpanels) {
        this.subpanels.openStandby();
      }
      if (this.radialMenu) {
        this.radialMenu.close();
      }
      this.setTutorState('idle');
      if (this.speechService && typeof this.speechService.stop === 'function') {
        this.speechService.stop();
      }
    } finally {
      this._isClosing = false;
    }
  }

  getClickableObjects() {
    const list = [];
    // Only allow hitbox clicks when interaction is NOT active (prevents background miss clicks)
    if (!this.state.interactionActive) {
      list.push(this.hitBox);
    }
    if (this.subpanels && typeof this.subpanels.getClickableObjects === 'function') {
      list.push(...this.subpanels.getClickableObjects());
    }
    if (this.radialMenu && typeof this.radialMenu.getClickableObjects === 'function' && this.state.radialMenuOpen) {
      list.push(...this.radialMenu.getClickableObjects());
    }
    return list;
  }

  getHitbox() {
    return this.hitBox;
  }

  setPosition(pos, targetLook = new THREE.Vector3(0, 0.85, 0.40)) {
    this.position.copy(pos);
    this.group.position.copy(pos);
    const angle = Math.atan2(targetLook.x - pos.x, targetLook.z - pos.z);
    this.group.rotation.y = angle;
  }

  update(delta, timeSec) {
    // Update Animation Mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Update Radial Holographic Menu animations
    if (this.radialMenu && typeof this.radialMenu.update === 'function') {
      this.radialMenu.update(delta);
    }

    // Animate overhead holographic status badge
    if (this.tutorBadgeSprite) {
      this.tutorStateTime += delta;
      this.tutorBadgeSprite.position.y = 2.05 + Math.sin(this.tutorStateTime * 2.2) * 0.02;
    }

    // Animate speech/comic bubble
    if (this.bubbleSprite && this.bubbleLife > 0) {
      this.bubbleLife -= delta;
      this.bubbleSprite.position.y += delta * 0.08; // float gently upward
      this.bubbleSprite.material.opacity = Math.max(0, Math.min(1.0, this.bubbleLife * 2.0));
      if (this.bubbleLife <= 0) {
        this.bubbleSprite.material.opacity = 0;
        this.bubbleSprite.position.set(0, 1.95, 0);
      }
    }

    // Animate hit particles
    this.particles.forEach((p) => {
      if (p.mesh.visible) {
        p.life += delta;
        p.vel.y -= 7.5 * delta; // gravity
        p.mesh.position.addScaledVector(p.vel, delta);
        const progress = p.life / p.maxLife;
        p.mesh.material.opacity = Math.max(0, 1.0 - progress);
        p.mesh.scale.setScalar((1.0 - progress * 0.5) * 0.024);
        if (p.life >= p.maxLife) {
          p.mesh.visible = false;
        }
      }
    });
  }

  dispose() {
    if (this.reactionTimeout) clearTimeout(this.reactionTimeout);
    if (this.mixer) this.mixer.stopAllAction();
    if (this.group.parent) this.group.parent.remove(this.group);
  }
}

