# React-Auth0-PermissionManager: CRA Baseline Architecture & Audit

## 1. Executive Summary
This document establishes the pre-migration baseline for `React-Auth0-PermissionManager` prior to migrating from Create React App (`react-scripts 5.0.1`) to Vite.

## 2. Baseline Status Matrix
| Check | Status | Evidence / Details |
| :--- | :--- | :--- |
| **BUILD** | PASS | `CI=false npm run build` completed cleanly; produced `build/static/js/main.5866107a.js` (86 kB gzip) |
| **TEST** | PASS (1/1) | `react-scripts test --watchAll=false` passed 1 test in `src/App.test.jsx` |
| **LINT** | NOT CONFIGURED | ESLint standard `react-app` rules ran during CRA build with non-fatal warnings |
| **AUTH** | PASS | Auth0 configuration loaded via `auth_config_new.json` (`domain`, `clientId`, `audience`); PKCE / authorizationParams configured |
| **ROUTING** | PASS | React Router DOM v5.3 (`BrowserRouter`, `Route`, `Switch` with `/`, `/buyer`, `/seller`) |
| **SECURITY** | REVIEW REQUIRED | 59 transitive npm audit vulnerabilities (7 moderate, 52 high) inherited from deprecated `react-scripts 5.0.1`; Gitleaks: 0 leaks |
| **CI** | PASS | `.github/workflows/ci.yml` verified on Node 20 runtime |

## 3. CRA-Specific Assumptions & Dependencies
- `react-scripts`: 5.0.1 in `dependencies`
- Entrypoint: `public/index.html` referencing `%PUBLIC_URL%` placeholders
- Assets: Referenced via `process.env.PUBLIC_URL + "/spark.png"` and `process.env.PUBLIC_URL + "/background.jpg"` in `src/Home.jsx`
- Scripts: `react-scripts start`, `build`, `test`, `eject`
- Transitive Webpack 5 / Babel / Jest stack causing 59 npm audit vulnerabilities

## 4. Auth0 & Security Architecture Baseline
- **SDK**: `@auth0/auth0-react` v2.2.1
- **Flow**: Authorization Code Flow with PKCE
- **Scopes**: `openid profile read:spark update:spark`
- **Redirect URI**: `http://localhost:3000/buyer`
- **Audience**: `https://rolebaseapi`
- **Configuration**: Loaded from `src/auth_config_new.json`
- **Token Acquisition**: `getAccessTokenSilently()` called on `isAuthenticated` in `Home.jsx` and `BuyerLogin.jsx`
- **RBAC / Permissions**: Token parsed via `atob(jwtToken.split('.')[1]).permissions` and rendered on UI
- **Zero Secrets in Code**: Only public client IDs and domains are referenced

## 5. Target Migration Strategy
1. Replace `react-scripts` with `vite` and `@vitejs/plugin-react`.
2. Move `public/index.html` to root `/index.html` and add ESM module script tag `<script type="module" src="/src/index.jsx"></script>`.
3. Configure `vite.config.js` with port 3000 (matching Auth0 redirect URI), and compatibility defines for `process.env.PUBLIC_URL`.
4. Migrate unit tests to Vitest (`vitest`, `jsdom`) ensuring test parity.
5. Update scripts in `package.json` and adjust CI in `.github/workflows/ci.yml`.
