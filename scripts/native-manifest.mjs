import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename } from "node:path";

import {
  CANONICAL_TARGET_ORDER,
  NATIVE_TARGETS,
  validateNativeManifest,
} from "../packages/wallet-core/src/manifest.mjs";

function assemblyError() {
  throw new Error("native artifact assembly failed");
}

function sha256(path) {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    assemblyError();
  }
}

function validSourceCommit(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
}

/**
 * Create the package-local native artifact manifest from files already supplied by assembly.
 * This function does not build, download, or discover native artifacts.
 */
export function assembleNativeManifest({
  packageVersion,
  sourceCommit,
  artifacts,
  toolchainIdentifier,
}) {
  if (
    typeof packageVersion !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(packageVersion) ||
    !validSourceCommit(sourceCommit) ||
    !Array.isArray(artifacts) ||
    typeof toolchainIdentifier !== "string" ||
    toolchainIdentifier.length === 0
  ) {
    assemblyError();
  }

  const orderedArtifacts = [];
  const seen = new Set();
  for (const item of artifacts) {
    if (
      item === null ||
      typeof item !== "object" ||
      typeof item.targetId !== "string" ||
      !NATIVE_TARGETS[item.targetId] ||
      seen.has(item.targetId) ||
      typeof item.path !== "string" ||
      !item.path.endsWith(".node") ||
      !existsSync(item.path) ||
      !statSync(item.path).isFile()
    ) {
      assemblyError();
    }
    const artifactFilename = basename(item.path);
    if (artifactFilename !== item.path.split(/[\\/]/).pop() || artifactFilename.length === 0) {
      assemblyError();
    }
    seen.add(item.targetId);
    orderedArtifacts.push({ ...item, artifactFilename });
  }

  orderedArtifacts.sort(
    (left, right) =>
      CANONICAL_TARGET_ORDER.indexOf(left.targetId) -
      CANONICAL_TARGET_ORDER.indexOf(right.targetId),
  );

  const manifest = {
    schema_version: 1,
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: packageVersion,
    source_commit: sourceCommit,
    node_api_version: 8,
    artifacts: orderedArtifacts.map((item) => {
      const target = NATIVE_TARGETS[item.targetId];
      const artifact = {
        target_id: item.targetId,
        os: target.os,
        cpu: target.cpu,
        abi: target.abi,
        rust_target: target.rust_target,
        relative_path: `dist/native/${item.targetId}/${item.artifactFilename}`,
        artifact_filename: item.artifactFilename,
        sha256: sha256(item.path),
        toolchain_identifier: toolchainIdentifier,
      };
      if (target.libc !== undefined) {
        artifact.libc = target.libc;
      }
      return artifact;
    }),
  };

  try {
    validateNativeManifest(manifest, {
      name: "@nemnesia/symbol-nem-wallet-core",
      version: packageVersion,
    });
  } catch {
    assemblyError();
  }
  return manifest;
}
