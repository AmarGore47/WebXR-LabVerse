/**
 * main.js - Application Coordinator:
 * Physics XR Lab — Ohm’s Law Virtual Practical
 *
 * Integrates:
 * - 3D Lab environment, realistic lighting, shadows, and apparatus GLB model
 * - Interactive laptop mouse/touch circuit wiring and validation
 * - Scientifically accurate Ohm's Law electrical simulation & analog meters
 * - WebXR standalone VR mode with native Hand Tracking only (no controllers)
 * - Developer diagnostics and performance telemetry
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LabEnvironment } from './scene/labEnvironment.js';
import { ModelLoader } from './models/modelLoader.js';
import { ApparatusLabels } from './scene/apparatusLabels.js';
import { TerminalMarkers } from './scene/terminalMarkers.js';
import { LabUI } from './ui/labUI.js';

// Circuit Subsystems
import { CircuitState } from './circuit/circuitState.js';
import { WireRenderer } from './circuit/wireRenderer.js';
import { InteractionController } from './circuit/interactionController.js';
import { CircuitValidator } from './circuit/circuitValidator.js';
import { CircuitPanel } from './ui/circuitPanel.js';

// Simulation & Measurement Engine
import { OhmsLawSimulation } from './experiments/ohmsLaw/ohmsLawSimulation.js';
import { OhmsLawWorkflowManager, WORKFLOW_STAGES } from './experiments/ohmsLaw/ohmsLawWorkflowManager.js';
import { MeasurementController } from './experiments/ohmsLaw/measurementController.js';
import { ExperimentPanel } from './ui/experimentPanel.js';
import { OHMS_LAW_CONFIG } from './experiments/ohmsLaw/ohmsLawConfig.js';

// WebXR Hand Tracking & VR Mode
import { XR_CONFIG } from './xr/xrConfig.js';
import { VRSessionManager } from './xr/vrSessionManager.js';
import { VRWorldPanel } from './xr/vrWorldPanel.js';
import { VRHandCircuitHUD } from './xr/vrHandCircuitHUD.js';
import { VRWrist3DController } from './xr/vrWrist3DController.js';
import { XRHandManager } from './xr/xrHandManager.js';
import { DiagnosticsPanel } from './ui/diagnosticsPanel.js';
import { auditScene } from './scene/sceneAudit.js';
import { BatterySparkEffect } from './scene/batterySparkEffect.js';
import { VROrientationSystem } from './xr/vrOrientationSystem.js';
import { VRObservationStation } from './xr/vrObservationStation.js';
import { VRAITutorPanel } from './xr/vrAITutorPanel.js';
import { LabAssistant } from './entities/labAssistant.js';
import { ThrowableManager } from './interaction/throwableManager.js';
import { AITutorClient } from './guidance/aiTutorClient.js';
import { SpeechRecognitionService } from './audio/speechRecognitionService.js';
import { AITutorSpeechService } from './audio/aiTutorSpeechService.js';

// Part 6: Guided Mode, Narration, Flow Panel, Start Button
import { NarrationSystem } from './guidance/narrationSystem.js';
import { GuidedModeController } from './guidance/guidedModeController.js';
import { StartCurrentButton } from './guidance/startCurrentButton.js';
import { PracticalFlowPanel } from './guidance/practicalFlowPanel.js';
import { GUIDED_NARRATION_EVENTS } from './guidance/guidedModeConfig.js';
import { OrientationModal } from './ui/orientationModal.js';
import { ApparatusGuide } from './guidance/apparatusGuide.js';
import { SimulationStateBridge } from './guidance/simulationStateBridge.js';
import { sound, runAudioDiagnosticTest } from './audio.js';
import { HolographicSwitches } from './scene/holographicSwitches.js';
import { HolographicMetersHUD } from './scene/holographicMetersHUD.js';

// 1. Canvas and Three.js Setup
const canvas = document.getElementById('lab-canvas');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.08, 50);

// Attach Three.js AudioListener to the active XR camera, linked to shared AudioContext
const xrAudioListener = new THREE.AudioListener();
camera.add(xrAudioListener);

// Human-scale camera rig for WebXR (anchors user in front of workbench at z=1.15m)
const cameraRig = new THREE.Group();
cameraRig.name = 'XRCameraRig';
cameraRig.add(camera);
scene.add(cameraRig);

// Default panoramic camera position overlooking the workbench (framed closer for clear apparatus visibility)
const DEFAULT_CAM_POS = new THREE.Vector3(0, 1.34, 1.36);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 0.93, 0.08);
camera.position.copy(DEFAULT_CAM_POS);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  logarithmicDepthBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
// Balanced pixel ratio (1.6 max) for high desktop clarity and high Quest-class VR framerate
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));

// 2. Camera Controls (OrbitControls for Laptop / Touch)
const controls = new OrbitControls(camera, canvas);
controls.target.copy(DEFAULT_CAM_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.7;
controls.maxDistance = 4.2;
controls.minPolarAngle = Math.PI * 0.1;
controls.maxPolarAngle = Math.PI * 0.48; // Prevents camera from going below floor

// Camera smooth animation state
let targetCamPos = null;
let targetCamLook = null;

function animateCameraTo(newPos, newTarget) {
  if (!newPos || !newTarget) return;
  targetCamPos = new THREE.Vector3(newPos.x, newPos.y, newPos.z);
  targetCamLook = new THREE.Vector3(newTarget.x, newTarget.y, newTarget.z);
}

function updateCameraTransition(delta) {
  if (!targetCamPos || !targetCamLook) return;

  camera.position.lerp(targetCamPos, Math.min(delta * 6.0, 1.0));
  controls.target.lerp(targetCamLook, Math.min(delta * 6.0, 1.0));

  if (camera.position.distanceTo(targetCamPos) < 0.01 && controls.target.distanceTo(targetCamLook) < 0.01) {
    camera.position.copy(targetCamPos);
    controls.target.copy(targetCamLook);
    targetCamPos = null;
    targetCamLook = null;
  }
}

// 3. Initialize Scene Environment & Lighting
const environment = new LabEnvironment(scene, renderer);

// 4. Initialize Apparatus Labels & Terminal Markers Overlay
const labels = new ApparatusLabels(scene);
const terminalMarkers = new TerminalMarkers(scene);

// 5. Toast Feedback Function
let toastTimeout = null;
const toastEl = document.getElementById('feedback-toast');

function showFeedbackToast(feedback) {
  if (!toastEl) return;
  toastEl.textContent = feedback.message;
  toastEl.className = `toast toast-${feedback.type || 'info'} show`;

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 4200);
}

// 4b. 3D Floating Holographic Meters HUD & Tabletop Sci-Fi Consoles
const holographicMetersHUD = new HolographicMetersHUD(scene);
let holographicSwitches = null;

// 6. Initialize Circuit State & Simulation Engine
const circuitState = new CircuitState();
const simulation = new OhmsLawSimulation();
const wireRenderer = new WireRenderer(scene);
const modelLoader = new ModelLoader(scene, {
  onRoomLoaded: (isFullRoom) => {
    try {
      environment.adaptToGLBRoom(isFullRoom);
    } catch (envErr) {
      console.warn('[Main] Non-fatal error adapting environment to GLB room:', envErr);
    }
    try {
      if (vrHandCircuitHUD && modelLoader.model) {
        vrHandCircuitHUD.alignToScreen(modelLoader.model);
      }
    } catch (hudErr) {
      console.warn('[Main] Non-fatal error aligning vrHandCircuitHUD:', hudErr);
    }
    try {
      if (holographicMetersHUD && modelLoader.model) {
        holographicMetersHUD.syncWithModel(modelLoader.model);
      }
    } catch (meterErr) {
      console.warn('[Main] Non-fatal error syncing holographicMetersHUD:', meterErr);
    }
  }
});

// 6a. Narration System (init after gesture)
const narration = new NarrationSystem({
  onCaptionUpdate: (text) => {
    const captionEl = document.getElementById('narration-caption-text');
    if (captionEl) captionEl.textContent = text;
    const barEl = document.getElementById('narration-caption-bar');
    if (barEl) barEl.classList.remove('hidden');
  }
});

// Auto-unlock Web Audio and Narration on the very first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    sound.unlock();
    narration.init();
    narration._ensureAudioCtx();
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

// Connect Circuit State validation directly to Simulation engine
circuitState.subscribe(() => {
  const validation = CircuitValidator.validateFullCircuit(circuitState);
  const wasReady = simulation.circuitReady;
  const isNowReady = validation.isFullyValid;

  if (wasReady && !isNowReady && simulation.keyClosed) {
    const fb = simulation.handleWireRemovedWhileActive();
    circuitState.setSwitchClosed(false);
    showFeedbackToast({
      type: 'warning',
      message: fb.message
    });
    // Guided Mode narration: wire removed while active
    narration.speakOnce('wire_removed_active', GUIDED_NARRATION_EVENTS.wireRemovedWhileActive);
  } else {
    simulation.setCircuitReady(isNowReady);
    if (!isNowReady && circuitState.switchClosed) {
      circuitState.setSwitchClosed(false);
    }
  }

  // Celebratory notification & voice guidance when all 7 wires are complete!
  if (!wasReady && isNowReady) {
    narration.playObservationSuccessChime();
    narration.speak(
      'Circuit is complete! All 7 connections assembled. Click Start Practical to begin the experiment.',
      '⚡ Circuit Complete! Click Start Practical'
    );
    showFeedbackToast({
      type: 'success',
      message: '⚡ Circuit Complete! Click "Start Practical" to begin.'
    });
  }

  // Refresh guided mode glows/tooltip after any circuit change
  guidedMode.refresh();

  // Sync start button if available
  if (window.labCircuit && window.labCircuit.startCurrentButton) {
    window.labCircuit.startCurrentButton.syncState();
  }
});

// 6b. Guided Mode Controller
const guidedMode = new GuidedModeController({
  scene,
  terminalMarkers,
  narration,
  circuitState,
  simulation,
  onFeedback: (fb) => showFeedbackToast(fb)
});

// 7. Initialize Interaction Controller
let circuitPanel = null;
const interaction = new InteractionController({
  camera,
  scene,
  canvas,
  circuitState,
  wireRenderer,
  terminalMarkers,
  modelLoader,
  simulation,
  controls,
  onFeedback: (fb) => showFeedbackToast(fb),
  onSelectionChanged: (selectedId) => {
    if (circuitPanel) {
      circuitPanel.updateSelectionUI(selectedId);
    }
    // Guided Mode: highlight valid targets when a terminal is selected
    if (selectedId) {
      guidedMode.onTerminalSelected(selectedId);
    } else {
      guidedMode.onSelectionCancelled();
    }
  }
});

// Wire guided mode callback for correct/incorrect wire connections
interaction.onWireConnected = (from, to, isValid) => {
  guidedMode.onWireConnected(from, to, isValid);
};

// 7b. Practical Workflow Manager & State Telemetry Bridge
const workflowManager = new OhmsLawWorkflowManager({
  simulation,
  circuitState,
  config: OHMS_LAW_CONFIG
});

const simulationStateBridge = new SimulationStateBridge({
  simulation,
  circuitState,
  interactionController: interaction,
  workflowManager,
  config: OHMS_LAW_CONFIG
});
simulationStateBridge.subscribe(() => {
  workflowManager.syncWithSimulation();
});

// 7b. Tabletop 3D Holographic Switches (X-Ray & Sci-Fi Dark Lab)
holographicSwitches = new HolographicSwitches(scene, {
  onToggleXray: (isXray) => applyXrayMode(isXray),
  onToggleTheme: (isDark) => applyThemeMode(isDark)
});
interaction.registerExtraClickables(holographicSwitches.getClickableObjects());

// 8. Initialize Circuit Connections Panel
circuitPanel = new CircuitPanel({
  circuitState,
  wireRenderer,
  interactionController: interaction,
  simulation,
  onFeedback: (fb) => showFeedbackToast(fb)
});

// 9. Initialize Measurement Controller (3D Needles, Rheostat Handle, Lever)
const measurement = new MeasurementController({
  scene,
  modelLoader,
  simulation,
  canvas,
  camera
});

// 10. Initialize Master Experiment Panel (Workflow, Digital Meters HUD, Rheostat, Table, Graph, Result)
const expPanelContainer = document.getElementById('experiment-panel-container');
const experimentPanel = new ExperimentPanel({
  container: expPanelContainer,
  simulation,
  circuitState,
  workflowManager,
  onFeedback: (fb) => showFeedbackToast(fb)
});

// Toggle Experiment Panel from toolbar
const toggleExpBtn = document.getElementById('toggle-exp-panel-btn');
if (toggleExpBtn && expPanelContainer) {
  toggleExpBtn.addEventListener('click', () => {
    const isHidden = expPanelContainer.classList.toggle('hidden');
    toggleExpBtn.classList.toggle('active', !isHidden);
    toggleExpBtn.innerHTML = `<span>⚡</span> Experiment`;

    // Prevent panel collision on standard displays
    if (!isHidden && window.innerWidth < 1600) {
      const aiDock = document.getElementById('ai-tutor-dock');
      if (aiDock && !aiDock.classList.contains('hidden')) {
        aiDock.classList.add('hidden');
      }
    }
  });
}

// Phase 1: Guided Apparatus Identification & Inspection
const apparatusGuide = new ApparatusGuide({
  scene,
  narration,
  onFeedback: (fb) => showFeedbackToast(fb),
  onComplete: () => {
    guidedMode.setEnabled(true);
    guidedMode.start();
  }
});

// Initialize Experiment Orientation Modal
const orientationModal = new OrientationModal({
  circuitState,
  simulation,
  guidedMode,
  narration,
  apparatusGuide,
  onFeedback: (fb) => showFeedbackToast(fb),
  onStartPractical: () => {
    narration.init();
    apparatusGuide.startTour();
  }
});

// 11. Initialize Part 4 WebXR VR Subsystems (Hands Only, No Controllers)
let vrWorldPanel = null;
let vrHandCircuitHUD = null;
let vrWrist3DController = null;
let xrHandManager = null;
let vrSessionManager = null;
let batterySparkEffect = null;
let vrOrientationSystem = null;
let vrObservationStation = null;
let labAssistant = null;
let throwableManager = null;
let aiTutorClient = null;
let vrAITutorPanel = null;
let speechRecognitionService = null;
let aiTutorSpeechService = null;

vrWorldPanel = new VRWorldPanel({
  scene,
  apparatusLabels: labels,
  callbacks: {
    onToggleLabels: () => {
      const isVisible = labels.toggle();
      const toggleLabelsBtn = document.getElementById('toggle-labels-btn');
      if (toggleLabelsBtn) {
        toggleLabelsBtn.classList.toggle('active', isVisible);
        toggleLabelsBtn.innerHTML = `<span>🏷️</span> Labels: ${isVisible ? 'ON' : 'OFF'}`;
      }
      showFeedbackToast({
        type: 'info',
        message: `🏷️ 3D Labels ${isVisible ? 'ON' : 'OFF'}`
      });
      return isVisible;
    },
    onStartPractical: () => {
      narration.init();
      const res = simulation.startPractical();
      if (res.success) {
        circuitState.setSwitchClosed(true);
        narration.playSwitchClick();
        narration.playObservationSuccessChime();
        narration.speak(
          'Practical started! Current is now flowing through the circuit. Use the rheostat buttons to record 5 observations in the table.',
          '⚡ Practical Started: Record 5 Observations'
        );
        showFeedbackToast({
          type: 'success',
          message: '⚡ Practical Started! Current flowing.'
        });
        if (vrWorldPanel) vrWorldPanel.switchTab('table');
      } else {
        narration.playWarningChime();
        narration.speak(res.message);
        showFeedbackToast({
          type: 'warning',
          message: res.message
        });
      }
    },
    onEndPractical: () => {
      narration.init();
      const res = simulation.endPractical();
      if (res.success) {
        circuitState.setSwitchClosed(false);
        narration.playSwitchClick();
        narration.playMilestoneChime();
        narration.speak(
          `Practical completed safely! Plug key opened. Mean resistance is ${res.stats.meanResistance} ohms. Ohm's Law verified!`,
          `🏆 Practical Complete: Mean R = ${res.stats.meanResistance} Ω`
        );
        showFeedbackToast({
          type: 'success',
          message: `🏆 Practical Complete! Mean R = ${res.stats.meanResistance} Ω`
        });
        if (vrWorldPanel) vrWorldPanel.switchTab('graph');
      } else {
        showFeedbackToast({
          type: 'info',
          message: res.message
        });
      }
    },
    onRecordReading: () => {
      narration.init();
      const res = simulation.recordReading();
      if (res.success) {
        narration.playRecordChime();
        if (res.count === 1) {
          narration.speak('First observation recorded successfully. Set next rheostat position to record another reading.', '📝 1st Observation Recorded');
        } else if (res.count === 5) {
          narration.playMilestoneChime();
          narration.speak('All 5 observations recorded! Click End Practical & Verify to complete the practical.', '🏆 5/5 Observations Recorded!');
        }
      } else {
        narration.playWarningChime();
      }
      showFeedbackToast({
        type: res.success ? 'success' : 'warning',
        message: res.message
      });
    },
    onClearReadings: () => {
      simulation.clearReadings();
      showFeedbackToast({
        type: 'info',
        message: 'Observation table cleared.'
      });
    },
    onSetRheostat: (val) => {
      simulation.setRheostatResistance(val);
      showFeedbackToast({
        type: 'info',
        message: `Rheostat set to ${val.toFixed(2)} Ω`
      });
    },
    onAdjustRheostat: (delta) => {
      const newR = simulation.rheostatResistance + delta;
      simulation.setRheostatResistance(newR);
      showFeedbackToast({
        type: 'info',
        message: `Rheostat adjusted to ${simulation.rheostatResistance.toFixed(2)} Ω`
      });
    },
    onUndoWire: () => {
      const undone = circuitState.undoLastConnection();
      if (undone) {
        wireRenderer.removeWire(undone.id);
        if (simulation.keyClosed) {
          simulation.handleWireRemovedWhileActive();
          circuitState.setSwitchClosed(false);
        }
        showFeedbackToast({
          type: 'info',
          message: `Undid wire in VR.`
        });
      }
    },
    onCancelSelection: () => {
      interaction.cancelSelection();
      showFeedbackToast({ type: 'info', message: 'Selection cancelled.' });
    },
    onRestartExp: () => {
      const res = simulation.restartExperiment();
      showFeedbackToast({ type: 'info', message: res.message });
    },
    onToggleVoice: (enabled) => {
      narration.setEnabled(enabled);
      showFeedbackToast({
        type: 'info',
        message: enabled ? '🔊 Voice Guide ON' : '🔇 Voice Guide OFF'
      });
    },
    onHighlightStep: (stepNum) => {
      narration.init();
      if (stepNum >= 1 && stepNum <= 7) {
        guidedMode.highlightStep(stepNum);
        showFeedbackToast({
          type: 'info',
          message: `Highlighted Step ${stepNum} on workbench!`
        });
      } else if (stepNum === 8) {
        narration.speak(
          'Step 8. After all 7 wires are connected, press Start Current to close the plug key, then adjust the rheostat to record 5 readings for the V–I graph.',
          '🏁 Final Step: Close Key ➔ Adjust Rheostat ➔ Record 5 readings.'
        );
        showFeedbackToast({
          type: 'info',
          message: 'Final Step: Close Key & Record Readings.'
        });
      }
    },
    onTourSteps: () => {
      narration.init();
      let currentTourStep = 1;
      showFeedbackToast({
        type: 'info',
        message: '🌟 Starting 3D Sequential Glow Tour...'
      });
      const runStep = () => {
        if (currentTourStep > 7) {
          showFeedbackToast({ type: 'success', message: '🌟 3D Connection Tour Complete!' });
          if (vrWorldPanel) {
            vrWorldPanel.selectedOrientStep = null;
            vrWorldPanel.renderCanvas();
          }
          guidedMode.refresh();
          return;
        }
        if (vrWorldPanel) {
          vrWorldPanel.selectedOrientStep = currentTourStep;
          vrWorldPanel.renderCanvas();
        }
        guidedMode.highlightStep(currentTourStep);
        currentTourStep++;
        setTimeout(runStep, 4500);
      };
      runStep();
    },
    onExitVR: () => {
      if (vrSessionManager) vrSessionManager.exitVR();
    }
  }
});

vrHandCircuitHUD = new VRHandCircuitHUD({
  scene,
  camera,
  circuitState,
  simulation,
  renderer
});
vrHandCircuitHUD.setVisible(true);

vrWrist3DController = new VRWrist3DController({
  scene,
  simulation,
  narration,
  camera,
  renderer
});

// Battery Spark Effect — fires every 4-5 seconds when key is closed
batterySparkEffect = new BatterySparkEffect(scene);

// Tony Stark 3D Spatial Holographic Orientation System (Zero 2D HTML Modals in VR)
vrOrientationSystem = new VROrientationSystem({
  scene,
  camera,
  narration,
  guidedMode,
  apparatusGuide,
  onFeedback: (fb) => showFeedbackToast(fb),
  onStartPractical: () => {
    narration.init();
    apparatusGuide.startTour();
  }
});

if (vrOrientationSystem && interaction) {
  interaction.registerExtraClickables(vrOrientationSystem.getClickableObjects());
}

// Focused 3D Observation Station (Anchored beside workbench table for calm 5-reading VR recording)
vrObservationStation = new VRObservationStation({
  scene,
  simulation,
  narration,
  sound,
  onFeedback: (fb) => showFeedbackToast(fb)
});

if (vrObservationStation && interaction) {
  interaction.registerExtraClickables(vrObservationStation.getClickableObjects());
}

// 3D Animated Lab Assistant (Restored to original location inside VR lab at x = 1.25, z = 0.35)
labAssistant = new LabAssistant({
  scene,
  narration,
  position: new THREE.Vector3(1.25, 0.0, 0.35)
});

// Interactive Lab Throwables (Bouncy ball, eraser, flask, apple with 3.5s respawn)
throwableManager = new ThrowableManager({
  scene,
  assistant: labAssistant,
  narration,
  onFeedback: (fb) => showFeedbackToast(fb)
});

if (throwableManager && interaction) {
  interaction.registerExtraClickables(throwableManager.getClickableObjects());
}

// AI Tutor Client Service & 3D Spatial VR Tutor Panel
aiTutorClient = new AITutorClient({
  apiBaseUrl: '/api/tutor',
  bridge: simulationStateBridge
});

// Real-time lifecycle state subscription for desktop status pill
aiTutorClient.onStateChange((state, meta) => {
  const pill = document.getElementById('ai-status-indicator');
  if (!pill) return;
  const labels = {
    IDLE: '● Idle',
    CONNECTING: '● Connecting...',
    READY: '● Ready',
    THINKING: '● Thinking...',
    RESPONDING: '● Responding...',
    ERROR: '● Error',
    RETRYING: '● Retrying...'
  };
  pill.textContent = labels[state] || `● ${state}`;
  pill.className = `ai-status-pill ${state.toLowerCase()}`;
});

// Run backend health check on initial application startup
aiTutorClient.checkHealth().then((isHealthy) => {
  if (isHealthy) {
    console.log('[Main] LabVerse Gemini backend is HEALTHY and online.');
  } else {
    console.warn('[Main] AI Tutor backend offline; deterministic fallback active.');
  }
}).catch(() => { });

aiTutorSpeechService = new AITutorSpeechService({
  assistant: labAssistant,
  narration,
  language: 'English'
});

speechRecognitionService = new SpeechRecognitionService({
  language: 'English',
  onStateChange: (state, meta) => {
    const voiceBar = document.getElementById('ai-tutor-voice-bar');
    const voiceText = document.getElementById('ai-tutor-voice-text');
    const micBtn = document.getElementById('ai-tutor-mic-btn');
    if (voiceBar && voiceText && micBtn) {
      if (state === 'listening') {
        voiceBar.classList.remove('hidden');
        voiceText.textContent = `🎙️ Listening in ${speechRecognitionService.language}... Speak now`;
        micBtn.classList.add('recording');
      } else if (state === 'processing') {
        voiceText.textContent = 'Processing speech...';
        micBtn.classList.remove('recording');
      } else if (state === 'success') {
        voiceBar.classList.add('hidden');
        micBtn.classList.remove('recording');
      } else if (state === 'error') {
        voiceBar.classList.remove('hidden');
        voiceText.textContent = meta.message || 'Voice error occurred';
        micBtn.classList.remove('recording');
      } else {
        voiceBar.classList.add('hidden');
        micBtn.classList.remove('recording');
      }
    }
  },
  onResult: (transcript) => {
    const inputEl = document.getElementById('ai-tutor-input');
    if (inputEl) inputEl.value = transcript;
  }
});

vrAITutorPanel = new VRAITutorPanel({
  scene,
  assistant: labAssistant,
  tutorClient: aiTutorClient,
  bridge: simulationStateBridge,
  workflowManager,
  narration,
  sound,
  speechRecognition: speechRecognitionService,
  speechService: aiTutorSpeechService,
  onFeedback: (fb) => showFeedbackToast(fb)
});

if (vrAITutorPanel && interaction) {
  interaction.registerExtraClickables(vrAITutorPanel.getClickableObjects());
}

// Connect AI services to 3D Lab Assistant and its Radial Holographic Interface
if (labAssistant) {
  labAssistant.initTutorServices({
    tutorClient: aiTutorClient,
    bridge: simulationStateBridge,
    workflowManager,
    speechService: aiTutorSpeechService,
    sound
  });
  if (interaction) {
    interaction.registerClickableProvider(() => (labAssistant ? labAssistant.getClickableObjects() : []));
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      labAssistant.onRadialClose();
    }
  });
}

xrHandManager = new XRHandManager({
  renderer,
  scene,
  cameraRig,
  camera,
  interactionController: interaction,
  simulation,
  terminalMarkers,
  vrWorldPanel,
  vrHandCircuitHUD,
  vrWrist3DController,
  vrOrientationSystem,
  vrObservationStation,
  vrAITutorPanel,
  assistant: labAssistant,
  throwableManager,
  measurementController: measurement,
  wireRenderer,
  holographicSwitches,
  circuitState,
  narration,
  onFeedback: (fb) => showFeedbackToast(fb)
});

vrSessionManager = new VRSessionManager({
  renderer,
  scene,
  onFeedback: (fb) => showFeedbackToast(fb),
  onSessionStart: () => {
    // 1. Completely disable OrbitControls during WebXR session so it never intercepts
    // touch/pinch events or fights with 6-DOF headset tracking!
    if (controls) {
      controls.enabled = false;
    }
    targetCamPos = null;
    targetCamLook = null;

    // 2. Pure 1:1 metric reference space: position cameraRig in front of workbench
    // User spawns right in front of table as shown in reference image, requiring no room walking
    cameraRig.position.set(0, 0, 0.82);
    cameraRig.rotation.set(0, 0, 0);
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();

    // Enable voice guidance and sequential terminal glow in VR
    narration.init();
    if (vrOrientationSystem && vrOrientationSystem.currentPhase !== 'completed') {
      vrOrientationSystem.startOrientation();
    } else {
      guidedMode.setEnabled(true);
      guidedMode.start();
    }

    if (vrWorldPanel) {
      if (circuitState.connections.length < 7) {
        vrWorldPanel.activeTab = 'orientation';
      }
      vrWorldPanel.setVisible(true);
      vrWorldPanel.renderCanvas();
    }
    if (vrHandCircuitHUD) {
      if (modelLoader && modelLoader.model) vrHandCircuitHUD.alignToScreen(modelLoader.model);
      vrHandCircuitHUD.setVisible(true);
      vrHandCircuitHUD.renderCanvas();
    }
    if (vrWrist3DController) {
      vrWrist3DController.group.visible = true;
    }
    // Respect current apparatus label visibility
    labels.setVisible(labels.visible);
    if (vrWorldPanel) {
      vrWorldPanel.labelsVisible = labels.visible;
      vrWorldPanel.renderCanvas();
    }

    // Development-only scene audit
    auditScene(scene, circuitState);
  },
  onSessionEnd: () => {
    // Restore desktop OrbitControls and panoramic view without resetting circuit progress
    if (controls) {
      controls.enabled = true;
    }
    targetCamPos = null;
    targetCamLook = null;
    cameraRig.position.set(0, 0, 0);
    cameraRig.rotation.set(0, 0, 0);
    camera.position.copy(DEFAULT_CAM_POS);
    controls.target.copy(DEFAULT_CAM_TARGET);

    if (vrWorldPanel) vrWorldPanel.setVisible(false);
    if (vrHandCircuitHUD) vrHandCircuitHUD.hide();
    if (vrWrist3DController) vrWrist3DController.group.visible = false;
    labels.setVisible(labels.visible);

    // Development-only scene audit
    auditScene(scene, circuitState);
  }
});

xrHandManager.vrSessionManager = vrSessionManager;

// Sync VR World Panel & Left Hand HUD content whenever simulation or circuit state changes
const syncVRSubsystems = () => {
  if (vrWorldPanel) {
    const simState = simulation.getState();
    const fullVal = CircuitValidator.validateFullCircuit(circuitState);
    vrWorldPanel.updateContent({
      instruction: fullVal.isFullyValid
        ? (simState.keyClosed ? 'Circuit ON: Current is flowing across resistor.' : 'Circuit Ready: Close plug key to start.')
        : 'Connect all apparatus terminals with wires.',
      circuitStatus: fullVal.isFullyValid ? 'Complete' : 'Incomplete',
      circuitReady: fullVal.isFullyValid,
      keyClosed: simState.keyClosed,
      voltage: simState.resistorVoltage,
      current: simState.current,
      rheostatResistance: simState.rheostatResistance,
      readingCount: simState.readingCount,
      minReadings: simState.minReadings,
      isVerified: simState.statistics ? simState.statistics.isVerified : false,
      readings: simState.readings || [],
      statistics: simState.statistics || {},
      workflowStep: simState.workflowStep || 1,
      connectionsCount: circuitState.connections.length,
      connectedBranches: {
        wire1: circuitState.hasConnection('battery_positive', 'switch_left'),
        wire2: circuitState.hasConnection('switch_right', 'ammeter_positive'),
        wire3: circuitState.hasConnection('ammeter_negative', 'rheostat_in'),
        wire4: circuitState.hasConnection('rheostat_out', 'resistor_left'),
        wire5: circuitState.hasConnection('resistor_right', 'battery_negative'),
        wire6: circuitState.hasConnection('voltmeter_positive', 'resistor_left'),
        wire7: circuitState.hasConnection('voltmeter_negative', 'resistor_right')
      }
    });
  }

  if (vrHandCircuitHUD) {
    vrHandCircuitHUD.renderCanvas();
  }

  // Focused 3D Observation Station (Sync state & mutual exclusivity)
  if (vrObservationStation) {
    vrObservationStation.syncWithSimulation();

    // Mutual exclusivity:
    // When Observation Station is active (all 7 wires valid + key closed + current > 0),
    // hide the Wall TV HUD and orientation cards to provide a calm, distraction-free scientific observation display.
    if (vrObservationStation.group.visible) {
      if (vrHandCircuitHUD && vrHandCircuitHUD.group.visible) {
        vrHandCircuitHUD.setVisible(false);
      }
      if (vrOrientationSystem && vrOrientationSystem.group.visible) {
        vrOrientationSystem.group.visible = false;
      }
    } else {
      // When Observation Station is hidden (e.g. key open or wiring phase),
      // restore Wall TV HUD for circuit wiring/schematic instructions in VR.
      if (vrHandCircuitHUD && !vrHandCircuitHUD.group.visible && renderer.xr.isPresenting) {
        vrHandCircuitHUD.setVisible(true);
      }
    }
  }
};

simulation.subscribe(syncVRSubsystems);
circuitState.subscribe(syncVRSubsystems);
syncVRSubsystems();

// Also sync start button state on simulation change
simulation.subscribe(() => {
  if (window.labCircuit && window.labCircuit.startCurrentButton) {
    window.labCircuit.startCurrentButton.syncState();
  }
  // Guided narration for rheostat and reading events
  const state = simulation.getState();
  if (state.keyClosed && state.hasAdjustedRheostat) {
    narration.speakOnce('rheostat_adjust', GUIDED_NARRATION_EVENTS.rheostatAdjust, null, 4000);
  }
  if (state.readingCount >= 5) {
    narration.speakOnce('five_readings', GUIDED_NARRATION_EVENTS.fiveReadings, null, 10000);
  }
});

// 9. Initialize UI Controller
const ui = new LabUI({
  onResetView: () => {
    animateCameraTo(DEFAULT_CAM_POS, DEFAULT_CAM_TARGET);
  },
  onToggleLabels: () => labels.toggle(),
  onToggleTerminals: () => terminalMarkers.toggle(),
  onSelectPreset: (presetKey) => {
    switch (presetKey) {
      case 'overview':
        animateCameraTo(DEFAULT_CAM_POS, DEFAULT_CAM_TARGET);
        break;
      case 'meters':
        animateCameraTo(new THREE.Vector3(0.40, 1.25, 0.52), new THREE.Vector3(0.40, 0.92, 0.10));
        break;
      case 'resistor_rheostat':
        animateCameraTo(new THREE.Vector3(0.10, 1.22, 0.52), new THREE.Vector3(0.08, 0.90, 0.06));
        break;
      case 'supply_key':
        animateCameraTo(new THREE.Vector3(-0.38, 1.25, 0.52), new THREE.Vector3(-0.38, 0.90, 0.04));
        break;
    }
  }
});

// Helper function for unified X-Ray Flow mode toggle
function applyXrayMode(isXray) {
  wireRenderer.setXrayMode(isXray);
  if (holographicSwitches) {
    holographicSwitches.setStates(isXray, environment.currentTheme === 'scifi');
  }
  sound.playXrayToggle(isXray);

  const toggleXrayBtn = document.getElementById('toggle-xray-btn');
  if (toggleXrayBtn) {
    toggleXrayBtn.classList.toggle('active', isXray);
    toggleXrayBtn.innerHTML = `<span>⚛️</span> X-Ray: ${isXray ? 'ON' : 'OFF'}`;
  }

  showFeedbackToast({
    type: 'success',
    message: isXray
      ? '⚛️ X-Ray Mode ON! Live electron drift synced: High R = Slow motion, Low R = Fast sprint!'
      : '⚛️ X-Ray Mode OFF — Standard insulated wire view.'
  });
}

// Helper function for unified Sci-Fi Dark Lab theme toggle
function applyThemeMode(isSciFi) {
  const newTheme = environment.setTheme(isSciFi ? 'scifi' : 'standard');
  const isDark = newTheme === 'scifi';
  wireRenderer.setSciFiMode(isDark);
  if (holographicMetersHUD) {
    holographicMetersHUD.setTheme(isDark);
  }
  if (holographicSwitches) {
    holographicSwitches.setStates(wireRenderer.xrayMode, isDark);
  }
  sound.playSciFiWarp(isDark);

  const toggleThemeBtn = document.getElementById('toggle-theme-btn');
  if (toggleThemeBtn) {
    toggleThemeBtn.classList.toggle('active', isDark);
    toggleThemeBtn.innerHTML = `<span>🌌</span> Sci-Fi Lab: ${isDark ? 'ON' : 'OFF'}`;
  }

  showFeedbackToast({
    type: 'info',
    message: isDark
      ? '🌌 Dark Lab Theme: Ceiling lights dimmed, Tony Stark HUD & Neon Lasers online!'
      : '🏛️ Standard Lab Daylight Mode.'
  });
}

// 10b. Sci-Fi Theme toolbar toggle
const toggleThemeBtn = document.getElementById('toggle-theme-btn');
if (toggleThemeBtn) {
  toggleThemeBtn.addEventListener('click', () => {
    applyThemeMode(environment.currentTheme !== 'scifi');
  });
}

// 10b2. X-Ray Electron Flow mode toggle
const toggleXrayBtn = document.getElementById('toggle-xray-btn');
if (toggleXrayBtn) {
  toggleXrayBtn.addEventListener('click', () => {
    applyXrayMode(!wireRenderer.xrayMode);
  });
}

// 10c. Guided Mode toolbar toggle
const toggleGuidedBtn = document.getElementById('toggle-guided-btn');
if (toggleGuidedBtn) {
  toggleGuidedBtn.addEventListener('click', () => {
    const nowEnabled = !guidedMode.isEnabled();
    guidedMode.setEnabled(nowEnabled);
    if (nowEnabled) {
      guidedMode.start(); // Inits narration after user gesture
      const captionBar = document.getElementById('narration-caption-bar');
      if (captionBar) captionBar.classList.remove('hidden');
    } else {
      const captionBar = document.getElementById('narration-caption-bar');
      if (captionBar) captionBar.classList.add('hidden');
    }
    toggleGuidedBtn.innerHTML = `<span>🎓</span> Guided: ${nowEnabled ? 'ON' : 'OFF'}`;
    toggleGuidedBtn.classList.toggle('active', nowEnabled);
    showFeedbackToast({
      type: 'info',
      message: nowEnabled
        ? '🎓 Guided Mode ON — Follow the cyan glow to connect wires step by step.'
        : 'Guided Mode OFF — Free wiring mode.'
    });
  });
}

// 10c. Narration controls
const narrationToggleBtn = document.getElementById('narration-toggle-btn');
const narrationReplayBtn = document.getElementById('narration-replay-btn');
const narrationStopBtn = document.getElementById('narration-stop-btn');
const narrationVolumeSlider = document.getElementById('narration-volume-slider');

if (narrationToggleBtn) {
  narrationToggleBtn.addEventListener('click', () => {
    const isOn = !narration.enabled;
    narration.setEnabled(isOn);
    narrationToggleBtn.textContent = isOn ? '🔊 Narration: ON' : '🔇 Narration: OFF';
    narrationToggleBtn.classList.toggle('active', isOn);
  });
}
if (narrationReplayBtn) {
  narrationReplayBtn.addEventListener('click', () => {
    narration.init(); // Ensure initialized after gesture
    narration.replay();
  });
}
if (narrationStopBtn) {
  narrationStopBtn.addEventListener('click', () => narration.stop());
}
if (narrationVolumeSlider) {
  narrationVolumeSlider.addEventListener('input', (e) => {
    narration.setVolume(Number(e.target.value) / 100);
  });
}

const audioTestBtn = document.getElementById('audio-test-btn');
if (audioTestBtn) {
  audioTestBtn.addEventListener('click', async () => {
    audioTestBtn.disabled = true;
    audioTestBtn.textContent = '⏳ Testing…';
    const diag = await runAudioDiagnosticTest(narration);
    audioTestBtn.disabled = false;
    audioTestBtn.textContent = '🧪 Test Audio';
    showFeedbackToast({
      type: diag.success ? 'success' : 'warning',
      message: diag.details
    });
  });
}

// 10d. Start Current Button (3D physical push button)
const startCurrentButton = new StartCurrentButton({
  scene,
  circuitState,
  simulation,
  narration,
  onFeedback: (fb) => showFeedbackToast(fb)
});

// Wire start button click via raycaster (desktop mode)
interaction.registerExtraClickables(startCurrentButton.getClickableObjects());
if (xrHandManager) {
  xrHandManager.setStartCurrentButton(startCurrentButton);
}

// 10e. Practical Flow Panel
const practicalFlowPanel = new PracticalFlowPanel({
  simulation,
  circuitState,
  narration,
  onFeedback: (fb) => showFeedbackToast(fb)
});

// 11. Developer Diagnostics Panel (Hidden by default for students)
const diagnosticsPanel = new DiagnosticsPanel({
  vrSessionManager,
  xrHandManager,
  modelLoader,
  renderer,
  narration,
  sound
});

// 12. Load and Present 3D Laboratory Environment & Apparatus (labroom.glb)
ui.setProgress(15, 'Loading 3D laboratory environment...');

modelLoader
  .load(
    (percent) => {
      ui.setProgress(percent, `Loading 3D laboratory: ${percent}%`);
    },
    (err) => {
      ui.showError(err && err.message ? err.message : 'Could not load 3D laboratory environment.');
    }
  )
  .then((gltf) => {
    try {
      if (gltf) {
        ui.setProgress(100, '3D laboratory loaded successfully.');
        interaction.initSwitchLever();
        measurement.initModelNodes();
        terminalMarkers.syncWithModel(modelLoader.model);
        startCurrentButton.syncWithModel(modelLoader.model);
        labels.syncWithModel(modelLoader.model);
        holographicMetersHUD.syncWithModel(modelLoader.model);
        apparatusGuide.syncWithModel(modelLoader.model);
      }
    } catch (nodeErr) {
      console.warn('[Main] Non-fatal error configuring model nodes:', nodeErr);
    } finally {
      setTimeout(() => {
        ui.hideLoading();
        setTimeout(() => {
          // Launch 3D Tony Stark Spatial Orientation System (Zero 2D modal popups in VR)
          if (vrOrientationSystem) {
            vrOrientationSystem.startOrientation();
          }
        }, 450);
      }, 350);
    }
  })
  .catch((loadErr) => {
    console.error('[Main] Model load failed:', loadErr);
    ui.hideLoading();
  });

// Absolute safety timeout: never leave student stuck on loading screen longer than 4.0s
setTimeout(() => {
  ui.hideLoading();
}, 4000);

// ─── Desktop AI Tutor UI Wiring ──────────────────────────────────────────
const toggleAiTutorBtn = document.getElementById('toggle-ai-tutor-btn');
const closeAiTutorBtn = document.getElementById('close-ai-tutor-btn');
const aiTutorDock = document.getElementById('ai-tutor-dock');
const aiTutorLangSelect = document.getElementById('ai-tutor-lang-select');
const aiTutorForm = document.getElementById('ai-tutor-form');
const aiTutorInput = document.getElementById('ai-tutor-input');
const aiTutorMsgText = document.getElementById('ai-tutor-message-text');
const aiTutorExpText = document.getElementById('ai-tutor-explanation-text');
const aiTutorActText = document.getElementById('ai-tutor-action-text');
const aiStatusIndicator = document.getElementById('ai-status-indicator');

function syncDesktopTutorUI(response, isLoading = false) {
  if (aiStatusIndicator) {
    if (isLoading) {
      aiStatusIndicator.textContent = '● Thinking...';
      aiStatusIndicator.className = 'ai-status-pill thinking';
    } else if (response && response.responseType === 'error') {
      aiStatusIndicator.textContent = '● Error';
      aiStatusIndicator.className = 'ai-status-pill error';
    } else {
      aiStatusIndicator.textContent = '● Online';
      aiStatusIndicator.className = 'ai-status-pill online';
    }
  }
  if (response) {
    if (aiTutorMsgText && response.message) aiTutorMsgText.textContent = response.message;
    if (aiTutorExpText && response.explanation) aiTutorExpText.textContent = response.explanation;
    if (aiTutorActText && response.suggestedAction) aiTutorActText.textContent = `👉 ${response.suggestedAction}`;
  }
}

// ─── Settings Dropdown & Photo Guide Wiring ───
const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
const settingsDropdownMenu = document.getElementById('settings-dropdown-menu');

if (toggleSettingsBtn && settingsDropdownMenu) {
  toggleSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = settingsDropdownMenu.classList.toggle('hidden');
    toggleSettingsBtn.setAttribute('aria-expanded', !isHidden);
  });

  document.addEventListener('click', (e) => {
    if (!settingsDropdownMenu.classList.contains('hidden') && !settingsDropdownMenu.contains(e.target) && e.target !== toggleSettingsBtn) {
      settingsDropdownMenu.classList.add('hidden');
      toggleSettingsBtn.setAttribute('aria-expanded', 'false');
    }
  });

  settingsDropdownMenu.querySelectorAll('.dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      settingsDropdownMenu.classList.add('hidden');
      toggleSettingsBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

// Circuit photo guide button -> open schematic modal
const circuitPhotoGuideBtn = document.getElementById('circuit-photo-guide-btn');
const schematicModal = document.getElementById('schematic-modal');
if (circuitPhotoGuideBtn && schematicModal) {
  circuitPhotoGuideBtn.addEventListener('click', () => {
    schematicModal.classList.add('open');
  });
}

// Calm Assistant Invitation Pill click listener
const assistantInvitePill = document.getElementById('assistant-invite-pill');
if (assistantInvitePill && labAssistant) {
  assistantInvitePill.addEventListener('click', () => {
    labAssistant.onStudentClick();
    assistantInvitePill.classList.add('hidden');
  });
}

if (toggleAiTutorBtn) {
  toggleAiTutorBtn.addEventListener('click', () => {
    if (labAssistant) {
      if (!labAssistant.state.interactionActive) {
        labAssistant.onStudentClick();
        if (assistantInvitePill) assistantInvitePill.classList.add('hidden');
      } else {
        labAssistant.onRadialClose();
      }
    }
    if (aiTutorDock) {
      const isHidden = aiTutorDock.classList.toggle('hidden');
      if (vrAITutorPanel) {
        vrAITutorPanel.group.visible = !isHidden;
      }
      // Prevent panel collision on standard displays
      if (!isHidden && window.innerWidth < 1600 && expPanelContainer) {
        expPanelContainer.classList.add('hidden');
        const expBtn = document.getElementById('toggle-exp-panel-btn');
        if (expBtn) expBtn.classList.remove('active');
      }
    }
  });
}

if (closeAiTutorBtn && aiTutorDock) {
  closeAiTutorBtn.addEventListener('click', () => {
    aiTutorDock.classList.add('hidden');
  });
}

if (aiTutorLangSelect && vrAITutorPanel) {
  aiTutorLangSelect.addEventListener('change', (e) => {
    vrAITutorPanel.currentLanguage = e.target.value;
    if (speechRecognitionService) speechRecognitionService.setLanguage(e.target.value);
    if (aiTutorSpeechService) aiTutorSpeechService.setLanguage(e.target.value);
    vrAITutorPanel.redraw();
  });
}

const aiTutorMicBtn = document.getElementById('ai-tutor-mic-btn');
if (aiTutorMicBtn && vrAITutorPanel) {
  aiTutorMicBtn.addEventListener('click', async () => {
    if (speechRecognitionService && speechRecognitionService.isListening) {
      vrAITutorPanel.stopVoice();
    } else {
      sound.unlock();
      if (aiTutorSpeechService) aiTutorSpeechService.stop();
      await vrAITutorPanel.startVoiceInput();
      syncDesktopTutorUI(vrAITutorPanel.lastTutorResponse, false);
    }
  });
}

const aiVoiceCancelBtn = document.getElementById('ai-voice-cancel-btn');
if (aiVoiceCancelBtn && vrAITutorPanel) {
  aiVoiceCancelBtn.addEventListener('click', () => {
    vrAITutorPanel.stopVoice();
  });
}

if (aiTutorForm && aiTutorInput) {
  aiTutorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = aiTutorInput.value.trim();
    if (!q || !vrAITutorPanel) return;
    aiTutorInput.value = '';
    syncDesktopTutorUI(null, true);
    await vrAITutorPanel.askQuestion(q);
    syncDesktopTutorUI(vrAITutorPanel.lastTutorResponse, false);
  });
}

document.querySelectorAll('.ai-quick-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const act = btn.getAttribute('data-action');
    if (!vrAITutorPanel) return;
    syncDesktopTutorUI(null, true);
    if (act === 'hint') await vrAITutorPanel.requestGuidance('hint', 'Can you give me a hint?');
    else if (act === 'explain') await vrAITutorPanel.requestGuidance('explain', 'Can you explain the current step?');
    else if (act === 'mistakes') await vrAITutorPanel.requestGuidance('mistakes', 'Check my circuit mistakes');
    else if (act === 'guided_question') await vrAITutorPanel.requestGuidance('guided_question', 'What should I think about next for this practical?');
    else if (act === 'check_understanding') await vrAITutorPanel.requestGuidance('check_understanding', 'Can you ask me a question to test my understanding of Ohm’s Law?');
    else if (act === 'retry') await vrAITutorPanel.retryLastQuestion();
    else if (act === 'ammeter') await vrAITutorPanel.askQuestion('Why is ammeter in series and voltmeter in parallel?');
    else if (act === 'ohmslaw') await vrAITutorPanel.askQuestion('What is Ohm’s Law and how do we calculate V = IR?');
    else if (act === 'repeat') vrAITutorPanel.repeatLastResponse();
    else if (act === 'stop') vrAITutorPanel.stopVoice();
    syncDesktopTutorUI(vrAITutorPanel.lastTutorResponse, false);
  });
});

// 13. Window Resize Listener
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// 14. Main Render Loop (WebXR + Desktop Animation Loop)
let lastTime = performance.now();

function animate(time, frame) {
  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  const timeSec = time ? time / 1000 : now / 1000;
  lastTime = now;

  // Track FPS and telemetry for developer diagnostics
  diagnosticsPanel.recordFrame(now);

  // OrbitControls & transitions only active outside WebXR session
  if (!renderer.xr.isPresenting) {
    updateCameraTransition(delta);
    controls.update();
  } else if (sound.getContextState() === 'suspended') {
    // Resume Web Audio if suspended upon entering or during WebXR session
    sound.resumeContext();
  }

  // WebXR & Desktop Subsystem Updates (safely wrapped to guarantee render execution)
  try {
    terminalMarkers.update(timeSec, camera);
  } catch (e) { }

  try {
    interaction.update(delta);
    measurement.update(delta);
  } catch (e) { }

  try {
    guidedMode.update(camera);
    if (apparatusGuide) apparatusGuide.update(delta, timeSec);
  } catch (e) { }

  try {
    if (wireRenderer) wireRenderer.update(timeSec, simulation.current, delta);
  } catch (e) { }

  try {
    if (environment) environment.update(timeSec);
  } catch (e) { }

  try {
    if (holographicSwitches) holographicSwitches.update(timeSec, delta);
    if (holographicMetersHUD) {
      const liveV = simulation.keyClosed ? simulation.resistorVoltage : 0.0;
      const liveI = simulation.keyClosed ? simulation.current : 0.0;
      holographicMetersHUD.update(timeSec, liveV, liveI, wireRenderer.xrayMode, camera);
    }
  } catch (e) { }

  try {
    if (startCurrentButton) startCurrentButton.update(delta);
  } catch (e) { }

  // Update WebXR native hand tracking
  try {
    if (xrHandManager) xrHandManager.update(delta);
  } catch (e) {
    console.warn('[RenderLoop] xrHandManager update error:', e);
  }

  try {
    if (batterySparkEffect) batterySparkEffect.update(delta, simulation);
  } catch (e) { }

  try {
    if (vrOrientationSystem) vrOrientationSystem.update(delta, timeSec);
  } catch (e) { }

  try {
    if (labAssistant) labAssistant.update(delta, timeSec);
    if (throwableManager) throwableManager.update(delta);
    if (vrAITutorPanel) vrAITutorPanel.update(delta);
  } catch (e) { }

  // Guaranteed render scene every frame so WebXR compositor never latches or freezes
  try {
    renderer.render(scene, camera);
  } catch (renderErr) {
    console.error('[RenderLoop] Critical render error:', renderErr);
  }
}

// Start WebXR unified animation loop
renderer.setAnimationLoop(animate);

// Expose lab circuit systems to window for inspection and testing
window.labCircuit = {
  THREE,
  scene,
  camera,
  controls,
  animateCameraTo,
  circuitState,
  wireRenderer,
  interaction,
  terminalMarkers,
  circuitPanel,
  CircuitValidator,
  simulation,
  measurement,
  experimentPanel,
  OHMS_LAW_CONFIG,
  xrHandManager,
  vrWorldPanel,
  vrHandCircuitHUD,
  vrSessionManager,
  cameraRig,
  auditScene: () => auditScene(scene, circuitState),
  diagnosticsPanel,
  XR_CONFIG,
  // Part 6 systems
  narration,
  guidedMode,
  startCurrentButton,
  practicalFlowPanel,
  batterySparkEffect,
  apparatusGuide,
  orientationModal,
  vrOrientationSystem,
  vrObservationStation,
  labAssistant,
  throwableManager,
  stateBridge: simulationStateBridge,
  aiTutorClient,
  vrAITutorPanel,
  speechRecognition: speechRecognitionService,
  tutorSpeech: aiTutorSpeechService,
  sound,
  xrAudioListener,
  runAudioDiagnosticTest: () => runAudioDiagnosticTest(narration)
};

