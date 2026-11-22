import { spawn } from 'child_process';
import http from 'http';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--ignore-certificate-errors',
  '--user-data-dir=C:\\Users\\AMAR GORE\\AppData\\Local\\Temp\\chrome-debug-err-check',
  'about:blank'
]);

async function run() {
  await new Promise((r) => setTimeout(r, 2000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const tab = tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(`[CONSOLE ${msg.params.type}]`, ...msg.params.args.map(a => a.value ?? a.description));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[EXCEPTION]', JSON.stringify(msg.params.exceptionDetails, null, 2));
    }
    if (msg.method === 'Log.entryAdded') {
      console.log(`[LOG ${msg.params.entry.level}]`, msg.params.entry.text);
    }
  };

  console.log('Navigating to https://localhost:5173/ ...');
  ws.send(JSON.stringify({
    id: 10,
    method: 'Page.navigate',
    params: { url: 'https://localhost:5173/' }
  }));

  await new Promise((r) => setTimeout(r, 7000));

  // Check errors from page
  ws.send(JSON.stringify({
    id: 20,
    method: 'Runtime.evaluate',
    params: {
      expression: `window.__vite_plugin_react_preamble_installed__ || window.labCircuit ? 'FOUND' : 'NOT FOUND'`,
      returnByValue: true
    }
  }));

  await new Promise((r) => setTimeout(r, 1000));
  chrome.kill();
}

run().catch(e => { console.error(e); chrome.kill(); });
