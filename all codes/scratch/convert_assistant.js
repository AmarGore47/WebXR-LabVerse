import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--ignore-certificate-errors',
  '--user-data-dir=C:\\Users\\AMAR GORE\\AppData\\Local\\Temp\\chrome-debug-export-2',
  'https://localhost:5173/'
]);

async function run() {
  await new Promise((r) => setTimeout(r, 2500));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTab = tabs.find((t) => t.url.includes('localhost:5173'));
  if (!pageTab) {
    console.error('No page tab found!');
    chrome.kill();
    return;
  }

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

  console.log('Sending conversion script to page...');

  const convertScript = `
    (async () => {
      const { FBXLoader } = await import('/node_modules/three/examples/jsm/loaders/FBXLoader.js');
      const { GLTFExporter } = await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
      console.log('Starting FBX load inside browser...');
      const loader = new FBXLoader();
      const fbx = await new Promise((resolve, reject) => {
        loader.load('/models/labAssistant.fbx', resolve, undefined, reject);
      });
      console.log('Loaded FBX successfully! Exporting to binary GLB...');
      const exporter = new GLTFExporter();
      const glb = await new Promise((resolve, reject) => {
        exporter.parse(fbx, resolve, reject, { binary: true });
      });
      console.log('GLB created! Size:', glb.byteLength);
      // Chunked base64 conversion
      const bytes = new Uint8Array(glb);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    })()
  `;

  ws.send(JSON.stringify({
    id: 2,
    method: 'Runtime.evaluate',
    params: {
      expression: convertScript,
      awaitPromise: true,
      returnByValue: true
    }
  }));

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER]', msg.params.args.map((a) => a.value || a.description).join(' '));
    } else if (msg.id === 2) {
      console.log('Got response id 2:', JSON.stringify(msg.result, null, 2).slice(0, 500));
      if (msg.result && msg.result.result && typeof msg.result.result.value === 'string') {
        const b64 = msg.result.result.value;
        const buf = Buffer.from(b64, 'base64');
        fs.writeFileSync('public/models/labAssistant.glb', buf);
        console.log(`🎉 SUCCESS! Saved public/models/labAssistant.glb: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.error('Export failed or returned non-string:', msg.result);
      }
      ws.close();
      chrome.kill();
      process.exit(0);
    }
  };
}

run().catch((e) => {
  console.error(e);
  chrome.kill();
});
