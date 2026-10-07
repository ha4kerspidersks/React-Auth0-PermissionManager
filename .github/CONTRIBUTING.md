# Contributing to React-Auth0-PermissionManager

Thank you for your interest in contributing to **React-Auth0-PermissionManager**! This project provides a production-grade identity, RBAC, and permission management interface integrating Auth0 OAuth 2.0 with PKCE and an isolated Express API server.

---

## 1. Code of Conduct

All contributors are expected to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md). Please report unacceptable behavior to the maintainer.

---

## 2. Architecture Overview

The repository is organized into two isolated layers:
- **Frontend SPA (`src/`)**: Built with React 18, Vite 5, Tailwind CSS, and `@auth0/auth0-react`.
- **Backend API (`server/`)**: An independent Express application with dedicated `package.json`, handling RS256 JWT Bearer verification, scope enforcement, and SPA asset serving.

---

## 3. Local Development Setup

### Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher

### Installation
```bash
# 1. Install frontend dependencies
npm install --legacy-peer-deps

# 2. Install server dependencies
npm --prefix server install
```

### Running Locally
```bash
# Start Vite development server (port 3000)
npm run dev

# Start Express API server (port 8080)
npm run server
```

---

## 4. Running Tests

Always ensure all test suites pass before submitting changes:

```bash
# Run frontend Vitest suite
npm test

# Run backend RS256 token validation integration suite
npm run test:server

# Run both suites
npm run test:all

# Validate production build
npm run build
```

---

## 5. Security & Safety Guidelines

- **Never Commit Secrets**: Do not commit client secrets, API tokens, or personal Auth0 keys. All tests use ephemeral, deterministically generated RSA test keypairs.
- **Dependency Changes**: Avoid introducing dependencies with unresolved CVE advisories. Run `npm audit` before committing.
- **Scope & Role Safety**: Any change touching RBAC or permission logic must include corresponding test cases verifying both granted and denied states.

---

## 6. Pull Request Process

1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Write clean, focused code and add unit/integration tests for any new functionality.
3. Ensure `npm run test:all` and `npm run build` pass with zero errors.
4. Follow conventional commit messages (e.g. `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`).
5. Open a Pull Request referencing the issue or feature you are addressing.
