use core::fmt;

/// Stable error codes exposed by Core and its bindings.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum ErrorCode {
    /// An argument, identifier, payload, or password input is invalid.
    InvalidArgument,
    /// The top-level Wallet Store cannot be interpreted.
    InvalidStore,
    /// The Wallet Store version is not supported.
    UnsupportedStoreVersion,
    /// The Profile schema version is not supported.
    UnsupportedProfileSchemaVersion,
    /// The requested Profile does not exist.
    ProfileNotFound,
    /// The requested Software Key does not exist.
    SoftwareKeyNotFound,
    /// Password or authenticated encryption verification failed.
    AuthenticationFailed,
    /// The Mnemonic is not a valid v1 Mnemonic.
    InvalidMnemonic,
    /// The private key is not valid for the selected Chain.
    InvalidPrivateKey,
    /// The Profile already exists for the same Mnemonic and Network.
    DuplicateProfile,
    /// The Software Key already exists for the same Chain and private key.
    DuplicateSoftwareKey,
    /// The derivation account index is outside the v1 range.
    InvalidAccountIndex,
    /// A requested Chain or Network relationship is invalid.
    NetworkMismatch,
    /// A cryptographic operation failed.
    CryptoFailure,
    /// The secure random source failed.
    RandomSourceFailure,
    /// Deterministic Store serialization failed.
    SerializationFailure,
    /// A pending generated Profile blob is invalid or mismatched.
    PendingProfileInvalid,
}

impl ErrorCode {
    /// Returns the binding-stable string representation.
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
        }
    }
}

/// A non-sensitive Core error.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct WalletError {
    /// Stable error code.
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

/// Result type used by the wallet core.
pub type WalletResult<T> = Result<T, WalletError>;
