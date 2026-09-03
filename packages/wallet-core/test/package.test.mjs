import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validatePackageContents } from "../../../scripts/package-contents.mjs";
import { NPM_PACKAGE_METADATA, validateNpmPackageMetadata } from "../../../scripts/npm-repository.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));

const publicFunctions = [
  "create_empty_store",
  "prepare_generated_profile",
  "finalize_generated_profile",
  "restore_profile",
  "list_profiles",
  "export_mnemonic",
  "export_private_key",
  "list_software_keys",
  "derive_software_key",
  "import_software_key",
  "generate_software_key",
  "get_public_account",
  "sign",
  "change_profile_password",
  "delete_software_key",
  "delete_profile",
];

function allFiles(root, prefix = "") {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = resolve(root, entry.name);
    return entry.isDirectory() ? allFiles(absolute, relative) : [relative];
  });
}

test("package metadata keeps conditional export order and package-local allowlist", () => {
  assert.equal(validateNpmPackageMetadata(packageJson), true);
  for (const [key, expected] of Object.entries(NPM_PACKAGE_METADATA)) {
    assert.deepEqual(packageJson[key], expected);
  }
  const license = readFileSync(resolve(packageRoot, "LICENSE"), "utf8");
  assert.match(license, /Copyright \(c\) 2026 ccHarvestasya/);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/index.d.ts",
      "node-addons": {
        import: "./dist/node/index.mjs",
        require: "./dist/node/index.cjs",
      },
      default: {
        import: "./dist/wasm/index.mjs",
        require: "./dist/wasm/index.cjs",
      },
    },
  });
  assert.deepEqual(Object.keys(packageJson.exports), ["."]);
  assert.deepEqual(Object.keys(packageJson.exports["."]), ["types", "node-addons", "default"]);
  assert.deepEqual(Object.keys(packageJson.exports["."]["node-addons"]), ["import", "require"]);
  assert.deepEqual(Object.keys(packageJson.exports["."]["default"]), ["import", "require"]);
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.engines.node, ">=22.0.0");
  assert.equal("postinstall" in (packageJson.scripts ?? {}), false);

  const files = allFiles(resolve(packageRoot, "dist")).sort();
  const manifest = JSON.parse(readFileSync(resolve(packageRoot, "dist/native/artifact-manifest.json"), "utf8"));
  assert.equal(validatePackageContents(packageRoot, manifest), true);
  const snippetFiles = files.filter((file) => file.startsWith("wasm/snippets/"));
  assert.equal(snippetFiles.length, 1);
  assert.match(snippetFiles[0], /^wasm\/snippets\/[^/]+\/inline0\.js$/);
  const allowed = new Set([
    "index.d.ts",
    "node/index.mjs",
    "node/index.cjs",
    "wasm/generated.mjs",
    "wasm/generated.cjs",
    "wasm/asset.mjs",
    "wasm/index.mjs",
    "wasm/index.cjs",
    "wasm/symbol_nem_wallet_core_wasm_bg.wasm",
    ...snippetFiles,
    "native/artifact-manifest.json",
    ...manifest.artifacts.map((artifact) => artifact.relative_path.replace(/^dist\//, "")),
  ]);
  assert.deepEqual(files, [...allowed].sort());
  assert.equal(files.filter((file) => file.endsWith(".wasm")).length, 1);
  assert.equal(statSync(resolve(packageRoot, "dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm")).isFile(), true);
});

test("published declaration is byte-for-byte equal to the Stage 7A declaration", () => {
  const specification = readFileSync(
    resolve(packageRoot, "../../docs/specifications/npm-typescript-facade.md"),
    "utf8",
  );
  const section = specification.slice(specification.indexOf("## 5. Exact TypeScript declarations"));
  const match = section.match(/```ts\n([\s\S]*?)\n```/);
  assert.ok(match);
  assert.equal(readFileSync(resolve(packageRoot, "src/index.d.ts"), "utf8"), `${match[1]}\n`);
  assert.equal(
    readFileSync(resolve(packageRoot, "dist/index.d.ts"), "utf8"),
    `${match[1]}\n`,
  );
});

test("npm READMEs document exactly the public 16-function facade", () => {
  for (const filename of ["README.md", "README.en.md"]) {
    const readme = readFileSync(resolve(packageRoot, filename), "utf8");
    const table = readme.match(/## (?:公開関数 \(16\)|Public functions \(16\))[\s\S]*?(?=\n## |$)/)?.[0];
    assert.ok(table);
    const documented = [...table.matchAll(/^\| `([a-z_]+)` \|/gm)].map((match) => match[1]);
    assert.deepEqual(documented, publicFunctions, filename);
    assert.doesNotMatch(readme, /`(?:choose_backend|load_native|load_wasm)`/);
  }
});

test("npm pack dry run contains only package metadata, README, license, and dist allowlist", () => {
  const configuredNpmCli = process.env.npm_execpath;
  const npmCli =
    configuredNpmCli !== undefined && basename(configuredNpmCli).startsWith("npm")
      ? configuredNpmCli
      : resolve(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js");
  const output = execFileSync(
    process.execPath,
    [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      cwd: packageRoot,
      encoding: "utf8",
      env: { ...process.env, npm_config_cache: resolve(process.env.TMPDIR ?? "/tmp", "snwc-npm-cache") },
    },
  );
  const packResult = JSON.parse(output);
  const entry = Array.isArray(packResult) ? packResult[0] : Object.values(packResult)[0];
  assert.ok(entry);
  const files = entry.files.map((file) => file.path.replace(/^package\//, "")).sort();
  const snippetFiles = files.filter((file) => file.startsWith("dist/wasm/snippets/"));
  assert.equal(snippetFiles.length, 1);
  assert.match(snippetFiles[0], /^dist\/wasm\/snippets\/[^/]+\/inline0\.js$/);
  assert.deepEqual(files, [
    "LICENSE",
    "README.md",
    "README.en.md",
    "dist/index.d.ts",
    "dist/native/artifact-manifest.json",
    ...JSON.parse(readFileSync(resolve(packageRoot, "dist/native/artifact-manifest.json"), "utf8")).artifacts.map((artifact) => artifact.relative_path),
    "dist/node/index.cjs",
    "dist/node/index.mjs",
    "dist/wasm/generated.cjs",
    "dist/wasm/generated.mjs",
    "dist/wasm/asset.mjs",
    "dist/wasm/index.cjs",
    "dist/wasm/index.mjs",
    ...snippetFiles,
    "dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm",
    "package.json",
  ].sort());
});
