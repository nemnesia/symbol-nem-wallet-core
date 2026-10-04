import { readFileSync } from "node:fs";

export function inlineReactNativeRuntime(entryPath, runtimePaths, reactNativeManifest) {
  let source = readFileSync(entryPath, "utf8");
  const replacements = [
    {
      importLine: 'import { createFacade } from "../facade-runtime.mjs";\n',
      runtimePath: runtimePaths[0],
    },
    {
      importLine: 'import { getReactNativeModule } from "./native-module.mjs";\n',
      runtimePath: runtimePaths[1],
    },
  ];
  for (const { importLine, runtimePath } of replacements) {
    let runtime = readFileSync(runtimePath, "utf8")
      .replace(/^export \{[^;]+;\n?/gm, "")
      .replace(/^export /gm, "");
    if (runtimePath.endsWith("facade-runtime.mjs")) {
      // Keep runtime declarations separate from the entry point's public exports.
      runtime = `const createFacade = (() => {\n${runtime}\nreturn createFacade;\n})();\n`;
    }
    source = source.replace(importLine, runtime);
  }
  const manifestDeclaration = "const PACKAGE_REACT_NATIVE_MANIFEST = null;";
  const manifestReplacement = `const PACKAGE_REACT_NATIVE_MANIFEST = ${JSON.stringify(reactNativeManifest)};`;
  if (!source.includes(manifestDeclaration)) throw new Error("React Native runtime manifest marker is missing");
  return source.replace(manifestDeclaration, manifestReplacement);
}
