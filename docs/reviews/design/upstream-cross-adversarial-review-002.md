# Upstream Cross-Phase and Adversarial Design Review 002

## Review Target

- 対象: [`docs/consept/concept-sheet.md`](../../consept/concept-sheet.md)、[`docs/requirements/requirements.md`](../../requirements/requirements.md)、[`docs/design/architecture.md`](../../design/architecture.md)、[`docs/design/security.md`](../../design/security.md)、[`docs/design/bindings.md`](../../design/bindings.md)
- 確認日: 2026-08-30
- 成果物: `docs/reviews/design/upstream-cross-adversarial-review-002.md`
- 再確認対象 commit: `44cbe44f92f9cb31b5608941100fc601fd64e4f4`
- Review Scope: Concept → Requirements → Design の横断再レビュー、Requirements → Design の追跡、責任・ownership・trust boundary・security invariant・lifecycle・failure・Store・assertion・handoff の敵対再レビュー。Review 001 の DR-XA-001〜004 の独立再評価を含む。
- Downstream consistency check: [`docs/specifications/specification.md`](../../specifications/specification.md) と [`docs/specifications/wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) は、今回の上流変更から派生する修正箇所を抽出するためだけに参照した。Specification / Wallet Store Format 自体の独立レビューは行っていない。
- Implementation exclusion: Rust implementation、Native C ABI、WASM、tests、fixtures、README、依存関係は対象外であり、finding の根拠にしていない。
- 未確認範囲: 実装が上流 invariant を満たすか、実 Application / UI が利用者へ表示・確認したか、host compromise 防止、実際の parser / FFI / memory / zeroization / side-channel、外部 node および Specification / Wallet Store Format の独立適合性。

## Execution Audit

- 実行モード: サブエージェントを使用しない自己レビュー。実施していないサブエージェントや投票は記録していない。
- Reviewer A（Concept と構造・責務）: 完了。Concept の目的・v1 境界・Core / Application / Binding の責任、Profile model、Chain / Network 分離および Design の責任逆流を確認した。
- Reviewer B（Requirements と Security primary）: 完了。FR-007、FR-009、FR-012、FR-017、FR-019、SEC-002、SEC-004、SEC-005、SEC-010、SEC-017〜SEC-023、AC-001、AC-012、AC-018、AC-034、AC-048〜AC-050 を中心に protected asset、authorization、assertion、Store、failure safety、side-channel boundary を確認した。
- Reviewer C（フロー・運用・敵対シナリオ）: 完了。generated handoff、restore、delete、replacement、storage failure、retry、restart、pending および8つの adversarial scenario を再実行した。
- Reviewer D（traceability・下流 handoff）: 完了。Concept → Requirements、Requirements → Architecture / Security / Bindings、Design → Specification の引継ぎを確認し、downstream の明確な不整合だけを別 lane に分離した。
- Chair 統合: 完了。Review 001 の指摘を現行本文へ独立に再追跡し、同一 root cause の再計上を避けた。Application compromise の完全防止、具体的 constant-time 方式、Store generation counter は新しい要求や finding にしていない。

## Evidence Used

| 種別 | Reviewed Documents / 参照箇所 | 用途 |
| --- | --- | --- |
| Review rules | [`AGENTS.md`](../../../AGENTS.md)、[`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、Concept / Requirements / Design Review の Skill、reviewers、security-checklist、review-gates、output-format | Phase boundary、finding 採用条件、標準 severity / gate、Security domain、出力構成、変更範囲を確認 |
| Phase Context | なし | `AGENTS.md` に対象 Phase Context の登録がないため使用していない |
| Previous review | [`upstream-cross-adversarial-review-001.md`](upstream-cross-adversarial-review-001.md) | DR-XA-001〜004 の初出内容、severity、根拠、完了条件および downstream impact を履歴として確認 |
| Reviewed commit | `44cbe44f92f9cb31b5608941100fc601fd64e4f4` | Requirements、Architecture、Security Design、Bindings Design の4ファイルだけが変更されたことを確認 |
| Primary Concept | [`concept-sheet.md:86-140`](../../consept/concept-sheet.md#L86)、[`concept-sheet.md:142-169`](../../consept/concept-sheet.md#L142) | v1 の対象・対象外、Core 継続 ownership、通常非開示、外部責任および後続工程委譲を確認 |
| Primary Requirements | [`requirements.md:25-107`](../../requirements/requirements.md#L25)、[`requirements.md:135-191`](../../requirements/requirements.md#L135)、[`requirements.md:195-222`](../../requirements/requirements.md#L195)、[`requirements.md:238-263`](../../requirements/requirements.md#L238)、[`requirements.md:283-356`](../../requirements/requirements.md#L283) | Profile model、handoff、restore、per-operation authorization、Store boundary、SEC-023、acceptance、責任および failure invariant を確認 |
| Primary Architecture | [`architecture.md:54-114`](../../design/architecture.md#L54)、[`architecture.md:118-168`](../../design/architecture.md#L118)、[`architecture.md:170-224`](../../design/architecture.md#L170)、[`architecture.md:228-314`](../../design/architecture.md#L228)、[`architecture.md:316-386`](../../design/architecture.md#L316) | context、ownership、current Store authority、handoff、signing / export、retry / restart、Chain / Network および downstream handoff を確認 |
| Primary Security Design | [`security.md:55-95`](../../design/security.md#L55)、[`security.md:97-180`](../../design/security.md#L97)、[`security.md:182-219`](../../design/security.md#L182)、[`security.md:221-270`](../../design/security.md#L221)、[`security.md:272-315`](../../design/security.md#L272)、[`security.md:317-373`](../../design/security.md#L317) | protected asset、secret ownership、authorization、handoff、Store rollback boundary、assertion、SEC-023、failure および保証外範囲を確認 |
| Primary Bindings Design | [`bindings.md:52-98`](../../design/bindings.md#L52)、[`bindings.md:100-169`](../../design/bindings.md#L100)、[`bindings.md:173-247`](../../design/bindings.md#L173)、[`bindings.md:249-284`](../../design/bindings.md#L249)、[`bindings.md:286-347`](../../design/bindings.md#L286) | Binding non-authority、opaque Store、handoff、export、signing、retry / restart、failure-safe mediation および Native / WASM parity を確認 |
| Downstream evidence | [`specification.md:299-347`](../../specifications/specification.md#L299)、[`specification.md:385-452`](../../specifications/specification.md#L385)、[`specification.md:721-739`](../../specifications/specification.md#L721)、[`specification.md:898-952`](../../specifications/specification.md#L898)、[`wallet-store-format-v1.md:661-710`](../../specifications/wallet-store-format-v1.md#L661) | 上流の全生成 handoff、assertion boundary、current Store / rollback boundary、side-channel handoff、wire schema への影響だけを抽出 |

## Review Result

`READY`

これは applicable Design Review Skill の標準値である。`Critical = 0` であり、Major / Minor のみでは標準 Gate を不合格にしない。今回の横断 Gate の値は `UPSTREAM DESIGN READY` とし、downstream consistency check で抽出した Specification realignment は本レビューの upstream Gate を阻害しない。

## Summary

Review 001 の4件は、現行 Concept → Requirements → Design の上流範囲で解消されている。

- DR-XA-001 は、Core が current operation の Store validity / integrity / consistency / mutation を扱う stateless opaque processor であり、current Store authority、replacement 適用、stale / historical Store の再適用防止は Application / persistence layer の責任であることが、Requirements、Architecture、Security、Bindings に一致して記載されている。削除後に `S0` を再提示するシナリオは Application responsibility violation として一意に説明でき、`S0` を malformed と誤分類しない。
- DR-XA-002 は、Core の per-operation password authorization / pending 非昇格と、Application の current operation に対する assertion freshness 管理を分離している。Core に persistent unlock や authorization carry-over はなく、v1 に challenge / nonce / expiry / one-shot token を追加しない境界も一致している。
- DR-XA-003 は `SEC-023` が Requirements の normative source となり、`AC-049`、Security Design §8.1、Architecture / Bindings の下流委譲へ追跡できる。Core 自身の不要な secret-dependent behavior は責任範囲に残し、third-party library、compiler、runtime、OS、browser、hardware、CPU microarchitecture の完全保証は明示的に除外している。
- DR-XA-004 は、Core が Mnemonic を新規生成する全 Profile creation で handoff confirmation を必須とし、restore は生成時 handoff の対象外とする形に全 primary documents が一致している。Bindings Design にも同じ6段階が反映されている。

新規の上流 Critical / Major / Minor finding はない。Downstream には、Specification §8.2 の古い一文（`新規生成時の backup confirmation は要求しない`）と、SEC-023 の明示的な検証引継ぎ不足が残る。これは Specification の次工程で修正・再レビューする事項であり、今回の primary target の defect や DR-XA-004 の再発とは扱わない。

## Finding Status

Formal findings: `Critical 0 / Major 0 / Minor 0`。Review 001 の4件は、現行本文の独立再評価によりすべて `RESOLVED` と判定した。新規 ID はない。

| ID | Classification | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- | --- |
| DR-XA-001 | Adversarial design weakness / Requirements-to-Design gap | Critical | `RESOLVED` | upstream-cross-adversarial-review-001 | current Store authority、replacement 適用、historical rollback prevention を Application / persistence layer に置き、Core が過去 snapshot を記憶・判定しないことを4資料で一致させた。`S0` 再提示は residual risk / Application responsibility として明示されている。 |
| DR-XA-002 | Adversarial design weakness / Requirements open decision | Major | `RESOLVED` | upstream-cross-adversarial-review-001 | Application assertion freshness と Core per-operation authorization の保証境界、target / payload / AccountContext validation、pending 非昇格、retry / restart の非継承および v1 の no-token 方針が一致している。 |
| DR-XA-003 | Requirements omission / Security Design scope expansion | Major | `RESOLVED` | upstream-cross-adversarial-review-001 | `SEC-023` / `AC-049` が normative source となり、Security Design §8.1 と downstream verification へ逆 trace できる。保証外の対象も Requirements / Design に明記されている。 |
| DR-XA-004 | Cross-document contradiction / Bindings Design gap | Major | `RESOLVED` | upstream-cross-adversarial-review-001 | Requirements、Architecture、Security、Bindings が「全新規生成は handoff 必須、restore は対象外」で一致した。Specification の stale sentence は別工程の deferred downstream inconsistency であり、上流 finding の再発ではない。 |

## Required Changes

なし。applicable Design Review Skill で Required Changes に該当する `Critical` の New / Open / Reopened は存在しない。

## Optional Improvements

なし。Review 001 の Major 3件は上流本文上解消されている。下流 Specification の整合化は次工程への委譲であり、上流の Optional Improvement として重複計上しない。

## Resolved Findings

### DR-XA-001 — Valid historical Store rollback と deletion invariant

- Severity / Status: `Critical / RESOLVED`
- 対象箇所: [`requirements.md:210`](../../requirements/requirements.md#L210)、[`requirements.md:215`](../../requirements/requirements.md#L215)、[`requirements.md:246`](../../requirements/requirements.md#L246)、[`requirements.md:304`](../../requirements/requirements.md#L304)、[`requirements.md:333-356`](../../requirements/requirements.md#L333)、[`architecture.md:114`](../../design/architecture.md#L114)、[`architecture.md:196-212`](../../design/architecture.md#L196)、[`security.md:241-253`](../../design/security.md#L241)、[`bindings.md:165-171`](../../design/bindings.md#L165)
- 発生条件または確認できた事実: Core は現在 operation に入力された Store の validity、authentication / integrity、consistency および mutation を処理する。Application / persistence layer は current Store authority として、成功 replacement の適用、stale / historical Store の再適用防止および最新版 snapshot 管理を担う。Core は返却済み snapshot を永続記憶せず、valid historical Store の freshness / rollback を単独で検出・拒否しない。
- 敵対シナリオ: 削除前 Store を `S0`、削除成功 replacement を `S1` とする。Application が後から `S0` を Core へ再提示した場合、Core が `S0` を historical であることだけを理由に検出・拒否する保証はない。この事象は Application / persistence layer が current Store authority として stale / historical Store の再適用を防止しなかった責任違反である。暗号認証・構造・整合性に成功する `S0` は malformed / tampered Store ではない。
- 根拠と影響: `FR-012` / `SEC-005` / `AC-012` / `AC-018` / `AC-048` は、正しく選択された current committed state と成功 replacement に対する deletion guarantee と、valid historical Store の currentness 非保証を分けている。従って deletion 後に `S0` が受理され得ることは、現行の Core current-operation validity contract と矛盾しない。malformed / tampered / authentication failure / unsupported version の fail-closed は `SEC-004`、`DR-009`、`SEC-018` により維持される。
- 責任境界: Core は論理 Store の validity / security meaning、削除 mutation、成功 replacement の生成を所有する。Application / persistence layer は current Store の選択・保存・適用と historical rollback prevention を所有する。Binding は Store を opaque に搬送し、rollback authority を持たない。
- 必要な最小修正または確認: 追加修正は不要。下流仕様では current Store authority と valid historical Store の保証外範囲を明示し、wire schema に currentness を暗黙導入しないことを確認する。
- 完了条件: `S0` 再提示について、Core が historical rollback を検出すると誤って保証せず、Application responsibility violation と説明し、`S0` を malformed 扱いせず、Core の current-operation validity と deletion replacement invariant を同時に追跡できること。現行本文で満たす。
- Residual risk: Application / persistence が current Store authority を正しく実装しない場合、valid historical Store の再適用を Core が防止しない。これは明示された v1 residual risk であり、rollback counter 不在だけを理由に再度 finding にしない。

### DR-XA-002 — Confirmation / approval assertion freshness

- Severity / Status: `Major / RESOLVED`
- 対象箇所: [`requirements.md:74`](../../requirements/requirements.md#L74)、[`requirements.md:84`](../../requirements/requirements.md#L84)、[`requirements.md:169`](../../requirements/requirements.md#L169)、[`requirements.md:199-221`](../../requirements/requirements.md#L199)、[`requirements.md:261-263`](../../requirements/requirements.md#L261)、[`requirements.md:335`](../../requirements/requirements.md#L335)、[`architecture.md:261-314`](../../design/architecture.md#L261)、[`security.md:164-180`](../../design/security.md#L164)、[`security.md:199-239`](../../design/security.md#L199)、[`security.md:255-270`](../../design/security.md#L255)、[`bindings.md:73-84`](../../design/bindings.md#L73)、[`bindings.md:189-247`](../../design/bindings.md#L189)
- 発生条件または確認できた事実: Application / UI は handoff、export、signing の現在 operation に対する confirmation / approval assertion の freshness を管理し、過去の `Approved`、`Confirmed`、`Requested` を新しい利用者意思として再利用しない。Core は target、payload、AccountContext、渡された assertion、per-operation password authorization および pending / committed 条件を検証するが、UI 表示・人間の操作・Application 内保存を独立証明しない。
- Core の境界: Core 自身の password authorization、unlock state、pending、secret-capable state は retry / restart / 次 operation へ暗黙継承しない。password の正しさは user intent や signing approval の代替ではない。v1 Core は challenge、nonce、expiry、one-shot token を追加しない。
- 敵対シナリオ: 悪意ある Application が過去の `Approved` / `Confirmed` / `Requested` を保存して再提出した場合、Core がその Application compromise を完全に防止する保証はない。一方、Application が assertion を stale のまま使うことは Application responsibility violation であり、Core が自身の authorization state を暗黙継承することとは別である。target / payload / AccountContext の転用は Core の request validation で拒否される範囲が残る。
- 必要な最小修正または確認: 追加修正は不要。下流仕様は status、target、payload、context を省略・補正せず、Application assertion と Core authorization を別条件として維持する。
- 完了条件: handoff、export、signing の同一 request 再送、古い status の再使用、target / payload 変更、restart 後の再提示について、Core-owned implicit replay と Application assertion replay を分離して説明できること。現行本文で満たす。
- Residual risk: Core は Application が実際に表示・確認・承認したこと、または assertion が fresh であることを暗号学的に証明しない。これは明示的な trust boundary であり、Application compromise 完全防止の新規要求は導入しない。

### DR-XA-003 — Side-channel normative source

- Severity / Status: `Major / RESOLVED`
- 対象箇所: [`requirements.md:17-19`](../../requirements/requirements.md#L17)、[`requirements.md:238-263`](../../requirements/requirements.md#L238)、[`requirements.md:334`](../../requirements/requirements.md#L334)、[`requirements.md:377-387`](../../requirements/requirements.md#L377)、[`architecture.md:390-405`](../../design/architecture.md#L390)、[`security.md:287-315`](../../design/security.md#L287)、[`security.md:343-369`](../../design/security.md#L343)、[`bindings.md:331-337`](../../design/bindings.md#L331)
- 発生条件または確認できた事実: `SEC-023` は Core 自身が実装・管理する秘密情報処理について、不要な secret-dependent control flow、timing behavior、data access を導入しないことを MUST とし、`AC-049` が確認可能な acceptance condition を置く。Security Design §8.1 はこれを Core responsibility として明示し、Specification / Implementation / release verification へ具体方式を委譲する。
- 保証境界: third-party cryptographic library、compiler、runtime、OS、browser、hardware、CPU microarchitecture の完全な side-channel absence は保証対象外である。特定 library、assembly inspection、fork、zeroization technique、compiler option、test tool は上流で固定しない。
- Traceability 判定: normative source は Requirements `SEC-023`、acceptance は `AC-049`、設計責任は Security Design §8.1、具体検証は downstream という一本の経路になっている。Architecture はこれを過剰に「完全な side-channel absence」と保証せず、Bindings は Core responsibility を代替しない。Architecture の traceability row は Core ownership と下流 handoff を指すものとして扱え、Security Design の property と矛盾しない。
- 必要な最小修正または確認: 追加修正は不要。次工程で `SEC-023` の具体検証責任と保証外範囲を Specification / Implementation / release verification へ引き継ぐ。
- 完了条件: Concept / Requirements / Design のいずれが property、責任主体、保証外範囲および downstream handoff を規範化するかが一意で、Design → Requirements の逆 trace が成立すること。現行本文で満たす。

### DR-XA-004 — New Mnemonic handoff の適用範囲

- Severity / Status: `Major / RESOLVED`
- 対象箇所: [`requirements.md:135-149`](../../requirements/requirements.md#L135)、[`requirements.md:199`](../../requirements/requirements.md#L199)、[`requirements.md:217`](../../requirements/requirements.md#L217)、[`requirements.md:287`](../../requirements/requirements.md#L287)、[`requirements.md:320`](../../requirements/requirements.md#L320)、[`architecture.md:228-243`](../../design/architecture.md#L228)、[`security.md:182-197`](../../design/security.md#L182)、[`bindings.md:127-136`](../../design/bindings.md#L127)、[`bindings.md:201-214`](../../design/bindings.md#L201)
- 発生条件または確認できた事実: Requirements、Architecture、Security Design、Bindings Design はすべて、Core が Mnemonic を新規生成する全 Profile creation について、Core generate → intended Application handoff → intended user presentation → explicit receipt confirmation → Application confirmation → Core finalization の6段階を成功境界とする。handoff を行わない新規生成成功経路はない。
- Restore との区別: 既存 Mnemonic restore は新規生成時 handoff confirmation の対象外であり、Mnemonic validity、password、Store、duplicate 等の通常 restore 条件で処理する。この区別は Requirements、Architecture、Security、Bindings で一致する。
- 敵対・失敗シナリオ: handoff interrupted、presentation failure、confirmation refused / missing、confirmation transmission failure、finalization failure は committed Profile success にならず、Mnemonic / partial state を通常結果・diagnostic・継続可能状態へ残さない。Binding は handoff success、confirmation freshness、Profile success を独自に生成・昇格しない。
- 必要な最小修正または確認: 上流の追加修正は不要。Specification の stale sentence は downstream realignment として次工程で修正する。
- 完了条件: 新規生成の backup request 有無にかかわらず handoff 必須、restore は handoff 対象外、handoff failure / refusal / restart は committed success なし、という結果を Concept → Requirements → Design で一意に追跡できること。上流側で満たす。
- Downstream note: [`specification.md:333`](../../specifications/specification.md#L333) の `新規生成時の backup confirmation は要求しない` は、現行上流の「全新規生成 handoff 必須」と整合しない。これは DR-XA-004 を Reopened とするものではなく、Specification Realignment の deferred item である。

## Upstream Feedback

なし。今回の再評価では、上流正式資料の不足・曖昧さ・矛盾を理由とする追加 feedback は残っていない。既存 Review 001 の clarification は Requirements / Design 本文へ反映されている。

## Deferred Findings

以下は upstream の formal finding ではなく、Specification および後続工程への引継ぎ事項である。

- `specification.md:299-329` の generated Profile prepare / finalize は全生成 handoff と整合するため、その境界を維持する。`specification.md:333` の restore 節末尾に残る「新規生成時の backup confirmation は要求しない」は、restore では handoff を要求しないという意味へ書き換える必要がある。
- `specification.md:385-452` の HandoffConfirmation、ExportRequest、SigningRequest は、status、target、payload、AccountContext を Application assertion として扱い、Core が UI 操作や freshness を独立証明しない上流境界と整合させる必要がある。v1 に challenge / nonce / expiry / one-shot token を追加する必要は、上流方針からは生じない。
- `specification.md:721-739` の committed / pending、atomicity、retry / restart 契約へ、Core の current-operation Store validity と Application / persistence の current Store authority、valid historical Store rollback の保証外範囲を明示的に反映する必要がある。Core に generation counter や hidden history を要求する変更は不要である。
- `specification.md:898-952` およびその traceability へ `SEC-023` / `AC-049` の Core 自身に対する side-channel property、具体方式の downstream 委譲、third-party / compiler / runtime / OS / browser / hardware / CPU microarchitecture の保証外範囲を追加確認する必要がある。現行のセキュリティ・状態遷移テスト一覧には side-channel の明示的引継ぎがない。具体 technique は Specification / Implementation / release verification で決める。
- Implementation Review では、Core の actual authorization / pending non-reuse、Store fail-closed、replacement handoff、Application assertion transport、Native / WASM parity、secret copy / lifetime、実際の side-channel および FFI / memory safety を確認する。ただし今回の artifact はそれらを合否判定していない。

## Scope and Traceability

### Concept → Requirements

| Concept の根拠 | Requirements の反映 | 判定 |
| --- | --- | --- |
| Concept §1、§3、§7、§8: Core が Mnemonic / Software Key を継続管理し、通常処理で秘密情報を返さない | Requirements §2.2〜§2.4、FR-002、FR-006〜FR-008、SEC-001〜SEC-003、SEC-010〜SEC-020 | 一貫。handoff / export は通常処理と区別した明示的例外で、ownership は Core に残る |
| Concept §7、§12、§13: 明示的 secret access の可否・認可・受渡しは Requirements / Design で決める | UC-001 / UC-011、FR-001、FR-019、FR-022〜FR-023、SEC-010、SEC-021、AC-001、AC-034、AC-041〜AC-043 | 一貫。新規生成全件の handoff 必須という決定は Concept が後続工程へ委譲した範囲内 |
| Concept §7、§9、§10: UI / Application、Browser、OS の責任と host compromise 非保証 | Requirements §2.4〜§2.5、NFR-002〜NFR-004、SEC-011、SEC-017、SEC-020 | 一貫。host 非保証が Core / Binding の通常非開示を弱めていない |
| Concept §3、§7、§9: Symbol / NEM と Mainnet / Testnet を混同しない | Requirements §2.1、§3.1〜§3.3、FR-013、FR-024、DR-005、AC-013、AC-047 | 一貫。Profile は Network 固定、Software Key は Chain 固定 |

### Requirements → Architecture

| Requirements | Architecture の配置 | 判定 |
| --- | --- | --- |
| FR-007、SEC-002、SEC-007、SEC-014: per-operation password authorization、no persistent unlock | §3.2、§4.1〜§4.2、§6.5 | 一貫。Core が operation ごとに認証し、retry / restart で暗黙継承しない |
| FR-001、FR-019、SEC-010、SEC-017〜SEC-018、AC-001、AC-034: generated handoff / restore distinction | §4.3、§5.3、§6.1 | 一貫。全新規生成に handoff、restore は対象外 |
| FR-012、FR-017、SEC-004〜SEC-005、SEC-018、AC-012、AC-018、AC-048: Store validity と currentness の責任分離 | §3.3、§4.1、§4.3〜§4.4、§5.2、§6.2、§9.3〜§9.4 | 一貫。Core は logical Store meaning、Application / persistence は current Store authority |
| FR-009、SEC-021〜SEC-022、AC-050: assertion freshness と signing / export approval | §4.3、§6.3〜§6.5、§9.2 | 一貫。Application assertion と Core authorization を分離 |
| SEC-023、AC-049: Core secret processing side-channel property | §4.1、§8、§10、§11.1 | 過剰保証なし。normative detail は Security Design §8.1 と Requirements にあり、Architecture は downstream handoff を担う |

### Requirements → Security Design

| Requirements | Security Design の配置 | 判定 |
| --- | --- | --- |
| SEC-001〜SEC-003、SEC-010〜SEC-020: protected asset、non-disclosure、lifecycle、failure safety | §3.2、§4、§5.1〜§5.2、§6.6、§8.2〜§8.3 | 一貫。Mnemonic、Software Key、password、derived / decrypted material、Store の owner と lifecycle が分かれている |
| SEC-002、SEC-007、SEC-014、AC-007、AC-031: Core authorization | §6.1、§9.2、§10 | 一貫。persistent unlock、authorization cache、cross-operation carry-over を許容しない |
| SEC-005、SEC-018、AC-012、AC-048: delete / replacement / historical rollback | §3.1〜§3.2、§5.1、§6.5〜§6.6、§9.3 | 一貫。valid historical Store は Application responsibility / Core guarantee 外 |
| SEC-021、SEC-022、AC-050: confirmation / approval assertion | §3.2、§6.1、§6.3〜§6.4、§9.2 | 一貫。Core は assertion freshness と UI の事実を独立証明しない |
| SEC-023、AC-049: side-channel normative source | §8.1、§8.3、§9.4、§10 | 一貫。Core 自身の不要な秘密依存処理だけを対象とし、具体方式は downstream |

### Requirements → Bindings Design

| Requirements | Bindings Design の配置 | 判定 |
| --- | --- | --- |
| NFR-001〜NFR-004、SEC-011〜SEC-012、SEC-017、SEC-020 | §3.1〜§3.2、§4.2〜§4.4、§5.1、§8 | 一貫。Binding は transport / representation / ownership mediation であり security authority ではない |
| FR-019、SEC-010、AC-034: generated handoff / restore | §4.3、§6.3 | 一貫。全新規生成で6段階を維持し、restore は対象外 |
| FR-007、SEC-002、SEC-014、AC-007、AC-031 | §3.1、§6.2、§6.6 | 一貫。Binding は unlock session / authorization cache を持たない |
| FR-009、SEC-022、AC-009、AC-050 | §3.1、§6.5 | 一貫。Binding は approval / freshness を生成・判断・補正しない |
| FR-012、FR-017、SEC-004〜SEC-005、AC-048 | §3.1、§5.2、§6.6、§9.3 | 一貫。Store は opaque、rollback authority は Application / persistence |
| SEC-023、AC-049 | §8.1、§10.2 | 一貫。Binding は Core side-channel responsibility を代替せず、具体検証は downstream |

### Downstream traceability

上流から下流へ渡す invariant は、(1) 全新規生成の handoff 必須、restore の handoff 対象外、(2) Core の per-operation authorization と Application assertion freshness の分離、(3) Store validity と current Store authority の分離、(4) Core 自身に対する SEC-023 と保証外範囲、(5) Binding non-authority / fail-safe mediation である。これらは Specification で具体 API / DTO / error / pending / replacement 契約へ落とすが、下流の stale sentence は上流の判断を変更しない。

## Domain Checks

### Core ownership consistency

- Mnemonic の生成、復元、取込み後の継続管理は Core に残る。
- Derived / Imported / Generated Software Key、private key、signing primitive、Profile password authorization、Store validity / integrity / consistency は Core の責任である。
- Core は hidden persistent state、過去 Store history、persistent unlock、authorization cache を要求されていない。
- Core の logical Store ownership と Application の current Store authority は、logical meaning と persistence currentness の分離として矛盾しない。

### Application responsibility consistency

- Application / UI は Account 選択、公開情報と payload の表示、handoff presentation、user confirmation、export request、signing approval を担う。
- Application / persistence layer は current Store の選択、successful replacement の適用・保存、stale / historical Store の再適用防止、snapshot の最新版管理を担う。
- Application は Core secret の継続 owner、signing authority、password authorization、Store validity authority ではない。
- Assertion freshness は Application responsibility であり、Core が UI の実行事実を完全証明する設計にはなっていない。

### Binding responsibility consistency

- Native / WASM Binding は representation、transport、ownership / lifecycle、error / warning mediation に限定される。
- Binding は field omission、status rewrite、target correction、Store interpretation、独自 encryption / key management / authorization / migration を正当な authority として持たない。
- Binding 自身が検出できる malformed / conversion / ownership failure は fail-safe に扱い、Core の error / warning / success meaning を変更しない。
- Native と WASM で Core policy、secret exposure、authorization、failure meaning を分岐させない。

### Profile and Chain / Network model

- Profile は Network（Mainnet / Testnet）に固定され、Chain（Symbol / NEM）には固定されない。
- Profile は Mnemonic を1つ持つ。Software Key は Derived / Imported / Generated のいずれでも Chain に固定される。
- Account は Software Key を fixed Chain と Profile fixed Network 上で利用する概念である。
- Symbol / NEM、Mainnet / Testnet の mismatch、unsupported、implicit conversion、fallback、inference を許容しない。

### Store and secret lifecycle

- Wallet Store は opaque boundary であり、Application / Binding は内部を解釈・編集しない。
- malformed、tampered、inconsistent、unsupported version は Core が fail-closed に拒否し、reject 時に秘密情報・正常結果・replacement を返さず、既存状態を変更しない。
- valid historical Store は malformed / tampered と区別され、Core の freshness / rollback guarantee 外である。
- handoff、restore、export、signing、delete、replacement、retry、restart の各 lifecycle で、失敗時に partial success、secret output、継続 authorization を残さない境界がある。
- 通常処理で秘密情報を開示せず、handoff / explicit export の成功結果だけが明示例外である。persistent unlock は提供しない。

### Security domain checks

適用した主要観点は protected assets、confidentiality、integrity、authentication / authorization、secret lifecycle、trust / responsibility boundary、failure safety、input / attacker boundary、recoverability、Chain / Network separation、security responsibility / non-goals、side-channel guarantee boundary である。Specific library、KDF、AEAD、nonce、zeroization、memory layout、FFI、test technique は本レビューの formal finding 根拠にしていない。

### Adversarial Scenario Results

| Scenario | Core が防ぐ / 保証する範囲 | Application / Binding / residual boundary | 判定 |
| --- | --- | --- | --- |
| 1. Malicious Application: false / stale approval、false confirmation、wrong target / payload / AccountContext、stale Store | Core は per-operation password、必須 status、target、payload、AccountContext、Profile / key / Chain / Network、Store validity を検証し、pending を未確認のまま昇格しない。wrong target / payload / context の不一致は拒否対象である。 | UI を実際に表示したか、利用者が承認・確認したか、Application assertion が fresh か、current Store として S0 を再提示しないかは Application responsibility。悪意ある Application の完全防止は保証外。 | 上流境界は一意。新規 finding なし |
| 2. Compromised Binding: field omission、target / status rewrite、Store interpretation、authority acquisition | Binding は field / status / target / payload / AccountContext の意味を省略・書換え・補正せず、Core の結果を同じ意味で伝える設計。検出可能な conversion failure は fail-safe。Core が独自に authorization / Store validity / cryptographic meaning を所有する。 | 侵害された host / Binding が valid request を別の valid request へ書き換える能力を暗号学的に完全防止する保証はない。これは Binding に authority を与えたことではなく、host compromise limitation。 | non-authority と downstream parity の境界は合格 |
| 3. Attacker-controlled Store: malformed、tampered、inconsistent、unsupported version、valid historical Store | 前4つは Core の version / structure / integrity / consistency / authentication 検証で fail-closed、no mutation、no secret result。valid historical Store は cryptographically valid なら単独では拒否しない。 | current Store selection、successful replacement の適用、stale / historical reapplication prevention は Application / persistence。wire schema に currentness counter を追加する要求はない。 | rollback residual を明示。再発なし |
| 4. Replay attacker: password authorization、pending、handoff confirmation、export confirmation、signing approval | Core は password authorization、pending、secret-capable state、unlocked state を operation 間・retry・restart 間で暗黙継承しない。target / payload / context と assertion の条件を検証する。 | Application は current operation の fresh assertion を取得し、過去 status を再利用しない。Core は Application assertion replay または UI 事実を独立証明しない。 | Core replay と App replay を分離できる |
| 5. Confused deputy: Profile、key、target、payload、Chain、Network、AccountContext | Core が Profile / key / AccountContext / fixed Chain / fixed Network の対応と operation authorization を検証し、mismatch / fallback を拒否する。 | Application が Account を選択・提示し、Binding は意味を搬送する。Application の user-intent 偽装は accepted boundary。 | 合格 |
| 6. Cross-chain / cross-network | Profile Network、Software Key fixed Chain、Account context、supported Symbol / NEM、Mainnet / Testnet を分離し、不一致・unsupported・不正組合せを fail-closed に拒否する。 | Binding / Application は implicit conversion、inference、fallback を行わない。 | 合格 |
| 7. Secret lifecycle | Core が Mnemonic、Software Key、derived / decrypted material、signing authority の継続 owner。通常非開示、明示 handoff / export の例外、no persistent unlock、failure 後非残留を維持する。 | Binding / Application は必要範囲の mediation と external copy の保護を担う。actual copy、memory、JS / FFI、host compromise は downstream / out of scope。 | ownership regression なし |
| 8. Failure path: handoff、password、Store、storage、delete、replacement persistence | handoff 未確認・拒否・中断、password failure、Store rejection、delete / mutation failure では success、partial state、secret output を残さない。successful replacement の application / persistence failure では Application が old committed Store を維持し、未保存 replacement を採用しない。 | persistent storage availability、current Store selection、retry / recovery の具体方式は Application / downstream。Core は保存先 availability や historical freshness を保証しない。 | fail-closed regression なし |

### Specification Impact Classification

Specification は今回の primary target ではなく、以下の4項目だけを次工程の realignment 対象として抽出した。

| Downstream area | 現状 | 影響分類 | 次工程での確認 |
| --- | --- | --- | --- |
| generated Profile prepare / finalize、restore | §8.1 の二段階 generated handoff は現行上流と整合する。§8.2:333 の `新規生成時の backup confirmation は要求しない` は全新規生成 handoff 必須と相反する。 | 要修正（Specification realignment） | restore は生成時 handoff confirmation の対象外、new generation は handoff 必須として文言と契約を統一する |
| HandoffConfirmation / ExportRequest / SigningRequest、retry / restart | status / target / payload / context、per-operation password、pending 非昇格、restart 非継承は概ね上流と整合する。 | 引継ぎ確認 | Application assertion freshness と Core が独立証明しない境界を維持し、v1 に token 機構を発明しない |
| current Store / rollback / committed state | atomic replacement と old committed state 維持は存在する。valid historical Store の freshness / rollback は Core guarantee 外であり、current Store authority は Application / persistence であることを下流契約へ明示する必要がある。 | 引継ぎ確認 | Core の hidden history / generation counter を要求せず、malformed / tampered と historical valid snapshot を区別する |
| SEC-023 side-channel verification | 現行 Specification に `side-channel`、`secret-dependent` 等の明示的記述は確認できない。 | 要追記（Specification / verification handoff） | Core 自身の不要な秘密依存処理、保証外対象、具体検証の委譲を trace する |

### Wallet Store Format Impact

- 上流方針から Wallet Store schema の変更は不要である。
- `generation counter`、rollback counter、revocation field、trusted anchor を v1 wire format に追加する要求はない。current Store authority、snapshot freshness、stale / historical Store の再適用防止は Application / persistence layer の責任であり、opaque Store schema へ不要に侵入させない。
- `wallet-store-format-v1.md` の version、integrity、structure、authentication、consistency、unknown / unsupported data の fail-closed 規則は維持する。valid historical Store は、暗号学的に valid である限り format-level malformed / tampered rejection の対象ではない。
- 次工程では、format 文書に currentness や rollback rejection を Core / wire invariant と誤記していないことだけを確認する。現時点でそのような追加 schema 要求は見つかっていない。

## Review Gates

Applicable Design Review Skill の標準8 Gate と、今回の横断 Gate を対応付ける。Standard Gate を不合格にする formal finding は `Critical` と定義されるが、今回は0件である。

| Standard Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | Concept、Requirements、3 Design が共通 Core、対象環境、v1 対象外および downstream phase boundary を共有する。 | なし |
| 2. コンテキストと責任 | 合格 | User、Application / UI、Binding、Core、persistent storage、Browser / OS / host の責任と guarantee limitation が一意である。 | なし |
| 3. 依存方向 | 合格 | Application / UI → Binding → Core の方向、Core authority、Binding non-authority、Application non-owner が維持される。 | なし |
| 4. 主要フロー | 合格 | 全新規 handoff、restore、export、signing、delete、replacement、retry、restart と failure の成功境界・責任が追跡できる。 | なし |
| 5. データ所有 | 合格 | Core の logical Store / secret ownership と Application の current Store authority が衝突せず、pending / replacement の責任も明示される。 | なし |
| 6. セキュリティと相互運用性 | 合格 | fail-closed、per-operation authorization、assertion boundary、side-channel scope、Symbol / NEM、Mainnet / Testnet、Profile / Software Key 分離が維持される。 | なし |
| 7. 上流整合性 | 合格 | Concept → Requirements → Design に DR-XA-001〜004 の対象 root cause を再現する矛盾はない。 | なし |
| 8. 下流実装可能性 | 合格 | owner、responsibility、trust boundary、success / failure、currentness boundary、assertion boundary、SEC-023 handoff が下流へ委譲されている。具体方式不足は Gate failure としない。 | なし |
| Cross-review Gate | `UPSTREAM DESIGN READY` | Standard Gate は全て合格。DR-XA-001〜004 は全て `RESOLVED`。downstream の Specification realignment は次工程へ明示的に分離されている。 | なし |

`SAFE TO PROCEED TO SPECIFICATION REALIGNMENT` を宣言できる。これは Specification の修正・Specification Review へ進める意味であり、Specification が現時点で適合済みであることや Implementation Review を完了したことを意味しない。

## Remaining Risks and Open Decisions

### Security blocking gap

なし。現行 Concept / Requirements / Design の間に、Core ownership、per-operation authorization、fail-closed Store handling、assertion freshness boundary、全新規 handoff、side-channel normative source を阻害する blocking security gap はない。

### Upstream Open Decision

なし。Review 001 で未決定だった次の4点は、現行 Requirements / Design で方針が確定している。

1. valid historical Store rollback: Core は検出・拒否を保証せず、Application / persistence が current Store authority として防止する。
2. confirmation / approval assertion replay: Application が freshness を管理し、Core は自身の authorization / pending を暗黙継承しない。Application compromise の完全防止と Core guarantee を分離する。
3. initial Mnemonic handoff: Core が生成する全 Profile creation で必須。restore は対象外。
4. side-channel normative source: `SEC-023` / `AC-049` を Requirements の source とし、Security Design が責任と境界を定め、具体方式・検証を downstream へ委譲する。

### Accepted residual risks / later review focus

- Application が stale assertion や valid historical Store を再提出する場合の完全防止は Core の保証外である。
- Browser / OS / host compromise、第三者 crypto library、compiler、runtime、hardware、CPU microarchitecture の完全保証は対象外である。
- actual memory copy / lifetime、zeroization、FFI / pointer safety、parser resource handling、実装上の side-channel、Native / WASM parity は Implementation / Release / Specification の後続確認事項である。
- Specification の generated restore sentence と SEC-023 handoff は次工程で更新・再レビューする。

## Validation Results

- 実施: `AGENTS.md`、共通 review playbook / output format、Concept Review / Requirements Review / Design Review の Skill、reviewers、security-checklist、review-gates、output-format を確認した。
- 実施: `AGENTS.md` に対象 Phase Context の登録がないことを確認し、Phase Context は使用していない。
- 実施: Review 001 と指定 commit の parent / diff / name status を確認した。指定 commit の変更は `docs/requirements/requirements.md`、`docs/design/architecture.md`、`docs/design/security.md`、`docs/design/bindings.md` の4ファイルだけだった。
- 実施: Concept → Requirements → Architecture / Security / Bindings の4本の traceability を本文と表の双方で確認した。
- 実施: DR-XA-001〜004 の status、severity、root cause、completion condition、residual risk を再評価した。全て `RESOLVED`、formal finding `Critical 0 / Major 0 / Minor 0`。
- 実施: Core ownership、Application responsibility、Binding non-authority、Profile model、Chain / Network、Store fail-closed、secret lifecycle、handoff、assertion、failure path を確認した。
- 実施: Malicious Application、Compromised Binding、Attacker-controlled Store、Replay attacker、Confused deputy、Cross-chain / cross-network、Secret lifecycle、Failure path の8シナリオを再実行した。
- 実施: Specification の generated / restore、confirmation / approval、retry / restart、current Store / rollback、SEC-023 handoff への影響を、Wallet Store Format の version / schema / migration / currentness 影響と分離して分類した。
- 実施: Review artifact 作成後に Markdown の標準章順、relative link、DR finding ID の一意性、status、severity / gate consistency、traceability、adversarial coverage、scope を機械的に確認する。
- 実施予定: artifact 作成後に `git diff --check` および `git diff --cached --check` を実行する。未 staged 状態でも後者を実行し、結果を区別する。
- 未実施: Rust formatter、clippy、cargo test、WASM check、Native / WASM 実行検証。コード変更がなく、今回の依頼でも対象外である。
- 未実施: Specification Review、Wallet Store Format Review、Implementation Review。downstream consistency の抽出に限定した。

## Automatic Changes

なし。レビュー中に変更したのは、この新規 artifact のみである。Concept、Requirements、Architecture、Security Design、Bindings Design、Specification、Wallet Store Format、Implementation、tests、fixtures、README、Review 001、その他過去 review は変更していない。

## Final Decision

`READY`

`UPSTREAM DESIGN READY` を宣言する。

`SAFE TO PROCEED TO SPECIFICATION REALIGNMENT` を宣言する。Specification の stale handoff sentence と SEC-023 verification handoff は次工程で修正・レビューする。Wallet Store Format の schema 変更は現時点で不要である。
