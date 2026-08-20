#![forbid(unsafe_code)]
#![warn(missing_docs)]

//! Rust wallet core for Symbol and NEM.
//!
//! The public functions operate on opaque Wallet Store and pending-profile
//! byte buffers. Secret inputs are byte slices, never textual private keys or
//! passwords.

mod cbor;
mod crypto;
mod error;
mod store;
mod types;

pub use error::{ErrorCode, WalletError, WalletResult};
pub use types::{
    Chain, DecodeWarning, MnemonicExport, MutationResult, Network, PendingProfileBlob,
    PreparedProfile, PrivateKeyExport, ProfileId, ProfileInfo, PublicAccountInfo, ReadResult,
    Signature, SoftwareKeyId, SoftwareKeyInfo, SoftwareKeyListItem, SoftwareKeyOrigin,
    WalletStoreBlob,
};

pub use store::{
    change_profile_password, create_empty_store, delete_profile, delete_software_key,
    derive_software_key, export_mnemonic, export_private_key, finalize_generated_profile,
    generate_software_key, get_public_account, import_software_key, list_profiles,
    list_software_keys, prepare_generated_profile, restore_profile, sign,
};
