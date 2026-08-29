# Output Format

この Skill のレビュー成果物は、`../review-common/output-format.md` の共通構成・章名・順序・指摘必須項目を使用する。共通構成を省略、追加、並べ替えない。

## Skill-specific values

- Formal finding prefix: `DR`
- Severity: `Critical` / `Major` / `Minor`
- Review Result: `READY` / `REVISE DESIGN`
- Required Changes: `Critical` の New / Open / Reopened（Gate 不合格に対応する差戻し事項）
- Optional Improvements: `Major` / `Minor` の New / Open / Reopened（Critical がなければ `READY` のまま引継ぎ可能）
- Deferred Findings: 下位仕様・実装・運用へ引き継ぐ指摘
- Domain Checks: システムコンテキスト、責務、依存方向、trust boundary、データ所有、主要フロー、運用、下流実装可能性、設計判断。Security Domain Check では、適用した `protected assets`、`trust boundaries`、`secret ownership`、`secret lifecycle`、`authentication / authorization`、`signing authority`、`failure model`、`state consistency / replacement`、`Core / Native / WASM / Application boundary`、`attacker-controlled input`、`chain / network separation`、`security invariants`、`downstream handoff` を確認できるようにする。全 checklist 項目を機械的に出力せず、適用外または未確認の主要観点だけ必要に応じて示す。checklist 自体を正式 finding の根拠にせず、Design 本文、Requirements、Concept、既存の適用可能な Design Decision、またはユーザー要求へ追跡できるものだけを記録する。
- Scope and Traceability: 要件・仕様・既存設計判断と設計箇所の対応
