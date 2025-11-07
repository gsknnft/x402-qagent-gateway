/**
 * Development environment setup and verification script
 */
import { createLogger } from './logger';
import { execStrict } from './exec-safe';
import fs from 'fs';
import path from 'path';
import paths from './paths';

const logger = createLogger('dev');

async function main() {
  logger.section("Development Environment Setup");

  // Check Node version
  logger.info(`Node.js version: ${process.version}`);
  const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
  if (nodeVersion < 18) {
    logger.error("Node.js version 18 or higher is required");
    process.exit(1);
  }
  logger.success("Node.js version check passed");

  // Check if PNPM is installed
  try {
    execStrict('pnpm --version', { stdio: 'pipe' }, 'pnpm-check');
    logger.success("PNPM is installed");
  } catch (error) {
    logger.error("PNPM is not installed. Please install it with: npm install -g pnpm");
    process.exit(1);
  }

  // Check if dependencies are installed
  if (!fs.existsSync(path.join(paths.rootPath, 'node_modules'))) {
    logger.warn("Dependencies not installed. Running pnpm install...");
    try {
      execStrict('pnpm install', {}, 'install');
      logger.success("Dependencies installed");
    } catch (error) {
      logger.error("Failed to install dependencies", error);
      process.exit(1);
    }
  } else {
    logger.success("Dependencies are installed");
  }

  // Check if app directory exists
  if (!fs.existsSync(paths.appPath)) {
    logger.info("Creating app directory...");
    fs.mkdirSync(paths.appPath, { recursive: true });
  }

  // Verify build configuration
  const requiredConfigs = [
    'configs/vite.main.config.ts',
    'configs/vite.preload.config.ts',
    'configs/vite.renderer.config.ts',
  ];

  for (const config of requiredConfigs) {
    const configPath = path.join(paths.rootPath, config);
    if (!fs.existsSync(configPath)) {
      logger.error(`Required config file missing: ${config}`);
      process.exit(1);
    }
  }
  logger.success("All build configurations present");

  // Environment check
  const nodeEnv = process.env.NODE_ENV || 'development';
  logger.info(`Environment: ${nodeEnv}`);

  logger.section("Development Environment Ready");
  logger.success("All checks passed! You can now run:");
  logger.info("  pnpm dev          - Start development server");
  logger.info("  pnpm build        - Build for production");
  logger.info("  pnpm package      - Create distributable");
}

main().catch((error) => {
  logger.error("Development setup failed", error);
  process.exit(1);
});
