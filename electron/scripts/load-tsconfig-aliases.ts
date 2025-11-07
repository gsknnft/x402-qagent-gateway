import fs from 'fs';
import path from 'path';
import ts from 'typescript';

// Define fromRoot helper
const fromRoot = (...segments: string[]) => path.resolve(process.cwd(), ...segments);

// Load base tsconfig
const rootTsconfig = fromRoot('tsconfig.json');

/**
 * Loads tsconfig "paths" and translates them into Vite aliases.
 */
export function loadTsconfigAliases(): Record<string, string> {
  const config = ts.readConfigFile(rootTsconfig, ts.sys.readFile).config;
  const compilerOptions = config.compilerOptions || {};
  const baseUrl = compilerOptions.baseUrl
    ? path.resolve(path.dirname(rootTsconfig), compilerOptions.baseUrl)
    : path.dirname(rootTsconfig);
  const paths = compilerOptions.paths || {};

  const aliases: Record<string, string> = {};

  for (const [key, values] of Object.entries(paths)) {
    const normalizedKey = key.replace('/*', '');
    const target = (values as string[])[0].replace('/*', '');
    aliases[normalizedKey] = path.resolve(baseUrl, target);
  }

  // Manual override to ensure consistency with monorepo layout
  aliases['@app'] = fromRoot('src/app');

  return aliases;
}
