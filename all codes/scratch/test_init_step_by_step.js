import fs from 'fs';
import * as THREE from 'three';
import '../test_dom_mock.js';

// Setup full HTML DOM mock
const html = fs.readFileSync('all codes/index.html', 'utf-8');
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
const elementMap = {};

function createMockEl(id) {
  return {
    id,
    style: {},
    classList: {
      _c: new Set(),
      add(c) { this._c.add(c); },
      remove(c) { this._c.delete(c); },
      toggle(c, f) {
        if (f !== undefined) { f ? this._c.add(c) : this._c.delete(c); return f; }
        if (this._c.has(c)) { this._c.delete(c); return false; }
        this._c.add(c); return true;
      },
      contains(c) { return this._c.has(c); }
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
    height: 1080
  };
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

console.log('Testing step by step instantiation...');

async function testSteps() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 16/9, 0.08, 50);

  // 1. LabEnvironment
  console.log('1. Importing LabEnvironment...');
  const { LabEnvironment } = await import('../src/scene/labEnvironment.js');
  const mockRenderer = { outputColorSpace: '', shadowMap: {}, toneMapping: 0, toneMappingExposure: 1, domElement: createMockEl('canvas') };
  const env = new LabEnvironment(scene, mockRenderer);

  // 2. ModelLoader
  console.log('2. Importing ModelLoader...');
  const { ModelLoader } = await import('../src/models/modelLoader.js');
  const ml = new ModelLoader(scene);

  // 3. CircuitState & Validator
  console.log('3. CircuitState...');
  const { CircuitState } = await import('../src/circuit/circuitState.js');
  const { CircuitValidator } = await import('../src/circuit/circuitValidator.js');
  const circuitState = new CircuitState();

  // 4. OhmsLawSimulation
  console.log('4. OhmsLawSimulation...');
  const { OhmsLawSimulation } = await import('../src/experiments/ohmsLaw/ohmsLawSimulation.js');
  const { OHMS_LAW_CONFIG } = await import('../src/experiments/ohmsLaw/ohmsLawConfig.js');
  const sim = new OhmsLawSimulation();

  // 5. WireRenderer
  console.log('5. WireRenderer...');
  const { WireRenderer } = await import('../src/circuit/wireRenderer.js');
  const wr = new WireRenderer(scene);

  // 6. WorkflowManager & Bridge
  console.log('6. WorkflowManager & SimulationStateBridge...');
  const { OhmsLawWorkflowManager } = await import('../src/experiments/ohmsLaw/ohmsLawWorkflowManager.js');
  const { SimulationStateBridge } = await import('../src/guidance/simulationStateBridge.js');
  const wm = new OhmsLawWorkflowManager({ simulation: sim, circuitState, config: OHMS_LAW_CONFIG });
  const bridge = new SimulationStateBridge({ simulation: sim, circuitState, workflowManager: wm, config: OHMS_LAW_CONFIG });

  // 7. HolographicMetersHUD & Switches
  console.log('7. HolographicMetersHUD & Switches...');
  const { HolographicMetersHUD } = await import('../src/scene/holographicMetersHUD.js');
  const { HolographicSwitches } = await import('../src/scene/holographicSwitches.js');
  const metersHUD = new HolographicMetersHUD(scene);
  const switches = new HolographicSwitches(scene, {});

  // 8. ApparatusLabels & TerminalMarkers
  console.log('8. ApparatusLabels & TerminalMarkers...');
  const { ApparatusLabels } = await import('../src/scene/apparatusLabels.js');
  const { TerminalMarkers } = await import('../src/scene/terminalMarkers.js');
  const labels = new ApparatusLabels(scene);
  const markers = new TerminalMarkers(scene);

  // 9. Narration & GuidedMode
  console.log('9. Narration & GuidedMode...');
  const { NarrationSystem } = await import('../src/guidance/narrationSystem.js');
  const { GuidedModeController } = await import('../src/guidance/guidedModeController.js');
  const narration = new NarrationSystem({});
  const guided = new GuidedModeController({ scene, terminalMarkers: markers, narration, circuitState, simulation: sim });

  // 10. InteractionController & Panels
  console.log('10. InteractionController & Panels...');
  const { InteractionController } = await import('../src/circuit/interactionController.js');
  const { CircuitPanel } = await import('../src/ui/circuitPanel.js');
  const { MeasurementController } = await import('../src/experiments/ohmsLaw/measurementController.js');
  const { ExperimentPanel } = await import('../src/ui/experimentPanel.js');
  const { ApparatusGuide } = await import('../src/guidance/apparatusGuide.js');
  const { OrientationModal } = await import('../src/ui/orientationModal.js');
  const { LabUI } = await import('../src/ui/labUI.js');

  const mockCanvasEl = createMockEl('lab-canvas');
  const interaction = new InteractionController({ camera, scene, canvas: mockCanvasEl, circuitState, wireRenderer: wr, terminalMarkers: markers, modelLoader: ml, simulation: sim });
  const cp = new CircuitPanel({ circuitState, wireRenderer: wr, interactionController: interaction, simulation: sim });
  const mc = new MeasurementController({ scene, modelLoader: ml, simulation: sim, canvas: mockCanvasEl, camera });
  const ep = new ExperimentPanel({ container: createMockEl('exp'), simulation: sim });
  const ag = new ApparatusGuide({ scene, narration });
  const om = new OrientationModal({ circuitState, simulation: sim, guidedMode: guided, narration, apparatusGuide: ag });
  const ui = new LabUI({});

  // 11. VR Systems
  console.log('11. VR Systems...');
  const { VRWorldPanel } = await import('../src/xr/vrWorldPanel.js');
  const { VRHandCircuitHUD } = await import('../src/xr/vrHandCircuitHUD.js');
  const { VRWrist3DController } = await import('../src/xr/vrWrist3DController.js');
  const { BatterySparkEffect } = await import('../src/scene/batterySparkEffect.js');
  const { VROrientationSystem } = await import('../src/xr/vrOrientationSystem.js');
  const { VRObservationStation } = await import('../src/xr/vrObservationStation.js');
  const { LabAssistant } = await import('../src/entities/labAssistant.js');
  const { ThrowableManager } = await import('../src/interaction/throwableManager.js');
  const { AITutorClient } = await import('../src/guidance/aiTutorClient.js');
  const { AITutorSpeechService } = await import('../src/audio/aiTutorSpeechService.js');
  const { SpeechRecognitionService } = await import('../src/audio/speechRecognitionService.js');
  const { VRAITutorPanel } = await import('../src/xr/vrAITutorPanel.js');
  const { XRHandManager } = await import('../src/xr/xrHandManager.js');
  const { VRSessionManager } = await import('../src/xr/vrSessionManager.js');

  const vrWorld = new VRWorldPanel({ scene, apparatusLabels: labels, callbacks: {} });
  const vrHUD = new VRHandCircuitHUD({ scene, camera, circuitState, simulation: sim, renderer: { domElement: {} } });
  const vrWrist = new VRWrist3DController({ scene, simulation: sim, narration, camera, renderer: {} });
  const spark = new BatterySparkEffect(scene);
  const vrOrient = new VROrientationSystem({ scene, camera, narration, guidedMode: guided, apparatusGuide: ag });
  const vrObs = new VRObservationStation({ scene, simulation: sim, narration, sound: {} });
  const assistant = new LabAssistant({ scene, narration, position: new THREE.Vector3(1.25, 0, 0.35) });
  const throwable = new ThrowableManager({ scene, assistant, narration });
  const aiClient = new AITutorClient({ apiBaseUrl: '/api/tutor', bridge });
  const aiSpeech = new AITutorSpeechService({ assistant, narration });
  const speechRec = new SpeechRecognitionService({});
  const vrAI = new VRAITutorPanel({ scene, assistant, tutorClient: aiClient, bridge, workflowManager: wm, narration, sound: {}, speechRecognition: speechRec, speechService: aiSpeech });

  console.log('ALL MODULES INSTANTIATED CLEANLY!');
}

testSteps().catch(err => console.error('STEP FAILED:', err));
