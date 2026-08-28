---
name: design-author
description: symbol-nem-wallet-core の承認済み要件・仕様・既存判断を、責務境界、コンポーネント、依存方向、trust boundary、主要フロー、データ所有、運用前提、検証方針を含む基本設計へ整理する。設計判断は docs/design に統合し、API・wire format・暗号パラメータ・実装コードは必要以上に決めない。
---

# Design Author

承認済み要件を実装へつなぐ基本設計を `docs/design/` に作成・更新する。基本設計は「どの責務を、どの境界で、どの依存方向に配置するか」と、その判断理由・代替案を定める。要件、外部仕様、詳細実装を混同しない。

## 作業開始時に読む資料

1. `AGENTS.md`
2. `../author-common/author-playbook.md`
3. 対象機能の `docs/consept/` と `docs/requirements/`
4. 対象の `docs/specifications/`
5. `docs/design/` の既存設計・判断
6. 移行前の `docs/decisions/`（既存判断の確認が必要な場合のみ）
7. 必要なコード、テスト、fixture、公式資料
8. `output-format.md`

`docs/design/` は設計と設計判断を統合する新しい正本である。既存の `docs/decisions/` は移行前の資料なので、新規の設計判断をそこへ作成しない。両者に競合がある場合は、根拠と影響を本文の未決定事項へ残し、黙って統合しない。

## 対象と出力

- ユーザーが対象パス、機能、出力先を指定した場合はそれを優先する。
- 指定がなければ、対象を一意に確定したうえで `docs/design/<topic>.md` に新規作成する。
- `docs/design/` に既存候補が複数ある場合は自動選択せず、対象確認で終了する。既存設計書の更新は明示的な更新依頼がある場合だけ行う。
- 成果物は基本設計書だけとし、要件、仕様、レビュー、コード、テストを同時に作成・更新しない。
- `docs/decisions/` の既存資料を削除・移動することは、この Skill の通常範囲に含めない。移行依頼が別途ある場合だけ対象とする。

## 設計する内容

対象に必要な範囲で、次を設計として整理する。

- 目的、対象、対象外、設計上の前提、用語
- システムコンテキスト、外部主体、trust boundary、秘密情報の境界
- Rust Core、Native C ABI、WASM binding、上位 Application の責務と依存方向
- 状態・データの所有、保持、更新、破棄、opaque byte 列の境界
- Profile、Mnemonic、Software Key、Wallet Store、Pending Profile の lifecycle
- 主要フロー、認証、atomicity、失敗時の責任、安全側の終了、再試行・再起動
- Symbol / NEM、Mainnet / Testnet と、SDK / protocol の責任分離
- 可用性、resource、運用前提、検証境界、テスト戦略、traceability
- 採用した設計判断、代替案、判断理由、残る未決定事項、仕様への引継ぎ

図表は責務、依存、信頼境界、主要フローを明確にする場合だけ使う。図に API field、wire format、暗号パラメータを新規に追加しない。

## 設計しない内容

上位資料で既に確定していない限り、次を基本設計で新規に固定しない。

- 公開 API の method、parameter、response、error code、ABI、WASM export
- JSON / CBOR / backup の field、schema、version、serialization の詳細
- 暗号方式、KDF、鍵長、nonce、salt、tag、署名対象 byte 列
- Symbol / NEM の protocol constant、address規則、transaction byte layout
- Rust の具体的な関数、module、crate、database、UI の実装詳細
- 個別の unit test case、fixture の秘密値、CIの細かなコマンド

これらが設計の成立条件なら、方式を推測せず仕様または未決定事項へ引き渡す。ただし責務、依存方向、trust boundary、lifecycle の判断は設計で明確にする。

## 根拠と判断

根拠の優先順位は、ユーザー依頼、承認済み要件、承認済み仕様、既存 `docs/design/` の判断、移行前資料、公式資料、実装・テストの順とする。既存コードやSDK APIの存在だけで設計を正当化しない。

複数の合理的な選択肢から判断する場合は、選択肢、採用理由、棄却理由、影響、見直し条件を記録する。要件や仕様を設計上の都合で変更しない。資料間の競合や重要な未決定事項は、対象・影響・判断時期とともに残す。

秘密情報を設計例、図、ログ、エラー、fixtureへ含めない。Core と binding の境界を弱めず、bindingへ鍵管理・暗号・導出・署名意味判断を移さない。

## 作成手順と自己確認

1. 対象、出力先、上流根拠、既存設計、移行前資料を確定する。
2. 要件・仕様から責務、外部主体、境界、依存、lifecycle、失敗条件を抽出する。
3. 候補となる設計判断を比較し、必要な判断だけを `docs/design/` に記録する。
4. コンポーネント、データ所有、主要フロー、検証境界を記述する。
5. 仕様で決める事項と未決定事項を下流へ引き渡す。
6. output-format.md の構成で、上流追跡、責務境界、trust boundary、失敗時の責任、chain / network差異を確認する。
7. 設計書だけを作成・更新し、未確認範囲を明示する。

自己確認では、Rust Core / Native / WASM の境界、Symbol / NEM、Mainnet / Testnet、秘密情報の所有・保持・破棄、設計判断と仕様の分離、既存資料との競合を重点的に確認する。

## 作業完了後の Git 運用

`../author-common/author-playbook.md` の「完了と Git」を適用する。
