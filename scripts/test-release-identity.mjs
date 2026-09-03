import assert from "node:assert/strict";

import {
  checkNpmVersionAvailability,
  collectReleaseVersionSources,
  isValidSemVer,
  npmVersionUrl,
  validateReleaseIdentity,
} from "./release-identity.mjs";

const COMMIT = "a".repeat(40);
const MAIN_COMMIT = "b".repeat(40);
const VERSION = "0.1.0";

function fixtureVersionSources() {
  return {
    core: { relative_path: "crates/core/Cargo.toml", package_name: "symbol-nem-wallet-core", version: VERSION },
    cAbi: { relative_path: "crates/c-abi/Cargo.toml", package_name: "symbol-nem-wallet-core-native", version: VERSION },
    node: { relative_path: "crates/node/Cargo.toml", package_name: "symbol-nem-wallet-core-node", version: VERSION },
    wasm: { relative_path: "crates/wasm/Cargo.toml", package_name: "symbol-nem-wallet-core-wasm", version: VERSION },
    npm: { relative_path: "packages/wallet-core/package.json", package_name: "@nemnesia/symbol-nem-wallet-core", version: VERSION },
  };
}

function identityFixture(overrides = {}) {
  return {
    mode: "release",
    tag: "v0.1.0",
    tagEvent: {
      ref: "refs/tags/v0.1.0",
      created: true,
      deleted: false,
      forced: false,
      before: "0".repeat(40),
    },
    tagRefExists: true,
    checkoutHead: COMMIT,
    sourceCommit: COMMIT,
    tagCommit: COMMIT,
    mainRef: "refs/remotes/origin/main",
    mainRefCommit: MAIN_COMMIT,
    mainAncestry: true,
    clean: true,
    versionSources: fixtureVersionSources(),
    ...overrides,
  };
}

function expectIdentityFailure(overrides, message) {
  assert.throws(() => validateReleaseIdentity(identityFixture(overrides)), new RegExp(message));
}

assert.equal(isValidSemVer("0.1.0"), true);
assert.equal(isValidSemVer("1.2.3+build.7"), true);
assert.equal(isValidSemVer("01.2.3"), false);
assert.equal(isValidSemVer("1.2.3-01"), false);
assert.equal(isValidSemVer("1.2.3foo"), false);

const validIdentity = validateReleaseIdentity(identityFixture());
assert.equal(validIdentity.tag, "v0.1.0");
assert.equal(validIdentity.version, VERSION);
assert.equal(validIdentity.main_ancestry, true);
assert.equal(validIdentity.clean, true);
assert.deepEqual(
  Object.fromEntries(Object.entries(validIdentity.version_sources).map(([id, source]) => [id, source.version])),
  { core: VERSION, cAbi: VERSION, node: VERSION, wasm: VERSION, npm: VERSION },
);

const cargoFixtures = {
  "/fixture/crates/core/Cargo.toml": '[package]\nname = "symbol-nem-wallet-core"\nversion = "0.1.0"\n',
  "/fixture/crates/c-abi/Cargo.toml": '[package]\nname = "symbol-nem-wallet-core-native"\nversion = "0.1.0"\n',
  "/fixture/crates/node/Cargo.toml": '[package]\nname = "symbol-nem-wallet-core-node"\nversion = "0.1.0"\n',
  "/fixture/crates/wasm/Cargo.toml": '[package]\nname = "symbol-nem-wallet-core-wasm"\nversion = "0.1.0"\n',
  "/fixture/packages/wallet-core/package.json": JSON.stringify({
    name: "@nemnesia/symbol-nem-wallet-core",
    version: "0.1.0",
  }),
};
const collectedFixtures = collectReleaseVersionSources({
  root: "/fixture",
  readFile: (path) => cargoFixtures[path],
});
assert.deepEqual(
  Object.fromEntries(Object.entries(collectedFixtures).map(([id, source]) => [id, source.version])),
  { core: VERSION, cAbi: VERSION, node: VERSION, wasm: VERSION, npm: VERSION },
);

expectIdentityFailure({ tag: "v1.2.3foo" }, "tag must exactly match v<SemVer>");
expectIdentityFailure({ tag: "v0.1.1", tagEvent: { ...identityFixture().tagEvent, ref: "refs/tags/v0.1.1" } }, "tag version does not match");
expectIdentityFailure({ versionSources: { ...fixtureVersionSources(), npm: { ...fixtureVersionSources().npm, version: "0.1.1" } } }, "release version mismatch");
expectIdentityFailure({ versionSources: { ...fixtureVersionSources(), wasm: { ...fixtureVersionSources().wasm, version: "0.1.1" } } }, "release version mismatch");
expectIdentityFailure({ clean: false }, "not clean");
expectIdentityFailure({ tagRefExists: false }, "tag ref does not exist");
expectIdentityFailure({ checkoutHead: MAIN_COMMIT }, "checkout HEAD differs");
expectIdentityFailure({ tagCommit: MAIN_COMMIT }, "tag target differs");
expectIdentityFailure({ mainAncestry: false }, "not contained in main");
expectIdentityFailure({ tagEvent: { ...identityFixture().tagEvent, created: false, forced: true } }, "tag event is not");
expectIdentityFailure({ tagEvent: { ...identityFixture().tagEvent, deleted: true } }, "tag event is not");
expectIdentityFailure({ versionSources: { ...fixtureVersionSources(), core: { ...fixtureVersionSources().core, version: "1.2.3-beta.1" } } }, "pre-release version");

let requestedUrl;
const available = await checkNpmVersionAvailability({
  packageName: "@nemnesia/symbol-nem-wallet-core",
  version: VERSION,
  request: async (url) => {
    requestedUrl = url;
    return { status: 404 };
  },
});
assert.deepEqual(available, { status: "not-found" });
assert.equal(requestedUrl, npmVersionUrl("@nemnesia/symbol-nem-wallet-core", VERSION));

await assert.rejects(
  checkNpmVersionAvailability({
    packageName: "@nemnesia/symbol-nem-wallet-core",
    version: VERSION,
    request: async () => ({ status: 200 }),
  }),
  /npm version already exists/,
);
await assert.rejects(
  checkNpmVersionAvailability({
    packageName: "@nemnesia/symbol-nem-wallet-core",
    version: VERSION,
    request: async () => {
      throw new Error("network failure");
    },
  }),
  /npm registry request failed/,
);
await assert.rejects(
  checkNpmVersionAvailability({
    packageName: "@nemnesia/symbol-nem-wallet-core",
    version: VERSION,
    request: async () => ({ status: 503 }),
  }),
  /response is ambiguous/,
);

process.stdout.write("release identity deterministic tests passed\n");
