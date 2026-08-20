#![forbid(unsafe_code)]
#![warn(missing_docs)]

//! SymbolとNEMに対応するRust製Wallet Core。
//!
//! 公開関数は、不透明なWallet StoreとPending Profileのbyte列を入出力する。
//! 秘密入力は、textualなprivate keyやpasswordではなくbyte sliceとして扱う。
//!
//! 秘密情報を必要とする処理は、呼び出しごとにProfile passwordを受け取り、
//! 継続的なunlocked状態を保持しない。状態を変更する操作は、成功時だけ
//! 完全なreplacement Storeを返す。

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
