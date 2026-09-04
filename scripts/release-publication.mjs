import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateReleaseRecord } from "./release-record.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const RECORD_FILES = ["release-record.json", "RELEASE-RECORD-SHA256"];

function fail(message) {
  throw new Error(`Release publication gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function safeName(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("/") || value.includes("\\") || value === "." || value === "..") fail(`${label} is not a safe filename`);
}

function filesUnder(root) {
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`evidence directory is missing: ${root}`);
  return readdirSync(root, { withFileTypes: true }).map((entry) => {
    if (!entry.isFile()) fail(`evidence directory contains a non-file entry: ${entry.name}`);
    safeName(entry.name, entry.name);
    return entry.name;
  }).sort();
}

function assertNames(actual, expected, label) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) fail(`${label} contains missing, duplicate, or unexpected assets`);
}

function copyAssets(sourceRoot, filenames, outputRoot) {
  for (const filename of filenames) {
    safeName(filename, filename);
    const source = resolve(sourceRoot, filename);
    if (!existsSync(source) || !statSync(source).isFile()) fail(`publication asset is missing: ${filename}`);
    copyFileSync(source, resolve(outputRoot, filename));
  }
}

export function assemblePublicationAssets({ npmDir, cAbiDir, recordDir, outputDir, tag, sourceCommit, assetListPath, recovery = false }) {
  const npmRoot = resolve(repositoryRoot, npmDir);
  const cAbiRoot = resolve(repositoryRoot, cAbiDir);
  const recordRoot = resolve(repositoryRoot, recordDir);
  const outputRoot = resolve(repositoryRoot, outputDir);
  const validated = validateReleaseRecord({
    npmDir: npmRoot,
    cAbiDir: cAbiRoot,
    outputDir: recordRoot,
    mode: "release",
    tag,
    sourceCommit,
    provenanceStatus: "published",
    recovery,
  });
  const record = JSON.parse(readFileSync(resolve(recordRoot, "release-record.json"), "utf8"));
  if (!isPlainObject(record) || record.mode !== "release" || record.package_name !== "@nemnesia/symbol-nem-wallet-core" || record.version !== "0.1.0" || record.tag !== tag || record.source_commit !== sourceCommit || record.npm?.provenance?.status !== "published") fail("published release record identity is invalid");
  const npmNames = record.durable_asset_list.npm.map((entry) => entry.filename);
  const cAbiNames = record.durable_asset_list.c_abi.map((entry) => entry.filename);
  assertNames(filesUnder(npmRoot), npmNames, "npm durable evidence set");
  assertNames(filesUnder(cAbiRoot), cAbiNames, "C ABI durable evidence set");
  assertNames(filesUnder(recordRoot), RECORD_FILES, "shared durable release record set");
  const allNames = [...npmNames, ...cAbiNames, ...RECORD_FILES];
  if (new Set(allNames).size !== allNames.length) fail("GitHub Release asset filenames are duplicated");
  mkdirSync(outputRoot, { recursive: true });
  if (filesUnder(outputRoot).length !== 0) fail("GitHub Release asset directory is not empty");
  copyAssets(npmRoot, npmNames, outputRoot);
  copyAssets(cAbiRoot, cAbiNames, outputRoot);
  copyAssets(recordRoot, RECORD_FILES, outputRoot);
  assertNames(filesUnder(outputRoot), allNames, "GitHub Release durable asset set");
  const assets = filesUnder(outputRoot);
  if (assetListPath !== undefined) writeFileSync(resolve(repositoryRoot, assetListPath), `${assets.join("\n")}\n`);
  return {
    package_name: record.package_name,
    version: record.version,
    tag: record.tag,
    source_commit: record.source_commit,
    npm_asset_count: npmNames.length,
    c_abi_asset_count: cAbiNames.length,
    shared_asset_count: RECORD_FILES.length,
    asset_count: assets.length,
    assets,
    release_record_sha256: validated.record.source_commit === sourceCommit ? readFileSync(resolve(recordRoot, "RELEASE-RECORD-SHA256"), "utf8").trim() : undefined,
  };
}

function argument(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index < 0) {
    if (fallback !== undefined) return fallback;
    fail(`missing ${name}`);
  }
  if (argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
  return argv[index + 1];
}

function run() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (command !== "assemble") fail("usage: assemble");
  const result = assemblePublicationAssets({
    npmDir: argument(argv, "--npm-dir"),
    cAbiDir: argument(argv, "--c-abi-dir"),
    recordDir: argument(argv, "--record-dir"),
    outputDir: argument(argv, "--output"),
    tag: argument(argv, "--tag"),
    sourceCommit: argument(argv, "--source-commit"),
    assetListPath: argv.includes("--asset-list") ? argument(argv, "--asset-list") : undefined,
    recovery: argv.includes("--recovery"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
