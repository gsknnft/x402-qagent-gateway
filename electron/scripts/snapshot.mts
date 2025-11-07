import fs from "fs"
import { execSync } from "child_process"



const date = new Date().toISOString().replace(/[:.]/g, "-")
fs.mkdirSync("snapshots", { recursive: true })
execSync(`cp pnpm-lock.yaml snapshots/lock-${date}.yaml`)
execSync(`pnpm list -r > snapshots/tree-${date}.txt`)
console.log(`🪩 Snapshot saved to snapshots/lock-${date}.yaml`)
