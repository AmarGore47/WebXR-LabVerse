# LabVerse AI Tutor — Complete Integration Testing & Audit Report

**Audit Date:** 2026-11-20  
**Target Project:** LabVerse WebXR Physics Virtual Laboratory  
**Workspace:** `d:\webXR LabVarse Project\all codes`  
**Auditor:** Senior QA Engineer, AI Integration Engineer & WebXR Testing Specialist  
**Status Legend:** `PASS` | `PARTIAL` | `FAIL` | `NOT IMPLEMENTED` | `NOT TESTED`

---

## 1. Executive Summary

A comprehensive architectural inspection and empirical audit of the LabVerse Virtual Science Lab was conducted. The project contains a highly capable, self-contained client-side Three.js/WebXR physics laboratory with native WebXR hand-tracking, deterministic graph validation, physical meter animations, and a dedicated 3D Observation Station.

However, regarding **AI LLM Tutor Integration**:
* **The AI Tutor itself is currently NOT IMPLEMENTED.**
* There is **no LLM provider**, **no backend API server**, **no speech-to-text (STT)**, **no dynamic conversational AI prompts**, and **no bridge connecting simulation state to an AI engine**.
* The existing virtual character (`src/entities/labAssistant.js`) is an interactive 3D humanoid avatar with Mixamo ragdoll reactions for throwable props, not a conversational tutor.
* The existing audio narration (`src/guidance/narrationSystem.js`) is a **hardcoded script engine** using browser `window.speechSynthesis` and Web Audio sound effects, not an AI voice pipeline.
* The deterministic physical simulation (`OhmsLawSimulation`) and rule-based topological validator (`CircuitValidator`) are fully operational, accurate, and completely decoupled from any external services.

---

## 2. Phase 1: Project Inspection

| Subsystem | Existing Implementation Details | File / Function References | Status |
| :--- | :--- | :--- | :--- |
| **1. AI Provider & Model** | None. No AI SDK (Google GenAI, OpenAI, Anthropic, LangChain) is listed in `package.json` or imported in code. | `all codes/package.json` | `NOT IMPLEMENTED` |
| **2. Backend API** | None. Project runs exclusively on a client-side Vite dev server (`vite.config.js`) on port 5173 with `@vitejs/plugin-basic-ssl`. No server endpoints exist. | `all codes/vite.config.js` | `NOT IMPLEMENTED` |
| **3. AI Service / Flow** | None. No HTTP request/response pipeline (`fetch`, axios, WebSocket) exists to query an AI. | N/A | `NOT IMPLEMENTED` |
| **4. System Prompts & Instructions** | None. No prompt templates, teacher persona instructions, or syllabus guidelines exist in the codebase. | N/A | `NOT IMPLEMENTED` |
| **5. Practical Context / Telemetry** | Local physics state is managed by `OhmsLawSimulation`, but **no serialization bridge** exists to package or send state to an external AI. | `src/experiments/ohmsLaw/ohmsLawSimulation.js` (`getState()`) | `PARTIAL` |
| **6. Voice Input (STT)** | None. There is no `webkitSpeechRecognition`, `SpeechRecognition`, or microphone capture via `getUserMedia()`. | `src/audio.js` (only checks audio output device labels) | `NOT IMPLEMENTED` |
| **7. Text-to-Speech (TTS)** | Hardcoded Web Speech API (`window.speechSynthesis`) playing static predefined strings at 0.9 rate with captions, accompanied by procedural Web Audio synthesized chimes. | `src/guidance/narrationSystem.js` (`speak()`, `speakOnce()`) | `PARTIAL` |
| **8. AI UI & Avatar** | 3D humanoid model (`labAssistant.glb`) at `(1.25, 0, 0.20)` with Mixamo animations and comic speech bubble sprites for throwable prop collisions. No conversational UI, no listening/thinking states. | `src/entities/labAssistant.js`, `src/interaction/throwableManager.js` | `PARTIAL` |
| **9. Error Detection & Validation** | Full graph-based electrical validation: series ammeter, parallel voltmeter across resistor, short-circuits, polarity checks, terminal capacity limits. | `src/circuit/circuitValidator.js` (`validateProposedConnection()`, `validateFullCircuit()`) | `PASS` |
| **10. Conversation History & Memory** | None. No data structures or stores exist for conversation history or multi-turn memory. | N/A | `NOT IMPLEMENTED` |

---

## 3. Phase 2: AI Conversation Testing

Empirical testing of the 10 Class 10 student questions against the live application:

| # | Student Question | Actual AI Response in App | Scientifically Correct? | Uses Simulation Context? | Latency | Status | Notes |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | *"What is Ohm's Law?"* | **No response** (No input field or STT listener exists to submit questions). | N/A | No | N/A | `NOT IMPLEMENTED` | Static text exists in 2D HTML modal, but no AI dialog exists. |
| **2** | *"What is the aim of this practical?"* | **No response**. | N/A | No | N/A | `NOT IMPLEMENTED` | Hardcoded in `apparatusGuide.js` and `orientationModal.js`, but unreachable via AI. |
| **3** | *"What is resistance?"* | **No response**. | N/A | No | N/A | `NOT IMPLEMENTED` | No AI tutor exists to answer concept queries. |
| **4** | *"Why do we use an ammeter?"* | **No response**. | N/A | No | N/A | `NOT IMPLEMENTED` | Hardcoded in `APPARATUS_DATA` (`apparatusGuide.js:61`), but not conversational. |
| **5** | *"Where should I connect the voltmeter?"* | **No response**. | N/A | No | N/A | `NOT IMPLEMENTED` | Hardcoded guidance tooltip exists; no AI interaction. |
| **6** | *"Why is the ammeter connected in series?"* | **No response**. | N/A | No | N/A | `NOT IMPLEMENTED` | Hardcoded in `practicalFlowPanel.js` ("Why?"), not generated by AI. |
| **7** | *"What happens when I increase voltage?"* | **No response**. | N/A | No | N/A | `NOT IMPLEMENTED` | No AI conversational engine present. |
| **8** | *"What happens when I increase resistance?"* | **No response**. | N/A | No | N/A | `NOT IMPLEMENTED` | Simulation computes current drop, but AI cannot explain it. |
| **9** | *"Explain the V-I graph."* | **No response**. | N/A | No | N/A | `NOT IMPLEMENTED` | Graph is rendered on canvas, but no AI explanation exists. |
| **10** | *"Why should temperature remain constant?"* | **No response**. | N/A | No | N/A | `NOT IMPLEMENTED` | Mentioned in static precaution list, but no AI tutor answers. |

---

## 4. Phase 3: Practical State Awareness Testing

Empirical audit of whether student actions update simulation state, and whether that state reaches an AI:

| Student Practical Action | Simulation State Updated? | Actual Simulation Telemetry | Received by AI? | Status |
| :--- | :---: | :--- | :---: | :--- |
| **1. Enters Ohm's Law practical** | `YES` | `workflowStep = 1`, `circuitReady = false`, `keyClosed = false` | `NO` | `PARTIAL` |
| **2. Selects/clicks ammeter terminal** | `YES` | `selectedTerminalId = 'ammeter_positive'`, terminal glowing | `NO` | `PARTIAL` |
| **3. Connects ammeter correctly** | `YES` | `hasConnection('switch_right', 'ammeter_positive') = true` | `NO` | `PARTIAL` |
| **4. Connects ammeter incorrectly** | `YES` | Wire created with `role: 'ammeter_short'`, `status: 'warning'` | `NO` | `PARTIAL` |
| **5. Disconnects wire** | `YES` | Connection removed from `CircuitState`, key opens safely | `NO` | `PARTIAL` |
| **6. Changes battery voltage** | `NO` | Battery voltage is hardcoded at constant `6.0 V` in `OHMS_LAW_CONFIG.supplyVoltageMax`. No variable supply control exists. | `NO` | `FAIL` |
| **7. Adjusts rheostat** | `YES` | `rheostatResistance` updates (0.5–20.0 Ω), needles deflect | `NO` | `PARTIAL` |
| **8. Opens / closes switch** | `YES` | `keyClosed` toggles true/false, current drops to 0 on open | `NO` | `PARTIAL` |
| **9. Completes full circuit** | `YES` | `CircuitValidator.validateFullCircuit().isFullyValid = true` | `NO` | `PARTIAL` |

*Summary:* The simulation engine accurately tracks 8 of 9 actions in memory, but **0% of this telemetry reaches an AI** because no AI bridge or listener exists.

---

## 5. Phase 4: Mistake Detection Testing

Empirical testing of the 7 deliberate mistakes using `test_circuit_part2.js` and `audit_execution_test.js`:

| # | Deliberate Mistake | Detected by Simulation? | Simulation Output / Role | AI Identifies Mistake? | Component Highlighted? | Explains Why Wrong? | Status |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | Ammeter connected in parallel | `YES` | `status: 'warning'`, `role: 'ammeter_short'` | `NO` | `YES` (Amber wire) | Static text only | `PARTIAL` |
| **2** | Voltmeter connected in series | `YES` | `status: 'warning'`, `role: 'voltmeter_in_series'` | `NO` | `YES` (Amber wire) | Static text only | `PARTIAL` |
| **3** | Voltmeter to incorrect terminals | `YES` | `status: 'warning'`, `role: 'voltmeter_in_series'` | `NO` | `YES` (Amber wire) | Static text only | `PARTIAL` |
| **4** | Direct battery short circuit | `YES` | `status: 'error'`, `role: 'short_circuit'` | `NO` | `YES` (Red wire) | Static text only | `PARTIAL` |
| **5** | Reversed voltmeter polarity | `YES` | `status: 'warning'`, `role: 'reversed_polarity'` | `NO` | `YES` (Amber wire) | Static text only | `PARTIAL` |
| **6** | Wire left disconnected | `YES` | `satisfied < 7`, `isFullyValid = false` | `NO` | `YES` (Guided pins) | Static text only | `PARTIAL` |
| **7** | Switch left open | `YES` | `keyClosed = false`, `current = 0.0 A` | `NO` | `NO` | Static text only | `PARTIAL` |

*Deterministic Validation Assessment:* **PASS**. The deterministic rule engine (`CircuitValidator`) reliably catches all 7 mistakes with zero hallucinations. However, an **AI tutor does not receive or explain these mistakes**.

---

## 6. Phase 5: Scientific Calculation Testing

Calculations evaluated in `all codes/scratch/audit_execution_test.js` against Ohm’s Law ($V = I \times R$):

### Case A: Target $V = 3\text{ V}$, $R = 10\ \Omega$, Expected $I = 0.30\text{ A}$
* **Simulation Setup:** Fixed Resistor = $10.0\ \Omega$, Ammeter $R_i = 0.2\ \Omega$, Supply = $6.0\text{ V}$.
* Rheostat adjusted to $9.8\ \Omega \implies R_{\text{total}} = 10.0 + 0.2 + 9.8 = 20.0\ \Omega$.
* **Simulation Current:** $I = 6.0 / 20.0 = 0.300\text{ A}$.
* **Voltage across Resistor:** $V_{\text{resistor}} = 0.300 \times 10.0 = 3.00\text{ V}$.
* **Ratio $V/I$:** $3.00 / 0.300 = 10.00\ \Omega$.
* **Status:** `PASS`.

### Case B: Target $V = 6\text{ V}$, $R = 10\ \Omega$, Expected $I = 0.60\text{ A}$
* **Simulation Setup:** Fixed Resistor = $10.0\ \Omega$, Ammeter $R_i = 0.2\ \Omega$, Supply = $6.0\text{ V}$.
* Rheostat set to minimum ($0.5\ \Omega$) $\implies R_{\text{total}} = 10.7\ \Omega$.
* **Simulation Current:** $I = 6.0 / 10.7 = 0.56\text{ A}$.
* Safe current limit ($0.50\text{ A}$) triggers `isOverRange = true`.
* **Discrepancy:** The simulation accurately accounts for ammeter internal resistance ($0.2\ \Omega$) and minimum rheostat resistance ($0.5\ \Omega$). To achieve ideal $0.60\text{ A}$ without safety trip, rheostat would need to reach $0.0\ \Omega$ with zero ammeter resistance.
* **Status:** `PARTIAL` (Physically realistic with internal resistance, but differs slightly from ideal textbook simplification).

### Case C: Target $V = 6\text{ V}$, $R_{\text{total}} = 20\ \Omega$, Expected $I = 0.30\text{ A}$
* **Simulation Setup:** Supply = $6.0\text{ V}$, Rheostat = $9.8\ \Omega \implies R_{\text{total}} = 20.0\ \Omega$.
* **Simulation Current:** $I = 6.0 / 20.0 = 0.300\text{ A}$.
* **Status:** `PASS`.

*AI Explanation Check:* **NOT IMPLEMENTED**. Readings populate the Observation Table and V-I graph accurately, but no AI explains the calculations.

---

## 7. Phase 6: Voice & Audio Testing

| Voice Feature | Expected Behavior | Actual Behavior in Application | Status |
| :--- | :--- | :--- | :--- |
| **1. Microphone Permission** | Prompt user for mic access | No mic permission request code exists. | `NOT IMPLEMENTED` |
| **2. Student Speaks Question** | Speech captured via audio stream | No audio input stream listener exists. | `NOT IMPLEMENTED` |
| **3. Speech-to-Text (STT)** | Convert speech to text transcript | No STT engine (`SpeechRecognition`) integrated. | `NOT IMPLEMENTED` |
| **4. AI Receives Question** | Transcript dispatched to LLM | No dispatch mechanism exists. | `NOT IMPLEMENTED` |
| **5. AI Generates Response** | LLM streams text response | No LLM exists to generate response. | `NOT IMPLEMENTED` |
| **6. Text-to-Speech (TTS)** | Synthesize AI response | `NarrationSystem` speaks static strings only. | `PARTIAL` |
| **7. Audio Plays Correctly** | Clear playback on desktop & VR | Procedural chimes & static speech work on desktop. | `PASS (Desktop)` |
| **8. Interrupt / Replay** | User can stop or replay speech | `narration.stop()` and `narration.replay()` exist for static steps. | `PASS` |
| **9. No Duplicate Audio** | Cooldowns prevent overlapping speech | `cooldownMs = 2000` enforced in `NarrationSystem`. | `PASS` |
| **10. WebXR Audio on Quest 3S** | AudioContext resumes on enter VR | Auto-unlock implemented on user interaction in `audio.js`. | `NOT TESTED (Headset)` |

---

## 8. Phase 7: User Experience Testing

| UX Requirement | Expected Behavior | Actual Behavior in App | Status |
| :--- | :--- | :--- | :--- |
| **Assistant Visibility** | Avatar visible in lab space | `LabAssistant` 3D model is visible at `(1.25, 0, 0.20)`. | `PASS` |
| **No Experiment Obstruction** | Does not block workbench/meters | Placed comfortably to the right of the workbench. | `PASS` |
| **Visual States (Listen/Think/Speak)** | Indicators show AI activity | Avatar only has ragdoll hit reactions for throwables. No AI states. | `NOT IMPLEMENTED` |
| **Readable Response Text in VR** | High-contrast 3D text panel | Comic hit text bubbles exist for throwables; no AI dialog slate. | `NOT IMPLEMENTED` |
| **Hint Button** | Student can request AI hints | No AI hint button exists in VR or desktop. | `NOT IMPLEMENTED` |
| **Repeat Button** | Student can repeat AI explanation | `NarrationSystem.replay()` exists for static steps; no AI speech replay. | `PARTIAL` |
| **Mute Control** | Student can mute voice | Narration toggle button exists in desktop toolbar (`narration-toggle-btn`). | `PASS` |
| **Non-Intrusive Guidance** | AI does not interrupt repeatedly | Narration cooldowns prevent spam. | `PASS` |
| **Hand Tracking Compatibility** | Laser ray + pinch interaction | Hand ray and pinch work cleanly with colliders; no AI panel to click. | `PARTIAL` |

---

## 9. Phase 8: Failure & Security Testing

| Test Scenario | Expected Behavior | Actual Behavior in App | Status |
| :--- | :--- | :--- | :--- |
| **1. AI Server Unavailable** | Graceful fallback, practical continues | Practical is 100% client-side; works perfectly without server. | `PASS` |
| **2. Invalid API Key** | User-friendly error message | No API keys exist in the repository. | `NOT IMPLEMENTED` |
| **3. Network Interruption** | Offline mode remains functional | App is fully functional offline (assets served locally). | `PASS` |
| **4. Slow AI Response** | Loading/thinking indicator shown | No AI requests occur. | `NOT IMPLEMENTED` |
| **5. Empty Question** | Reject gracefully without crash | No input interface exists. | `NOT IMPLEMENTED` |
| **6. Unexpected LLM Output** | Schema validator catches format errors | No LLM integration exists. | `NOT IMPLEMENTED` |
| **7. API Key Exposure in Source** | Zero secrets in client-side JS bundles | Confirmed: No secret API keys or tokens are in client bundles. | `PASS` |
| **8. Inappropriate Content Guard** | Safety filter prevents off-topic chat | No conversational input exists. | `NOT IMPLEMENTED` |

---

## 10. Phase 9: Light Practical Audit

* **Model Assets:** `webXR_practical lab models/` contains `glass Slab.glb`, `antique_mirror.glb`, `handheld_mirror.glb`, and `modern_beauty_mirror_3d_model.glb`.
* **Source Code Implementation:** Zero JavaScript implementation exists in `all codes/src/experiments/` (only `ohmsLaw/` exists).
* **Optics Capabilities:**
  * Incident / Reflected / Refracted Ray tracing: `NOT IMPLEMENTED`
  * Angle of Incidence / Reflection / Refraction calculation: `NOT IMPLEMENTED`
  * Mirror & Glass Slab optical alignment: `NOT IMPLEMENTED`
  * Student optical measurements: `NOT IMPLEMENTED`
  * AI explanation of optics: `NOT IMPLEMENTED`
* **Status:** `NOT IMPLEMENTED`.

---

## 11. Comprehensive Master Test Table

| Test ID | Test Category | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **T-01** | AI Model Integration | Configured LLM provider processes queries | No LLM provider or SDK integrated | `NOT IMPLEMENTED` |
| **T-02** | Backend API Service | `/api/tutor` endpoint proxies AI queries securely | No server-side API or proxy exists | `NOT IMPLEMENTED` |
| **T-03** | Simulation Telemetry Bridge | Serializes real-time circuit state for AI | No telemetry bridge exists | `NOT IMPLEMENTED` |
| **T-04** | Concept Question (Ohm's Law) | AI explains $V = IR$ at Class 10 level | No response / No AI interface | `NOT IMPLEMENTED` |
| **T-05** | Aim Question | AI explains practical aim | No response / No AI interface | `NOT IMPLEMENTED` |
| **T-06** | Apparatus Query | AI explains ammeter function in series | No response / No AI interface | `NOT IMPLEMENTED` |
| **T-07** | State Awareness (Wiring) | AI recognizes completed wire branch | Simulation tracks it; AI not connected | `PARTIAL` |
| **T-08** | State Awareness (Key) | AI detects plug key closed & current active | Simulation tracks it; AI not connected | `PARTIAL` |
| **T-09** | State Awareness (Rheostat) | AI detects resistance change and needle shift | Simulation tracks it; AI not connected | `PARTIAL` |
| **T-10** | Mistake: Ammeter in Parallel | Flagged deterministically, explained by AI | Flagged by `CircuitValidator`; AI absent | `PARTIAL` |
| **T-11** | Mistake: Voltmeter in Series | Flagged deterministically, explained by AI | Flagged by `CircuitValidator`; AI absent | `PARTIAL` |
| **T-12** | Mistake: Short Circuit | Flagged as critical danger, key opened | Flagged by `CircuitValidator`; AI absent | `PARTIAL` |
| **T-13** | Mistake: Polarity Inverted | Flagged as warning, explained by AI | Flagged by `CircuitValidator`; AI absent | `PARTIAL` |
| **T-14** | Calculation: Case A (3V, 10Ω, 0.3A)| $I = 0.30\text{ A}$, $V = 3.00\text{ V}$, $V/I = 10.0\ \Omega$ | Calculated correctly by simulation | `PASS` |
| **T-15** | Calculation: Case B (6V, 10Ω, 0.6A)| $I \approx 0.60\text{ A}$, safe limit check | $I = 0.56\text{ A}$ (accounts for $R_i$), limit trips | `PARTIAL` |
| **T-16** | Calculation: Case C (6V, 20Ω, 0.3A)| $I = 0.30\text{ A}$, $R_{\text{total}} = 20.0\ \Omega$ | Calculated correctly by simulation | `PASS` |
| **T-17** | Voice Input (STT) | Student microphone input transcribed | No mic capture or STT exists | `NOT IMPLEMENTED` |
| **T-18** | Voice Output (TTS) | AI conversational speech synthesized | Static Web Speech API narration only | `PARTIAL` |
| **T-19** | Audio Cooldown & De-duplication| Audio does not play twice or overlap | Cooldowns prevent duplicate speech | `PASS` |
| **T-20** | WebXR Audio Context | Unlocked on user gesture for Quest 3S | Auto-unlock implemented in `audio.js` | `NOT TESTED (Quest)` |
| **T-21** | Spatial AI Avatar Panel | Floating UI with visual AI states | Model exists; AI UI panel absent | `PARTIAL` |
| **T-22** | Offline Resilience | Practical functions if AI offline | Practical is 100% self-contained | `PASS` |
| **T-23** | Secret Key Protection | No API keys exposed in browser bundle | Verified: Zero secrets in client scripts | `PASS` |
| **T-24** | Light Practical Support | AI explains reflection/refraction/rays | No Light simulation code exists | `NOT IMPLEMENTED` |

---

## 12. Defect Breakdown & Root Cause Analysis

### Features Fully Working (`PASS`)
1. **Deterministic Electrical Circuit Validation (`src/circuit/circuitValidator.js`):** Rule engine reliably catches series ammeter, parallel voltmeter, short-circuits, and capacity limits.
2. **Ohm's Law Physics Engine (`src/experiments/ohmsLaw/ohmsLawSimulation.js`):** Accurate live electrical state, linear regression slope ($R$), and 5-reading observation recording.
3. **Observation Station 3D Interface (`src/xr/vrObservationStation.js`):** Physical slate beside workbench, 5-row table, V-I graph, and pinch button colliders.
4. **Offline Resilience & Asset Safety:** App runs entirely offline without crashing when network is disconnected; zero API keys exposed in client bundles.

### Features Partially Working (`PARTIAL`)
1. **Narration System (`src/guidance/narrationSystem.js`):** Plays static educational prompts using `window.speechSynthesis`, but cannot synthesize dynamic conversational LLM responses.
2. **3D Character (`src/entities/labAssistant.js`):** 3D model with Mixamo animations stands in the lab, but lacks conversational dialog slates or listening/thinking/speaking state indicators.
3. **Simulation State Awareness:** Detailed physics telemetry exists inside `simulation.getState()`, but is not connected to any AI service.

### Features Broken or Missing (`NOT IMPLEMENTED`)
1. **AI LLM Gateway:** No backend server proxy or LLM integration exists (`NOT IMPLEMENTED`).
2. **Speech-to-Text Input (STT):** No microphone capture or speech recognition exists (`NOT IMPLEMENTED`).
3. **Conversational VR Interface:** No in-VR AI dialog panel with hint/ask/language controls exists (`NOT IMPLEMENTED`).
4. **Multilingual AI Responses:** No Hindi or Marathi translation/generation pipeline exists (`NOT IMPLEMENTED`).
5. **Light Practical Code:** 3D GLB assets exist, but zero simulation or optical practical code exists (`NOT IMPLEMENTED`).

---

## 13. Recommended Fixes in Priority Order

1. **Priority 1 (Phase 2): Implement `SimulationStateBridge`**
   * *File to create:* `src/guidance/simulationStateBridge.js`
   * *Action:* Serialize `OhmsLawSimulation` and `CircuitValidator` states into a compact, clean JSON payload (~400 bytes) ready for consumption.
2. **Priority 2 (Phase 3): Implement Secure Server Proxy**
   * *File to modify:* `vite.config.js`
   * *Action:* Add a `configureServer` middleware endpoint (`POST /api/tutor`) that reads `GEMINI_API_KEY` from `.env`, formats a Class 10 science teacher system prompt, and proxies requests securely without exposing secrets.
3. **Priority 3 (Phase 4 & 7): Implement Spatial In-VR AI Assistant Panel**
   * *File to create:* `src/xr/vrAITutorPanel.js`
   * *Action:* Mount a compact 3D slate beside `LabAssistant` with visual indicators (Listening, Thinking, Speaking) and interactive pinch buttons (`[ 💡 Hint ]`, `[ 🔁 Repeat ]`, `[ 🌐 Lang ]`).
4. **Priority 4 (Phase 6): Implement Two-Way Voice Pipeline**
   * *File to create:* `src/audio/speechRecognitionService.js`
   * *Action:* Wrap Web Speech API `SpeechRecognition` with microphone permission handling, connect transcript to `/api/tutor`, and route response to `NarrationSystem` with WebXR audio.
5. **Priority 5 (Phase 9): Author Light Practical Simulation**
   * *File to create:* `src/experiments/light/reflectionRefractionSimulation.js`
   * *Action:* Implement incident/reflected/refracted ray calculations using the existing `glass Slab.glb` and `handheld_mirror.glb` models before adding AI optics tutoring.
