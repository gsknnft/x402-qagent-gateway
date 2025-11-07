import { loadTsconfigAliases } from './scripts/load-tsconfig-aliases';
import path from 'path';
import * as fs from 'node:fs';
import paths from './scripts/paths';

// monorepo root = 4 levels up from electron.vite.config.ts
const fromRoot = (...segments: string[]) =>
  path.resolve(paths.rootPath, ...segments); // ✅ USE MONOREPO ROOT

console.log('🛠️ @app resolves to:', fromRoot('src/app')); // debug
const pkgJson = JSON.parse(fs.readFileSync(fromRoot('package.json'), 'utf-8'));
const workspaceDeps = Object.keys(pkgJson.devDependencies || {})
  .concat(Object.keys(pkgJson.dependencies || {}))
 // .filter(dep => dep.startsWith('@<yourpkg>/')); // add any filters here


const alias = {
  ...loadTsconfigAliases(),
  ...workspaceDeps.map(dep => {
    const resolved = path.resolve(paths.rootPath, 'src', dep.replace('@<yourpkg>/', '<yourpkg>>-')) || '';
    return [dep, resolved];
  }),

  // '@': fromRoot('src'),
  //'@<yourpkg>>/app': fromRoot('src/<packageDir>/<src/app/build/dist>>'),

};


export default alias;
