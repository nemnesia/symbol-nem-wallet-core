import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const lockfile = readFileSync(resolve(repositoryRoot, "Cargo.lock"), "utf8");
const matches = [...lockfile.matchAll(/\[\[package\]\]\nname = "wasm-bindgen"\nversion = "([^"]+)"/g)];

if (matches.length !== 1) {
  throw new Error("Cargo.lock must resolve exactly one wasm-bindgen package");
}

const version = matches[0][1];
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error("Cargo.lock wasm-bindgen version is invalid");
}

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify({ cargo_lock_version: version })}\n`);
} else {
  process.stdout.write(`${version}\n`);
}
