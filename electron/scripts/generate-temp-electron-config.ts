// scripts/generate-temp-electron-config.ts
import { execSync } from "node:child_process";
import fs from "fs";
import path from "path";
import {parse, stringify} from "yaml";
import paths from "./paths";
import { cleanVersion } from "./version-utils";

// const allowedScopes = ["@/"];

// scope to this project while non-monorepo
const allowedScopes = ["../"];

const { rootPath } = paths;

export function generateTempElectronWorkspace(rootDir = rootPath, electronDir: string, scopes = allowedScopes) {
  const tempDir = path.join(electronDir, ".temp-workspace");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  } else {
    console.log("ℹ️ Electron .temp directory detected — clearing and rebuilding...");
    execSync(`pnpm dlx rimraf "${tempDir}"`, { stdio: "inherit" })
  }

  const tempPackage = path.join(tempDir, "package.json");
  const tempWorkspace = path.join(tempDir, "pnpm-workspace.yaml");

  // ✅ Read only root metadata (never modify)
  const rootPkgPath = path.join(rootDir, "package.json");
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));

  const filteredDeps = Object.fromEntries(
    Object.entries(rootPkg.dependencies || {}).filter(([name]) =>
      allowedScopes.some(scope => name.startsWith(scope))
    )
  );
  const version = cleanVersion(rootPkg.version) || rootPkg.version;

  // ✅ Create isolated snapshot
  const tempPkg = {
    name: "@vquantum/electron-snapshot",
    version: version,
    private: true,
    dependencies: filteredDeps,
  };

  // ✅ The workspace file only points to this app (never upward)
  const rel = path.relative(tempDir, electronDir);
  if (rel.includes("..")) {
    console.warn(`⚠️ Prevented potential circular reference. Skipping path: ${rel}`);
    return;
  }

  fs.writeFileSync(tempPackage, JSON.stringify(tempPkg, null, 2));
  fs.writeFileSync(tempWorkspace, stringify({ packages: [rel] }));

  console.log(`🧩 Temp Electron workspace snapshot created at ${tempDir}`);
}
