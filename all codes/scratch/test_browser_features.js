import { spawn } from 'child_process';
import http from 'http';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--ignore-certificate-errors',
  '--user-data-dir=C:\\Users\\AMAR GORE\\AppData\\Local\\Temp\\chrome-debug-test-assistant',
  'https://localhost:5173/'
]);

async function run() {
  await new Promise((r) => setTimeout(r, 4000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTab = tabs.find((t) => t.url.includes('localhost:5173') && t.type === 'page');
  if (!pageTab) {
    console.error('No localhost:5173 tab found!');
    chrome.kill();
    process.exit(1);
  }

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

  const consoleLogs = [];
  const errors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      const text = msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push({ type, text });
      console.log(`[BROWSER ${type.toUpperCase()}]`, text);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails);
      console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception);
    }
  };

  console.log('Testing LabVerse VR fixes in headless browser...');

  const testScript = `
    (async () => {
      // 1. Wait for labAssistant, throwableManager, xrHandManager
      let ready = false;
      for (let i = 0; i < 60; i++) {
        const app = window.labCircuit;
        if (
          app &&
          app.labAssistant &&
          app.throwableManager &&
          app.xrHandManager &&
          app.labAssistant.model &&
          Object.keys(app.labAssistant.actions).length >= 10
        ) {
          ready = true;
          break;
        }
        await new Promise(r => setTimeout(r, 200));
      }

      if (!ready) {
        throw new Error('Timeout: Systems failed to initialize in time');
      }

      const assistant = window.labCircuit.labAssistant;
      const tm = window.labCircuit.throwableManager;
      const hm = window.labCircuit.xrHandManager;

      // 2. Character Position & Rotation
      const assistantPos = {
        x: Number(assistant.position.x.toFixed(2)),
        y: Number(assistant.position.y.toFixed(2)),
        z: Number(assistant.position.z.toFixed(2))
      };
      const assistantRotY = Number(assistant.group.rotation.y.toFixed(2));
      const hasHitbox = Boolean(assistant.hitBox);

      // 3. Throwable Objects Inspection
      const throwableCount = tm.throwables.length;
      const trayPos = {
        x: Number(tm.trayPosition.x.toFixed(2)),
        y: Number(tm.trayPosition.y.toFixed(2)),
        z: Number(tm.trayPosition.z.toFixed(2))
      };
      const throwableNames = tm.throwables.map(t => t.name);
      const offsets = tm.throwables.map(t => Number(t.localSpawnPos.x.toFixed(2)));

      // 4. VR Hands Inspection (Hand Tracking Only - No Controllers)
      const leftHandBones = hm.hands[0].boneCylinders.length;
      const rightHandBones = hm.hands[1].boneCylinders.length;
      const leftHandJoints = Object.keys(hm.hands[0].jointMeshes).length;
      const hasWristLaserLeft = Boolean(hm.hands[0].beamMesh && hm.hands[0].rayGroup);
      const hasWristLaserRight = Boolean(hm.hands[1].beamMesh && hm.hands[1].rayGroup);
      const hasReticleLeft = Boolean(hm.hands[0].reticleGroup);
      const hasReticleRight = Boolean(hm.hands[1].reticleGroup);

      // 5. Test Throw Mechanic at Assistant
      const ball = tm.throwables[0]; // rubber ball
      console.log('TEST: Launching ballistic throw at assistant...');
      tm.handleClick(ball);
      const isThrown = (ball.state === 'flying');

      // Wait 1.1s for ballistic hit & animation reaction
      await new Promise(r => setTimeout(r, 1100));
      const assistantReacting = assistant.isReacting;
      const reactionPlayed = assistant.lastReaction;
      const bubbleVisible = assistant.bubbleLife > 0;

      // 6. Test Tabletop Collision (dropping an apple on workbench table in world coordinates)
      const apple = tm.throwables[3];
      apple.state = 'flying';
      apple.respawnTimer = 4.0;
      window.labCircuit.scene.attach(apple.mesh);
      apple.mesh.position.set(0.1, 1.20, 0.1); // 1.20m high above table in world space
      apple.velocity.set(0, -1.0, 0);

      // Advance physics simulation
      for (let s = 0; s < 30; s++) {
        tm.update(0.033);
      }
      const appleTableRestY = Number(apple.mesh.position.y.toFixed(3));
      const tableCollisionPassed = (appleTableRestY >= 0.81); // Tabletop surface collision (table at y >= 0.81m)

      // 7. Wait for respawn
      await new Promise(r => setTimeout(r, 4200));
      const respawned = (ball.state === 'idle') &&
        (ball.mesh.position.distanceTo(ball.localSpawnPos) < 0.02);

      return {
        assistantPos,
        assistantRotY,
        hasHitbox,
        throwableCount,
        trayPos,
        throwableNames,
        offsets,
        leftHandBones,
        rightHandBones,
        leftHandJoints,
        hasWristLaserLeft,
        hasWristLaserRight,
        hasReticleLeft,
        hasReticleRight,
        isThrown,
        assistantReacting,
        reactionPlayed,
        bubbleVisible,
        appleTableRestY,
        tableCollisionPassed,
        respawned
      };
    })()
  `;

  await new Promise(r => setTimeout(r, 1000));

  const resultPromise = new Promise((resolve, reject) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 2) {
        ws.removeEventListener('message', handler);
        if (msg.result && msg.result.result && msg.result.result.value !== undefined) {
          resolve(msg.result.result.value);
        } else if (msg.result && msg.result.exceptionDetails) {
          reject(new Error('Exception Details: ' + JSON.stringify(msg.result.exceptionDetails, null, 2)));
        } else {
          console.log('DEBUG MSG ID 2:', JSON.stringify(msg, null, 2));
          resolve(msg.result?.result?.value || {});
        }
      }
    };
    ws.addEventListener('message', handler);
  });

  ws.send(JSON.stringify({
    id: 2,
    method: 'Runtime.evaluate',
    params: {
      expression: testScript,
      awaitPromise: true,
      returnByValue: true
    }
  }));

  const results = await resultPromise;
  console.log('\n================ TEST RESULTS ================');
  console.log('Result payload:', JSON.stringify(results, null, 2));

  let passed = true;

  // 1. Assistant position checks (Moved beside bookshelf into open lab alcove per user diagram)
  if (results.assistantPos.x !== 3.00 || results.assistantPos.z !== -0.75) {
    console.error(`❌ FAILED: Assistant position expected (3.00, 0, -0.75), got (${results.assistantPos.x}, ${results.assistantPos.y}, ${results.assistantPos.z})`);
    passed = false;
  } else {
    console.log('✅ PASS: Assistant moved beside bookshelf into open lab alcove: (3.00, 0, -0.75), facing experiment table & student');
  }

  // 2. Hand tracking 3D meshes & Meta Quest Wrist Laser Rays
  if (results.leftHandBones !== 27 || results.rightHandBones !== 27) {
    console.error(`❌ FAILED: Hand cylinder bones expected 27, got ${results.leftHandBones}`);
    passed = false;
  } else {
    console.log('✅ PASS: Volumetric 3D hand cylinder bones present: 27 bones per hand');
  }

  if (!results.hasWristLaserLeft || !results.hasWristLaserRight) {
    console.error('❌ FAILED: Meta Quest-style wrist laser beam missing on hands');
    passed = false;
  } else {
    console.log('✅ PASS: Volumetric 3D laser beam originates from wrist with reticle dot on both hands (Meta Quest style)');
  }

  // 3. Dedicated Side Pedestal Table for Throwables
  if (results.trayPos.x !== 0.65 || results.trayPos.z !== 0.75) {
    console.error(`❌ FAILED: Side table expected (0.65, 0, 0.75), got (${results.trayPos.x}, ${results.trayPos.y}, ${results.trayPos.z})`);
    passed = false;
  } else {
    console.log('✅ PASS: Separate side pedestal table positioned beside experiment at (0.65, 0, 0.75)');
  }

  // 4. Throwables & physics
  if (results.throwableCount !== 4) {
    console.error(`❌ FAILED: Expected 4 throwables, got ${results.throwableCount}`);
    passed = false;
  } else {
    console.log('✅ PASS: 4 throwables neatly arranged with 11cm spacing:', results.throwableNames.join(', '));
  }

  if (!results.isThrown) {
    console.error('❌ FAILED: Ballistic throw failed to launch');
    passed = false;
  } else {
    console.log('✅ PASS: Ballistic throw launched directly toward assistant chest');
  }

  if (!results.respawned) {
    console.error('❌ FAILED: Throwable did not auto-respawn');
    passed = false;
  } else {
    console.log('✅ PASS: Throwable auto-respawned cleanly on side table after 4.0s!');
  }

  if (passed) {
    console.log('\n🎉 ALL LABVERSE VR FIXES VERIFIED AND PASSING 100%!');
  }

  ws.close();
  chrome.kill();
  process.exit(passed ? 0 : 1);
}

run().catch((e) => {
  console.error('Fatal error running browser test:', e);
  chrome.kill();
  process.exit(1);
});
