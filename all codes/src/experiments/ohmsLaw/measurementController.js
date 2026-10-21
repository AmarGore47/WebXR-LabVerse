/**
 * measurementController.js
 * Controls physical 3D apparatus animations:
 * - Analog meter needle deflections (Ammeter & Voltmeter) with physical inertia
 * - Rheostat 3D slider handle translation along winding rail
 * - Physical plug key lever articulation
 * - Dynamic Resistor Thermal Heating & Joule Glow Effect (H = I²Rt) with live 3D temperature badge
 * - Synchronization with OhmsLawSimulation live electrical state
 */

import * as THREE from 'three';

export class MeasurementController {
  constructor(options) {
    this.scene = options.scene;
    this.modelLoader = options.modelLoader;
    this.simulation = options.simulation;
    this.canvas = options.canvas;
    this.camera = options.camera;

    // 3D Model References
    this.ammeterNeedle = null;
    this.ammeterPivotPos = new THREE.Vector3(-0.05, 1.38, 0.08);
    this.ammeterInitialRot = null;
    this.ammeterInitialPos = null;

    this.voltmeterNeedle = null;
    this.voltmeterPivotPos = new THREE.Vector3(0.80, 1.38, 0.08);
    this.voltmeterInitialRot = null;
    this.voltmeterInitialPos = null;

    this.rheostatHandle = null;
    this.rheostatInitialPos = null;
    // Rheostat rail limits along X: 0.67m (0.5 Ω) to 1.23m (20.0 Ω)
    this.RHEO_X_MIN = 0.67;
    this.RHEO_X_MAX = 1.23;

    this.switchLever = null;
    this.switchInitialRot = null;
    this.switchInitialPos = null;
    this.switchProgress = 0.0;

    // Resistor Thermal Heating & Joule's Law (H = I²Rt)
    this.resistorCoils = [];
    this.resistorTemp = 25.0; // Ambient 25 °C
    this.thermalBadge = null;
    this.thermalCanvas = null;
    this.thermalCtx = null;
    this.thermalTexture = null;
    this.lastDrawnTemp = -999;

    // Needle physics values (smoothed)
    this.displayedCurrent = 0.0;
    this.displayedVoltage = 0.0;
    this.needleDamping = 8.5; // Smooth physical response

    // Full scale ranges for analog meter scales
    this.AMMETER_FULL_SCALE = 0.60; // 0.60 A max scale
    this.VOLTMETER_FULL_SCALE = 6.00; // 6.00 V max scale
    this.NEEDLE_SWEEP_ANGLE_RAD = THREE.MathUtils.degToRad(-102.0); // Sweep clockwise

    this.initModelNodes();
    this.initThermalBadge();
    this.setupRheostatPointerInteraction();
  }

  /**
   * Traverse model and cache needle, slider, and resistor coil objects.
   */
  initModelNodes() {
    if (!this.modelLoader || !this.modelLoader.model) return;

    this.resistorCoils = [];

    this.modelLoader.model.traverse((node) => {
      if (node.isMesh) {
        const lowerName = node.name.toLowerCase();
        if (node.name === 'Ammeter Needle' || node.name === 'Ammeter_Needle' || lowerName === 'ammeter_needle') {
          this.ammeterNeedle = node;
          this.ammeterInitialRot = node.rotation.clone();
          this.ammeterInitialPos = node.position.clone();
        } else if (node.name === 'Ammeter Needle Pivot' || node.name === 'Ammeter_Needle_Pivot' || lowerName === 'ammeter_needle_pivot') {
          node.getWorldPosition(this.ammeterPivotPos);
        } else if (node.name === 'Voltmeter Needle' || node.name === 'Voltmeter_Needle' || lowerName === 'voltmeter_needle') {
          this.voltmeterNeedle = node;
          this.voltmeterInitialRot = node.rotation.clone();
          this.voltmeterInitialPos = node.position.clone();
        } else if (node.name === 'Voltmeter Needle Pivot' || node.name === 'Voltmeter_Needle_Pivot' || lowerName === 'voltmeter_needle_pivot') {
          node.getWorldPosition(this.voltmeterPivotPos);
        } else if (node.name === 'Rheostat Slider Handle' || node.name === 'Rheostat_Slider_Handle' || lowerName === 'rheostat_slider' || lowerName.includes('rheostat_slider')) {
          this.rheostatHandle = node;
          this.rheostatInitialPos = node.position.clone();
          if (node.position.x < 0.4) {
            this.RHEO_X_MIN = -0.05;
            this.RHEO_X_MAX = 0.15;
          }
        } else if (node.name === 'Open Switch Lever' || node.name === 'Open_Switch_Lever' || lowerName === 'plugkey_lever' || lowerName.includes('plugkey_lever')) {
          this.switchLever = node;
          this.switchInitialRot = node.rotation.clone();
          this.switchInitialPos = node.position.clone();
        } else if (lowerName.includes('resistor_coil') || node.name === 'Resistor_mandrel') {
          // Clone material so changing emissive heating doesn't taint shared materials
          if (node.material && !node.userData.isClonedForHeating) {
            node.material = node.material.clone();
            node.userData.isClonedForHeating = true;
          }
          this.resistorCoils.push(node);
        }
      }
    });
  }

  /**
   * Initializes floating 3D thermal temperature indicator badge above the resistor.
   */
  initThermalBadge() {
    if (typeof document === 'undefined') return;

    this.thermalCanvas = document.createElement('canvas');
    this.thermalCanvas.width = 300;
    this.thermalCanvas.height = 70;
    this.thermalCtx = this.thermalCanvas.getContext('2d');

    this.thermalTexture = new THREE.CanvasTexture(this.thermalCanvas);
    this.thermalTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.thermalTexture,
      transparent: true,
      depthTest: true
    });

    this.thermalBadge = new THREE.Sprite(spriteMat);
    this.thermalBadge.scale.set(0.18, 0.042, 1.0);
    // Position directly above Resistor board (x=0.10, y=0.88, z=0.16)
    this.thermalBadge.position.set(0.10, 0.885, 0.16);
    this.thermalBadge.visible = false;
    this.scene.add(this.thermalBadge);

    this.updateThermalBadgeCanvas(25.0, false);
  }

  /**
   * Render dynamic 2D canvas texture for the 3D thermal badge.
   */
  updateThermalBadgeCanvas(tempC, isHot) {
    if (!this.thermalCtx) return;
    const ctx = this.thermalCtx;
    ctx.clearRect(0, 0, 300, 70);

    const isWarm = tempC >= 45.0;
    const isBlazing = tempC >= 85.0;

    // Background pill container
    ctx.fillStyle = isBlazing
      ? 'rgba(69, 10, 10, 0.92)'
      : isWarm
        ? 'rgba(67, 20, 7, 0.90)'
        : 'rgba(8, 20, 36, 0.85)';
    ctx.strokeStyle = isBlazing ? '#f87171' : (isWarm ? '#fb923c' : '#38bdf8');
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(6, 6, 288, 58, 14) : ctx.fillRect(6, 6, 288, 58);
    ctx.fill();
    ctx.stroke();

    // Temperature text & Joule Law status
    const tempStr = `${tempC.toFixed(1)} °C`;
    const labelStr = isBlazing ? '🔥 H = I²Rt (HOT)' : (isWarm ? '⚡ Heating...' : '❄️ 25 °C Normal');

    ctx.fillStyle = isBlazing ? '#fef08a' : (isWarm ? '#fdba74' : '#ffffff');
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(tempStr, 22, 42);

    ctx.fillStyle = isBlazing ? '#fca5a5' : (isWarm ? '#fed7aa' : '#94a3b8');
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(labelStr, 280, 42);

    if (this.thermalTexture) {
      this.thermalTexture.needsUpdate = true;
    }
  }

  /**
   * Setup optional 3D dragging on the rheostat slider handle directly in the viewport.
   */
  setupRheostatPointerInteraction() {
    if (!this.canvas) return;

    let isDraggingRheo = false;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let dragStartX = 0;
    let dragStartR = 12.0;

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !this.rheostatHandle || !this.camera) return;

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);

      const hits = raycaster.intersectObject(this.rheostatHandle, true);
      if (hits.length > 0) {
        isDraggingRheo = true;
        dragStartX = e.clientX;
        dragStartR = this.simulation ? this.simulation.rheostatResistance : 12.0;
        this.canvas.style.cursor = 'ew-resize';
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDraggingRheo || !this.simulation) return;

      const deltaPixelX = e.clientX - dragStartX;
      const resistanceRange =
        this.simulation.config.rheostatMaximumResistance -
        this.simulation.config.rheostatMinimumResistance;
      const sensitivity = 0.05;

      const newR = THREE.MathUtils.clamp(
        dragStartR + deltaPixelX * sensitivity,
        this.simulation.config.rheostatMinimumResistance,
        this.simulation.config.rheostatMaximumResistance
      );

      this.simulation.setRheostatResistance(newR);
    });

    window.addEventListener('pointerup', () => {
      if (isDraggingRheo) {
        isDraggingRheo = false;
        if (this.canvas) this.canvas.style.cursor = 'default';
      }
    });
  }

  /**
   * Synchronize physical needle rotations, rheostat handle, and resistor heating.
   */
  update(delta = 0.016) {
    if (!this.simulation) return;

    const state = this.simulation.getState();
    const targetI = state.keyClosed ? (state.current || 0.0) : 0.0;
    const targetV = state.keyClosed ? (state.voltage || 0.0) : 0.0;

    // 1. Smooth needle transitions
    this.displayedCurrent = THREE.MathUtils.lerp(
      this.displayedCurrent,
      targetI,
      Math.min(delta * this.needleDamping, 1.0)
    );
    this.displayedVoltage = THREE.MathUtils.lerp(
      this.displayedVoltage,
      targetV,
      Math.min(delta * this.needleDamping, 1.0)
    );

    // 2. Animate Ammeter Needle Deflection
    if (this.ammeterNeedle && this.ammeterInitialRot) {
      const fracI = THREE.MathUtils.clamp(this.displayedCurrent / this.AMMETER_FULL_SCALE, 0, 1.15);
      const deflectionAngle = fracI * this.NEEDLE_SWEEP_ANGLE_RAD;
      this.ammeterNeedle.rotation.z = this.ammeterInitialRot.z + deflectionAngle;
    }

    // 3. Animate Voltmeter Needle Deflection
    if (this.voltmeterNeedle && this.voltmeterInitialRot) {
      const fracV = THREE.MathUtils.clamp(this.displayedVoltage / this.VOLTMETER_FULL_SCALE, 0, 1.15);
      const deflectionAngle = fracV * this.NEEDLE_SWEEP_ANGLE_RAD;
      this.voltmeterNeedle.rotation.z = this.voltmeterInitialRot.z + deflectionAngle;
    }

    // 4. Animate Rheostat 3D Slider Handle along X Rail
    if (this.rheostatHandle && this.rheostatInitialPos) {
      const rMin = this.simulation.config.rheostatMinimumResistance;
      const rMax = this.simulation.config.rheostatMaximumResistance;
      const fracR = THREE.MathUtils.clamp((state.rheostatResistance - rMin) / (rMax - rMin), 0, 1);
      const targetX = this.RHEO_X_MIN + fracR * (this.RHEO_X_MAX - this.RHEO_X_MIN);

      this.rheostatHandle.position.x = THREE.MathUtils.lerp(
        this.rheostatHandle.position.x,
        targetX,
        Math.min(delta * 14.0, 1.0)
      );
    }

    // 5. Animate Physical Switch Lever Articulation
    if (this.switchLever && this.switchInitialRot) {
      const targetProgress = state.keyClosed ? 1.0 : 0.0;
      this.switchProgress = THREE.MathUtils.lerp(
        this.switchProgress,
        targetProgress,
        Math.min(delta * 12.0, 1.0)
      );

      const closeAngle = THREE.MathUtils.degToRad(-38.0 * this.switchProgress);
      this.switchLever.rotation.x = this.switchInitialRot.x + closeAngle;
      this.switchLever.position.y = this.switchInitialPos.y - 0.02 * this.switchProgress;
    }

    // 6. 🔥 Dynamic Resistor Thermal Heating & Joule Glow (H = I²Rt)
    const isCurrentActive = state.keyClosed && state.current > 0.01;
    const powerWatts = isCurrentActive ? Math.pow(state.current, 2) * (state.circuitResistance || 10.0) : 0;
    // Equilibrium target temperature based on power dissipation: 25 °C ambient up to ~115 °C at max current
    const targetTemp = isCurrentActive ? (25.0 + powerWatts * 13.5) : 25.0;
    const tempLerpSpeed = isCurrentActive ? 0.85 : 0.45;
    this.resistorTemp = THREE.MathUtils.lerp(this.resistorTemp, targetTemp, Math.min(delta * tempLerpSpeed, 1.0));

    // Update floating thermal badge
    if (this.thermalBadge) {
      this.thermalBadge.visible = isCurrentActive || this.resistorTemp > 26.5;
      if (Math.abs(this.resistorTemp - this.lastDrawnTemp) > 0.4) {
        this.updateThermalBadgeCanvas(this.resistorTemp, this.resistorTemp >= 80.0);
        this.lastDrawnTemp = this.resistorTemp;
      }
    }

    // Apply glowing thermal emissive colors to the physical resistor coils
    if (this.resistorCoils.length > 0) {
      const heatFrac = THREE.MathUtils.clamp((this.resistorTemp - 32.0) / 70.0, 0, 1.0);
      let glowHex = 0x000000;
      let glowIntensity = 0.0;

      if (heatFrac > 0.01) {
        if (heatFrac < 0.35) {
          glowHex = 0x7f1d1d; // Dark burgundy red
          glowIntensity = heatFrac * 1.5;
        } else if (heatFrac < 0.70) {
          glowHex = 0xdc2626; // Glowing crimson red
          glowIntensity = 0.5 + (heatFrac - 0.35) * 2.2;
        } else {
          glowHex = 0xf59e0b; // Incandescent fiery orange-gold
          glowIntensity = 1.3 + (heatFrac - 0.70) * 2.5;
        }
      }

      this.resistorCoils.forEach((coil) => {
        if (coil.material && coil.material.emissive) {
          coil.material.emissive.setHex(glowHex);
          coil.material.emissiveIntensity = glowIntensity;
        }
      });
    }
  }
}
