import path from 'path';
import { rimrafSync } from 'rimraf';
import paths from './paths';

// Use fs-extra if available, fallback to node:fs
let fs: any;
try {
  fs = require('fs-extra');
} catch {
  fs = require('node:fs');
}

export default function deleteSourceMaps() {
  if (fs.existsSync(paths.distMainPath))
    rimrafSync(path.join(paths.distMainPath, '*.js.map'), {
      glob: true,
    });
  if (fs.existsSync(paths.distRendererPath))
    rimrafSync(path.join(paths.distRendererPath, '*.js.map'), {
      glob: true,
    });
}
