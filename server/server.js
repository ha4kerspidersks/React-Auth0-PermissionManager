const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

let configJson = {};
try {
  configJson = require('../src/auth_config_new.json');
} catch {
  // Use environment variables when auth_config_new.json is absent
}

const domain = process.env.AUTH0_DOMAIN || configJson.domain || '';
const clientId = process.env.AUTH0_CLIENT_ID || configJson.clientId || '';
const audience = process.env.AUTH0_AUDIENCE || configJson.audience || '';

const port = process.env.PORT || 8080;

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

// Serve static files from the Vite build directory
const staticDir = path.join(__dirname, '../dist');
app.use(express.static(staticDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'permission-manager-server' });
});

// Define API endpoints
app.get('/api1', function (req, res) {
  res.send('Done');
});

// Handle all other requests by serving the Vite React SPA
app.get('*', (req, res) => {
  const indexHtml = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.send('React Auth0 Permission Manager API Server');
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log('Running on port', port);
  });
}

module.exports = app;
