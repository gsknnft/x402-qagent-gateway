# Build System Documentation

## Overview

This project uses a production-grade build system with TypeScript, Vite, and PNPM workspaces. The build system is designed for:

- **Live Development**: Hot module reload across all workspace packages
- **Incremental Builds**: Persistent caching for faster rebuilds
- **Clean Production**: Isolated builds with no symlinks or workspace leaks
- **Multi-Platform CI/CD**: Ready for automated deployment to macOS, Windows, and Linux

## Architecture

### TypeScript Configuration

The project uses strict TypeScript configurations per layer:

- **`tsconfig.base.json`**: Base configuration shared across all layers
- **`tsconfig.main.json`**: Main process (Node.js runtime)
- **`tsconfig.preload.json`**: Preload scripts (secure bridge)
- **`tsconfig.renderer.json`**: Renderer process (React + DOM)

Each configuration enforces:
- Strict type checking
- No implicit any
- Proper module boundaries
- Source maps for debugging

### Build Targets

The application is built in three separate sections:

1. **Main Process** (`src/main/`)
   - Electron main process
   - Node.js APIs
   - Output: `app/dist/main/index.js`

2. **Preload Scripts** (`src/preload/`)
   - Context bridge for secure IPC
   - Limited API exposure
   - Output: `app/dist/preload/index.js`

3. **Renderer Process** (`src/renderer/`)
   - React application
   - Browser APIs
   - Output: `app/dist/renderer/`

### Vite Configuration

Each build target has its own Vite config with:

- **Persistent caching**: `node_modules/.vite-{target}/`
- **Environment-aware minification**: Production only
- **Source maps**: Always enabled for debugging
- **Workspace aliases**: Centralized in `scripts/workspace-aliases.ts`

## Prerequisites

### Required Dependencies

Before building, ensure all dependencies are installed:

```bash
# Install all dependencies (including build tools)
pnpm install
```

Key build dependencies include:
- **fs-extra**: Enhanced file system operations (with fallback to native fs)
- **yaml**: YAML configuration parsing
- **chalk**: Colored terminal output
- **rimraf**: Cross-platform file deletion
- **cross-env**: Environment variable management

All build scripts gracefully fallback to native Node.js modules if enhanced dependencies are unavailable.

## Build Scripts

### Development

```bash
# Check development environment
pnpm dev:check

# Start development server with hot reload
pnpm dev

# Build individual sections
pnpm build:main
pnpm build:preload
pnpm build:renderer
```

### Production

```bash
# Full production build
pnpm build

# Clean all build artifacts
pnpm clean

# Clean only caches
pnpm clean:cache

# Package for distribution
pnpm package
```

### Native Modules

```bash
# Rebuild native modules for Electron
pnpm rebuild:electron

# Full rebuild with all dependency types
pnpm rebuild
```

## Environment Variables

### Development (`.env.development`)

```env
NODE_ENV=development
VSCODE_DEBUG=true
```

### Production (`.env.production`)

```env
NODE_ENV=production
APP_ENV=production
VITE_BUILD_MINIFY=true
VITE_BUILD_SOURCEMAP=false
CI=true
ELECTRON_BUILDER_NODE_INSTALLER=pnpm
ELECTRON_BUILDER_PREFER_GLOBAL=true
```

## Workspace Aliases

Workspace package aliases are managed through TypeScript path mappings in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["./src/app/*"],
      "@/*": ["./src/*"],
      // ... other workspace packages
    }
  }
}
```

Vite configs use the `vite-tsconfig-paths` plugin to automatically resolve these aliases:

```typescript
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, '../src/app'),
      '@': path.resolve(__dirname, '../src'),
    },
  },
});
```

This ensures:
- Consistent alias resolution across all build targets
- Automatic TypeScript path mapping support
- Live linking to package source in development
- Proper bundling in production

## Build Caching

### Cache Locations

- Vite main cache: `node_modules/.vite-main/`
- Vite preload cache: `node_modules/.vite-preload/`
- Vite renderer cache: `node_modules/.vite-renderer/`
- TypeScript cache: `*.tsbuildinfo` (gitignored)

### Cache Management

Caches are automatically managed by Vite but can be cleared:

```bash
# Clear all build caches
pnpm clean:cache

# Clear specific cache
rm -rf node_modules/.vite-main
```

## Logging and Error Handling

Build scripts use structured logging:

```typescript
import { createLogger } from './scripts/logger';

const logger = createLogger('context');

logger.section('Build Step');
logger.info('Information message');
logger.success('Success message');
logger.warn('Warning message');
logger.error('Error message', error);
```

Safe command execution:

```typescript
import { execStrict, execSafe } from './scripts/exec-safe';

// Throws on failure
execStrict('vite build', {}, 'build');

// Returns success boolean
const success = execSilent('optional-command', {}, 'optional');
```

## Packaging for Distribution

### Electron Builder Configuration

The project uses `electron-builder.yml` for packaging:

```bash
# Create distributable for current platform
pnpm package

# Create and publish release
pnpm package:publish
```

### Platform-Specific Builds

**macOS**:
- DMG and ZIP archives
- Universal binaries (x64 + arm64)
- Code signing and notarization ready

**Windows**:
- NSIS installer
- Portable executable
- x64 and ia32 architectures

**Linux**:
- AppImage
- Deb packages
- RPM packages
- x64 and arm64 architectures

## CI/CD Integration

The build system is designed for CI/CD pipelines:

1. **Environment Detection**: Automatic based on `NODE_ENV` and `CI` variables
2. **Cache Optimization**: Persistent caches for faster builds
3. **Error Handling**: Proper exit codes and error messages
4. **Artifact Management**: Clean output in `release/builds/`

### Example GitHub Actions Workflow

```yaml
name: Build and Package

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Setup PNPM
        uses: pnpm/action-setup@v2
        with:
          version: 10
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build
        run: pnpm build
        env:
          NODE_ENV: production
          
      - name: Package
        run: pnpm package
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist-${{ matrix.os }}
          path: release/builds/
```

## Troubleshooting

### Build Failures

1. **Clear caches**: `pnpm clean:cache`
2. **Rebuild native modules**: `pnpm rebuild:electron`
3. **Clean install**: `rm -rf node_modules && pnpm install`

### Native Module Issues

```bash
# Check native dependencies
ts-node scripts/check-native-dep.ts

# Force rebuild
pnpm rebuild:electron --force
```

### Workspace Linking Issues

```bash
# Scan and fix circular symlinks
ts-node scripts/linkConfigs.ts

# Validate workspace aliases
ts-node scripts/workspace-aliases.ts
```

## Performance Optimization

### Build Performance

- **Incremental builds**: Only changed files are rebuilt
- **Parallel builds**: Use `concurrently` for parallel execution
- **Persistent caching**: Vite caches dependencies and transforms
- **Code splitting**: Vendor chunks separated for better caching

### Development Performance

- **HMR (Hot Module Reload)**: Instant updates without full reload
- **Fast Refresh**: React components update preserving state
- **Workspace linking**: Direct source linking without build step
- **Source maps**: Fast debugging with original source files

## Best Practices

1. **Always run `pnpm dev:check` before starting development**
2. **Use `pnpm build` instead of individual build commands**
3. **Clear caches if encountering strange build issues**
4. **Keep native modules up to date with `pnpm rebuild:electron`**
5. **Test packaging locally before pushing to CI/CD**
6. **Review `electron-builder.yml` for platform-specific settings**

## File Structure

```
quantum-electron/
├── app/                        # Build output staging
│   ├── dist/                   # Vite build outputs
│   │   ├── main/              # Main process build
│   │   ├── preload/           # Preload scripts build
│   │   └── renderer/          # Renderer process build
│   └── package.json           # App package manifest
├── configs/                    # Build configurations
│   ├── vite.main.config.ts
│   ├── vite.preload.config.ts
│   └── vite.renderer.config.ts
├── scripts/                    # Build scripts
│   ├── build.ts               # Production build script
│   ├── dev.ts                 # Development setup script
│   ├── logger.ts              # Structured logging
│   ├── exec-safe.ts           # Safe command execution
│   ├── workspace-aliases.ts   # Centralized alias config
│   ├── types.ts               # Type definitions
│   └── postinstall.ts         # Post-install orchestration
├── src/                        # Source code
│   ├── main/                  # Main process
│   ├── preload/               # Preload scripts
│   └── renderer/              # Renderer process
├── release/                    # Distribution artifacts
│   ├── app/                   # Packaged app directory
│   └── builds/                # Final distributables
├── electron-builder.yml        # Packaging configuration
├── tsconfig.base.json         # Base TypeScript config
├── tsconfig.main.json         # Main process config
├── tsconfig.preload.json      # Preload config
├── tsconfig.renderer.json     # Renderer config
├── .env.development           # Development environment
└── .env.production            # Production environment
```
