# curve25519-dalek 4.1.3 ローカル修正版の採用

- Decision ID: `DEC-CRYPTO-001`
- Status: Superseded
- Decided date: 2026-08-22
- Superseded date: 2026-08-22
- Superseded by: `docs/specifications/specification.md` §12.1
- Scope: `symbol-nem-wallet-core` v1

## Decision

以下は superseded 前の決定内容であり、現在の v1 の規範構成および適合条件を定めない。

`curve25519-dalek` は crates.io の `4.1.3` を基準とし、リポジトリ内の
`third_party/curve25519-dalek-4.1.3` を `[patch.crates-io]` で使用する。

ローカル修正版では、秘密 Scalar から生成される一時値を `Zeroizing` で管理する。
upstream 4.1.3 との差分は次の4ファイルに限定する。

- `src/scalar.rs`: `as_radix_16` / `as_radix_2w` の radix 配列、carry、bit window、
  coefficient および Scalar の limb buffer を、zeroize feature 有効時に `Zeroizing`
  で保持する。
- `src/edwards.rs`: `mul_base` 内の signed-radix 表現を `Zeroizing` で保持する。
- `src/backend/serial/u64/scalar.rs`: 52-bit backendのunpack words、wide reductionの
  lo/hi、積算用`[u128; 9]`およびmontgomery conversionのlimb bufferを保持する。
- `src/backend/serial/u32/scalar.rs`: 29-bit backendのunpack words、wide reductionの
  lo/hi、積算用`[u64; 17]`およびmontgomery conversionのlimb bufferを保持する。

この修正版は、Core の通常の公開鍵生成および署名処理で使用する。具体的には、
`src/crypto.rs` の公開鍵生成と署名 nonce の計算が `EdwardsPoint::mul_base` を利用する。

## Superseded rationale

v1 の zeroize 保証対象を Core / Binding が明示的に所有または生成する秘密情報 buffer までに
限定し、第三者暗号ライブラリ内部の arithmetic temporary の完全消去を保証対象外とした。
そのため、これらの temporary を zeroize するためだけに local fork を v1 の必須構成とする
根拠はなくなった。

この supersession は、現行実装から local patch を直ちに削除する決定ではない。local patchを
残す場合も、v1 の規範構成または適合条件として必須とはしない。

2026-08-22 に local patch、`Cargo.toml` の `[patch.crates-io]` override、および専用の
検証スクリプトを削除した。現在は crates.io の `curve25519-dalek 4.1.3` を使用する。
以下の記述は、削除前の設計判断と provenance を履歴として保持する。

## Rationale at the time of the decision

当時の仕様書は、署名処理で secret を含む temporary buffer を `zeroize` 対象と定めていた
（`docs/specifications/specification.md` §12.1）。依存ライブラリ内部で Scalar から生成される
配列もこの扱いに含めるため、Core 側の明示的な `zeroize` と併せて、依存側の一時値を
`Zeroizing` の Drop に委ねる判断を行った。

この変更は外部 API、署名対象、署名 bytes、公開鍵、アドレス、保存形式および wire format を
変更しない。変更対象は秘密値を含み得る一時メモリの保持方法である。

## Provenance

- Package: `curve25519-dalek 4.1.3`
- Original registry source commit: `5312a0311ec40df95be953eacfa8a11b9a34bc54`
- crates.io archive SHA-256: `97fb8b7c4503de7d6ae7b42ab72a5a59857b4c937ec27a3d4539dba95b5ab2be`
- Override: `Cargo.toml` の `[patch.crates-io]`
- Local source: `third_party/curve25519-dalek-4.1.3`

upstream archiveとlocal sourceの比較、および変更対象ファイルの期待hash確認は
`bash scripts/check-curve25519-dalek-patch.sh`で機械的に実行する。CIでは固定したarchive
checksumを検証し、許可対象以外の差分を失敗させる。

ローカル修正版を更新する場合は、対象バージョンの upstream source と比較し、上記4ファイルの
修正が維持されているかを確認する。upstream に同等の修正が取り込まれた場合も、互換性と
zeroize の適用範囲を確認したうえで、この override の撤去を別途判断する。

## Security boundary

`Zeroizing` は Rust の所有値の Drop 時に内容を消去するための仕組みであり、プロセス全体、
コンパイラが生成した全てのコピー、OS、ランタイムまたは物理メモリからの完全消去を保証する
ものではない。この修正だけで秘密情報の全ライフサイクルを扱うものとはせず、Core 側の
所有期間制限、不要なコピーの回避および明示的な `zeroize` と組み合わせて使用する。

## Validation and maintenance

local patch の撤去後も、公開鍵生成・Symbol / NEM 署名の既存 fixture とテスト結果が変わら
ないこと、および `cargo test --workspace --all-features` と対象環境の build / check が成功
することを確認する。今後 `curve25519-dalek` を更新する場合は、仕様書 §12.1 の zeroize
保証境界と、公開鍵・署名 bytes の互換性を再確認する。
