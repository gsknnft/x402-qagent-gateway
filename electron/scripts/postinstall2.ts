// scripts/postinstall.ts
import { execSync } from "node:child_process";
import fs from "fs";
import path from "path";
import paths from "./paths";
import { generateTempElectronWorkspace } from "./generate-temp-electron-config";

const { rootPath, appPath, distPath } = paths;
const electronDir = appPath;
const electronPkgPath = path.join(electronDir, "package.json");

// 🧩 Helper: safe exec wrapper
function run(cmd: string, cwd = electronDir) {
  console.log(`▶ ${cmd}`);
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "true" },
  });
}

// 🧩 Helper: log section headers
function section(name: string) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧱 ${name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

(async () => {
  section("Starting Electron Postinstall");

  // 🧩 Safety check: root never touched
  if (!fs.existsSync(rootPath)) {
    console.error("❌ Root path missing. Aborting.");
    process.exit(1);
  }

  // 🧹 Clean existing build (if any)
  if (fs.existsSync(distPath)) {
    console.log(`🧹 Clearing old build output...`);
    run(`pnpm dlx rimraf "${distPath}"`);
  }

  // 🧩 Generate isolated workspace snapshot
  try {
    section("Generating Safe Workspace Snapshot");
    generateTempElectronWorkspace(rootPath, electronDir);
  } catch (err) {
    console.error("❌ Failed to generate temp workspace:", err);
  }

  // 🧩 Rebuild native modules (non-recursive)
  try {
    section("Rebuilding Native Modules");
    run(`pnpm exec electron-rebuild --module-dir . --force --types prod,dev,optional`);
  } catch (err) {
    console.warn("⚠️ electron-rebuild failed, continuing:", err);
  }

  // 🧩 Build sections
  const configsDir = path.resolve(electronDir, "configs");
  const builds = [
    { name: "main", config: path.join(configsDir, "vite.main.config.ts") },
    { name: "preload", config: path.join(configsDir, "vite.preload.config.ts") },
    { name: "renderer", config: path.join(configsDir, "vite.renderer.config.ts") },
  ];

  for (const { name, config } of builds) {
    try {
      section(`Building ${name}`);
      run(`vite build --config "${config}"`);
    } catch (err) {
      console.error(`❌ Failed to build ${name}:`, err);
      process.exit(1);
    }
  }

  section("Postinstall Complete ✅");
})();
