import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const STATIC_DIST_FILES = [
  "index.d.ts",
  "node/index.mjs",
  "node/index.cjs",
  "wasm/generated.mjs",
  "wasm/generated.cjs",
  "wasm/asset.mjs",
  "wasm/index.mjs",
  "wasm/index.cjs",
  "wasm/symbol_nem_wallet_core_wasm_bg.wasm",
  "native/artifact-manifest.json",
];

function contentsError() {
  throw new Error("invalid npm package contents");
}

function allFiles(root, prefix = "") {
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    contentsError();
  }
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = resolve(root, entry.name);
    return entry.isDirectory() ? allFiles(absolute, relative) : [relative];
  });
}

export function validatePackageContents(packageRoot, manifest) {
  if (manifest === null || typeof manifest !== "object" || !Array.isArray(manifest.artifacts)) {
    contentsError();
  }
  for (const file of ["package.json", "README.md", "README.en.md", "LICENSE"]) {
    if (!existsSync(resolve(packageRoot, file)) || !statSync(resolve(packageRoot, file)).isFile()) {
      contentsError();
    }
  }

  const distRoot = resolve(packageRoot, "dist");
  const actual = allFiles(distRoot);
  const snippets = actual.filter((file) => file.startsWith("wasm/snippets/"));
  if (snippets.length === 0 || snippets.some((file) => !/^wasm\/snippets\/[^/]+\/.+\.js$/.test(file))) {
    contentsError();
  }
  const expected = new Set([
    ...STATIC_DIST_FILES,
    ...snippets,
    ...manifest.artifacts.map((artifact) => {
      if (
        artifact === null ||
        typeof artifact !== "object" ||
        typeof artifact.relative_path !== "string" ||
        !artifact.relative_path.startsWith("dist/")
      ) {
        contentsError();
      }
      return artifact.relative_path.slice("dist/".length);
    }),
  ]);
  if (actual.length !== expected.size || actual.some((file) => !expected.has(file))) {
    contentsError();
  }
  if (actual.filter((file) => file.endsWith(".wasm")).length !== 1) {
    contentsError();
  }
  return true;
}
