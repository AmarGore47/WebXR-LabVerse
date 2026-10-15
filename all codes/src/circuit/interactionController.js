/**
 * interactionController.js
 * Coordinates mouse and touch interactions for circuit building:
 * - Terminal selection and pair wiring
 * - Wire selection and removal in 3D
 * - Physical switch lever articulation (permitted only when circuit is complete)
 */

import * as THREE from 'three';
import { CircuitValidator } from './circuitValidator.js';
import { getTerminalDisplayName } from './circuitConfig.js';

export class InteractionController {
  constructor(options) {
    this.camera = options.camera;
    this.scene = options.scene;
    this.canvas = options.canvas;
    this.circuitState = options.circuitState;
    this.wireRenderer = options.wireRenderer;
    this.terminalMarkers = options.terminalMarkers;
    this.modelLoader = options.modelLoader;
    this.simulation = options.simulation;
    this.onFeedback = options.onFeedback || (() => {});
    this.onSelectionChanged = options.onSelectionChanged || (() => {});

    this.selectedTerminalId = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.extraClickables = []; // Additional 3D objects with onPress callbacks

    // Physical switch lever reference from GLB
    this.switchLever = null;
    this.initialLeverRot = null;
    this.initialLeverPos = null;
    this.switchProgress = 0.0; // 0 = open, 1 = closed

    this.initSwitchLever();
    this.setupPointerEvents();
  }

  initSwitchLever() {
    if (this.modelLoader && this.modelLoader.model) {
      this.modelLoader.model.traverse((node) => {
        if (node.isMesh) {
          const lowerName = node.name.toLowerCase();
          if (node.name === 'Open Switch Lever' || node.name === 'Open_Switch_Lever' || lowerName === 'plugkey_lever' || lowerName.includes('plugkey_lever')) {
            this.switchLever = node;
            this.initialLeverRot = node.rotation.clone();
            this.initialLeverPos = node.position.clone();
          }
        }
      });
    }
  }

  setupPointerEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
  }

  handlePointerDown(e) {
    // Only handle primary left click / single touch
    if (e.button !== 0) return;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Raycast Terminal Hit Spheres
    const terminalHits = this.raycaster.intersectObjects(
      this.terminalMarkers.getClickableObjects(),
      false
    );

    if (terminalHits.length > 0) {
      const termId = terminalHits[0].object.userData.terminalId;
      this.handleTerminalClick(termId);
      return;
    }

    // 2. Raycast Physical Switch Lever
    if (this.switchLever) {
      const leverHits = this.raycaster.intersectObject(this.switchLever, true);
      if (leverHits.length > 0) {
        this.handleSwitchClick();
        return;
      }
    }

    // 3. Raycast extra clickables (e.g. Start Current button)
    if (this.extraClickables.length > 0) {
      const extraHits = this.raycaster.intersectObjects(this.extraClickables, false);
      if (extraHits.length > 0) {
        const obj = extraHits[0].object;
        if (obj.userData && typeof obj.userData.onPress === 'function') {
          obj.userData.onPress();
          return;
        }
      }
    }

    // 4. Raycast 3D Wires for Click-to-Remove
    const wireHits = this.raycaster.intersectObjects(
      this.wireRenderer.getClickableWireMeshes(),
      false
    );

    if (wireHits.length > 0) {
      const wireGroup = wireHits[0].object.parent;
      if (wireGroup && wireGroup.userData && wireGroup.userData.connectionId) {
        this.handleWireClick(wireGroup.userData.connectionId);
        return;
      }
    }
  }

  /**
   * Handle terminal click for two-step wire creation.
   */
  handleTerminalClick(termId) {
    // A. If no terminal selected yet -> select Terminal 1
    if (!this.selectedTerminalId) {
      this.selectedTerminalId = termId;
      this.terminalMarkers.setSelectedTerminal(termId);
      const name = getTerminalDisplayName(termId);
      this.onFeedback({
        type: 'info',
        message: `Selected ${name}. Now click another terminal to connect a wire.`
      });
      this.onSelectionChanged(this.selectedTerminalId);
      return;
    }

    // B. If same terminal clicked again -> cancel selection
    if (this.selectedTerminalId === termId) {
      this.cancelSelection();
      this.onFeedback({
        type: 'info',
        message: 'Selection cancelled.'
      });
      return;
    }

    // C. Clicked a second terminal -> attempt connection
    const termA = this.selectedTerminalId;
    const termB = termId;
    this.cancelSelection();

    const validation = CircuitValidator.validateProposedConnection(
      termA,
      termB,
      this.circuitState
    );

    if (!validation.allowed) {
      this.onFeedback({
        type: 'error',
        message: validation.message
      });
      return;
    }

    // Add connection to state
    const connection = this.circuitState.addConnection(termA, termB, validation);

    // Render physical 3D wire between terminal world positions
    const posA = this.terminalMarkers.getTerminalWorldPosition(termA);
    const posB = this.terminalMarkers.getTerminalWorldPosition(termB);
    this.wireRenderer.addWire(connection, posA, posB);

    this.onFeedback({
      type: validation.status === 'valid' ? 'success' : 'warning',
      message: validation.message
    });

    // Notify guided mode of connection
    if (this.onWireConnected) {
      this.onWireConnected(termA, termB, validation.status === 'valid');
    }
  }

  /**
   * Cancel currently active terminal selection.
   */
  cancelSelection() {
    this.selectedTerminalId = null;
    this.terminalMarkers.clearSelection();
    this.onSelectionChanged(null);
  }

  /**
   * Handle clicking directly on a 3D wire to remove it.
   */
  handleWireClick(connectionId) {
    const conn = this.circuitState.connections.find((c) => c.id === connectionId);
    if (!conn) return;

    const fromName = getTerminalDisplayName(conn.from);
    const toName = getTerminalDisplayName(conn.to);

    const wasActive = this.simulation && this.simulation.keyClosed;

    const removed = this.circuitState.removeConnection(connectionId);
    if (removed) {
      this.wireRenderer.removeWire(connectionId);

      if (wasActive) {
        const fb = this.simulation.handleWireRemovedWhileActive();
        this.circuitState.setSwitchClosed(false);
        this.onFeedback({
          type: 'warning',
          message: fb.message
        });
        return;
      }

      this.onFeedback({
        type: 'info',
        message: `Removed wire between ${fromName} and ${toName}.`
      });
    }
  }

  /**
   * Undo the most recently added wire.
   */
  undoLastWire() {
    const undone = this.circuitState.undoLastConnection();
    if (undone) {
      this.wireRenderer.removeWire(undone.id);
      const fromName = getTerminalDisplayName(undone.from);
      const toName = getTerminalDisplayName(undone.to);
      const wasActive = this.simulation && this.simulation.keyClosed;
      if (wasActive) {
        const fb = this.simulation.handleWireRemovedWhileActive();
        this.circuitState.setSwitchClosed(false);
        this.onFeedback({
          type: 'warning',
          message: fb.message
        });
      } else {
        this.onFeedback({
          type: 'info',
          message: `Undid wire between ${fromName} and ${toName}.`
        });
      }
      return true;
    } else {
      this.onFeedback({
        type: 'info',
        message: 'No wires to undo.'
      });
      return false;
    }
  }

  /**
   * Handle physical switch / plug key interaction.
   */
  handleSwitchClick() {
    if (this.simulation) {
      const res = this.simulation.toggleKey();
      this.circuitState.setSwitchClosed(this.simulation.keyClosed);
      this.onFeedback({
        type: res.success ? (this.simulation.keyClosed ? 'success' : 'info') : 'warning',
        message: res.message
      });
      return;
    }

    const fullValidation = CircuitValidator.validateFullCircuit(this.circuitState);

    if (!fullValidation.isFullyValid) {
      this.onFeedback({
        type: 'warning',
        message: '⚠️ Circuit is incomplete. Assemble the complete Ohm’s Law circuit before closing the key.'
      });
      return;
    }

    // Toggle switch state
    const nextState = !this.circuitState.switchClosed;
    this.circuitState.setSwitchClosed(nextState);

    this.onFeedback({
      type: 'success',
      message: nextState
        ? '⚡ Plug key closed! Circuit is complete.'
        : '🔌 Plug key opened.'
    });
  }

  /**
   * Register additional 3D objects for raycasting (e.g. buttons).
   * Each object must have userData.onPress callback.
   */
  registerExtraClickables(objects) {
    this.extraClickables.push(...objects);
  }

  /**
   * Update smooth lever animation in main render loop.
   */
  update(delta) {
    if (!this.switchLever && this.modelLoader && this.modelLoader.model) {
      this.initSwitchLever();
    }

    if (this.switchLever && this.initialLeverRot) {
      const targetProgress = this.circuitState.switchClosed ? 1.0 : 0.0;
      this.switchProgress = THREE.MathUtils.lerp(
        this.switchProgress,
        targetProgress,
        Math.min(delta * 12.0, 1.0)
      );

      // Rotate lever down by 38 degrees when closed
      const closeAngle = THREE.MathUtils.degToRad(-38.0 * this.switchProgress);
      this.switchLever.rotation.x = this.initialLeverRot.x + closeAngle;
      this.switchLever.position.y = this.initialLeverPos.y - 0.02 * this.switchProgress;
    }
  }
}
