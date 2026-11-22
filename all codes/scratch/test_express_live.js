import http from 'http';

function makeRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3001,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (_) {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testExpressEndToEnd() {
  console.log('=== TEST 1: EXPRESS GLOBAL HEALTH CHECK (/api/health) ===');
  const healthRes = await makeRequest('/api/health', 'GET');
  console.log('Status:', healthRes.status);
  console.log('Body:', healthRes.body);

  console.log('\n=== TEST 2: TUTOR ROUTE HEALTH CHECK (/api/tutor/health) ===');
  const tutorHealthRes = await makeRequest('/api/tutor/health', 'GET');
  console.log('Status:', tutorHealthRes.status);
  console.log('Body:', tutorHealthRes.body);

  console.log('\n=== TEST 3: REAL TUTOR POST REQUEST (/api/tutor) ===');
  const tutorPostPayload = {
    question: 'Why must the ammeter be connected in series with the circuit?',
    language: 'English',
    simulationContext: {
      circuit: { isComplete: false, wireCount: 3 },
      simulation: { keyClosed: false, current: 0 }
    }
  };

  const t0 = Date.now();
  const tutorRes = await makeRequest('/api/tutor', 'POST', tutorPostPayload);
  const latency = Date.now() - t0;
  console.log(`Status: ${tutorRes.status} (Completed in ${latency}ms)`);
  console.log('Response Metadata:', tutorRes.body?.metadata);
  console.log('Strategy:', tutorRes.body?.strategy);
  console.log('Tutor Message:', tutorRes.body?.response?.message);
}

testExpressEndToEnd().catch(console.error);
