/**
 * measurementController.js
 * Controls physical 3D apparatus animations:
 * - Analog meter needle deflections (Ammeter & Voltmeter) with physical inertia
 * - Rheostat 3D slider handle translation along winding rail
 * - Physical plug key lever articulation
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

    // Needle physics values (smoothed)
    this.displayedCurrent = 0.0;
    this.displayedVoltage = 0.0;
    this.needleDamping = 8.5; // Smooth physical response

    // Full scale ranges for analog meter scales
    this.AMMETER_FULL_SCALE = 0.60; // 0.60 A max scale
    this.VOLTMETER_FULL_SCALE = 6.00; // 6.00 V max scale
    this.NEEDLE_SWEEP_ANGLE_RAD = THREE.MathUtils.degToRad(-102.0); // Sweep clockwise

    this.initModelNodes();
    this.setupRheostatPointerInteraction();
  }

  /**
   * Traverse model and cache needle and slider objects.
   */
  initModelNodes() {
    if (!this.modelLoader || !this.modelLoader.model) return;

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
        }
      }
    });
  }

  /**
   * Setup optional 3D dragging on the rheostat slider handle directly in the viewport.
   */
  setupRheostatPointerInteraction() {
    if (!this.canvas) return;

    let isDraggingRheo = false;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.48); // Table plane

    const getRaycast = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);
      return raycaster;
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !this.rheostatHandle) return;
      const ray = getRaycast(e);
      const hits = ray.intersectObject(this.rheostatHandle, true);
      if (hits.length > 0) {
        isDraggingRheo = true;
        this.canvas.setPointerCapture(e.pointerId);
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!isDraggingRheo) return;
      const ray = getRaycast(e);
      const intersection = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, intersection)) {
        // Map intersection.x to resistance
        const clampedX = THREE.MathUtils.clamp(intersection.x, this.RHEO_X_MIN, this.RHEO_X_MAX);
        const frac = (clampedX - this.RHEO_X_MIN) / (this.RHEO_X_MAX - this.RHEO_X_MIN);
        const newR = this.simulation.config.rheostatMinimumResistance +
          frac * (this.simulation.config.rheostatMaximumResistance - this.simulation.config.rheostatMinimumResistance);
        this.simulation.setRheostatResistance(newR);
      }
    });

    const endDrag = (e) => {
      if (isDraggingRheo) {
        isDraggingRheo = false;
        try {
          this.canvas.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    };

    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);
  }

  /**
   * Update all 3D physics animations in the main render loop.
   */
  update(delta) {
    if (!this.ammeterNeedle && this.modelLoader && this.modelLoader.model) {
      this.initModelNodes();
    }

    const state = this.simulation.getState();

    // 1. Smoothly interpolate displayed values towards targets
    const targetI = state.current;
    const targetV = state.resistorVoltage;

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

      // Rotate around Z axis of initial orientation
      this.ammeterNeedle.rotation.z = this.ammeterInitialRot.z + deflectionAngle;
    }

    // 3. Animate Voltmeter Needle Deflection
    if (this.voltmeterNeedle && this.voltmeterInitialRot) {
      const fracV = THREE.MathUtils.clamp(this.displayedVoltage / this.VOLTMETER_FULL_SCALE, 0, 1.15);
      const deflectionAngle = fracV * this.NEEDLE_SWEEP_ANGLE_RAD;

      // Rotate around Z axis of initial orientation
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
  }
}
