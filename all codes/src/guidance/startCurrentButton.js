/**
 * startCurrentButton.js
 * Physical 3D "Start Current" / "Stop Current" push-button mounted on the
 * front-right edge of the lab table.
 *
 * Safety rules (scientifically enforced):
 * - Calls ONLY the existing simulation.setKeyClosed() and circuitState APIs.
 * - Does NOT bypass circuit validation.
 * - If circuit is incomplete: shows warning, plays narration, does NOT start current.
 * - If valid: closes plug key, starts current.
 * - Pressing again: opens key, stops current safely.
 * - If wire removed while active: button auto-returns to disabled state.
 *
 * Interaction:
 * - Laptop/Touch: mouse raycaster click.
 * - VR: pinch proximity (handled by xrHandManager which checks userData.isVRButton).
 * - NO controllers, NO gamepad.
 *
 * Visual states:
 * - disabled (amber): circuit incomplete
 * - ready (blue): circuit complete, current off
 * - active (green): current flowing
 * - error (red): short circuit / unsafe wire
 */

import * as THREE from 'three';
import { CircuitValidator } from '../circuit/circuitValidator.js';

// Button dimensions (meters)
const BTN_W = 0.095;
const BTN_H = 0.038;
const BTN_D = 0.022;

const STATE_COLORS = {
  disabled: 0x7c5c00,  // Dark amber
  ready:    0x0057b3,  // Deep blue
  active:   0x14532d,  // Deep green
  error:    0x7f1d1d   // Deep red
};

const LED_COLORS = {
  disabled: 0xfbbf24,  // Amber
  ready:    0x38bdf8,  // Blue
  active:   0x22c55e,  // Green
  error:    0xef4444   // Red
};

export class StartCurrentButton {
  constructor({
    scene,
    circuitState,
    simulation,
    narration,
    onFeedback,
    position = new THREE.Vector3(-0.74, 0.825, 0.10)
  }) {
    this.scene = scene;
    this.circuitState = circuitState;
    this.simulation = simulation;
    this.narration = narration;
    this.onFeedback = onFeedback || (() => {});

    this.group = new THREE.Group();
    this.group.name = 'StartCurrentButtonGroup';
    this.group.position.copy(position);

    // State
    this.currentState = 'disabled'; // disabled | ready | active | error
    this.pushProgress = 0.0; // 0 = resting, 1 = fully pressed
    this.isPushed = false;

    // Click sound (Web Audio API)
    this._audioCtx = null;

    this._buildButton();
    this._buildLED();
    this._buildLabel();
    this._buildHitBox();

    if (scene) scene.add(this.group);

    this._updateVisuals();
  }

  /**
   * Snaps button position to corresponding 3D node in the loaded model.
   */
  syncWithModel(model) {
    if (!model) return;
    const mesh = model.getObjectByName('StartCurrentButton') || model.getObjectByName('StartButton_base');
    if (mesh) {
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      this.group.position.set(worldPos.x, worldPos.y + 0.012, worldPos.z);
    }
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  _buildButton() {
    // Base housing
    const housingGeo = new THREE.BoxGeometry(BTN_W + 0.016, BTN_H + 0.012, BTN_D + 0.012);
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.7
    });
    this.housing = new THREE.Mesh(housingGeo, housingMat);
    this.group.add(this.housing);

    // Button cap
    const capGeo = new THREE.BoxGeometry(BTN_W, BTN_H, BTN_D);
    this.capMat = new THREE.MeshStandardMaterial({
      color: STATE_COLORS.disabled,
      roughness: 0.25,
      metalness: 0.5,
      emissive: new THREE.Color(STATE_COLORS.disabled),
      emissiveIntensity: 0.18
    });
    this.cap = new THREE.Mesh(capGeo, this.capMat);
    this.cap.position.z = (BTN_D + 0.012) / 2;
    this.group.add(this.cap);
  }

  _buildLED() {
    // Small status LED sphere on top-right of button
    const ledGeo = new THREE.SphereGeometry(0.007, 12, 12);
    this.ledMat = new THREE.MeshStandardMaterial({
      color: LED_COLORS.disabled,
      emissive: new THREE.Color(LED_COLORS.disabled),
      emissiveIntensity: 1.6,
      roughness: 0.1,
      metalness: 0.0
    });
    this.ledMesh = new THREE.Mesh(ledGeo, this.ledMat);
    this.ledMesh.position.set((BTN_W / 2) + 0.012, (BTN_H / 2) + 0.009, (BTN_D + 0.012) / 2 + 0.001);
    this.group.add(this.ledMesh);
  }

  _buildLabel() {
    // Main label canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    this._labelCanvas = canvas;
    this._labelCtx = canvas.getContext('2d');
    this._labelTexture = new THREE.CanvasTexture(canvas);
    this._labelTexture.minFilter = THREE.LinearFilter;

    const labelPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(BTN_W - 0.006, BTN_H - 0.006),
      new THREE.MeshBasicMaterial({ map: this._labelTexture, transparent: true })
    );
    labelPlane.position.z = (BTN_D + 0.012) / 2 + BTN_D / 2 + 0.001;
    this.group.add(labelPlane);
    this._renderLabel();
  }

  _buildHitBox() {
    // Larger invisible hit volume for comfortable clicking/pinching
    const hitGeo = new THREE.BoxGeometry(BTN_W + 0.04, BTN_H + 0.04, BTN_D + 0.06);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitBox = new THREE.Mesh(hitGeo, hitMat);
    this.hitBox.userData = {
      isVRButton: true,
      buttonId: 'start_current_btn',
      label: 'Start Current',
      onPress: () => this.handlePress()
    };
    this.group.add(this.hitBox);
  }

  // ─── Interaction ──────────────────────────────────────────────────────────

  /**
   * Called when button is pressed (mouse click or VR pinch).
   */
  handlePress() {
    this._playClickSound();
    this._triggerPushAnimation();

    const validation = CircuitValidator.validateFullCircuit(this.circuitState);

    if (validation.hasShortCircuit || validation.errorCount > 0) {
      // Unsafe circuit
      this.onFeedback({
        type: 'error',
        message: '⚠️ Unsafe circuit: Short circuit or incorrect wires detected. Fix the circuit first.'
      });
      if (this.narration) {
        this.narration.speakOnce(
          'start_btn_error',
          'The circuit has an unsafe wire or short circuit. Please remove the incorrect wire before starting current.'
        );
      }
      return;
    }

    if (!validation.isFullyValid) {
      // Incomplete
      this.onFeedback({
        type: 'warning',
        message: '⚠️ Complete the correct circuit before starting current.'
      });
      if (this.narration) {
        this.narration.speakOnce(
          'start_btn_incomplete',
          'The circuit is not yet complete. Please connect all 7 required wires before starting current.',
          'Complete the correct circuit before starting current.'
        );
      }
      return;
    }

    // Valid circuit — toggle key
    const result = this.simulation.toggleKey();
    this.circuitState.setSwitchClosed(this.simulation.keyClosed);

    if (result.success) {
      this.onFeedback({
        type: this.simulation.keyClosed ? 'success' : 'info',
        message: result.message
      });

      if (this.narration) {
        if (this.simulation.keyClosed) {
          this.narration.speakOnce(
            'current_start',
            'Current is now flowing through the circuit. The ammeter shows current, while the voltmeter shows the potential difference across the resistor.',
            null,
            500
          );
        } else {
          this.narration.speakOnce(
            'current_stop',
            'Current has been stopped. The plug key is now open.',
            null,
            500
          );
        }
      }
    }

    this._updateVisuals();
  }

  // ─── State sync ───────────────────────────────────────────────────────────

  /**
   * Sync button visual state from simulation & circuit.
   * Call whenever simulation or circuitState changes.
   */
  syncState() {
    const validation = CircuitValidator.validateFullCircuit(this.circuitState);

    if (validation.hasShortCircuit || validation.errorCount > 0) {
      this.currentState = 'error';
    } else if (this.simulation.keyClosed) {
      this.currentState = 'active';
    } else if (validation.isFullyValid) {
      this.currentState = 'ready';
    } else {
      this.currentState = 'disabled';
    }

    this._updateVisuals();
  }

  // ─── Visuals ──────────────────────────────────────────────────────────────

  _updateVisuals() {
    const btnColor = STATE_COLORS[this.currentState];
    const ledColor = LED_COLORS[this.currentState];

    if (this.capMat) {
      this.capMat.color.setHex(btnColor);
      this.capMat.emissive.setHex(btnColor);
      this.capMat.emissiveIntensity = this.currentState === 'active' ? 0.55 : 0.18;
    }
    if (this.ledMat) {
      this.ledMat.color.setHex(ledColor);
      this.ledMat.emissive.setHex(ledColor);
      const pulse = this.currentState === 'active' ? 2.2 : 1.6;
      this.ledMat.emissiveIntensity = pulse;
    }

    this._renderLabel();
  }

  _renderLabel() {
    const ctx = this._labelCtx;
    if (!ctx) return;
    const w = 512, h = 256;

    ctx.clearRect(0, 0, w, h);

    const isActive = this.currentState === 'active';
    const isReady = this.currentState === 'ready';
    const isError = this.currentState === 'error';

    // Main label
    ctx.fillStyle = isActive ? '#22c55e' : isReady ? '#38bdf8' : isError ? '#ef4444' : '#fbbf24';
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isActive ? '⏹ STOP CURRENT' : '▶ START CURRENT', 256, 100);

    // Sub-label
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '28px Inter, sans-serif';
    ctx.fillText(
      isActive ? 'Key: CLOSED ⚡' :
      isReady  ? 'Closes Plug Key' :
      isError  ? 'Fix circuit first' :
                 'Complete circuit first',
      256, 170
    );

    this._labelTexture.needsUpdate = true;
  }

  _triggerPushAnimation() {
    this.isPushed = true;
    setTimeout(() => { this.isPushed = false; }, 160);
  }

  _playClickSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this._audioCtx) this._audioCtx = new AudioCtx();
      const ctx = this._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.currentState === 'active' ? 620 : 900, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.045);
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {
      // Non-fatal
    }
  }

  // ─── Render loop ──────────────────────────────────────────────────────────

  update(delta) {
    // Smooth push animation
    const targetZ = this.isPushed ? -BTN_D * 0.45 : 0;
    if (this.cap) {
      const baseZ = (BTN_D + 0.012) / 2;
      this.pushProgress = THREE.MathUtils.lerp(this.pushProgress, this.isPushed ? 1.0 : 0.0, Math.min(delta * 28, 1));
      this.cap.position.z = baseZ - BTN_D * 0.42 * this.pushProgress;
    }

    // LED pulse when active
    if (this.ledMat && this.currentState === 'active') {
      const t = Date.now() / 1000;
      this.ledMat.emissiveIntensity = 1.4 + Math.sin(t * 4.5) * 0.8;
    }
  }

  /**
   * Returns the hit box mesh for raycasting.
   */
  getClickableObjects() {
    return [this.hitBox];
  }

  dispose() {
    if (this.scene) this.scene.remove(this.group);
    if (this._audioCtx) this._audioCtx.close().catch(() => {});
  }
}
