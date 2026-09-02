import { wasmBindgenVersionFromCanonicalLock } from "./release-evidence.mjs";

const version = wasmBindgenVersionFromCanonicalLock();

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify({ cargo_lock_version: version })}\n`);
} else {
  process.stdout.write(`${version}\n`);
}
