import { execSync } from "node:child_process";
import path from "node:path";

const run = (cmd: string, cwd?: string) => {
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "true",
      ELECTRON_BUILDER_NODE_INSTALLER: "pnpm",
      ELECTRON_BUILDER_PREFER_GLOBAL: "true",
    },
  });
};

const appDir = path.resolve(__dirname, "../release/app");

console.log("⚙️ Running postinstall orchestration...");

try {
  // Ensure pm
  run("ts-node ./scripts/ensure-package-manager.ts");

  // Update electron
  run("ts-node ./scripts/update-electron-version.ts");

  // Check native deps
  run("ts-node ./scripts/check-native-dep.ts");

  // Install app deps (builder internal)
  run("pnpm exec electron-builder install-app-deps", appDir);

  // Rebuild native modules safely
  run("pnpm exec electron-rebuild --force --types prod,dev,optional --module-dir .", appDir);

  // Build DLL
  run("pnpm run build:dll", path.resolve(__dirname, "../"));

  console.log("✅ Postinstall completed successfully.");
} catch (err) {
  console.error("❌ Postinstall orchestration failed:", err);
  process.exit(1);
}
