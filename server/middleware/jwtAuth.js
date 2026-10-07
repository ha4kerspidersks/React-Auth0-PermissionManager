const crypto = require('crypto');

/**
 * Validates RS256 JWT Bearer tokens for Express API routes.
 * 
 * Supports:
 * - RS256 signature verification via RSA public key / PEM certificate
 * - Issuer validation
 * - Audience validation
 * - Expiration and Not-Before time checks
 * - Scope & permission enforcement
 */
function createJwtVerifier(options = {}) {
  const {
    publicKey,
    issuer,
    audience,
    algorithms = ['RS256']
  } = options;

  return function verifyJwt(req, res, next) {
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

    // 1. Algorithm verification
    if (!algorithms.includes(header.alg)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: `Unsupported algorithm: ${header.alg}. Expected: ${algorithms.join(', ')}`
      });
    }

    // 2. Cryptographic signature verification
    const activeKey = typeof publicKey === 'function' ? publicKey(header) : publicKey;
    if (activeKey) {
      try {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(`${headerB64}.${payloadB64}`);
        const isValid = verifier.verify(activeKey, Buffer.from(signatureB64, 'base64url'));
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
    }

    // 3. Expiration verification
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired'
      });
    }

    if (payload.nbf && payload.nbf > now) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token not yet valid'
      });
    }

    // 4. Issuer verification
    const expectedIssuer = issuer || (options.getIssuer ? options.getIssuer() : null);
    if (expectedIssuer) {
      // Normalize trailing slash if needed
      const normalizedExpected = expectedIssuer.replace(/\/$/, '');
      const normalizedPayload = (payload.iss || '').replace(/\/$/, '');
      if (normalizedExpected !== normalizedPayload) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: `Invalid issuer: ${payload.iss}. Expected: ${expectedIssuer}`
        });
      }
    }

    // 5. Audience verification
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

    // Attach decoded auth context to request
    req.auth = payload;
    req.user = payload;
    next();
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
