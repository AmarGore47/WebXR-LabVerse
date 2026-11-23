/**
 * interactionController.js
 * Coordinates mouse and touch interactions for circuit building:
 * - Terminal selection and pair wiring
 * - Wire selection and removal in 3D
 * - Physical switch lever articulation (permitted only when circuit is complete)
 */

import * as THREE from 'three';
import { CircuitValidator } from './circuitValidator.js';
import { getTerminalDisplayName, getMaxConnectionsForTerminal } from './circuitConfig.js';
import { sound } from '../audio.js';

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
    this.controls = options.controls || null;
    this.assistant = options.assistant || null;
    this.onFeedback = options.onFeedback || (() => { });
    this.onSelectionChanged = options.onSelectionChanged || (() => { });

    this.selectedTerminalId = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.extraClickables = []; // Additional 3D objects with onPress callbacks
    this.clickableProviders = []; // Dynamic provider functions returning 3D clickables

    // Physical switch lever reference from GLB
    this.switchLever = null;
    this.initialLeverRot = null;
    this.initialLeverPos = null;
    this.switchProgress = 0.0; // 0 = open, 1 = closed

    // Wire disconnection confirmation state
    this.disconnectModal = null;
    this.disconnectDesc = null;
    this.confirmDisconnectBtn = null;
    this.cancelDisconnectBtn = null;
    this.pendingDisconnectId = null;
    this.lastDisconnectRequestTime = 0;

    this.initSwitchLever();
    this.initDisconnectDialog();
    this.setupPointerEvents();
  }

  initDisconnectDialog() {
    if (typeof document === 'undefined') return;
    this.disconnectModal = document.getElementById('wire-disconnect-modal');
    this.disconnectDesc = document.getElementById('wire-disconnect-desc');
    this.confirmDisconnectBtn = document.getElementById('wire-disconnect-confirm-btn');
    this.cancelDisconnectBtn = document.getElementById('wire-disconnect-cancel-btn');

    if (this.confirmDisconnectBtn) {
      this.confirmDisconnectBtn.addEventListener('click', () => {
        this.confirmWireDisconnection(this.pendingDisconnectId);
      });
    }

    if (this.cancelDisconnectBtn) {
      this.cancelDisconnectBtn.addEventListener('click', () => {
        this.hideDisconnectDialog();
        this.onFeedback({
          type: 'info',
          message: 'Wire kept connected.'
        });
      });
    }

    if (this.disconnectModal) {
      this.disconnectModal.addEventListener('click', (e) => {
        if (e.target === this.disconnectModal) {
          this.hideDisconnectDialog();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.disconnectModal && this.disconnectModal.classList.contains('open')) {
        this.hideDisconnectDialog();
      }
    });
  }

  _lockControlsTemporarily() {
    if (this.controls && this.controls.enabled) {
      this.controls.enabled = false;
      const unlock = () => {
        if (this.controls) this.controls.enabled = true;
        window.removeEventListener('pointerup', unlock);
        window.removeEventListener('pointercancel', unlock);
      };
      window.addEventListener('pointerup', unlock, { once: true });
      window.addEventListener('pointercancel', unlock, { once: true });
    }
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
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
  }

  handlePointerMove(e) {
    if (typeof window === 'undefined') return;
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    let candidateClickables = [...this.extraClickables];
    for (const provider of this.clickableProviders) {
      if (typeof provider === 'function') {
        const list = provider();
        if (Array.isArray(list)) candidateClickables.push(...list);
      }
    }

    const radialNodes = candidateClickables.filter((o) => o && o.userData && o.userData.type === 'radial_button' && o.visible !== false);
    if (radialNodes.length > 0) {
      const hits = this.raycaster.intersectObjects(radialNodes, false);
      let hoveredOptionId = null;
      if (hits.length > 0) {
        hoveredOptionId = hits[0].object?.userData?.actionId || hits[0].object?.userData?.optionId || null;
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = '';
      }

      const ast = this.assistant || (typeof window !== 'undefined' ? window.labAssistant : null);
      if (ast && ast.radialMenu && typeof ast.radialMenu.setHoveredOption === 'function') {
        ast.radialMenu.setHoveredOption(hoveredOptionId);
      }
    }
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
      this._lockControlsTemporarily();
      const termId = terminalHits[0].object.userData.terminalId;
      this.handleTerminalClick(termId);
      return;
    }

    // 2. Raycast Physical Switch Lever
    if (this.switchLever) {
      const leverHits = this.raycaster.intersectObject(this.switchLever, true);
      if (leverHits.length > 0) {
        this._lockControlsTemporarily();
        this.handleSwitchClick();
        return;
      }
    }

    // 3. Raycast extra clickables (e.g. Start Current button, Assistant, Radial Menu, Subpanels)
    let candidateClickables = [...this.extraClickables];
    for (const provider of this.clickableProviders) {
      if (typeof provider === 'function') {
        const list = provider();
        if (Array.isArray(list)) candidateClickables.push(...list);
      }
    }

    if (candidateClickables.length > 0) {
      const activeClickables = candidateClickables.filter((o) => {
        let p = o;
        while (p) {
          if (p.visible === false) return false;
          p = p.parent;
        }
        return true;
      });
      const extraHits = this.raycaster.intersectObjects(activeClickables, false);
      if (extraHits.length > 0) {
        // Prioritize radial_button hits over background or generic colliders
        extraHits.sort((a, b) => {
          const aIsRadial = a.object?.userData?.type === 'radial_button' || a.object?.parent?.userData?.type === 'radial_button';
          const bIsRadial = b.object?.userData?.type === 'radial_button' || b.object?.parent?.userData?.type === 'radial_button';
          if (aIsRadial && !bIsRadial) return -1;
          if (!aIsRadial && bIsRadial) return 1;
          return a.distance - b.distance;
        });

        for (const hit of extraHits) {
          let cur = hit.object;
          let pressFn = null;
          while (cur && cur !== this.scene) {
            if (cur.userData && typeof cur.userData.onPress === 'function') {
              pressFn = cur.userData.onPress;
              break;
            }
            cur = cur.parent;
          }
          if (typeof pressFn === 'function') {
            this._lockControlsTemporarily();
            pressFn(hit);
            return;
          }
        }
      }
    }

    // 4. Raycast 3D Wires for Click-to-Remove
    const wireHits = this.raycaster.intersectObjects(
      this.wireRenderer.getClickableWireMeshes(),
      false
    );

    if (wireHits.length > 0) {
      this._lockControlsTemporarily();
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
  /**
   * Handle terminal click for two-step wire creation.
   */
  handleTerminalClick(termId) {
    // A. If no terminal selected yet -> selecting Terminal 1
    if (!this.selectedTerminalId) {
      // Check if terminal is already at maximum capacity
      const currentCount = this.circuitState.getConnectionCountForTerminal(termId);
      const maxCount = getMaxConnectionsForTerminal(termId);
      if (currentCount >= maxCount) {
        const connectedConns = this.circuitState.connections.filter(c => c.from === termId || c.to === termId);
        const otherTermNames = connectedConns.map(c => {
          const otherId = c.from === termId ? c.to : c.from;
          return getTerminalDisplayName(otherId);
        }).join(', ');
        const name = getTerminalDisplayName(termId);
        this.onFeedback({
          type: 'warning',
          message: `${name} is already connected to ${otherTermNames}. Click the wire to disconnect it first if you want to rewire.`
        });
        return;
      }

      this.selectedTerminalId = termId;
      this.terminalMarkers.setSelectedTerminal(termId);
      const name = getTerminalDisplayName(termId);
      sound.playSliderTick(1.8);
      this.onFeedback({
        type: 'info',
        message: `Selected ${name}. Now click another terminal to connect a wire.`
      });
      this.onSelectionChanged(this.selectedTerminalId);
      return;
    }

    // B. If same terminal clicked again -> cancel selection
    if (this.selectedTerminalId === termId) {
      sound.playSliderTick(0.8);
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
      sound.playErrorTone();
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

    // Play crisp physical wire snap audio feedback
    sound.playWireSnap();

    // If this completed the 7 required connections, play victory chime!
    if (this.circuitState.connections.length >= 7 && this.circuitState.isCircuitComplete()) {
      setTimeout(() => sound.playSuccessChime(), 160);
    }

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
   * Handle clicking directly on a 3D wire to request removal with confirmation.
   */
  handleWireClick(connectionId) {
    const conn = this.circuitState.connections.find((c) => c.id === connectionId);
    if (!conn) return;

    const fromName = getTerminalDisplayName(conn.from);
    const toName = getTerminalDisplayName(conn.to);

    // In VR immersive mode: 2-step pinch confirmation
    const isVR = (typeof navigator !== 'undefined' && this.scene && this.scene.userData && this.scene.userData.isInVR);
    if (isVR) {
      const now = Date.now();
      if (this.pendingDisconnectId === connectionId && (now - this.lastDisconnectRequestTime) < 5000) {
        this.confirmWireDisconnection(connectionId);
        return;
      }
      this.pendingDisconnectId = connectionId;
      this.lastDisconnectRequestTime = now;
      this.onFeedback({
        type: 'warning',
        message: `⚠️ Disconnect wire between ${fromName} and ${toName}? Pinch it again to confirm.`
      });
      return;
    }

    // Desktop: show confirmation modal
    this.showDisconnectDialog(connectionId);
  }

  /**
   * Display confirmation modal before disconnecting wire.
   */
  showDisconnectDialog(connectionId) {
    const conn = this.circuitState.connections.find((c) => c.id === connectionId);
    if (!conn) return;

    this.pendingDisconnectId = connectionId;
    const fromName = getTerminalDisplayName(conn.from);
    const toName = getTerminalDisplayName(conn.to);

    if (this.disconnectDesc) {
      this.disconnectDesc.innerHTML = `Are you sure you want to remove the connecting wire between <strong>${fromName}</strong> and <strong>${toName}</strong>?`;
    }
    if (this.disconnectModal) {
      this.disconnectModal.classList.add('open');
    }
  }

  /**
   * Hide confirmation modal.
   */
  hideDisconnectDialog() {
    this.pendingDisconnectId = null;
    if (this.disconnectModal) {
      this.disconnectModal.classList.remove('open');
    }
  }

  /**
   * Confirmed removal of wire.
   */
  confirmWireDisconnection(connectionId) {
    const targetId = connectionId || this.pendingDisconnectId;
    this.hideDisconnectDialog();
    if (!targetId) return;

    const conn = this.circuitState.connections.find((c) => c.id === targetId);
    if (!conn) return;

    const fromName = getTerminalDisplayName(conn.from);
    const toName = getTerminalDisplayName(conn.to);
    const wasActive = this.simulation && this.simulation.keyClosed;

    const removed = this.circuitState.removeConnection(targetId);
    if (removed) {
      this.wireRenderer.removeWire(targetId);
      sound.playWireDisconnect();

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
      sound.playWireDisconnect();
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

  setAssistant(assistant) {
    this.assistant = assistant;
  }

  /**
   * Register a dynamic provider function returning an array of 3D clickable objects.
   */
  registerClickableProvider(providerFn) {
    if (typeof providerFn === 'function') {
      this.clickableProviders.push(providerFn);
    }
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
