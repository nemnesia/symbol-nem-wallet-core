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
    const runtime = readFileSync(runtimePath, "utf8")
      .replace(/^export \{[^;]+;\n?/gm, "")
      .replace(/^export /gm, "");
    source = source.replace(importLine, runtime);
  }
  const manifestDeclaration = "const PACKAGE_REACT_NATIVE_MANIFEST = null;";
  const manifestReplacement = `const PACKAGE_REACT_NATIVE_MANIFEST = ${JSON.stringify(reactNativeManifest)};`;
  if (!source.includes(manifestDeclaration)) throw new Error("React Native runtime manifest marker is missing");
  return source.replace(manifestDeclaration, manifestReplacement);
}
