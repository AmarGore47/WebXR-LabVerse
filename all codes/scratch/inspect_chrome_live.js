import { spawn } from 'child_process';
import http from 'http';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--ignore-certificate-errors',
  '--user-data-dir=C:\\Users\\AMAR GORE\\AppData\\Local\\Temp\\chrome-debug-inspect-live',
  'https://localhost:5173/'
]);

async function run() {
  console.log('Launched Chrome, waiting for connection...');
  await new Promise((r) => setTimeout(r, 2500));

  let tabs = [];
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      tabs = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9222/json', (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(JSON.parse(data)));
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
    console.error('No localhost:5173 tab found! Tabs:', tabs.map(t => t.url));
    chrome.kill();
    return;
  }

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
  ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
  ws.send(JSON.stringify({ id: 4, method: 'Network.enable' }));

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      const text = msg.params.args.map((a) => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
      console.log(`[CHROME CONSOLE ${type.toUpperCase()}]`, text);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[CHROME EXCEPTION]', JSON.stringify(msg.params.exceptionDetails, null, 2));
    } else if (msg.method === 'Network.responseReceived') {
      const res = msg.params.response;
      console.log(`[NET RESP ${res.status}]`, res.url);
    } else if (msg.method === 'Network.loadingFailed') {
      console.error(`[NET FAILED]`, msg.params.errorText, msg.params.requestId);
    } else if (msg.method === 'Log.entryAdded') {
      console.log(`[LOG ${msg.params.entry.level}]`, msg.params.entry.text);
    }
  };

  // Reload page so we capture everything from the very first script evaluation
  await new Promise((r) => setTimeout(r, 1000));
  console.log('Reloading page to capture initial scripts...');
  ws.send(JSON.stringify({ id: 5, method: 'Page.reload' }));

  // Wait 16 seconds to capture full GLB download and parsing
  await new Promise((r) => setTimeout(r, 16000));

  // Evaluate state
  ws.send(JSON.stringify({
    id: 10,
    method: 'Runtime.evaluate',
    params: {
      expression: `({
        overlayDisplay: document.getElementById('loading-overlay')?.style.display,
        overlayClasses: Array.from(document.getElementById('loading-overlay')?.classList || []),
        statusText: document.getElementById('loading-status-text')?.textContent,
        errorBannerDisplay: document.getElementById('error-banner')?.style.display,
        errorMessage: document.getElementById('error-message')?.textContent,
        modelLoaded: Boolean(window.labCircuit?.modelLoader?.model),
        loadStatus: window.labCircuit?.modelLoader?.loadStatus,
        loadedPath: window.labCircuit?.modelLoader?.loadedPath
      })`,
      returnByValue: true
    }
  }));

  await new Promise((resolve) => {
    const originalHandler = ws.onmessage;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 10) {
        console.log('\n=== BROWSER DOM & SCENE STATE ===');
        console.log(JSON.stringify(msg.result?.result?.value, null, 2));
        resolve();
      } else {
        originalHandler(event);
      }
    };
  });

  chrome.kill();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
