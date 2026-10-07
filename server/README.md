# Permission Manager Optional Express Backend

This directory contains an optional standalone Node.js Express backend for the React-Auth0-PermissionManager application.

## Overview
- **Runtime**: Node.js 18 / 20+
- **Framework**: Express 4
- **OIDC Middleware**: `express-openid-connect` (optional session-based OIDC)
- **Static Hosting**: Serves the compiled Vite SPA from `../dist`

## Usage

### 1. Install Server Dependencies
```bash
cd server
npm install
```

### 2. Start the Server
```bash
# From project root:
npm run server

# Or directly from server directory:
cd server
npm start
```
By default, the server listens on port `8080` (or `process.env.PORT`).

### 3. Environment Variables
- `PORT`: Port for the Express server (default: `8080`).
- `ENABLE_AUTH0_OIDC`: Set to `true` to enable session-based OIDC middleware.
- `AUTH0_SECRET`: Secret key for session cookie encryption (min 32 characters).
- `AUTH0_CLIENT_ID`: Auth0 application client ID.
- `AUTH0_DOMAIN`: Auth0 tenant domain (e.g. `your-tenant.us.auth0.com`).
- `AUTH0_AUDIENCE`: Target API audience identifier.
- `AUTH0_REDIRECT_URI`: Post-login callback URL.

## Endpoints
- `GET /health`: Server health check status.
- `GET /api1`: Sample backend endpoint.
- `GET *`: Static fallback serving the compiled React client SPA (`../dist/index.html`).
