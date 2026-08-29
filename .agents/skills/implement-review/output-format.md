# Output Format

この Skill のレビュー成果物は、`../review-common/output-format.md` の共通構成・章名・順序・指摘必須項目を使用する。共通構成を省略、追加、並べ替えない。

## Skill-specific values

- Formal finding prefix: `IR`
- Severity: `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`
- Review Result: `READY` / `REVISE IMPLEMENTATION`
- Required Changes: `CRITICAL` または `HIGH` の New / Open / Reopened。1件以上あれば `Review Result: REVISE IMPLEMENTATION`
- Optional Improvements: `MEDIUM` / `LOW` の New / Open / Reopened。これらのみであれば `Review Result: READY` とできる
- Deferred Findings: 仕様が曖昧な事項、または下流工程へ明示的に委譲する事項
- Domain Checks: Specification Conformance、Test Evaluation、security、相互運用性、異常系、型・依存・公開互換性。Security では適用した `security-checklist.md` 項目、主要な適用外項目と理由、未確認範囲を記録する
- Scope and Traceability: 差分、承認済み仕様・要件・設計、実装、テスト、fixture の対応

## 判定整合性

`CRITICAL` / `HIGH` の New / Open / Reopened finding は Required Change であり、`REVISE IMPLEMENTATION` を阻害する。`MEDIUM` / `LOW` のみの場合は non-blocking の Optional Improvement として `READY` とできる。重大度は実際の発生条件、影響、到達可能性、既存境界を根拠に判定し、単に暗号コードであることだけを理由に CRITICAL としない。仕様不足や設計選択の未決定は implementation defect と断定せず、`Deferred Findings` に `specification ambiguity / feedback` として記録する。ただし、secret leakage、memory unsafety、cryptographic misuse など既存の安全性を具体的に破る defect は、個別の防御策が仕様に列挙されていなくても finding とする。
