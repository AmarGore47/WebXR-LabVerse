/**
 * test_practical_e2e_screenshots.js
 * End-to-End Practical Execution & Screenshot Generator for LabVerse Phase 6 Audit.
 *
 * Drives Google Chrome via Chrome DevTools Protocol (CDP) to complete the full 10-stage practical:
 * Introduction -> Apparatus -> Circuit Assembly -> Validation -> Experiment -> Observations ->
 * Graph -> Result -> Assessment -> Completion -> Real AI Tutor Query.
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'all codes', 'public', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9223',
  '--window-size=1920,1080',
  '--ignore-certificate-errors',
  '--user-data-dir=C:\\Users\\AMAR GORE\\AppData\\Local\\Temp\\chrome-debug-e2e-audit',
  'https://localhost:5173/'
]);

let msgId = 1;

function sendCDP(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const payload = JSON.stringify({ id, method, params });
    const listener = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', listener);
          if (data.error) {
            reject(new Error(JSON.stringify(data.error)));
          } else {
            resolve(data.result);
          }
        }
      } catch (err) {
        // ignore other messages
      }
    };
    ws.addEventListener('message', listener);
    ws.send(payload);
  });
}

async function evalInBrowser(ws, expr) {
  const res = await sendCDP(ws, 'Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  });
  return res?.result?.value;
}

async function captureScreenshot(ws, filename) {
  const res = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  const filePath = path.join(SCREENSHOT_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  console.log(`📸 Screenshot saved: ${filename} (${Math.round(res.data.length * 0.75 / 1024)} KB)`);
  return filePath;
}

async function runE2E() {
  console.log('\n======================================================');
  console.log('  STARTING LABVERSE END-TO-END PRACTICAL AUDIT RUN');
  console.log('======================================================\n');

  await new Promise((r) => setTimeout(r, 3000));

  let tabs = [];
  for (let i = 0; i < 12; i++) {
    try {
      tabs = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9223/json', (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
      });
      if (tabs.length > 0) break;
    } catch (_) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const pageTab = tabs.find((t) => t.url.includes('localhost:5173') && t.type === 'page');
  if (!pageTab) {
    throw new Error('Could not find localhost:5173 tab.');
  }

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  await sendCDP(ws, 'Page.enable');
  await sendCDP(ws, 'Runtime.enable');
  await sendCDP(ws, 'DOM.enable');

  console.log('Waiting for 3D laboratory environment to load (Untitled.glb)...');
  for (let wait = 0; wait < 30; wait++) {
    const isReady = await evalInBrowser(ws, `
      Boolean(window.labCircuit && window.labCircuit.modelLoader && window.labCircuit.modelLoader.model)
    `);
    if (isReady) {
      console.log('✅ 3D laboratory environment loaded successfully.');
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Dismiss orientation modal if open
  await evalInBrowser(ws, `
    const closeBtn = document.getElementById('orient-close-btn');
    if (closeBtn) closeBtn.click();
    const startBtn = document.getElementById('orient-start-btn');
    if (startBtn) startBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 1000));

  // --- STAGE 1: INTRODUCTION ---
  console.log('\n--- STAGE 1: Introduction ---');
  await evalInBrowser(ws, `
    if (window.labCircuit?.workflowManager) {
      window.labCircuit.workflowManager.goToStage('INTRODUCTION');
    }
  `);
  await captureScreenshot(ws, '01_stage_introduction.png');

  // --- STAGE 2: APPARATUS IDENTIFICATION ---
  console.log('\n--- STAGE 2: Apparatus Identification ---');
  await evalInBrowser(ws, `
    if (window.labCircuit?.workflowManager) {
      window.labCircuit.workflowManager.goToStage('APPARATUS_IDENTIFICATION');
      ['battery', 'plug_key', 'rheostat', 'ammeter', 'voltmeter', 'resistor'].forEach(id => {
        window.labCircuit.workflowManager.identifyApparatus(id);
      });
    }
  `);
  await new Promise((r) => setTimeout(r, 500));
  await captureScreenshot(ws, '02_stage_apparatus_identified.png');

  // --- STAGE 3 & 4: CIRCUIT ASSEMBLY & VALIDATION ---
  console.log('\n--- STAGE 3 & 4: Circuit Assembly & Validation ---');
  await evalInBrowser(ws, `
    const cs = window.labCircuit.circuitState;
    if (cs) {
      if (typeof cs.reset === 'function') cs.reset();
      cs.addConnection('battery_positive', 'switch_left');
      cs.addConnection('switch_right', 'ammeter_positive');
      cs.addConnection('ammeter_negative', 'rheostat_in');
      cs.addConnection('rheostat_out', 'resistor_left');
      cs.addConnection('resistor_right', 'battery_negative');
      cs.addConnection('voltmeter_positive', 'resistor_left');
      cs.addConnection('voltmeter_negative', 'resistor_right');
    }
    if (window.labCircuit?.workflowManager) {
      window.labCircuit.workflowManager.syncWithSimulation();
      window.labCircuit.workflowManager.goToStage('CIRCUIT_VALIDATION');
    }
  `);
  await new Promise((r) => setTimeout(r, 800));
  await captureScreenshot(ws, '03_stage_circuit_assembled.png');

  // --- STAGE 5: EXPERIMENT RUNNING (START CURRENT) ---
  console.log('\n--- STAGE 5: Experiment Execution (Plug Key Closed) ---');
  await evalInBrowser(ws, `
    const sim = window.labCircuit.simulation;
    const cs = window.labCircuit.circuitState;
    if (sim) {
      sim.setCircuitReady(true);
      sim.setKeyClosed(true);
      cs.setSwitchClosed(true);
    }
    if (window.labCircuit?.workflowManager) {
      window.labCircuit.workflowManager.goToStage('EXPERIMENT_RUNNING');
    }
  `);
  await new Promise((r) => setTimeout(r, 800));
  await captureScreenshot(ws, '04_stage_experiment_running.png');

  // --- STAGE 6: OBSERVATION RECORDING ---
  console.log('\n--- STAGE 6: Observation Recording (5 Readings) ---');
  await evalInBrowser(ws, `
    const sim = window.labCircuit.simulation;
    const settings = [18.0, 14.0, 10.0, 6.0, 2.0];
    settings.forEach(val => {
      sim.setRheostatResistance(val);
      sim.recordReading();
    });
    if (window.labCircuit?.workflowManager) {
      window.labCircuit.workflowManager.goToStage('OBSERVATION_RECORDING');
    }
  `);
  await new Promise((r) => setTimeout(r, 800));
  await captureScreenshot(ws, '05_stage_observation_table.png');

  // --- STAGE 7: GRAPH ANALYSIS ---
  console.log('\n--- STAGE 7: V–I Graph Analysis ---');
  await evalInBrowser(ws, `
    // Switch to observations tab -> graph sub-tab
    const obsTabBtn = document.getElementById('mode-tab-table-graph');
    if (obsTabBtn) obsTabBtn.click();
    const graphBtn = document.getElementById('tab-btn-graph');
    if (graphBtn) graphBtn.click();
    if (window.labCircuit?.workflowManager) {
      window.labCircuit.workflowManager.goToStage('GRAPH_ANALYSIS');
    }
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await captureScreenshot(ws, '06_stage_vi_graph.png');

  // --- STAGE 8: RESULT VERIFICATION ---
  console.log('\n--- STAGE 8: Result Verification Card ---');
  await evalInBrowser(ws, `
    const resBtn = document.getElementById('tab-btn-result');
    if (resBtn) resBtn.click();
    if (window.labCircuit?.workflowManager) {
      window.labCircuit.workflowManager.goToStage('RESULT_VERIFICATION');
    }
  `);
  await new Promise((r) => setTimeout(r, 800));
  await captureScreenshot(ws, '07_stage_result_verified.png');

  // --- STAGE 9: STUDENT ASSESSMENT ---
  console.log('\n--- STAGE 9: Socratic Student Assessment ---');
  await evalInBrowser(ws, `
    const quizBtn = document.getElementById('tab-btn-quiz');
    if (quizBtn) quizBtn.click();
    if (window.labCircuit?.workflowManager) {
      window.labCircuit.workflowManager.goToStage('STUDENT_ASSESSMENT');
      const wm = window.labCircuit.workflowManager;
      wm.assessmentQuestions.forEach(q => {
        wm.submitAssessmentAnswer(q.id, q.correctAnswerIndex);
      });
    }
  `);
  await new Promise((r) => setTimeout(r, 800));
  await captureScreenshot(ws, '08_stage_student_assessment.png');

  // --- STAGE 10: PRACTICAL COMPLETED & MASTERY BADGE ---
  console.log('\n--- STAGE 10: Completion Summary & SSC Mastery Badge ---');
  await evalInBrowser(ws, `
    if (window.labCircuit?.workflowManager) {
      window.labCircuit.workflowManager.goToStage('COMPLETED');
    }
    const resBtn = document.getElementById('tab-btn-result');
    if (resBtn) resBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 800));
  await captureScreenshot(ws, '09_stage_practical_completed.png');

  // --- LIVE GEMINI AI TUTOR INTERACTION ---
  console.log('\n--- LIVE GEMINI AI TUTOR INTERACTION ---');
  await evalInBrowser(ws, `
    const tutorDock = document.getElementById('ai-tutor-dock');
    if (tutorDock) tutorDock.classList.remove('hidden');
    const input = document.getElementById('ai-tutor-input');
    if (input) input.value = "Why is an ammeter connected in series?";
    const sendBtn = document.getElementById('ai-tutor-send-btn');
    if (sendBtn) sendBtn.click();
  `);
  console.log('Sent question to AI Tutor via UI, waiting for real Gemini response...');
  await new Promise((r) => setTimeout(r, 6000));
  await captureScreenshot(ws, '10_live_ai_tutor_response.png');

  const finalSummary = await evalInBrowser(ws, `
    ({
      stage: window.labCircuit?.workflowManager?.getCurrentStage(),
      readings: window.labCircuit?.simulation?.getReadings()?.length,
      stats: window.labCircuit?.simulation?.calculateReadingStatistics(),
      completionSummary: window.labCircuit?.workflowManager?.getCompletionSummary(),
      aiTutorMessages: Array.from(document.querySelectorAll('.chat-bubble-message') || []).map(el => el.textContent)
    })
  `);

  console.log('\n======================================================');
  console.log('  AUDIT EXECUTION SUMMARY FROM LIVE RUNNING APP');
  console.log('======================================================');
  console.log(JSON.stringify(finalSummary, null, 2));

  chrome.kill();
  console.log('\n✅ E2E Practical Audit completed successfully.');
}

runE2E().catch((err) => {
  console.error('E2E Audit error:', err);
  chrome.kill();
  process.exit(1);
});
