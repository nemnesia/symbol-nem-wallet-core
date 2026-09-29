const EXPECTED_NPM_REPOSITORY = Object.freeze({
  type: "git",
  url: "git+https://github.com/nemnesia/symbol-nem-wallet-core.git",
  directory: "packages/wallet-core",
});

export const NPM_REPOSITORY_METADATA = EXPECTED_NPM_REPOSITORY;

export const NPM_PACKAGE_METADATA = Object.freeze({
  author: "ccHarvestasya",
  homepage: "https://github.com/nemnesia/symbol-nem-wallet-core#readme",
  bugs: Object.freeze({ url: "https://github.com/nemnesia/symbol-nem-wallet-core/issues" }),
  keywords: Object.freeze([
    "symbol",
    "nem",
    "wallet",
    "wallet-core",
    "cryptography",
    "webassembly",
    "napi",
  ]),
  publishConfig: Object.freeze({ access: "public" }),
  codegenConfig: Object.freeze({
    name: "SymbolNemWalletCoreSpec",
    type: "modules",
    jsSrcsDir: "src/react-native",
    android: Object.freeze({ javaPackageName: "com.nemnesia.symbolnemwalletcore" }),
    ios: Object.freeze({
      modulesProvider: Object.freeze({
        NativeSymbolNemWalletCore: "NativeSymbolNemWalletCoreProvider",
      }),
    }),
  }),
});

const EXPECTED_NPM_PACKAGE_KEYS = Object.freeze([
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "bugs",
  "keywords",
  "license",
  "publishConfig",
  "repository",
  "type",
  "types",
  "main",
  "module",
  "codegenConfig",
  "exports",
  "engines",
  "files",
]);

function fail(message) {
  throw new Error(`npm repository metadata gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, keys, label) {
  if (!isPlainObject(value)) fail(`${label} is not an object`);
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  if (actualKeys.length !== expectedKeys.length || !actualKeys.every((key, index) => key === expectedKeys[index])) {
    fail(`${label} has unexpected or missing fields`);
  }
}

export function validateNpmRepositoryMetadata(metadata, label = "npm package metadata") {
  const repository = metadata?.repository;
  if (repository === null || typeof repository !== "object" || Array.isArray(repository)) {
    fail(`${label} repository metadata is missing or invalid`);
  }
  const actualKeys = Object.keys(repository).sort();
  const expectedKeys = Object.keys(EXPECTED_NPM_REPOSITORY).sort();
  if (actualKeys.length !== expectedKeys.length || !actualKeys.every((key, index) => key === expectedKeys[index])) {
    fail(`${label} repository metadata has unexpected or missing fields`);
  }
  for (const [key, expected] of Object.entries(EXPECTED_NPM_REPOSITORY)) {
    if (repository[key] !== expected) {
      fail(`${label} repository ${key} differs from the canonical npm identity`);
    }
  }
  return true;
}

export function validateNpmPackageMetadata(metadata, label = "npm package metadata") {
  if (!isPlainObject(metadata)) fail(`${label} is not an object`);
  exactKeys(metadata, EXPECTED_NPM_PACKAGE_KEYS, label);
  if (metadata.name !== "@nemnesia/symbol-nem-wallet-core" || metadata.version !== "0.1.0") {
    fail(`${label} package identity is not the formal production package`);
  }
  validateNpmRepositoryMetadata(metadata, label);
  for (const [key, expected] of Object.entries(NPM_PACKAGE_METADATA)) {
    if (JSON.stringify(metadata[key]) !== JSON.stringify(expected)) {
      fail(`${label} ${key} differs from the canonical production metadata`);
    }
  }
  return true;
}
