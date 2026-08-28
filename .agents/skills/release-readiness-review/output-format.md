# Output Format

この Skill のレビュー成果物は、`../review-common/output-format.md` の共通構成・章名・順序・指摘必須項目を使用する。共通構成を省略、追加、並べ替えない。

## Skill-specific values

- Formal finding prefix: `RL`
- Severity: `Critical` / `Major` / `Minor`
- Review Result: `READY` / `READY WITH MINOR FIXES` / `NOT READY` / `TARGET CONFIRMATION REQUIRED`
- Required Changes: 公開を妨げる `Critical` / `Major` の New / Open / Reopened
- Optional Improvements: 公開を妨げない `Minor` の New / Open / Reopened
- Deferred Findings: 次回リリースまたは後工程へ引き継ぐ指摘・未決定事項
- Domain Checks: Version Assessment、Documentation Check、Package Metadata Check、配布物、SemVer、capability、security
- Scope and Traceability: crate / binding、差分、公開 API、README、仕様、設計、evidence の対応
- Automatic Changes: 明示依頼があり安全な metadata / docs を変更した場合だけ記録する。publish、commit、tag、registry変更は記録上の完了と混同しない
