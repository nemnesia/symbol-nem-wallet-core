# Output Format

この Skill のレビュー成果物は、`../review-common/output-format.md` の共通構成・章名・順序・指摘必須項目を使用する。共通構成を省略、追加、並べ替えない。

## Skill-specific values

- Formal finding prefix: `RR`
- Severity: `Critical` / `Major` / `Minor`
- Review Result: `READY` / `REVISE REQUIREMENTS`
- Required Changes: `Critical` の New / Open / Reopened（Gate 不合格に対応する差戻し事項）
- Optional Improvements: `Major` / `Minor` の New / Open / Reopened（Critical がなければ `READY` のまま引継ぎ可能）
- Deferred Findings: 仕様設計以降へ引き継ぐ指摘
- Domain Checks: 要求の完全性、責任・範囲、MUST / SHOULD、受け入れ条件、セキュリティ、相互運用性
- Scope and Traceability: 要求とコンセプト、設計、適用資料、下流工程との追跡
