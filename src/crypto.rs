//! Symbol/NEM共通の暗号処理とChain固有の鍵処理。
//!
//! SymbolはSHA-512とSHA3、NEMはKeccak-512とKeccak-256を使用するため、
//! Chain分岐をこのモジュールへ閉じ込める。HD導出はsymbol-sdk 3.3.2の
//! BIP32動作を基準にし、NEMだけ最終private keyのbyte orderを反転する。
//!
//! Profile payloadの保護にはArgon2idとAES-256-GCMを使用する。password、Mnemonic、
//! private key、seedおよび主要なbyte中間値は、所有期間を限定し、明示的にzeroize
//! できる型や終了経路で管理する。エラーへ秘密値を含めない。署名応答の秘密Scalar算術は
//! 固定長の内部byte演算で行い、依存ライブラリのScalar演算子を使用しない。

use aes_gcm::{
    aead::{AeadInPlace, KeyInit},
    Aes256Gcm, Nonce, Tag,
};
use argon2::{Algorithm, Argon2, Params, Version};
use bip39::{Language, Mnemonic};
use curve25519_dalek::{edwards::EdwardsPoint, scalar::Scalar};
use hmac::{Hmac, Mac};
use ripemd::Ripemd160;
use sha2::{Digest as Sha2Digest, Sha256, Sha512};
use sha3::{Keccak256, Keccak512, Sha3_256};
use unicode_normalization::UnicodeNormalization;
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
    // CodeQLはゼロ初期化された出力先を検出するが、成功時は呼び出し元が観測・利用する前に
    // getrandom::fillが全バイトを乱数で上書きするため、暗号値のhard-codeではない。
    // codeql[rust/hard-coded-cryptographic-value]
    let mut bytes = [0u8; N];
    getrandom::fill(&mut bytes).map_err(|_| WalletError::new(ErrorCode::RandomSourceFailure))?;
    Ok(bytes)
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
    generate_private_key_with(chain, random::<32>)
}

fn generate_private_key_with<F>(chain: Chain, mut candidate: F) -> WalletResult<[u8; 32]>
where
    F: FnMut() -> WalletResult<[u8; 32]>,
{
    // 乱数候補をChain固有の鍵処理で検証し、通過した値だけを返す。
    // Production callers pass the CSPRNG above; the injectable private helper lets tests
    // exercise invalid-candidate and random-source failure paths without changing the API.
    loop {
        let candidate = Zeroizing::new(candidate()?);
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
    // 参照を受け取る固定basepoint APIを使い、Copy型のScalarをowned引数へ渡さない。
    let encoded_r = EdwardsPoint::mul_base(&nonce).compress().to_bytes();

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
    // ScalarのMulAssign/AddAssignはCopy型の内部temporaryを生成するため、署名応答の
    // secret arithmeticは依存ライブラリの演算子を使わず、固定長byte列で行う。
    let nonce_bytes = Zeroizing::new(nonce.to_bytes());
    let challenge_bytes = Zeroizing::new(challenge.to_bytes());
    let private_scalar_bytes = Zeroizing::new(private_scalar.to_bytes());
    let private_term = scalar_mul_mod_order(&challenge_bytes, &private_scalar_bytes);
    let response_bytes = scalar_add_mod_order(&nonce_bytes, &private_term);
    signature[32..].copy_from_slice(&response_bytes[..]);
    private_scalar.zeroize();
    nonce.zeroize();
    challenge.zeroize();
    Ok(signature)
}

// Ed25519 scalar group order, encoded as a little-endian 32-byte integer.
const ED25519_SCALAR_ORDER: [u8; 32] = [
    0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10,
];

// Inputs and outputs of these helpers are canonical scalar values (< l). The fixed iteration
// count and mask-based selection keep the secret multiplier independent of control flow.
fn scalar_add_mod_order(left: &[u8; 32], right: &[u8; 32]) -> Zeroizing<[u8; 32]> {
    let mut sum = Zeroizing::new([0u8; 32]);
    let mut carry = 0u8;
    for index in 0..32 {
        let (value, first_borrow) = left[index].overflowing_add(right[index]);
        let (value, second_borrow) = value.overflowing_add(carry);
        sum[index] = value;
        carry = (first_borrow as u8) | (second_borrow as u8);
    }

    // l is below 2^252, so adding two canonical values cannot overflow 2^256.
    let mut difference = Zeroizing::new([0u8; 32]);
    let mut borrow = 0u8;
    for index in 0..32 {
        let (value, first_borrow) = sum[index].overflowing_sub(ED25519_SCALAR_ORDER[index]);
        let (value, second_borrow) = value.overflowing_sub(borrow);
        difference[index] = value;
        borrow = (first_borrow as u8) | (second_borrow as u8);
    }

    // Select sum when sum < l, otherwise select sum - l without branching on secret data.
    let mut mask = 0u8.wrapping_sub(1u8 ^ borrow);
    for index in 0..32 {
        sum[index] = (difference[index] & mask) | (sum[index] & !mask);
    }
    mask.zeroize();
    carry.zeroize();
    borrow.zeroize();
    sum
}

fn scalar_mul_mod_order(left: &[u8; 32], right: &[u8; 32]) -> Zeroizing<[u8; 32]> {
    let mut result = Zeroizing::new([0u8; 32]);
    let mut addend = Zeroizing::new(*left);

    // Fixed 256 iterations avoid a secret-dependent loop bound. The result remains canonical
    // because scalar_add_mod_order reduces after every addition.
    for bit_index in 0..256 {
        let mut bit = (right[bit_index / 8] >> (bit_index % 8)) & 1;
        let sum = scalar_add_mod_order(&result, &addend);
        let mut mask = 0u8.wrapping_sub(bit);
        for index in 0..32 {
            result[index] = (sum[index] & mask) | (result[index] & !mask);
        }
        mask.zeroize();
        bit.zeroize();
        addend = scalar_add_mod_order(&addend, &addend);
    }

    result
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
    // 参照を受け取る固定basepoint APIを使い、secret Scalarのby-valueコピーを作らない。
    let public_key = EdwardsPoint::mul_base(&scalar).compress().to_bytes();
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
#[path = "../tests/unit/crypto.rs"]
mod tests;
