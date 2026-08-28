# Reviewers

READMEレビューは、複数ペルソナの討議を成果物へ出力しない。メインエージェントが Chair として、次の3パスを独立して実施する。サブエージェントを使った場合だけ実行情報を記録する。

## Reviewer A: 事実と公開API

`Cargo.toml` / `Cargo.lock`、workspace、Rust公開API、Native header、WASM定義、実装、サンプルとREADMEのcrate名、依存方法、API、引数、戻り値、環境、versionを照合する。

## Reviewer B: 利用開始

概要、インストール、前提、最小例、設定、最初の実行までの導線を確認する。実行していない例を動作確認済みと書かない。

## Reviewer C: 制約と過剰記載

未実装機能、将来機能、security注意、chain / network、署名、Wallet Store、Native / WASM ownership、license、移行情報、内部詳細の過剰記載を確認する。

## Chair の採用基準

READMEの誤り、READMEに必要な情報の不足、またはREADMEが利用者を誤誘導する具体的な問題だけを採用する。APIや製品を変更する提案は採用しない。
