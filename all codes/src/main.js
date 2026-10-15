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
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
import { MeasurementController } from './experiments/ohmsLaw/measurementController.js';
import { ExperimentPanel } from './ui/experimentPanel.js';
import { OHMS_LAW_CONFIG } from './experiments/ohmsLaw/ohmsLawConfig.js';

// WebXR Hand Tracking & VR Mode
import { XR_CONFIG } from './xr/xrConfig.js';
import { VRSessionManager } from './xr/vrSessionManager.js';
import { VRWorldPanel } from './xr/vrWorldPanel.js';
import { VRHandCircuitHUD } from './xr/vrHandCircuitHUD.js';
import { XRHandManager } from './xr/xrHandManager.js';
import { DiagnosticsPanel } from './ui/diagnosticsPanel.js';
import { auditScene } from './scene/sceneAudit.js';

// Part 6: Guided Mode, Narration, Flow Panel, Start Button
import { NarrationSystem } from './guidance/narrationSystem.js';
import { GuidedModeController } from './guidance/guidedModeController.js';
import { StartCurrentButton } from './guidance/startCurrentButton.js';
import { PracticalFlowPanel } from './guidance/practicalFlowPanel.js';
import { GUIDED_NARRATION_EVENTS } from './guidance/guidedModeConfig.js';
import { OrientationModal } from './ui/orientationModal.js';

// 1. Canvas and Three.js Setup
const canvas = document.getElementById('lab-canvas');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.08, 50);

// Human-scale camera rig for WebXR (anchors user in front of workbench at z=1.15m)
const cameraRig = new THREE.Group();
cameraRig.name = 'XRCameraRig';
cameraRig.add(camera);
scene.add(cameraRig);

// Default panoramic camera position overlooking the workbench
const DEFAULT_CAM_POS = new THREE.Vector3(0, 1.85, 2.25);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 1.08, -0.05);
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
  targetCamPos = newPos.clone();
  targetCamLook = newTarget.clone();
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

// 6. Initialize Circuit State & Simulation Engine
const circuitState = new CircuitState();
const simulation = new OhmsLawSimulation();
const wireRenderer = new WireRenderer(scene);
const modelLoader = new ModelLoader(scene, {
  onRoomLoaded: (isFullRoom) => {
    environment.adaptToGLBRoom(isFullRoom);
    if (vrHandCircuitHUD && modelLoader.model) {
      vrHandCircuitHUD.alignToScreen(modelLoader.model);
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
  onFeedback: (fb) => showFeedbackToast(fb)
});

// Toggle Experiment Panel from toolbar
const toggleExpBtn = document.getElementById('toggle-exp-panel-btn');
if (toggleExpBtn && expPanelContainer) {
  toggleExpBtn.addEventListener('click', () => {
    const isHidden = expPanelContainer.classList.toggle('hidden');
    toggleExpBtn.classList.toggle('active', !isHidden);
    toggleExpBtn.innerHTML = `<span>⚡</span> Experiment: ${isHidden ? 'OFF' : 'ON'}`;
  });
}

// Initialize Experiment Orientation Modal
const orientationModal = new OrientationModal({
  circuitState,
  simulation,
  guidedMode,
  narration,
  onFeedback: (fb) => showFeedbackToast(fb)
});

// 11. Initialize Part 4 WebXR VR Subsystems (Hands Only, No Controllers)
let vrWorldPanel = null;
let vrHandCircuitHUD = null;
let xrHandManager = null;
let vrSessionManager = null;

vrWorldPanel = new VRWorldPanel({
  scene,
  callbacks: {
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

xrHandManager = new XRHandManager({
  renderer,
  scene,
  cameraRig,
  interactionController: interaction,
  simulation,
  terminalMarkers,
  vrWorldPanel,
  vrHandCircuitHUD,
  measurementController: measurement,
  wireRenderer,
  onFeedback: (fb) => showFeedbackToast(fb)
});

vrSessionManager = new VRSessionManager({
  renderer,
  onFeedback: (fb) => showFeedbackToast(fb),
  onSessionStart: () => {
    // Human-scale placement: stand in front of workbench (table front edge is at z=0.7m)
    cameraRig.position.set(0, 0, 1.15);
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();

    // Enable voice guidance and sequential terminal glow in VR
    narration.init();
    guidedMode.setEnabled(true);
    guidedMode.start();

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
    labels.setVisible(false);

    // Development-only scene audit
    auditScene(scene, circuitState);
  },
  onSessionEnd: () => {
    // Restore desktop OrbitControls panoramic view without resetting circuit progress
    cameraRig.position.set(0, 0, 0);
    camera.position.copy(DEFAULT_CAM_POS);
    controls.target.copy(DEFAULT_CAM_TARGET);

    if (vrHandCircuitHUD) vrHandCircuitHUD.hide();
    labels.setVisible(true);

    // Development-only scene audit
    auditScene(scene, circuitState);
  }
});

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
        animateCameraTo(new THREE.Vector3(0.38, 1.62, 0.95), new THREE.Vector3(0.38, 1.35, 0.0));
        break;
      case 'resistor_rheostat':
        animateCameraTo(new THREE.Vector3(0.52, 1.68, 0.55), new THREE.Vector3(0.50, 1.28, -0.48));
        break;
      case 'supply_key':
        animateCameraTo(new THREE.Vector3(-0.95, 1.62, 1.10), new THREE.Vector3(-0.95, 1.20, 0.10));
        break;
    }
  }
});

// 10b. Guided Mode toolbar toggle
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
  renderer
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
    if (gltf) {
      ui.setProgress(100, '3D laboratory loaded successfully.');
      interaction.initSwitchLever();
      measurement.initModelNodes();
      terminalMarkers.syncWithModel(modelLoader.model);
      startCurrentButton.syncWithModel(modelLoader.model);
    }
    setTimeout(() => {
      ui.hideLoading();
    }, 350);
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
  }

  // Update subtle pulsing of terminal markers with camera billboarding
  terminalMarkers.update(timeSec, camera);

  // Update physical switch lever articulation
  interaction.update(delta);

  // Update physical needles, rheostat handle, and switch articulation
  measurement.update(delta);

  // Update guided mode (billboard tooltip, animated energy beam, 3D pins)
  guidedMode.update(camera);

  // Update Start Current button (push animation, LED pulse)
  if (startCurrentButton) {
    startCurrentButton.update(delta);
  }

  // Update WebXR hand tracking, joint positions & proximity pinch gestures
  if (xrHandManager) {
    xrHandManager.update(delta);
  }

  // Render scene
  renderer.render(scene, camera);
}

// Start WebXR unified animation loop
renderer.setAnimationLoop(animate);

// Expose lab circuit systems to window for inspection and testing
window.labCircuit = {
  scene,
  camera,
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
  practicalFlowPanel
};

