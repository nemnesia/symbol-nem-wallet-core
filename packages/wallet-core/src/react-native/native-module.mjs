import { TurboModuleRegistry } from "react-native";

const MODULE_NAME = "NativeSymbolNemWalletCore";

function backendInitializationError() {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  return error;
}

export function getReactNativeModule() {
  let module;
  try {
    module = TurboModuleRegistry.getEnforcing(MODULE_NAME);
  } catch {
    throw backendInitializationError();
  }
  if (module === null || typeof module !== "object" || typeof module.invoke !== "function") {
    throw backendInitializationError();
  }
  return module;
}
