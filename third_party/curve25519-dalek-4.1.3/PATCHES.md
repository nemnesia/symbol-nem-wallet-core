# Local patches

このディレクトリは `curve25519-dalek` 4.1.3 の crates.io source を基にした、
このリポジトリ専用のローカル修正版である。通常の依存解決ではなく、ルートの
`Cargo.toml` にある `[patch.crates-io]` から参照される。

## Patch purpose

秘密 Scalar から生成される一時値を `Zeroizing` で管理し、通常の return および unwind
経路で Drop 時の消去対象にする。upstream 4.1.3 との差分は次のとおり。

- `src/scalar.rs`
  - `as_radix_16` / `as_radix_2w` の radix 配列、carry、bit window、coefficient および
    Scalar の limb buffer、conversion/reductionのunpacked scalarと積算bufferを、zeroize
    feature 有効時に `Zeroizing` で保持する。
- `src/edwards.rs`
  - `mul_base` の signed-radix 表現を `Zeroizing` で保持する。
- `src/backend/serial/u64/scalar.rs`
  - 52-bit backendのunpack words、wide reductionのlo/hi、積算用`[u128; 9]`および
    montgomery conversionのlimb bufferを`Zeroizing`で保持する。
- `src/backend/serial/u32/scalar.rs`
  - 29-bit backendのunpack words、wide reductionのlo/hi、積算用`[u64; 17]`および
    montgomery conversionのlimb bufferを`Zeroizing`で保持する。

## Provenance and verification

- Upstream package: `curve25519-dalek 4.1.3`
- Original registry source commit: `5312a0311ec40df95be953eacfa8a11b9a34bc54`
- crates.io archive SHA-256: `97fb8b7c4503de7d6ae7b42ab72a5a59857b4c937ec27a3d4539dba95b5ab2be`
- Allowed local source files: `src/scalar.rs`, `src/edwards.rs`,
  `src/backend/serial/u64/scalar.rs`, `src/backend/serial/u32/scalar.rs`

| file | local SHA-256 |
| --- | --- |
| `src/scalar.rs` | `836e89c542f95e5e0931f18debdf6e217d80b1d18783983e2b93f317c7270654` |
| `src/edwards.rs` | `71bf64f0277aaab7752d9231e985ef885f1ef4d6de2bd9a1f2790f60228763ba1` |
| `src/backend/serial/u64/scalar.rs` | `c0cf6bddb1a178b651e4717fe59516722f732d156728ed1f9eb325b99b6dd536` |
| `src/backend/serial/u32/scalar.rs` | `7d430478563e4da3afab4f6b655c64094c8f9ad0888658630458ae987bf95a9f` |

変更対象ファイルのlocal SHA-256は `scripts/check-curve25519-dalek-patch.sh` の期待値と
このファイルで追跡する。許可対象以外のsource fileは、固定したupstream archiveと一致
しなければ検証に失敗する。

## Consumers

Core の `src/crypto.rs` は `EdwardsPoint::mul_base` を、通常の公開鍵生成と署名 nonce の
計算に使用する。したがって、この patch は通常の公開鍵生成・署名処理の依存経路に適用される。

署名応答の Scalar 算術、private key、nonce、challenge などの Core 側 temporary は、
この patch とは別に `src/crypto.rs` の `Zeroizing` または明示的な `zeroize` で管理する。

## Update procedure

依存バージョンを更新する場合は、次を満たすことを確認する。

1. 新しい upstream source とこのディレクトリを比較する。
2. `bash scripts/check-curve25519-dalek-patch.sh` を実行し、archive checksum、変更許可
   ファイルおよびlocal hashを確認する。
3. `src/scalar.rs`、`src/edwards.rs`および両serial backendのzeroize修正が維持されて
   いるか確認する。
4. 公開鍵、Symbol / NEM 署名、既存 fixture および全ワークスペース検証を実行する。
5. upstream に同等修正がある場合は、互換性と仕様書 §12.1 の適用範囲を確認して
   override 撤去の可否を判断する。

このファイルは upstream の README や CHANGELOG を置き換えるものではなく、ローカル差分の
由来と保守条件を記録する。
