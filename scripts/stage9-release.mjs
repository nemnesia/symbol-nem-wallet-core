import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CANONICAL_TARGET_ORDER, NATIVE_TARGETS } from "../packages/wallet-core/src/manifest.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(repositoryRoot, "packages/wallet-core");
const REQUIRED_TARGETS = [...CANONICAL_TARGET_ORDER];

function fail(message) {
  throw new Error(`Stage 9 release gate failed: ${message}`);
}

function argument(name, argv) {
  const index = argv.indexOf(name);
  if (index < 0 || argv[index + 1] === undefined) {
    fail(`missing ${name}`);
  }
  return argv[index + 1];
}

function sha256(path) {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    fail(`cannot hash ${path}`);
  }
}

function fileSize(path) {
  try {
    const value = statSync(path);
    if (!value.isFile()) fail(`artifact is not a file: ${path}`);
    return value.size;
  } catch {
    fail(`artifact is missing: ${path}`);
  }
}

function validCommit(value) {
  return /^[0-9a-f]{40}$/.test(value);
}

function validVersion(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

function packageMetadata() {
  try {
    return JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
  } catch {
    fail("package metadata is unreadable");
  }
}

function cargoLockSha256() {
  return sha256(resolve(repositoryRoot, "Cargo.lock"));
}

function sourceCommitFromGit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
  } catch (error) {
    const output = typeof error?.stdout === "string" ? error.stdout.trim() : "";
    if (validCommit(output)) return output;
    fail("source commit is unavailable");
  }
}

function toolchainIdentifier() {
  try {
    return execFileSync("rustc", ["-Vv"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).split("\n", 1)[0].trim();
  } catch {
    fail("Rust toolchain identifier is unavailable");
  }
}

function runtimeGlibcVersion(targetId) {
  if (targetId !== "linux-x64-gnu") return undefined;
  try {
    const version = process.report?.getReport?.().header?.glibcVersionRuntime;
    if (typeof version === "string" && /^\d+\.\d+$/.test(version)) return version;
  } catch {
    // The release runner must provide glibc evidence for the Linux target.
  }
  fail("Linux native release runner did not provide glibc evidence");
}

function atLeastVersion(actual, required) {
  const [actualMajor, actualMinor] = actual.split(".").map(Number);
  const [requiredMajor, requiredMinor] = required.split(".").map(Number);
  return actualMajor > requiredMajor || actualMajor === requiredMajor && actualMinor >= requiredMinor;
}

function writeJson(path, value) {
  writeFileSync(resolve(repositoryRoot, path), `${JSON.stringify(value, null, 2)}\n`);
}

function nativeEvidence(argv) {
  const targetId = argument("--target-id", argv);
  const rustTarget = argument("--rust-target", argv);
  const artifactPath = resolve(repositoryRoot, argument("--artifact", argv));
  const outputPath = argument("--output", argv);
  const sourceCommit = argument("--source-commit", argv);
  const packageVersion = argument("--package-version", argv);
  const target = NATIVE_TARGETS[targetId];

  if (target === undefined || target.rust_target !== rustTarget) fail(`invalid target mapping: ${targetId}`);
  if (!validCommit(sourceCommit)) fail("invalid native source commit");
  if (!validVersion(packageVersion)) fail("invalid native package version");
  if (!existsSync(artifactPath) || !artifactPath.endsWith(".node")) fail(`invalid native artifact: ${artifactPath}`);

  const artifactFilename = basename(artifactPath);
  const evidence = {
    schema_version: 1,
    kind: "native",
    target_id: targetId,
    rust_target: rustTarget,
    source_commit: sourceCommit,
    package_version: packageVersion,
    cargo_lock_sha256: cargoLockSha256(),
    artifact_filename: artifactFilename,
    artifact_sha256: sha256(artifactPath),
    artifact_size: fileSize(artifactPath),
    node_api_version: 8,
    toolchain_identifier: toolchainIdentifier(),
  };
  if (targetId === "linux-x64-gnu") {
    evidence.glibc_version_runtime = runtimeGlibcVersion(targetId);
    if (!atLeastVersion(evidence.glibc_version_runtime, "2.28")) {
      fail("Linux native release runner glibc is below 2.28");
    }
  }
  writeJson(outputPath, evidence);
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
}

function readEvidence(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`invalid evidence file: ${path}`);
  }
}

function validateNative(argv) {
  const nativeRoot = resolve(repositoryRoot, argument("--native-root", argv));
  const evidenceRoot = resolve(repositoryRoot, argument("--evidence-root", argv));
  const sourceCommit = argument("--source-commit", argv);
  const packageVersion = argument("--package-version", argv);
  const outputPath = argument("--output", argv);
  const lockSha = cargoLockSha256();
  const entries = [];

  for (const targetId of REQUIRED_TARGETS) {
    const evidence = readEvidence(resolve(evidenceRoot, `${targetId}.json`));
    const artifactPath = resolve(nativeRoot, `${targetId}.node`);
    const target = NATIVE_TARGETS[targetId];
    if (
      evidence.schema_version !== 1 ||
      evidence.kind !== "native" ||
      evidence.target_id !== targetId ||
      evidence.rust_target !== target.rust_target ||
      evidence.source_commit !== sourceCommit ||
      evidence.package_version !== packageVersion ||
      evidence.cargo_lock_sha256 !== lockSha ||
      evidence.node_api_version !== 8 ||
      !existsSync(artifactPath) ||
      basename(artifactPath) !== evidence.artifact_filename ||
      sha256(artifactPath) !== evidence.artifact_sha256 ||
      fileSize(artifactPath) !== evidence.artifact_size
    ) {
      fail(`native artifact evidence mismatch: ${targetId}`);
    }
    if (targetId === "linux-x64-gnu" &&
      (typeof evidence.glibc_version_runtime !== "string" || !atLeastVersion(evidence.glibc_version_runtime, "2.28"))) {
      fail("Linux native artifact glibc evidence is below 2.28");
    }
    entries.push(evidence);
  }

  const toolchains = new Set(entries.map((entry) => entry.toolchain_identifier));
  if (toolchains.size !== 1) fail("native artifacts do not share one toolchain identifier");

  const result = {
    source_commit: sourceCommit,
    package_version: packageVersion,
    cargo_lock_sha256: lockSha,
    native_artifact_count: entries.length,
    targets: entries,
    toolchain_identifier: entries[0].toolchain_identifier,
  };
  writeJson(outputPath, result);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function validateWasm(argv) {
  const wasmPath = resolve(repositoryRoot, argument("--wasm", argv));
  const sourceCommit = argument("--source-commit", argv);
  const packageVersion = argument("--package-version", argv);
  const outputPath = argument("--output", argv);
  const evidenceIndex = argv.indexOf("--evidence");
  const evidencePath = evidenceIndex >= 0 ? argv[evidenceIndex + 1] : undefined;
  if (!validCommit(sourceCommit)) fail("invalid WASM source commit");
  if (!validVersion(packageVersion)) fail("invalid WASM package version");
  if (!existsSync(wasmPath)) fail("WASM artifact is missing");
  const evidence = {
    schema_version: 1,
    kind: "wasm",
    source_commit: sourceCommit,
    package_version: packageVersion,
    cargo_lock_sha256: cargoLockSha256(),
    artifact_filename: basename(wasmPath),
    artifact_sha256: sha256(wasmPath),
    artifact_size: fileSize(wasmPath),
  };
  if (evidencePath !== undefined) {
    const supplied = readEvidence(resolve(repositoryRoot, evidencePath));
    if (
      supplied.schema_version !== evidence.schema_version ||
      supplied.kind !== evidence.kind ||
      supplied.source_commit !== evidence.source_commit ||
      supplied.package_version !== evidence.package_version ||
      supplied.cargo_lock_sha256 !== evidence.cargo_lock_sha256 ||
      supplied.artifact_filename !== evidence.artifact_filename ||
      supplied.artifact_sha256 !== evidence.artifact_sha256 ||
      supplied.artifact_size !== evidence.artifact_size
    ) {
      fail("WASM artifact evidence mismatch");
    }
  }
  writeJson(outputPath, evidence);
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
}

function sourceMetadata() {
  const metadata = packageMetadata();
  const result = {
    source_commit: sourceCommitFromGit(),
    package_name: metadata.name,
    package_version: metadata.version,
    cargo_lock_sha256: cargoLockSha256(),
    required_native_targets: REQUIRED_TARGETS,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const [command, ...argv] = process.argv.slice(2);
if (command === "source") sourceMetadata();
else if (command === "native-evidence") nativeEvidence(argv);
else if (command === "validate-native") validateNative(argv);
else if (command === "wasm-evidence") validateWasm(argv);
else fail("usage: source | native-evidence | validate-native | wasm-evidence");
