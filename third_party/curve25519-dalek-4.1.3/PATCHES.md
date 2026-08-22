# Local patches

このディレクトリは `curve25519-dalek` 4.1.3 の crates.io source を基にした、
このリポジトリ専用のローカル修正版である。通常の依存解決ではなく、ルートの
`Cargo.toml` にある `[patch.crates-io]` から参照される。

## Patch purpose

秘密 Scalar から生成される一時値を `Zeroizing` で管理し、通常の return および unwind
経路で Drop 時の消去対象にする。upstream 4.1.3 との差分は次のとおり。

- `src/scalar.rs`
  - `as_radix_16` / `as_radix_2w` の radix 配列、carry、bit window、coefficient および
    Scalar の limb buffer を、zeroize feature 有効時に `Zeroizing` で保持する。
- `src/edwards.rs`
  - `mul_base` の signed-radix 表現を `Zeroizing` で保持する。

## Consumers

Core の `src/crypto.rs` は `EdwardsPoint::mul_base` を、通常の公開鍵生成と署名 nonce の
計算に使用する。したがって、この patch は通常の公開鍵生成・署名処理の依存経路に適用される。

署名応答の Scalar 算術、private key、nonce、challenge などの Core 側 temporary は、
この patch とは別に `src/crypto.rs` の `Zeroizing` または明示的な `zeroize` で管理する。

## Update procedure

依存バージョンを更新する場合は、次を満たすことを確認する。

1. 新しい upstream source とこのディレクトリを比較する。
2. `src/scalar.rs` と `src/edwards.rs` の zeroize 修正が維持されているか確認する。
3. 公開鍵、Symbol / NEM 署名、既存 fixture および全ワークスペース検証を実行する。
4. upstream に同等修正がある場合は、`DEC-CRYPTO-001` を更新して override 撤去を判断する。

このファイルは upstream の README や CHANGELOG を置き換えるものではなく、ローカル差分の
由来と保守条件を記録する。
