import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(repositoryRoot, "tools/npm-bootstrap");
const documentationPath = resolve(repositoryRoot, "docs/migration/npm-bootstrap-publish.md");
const expectedPackageName = "@nemnesia/symbol-nem-wallet-core";
const expectedVersion = "0.0.0-bootstrap.0";
const expectedFiles = ["README.md", "package.json"];
const forbiddenManifestFields = [
  "main",
  "module",
  "exports",
  "types",
  "bin",
  "scripts",
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
];
const forbiddenExtensions = new Set([
  ".node",
  ".wasm",
  ".so",
  ".dll",
  ".dylib",
  ".a",
  ".lib",
  ".rs",
]);
const secretPatterns = [
  /-----BEGIN [^-]+ PRIVATE KEY-----/,
  /\bnpm_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];

function fail(message) {
  throw new Error(`npm bootstrap validation failed: ${message}`);
}

function check(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function filesUnder(directory, prefix = "") {
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const path = resolve(directory, name);
    const relativePath = prefix === "" ? name : `${prefix}/${name}`;
    const stats = lstatSync(path);
    check(!stats.isSymbolicLink(), `symbolic link is not allowed: ${relativePath}`);
    if (stats.isDirectory()) {
      files.push(...filesUnder(path, relativePath));
    } else if (stats.isFile()) {
      files.push(relativePath);
    } else {
      fail(`unsupported filesystem entry: ${relativePath}`);
    }
  }
  return files;
}

function dependencyCount(manifest) {
  return ["dependencies", "optionalDependencies", "peerDependencies", "devDependencies"]
    .reduce((count, field) => count + Object.keys(manifest[field] ?? {}).length, 0);
}

function parsePackResult(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    fail("npm pack --dry-run --json did not return JSON");
  }
  const result = Array.isArray(parsed) ? parsed[0] : parsed;
  check(result !== null && typeof result === "object", "npm pack result is invalid");
  check(Array.isArray(result.files), "npm pack result has no file inventory");
  check(Number.isInteger(result.size) && result.size >= 0, "npm pack result has no tarball size");
  return result;
}

check(existsSync(packageRoot), "bootstrap directory is missing");
check(existsSync(documentationPath), "bootstrap operation documentation is missing");
const manifestPath = resolve(packageRoot, "package.json");
const readmePath = resolve(packageRoot, "README.md");
check(existsSync(manifestPath), "package.json is missing");
check(existsSync(readmePath), "README.md is missing");

const bootstrapDocumentation = readFileSync(documentationPath, "utf8");
const expectedPreProductionState = `bootstrap: ${expectedVersion}\nlatest: ${expectedVersion}`;
const expectedPostReleaseState = `bootstrap: ${expectedVersion}\nlatest: 0.1.0`;
check(
  bootstrapDocumentation.includes(expectedPreProductionState),
  "documentation does not allow the observed pre-production dist-tag state",
);
check(
  bootstrapDocumentation.includes(expectedPostReleaseState),
  "documentation does not define the expected post-release dist-tag state",
);
check(
  bootstrapDocumentation.includes(`npm dist-tag ls ${expectedPackageName}`),
  "documentation does not define post-release dist-tag verification",
);
check(
  !bootstrapDocumentation.includes("latest does not point to the bootstrap version"),
  "documentation still requires latest to differ from the bootstrap version",
);

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  fail("package.json is not valid JSON");
}

assert.deepEqual(Object.keys(manifest).sort(), ["description", "files", "license", "name", "private", "version"]);
check(manifest.name === expectedPackageName, `package name is not ${expectedPackageName}`);
check(manifest.version === expectedVersion, `package version is not ${expectedVersion}`);
check(manifest.private !== true, "package must not be private");
check(manifest.private === false, "package private must be explicitly false");
check(manifest.files?.length === 1 && manifest.files[0] === "README.md", "files allowlist is invalid");
check(manifest.description === "Bootstrap package used only to establish npm Trusted Publishing for @nemnesia/symbol-nem-wallet-core.", "description is invalid");
check(manifest.license === "MIT", "license is invalid");
for (const field of forbiddenManifestFields) {
  check(!(field in manifest), `forbidden package field is present: ${field}`);
}

const dependencies = dependencyCount(manifest);
check(dependencies === 0, "dependency count is not zero");
const lifecycleScripts = Object.keys(manifest.scripts ?? {}).length;
check(lifecycleScripts === 0, "lifecycle script count is not zero");
const runtimeEntryPoints = ["main", "module", "exports", "types", "bin"].filter((field) => field in manifest).length;
check(runtimeEntryPoints === 0, "runtime entry point count is not zero");

const sourceFiles = filesUnder(packageRoot);
assert.deepEqual(sourceFiles, expectedFiles);
for (const file of sourceFiles) {
  const extension = file.slice(file.lastIndexOf(".")).toLowerCase();
  check(!forbiddenExtensions.has(extension), `forbidden artifact is present: ${file}`);
  const content = readFileSync(resolve(packageRoot, file));
  const text = content.toString("utf8");
  for (const pattern of secretPatterns) {
    check(!pattern.test(text), `secret or credential pattern is present: ${file}`);
  }
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmArguments = ["pack", "--dry-run", "--json", "--ignore-scripts"];
const npmCache = mkdtempSync(resolve(tmpdir(), "snwc-npm-bootstrap-cache-"));
let packOutput;
try {
  packOutput = execFileSync(
    npmCommand,
    npmArguments,
    {
      cwd: packageRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        npm_config_audit: "false",
        npm_config_cache: npmCache,
        npm_config_fund: "false",
        npm_config_logs_dir: npmCache,
        npm_config_update_notifier: "false",
      },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
} finally {
  rmSync(npmCache, { recursive: true, force: true });
}
const packResult = parsePackResult(packOutput);
const packedFiles = packResult.files.map((file) => `package/${file.path}`).sort();
assert.deepEqual(packedFiles, ["package/README.md", "package/package.json"]);
for (const file of packedFiles) {
  const extension = file.slice(file.lastIndexOf(".")).toLowerCase();
  check(!forbiddenExtensions.has(extension), `forbidden packed artifact is present: ${file}`);
}

process.stdout.write(`${JSON.stringify({
  package_name: manifest.name,
  bootstrap_version: manifest.version,
  packed_files: packedFiles,
  tarball_size_bytes: packResult.size,
  dependency_count: dependencies,
  lifecycle_script_count: lifecycleScripts,
  runtime_entry_point_count: runtimeEntryPoints,
  forbidden_artifact_scan: "PASS",
  secrets_scan: "PASS",
  npm_pack_dry_run: "PASS",
}, null, 2)}\n`);
