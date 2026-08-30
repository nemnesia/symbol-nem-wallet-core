# Wallet Store Format v1 Review 004

## Review Target

- 対象: [`docs/specifications/wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md)
- 確認日: 2026-08-30 +0900
- 成果物: `docs/reviews/specifications/wallet-store-format-v1-review-004.md`
- 修正対象コミット: `3e013e5958fce77e267b5de55f4c722cadc5c1d5`
- 前回 Store review: [`wallet-store-format-v1-review-003.md`](wallet-store-format-v1-review-003.md)
- Companion Specification: [`docs/specifications/specification.md`](../../specifications/specification.md)
- Latest companion review: [`specification-review-012.md`](specification-review-012.md)
- Review scope: SR-009 の修正後再レビュー、SR-001〜SR-008 の regression、RFC 8949 Core Deterministic Encoding、unknown field preservation、AAD、version / migration、resource limits、fail-closed、atomic replacement、companion Specification との整合、Review Gate。
- 未確認範囲: Implementation、Rust / Native C ABI / WASM の実装適合性、CBOR library の実挙動、parser allocation、fuzz harness、fixture の実行、coverage 実測、Application / UI および外部 Node。これらを Specification の正当化根拠には使用していない。
- Phase Context: `AGENTS.md` に Specification 用の登録はなく、Context は探索・作成・使用していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として統合した。
- Reviewer A（契約の明確性と完全性）: 完了。unknown field の型境界、再帰構成、determinism、complete item、resource limit、validation、error、version および mutation 契約を確認した。
- Reviewer B（利用価値と運用適合性）: 完了。SR-001〜SR-008、Store 全体の失敗結果、replacement、既存 committed state、Profile isolation および future compatibility boundary の回帰を確認した。
- Reviewer C（Security / Interoperability primary）: 完了。attacker-controlled CBOR、許可・拒否 type、AAD wire semantics、lossless preservation、unknown enum、fail-closed、atomic visible result および companion Specification との整合を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を Wallet Store Format v1 に限定し、companion Specification と上流資料は整合確認、Implementation / Test / Fixture は正当化根拠外とした。
- Phase 1（独立レビュー）: 完了。契約、運用、security / interoperability の観点を分離して確認した。
- Phase 2（反証・統合）: 完了。SR-009 completion condition、SR-001〜SR-008、既存 finding の状態、companion Specification、Upstream Feedback および新規 finding の要否を再確認した。
- Phase 3（Gate・成果物）: 完了。現行 `spec-review` Skill の Gate、Severity、output format およびユーザー指定の確認項目を適用した。

## Evidence Used

### Review Basis

| 区分                    | 資料                                                                                                                                                                                                                                                                                                                                                                                                                      | 用途                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 作業規則                | [`AGENTS.md`](../../../AGENTS.md)、[`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/spec-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/spec-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/spec-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/spec-review/output-format.md) | Review Board の役割、security / interoperability 観点、Severity、Gate、成果物構成を確認                                               |
| 共通 review policy      | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`review-common/output-format.md`](../../../.agents/skills/review-common/output-format.md)                                                                                                                                                                                                                                              | Phase 0〜3、finding 採用条件、Upstream Feedback / Deferred Findings、章順および検証規則を確認                                         |
| 修正後 review target    | [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md)                                                                                                                                                                                                                                                                                                                                             | SR-009 completion condition、既存 Store contract、AAD、mutation、version、error、atomicity を判定                                     |
| 修正差分                | commit [`3e013e5958fce77e267b5de55f4c722cadc5c1d5`](https://github.com/nemnesia/symbol-nem-wallet-core/commit/3e013e5958fce77e267b5de55f4c722cadc5c1d5)                                                                                                                                                                                                                                                                   | SR-009 修正が対象仕様に限定され、許可・拒否 type、再帰、determinism、resource limit、AAD、fail-closed を追加したことを確認            |
| Previous review         | [`wallet-store-format-v1-review-003.md`](wallet-store-format-v1-review-003.md)                                                                                                                                                                                                                                                                                                                                            | SR-009 の初出内容、completion condition、SR-001〜SR-008 の前回状態を確認                                                              |
| Companion Specification | [`specification.md`](../../specifications/specification.md)                                                                                                                                                                                                                                                                                                                                                               | Wallet Store の正本関係、`InvalidStore`、unknown field / enum、AAD、mutation、replacement、version / migration の整合を確認           |
| Latest companion review | [`specification-review-012.md`](specification-review-012.md)                                                                                                                                                                                                                                                                                                                                                              | companion Specification の公開判定 `READY` と、Store contract との整合確認範囲を確認                                                  |
| Requirements / Design   | [`requirements.md`](../../requirements/requirements.md)、[`architecture.md`](../../design/architecture.md)、[`security.md`](../../design/security.md)、[`bindings.md`](../../design/bindings.md)                                                                                                                                                                                                                          | DR-009、AC-045、opaque Store、fail-closed、existing state preservation、migration 非提供および Binding non-authority の上流根拠を確認 |
| 外部技術資料            | [RFC 8949 §4.2.1](https://www.rfc-editor.org/rfc/rfc8949.html#section-4.2.1)                                                                                                                                                                                                                                                                                                                                              | Core Deterministic Encoding の map key bytewise lexicographic order を確認                                                            |

### Current revision evidence

- commit `3e013e5` は [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) だけを変更し、unknown field の型集合、拒否条件、再帰、deterministic encoding、resource limit、AAD wire value および fail-closed mutation を補足している。
- §2（L13-L67）は current schema version 内の unknown field value の許可集合、known field schema type 非拡張、拒否集合、simple value の具体例、complete item、RFC 8949 Core Deterministic Encoding および future compatibility boundary を定める。
- §2.1（L71-L110）および §2.2（L112-L135）は nested validation の `InvalidStore`、child skip / warning 禁止、secret 非処理、resource limit と再帰的適用を定める。
- §7.1（L316-L344）および §11（L563-L617）は nested unknown value、unsigned integer map key、lossless preservation、AAD wire semantics、mutation replacement および committed state 保護を定める。
- §4（L179-L224）、§13（L661-L694）は unknown enum、version、migration、fallback および implicit conversion の境界を維持している。

## Review Result

`READY`

## Summary

commit `3e013e5958fce77e267b5de55f4c722cadc5c1d5` による SR-009 修正は、unknown field value を current schema version 内の限定された opaque wire contract として閉じている。unsigned integer、byte string、text string、array、map のみを許可し、negative integer、tag、floating-point、simple value、boolean、null、undefined およびその他の許可集合外 item を `InvalidStore` として拒否することが一意である。array / map の nested value、unsigned integer map key、RFC 8949 Core Deterministic Encoding、既存 resource limit、AAD の受信 wire semantics、lossless preservation および fail-closed mutation も明示されている。

SR-001〜SR-008 は引き続き `RESOLVED` であり、今回の追加は既知 field schema、Profile duplicate、version、authenticated payload、deterministic top-level boundary、unknown enum、atomic replacement または future version policy を変更していない。Companion Specification は Wallet Store wire-level contract を対象仕様へ委譲し、`InvalidStore`、unknown enum、AAD、mutation、replacement および migration 非提供の契約で矛盾しない。

新規 Specification finding はない。Current formal finding は `0 / 0 / 0`（Critical / Major / Minor）であり、現行 Gate の `Critical = 0` 条件を満たすため `READY` とする。

## Finding Status

| ID     | Severity | Status     | 初出レビュー                                           | 今回の状態根拠                                                                                                                                                                |
| ------ | -------- | ---------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SR-001 | Major    | `RESOLVED` | wallet-store-format-v1-review-001                      | §3.3 の UUID string、raw `bytes[16]`、左から右の byte order、case、`InvalidArgument` / `InvalidStore` 境界に回帰なし。                                                        |
| SR-002 | Major    | `RESOLVED` | wallet-store-format-v1-review-001 / Open in review-002 | §12、§14.1 および companion §8.2 の duplicate tag、整合 Store の重複拒否、password-less 不一致の継続範囲に回帰なし。                                                          |
| SR-003 | Major    | `RESOLVED` | wallet-store-format-v1-review-001                      | §2.1、§13、§14.1 の missing / invalid type、unsupported version、Store-wide reject、child skip / replacement 禁止に回帰なし。                                                 |
| SR-004 | Major    | `RESOLVED` | wallet-store-format-v1-review-001                      | §2.1、§4、§7.1、§8〜§9 の malformed child、enum、index、order、duplicate、mapping の fatal `InvalidStore` に回帰なし。                                                        |
| SR-005 | Major    | `RESOLVED` | wallet-store-format-v1-review-001                      | §7.1、§8、§11〜§12 の authenticated payload validation、意味的一致、secret 非返却および mutation / replacement 非成立に回帰なし。                                             |
| SR-006 | Major    | `RESOLVED` | wallet-store-format-v1-review-001                      | §2、§7.1、§11 の unknown field logical non-use、wire preservation、AAD 反映、保持不能時 failure に回帰なし。今回 nested value まで preservation / validation 範囲を明示した。 |
| SR-007 | Major    | `RESOLVED` | wallet-store-format-v1-review-002                      | §2、§2.1 の complete item 1個、全 bytes 消費、truncated / trailing / multiple item、deterministic violation の `InvalidStore` に回帰なし。                                    |
| SR-008 | Minor    | `RESOLVED` | wallet-store-format-v1-review-002                      | §2、§11、§13、§14.1 の current schema version 内限定、future version / schema、migration、fallback、意味解釈の非保証に回帰なし。                                              |
| SR-009 | Minor    | `RESOLVED` | wallet-store-format-v1-review-003                      | §2、§2.1、§2.2、§7.1、§11 が completion condition の10項目を明示し、unknown field value の wire type boundary を閉じている。                                                  |

## Required Changes

なし。`Critical` の New / Open / Reopened は確認されない。

## Optional Improvements

なし。`Major` / `Minor` の New / Open / Reopened は確認されない。実装・fixture・fuzz・allocation に関する事項は本 Specification finding ではなく下流確認へ委譲する。

## Resolved Findings

### SR-009 — Unknown field の CBOR type 境界

- Severity: `Minor`
- Status: `RESOLVED`
- 初出: [`wallet-store-format-v1-review-003.md`](wallet-store-format-v1-review-003.md)
- 修正: commit `3e013e5958fce77e267b5de55f4c722cadc5c1d5`
- 完了判定: 下記 Domain Checks の1〜10がすべて適合。unknown field の受理・拒否、保持、AAD、失敗結果および future compatibility の境界を独立実装が同じ外部結果として判定できる。

### SR-001〜SR-008 regression

SR-001〜SR-008 はすべて `RESOLVED` を維持する。今回の commit は Store Format の既存 contract を上書きせず、unknown field の型境界とそれに伴う nested validation / preservation / AAD / failure の明確化だけを追加している。個別の重点確認は Domain Checks の「Regression review」に記録した。

## Upstream Feedback

なし。Requirements DR-009 / AC-045 と Design の opaque Store、v1 migration 非提供、reject、existing committed state 保護の invariant は、今回の clarification に必要な根拠を提供している。Companion Specification は §7（L274-L295）で Wallet Store の wire-level schema、unknown field / enum、resource limit および exact rule を対象 Store Format に委譲し、§6.3（L236-L254）および §7 の API 契約で AAD、`InvalidStore`、lossless preservation、mutation、replacement、unknown enum、version / migration の境界を維持している。現行の不足は上流 gap ではない。

## Deferred Findings

- CBOR library が上記契約を実際に満たすか、parser の recursive validation、allocation 前の resource limit 適用、Rust representation、zeroization、Native C ABI / WASM ownership、fuzz harness および fixture 実行は Implementation / Test / release verification へ委譲する。
- これらは今回の Specification の外部契約を曖昧にする finding ではなく、本レビューでは成功扱いにしていない。
- `docs/context/design-context.md` は Specification 用の登録がないため、本レビューの対象・根拠・未確認範囲には含めない。

## Scope and Traceability

### 対象境界

Wallet Store v1 の wire-level schema、CBOR validation、unknown field / enum、version / migration、AAD、Profile duplicate、resource limit、mutation / replacement および failure result を対象とした。Core が Store の validity、integrity、consistency、秘密情報保護および replacement の意味を所有し、Application / Binding は opaque blob を保存・転送する責任境界を維持した。保存先、UI、Application / Binding の内部実装、CBOR library、Rust memory technique は対象外である。

### Requirements → Specification

| 上流根拠                | 対象仕様の対応                                                                                                                                        | 判定 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| DR-009、AC-045          | §2、§2.1、§2.2、§11、§13、§14.1。current schema version 内の unknown field wire contract、unsupported reject、no fallback / no implicit migration。   | 適合 |
| SEC-004、AC-017         | §2、§2.1、§4、§7.1、§11〜§12。malformed、unknown enum、index / payload mismatch、AAD / semantic mismatch の Store-wide reject。                       | 適合 |
| SEC-018、AC-038、AC-046 | §2.1、§11、companion §7、§10〜§11。failure 時の secret / normal result / replacement 非返却、partial mutation 非成立、existing committed state 保護。 | 適合 |
| SEC-019、AC-039         | §6、§11。対象 Profile mutation と他 Profile の ciphertext、tag、AAD、wire unknown field および利用可否の分離。                                        | 適合 |

### Design → Specification

| Design の確定事項                                                                                 | 対象仕様の対応                             | 判定 |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| Core が Store validity / integrity / consistency と秘密情報保護を所有                             | §2、§2.1、§11〜§12、companion §7、§10〜§11 | 適合 |
| Application / Binding は opaque Store を mediation し、内部意味・migration・fallback を代替しない | §1、§2、§11、§13、companion §6.3、§7       | 適合 |
| attacker-controlled input、fail-closed、existing committed state 保護                             | §2.1、§2.2、§11、companion §7、§10〜§11    | 適合 |
| version migration 非提供、future migration は将来 version で再定義                                | §2、§11、§13、§14.1、companion §7          | 適合 |

### Companion Specification traceability

Companion Specification §1（L23）は Wallet Store wire-level 仕様の正本を本対象へ置き、§6.3（L236-L254）は `software_key_index` の unknown field を AAD と再出力へ含めること、unknown enum の fatal error、future compatibility 非保証を維持する。§7（L274-L295）は complete deterministic item、`InvalidStore`、child skip 禁止、unknown field preservation、unknown enum の fatal 扱い、受信 wire AAD、migration 非提供および version-specific error を対象仕様へ委譲している。したがって、SR-009 の具体的 type boundary を本対象で明確化することは companion Specification の責任境界と整合し、companion の再設計を必要としない。

## Domain Checks

### SR-009 completion condition

|   # | 確認項目                             | 判定 | 根拠                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --: | ------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | 許可 CBOR type                       | 適合 | §2（L24-L35）が unsigned integer / major type 0、byte string / major type 2、text string / major type 3、array / major type 4、map / major type 5 だけを current schema version 内の unknown field value に許可する。これは known field の schema type を拡張しないと明記されている。                                                                                                                                                                                         |
|   2 | 拒否 CBOR type                       | 適合 | §2（L36-L53）が negative integer / major type 1、CBOR tag / major type 6、floating-point / major type 7、simple value / major type 7、その他の許可集合外 item を `InvalidStore` とする。boolean、null、undefined は simple value の具体例であり、別の追加分類ではない。                                                                                                                                                                                                       |
|   3 | Nested array / map                   | 適合 | §2（L34-L35、L41-L47）と §7.1（L339-L344）が array 要素、map value へ同じ許可集合を再帰適用し、nested map key を unsigned integer に限定する。§2.2（L123-L130）の nesting depth 32 が適用されるため、depth 無制限の任意 CBOR tree を許可していない。                                                                                                                                                                                                                          |
|   4 | RFC 8949 Core Deterministic Encoding | 適合 | §2（L13-L22、L41-L47、L55-L67）が preferred / shortest representation、indefinite-length 禁止、duplicate map key 禁止、complete item、deterministic encoding を unknown / nested value に適用する。map ordering は RFC 8949 §4.2.1 の各 key の deterministic encoding に対する bytewise lexicographic order と明記され、RFC 7049 由来の length-first ordering と混同していない。                                                                                              |
|   5 | Resource limits                      | 適合 | §2.2（L114-L135）が raw Store 16 MiB、Bytes / Text 1 MiB、array / map 256、nesting depth 32 を含む既存表の上限を定め、unknown / nested array / nested map に同じ上限を再帰適用する。length 読取り後かつ allocation 前の検査、Profile / Software Key / ciphertext の既存上限も bypass せず、新しい独自 limit 値を追加していない。                                                                                                                                              |
|   6 | Failure contract                     | 適合 | §2.1（L92-L110）と §11（L611-L617）が type boundary、deterministic encoding、resource limit 違反を skip / warning-only にせず Store 全体 `InvalidStore` とする。§2.1 の secret processing 前 reject、normal result / secret / replacement 非返却、child skip 禁止と §11 の partial mutation / committed state 不変により fail-closed が成立する。                                                                                                                             |
|   7 | Lossless preservation                | 適合 | §2（L62-L65）、§7.1（L337-L344）、§11（L586、L611-L617）が unknown field を意味解釈せず logical model、一覧、duplicate、mapping に使用せず、受理済み key/value と nested wire value を mutation 時に lossless 保持する契約を定める。削除、別 type 変換、normalize を禁止し、保持不能時は `InvalidStore`、partial mutation / committed state 変更なしとする。明示的な Profile delete が対象 envelope 全体を除去することは、この保持契約の operation-defined exception である。 |
|   8 | AAD                                  | 適合 | §11（L565-L590、L611-L617）が `software_key_index` の unknown key/value、nested value、element order、integer key、empty array 表現を含む受信 wire semantics を AAD に反映する。logical model から known field だけを再構築すること、別 type・normalize・`null`・省略表現への変換を禁止している。                                                                                                                                                                             |
|   9 | Unknown enum との区別                | 適合 | §4（L215-L224）と §2（L49-L53、L62-L65）が既知 enum の未割当 unsigned integer を unknown field とせず `InvalidStore` とし、opaque preservation / skip / warning を適用しない。                                                                                                                                                                                                                                                                                                |
|  10 | Future compatibility                 | 適合 | §2（L49-L53）、§11（L615-L621）、§13（L678-L694）が current schema version 内の wire contract だけを対象とし、future Store / Profile version、arbitrary CBOR extension、unknown field の意味解釈、migration、fallback、implicit conversion を保証・追加していない。                                                                                                                                                                                                           |

### Regression review: SR-001〜SR-008

| ID     | Status     | 回帰確認                                                                                                                                                                                                                                                        |
| ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SR-001 | `RESOLVED` | §3.3 の UUID と raw `bytes[16]` の mapping、byte order、case および malformed input の error は変更されていない。                                                                                                                                               |
| SR-002 | `RESOLVED` | §12、§14.1 の `registry_key` / `duplicate_tag`、整合 Store の duplicate 判定、candidate tag 不一致の継続範囲および意味的一致検証は変更されていない。                                                                                                            |
| SR-003 | `RESOLVED` | §2.1、§13、§14.1 の Store / Profile version の missing / type / unsupported error、全体拒否、child skip 禁止、migration 非提供は維持されている。                                                                                                                |
| SR-004 | `RESOLVED` | §2.1、§4、§7.1、§8〜§9 の malformed child、known field、enum、index、order、duplicate、index / payload mapping の fatal validation は維持され、unknown field の追加境界とも混同されない。                                                                       |
| SR-005 | `RESOLVED` | §8、§11〜§12 の AEAD 復号後 payload validation、`duplicate_tag` semantic check、secret / normal result / mutation / replacement 非返却は維持されている。                                                                                                        |
| SR-006 | `RESOLVED` | §2、§7.1、§11 の unknown field logical non-use、非対象 Profile の wire / ciphertext / tag / AAD 保持、対象 Profile の known field canonical regeneration と unknown field lossless preservation、保持不能時 failure は維持され、nested value まで具体化された。 |
| SR-007 | `RESOLVED` | §2、§2.1 の complete Store item 1個、全 bytes 消費、truncated / trailing / multiple item、indefinite / non-shortest / duplicate / float / top-level violation の `InvalidStore` は維持されている。                                                              |
| SR-008 | `RESOLVED` | §2、§11、§13、§14.1 の current version 内限定、future version / schema 非受理、no meaning interpretation、no migration / fallback / implicit conversion は維持されている。                                                                                      |

### Security / Interoperability checks

| 領域                        | 判定 | 確認内容                                                                                                                                                                                                                      |
| --------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CBOR type boundary          | 適合 | Unknown field value と nested value の受理集合・拒否集合が major type と具体例まで閉じている。known field schema type は拡張されていない。                                                                                    |
| Deterministic serialization | 適合 | RFC 8949 Core Deterministic Encoding、preferred / shortest representation、definite length、duplicate 禁止、bytewise lexicographic map ordering、complete item および all-bytes-consumed boundary が一致している。            |
| Resource / DoS boundary     | 適合 | 既存表の raw bytes、Bytes / Text、array / map、depth および各 object 上限が unknown / nested value にも適用され、skip による bypass がない。                                                                                  |
| Unknown field preservation  | 適合 | unknown field は opaque、logical model 非使用、受信 wire semantics の lossless 保持、別 type / normalize / delete 禁止、保持不能時全体 failure が一意である。明示的 Profile delete は対象 envelope 除去として別途定義される。 |
| AAD / domain                | 適合 | `software_key_index` の unknown map key/value、nested value、order、integer key、empty array と受信表現を AAD に含め、logical-only rebuild を禁止している。                                                                   |
| Unknown enum / version      | 適合 | unknown enum は fatal `InvalidStore`、version value-only unsupported は version-specific error、future version / migration / fallback は非提供である。                                                                        |
| Malformed / fail-closed     | 適合 | type、deterministic、resource、structure、semantic mismatch は Store-wide reject、warning / skip 禁止、secret / normal result / replacement 非返却、mutation / committed state 非変更である。                                 |
| Atomic replacement          | 適合 | 成功時のみ complete replacement を返し、対象外 Profile の ciphertext / tag / AAD / unknown wire value を保持し、保持不能時は replacement を返さず existing committed state を変更しない。                                     |
| Companion interoperability  | 適合 | companion §1、§6.3、§7 が Store Format を wire-level 正本として参照し、`InvalidStore`、AAD、unknown field / enum、version / migration、mutation / replacement の意味を上書きしていない。                                      |

## Validation Results

- Markdown structure: 実施。共通 output format の18章を指定順で構成し、各章の存在、SR-001〜SR-009 の一意性、finding 必須項目および Gate / Final Decision の整合を確認した。
- Relative links: 実施。成果物内の repository-relative Markdown link の対象存在を確認し、RFC は外部の公式 HTTPS link とした。
- Finding IDs: 実施。`SR-001`〜`SR-009` を各1件の Finding Status として記録し、重複 ID を作成していない。SR-009 は `RESOLVED`、新規 finding はなし。
- Severity / Gate consistency: 実施。過去 finding の Severity は履歴として保持し、current formal finding count は `Critical / Major / Minor = 0 / 0 / 0`。`Critical = 0` により Review Result / Gate は `READY` とした。
- Scope check: 実施。レビュー中の変更対象は新規 review artifact のみであり、target、companion、Requirements、Design、Implementation、Test、Fixture、README および過去 review は変更していない。
- `git diff --check`: 実施。今回の artifact を含む unstaged diff の whitespace error は検出されなかった。
- `git diff --cached --check`: 実施。commit 前に artifact を stage した状態で実行し、whitespace error は検出されなかった。
- Prettier: 実施。`prettier --check docs` は repository baseline の既存 63 files（target Specification、Requirements / Design、過去 review artifact 等を含む）で failure となった。本 artifact は `prettier --check docs/reviews/specifications/wallet-store-format-v1-review-004.md` を単体実行して pass しており、baseline failure と artifact 固有 failure を混同していない。
- Rust / WASM build、lint、test: 未実行。コード変更はなく、ユーザー指定どおり不要とした。
- Implementation / Test / Fixture validation: 未実行。レビュー対象外であり、Specification の正当化根拠にしていない。

## Review Gates

| Gate                  | 結果 | 根拠                                                                                                                                                                                     | 対応 ID |
| --------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1. 目的と範囲         | 合格 | §1〜§2 と companion §1〜§2 が Core、Application / Binding、opaque Store、current wire scope および対象外を定める。                                                                       | なし    |
| 2. 契約               | 合格 | §2〜§14、特に §2、§2.1、§2.2、§7.1、§11、§13 が type、nested value、map key、resource、AAD、unknown enum、version、error、replacement を定める。                                         | なし    |
| 3. 処理と例外         | 合格 | malformed / deterministic / resource / semantic violation の全体 `InvalidStore`、skip / warning 禁止、secret / replacement 非返却、partial mutation / committed state 不変が一意である。 | なし    |
| 4. 内部整合性         | 合格 | unknown field の current-version boundary、unknown enum、AAD wire semantics、deterministic ordering、resource limits、atomic replacement、future compatibility に相互矛盾はない。        | なし    |
| 5. 検証可能性         | 合格 | 許可・拒否 type、再帰、depth、RFC 8949 ordering、上限、AAD、lossless preservation、version、negative / fail-closed 条件を独立に検証できる。                                              | なし    |
| 6. 安全性と相互運用性 | 合格 | attacker-controlled input、opaque preservation、AAD、unknown enum、no fallback、secret 非返却、atomic visible result、RFC 8949 wire semantics および companion boundary が定義される。   | なし    |
| 7. 上流整合性         | 合格 | Requirements DR-009 / AC-045、Design の Store ownership / reject / no migration invariant、companion Specification review-012 の `READY` と整合する。                                    | なし    |

Formal Gate: **`READY`**。Critical は0件であり、Major / Minor の未解決 finding もないため、現行 Gate policy に適合する。

## Remaining Risks and Open Decisions

- Store-format-level Open Decision: 0。SR-009 の type boundary、nested validation、deterministic encoding、resource、AAD、preservation、unknown enum、future compatibility の判断は現行仕様で完了している。
- Upstream Feedback: 0。現行上流資料に、今回の clarification を妨げる欠落・曖昧さ・矛盾はない。
- Security / interoperability blocking gap: 0。unknown field の受理・拒否、AAD wire binding、lossless mutation、unknown enum、version boundary、fail-closed replacement は独立実装間で判定可能である。
- 残存する下流リスク: 実装が recursive type validation、resource limit、raw wire preservation、AAD、CBOR deterministic encoding、secret lifecycle および binding ownership を実際に満たすかは、Implementation / Test / release verification で独立に確認する必要がある。
- `WALLET STORE FORMAT V1 READY`: 宣言できる。これは本 review の Specification contract 判定であり、Implementation / Test / Fixture の適合性を含意しない。
- `SPECIFICATION PHASE READY TO CLOSE`: 宣言できる。Store Format review が `READY`、companion Specification review-012 が `READY` であることに基づく。本宣言は下流実装・release verification の完了を意味しない。

## Automatic Changes

レビュー中に変更したのは、新規 review artifact `docs/reviews/specifications/wallet-store-format-v1-review-004.md` のみである。`wallet-store-format-v1.md`、`specification.md`、Concept、Requirements、Design、Implementation、Test、Fixture、README および過去 review は変更していない。

## Final Decision

`READY`

**WALLET STORE FORMAT V1 READY**

**SPECIFICATION PHASE READY TO CLOSE**

SR-001〜SR-009 はすべて `RESOLVED`。今回の SR-009 修正は許可 CBOR type、拒否 CBOR type、nested array / map、RFC 8949 Core Deterministic Encoding、resource limit、fail-closed、lossless preservation、AAD、unknown enum、future compatibility を明確化し、SR-001〜SR-008、deterministic CBOR、AAD、unknown field preservation、versioning、atomic replacement に回帰を生じさせていない。新規 finding、Upstream Feedback、Store-format-level Open Decision および security / interoperability blocking gap はない。Current formal finding count は `Critical / Major / Minor = 0 / 0 / 0` である。
