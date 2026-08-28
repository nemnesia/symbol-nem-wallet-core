# Output Format

この Skill のレビュー成果物は、`../review-common/output-format.md` の共通構成・章名・順序・指摘必須項目を使用する。共通構成を省略、追加、並べ替えない。

## Skill-specific values

- Formal finding prefix: `IR`
- Severity: `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`
- Review Result: `READY` / `REVISE IMPLEMENTATION`
- Required Changes: `CRITICAL` または `HIGH` の New / Open / Reopened
- Optional Improvements: `MEDIUM` / `LOW` の New / Open / Reopened
- Deferred Findings: 仕様が曖昧な事項、または下流工程へ明示的に委譲する事項
- Domain Checks: Specification Conformance、Test Evaluation、security、相互運用性、異常系、型・依存・公開互換性
- Scope and Traceability: 差分、承認済み仕様・要件・設計、実装、テスト、fixture の対応
