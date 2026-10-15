/**
 * xrConfig.js
 * Centralized configuration, thresholds, and state constants for
 * WebXR Hand-Tracking Interaction in Maharashtra Std. 10 Physics Lab.
 * STRICT: Hand tracking only. No controllers, rays, or gamepad inputs.
 */

export const XR_CONFIG = {
  // 1. Pinch Detection & Hysteresis Thresholds
  // Start pinch when thumb tip and index tip are closer than 2.8 cm
  pinchStartDistance: 0.028, // meters (~2.8 cm for natural pinch)
  // Release pinch only when distance exceeds 4.0 cm (hysteresis prevents flicker)
  pinchEndDistance: 0.040, // meters (~4.0 cm)

  // 2. Interaction Proximity Radii (Direct Near-Hand Touch Zones)
  interactionMaxDistance: 2.0, // meters - safety cutoff
  terminalHoverRadius: 0.075, // meters (~7.5 cm reach)
  switchHoverRadius: 0.095, // meters (~9.5 cm reach)
  rheostatHoverRadius: 0.090, // meters (~9.0 cm reach)
  buttonHoverRadius: 0.080, // meters (~8.0 cm reach)

  // 3. Gesture Timing & Debounce
  pinchCooldownMs: 250, // ms between discrete pinch actions
  smoothingFactor: 0.28, // Exponential smoothing for joint positions (0 = no smoothing, 1 = freeze)

  // 4. Rheostat VR Drag Configuration
  rheostatDragTravelMeters: 0.18, // meters (18 cm hand movement maps to full 0.5 Ω - 20.0 Ω range)
  rheostatRailXMin: -0.06, // meters (model coordinates for Untitled.glb)
  rheostatRailXMax: 0.16, // meters (model coordinates for Untitled.glb)

  // 5. 3D Spatial VR Assistant Board Placement (Positioned above Secondary Table facing student as shown in Image 2)
  vrPanel: {
    position: { x: 1.15, y: 1.35, z: -0.35 },
    rotationY: -0.65, // Ergonomically angled towards the student in front of workbench
    width: 1.15, // meters (increased for high-visibility legibility in VR)
    height: 0.81, // meters
    canvasWidth: 1536, // crisp 1.5K texture resolution
    canvasHeight: 1080
  },

  // 6. Visual Colors & Feedback Tokens
  colors: {
    beaconIdle: 0x38bdf8, // Cyan glowing beacon
    beaconHover: 0x2dd4bf, // Aqua when hovering interactive target
    beaconPinched: 0xf59e0b, // Amber gold when pinching
    beaconConnecting: 0x22c55e, // Green on valid connection attempt
    beaconInvalid: 0xef4444 // Red on error/invalid
  },

  // 7. Headset Lifecycle & Feedback Messages
  messages: {
    checking: 'Checking VR support…',
    supported: 'Enter VR',
    unsupported: 'VR is not available in this browser. You can continue in laptop mode.',
    starting: 'VR started — hand tracking initializing…',
    handActive: 'Hand tracking active. Point with index finger and pinch thumb + index.',
    handMissing: 'VR is active, but hand tracking was not detected. Enable hand tracking in headset settings, then re-enter VR.',
    sessionEnded: 'Exited VR mode. Returning to laptop controls.'
  }
};
