import { spawn } from 'child_process';
import http from 'http';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--ignore-certificate-errors',
  '--user-data-dir=C:\\Users\\AMAR GORE\\AppData\\Local\\Temp\\chrome-debug-test-hand-tracking',
  'https://localhost:5173/'
]);

async function run() {
  await new Promise((r) => setTimeout(r, 3000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTab = tabs.find((t) => t.url.includes('localhost:5173') && t.type === 'page');
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

  const logs = [];
  const errors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      const text = msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
      logs.push({ type, text });
      if (type === 'error' || type === 'warning') {
        console.log(`[BROWSER ${type.toUpperCase()}]`, text);
      }
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails);
      console.error('❌ [BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception);
    }
  };

  console.log('Testing hand simulation inside browser context...');

  const simulateHandScript = `
    (async () => {
      // Wait for app ready
      for (let i = 0; i < 40; i++) {
        if (window.labCircuit && window.labCircuit.xrHandManager) break;
        await new Promise(r => setTimeout(r, 200));
      }

      const hm = window.labCircuit.xrHandManager;
      const renderer = window.labCircuit.renderer;
      if (!hm) throw new Error('xrHandManager not found');

      console.log('App ready! Simulating WebXR presenting and hands...');

      // Mock presenting state
      renderer.xr.isPresenting = true;

      // Mock joints for hand 0 and hand 1
      const jointNames = [
        'wrist',
        'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
        'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
        'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
        'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
        'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'
      ];

      hm.hands.forEach((handObj, idx) => {
        const hand = handObj.hand;
        hand.joints = {};
        jointNames.forEach((name) => {
          const g = new window.THREE.Group();
          g.position.set(idx === 0 ? -0.15 : 0.15, 1.15, 0.45);
          hand.add(g);
          hand.joints[name] = g;
        });
      });

      console.log('Running 60 frames of xrHandManager.update()...');
      for (let frame = 0; frame < 60; frame++) {
        hm.update(0.016);
        // Also call main animate logic
        const cam = window.labCircuit.camera;
        const scene = window.labCircuit.scene;
        renderer.render(scene, cam);
        await new Promise(r => setTimeout(r, 16));
      }

      console.log('Completed 60 frames without crash!');
      return {
        handsActive: hm.hasReceivedHandData,
        hand0Valid: hm.hands[0].hasValidPose,
        hand1Valid: hm.hands[1].hasValidPose
      };
    })()
  `;

  await new Promise((r) => setTimeout(r, 1500));

  const result = await new Promise((resolve, reject) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 2) {
        ws.removeEventListener('message', handler);
        if (msg.result && msg.result.result) {
          resolve(msg.result.result.value);
        } else if (msg.result && msg.result.exceptionDetails) {
          reject(new Error(JSON.stringify(msg.result.exceptionDetails)));
        } else {
          resolve(msg);
        }
      }
    };
    ws.addEventListener('message', handler);

    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: simulateHandScript,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  });

  console.log('Simulation Result:', result);
  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal in test_hand_in_chrome:', e);
  chrome.kill();
  process.exit(1);
});

