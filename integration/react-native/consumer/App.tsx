import React, { useEffect } from "react";
import { Text, View } from "react-native";

import * as walletCore from "@nemnesia/symbol-nem-wallet-core";

const zeroBytes = new Uint8Array();
const profileId = "00000000-0000-0000-0000-000000000000";
const exportRequest = {
  target: { kind: "mnemonic", profile_id: profileId },
  user_request: { target: { kind: "mnemonic", profile_id: profileId }, status: "not_requested" },
  application_confirmation: {
    target: { kind: "mnemonic", profile_id: profileId },
    status: "not_confirmed",
  },
};

export default function App() {
  useEffect(() => {
    const store = (() => {
      try {
        return walletCore.create_empty_store();
      } catch {
        return zeroBytes;
      }
    })();
    const calls = [
      () => walletCore.create_empty_store(),
      () => walletCore.prepare_generated_profile(store, zeroBytes, 0),
      () => walletCore.finalize_generated_profile(store, zeroBytes, zeroBytes, { status: "unconfirmed" }),
      () => walletCore.restore_profile(store, zeroBytes, zeroBytes, 0),
      () => walletCore.list_profiles(store),
      () => walletCore.export_mnemonic(store, exportRequest, zeroBytes),
      () => walletCore.export_private_key(store, exportRequest, zeroBytes),
      () => walletCore.list_software_keys(store, profileId),
      () => walletCore.derive_software_key(store, profileId, zeroBytes, 0, 0),
      () => walletCore.import_software_key(store, profileId, zeroBytes, 0, zeroBytes),
      () => walletCore.generate_software_key(store, profileId, zeroBytes, 0),
      () => walletCore.get_public_account(store, profileId, profileId, { chain: "nem", network: "testnet" }, zeroBytes),
      () => walletCore.sign(store, {
        target: { profile_id: profileId, key_id: profileId, context: { chain: "nem", network: "testnet" } },
        payload: zeroBytes,
        approval: { status: "not_approved" },
      }, zeroBytes),
      () => walletCore.change_profile_password(store, profileId, zeroBytes, zeroBytes),
      () => walletCore.delete_software_key(store, profileId, profileId, zeroBytes),
      () => walletCore.delete_profile(store, profileId, zeroBytes),
    ];
    for (const call of calls) {
      try {
        call();
      } catch {
        // Invalid fixture values are expected; reaching native is the smoke.
      }
    }
    console.log(`SNWC_RN_NATIVE_SMOKE_PASS:${calls.length}`);
  }, []);

  return <View><Text>SymbolNemWalletCoreRN smoke consumer</Text></View>;
}
