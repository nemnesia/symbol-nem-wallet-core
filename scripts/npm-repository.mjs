const EXPECTED_NPM_REPOSITORY = Object.freeze({
  type: "git",
  url: "git+https://github.com/nemnesia/symbol-nem-wallet-core.git",
  directory: "packages/wallet-core",
});

export const NPM_REPOSITORY_METADATA = EXPECTED_NPM_REPOSITORY;

function fail(message) {
  throw new Error(`npm repository metadata gate failed: ${message}`);
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
