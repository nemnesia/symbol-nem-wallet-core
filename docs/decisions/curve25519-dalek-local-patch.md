# curve25519-dalek 4.1.3 ローカル修正版の採用

- Decision ID: `DEC-CRYPTO-001`
- Status: Accepted
- Decided date: 2026-08-22
- Scope: `symbol-nem-wallet-core` v1

## Decision

`curve25519-dalek` は crates.io の `4.1.3` を基準とし、リポジトリ内の
`third_party/curve25519-dalek-4.1.3` を `[patch.crates-io]` で使用する。

ローカル修正版では、秘密 Scalar から生成される一時値を `Zeroizing` で管理する。
upstream 4.1.3 との差分は次の2ファイルに限定する。

- `src/scalar.rs`: `as_radix_16` / `as_radix_2w` の radix 配列、carry、bit window、
  coefficient および Scalar の limb buffer を、zeroize feature 有効時に `Zeroizing`
  で保持する。
- `src/edwards.rs`: `mul_base` 内の signed-radix 表現を `Zeroizing` で保持する。

この修正版は、Core の通常の公開鍵生成および署名処理で使用する。具体的には、
`src/crypto.rs` の公開鍵生成と署名 nonce の計算が `EdwardsPoint::mul_base` を利用する。

## Rationale

仕様書は、署名処理で secret を含む temporary buffer を `zeroize` 対象と定めている
（`docs/specifications/specification.md` §12.1）。依存ライブラリ内部で Scalar から
生成される配列もこの扱いに含めるため、Core 側の明示的な `zeroize` と併せて、依存側の
一時値を `Zeroizing` の Drop に委ねる。

この変更は外部 API、署名対象、署名 bytes、公開鍵、アドレス、保存形式および wire
format を変更しない。変更対象は秘密値を含み得る一時メモリの保持方法である。

## Provenance

- Package: `curve25519-dalek 4.1.3`
- Original registry source commit: `5312a0311ec40df95be953eacfa8a11b9a34bc54`
- Override: `Cargo.toml` の `[patch.crates-io]`
- Local source: `third_party/curve25519-dalek-4.1.3`

ローカル修正版を更新する場合は、対象バージョンの upstream source と比較し、上記2箇所の
修正が維持されているかを確認する。upstream に同等の修正が取り込まれた場合も、互換性と
zeroize の適用範囲を確認したうえで、この override の撤去を別途判断する。

## Security boundary

`Zeroizing` は Rust の所有値の Drop 時に内容を消去するための仕組みであり、プロセス全体、
コンパイラが生成した全てのコピー、OS、ランタイムまたは物理メモリからの完全消去を保証する
ものではない。この修正だけで秘密情報の全ライフサイクルを扱うものとはせず、Core 側の
所有期間制限、不要なコピーの回避および明示的な `zeroize` と組み合わせて使用する。

## Validation and maintenance

依存更新または patch 撤去を検討する際は、少なくとも次を確認する。

- upstream source との差分が意図した zeroize 修正だけであること
- 公開鍵生成・Symbol / NEM 署名の既存 fixture とテスト結果が変わらないこと
- `cargo test --workspace --all-features` および対象環境の build / check が成功すること
- patch を撤去しても仕様書 §12.1 の signing temporary 要件を満たすこと
