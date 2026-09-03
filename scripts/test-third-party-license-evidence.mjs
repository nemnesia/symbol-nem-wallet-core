import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import {
  DEFAULT_MANIFEST_PATH,
  loadThirdPartyLicenseEvidence,
  readThirdPartyLicenseText,
  thirdPartyLicenseEvidenceMetadata,
  thirdPartyLicenseEvidenceForComponent,
  validateThirdPartyLicenseEvidenceMetadata,
} from "./third-party-license-evidence.mjs";

const entries = loadThirdPartyLicenseEvidence();
assert.deepEqual(entries.map((entry) => entry.name).sort(), [
  "bitcoin_hashes",
  "napi",
  "napi-derive",
  "napi-derive-backend",
  "napi-sys",
]);
for (const entry of entries) {
  const component = {
    name: entry.name,
    version: entry.version,
    source: entry.source,
    license_expression: entry.spdx_license,
  };
  const resolved = thirdPartyLicenseEvidenceForComponent(component);
  assert.equal(resolved.upstream_repository.includes("github.com/"), true);
  assert.equal(readThirdPartyLicenseText(resolved).length > 0, true);
  validateThirdPartyLicenseEvidenceMetadata(component, thirdPartyLicenseEvidenceMetadata(entry));
  assert.throws(
    () => thirdPartyLicenseEvidenceForComponent({ ...component, license_expression: "Apache-2.0" }),
    /license expression differs/,
  );
  assert.throws(
    () => validateThirdPartyLicenseEvidenceMetadata(component, { ...thirdPartyLicenseEvidenceMetadata(entry), upstream_blob_sha1: "0".repeat(40) }),
    /identity mismatch/,
  );
  assert.throws(
    () => readThirdPartyLicenseText({ ...entry, collected_text_sha256: "0".repeat(64) }),
    /digest mismatch/,
  );
}

const tamperedManifestRoot = mkdtempSync(resolve(tmpdir(), "snwc-third-party-evidence-test-"));
try {
  const tamperedManifest = JSON.parse(readFileSync(DEFAULT_MANIFEST_PATH, "utf8"));
  tamperedManifest.entries[0].upstream_blob_sha1 = "0".repeat(40);
  const tamperedManifestPath = resolve(tamperedManifestRoot, "manifest.json");
  writeFileSync(tamperedManifestPath, `${JSON.stringify(tamperedManifest, null, 2)}\n`);
  assert.throws(() => loadThirdPartyLicenseEvidence(tamperedManifestPath), /upstream blob identity mismatch/);
} finally {
  rmSync(tamperedManifestRoot, { recursive: true, force: true });
}

process.stdout.write("third-party license evidence deterministic and negative tests passed\n");
