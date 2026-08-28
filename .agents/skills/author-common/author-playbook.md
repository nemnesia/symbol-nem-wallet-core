# Author Playbook

作成系 Skill 共通の規則。各 Skill は、この文書に加えて対象文書種別の責務と出力形式を適用する。

## このリポジトリの前提

- リポジトリ名は `symbol-nem-wallet-core`。Rust の Wallet Core、`bindings/native` の Native C ABI、`wasm-bindgen` による WASM binding を含む。
- 作業指針はリポジトリルートの `AGENTS.md` を読む。`AGENTS.md` は作業方法の根拠であり、Symbol / NEM の技術仕様の正本ではない。
- コンセプトは `docs/consept/`、要件は `docs/requirements/`、設計・設計判断は `docs/design/`、仕様は `docs/specifications/`、技術資料は `docs/knowledge/` に置く。`consept` は既存ディレクトリ名なので変更しない。移行前の `docs/decisions/` は既存判断の参照先であり、新規の正本は `docs/design/` に統合する。
- コード、テスト、fixture はそれぞれ `src/`、`bindings/native/`、`tests/`、`fuzz/` 等を確認する。`pkg/` の生成物は実装の正本ではない。

## 作成の目的

成果物は、確認済みの事実・要求・判断を次工程が使える形へ整理する。入力にない機能、責任、制約、数値、方式、将来構想を網羅性のために発明しない。

文書種別を混同しない。

- concept: なぜ作るか、誰の課題か、どんな価値か、どこまで扱うか
- requirements: 何を満たす必要があるか、制約、責任、受け入れ条件
- design: どの責務・境界・依存方向で構成するか
- specification: 外部から観測できる具体的な契約、データ、validation、error、security
- implementation: 承認済み仕様をコードとテストへ反映する
- README: 現在利用できる crate、binding、生成物の使い方

上流文書の不足を下流の形式へ無断変換したり、下流の不足を上流文書へ逆流させたりしない。

## 対象と変更境界

1. ユーザーが明示した対象、出力先、更新範囲を最優先する。
2. 未指定時は各 Skill の候補探索規則で対象を一意に決定する。候補が複数または0件なら推測しない。
3. 既存ファイルは、明示的な更新依頼がある場合だけ更新する。更新時も依頼範囲外の改名・再構成を行わない。
4. 成果物の種類を増やさない。レビュー、要件、仕様、設計、コード、テストを同時に作らない。
5. 既存のユーザー変更、固定名の成果物、連番成果物を移動・削除・上書きしない。

## 根拠

根拠の優先順位は、ユーザー依頼、承認済み上流文書、適用可能な設計判断、対象文書、公式仕様・schema・SDK、既存実装・テストの順とする。

`docs/knowledge/` は対象機能に関係する資料だけを読む。既存コード・テスト・SDKの挙動は現状や実現可能性の確認には使えるが、このプロジェクトの要求や Symbol / NEM protocol の正本にはしない。

資料間の競合は、chain、network、version、資料の役割、更新時点、影響とともに未決定事項として残す。解消できない競合を実装・仕様・設計上の都合で採用しない。

## 共通の境界

- Symbol と NEM、Mainnet と Testnet、Core と binding、SDK と protocol を暗黙に共通化しない。
- Native C ABI と WASM の境界契約、所有権、buffer、error code は `docs/design/` の該当設計と仕様書を確認する。移行前の `docs/decisions/` にしかない判断は、移行済みとみなさず参照資料として扱う。
- Wallet Store と Pending Profile は opaque byte 列として扱い、仕様がない限り内容を推測・編集しない。
- Mnemonic、秘密鍵、Profile password、復号済み payload、credential を成果物、例、ログ、エラー、テスト出力に含めない。
- 暗号、署名 byte 列、KDF、AEAD、salt、nonce、数量、canonical serialization を根拠なしに変更・補完しない。

## 作成手順

1. 対象文書、上流資料、既存成果物、適用する `docs/design/` と移行前資料を確定する。
2. 入力を事実、要求、制約、仮定、未決定、将来構想へ分類する。
3. 対象文書種別の責務に該当する情報だけを採用する。
4. 各採用内容を出典または上流項目へ追跡できるようにする。
5. 後工程で決められる内容は方式を発明せず、引継ぎまたは未決定事項へ置く。
6. 本文、図表、例、用語、リンクの内部整合性を確認する。
7. 指定された成果物だけを作成・更新し、自己確認と必要な形式確認を行う。

## 整形と検証

- Markdown は、このリポジトリに formatter が設定されている場合だけ、その設定と対象パスに従う。存在しない `pnpm` や npm script を前提にしない。
- Rust 実装を変更する作業では、ルート `AGENTS.md` の formatter / lint / test / WASM check を適用する。文書作成だけでコード全体の検証を実行したことにしない。
- 実行していない検証、確認できない外部環境、未解決の仕様を成功として記録しない。

## 完了と Git

- 成果物が対象文書種別の責務に収まり、根拠へ追跡できる。
- 対象外の機能、方式、API、実装、将来構想を混入させていない。
- 未決定事項と下流への引継ぎを、事実や決定済み事項と分けている。
- `git status` と差分を確認し、無関係な変更を含めない。
- ユーザーが明示的に依頼しない限り、commit、push、tag、publish、remote変更を行わない。
