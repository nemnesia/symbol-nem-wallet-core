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

pub(crate) const KDF_MEMORY_KIB: u32 = 65_536;
pub(crate) const KDF_ITERATIONS: u32 = 3;
pub(crate) const KDF_PARALLELISM: u32 = 1;
pub(crate) const KDF_VERSION: u32 = 0x13;
pub(crate) const DUPLICATE_DOMAIN: &[u8] = b"symbol-nem-wallet-core/profile-duplicate/v1";

pub(crate) fn random<const N: usize>() -> WalletResult<[u8; N]> {
    let mut bytes = [0u8; N];
    getrandom::fill(&mut bytes).map_err(|_| WalletError::new(ErrorCode::RandomSourceFailure))?;
    Ok(bytes)
}

pub(crate) fn random_uuid() -> WalletResult<Uuid> {
    Ok(Uuid::from_bytes(random()?))
}

pub(crate) fn validate_password(password: &[u8]) -> WalletResult<()> {
    if password.is_empty() || core::str::from_utf8(password).is_err() {
        return Err(WalletError::new(ErrorCode::InvalidArgument));
    }
    Ok(())
}

pub(crate) fn mnemonic_from_entropy(entropy: &[u8; 32]) -> WalletResult<Vec<u8>> {
    let mnemonic = Mnemonic::from_entropy_in(Language::English, entropy)
        .map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    Ok(mnemonic.to_string().into_bytes())
}

pub(crate) fn parse_mnemonic(input: &[u8]) -> WalletResult<([u8; 32], Vec<u8>)> {
    let input =
        core::str::from_utf8(input).map_err(|_| WalletError::new(ErrorCode::InvalidMnemonic))?;
    let normalized = Zeroizing::new(input.nfkd().collect::<String>());
    let mnemonic = Mnemonic::parse_in_normalized(Language::English, &normalized)
        .map_err(|_| WalletError::new(ErrorCode::InvalidMnemonic))?;
    if mnemonic.word_count() != 24 {
        return Err(WalletError::new(ErrorCode::InvalidMnemonic));
    }

    let entropy = mnemonic.to_entropy();
    let entropy: [u8; 32] = entropy
        .try_into()
        .map_err(|_| WalletError::new(ErrorCode::InvalidMnemonic))?;
    Ok((entropy, mnemonic.to_string().into_bytes()))
}

pub(crate) fn seed_from_entropy(entropy: &[u8; 32]) -> WalletResult<[u8; 64]> {
    let mnemonic = Mnemonic::from_entropy_in(Language::English, entropy)
        .map_err(|_| WalletError::new(ErrorCode::InvalidMnemonic))?;
    let seed = mnemonic.to_seed("");
    Ok(seed)
}

pub(crate) fn derive_private_key(
    entropy: &[u8; 32],
    chain: Chain,
    network: Network,
    account_index: u32,
) -> WalletResult<[u8; 32]> {
    if account_index > 2_147_483_647 {
        return Err(WalletError::new(ErrorCode::InvalidAccountIndex));
    }

    let mut seed = seed_from_entropy(entropy)?;
    let coin_type = match (chain, network) {
        (Chain::Symbol, Network::Mainnet) => 4_343,
        (Chain::Symbol, Network::Testnet) => 1,
        (Chain::Nem, Network::Mainnet) => 43,
        (Chain::Nem, Network::Testnet) => 1,
    };
    let path = [44, coin_type, account_index, 0, 0];
    let root_key = match chain {
        Chain::Symbol => b"ed25519 seed".as_slice(),
        Chain::Nem => b"ed25519-keccak seed".as_slice(),
    };

    let mut node = hmac_sha512(root_key, &seed)?;
    for identifier in path {
        let mut child_data = [0u8; 37];
        child_data[0] = 0;
        child_data[1..33].copy_from_slice(&node[..32]);
        child_data[33..].copy_from_slice(&(identifier | 0x8000_0000).to_be_bytes());
        node = hmac_sha512(&node[32..], &child_data)?;
        child_data.zeroize();
    }
    seed.zeroize();

    let mut private_key = [0u8; 32];
    private_key.copy_from_slice(&node[..32]);
    node.zeroize();

    if matches!(chain, Chain::Nem) {
        private_key.reverse();
    }
    validate_private_key(chain, &private_key)?;
    Ok(private_key)
}

pub(crate) fn validate_private_key(chain: Chain, private_key: &[u8]) -> WalletResult<[u8; 32]> {
    let private_key: [u8; 32] = private_key
        .try_into()
        .map_err(|_| WalletError::new(ErrorCode::InvalidPrivateKey))?;
    if private_key.iter().all(|byte| *byte == 0) {
        return Err(WalletError::new(ErrorCode::InvalidPrivateKey));
    }
    let _ = public_key(chain, &private_key)?;
    Ok(private_key)
}

pub(crate) fn generate_private_key(chain: Chain) -> WalletResult<[u8; 32]> {
    loop {
        let candidate = random::<32>()?;
        if let Ok(private_key) = validate_private_key(chain, &candidate) {
            return Ok(private_key);
        }
    }
}

pub(crate) fn public_key(chain: Chain, private_key: &[u8; 32]) -> WalletResult<[u8; 32]> {
    let (public_key, _) = key_material(chain, private_key)?;
    Ok(public_key)
}

pub(crate) fn sign(chain: Chain, private_key: &[u8; 32], message: &[u8]) -> WalletResult<[u8; 64]> {
    let (public_key, mut prefix) = key_material(chain, private_key)?;
    let mut nonce_data = Vec::with_capacity(prefix.len() + message.len());
    nonce_data.extend_from_slice(&prefix);
    nonce_data.extend_from_slice(message);
    let mut nonce_hash = hash_512(chain, &nonce_data);
    nonce_data.zeroize();
    prefix.zeroize();
    let nonce = Scalar::from_bytes_mod_order_wide(&nonce_hash);
    nonce_hash.zeroize();
    let encoded_r = (ED25519_BASEPOINT_POINT * nonce).compress().to_bytes();

    let mut challenge_data = Vec::with_capacity(32 + 32 + message.len());
    challenge_data.extend_from_slice(&encoded_r);
    challenge_data.extend_from_slice(&public_key);
    challenge_data.extend_from_slice(message);
    let mut challenge_hash = hash_512(chain, &challenge_data);
    challenge_data.zeroize();
    let challenge = Scalar::from_bytes_mod_order_wide(&challenge_hash);
    challenge_hash.zeroize();

    let mut signature = [0u8; 64];
    signature[..32].copy_from_slice(&encoded_r);
    signature[32..]
        .copy_from_slice(&(nonce + challenge * private_scalar(chain, private_key)?).to_bytes());
    Ok(signature)
}

fn key_material(chain: Chain, private_key: &[u8; 32]) -> WalletResult<([u8; 32], [u8; 32])> {
    let scalar = private_scalar(chain, private_key)?;
    let mut seed = *private_key;
    if matches!(chain, Chain::Nem) {
        seed.reverse();
    }
    let mut digest = hash_512(chain, &seed);
    let mut prefix = [0u8; 32];
    prefix.copy_from_slice(&digest[32..]);
    digest.zeroize();
    seed.zeroize();
    Ok((
        (ED25519_BASEPOINT_POINT * scalar).compress().to_bytes(),
        prefix,
    ))
}

fn private_scalar(chain: Chain, private_key: &[u8; 32]) -> WalletResult<Scalar> {
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
    match chain {
        Chain::Symbol => Sha512::digest(data).into(),
        Chain::Nem => Keccak512::digest(data).into(),
    }
}

pub(crate) fn address(chain: Chain, network: Network, public_key: &[u8; 32]) -> String {
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

pub(crate) fn derive_encryption_key(password: &[u8], salt: &[u8; 16]) -> WalletResult<[u8; 32]> {
    validate_password(password)?;
    let params = Params::new(KDF_MEMORY_KIB, KDF_ITERATIONS, KDF_PARALLELISM, Some(32))
        .map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut output = [0u8; 32];
    argon2
        .hash_password_into(password, salt, &mut output)
        .map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    Ok(output)
}

pub(crate) fn encrypt(
    key: &[u8; 32],
    nonce: &[u8; 12],
    aad: &[u8],
    plaintext: &[u8],
) -> WalletResult<(Vec<u8>, [u8; 16])> {
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    let mut ciphertext = plaintext.to_vec();
    let tag = cipher
        .encrypt_in_place_detached(Nonce::from_slice(nonce), aad, &mut ciphertext)
        .map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    Ok((ciphertext, tag.into()))
}

pub(crate) fn decrypt(
    key: &[u8; 32],
    nonce: &[u8; 12],
    tag: &[u8; 16],
    aad: &[u8],
    ciphertext: &[u8],
) -> WalletResult<Vec<u8>> {
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    let mut plaintext = ciphertext.to_vec();
    cipher
        .decrypt_in_place_detached(
            Nonce::from_slice(nonce),
            aad,
            &mut plaintext,
            Tag::from_slice(tag),
        )
        .map_err(|_| WalletError::new(ErrorCode::AuthenticationFailed))?;
    Ok(plaintext)
}

pub(crate) fn duplicate_tag(
    registry_key: &[u8; 32],
    network: Network,
    entropy: &[u8; 32],
) -> [u8; 32] {
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
    Sha256::digest(data).into()
}

fn hmac_sha512(key: &[u8], data: &[u8]) -> WalletResult<[u8; 64]> {
    let mut mac = <HmacSha512 as Mac>::new_from_slice(key)
        .map_err(|_| WalletError::new(ErrorCode::CryptoFailure))?;
    mac.update(data);
    Ok(mac.finalize().into_bytes().into())
}

fn base32_encode(bytes: &[u8]) -> String {
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
    use super::*;

    fn bytes<const N: usize>(hex: &str) -> [u8; N] {
        hex::decode(hex).unwrap().try_into().unwrap()
    }

    #[test]
    fn symbol_key_address_and_signature_match_sdk_vectors() {
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
        let mnemonic = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
        let (entropy, normalized) = parse_mnemonic(mnemonic).unwrap();
        assert_eq!(normalized, mnemonic);
        assert_eq!(
            seed_from_entropy(&entropy).unwrap(),
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
}
