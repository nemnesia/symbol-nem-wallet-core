import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
  "toolchain_identifier",
  "binary_format",
  "binary_identity",
  "artifact_input_filename",
];

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
    value.toolchain_identifier !== evidence.toolchain_identifier
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
    if (target.target_id !== targetId || typeof target.toolchain_identifier !== "string" || target.toolchain_identifier.length === 0) {
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
  fail("usage: artifact | summary");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  run();
}
