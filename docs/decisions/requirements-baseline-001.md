# Requirements Baseline Decision 001

- Decision ID: `DEC-REQ-001`
- Status: Approved
- Approved date: 2026-08-17
- Target: `docs/requirements/requirements.md`
- Approved baseline commit: `99fa54bb4bd64ca4ae9ecb7452f91c679a4c5fba`
- Approved baseline blob: `930d22b30bb1b48126895dd7bdbaedc9bfcb601f`
- Related review finding: `RR-005`

## Decision

`docs/requirements/requirements.md` の上記ベースラインに記載された、Profile、Network、Chain、Mnemonic、Software Key、Profileパスワード、署名、削除、Bindingおよび責任境界に関する確定事項を、symbol-nem-wallet-core v1 の承認済み要件ベースラインとして扱う。

要件本文の根拠欄で「ユーザー確定事項 §…」または「要件定義更新依頼」と表記されている事項は、この承認済みベースラインに取り込まれた決定として追跡する。個々の表記は当初の決定経緯を示すために残してよいが、承認状態の確認先は本記録とする。

## Exclusions

次は本決定によって確定したものとは扱わない。

- `OPEN-001`: v1で対象とするSymbol / NEMのプロトコル版、互換性基準、基準時点および承認済み参照資料
- `OPEN-002`: v1のProfileパスワードに求める最低限の安全性基準および推測攻撃への耐性の受け入れ目標
- 要件定義が明示的に仕様設計へ引き継いでいるAPI、データ形式、暗号方式、KDF、保存形式、Binding実装方式、WASM / JavaScript間の具体的な受渡し・メモリ管理・消去方式

これらは別途決定または仕様設計で確定する。

## Approval and traceability

本記録を `main` に保持することを、上記要件ベースラインのリポジトリ内承認記録とする。第三者は、対象ファイル、対象commit、blob SHAおよびGit履歴から、どの要件状態が承認対象であったかを特定できる。

承認済みベースラインを変更する場合は、変更後の要件を通常のGit履歴で記録し、必要に応じて本決定記録を改訂するか、新しいDecision IDで承認ベースラインを追加する。過去の承認対象を追跡不能にする履歴の消去は行わない。

## RR-005 resolution

RR-005で指摘された「ユーザー確定事項の出所は説明されているが、第三者が確認できる承認済み決定記録へ追跡できない」という問題に対し、本記録を承認先として追加する。

`docs/requirements/requirements.md` は、本記録を参照して「ユーザー確定事項」および「要件定義更新依頼」に由来する確定事項の承認状態を追跡する。