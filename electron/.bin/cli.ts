#!/usr/bin/env node
import fs from "fs";
import path from "path";

const target = process.argv[2] || "new-quantum-app";
fs.cpSync(path.resolve(__dirname, "../template"), path.resolve(process.cwd(), target));
console.log(`✨ Created ${target} with Quantum Electron template!`);
