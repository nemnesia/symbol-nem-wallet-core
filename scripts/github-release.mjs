import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const GITHUB_API = "https://api.github.com";
const REPOSITORY = "nemnesia/symbol-nem-wallet-core";

function fail(message) {
  throw new Error(`GitHub Release gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`${label} is unreadable or malformed`);
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function filesUnder(root) {
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`asset directory is missing: ${root}`);
  return readdirSync(root, { withFileTypes: true }).map((entry) => {
    if (!entry.isFile()) fail(`asset directory contains a non-file entry: ${entry.name}`);
    return entry.name;
  }).sort();
}

function localAssetDigests(assetRoot) {
  return Object.fromEntries(filesUnder(assetRoot).map((name) => [name, sha256(readFileSync(resolve(assetRoot, name)))]));
}

export function validateReleaseMetadata(release, { repository, tag, sourceCommit }) {
  if (repository !== REPOSITORY) fail("GitHub repository is not the approved release repository");
  if (!isPlainObject(release) || release.tag_name !== tag || release.target_commitish !== sourceCommit || release.draft !== false || release.prerelease !== false || (release.repository?.full_name !== undefined && release.repository.full_name !== repository)) {
    fail("GitHub Release metadata is not bound to the exact tag, source commit, or formal release state");
  }
  if (!Array.isArray(release.assets)) fail("GitHub Release asset metadata is missing");
  const names = release.assets.map((asset) => asset?.name);
  if (names.some((name) => typeof name !== "string") || new Set(names).size !== names.length) fail("GitHub Release asset names are duplicated or malformed");
  return true;
}

export function planMissingAssets({ release, assetRoot, repository, tag, sourceCommit, missingOutputPath }) {
  validateReleaseMetadata(release, { repository, tag, sourceCommit });
  const local = localAssetDigests(resolve(repositoryRoot, assetRoot));
  const localNames = Object.keys(local).sort();
  const remoteByName = new Map(release.assets.map((asset) => [asset.name, asset]));
  const extras = [...remoteByName.keys()].filter((name) => !Object.hasOwn(local, name));
  if (extras.length > 0) fail(`GitHub Release contains unexpected assets: ${extras.join(", ")}`);
  for (const [name, asset] of remoteByName) {
    if (typeof asset.digest === "string") {
      if (!/^sha256:[0-9a-f]{64}$/.test(asset.digest) || asset.digest.slice(7) !== local[name]) fail(`GitHub Release asset digest differs: ${name}`);
    }
  }
  const missing = localNames.filter((name) => !remoteByName.has(name));
  if (missingOutputPath !== undefined) writeFileSync(resolve(repositoryRoot, missingOutputPath), `${missing.join("\n")}${missing.length === 0 ? "" : "\n"}`);
  return { missing, existing: localNames.length - missing.length, asset_count: localNames.length };
}

async function downloadRemoteAsset(repository, assetId) {
  const token = process.env.GH_TOKEN;
  if (typeof token !== "string" || token.length === 0) fail("GH_TOKEN is unavailable for GitHub Release verification");
  let response;
  try {
    response = await fetch(`${GITHUB_API}/repos/${repository}/releases/assets/${assetId}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(120_000),
      headers: {
        accept: "application/octet-stream",
        authorization: `Bearer ${token}`,
        "user-agent": "symbol-nem-wallet-core-release-verifier",
      },
    });
  } catch {
    fail(`GitHub Release asset download failed: ${assetId}`);
  }
  if (!response.ok) fail(`GitHub Release asset download returned HTTP ${response.status}: ${assetId}`);
  try {
    return Buffer.from(await response.arrayBuffer());
  } catch {
    fail(`GitHub Release asset bytes are unreadable: ${assetId}`);
  }
}

export async function verifyReleaseAssets({ release, assetRoot, repository, tag, sourceCommit }) {
  validateReleaseMetadata(release, { repository, tag, sourceCommit });
  const root = resolve(repositoryRoot, assetRoot);
  const local = localAssetDigests(root);
  const remoteByName = new Map(release.assets.map((asset) => [asset.name, asset]));
  const localNames = Object.keys(local).sort();
  const remoteNames = [...remoteByName.keys()].sort();
  if (JSON.stringify(localNames) !== JSON.stringify(remoteNames)) fail("GitHub Release asset set differs from the exact local set");
  const tempRoot = mkdtempSync(resolve(tmpdir(), "snwc-github-release-"));
  try {
    for (const name of localNames) {
      const asset = remoteByName.get(name);
      if (!Number.isInteger(asset.id)) fail(`GitHub Release asset id is invalid: ${name}`);
      const bytes = await downloadRemoteAsset(repository, asset.id);
      if (bytes.length !== statSync(resolve(root, name)).size || sha256(bytes) !== local[name]) fail(`GitHub Release asset bytes differ: ${name}`);
      if (typeof asset.digest === "string" && asset.digest !== `sha256:${local[name]}`) fail(`GitHub Release asset digest differs: ${name}`);
      writeFileSync(resolve(tempRoot, name), bytes);
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
  return { status: "PASS", asset_count: localNames.length, assets: localNames };
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

async function run() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (command !== "plan" && command !== "verify") fail("usage: plan | verify");
  const release = readJson(resolve(repositoryRoot, argument(argv, "--release-json")), "GitHub Release metadata");
  const input = {
    release,
    assetRoot: argument(argv, "--asset-root"),
    repository: argument(argv, "--repository"),
    tag: argument(argv, "--tag"),
    sourceCommit: argument(argv, "--source-commit"),
  };
  const result = command === "plan"
    ? planMissingAssets({ ...input, missingOutputPath: argv.includes("--missing-output") ? argument(argv, "--missing-output") : undefined })
    : await verifyReleaseAssets(input);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
