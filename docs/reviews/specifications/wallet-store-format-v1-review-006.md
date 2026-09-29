# Wallet Store Format v1 Review 006 — Mobile のv1対象化

## Review Target

- 対象: [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md)
- 確認日: 2026-09-23（Asia/Tokyo）
- 成果物: `docs/reviews/specifications/wallet-store-format-v1-review-006.md`
- Reviewed commit: `f98a67f9a335d0b845d1b2979b1f9da906fde3fd`
- レビュー範囲: commit `f98a67f` の親との差分、および差分反映後の Wallet Store Format v1 全体について、wire schema、deterministic CBOR、validation、error、resource limit、AAD、unknown field、version / migration、fail-closed、atomic replacement、相互運用性および検証可能性を確認した。
- 未確認範囲: Implementation、Rust / Native C ABI / Node-API / WASM / React Native Binding の実装適合性、CBOR library の実挙動、fixture、fuzz、coverage、実機および release evidence。これらを Specification の正当化根拠には使用していない。

## Execution Audit

- Reviewer A（契約の明確性と完全性）: 自己レビューの独立パスとして、field、type、length、order、version、validation、error、determinism および変更された見出しと本文契約の対応を確認した。
- Reviewer B（利用価値と運用適合性）: 自己レビューの独立パスとして、opaque Store、current Store authority、replacement、失敗時の結果、Mobile を含む Binding 共通契約および上流要求との追跡を確認した。
- Reviewer C（Security / Interoperability primary）: 自己レビューの独立パスとして、暗号化境界、KDF / AEAD、nonce / salt、AAD、unknown field、malformed / tampered input、fail-closed、atomic visible result、version、Symbol / NEM 分離および検証可能性を確認した。
- Chair 統合: 完了。本レビュー担当内でサブエージェントは使用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| ユーザー判断 | 2026-09-23 の明示判断 | Mobile（React Native Android / iOS）を v1 対象とする方針の確認 |
| 主対象 | [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) §§1〜14 | Wallet Store v1 の wire-level 契約を確認 |
| 対象差分 | commit `f98a67f` とその親の対象ファイル差分 | §2.2、§4、§8、§13 の見出しを日本語で明確化した4変更と、契約本文が不変であることを確認 |
| 上流正本 | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md) | Mobile を含む v1 scope、opaque Store、Core / Application 責任、security、version / migration 要求を追跡 |
| 設計正本 | [`architecture.md`](../../design/architecture.md)、[`security.md`](../../design/security.md)、[`bindings.md`](../../design/bindings.md) | Store ownership、trust boundary、fail-closed、Binding non-authority、全 runtime 共通の opaque Store 契約を確認 |
| 同一フェーズ | [`specification.md`](../../specifications/specification.md) §§6〜7、§§10〜11、§14 | 暗号利用、error、replacement、unknown field、testability の companion 契約を照合 |
| 前段レビュー | [`concept-sheet-review-015.md`](../concept/concept-sheet-review-015.md)、[`requirements-review-014.md`](../requirements/requirements-review-014.md)、[`architecture-review-004.md`](../design/architecture-review-004.md)、[`bindings-review-004.md`](../design/bindings-review-004.md)、[`security-review-004.md`](../design/security-review-004.md) | 全て `READY`、未解決 Critical なしであることを確認 |
| 過去レビュー | [`wallet-store-format-v1-review-005.md`](wallet-store-format-v1-review-005.md) | `SR-001〜SR-009` の解決状態と回帰確認の baseline |
| 実装フィードバック | [`implement-spec-feedback.md`](../implementation/implement-spec-feedback.md) | cross-chain duplicate と unknown field / AAD の過去指摘を確認。解決状況の旧い要約表現は正本とせず、現行 Specification と review-005 を優先した |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md)、`spec-review`、`review-common` | Source of Truth、フェーズ境界、Gate、Severity、docs-only validation を確認 |
| Phase Context | なし | `AGENTS.md` に Specification の Phase Context 登録がないため使用していない |

## Review Result

`READY`

## Summary

commit `f98a67f` による対象仕様の変更は、`Resource limits`、`enum wire 値`、`encrypted ProfilePayloadV1`、`versioning と migration` の見出しを、それぞれ「リソース上限」、「enum の wire 値」、「暗号化された ProfilePayloadV1」、「バージョニングと移行」へ整理したものである。本文、節番号、内部参照、wire 値、error および security behavior に変更はない。

現行仕様は、RFC 8949 Core Deterministic Encoding Requirements、完全な CBOR item 1個と全 bytes 消費、固定 schema / enum / length / order、入力上限、unknown field の限定受理と lossless 保持、unknown enum の全体拒否、AAD、認証後の index / payload と duplicate tag の意味的一致、未対応 version、no implicit migration、失敗時の secret / normal result / replacement 非返却を一意に定めている。

Mobile（React Native Android / iOS）が v1 対象になっても、Binding は Wallet Store を opaque bytes として同じ Rust Core へ受け渡し、Store の解釈・更新・認証・整合性判定は Core に残る。対象 runtime の追加により wire contract が分岐する余地はなく、`SR-001〜SR-009` の再発も認められない。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `SR-001〜SR-009` | 過去の各 Severity | Resolved / 回帰なし | wallet-store-format-v1-review-001〜004 | UUID mapping、duplicate tag、version error、malformed child、認証後検証、unknown field preservation、complete CBOR item、future-version boundary、unknown nested value / resource boundary は現行本文に維持される。 |

新規、Open、Reopened の formal finding はない。

## Required Changes

なし。Critical の New / Open / Reopened は確認されなかった。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened は確認されなかった。

## Resolved Findings

- `SR-001`: UUID string と raw `bytes[16]` の左から右の mapping、case、error は維持される。
- `SR-002〜SR-005`: duplicate tag、version、malformed child、認証後の意味検証と fail-closed に回帰はない。
- `SR-006〜SR-009`: unknown field の logical non-use / lossless preservation、complete item、future-version boundary、nested value の type / deterministic / resource validation は維持される。

## Upstream Feedback

なし。Concept Review 015、Requirements Review 014、Architecture / Bindings / Security Design Review 004 は全て `READY` であり、Mobile を含む v1 scope、Store ownership、security invariant および Binding non-authority を一意に追跡できる。

## Deferred Findings

Formal finding はなし。次は実装・検証へ引き継ぐ。

- Decoder / encoder が recursive type validation、resource limit、deterministic encoding、raw wire preservation を実際に満たすこと。
- KDF / AEAD / nonce / AAD / duplicate tag、tamper rejection、atomic replacement が fixture と failure-path test に適合すること。
- Native C ABI / Node-API / WASM / React Native が Store を opaque bytes として同じ Core contract で受け渡し、Store semantics を再実装しないこと。
- `implement-spec-feedback.md` の `INTEROP-002` 解決要約は、対象 Profile mutation で unknown field を除去する旧い表現を含む。実装適合はその履歴要約ではなく、現行正本の lossless 保持・保持不能時拒否に対して確認すること。

## Scope and Traceability

| 上流要求 / 設計 | Wallet Store Format v1 の対応 |
| --- | --- |
| opaque binary Store / Application persistence | §§1、6、11、14 |
| deterministic serialization / malformed input rejection | §§2〜4、7〜9、13 |
| password protection / KDF / AEAD / AAD | §§4、7〜8、11〜12 |
| fail-closed / existing state preservation / atomic replacement | §§2.1、11、14.1 |
| version identification / no implicit migration | §§3.2、13〜14 |
| Symbol / NEM と Mainnet / Testnet の分離 | §§4、7、9【12 |
| Mobile を含む Binding non-authority | §1 の opaque blob 境界と companion Specification §§1【2、7、13 |

## Domain Checks

| 領域 | 結果 | 根拠 |
| --- | --- | --- |
| API・データ契約 | PASS | integer key、type、fixed length、enum、ID、order、uniqueness、version が固定される。 |
| Validation / error | PASS | malformed、truncated、trailing、duplicate、unknown enum、unsupported version、index / payload mismatch の受理・拒否と error が一意である。 |
| 状態・処理 | PASS | Store-wide rejection、child skip 禁止、失敗時の secret / normal result / replacement 非返却、existing committed state 不変が明確である。 |
| Cryptographic contract | PASS | Argon2id、AES-256-GCM、salt / nonce / tag 長、CSPRNG、AAD、duplicate tag が固定され、nonce reuse を許可しない。 |
| Wallet Store / persistence | PASS | encrypted / plaintext 境界、schema、authentication、unknown field、version、migration、replacement が外部から判定できる。 |
| Serialization / determinism | PASS | RFC 8949 Core Deterministic Encoding、complete item、shortest form、definite length、map order、duplicate 禁止が明確である。 |
| Malformed / tampered input | PASS | unknown / nested value にも type、resource、determinism を再帰適用し、改ざん・意味不一致を安全側に拒否する。 |
| Fail-closed / atomic result | PASS | partial success、warning 付き受理、fallback、implicit migration、不完全な replacement を許可しない。 |
| Unknown / forward compatibility | PASS | current schema 内の opaque extension と unknown enum / future version を分離し、一般的な forward compatibility を誤って保証しない。 |
| Interoperability | PASS | raw bytes、byte order、enum、Chain / Network、AAD、canonical encoding が別実装間で一致する粒度で固定される。 |
| Security testability | PASS | deterministic fixture、tamper case、boundary、unknown field、version、mutation の positive / negative 条件を companion Specification §14 で独立に検証できる。 |
| Mobile 回帰 | PASS | React Native も同じ Core / opaque Store 契約を使い、platform 固有の wire 分岐、error 読替え、fallback または Store 解釈を追加しない。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別レビュー | 契約、運用、Security / Interoperability の3パスを完了。 |
| 対象差分 | `git diff f98a67f^ f98a67f -- docs/specifications/wallet-store-format-v1.md` を確認し、見出し4件だけが変更され、契約本文に変更がないことを確認した。 |
| 上流 Gate | Concept Review 015、Requirements Review 014、Design Review 004 が全て `READY` で、未解決 Critical がないことを確認した。 |
| 過去 finding | `SR-001〜SR-009` の回帰確認を実施した。 |
| 文書間整合性 | Requirements、Architecture、Security、Bindings、companion Specification の Store / error / atomicity / Binding 契約と照合した。 |
| Docs-only validation | 成果物の Markdown 構成、相対リンク、whitespace error、`git status` を確認する。 |
| Rust / Binding / WASM / Node / React Native test | `NOT APPLICABLE / SKIPPED (docs-only review)`。実装適合性は依頼範囲外である。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | PASS | §1が v1 wire-level 正本、Core と Application / Binding の境界を明示する。 | なし |
| 2. 契約 | PASS | §§2〜14が field、type、length、order、validation、error、version、禁止事項を一意に定める。 | なし |
| 3. 処理と例外 | PASS | malformed、tampered、resource overflow、authentication / semantic mismatch、unsupported version、mutation failure の結果が明確である。 | なし |
| 4. 内部整合性 | PASS | 見出し整理は節の内容と一致し、内部参照、companion Specification、上流設計との矛盾がない。 | なし |
| 5. 検証可能性 | PASS | deterministic bytes、境界値、tamper、unknown field、version、atomic mutation を positive / negative fixture で判定できる。 | なし |
| 6. 安全性と相互運用性 | PASS | 暗号化境界、KDF / AEAD、AAD、nonce / salt、Store validation、fail-closed、serialization、unknown / version、Chain / Network が一意である。 | なし |
| 7. 上流整合性 | PASS | Mobile を v1 対象とする Concept / Requirements / Design の `READY` Gate と、共通 Core / opaque Store の責任境界に整合する。 | なし |

## Remaining Risks and Open Decisions

- Store-format-level の active decision はない。
- 実装が recursive validation、resource limit、wire preservation、AAD、atomic replacement、secret lifecycle および各 Binding の opaque byte 契約を実際に満たすかは Implementation Review の対象である。
- 履歴資料 `implement-spec-feedback.md` の `INTEROP-002` 解決要約は現行正本と表現が異なるため、今後の実装検証では現行 `wallet-store-format-v1.md` §§2、7.1、11 と `specification.md` §6.3 を使用する。これは対象 Specification の Gate を妨げない。

## Automatic Changes

本レビュー成果物のみを新規作成した。Specification、Requirements、Design、Implementation、test、fixture、README、既存レビュー成果物は変更していない。

## Final Decision

`READY`

Critical は0件であり、新規または reopened `SR-*` はない。Mobile（React Native Android / iOS）を v1 対象とした後も、Wallet Store Format v1 は安全かつ相互運用可能に実装・検証できる。
