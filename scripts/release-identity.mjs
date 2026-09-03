import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const NPM_PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";
const MAIN_REF = "refs/remotes/origin/main";
const ZERO_COMMIT = "0".repeat(40);
const IDENTIFIER = "[0-9A-Za-z-]+";
const NUMERIC_IDENTIFIER = "(?:0|[1-9]\\d*)";
const PRERELEASE_IDENTIFIER = `(?:${NUMERIC_IDENTIFIER}|(?=[0-9A-Za-z-]*[A-Za-z-])[0-9A-Za-z-]+)`;
const SEMVER_PATTERN = new RegExp(
  `^(${NUMERIC_IDENTIFIER}\\.${NUMERIC_IDENTIFIER}\\.${NUMERIC_IDENTIFIER})(?:-(${PRERELEASE_IDENTIFIER}(?:\\.${PRERELEASE_IDENTIFIER})*))?(?:\\+(${IDENTIFIER}(?:\\.${IDENTIFIER})*))?$`,
);

export const RELEASE_VERSION_SOURCES = Object.freeze([
  Object.freeze({
    id: "core",
    kind: "cargo",
    relativePath: "crates/core/Cargo.toml",
    packageName: "symbol-nem-wallet-core",
  }),
  Object.freeze({
    id: "cAbi",
    kind: "cargo",
    relativePath: "crates/c-abi/Cargo.toml",
    packageName: "symbol-nem-wallet-core-native",
  }),
  Object.freeze({
    id: "node",
    kind: "cargo",
    relativePath: "crates/node/Cargo.toml",
    packageName: "symbol-nem-wallet-core-node",
  }),
  Object.freeze({
    id: "wasm",
    kind: "cargo",
    relativePath: "crates/wasm/Cargo.toml",
    packageName: "symbol-nem-wallet-core-wasm",
  }),
  Object.freeze({
    id: "npm",
    kind: "npm",
    relativePath: "packages/wallet-core/package.json",
    packageName: NPM_PACKAGE_NAME,
  }),
]);

function fail(message) {
  throw new Error(`Release identity gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

export function parseSemVer(value) {
  if (typeof value !== "string") return null;
  const match = SEMVER_PATTERN.exec(value);
  if (match === null) return null;
  return {
    value,
    core: match[1],
    prerelease: match[2] ?? null,
    build: match[3] ?? null,
  };
}

export function isValidSemVer(value) {
  return parseSemVer(value) !== null;
}

export function isValidCommit(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
}

function parseCargoPackage(contents, relativePath) {
  if (typeof contents !== "string") fail(`Cargo manifest is unreadable: ${relativePath}`);

  let inPackageSection = false;
  let packageName;
  let version;
  for (const line of contents.split(/\r?\n/)) {
    const section = /^\s*\[([^\]]+)\]\s*$/.exec(line);
    if (section !== null) {
      inPackageSection = section[1] === "package";
      continue;
    }
    if (!inPackageSection) continue;
    const field = /^\s*(name|version)\s*=\s*"([^"]+)"(?:\s*#.*)?$/.exec(line);
    if (field === null) continue;
    if (field[1] === "name") packageName = field[2];
    if (field[1] === "version") version = field[2];
  }

  if (packageName === undefined || version === undefined) {
    fail(`Cargo package name/version is unavailable: ${relativePath}`);
  }
  return { packageName, version };
}

function parseNpmPackage(contents, relativePath) {
  let metadata;
  try {
    metadata = JSON.parse(contents);
  } catch {
    fail(`npm package metadata is unreadable: ${relativePath}`);
  }
  if (!isPlainObject(metadata) || typeof metadata.name !== "string" || typeof metadata.version !== "string") {
    fail(`npm package name/version is unavailable: ${relativePath}`);
  }
  return { packageName: metadata.name, version: metadata.version };
}

export function collectReleaseVersionSources({ root = repositoryRoot, readFile = readFileSync } = {}) {
  const sources = {};
  for (const source of RELEASE_VERSION_SOURCES) {
    const path = resolve(root, source.relativePath);
    let contents;
    try {
      contents = readFile(path, "utf8");
    } catch {
      fail(`release manifest is unreadable: ${source.relativePath}`);
    }
    const metadata = source.kind === "cargo"
      ? parseCargoPackage(contents, source.relativePath)
      : parseNpmPackage(contents, source.relativePath);
    if (metadata.packageName !== source.packageName) {
      fail(`unexpected release package name: ${source.relativePath}`);
    }
    sources[source.id] = {
      relative_path: source.relativePath,
      package_name: metadata.packageName,
      version: metadata.version,
    };
  }
  return sources;
}

function validateVersionSources(versionSources) {
  if (!isPlainObject(versionSources)) fail("release version sources are unavailable");

  const expectedIds = RELEASE_VERSION_SOURCES.map((source) => source.id).sort();
  const actualIds = Object.keys(versionSources).sort();
  if (actualIds.length !== expectedIds.length || !actualIds.every((id, index) => id === expectedIds[index])) {
    fail("release version sources are incomplete or unexpected");
  }

  for (const source of RELEASE_VERSION_SOURCES) {
    const entry = versionSources[source.id];
    if (
      !isPlainObject(entry) ||
      entry.relative_path !== source.relativePath ||
      entry.package_name !== source.packageName ||
      !isValidSemVer(entry.version)
    ) {
      fail(`invalid SemVer in ${source.relativePath}`);
    }
    if (parseSemVer(entry.version).prerelease !== null) {
      fail(`pre-release version is not accepted for a formal release: ${entry.relativePath}`);
    }
  }
}

function releaseTagVersion(tag) {
  if (typeof tag !== "string" || !tag.startsWith("v")) fail("tag must use the v<SemVer> format");
  const tagVersion = tag.slice(1);
  const parsed = parseSemVer(tagVersion);
  if (parsed === null) fail("tag must exactly match v<SemVer>");
  if (parsed.prerelease !== null) fail("pre-release tags are not accepted for a formal release");
  return tagVersion;
}

function validateTag(tag, version) {
  const tagVersion = releaseTagVersion(tag);
  if (tagVersion !== version) fail("tag version does not match manifest version");
  return tagVersion;
}

function validateTagEvent(tag, tagEvent) {
  if (!isPlainObject(tagEvent)) fail("GitHub tag creation event is unavailable");
  if (
    tagEvent.ref !== `refs/tags/${tag}` ||
    tagEvent.created !== true ||
    tagEvent.deleted !== false ||
    tagEvent.forced !== false ||
    tagEvent.before !== ZERO_COMMIT
  ) {
    fail("tag event is not an unforced creation of the exact release tag");
  }
}

export function validateReleaseIdentity(input) {
  if (!isPlainObject(input) || input.mode !== "release") fail("only formal release mode is supported");
  validateVersionSources(input.versionSources);

  const version = input.versionSources.npm.version;
  for (const source of RELEASE_VERSION_SOURCES) {
    if (input.versionSources[source.id].version !== version) {
      fail(`release version mismatch: ${source.relativePath}`);
    }
  }

  const tagVersion = validateTag(input.tag, version);
  validateTagEvent(input.tag, input.tagEvent);

  if (input.tagRefExists !== true) fail("release tag ref does not exist");
  if (!isValidCommit(input.checkoutHead)) fail("checkout HEAD is invalid");
  if (!isValidCommit(input.sourceCommit)) fail("release source commit is invalid");
  if (!isValidCommit(input.tagCommit)) fail("tag target commit is invalid");
  if (!isValidCommit(input.mainRefCommit)) fail("main ref commit is unavailable");
  if (input.checkoutHead !== input.sourceCommit) fail("checkout HEAD differs from release source commit");
  if (input.tagCommit !== input.sourceCommit) fail("tag target differs from release source commit");
  if (typeof input.mainRef !== "string" || !/(^|\/)main$/.test(input.mainRef)) {
    fail("release source ref is not main");
  }
  if (input.mainAncestry !== true) fail("release source commit is not contained in main");
  if (input.clean !== true) fail("release source checkout is not clean");

  return {
    schema_version: 1,
    kind: "release-identity",
    mode: "release",
    package_name: NPM_PACKAGE_NAME,
    version,
    tag: input.tag,
    tag_version: tagVersion,
    tag_ref: `refs/tags/${input.tag}`,
    tag_event: {
      ref: input.tagEvent.ref,
      created: true,
      deleted: false,
      forced: false,
      before: ZERO_COMMIT,
    },
    checkout_head: input.checkoutHead,
    source_commit: input.sourceCommit,
    tag_commit: input.tagCommit,
    main_ref: input.mainRef,
    main_ref_commit: input.mainRefCommit,
    main_ancestry: true,
    clean: true,
    version_sources: Object.fromEntries(
      RELEASE_VERSION_SOURCES.map((source) => [source.id, input.versionSources[source.id]]),
    ),
  };
}

export function npmVersionUrl(packageName, version) {
  return `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
}

export async function checkNpmVersionAvailability({ packageName, version, request, allowExisting = false }) {
  if (packageName !== NPM_PACKAGE_NAME || !isValidSemVer(version)) {
    fail("invalid npm duplicate-check identity");
  }
  if (typeof request !== "function") fail("npm registry request function is unavailable");

  let response;
  try {
    response = await request(npmVersionUrl(packageName, version));
  } catch {
    throw new Error("Release identity gate failed: npm registry request failed");
  }
  if (response === null || typeof response !== "object" || !Number.isInteger(response.status)) {
    throw new Error("Release identity gate failed: npm registry response is ambiguous");
  }
  if (response.status === 404) {
    return { status: "not-found" };
  }
  if (response.status >= 200 && response.status < 300) {
    if (allowExisting === true) {
      return { status: "exists" };
    }
    throw new Error(`Release identity gate failed: npm version already exists: ${packageName}@${version}`);
  }
  throw new Error(`Release identity gate failed: npm registry response is ambiguous (HTTP ${response.status})`);
}

function argument(name, argv, fallback) {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  if (argv[index + 1] === undefined) fail(`missing ${name}`);
  return argv[index + 1];
}

function gitCommit(ref, message) {
  try {
    return execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    fail(message);
  }
}

function gitMainAncestry(sourceCommit, mainRef) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sourceCommit, mainRef], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    return true;
  } catch (error) {
    if (error?.status === 1) return false;
    fail("main ref ancestry could not be verified");
  }
}

function gitWorktreeClean() {
  try {
    return execFileSync("git", [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--ignored=matching",
    ], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }) === "";
  } catch {
    fail("source checkout cleanliness could not be verified");
  }
}

function githubTagEvent(eventPath) {
  if (typeof eventPath !== "string" || eventPath.length === 0) {
    fail("GitHub tag event path is unavailable");
  }
  let event;
  try {
    event = JSON.parse(readFileSync(eventPath, "utf8"));
  } catch {
    fail("GitHub tag event is unreadable");
  }
  if (!isPlainObject(event)) fail("GitHub tag event is invalid");
  return {
    ref: event.ref,
    created: event.created,
    deleted: event.deleted,
    forced: event.forced,
    before: event.before,
  };
}

async function run() {
  const argv = process.argv.slice(2);
  const mode = argument("--mode", argv, "release");
  const tag = argument("--tag", argv, process.env.GITHUB_REF_NAME);
  const sourceCommit = argument("--source-commit", argv, process.env.GITHUB_SHA);
  const eventPath = argument("--event-path", argv, process.env.GITHUB_EVENT_PATH);
  const allowExistingVersion = argv.includes("--allow-existing-version");

  if (mode !== "release") fail("only formal release mode is supported");
  if (typeof tag !== "string") fail("release tag is unavailable");
  releaseTagVersion(tag);
  if (!isValidCommit(sourceCommit)) fail("release source commit is invalid");

  const checkoutHead = gitCommit("HEAD", "checkout HEAD is unavailable");
  const tagCommit = gitCommit(`refs/tags/${tag}`, "release tag ref is missing or does not target a commit");
  const mainRefCommit = gitCommit(MAIN_REF, "main ref is unavailable");
  const clean = gitWorktreeClean();
  const versionSources = collectReleaseVersionSources();
  const identity = validateReleaseIdentity({
    mode,
    tag,
    tagEvent: githubTagEvent(eventPath),
    tagRefExists: true,
    checkoutHead,
    sourceCommit,
    tagCommit,
    mainRef: MAIN_REF,
    mainRefCommit,
    mainAncestry: gitMainAncestry(sourceCommit, MAIN_REF),
    clean,
    versionSources,
  });

  const npmRegistry = await checkNpmVersionAvailability({
    packageName: NPM_PACKAGE_NAME,
    version: identity.version,
    allowExisting: allowExistingVersion,
    request: async (url) => {
      if (typeof fetch !== "function") throw new Error("fetch is unavailable");
      return fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: { accept: "application/json" },
      });
    },
  });

  process.stdout.write(`${JSON.stringify({ ...identity, npm_registry: npmRegistry })}\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Release identity gate failed"}\n`);
    process.exitCode = 1;
  });
}
