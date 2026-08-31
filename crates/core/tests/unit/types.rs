//! 秘密情報を含むDTOがDebug出力へ値を漏らさないことを検証する。

use super::*;

#[test]
fn secret_dto_debug_output_is_redacted() {
    // Mnemonic、private key、Pending ProfileのいずれもDebug出力へ現れない。
    let mnemonic = MnemonicExport {
        mnemonic_utf8: b"secret mnemonic".to_vec(),
    };
    let private_key = PrivateKeyExport {
        private_key: [0xA5; 32],
    };
    let signature = Signature {
        signature: [0xA5; 64],
    };
    let prepared = PreparedProfile {
        mnemonic_utf8: b"secret prepared mnemonic".to_vec(),
        pending_profile: b"secret pending profile".to_vec(),
    };

    assert!(!format!("{mnemonic:?}").contains("secret mnemonic"));
    assert!(!format!("{private_key:?}").contains("A5"));
    assert!(!format!("{signature:?}").contains("A5"));
    assert!(!format!("{prepared:?}").contains("secret"));
}
