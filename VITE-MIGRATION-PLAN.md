# React-Auth0-PermissionManager: Vite Migration Plan

## 1. Executive Summary

This repository currently uses **Create React App (CRA)** via `react-scripts 5.0.1`. CRA has been officially deprecated by the React team and introduces 59 transitive npm audit vulnerabilities primarily in legacy Webpack, Babel, and Jest dependencies.

Migrating to **Vite 6 / React plugin** modernizes build performance, removes legacy Webpack bloat, and resolves CRA-inherited security vulnerabilities. Because this application implements **OAuth 2.0 PKCE** via `@auth0/auth0-react` and `@okta/okta-react`, migration must follow this phased execution plan to avoid breaking authentication callbacks, public asset resolution, or routing.

---

## 2. Pre-Migration Architectural Assessment

| Component | Current State (CRA) | Target State (Vite) | Risk Level |
|:---|:---|:---|:---:|
| **Bundler** | Webpack 5 (react-scripts 5.0.1) | Vite 6 (`@vitejs/plugin-react`) | Low |
| **HTML Entrypoint** | `public/index.html` with `%PUBLIC_URL%` | `/index.html` with `<script type="module" src="/src/index.jsx">` | Low |
| **Asset References** | `process.env.PUBLIC_URL + "/spark.png"` | Direct asset imports or `import.meta.env.BASE_URL` | Medium |
| **Routing** | `react-router-dom 5.3` | Compatible with Vite without modification | Low |
| **Styling** | Tailwind CSS 3.3.3 + PostCSS | Native PostCSS processing in Vite | Low |
| **Express Backend** | `src/server.js` | Move to `server/server.js` or run via separate `nodemon`/`tsx` process | Medium |
| **Test Runner** | Jest (react-scripts test) | Vitest (`@testing-library/react` + `jsdom`) | Medium |
| **Auth0 / Okta OIDC** | JSON configs in `src/` | Compatible, require verifying origins in Auth0 dashboard | Low |

---

## 3. Step-by-Step Implementation Blueprint

### Phase 1: Package Dependencies
1. Remove `react-scripts`.
2. Install Vite and plugins:
   ```bash
   npm uninstall react-scripts
   npm install --save-dev vite @vitejs/plugin-react vitest jsdom
   ```

### Phase 2: Configuration Files
Create `vite.config.js` in the project root:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  define: {
    // Backward compatibility shim for process.env.PUBLIC_URL if needed
    'process.env.PUBLIC_URL': JSON.stringify(''),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
});
```

### Phase 3: HTML & Entrypoint Repositioning
1. Move `public/index.html` to root `/index.html`.
2. Remove `%PUBLIC_URL%` placeholders from `<link>` and `<meta>` tags.
3. Add module entry point just before `</body>`:
   ```html
   <script type="module" src="/src/index.jsx"></script>
   ```

### Phase 4: Package.json Scripts Update
```json
"scripts": {
  "start": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Phase 5: Verification Gates
1. Run `npm run build` — confirm clean production output in `dist/`.
2. Run `npm test` — confirm unit tests pass.
3. Run `npm audit` — confirm transitive CRA vulnerabilities are resolved.
4. Launch dev server `npm start` and verify:
   - Auth0 Login redirect to Universal Login
   - PKCE code exchange and token receipt
   - Permission role dashboard rendering
   - Logout flow and session invalidation
