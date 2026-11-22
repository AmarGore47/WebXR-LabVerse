import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

// Start a local HTTP server to receive the binary GLB directly
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync('public/models/labAssistant.glb', buf);
      console.log(`🎉 SUCCESS! Saved public/models/labAssistant.glb: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, size: buf.length }));
      setTimeout(() => {
        chrome.kill();
        server.close();
        process.exit(0);
      }, 500);
    });
  }
});

server.listen(8089, async () => {
  console.log('Server listening on http://localhost:8089');
  run().catch((e) => {
    console.error(e);
    chrome.kill();
    server.close();
  });
});

let chrome;

async function run() {
  chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--ignore-certificate-errors',
    '--user-data-dir=C:\\Users\\AMAR GORE\\AppData\\Local\\Temp\\chrome-debug-export-4',
    'https://localhost:5173/'
  ]);

  await new Promise((r) => setTimeout(r, 2500));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTab = tabs.find((t) => t.url.includes('localhost:5173'));
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

  console.log('Waiting for labAssistant model to finish loading in browser...');

  const pollAndExport = `
    (async () => {
      console.log('Exporter started polling for assistant.model...');
      for (let i = 0; i < 120; i++) {
        const assistant = window.labCircuit && window.labCircuit.labAssistant;
        if (assistant && assistant.model && assistant.model.children.length > 0) {
          console.log('Found loaded assistant model! Sanitizing materials...');
          
          assistant.model.traverse((child) => {
            if (child.isMesh) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m) => {
                m.map = null;
                m.normalMap = null;
                m.bumpMap = null;
                m.roughnessMap = null;
                m.metalnessMap = null;
                m.alphaMap = null;
                m.needsUpdate = true;
              });
            }
          });

          console.log('Exporting sanitized model to GLB...');
          const exporter = new window.GLTFExporter();
          const glb = await new Promise((resolve, reject) => {
            exporter.parse(assistant.model, resolve, reject, { binary: true });
          });
          console.log('GLB created! Size:', glb.byteLength, 'Posting to local server...');
          const res = await fetch('http://localhost:8089/save', {
            method: 'POST',
            body: glb,
            headers: { 'Content-Type': 'application/octet-stream' }
          });
          const json = await res.json();
          console.log('POST completed:', json);
          return 'SUCCESS';
        }
        await new Promise(r => setTimeout(r, 500));
      }
      throw new Error('Timeout waiting for assistant.model');
    })()
  `;

  ws.send(JSON.stringify({
    id: 2,
    method: 'Runtime.evaluate',
    params: {
      expression: pollAndExport,
      awaitPromise: true,
      returnByValue: true
    }
  }));

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER]', msg.params.args.map((a) => a.value || a.description).join(' '));
    } else if (msg.id === 2) {
      if (msg.result && msg.result.exceptionDetails) {
        console.error('Exception in browser evaluation:', JSON.stringify(msg.result.exceptionDetails, null, 2));
        ws.close();
        chrome.kill();
        server.close();
        process.exit(1);
      }
    }
  };
}

