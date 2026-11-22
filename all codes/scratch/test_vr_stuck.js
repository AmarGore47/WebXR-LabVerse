import { spawn } from 'child_process';
import http from 'http';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--ignore-certificate-errors',
  '--user-data-dir=C:\\Users\\AMAR GORE\\AppData\\Local\\Temp\\chrome-debug-test-vr-stuck',
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

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      const text = msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
      if (type === 'error' || type === 'warning') {
        console.log(`[BROWSER ${type.toUpperCase()}]`, text);
      }
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('❌ [BROWSER EXCEPTION]', msg.params.exceptionDetails.text, JSON.stringify(msg.params.exceptionDetails));
    }
  };

  const testScript = `
    (async () => {
      // Wait for app ready
      for (let i = 0; i < 40; i++) {
        if (window.labCircuit && window.labCircuit.xrHandManager && window.labCircuit.vrSessionManager) break;
        await new Promise(r => setTimeout(r, 200));
      }

      const hm = window.labCircuit.xrHandManager;
      const sm = window.labCircuit.vrSessionManager;
      const renderer = window.labCircuit.renderer;

      console.log('Invoking onSessionStart to simulate VR entry...');
      // Simulate entering VR
      sm.onSessionStart({
        requestReferenceSpace: async () => ({}),
        addEventListener: () => {}
      });

      renderer.xr.isPresenting = true;

      // Mock real WebXR hand joints with actual movement
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
          g.position.set(idx === 0 ? -0.2 : 0.2, 1.1, 0.5);
          hand.add(g);
          hand.joints[name] = g;
        });
      });

      console.log('Testing 120 animation loop ticks with VR + Hand Tracking active...');
      const errorsCaught = [];

      for (let tick = 0; tick < 120; tick++) {
        try {
          // Simulate hand moving and pinching
          const t = tick * 0.016;
          const leftHand = hm.hands[0].hand;
          const rightHand = hm.hands[1].hand;

          // Move hands slightly
          rightHand.joints['index-finger-tip'].position.set(0.1 + Math.sin(t) * 0.1, 1.05 + Math.cos(t) * 0.05, 0.4);
          rightHand.joints['thumb-tip'].position.set(0.12 + Math.sin(t) * 0.1, 1.05 + Math.cos(t) * 0.05, 0.4);

          // Every subsystem update as called in animate()
          hm.update(0.016);
          if (window.labCircuit.vr3DLabBook && window.labCircuit.vr3DLabBook.group.visible) {
            window.labCircuit.vr3DLabBook.update(0.016);
          }
          if (window.labCircuit.vrOrientationSystem) {
            window.labCircuit.vrOrientationSystem.update(0.016, t);
          }
          if (window.labCircuit.throwableManager) {
            window.labCircuit.throwableManager.update(0.016);
          }

          renderer.render(window.labCircuit.scene, window.labCircuit.camera);
        } catch (e) {
          console.error('ERROR during tick ' + tick + ':', e.message, e.stack);
          errorsCaught.push({ tick, msg: e.message, stack: e.stack });
          break;
        }
        await new Promise(r => setTimeout(r, 16));
      }

      console.log('Finished VR loop test. Errors caught count:', errorsCaught.length);
      return { errors: errorsCaught };
    })()
  `;

  await new Promise((r) => setTimeout(r, 1000));

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
        expression: testScript,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  });

  console.log('Test Output Result:', JSON.stringify(result, null, 2));
  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal:', e);
  chrome.kill();
  process.exit(1);
});

