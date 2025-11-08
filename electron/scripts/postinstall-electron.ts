import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const electronDir = '../../release/app';

import webpackPaths from './paths';

const mainPath = path.join(webpackPaths.distMainPath, 'main.js');
const rendererPath = path.join(webpackPaths.distRendererPath, 'renderer.js');

if (!fs.existsSync(mainPath)) {
  throw new Error(
      'The main process is not built yet. Build it by running "pnpm run build:main"',
    );
}

if (!fs.existsSync(rendererPath)) {
  throw new Error(
      'The renderer process is not built yet. Build it by running "pnpm run build:renderer"',
    );
}

// 🧠 Guard: prevent recursive re-entry from pnpm rebuild or electron-rebuild
if (process.env.ELECTRON_REBUILD_RUNNING === '1') {
  console.log('⚠️ Skipping recursive electron-rebuild (already running)');
  process.exit(0);
}
if (!fs.existsSync(electronDir)) {
  console.log('ℹ️ No Electron build directory detected — skipping postinstall rebuild.');
  process.exit(0);
}

process.env.ELECTRON_REBUILD_RUNNING = '1';

if (fs.existsSync(electronDir)) {
  console.log('🔧 Rebuilding native modules for Electron once...');

  try {
    execSync(`cross-env CI=true ELECTRON_BUILDER_NODE_INSTALLER=pnpm ELECTRON_BUILDER_PREFER_GLOBAL=true pnpm exec electron-rebuild --filter electron-react --module-dir ${electronDir} --force --disable-auto-download`, {
      stdio: 'inherit',
      env: { ...process.env, ELECTRON_REBUILD_RUNNING: '1' }, // propagate flag
    });
    console.log('✅ Electron rebuild complete.');
  } catch (err) {
    console.error(`❌ Electron rebuild failed:, ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
} else {
  console.log('ℹ️ Electron app directory not found, skipping rebuild.');
}
