import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_PODFILE_LOCK_SHA256,
  EXPECTED_PODFILE_SHA256,
  assertPodfileLockUnchanged,
  validatePodfileLock,
} from "./react-native-pod-lock.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = resolve(repositoryRoot, "integration/react-native/consumer");
const sourcePodfile = resolve(sourceRoot, "ios/Podfile");
const sourceLockfile = resolve(sourceRoot, "ios/Podfile.lock");

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

validatePodfileLock(sourceRoot, {
  expectedPodfileSha256: EXPECTED_PODFILE_SHA256,
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
expectFailure("Podfile and Podfile.lock mismatch", iosRoot => {
  const path = resolve(iosRoot, "Podfile");
  writeFileSync(path, `${readFileSync(path, "utf8")}\n# modified\n`);
});
expectFailure("source-controlled graph mismatch", iosRoot => {
  const path = resolve(iosRoot, "Podfile.lock");
  writeFileSync(path, readFileSync(path, "utf8").replace("SymbolNemWalletCoreRN: 3c409f1d68c8c66e054ad31d44cde678c8c6b422", "SymbolNemWalletCoreRN: 0000000000000000000000000000000000000000"));
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
