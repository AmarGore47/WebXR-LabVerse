import { createServer } from 'vite';
import http from 'http';
import https from 'https';

async function testViteServer() {
  console.log('--- Starting Vite Server with root: "all codes" ---');
  const server = await createServer({
    root: 'all codes',
    server: { port: 5173, host: '127.0.0.1' }
  });

  await server.listen();
  server.printUrls();

  const isHttps = Boolean(server.config.server.https);
  const protocol = isHttps ? 'https:' : 'http:';
  const client = isHttps ? https : http;

  console.log(`Testing GET ${protocol}//127.0.0.1:5173/models/Untitled.glb ...`);

  const req = client.request(`${protocol}//127.0.0.1:5173/models/Untitled.glb`, {
    rejectUnauthorized: false
  }, (res) => {
    console.log('Response Status for /models/Untitled.glb:', res.statusCode);
    console.log('Response Headers:', res.headers);
    let totalBytes = 0;
    res.on('data', (chunk) => {
      totalBytes += chunk.length;
    });
    res.on('end', async () => {
      console.log('Total bytes received:', totalBytes);
      await server.close();
      console.log('Server closed cleanly.');
    });
  });

  req.on('error', async (err) => {
    console.error('Request error:', err);
    await server.close();
  });

  req.end();
}

testViteServer();
