# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-10-07

### Added
- **JWT Algorithm Attack Protection**: Explicit rejection of `alg=none`, case-insensitive variants (`alg=None`), and symmetric key confusion attacks (`HS256` against `RS256`).
- **Key Identifier (kid) Resolution**: Support for dynamic keystore key resolution with strict fail-closed behavior on missing or unknown keys.
- **Claims Lifecycle Verification**: Strict enforcement of Not-Before (`nbf`), non-numeric `exp`, and non-numeric `nbf` claims.
- **Expanded Security Test Suite**: Added 23 new HTTP integration test scenarios (bringing the backend test suite to 37 automated test cases, 46 tests overall).
- **API Security & Authorization Matrix**: Documented full endpoint security matrix with explicit authentication requirements and RBAC scopes.

---

## [1.0.0] - 2026-10-07

### Added
- **RS256 JWT Token Validation Middleware**: Native cryptographic RS256 token verification middleware for Express API routes (`server/middleware/jwtAuth.js`).
- **Scope & Role Authorization**: Express middleware `requireScope()` enforcing Auth0 granular permissions and scopes (`read:spark`, `update:spark`, `manage:all`).
- **Automated Backend Security Integration Tests**: 14 test cases verifying valid token acceptance and invalid token rejection (expired, wrong issuer, wrong audience, invalid signature, insufficient scope) with zero mock shortcuts.
- **Open-Source Contribution Infrastructure**: Added comprehensive `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, Pull Request template, and structured GitHub Issue templates.
- **Vite 5 ESM Build Pipeline**: High-performance frontend toolchain replacing legacy Create React App.
- **Vitest Testing Harness**: Fast modern test suite running with happy-dom and `@testing-library/react`.

### Changed
- **Server Architecture**: Decoupled Express API backend into dedicated `server/` directory with independent package boundary.
- **Security Hardening**: Pinned GitHub Actions to immutable commit SHAs with `contents: read` least privilege.

### Fixed
- Fixed Node 20 runtime compatibility and OpenSSL engine dependencies.
- Resolved legacy peer dependency build warnings.
