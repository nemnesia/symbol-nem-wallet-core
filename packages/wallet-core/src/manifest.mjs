const CANONICAL_TARGET_ORDER = [
  "win32-x64-msvc",
  "darwin-x64",
  "darwin-arm64",
  "linux-x64-gnu",
];

export const NATIVE_TARGETS = Object.freeze({
  "win32-x64-msvc": Object.freeze({
    os: "windows",
    cpu: "x64",
    abi: "msvc",
    rust_target: "x86_64-pc-windows-msvc",
  }),
  "darwin-x64": Object.freeze({
    os: "macos",
    cpu: "x64",
    abi: "darwin",
    rust_target: "x86_64-apple-darwin",
  }),
  "darwin-arm64": Object.freeze({
    os: "macos",
    cpu: "arm64",
    abi: "darwin",
    rust_target: "aarch64-apple-darwin",
  }),
  "linux-x64-gnu": Object.freeze({
    os: "linux",
    cpu: "x64",
    abi: "gnu",
    libc: "glibc",
    rust_target: "x86_64-unknown-linux-gnu",
  }),
});

function manifestError() {
  throw new Error("invalid native artifact manifest");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function hasNativeTarget(targetId) {
  return Object.prototype.hasOwnProperty.call(NATIVE_TARGETS, targetId);
}

function supportsLinuxGlibc(version) {
  const match = typeof version === "string" ? /^(\d+)\.(\d+)$/.exec(version) : null;
  if (match === null) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 2 || major === 2 && minor >= 28;
}

export function validateNativeManifest(manifest, packageMeta) {
  if (!isPlainObject(manifest) || !isPlainObject(packageMeta)) {
    manifestError();
  }
  if (
    !exactKeys(manifest, [
      "schema_version",
      "package_name",
      "package_version",
      "source_commit",
      "node_api_version",
      "artifacts",
    ]) ||
    manifest.schema_version !== 1 ||
    manifest.package_name !== "@nemnesia/symbol-nem-wallet-core" ||
    manifest.package_name !== packageMeta.name ||
    manifest.package_version !== packageMeta.version ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.package_version) ||
    !/^[0-9a-f]{40}$/.test(manifest.source_commit) ||
    manifest.node_api_version !== 8 ||
    !Array.isArray(manifest.artifacts)
  ) {
    manifestError();
  }

  let previousIndex = -1;
  const seen = new Set();
  for (const artifact of manifest.artifacts) {
    if (!isPlainObject(artifact) || !nonEmptyString(artifact.target_id) || seen.has(artifact.target_id)) {
      manifestError();
    }
    if (!hasNativeTarget(artifact.target_id)) {
      manifestError();
    }
    const target = NATIVE_TARGETS[artifact.target_id];
    const keys = [
      "target_id",
      "os",
      "cpu",
      "abi",
      "rust_target",
      "relative_path",
      "artifact_filename",
      "sha256",
      "toolchain_identifier",
    ];
    if (target.libc !== undefined) {
      keys.push("libc");
    }
    if (!exactKeys(artifact, keys)) {
      manifestError();
    }
    const index = CANONICAL_TARGET_ORDER.indexOf(artifact.target_id);
    if (index <= previousIndex) {
      manifestError();
    }
    previousIndex = index;
    seen.add(artifact.target_id);
    if (
      artifact.os !== target.os ||
      artifact.cpu !== target.cpu ||
      artifact.abi !== target.abi ||
      artifact.rust_target !== target.rust_target ||
      (target.libc !== undefined && artifact.libc !== target.libc) ||
      target.libc === undefined && Object.prototype.hasOwnProperty.call(artifact, "libc")
    ) {
      manifestError();
    }
    if (
      !nonEmptyString(artifact.relative_path) ||
      artifact.relative_path.includes("\\") ||
      artifact.relative_path.includes("..") ||
      artifact.relative_path !==
        `dist/native/${artifact.target_id}/${artifact.artifact_filename}` ||
      !nonEmptyString(artifact.artifact_filename) ||
      artifact.artifact_filename.includes("/") ||
      !artifact.artifact_filename.endsWith(".node") ||
      !/^[0-9a-f]{64}$/.test(artifact.sha256) ||
      !nonEmptyString(artifact.toolchain_identifier)
    ) {
      manifestError();
    }
  }
  return manifest;
}

export function targetForRuntime(platform, arch, glibcVersionRuntime) {
  if (platform === "win32" && arch === "x64") {
    return "win32-x64-msvc";
  }
  if (platform === "darwin" && arch === "x64") {
    return "darwin-x64";
  }
  if (platform === "darwin" && arch === "arm64") {
    return "darwin-arm64";
  }
  if (
    platform === "linux" &&
    arch === "x64" &&
    supportsLinuxGlibc(glibcVersionRuntime)
  ) {
    return "linux-x64-gnu";
  }
  return null;
}

export { CANONICAL_TARGET_ORDER };
