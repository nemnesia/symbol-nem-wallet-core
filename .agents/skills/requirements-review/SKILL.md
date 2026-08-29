---
name: requirements-review
description: symbol-nem-wallet-core の要件定義を、根拠追跡、範囲、責任、外部可視性、検証可能性、セキュリティ、相互運用性、未決定事項の観点でレビューし、仕様設計へ進める品質を判定する。
---

# Requirements Review Board

要件定義書を設計・実装・書き直すのではなく、仕様設計を安全に開始できる品質かを判定する。作業開始時に次の順で全文を読む。

1. `AGENTS.md`
2. ../review-common/review-playbook.md
3. `AGENTS.md` に対象フェーズの Phase Context が登録されている場合だけ、その Context
4. reviewers.md
5. review-gates.md
6. output-format.md

## 対象と上流資料

- ユーザーが明示した要件定義書1件を優先する。
- 未指定なら `docs/requirements/` の候補から `requirements.md`、`requirement.md`、ファイル名に `requirements` または `requirement` を含む Markdown の順で探す。
- reviews、コンセプト、仕様、設計、実装、過去レビュー成果物は候補から除外する。
- 候補が0件または複数件なら推測で選ばず、対象確認で終了する。
- 対象を特定したら、対応するコンセプトシートが一意にある場合だけ本文を確認する。対応する最新のコンセプトレビューがあれば、公開された判定と状態を確認する。
- コンセプト候補が複数、または対象パッケージが不明な場合は自動選択しない。候補がない場合は未確認としてレビューを続ける。

成果物は `docs/reviews/requirements/<ベース名>-review-NNN.md` に新規作成する。対象ベース名ごとに最大番号の次を使い、既存ファイルを上書きしない。

## 根拠の範囲

要件本文、対応するコンセプト、公開された前段レビュー、ユーザー提供資料、既存の関連 Requirements を主な根拠とする。`docs/design/`、`docs/specifications/`、実装、テスト、fixture は、既存下流成果物との回帰・互換性や責任境界の整合を確認する必要がある場合、またはユーザーが明示した場合だけ補助的に参照する。下流資料を新しい Requirement の根拠にせず、API、schema、algorithm、KDF、nonce、ライブラリ、DB、UI、実装手順など下流で決める詳細の不足を要件の欠陥へ変換しない。

前段レビューがブロック判定または未解決 Critical の場合は、要件書が整っていてもその影響を記録する。Major や Minor だけで自動的に差し戻さない。

## レビュー観点

- 各要求が目的、課題、利用者、上流資料へ追跡できるか
- 対象、対象外、外部責任、前提、制約、未決定事項が明確か
- MUST / SHOULD と外部から観測可能な受け入れ条件があるか
- 機能、品質、セキュリティ、認証、完全性、相互運用性の要求が抜けていないか
- Symbol / NEM、Mainnet / Testnet、Core / Native / WASM の境界が混ざっていないか
- 要件本文内およびコンセプトとの整合性があるか

## 要件レベル境界

指摘候補ごとに、仕様・基本設計・詳細設計・実装で初めて決めても要件を満たせるか確認する。APIのfield、型、error code、内部状態、処理順序、暗号方式、UI、テストケースなどで解消できるなら、要件レビューの指摘にしない。反対に、利用者に必要な品質特性、責任、外部契約、互換性、法務またはセキュリティ上の制約が欠けている場合は、その欠落だけを指摘する。

## 実行と判定

review-playbook.md の Phase 0〜3 を適用する。Reviewer A、B、C を独立した観点で確認し、各候補を根拠、影響、必要条件で反証する。

判定は READY または REVISE REQUIREMENTS とする。品質 Gate を不合格にする finding は Critical とし、Critical が1件以上存在する場合だけ後者とする。Critical がなく Major / Minor のみの場合は READY とし、次工程へ引き継ぐ。

レビュー中に要件本文、コンセプト、仕様、コード、テスト、READMEを変更しない。未確認事項と未決定事項は別々に記録する。

## 作業完了後の Git 運用

`../review-common/review-playbook.md` の「成果物と Git」を適用する。
