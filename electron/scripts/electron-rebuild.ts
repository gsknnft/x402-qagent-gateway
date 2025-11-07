import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const electronDir = path.resolve(
  __dirname,
  "../app/dist"
);

if (!fs.existsSync(electronDir)) {
  console.log("ℹ️ Electron app directory not found, skipping rebuild.");
  process.exit(0);
}

if (process.env.ELECTRON_REBUILD_RUNNING === "1") {
  console.log("⚠️ Skipping recursive electron-rebuild (already running)");
  process.exit(0);
}

process.env.ELECTRON_REBUILD_RUNNING = "1";

try {
  console.log("🔧 Rebuilding native modules for Electron (pnpm-isolated)...");
  execSync(`pnpm exec electron-rebuild --module-dir . --force --types prod,dev,optional --filter electron-react`, {
    cwd: electronDir,
    stdio: "inherit",
    env: { ...process.env, ELECTRON_REBUILD_RUNNING: "1" }
  });
  console.log("✅ Electron rebuild complete.");
} catch (err) {
  console.error("❌ Electron rebuild failed:", err);
  process.exit(1);
}
