# Requirements Cleanup Review 001

## Review Target

- 対象: [`docs/requirements/requirements.md`](../../requirements/requirements.md)
- 確認日: 2026-08-30
- レビュー成果物: `docs/reviews/requirements/requirements-cleanup-review-001.md`
- 比較範囲: cleanup 前 `ecd623d` の `docs/requirements/requirements.md` と cleanup 後 `ffd8e4a` の同ファイル。作業開始時の `git diff -- docs/requirements/requirements.md` は空であり、既に `HEAD` に入っていた cleanup 差分を `git diff HEAD^ HEAD -- docs/requirements/requirements.md` で確認した。
- Review Scope: editorial cleanup による semantic preservation、Requirement ID integrity、Security regression、Scope / Responsibility Boundary、§11、Decision reference、Concept → Requirements → Acceptance Criteria → Design / Specification traceability、および Requirements / Specification boundary。
- 未確認範囲: 実装、実際の暗号処理、API / ABI の適合性、保存 wire format、外部 Node、実 Application / UI および下流成果物の実装適合性。これらは今回の cleanup の意味保持を確認するための根拠にはしていない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。
- Reviewer A（明確性・完全性・Traceability）: 完了。cleanup 前後の本文、見出し、MUST 条件、前提、失敗条件、例外、§11、Requirement → AC 参照を確認した。
- Reviewer B（利用価値・Scope・責任境界）: 完了。Concept との整合、v1 scope、Core / Binding / Application / UI / Network / Transaction 構築層 / 利用者の責任分界を確認した。
- Reviewer C（Security primary）: 完了。protected asset、confidentiality、integrity、authentication / authorization、secret lifecycle、failure safety、atomicity、Profile isolation、Binding boundary、Chain / Network separation および通常出力禁止を確認した。
- Phase 0: 完了。対象 cleanup commit、比較対象、参照範囲および成果物出力先を確定した。
- Phase 1: 完了。Reviewer A / B / C を観点ごとに独立確認した。
- Phase 2: 完了。削除された履歴・廃止 ID 説明・RR 表、用語変更および空白変更を本文の normative 条件と突合し、候補を反証・統合した。
- Phase 3: 完了。Requirements Review Skill の Gate / Severity / 出力形式に従い、formal finding の有無を判定した。

## Evidence Used

| 種別 | 参照資料 / 実行結果 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、フェーズ境界、scope discipline、秘密情報保護、validation および Git 運用を確認 |
| Requirements Review Skill | [`requirements-review/SKILL.md`](../../../.agents/skills/requirements-review/SKILL.md)、`review-common` の playbook / reviewers / security checklist / gates / output format | Reviewer A / B / C、Security primary、finding 採用基準、Gate、Severity、成果物形式を確認 |
| cleanup 前後の差分 | `git diff -- docs/requirements/requirements.md`、`git diff HEAD^ HEAD -- docs/requirements/requirements.md` | working tree の状態と実際の cleanup 変更を確認 |
| 上流 Concept | [`docs/consept/concept-sheet.md`](../../consept/concept-sheet.md) §1〜§13 | 目的、利用者、v1 scope、Core の継続管理、通常非開示、責任境界および Security Invariant を確認 |
| Concept review | [`concept-sheet-review-010.md`](../concept/concept-sheet-review-010.md) | 最新 Concept cleanup review の `READY` / `CONCEPT PHASE READY TO CLOSE` と上流未解決 Critical の有無を確認。Requirements の判定根拠は現行本文へ再追跡した |
| Requirements reviews | [`requirements-review-008.md`](requirements-review-008.md)、`requirements-review-007.md` および過去 Requirements reviews | RR-001〜RR-029、特に RR-022 / RR-026 の過去状態と完了条件を確認。過去判定を現行本文の代替にはしていない |
| 下流補助資料 | [`docs/design/bindings.md`](../../design/bindings.md)、[`docs/design/architecture.md`](../../design/architecture.md)、[`docs/specifications/specification.md`](../../specifications/specification.md) | `Web Binding` / `WASM Binding` の既存用語と薄い Binding 責任の整合だけを確認。下流詳細から Requirement を逆生成していない |

## Review Result

`READY`

## Summary

cleanup 前後で、Requirement の normative meaning、Security invariant、Scope、Responsibility Boundary および Requirement → AC traceability に実質的な変更はない。MUST 条件、前提、失敗・拒否条件、禁止条件、例外、lifecycle、atomicity、Profile isolation、秘密情報の通常出力禁止は現行本文に残っている。

削除された承認履歴、旧状態、Closed OPEN の履歴、廃止済み `SEC-016` / `AC-036` の説明、RR 対応履歴表は、現行要件そのものではない。対応する normative 条件は §2〜§12、FR / NFR / SEC / DR / AC および §10 に残り、過去の監査記録は Git 履歴と `docs/reviews/requirements/` から追跡できる。

`Web Binding` から `WASM Binding` への変更は、Web scope や Binding の責任を変えず、現行 Design / Specification と既存 Requirements 内の用語を統一するものと判定した。Binding が Core の秘密情報管理、認可、暗号、導出または署名を独自に担う記述は追加されていない。

## Finding Status

Formal finding はない。`Critical = 0`、`Major = 0`、`Minor = 0`、`New / Open / Reopened = 0` である。過去 RR-001〜RR-029 は cleanup 前後で回帰せず、RR-022 / RR-026 を含めて現行本文から追跡可能である。

| 確認対象 | Status | 状態根拠 |
| --- | --- | --- |
| Requirement ID 削除・renumber・duplicate | 回帰なし | parent / current の FR 24、NFR 5、SEC 21、DR 9、AC 46 が一致。`SEC-016` と `AC-036` の欠番も前後で維持されている。 |
| Requirement → AC mapping | 回帰なし | すべての Requirement ID に少なくとも1つの AC があり、AC の対応列に unknown ID、dangling reference、duplicate AC row はない。対応辺は前後で一致する。 |
| Security invariant | 回帰なし | Profile password 認可、secret boundary、export 制限、fail-closed、atomicity、Profile isolation、secret lifetime、no persistent unlocked state、Binding boundary、Mnemonic / Software Key lifecycle、Chain / Network separation および通常出力禁止を現行本文で確認した。 |
| Scope / Responsibility Boundary | 回帰なし | Core、Native / WASM Binding、Application / UI、Network、Transaction 構築層、利用者および host の責任が維持されている。 |
| §11 | 合格 | 「要件レベルの未決定事項はない」を維持し、下流具体方式は §1.3 / §12 へ明示的に委譲されている。 |

## Required Changes

なし。Requirements Review Skill 上、Gate 不合格に対応する Critical の New / Open / Reopened はない。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened はない。

## Resolved Findings

- cleanup 前に記載されていた過去の承認 baseline、旧状態、Closed OPEN の履歴および RR 対応表の削除は、現在の要件を判定するための normative information を削除していない。
- `SEC-016` / `AC-036` は cleanup 前後とも Requirement table の ID ではなく、廃止経緯を説明する本文行だった。Profile password 品質ポリシーの責任分界、Core が独自評価しないこと、KDF 等を下流へ委譲することは §2.3、FR-020、AC-029、§1.3、§12.2 に残っている。
- RR-022 の Mnemonic handoff 成立条件、失敗時の非成功・非開示および Core / Application / 利用者の責任は UC-001、FR-001、SEC-010、SEC-015、SEC-017〜SEC-018、AC-001、AC-034、§10 に残っている。
- RR-026 の v1 migration 非提供、対応 version 限定、unsupported / corrupt data の拒否、既存状態不変および将来 version への委譲は §2.5、DR-009、AC-018、AC-045、§10、§12.4 に残っている。

## Upstream Feedback

なし。Requirements Review は通常 upstream phase を持たない。最新 Concept review は `READY` / `CONCEPT PHASE READY TO CLOSE` であり、Requirements の評価を妨げる未解決 Concept Critical は確認されなかった。

## Deferred Findings

Formal finding はない。API / ABI、具体 type、schema、wire format、KDF / cipher、salt / nonce、concrete HD path、FFI / WASM 契約、zeroize 方式、内部 state machine、具体 error code、具体 UI および下流の実装適合性は、現行 Requirements が §1.3 / §12.1〜§12.4 で委譲しており、今回の cleanup の finding ではない。

## Scope and Traceability

| 層 | 確認結果 |
| --- | --- |
| Concept → Requirements | §1.2 は Concept §1〜§2 の背景・課題、§3 の目的、§4 の利用者・利用場面、§7〜§8 の責任境界へ追跡している。Mnemonic / Software Key の Core 継続管理、通常処理での非開示、explicit secret access、host compromise 非保証、v1 scope は現行 Requirements §2〜§4、§7、FR / SEC / AC に残っている。 |
| Requirements → Acceptance Criteria | parent / current とも FR 24、NFR 5、SEC 21、DR 9、AC 46。AC の対応列は前後で同一で、59 の Requirement ID すべてに AC があり、unknown / missing / dangling reference はない。 |
| Requirements → Design / Specification | §1.3 と §12.1〜§12.4 は API、保存形式、暗号パラメータ、memory / ownership、Binding 実装、内部状態および具体 UI を委譲する。handoff の成功条件、v1 migration 非提供、秘密情報非開示、拒否・状態不変などの observable requirement は委譲されず残っている。 |
| Binding terminology | `WASM Binding` は現行 [`docs/design/bindings.md`](../../design/bindings.md) および [`docs/specifications/specification.md`](../../specifications/specification.md) の用語と一致する。変更箇所の周囲にある「Core の責任・認可・秘密情報公開方針を変えない」「独自実装しない」は維持され、Binding の責任逆転はない。 |
| Decision reference | current Requirements に `DEC-*` または `docs/decisions/...` の参照はなく、存在しない Decision への current normative dependency はない。設計上の判断は `docs/design/` への参照として残っている。 |
| Historical review hygiene | `docs/reviews/requirements/` 内の過去レビューには、現在存在しない `docs/decisions/open-001.md`、`open-002.md`、`requirements-baseline-001.md` への参照が残る。これは過去レビューだけの参照であり、current Requirements の correctness / traceability に影響しないため cleanup blocker ではない。 |

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| Protected assets | 合格 | Mnemonic、Derived / Imported / Generated Software Key、Profile password、保存 Store および signing authority の責任が §2.1〜§2.4、§7、§8 に現れる。 |
| Confidentiality / secret export | 合格 | §2.3、UC-001 / UC-011、FR-022〜FR-023、SEC-010、SEC-015、SEC-017、SEC-020〜SEC-021、AC-025〜AC-026、AC-032、AC-041〜AC-043 が通常結果・失敗・診断での非開示と限定的 export 例外を維持する。 |
| Integrity | 合格 | SEC-004、SEC-018〜SEC-019、DR-009、AC-018、AC-038〜AC-039、AC-045〜AC-047、§10 が破損・不整合・越境・部分適用を安全側に扱う。 |
| Authentication / authorization | 合格 | §2.3、FR-004〜FR-005、FR-007、FR-010〜FR-012、SEC-002、SEC-006〜SEC-009、SEC-013〜SEC-014、SEC-021〜SEC-022、AC-007、AC-009、AC-030〜AC-031、AC-041〜AC-042 が処理単位の Core 認可と利用者意思の分離を維持する。 |
| Secret lifecycle | 合格 | 生成、復元、取込み、導出、利用、暗号化保存、replacement、削除、個別 export の責任と原本・外部コピーの境界が §2.3〜§2.4、UC-001〜UC-011、FR-001〜FR-024、SEC-003、SEC-007、SEC-010〜SEC-012、SEC-017 に残っている。 |
| Failure safety / fail-closed / atomicity | 合格 | FR-003〜FR-005、FR-010〜FR-012、FR-021、FR-024、SEC-004、SEC-018〜SEC-019、AC-003〜AC-005、AC-034、AC-038、AC-045〜AC-047、§10 が失敗・中断時の非開示、既存状態不変、部分適用禁止および越境禁止を維持する。 |
| Trust / responsibility boundary | 合格 | §2.2〜§2.4、NFR-001〜NFR-004、SEC-011〜SEC-012、SEC-014、SEC-020、AC-015〜AC-016、AC-023〜AC-024、AC-040、AC-043 が Core、Native / WASM Binding、Application / UI、host の境界を維持する。 |
| Chain / Network separation | 合格 | §2.1、§3、UC-009、FR-013、FR-024、DR-005、AC-013、AC-020、AC-047 が Symbol / NEM と Mainnet / Testnet、Profile Network と Software Key Chain の分離を維持する。 |
| Input / attacker boundary | 合格 | FR-021、FR-024、SEC-004、AC-017〜AC-018、AC-035、AC-045、AC-047 が invalid、malformed、破損、unsupported および不整合 input の正常利用・fallback を禁止する。 |
| Recoverability / non-goals | 合格 | §2.4〜§2.5、UC-001、UC-008、SEC-005、AC-012、AC-018 が初回 handoff、利用者側 backup、Profile data backup の責任、削除後の新規作成および v1 migration 非提供を区別する。 |

## Validation Results

- `git diff -- docs/requirements/requirements.md`: pass。作業開始時の working tree 差分は空だった。
- `git diff HEAD^ HEAD -- docs/requirements/requirements.md`: pass。cleanup の実差分を直接確認した。差分は履歴記述の削除、空白・文章整理、`Web Binding` → `WASM Binding` の用語統一および §13 への再番号付けである。
- Requirement ID 比較: pass。parent / current の集合差分は空、duplicate はなし。件数は FR 24、NFR 5、SEC 21、DR 9、AC 46 の双方一致。`SEC-016` / `AC-036` の欠番を埋めていない。
- Requirement → AC traceability: pass。AC 46 行の対応列について、parent / current の対応マッピング差分は空。59 の全 Requirement ID に AC があり、AC から absent ID への参照、dangling reference、duplicate AC row はない。
- Normative row semantic comparison: pass。空白差分と `Web Binding` → `WASM Binding` の明示的用語差分を除いて FR / NFR / SEC / DR / AC の行は一致した。`FR-012`、`SEC-005`、`AC-012` の削除・再作成境界、`FR-019`、`AC-040`、`AC-043` の Binding 境界は意味を維持する。
- Docs reference existence: pass。current Requirements に記載された `docs/consept/concept-sheet.md`、`docs/design/`、`docs/design/architecture.md`、2件の knowledge PDF、`docs/reviews/requirements/` はすべて存在する。current Requirements に `docs/decisions/...` の参照はない。
- Markdown validation: `pandoc --from=gfm --to=plain --output=/dev/null` は parent / current とも exit 0。`markdown-it docs/requirements/requirements.md >/dev/null` は exit 0。Markdown parser 上の構文エラーはない。
- Prettier: cleanup 前の parent を stdin として `prettier --check --stdin-filepath docs/requirements/requirements.md`、current に `prettier --check docs/requirements/requirements.md` を実行し、いずれも exit 1。cleanup 前から存在する失敗であり、current のみの新規失敗ではない。今回の Gate 不合格理由にはしない。巨大 Markdown table の全面再整形も行っていない。
- `git diff --check HEAD^ HEAD -- docs/requirements/requirements.md`: pass、exit 0。作業開始時の `git diff --check`: pass、exit 0。
- Rust formatter、clippy、cargo test、WASM check、Native / Binding 検証: 未実施。今回の変更対象は文書レビュー成果物のみであり、Requirements / code / Binding は変更していない。
- `markdownlint` / `markdownlint-cli2`: 利用不可。利用可能な `pandoc` / `markdown-it` による Markdown parse と `git diff --check` を実施した。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と課題 | 合格 | §1.1〜§1.2、Concept traceability および UC-001〜UC-011 は cleanup 後も目的・課題・主要利用場面を示す。 | なし |
| 2. 利用者と責任 | 合格 | §2.2〜§2.4、NFR-001〜NFR-004、AC-015〜AC-016、AC-023〜AC-024 に Core、Binding、Application / UI、host、利用者、Network、Transaction 構築層の境界が残る。 | なし |
| 3. 対象範囲 | 合格 | §2.1、§2.5、§3、FR-013、FR-019、FR-024、AC-040 が Symbol / NEM、Mainnet / Testnet、Desktop / Mobile / Web、Native / WASM および v1 対象外を区別する。 | なし |
| 4. 要件と制約 | 合格 | FR / NFR / SEC / DR、互換性基準、拒否・非開示・atomicity、v1 migration 非提供および §12 の委譲が維持される。 | なし |
| 5. 受け入れ条件 | 合格 | AC-001〜AC-047（欠番 AC-036 を含む既存 ID 範囲）の主要成功・失敗・拒否・安全性条件が維持され、対応列に dangling reference がない。 | なし |
| 6. 内部整合性 | 合格 | cleanup 前後で normative row の意味は一致し、§11 の宣言、Security 条件、責任境界、§10、§12 の間に回帰矛盾はない。 | なし |
| 7. 不可欠な前提 | 合格 | Core の継続管理、Application / UI の handoff・表示・確認、利用者の外部 backup、host compromise 非保証、Store reject 境界が維持される。 | なし |
| 8. Concept 整合性 | 合格 | Concept §1〜§8 の目的・scope・Security Invariant・責任境界が現行 Requirements §1〜§4、§7、FR / SEC / AC へ追跡できる。 | なし |

Formal Review Gate: `READY`。Gate 不合格に対応する Critical は 0 件である。

Requirements Phase Completion Gate:

| 完了条件 | 結果 | 根拠 |
| --- | --- | --- |
| Critical = 0 | 合格 | formal Critical 0 件。 |
| Major / Minor の current Open / Reopened = 0 | 合格 | cleanup 前後で新規・再開 finding なし。過去 RR-001〜RR-029 は回帰なし。 |
| Requirements-level Open Decision = 0 | 合格 | §11 の宣言を本文突合で確認し、handoff、migration、password、security、scope の product-level decision は現行本文に定義済み。 |
| Concept Security Invariant regression = 0 | 合格 | Core 継続管理、通常非開示、explicit access、環境共通原則および host compromise 非保証を確認した。 |
| Cleanup traceability regression = 0 | 合格 | ID 集合、AC 対応、current docs references、見出しおよび §1.2 / §13 の参照を確認した。 |

## Remaining Risks and Open Decisions

- Requirements-level Open Decisions: なし。
- 残る事項は、具体 API / ABI、保存形式、暗号方式・パラメータ、Binding の値変換・ownership、memory / zeroize、具体 UI および下流実装検証である。これらは §1.3 / §12 に明示された委譲事項であり、cleanup により未解決 Requirement へ戻ったものではない。
- `docs/reviews/requirements/` の過去レビューに存在しない旧 `docs/decisions/` への参照があることは repository hygiene 上の observation だが、current Requirements はそれらを参照していないため今回の cleanup blocker ではない。
- Prettier の失敗は cleanup 前後で再現しており、既存状態として扱った。Markdown parser と diff check は pass している。

## Automatic Changes

レビュー中に `docs/requirements/requirements.md`、Concept、Design、Specification、Implementation、Test、README、Skill または既存レビュー成果物は変更していない。新規に作成したファイルは本レビュー成果物だけである。

## Final Decision

`READY`

**REQUIREMENTS CLEANUP READY**

**REQUIREMENTS PHASE READY TO CLOSE**

cleanup による Requirement の意味変更、Security regression、Scope / Responsibility Boundary の変更、Requirement ID / AC traceability の破壊、current normative Decision dependency の欠落は確認されなかった。履歴整理後も、現在何が要件なのかを判断するための normative information と Concept から下流への委譲境界は維持されている。
