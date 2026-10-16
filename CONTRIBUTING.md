# Contributing to grept

Thank you for your interest in contributing to `grept`!

## Development Setup

1. Requirements:
   - Windows 10 or Windows 11
   - Node.js 20+
   - npm 9+
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Run tests:
   ```powershell
   npm test
   ```
4. Build TypeScript:
   ```powershell
   npm run build
   ```
5. Run lint and format check:
   ```powershell
   npm run lint
   npm run format:check
   ```

## Code Guidelines
- TypeScript with strict type checking.
- Do not introduce native C++ addons; only WASM dependencies are acceptable.
- Windows filesystem semantics (NTFS, case-insensitivity, junctions) must always be respected.
