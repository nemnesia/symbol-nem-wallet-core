import { createFacade } from "../facade-runtime.mjs";
import { getReactNativeModule } from "./native-module.mjs";

const OPERATIONS = [
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

const nativeModule = getReactNativeModule();
const backend = Object.fromEntries(
  OPERATIONS.map((operation) => [
    operation,
    (...args) => nativeModule.invoke(operation, { args }),
  ]),
);

let facade;
try {
  facade = createFacade(backend);
} catch {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  throw error;
}

export const {
  create_empty_store,
  prepare_generated_profile,
  finalize_generated_profile,
  restore_profile,
  list_profiles,
  export_mnemonic,
  export_private_key,
  list_software_keys,
  derive_software_key,
  import_software_key,
  generate_software_key,
  get_public_account,
  sign,
  change_profile_password,
  delete_software_key,
  delete_profile,
} = facade;
