const express = require('express');
const path = require('path');
const fs = require('fs');
const { createJwtVerifier, requireScope } = require('./middleware/jwtAuth');

function createServer(options = {}) {
  const app = express();

  let configJson = {};
  try {
    configJson = require('../src/auth_config_new.json');
  } catch {
    // Use environment variables when auth_config_new.json is absent
  }

  const domain = options.domain || process.env.AUTH0_DOMAIN || configJson.domain || '';
  const clientId = options.clientId || process.env.AUTH0_CLIENT_ID || configJson.clientId || '';
  const audience = options.audience || process.env.AUTH0_AUDIENCE || configJson.audience || 'https://rolebaseapi';
  const issuer = options.issuer || process.env.AUTH0_ISSUER || (domain ? `https://${domain}/` : '');

  const port = options.port || process.env.PORT || 8080;

  // Mount express-openid-connect if configured or enabled
  if (process.env.ENABLE_AUTH0_OIDC === 'true' || process.env.AUTH0_SECRET) {
    try {
      const { auth } = require('express-openid-connect');
      app.use(
        auth({
          authRequired: process.env.AUTH_REQUIRED === 'true',
          auth0Logout: true,
          secret: process.env.AUTH0_SECRET || 'a-32-character-secret-key-for-development-session-only',
          baseURL: process.env.BASE_URL || `http://localhost:${port}`,
          clientID: clientId,
          issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || (domain ? `https://${domain}` : ''),
          authorizationParams: {
            redirect_uri: process.env.AUTH0_REDIRECT_URI || 'http://localhost:3000/buyer',
            scope: 'openid profile read:spark update:spark manage:all',
            audience: audience,
          },
        })
      );
    } catch (err) {
      console.warn('Auth0 OIDC middleware initialization skipped:', err.message);
    }
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'permission-manager-server' });
  });

  // Legacy demonstration endpoint
  app.get('/api1', function (req, res) {
    res.send('Done');
  });

  // RS256 JWT Bearer Authentication Middleware
  const jwtVerifier = createJwtVerifier({
    publicKey: options.publicKey || process.env.AUTH0_PUBLIC_KEY,
    issuer: issuer,
    audience: audience,
    algorithms: options.algorithms || ['RS256'],
    requireExp: options.requireExp !== false,
    requireKid: options.requireKid || false
  });

  // Protected API Endpoints
  app.get('/api/protected', jwtVerifier, (req, res) => {
    res.json({
      message: 'Access granted to protected endpoint',
      auth: req.auth
    });
  });

  app.get('/api/spark/read', jwtVerifier, requireScope('read:spark'), (req, res) => {
    res.json({
      message: 'Authorized to read spark resources',
      scope: 'read:spark',
      data: [{ id: 1, cluster: 'production-spark-01', status: 'online' }]
    });
  });

  app.post('/api/spark/update', jwtVerifier, requireScope('update:spark'), (req, res) => {
    res.json({
      message: 'Authorized to update spark resources',
      scope: 'update:spark',
      status: 'updated'
    });
  });

  app.delete('/api/spark/admin', jwtVerifier, requireScope('manage:all'), (req, res) => {
    res.json({
      message: 'Authorized for administrative actions',
      scope: 'manage:all',
      action: 'complete'
    });
  });

  // Serve static files from the Vite build directory
  const staticDir = path.join(__dirname, '../dist');
  app.use(express.static(staticDir));

  // Handle all other requests by serving the Vite React SPA
  app.get('*', (req, res) => {
    const indexHtml = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      res.send('React Auth0 Permission Manager API Server');
    }
  });

  return app;
}

const defaultApp = createServer();

if (require.main === module) {
  const port = process.env.PORT || 8080;
  defaultApp.listen(port, () => {
    console.log('Running on port', port);
  });
}

module.exports = defaultApp;
module.exports.createServer = createServer;
