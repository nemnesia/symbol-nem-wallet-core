//! Symbol/NEMの暗号処理を、仕様およびsymbol-sdk由来の固定fixtureと照合する。

use super::*;

fn bytes<const N: usize>(hex: &str) -> [u8; N] {
    hex::decode(hex).unwrap().try_into().unwrap()
}

#[test]
fn symbol_key_address_and_signature_match_sdk_vectors() {
    // Symbolの公開鍵、Mainnet/Testnet address、raw signatureをfixtureと照合する。
    let private_key =
        bytes::<32>("575DBB3062267EFF57C970A336EBBC8FBCFE12C5BD3ED7BC11EB0481D7704CED");
    let public_key = public_key(Chain::Symbol, &private_key).unwrap();
    assert_eq!(
        public_key,
        bytes::<32>("2E834140FD66CF87B254A693A2C7862C819217B676D3943267156625E816EC6F")
    );
    assert_eq!(
        address(Chain::Symbol, Network::Mainnet, &public_key),
        "NATNE7Q5BITMUTRRN6IB4I7FLSDRDWZA34SQ33Y"
    );
    assert_eq!(
        address(Chain::Symbol, Network::Testnet, &public_key),
        "TATNE7Q5BITMUTRRN6IB4I7FLSDRDWZA37JGO5Q"
    );

    let message = bytes::<41>(
        "8CE03CD60514233B86789729102EA09E867FC6D964DEA8C2018EF7D0A2E0E24BF7E348E917116690B9",
    );
    assert_eq!(
            sign(Chain::Symbol, &bytes::<32>("ABF4CF55A2B3F742D7543D9CC17F50447B969E6E06F5EA9195D428AB12B7318D"), &message).unwrap(),
            bytes::<64>("31D272F0662915CAC43AB7D721CAF65D8601F52B2E793EA1533E7BC20E04EA97B74859D9209A7B18DFECFD2C4A42D6957628F5357E3FB8B87CF6A888BAB4280E")
        );
}

#[test]
fn nem_key_address_and_signature_match_sdk_vectors() {
    // NEMのhash系統、address checksum、raw signatureがSymbolと混同されないことを確認する。
    let private_key =
        bytes::<32>("575DBB3062267EFF57C970A336EBBC8FBCFE12C5BD3ED7BC11EB0481D7704CED");
    let public_key = public_key(Chain::Nem, &private_key).unwrap();
    assert_eq!(
        public_key,
        bytes::<32>("C5F54BA980FCBB657DBAAA42700539B207873E134D2375EFEAB5F1AB52F87844")
    );
    assert_eq!(
        address(Chain::Nem, Network::Mainnet, &public_key),
        "NDD2CT6LQLIYQ56KIXI3ENTM6EK3D44P5JFXJ4R4"
    );
    assert_eq!(
        address(Chain::Nem, Network::Testnet, &public_key),
        "TDD2CT6LQLIYQ56KIXI3ENTM6EK3D44P5KZPFMK2"
    );

    let message = bytes::<41>(
        "8CE03CD60514233B86789729102EA09E867FC6D964DEA8C2018EF7D0A2E0E24BF7E348E917116690B9",
    );
    assert_eq!(
            sign(Chain::Nem, &bytes::<32>("ABF4CF55A2B3F742D7543D9CC17F50447B969E6E06F5EA9195D428AB12B7318D"), &message).unwrap(),
            bytes::<64>("D9CEC0CC0E3465FAB229F8E1D6DB68AB9CC99A18CB0435F70DEB6100948576CD5C0AA1FEB550BDD8693EF81EB10A556A622DB1F9301986827B96716A7134230C")
        );
}

#[test]
fn secret_scalar_response_arithmetic_matches_dalek() {
    // 署名応答用の固定長byte演算がcurve25519-dalekの参照演算と一致することを確認する。
    let left = Scalar::from_bytes_mod_order(bytes::<32>(
        "000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D0E0F",
    ));
    let right = Scalar::from_bytes_mod_order(bytes::<32>(
        "0F0E0D0C0B0A090807060504030201001F1E1D1C1B1A1918171615141312110E",
    ));
    let left_bytes = left.to_bytes();
    let right_bytes = right.to_bytes();
    let expected_sum = (left + right).to_bytes();
    let expected_product = (left * right).to_bytes();

    assert_eq!(
        scalar_add_mod_order(&left_bytes, &right_bytes).as_ref(),
        &expected_sum,
    );
    assert_eq!(
        scalar_mul_mod_order(&left_bytes, &right_bytes).as_ref(),
        &expected_product,
    );
}

#[test]
fn hd_derivation_matches_24_word_sdk_vectors() {
    // BIP39 English 24 words、空passphrase、Symbol/NEMのHD導出結果を照合する。
    let mnemonic = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
    let (entropy, normalized) = parse_mnemonic(mnemonic).unwrap();
    assert_eq!(normalized.as_slice(), mnemonic);
    assert_eq!(
            seed_from_entropy(&entropy).unwrap().as_slice(),
            bytes::<64>("408B285C123836004F4B8842C89324C1F01382450C0D439AF345BA7FC49ACF705489C6FC77DBD4E3DC1DD8CC6BC9F043DB8ADA1E243C4A0EAFB290D399480840")
        );

    let symbol_private = derive_private_key(&entropy, Chain::Symbol, Network::Mainnet, 0).unwrap();
    assert_eq!(
        public_key(Chain::Symbol, &symbol_private).unwrap(),
        bytes::<32>("54ADC79E3BEE5D0EF899832172C3CCF29DC5F5F3BC0E0D5FD06E3E64D8DB51D2")
    );
    let nem_private = derive_private_key(&entropy, Chain::Nem, Network::Mainnet, 0).unwrap();
    assert_eq!(
        public_key(Chain::Nem, &nem_private).unwrap(),
        bytes::<32>("58892BC737B493D837D7F7EC4519371B9498F23BBC7F2A2A10DE11A70E7BCF84")
    );
}

#[test]
fn hd_derivation_covers_all_v1_networks_chains_and_account_boundaries() {
    // 2 Chain × 2 Network × account indexの下限・中間・上限を検証する。
    let mnemonic = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
    let (entropy, _) = parse_mnemonic(mnemonic).unwrap();
    let mut derived = Vec::new();
    for chain in [Chain::Nem, Chain::Symbol] {
        for network in [Network::Testnet, Network::Mainnet] {
            for account_index in [0, 1, 2_147_483_647] {
                let private_key =
                    derive_private_key(&entropy, chain, network, account_index).unwrap();
                assert_ne!(private_key, [0; 32]);
                assert!(public_key(chain, &private_key).is_ok());
                derived.push((chain, network, account_index, private_key));
            }
        }
    }
    assert_eq!(derived.len(), 12);
    for (index, (_, _, _, private_key)) in derived.iter().enumerate() {
        assert!(derived[index + 1..]
            .iter()
            .all(|(_, _, _, other)| other != private_key));
    }
}

#[test]
fn hd_derivation_matches_fixed_sdk_fixture_for_all_v1_networks() {
    let mnemonic = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
    let (entropy, _) = parse_mnemonic(mnemonic).unwrap();
    // symbol-sdk 3.3.2のBip32 / Facadeから取得した固定fixture。
    for (chain, network, private_key, expected_public_key, expected_address) in [
        (
            Chain::Symbol,
            Network::Mainnet,
            "521BF2A56DD3BCA09A43D8378FB6659ABA155A02DE0486A0FEF8026F464AB764",
            "54ADC79E3BEE5D0EF899832172C3CCF29DC5F5F3BC0E0D5FD06E3E64D8DB51D2",
            "NBPYVRSCYLIJH7VU6XNR7I3H7GBQOGHHAMLJC3A",
        ),
        (
            Chain::Symbol,
            Network::Testnet,
            "99DA0B339E5C3E3DDDD59678B52A7C7E5F9E02BD07AF4E220CD69228766BCDDB",
            "811B322F9C28877BF9F543A8E8DB1F3C4FD45A6CCC6CADF315499893D49B8299",
            "TAPS6PH4GZNA6GQ26S7T44S4BYM3Z2CHUJ53HGA",
        ),
        (
            Chain::Nem,
            Network::Mainnet,
            "658143CB972E4DFA0941F29E275C42B3F941CB6133CABCFEAF103AFF2FD2DE11",
            "58892BC737B493D837D7F7EC4519371B9498F23BBC7F2A2A10DE11A70E7BCF84",
            "NCMYA4ZDEYSPUH5GWJO65TUPRLXRPF4KG7OHLJCQ",
        ),
        (
            Chain::Nem,
            Network::Testnet,
            "53E4DA95E71C511EEFB5A34B0CD91815903F3DFF8E5644CC4DAAE8EF22850FB3",
            "BAA6148215906BC6FA2A2D0CCFC0EB62750EB18AD4678361F6C32BA219A83A78",
            "TCOROZCSDL3RSHUSSJFBBUT2WTVAFPZHEPUYLCSY",
        ),
    ] {
        let private_key = bytes::<32>(private_key);
        let expected_public_key = bytes::<32>(expected_public_key);
        assert_eq!(
            derive_private_key(&entropy, chain, network, 0).unwrap(),
            private_key
        );
        let derived_public_key = public_key(chain, &private_key).unwrap();
        assert_eq!(derived_public_key, expected_public_key);
        assert_eq!(
            address(chain, network, &expected_public_key),
            expected_address
        );
    }
}

#[test]
fn bip32_root_and_child_nodes_match_symbol_sdk_vectors() {
    // root HMACとhardened child pathの中間値を固定fixtureと照合する。
    let seed = bytes::<16>("000102030405060708090A0B0C0D0E0F");
    let mut root = hmac_sha512(b"ed25519 seed", &seed).unwrap();
    assert_eq!(
        &root[..32],
        &bytes::<32>("2B4BE7F19EE27BBF30C667B642D5F4AA69FD169872F8FC3059C08EBAE2EB19E7")
    );
    assert_eq!(
        &root[32..],
        &bytes::<32>("90046A93DE5380A72B5E45010748567D5EA02BBF6522F979E05C0D8D8CA9FFFB")
    );

    for identifier in [44u32, 4_343, 0, 0, 0] {
        let mut child_data = [0u8; 37];
        child_data[1..33].copy_from_slice(&root[..32]);
        child_data[33..].copy_from_slice(&(identifier | 0x8000_0000).to_be_bytes());
        let next = hmac_sha512(&root[32..], &child_data).unwrap();
        child_data.zeroize();
        root.zeroize();
        root = next;
    }
    assert_eq!(
        &root[..32],
        &bytes::<32>("BB2724A538CFD64E4366FEB36BB982B954D58EA78F7163451B3B514EDD692159")
    );
    assert_eq!(
        &root[32..],
        &bytes::<32>("B8E16D407C8837B46A9445C6417310F3C7A4DCD9B8FF2679C383E6DEF721AC11")
    );
    root.zeroize();

    let mut nem_root = hmac_sha512(b"ed25519-keccak seed", &seed).unwrap();
    assert_eq!(
        &nem_root[..32],
        &bytes::<32>("A3D76D92ACF784D68F4EA2F6DE5507A3520385237A80277132B6C8F3685601B2")
    );
    assert_eq!(
        &nem_root[32..],
        &bytes::<32>("9CFCA256458AAC0A0550A30DC7639D87364E4323BA61ED41454818E3317BAED0")
    );
    nem_root.zeroize();
}

#[test]
fn fixed_encryption_fixture_values() {
    // Argon2id、AES-256-GCM、AAD、tagの固定値を照合し、暗号形式の変更を検知する。
    let password = b"fixture password";
    let salt = bytes::<16>("000102030405060708090A0B0C0D0E0F");
    let key = derive_encryption_key(password, &salt).unwrap();
    let nonce = bytes::<12>("101112131415161718191A1B");
    let aad = b"symbol-nem-wallet-core/aad/v1";
    let plaintext = b"fixture payload";
    let (ciphertext, tag) = encrypt(&key, &nonce, aad, plaintext).unwrap();
    assert_eq!(
        key.as_slice(),
        &bytes::<32>("F4F7B6DD88FE4A26ED534D0B14EE0E5E3102AF15579ECDF91ED19795623FE621")
    );
    assert_eq!(
        ciphertext.as_slice(),
        &bytes::<15>("16F1CBBC6E8F704179910A5160B185")
    );
    assert_eq!(tag, bytes::<16>("48D27CC71C274D3F19260E7AF3AA240D"));
    assert_eq!(
        decrypt(&key, &nonce, &tag, aad, &ciphertext)
            .unwrap()
            .as_slice(),
        plaintext
    );
}
