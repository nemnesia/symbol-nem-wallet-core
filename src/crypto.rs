//! Symbol/NEM共通の暗号処理とChain固有の鍵処理。
//!
//! SymbolはSHA-512とSHA3、NEMはKeccak-512とKeccak-256を使用するため、
//! Chain分岐をこのモジュールへ閉じ込める。HD導出はsymbol-sdk 3.3.2の
//! BIP32動作を基準にし、NEMだけ最終private keyのbyte orderを反転する。
//!
//! Profile payloadの保護にはArgon2idとAES-256-GCMを使用する。password、Mnemonic、
//! private key、seedおよび主要なbyte中間値は、所有期間を限定し、明示的にzeroize
//! できる型や終了経路で管理する。エラーへ秘密値を含めない。署名primitive内部で
//! 依存ライブラリが生成する一時値のzeroize保証は、このモジュールの管理範囲外である。

use aes_gcm::{
    aead::{AeadInPlace, KeyInit},
    Aes256Gcm, Nonce, Tag,
};
use argon2::{Algorithm, Argon2, Params, Version};
use bip39::{Language, Mnemonic};
use curve25519_dalek::{constants::ED25519_BASEPOINT_POINT, scalar::Scalar};
use hmac::{Hmac, Mac};
use ripemd::Ripemd160;
use sha2::{Digest as Sha2Digest, Sha256, Sha512};
use sha3::{Keccak256, Keccak512, Sha3_256};
use unicode_normalization::UnicodeNormalization;
use uuid::Uuid;
use zeroize::{Zeroize, Zeroizing};

use crate::{
    error::{ErrorCode, WalletError, WalletResult},
    types::{Chain, Network},
};

type HmacSha256 = Hmac<Sha256>;
type HmacSha512 = Hmac<Sha512>;

// Wallet Store v1で固定されたArgon2idパラメータ。変更すると既存Storeを復号できない。
pub(crate) const KDF_MEMORY_KIB: u32 = 65_536;
pub(crate) const KDF_ITERATIONS: u32 = 3;
pub(crate) const KDF_PARALLELISM: u32 = 1;
pub(crate) const KDF_VERSION: u32 = 0x13;
pub(crate) const DUPLICATE_DOMAIN: &[u8] = b"symbol-nem-wallet-core/profile-duplicate/v1";

// OSまたはWeb Crypto由来のCSPRNGを使用し、予測可能なfallbackは設けない。
pub(crate) fn random<const N: usize>() -> WalletResult<[u8; N]> {
    let mut bytes = [0u8; N];
    getrandom::fill(&mut bytes).map_err(|_| WalletError::new(ErrorCode::RandomSourceFailure))?;
    Ok(bytes)
}

pub(crate) fn random_uuid() -> WalletResult<Uuid> {
    // UUIDは秘密値や公開情報から導出せず、Store内の識別子として独立生成する。
    Ok(Uuid::from_bytes(random()?))
}

pub(crate) fn validate_password(password: &[u8]) -> WalletResult<()> {
    // password policyは決めず、空でないUTF-8 byte列という境界だけを検証する。
    if password.is_empty() || core::str::from_utf8(password).is_err() {
        return Err(WalletError::new(ErrorCode::InvalidArgument));
    }
    Ok(())
}

// v1 MnemonicはEnglish 24 words固定とし、保存時はword stringではなくentropyを使う。
pub(crate) fn mnemonic_from_entropy(entropy: &[u8; 32]) -> WalletResult<Vec<u8>> {
    let mnemonic = Mnemonic::from_entropy_in(Language::English, entropy)
        .map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    Ok(mnemonic.to_string().into_bytes())
}

pub(crate) fn parse_mnemonic(input: &[u8]) -> WalletResult<([u8; 32], Zeroizing<Vec<u8>>)> {
    // 入力境界ではUTF-8とNFKDを検証し、BIP39のword list・checksum・24 wordsを確認する。
    let input =
        core::str::from_utf8(input).map_err(|_| WalletError::new(ErrorCode::InvalidMnemonic))?;
    let normalized = Zeroizing::new(input.nfkd().collect::<String>());
    let mnemonic = Mnemonic::parse_in_normalized(Language::English, &normalized)
        .map_err(|_| WalletError::new(ErrorCode::InvalidMnemonic))?;
    if mnemonic.word_count() != 24 {
        return Err(WalletError::new(ErrorCode::InvalidMnemonic));
    }

    let entropy = Zeroizing::new(mnemonic.to_entropy());
    let entropy: [u8; 32] = entropy
        .as_slice()
        .try_into()
        .map_err(|_| WalletError::new(ErrorCode::InvalidMnemonic))?;
    Ok((entropy, Zeroizing::new(mnemonic.to_string().into_bytes())))
}

// BIP39 passphraseはv1では空文字列に固定する。
pub(crate) fn seed_from_entropy(entropy: &[u8; 32]) -> WalletResult<Zeroizing<[u8; 64]>> {
    // v1ではBIP39 passphraseを空文字列に固定し、seedは保存せず呼び出し中だけ保持する。
    let mnemonic = Mnemonic::from_entropy_in(Language::English, entropy)
        .map_err(|_| WalletError::new(ErrorCode::InvalidMnemonic))?;
    Ok(Zeroizing::new(mnemonic.to_seed("")))
}

pub(crate) fn derive_private_key(
    entropy: &[u8; 32],
    chain: Chain,
    network: Network,
    account_index: u32,
) -> WalletResult<[u8; 32]> {
    // 仕様のaccount index上限を先に検証し、BIP32の全segmentをhardenedとして導出する。
    if account_index > 2_147_483_647 {
        return Err(WalletError::new(ErrorCode::InvalidAccountIndex));
    }

    let seed = seed_from_entropy(entropy)?;
    // Symbol/NEMとMainnet/Testnetでcoin typeを明示的に分ける。
    let coin_type = match (chain, network) {
        (Chain::Symbol, Network::Mainnet) => 4_343,
        (Chain::Symbol, Network::Testnet) => 1,
        (Chain::Nem, Network::Mainnet) => 43,
        (Chain::Nem, Network::Testnet) => 1,
    };
    let path = [44, coin_type, account_index, 0, 0];
    // Bip32はcurve名に対応するroot HMAC keyを使用する。
    let root_key = match chain {
        Chain::Symbol => b"ed25519 seed".as_slice(),
        Chain::Nem => b"ed25519-keccak seed".as_slice(),
    };

    // HMAC-SHA512の先頭32 bytesをnode private key、後半32 bytesをchain codeとする。
    let mut node = hmac_sha512(root_key, &seed[..])?;
    // v1のpathは44' / coin_type' / account' / 0' / 0'で全要素をhardenedにする。
    for identifier in path {
        // hardened child dataは0x00 || parent private key || big-endian child index。
        let mut child_data = [0u8; 37];
        child_data[0] = 0;
        child_data[1..33].copy_from_slice(&node[..32]);
        child_data[33..].copy_from_slice(&(identifier | 0x8000_0000).to_be_bytes());
        let next_node = match hmac_sha512(&node[32..], &child_data) {
            Ok(value) => value,
            Err(error) => {
                child_data.zeroize();
                node.zeroize();
                return Err(error);
            }
        };
        child_data.zeroize();
        node.zeroize();
        node = next_node;
    }

    let mut private_key = [0u8; 32];
    private_key.copy_from_slice(&node[..32]);
    node.zeroize();

    // NemFacade.bip32NodeToKeyPair()との互換性のため、NEMだけ最終値を反転する。
    if matches!(chain, Chain::Nem) {
        private_key.reverse();
    }
    let validated = validate_private_key(chain, &private_key);
    match validated {
        Ok(_) => Ok(private_key),
        Err(error) => {
            private_key.zeroize();
            Err(error)
        }
    }
}

pub(crate) fn validate_private_key(
    chain: Chain,
    private_key: &[u8],
) -> WalletResult<Zeroizing<[u8; 32]>> {
    // 長さ、all-zero、対象Chainで公開鍵を生成できるかを順に検証する。
    let private_key: [u8; 32] = private_key
        .try_into()
        .map_err(|_| WalletError::new(ErrorCode::InvalidPrivateKey))?;
    let private_key = Zeroizing::new(private_key);
    if private_key.iter().all(|byte| *byte == 0) {
        return Err(WalletError::new(ErrorCode::InvalidPrivateKey));
    }
    let _ = public_key(chain, &private_key)?;
    Ok(private_key)
}

pub(crate) fn generate_private_key(chain: Chain) -> WalletResult<[u8; 32]> {
    // 乱数候補をChain固有の鍵処理で検証し、通過した値だけを返す。
    loop {
        let candidate = Zeroizing::new(random::<32>()?);
        if let Ok(private_key) = validate_private_key(chain, &candidate[..]) {
            return Ok(*private_key);
        }
    }
}

pub(crate) fn public_key(chain: Chain, private_key: &[u8; 32]) -> WalletResult<[u8; 32]> {
    // public key計算のためだけに必要なprefixは返却せず、関数内でzeroizeする。
    let (public_key, mut prefix) = key_material(chain, private_key)?;
    prefix.zeroize();
    Ok(public_key)
}

pub(crate) fn sign(chain: Chain, private_key: &[u8; 32], message: &[u8]) -> WalletResult<[u8; 64]> {
    // Ed25519のnonce/challengeをChain固有hashで計算し、messageへ暗黙のprefixを追加しない。
    // 署名はR || Sのraw 64 bytesで返し、payloadの意味はこの層で解釈しない。
    let (public_key, mut prefix) = key_material(chain, private_key)?;
    let mut nonce_data = Vec::with_capacity(prefix.len() + message.len());
    nonce_data.extend_from_slice(&prefix);
    nonce_data.extend_from_slice(message);
    let mut nonce_hash = hash_512(chain, &nonce_data);
    nonce_data.zeroize();
    prefix.zeroize();
    let mut nonce = Scalar::from_bytes_mod_order_wide(&nonce_hash);
    nonce_hash.zeroize();
    let encoded_r = (ED25519_BASEPOINT_POINT * nonce).compress().to_bytes();

    let mut challenge_data = Vec::with_capacity(32 + 32 + message.len());
    challenge_data.extend_from_slice(&encoded_r);
    challenge_data.extend_from_slice(&public_key);
    challenge_data.extend_from_slice(message);
    let mut challenge_hash = hash_512(chain, &challenge_data);
    challenge_data.zeroize();
    let mut challenge = Scalar::from_bytes_mod_order_wide(&challenge_hash);
    challenge_hash.zeroize();

    let mut signature = [0u8; 64];
    signature[..32].copy_from_slice(&encoded_r);
    let mut private_scalar = match private_scalar(chain, private_key) {
        Ok(value) => value,
        Err(error) => {
            nonce.zeroize();
            challenge.zeroize();
            return Err(error);
        }
    };
    let mut private_term = challenge;
    private_term *= private_scalar;
    let mut response = nonce;
    response += private_term;
    let mut response_bytes = response.to_bytes();
    signature[32..].copy_from_slice(&response_bytes);
    response_bytes.zeroize();
    private_term.zeroize();
    response.zeroize();
    private_scalar.zeroize();
    nonce.zeroize();
    challenge.zeroize();
    Ok(signature)
}

fn key_material(chain: Chain, private_key: &[u8; 32]) -> WalletResult<([u8; 32], [u8; 32])> {
    // private keyから、公開鍵とdeterministic nonceに使う32-byte prefixを同時に作る。
    let mut scalar = private_scalar(chain, private_key)?;
    let mut seed = *private_key;
    if matches!(chain, Chain::Nem) {
        seed.reverse();
    }
    let mut digest = hash_512(chain, &seed);
    let mut prefix = [0u8; 32];
    prefix.copy_from_slice(&digest[32..]);
    digest.zeroize();
    seed.zeroize();
    let public_key = (ED25519_BASEPOINT_POINT * scalar).compress().to_bytes();
    scalar.zeroize();
    Ok((public_key, prefix))
}

fn private_scalar(chain: Chain, private_key: &[u8; 32]) -> WalletResult<Scalar> {
    // Chainに応じたhash結果をEd25519 scalarのclamp規則へ通す。
    let mut seed = *private_key;
    if matches!(chain, Chain::Nem) {
        seed.reverse();
    }
    let mut digest = hash_512(chain, &seed);
    seed.zeroize();
    let mut scalar_bytes = [0u8; 32];
    scalar_bytes.copy_from_slice(&digest[..32]);
    digest.zeroize();
    scalar_bytes[0] &= 248;
    scalar_bytes[31] &= 63;
    scalar_bytes[31] |= 64;
    let scalar = Scalar::from_bytes_mod_order(scalar_bytes);
    scalar_bytes.zeroize();
    Ok(scalar)
}

fn hash_512(chain: Chain, data: &[u8]) -> [u8; 64] {
    // SymbolはSHA-512、NEMはKeccak-512を使用する。ここがChain分岐の境界である。
    match chain {
        Chain::Symbol => Sha512::digest(data).into(),
        Chain::Nem => Keccak512::digest(data).into(),
    }
}

pub(crate) fn address(chain: Chain, network: Network, public_key: &[u8; 32]) -> String {
    // 公開鍵hash、RIPEMD160、Network byte、Chain固有checksum、Base32の順で組み立てる。
    // Network byteはProfileのNetworkから決まり、Chainと混同しない。
    let digest = match chain {
        Chain::Symbol => Sha3_256::digest(public_key).to_vec(),
        Chain::Nem => Keccak256::digest(public_key).to_vec(),
    };
    let ripemd = Ripemd160::digest(&digest);
    let mut address = Vec::with_capacity(if matches!(chain, Chain::Symbol) {
        24
    } else {
        25
    });
    address.push(network.network_identifier());
    address.extend_from_slice(&ripemd);
    let checksum = match chain {
        Chain::Symbol => Sha3_256::digest(&address),
        Chain::Nem => Keccak256::digest(&address),
    };
    address.extend_from_slice(&checksum[..if matches!(chain, Chain::Symbol) { 3 } else { 4 }]);
    base32_encode(&address)
}

pub(crate) fn derive_encryption_key(
    password: &[u8],
    salt: &[u8; 16],
) -> WalletResult<Zeroizing<[u8; 32]>> {
    // Store v1で固定されたArgon2id parametersからAES-256-GCM keyを作る。
    validate_password(password)?;
    let params = Params::new(KDF_MEMORY_KIB, KDF_ITERATIONS, KDF_PARALLELISM, Some(32))
        .map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut output = Zeroizing::new([0u8; 32]);
    argon2
        .hash_password_into(password, salt, &mut *output)
        .map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    Ok(output)
}

pub(crate) fn encrypt(
    key: &[u8; 32],
    nonce: &[u8; 12],
    aad: &[u8],
    plaintext: &[u8],
) -> WalletResult<(Vec<u8>, [u8; 16])> {
    // AADは呼び出し側でwire-level contextをdeterministic CBORへencodeして渡す。
    // 認証失敗時は生成途中のciphertextをzeroizeしてからエラーを返す。
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    let mut ciphertext = plaintext.to_vec();
    let result = cipher.encrypt_in_place_detached(Nonce::from_slice(nonce), aad, &mut ciphertext);
    match result {
        Ok(tag) => Ok((ciphertext, tag.into())),
        Err(_) => {
            ciphertext.zeroize();
            Err(WalletError::new(ErrorCode::CryptoFailure))
        }
    }
}

pub(crate) fn decrypt(
    key: &[u8; 32],
    nonce: &[u8; 12],
    tag: &[u8; 16],
    aad: &[u8],
    ciphertext: &[u8],
) -> WalletResult<Vec<u8>> {
    // tag検証に成功するまでplaintextを呼び出し側へ返さない。
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    let mut plaintext = ciphertext.to_vec();
    let result = cipher.decrypt_in_place_detached(
        Nonce::from_slice(nonce),
        aad,
        &mut plaintext,
        Tag::from_slice(tag),
    );
    match result {
        Ok(()) => Ok(plaintext),
        Err(_) => {
            plaintext.zeroize();
            Err(WalletError::new(ErrorCode::AuthenticationFailed))
        }
    }
}

pub(crate) fn duplicate_tag(
    registry_key: &[u8; 32],
    network: Network,
    entropy: &[u8; 32],
) -> [u8; 32] {
    // registry keyをStore単位の秘密として、Mnemonic+Networkの重複判定tagを作る。
    // tagは暗号化payloadの代替ではなく、認証後の意味的一致検証に使う。
    let mut input = Vec::with_capacity(DUPLICATE_DOMAIN.len() + 33);
    input.extend_from_slice(DUPLICATE_DOMAIN);
    input.push(network.wire() as u8);
    input.extend_from_slice(entropy);
    let mut mac = <HmacSha256 as Mac>::new_from_slice(registry_key)
        .expect("HMAC-SHA256 key size is unrestricted");
    mac.update(&input);
    let tag = mac.finalize().into_bytes().into();
    input.zeroize();
    tag
}

pub(crate) fn sha256(data: &[u8]) -> [u8; 32] {
    // Pending Profileを作成した対象Storeへ結び付けるためのhash。
    Sha256::digest(data).into()
}

fn hmac_sha512(key: &[u8], data: &[u8]) -> WalletResult<[u8; 64]> {
    // HD導出のroot/child nodeで共通に使用するHMAC-SHA512処理。
    let mut mac = <HmacSha512 as Mac>::new_from_slice(key)
        .map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    mac.update(data);
    Ok(mac.finalize().into_bytes().into())
}

fn base32_encode(bytes: &[u8]) -> String {
    // Symbol/NEM addressで使用する大文字RFC 4648 Base32相当のエンコード。
    const ALPHABET: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut output = String::with_capacity((bytes.len() * 8).div_ceil(5));
    let mut buffer = 0u32;
    let mut bits = 0u8;
    for byte in bytes {
        buffer = (buffer << 8) | u32::from(*byte);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            output.push(ALPHABET[((buffer >> bits) & 0x1f) as usize] as char);
        }
        if bits == 0 {
            buffer = 0;
        } else {
            buffer &= (1u32 << bits) - 1;
        }
    }
    if bits > 0 {
        output.push(ALPHABET[((buffer << (5 - bits)) & 0x1f) as usize] as char);
    }
    output
}

#[cfg(test)]
mod tests {
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
    fn hd_derivation_matches_24_word_sdk_vectors() {
        // BIP39 English 24 words、空passphrase、Symbol/NEMのHD導出結果を照合する。
        let mnemonic = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
        let (entropy, normalized) = parse_mnemonic(mnemonic).unwrap();
        assert_eq!(normalized.as_slice(), mnemonic);
        assert_eq!(
            seed_from_entropy(&entropy).unwrap().as_slice(),
            bytes::<64>("408B285C123836004F4B8842C89324C1F01382450C0D439AF345BA7FC49ACF705489C6FC77DBD4E3DC1DD8CC6BC9F043DB8ADA1E243C4A0EAFB290D399480840")
        );

        let symbol_private =
            derive_private_key(&entropy, Chain::Symbol, Network::Mainnet, 0).unwrap();
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
}
