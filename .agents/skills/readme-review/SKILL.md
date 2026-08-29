---
name: readme-review
description: symbol-nem-wallet-core の README を Cargo manifest、Rust / Native C ABI / WASM の公開 API、実装、仕様、テストと照合し、正確性、利用可能性、情報不足、過剰記載、重要な制約、整合性をレビューする。コードや仕様は変更しない。
---

# README Review

READMEを利用者向け文書としてレビューし、インストールから最初の利用まで進められ、記載内容を現在の実装が裏付けているかを判定する。作業開始時に次の順で全文を読む。

1. `AGENTS.md`
2. ../review-common/review-playbook.md
3. reviewers.md
4. review-gates.md
5. output-format.md

## 対象と成果物

- ユーザーがREADMEのパスを指定した場合は、その1件を対象にする。
- crate、binding、機能が指定されREADMEのパスがない場合は直接対応するREADMEを探す。候補が0件または複数件なら推測で選ばず、対象確認で終了する。
- 未指定の場合はルート `README.md` を対象にする。
- 成果物は `docs/reviews/readme/<READMEベース名>-review-NNN.md` に新規作成し、既存ファイルを上書きしない。正式 ID は RM 接頭辞でベース名ごとに連番にする。

## 確認する事実源

README全体を読んだ後、`Cargo.toml` / `Cargo.lock`、workspace、Rust公開API、Native header、WASM定義、主要実装、仕様、license、テスト、サンプル、build scriptを必要な範囲で照合する。確認できない環境や未実行サンプルは成功扱いにしない。

READMEの誤りを直接生じさせないAPI設計、製品仕様、実装品質、性能、coverage、将来機能はレビュー対象外とする。

## レビュー観点

- インストール、package名、import、API、引数、戻り値、必要設定、対応環境
- 利用者が最初の実行まで辿れる手順と最小例
- 実装済み機能、未実装・将来機能、capability、Mainnet / Testnet、Symbol / NEMの表現
- Wallet Store、署名、秘密情報、announce非対応など重要な制約の欠落・過剰保証
- Cargo manifest、公開API、仕様、コード、テスト、リンク、licenseとの整合
- 利用者向けの順序、用語、見出し、コード例の読みやすさ

## 実行と判定

`../review-common/review-playbook.md` の Phase 0〜3 を適用する。Reviewer A〜C の独立パスで、事実/API、利用開始、制約/過剰記載を確認し、指摘を反証してからゲートを適用する。README、コード、manifest、仕様、設定をレビュー中に変更しない。

判定は READY、READY WITH MINOR FIXES、REVISE README とする。ERROR または WARN があれば REVISE README、NITだけなら READY WITH MINOR FIXES、指摘なしなら READY とする。

## 作業完了後の Git 運用

`../review-common/review-playbook.md` の「成果物と Git」を適用する。
