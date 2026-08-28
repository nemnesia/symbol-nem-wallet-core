---
name: release-readiness-review
description: symbol-nem-wallet-core の公開対象 Rust crate、Native binding、WASM生成物を、README、Cargo manifest、SemVer、依存関係、配布物、検証、securityの観点で公開前に確認する。publish、tag、source codeの変更は行わない。
---

# Release Readiness Review

公開対象の Rust crate、Native C ABI、または WASM 配布物が、現在の実装と公開契約を正しく説明し、安全に配布できるかを判定する。公開操作、tag、remote、source code の変更は行わない。

## 作業開始時に読む資料

1. `AGENTS.md`
2. `../review-common/review-playbook.md`
3. `reviewers.md`、`review-gates.md`、`output-format.md`
4. 対象の `Cargo.toml` / `Cargo.lock`、README、LICENSE、変更差分
5. `src/`、`bindings/native/`、`pkg/`、build script、公開 header / WASM定義
6. `docs/specifications/`、`docs/design/`、必要なレビューと検証記録

## 対象の確定

- ユーザーが crate、binding、生成物、パス、version、対象差分を指定した場合は、その公開対象だけを確認する。
- 未指定で候補が複数ある場合は自動選択しない。root crate、`bindings/native`、WASM生成物は別の公開対象として扱う。
- 対象確定前に package、publish、tag、registry、配布物の変更を行わない。
- root crate の `Cargo.toml` に publish metadata や配布手順がない場合も、未設定を事実として記録し、勝手に補わない。

## 確認範囲

対象確定後、次を必要な範囲で確認する。

1. manifest、version、license、repository、description、workspace依存、features
2. README、LICENSE、関連仕様、公開 header、WASM生成手順
3. git差分、未追跡、conflict、直近tag、変更範囲
4. crate package の含有ファイル、Native artifact、WASM `pkg/` の生成物と不要ファイル
5. 公開 API、ABI、型、Wallet Store / Pending Profile、error、ownership、互換性
6. `cargo fmt`、`clippy`、`test`、WASM check、Native C ABI runtimeなどの実行可否と実結果

`Cargo.toml`、`Cargo.lock`、README、LICENSE、`CHANGELOG.md` の存在は実際に確認する。存在しない CHANGELOG や npm metadata を前提にしない。

## 確認項目

- crate name、version、workspace member、license、公開対象、依存関係、features、MSRV等の明示有無
- Rust API、Native C ABI、WASM export、header、型定義、buffer ownership、free API の公開契約
- README の install、build、利用例、対応範囲、Symbol / NEM、Mainnet / Testnet、security注意との一致
- Wallet Store / Pending Profile、秘密情報 export、署名、opaque byte 列の保証範囲と過剰記載
- `cargo package --list` または対象に応じた dry-run が示す配布内容、秘密情報・fixture・不要生成物の混入
- workspace path dependency、lockfile、native / wasm target、生成 CLI の再現可能性
- 仕様・実装・テスト・fixture・公開成果物の version と互換性
- 実行済み検証と未実行検証、外部 node / registry / target / C compiler に依存する範囲

## SemVer

公開 Rust API、C ABI、WASM export、Wallet Store wire format、error契約、既定動作の破壊は major、後方互換の機能追加は minor、bug fix・内部実装・文書・testだけは patch を候補とする。現在の 0.x 方針、prerelease、tag、公開手順に明示された規則があれば優先する。根拠が曖昧な場合は version を変更せず、未決定として記録する。

## 変更境界と判定

レビューのみを既定とし、README、Cargo manifest、source、test、fixture、lockfile、生成物、tag、remote、registryを変更しない。ユーザーが修正も明示した場合でも、公開前レビューの範囲を越える source / test 修正は別作業として分離する。

判定は `READY`、`READY WITH MINOR FIXES`、`NOT READY`、`TARGET CONFIRMATION REQUIRED` とする。公開阻害事項があれば `NOT READY`、軽微な改善だけなら `READY WITH MINOR FIXES`、対象不明なら `TARGET CONFIRMATION REQUIRED` とする。

## 作業完了後の Git 運用

`../review-common/review-playbook.md` の「成果物と Git」を適用する。
