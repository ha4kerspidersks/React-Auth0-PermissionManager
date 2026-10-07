const crypto = require('crypto');

/**
 * Validates RS256 JWT Bearer tokens for Express API routes.
 * 
 * Security Contract:
 * - Alg enforcement: Strictly disallows 'none', symmetric ciphers (HS256), or unsupported algs.
 * - Key resolution: Supports PEM public key string or dynamic key resolver function (e.g. JWKS key store).
 * - Key ID (kid): Supports kid resolution; fails closed on unknown or missing kid when kid resolver is provided.
 * - Claims validation:
 *     - Issuer (iss): Exact match with configured issuer (normalizing trailing slashes).
 *     - Audience (aud): Ensures token audience contains expected audience.
 *     - Expiration (exp): Mandatory numeric integer timestamp; rejects expired tokens.
 *     - Not-Before (nbf): Validates nbf timestamp if present.
 * - Fail Closed: Any unexpected parsing error, malformed header, or key lookup error fails closed with 401.
 */
function createJwtVerifier(options = {}) {
  const {
    publicKey,
    issuer,
    audience,
    algorithms = ['RS256'],
    requireExp = true,
    requireKid = false
  } = options;

  return function verifyJwt(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing Authorization header'
        });
      }

      const parts = authHeader.trim().split(' ');
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid Authorization header format. Expected "Bearer <token>"'
        });
      }

      const token = parts[1];
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Malformed JWT structure'
        });
      }

      const [headerB64, payloadB64, signatureB64] = tokenParts;
      let header, payload;

      try {
        header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
        payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      } catch {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Malformed JWT payload or header encoding'
        });
      }

      if (!header || typeof header !== 'object' || Array.isArray(header)) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Malformed JWT header object'
        });
      }

      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Malformed JWT payload object'
        });
      }

      // 1. Algorithm verification & alg attack prevention
      const alg = header.alg;
      if (!alg || typeof alg !== 'string') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing algorithm (alg) in token header'
        });
      }

      if (alg.toLowerCase() === 'none') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Insecure algorithm: "none" is strictly prohibited'
        });
      }

      if (!algorithms.includes(alg)) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: `Unsupported algorithm: ${alg}. Expected: ${algorithms.join(', ')}`
        });
      }

      // 2. Key resolution & kid validation
      if (requireKid && !header.kid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing key ID (kid) in token header'
        });
      }

      let activeKey = null;
      if (typeof publicKey === 'function') {
        try {
          activeKey = publicKey(header);
          if (activeKey instanceof Promise) {
            throw new Error('Async key resolver not supported in synchronous middleware');
          }
        } catch (keyErr) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: `Key resolution failed: ${keyErr.message}`
          });
        }
      } else {
        activeKey = publicKey;
      }

      if (!activeKey) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: header.kid
            ? `Unknown or invalid key identifier (kid: ${header.kid})`
            : 'No active signing key configured for verification'
        });
      }

      // 3. Cryptographic signature verification
      try {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(`${headerB64}.${payloadB64}`);
        const sigBuffer = Buffer.from(signatureB64, 'base64url');
        if (sigBuffer.length === 0) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Empty or malformed token signature'
          });
        }
        const isValid = verifier.verify(activeKey, sigBuffer);
        if (!isValid) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid token signature'
          });
        }
      } catch (err) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: `Signature verification failed: ${err.message}`
        });
      }

      // 4. Expiration claim (exp) validation
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp === undefined || payload.exp === null) {
        if (requireExp) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing token expiration (exp) claim'
          });
        }
      } else {
        if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || isNaN(payload.exp)) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid expiration (exp) claim format: must be numeric timestamp'
          });
        }
        if (payload.exp < now) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Token expired'
          });
        }
      }

      // 5. Not-Before claim (nbf) validation
      if (payload.nbf !== undefined && payload.nbf !== null) {
        if (typeof payload.nbf !== 'number' || !Number.isFinite(payload.nbf) || isNaN(payload.nbf)) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid not-before (nbf) claim format: must be numeric timestamp'
          });
        }
        if (payload.nbf > now) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Token not yet valid (nbf violation)'
          });
        }
      }

      // 6. Issuer verification
      const expectedIssuer = issuer || (options.getIssuer ? options.getIssuer() : null);
      if (expectedIssuer) {
        const normalizedExpected = expectedIssuer.replace(/\/$/, '');
        const normalizedPayload = (payload.iss || '').replace(/\/$/, '');
        if (normalizedExpected !== normalizedPayload) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: `Invalid issuer: ${payload.iss}. Expected: ${expectedIssuer}`
          });
        }
      }

      // 7. Audience verification
      const expectedAudience = audience || (options.getAudience ? options.getAudience() : null);
      if (expectedAudience) {
        const tokenAud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!tokenAud.includes(expectedAudience)) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: `Invalid audience. Token aud: ${JSON.stringify(payload.aud)}, expected: ${expectedAudience}`
          });
        }
      }

      // Authentication Succeeded: Attach auth context to request
      req.auth = payload;
      req.user = payload;
      next();
    } catch (unhandledErr) {
      // Fail closed
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication processing failed'
      });
    }
  };
}

/**
 * Middleware factory for role/scope enforcement on protected routes.
 * Checks space-separated 'scope' string or array of 'permissions'.
 */
function requireScope(requiredScope) {
  return function checkScope(req, res, next) {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication context required before evaluating scope'
      });
    }

    const tokenScopes = [];
    if (typeof req.auth.scope === 'string') {
      tokenScopes.push(...req.auth.scope.trim().split(/\s+/));
    }
    if (Array.isArray(req.auth.permissions)) {
      tokenScopes.push(...req.auth.permissions);
    }

    if (!tokenScopes.includes(requiredScope)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient scope: missing required permission "${requiredScope}"`
      });
    }

    next();
  };
}

module.exports = {
  createJwtVerifier,
  requireScope
};
