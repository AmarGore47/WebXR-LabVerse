import http from 'http';
import https from 'https';

async function testLiveServer() {
  console.log('Testing live server on port 5173...');

  // Test HTTPS /models/Untitled.glb
  const reqHttps = https.request('https://localhost:5173/models/Untitled.glb', {
    rejectUnauthorized: false
  }, (res) => {
    console.log('HTTPS /models/Untitled.glb STATUS:', res.statusCode);
    console.log('HTTPS /models/Untitled.glb Headers:', res.headers);
    let bytes = 0;
    res.on('data', c => bytes += c.length);
    res.on('end', () => console.log('HTTPS bytes received:', bytes));
  });
  reqHttps.on('error', e => console.error('HTTPS error:', e));
  reqHttps.end();

  // Test HTTP /models/Untitled.glb
  const reqHttp = http.request('http://localhost:5173/models/Untitled.glb', (res) => {
    console.log('HTTP /models/Untitled.glb STATUS:', res.statusCode);
    let bytes = 0;
    res.on('data', c => bytes += c.length);
    res.on('end', () => console.log('HTTP bytes received:', bytes));
  });
  reqHttp.on('error', e => console.log('HTTP error (as expected if HTTPS only):', e.message));
  reqHttp.end();
}

testLiveServer();
