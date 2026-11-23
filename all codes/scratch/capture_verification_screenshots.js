/**
 * capture_verification_screenshots.js
 * Generates the 6 visual verification screenshots requested by user via Chrome DevTools Protocol.
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'C:\\Users\\AMAR GORE\\.gemini\\antigravity\\brain\\d04c3251-565f-4362-a8f7-040cf9a61749\\screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--window-size=1920,1080',
  '--ignore-certificate-errors',
  '--user-data-dir=C:\\Users\\AMAR GORE\\AppData\\Local\\Temp\\chrome-debug-vis-verify',
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
      } catch (err) {}
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
  if (res?.exceptionDetails) {
    console.error('JS Exception in browser:', res.exceptionDetails.exception?.description || res.exceptionDetails.text);
  }
  return res?.result?.value;
}

async function captureScreenshot(ws, filename) {
  const res = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  const filePath = path.join(SCREENSHOT_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  console.log(`📸 Saved screenshot: ${filename} (${Math.round(res.data.length * 0.75 / 1024)} KB)`);
  return filePath;
}

async function run() {
  console.log('\n--- Connecting to Chrome CDP on port 9224 ---');
  await new Promise((r) => setTimeout(r, 3000));

  let tabs = [];
  for (let i = 0; i < 15; i++) {
    try {
      tabs = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9224/json', (res) => {
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

  console.log('Waiting for 3D laboratory environment to load...');
  for (let wait = 0; wait < 35; wait++) {
    const isReady = await evalInBrowser(ws, `
      Boolean(window.labCircuit && window.labCircuit.labAssistant && window.labCircuit.modelLoader && window.labCircuit.modelLoader.model)
    `);
    if (isReady) {
      console.log('✅ 3D laboratory and assistant loaded.');
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Dismiss modal if open & clean UI for capture
  await evalInBrowser(ws, `
    const closeBtn = document.getElementById('orient-close-btn');
    if (closeBtn) closeBtn.click();
    const startBtn = document.getElementById('orient-start-btn');
    if (startBtn) startBtn.click();
    const rightPanel = document.getElementById('right-panel');
    if (rightPanel) rightPanel.style.display = 'none';
  `);
  await new Promise((r) => setTimeout(r, 1200));

  // --- 1. Repositioned Assistant Beside Left Wall Display ---
  console.log('\n[1/7] Capturing: 3D Assistant Positioned Near Left Wall Beside Display...');
  await evalInBrowser(ws, `(() => {
    if (window.labCircuit.animateCameraTo) {
      window.labCircuit.animateCameraTo({ x: -0.6, y: 1.35, z: 1.75 }, { x: -2.05, y: 1.0, z: 0.75 });
    }
  })()`);
  await new Promise((r) => setTimeout(r, 1800));
  await captureScreenshot(ws, '01_character_original_position.png');

  // --- 2. Wall Display in Standby Mode ---
  console.log('\n[2/7] Capturing: Enlarged Wall Display in Standby Mode (Navy-Cyan)...');
  await evalInBrowser(ws, `(() => {
    const { labAssistant, animateCameraTo } = window.labCircuit;
    if (labAssistant && labAssistant.subpanels) {
      labAssistant.subpanels.openStandby();
    }
    if (animateCameraTo) {
      animateCameraTo({ x: -0.9, y: 1.52, z: 1.15 }, { x: -2.95, y: 1.52, z: 1.15 });
    }
  })()`);
  await new Promise((r) => setTimeout(r, 1800));
  await captureScreenshot(ws, '02_wall_display_standby.png');

  // --- 3. Wall Display Showing All 6 Options Grid ---
  console.log('\n[3/7] Capturing: Wall Display Showing All 6 Educational Options (3x2 Grid)...');
  await evalInBrowser(ws, `(() => {
    const { labAssistant, animateCameraTo } = window.labCircuit;
    if (labAssistant && labAssistant.subpanels) {
      labAssistant.subpanels.openMenu();
    }
    if (animateCameraTo) {
      animateCameraTo({ x: -0.9, y: 1.52, z: 1.15 }, { x: -2.95, y: 1.52, z: 1.15 });
    }
  })()`);
  await new Promise((r) => setTimeout(r, 1800));
  await captureScreenshot(ws, '03_wall_display_menu_six_options.png');

  // --- 4. Ask Anything Feature View ---
  console.log('\n[4/7] Capturing: Ask Anything Feature View on Wall Display...');
  await evalInBrowser(ws, `(() => {
    const { labAssistant, animateCameraTo } = window.labCircuit;
    if (labAssistant && labAssistant.subpanels) {
      labAssistant.subpanels.openView('ask_anything');
    }
    if (animateCameraTo) {
      animateCameraTo({ x: -0.9, y: 1.52, z: 1.15 }, { x: -2.95, y: 1.52, z: 1.15 });
    }
  })()`);
  await new Promise((r) => setTimeout(r, 1800));
  await captureScreenshot(ws, '04_feature_ask_anything.png');

  // --- 5. Video Feature View ---
  console.log('\n[5/7] Capturing: Practical Video Feature View on Wall Display...');
  await evalInBrowser(ws, `(() => {
    const { labAssistant, animateCameraTo } = window.labCircuit;
    if (labAssistant && labAssistant.subpanels) {
      labAssistant.subpanels.openView('video');
    }
    if (animateCameraTo) {
      animateCameraTo({ x: -0.9, y: 1.52, z: 1.15 }, { x: -2.95, y: 1.52, z: 1.15 });
    }
  })()`);
  await new Promise((r) => setTimeout(r, 1800));
  await captureScreenshot(ws, '05_feature_ai_video.png');

  // --- 6. Full Laboratory View in Normal Daylight Mode (No Old Floating UI) ---
  console.log('\n[6/7] Capturing: Full Laboratory View from Overview in Daylight Mode...');
  await evalInBrowser(ws, `(() => {
    const { labAssistant, animateCameraTo } = window.labCircuit;
    if (labAssistant && labAssistant.subpanels) {
      labAssistant.subpanels.openStandby();
    }
    const rightPanel = document.getElementById('right-panel');
    if (rightPanel) rightPanel.style.display = '';
    if (animateCameraTo) {
      animateCameraTo({ x: 0.0, y: 1.38, z: 1.65 }, { x: -0.3, y: 0.95, z: 0.25 });
    }
  })()`);
  await new Promise((r) => setTimeout(r, 1800));
  await captureScreenshot(ws, '06_full_lab_unobstructed.png');

  // --- 7. Normal Laboratory Mode Startup View ---
  console.log('\n[7/7] Capturing: Normal Daylight Laboratory Mode at Startup...');
  await captureScreenshot(ws, '07_normal_mode_startup.png');

  console.log('\n✅ All 6 verification screenshots captured successfully!');
  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error during screenshot capture:', err);
  chrome.kill();
  process.exit(1);
});
