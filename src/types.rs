use core::fmt;
use uuid::Uuid;

/// Opaque v1 Wallet Store bytes.
pub type WalletStoreBlob = Vec<u8>;

/// Opaque pending generated-profile bytes.
pub type PendingProfileBlob = Vec<u8>;

/// UUID identifying a Profile.
pub type ProfileId = Uuid;

/// UUID identifying a Software Key.
pub type SoftwareKeyId = Uuid;

/// Profile Network. The value is fixed at Profile creation.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Network {
    /// Symbol/NEM Testnet.
    Testnet,
    /// Symbol/NEM Mainnet.
    Mainnet,
}

impl Network {
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

/// Blockchain family to which a Software Key is fixed.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Chain {
    /// NEM.
    Nem,
    /// Symbol.
    Symbol,
}

impl Chain {
    pub(crate) const fn wire(self) -> u64 {
        match self {
            Self::Nem => 0,
            Self::Symbol => 1,
        }
    }
}

/// Software Key origin.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SoftwareKeyOrigin {
    /// Derived from the Profile Mnemonic.
    Derived {
        /// Hardened account index used for derivation.
        account_index: u32,
    },
    /// Imported from a raw private key.
    Imported,
    /// Generated independently by Core.
    Generated,
}

/// Warning generated while a malformed child object is skipped.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DecodeWarning {
    /// Stable warning code from the Store format.
    pub code: &'static str,
    /// Object kind that was skipped.
    pub object_type: &'static str,
    /// Identifier when it could be recovered without trusting a malformed secret.
    pub object_id: Option<Uuid>,
    /// Field associated with the warning, when known.
    pub field: Option<&'static str>,
}

/// A read result with non-fatal decode diagnostics.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReadResult<T> {
    /// Operation value.
    pub value: T,
    /// Non-fatal skipped-object diagnostics.
    pub warnings: Vec<DecodeWarning>,
}

/// A successful mutation and its complete replacement Store.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MutationResult<T> {
    /// Complete replacement Store bytes.
    pub store: WalletStoreBlob,
    /// Operation value.
    pub value: T,
    /// Non-fatal skipped-object diagnostics.
    pub warnings: Vec<DecodeWarning>,
}

/// Public Profile information. It contains no secret.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProfileInfo {
    /// Profile identifier.
    pub profile_id: ProfileId,
    /// Fixed Profile Network.
    pub network: Network,
    /// Number of indexed Software Keys.
    pub software_key_count: usize,
}

/// Public Software Key information returned after authenticated operations.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SoftwareKeyInfo {
    /// Software Key identifier.
    pub key_id: SoftwareKeyId,
    /// Fixed Chain.
    pub chain: Chain,
    /// Key origin.
    pub origin: SoftwareKeyOrigin,
}

/// Passwordless Software Key list item.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SoftwareKeyListItem {
    /// Software Key identifier.
    pub key_id: SoftwareKeyId,
    /// Fixed Chain.
    pub chain: Chain,
}

/// Public account information.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PublicAccountInfo {
    /// Software Key identifier.
    pub key_id: SoftwareKeyId,
    /// Fixed Chain.
    pub chain: Chain,
    /// Profile Network.
    pub network: Network,
    /// Raw 32-byte public key.
    pub public_key: [u8; 32],
    /// Chain and Network-specific address string.
    pub address: String,
}

/// Raw signature result.
#[derive(Clone, Eq, PartialEq)]
pub struct Signature {
    /// Raw 64-byte signature.
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

/// Explicit Mnemonic export result.
#[derive(Clone, Eq, PartialEq)]
pub struct MnemonicExport {
    /// Normalized BIP39 24-word UTF-8 bytes.
    pub mnemonic_utf8: Vec<u8>,
}

impl fmt::Debug for MnemonicExport {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("MnemonicExport")
            .field("mnemonic_utf8", &"[redacted]")
            .finish()
    }
}

/// Explicit private-key export result.
#[derive(Clone, Eq, PartialEq)]
pub struct PrivateKeyExport {
    /// Raw 32-byte private key.
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

/// Generated Profile data returned by the first backup handoff step.
#[derive(Clone, Eq, PartialEq)]
pub struct PreparedProfile {
    /// Normalized BIP39 24-word UTF-8 bytes for the initial handoff.
    pub mnemonic_utf8: Vec<u8>,
    /// Opaque pending Profile bytes to pass to finalize.
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
