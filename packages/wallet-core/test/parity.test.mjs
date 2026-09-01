import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import * as nativeFacade from "@nemnesia/symbol-nem-wallet-core";
import { runBrowserParity } from "./browser-parity.mjs";
import { runParityScenarios } from "./parity-scenarios.mjs";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const nodeRunner = fileURLToPath(new URL("./parity-node-runner.mjs", import.meta.url));
let nodeParity;

function nodeParityResults() {
  if (nodeParity === undefined) {
    const native = runParityScenarios(nativeFacade);
    const directory = mkdtempSync(resolve(tmpdir(), "snwc-parity-output-"));
    const output = resolve(directory, "stdout");
    const outputDescriptor = openSync(output, "w");
    let wasm;
    try {
      execFileSync(process.execPath, ["--no-addons", nodeRunner], {
        cwd: packageRoot,
        stdio: ["ignore", outputDescriptor, outputDescriptor],
      });
      wasm = JSON.parse(readFileSync(output, "utf8"));
    } finally {
      closeSync(outputDescriptor);
      rmSync(directory, { recursive: true, force: true });
    }
    nodeParity = { native, wasm };
  }
  return nodeParity;
}

test("Node native and Node --no-addons WASM have identical Stage 8 contract results", () => {
  const { native, wasm } = nodeParityResults();
  assert.deepEqual(wasm, native);
});

test("Browser WASM package entry has identical Stage 8 contract results", async (t) => {
  const browser = await runBrowserParity();
  if (browser.status === "blocked") {
    t.skip(browser.reason);
    return;
  }
  assert.deepEqual(browser.result, nodeParityResults().native);
});
