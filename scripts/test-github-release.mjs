import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { planMissingAssets, validateReleaseMetadata } from "./github-release.mjs";

// This is a local GitHub Release API fixture. It does not create or modify a release.
const repository = "nemnesia/symbol-nem-wallet-core";
const tag = "v0.1.0";
const sourceCommit = "a".repeat(40);
const root = mkdtempSync(resolve(tmpdir(), "snwc-github-release-test-"));
try {
  writeFileSync(resolve(root, "first.txt"), "first\n");
  writeFileSync(resolve(root, "second.txt"), "second\n");
  const digest = (name) => createHash("sha256").update(readFileSync(resolve(root, name))).digest("hex");
  const validRelease = {
    tag_name: tag,
    target_commitish: sourceCommit,
    draft: false,
    prerelease: false,
    repository: { full_name: repository },
    assets: [{ name: "first.txt", digest: `sha256:${digest("first.txt")}` }],
  };
  assert.equal(validateReleaseMetadata(validRelease, { repository, tag, sourceCommit }), true);
  const missingPath = resolve(root, "..", "snwc-github-release-missing.txt");
  assert.deepEqual(
    planMissingAssets({ release: validRelease, assetRoot: root, repository, tag, sourceCommit, missingOutputPath: missingPath }),
    { missing: ["second.txt"], existing: 1, asset_count: 2 },
  );
  assert.equal(readFileSync(missingPath, "utf8"), "second.txt\n");
  const completeRelease = { ...validRelease, assets: [
    ...validRelease.assets,
    { name: "second.txt", digest: `sha256:${digest("second.txt")}` },
  ] };
  assert.deepEqual(
    planMissingAssets({ release: completeRelease, assetRoot: root, repository, tag, sourceCommit }),
    { missing: [], existing: 2, asset_count: 2 },
  );
  assert.throws(
    () => planMissingAssets({ release: { ...completeRelease, assets: [...completeRelease.assets, { name: "unexpected.txt" }] }, assetRoot: root, repository, tag, sourceCommit }),
    /unexpected assets/,
  );
  assert.throws(
    () => planMissingAssets({ release: { ...completeRelease, assets: [{ ...completeRelease.assets[0], digest: `sha256:${"f".repeat(64)}` }, completeRelease.assets[1]] }, assetRoot: root, repository, tag, sourceCommit }),
    /digest differs/,
  );
} finally {
  rmSync(resolve(root, "..", "snwc-github-release-missing.txt"), { force: true });
  rmSync(root, { recursive: true, force: true });
}

process.stdout.write("GitHub Release deterministic tests passed (fixture only)\n");
