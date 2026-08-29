---
name: implement-review
description: >-
  symbol-nem-wallet-core の Rust 実装、Native C ABI、WASM binding、
  テスト、fixture、差分を、仕様適合、security、Symbol / NEM
  相互運用性、所有権、異常系、テスト品質の観点でレビューする。
  コードは修正しない。
---

# Implementation Review Board

承認済み仕様、要件、設計および既存の安全性境界を実装が満たしているかを判定する。レビュー中にコード、仕様、テスト、fixture、README、設定を修正しない。設計の好みや仕様外の機能追加を指摘へ変換しない。

レビューは、仕様に存在しない新しい製品要求、任意の hardening、将来機能、API、policy を発明しない。ただし、既存の security invariant、asset protection、trust boundary、秘密情報の機密性・完全性、memory safety、cryptographic primitive の安全条件、言語・FFI 境界の安全性を破る具体的な defect は、仕様に個別の防御策が列挙されていなくても指摘する。これは新しい防御要求ではなく、既存の安全性を破る実装欠陥の確認である。

## 作業開始時に読む資料

1. `AGENTS.md`
2. `../review-common/review-playbook.md`
3. `reviewers.md`、`review-gates.md`、`output-format.md`、`security-checklist.md`
4. 対象の差分、`src/`、`bindings/native/`、テスト、fixture、`Cargo.toml` / `Cargo.lock`
5. 対応する `docs/specifications/`、`docs/requirements/`、`docs/design/`
6. 必要な `docs/knowledge/`、公式 protocol / schema / SDK 資料

## 対象と成果物

- ユーザーが明示した crate、binding、ファイル、機能、差分、commitだけを対象にする。
- 対象が曖昧なら範囲を推測で広げず、対象確認で終了する。
- 変更範囲、直接の依存、対応仕様・要件・設計、関連テストを確定する。
- 成果物は `docs/reviews/implementation/<ベース名>-review-NNN.md` に新規作成する。既存成果物、固定名、`implement-spec-feedback.md` を移動・削除・上書きしない。正式 ID は IR 接頭辞で連番にする。

## 根拠の範囲

差分、実装、テスト、fixture、承認済み仕様、要件、`docs/design/`、必要な公式資料を照合する。既存コードやテストがそうなっていることだけを、仕様や protocol の根拠にしない。

未確認の external node、network、registry、長時間テスト、WASM runtime、C compiler は成功扱いにしない。秘密情報、復号データ、credential を成果物や出力へ含めない。

## レビュー観点

- 承認済み仕様・要件・設計への適合と外部可視動作
- 入力検証、validation、error、warning、atomicity、replacement Store、failure path
- `security-checklist.md` に基づく、対象変更に適用可能な secret lifecycle、zeroization、暗号、乱数、署名、parser、Native C ABI、WASM、`unsafe`、依存、テストの確認
- 秘密情報のログ・panic・error・warning・不要なコピーへの漏えい、memory safety、具体的な side-channel、cryptographic misuse
- 暗号、KDF、AEAD、AAD、nonce、salt、zeroize、署名対象、canonical bytes、serialization、および custom cryptographic arithmetic
- Symbol / NEM、Mainnet / Testnet、SDK と protocol、address / key / signature の表現
- Rust の ownership、borrow、panic、依存、公開互換性、Native C ABI の buffer / free、WASM の型境界
- 正常、malformed、boundary、wrong password / chain / network、truncated、duplicate、tamper、unknown version、deterministic、interop のテスト

仕様にない API、設定、error、fallback、互換動作、将来拡張、一般論だけの防御、任意の hardening は指摘しない。一方、private key の漏えい、unsafe な secret lifetime、誤った zeroization、nonce reuse、RNG failure、AEAD 認証結果の無視、誤った signing bytes、FFI の use-after-free / double-free、WASM への不要な secret 露出、`unsafe` による memory unsafety、攻撃者入力による panic / UB / resource exhaustion、Symbol / NEM または Mainnet / Testnet の混同による誤署名など、既存の security property を具体的に破る defect は指摘する。仕様が曖昧で正否を決められない場合は、実装欠陥と specification ambiguity / feedback を分離する。

## 実行と検証

`review-common/review-playbook.md` の Phase 0〜3 を適用する。Reviewer A〜D を別パスで確認し、各候補を根拠・影響・完了条件で反証してからゲートを適用する。Security Reviewer は変更から attack surface と secret path を先に特定し、`security-checklist.md` の該当項目だけを適用する。Protocol Reviewer と Test Reviewer は canonical bytes、chain / network、negative / fuzz / differential test などで Security Reviewer と重なる確認を行ってよい。サブエージェントを使った場合だけ実際の識別子と完了状態を監査情報へ記録し、使わない場合は自己レビューの4パスを記録する。

レビュー成果物の `Domain Checks` には、適用した security checklist 項目、主要な適用外項目とその理由、未確認範囲を記録する。Checklist は機械的なチェックボックスや新しい製品要求の一覧として出力しない。

必要な非破壊検証は、ルート `AGENTS.md` と対象の実際の script に従う。Rust実装の変更では、対象に応じて次を候補とする。

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
cargo check --target wasm32-unknown-unknown --features wasm
```

Native C ABI の変更時は `bindings/native/tests/run_c_abi_runtime.sh`、header compile、必要な sanitizer を確認する。WASMの生成・実行や外部環境の検証は、実行した場合だけ記録する。

## 判定

判定は `READY` または `REVISE IMPLEMENTATION` とする。`CRITICAL` または `HIGH` の New / Open / Reopened finding が1件以上存在する場合は Required Change として `REVISE IMPLEMENTATION` とする。`MEDIUM` / `LOW` のみの場合は Optional Improvement / non-blocking finding として `READY` とできる。重大度は、実際の発生条件、影響、到達可能性、既存境界を根拠に判定し、単に暗号コードであることだけを理由に `CRITICAL` としない。coverage の任意の数値目標で不合格にしない。

## 作業完了後の Git 運用

`../review-common/review-playbook.md` の「成果物と Git」を適用する。
