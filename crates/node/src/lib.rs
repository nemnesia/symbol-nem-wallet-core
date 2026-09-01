#![deny(unsafe_code)]
#![warn(missing_docs)]

//! Node-APIによるSymbol / NEM Wallet Core Binding。
//!
//! JavaScriptのrepresentation、入力の一時copy、出力の所有権、lifecycleおよび
//! Core errorのtransportだけを担当し、暗号、認証、導出、authorization、Store解釈、
//! Chain / Network policyはCoreへ委譲する。

use napi::bindgen_prelude::*;
use napi::{Error, Status};
use napi_derive::napi;
use symbol_nem_wallet_core as core;
use uuid::Uuid;
use zeroize::Zeroizing;

/// Node-API Bindingが公開するCore operationのinventory。
pub const NODE_OPERATION_NAMES: [&str; 16] = [
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

/// 初回Profile handoffの入力。
#[napi(object)]
pub struct HandoffConfirmationInput {
    /// `unconfirmed`または`confirmed`。
    pub status: String,
}

/// Export対象の入力。
#[napi(object)]
pub struct ExportTargetInput {
    /// 対象Profileのcanonical UUID。
    #[napi(js_name = "profile_id")]
    pub profile_id: String,
    /// `mnemonic`または`software_key`。
    pub kind: String,
    /// Software Key export時のcanonical UUID。
    #[napi(js_name = "key_id")]
    pub key_id: Option<String>,
}

/// 利用者のExport要求入力。
#[napi(object)]
pub struct ExportUserRequestInput {
    /// 要求対象。
    pub target: ExportTargetInput,
    /// `not_requested`または`requested`。
    pub status: String,
}

/// ApplicationのExport確認入力。
#[napi(object)]
pub struct ExportApplicationConfirmationInput {
    /// 確認対象。
    pub target: ExportTargetInput,
    /// `not_confirmed`または`confirmed`。
    pub status: String,
}

/// 明示的Export requestの入力。
#[napi(object)]
pub struct ExportRequestInput {
    /// 操作対象。
    pub target: ExportTargetInput,
    /// 利用者要求。
    #[napi(js_name = "user_request")]
    pub user_request: ExportUserRequestInput,
    /// Application確認。
    #[napi(js_name = "application_confirmation")]
    pub application_confirmation: ExportApplicationConfirmationInput,
}

/// Account contextの入力。
#[napi(object)]
pub struct AccountContextInput {
    /// `nem`または`symbol`。
    pub chain: String,
    /// `testnet`または`mainnet`。
    pub network: String,
}

/// 署名対象の入力。
#[napi(object)]
pub struct SigningTargetInput {
    /// 対象Profileのcanonical UUID。
    #[napi(js_name = "profile_id")]
    pub profile_id: String,
    /// 対象Software Keyのcanonical UUID。
    #[napi(js_name = "key_id")]
    pub key_id: String,
    /// 要求されたAccount context。
    pub context: AccountContextInput,
}

/// 署名承認の入力。
#[napi(object)]
pub struct SigningApprovalInput {
    /// `not_approved`または`approved`。
    pub status: String,
}

/// 署名requestの入力。
#[napi(object)]
pub struct SigningRequestInput {
    /// 署名対象。
    pub target: SigningTargetInput,
    /// Coreへそのまま渡すraw payload。
    pub payload: Uint8Array,
    /// Application assertion。
    pub approval: SigningApprovalInput,
}

/// Store decode warningのNode表現。
#[napi(object)]
pub struct WarningOutput {
    /// 安定したwarning code。
    pub code: String,
    /// 対象objectの種類。
    #[napi(js_name = "object_type")]
    pub object_type: String,
    /// 対象object UUID。存在しない場合はundefined。
    #[napi(js_name = "object_id")]
    pub object_id: Either<String, Undefined>,
    /// 対象field。存在しない場合はundefined。
    pub field: Either<String, Undefined>,
}

/// Profile情報のNode表現。
#[napi(object)]
pub struct ProfileInfoOutput {
    /// Profile UUID。
    #[napi(js_name = "profile_id")]
    pub profile_id: String,
    /// `testnet`または`mainnet`。
    pub network: String,
    /// 平文index上のSoftware Key数。
    #[napi(js_name = "software_key_count")]
    pub software_key_count: f64,
}

/// Software Key originのNode表現。
#[napi(object)]
pub struct SoftwareKeyOriginOutput {
    /// `derived`、`imported`または`generated`。
    pub kind: String,
    /// derived時のaccount index。それ以外はnull。
    #[napi(js_name = "account_index")]
    pub account_index: Option<f64>,
}

/// 認証済みSoftware Key情報のNode表現。
#[napi(object)]
pub struct SoftwareKeyInfoOutput {
    /// Software Key UUID。
    #[napi(js_name = "key_id")]
    pub key_id: String,
    /// `nem`または`symbol`。
    pub chain: String,
    /// 鍵の由来。
    pub origin: SoftwareKeyOriginOutput,
}

/// Software Key一覧項目のNode表現。
#[napi(object)]
pub struct SoftwareKeyListItemOutput {
    /// Software Key UUID。
    #[napi(js_name = "key_id")]
    pub key_id: String,
    /// `nem`または`symbol`。
    pub chain: String,
}

/// Public account情報のNode表現。
#[napi(object)]
pub struct PublicAccountOutput {
    /// Software Key UUID。
    #[napi(js_name = "key_id")]
    pub key_id: String,
    /// `nem`または`symbol`。
    pub chain: String,
    /// `testnet`または`mainnet`。
    pub network: String,
    /// raw 32 byte public key。
    #[napi(js_name = "public_key")]
    pub public_key: Uint8Array,
    /// Chain / Network対応のaddress。
    pub address: String,
}

/// 生成ProfileのNode表現。
#[napi(object)]
pub struct PreparedProfileOutput {
    /// 正規化済みMnemonic UTF-8 bytes。
    #[napi(js_name = "mnemonic_utf8")]
    pub mnemonic_utf8: Uint8Array,
    /// finalizeへ渡すopaque bytes。
    #[napi(js_name = "pending_profile")]
    pub pending_profile: Uint8Array,
}

/// Mnemonic export結果のNode表現。
#[napi(object)]
pub struct MnemonicExportOutput {
    /// 正規化済みMnemonic UTF-8 bytes。
    #[napi(js_name = "mnemonic_utf8")]
    pub mnemonic_utf8: Uint8Array,
}

/// Private key export結果のNode表現。
#[napi(object)]
pub struct PrivateKeyExportOutput {
    /// raw 32 byte private key。
    #[napi(js_name = "private_key")]
    pub private_key: Uint8Array,
}

/// Signature結果のNode表現。
#[napi(object)]
pub struct SignatureOutput {
    /// raw 64 byte signature。
    #[napi(js_name = "signature")]
    pub signature: Uint8Array,
}

/// `{ value, warnings }`形式のProfile一覧結果。
#[napi(object)]
pub struct ProfileListResult {
    /// Profile情報一覧。
    pub value: Vec<ProfileInfoOutput>,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

/// `{ value, warnings }`形式のSoftware Key一覧結果。
#[napi(object)]
pub struct SoftwareKeyListResult {
    /// Software Key一覧。
    pub value: Vec<SoftwareKeyListItemOutput>,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

/// `{ value, warnings }`形式のPrepared Profile結果。
#[napi(object)]
pub struct PreparedProfileReadResult {
    /// Prepared Profile。
    pub value: PreparedProfileOutput,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

/// `{ value, warnings }`形式のMnemonic export結果。
#[napi(object)]
pub struct MnemonicReadResult {
    /// Mnemonic export。
    pub value: MnemonicExportOutput,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

/// `{ value, warnings }`形式のPrivate Key export結果。
#[napi(object)]
pub struct PrivateKeyReadResult {
    /// Private key export。
    pub value: PrivateKeyExportOutput,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

/// `{ value, warnings }`形式のPublic account結果。
#[napi(object)]
pub struct PublicAccountReadResult {
    /// Public account。
    pub value: PublicAccountOutput,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

/// `{ value, warnings }`形式のSignature結果。
#[napi(object)]
pub struct SignatureReadResult {
    /// Signature。
    pub value: SignatureOutput,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

/// `{ store, value, warnings }`形式のProfile mutation結果。
#[napi(object)]
pub struct ProfileMutationResult {
    /// 完全なreplacement Store。
    pub store: Uint8Array,
    /// Profile情報。
    pub value: ProfileInfoOutput,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

/// `{ store, value, warnings }`形式のSoftware Key mutation結果。
#[napi(object)]
pub struct SoftwareKeyMutationResult {
    /// 完全なreplacement Store。
    pub store: Uint8Array,
    /// Software Key情報。
    pub value: SoftwareKeyInfoOutput,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

/// `{ store, value, warnings }`形式のunit mutation結果。
#[napi(object)]
pub struct UnitMutationResult {
    /// 完全なreplacement Store。
    pub store: Uint8Array,
    /// Coreのunit result。常にnull。
    pub value: Null,
    /// Store decode warning。
    pub warnings: Vec<WarningOutput>,
}

fn code_error(code: core::ErrorCode) -> Error {
    Error::new(Status::GenericFailure, code.as_str())
}

fn core_error(error: core::WalletError) -> Error {
    code_error(error.code)
}

fn binding_error() -> Error {
    code_error(core::ErrorCode::BindingFailure)
}

fn invalid_argument() -> Error {
    code_error(core::ErrorCode::InvalidArgument)
}

fn invalid_store() -> Error {
    code_error(core::ErrorCode::InvalidStore)
}

fn copy_bytes(value: &Uint8Array, max_length: Option<usize>) -> Result<Zeroizing<Vec<u8>>> {
    let input = value.as_ref();
    if max_length.is_some_and(|max| input.len() > max) {
        return Err(invalid_store());
    }
    let mut output = Zeroizing::new(Vec::new());
    output
        .try_reserve_exact(input.len())
        .map_err(|_| binding_error())?;
    output.extend_from_slice(input);
    Ok(output)
}

fn store_bytes(value: &Uint8Array) -> Result<Zeroizing<Vec<u8>>> {
    copy_bytes(value, Some(core::MAX_WALLET_STORE_BYTES))
}

fn output_bytes(value: &[u8]) -> Uint8Array {
    // JS側へ返すbufferはRust temporaryとaliasしない独立copyにする。
    Uint8Array::with_data_copied(value)
}

fn parse_network(value: f64) -> Result<core::Network> {
    if !value.is_finite() || value.fract() != 0.0 {
        return Err(invalid_argument());
    }
    match value {
        0.0 => Ok(core::Network::Testnet),
        1.0 => Ok(core::Network::Mainnet),
        _ => Err(invalid_argument()),
    }
}

fn parse_chain(value: f64) -> Result<core::Chain> {
    if !value.is_finite() || value.fract() != 0.0 {
        return Err(invalid_argument());
    }
    match value {
        0.0 => Ok(core::Chain::Nem),
        1.0 => Ok(core::Chain::Symbol),
        _ => Err(invalid_argument()),
    }
}

fn parse_account_index(value: f64) -> Result<u32> {
    if !value.is_finite() || value.fract() != 0.0 || !(0.0..=2_147_483_647.0).contains(&value) {
        return Err(code_error(core::ErrorCode::InvalidAccountIndex));
    }
    Ok(value as u32)
}

fn parse_uuid(value: &str) -> Result<Uuid> {
    let bytes = value.as_bytes();
    let hyphen_positions = [8, 13, 18, 23];
    if bytes.len() != 36
        || hyphen_positions
            .iter()
            .any(|position| bytes[*position] != b'-')
        || bytes.iter().enumerate().any(|(position, byte)| {
            !hyphen_positions.contains(&position) && !byte.is_ascii_hexdigit()
        })
    {
        return Err(invalid_argument());
    }
    Uuid::parse_str(value).map_err(|_| invalid_argument())
}

fn parse_handoff_confirmation(
    value: HandoffConfirmationInput,
) -> Result<core::HandoffConfirmation> {
    let status = match value.status.as_str() {
        "unconfirmed" => core::HandoffConfirmationStatus::Unconfirmed,
        "confirmed" => core::HandoffConfirmationStatus::Confirmed,
        _ => return Err(invalid_argument()),
    };
    Ok(core::HandoffConfirmation { status })
}

fn parse_export_target(value: ExportTargetInput) -> Result<core::ExportTarget> {
    let profile_id = parse_uuid(&value.profile_id)?;
    match value.kind.as_str() {
        "mnemonic" => Ok(core::ExportTarget::MnemonicTarget { profile_id }),
        "software_key" => Ok(core::ExportTarget::SoftwareKeyTarget {
            profile_id,
            key_id: parse_uuid(value.key_id.as_deref().ok_or_else(invalid_argument)?)?,
        }),
        _ => Err(invalid_argument()),
    }
}

fn parse_export_request(value: ExportRequestInput) -> Result<core::ExportRequest> {
    let target = parse_export_target(value.target)?;
    let user_request = core::ExportUserRequest {
        target: parse_export_target(value.user_request.target)?,
        status: match value.user_request.status.as_str() {
            "not_requested" => core::ExportUserRequestStatus::NotRequested,
            "requested" => core::ExportUserRequestStatus::Requested,
            _ => return Err(invalid_argument()),
        },
    };
    let application_confirmation = core::ExportApplicationConfirmation {
        target: parse_export_target(value.application_confirmation.target)?,
        status: match value.application_confirmation.status.as_str() {
            "not_confirmed" => core::ExportApplicationConfirmationStatus::NotConfirmed,
            "confirmed" => core::ExportApplicationConfirmationStatus::Confirmed,
            _ => return Err(invalid_argument()),
        },
    };
    Ok(core::ExportRequest {
        target,
        user_request,
        application_confirmation,
    })
}

fn parse_account_context(value: AccountContextInput) -> Result<core::AccountContext> {
    let chain = match value.chain.as_str() {
        "nem" => core::Chain::Nem,
        "symbol" => core::Chain::Symbol,
        _ => return Err(invalid_argument()),
    };
    let network = match value.network.as_str() {
        "testnet" => core::Network::Testnet,
        "mainnet" => core::Network::Mainnet,
        _ => return Err(invalid_argument()),
    };
    Ok(core::AccountContext { chain, network })
}

fn parse_signing_request(value: SigningRequestInput) -> Result<core::SigningRequest> {
    let payload = copy_bytes(&value.payload, None).map(|mut value| std::mem::take(&mut *value))?;
    let target = core::SigningTarget {
        profile_id: parse_uuid(&value.target.profile_id)?,
        key_id: parse_uuid(&value.target.key_id)?,
        context: parse_account_context(value.target.context)?,
    };
    let approval = core::SigningApproval {
        status: match value.approval.status.as_str() {
            "not_approved" => core::SigningApprovalStatus::NotApproved,
            "approved" => core::SigningApprovalStatus::Approved,
            _ => return Err(invalid_argument()),
        },
    };
    Ok(core::SigningRequest {
        target,
        payload,
        approval,
    })
}

fn network_text(value: core::Network) -> String {
    match value {
        core::Network::Testnet => "testnet".to_owned(),
        core::Network::Mainnet => "mainnet".to_owned(),
    }
}

fn chain_text(value: core::Chain) -> String {
    match value {
        core::Chain::Nem => "nem".to_owned(),
        core::Chain::Symbol => "symbol".to_owned(),
    }
}

fn warning(value: &core::DecodeWarning) -> WarningOutput {
    WarningOutput {
        code: value.code.to_owned(),
        object_type: value.object_type.to_owned(),
        object_id: value.object_id.map(|id| id.to_string()).into(),
        field: value.field.map(str::to_owned).into(),
    }
}

fn warnings(value: &[core::DecodeWarning]) -> Vec<WarningOutput> {
    value.iter().map(warning).collect()
}

fn profile_info(value: core::ProfileInfo) -> ProfileInfoOutput {
    ProfileInfoOutput {
        profile_id: value.profile_id.to_string(),
        network: network_text(value.network),
        software_key_count: value.software_key_count as f64,
    }
}

fn software_key_origin(value: core::SoftwareKeyOrigin) -> SoftwareKeyOriginOutput {
    match value {
        core::SoftwareKeyOrigin::Derived { account_index } => SoftwareKeyOriginOutput {
            kind: "derived".to_owned(),
            account_index: Some(account_index as f64),
        },
        core::SoftwareKeyOrigin::Imported => SoftwareKeyOriginOutput {
            kind: "imported".to_owned(),
            account_index: None,
        },
        core::SoftwareKeyOrigin::Generated => SoftwareKeyOriginOutput {
            kind: "generated".to_owned(),
            account_index: None,
        },
    }
}

fn software_key_info(value: core::SoftwareKeyInfo) -> SoftwareKeyInfoOutput {
    SoftwareKeyInfoOutput {
        key_id: value.key_id.to_string(),
        chain: chain_text(value.chain),
        origin: software_key_origin(value.origin),
    }
}

fn software_key_list_item(value: core::SoftwareKeyListItem) -> SoftwareKeyListItemOutput {
    SoftwareKeyListItemOutput {
        key_id: value.key_id.to_string(),
        chain: chain_text(value.chain),
    }
}

fn public_account(value: core::PublicAccountInfo) -> PublicAccountOutput {
    PublicAccountOutput {
        key_id: value.key_id.to_string(),
        chain: chain_text(value.chain),
        network: network_text(value.network),
        public_key: output_bytes(&value.public_key),
        address: value.address,
    }
}

fn prepared_profile(value: core::PreparedProfile) -> PreparedProfileOutput {
    PreparedProfileOutput {
        mnemonic_utf8: output_bytes(&value.mnemonic_utf8),
        pending_profile: output_bytes(&value.pending_profile),
    }
}

fn mnemonic_export(value: core::MnemonicExport) -> MnemonicExportOutput {
    MnemonicExportOutput {
        mnemonic_utf8: output_bytes(&value.mnemonic_utf8),
    }
}

fn private_key_export(value: core::PrivateKeyExport) -> PrivateKeyExportOutput {
    PrivateKeyExportOutput {
        private_key: output_bytes(&value.private_key),
    }
}

fn signature(value: core::Signature) -> SignatureOutput {
    SignatureOutput {
        signature: output_bytes(&value.signature),
    }
}

fn mutation_store<T>(value: core::MutationResult<T>) -> (Uint8Array, Vec<WarningOutput>) {
    mutation_store_parts(value.store, value.warnings)
}

fn mutation_store_parts(
    store: Vec<u8>,
    warnings_value: Vec<core::DecodeWarning>,
) -> (Uint8Array, Vec<WarningOutput>) {
    let store = Zeroizing::new(store);
    (output_bytes(&store), warnings(&warnings_value))
}

/// JavaScriptから空のWallet Storeを作成する。
#[napi(js_name = "create_empty_store")]
pub fn create_empty_store() -> Result<Uint8Array> {
    let value = core::create_empty_store().map_err(core_error)?;
    let value = Zeroizing::new(value);
    Ok(output_bytes(&value))
}

/// Mnemonic生成の初回段階を実行する。
#[napi(js_name = "prepare_generated_profile")]
pub fn prepare_generated_profile(
    store: Uint8Array,
    password_utf8: Uint8Array,
    network: f64,
) -> Result<PreparedProfileReadResult> {
    let network = parse_network(network)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result = core::prepare_generated_profile(&store, &password, network).map_err(core_error)?;
    Ok(PreparedProfileReadResult {
        value: prepared_profile(result.value),
        warnings: warnings(&result.warnings),
    })
}

/// Pending Profileをhandoff確認後に確定する。
#[napi(js_name = "finalize_generated_profile")]
pub fn finalize_generated_profile(
    store: Uint8Array,
    pending_profile: Uint8Array,
    password_utf8: Uint8Array,
    handoff_confirmation: HandoffConfirmationInput,
) -> Result<ProfileMutationResult> {
    let store = store_bytes(&store)?;
    let pending_profile = copy_bytes(&pending_profile, None)?;
    let password = copy_bytes(&password_utf8, None)?;
    let handoff_confirmation = parse_handoff_confirmation(handoff_confirmation)?;
    let result =
        core::finalize_generated_profile(&store, &pending_profile, &password, handoff_confirmation)
            .map_err(core_error)?;
    let core::MutationResult {
        store,
        value: core_value,
        warnings,
    } = result;
    let value = profile_info(core_value);
    let (store, warnings) = mutation_store_parts(store, warnings);
    Ok(ProfileMutationResult {
        store,
        value,
        warnings,
    })
}

/// UTF-8 BIP39 MnemonicからProfileを復元する。
#[napi(js_name = "restore_profile")]
pub fn restore_profile(
    store: Uint8Array,
    mnemonic_utf8: Uint8Array,
    password_utf8: Uint8Array,
    network: f64,
) -> Result<ProfileMutationResult> {
    let network = parse_network(network)?;
    let store = store_bytes(&store)?;
    let mnemonic = copy_bytes(&mnemonic_utf8, None)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result =
        core::restore_profile(&store, &mnemonic, &password, network).map_err(core_error)?;
    let core::MutationResult {
        store,
        value: core_value,
        warnings,
    } = result;
    let value = profile_info(core_value);
    let (store, warnings) = mutation_store_parts(store, warnings);
    Ok(ProfileMutationResult {
        store,
        value,
        warnings,
    })
}

/// ProfileのMnemonicを明示的にexportする。
#[napi(js_name = "export_mnemonic")]
pub fn export_mnemonic(
    store: Uint8Array,
    request: ExportRequestInput,
    password_utf8: Uint8Array,
) -> Result<MnemonicReadResult> {
    let request = parse_export_request(request)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result = core::export_mnemonic(&store, request, &password).map_err(core_error)?;
    Ok(MnemonicReadResult {
        value: mnemonic_export(result.value),
        warnings: warnings(&result.warnings),
    })
}

/// Software Keyのprivate keyを明示的にexportする。
#[napi(js_name = "export_private_key")]
pub fn export_private_key(
    store: Uint8Array,
    request: ExportRequestInput,
    password_utf8: Uint8Array,
) -> Result<PrivateKeyReadResult> {
    let request = parse_export_request(request)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result = core::export_private_key(&store, request, &password).map_err(core_error)?;
    Ok(PrivateKeyReadResult {
        value: private_key_export(result.value),
        warnings: warnings(&result.warnings),
    })
}

/// passwordなしでProfile一覧を取得する。
#[napi(js_name = "list_profiles")]
pub fn list_profiles(store: Uint8Array) -> Result<ProfileListResult> {
    let store = store_bytes(&store)?;
    let result = core::list_profiles(&store).map_err(core_error)?;
    Ok(ProfileListResult {
        value: result.value.into_iter().map(profile_info).collect(),
        warnings: warnings(&result.warnings),
    })
}

/// Profile内のSoftware Key一覧を取得する。
#[napi(js_name = "list_software_keys")]
pub fn list_software_keys(store: Uint8Array, profile_id: String) -> Result<SoftwareKeyListResult> {
    let profile_id = parse_uuid(&profile_id)?;
    let store = store_bytes(&store)?;
    let result = core::list_software_keys(&store, profile_id).map_err(core_error)?;
    Ok(SoftwareKeyListResult {
        value: result
            .value
            .into_iter()
            .map(software_key_list_item)
            .collect(),
        warnings: warnings(&result.warnings),
    })
}

/// MnemonicからSoftware Keyを導出して保存する。
#[napi(js_name = "derive_software_key")]
pub fn derive_software_key(
    store: Uint8Array,
    profile_id: String,
    password_utf8: Uint8Array,
    chain: f64,
    account_index: f64,
) -> Result<SoftwareKeyMutationResult> {
    let profile_id = parse_uuid(&profile_id)?;
    let chain = parse_chain(chain)?;
    let account_index = parse_account_index(account_index)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result = core::derive_software_key(&store, profile_id, &password, chain, account_index)
        .map_err(core_error)?;
    let core::MutationResult {
        store,
        value: core_value,
        warnings,
    } = result;
    let value = software_key_info(core_value);
    let (store, warnings) = mutation_store_parts(store, warnings);
    Ok(SoftwareKeyMutationResult {
        store,
        value,
        warnings,
    })
}

/// raw private keyを検証してSoftware Keyとして保存する。
#[napi(js_name = "import_software_key")]
pub fn import_software_key(
    store: Uint8Array,
    profile_id: String,
    password_utf8: Uint8Array,
    chain: f64,
    private_key: Uint8Array,
) -> Result<SoftwareKeyMutationResult> {
    let profile_id = parse_uuid(&profile_id)?;
    let chain = parse_chain(chain)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let private_key = copy_bytes(&private_key, None)?;
    let result = core::import_software_key(&store, profile_id, &password, chain, &private_key)
        .map_err(core_error)?;
    let core::MutationResult {
        store,
        value: core_value,
        warnings,
    } = result;
    let value = software_key_info(core_value);
    let (store, warnings) = mutation_store_parts(store, warnings);
    Ok(SoftwareKeyMutationResult {
        store,
        value,
        warnings,
    })
}

/// CSPRNGでSoftware Keyを生成して保存する。
#[napi(js_name = "generate_software_key")]
pub fn generate_software_key(
    store: Uint8Array,
    profile_id: String,
    password_utf8: Uint8Array,
    chain: f64,
) -> Result<SoftwareKeyMutationResult> {
    let profile_id = parse_uuid(&profile_id)?;
    let chain = parse_chain(chain)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result =
        core::generate_software_key(&store, profile_id, &password, chain).map_err(core_error)?;
    let core::MutationResult {
        store,
        value: core_value,
        warnings,
    } = result;
    let value = software_key_info(core_value);
    let (store, warnings) = mutation_store_parts(store, warnings);
    Ok(SoftwareKeyMutationResult {
        store,
        value,
        warnings,
    })
}

/// 認証済みSoftware Keyのpublic account情報を取得する。
#[napi(js_name = "get_public_account")]
pub fn get_public_account(
    store: Uint8Array,
    profile_id: String,
    key_id: String,
    requested_context: AccountContextInput,
    password_utf8: Uint8Array,
) -> Result<PublicAccountReadResult> {
    let profile_id = parse_uuid(&profile_id)?;
    let key_id = parse_uuid(&key_id)?;
    let requested_context = parse_account_context(requested_context)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result = core::get_public_account(&store, profile_id, key_id, requested_context, &password)
        .map_err(core_error)?;
    Ok(PublicAccountReadResult {
        value: public_account(result.value),
        warnings: warnings(&result.warnings),
    })
}

/// Software Keyでpayload byte列に署名する。
#[napi(js_name = "sign")]
pub fn sign(
    store: Uint8Array,
    request: SigningRequestInput,
    password_utf8: Uint8Array,
) -> Result<SignatureReadResult> {
    let request = parse_signing_request(request)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result = core::sign(&store, request, &password).map_err(core_error)?;
    Ok(SignatureReadResult {
        value: signature(result.value),
        warnings: warnings(&result.warnings),
    })
}

/// Profile passwordを変更してreplacement Storeを返す。
#[napi(js_name = "change_profile_password")]
pub fn change_profile_password(
    store: Uint8Array,
    profile_id: String,
    current_password_utf8: Uint8Array,
    new_password_utf8: Uint8Array,
) -> Result<UnitMutationResult> {
    let profile_id = parse_uuid(&profile_id)?;
    let store = store_bytes(&store)?;
    let current_password = copy_bytes(&current_password_utf8, None)?;
    let new_password = copy_bytes(&new_password_utf8, None)?;
    let result =
        core::change_profile_password(&store, profile_id, &current_password, &new_password)
            .map_err(core_error)?;
    let (store, warnings) = mutation_store(result);
    Ok(UnitMutationResult {
        store,
        value: Null,
        warnings,
    })
}

/// Software Keyを削除してreplacement Storeを返す。
#[napi(js_name = "delete_software_key")]
pub fn delete_software_key(
    store: Uint8Array,
    profile_id: String,
    key_id: String,
    password_utf8: Uint8Array,
) -> Result<UnitMutationResult> {
    let profile_id = parse_uuid(&profile_id)?;
    let key_id = parse_uuid(&key_id)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result =
        core::delete_software_key(&store, profile_id, key_id, &password).map_err(core_error)?;
    let (store, warnings) = mutation_store(result);
    Ok(UnitMutationResult {
        store,
        value: Null,
        warnings,
    })
}

/// Profileを削除してreplacement Storeを返す。
#[napi(js_name = "delete_profile")]
pub fn delete_profile(
    store: Uint8Array,
    profile_id: String,
    password_utf8: Uint8Array,
) -> Result<UnitMutationResult> {
    let profile_id = parse_uuid(&profile_id)?;
    let store = store_bytes(&store)?;
    let password = copy_bytes(&password_utf8, None)?;
    let result = core::delete_profile(&store, profile_id, &password).map_err(core_error)?;
    let (store, warnings) = mutation_store(result);
    Ok(UnitMutationResult {
        store,
        value: Null,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::NODE_OPERATION_NAMES;

    #[test]
    fn operation_inventory_has_sixteen_entries() {
        assert_eq!(NODE_OPERATION_NAMES.len(), 16);
        assert!(NODE_OPERATION_NAMES.contains(&"create_empty_store"));
        assert!(NODE_OPERATION_NAMES.contains(&"delete_profile"));
    }
}
