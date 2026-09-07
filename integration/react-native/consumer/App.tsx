import React, { useEffect, useRef, useState } from 'react';
import { Text, TurboModuleRegistry, View } from 'react-native';

import * as walletCore from '@nemnesia/symbol-nem-wallet-core';
import type {
  ExportRequest,
  SigningRequest,
} from '@nemnesia/symbol-nem-wallet-core';

const password = Uint8Array.from([
  114, 101, 108, 101, 97, 115, 101, 32, 115, 109, 111, 107, 101,
]);
const newPassword = Uint8Array.from([
  114, 101, 108, 101, 97, 115, 101, 32, 115, 109, 111, 107, 101, 32, 110, 101,
  119,
]);
const accountPrivateKey = Uint8Array.from([
  0x57, 0x5d, 0xbb, 0x30, 0x62, 0x26, 0x7e, 0xff, 0x57, 0xc9, 0x70, 0xa3, 0x36,
  0xeb, 0xbc, 0x8f, 0xbc, 0xfe, 0x12, 0xc5, 0xbd, 0x3e, 0xd7, 0xbc, 0x11, 0xeb,
  0x04, 0x81, 0xd7, 0x70, 0x4c, 0xed,
]);
const signaturePrivateKey = Uint8Array.from([
  0xab, 0xf4, 0xcf, 0x55, 0xa2, 0xb3, 0xf7, 0x42, 0xd7, 0x54, 0x3d, 0x9c, 0xc1,
  0x7f, 0x50, 0x44, 0x7b, 0x96, 0x9e, 0x6e, 0x06, 0xf5, 0xea, 0x91, 0x95, 0xd4,
  0x28, 0xab, 0x12, 0xb7, 0x31, 0x8d,
]);
const smokePayload = Uint8Array.from([
  0x8c, 0xe0, 0x3c, 0xd6, 0x05, 0x14, 0x23, 0x3b, 0x86, 0x78, 0x97,
]);

const expectedModuleIdentity = 'symbol-nem-wallet-core-react-native-v1';
const expectedModuleName = 'NativeSymbolNemWalletCore';
type NativeModule = {
  invoke(operation: string, args: { args: unknown[] }): unknown;
};

function smokeAssertion(label: string): never {
  const error = new Error(label);
  error.name = 'SNWCSmokeAssertionError';
  throw error;
}

function requireBytes(value: unknown, label: string): Uint8Array {
  if (!(value instanceof Uint8Array) || value.byteLength === 0) {
    smokeAssertion(`${label}:invalid-bytes`);
  }
  return value;
}

function requireMutation(
  value: unknown,
  label: string,
): { store: Uint8Array; value: any } {
  if (value === null || typeof value !== 'object') {
    smokeAssertion(`${label}:invalid-mutation`);
  }
  const result = value as { store?: unknown; value?: unknown };
  return {
    store: requireBytes(result.store, `${label}:store`),
    value: result.value,
  };
}

function requireRead(value: unknown, label: string): { value: any } {
  if (value === null || typeof value !== 'object') {
    smokeAssertion(`${label}:invalid-read`);
  }
  const result = value as { value?: unknown };
  if (result.value === undefined) {
    smokeAssertion(`${label}:missing-value`);
  }
  return { value: result.value };
}

function errorCode(error: unknown): string {
  if (error !== null && typeof error === 'object') {
    const value = error as { name?: unknown; code?: unknown; message?: unknown };
    // jsi::JSError preserves the native failure code as its message while
    // exposing the generic JavaScript Error name. Keep the comparison exact;
    // the message is never emitted into lifecycle evidence.
    if (value.message === 'BindingFailure') {
      return 'BindingFailure';
    }
    if (value.name === 'WalletCoreBackendInitializationError') {
      return 'WalletCoreBackendInitializationError';
    }
    if (value.name === 'WalletCoreError' && typeof value.code === 'string') {
      return `WalletCoreError:${value.code}`;
    }
    if (
      value.name === 'SNWCSmokeAssertionError' &&
      typeof (value as { message?: unknown }).message === 'string'
    ) {
      return `SNWCSmokeAssertionError:${
        (value as { message: string }).message
      }`;
    }
    if (typeof value.name === 'string') {
      return value.name;
    }
  }
  return 'UnknownError';
}

function nativeModule(): NativeModule {
  return TurboModuleRegistry.getEnforcing(
    expectedModuleName,
  ) as unknown as NativeModule;
}

function providerIdentity(
  module: NativeModule,
): { target_id: string; artifact_identity: string } {
  const identity = module.invoke('__snwc_runtime_identity', { args: [] });
  if (identity === null || typeof identity !== 'object') {
    smokeAssertion('provider-identity:missing');
  }
  const value = identity as {
    module_name?: unknown;
    module_identity?: unknown;
    architecture?: unknown;
    target_id?: unknown;
    artifact_identity?: unknown;
  };
  if (
    value.module_name !== expectedModuleName ||
    value.module_identity !== expectedModuleIdentity ||
    value.architecture !== 'new' ||
    typeof value.target_id !== 'string' ||
    typeof value.artifact_identity !== 'string'
  ) {
    smokeAssertion('provider-identity:mismatch');
  }
  return {
    target_id: value.target_id,
    artifact_identity: value.artifact_identity,
  };
}

type LifecycleProbe = {
  runtime_identity: string;
  module_registry_identity: string;
  logical_context_identity: string;
  provider_identity: string;
  registration_identity: string;
  provider_generation: number;
  integration_test: boolean;
};

type CleanupEvidence = {
  owned_release_count: number;
  secret_zeroize_count: number;
  cleanup_complete: boolean;
};

function lifecycleProbe(module: NativeModule): LifecycleProbe {
  const raw = module.invoke('__snwc_lifecycle_probe', { args: [] });
  if (raw === null || typeof raw !== 'object') {
    smokeAssertion('lifecycle-probe:missing');
  }
  const value = raw as Partial<LifecycleProbe>;
  if (
    typeof value.runtime_identity !== 'string' ||
    typeof value.module_registry_identity !== 'string' ||
    typeof value.logical_context_identity !== 'string' ||
    typeof value.provider_identity !== 'string' ||
    typeof value.registration_identity !== 'string' ||
    typeof value.provider_generation !== 'number' ||
    typeof value.integration_test !== 'boolean'
  ) {
    smokeAssertion('lifecycle-probe:mismatch');
  }
  return value as LifecycleProbe;
}

function cleanupEvidence(module: NativeModule): CleanupEvidence {
  const raw = module.invoke('__snwc_test_cleanup_evidence', { args: [] });
  if (raw === null || typeof raw !== 'object') {
    smokeAssertion('cleanup-evidence:missing');
  }
  const value = raw as Partial<CleanupEvidence>;
  if (
    typeof value.owned_release_count !== 'number' ||
    typeof value.secret_zeroize_count !== 'number' ||
    typeof value.cleanup_complete !== 'boolean'
  ) {
    smokeAssertion('cleanup-evidence:mismatch');
  }
  return value as CleanupEvidence;
}

function exportRequest(profileId: string, keyId?: string): ExportRequest {
  const target: ExportRequest['target'] =
    keyId === undefined
      ? { kind: 'mnemonic', profile_id: profileId }
      : { kind: 'software_key', profile_id: profileId, key_id: keyId };
  return {
    target,
    user_request: { target, status: 'requested' },
    application_confirmation: { target, status: 'confirmed' },
  };
}

export default function App() {
  const [smokeStatus, setSmokeStatus] = useState('SNWC_RN_NATIVE_SMOKE_START');
  const [providerStatus, setProviderStatus] = useState(
    'SNWC_RN_NATIVE_PROVIDER_NOT_CHECKED',
  );
  const smokeStarted = useRef(false);

  useEffect(() => {
    if (smokeStarted.current) return;
    smokeStarted.current = true;
    let active = true;
    let failureReported = false;
    const yieldToUi = () =>
      new Promise<void>(resolve => setTimeout(resolve, 0));
    const setStatus = (value: string) => {
      console.log(value);
      if (active) setSmokeStatus(value);
    };
    const step = async <T,>(name: string, call: () => T): Promise<T> => {
      setStatus(`SNWC_RN_NATIVE_SMOKE_STEP:${name}:start`);
      await yieldToUi();
      try {
        const value = call();
        setStatus(`SNWC_RN_NATIVE_SMOKE_STEP:${name}:done`);
        await yieldToUi();
        return value;
      } catch (error) {
        const code = errorCode(error);
        failureReported = true;
        setStatus(`SNWC_RN_NATIVE_SMOKE_FAIL:${name}:${code}`);
        throw error;
      }
    };

    const run = async () => {
      const module = nativeModule();
      const identity = providerIdentity(module);
      const lifecycle = lifecycleProbe(module);
      if (lifecycle.integration_test && lifecycle.provider_generation > 1) {
        setStatus(`SNWC_RN_NATIVE_RUNTIME_READY:${JSON.stringify(lifecycle)}`);
        setStatus('SNWC_RN_NATIVE_LIFECYCLE_RELOAD_COMPLETED');
        const cleanup = cleanupEvidence(module);
        if (
          !cleanup.cleanup_complete ||
          cleanup.owned_release_count !== 1 ||
          cleanup.secret_zeroize_count !== 1
        ) {
          smokeAssertion('cleanup-evidence:not-exactly-once');
        }
        setStatus('SNWC_RN_NATIVE_CLEANUP_PASS:EXACTLY_ONCE');
      }
      setProviderStatus(
        `SNWC_RN_NATIVE_PROVIDER_READY:${identity.target_id}:${identity.artifact_identity}`,
      );
      await yieldToUi();

      const emptyStore = requireBytes(
        await step('create_empty_store', () => walletCore.create_empty_store()),
        'create_empty_store',
      );
      const prepared = requireRead(
        await step('prepare_generated_profile', () =>
          walletCore.prepare_generated_profile(emptyStore, password, 0),
        ),
        'prepare_generated_profile',
      ).value;
      const pendingProfile = requireBytes(
        prepared.pending_profile,
        'prepare_generated_profile:pending_profile',
      );
      const generatedMnemonic = requireBytes(
        prepared.mnemonic_utf8,
        'prepare_generated_profile:mnemonic_utf8',
      );
      requireMutation(
        await step('finalize_generated_profile', () =>
          walletCore.finalize_generated_profile(
            emptyStore,
            pendingProfile,
            password,
            { status: 'confirmed' },
          ),
        ),
        'finalize_generated_profile',
      );
      const restored = requireMutation(
        await step('restore_profile', () =>
          walletCore.restore_profile(
            emptyStore,
            generatedMnemonic,
            password,
            0,
          ),
        ),
        'restore_profile',
      );
      const profileId = restored.value?.profile_id;
      if (typeof profileId !== 'string')
        smokeAssertion('restore_profile:missing-profile-id');

      requireRead(
        await step('list_profiles', () =>
          walletCore.list_profiles(restored.store),
        ),
        'list_profiles',
      );
      requireRead(
        await step('export_mnemonic', () =>
          walletCore.export_mnemonic(
            restored.store,
            exportRequest(profileId),
            password,
          ),
        ),
        'export_mnemonic',
      );
      const generated = requireMutation(
        await step('generate_software_key', () =>
          walletCore.generate_software_key(
            restored.store,
            profileId,
            password,
            0,
          ),
        ),
        'generate_software_key',
      );
      requireRead(
        await step('export_private_key', () =>
          walletCore.export_private_key(
            generated.store,
            exportRequest(profileId, generated.value?.key_id),
            password,
          ),
        ),
        'export_private_key',
      );
      requireRead(
        await step('list_software_keys', () =>
          walletCore.list_software_keys(generated.store, profileId),
        ),
        'list_software_keys',
      );
      const derived = requireMutation(
        await step('derive_software_key', () =>
          walletCore.derive_software_key(
            generated.store,
            profileId,
            password,
            1,
            0,
          ),
        ),
        'derive_software_key',
      );
      const imported = requireMutation(
        await step('import_software_key', () =>
          walletCore.import_software_key(
            derived.store,
            profileId,
            password,
            0,
            accountPrivateKey,
          ),
        ),
        'import_software_key',
      );
      const signature = requireMutation(
        await step('import_software_key_signature', () =>
          walletCore.import_software_key(
            imported.store,
            profileId,
            password,
            0,
            signaturePrivateKey,
          ),
        ),
        'import_software_key_signature',
      );
      requireRead(
        await step('get_public_account', () =>
          walletCore.get_public_account(
            derived.store,
            profileId,
            derived.value?.key_id,
            { chain: 'symbol', network: 'testnet' },
            password,
          ),
        ),
        'get_public_account',
      );
      const signingRequest: SigningRequest = {
        target: {
          profile_id: profileId,
          key_id: signature.value?.key_id,
          context: { chain: 'nem', network: 'testnet' },
        },
        payload: smokePayload,
        approval: { status: 'approved' },
      };
      requireRead(
        await step('sign', () =>
          walletCore.sign(signature.store, signingRequest, password),
        ),
        'sign',
      );
      const changed = requireMutation(
        await step('change_profile_password', () =>
          walletCore.change_profile_password(
            signature.store,
            profileId,
            password,
            newPassword,
          ),
        ),
        'change_profile_password',
      );
      const deletedKey = requireMutation(
        await step('delete_software_key', () =>
          walletCore.delete_software_key(
            changed.store,
            profileId,
            generated.value?.key_id,
            newPassword,
          ),
        ),
        'delete_software_key',
      );
      await step('delete_profile', () =>
        walletCore.delete_profile(deletedKey.store, profileId, newPassword),
      );
      setStatus('SNWC_RN_NATIVE_SMOKE_PASS:16');
      if (lifecycle.integration_test && lifecycle.provider_generation === 1) {
        setStatus('SNWC_RN_NATIVE_STALE_GATE_ARMED');
        try {
          module.invoke('__snwc_test_stale_output', { args: [] });
          smokeAssertion('stale-completion:accepted');
        } catch (error) {
          if (errorCode(error) !== 'BindingFailure') throw error;
          setStatus('SNWC_RN_NATIVE_STALE_COMPLETION_REJECTED');
        }
      }
      if (!lifecycle.integration_test || lifecycle.provider_generation === 1) {
        setStatus(`SNWC_RN_NATIVE_RUNTIME_READY:${JSON.stringify(lifecycle)}`);
      }
    };

    run().catch(error => {
      if (!failureReported) {
        setStatus(`SNWC_RN_NATIVE_SMOKE_FAIL:unhandled:${errorCode(error)}`);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <View>
      <Text
        testID="snwc-native-provider-status"
        accessibilityLabel={providerStatus}
      >
        {providerStatus}
      </Text>
      <Text testID="snwc-native-smoke-status" accessibilityLabel={smokeStatus}>
        {smokeStatus}
      </Text>
      <Text>SymbolNemWalletCoreRN smoke consumer</Text>
    </View>
  );
}
