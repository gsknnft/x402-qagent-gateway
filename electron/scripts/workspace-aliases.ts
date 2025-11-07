/**
 * Centralized workspace alias configuration
 * Used across all Vite configs to ensure consistency
 */
import fs from 'fs';
import path from 'path';
import paths from './paths';

// Simple logging without dependencies to avoid circular imports in Vite configs
const log = {
  warn: (msg: string) => console.warn(`⚠️ [workspace-aliases] ${msg}`),
  info: (msg: string) => console.log(`ℹ️ [workspace-aliases] ${msg}`),
};

export interface WorkspacePackage {
  name: string;
  path: string;
  srcPath: string;
}

/**
 * Discover workspace packages in the monorepo
 */
export function discoverWorkspacePackages(baseDir: string = paths.rootPath, exclusion = ""): WorkspacePackage[] {
  const packages: WorkspacePackage[] = [];
  const searchDirs = ['packages', 'libs', `src/${exclusion}-core`];

  for (const dir of searchDirs) {
    const fullDir = path.join(baseDir, dir);
    
    if (!fs.existsSync(fullDir)) {
      log.warn(`Workspace directory not found: ${fullDir}`);
      continue;
    }

    try {
      const entries = fs.readdirSync(fullDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const pkgPath = path.join(fullDir, entry.name);
        const pkgJsonPath = path.join(pkgPath, 'package.json');
        
        if (!fs.existsSync(pkgJsonPath)) continue;
        
        try {
          const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
          const srcPath = path.join(pkgPath, 'src');
          
          if (pkgJson.name && fs.existsSync(srcPath)) {
            packages.push({
              name: pkgJson.name,
              path: pkgPath,
              srcPath,
            });
          }
        } catch (error) {
          log.warn(`Failed to parse ${pkgJsonPath}: ${error}`);
        }
      }
    } catch (error) {
      log.warn(`Failed to read directory ${fullDir}: ${error}`);
    }
  }

  return packages;
}

/**
 * Generate Vite-compatible alias configuration from workspace packages
 */
export function generateViteAliases(
  customAliases: Record<string, string> = {}
): Record<string, string> {
  const aliases: Record<string, string> = {
    // Core app aliases
    '@app': path.resolve(paths.rootPath, 'src/app'),
    '@components': path.resolve(paths.rootPath, 'src/app/components'),
    '@': path.resolve(paths.rootPath, 'src'),
    ...customAliases,
  };

  // Add workspace package aliases
  const workspacePackages = discoverWorkspacePackages();
  
  for (const pkg of workspacePackages) {
    // Map package name to its src directory for live development
    aliases[pkg.name] = pkg.srcPath;
  }

  log.info(`Generated ${Object.keys(aliases).length} Vite aliases`);
  
  return aliases;
}

/**
 * Validate that all alias paths exist
 */
export function validateAliases(aliases: Record<string, string>): boolean {
  let valid = true;
  
  for (const [name, aliasPath] of Object.entries(aliases)) {
    if (!fs.existsSync(aliasPath)) {
      log.warn(`Alias path does not exist: ${name} -> ${aliasPath}`);
      valid = false;
    }
  }
  
  return valid;
}

/**
 * Get workspace aliases with validation
 */
export function getWorkspaceAliases(
  customAliases: Record<string, string> = {},
  validate: boolean = true
): Record<string, string> {
  const aliases = generateViteAliases(customAliases);
  
  if (validate) {
    validateAliases(aliases);
  }
  
  return aliases;
}

export default getWorkspaceAliases;
