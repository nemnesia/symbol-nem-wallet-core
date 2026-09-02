import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { wasmBindgenVersionFromCanonicalLock } from "./release-evidence.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const wasmBindgenVersion = wasmBindgenVersionFromCanonicalLock();
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
