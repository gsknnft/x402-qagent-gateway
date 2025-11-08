import { defineConfig, type ConfigEnv, type UserConfig } from 'vite';

import { builtinModules } from 'node:module';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import alias from './vite.aliases';
import paths from './scripts/paths';
import { fileURLToPath } from "url";

// Debug aliases for sanity check
console.log('[vite-alias] @components =>', path.resolve(paths.rootPath, 'src/app/components'));

export default defineConfig((configEnv: ConfigEnv): UserConfig => {
  const { mode } = configEnv;
  const env = process.env;
  const isVSCode = JSON.stringify(!!env.VSCODE_DEBUG);
  const isDev = mode === 'development';

  return {
    root: path.resolve(__dirname, 'src/renderer'),
    base: './',
    build: {
      target: 'esnext',
      sourcemap: true,
      outDir: '../../app/dist/renderer',
      emptyOutDir: true,
      minify: isDev ? false : 'esbuild',
      rollupOptions: {
        input: path.resolve(__dirname, 'src/renderer/index.html'),
        external: [
          ...builtinModules,                 // Node core modules
          ...builtinModules.map(m => `node:${m}`), // Node-prefixed
          'electron',
        ],
        output: {
          format: 'esm', // ✅ Still ESM
        },
      },
    },
    plugins: [
      react({}),
      tsconfigPaths(),
    ],
    server: {
      port: 5173,
      strictPort: true,
    },
  };
});
