# Specification Review 017 — Core Specification review

## Review Target

| 項目 | 内容 |
| --- | --- |
| Repository / Branch | `nemnesia/symbol-nem-wallet-core` / `agent/react-native-support` |
| Reviewed HEAD | `c4955c6f4d5b6972cd0d3f7202fc91b11530bfb8` |
| Canonical Specification | [`specification.md`](../../specifications/specification.md) |
| Upstream | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md)、[`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md) |
| Related Store Specification | [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) |
| Previous Review | [`specification-review-016.md`](specification-review-016.md) — `READY` |
| Review date | 2026-09-20 (Asia/Tokyo) |
| Scope | Core の責務、公開 API、暗号、署名、Store 境界、error、atomicity、secret lifecycle、C ABI / Node-API / WASM 共通契約 |

## Execution Audit

`spec-review`、review-common playbook、security / interoperability checklist と gate policy を適用した。契約明確性、上流追跡、security / interoperability の3観点を独立に確認し、既存 `SR-001〜SR-028` と Implementation feedback の回帰を再評価した。サブエージェントは使用していない。

## Evidence Used

| 区分 | 資料 / 用途 |
| --- | --- |
| 作業・review policy | [`AGENTS.md`](../../../AGENTS.md)、`spec-review` / `review-common` — phase boundary、finding、gate、出力形式 |
| Concept / Requirements | `concept-sheet.md`、`requirements.md` — v1 scope、責任、security、acceptance |
| Design | `architecture.md`、`bindings.md`、`security.md` — Core authority、依存方向、trust / secret boundary |
| Specification | `specification.md` §§1〜18、`wallet-store-format-v1.md` — API、crypto、Store、error、binding、検証契約 |
| Prior review | `specification-review-016.md` — `SR-001〜SR-028` の resolved baseline |
| Downstream feedback | [`implement-spec-feedback.md`](../implementation/implement-spec-feedback.md) — NEM root HMAC、cross-chain duplicate、unknown field / AAD の解決確認 |

## Review Result

`READY`

## Summary

Core Specification は、Core が所有する暗号・鍵・Store・署名責務と Application / Binding の責務を分離し、16 operation、DTO、binary、error、failure 時不変条件を実装・検証可能に定義している。Symbol と NEM の HD derivation / signing、Chain / Network、raw bytes、署名対象 payload を混同していない。

過去の Implementation feedback 3件は、NEM の `ed25519-keccak seed` と最終 private key byte order、同一 Profile + 同一 Chain に限定した duplicate、未知 field の lossless wire / AAD preservation として現行本文に反映済みである。新規または reopened finding はない。

## Finding Status

| 区分 | 状態 |
| --- | --- |
| New findings | 0 |
| Open findings | Critical 0 / Major 0 / Minor 0 |
| Reopened findings | 0 |
| `SR-001〜SR-028` | Resolved / no regression |

## Required Changes

なし。

## Optional Improvements

なし。実装・fixture・runtime の適合性は Implementation review で判定する。

## Resolved Findings

- NEM root derivation は `HMAC-SHA-512(key = "ed25519-keccak seed", data = seed)` とし、NEM 固有の private key byte order を固定している。
- Software Key duplicate は同一 Profile・同一 Chain・同一 private key に限定し、異なる Chain 間を重複としない。
- 未知 field は意味解釈せず wire value を lossless に保持し、AAD 再構成と mutation failure 条件を定義している。
- `SR-001〜SR-028` が対象とした Store、authorization、export、signing、Chain / Network、binding、failure-safe 契約に回帰はない。

## Upstream Feedback

なし。`DR-RN-005` は RN platform status に限定された既存 Design finding であり、本 Core Specification の契約変更を要求しない。

## Deferred Findings

- Rust / C ABI / Node-API / WASM 実装、fixture、zeroize、failure path、interoperability の実測。
- RN 固有契約と platform artifact の実装適合性。
- release / package / supply-chain evidence。

## Scope and Traceability

| 上流要求・設計 | Specification の対応 |
| --- | --- |
| Core を security authority とする責務 | §§1〜2、§§4〜6、§§9〜13 |
| Profile isolation / opaque Store / atomic replacement | §§6〜7、§§10〜11 |
| 明示的 export / signing authorization | §§8〜9 |
| Symbol / NEM と Chain / Network の分離 | §§3〜5、§9.5.1、§14 |
| Binding non-authority / API parity | §13 |
| 検証可能性 / acceptance | §§14〜15 |

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| Public contract | PASS | 16 operation、DTO、binary、結果、error が一意。 |
| Crypto / signing | PASS | KDF、AEAD、derivation、Chain 固有署名、raw payload が明示される。 |
| Store / atomicity | PASS | current Store authority、replacement、failure / retry / rollback boundary が明示される。 |
| Security / secrets | PASS | authorization、zeroize 対象、非漏えい、WASM 制約、side-channel responsibility が明示される。 |
| Binding boundary | PASS | C ABI / Node-API / WASM が変換・ownership の橋渡しに限定される。 |
| Interoperability | PASS | exact bytes、SDK / verifier の適用範囲、fixture 条件が明示される。 |
| Existing feedback | PASS | 既存 Specification finding と Implementation feedback に回帰なし。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| Source state | `specification.md` の最終変更は 2026-09-05、作業開始時の working / staged diff なし。 |
| Structural review | §§1〜18 と Requirements / Design の対応、API・error・security・test trace を確認。 |
| Feedback recheck | `implement-spec-feedback.md` の3件が現行本文で解決済みであることを確認。 |
| Docs-only validation | Review artifact 作成後に Markdown / relative link、`git diff --check`、`git status` を確認する。実装テストは本 review 単体では対象外。 |

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| Scope / responsibility | PASS | Core、Application、Binding の責任が分離される。 |
| Contract completeness | PASS | 入出力、状態、error、failure が定義される。 |
| Internal consistency | PASS | API、Store、crypto、binding 間に矛盾なし。 |
| Upstream alignment | PASS | Concept / Requirements / Design に追跡可能。 |
| Security / interoperability | PASS | 秘密、認証、bytes、Chain / Network、fail-closed が一貫。 |
| Verifiability | PASS | fixture、negative path、coverage の検証対象が定義される。 |
| Formal Review Gate | **READY** | Critical および Open / Reopened Specification finding なし。 |

## Remaining Risks and Open Decisions

Core Specification に active な未決定事項はない。実装、binding、fixture、runtime、release evidence の適合性は未判定であり、Implementation review で確認する。

## Automatic Changes

本 review artifact のみを新規作成した。正式な Concept、Requirements、Design、Specification、実装、テスト、fixture は変更していない。

## Final Decision

**CORE SPECIFICATION REVIEW GATE: READY**

現行 Core Specification は上流成果物を実装・検証可能な外部契約へ具体化しており、新規または reopened `SR-*` はない。
