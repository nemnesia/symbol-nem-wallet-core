# Output Format

この Skill のレビュー成果物は、`../review-common/output-format.md` の共通構成・章名・順序・指摘必須項目を使用する。共通構成を省略、追加、並べ替えない。

## Skill-specific values

- Formal finding prefix: `SR`
- Severity: `Critical` / `Major` / `Minor`
- Review Result: `READY` / `REVISE SPECIFICATION`
- Required Changes: `Critical` の New / Open / Reopened（Gate 不合格に対応する差戻し事項）
- Optional Improvements: `Major` / `Minor` の New / Open / Reopened（Critical がなければ `READY` のまま引継ぎ可能）
- Deferred Findings: 実装・検証以降へ引き継ぐ未決定事項・確認事項
- Domain Checks: API・データ契約、validation、error、状態、処理、security、相互運用性、検証可能性。Security は適用した protected asset exposure、authentication / authorization、signing authority、signing target / canonical bytes、chain / network binding、cryptographic contract、nonce / salt / randomness、AAD / domain separation、Wallet Store / persistence、serialization、malformed / tampered input、fail-closed、atomic visible result、Native C ABI、WASM、unknown / version、interoperability、security testability を必要な範囲で確認する。
- Scope and Traceability: 要件・コンセプト・設計・前段レビューと仕様箇所の対応
