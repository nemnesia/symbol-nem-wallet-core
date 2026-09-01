import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { canonicalCargoLockBytes, cargoLockSha256 } from "./release-evidence.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const canonical = canonicalCargoLockBytes();
const canonicalHash = sha256(canonical);
const crlfRepresentation = Buffer.from(canonical.toString("utf8").replace(/\r?\n/g, "\r\n"));
assert.notEqual(canonicalHash, sha256(crlfRepresentation));
assert.equal(cargoLockSha256(), canonicalHash);

const source = JSON.parse(
  execFileSync(process.execPath, ["scripts/release-evidence.mjs", "source"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }),
);
assert.equal(source.cargo_lock_sha256, canonicalHash);

process.stdout.write(
  `${JSON.stringify({
    canonical_sha256: canonicalHash,
    crlf_representation_sha256: sha256(crlfRepresentation),
    representation_independent: true,
  })}\n`,
);
