//! Wallet Coreの公開DTO、識別子、Chain/Network型。
//!
//! 秘密情報を含むDTOは明示的なexport結果に限定し、`Debug`実装では値を
//! redacted表記に置き換える。Wallet StoreとPending Profileはopaque byte列として扱う。

use core::fmt;
use uuid::Uuid;

/// 不透明なv1 Wallet Store byte列。
pub type WalletStoreBlob = Vec<u8>;

/// 生成途中Profileを表す不透明なbyte列。
pub type PendingProfileBlob = Vec<u8>;

/// Profileを識別するUUID。
pub type ProfileId = Uuid;

/// Software Keyを識別するUUID。
pub type SoftwareKeyId = Uuid;

/// ProfileのNetwork。Profile作成時に固定される。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Network {
    /// Symbol/NEM Testnet。
    Testnet,
    /// Symbol/NEM Mainnet。
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
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Chain {
    /// NEM。
    Nem,
    /// Symbol。
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
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SoftwareKeyOrigin {
    /// ProfileのMnemonicから導出した鍵。
    Derived {
        /// hardened導出に使用したaccount index。
        account_index: u32,
    },
    /// raw private keyをインポートした鍵。
    Imported,
    /// Coreが独立して生成した鍵。
    Generated,
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
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReadResult<T> {
    /// 操作結果の値。
    pub value: T,
    /// 仕様上許容された非致命的な診断情報。
    pub warnings: Vec<DecodeWarning>,
}

/// 成功したmutationと、完全なreplacement Store。
#[derive(Clone, Debug, Eq, PartialEq)]
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
    /// Profile識別子。
    pub profile_id: ProfileId,
    /// 固定されたProfile Network。
    pub network: Network,
    /// indexに登録されたSoftware Keyの数。
    pub software_key_count: usize,
}

/// 認証済み操作の結果として返す公開Software Key情報。
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
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SoftwareKeyListItem {
    /// Software Key識別子。
    pub key_id: SoftwareKeyId,
    /// 固定されたChain。
    pub chain: Chain,
}

/// 公開アカウント情報。
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PublicAccountInfo {
    /// Software Key識別子。
    pub key_id: SoftwareKeyId,
    /// 固定されたChain。
    pub chain: Chain,
    /// ProfileのNetwork。
    pub network: Network,
    /// raw 32 byteのpublic key。
    pub public_key: [u8; 32],
    /// ChainとNetworkに対応したaddress文字列。
    pub address: String,
}

/// raw signatureの結果。
#[derive(Clone, Eq, PartialEq)]
pub struct Signature {
    /// raw 64 byteのsignature。
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

/// 明示的なMnemonic exportの結果。
#[derive(Clone, Eq, PartialEq)]
pub struct MnemonicExport {
    /// 正規化済みBIP39 24 wordsのUTF-8 byte列。
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

/// 明示的なprivate key exportの結果。
#[derive(Clone, Eq, PartialEq)]
pub struct PrivateKeyExport {
    /// raw 32 byteのprivate key。
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

/// 初回バックアップ受渡しの最初の段階で返す生成Profileデータ。
#[derive(Clone, Eq, PartialEq)]
pub struct PreparedProfile {
    /// 初回受渡しに使用する正規化済みBIP39 24 wordsのUTF-8 byte列。
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
