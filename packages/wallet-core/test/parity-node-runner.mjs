import * as facade from "@nemnesia/symbol-nem-wallet-core";
import { runParityScenarios } from "./parity-scenarios.mjs";

try {
  process.stdout.write(`${JSON.stringify(runParityScenarios(facade))}\n`);
} catch {
  console.error("Node WASM parity scenario failed");
  process.exitCode = 1;
}
