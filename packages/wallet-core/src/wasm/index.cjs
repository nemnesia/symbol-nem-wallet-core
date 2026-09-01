/* @snwc-facade-runtime */

let generated;
try {
  generated = require("./generated.cjs");
} catch {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  throw error;
}

try {
  module.exports = createFacade(generated);
} catch {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  throw error;
}
