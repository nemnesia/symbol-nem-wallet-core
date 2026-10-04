/**
 * 操作の引数に使うネットワーク定数。TESTNET は 0、MAINNET は 1。
 */
export declare const Network: Readonly<{ TESTNET: 0; MAINNET: 1 }>;
/**
 * 操作の引数に使うネットワーク値。0 は Testnet、1 は Mainnet。
 */
export type Network = (typeof Network)[keyof typeof Network];
/**
 * 操作の引数に使うチェーン定数。NEM は 0、SYMBOL は 1。
 */
export declare const Chain: Readonly<{ NEM: 0; SYMBOL: 1 }>;
/**
 * 操作の引数に使うチェーン値。0 は NEM、1 は Symbol。
 */
export type Chain = (typeof Chain)[keyof typeof Chain];
/**
 * DTO 内のネットワーク名。数値の Network とは区別する。
 */
export type NetworkName = "testnet" | "mainnet";
/**
 * DTO 内のチェーン名。数値の Chain とは区別する。
 */
export type ChainName = "nem" | "symbol";
/**
 * Profile を識別するハイフン区切りの UUID 文字列。
 */
export type ProfileId = string;
/**
 * Software Key を識別するハイフン区切りの UUID 文字列。
 */
export type SoftwareKeyId = string;
/**
 * HD 導出のアカウント番号。0〜2,147,483,647 の整数。
 */
export type AccountIndex = number;

/**
 * Mnemonic の明示的なエクスポート対象。
 */
export type MnemonicExportTarget = {
  /**
   * 対象または由来を識別する種別。
   */
  kind: "mnemonic";
  /**
   * 対象 Profile の UUID。
   */
  profile_id: ProfileId;
  /**
   * 対象 Software Key の UUID。Mnemonic の対象では指定しない。
   */
  key_id?: undefined;
};

/**
 * Software Key の秘密鍵の明示的なエクスポート対象。
 */
export type SoftwareKeyExportTarget = {
  /**
   * 対象または由来を識別する種別。
   */
  kind: "software_key";
  /**
   * 対象 Profile の UUID。
   */
  profile_id: ProfileId;
  /**
   * 対象 Software Key の UUID。
   */
  key_id: SoftwareKeyId;
};

/**
 * Mnemonic または Software Key の秘密鍵のエクスポート対象。
 */
export type ExportTarget = MnemonicExportTarget | SoftwareKeyExportTarget;

/**
 * 現在の操作に対する利用者のエクスポート要求状態。
 */
export type ExportUserRequestStatus = "not_requested" | "requested";

/**
 * 利用者が現在の対象について行ったエクスポート要求。
 */
export interface ExportUserRequest {
  /**
   * 現在の操作の対象。他の要求・確認に記録した対象と一致させる。
   */
  target: ExportTarget;
  /**
   * 現在の操作について Application が取得した要求・確認・承認の状態。
   */
  status: ExportUserRequestStatus;
}

/**
 * 現在の操作に対する Application のエクスポート確認状態。
 */
export type ExportApplicationConfirmationStatus = "not_confirmed" | "confirmed";

/**
 * Application が現在の対象について取得したエクスポート確認。
 */
export interface ExportApplicationConfirmation {
  /**
   * 現在の操作の対象。他の要求・確認に記録した対象と一致させる。
   */
  target: ExportTarget;
  /**
   * 現在の操作について Application が取得した要求・確認・承認の状態。
   */
  status: ExportApplicationConfirmationStatus;
}

/**
 * 明示的なエクスポート要求。3 つの target は一致し、要求と確認はそれぞれ requested / confirmed である必要がある。
 */
export interface ExportRequest {
  /**
   * 現在の操作の対象。他の要求・確認に記録した対象と一致させる。
   */
  target: ExportTarget;
  /**
   * 利用者による現在のエクスポート要求。
   */
  user_request: ExportUserRequest;
  /**
   * Application による現在のエクスポート確認。
   */
  application_confirmation: ExportApplicationConfirmation;
}

/**
 * 要求するチェーンとネットワーク。保存済みの Software Key / Profile と一致する必要がある。
 */
export interface AccountContext {
  /**
   * チェーン名。Software Key の固定されたチェーンと対応する。
   */
  chain: ChainName;
  /**
   * ネットワーク名。Profile の固定されたネットワークと対応する。
   */
  network: NetworkName;
}

/**
 * 署名に使う Profile、Software Key とチェーン・ネットワークの組合せ。
 */
export interface SigningTarget {
  /**
   * 対象 Profile の UUID。
   */
  profile_id: ProfileId;
  /**
   * 対象 Software Key の UUID。
   */
  key_id: SoftwareKeyId;
  /**
   * 対象のチェーンとネットワーク。
   */
  context: AccountContext;
}

/**
 * 現在の署名対象と payload に対する利用者の承認状態。
 */
export type SigningApprovalStatus = "not_approved" | "approved";

/**
 * Application が現在の署名内容について取得した明示的な承認。
 */
export interface SigningApproval {
  /**
   * 現在の操作について Application が取得した要求・確認・承認の状態。
   */
  status: SigningApprovalStatus;
}

/**
 * 署名要求。Application は payload を解釈・表示し、同じ内容への明示承認を取得してから構築する。
 */
export interface SigningRequest {
  /**
   * 現在の操作の対象。他の要求・確認に記録した対象と一致させる。
   */
  target: SigningTarget;
  /**
   * 承認した署名対象の raw byte 列。Core は意味を解釈しない。
   */
  payload: Uint8Array;
  /**
   * 現在の target と payload への明示承認。
   */
  approval: SigningApproval;
}

/**
 * デコード時の警告。秘密情報を含まない。
 */
export interface DecodeWarning {
  /**
   * 警告を識別するコード。
   */
  code: string;
  /**
   * 警告の対象となったオブジェクトの種類。
   */
  object_type: string;
  /**
   * 対象オブジェクトの識別子。該当しない場合は undefined。
   */
  object_id: string | undefined;
  /**
   * 対象フィールド名。該当しない場合は undefined。
   */
  field: string | undefined;
}

/**
 * Profile の公開情報。Network は Profile 作成時に固定される。
 */
export interface ProfileInfo {
  /**
   * 対象 Profile の UUID。
   */
  profile_id: ProfileId;
  /**
   * ネットワーク名。Profile の固定されたネットワークと対応する。
   */
  network: NetworkName;
  /**
   * Profile に登録された Software Key の数。
   */
  software_key_count: number;
}

/**
 * Software Key の由来。導出、取込み、Core による生成を区別する。
 */
export type SoftwareKeyOriginKind = "derived" | "imported" | "generated";

/**
 * Software Key の由来と、導出に使ったアカウント番号。
 */
export interface SoftwareKeyOrigin {
  /**
   * 対象または由来を識別する種別。
   */
  kind: SoftwareKeyOriginKind;
  /**
   * derived の場合の導出アカウント番号。imported / generated の場合は null。
   */
  account_index: number | null;
}

/**
 * 認証済み操作が返す Software Key の情報。
 */
export interface SoftwareKeyInfo {
  /**
   * 対象 Software Key の UUID。
   */
  key_id: SoftwareKeyId;
  /**
   * チェーン名。Software Key の固定されたチェーンと対応する。
   */
  chain: ChainName;
  /**
   * 認証済み操作で取得した Software Key の由来。
   */
  origin: SoftwareKeyOrigin;
}

/**
 * Software Key の公開一覧項目。由来や秘密鍵は含まない。
 */
export interface SoftwareKeyListItem {
  /**
   * 対象 Software Key の UUID。
   */
  key_id: SoftwareKeyId;
  /**
   * チェーン名。Software Key の固定されたチェーンと対応する。
   */
  chain: ChainName;
}

/**
 * 指定したチェーンとネットワークで利用する公開鍵とアドレス。
 */
export interface PublicAccountInfo {
  /**
   * 対象 Software Key の UUID。
   */
  key_id: SoftwareKeyId;
  /**
   * チェーン名。Software Key の固定されたチェーンと対応する。
   */
  chain: ChainName;
  /**
   * ネットワーク名。Profile の固定されたネットワークと対応する。
   */
  network: NetworkName;
  /**
   * 公開鍵の raw 32 bytes。
   */
  public_key: Uint8Array;
  /**
   * チェーンとネットワークに対応するアドレス文字列。
   */
  address: string;
}

/**
 * 生成した Mnemonic と未確定の Pending Profile。利用後は秘密情報の buffer を上書きし、参照を破棄する。
 */
export interface PreparedProfile {
  /**
   * Mnemonic の UTF-8 byte 列。ログや長期 state に保持しない。
   */
  mnemonic_utf8: Uint8Array;
  /**
   * 未確定の opaque Pending Profile。内容を解釈・編集しない。
   */
  pending_profile: Uint8Array;
}

/**
 * 明示的なエクスポートで取得した Mnemonic。表示・利用後は buffer を上書きし、参照を破棄する。
 */
export interface MnemonicExport {
  /**
   * Mnemonic の UTF-8 byte 列。ログや長期 state に保持しない。
   */
  mnemonic_utf8: Uint8Array;
}

/**
 * 明示的なエクスポートで取得した秘密鍵。利用後は buffer を上書きし、参照を破棄する。
 */
export interface PrivateKeyExport {
  /**
   * 秘密鍵の raw 32 bytes。hex 文字列ではない。
   */
  private_key: Uint8Array;
}

/**
 * 要求した raw payload に対する署名結果。
 */
export interface Signature {
  /**
   * 署名の raw 64 bytes。
   */
  signature: Uint8Array;
}

/**
 * 入力 Store を変更しない読み取り操作の結果。
 */
export interface ReadResult<T> {
  /**
   * 操作の結果値。UnitMutationResult では null。
   */
  value: T;
  /**
   * 操作で検出した警告の一覧。警告がなければ空配列。
   */
  warnings: DecodeWarning[];
}

/**
 * 更新操作の結果。成功後は store を次の操作と永続化に使用し、入力 Store を置き換える。永続化失敗時は直前の確定済み Store を維持する。
 */
export interface MutationResult<T> {
  /**
   * 成功時の完全な置換用 Store。次の操作と永続化に使う。
   */
  store: Uint8Array;
  /**
   * 操作の結果値。UnitMutationResult では null。
   */
  value: T;
  /**
   * 操作で検出した警告の一覧。警告がなければ空配列。
   */
  warnings: DecodeWarning[];
}

/**
 * Profile の公開一覧と警告。
 */
export type ProfileListResult = ReadResult<ProfileInfo[]>;
/**
 * Software Key の公開一覧と警告。
 */
export type SoftwareKeyListResult = ReadResult<SoftwareKeyListItem[]>;
/**
 * 生成した Mnemonic、Pending Profile と警告。
 */
export type PreparedProfileResult = ReadResult<PreparedProfile>;
/**
 * 明示的にエクスポートした Mnemonic と警告。
 */
export type MnemonicExportResult = ReadResult<MnemonicExport>;
/**
 * 明示的にエクスポートした秘密鍵と警告。
 */
export type PrivateKeyExportResult = ReadResult<PrivateKeyExport>;
/**
 * 公開 Account 情報と警告。
 */
export type PublicAccountResult = ReadResult<PublicAccountInfo>;
/**
 * 署名と警告。
 */
export type SignatureResult = ReadResult<Signature>;
/**
 * 更新後の完全な Store、Profile 情報と警告。
 */
export type ProfileMutationResult = MutationResult<ProfileInfo>;
/**
 * 更新後の完全な Store、Software Key 情報と警告。
 */
export type SoftwareKeyMutationResult = MutationResult<SoftwareKeyInfo>;
/**
 * 更新後の完全な Store と警告。value は null。
 */
export type UnitMutationResult = MutationResult<null>;

/**
 * Core 操作および binding の失敗を表す安定したエラーコード。
 */
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

/**
 * 操作失敗時に throw されるエラーの型。message は code と同じ値。型宣言のみであり、runtime のクラスとして export されない。
 */
export interface WalletCoreError extends Error {
  /**
   * エラーの種類を識別する固定名。
   */
  readonly name: "WalletCoreError";
  /**
   * 操作の失敗を識別する ErrorCode。
   */
  readonly code: ErrorCode;
  /**
   * 秘密情報を含まない固定のエラーメッセージ。
   */
  readonly message: ErrorCode;
}

/**
 * backend の読込み・初期化失敗時のエラーの型。Core 操作の失敗とは区別する。型宣言のみ。
 */
export interface BackendInitializationError extends Error {
  /**
   * エラーの種類を識別する固定名。
   */
  readonly name: "WalletCoreBackendInitializationError";
  /**
   * 秘密情報を含まない固定のエラーメッセージ。
   */
  readonly message: "backend initialization failed";
}

/**
 * 空の Wallet Store を同期的に作成する。
 *
 * @returns 新しい opaque Store の byte 列。
 */
export function create_empty_store(): Uint8Array;

/**
 * 新しい Mnemonic と Pending Profile を同期的に準備する。Profile はまだ Store に確定しない。
 *
 * @remarks Mnemonic 全体を意図した利用者へ安全に提示し、現在の操作について明示的な受領確認を取得する。秘密情報をログへ出力しない。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @param network Profile 作成時に固定する Network.TESTNET または Network.MAINNET。
 * @returns Mnemonic、Pending Profile と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function prepare_generated_profile(
  store: Uint8Array,
  password_utf8: Uint8Array,
  network: Network,
): PreparedProfileResult;

/**
 * 準備済みの Pending Profile を認証し、Profile として同期的に確定する。
 *
 * @remarks Application は Mnemonic の明示的な受領確認を取得した後だけ呼ぶ。確認は引数に含めず、Core はその実施を独立検証しない。成功時は返された store で入力 Store を置き換える。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param pending_profile prepare_generated_profile が返した opaque Pending Profile。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @returns 更新後の完全な Store、確定した Profile 情報と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function finalize_generated_profile(
  store: Uint8Array,
  pending_profile: Uint8Array,
  password_utf8: Uint8Array,
): ProfileMutationResult;

/**
 * 既存の Mnemonic から Profile を同期的に復元する。
 *
 * @remarks BIP39 passphrase は非対応で空文字列固定。Profile password は保存データの暗号化・認証に使い、BIP39 passphrase には使わない。成功時は返された store で入力 Store を置き換える。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param mnemonic_utf8 復元に使う BIP39 Mnemonic の UTF-8 byte 列。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @param network Profile 作成時に固定する Network.TESTNET または Network.MAINNET。
 * @returns 更新後の完全な Store、復元した Profile 情報と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function restore_profile(
  store: Uint8Array,
  mnemonic_utf8: Uint8Array,
  password_utf8: Uint8Array,
  network: Network,
): ProfileMutationResult;

/**
 * Store の公開 index から Profile を同期的に一覧取得する。
 *
 * @remarks Profile password を要求しない。この一覧は未認証の平文 index に基づく。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @returns Profile の公開一覧と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function list_profiles(store: Uint8Array): ProfileListResult;

/**
 * 明示的な利用者要求と Application の確認に基づき、Mnemonic を同期的にエクスポートする。
 *
 * @remarks target は Mnemonic を指定し、各 target の一致、requested / confirmed と正しい Profile password が必要。返却された秘密情報の表示・保管・利用・破棄は Application の責任。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param request 現在の利用者要求と Application の確認を含むエクスポート要求。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @returns Mnemonic の UTF-8 byte 列と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function export_mnemonic(
  store: Uint8Array,
  request: ExportRequest,
  password_utf8: Uint8Array,
): MnemonicExportResult;

/**
 * 明示的な利用者要求と Application の確認に基づき、Software Key の秘密鍵を同期的にエクスポートする。
 *
 * @remarks target は Software Key を指定し、各 target の一致、requested / confirmed と正しい Profile password が必要。返却された秘密情報は利用後に上書きし、参照を破棄する。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param request 現在の利用者要求と Application の確認を含むエクスポート要求。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @returns 秘密鍵の raw 32 bytes と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function export_private_key(
  store: Uint8Array,
  request: ExportRequest,
  password_utf8: Uint8Array,
): PrivateKeyExportResult;

/**
 * Profile の公開 index から Software Key を同期的に一覧取得する。
 *
 * @remarks Profile password を要求しない。この一覧は未認証の平文 index に基づく。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param profile_id 対象 Profile の UUID。
 * @returns 秘密鍵と由来を含まない Software Key の公開一覧と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function list_software_keys(
  store: Uint8Array,
  profile_id: ProfileId,
): SoftwareKeyListResult;

/**
 * 保存済み Mnemonic から指定チェーン・アカウント番号の Software Key を同期的に導出する。
 *
 * @remarks Profile の Network と指定 Chain に対応する固定の HD 導出規則を使う。BIP39 passphrase は空文字列固定。成功時は返された store で入力 Store を置き換える。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param profile_id 対象 Profile の UUID。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @param chain Software Key に固定する Chain.NEM または Chain.SYMBOL。
 * @param account_index 導出するアカウント番号。0〜2,147,483,647 の整数。
 * @returns 更新後の完全な Store、導出した Software Key 情報と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function derive_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
  chain: Chain,
  account_index: AccountIndex,
): SoftwareKeyMutationResult;

/**
 * 指定チェーンの raw 秘密鍵を Software Key として同期的に取り込む。
 *
 * @remarks private_key は hex 文字列ではなく raw 32 bytes。成功時は返された store で入力 Store を置き換える。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param profile_id 対象 Profile の UUID。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @param chain Software Key に固定する Chain.NEM または Chain.SYMBOL。
 * @param private_key 取り込む秘密鍵の raw 32 bytes。
 * @returns 更新後の完全な Store、取り込んだ Software Key 情報と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function import_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
  chain: Chain,
  private_key: Uint8Array,
): SoftwareKeyMutationResult;

/**
 * Core の暗号学的乱数で指定チェーンの Software Key を同期的に生成する。
 *
 * @remarks 成功時は返された store で入力 Store を置き換える。秘密鍵自体はこの操作では返さない。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param profile_id 対象 Profile の UUID。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @param chain Software Key に固定する Chain.NEM または Chain.SYMBOL。
 * @returns 更新後の完全な Store、生成した Software Key 情報と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function generate_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
  chain: Chain,
): SoftwareKeyMutationResult;

/**
 * Profile password で認証し、指定した context の公開鍵とアドレスを同期的に取得する。
 *
 * @remarks context は保存済み Profile の Network と Software Key の Chain に一致する必要がある。暗黙の変換は行わない。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param profile_id 対象 Profile の UUID。
 * @param key_id 対象 Software Key の UUID。
 * @param requested_context 保存済みのチェーン・ネットワークと照合する context。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @returns 公開 Account 情報と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function get_public_account(
  store: Uint8Array,
  profile_id: ProfileId,
  key_id: SoftwareKeyId,
  requested_context: AccountContext,
  password_utf8: Uint8Array,
): PublicAccountResult;

/**
 * 承認済み要求の raw payload に同期的に署名する。
 *
 * @remarks Application は署名前に内容を解釈・表示し、同じ target・context・payload に対する明示承認を取得する。Core は Transaction の解釈・再構成や prefix の追加を行わない。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param request 現在の署名対象、raw payload と明示承認を含む要求。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @returns raw 64 bytes の署名と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function sign(
  store: Uint8Array,
  request: SigningRequest,
  password_utf8: Uint8Array,
): SignatureResult;

/**
 * 現在の Profile password で認証し、新しい password に同期的に変更する。
 *
 * @remarks Mnemonic と導出規則は変わらない。BIP39 passphrase を変更する操作ではない。成功時は返された store で入力 Store を置き換える。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param profile_id 対象 Profile の UUID。
 * @param current_password_utf8 現在の Profile password の UTF-8 byte 列。
 * @param new_password_utf8 新しい空でない Profile password の UTF-8 byte 列。
 * @returns 更新後の完全な Store、null の value と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function change_profile_password(
  store: Uint8Array,
  profile_id: ProfileId,
  current_password_utf8: Uint8Array,
  new_password_utf8: Uint8Array,
): UnitMutationResult;

/**
 * 認証した Profile から指定の Software Key を同期的に削除する。
 *
 * @remarks 対象以外の Software Key は削除しない。成功時は返された store で入力 Store を置き換える。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param profile_id 対象 Profile の UUID。
 * @param key_id 対象 Software Key の UUID。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @returns 更新後の完全な Store、null の value と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function delete_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  key_id: SoftwareKeyId,
  password_utf8: Uint8Array,
): UnitMutationResult;

/**
 * 認証した Profile と配下のすべての Software Key を同期的に削除する。
 *
 * @remarks 成功時は返された store で入力 Store を置き換える。Application が保持する backup やエクスポート済みの秘密情報を消去する操作ではない。
 *
 * @param store 現在の opaque Wallet Store。内容を解釈・編集せず渡す。
 * @param profile_id 対象 Profile の UUID。
 * @param password_utf8 Profile password の UTF-8 byte 列。BIP39 passphrase ではない。
 * @returns 更新後の完全な Store、null の value と警告。
 * @throws 操作や入力の検証に失敗した場合は WalletCoreError。
 */
export function delete_profile(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
): UnitMutationResult;
