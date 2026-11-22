import { createServer } from 'vite';
import http from 'http';
import https from 'https';
import path from 'path';

async function testFromRoot() {
  console.log('Testing Vite resolution when run from root with "all codes"...');
  
  // When package.json runs: vite "all codes" --host
  const server = await createServer({
    root: path.resolve('all codes'),
    configFile: path.resolve('all codes/vite.config.js')
  });

  await server.listen();
  console.log('Config resolved:');
  console.log('  root:', server.config.root);
  console.log('  publicDir:', server.config.publicDir);
  console.log('  configFile:', server.config.configFile);
  
  const isHttps = Boolean(server.config.server.https);
  const protocol = isHttps ? 'https:' : 'http:';
  const client = isHttps ? https : http;
  
  console.log(`Checking ${protocol}//localhost:5173/models/Untitled.glb ...`);
  const req = client.request(`${protocol}//localhost:5173/models/Untitled.glb`, {
    rejectUnauthorized: false
  }, (res) => {
    console.log('STATUS:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Content-Length:', res.headers['content-length']);
    server.close();
  });
  req.on('error', (e) => {
    console.error('Request error:', e);
    server.close();
  });
  req.end();
}

testFromRoot();
