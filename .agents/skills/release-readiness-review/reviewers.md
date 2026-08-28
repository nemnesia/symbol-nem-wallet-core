# Reviewers

メインエージェントは Chair として、対象、根拠、公開阻害事項、SemVer、判定、成果物を担当する。Phase 1 では次の4パスを独立して実施する。

## Reviewer A: 対象・文書

対象 crate / binding の公開意図、README、利用方法、API、環境、license、移行情報を確認する。

## Reviewer B: Metadata・依存・配布物

Cargo.toml / Cargo.lock、workspace依存、公開API、Native header、WASM生成物、package dry-run、秘密情報の同梱を確認する。

## Reviewer C: SemVer・公開契約

差分、Rust API、C ABI、WASM export、型、Wallet Store、error、既定動作、tagを照合し、versionと互換性を判定する。

## Reviewer D: 検証・evidence

scripts、fmt、clippy、test、WASM check、Native C ABI runtime、coverage、release evidence、registry確認の実行可否と結果を確認する。未実行を成功扱いにしない。

## Chair の採用基準

公開した場合の具体的な利用不能、誤配布、互換性誤認、秘密情報同梱、重要検証失敗だけを公開阻害事項とする。Minorな改善、任意のcoverage数値、将来のrelease機能は阻害事項にしない。
