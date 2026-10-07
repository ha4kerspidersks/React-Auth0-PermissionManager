const http = require('http');
const crypto = require('crypto');
const assert = require('assert');
const { createServer } = require('../server');

// 1. Primary ephemeral RS256 RSA Keypair for deterministic testing (NO real production credentials)
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// 2. Secondary untrusted/adversarial RSA keypair to test signature forgery rejection
const { privateKey: attackerPrivateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const TEST_ISSUER = 'https://dev-ha4kerspider.us.auth0.com/';
const TEST_AUDIENCE = 'https://rolebaseapi';
const VALID_KID = 'test-key-2026-auth0';

// Key registry simulating a local JWKS keystore
const KEY_REGISTRY = {
  [VALID_KID]: publicKey
};

function keyResolver(header) {
  if (header && header.kid) {
    return KEY_REGISTRY[header.kid] || null;
  }
  return publicKey;
}

const defaultApp = createServer({
  publicKey: publicKey,
  issuer: TEST_ISSUER,
  audience: TEST_AUDIENCE,
  algorithms: ['RS256']
});

const kidApp = createServer({
  publicKey: keyResolver,
  issuer: TEST_ISSUER,
  audience: TEST_AUDIENCE,
  algorithms: ['RS256'],
  requireKid: true
});

const failingKeyApp = createServer({
  publicKey: () => {
    throw new Error('JWKS endpoint connection timed out');
  },
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

const TEST_HMAC_SECRET = crypto.randomBytes(32);

function signHmacToken(payload, secret = TEST_HMAC_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const hB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const pB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${hB64}.${pB64}`);
  const sB64 = hmac.digest('base64url');
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
  console.log('Starting Expanded Auth0 Express Backend Token Validation Integration Test Suite...\n');
  
  const server = http.createServer(defaultApp);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const serverKid = http.createServer(kidApp);
  await new Promise((resolve) => serverKid.listen(0, '127.0.0.1', resolve));

  const serverFailing = http.createServer(failingKeyApp);
  await new Promise((resolve) => serverFailing.listen(0, '127.0.0.1', resolve));

  console.log(`Default server running on port ${server.address().port}`);
  console.log(`KID server running on port ${serverKid.address().port}`);
  console.log(`Fault-injection server running on port ${serverFailing.address().port}\n`);

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

    await test('1. RS256 signature accepted on protected endpoint', async () => {
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

    await test('2. Correct issuer accepted', async () => {
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

    await test('3. Correct audience accepted', async () => {
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

    await test('4. Unexpired token accepted', async () => {
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

    await test('5. Required scopes accepted (read:spark)', async () => {
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

    await test('6. Valid request reaches protected admin endpoint with manage:all', async () => {
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

    await test('7. Valid update scope accepted (update:spark)', async () => {
      const token = signToken({
        sub: 'auth0|operator',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        scope: 'update:spark',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        method: 'POST',
        path: '/api/spark/update',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'updated');
    });

    await test('8. Array-based permissions format accepted (RBAC)', async () => {
      const token = signToken({
        sub: 'auth0|rbac-user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        permissions: ['read:spark', 'update:spark'],
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        path: '/api/spark/read',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
    });

    console.log('\n--- SECTION 2: JWT ALGORITHM ATTACK PREVENTION ---');

    await test('9. alg=none attack rejected with 401', async () => {
      const hB64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const pB64 = Buffer.from(JSON.stringify({
        sub: 'auth0|attacker',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64url');
      const noneToken = `${hB64}.${pB64}.`;
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${noneToken}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('none'));
    });

    await test('10. alg=None (casing variant) attack rejected with 401', async () => {
      const hB64 = Buffer.from(JSON.stringify({ alg: 'None', typ: 'JWT' })).toString('base64url');
      const pB64 = Buffer.from(JSON.stringify({
        sub: 'auth0|attacker',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64url');
      const noneToken = `${hB64}.${pB64}.`;
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${noneToken}` }
      });
      assert.strictEqual(res.status, 401);
    });

    await test('11. Symmetric key confusion (HS256 against RS256) rejected with 401', async () => {
      const hsToken = signHmacToken({
        sub: 'auth0|attacker',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${hsToken}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Unsupported algorithm'));
    });

    await test('12. Unexpected algorithm (ES256) rejected with 401', async () => {
      const hB64 = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })).toString('base64url');
      const pB64 = Buffer.from(JSON.stringify({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64url');
      const token = `${hB64}.${pB64}.dummySignature`;
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
    });

    console.log('\n--- SECTION 3: KEY & SIGNATURE VALIDATION ---');

    await test('13. Attacker-generated RSA key signature rejected with 401', async () => {
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

    await test('14. Malformed signature bytes rejected with 401', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const parts = token.split('.');
      const corruptedToken = `${parts[0]}.${parts[1]}.corrupted_signature_data`;
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${corruptedToken}` }
      });
      assert.strictEqual(res.status, 401);
    });

    await test('15. Altered payload / signature mismatch rejected with 401', async () => {
      const token = signToken({
        sub: 'auth0|regular-user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        scope: 'read:spark',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const parts = token.split('.');
      // Tamper with payload to add admin scope
      const tamperedPayload = Buffer.from(JSON.stringify({
        sub: 'auth0|regular-user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        scope: 'read:spark manage:all',
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${tamperedToken}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Invalid token signature'));
    });

    await test('16. Valid kid accepted by keystore resolver', async () => {
      const token = signToken(
        {
          sub: 'auth0|kid-user',
          iss: TEST_ISSUER,
          aud: TEST_AUDIENCE,
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        privateKey,
        { kid: VALID_KID }
      );
      const res = await request(serverKid, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
    });

    await test('17. Missing kid rejected when requireKid is enabled', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(serverKid, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Missing key ID (kid)'));
    });

    await test('18. Unknown kid rejected with 401', async () => {
      const token = signToken(
        {
          sub: 'auth0|user',
          iss: TEST_ISSUER,
          aud: TEST_AUDIENCE,
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        privateKey,
        { kid: 'unknown-revoked-key-id' }
      );
      const res = await request(serverKid, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Unknown or invalid key identifier'));
    });

    await test('19. Key resolver failure fails closed with 401', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(serverFailing, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Key resolution failed'));
    });

    console.log('\n--- SECTION 4: CLAIMS INTEGRITY & LIFECYCLE ---');

    await test('20. Wrong issuer rejected with 401', async () => {
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

    await test('21. Wrong audience rejected with 401', async () => {
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

    await test('22. Expired token rejected with 401', async () => {
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

    await test('23. Not-before (nbf) violation rejected with 401', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
        nbf: Math.floor(Date.now() / 1000) + 300 // Valid only in future
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Token not yet valid'));
    });

    await test('24. Missing expiration (exp) rejected with 401', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Missing token expiration'));
    });

    await test('25. Non-numeric expiration format rejected with 401', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: 'tomorrow-morning'
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Invalid expiration'));
    });

    await test('26. Non-numeric nbf format rejected with 401', async () => {
      const token = signToken({
        sub: 'auth0|user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
        nbf: 'invalid-nbf'
      });
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Invalid not-before'));
    });

    console.log('\n--- SECTION 5: AUTHORIZATION & PRIVILEGE ESCALATION ---');

    await test('27. Missing required scope rejected with 403', async () => {
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

    await test('28. Insufficient scope (has read, requests update) rejected with 403', async () => {
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

    await test('29. Attempted privilege escalation to admin endpoint rejected with 403', async () => {
      const token = signToken({
        sub: 'auth0|read-only-user',
        iss: TEST_ISSUER,
        aud: TEST_AUDIENCE,
        scope: 'read:spark update:spark',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      const res = await request(server, {
        method: 'DELETE',
        path: '/api/spark/admin',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error, 'Forbidden');
      assert.ok(res.body.message.includes('manage:all'));
    });

    await test('30. Protected resource without auth header rejected with 401', async () => {
      const res = await request(server, { path: '/api/spark/read' });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });

    console.log('\n--- SECTION 6: HEADER FORMAT & FAILURE BEHAVIOR ---');

    await test('31. Missing Authorization header rejected with 401', async () => {
      const res = await request(server, { path: '/api/protected' });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
      assert.ok(res.body.message.includes('Missing Authorization header'));
    });

    await test('32. Non-Bearer authorization scheme (Basic auth) rejected with 401', async () => {
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: 'Basic dXNlcjpwYXNzd29yZA==' }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Expected "Bearer <token>"'));
    });

    await test('33. Bearer header with missing token rejected with 401', async () => {
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: 'Bearer' }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Invalid Authorization header format'));
    });

    await test('34. Malformed JWT structure (2 segments) rejected with 401', async () => {
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: 'Bearer onlyheader.onlypayload' }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Malformed JWT structure'));
    });

    await test('35. Malformed base64url JSON rejected with 401', async () => {
      const res = await request(server, {
        path: '/api/protected',
        headers: { Authorization: 'Bearer not-valid-base64.not-valid-json.sig' }
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.message.includes('Malformed JWT'));
    });

    await test('36. Public endpoint /health remains accessible without authentication', async () => {
      const res = await request(server, { path: '/health' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
    });

    await test('37. Public endpoint /api1 remains accessible without authentication', async () => {
      const res = await request(server, { path: '/api1' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body, 'Done');
    });

  } finally {
    server.close();
    serverKid.close();
    serverFailing.close();
  }

  console.log(`\n============================================================`);
  console.log(`EXPANDED INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
