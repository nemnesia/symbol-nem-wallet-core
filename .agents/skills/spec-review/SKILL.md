---
name: spec-review
description: symbol-nem-wallet-core の仕様書を、要求適合、API・データ契約、validation、error、状態、security、相互運用性、検証可能性の観点でレビューし、実装へ進める品質を判定する。
---

# Specification Review Board

仕様書を設計・実装・書き直すのではなく、実装者が推測せずに安全に実装・検証できる品質かを判定する。作業開始時に次の順で全文を読む。

1. `AGENTS.md`
2. ../review-common/review-playbook.md
3. reviewers.md
4. review-gates.md
5. output-format.md

## 対象と上流資料

- ユーザーが明示した仕様書1件を優先する。
- 未指定なら `docs/specifications/` の候補から `specification.md`、`spec.md`、ファイル名に `spec` または `specification` を含む Markdown の順で探す。
- reviews、コンセプト、要件、設計資料、実装コードは候補から除外する。
- 候補が0件または複数件なら推測で選ばず、対象確認で終了する。
- 対応するコンセプト、要件定義、`docs/design/` の設計が一意にある場合は本文を確認し、対応する最新レビューがあれば公開された判定と状態だけを確認する。候補が複数なら自動選択しない。
- 実装者からの仕様フィードバックが対象ルートの docs/reviews/implementation/implement-spec-feedback.md にある場合、またはユーザーが明示した場合だけ補助資料として確認する。

成果物は `docs/reviews/specifications/<ベース名>-review-NNN.md` に新規作成する。既存ファイルを移動、削除、上書きしない。

## 根拠の範囲

仕様本文、承認済み要件、コンセプト、`docs/design/` の設計、前段レビュー、ユーザー提供資料、必要な公式プロトコル資料を根拠とする。既存実装やテストは仕様適合の補助的な事実として扱い、実装がそうなっていることだけで仕様を正当化しない。

## レビュー観点

- 要求、プロジェクト範囲、設計、上流文書との追跡と矛盾
- 用語、対象、対象外、依存、前提、責任境界
- 入力、出力、API、データ形式、validation、error、状態、順序、determinism
- 実装者が推測せずに実装・検証できる十分な外部契約
- 秘密情報、認証、完全性、改ざん、replay、署名対象、暗号文境界
- Symbol / NEM、Mainnet / Testnet、SDK とプロトコル、Core と binding、opaque byte 列の区別
- 受け入れ条件、境界条件、失敗条件、未決定事項

既存要求にない機能、API、field、fallback、互換性、抽象化、将来拡張を追加するよう求めない。方式未決定と仕様欠落を区別する。

## 実行と判定

review-playbook.md の Phase 0〜3 を適用する。Reviewer A、B、C を独立した観点で確認し、候補を反証してからゲートを適用する。

判定は READY または REVISE SPECIFICATION とする。Critical が品質ゲートを阻害する場合だけ後者とし、Major / Minor は実装前の確認事項または後工程へ整理する。

レビュー中に仕様、要件、コード、テスト、fixture、READMEを変更しない。未確認範囲と未決定事項を成功扱いにしない。

## 作業完了後の Git 運用

`../review-common/review-playbook.md` の「成果物と Git」を適用する。
