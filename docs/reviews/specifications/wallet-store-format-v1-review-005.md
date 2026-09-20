# Wallet Store Format v1 Review 005

## Review Target

| 項目 | 内容 |
| --- | --- |
| Reviewed HEAD | `c4955c6f4d5b6972cd0d3f7202fc91b11530bfb8` |
| Canonical Specification | [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) |
| Companion Specification | [`specification.md`](../../specifications/specification.md) |
| Previous Review | [`wallet-store-format-v1-review-004.md`](wallet-store-format-v1-review-004.md) — `READY` |
| Review date | 2026-09-20 (Asia/Tokyo) |
| Scope | v1 wire schema、deterministic CBOR、validation、resource limits、AAD、unknown field、version、atomic replacement |

## Execution Audit

`spec-review` と review-common の reviewer / security / interoperability / gate policy を適用し、wire 契約、fail-closed、安全性の3観点で確認した。サブエージェントは使用していない。

## Evidence Used

- [`AGENTS.md`](../../../AGENTS.md)、`spec-review` / `review-common`。
- `requirements.md` の Store、security、interoperability 要求。
- `architecture.md` / `security.md` の Store ownership、trust boundary、failure invariant。
- `wallet-store-format-v1.md` §§1〜14 と companion `specification.md` §§6〜7、§§10〜11。
- `wallet-store-format-v1-review-004.md` の `SR-001〜SR-009` resolution baseline。
- [`implement-spec-feedback.md`](../implementation/implement-spec-feedback.md) の cross-chain duplicate と unknown field / AAD feedback。

## Review Result

`READY`

## Summary

Wallet Store v1 は RFC 8949 deterministic CBOR、単一 item / 全 bytes 消費、固定 schema、上限、canonical order、ID 一意性を明示している。未知 field は current schema 内の限定型だけを opaque に受理し、wire 値を lossless に保持できない mutation を拒否する。未知 enum、未対応 version、malformed child、index / payload mismatch は skip せず Store 全体を拒否する。

AAD は manifest と受信 `software_key_index` wire semantics を結び付け、認証後の index / payload と duplicate tag の意味的一致も検証する。失敗時に secret、正常値、replacement Store を返さないため、仕様上の fail-closed と atomicity は成立している。

## Finding Status

| 区分 | 状態 |
| --- | --- |
| New findings | 0 |
| Open findings | Critical 0 / Major 0 / Minor 0 |
| Reopened findings | 0 |
| `SR-001〜SR-009` | Resolved / no regression |

## Required Changes

なし。

## Optional Improvements

なし。

## Resolved Findings

`SR-001〜SR-009` の UUID mapping、duplicate tag、version error、malformed child、認証後検証、unknown field preservation、complete CBOR item、future-version boundary、unknown nested value type / resource boundary は現行本文に維持されている。

## Upstream Feedback

なし。

## Deferred Findings

- Decoder / encoder、resource limit、raw wire preservation、AAD、atomic replacement の実装適合性。
- malformed / corruption / authentication / unknown-field fixture の実測。
- Binding ownership と release evidence。

## Scope and Traceability

| 要求 / 設計 | Store Format の対応 |
| --- | --- |
| opaque binary Store / Application persistence | §§1、6、11 |
| deterministic serialization | §§2〜10 |
| parser validation / corruption handling | §§2.1〜2.2、§§4、7〜9、13 |
| authentication / integrity context | §§7、11〜12 |
| atomic replacement / Profile isolation | §11 |
| version / migration boundary | §§3.2、13〜14 |

## Domain Checks

| 領域 | 結果 | 根拠 |
| --- | --- | --- |
| Wire completeness | PASS | integer key、type、length、enum、order、uniqueness が固定される。 |
| Determinism | PASS | complete item、shortest form、definite length、map order、duplicate 禁止。 |
| Resource safety | PASS | raw bytes、profile / key count、item length、container count、depth の allocation 前上限。 |
| Unknown fields | PASS | 許可型、再帰検証、logical non-use、lossless preservation、保持不能時拒否。 |
| Authentication / AAD | PASS | manifest、index wire value、duplicate tag と復号 payload を段階的に検証。 |
| Failure / atomicity | PASS | Store-wide rejection、no skip、no secret / replacement、committed state 不変。 |
| Versioning | PASS | malformed と unsupported を分離し、implicit migration / fallback を禁止。 |
| Symbol / NEM separation | PASS | Chain は固定属性で、同一 key の異なる Chain を別 Software Key とする。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| Source state | Target の最終変更は 2026-08-30、作業開始時の working / staged diff なし。 |
| Contract review | §§1〜14 と companion Core contract の error、AAD、mutation、duplicate 規則を照合。 |
| Regression review | `SR-001〜SR-009` と Implementation feedback に回帰なし。 |
| Docs-only validation | Artifact 作成後に Markdown / relative link、`git diff --check`、`git status` を確認する。実装テストは本 review 単体では対象外。 |

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| Purpose / scope | PASS | v1 wire-level 正本と責任境界が明確。 |
| Contract | PASS | schema、encoding、validation、error、version が一意。 |
| Processing / exceptions | PASS | validation 順序と failure result が明確。 |
| Internal consistency | PASS | Core companion と Store semantics が一致。 |
| Verifiability | PASS | positive / malformed / boundary / mutation 条件が fixture 化可能。 |
| Security / interoperability | PASS | attacker-controlled input、AAD、opaque preservation、determinism が明確。 |
| Formal Review Gate | **READY** | Critical および Open / Reopened finding なし。 |

## Remaining Risks and Open Decisions

Store-format-level の active decision はない。実装が再帰 validation、resource limit、wire preservation、AAD、secret lifecycle を満たすかは Implementation review の対象である。

## Automatic Changes

本 review artifact のみを新規作成した。Specification、実装、テスト、fixture は変更していない。

## Final Decision

**WALLET STORE FORMAT V1 REVIEW GATE: READY**

新規または reopened `SR-*` はなく、現行 v1 wire contract は実装・検証可能である。
