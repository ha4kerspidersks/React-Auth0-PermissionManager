const http = require('http');
const crypto = require('crypto');
const assert = require('assert');
const { createServer } = require('../server');

// 1. Generate ephemeral RS256 RSA Keypair for deterministic testing (NO real production credentials)
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Second keypair to test invalid signature / untrusted signing key
const { privateKey: attackerPrivateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const TEST_ISSUER = 'https://dev-ha4kerspider.us.auth0.com/';
const TEST_AUDIENCE = 'https://rolebaseapi';

const app = createServer({
  publicKey: publicKey,
  issuer: TEST_ISSUER,
  audience: TEST_AUDIENCE
});

function signToken(payload, key = privateKey, headerOverrides = {}) {
  const header = { alg: 'RS256', typ: 'JWT', ...headerOverrides };
  const hB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const pB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${hB64}.${pB64}`);
  const sB64 = sign.sign(key).toString('base64url');
  return `${hB64}.${pB64}.${sB64}`;
}

function request(server, { method = 'GET', path = '/', headers = {} }) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        method,
        path,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTestSuite() {
  console.log('Starting Auth0 Express Backend Token Validation Integration Test Suite...\n');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}\n`);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  try {
    console.log('--- SECTION 1: VALID TOKEN ACCEPTANCE ---');

    await test('RS256 signature accepted on protected endpoint', async () => {
      const token = signToken({
        sub: 'auth0|test-user-1',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.auth.sub, 'auth0|test-user-1');
    });

    await test('Correct issuer accepted', async () => {
      const token = signToken({
        sub: 'auth0|test-user-2',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
    });

    await test('Correct audience accepted', async () => {
      const token = signToken({
        sub: 'auth0|test-user-3',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
    });

    await test('Unexpired token accepted', async () => {
      const token = signToken({
        sub: 'auth0|test-user-4',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 7200
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
    });

    await test('Required scopes accepted (read:spark)', async () => {
      const token = signToken({
        sub: 'auth0|engineer',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        scope: 'read:spark update:spark',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        path: '/api/spark/read',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.scope, 'read:spark');
      assert.ok(Array.isArray(res.body.data));
    });

    await test('Valid request reaches protected admin endpoint with manage:all', async () => {
      const token = signToken({
        sub: 'auth0|admin',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        scope: 'read:spark update:spark manage:all',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        method: 'DELETE',
        path: '/api/spark/admin',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.action, 'complete');
    });

    console.log('\n--- SECTION 2: INVALID TOKEN REJECTION ---');

    await test('Missing Authorization header → 401', async () => {
      const res = await request(server, { path: '/api/protected' });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
      assert.ok(res.body.message.includes('Missing Authorization header'));
    });

    await test('Malformed JWT structure → 401', async () => {
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: 'Bearer this.isnot.a.valid.jwt' }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Malformed JWT'));
    });

    await test('Invalid signature (signed by untrusted key) → 401', async () => {
      const forgedToken = signToken(
        {
          sub: 'auth0|attacker',
          iss: TEST_ISSUER,
          aud: TEST_AUDIENCE,
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        attackerPrivateKey
      );
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${forgedToken}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Invalid token signature'));
    });

    await test('Wrong issuer → 401', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: 'https://attacker-identity.com/',
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Invalid issuer'));
    });

    await test('Wrong audience → 401', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: 'https://wrong-api-audience.com',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Invalid audience'));
    });

    await test('Expired token → 401', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) - 60 // Expired 1 minute ago
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Token expired'));
    });

    await test('Missing required scope → 403', async () => {
      // Token has no scopes attached
      const token = signToken({
        sub: 'auth0|unprivileged-user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        path: '/api/spark/read',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error, 'Forbidden');
      assert.ok(res.body.message.includes('Insufficient scope'));
    });

    await test('Insufficient scope (has read, requests update) → 403', async () => {
      const token = signToken({
        sub: 'auth0|read-only-user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        scope: 'read:spark',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        method: 'POST',
        path: '/api/spark/update',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error, 'Forbidden');
      assert.ok(res.body.message.includes('update:spark'));
    });

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
