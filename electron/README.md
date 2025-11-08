


![Node.js](https://img.shields.io/badge/node-24.x-green)
![React](https://img.shields.io/badge/react-19-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)
![Electron](https://img.shields.io/badge/electron-38.x-lightgrey)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-orange)
![License: MIT](https://img.shields.io/badge/license-MIT-yellow)

# 🪩 Quantum Electron
> A modern, TypeScript-first Electron + React 19 boilerplate built for PNPM workspaces.

Quantum Electron is a clean foundation for multi-package Electron apps.
It’s fully ESM, built on Node 24 + TypeScript 5.9, and designed to live happily inside a monorepo.

---

## ✨ Features

- ⚡ **React 19 + React Router 7** — Suspense-ready concurrent UI
- 🧠 **TypeScript 5.9 ESM pipeline** with `moduleResolution: NodeNext`
- 🔒 **Context-isolated preload bridge** for secure IPC
- 💽 **Scoped PNPM workspaces** — no hoisting or install recursion
- 🧩 **Electron 38+** with native-deps rebuild handled automatically
- 🪶 **Vite / TSX dev mode** for instant hot reload
- 🧰 **Zero Babel** — pure TS compilation
- 🌍 Cross-platform (Win / Mac / Linux)
- 🧱 Pre-wired for React 19 Server Components and future SSR support
- 🧩 Plays perfectly with nested workspaces (`@<yourpkg>/*`, `@app/*`, etc.)

---

## 🚀 Quick Start

```bash
git clone https://github.com/gsknnft/quantum-electron.git
cd quantum-electron
pnpm install

# Verify development environment
pnpm dev:check

# Start development server
pnpm dev
```

**📖 For detailed build documentation, see [BUILD.md](BUILD.md)**

## ❓ Why Quantum?

Traditional Electron boilerplates collapse under the weight of monorepos:
- Hoisted deps break native rebuilds
- Aliases drift between Webpack, TS, and Electron
- Context isolation gets bolted on as an afterthought

**Quantum Electron** flips that:
- Every package is isolated, but entangled through PNPM’s graph
- Aliases are centralized in one config (`webpack.aliases.ts`) and respected everywhere
- NodeNext + .mts means you’re aligned with the 2025 ESM toolchain
- DLL + rebuild pipeline is stable across Windows, macOS, and Linux

It’s “quantum” because each module is independent *and* part of the whole — a monorepo that doesn’t collapse when observed 👀



Open the Electron window and you’ll see a live React 19 environment with hot reload.
To build a production bundle:

```bash
pnpm build
pnpm start
```

## 🧩 Structure

electron-react/
├── .erb/                      # Electron React Boilerplate scripts
│   ├── configs/               # Webpack + TypeScript configs
│   └── scripts/               # Version, rebuild, postinstall logic
├── release/                   # Packaged app output
├── src/
│   ├── main/                  # Electron main process
│   ├── preload/               # Secure context bridge
│   └── renderer/              # React 19 frontend
├── tsconfig.json
└── package.json

# 🧱 Development Modes
### Command	 |  Description ###


```bash
pnpm dev	# Runs the app with live reload (Vite / TSX dev server) & Run Next + Electron in parallel
pnpm build	# Builds the production main + renderer bundles
pnpm clean	# Remove all dist and build folders
pnpm rebuild	# Force native module rebuild
pnpm build:main	# Builds only Electron main process
pnpm build:renderer	# Builds only React renderer
pnpm rebuild:electron	# Rebuilds native deps via electron-rebuild
pnpm package	# Creates distributable binaries (using electron-builder)
pnpm shapshot # freeze state
```


## 🧠 Scripts
pnpm dev
pnpm build	Build renderer and main for production

## ⚙️ Tech Stack
# Layer	Technology
  [-] UI	React 19, React Router 7, TypeScript 5.9
  [-] Electron	v38 (API stable, Node 24 runtime)
  [-] Build	Webpack 5 (prod) + Vite (dev)
  [-] Package Manager	PNPM 10 (workspace isolated)
  [-] Security	Context Isolation + Preload Bridge
  [-] TypeScript Config	module: NodeNext, moduleResolution: NodeNext
  [-] Testing	Vitest / Playwright ready
  [-] Lint + Format	ESLint 9 + Prettier 3

## 🧠 For Monorepos

Quantum Electron is built to coexist with large codebases.

Each app or package (@<yourpkg>/core, @app/api, etc.) stays isolated.

Electron’s rebuild and postinstall scripts are workspace-aware.

You can symlink local packages without breaking electron-builder.

Works with pnpm --filter for scoped builds.

Example:

pnpm --filter "@template/electron-react" run build

🧩 Extending the Boilerplate

You can quickly add:

API Gateway / NestJS Backend → hook via secure IPC or local HTTP.

Pi Signing Node → external hardware key service on your LAN.

Prisma ORM → attach local SQLite / Postgres via Electron main.

WebRTC / WebUSB → handled in preload context with isolated permissions.

🧱 Production Build Example
```bash
pnpm rebuild:electron
pnpm build
pnpm package
```

This produces a platform-specific distributable under release/build/.

# 🧰 Maintenance Tips

Keep React, TypeScript, and Electron in sync with Node 24 LTS.

Use pnpm dedupe + pnpm store prune to keep workspace clean.

When upgrading Electron:

pnpm exec ts-node .erb/scripts/update-electron-version.ts


For native modules, always rebuild via pnpm rebuild:electron.

## 🪄 License

MIT © Gordon Skinner (@gsknnft) — designed for builders who like their electrons quantum-entangled ⚡
