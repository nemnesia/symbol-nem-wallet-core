---
name: implement-review
description: symbol-nem-wallet-core の Rust 実装、Native C ABI、WASM binding、テスト、fixture、差分を、仕様適合、security、Symbol / NEM 相互運用性、所有権、異常系、テスト品質の観点でレビューする。コードは修正しない。
---

# Implementation Review Board

承認済み仕様を実装が満たしているかを判定する。レビュー中にコード、仕様、テスト、fixture、README、設定を修正しない。設計の好みや仕様外の機能追加を指摘へ変換しない。

## 作業開始時に読む資料

1. `AGENTS.md`
2. `../review-common/review-playbook.md`
3. `reviewers.md`、`review-gates.md`、`output-format.md`
4. 対象の差分、`src/`、`bindings/native/`、テスト、fixture、`Cargo.toml` / `Cargo.lock`
5. 対応する `docs/specifications/`、`docs/requirements/`、`docs/design/`、移行前の `docs/decisions/`
6. 必要な `docs/knowledge/`、公式 protocol / schema / SDK 資料

## 対象と成果物

- ユーザーが明示した crate、binding、ファイル、機能、差分、commitだけを対象にする。
- 対象が曖昧なら範囲を推測で広げず、対象確認で終了する。
- 変更範囲、直接の依存、対応仕様・要件・設計、関連テストを確定する。
- 成果物は `docs/reviews/implementation/<ベース名>-review-NNN.md` に新規作成する。既存成果物、固定名、`implement-spec-feedback.md` を移動・削除・上書きしない。正式 ID は IR 接頭辞で連番にする。

## 根拠の範囲

差分、実装、テスト、fixture、承認済み仕様、要件、`docs/design/`、必要な公式資料を照合する。移行前の `docs/decisions/` は既存判断の確認に限って使う。既存コードやテストがそうなっていることだけを、仕様や protocol の根拠にしない。

未確認の external node、network、registry、長時間テスト、WASM runtime、C compiler は成功扱いにしない。秘密情報、復号データ、credential を成果物や出力へ含めない。

## レビュー観点

- 承認済み仕様・要件・設計への適合と外部可視動作
- 入力検証、validation、error、warning、atomicity、replacement Store、failure path
- 秘密情報のログ・panic・error・warning・不要なコピーへの漏えい
- 暗号、KDF、AEAD、AAD、nonce、salt、zeroize、署名対象、canonical bytes、serialization
- Symbol / NEM、Mainnet / Testnet、SDK と protocol、address / key / signature の表現
- Rust の ownership、borrow、panic、依存、公開互換性、Native C ABI の buffer / free、WASM の型境界
- 正常、malformed、boundary、wrong password / chain / network、truncated、duplicate、tamper、unknown version、deterministic、interop のテスト

仕様にない API、設定、error、fallback、互換動作、将来拡張、一般論だけの防御は指摘しない。仕様が曖昧な場合は実装欠陥と仕様未決定を分離する。

## 実行と検証

`review-common/review-playbook.md` の Phase 0〜3 を適用する。Reviewer A〜D を別パスで確認し、各候補を根拠・影響・完了条件で反証してからゲートを適用する。サブエージェントを使った場合だけ実際の識別子と完了状態を監査情報へ記録し、使わない場合は自己レビューの4パスを記録する。

必要な非破壊検証は、ルート `AGENTS.md` と対象の実際の script に従う。Rust実装の変更では、対象に応じて次を候補とする。

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
cargo check --target wasm32-unknown-unknown --features wasm
```

Native C ABI の変更時は `bindings/native/tests/run_c_abi_runtime.sh`、header compile、必要な sanitizer を確認する。WASMの生成・実行や外部環境の検証は、実行した場合だけ記録する。

## 判定

判定は `READY` または `REVISE IMPLEMENTATION` とする。`CRITICAL` が品質ゲートを不合格にする場合だけ後者とし、`HIGH` 以下は影響と優先度を記録する。coverage の任意の数値目標で不合格にしない。

## 作業完了後の Git 運用

`../review-common/review-playbook.md` の「成果物と Git」を適用する。
