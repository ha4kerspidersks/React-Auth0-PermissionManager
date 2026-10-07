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

## API Endpoints & Security Matrix

| Endpoint | Method | Authentication Requirement | Required Scope | Success Status | Unauthorized Status | Forbidden Status | Policy Description |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| `/health` | `GET` | None (Public) | None | `200 OK` | N/A | N/A | Liveness probe & health status |
| `/api1` | `GET` | None (Public) | None | `200 OK` | N/A | N/A | Legacy demonstration endpoint |
| `/api/protected` | `GET` | RS256 Bearer JWT | None | `200 OK` | `401 Unauthorized` | N/A | General authenticated identity endpoint |
| `/api/spark/read` | `GET` | RS256 Bearer JWT | `read:spark` | `200 OK` | `401 Unauthorized` | `403 Forbidden` | Read access to spark cluster resources |
| `/api/spark/update` | `POST` | RS256 Bearer JWT | `update:spark` | `200 OK` | `401 Unauthorized` | `403 Forbidden` | Update spark cluster configurations |
| `/api/spark/admin` | `DELETE` | RS256 Bearer JWT | `manage:all` | `200 OK` | `401 Unauthorized` | `403 Forbidden` | Administrative cluster management |
| `/*` | `GET` | None (Public) | None | `200 OK` | N/A | N/A | Static fallback serving Vite React SPA |

## Running Security Integration Tests

```bash
npm test
```
Executes 37 automated HTTP integration tests verifying algorithm protection (none/symmetric rejection), signature cryptography, claim lifecycle, and role authorization.

