//! Wallet CoreとBindingの間で共有するエラー型。
//!
//! エラーは安定したcodeだけを公開し、password、Mnemonic、private key、
//! 復号済みpayloadなどの秘密情報をmessageへ含めない。
//! `ErrorCode`はBinding間で共有する機械判定用の契約であり、エラー詳細を
//! 推測するためのログメッセージではない。

use core::fmt;

/// CoreとBindingが共有する安定したエラーコード。
///
/// 文字列表現は[`ErrorCode::as_str`]で取得できる。`#[non_exhaustive]`のため、
/// Bindingやアプリケーションは未知の将来値を安全側へ扱えるように実装する。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum ErrorCode {
    /// 引数、識別子、payloadまたはパスワード入力が不正。
    InvalidArgument,
    /// Wallet Storeのトップレベル構造を解釈できない。
    InvalidStore,
    /// Wallet Storeのバージョンが未対応。
    UnsupportedStoreVersion,
    /// Profile schemaのバージョンが未対応。
    UnsupportedProfileSchemaVersion,
    /// 指定されたProfileが存在しない。
    ProfileNotFound,
    /// 指定されたSoftware Keyが存在しない。
    SoftwareKeyNotFound,
    /// パスワードまたは認証付き暗号の検証に失敗した。
    AuthenticationFailed,
    /// Mnemonicがv1の形式として不正。
    InvalidMnemonic,
    /// 指定Chainで有効なprivate keyではない。
    InvalidPrivateKey,
    /// 同じMnemonicとNetworkのProfileがすでに存在する。
    DuplicateProfile,
    /// 同じProfile・同じChain・同じprivate keyのSoftware Keyがすでに存在する。
    DuplicateSoftwareKey,
    /// 導出用account indexがv1の範囲外。
    InvalidAccountIndex,
    /// 指定されたChainとNetworkの組み合わせが不正。
    NetworkMismatch,
    /// 暗号処理に失敗した。
    CryptoFailure,
    /// 暗号学的に安全な乱数源の呼び出しに失敗した。
    RandomSourceFailure,
    /// 決定的なStoreシリアライズに失敗した。
    SerializationFailure,
    /// 生成途中のProfile blobが不正、または対象Storeと一致しない。
    PendingProfileInvalid,
    /// Binding自身のrepresentation、allocationまたはownership処理に失敗した。
    BindingFailure,
}

impl ErrorCode {
    /// Bindingで使用する安定した文字列表現を返す。
    ///
    /// 返される文字列には秘密情報や内部エラーの詳細を含めない。
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::InvalidArgument => "InvalidArgument",
            Self::InvalidStore => "InvalidStore",
            Self::UnsupportedStoreVersion => "UnsupportedStoreVersion",
            Self::UnsupportedProfileSchemaVersion => "UnsupportedProfileSchemaVersion",
            Self::ProfileNotFound => "ProfileNotFound",
            Self::SoftwareKeyNotFound => "SoftwareKeyNotFound",
            Self::AuthenticationFailed => "AuthenticationFailed",
            Self::InvalidMnemonic => "InvalidMnemonic",
            Self::InvalidPrivateKey => "InvalidPrivateKey",
            Self::DuplicateProfile => "DuplicateProfile",
            Self::DuplicateSoftwareKey => "DuplicateSoftwareKey",
            Self::InvalidAccountIndex => "InvalidAccountIndex",
            Self::NetworkMismatch => "NetworkMismatch",
            Self::CryptoFailure => "CryptoFailure",
            Self::RandomSourceFailure => "RandomSourceFailure",
            Self::SerializationFailure => "SerializationFailure",
            Self::PendingProfileInvalid => "PendingProfileInvalid",
            Self::BindingFailure => "BindingFailure",
        }
    }
}

/// 秘密情報を含まないCoreエラー。
///
/// パスワード不一致、認証タグ不一致、Store改ざんなどの詳細は外部へ分けて
/// 公開せず、呼び出し側は`code`だけを処理する。
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct WalletError {
    /// 安定したエラーコード。
    pub code: ErrorCode,
}

impl WalletError {
    pub(crate) const fn new(code: ErrorCode) -> Self {
        Self { code }
    }
}

impl fmt::Display for WalletError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code.as_str())
    }
}

impl std::error::Error for WalletError {}

/// Wallet Coreが使用する結果型。
///
/// 成功値は読み取り結果またはreplacement Storeを含み、失敗時は秘密情報を
/// 含まない[`WalletError`]だけを返す。
pub type WalletResult<T> = Result<T, WalletError>;
