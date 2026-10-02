import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_PODFILE_LOCK_SHA256,
  EXPECTED_PODFILE_EXECUTABLE_SHA256,
  assertPodfileLockUnchanged,
  validatePodfileLock,
} from "./react-native-pod-lock.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = resolve(repositoryRoot, "integration/react-native/consumer");
const sourcePodfile = resolve(sourceRoot, "ios/Podfile");
const sourceLockfile = resolve(sourceRoot, "ios/Podfile.lock");

// CocoaPods hashes the complete canonical Podfile, including comments.
const podfileChecksum = createHash("sha1").update(readFileSync(sourcePodfile)).digest("hex");
assert.match(readFileSync(sourceLockfile, "utf8"), new RegExp(`^PODFILE CHECKSUM: ${podfileChecksum}$`, "m"));

function expectFailure(label, mutate) {
  const root = mkdtempSync(resolve(tmpdir(), "snwc-rn-pod-lock-test-"));
  try {
    const iosRoot = resolve(root, "ios");
    mkdirSync(iosRoot, { recursive: true });
    cpSync(sourcePodfile, resolve(iosRoot, "Podfile"));
    cpSync(sourceLockfile, resolve(iosRoot, "Podfile.lock"));
    mutate(iosRoot);
    try {
      validatePodfileLock(root);
    } catch {
      return;
    }
    throw new Error(`${label} was accepted`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function expectSuccess(label, mutate) {
  const root = mkdtempSync(resolve(tmpdir(), "snwc-rn-pod-lock-test-"));
  try {
    const iosRoot = resolve(root, "ios");
    mkdirSync(iosRoot, { recursive: true });
    cpSync(sourcePodfile, resolve(iosRoot, "Podfile"));
    cpSync(sourceLockfile, resolve(iosRoot, "Podfile.lock"));
    mutate(iosRoot);
    validatePodfileLock(root);
  } catch (error) {
    throw new Error(`${label} was rejected`, { cause: error });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

validatePodfileLock(sourceRoot, {
  expectedPodfileExecutableSha256: EXPECTED_PODFILE_EXECUTABLE_SHA256,
  expectedLockSha256: EXPECTED_PODFILE_LOCK_SHA256,
});

expectFailure("missing Podfile.lock", iosRoot => unlinkSync(resolve(iosRoot, "Podfile.lock")));
expectFailure("modified Podfile.lock", iosRoot => {
  const path = resolve(iosRoot, "Podfile.lock");
  writeFileSync(path, readFileSync(path, "utf8").replace("React-Core (0.87.0)", "React-Core (0.87.1)"));
});
expectFailure("resolved Pod version modification", iosRoot => {
  const path = resolve(iosRoot, "Podfile.lock");
  writeFileSync(path, readFileSync(path, "utf8").replace("COCOAPODS: 1.16.2", "COCOAPODS: 1.16.1"));
});
expectFailure("CocoaPods metadata modification", iosRoot => {
  const path = resolve(iosRoot, "Podfile.lock");
  writeFileSync(path, readFileSync(path, "utf8").replace("COCOAPODS: 1.16.2", "COCOAPODS: 1.15.2"));
});
expectSuccess("comment-only Podfile modification", iosRoot => {
  const path = resolve(iosRoot, "Podfile");
  writeFileSync(path, `# additional comment\n\n${readFileSync(path, "utf8")}\n# modified\n`);
});
expectFailure("Podfile executable input modification", iosRoot => {
  const path = resolve(iosRoot, "Podfile");
  writeFileSync(path, readFileSync(path, "utf8").replace("platform :ios, min_ios_version_supported", "platform :ios, '15.1'"));
});
expectFailure("source-controlled graph mismatch", iosRoot => {
  const path = resolve(iosRoot, "Podfile.lock");
  writeFileSync(path, readFileSync(path, "utf8").replace(/SymbolNemWalletCoreRN: [0-9a-f]{40}/, "SymbolNemWalletCoreRN: 0000000000000000000000000000000000000000"));
});

const canonicalBytes = readFileSync(sourceLockfile);
assertPodfileLockUnchanged(canonicalBytes, Buffer.from(canonicalBytes));
try {
  assertPodfileLockUnchanged(canonicalBytes, Buffer.from(`${canonicalBytes.toString("utf8")}mutation`));
  throw new Error("install lockfile mutation was accepted");
} catch (error) {
  if (error instanceof Error && error.message === "install lockfile mutation was accepted") throw error;
}

if (!existsSync(sourceLockfile)) throw new Error("canonical Podfile.lock disappeared");
process.stdout.write("React Native Pod graph negative tests passed\n");
