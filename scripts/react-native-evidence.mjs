import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_REACT_NATIVE_TARGET_ORDER,
  REACT_NATIVE_TARGETS,
  inspectReactNativeArtifact,
} from "../packages/wallet-core/src/react-native-manifest.mjs";

const EVIDENCE_KEYS = [
  "schema_version",
  "kind",
  "target_id",
  "platform",
  "environment",
  "architecture",
  "source_commit",
  "package_version",
  "artifact_filename",
  "artifact_identity",
  "artifact_input_filename",
  "artifact_sha256",
  "artifact_size",
  "toolchain_identifier",
  "binary_format",
  "binary_identity",
  "required_symbols",
  "controlled_build",
];
const CONTROLLED_BUILD_KEYS = [
  "workflow",
  "runner",
  "build_mode",
  "source_commit",
  "package_version",
  "target_id",
  "toolchain_identifier",
  "package_name",
  "consumer_gemfile_sha256",
  "consumer_gemfile_lock_sha256",
  "consumer_podfile_sha256",
  "consumer_podfile_lock_sha256",
  "consumer_manifest_sha256",
  "build_input_sha256",
];
const SUMMARY_KEYS = [
  "schema_version",
  "kind",
  "source_commit",
  "package_version",
  "artifact_count",
  "targets",
];
const SUMMARY_TARGET_KEYS = [
  "target_id",
  "artifact_sha256",
  "artifact_size",
  "artifact_identity",
  "toolchain_identifier",
  "binary_format",
  "binary_identity",
  "artifact_input_filename",
];

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const consumerManifestPath = resolve(repositoryRoot, "integration/react-native/consumer/manifest.json");
const packageJsonPath = resolve(repositoryRoot, "packages/wallet-core/package.json");
const consumerGemfilePath = resolve(repositoryRoot, "integration/react-native/consumer/Gemfile");
const consumerGemfileLockPath = resolve(repositoryRoot, "integration/react-native/consumer/Gemfile.lock");
const consumerPodfilePath = resolve(repositoryRoot, "integration/react-native/consumer/ios/Podfile");
const consumerPodfileLockPath = resolve(repositoryRoot, "integration/react-native/consumer/ios/Podfile.lock");

export const REACT_NATIVE_EVIDENCE_FILENAMES = Object.freeze({
  summary: "react-native-summary.json",
  artifacts: Object.freeze(
    Object.fromEntries(
      CANONICAL_REACT_NATIVE_TARGET_ORDER.map((targetId) => [targetId, `${targetId}.json`]),
    ),
  ),
});

function fail(message) {
  throw new Error(`React Native release evidence failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, keys, label) {
  if (!isPlainObject(value)) fail(`${label} is not an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || !actual.every((key, index) => key === expected[index])) {
    fail(`${label} has unexpected or missing fields`);
  }
}

function validCommit(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) fail(`${label} is invalid`);
}

function validVersion(value, label) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)) {
    fail(`${label} is invalid`);
  }
}

function validHash(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} is invalid`);
}

function validSize(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(`${label} is invalid`);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`${label} is unreadable`);
  }
}

function fileDigest(path) {
  try {
    const bytes = readFileSync(path);
    const stats = statSync(path);
    if (!stats.isFile()) fail("React Native artifact is not a file");
    return {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: stats.size,
    };
  } catch {
    fail("React Native artifact is missing or unreadable");
  }
}

export function consumerManifestSha256() {
  try {
    return createHash("sha256").update(readFileSync(consumerManifestPath)).digest("hex");
  } catch {
    fail("source-controlled React Native consumer manifest is unreadable");
  }
}

export function consumerGemfileLockSha256() {
  try {
    return createHash("sha256").update(readFileSync(consumerGemfileLockPath)).digest("hex");
  } catch {
    fail("source-controlled React Native Gemfile.lock is unreadable");
  }
}

function digest(path, label) {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    fail(`source-controlled React Native ${label} is unreadable`);
  }
}

export function consumerGemfileSha256() {
  return digest(consumerGemfilePath, "Gemfile");
}

export function consumerPodfileSha256() {
  return digest(consumerPodfilePath, "Podfile");
}

export function consumerPodfileLockSha256() {
  return digest(consumerPodfileLockPath, "Podfile.lock");
}

function packageIdentity() {
  const metadata = readJson(packageJsonPath, "React Native package metadata");
  if (metadata.name !== "@nemnesia/symbol-nem-wallet-core" || typeof metadata.version !== "string") {
    fail("React Native package identity is invalid");
  }
  return metadata.name;
}

export function reactNativeBuildInputSha256({
  sourceCommit,
  packageVersion,
  targetId,
  toolchainIdentifier,
}) {
  const input = {
    source_commit: sourceCommit,
    package_version: packageVersion,
    target_id: targetId,
    toolchain_identifier: toolchainIdentifier,
    package_name: packageIdentity(),
    consumer_manifest_sha256: consumerManifestSha256(),
    consumer_gemfile_sha256: consumerGemfileSha256(),
    consumer_gemfile_lock_sha256: consumerGemfileLockSha256(),
    consumer_podfile_sha256: consumerPodfileSha256(),
    consumer_podfile_lock_sha256: consumerPodfileLockSha256(),
  };
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function validateControlledBuild(value, evidence) {
  exactKeys(value, CONTROLLED_BUILD_KEYS, "controlled build evidence");
  if (
    value.workflow !== "react-native-controlled-build" ||
    typeof value.runner !== "string" ||
    value.runner.length === 0 ||
    value.build_mode !== "release" ||
    value.source_commit !== evidence.source_commit ||
    value.package_version !== evidence.package_version ||
    value.target_id !== evidence.target_id ||
    value.toolchain_identifier !== evidence.toolchain_identifier ||
    value.package_name !== "@nemnesia/symbol-nem-wallet-core" ||
    value.consumer_manifest_sha256 !== consumerManifestSha256() ||
    value.consumer_gemfile_sha256 !== consumerGemfileSha256() ||
    value.consumer_gemfile_lock_sha256 !== consumerGemfileLockSha256() ||
    value.consumer_podfile_sha256 !== consumerPodfileSha256() ||
    value.consumer_podfile_lock_sha256 !== consumerPodfileLockSha256() ||
    value.build_input_sha256 !== reactNativeBuildInputSha256({
      sourceCommit: evidence.source_commit,
      packageVersion: evidence.package_version,
      targetId: evidence.target_id,
      toolchainIdentifier: evidence.toolchain_identifier,
    })
  ) {
    fail(`controlled build identity mismatch: ${evidence.target_id}`);
  }
}

export function createReactNativeArtifactEvidence({
  targetId,
  artifactPath,
  sourceCommit,
  packageVersion,
  toolchainIdentifier,
  runner,
  artifactInputFilename = basename(artifactPath),
}) {
  const target = REACT_NATIVE_TARGETS[targetId];
  if (target === undefined) fail(`unknown React Native target: ${targetId}`);
  validCommit(sourceCommit, "source commit");
  validVersion(packageVersion, "package version");
  if (typeof toolchainIdentifier !== "string" || toolchainIdentifier.length === 0) fail("toolchain identifier is invalid");
  if (typeof runner !== "string" || runner.length === 0) fail("runner is invalid");
  let inspected;
  try {
    inspected = inspectReactNativeArtifact(artifactPath, targetId);
  } catch {
    fail(`artifact identity is invalid: ${targetId}`);
  }
  const evidence = {
    schema_version: 1,
    kind: "react-native",
    target_id: targetId,
    platform: target.platform,
    environment: target.environment,
    architecture: target.architecture,
    source_commit: sourceCommit,
    package_version: packageVersion,
    artifact_filename: target.artifactFilename,
    artifact_identity: target.artifactIdentity,
    artifact_input_filename: artifactInputFilename,
    artifact_sha256: inspected.sha256,
    artifact_size: inspected.size,
    toolchain_identifier: toolchainIdentifier,
    binary_format: inspected.binaryFormat,
    binary_identity: inspected.binaryIdentity,
    required_symbols: inspected.requiredSymbols,
    controlled_build: {
      workflow: "react-native-controlled-build",
      runner,
      build_mode: "release",
      source_commit: sourceCommit,
      package_version: packageVersion,
      target_id: targetId,
      toolchain_identifier: toolchainIdentifier,
      package_name: packageIdentity(),
      consumer_gemfile_sha256: consumerGemfileSha256(),
      consumer_gemfile_lock_sha256: consumerGemfileLockSha256(),
      consumer_podfile_sha256: consumerPodfileSha256(),
      consumer_podfile_lock_sha256: consumerPodfileLockSha256(),
      consumer_manifest_sha256: consumerManifestSha256(),
      build_input_sha256: reactNativeBuildInputSha256({
        sourceCommit,
        packageVersion,
        targetId,
        toolchainIdentifier,
      }),
    },
  };
  validateReactNativeArtifactEvidence(evidence, artifactPath, sourceCommit, packageVersion, {
    artifactInputFilename,
  });
  return evidence;
}

export function validateReactNativeArtifactEvidence(
  evidence,
  artifactPath,
  sourceCommit,
  packageVersion,
  { artifactInputFilename = basename(artifactPath) } = {},
) {
  exactKeys(evidence, EVIDENCE_KEYS, `React Native evidence ${evidence?.target_id ?? "unknown"}`);
  const target = REACT_NATIVE_TARGETS[evidence.target_id];
  if (target === undefined) fail(`unknown React Native evidence target: ${evidence.target_id}`);
  validCommit(sourceCommit, "source commit");
  validVersion(packageVersion, "package version");
  if (
    evidence.schema_version !== 1 ||
    evidence.kind !== "react-native" ||
    evidence.platform !== target.platform ||
    evidence.environment !== target.environment ||
    evidence.architecture !== target.architecture ||
    evidence.source_commit !== sourceCommit ||
    evidence.package_version !== packageVersion ||
    evidence.artifact_filename !== target.artifactFilename ||
    evidence.artifact_identity !== target.artifactIdentity ||
    typeof evidence.artifact_input_filename !== "string" ||
    evidence.artifact_input_filename.length === 0 ||
    evidence.artifact_input_filename.startsWith("/") ||
    evidence.artifact_input_filename.includes("\\") ||
    evidence.artifact_input_filename.split("/").some((part) => part === "" || part === "." || part === "..") ||
    evidence.artifact_input_filename !== artifactInputFilename ||
    typeof evidence.toolchain_identifier !== "string" ||
    evidence.toolchain_identifier.length === 0 ||
    evidence.binary_format !== (target.platform === "android" ? "ELF64" : "Mach-O-64-static-archive") ||
    !Array.isArray(evidence.required_symbols) ||
    evidence.required_symbols.length !== 2 ||
    evidence.required_symbols.some((symbol) => typeof symbol !== "string")
  ) {
    fail(`React Native evidence identity mismatch: ${evidence.target_id}`);
  }
  validHash(evidence.artifact_sha256, `React Native evidence hash ${evidence.target_id}`);
  validSize(evidence.artifact_size, `React Native evidence size ${evidence.target_id}`);
  const digest = fileDigest(artifactPath);
  if (digest.sha256 !== evidence.artifact_sha256 || digest.size !== evidence.artifact_size) {
    fail(`React Native evidence artifact digest mismatch: ${evidence.target_id}`);
  }
  let inspected;
  try {
    inspected = inspectReactNativeArtifact(artifactPath, evidence.target_id);
  } catch {
    fail(`React Native artifact identity mismatch: ${evidence.target_id}`);
  }
  if (
    inspected.binaryFormat !== evidence.binary_format ||
    JSON.stringify(inspected.binaryIdentity) !== JSON.stringify(evidence.binary_identity) ||
    JSON.stringify(inspected.requiredSymbols) !== JSON.stringify(evidence.required_symbols)
  ) {
    fail(`React Native binary evidence mismatch: ${evidence.target_id}`);
  }
  validateControlledBuild(evidence.controlled_build, evidence);
  return evidence;
}

export function createReactNativeSummary(entries, sourceCommit, packageVersion) {
  if (!Array.isArray(entries) || entries.length !== CANONICAL_REACT_NATIVE_TARGET_ORDER.length) {
    fail("React Native summary must contain exactly four artifacts");
  }
  const targets = entries.map((entry) => ({
    target_id: entry.target_id,
    artifact_sha256: entry.artifact_sha256,
    artifact_size: entry.artifact_size,
    artifact_identity: entry.artifact_identity,
    toolchain_identifier: entry.toolchain_identifier,
    binary_format: entry.binary_format,
    binary_identity: entry.binary_identity,
    artifact_input_filename: entry.artifact_input_filename,
  }));
  const summary = {
    schema_version: 1,
    kind: "react-native-summary",
    source_commit: sourceCommit,
    package_version: packageVersion,
    artifact_count: targets.length,
    targets,
  };
  validateReactNativeSummary(summary, sourceCommit, packageVersion);
  return summary;
}

export function validateReactNativeSummary(summary, sourceCommit, packageVersion) {
  exactKeys(summary, SUMMARY_KEYS, "React Native summary");
  validCommit(sourceCommit, "source commit");
  validVersion(packageVersion, "package version");
  if (
    summary.schema_version !== 1 ||
    summary.kind !== "react-native-summary" ||
    summary.source_commit !== sourceCommit ||
    summary.package_version !== packageVersion ||
    summary.artifact_count !== CANONICAL_REACT_NATIVE_TARGET_ORDER.length ||
    !Array.isArray(summary.targets) ||
    summary.targets.length !== CANONICAL_REACT_NATIVE_TARGET_ORDER.length
  ) {
    fail("React Native summary identity or count is invalid");
  }
  for (const [index, targetId] of CANONICAL_REACT_NATIVE_TARGET_ORDER.entries()) {
    const target = summary.targets[index];
    exactKeys(target, SUMMARY_TARGET_KEYS, `React Native summary target ${targetId}`);
    if (
      target.target_id !== targetId ||
      target.artifact_identity !== REACT_NATIVE_TARGETS[targetId].artifactIdentity ||
      typeof target.toolchain_identifier !== "string" ||
      target.toolchain_identifier.length === 0
    ) {
      fail(`React Native summary target order is invalid: ${targetId}`);
    }
    validHash(target.artifact_sha256, `React Native summary hash ${targetId}`);
    validSize(target.artifact_size, `React Native summary size ${targetId}`);
    if (target.binary_format !== (REACT_NATIVE_TARGETS[targetId].platform === "android" ? "ELF64" : "Mach-O-64-static-archive")) {
      fail(`React Native summary binary format is invalid: ${targetId}`);
    }
  }
  return summary;
}

export function validateReactNativeEvidenceSet({
  summaryPath,
  evidenceRoot,
  artifactRoot,
  sourceCommit,
  packageVersion,
}) {
  const summary = typeof summaryPath === "object" ? summaryPath : readJson(summaryPath, "React Native summary");
  validateReactNativeSummary(summary, sourceCommit, packageVersion);
  const entries = [];
  for (const [index, targetId] of CANONICAL_REACT_NATIVE_TARGET_ORDER.entries()) {
    const summaryTarget = summary.targets[index];
    const evidence = typeof evidenceRoot === "object"
      ? evidenceRoot[targetId]
      : readJson(resolve(evidenceRoot, REACT_NATIVE_EVIDENCE_FILENAMES.artifacts[targetId]), `React Native evidence ${targetId}`);
    const artifactPath = resolve(artifactRoot, evidence.artifact_input_filename);
    validateReactNativeArtifactEvidence(evidence, artifactPath, sourceCommit, packageVersion, {
      artifactInputFilename: evidence.artifact_input_filename,
    });
    for (const key of SUMMARY_TARGET_KEYS) {
      if (JSON.stringify(summaryTarget[key]) !== JSON.stringify(evidence[key])) fail(`React Native summary/evidence mismatch: ${targetId}`);
    }
    entries.push(evidence);
  }
  return { summary, entries };
}

export function compareReactNativeArtifacts({
  targetId,
  firstArtifactPath,
  secondArtifactPath,
  sourceCommit,
  packageVersion,
}) {
  const target = REACT_NATIVE_TARGETS[targetId];
  if (target === undefined || target.platform !== "ios") fail(`reproducibility target is not an approved iOS target: ${targetId}`);
  validCommit(sourceCommit, "source commit");
  validVersion(packageVersion, "package version");
  let first;
  let second;
  try {
    first = inspectReactNativeArtifact(firstArtifactPath, targetId);
    second = inspectReactNativeArtifact(secondArtifactPath, targetId);
  } catch {
    fail(`iOS producer artifact identity is invalid: ${targetId}`);
  }
  const firstDigest = fileDigest(firstArtifactPath);
  const secondDigest = fileDigest(secondArtifactPath);
  const binaryIdentityIdentical = JSON.stringify(first.binaryIdentity) === JSON.stringify(second.binaryIdentity);
  const metadataIdentical =
    first.binaryFormat === second.binaryFormat &&
    JSON.stringify(first.requiredSymbols) === JSON.stringify(second.requiredSymbols) &&
    first.binaryIdentity.architecture === second.binaryIdentity.architecture &&
    first.binaryIdentity.platform === second.binaryIdentity.platform;
  if (
    firstDigest.sha256 !== secondDigest.sha256 ||
    firstDigest.size !== secondDigest.size ||
    first.binaryFormat !== second.binaryFormat ||
    !binaryIdentityIdentical ||
    !metadataIdentical ||
    JSON.stringify(first.requiredSymbols) !== JSON.stringify(second.requiredSymbols)
  ) {
    fail(`independent iOS producer outputs differ: ${targetId}`);
  }
  const result = {
    schema_version: 1,
    kind: "react-native-ios-reproducibility",
    target_id: targetId,
    platform: target.platform,
    environment: target.environment,
    architecture: target.architecture,
    source_commit: sourceCommit,
    package_version: packageVersion,
    artifact_filename: target.artifactFilename,
    artifact_identity: target.artifactIdentity,
    producer_runs: [
      {
        run_id: "producer-1",
        artifact_filename: basename(firstArtifactPath),
        artifact_sha256: firstDigest.sha256,
        artifact_size: firstDigest.size,
        binary_format: first.binaryFormat,
        binary_identity: first.binaryIdentity,
        required_symbols: first.requiredSymbols,
      },
      {
        run_id: "producer-2",
        artifact_filename: basename(secondArtifactPath),
        artifact_sha256: secondDigest.sha256,
        artifact_size: secondDigest.size,
        binary_format: second.binaryFormat,
        binary_identity: second.binaryIdentity,
        required_symbols: second.requiredSymbols,
      },
    ],
    comparison: {
      bytes_identical: firstDigest.sha256 === secondDigest.sha256 && firstDigest.size === secondDigest.size,
      native_identity_identical: binaryIdentityIdentical,
      architecture_identical: first.binaryIdentity.architecture === second.binaryIdentity.architecture,
      metadata_identical: metadataIdentical,
      digest_identical: firstDigest.sha256 === secondDigest.sha256,
    },
  };
  return result;
}

export function writeReactNativeEvidence(path, evidence) {
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`);
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
  return argv[index + 1];
}

function run() {
  const [command, ...argv] = process.argv.slice(2);
  if (command === "artifact") {
    const evidence = createReactNativeArtifactEvidence({
      targetId: argument(argv, "--target-id"),
      artifactPath: argument(argv, "--artifact"),
      artifactInputFilename: argument(argv, "--artifact-input-filename"),
      sourceCommit: argument(argv, "--source-commit"),
      packageVersion: argument(argv, "--package-version"),
      toolchainIdentifier: argument(argv, "--toolchain-identifier"),
      runner: argument(argv, "--runner"),
    });
    writeReactNativeEvidence(argument(argv, "--output"), evidence);
    process.stdout.write(`${JSON.stringify(evidence)}\n`);
    return;
  }
  if (command === "summary") {
    const evidenceRoot = resolve(argument(argv, "--evidence-root"));
    const sourceCommit = argument(argv, "--source-commit");
    const packageVersion = argument(argv, "--package-version");
    const entries = CANONICAL_REACT_NATIVE_TARGET_ORDER.map((targetId) => readJson(
      resolve(evidenceRoot, REACT_NATIVE_EVIDENCE_FILENAMES.artifacts[targetId]),
      `React Native evidence ${targetId}`,
    ));
    const summary = createReactNativeSummary(entries, sourceCommit, packageVersion);
    writeReactNativeEvidence(argument(argv, "--output"), summary);
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    return;
  }
  if (command === "compare") {
    const result = compareReactNativeArtifacts({
      targetId: argument(argv, "--target-id"),
      firstArtifactPath: argument(argv, "--first"),
      secondArtifactPath: argument(argv, "--second"),
      sourceCommit: argument(argv, "--source-commit"),
      packageVersion: argument(argv, "--package-version"),
    });
    writeReactNativeEvidence(argument(argv, "--output"), result);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  fail("usage: artifact | summary | compare");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  run();
}
