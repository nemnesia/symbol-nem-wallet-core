export type Network = 0 | 1;
export type Chain = 0 | 1;
export type NetworkName = "testnet" | "mainnet";
export type ChainName = "nem" | "symbol";
export type ProfileId = string;
export type SoftwareKeyId = string;
export type AccountIndex = number;

export type HandoffConfirmationStatus = "unconfirmed" | "confirmed";

export interface HandoffConfirmation {
  status: HandoffConfirmationStatus;
}

export type MnemonicExportTarget = {
  kind: "mnemonic";
  profile_id: ProfileId;
  key_id?: undefined;
};

export type SoftwareKeyExportTarget = {
  kind: "software_key";
  profile_id: ProfileId;
  key_id: SoftwareKeyId;
};

export type ExportTarget = MnemonicExportTarget | SoftwareKeyExportTarget;

export type ExportUserRequestStatus = "not_requested" | "requested";

export interface ExportUserRequest {
  target: ExportTarget;
  status: ExportUserRequestStatus;
}

export type ExportApplicationConfirmationStatus = "not_confirmed" | "confirmed";

export interface ExportApplicationConfirmation {
  target: ExportTarget;
  status: ExportApplicationConfirmationStatus;
}

export interface ExportRequest {
  target: ExportTarget;
  user_request: ExportUserRequest;
  application_confirmation: ExportApplicationConfirmation;
}

export interface AccountContext {
  chain: ChainName;
  network: NetworkName;
}

export interface SigningTarget {
  profile_id: ProfileId;
  key_id: SoftwareKeyId;
  context: AccountContext;
}

export type SigningApprovalStatus = "not_approved" | "approved";

export interface SigningApproval {
  status: SigningApprovalStatus;
}

export interface SigningRequest {
  target: SigningTarget;
  payload: Uint8Array;
  approval: SigningApproval;
}

export interface DecodeWarning {
  code: string;
  object_type: string;
  object_id: string | undefined;
  field: string | undefined;
}

export interface ProfileInfo {
  profile_id: ProfileId;
  network: NetworkName;
  software_key_count: number;
}

export type SoftwareKeyOriginKind = "derived" | "imported" | "generated";

export interface SoftwareKeyOrigin {
  kind: SoftwareKeyOriginKind;
  account_index: number | null;
}

export interface SoftwareKeyInfo {
  key_id: SoftwareKeyId;
  chain: ChainName;
  origin: SoftwareKeyOrigin;
}

export interface SoftwareKeyListItem {
  key_id: SoftwareKeyId;
  chain: ChainName;
}

export interface PublicAccountInfo {
  key_id: SoftwareKeyId;
  chain: ChainName;
  network: NetworkName;
  public_key: Uint8Array;
  address: string;
}

export interface PreparedProfile {
  mnemonic_utf8: Uint8Array;
  pending_profile: Uint8Array;
}

export interface MnemonicExport {
  mnemonic_utf8: Uint8Array;
}

export interface PrivateKeyExport {
  private_key: Uint8Array;
}

export interface Signature {
  signature: Uint8Array;
}

export interface ReadResult<T> {
  value: T;
  warnings: DecodeWarning[];
}

export interface MutationResult<T> {
  store: Uint8Array;
  value: T;
  warnings: DecodeWarning[];
}

export type ProfileListResult = ReadResult<ProfileInfo[]>;
export type SoftwareKeyListResult = ReadResult<SoftwareKeyListItem[]>;
export type PreparedProfileResult = ReadResult<PreparedProfile>;
export type MnemonicExportResult = ReadResult<MnemonicExport>;
export type PrivateKeyExportResult = ReadResult<PrivateKeyExport>;
export type PublicAccountResult = ReadResult<PublicAccountInfo>;
export type SignatureResult = ReadResult<Signature>;
export type ProfileMutationResult = MutationResult<ProfileInfo>;
export type SoftwareKeyMutationResult = MutationResult<SoftwareKeyInfo>;
export type UnitMutationResult = MutationResult<null>;

export type ErrorCode =
  | "InvalidArgument"
  | "InvalidStore"
  | "UnsupportedStoreVersion"
  | "UnsupportedProfileSchemaVersion"
  | "ProfileNotFound"
  | "SoftwareKeyNotFound"
  | "AuthenticationFailed"
  | "InvalidMnemonic"
  | "InvalidPrivateKey"
  | "DuplicateProfile"
  | "DuplicateSoftwareKey"
  | "InvalidAccountIndex"
  | "NetworkMismatch"
  | "CryptoFailure"
  | "RandomSourceFailure"
  | "SerializationFailure"
  | "PendingProfileInvalid"
  | "BindingFailure";

export interface WalletCoreError extends Error {
  readonly name: "WalletCoreError";
  readonly code: ErrorCode;
  readonly message: ErrorCode;
}

export interface BackendInitializationError extends Error {
  readonly name: "WalletCoreBackendInitializationError";
  readonly message: "backend initialization failed";
}

export function create_empty_store(): Uint8Array;

export function prepare_generated_profile(
  store: Uint8Array,
  password_utf8: Uint8Array,
  network: Network,
): PreparedProfileResult;

export function finalize_generated_profile(
  store: Uint8Array,
  pending_profile: Uint8Array,
  password_utf8: Uint8Array,
  handoff_confirmation: HandoffConfirmation,
): ProfileMutationResult;

export function restore_profile(
  store: Uint8Array,
  mnemonic_utf8: Uint8Array,
  password_utf8: Uint8Array,
  network: Network,
): ProfileMutationResult;

export function list_profiles(store: Uint8Array): ProfileListResult;

export function export_mnemonic(
  store: Uint8Array,
  request: ExportRequest,
  password_utf8: Uint8Array,
): MnemonicExportResult;

export function export_private_key(
  store: Uint8Array,
  request: ExportRequest,
  password_utf8: Uint8Array,
): PrivateKeyExportResult;

export function list_software_keys(
  store: Uint8Array,
  profile_id: ProfileId,
): SoftwareKeyListResult;

export function derive_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
  chain: Chain,
  account_index: AccountIndex,
): SoftwareKeyMutationResult;

export function import_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
  chain: Chain,
  private_key: Uint8Array,
): SoftwareKeyMutationResult;

export function generate_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
  chain: Chain,
): SoftwareKeyMutationResult;

export function get_public_account(
  store: Uint8Array,
  profile_id: ProfileId,
  key_id: SoftwareKeyId,
  requested_context: AccountContext,
  password_utf8: Uint8Array,
): PublicAccountResult;

export function sign(
  store: Uint8Array,
  request: SigningRequest,
  password_utf8: Uint8Array,
): SignatureResult;

export function change_profile_password(
  store: Uint8Array,
  profile_id: ProfileId,
  current_password_utf8: Uint8Array,
  new_password_utf8: Uint8Array,
): UnitMutationResult;

export function delete_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  key_id: SoftwareKeyId,
  password_utf8: Uint8Array,
): UnitMutationResult;

export function delete_profile(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
): UnitMutationResult;
