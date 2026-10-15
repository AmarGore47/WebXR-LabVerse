# WebXR LabVerse — Physics Virtual Practical Lab (Ohm's Law)

An immersive, standards-aligned **WebXR Virtual Physics Laboratory** for conducting Ohm's Law electrical experiments with real-time physics simulation, full WebXR Hand Tracking (no controllers required), and an interactive 3D laboratory environment.

---

## ⚡ Features

- **WebXR Hand Tracking (Controller-Free):**
  - Natural wrist-origin laser pointing with palm midline alignment and vertical pitch bias.
  - Responsive tracking with anti-slip lock during pinch interactions.
  - Multi-hand aggregated raycasting without cross-hand hover conflicts.
- **Interactive Circuit Simulation:**
  - Dynamic DC circuit engine with real-time Ohm's Law calculation ($V = I \cdot R$).
  - Rheostat slider resistance adjustment, key switch toggle, and realistic ammeter / voltmeter needle physics with overshoot and damping.
  - Interactive terminal wire connections with live polarity safety checks and undo/disconnection support.
- **Guided Practical Mode & 3D Connection Orientation:**
  - Alternating terminal blinking sequence showing source $\rightarrow$ target paths.
  - Arched 3D holographic energy curve with 4 streaming photon energy beads.
  - Floating 3D billboard pins (`[ 📍 START ]` & `[ 🎯 CONNECT TO ]`) that face the VR camera.
  - 6-step guided practical workflow with live observation recording, V-I table logging, and dynamic graph plotting.
- **Audio & Narration System:**
  - Text-to-speech voice guidance with step-by-step instructions and safety prompts.
- **Multi-Device Support:**
  - Meta Quest 2 / 3 / Pro (Immersive WebXR).
  - Desktop & Laptop Fallback Mode (OrbitControls with mouse & keyboard).

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/AmarGore47/WebXR-LabVerse.git
cd WebXR-LabVerse

# Install dependencies
npm install
```

### Running Locally
```bash
# Start Vite development server with HTTPS (required for WebXR)
npm run dev
```

### Building for Production
```bash
npm run build
```

---

## 🧪 Testing
Run the automated test suites:
```bash
node "all codes/test_circuit_part2.js"
node "all codes/test_experiment_part3.js"
node "all codes/test_xr_part4.js"
node "all codes/test_hud_part5.js"
node "all codes/test_guidance_part6.js"
```

---

## 🛠️ Tech Stack
- **Three.js** — 3D rendering & WebXR session management
- **Vite** — Lightning-fast build tool and dev server with HTTPS support
- **WebXR Hand Tracking API** — Gesture-driven interaction without physical controllers
- **Vanilla CSS & Canvas 2D** — High-performance HUD & 3D texture panels
