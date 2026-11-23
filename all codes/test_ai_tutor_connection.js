/**
 * test_ai_tutor_connection.js
 * Verification test suite for LabVerse AI Tutor Connection, Endpoints, and Diagnostics.
 */

import assert from 'node:assert';
import { createApp } from './server/index.js';
import { AITutorClient, TUTOR_STATES } from './src/guidance/aiTutorClient.js';

console.log('================================================================');
console.log('       LABVERSE AI TUTOR CONNECTION & DIAGNOSTIC AUDIT          ');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${e.message}`);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${e.message}`);
    }
  }

  const app = createApp({
    mockClient: {
      generateContent: async () => JSON.stringify({
        message: 'Under Ohm’s law, current is directly proportional to voltage.',
        explanation: 'V = I * R governs metallic conductors.',
        hint: 'Check your circuit wires.',
        suggestedAction: 'Observe instrument needles.',
        strategy: 'guided_question'
      })
    }
  });

  // Start temporary local server on dynamic port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // ─── Test 1: GET /api/health ─────────────────────────────────────────────
    await asyncTest('1. GET /api/health returns 200 with service and healthy status', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'healthy');
      assert.strictEqual(json.service, 'labverse-backend');
      assert.ok(json.timestamp);
    });

    // ─── Test 2: GET /api/tutor/health ────────────────────────────────────────
    await asyncTest('2. GET /api/tutor/health returns safe diagnostics without exposing API key', async () => {
      const res = await fetch(`${baseUrl}/api/tutor/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'ok');
      assert.strictEqual(json.service, 'labverse-ai-tutor');
      assert.strictEqual(typeof json.keyConfigured, 'boolean');
      assert.strictEqual(typeof json.modelName, 'string');
      // STRICT REQUIREMENT: Never expose any key string
      assert.strictEqual(json.apiKey, undefined);
      assert.strictEqual(json.key, undefined);
    });

    // ─── Test 3: Safe Tutor Request with Simulation Context ───────────────────
    await asyncTest('3. POST /api/tutor succeeds with valid simulation context and returns pedagogical structure', async () => {
      const mockContext = {
        circuit: {
          wireCount: 7,
          isClosedLoop: true,
          isSeriesAmmeter: true,
          isParallelVoltmeter: true,
          hasShortCircuit: false
        },
        workflowStage: {
          id: 'CIRCUIT_VALIDATION',
          label: 'Circuit Validation',
          step: 5
        },
        readings: [
          { voltage: 1.0, current: 0.10, resistance: 10.0 }
        ],
        detectedMistakes: []
      };

      const res = await fetch(`${baseUrl}/api/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Why is the ammeter in series?',
          language: 'English',
          simulationContext: mockContext
        })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.response);
      assert.ok(json.response.message);
      assert.ok(json.response.explanation);
    });

    // ─── Test 4: Rejection of Missing Simulation Context ─────────────────────
    await asyncTest('4. POST /api/tutor rejects missing simulationContext with 400 MISSING_SIMULATION_CONTEXT', async () => {
      const res = await fetch(`${baseUrl}/api/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'What is Ohm’s Law?'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'MISSING_SIMULATION_CONTEXT');
    });

    // ─── Test 5: Rejection of Empty Question ──────────────────────────────────
    await asyncTest('5. POST /api/tutor rejects empty questions with 400 EMPTY_QUESTION', async () => {
      const res = await fetch(`${baseUrl}/api/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: '   ',
          simulationContext: { circuit: {} }
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'EMPTY_QUESTION');
    });

    // ─── Test 6: AITutorClient Health & Diagnostics Report ───────────────────
    await asyncTest('6. AITutorClient checks health and populates visible developer diagnostic report', async () => {
      const client = new AITutorClient({
        apiBaseUrl: `${baseUrl}/api/tutor`,
        healthBaseUrl: `${baseUrl}/api/health`
      });

      const res = await client.checkHealth();
      assert.strictEqual(res.healthy, true);

      const diag = client.getDiagnostics();
      assert.strictEqual(diag.apiBaseUrl, `${baseUrl}/api/tutor`);
      assert.strictEqual(diag.apiHealthStatus, 'OK');
      assert.strictEqual(diag.tutorHealthStatus, 'OK');
      assert.strictEqual(diag.backendReachable, true);
      assert.strictEqual(typeof diag.keyConfigured, 'boolean');
      assert.strictEqual(typeof diag.selectedModelName, 'string');
      assert.strictEqual(typeof diag.lastRequestLatencyMs, 'number');
    });

    // ─── Test 7: AITutorClient 404 Route Detection ───────────────────────────
    await asyncTest('7. AITutorClient distinguishes 404 routes as API_NOT_FOUND', async () => {
      const client = new AITutorClient({
        apiBaseUrl: `${baseUrl}/api/non_existent_route`,
        healthBaseUrl: `${baseUrl}/api/non_existent_health`
      });

      const res = await client.askQuestion({
        question: 'Testing 404',
        customContext: { circuit: {} }
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error.code, 'API_NOT_FOUND');
      const diag = client.getDiagnostics();
      assert.strictEqual(diag.lastErrorCode, 'API_NOT_FOUND');
    });

    // ─── Test 8: AITutorClient Offline / Unreachable Detection ───────────────
    await asyncTest('8. AITutorClient distinguishes offline backend as NETWORK_FAILURE / BACKEND_OFFLINE', async () => {
      const client = new AITutorClient({
        apiBaseUrl: `http://127.0.0.1:59999/api/tutor`,
        healthBaseUrl: `http://127.0.0.1:59999/api/health`
      });

      const healthRes = await client.checkHealth();
      assert.strictEqual(healthRes.healthy, false);

      const askRes = await client.askQuestion({
        question: 'Testing offline',
        customContext: { circuit: {} }
      });

      assert.strictEqual(askRes.success, false);
      assert.strictEqual(askRes.error.code, 'NETWORK_FAILURE');
      assert.strictEqual(client.getDiagnostics().backendReachable, false);
    });

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`  RESULTS: ${passed} PASSED / ${total - passed} FAILED (TOTAL: ${total})`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
