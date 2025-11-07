# CI/CD Guide for Quantum Electron

## Overview

This project uses GitHub Actions for continuous integration and deployment. The workflows are configured to work with PNPM, the project's package manager.

## Workflows

### 1. Test Workflow (`.github/workflows/test.yml`)

**Triggers:** Push and Pull Request events

**Platforms:** macOS, Windows, Linux (Ubuntu)

**Steps:**
1. **Checkout** - Clone the repository
2. **Setup Node.js** - Install Node.js 20
3. **Setup PNPM** - Install PNPM 10
4. **Cache Dependencies** - Cache PNPM store for faster builds
5. **Install Dependencies** - Run `pnpm install`
6. **Lint** - Run ESLint to check code quality
7. **TypeScript Check** - Verify TypeScript compilation without emitting files
8. **Tests** - Run Jest tests
9. **Build** - Create production build
10. **Package** - Create distributable (Ubuntu only to avoid redundant builds)

**Environment Variables:**
- `GH_TOKEN` - GitHub token for authenticated operations
- `NODE_ENV=production` - For production builds
- `CI=true` - Automatically set by GitHub Actions, enables graceful postinstall behavior

**Postinstall Behavior in CI:**
- Release package copying is automatically skipped in CI environments
- Build errors are logged but don't fail the workflow immediately
- Native module rebuilds use graceful fallbacks

### 2. CodeQL Analysis (`.github/workflows/codeql-analysis.yml`)

**Triggers:** 
- Push to `main` branch
- Pull requests to `main` branch
- Weekly schedule (Thursday at 16:44 UTC)

**Purpose:** Security scanning and vulnerability detection

**Steps:**
1. **Checkout** - Clone the repository
2. **Setup Node.js & PNPM** - Install build tools
3. **Cache Dependencies** - Cache PNPM store
4. **Initialize CodeQL** - Setup security scanning
5. **Install Dependencies** - Run `pnpm install`
6. **Build** - Create production build for analysis
7. **Analyze** - Perform security analysis

## Key Changes from Original

### ✅ Fixed: Package Manager Mismatch

**Previous Issue:** Workflows used `npm` while project uses `pnpm`

**Fix:** Updated all workflows to:
- Use `pnpm/action-setup@v2` to install PNPM
- Replace `npm install` with `pnpm install`
- Replace `npm run` commands with `pnpm run`
- Replace `npm exec` with `pnpm exec`

### ✅ Improved: Caching Strategy

Added PNPM store caching to speed up builds:

```yaml
- name: Get pnpm store directory
  shell: bash
  run: |
    echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Setup pnpm cache
  uses: actions/cache@v3
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-
```

**Benefits:**
- Faster CI runs (cached dependencies)
- Reduced bandwidth usage
- Consistent dependency versions

### ✅ Enhanced: Build Process

**Test Workflow:**
- Runs linting before tests
- Separate TypeScript compilation check
- Production build verification
- Packaging only on Ubuntu (faster, single platform)

**CodeQL Workflow:**
- Manual build step instead of autobuild
- Better control over build process
- Explicit production environment

## Required Dependencies

The project requires the following key dependencies to be installed via PNPM:

**Core Build Dependencies:**
- `fs-extra` (^11.2.0) - Enhanced file system operations with fallback to native fs
- `yaml` (^2.3.4) - YAML parsing for workspace configuration
- `chalk` (^4.1.2) - Terminal string styling for logs
- `rimraf` (^6.0.1) - Cross-platform file deletion
- `cross-env` (^7.0.3) - Cross-platform environment variables

**Type Definitions:**
- `@types/fs-extra` (^11.0.4) - TypeScript types for fs-extra
- `@types/node` (^24.7.2) - Node.js type definitions

These are automatically installed when you run `pnpm install`.

## Troubleshooting

### Test Failures

**Issue:** Tests fail with "Cannot find module" errors

**Solution:**
1. Ensure all dependencies are in `package.json`
2. Run `pnpm install` to install missing dependencies
3. Clear PNPM cache: `pnpm store prune`
4. Reinstall: `pnpm install --frozen-lockfile`

**Issue:** "Cannot find module 'fs-extra'" or "Cannot find module 'yaml'"

**Solution:**
1. These dependencies were added to fix missing imports in build scripts
2. Run `pnpm install` to add them
3. The scripts have fallbacks to native Node.js modules where possible

**Issue:** Native module build failures

**Solution:**
1. Check Electron version matches in all configs
2. Run: `pnpm rebuild:electron`
3. Verify native dependencies in `package.json`

### CodeQL Failures

**Issue:** CodeQL analysis times out or fails

**Solution:**
1. Reduce build complexity (disable minification)
2. Add `timeout-minutes: 30` to CodeQL job
3. Use CodeQL config file to exclude large generated files

**Issue:** False positives in security scanning

**Solution:**
1. Review CodeQL results in GitHub Security tab
2. Add suppressions for false positives:
   ```yaml
   # .github/codeql/codeql-config.yml
   queries:
     - uses: security-and-quality
   paths-ignore:
     - node_modules
     - app/dist
     - release
   ```

### Build Failures

**Issue:** TypeScript compilation errors

**Solution:**
1. Run locally: `pnpm exec tsc --noEmit`
2. Check `tsconfig.*.json` files for conflicts
3. Ensure all imports are correct

**Issue:** Missing dependencies in CI

**Solution:**
1. Verify `pnpm-lock.yaml` is committed
2. Check `package.json` has all dependencies
3. Don't rely on globally installed packages

## Local Testing

Before pushing, test the workflow locally:

### 1. Check TypeScript Compilation
```bash
pnpm exec tsc --noEmit
```

### 2. Run Linter
```bash
pnpm run lint
```

### 3. Run Tests
```bash
pnpm test
```

### 4. Build Application
```bash
NODE_ENV=production pnpm run build
```

### 5. Package Application
```bash
pnpm run package
```

## Performance Optimization

### Current Optimizations

1. **PNPM Store Caching** - Reuses dependencies between runs
2. **Single Platform Packaging** - Only Ubuntu creates packages to save time
3. **Parallel Jobs** - Test matrix runs platforms in parallel
4. **Incremental Builds** - Vite caching speeds up rebuilds

### Recommendations

1. **Split Workflows** - Separate lint, test, and build into different workflows
2. **Conditional Packaging** - Only package on tagged releases
3. **Artifact Upload** - Upload build artifacts for debugging
4. **Notification Integration** - Add Slack/Discord notifications

## Security Best Practices

1. **Keep Dependencies Updated** - Run `pnpm update` regularly
2. **Review CodeQL Results** - Check GitHub Security tab weekly
3. **Use Dependabot** - Enable automated dependency updates
4. **Secrets Management** - Never commit secrets, use GitHub Secrets

## Required Secrets

For publishing releases, configure these secrets in GitHub Settings:

- `GH_TOKEN` - GitHub Personal Access Token (automatically available)
- `APPLE_ID` - For macOS notarization (optional)
- `APPLE_ID_PASSWORD` - For macOS notarization (optional)
- `CSC_LINK` - Code signing certificate (optional)
- `CSC_KEY_PASSWORD` - Certificate password (optional)

## Workflow Status Badges

Add to README.md:

```markdown
![Test](https://github.com/gsknnft/quantum-electron/workflows/Test/badge.svg)
![CodeQL](https://github.com/gsknnft/quantum-electron/workflows/CodeQL/badge.svg)
```

## Next Steps

1. ✅ Fixed test workflow to use PNPM
2. ✅ Fixed CodeQL workflow to use PNPM
3. ✅ Added PNPM store caching
4. ✅ Separated build steps for clarity
5. 🔲 Add artifact upload for build outputs
6. 🔲 Configure Dependabot for dependency updates
7. 🔲 Add release workflow for automated publishing
8. 🔲 Set up notifications for failed builds

## Postinstall Environment Variables

The postinstall script supports several environment variables for controlling its behavior:

### Automatic Detection

- `CI` - Automatically set by GitHub Actions and other CI systems
  - When `CI=true` or `CI=1`, enables graceful failures and skips optional operations
  
- `NODE_ENV` - Standard Node.js environment variable
  - `NODE_ENV=test` - Skips release package copying and enables graceful failures
  - `NODE_ENV=production` - Full production build with all checks
  - `NODE_ENV=development` - Development mode (default)

### Manual Control

- `SKIP_RELEASE_COPY` - Explicitly skip release package preparation
  ```bash
  SKIP_RELEASE_COPY=true pnpm install
  ```

- `STRICT_POSTINSTALL` - Enforce strict error handling (fail on any error)
  ```bash
  STRICT_POSTINSTALL=true pnpm install
  ```

### Behavior Matrix

| Environment | Release Copy | Build Errors | Rebuild Errors | Exit on Failure |
|-------------|--------------|--------------|----------------|-----------------|
| CI/Test     | Skipped      | Logged       | Logged         | No (graceful)   |
| Development | Attempted    | Logged       | Logged         | No (graceful)   |
| Strict Mode | Attempted    | Fatal        | Fatal          | Yes             |

### Examples

**CI/Test Environment (Automatic):**
```bash
# GitHub Actions sets CI=true automatically
pnpm install  # Graceful, skips optional steps
```

**Local Development (Default):**
```bash
pnpm install  # Graceful, attempts all steps
```

**Strict Validation:**
```bash
STRICT_POSTINSTALL=true pnpm install  # Fails on any error
```

**Skip Release Copy:**
```bash
SKIP_RELEASE_COPY=true pnpm install  # For quick iterations
```

### Graceful Fallbacks

The postinstall script includes multiple fallback strategies:

1. **File Copying**: Uses `cpy-cli`, falls back to native `fs` operations
2. **Directory Cleanup**: Uses `rimraf`, falls back to native `fs.rmSync`
3. **Native Module Rebuild**: Logs warnings instead of failing in CI/test
4. **Build Errors**: Collects all errors before deciding whether to fail
5. **Path Resolution**: Tries multiple locations for required files

These fallbacks ensure the build process is resilient and developer-friendly.

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PNPM Action Documentation](https://github.com/pnpm/action-setup)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Electron Builder CI Documentation](https://www.electron.build/multi-platform-build)
