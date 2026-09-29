import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

export const EXPECTED_COCOAPODS_VERSION = "1.16.2";
export const EXPECTED_PODFILE_SHA256 = "49a8c3ad8c3317d1838bbb3752ab0f0ce6dde6ee19bb1524086785fda25a3506";
export const EXPECTED_PODFILE_LOCK_SHA256 = "cb98167edd20972f96802c97f84efba311ee5f65eb40cfb4edf36ccfd9962973";

function fail(message) {
  throw new Error(`React Native Pod graph validation failed: ${message}`);
}

function digest(path, label) {
  try {
    const bytes = readFileSync(path);
    if (!statSync(path).isFile()) fail(`${label} is not a file`);
    return createHash("sha256").update(bytes).digest("hex");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("React Native Pod graph validation failed:")) throw error;
    fail(`${label} is missing or unreadable`);
  }
}

export function assertPodfileLockUnchanged(before, after) {
  if (!Buffer.isBuffer(before) || !Buffer.isBuffer(after) || !before.equals(after)) {
    fail("CocoaPods attempted to mutate the source-controlled Podfile.lock");
  }
}

export function validatePodfileLock(root, options = {}) {
  const podfilePath = resolve(root, "ios/Podfile");
  const lockPath = resolve(root, "ios/Podfile.lock");
  const expectedPodfileSha256 = options.expectedPodfileSha256 ?? EXPECTED_PODFILE_SHA256;
  const expectedLockSha256 = options.expectedLockSha256 ?? EXPECTED_PODFILE_LOCK_SHA256;
  const podfileSha256 = digest(podfilePath, "Podfile");
  const lockfileSha256 = digest(lockPath, "Podfile.lock");
  const podfile = readFileSync(podfilePath, "utf8");
  const lockfile = readFileSync(lockPath, "utf8");
  if (podfileSha256 !== expectedPodfileSha256) fail("Podfile does not match the canonical source-controlled input");
  if (lockfileSha256 !== expectedLockSha256) fail("Podfile.lock does not match the canonical source-controlled resolved graph");
  const escapedCocoaPodsVersion = EXPECTED_COCOAPODS_VERSION.replaceAll(".", "\\.");
  if (
    !podfile.includes("pod 'SymbolNemWalletCoreRN', :path => ENV.fetch('SNWC_RN_POD_PATH', '../../../../packages/wallet-core/ios')") ||
    !/^PODS:\n/m.test(lockfile) ||
    !/^DEPENDENCIES:\n/m.test(lockfile) ||
    !/^EXTERNAL SOURCES:\n/m.test(lockfile) ||
    !/^SPEC CHECKSUMS:\n/m.test(lockfile) ||
    !/^PODFILE CHECKSUM: [0-9a-f]{40}$/m.test(lockfile) ||
    !new RegExp(`^COCOAPODS: ${escapedCocoaPodsVersion}$`, "m").test(lockfile) ||
    !/^\s*- SymbolNemWalletCoreRN \(0\.1\.0\):?$/m.test(lockfile) ||
    !/^\s*- React-Core(?: \(= 0\.87\.0\))?$/m.test(lockfile) ||
    !/^\s*- React-RCTAppDelegate(?: \(= 0\.87\.0\))?$/m.test(lockfile) ||
    !/^\s*- ReactCodegen(?: \(= 0\.87\.0\))?$/m.test(lockfile) ||
    !/^\s*- React-jsi(?: \(= 0\.87\.0\))?$/m.test(lockfile) ||
    !/^\s*- ReactCommon\/turbomodule\/core(?: \(= 0\.87\.0\))?$/m.test(lockfile) ||
    !/^  SymbolNemWalletCoreRN:\n    :path: "?\.\.\/\.\.\/\.\.\/\.\.\/packages\/wallet-core\/ios"?$/m.test(lockfile)
  ) {
    fail("Podfile.lock is incomplete or is not the actual RN 0.87.0 consumer graph");
  }
  return { podfileSha256, lockfileSha256, lockfile };
}
