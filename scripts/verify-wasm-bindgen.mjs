import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const lockfile = readFileSync(resolve(repositoryRoot, "Cargo.lock"), "utf8");
const lockMatches = [...lockfile.matchAll(/\[\[package\]\]\nname = "wasm-bindgen"\nversion = "([^"]+)"/g)];
if (lockMatches.length !== 1) throw new Error("Cargo.lock must resolve exactly one wasm-bindgen package");
const wasmBindgenVersion = lockMatches[0][1];
const binary = process.argv[2] ?? process.env.WASM_BINDGEN_BIN ?? "wasm-bindgen";
let output;
try {
  output = execFileSync(binary, ["--version"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
} catch (error) {
  output = typeof error?.stdout === "string" ? error.stdout : "";
  if (output.length === 0) throw error;
}
const match = output.match(/\bwasm-bindgen\s+(\d+\.\d+\.\d+)\b/);
const cliVersion = match?.[1];

if (cliVersion !== wasmBindgenVersion) {
  throw new Error(
    `wasm-bindgen version mismatch: Cargo.lock=${wasmBindgenVersion}, CLI=${cliVersion ?? "unknown"}`,
  );
}

process.stdout.write(
  `${JSON.stringify({ cargo_lock_version: wasmBindgenVersion, cli_version: cliVersion, version_match: true })}\n`,
);
