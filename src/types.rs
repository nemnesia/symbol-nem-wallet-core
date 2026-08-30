//! Wallet Coreの公開DTO、識別子、Chain/Network型。
//!
//! 秘密情報を含むDTOは明示的なexport結果に限定し、`Debug`実装では値を
//! redacted表記に置き換える。Wallet StoreとPending Profileはopaque byte列として扱う。
//! 状態変更結果は完全なreplacement Storeを返すため、DTOが入力Storeを直接変更する
//! ことはない。

use core::fmt;
use uuid::Uuid;
use zeroize::Zeroize;

/// 不透明なv1 Wallet Store byte列。
///
/// Coreは保存先を管理しない。アプリケーションはこのbyte列をそのまま保存し、
/// 状態変更APIが返した新しい値へatomicに置き換える。内容を直接編集したり、
/// 独自のシリアライズ形式へ変換したりしてはならない。
pub type WalletStoreBlob = Vec<u8>;

/// 生成途中Profileを表す不透明なbyte列。
///
/// [`crate::prepare_generated_profile`] が返す値を、Mnemonicのバックアップ受渡し
/// を確認した後に [`crate::finalize_generated_profile`] へ渡す。Wallet Storeとは
/// 別の内部形式であり、アプリケーションは内容を解釈しない。
pub type PendingProfileBlob = Vec<u8>;

/// Store内でProfileを一意に識別するUUID。
///
/// UUIDはMnemonic、private key、public keyまたはaddressから導出されない。
pub type ProfileId = Uuid;

/// Profile内でSoftware Keyを一意に識別するUUID。
///
/// `key_id`の解決にはProfile IDも使用する。異なるProfile間で同じ値が現れる
/// 可能性を前提に、Key単独でStore全体の対象を選択してはならない。
pub type SoftwareKeyId = Uuid;

/// ProfileのNetwork。Profile作成時に固定され、後から変更できない。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Network {
    /// Symbol/NEM Testnet。wire値は`0`。
    Testnet,
    /// Symbol/NEM Mainnet。wire値は`1`。
    Mainnet,
}

impl Network {
    // wire値はwallet-store-format-v1.mdの定義から変更しない。
    pub(crate) const fn wire(self) -> u64 {
        match self {
            Self::Testnet => 0,
            Self::Mainnet => 1,
        }
    }

    pub(crate) const fn network_identifier(self) -> u8 {
        match self {
            Self::Testnet => 0x98,
            Self::Mainnet => 0x68,
        }
    }
}

/// Software Keyに固定されたブロックチェーンの種類。
///
/// ChainごとにHD導出、公開鍵、address、署名で使用するハッシュ処理が異なる。
/// SymbolとNEMを同じ鍵処理として暗黙に扱ってはならない。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Chain {
    /// NEM。wire値は`0`。
    Nem,
    /// Symbol。wire値は`1`。
    Symbol,
}

impl Chain {
    // wire値はNEM=0、Symbol=1で固定する。
    pub(crate) const fn wire(self) -> u64 {
        match self {
            Self::Nem => 0,
            Self::Symbol => 1,
        }
    }
}

/// Software Keyの由来。
///
/// 由来は公開情報であり、private keyそのものはこの型へ含めない。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SoftwareKeyOrigin {
    /// ProfileのMnemonicから導出した鍵。
    Derived {
        /// hardened導出に使用したaccount index。
        ///
        /// v1では`0..=2_147_483_647`の範囲で使用される。
        account_index: u32,
    },
    /// raw private keyをインポートした鍵。
    Imported,
    /// Coreが独立して生成した鍵。
    Generated,
}

/// 初回Mnemonic handoffの確認状態。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HandoffConfirmationStatus {
    /// 利用者への提示・受領確認が成立していない。
    Unconfirmed,
    /// Applicationが利用者の受領確認を伝達した。
    Confirmed,
}

/// 初回Mnemonic handoffのApplication assertion。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct HandoffConfirmation {
    /// handoffの確認状態。
    pub status: HandoffConfirmationStatus,
}

/// 明示的exportの対象。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ExportTarget {
    /// ProfileのMnemonic。
    MnemonicTarget {
        /// 対象Profile。
        profile_id: ProfileId,
    },
    /// Profile内のSoftware Key private key。
    SoftwareKeyTarget {
        /// 対象Profile。
        profile_id: ProfileId,
        /// 対象Software Key。
        key_id: SoftwareKeyId,
    },
}

/// 利用者によるexport要求の状態。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ExportUserRequestStatus {
    /// exportを要求していない。
    NotRequested,
    /// exportを要求した。
    Requested,
}

/// 明示的exportにおける利用者要求。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ExportUserRequest {
    /// 要求対象。
    pub target: ExportTarget,
    /// 要求状態。
    pub status: ExportUserRequestStatus,
}

/// Applicationによるexport確認の状態。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ExportApplicationConfirmationStatus {
    /// Application確認が成立していない。
    NotConfirmed,
    /// Application確認が成立した。
    Confirmed,
}

/// 明示的exportにおけるApplication confirmation。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ExportApplicationConfirmation {
    /// 確認対象。
    pub target: ExportTarget,
    /// 確認状態。
    pub status: ExportApplicationConfirmationStatus,
}

/// 明示的export request。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ExportRequest {
    /// 操作対象。
    pub target: ExportTarget,
    /// 利用者要求。
    pub user_request: ExportUserRequest,
    /// Application confirmation。
    pub application_confirmation: ExportApplicationConfirmation,
}

/// AccountのChain / Network context。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AccountContext {
    /// Accountへ固定されたChain。
    pub chain: Chain,
    /// Profileへ固定されたNetwork。
    pub network: Network,
}

/// 署名対象Account。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SigningTarget {
    /// 対象Profile。
    pub profile_id: ProfileId,
    /// 対象Software Key。
    pub key_id: SoftwareKeyId,
    /// 要求されたAccount context。
    pub context: AccountContext,
}

/// 署名承認の状態。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SigningApprovalStatus {
    /// 利用者承認が成立していない。
    NotApproved,
    /// 利用者承認が成立した。
    Approved,
}

/// Applicationによる署名承認。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SigningApproval {
    /// 承認状態。
    pub status: SigningApprovalStatus,
}

/// 署名request。
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SigningRequest {
    /// 対象Account。
    pub target: SigningTarget,
    /// Coreが書き換えずに署名するraw payload。
    pub payload: Vec<u8>,
    /// Application assertion。
    pub approval: SigningApproval,
}

/// Store読み取り時に返す構造化warning。
///
/// v1の不正なProfileやSoftware Keyはwarning付きでskipせず、Store全体を
/// fatal errorとして拒否する。型はBinding間の結果契約を維持するため公開する。
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DecodeWarning {
    /// Store formatで定義された安定したwarning code。
    pub code: &'static str,
    /// 対象オブジェクトの種類。
    pub object_type: &'static str,
    /// 対象を特定できる場合の識別子。
    pub object_id: Option<Uuid>,
    /// warningに対応するfield。特定できる場合だけ設定される。
    pub field: Option<&'static str>,
}

/// 読み取り結果とdiagnosticsを含む結果。
///
/// `warnings`はログメッセージではなく、Bindingやアプリケーションが機械的に
/// 扱う診断情報である。秘密情報を含まないが、必要な場合だけ利用者向け表示へ
/// 変換する。
#[derive(Debug, Eq, PartialEq)]
pub struct ReadResult<T> {
    /// 操作結果の値。
    pub value: T,
    /// 仕様上許容された非致命的な診断情報。
    pub warnings: Vec<DecodeWarning>,
}

/// 成功したmutationと、完全なreplacement Store。
///
/// `store`は操作途中の断片ではなく、次の操作へそのまま渡せる完全なStoreである。
/// エラー時はこの型が返らず、入力Storeは変更されない。
#[derive(Debug, Eq, PartialEq)]
pub struct MutationResult<T> {
    /// 置き換え用の完全なStore byte列。
    pub store: WalletStoreBlob,
    /// 操作結果の値。
    pub value: T,
    /// 仕様上許容された非致命的な診断情報。
    pub warnings: Vec<DecodeWarning>,
}

/// 秘密情報を含まない公開Profile情報。
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProfileInfo {
    /// Profile識別子。表示名はCoreの管理対象外である。
    pub profile_id: ProfileId,
    /// 固定されたProfile Network。
    pub network: Network,
    /// 平文indexに登録されたSoftware Keyの数。
    pub software_key_count: usize,
}

/// 認証済み操作の結果として返す公開Software Key情報。
///
/// `derive_software_key`、`import_software_key`または`generate_software_key`の
/// 成功結果で使用される。一覧APIでは、passwordなしで取得できる
/// [`SoftwareKeyListItem`]を使用する。
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SoftwareKeyInfo {
    /// Software Key識別子。
    pub key_id: SoftwareKeyId,
    /// 固定されたChain。
    pub chain: Chain,
    /// 鍵の由来。
    pub origin: SoftwareKeyOrigin,
}

/// パスワードなしで取得できるSoftware Key一覧項目。
///
/// 平文manifest由来の未認証情報であり、private keyやoriginは含まない。
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SoftwareKeyListItem {
    /// Software Key識別子。
    pub key_id: SoftwareKeyId,
    /// 固定されたChain。
    pub chain: Chain,
}

/// 認証済みSoftware Keyから得た公開アカウント情報。
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PublicAccountInfo {
    /// Software Key識別子。
    pub key_id: SoftwareKeyId,
    /// 固定されたChain。
    pub chain: Chain,
    /// ProfileのNetwork。
    pub network: Network,
    /// 対象Chainのraw 32 byte public key。
    pub public_key: [u8; 32],
    /// ChainとNetworkに対応したaddress文字列。
    pub address: String,
}

/// raw signatureの結果。
///
/// Coreはpayloadの意味を解釈せず、generation hashやTransaction用prefixを自動追加しない。
#[derive(Clone, Eq, PartialEq)]
pub struct Signature {
    /// 対象Chainのraw 64 byte signature。
    pub signature: [u8; 64],
}

impl fmt::Debug for Signature {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("Signature")
            .field("signature", &"[redacted]")
            .finish()
    }
}

/// password認証後に明示的にexportされたMnemonic。
///
/// 通常のProfile一覧や他の公開DTOにはMnemonicを含めない。利用後はアプリケーション
/// 側で保持・キャッシュせず、必要な表示やバックアップ処理の終了後に破棄する。
#[derive(Eq, PartialEq)]
pub struct MnemonicExport {
    /// 正規化済みBIP39 English 24 wordsのUTF-8 byte列。
    pub mnemonic_utf8: Vec<u8>,
}

// 明示的にexportされた秘密情報でも、Debug/diagnostic経由では再出力しない。
impl fmt::Debug for MnemonicExport {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("MnemonicExport")
            .field("mnemonic_utf8", &"[redacted]")
            .finish()
    }
}

impl Drop for MnemonicExport {
    fn drop(&mut self) {
        self.mnemonic_utf8.zeroize();
    }
}

/// password認証後に明示的にexportされたprivate key。
///
/// private keyは対象Chainのraw 32 bytesであり、hexなどのtextual encodingではない。
#[derive(Eq, PartialEq)]
pub struct PrivateKeyExport {
    /// 対象Chainのraw 32 byte private key。
    pub private_key: [u8; 32],
}

impl fmt::Debug for PrivateKeyExport {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PrivateKeyExport")
            .field("private_key", &"[redacted]")
            .finish()
    }
}

impl Drop for PrivateKeyExport {
    fn drop(&mut self) {
        self.private_key.zeroize();
    }
}

/// 初回バックアップ受渡しの最初の段階で返す生成Profileデータ。
///
/// `prepare_generated_profile`の結果として返り、Mnemonicを利用者へ提示して明示的な
/// バックアップ確認を得るまでProfileはStoreへ追加されない。MnemonicとPending blobは
/// 秘密情報を含むため、Debug出力や長期キャッシュへ含めない。
#[derive(Eq, PartialEq)]
pub struct PreparedProfile {
    /// 初回受渡しに使用する正規化済みBIP39 English 24 wordsのUTF-8 byte列。
    pub mnemonic_utf8: Vec<u8>,
    /// finalizeへ渡す不透明なPending Profile byte列。
    pub pending_profile: PendingProfileBlob,
}

impl fmt::Debug for PreparedProfile {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PreparedProfile")
            .field("mnemonic_utf8", &"[redacted]")
            .field("pending_profile", &"[redacted]")
            .finish()
    }
}

impl Drop for PreparedProfile {
    fn drop(&mut self) {
        self.mnemonic_utf8.zeroize();
        self.pending_profile.zeroize();
    }
}

#[cfg(test)]
#[path = "../tests/unit/types.rs"]
mod tests;
