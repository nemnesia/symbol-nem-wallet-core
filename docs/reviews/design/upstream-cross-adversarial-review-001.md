# Upstream Cross-Phase and Adversarial Design Review 001

## Review Target

- 対象: `docs/consept/concept-sheet.md`、`docs/requirements/requirements.md`、`docs/design/architecture.md`、`docs/design/security.md`、`docs/design/bindings.md`
- 確認日: 2026-08-30
- 成果物: `docs/reviews/design/upstream-cross-adversarial-review-001.md`
- Review Scope: Concept → Requirements → Design の意味、責任、protected asset、trust boundary、security invariant、lifecycle、Store / persistence、Requirements → Design の順方向および Design → Requirements / Concept の逆方向 traceability。攻撃者、悪意ある Application / Binding、破損・改ざん Store、replay、confused deputy、cross-chain / cross-network、secret lifecycle、failure path を前提とする設計段階の敵対レビューを含む。
- Downstream consistency evidence: [`docs/specifications/specification.md`](../../specifications/specification.md) と [`docs/specifications/wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) は、上流との明確な矛盾または下流への影響を確認するためだけに参照した。Specification の詳細設計・実装適合性はレビューしていない。
- Implementation exclusion: Rust Core、Native C ABI、WASM、tests、fixtures、Cargo dependency、README は review target および finding 根拠から除外した。
- 未確認範囲: 実装の暗号利用、parser / FFI / memory safety、zeroization、実 Application / UI、外部 Node、実行環境侵害の防止、Specification / Store Format の独立適合性。

## Execution Audit

- 実行モード: サブエージェントを使用しない自己レビュー。実施していないサブエージェントや投票は記録していない。
- Reviewer A（構造・論理・責任）: 完了。Concept の目的・境界、用語、Core / Application / Binding の責任、Profile model、依存方向、Design の追加責任を照合した。
- Reviewer B（Security primary）: 完了。protected assets、secret ownership、trust boundary、authentication / authorization、signing authority、secret lifecycle、Store integrity、failure safety、Chain / Network separation、security invariant を確認した。
- Reviewer C（フロー・運用）: 完了。Mnemonic handoff、pending、mutation、delete、password change、replacement、retry、restart、保存失敗および adversarial failure path を追跡した。
- Reviewer D（traceability・下流 handoff）: 完了。Concept → Requirements → Design、Requirements → Design、Design → Requirements / Concept を逆方向に確認し、Specification への明確な影響だけを補助確認した。
- Adversarial pass: 完了。Malicious Application、Compromised Binding、attacker-controlled Store、replay、confused deputy、cross-chain / cross-network、secret lifecycle、failure-path の8シナリオを独立に再確認した。
- Chair 統合: 完了。過去 READY review の判定を再利用せず、現行本文へ追跡でき、設計段階で解消が必要な候補だけを採用した。悪意ある Application を完全に防ぐ新規要件は発明していない。

## Evidence Used

| 種別 | Reviewed Documents / 参照箇所 | 用途 |
| --- | --- | --- |
| Primary Concept | [`concept-sheet.md:5-11`](../../consept/concept-sheet.md#L5)、[`concept-sheet.md:34-41`](../../consept/concept-sheet.md#L34)、[`concept-sheet.md:57-76`](../../consept/concept-sheet.md#L57)、[`concept-sheet.md:86-140`](../../consept/concept-sheet.md#L86)、[`concept-sheet.md:184-206`](../../consept/concept-sheet.md#L184) | 誰のための Core か、v1 の対象・対象外、Profile / Mnemonic / Software Key / Account / Chain / Network、Core と外部責任、Security Invariant および後工程委譲を確認 |
| Primary Requirements | [`requirements.md:25-78`](../../requirements/requirements.md#L25)、[`requirements.md:80-107`](../../requirements/requirements.md#L80)、[`requirements.md:111-129`](../../requirements/requirements.md#L111)、[`requirements.md:135-191`](../../requirements/requirements.md#L135)、[`requirements.md:195-222`](../../requirements/requirements.md#L195)、[`requirements.md:238-262`](../../requirements/requirements.md#L238)、[`requirements.md:266-278`](../../requirements/requirements.md#L266)、[`requirements.md:282-348`](../../requirements/requirements.md#L282) | Profile model、functional / security / data requirements、explicit intent、per-operation authentication、Store、atomicity、failure、Chain / Network および acceptance condition を確認 |
| Primary Architecture | [`architecture.md:22-52`](../../design/architecture.md#L22)、[`architecture.md:54-114`](../../design/architecture.md#L54)、[`architecture.md:118-167`](../../design/architecture.md#L118)、[`architecture.md:171-221`](../../design/architecture.md#L171)、[`architecture.md:223-320`](../../design/architecture.md#L223)、[`architecture.md:323-381`](../../design/architecture.md#L323) | 全体 context、ownership、Store persistence、pending、handoff、authentication、signing、export、retry / restart、Chain / Network および downstream handoff を確認 |
| Primary Security Design | [`security.md:13-53`](../../design/security.md#L13)、[`security.md:55-93`](../../design/security.md#L55)、[`security.md:94-131`](../../design/security.md#L94)、[`security.md:133-156`](../../design/security.md#L133)、[`security.md:158-214`](../../design/security.md#L158)、[`security.md:216-273`](../../design/security.md#L216)、[`security.md:275-306`](../../design/security.md#L275)、[`security.md:342-364`](../../design/security.md#L342) | protected asset table、Core / Application / Binding boundary、authorization と user intent、Store、lifecycle、side-channel / memory phase boundary、下流 handoff を確認 |
| Primary Bindings Design | [`bindings.md:3-11`](../../design/bindings.md#L3)、[`bindings.md:52-97`](../../design/bindings.md#L52)、[`bindings.md:99-170`](../../design/bindings.md#L99)、[`bindings.md:172-244`](../../design/bindings.md#L172)、[`bindings.md:246-281`](../../design/bindings.md#L246)、[`bindings.md:317-344`](../../design/bindings.md#L317) | Binding non-authority、representation / ownership mediation、handoff、export、signing、opaque Store、failure、retry / restart、Native / WASM guarantee boundary を確認 |
| Latest Concept READY review | [`concept-sheet-review-010.md`](../concept/concept-sheet-review-010.md) | Concept の最新 READY 判定、過去 CS finding の状態およびレビュー範囲を履歴として確認。判定自体は本レビューの根拠にしていない |
| Latest Requirements READY reviews | [`requirements-review-008.md`](../requirements/requirements-review-008.md)、[`requirements-cleanup-review-001.md`](../requirements/requirements-cleanup-review-001.md) | Requirements の最新 READY / cleanup READY、過去 RR finding の状態および未解決項目の履歴を確認。判定自体は本レビューの根拠にしていない |
| Latest Design READY reviews | [`architecture-review-002.md`](architecture-review-002.md)、[`security-review-002.md`](security-review-002.md)、[`bindings-review-002.md`](bindings-review-002.md) | 各 Design の最新 READY、既存 DR finding の Resolved 状態および個別レビュー範囲を確認。判定自体は本レビューの根拠にしていない |
| Review rules | [`AGENTS.md`](../../../AGENTS.md)、[`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、Concept / Requirements / Design Review Skill 一式 | Phase boundary、finding 採用条件、severity / gate、security checklist、共通 output format、変更範囲および検証規則を確認 |
| Downstream evidence | [`specification.md:299-333`](../../specifications/specification.md#L299)、[`specification.md:385-452`](../../specifications/specification.md#L385)、[`specification.md:721-759`](../../specifications/specification.md#L721)、[`wallet-store-format-v1.md:661-710`](../../specifications/wallet-store-format-v1.md#L661) | 上流 finding が Specification / Wallet Store Format のどの契約へ波及し得るかだけを確認 |

## Review Result

`REVISE UPSTREAM DESIGN`

これは今回の横断レビューに対する Gate 値である。Applicable な Design Review Skill の標準値に対応させると `REVISE DESIGN` であり、`Critical` の DR-XA-001 が存在するため `READY` にはしない。

## Summary

Concept の製品目的、v1 境界、Core 継続 ownership、Application / UI の責任、Binding non-authority、Profile / Mnemonic / Software Key / Account / Chain / Network の基本モデルは、Requirements と Architecture / Security / Bindings Design の主要箇所へ一貫して追跡できる。通常の secret non-disclosure、per-operation password authorization、user intent と authorization の分離、Store の opaque boundary、fail-closed、pending 非昇格、atomic replacement の基本責任も一貫している。

ただし、個別文書の READY 判定を横断して再評価すると、次の設計段階の問題が残る。

1. `Critical`: Application / persistent storage が過去の正当な Store を再提示できる設計で、Profile / Software Key deletion 後に旧 Store を reject する freshness、revocation または authoritative-current-state の責任がない。Requirements の「削除済み秘密情報を Core の秘密処理へ再利用できない」と、現行 Design の opaque stateless replacement boundary を同時に満たす方法が定まっていない。
2. `Major`: retry では確認・承認を再取得すると記述しているが、handoff confirmation、export confirmation、signing approval が Core の operation と一回限り結び付く freshness / consumption invariant は定義されていない。悪意ある Application を完全に防ぐこととは区別し、現行の「別 operation へ意思を持ち越さない」という意味をどこまで Core が強制するかを決める必要がある。
3. `Major`: Security Design §8.1 の side-channel 回避責任は normative な Design-level invariant として追加されているが、Concept / Requirements に明示的な根拠がなく、同 Design の traceability 表が `SEC-003` 等から直接導出したように記載している。Requirements 外の security responsibility を Design だけで確定している。
4. `Major`: 初回 Mnemonic handoff が「初回バックアップを利用者が明示的に要求した場合だけ」の条件付きか、生成 Profile 全件の必須成功境界かが、Requirements / Architecture / Security と Bindings / downstream evidence で統一されていない。

したがって、Core ownership や Binding boundary は基本的に整合しているが、削除後の Store rollback は protected asset と committed Store integrity に直接影響する上流 blocking gap である。再評価前に Requirements / Design の責任・脅威範囲・成功境界を確定する必要がある。

## Finding Status

Formal findings: `Critical 1 / Major 3 / Minor 0`。すべて今回初出の `New` である。既存の Concept / Requirements / Design review finding の ID や状態は変更していない。

| ID | Classification | Severity | Status | 初出レビュー | 状態根拠 |
| --- | --- | --- | --- | --- | --- |
| DR-XA-001 | Adversarial design weakness / Requirements-to-Design gap | Critical | New | upstream-cross-adversarial-review-001 | 正当な過去 Store の再提示を検出・拒否する設計責任がなく、削除済み秘密情報の再利用禁止と両立する下流 handoff が定まらない。 |
| DR-XA-002 | Adversarial design weakness / Upstream open decision | Major | New | upstream-cross-adversarial-review-001 | per-operation retry の記述はあるが、confirmation / approval assertion の operation binding、freshness、one-shot consumption が設計 invariant になっていない。 |
| DR-XA-003 | Requirements omission / Design scope expansion | Major | New | upstream-cross-adversarial-review-001 | Security Design が side-channel を Core の normative responsibility としている一方、Concept / Requirements の明示的な security property へ追跡できない。 |
| DR-XA-004 | Cross-document contradiction / Bindings Design gap | Major | New | upstream-cross-adversarial-review-001 | 初回 handoff の条件付き範囲が Bindings Design で省略され、現行 Specification の生成・復元記述にも相反する文言がある。 |

## Required Changes

### DR-XA-001 — 過去の正当な Store rollback と deletion invariant

- Severity: `Critical`
- Status: `New`
- Phase attribution: Requirements-to-Design gap / Architecture and Security Design gap
- 対象箇所: [`requirements.md:210`](../../requirements/requirements.md#L210)、[`requirements.md:246`](../../requirements/requirements.md#L246)、[`architecture.md:195-209`](../../design/architecture.md#L195)、[`architecture.md:211-221`](../../design/architecture.md#L211)、[`security.md:139-146`](../../design/security.md#L139)、[`security.md:235-243`](../../design/security.md#L235)、[`bindings.md:164-170`](../../design/bindings.md#L164)
- 発生条件または確認できた事実: Design は Application が Store を opaque blob として保存・再提示し、Core が入力 Store の validity を検証して replacement を返す境界を定めている。保存失敗時は旧 committed Store を維持すると定めるが、旧 Store を「現在の committed state より古い」と判定する freshness、revocation、単調な状態 anchor またはその代替責任は定めていない。Store の暗号認証・構造検証に成功した正当な過去 snapshot を、現在の Store と区別する根拠が Design にない。
- 既存の根拠: Requirements `FR-012` は Profile、Mnemonic、全 Software Key の削除と部分削除禁止を定め、`SEC-005` は Core 管理下から削除済みの秘密情報を Core の署名・導出・登録その他の秘密情報処理へ再利用できないことを MUST とする。`FR-017`、`SEC-018` および `AC-018` は Store integrity、existing state preservation、fail-closed を要求する。
- 問題: Application または persistent storage を操作できる攻撃者が、削除前に取得した正当な Store `S0` を、削除後の Store `S1` に置き換えられる。Core が `S0` を現在の入力として受理し、利用者が同じ Profile password を入力すると、削除済み Profile / Software Key が再び一覧・署名・export 等の対象になり得る。これは malformed / tampered blob の拒否では検出できない valid-snapshot rollback である。
- 攻撃者・前提: 攻撃者が Application の persistent storage または Application へ渡る Store blob を過去の正当な値へ置換できること。攻撃者自身が password を破ることは前提にしない。利用者が正当な操作として password を入力する、または password を一時保持できる Application が処理を再実行することで成立する。
- Protected asset / trust boundary: 保護対象は削除済み Software Key / Mnemonic、signing capability、Profile metadata および committed Store integrity。境界は `Application / UI → Binding → Core` と `Application / persistent storage → opaque Store input → Core` であり、Core は blob の暗号認証だけで「現在性」を証明できない。
- Impact: 削除保証が無効化され、削除済み秘密情報による unauthorized signing / export、誤った Profile 選択、削除・password change 前の状態への rollback が可能になる。秘密情報の外部コピーが既に漏れることを必須条件とせず、Core の削除後 non-reuse invariant と committed state integrity を破る。
- Recovery: 現行 Design には、trusted current snapshot、revocation marker、storage generation の所有者および rollback 検出失敗時の回復責任がない。Application が別途最新 Store を持つ場合の手動回復は、この Core guarantee の代替にならない。rollback 後に署名・export された結果は撤回できない。
- 必要な最小修正または確認: Requirements / Design で、`SEC-005` / `FR-012` が過去の正当な Store の再提示にも適用されるかを明示し、適用するなら「current state を判断し、古い Store を reject または無効化する責任主体」と成功・失敗時の状態境界を定める。適用しないなら、削除後 non-reuse の保証範囲と Store rollback threat を Requirements で明示的に狭める。revision counter、外部 anchor、revocation list などの方式は本レビューで選択しない。
- 完了条件または再確認方法: 削除・password change・key deletion の後に、攻撃者が保持する過去の正当な Store を再提示した場合の Core / Application の責任、reject / recovery、既存 committed state および signing / export capability の結果を Concept / Requirements / Design から一意に追跡できること。修正後に同一シナリオで Critical が解消されたことを再レビューする。
- Specification impact: `Yes`。現行 [`specification.md:274-295`](../../specifications/specification.md#L274)、[`specification.md:721-759`](../../specifications/specification.md#L721)、および [`wallet-store-format-v1.md:661-710`](../../specifications/wallet-store-format-v1.md#L661) の Store acceptance、state / replacement、versioning の契約へ影響し得る。ただし本レビューでは Specification / format の修正や詳細評価を行わない。
- Implementation impact: `Yes`。後続 Implementation Review では Store load / replacement、delete、password change、sign / export の current-state 判定、rollback detection、失敗後の capability 維持および persistent storage handoff を重点確認する。

## Optional Improvements

### DR-XA-002 — Confirmation / approval assertion の replay freshness

- Severity: `Major`
- Status: `New`
- Phase attribution: Adversarial design weakness / Requirements open decision
- 対象箇所: [`requirements.md:163-169`](../../requirements/requirements.md#L163)、[`requirements.md:220-222`](../../requirements/requirements.md#L220)、[`requirements.md:261-262`](../../requirements/requirements.md#L261)、[`architecture.md:256-309`](../../design/architecture.md#L256)、[`security.md:195-233`](../../design/security.md#L195)、[`security.md:245-258`](../../design/security.md#L245)、[`bindings.md:213-244`](../../design/bindings.md#L213)
- 発生条件または確認できた事実: Requirements / Design は、password authorization と user intent / signing approval を分け、retry は新しい operation として confirmation / password を再取得すると記述する。一方、Core が受け取る confirmation / approval が当該 operation に一回限り結び付くこと、過去の assertion を再提出した場合に stale として拒否すること、または pending / request が一度消費されたことを Design invariant として定めていない。timeout、expiry、pending reuse 条件等は下流へ委譲されている。
- 問題: `Confirmed`、`Requested` または `Approved` が Application assertion として再提出できる設計のままだと、Core は「新しい利用者確認」と「保存された過去 assertion」を区別できない。これは悪意ある Application が UI を偽装できること自体を新規 finding とするものではなく、現行文書が掲げる「意思を別 operation へ持ち越さない」境界を Core がどこまで強制するかが未決定であることを指摘する。
- 攻撃者・前提: 攻撃者が過去の request / assertion を保持し、現在の operation を Core へ再送できること。export / signing では、処理単位の正しい Profile password が別途必要である。悪意ある Application が password を一時保持すること、または利用者に再入力を促すことを含む。handoff では、まだ受理可能な pending と過去の confirmation を再提示できることを前提とする。
- Protected asset / trust boundary: export secret、signing capability、生成 Profile の handoff success、および user intent。境界は Application / UI assertion と Core authorization の間で、Core は UI を独立検証しないと明記されている。
- Impact: 過去の explicit export confirmation の再利用による意図しない再 export、過去の signing approval の再利用または別 target / payload への assertion 転用、過去 handoff confirmation による意図しない Profile finalize の余地が残る。password authorization が毎回必要でも、user intent の replay までは解消しない。
- Recovery: export により外部へ渡った secret copy、または実行済み署名を回収できる rollback は定義されていない。password change は一部の旧 password を無効化し得るが、現在の password を使う replay や既に返却した成果物の回収策にはならない。
- 必要な最小修正または確認: Requirements / Design で、v1 の保証を「暗黙の carry-over を禁止し、Application が新しい確認を再取得する責任まで」とするのか、「Core が operation binding / freshness / one-shot consumption を強制する」とするのかを明示する。後者を採用する場合のみ、Core の責任、失敗時、restart / retry の境界を定める。challenge、nonce、expiry、token などの具体方式は選択しない。
- 完了条件または再確認方法: handoff、export、signing の各 operation について、同一 request の再送、古い status の再使用、target / payload の変更、restart 後の再提示を別々に評価し、現行 Requirements に適合する reject / accept policy と責任主体を Design から一意に説明できること。
- Specification impact: `Yes`。現行 [`specification.md:385-452`](../../specifications/specification.md#L385)、[`specification.md:589-611`](../../specifications/specification.md#L589)、[`specification.md:721-739`](../../specifications/specification.md#L721) の request status、retry、handoff / export / signing 契約へ影響し得る。現在の仕様詳細そのものはレビューしていない。
- Implementation impact: `Yes`。後続 Implementation Review では request / pending の operation binding、status replay、retry、restart、export / signing result の再利用および悪意ある Application assertion の扱いを重点確認する。

### DR-XA-003 — Security Design の side-channel responsibility の逆トレーサビリティ

- Severity: `Major`
- Status: `New`
- Phase attribution: Requirements omission / Security Design scope expansion
- 対象箇所: [`requirements.md:17-19`](../../requirements/requirements.md#L17)、[`requirements.md:238-262`](../../requirements/requirements.md#L238)、[`requirements.md:371-381`](../../requirements/requirements.md#L371)、[`security.md:275-286`](../../design/security.md#L275)、[`security.md:300-306`](../../design/security.md#L300)、[`security.md:334-340`](../../design/security.md#L334)、[`security.md:370-382`](../../design/security.md#L370)
- 発生条件または確認できた事実: Requirements は秘密情報の非開示、不要 retention、failure 後非残留、Binding 境界等を要求する一方、暗号方式、メモリ方式、具体的な検証方式は下流へ委譲している。現行 Security Design §8.1 は `secret-dependent behavior`、timing / side-channel exposure を避ける責任を Core の Design-level invariant とし、Specification / Implementation / release verification へ具体的責任を渡している。§11.1 はこの side-channel row を `SEC-003`、`SEC-012` 等へ追跡したとするが、それらは side-channel property を明示していない。
- 問題: Protected asset の confidentiality から合理的に導出した設計上の注意ではなく、Core の normative responsibility と下流検証責任として記述されているため、Requirements で承認されていない security property を Design が単独で確定している。下流が mandatory security invariant として扱うか、一般的 hardening / implementation consideration として扱うかを文書間で一致させられない。
- 影響: side-channel の保証範囲、release verification の完了条件、third-party dependency の責任境界について、異なる合理的な下流解釈が生じる。これは特定の constant-time algorithm、library、assembly inspection または zeroize technique を要求する finding ではない。
- 必要な最小修正または確認: Requirements に既存の security property から side-channel responsibility を導出する根拠を明示して Design へ追跡するか、Security Design の §8.1 と trace row を normative invariant ではない実装・検証上の考慮事項へ再分類する。third-party library の fork 要否を本レビューで決めない。
- 完了条件または再確認方法: Concept / Requirements / Design のいずれが side-channel の security property、保証主体、保証外範囲および下流検証責任を規範化するかが一意であり、Design → Requirements の逆 trace が成立すること。
- Specification impact: `Yes`。Design の invariant として残す場合、[`specification.md:898-952`](../../specifications/specification.md#L898) の security / verification handoff へ影響し得る。現行 Specification の side-channel 適合性は本レビューしていない。
- Implementation impact: `Yes`。後続 Implementation / release review では、Core / Binding の side-channel responsibility、third-party temporary の保証境界、target / compiler / runtime ごとの検証責任を重点確認する。

### DR-XA-004 — 初回 Mnemonic handoff の条件付き範囲の不一致

- Severity: `Major`
- Status: `New`
- Phase attribution: Cross-document contradiction / Bindings Design gap
- 対象箇所: [`requirements.md:135-149`](../../requirements/requirements.md#L135)、[`requirements.md:199-200`](../../requirements/requirements.md#L199)、[`requirements.md:286-287`](../../requirements/requirements.md#L286)、[`architecture.md:225-240`](../../design/architecture.md#L225)、[`security.md:178-193`](../../design/security.md#L178)、[`bindings.md:198-211`](../../design/bindings.md#L198)、Downstream evidence [`specification.md:299-333`](../../specifications/specification.md#L299)
- 発生条件または確認できた事実: Requirements は「利用者が初回バックアップを明示的に要求した新規 Mnemonic 生成経路」に限って、Core generation → Application handoff → user presentation → explicit receipt → Application confirmation → Core finalize の条件を定める。Architecture §6.1 と Security Design §6.2 も同じ条件付き表現を使う。これに対して Bindings Design §6.3 は「新規 Mnemonic の初回 handoff」を条件なしで記述し、明示的バックアップ要求がない生成経路との関係を示さない。
- Downstream consistency evidence: Specification §8.1 は新規 Mnemonic 生成 Profile を `prepare_generated_profile` / `finalize_generated_profile` の二段階とし、生成経路全体に handoff を要求するように読める。一方、復元 Profile を記述する §8.2 の末尾には「新規生成時の backup confirmation は要求しない」とあり、§8.1 および Requirements の条件付き handoff と文字どおりには相反する。このレビューでは、どの文言が正しいかを Specification の詳細レビューとして決定しない。
- 問題: 生成 Profile が、利用者による初回バックアップ要求なしでも handoff confirmation 後にだけ committed になるのか、または要求がない場合は handoff なしで committed になり得るのかが一意でない。これは Application / UI responsibility、Mnemonic の外部公開例外、pending / committed 境界および Profile creation success を変える意味の差である。
- 攻撃・失敗条件: Application が Requirements / Architecture の条件付き解釈に従う場合と、Bindings / Specification の必須二段階解釈に従う場合で、同じ新規生成操作の成功境界が変わる。利用者確認なしで Profile が残る経路を許す解釈は handoff invariant を弱め、必須解釈は要求されていない handoff 責任を上位 Application / 利用者へ追加する。
- 影響: 未確認 Mnemonic を持つ partial / committed Profile の扱い、初回 backup の意図、Application の責任、下流 API の success / failure 契約が分岐する。秘密情報を通常結果へ返すべきか否かの境界も誤実装され得る。
- 必要な最小修正または確認: Requirements、Architecture、Security Design、Bindings Design で、handoff invariant が明示的バックアップ要求のときだけ適用されるか、新規生成全件に適用されるかを一つに決める。restore 経路が handoff を要求しないこととの区別も同時に明記する。API、callback、status field の具体設計は選択しない。
- 完了条件または再確認方法: 新規生成（backup request あり / なし）、既存 Mnemonic restore、handoff 中断、確認拒否、restart の各経路について、Profile success、secret output、pending、既存 Store の結果を Concept → Requirements → Design で一意に追跡できること。Specification の相反文言が上流決定と一致することを downstream consistency check で確認する。
- Specification impact: `Yes`。現行 [`specification.md:299-333`](../../specifications/specification.md#L299) の生成 / restore success boundary、handoff confirmation、pending 契約へ影響し得る。Specification は今回修正しない。
- Implementation impact: `Yes`。後続レビューでは、backup request の有無、prepare / finalize、restore、pending promotion、confirmation failure および secret output 条件を重点確認する。

## Resolved Findings

なし。本横断レビューは、既存の Concept / Requirements / Architecture / Security / Bindings review artifact の finding status を変更しない。既存 READY review の `Resolved` は履歴として確認したが、現行本文の横断判定を代替していない。

## Upstream Feedback

以下は formal finding とは別の non-normative feedback である。Severity、Required Change、Gate failure、Review Result は付与しない。正式資料が更新・承認されるまで、ここから新しい Requirement、Design Decision、Specification contract を生成してはならない。

### Feedback A — Store rollback threat の適用範囲

- 送信元フェーズ: Design cross-review
- 受領すべき上流フェーズ: Requirements → Design
- 対象となる正式資料 / decision: [`requirements.md:210`](../../requirements/requirements.md#L210) `FR-012`、[`requirements.md:246`](../../requirements/requirements.md#L246) `SEC-005`、[`requirements.md:337-350`](../../requirements/requirements.md#L337)
- 不足・曖昧さ・矛盾: 「削除済み秘密情報を Core が再利用しない」保証が、Application / storage が保持する過去の正当な Store を再提示する rollback にも適用されるかが明記されていない。現行 Design は Store を attacker-controlled input としつつ、current-state anchor の責任を定めていない。
- 下流への影響: 適用する場合は DR-XA-001 のとおり Design と下流 Store / state contract が必要になる。適用しない場合は、削除保証と threat scope を狭める明示的な上流判断が必要になる。
- non-normative status: clarification pending。これは DR-XA-001 の根拠と重複計上せず、Requirements と Design の解消関係を示すためだけに記録する。
- 解消条件: rollback された valid Store に対する deletion / signing / export の期待結果と、current state を知る責任主体を Requirements で承認する。

### Feedback B — Application assertion replay の保証境界

- 送信元フェーズ: Design cross-review
- 受領すべき上流フェーズ: Requirements → Design
- 対象となる正式資料 / decision: [`requirements.md:220-222`](../../requirements/requirements.md#L220)、[`requirements.md:261-262`](../../requirements/requirements.md#L261)、[`requirements.md:335-350`](../../requirements/requirements.md#L335)
- 不足・曖昧さ・矛盾: per-operation と explicit intent の要求はあるが、悪意ある Application が再提出する assertion を「新しい確認」とみなさない保証を Core に求めるか、Application responsibility として受け入れるかが明示されていない。
- 下流への影響: Core-enforced freshness を要求するなら DR-XA-002 の設計と request contract が必要になる。Application compromise を防止しない方針を維持するなら、no implicit carry-over の意味と accepted residual risk を明記する必要がある。
- non-normative status: clarification pending。悪意ある Application の完全防止を新規に要求する feedback ではない。
- 解消条件: handoff / export / signing の再送・再利用に対する v1 の保証範囲を Requirements と Design で一意に示す。

### Feedback C — Side-channel responsibility の normative source

- 送信元フェーズ: Security Design
- 受領すべき上流フェーズ: Requirements
- 対象となる正式資料 / decision: [`requirements.md:17-19`](../../requirements/requirements.md#L17)、[`requirements.md:238-262`](../../requirements/requirements.md#L238)、[`requirements.md:371-381`](../../requirements/requirements.md#L371)
- 不足・曖昧さ・矛盾: Security Design が side-channel を Design-level invariant としているが、Requirements の security property、受入条件または下流委譲へ明示的に追跡できない。
- 下流への影響: normative property として承認する場合は downstream verification responsibility を定める必要がある。承認しない場合は Security Design の invariant / traceability を再分類する必要がある。
- non-normative status: clarification pending。具体的な constant-time technique、library または test を要求しない。
- 解消条件: side-channel の property、責任主体、保証外範囲および下流 handoff の normative source を Requirements / Design で一致させる。

## Deferred Findings

Formal finding はない。次の事項は本レビューの対象外または後続工程へ明示的に委譲された事項であり、上流 gap と混在させない。

- Store parser の具体方式、CBOR / wire / unknown field / enum / resource limit、個別 error precedence、fuzz および実際の resource exhaustion 防止。Store が attacker-controlled input であることは確認したが、Requirements が独立した availability / resource safety property を定めているかは本レビューで新規要求化していない。
- Native C ABI、WASM representation、FFI pointer、allocation、ownership / free、JavaScript copy、zeroization、actual crypto、side-channel の実装適合性。DR-XA-003 は normative source の問題であり、実装不備の finding ではない。
- 実 Application / UI が、利用者へ payload を表示したか、Mnemonic を提示したか、確認・承認を本当に取得したかの独立検証。Design はこの証明を Core の責任にしておらず、悪意ある Application の完全防止は今回の新規要件にしない。
- Browser / OS / host process compromise の防止、external node、Transaction meaning、blind-signing UI、Application の page / background / extension topology。
- Specification / Wallet Store Format の独立レビュー。DR-XA-001、DR-XA-002、DR-XA-004 の downstream impact は記録したが、Specification の詳細 finding は作成していない。

## Scope and Traceability

### Concept → Requirements → Design

| 横断領域 | Concept → Requirements | Requirements → Design | 横断判定 |
| --- | --- | --- | --- |
| Purpose / scope / users | Concept §1〜§4、§7〜§8 → Requirements §1〜§2、UC-001〜UC-011、NFR-001〜NFR-004 | Architecture §1〜§4、Security §1〜§4、Bindings §1〜§4 | 一貫。Wallet developer 向け共通 Rust Core、Desktop / Mobile / Web、v1 対象外および host guarantee limitation が維持される。 |
| Profile model | Concept §5、§7 → Requirements §2.1、DR-001〜DR-007、FR-013、FR-015〜FR-018 | Architecture §2.2、§5.1、§7、Security §2.2、§5.1、§7、Bindings §2.2、§7 | 一貫。Profile = Network 固定・Chain 非固定、Mnemonic 1つ、Software Key = Chain 固定、Account = Software Key + Profile Network。account_index は HD 導出の入力として下流へ委譲され、Design の抽象度不足ではない。 |
| Core ownership | Concept §3、§5、§7 → Requirements §2.2〜§2.4、FR-002〜FR-008、SEC-001〜SEC-017 | Architecture §3〜§5、Security §3〜§5、Bindings §3〜§5 | 一貫。Mnemonic generation / recovery / import / ongoing management、private key、HD derivation、Software Key、password authorization、crypto use、Store validity、secret export boundary は Core に残る。 |
| Application / UI | Concept §7、§9 → Requirements §2.4、UC-006、UC-011、NFR-002〜NFR-004、SEC-020〜SEC-022 | Architecture §3.3、§4.3、§6.1、§6.3〜§6.4、Security §3.1、§4.2、§6.2〜§6.4、Bindings §4.3、§6.3〜§6.5 | 一貫。Account selection、content presentation、explicit signing approval、export request / confirmation、Mnemonic handoff presentation / receipt confirmation は Application / UI。Core は signing authority / crypto authority / key owner になり、Application はその正本にならない。 |
| Binding | Concept §7、§9 → Requirements §2.2、UC-010、FR-019、NFR-001〜NFR-004、SEC-011〜SEC-012 | Architecture §3.3、§4.2、§4.5、Security §3〜§4、Bindings §3〜§8 | 一貫。Binding は transport / representation / ownership mediation と安全側 conversion boundary に留まり、独立 key management、encryption、authorization、signing approval、migration、Store interpretation、fallback、secret retention を担わない。 |
| Explicit secret access | Concept §7 → Requirements UC-011、FR-022〜FR-023、SEC-010、SEC-015、SEC-021 | Architecture §6.4、Security §6.3、Bindings §6.4 | 一貫。通常処理非開示、target、explicit request、Application confirmation、per-operation password、operation-specific result を分離する。status replay freshness は DR-XA-002。 |
| Signing | Concept §3、§7 → Requirements UC-006、FR-009、SEC-022、AC-009 | Architecture §6.3、Security §6.4、Bindings §6.5 | 一貫。Application が Account / content を提示・承認し、Core が password authorization、context validation、specified key、raw signing primitive を担う。Core は Transaction meaning を判断しない。悪意ある Application による assertion 偽装は accepted boundary。 |
| Store / failure / atomicity | Concept §7、§10 → Requirements FR-017、DR-009、SEC-004、SEC-018〜SEC-019、§10 | Architecture §5.2〜§5.3、§6.2、§8、§9.3〜§9.4、Security §5.1、§6.5〜§6.6、Bindings §5.2、§6.6 | malformed / unsupported / inconsistent / authentication failure の fail-closed、opaque handling、replacement、existing state preservation は一貫。valid historical Store の rollback / deletion は DR-XA-001。 |
| Handoff / pending | Concept §7、§12〜§13 → Requirements UC-001、FR-001、FR-019、SEC-010、SEC-017〜SEC-018、AC-001、AC-034 | Architecture §6.1、Security §6.2、Bindings §6.3 | lifecycle の段階は一貫するが、明示的 backup request の条件が Bindings で省略され、downstream evidence に相反文言がある。DR-XA-004。 |
| Chain / Network | Concept §3、§5、§7 → Requirements §2.1、UC-009、FR-013、FR-015〜FR-016、FR-024、DR-005、AC-013、AC-047 | Architecture §5.1、§6.2、§7、Security §7、Bindings §7 | 一貫。Symbol / NEM、Mainnet / Testnet、Profile Network、Software Key fixed Chain、Account context を分離し、Core が mismatch / unsupported を reject。fallback、default、implicit inference / conversion はない。 |

### Requirements → Design evidence

| Requirement group | Design evidence | 結果 |
| --- | --- | --- |
| Profile model / Mnemonic ownership | Architecture §2.2、§5.1; Security §2.2、§5.1; Bindings §5.1 | 反映済み |
| Software Key lifecycle（Derived / Imported / Generated） | Architecture §4.1、§5.1、§6.2; Security §4.1、§5.1〜§6.6 | 反映済み |
| Secret non-disclosure / export | Architecture §3.1〜§3.3、§6.4; Security §3.2、§5.1、§6.3; Bindings §3.2、§5.1、§6.4 | 反映済み |
| Signing / password / approval | Architecture §6.3、§6.5; Security §6.1、§6.4; Bindings §6.2、§6.5 | 反映済み。assertion freshness は DR-XA-002。 |
| Deletion / duplicate / Profile isolation | Architecture §5.1、§6.2、§7; Security §5.1、§6.6、§7; Bindings §5.2、§7 | 反映済み。ただし historical Store rollback による deletion non-reuse は DR-XA-001。 |
| Chain / Network | Architecture §5.1、§7; Security §7; Bindings §7 | 反映済み |
| Store integrity / fail-closed / unsupported version | Architecture §5.2、§8、§9.3; Security §6.5; Bindings §5.2、§8.1 | 反映済み。freshness は未反映。 |
| Binding parity / no independent authority | Architecture §4.2、§4.5; Security §4.3; Bindings §3〜§8 | 反映済み |
| Retry / restart / pending | Architecture §5.3、§6.5; Security §6.6; Bindings §6.2、§6.6 | 反映済み for implicit carry-over; one-shot / freshness is DR-XA-002。 |
| Handoff condition | Architecture §6.1; Security §6.2; Bindings §6.3 | 部分反映。条件付き scope の不一致は DR-XA-004。 |

### Design → Requirements / Concept reverse traceability

| Design item | Upstream trace | 判定 |
| --- | --- | --- |
| Core ownership、per-operation authorization、non-disclosure、Binding non-authority、opaque Store | Concept §3、§7〜§10; Requirements §2、FR / SEC / DR / AC | 根拠あり |
| Application の opaque Store replacement / availability responsibility | Concept §7、§9; Requirements §2.4、§10、§12.4 | 根拠あり。保存方式の詳細は下流委譲。 |
| Binding 自身の検証可能な conversion failure を fail-safe に扱う責任 | Requirements NFR-002〜NFR-003、SEC-012、SEC-018; Architecture §4.2、§8 | Design elaboration として根拠あり。任意 pointer / process compromise の保証追加ではない。 |
| Side-channel を normative Design-level invariant とする責任 | Requirements に明示根拠なし。Security §8.1、§9.4、§11.1 のみ | DR-XA-003。 |
| Third-party crypto dependency を fork しない判断 | 上位の protected asset / scope を実装方式へ適用した pure design decision | formal finding にはしない。ただし side-channel guarantee を弱める根拠にはならない。 |
| Freshness / rollback rejection / current-state anchor | Concept / Requirements の deletion / committed integrity から必要性は追跡できるが、Design に責任配置なし | DR-XA-001。 |

## Domain Checks

### Protected Assets / Secret Ownership

| Asset | Concept / Requirements | Design evaluation |
| --- | --- | --- |
| Mnemonic words / entropy / seed | Concept §5、§7; Requirements FR-001〜FR-003、SEC-010、SEC-015、DR-002 | Core 継続 owner、handoff / export の明示例外、失敗時非開示が一貫。 |
| private key / Derived / Imported / Generated Software Key | Requirements FR-003〜FR-008、SEC-005、DR-004 | Core が chain 固定 Software Key として生成・導出・利用・破棄。delete 後の historical Store 再利用は DR-XA-001。 |
| KDF-derived key / decrypted Store payload | Requirements SEC-001〜SEC-003、§12.2; Design の `derived secret / decrypted secret material` | Design-level では temporary derived / decrypted secret として Core が所有。KDF の具体資産名は downstream crypto detail であり、別の上流 requirement を発明しない。 |
| Profile password | Requirements §2.3、FR-007、FR-010、SEC-002、SEC-006〜SEC-007 | Core が operation authorization を判定し、persistent cache / unlock session を持たない。Application の一時 mediation は authority 移転ではない。 |
| signing capability / secret export capability | Requirements SEC-010、SEC-021、SEC-022 | Core が key use / export result を実行し、Application / UI が intent / approval を担う。password は intent / approval の代替ではない。replay scope は DR-XA-002。 |
| committed Store integrity | Requirements FR-017、SEC-004、SEC-018、DR-009 | tamper / malformed / unsupported / inconsistent reject と atomic replacement は反映済み。ただし valid historical Store の freshness がなく、DR-XA-001。 |
| pending state integrity | Requirements FR-001、SEC-017〜SEC-018、AC-034、AC-038 | pending の opaque / unconfirmed / stale 非昇格、restart 後非自動継続は反映済み。confirmation one-shot / replay semantics は DR-XA-002 と DR-XA-004。 |

### Trust Boundary

| Boundary | 一貫性 | 敵対評価 |
| --- | --- | --- |
| User → Application / UI | Application が表示、Account 選択、handoff / export confirmation、signing approval を担う | Application が本当に表示・確認したことを Core は独立証明しない。これは明示された責任境界であり、完全防止を要求する finding にはしない。 |
| Application / UI → Native / WASM Binding | Binding は non-authority、representation / transport mediation | Binding が status を省略・不正変換すれば Core 側で失敗する設計。Binding が完全に侵害された場合の valid request rewrite は host / caller trust limitation として残る。 |
| Binding → Wallet Core | Core が password authorization、Store validity、key / account / chain / network、success boundary を所有 | Binding は security condition を省略できない。Core の DTO validation / error meaning を下流で確認する。 |
| Application / persistent storage → opaque Store → Core | Application / Binding は Store を解釈せず、Core が input を検証 | malformed / tampered data は fail-closed。過去の正当な snapshot の現在性は未定義で、DR-XA-001。 |
| Browser / OS / host process | Core の host compromise 防止保証外 | これは Concept / Requirements と一貫。保証外を理由に Core / Binding の non-disclosure を弱めていない。 |

### Authentication / Authorization / Approval

`Profile password authorization`、`user intent`、`signing approval`、`handoff confirmation` は、Concept の明示的アクセス境界と Requirements `SEC-021` / `SEC-022` に沿って Design で別責任になっている。Core は UI を提供せず、Application は cryptographic authority / key owner にならず、password possession は user intent と同一視されない。Persistent unlock、Application-held unlock session、prior password authorization の carry-over は全 Design で禁止されている。

一方、`Confirmed` / `Approved` assertion が別 operation へ明示的に再提出された場合の one-shot / freshness は定義されていない。implicit carry-over の禁止だけで十分か、Core enforcement が必要かは DR-XA-002 と Feedback B に分離した。

### Signing / Blind-signing Responsibility

Application が target / payload を選択・提示し、明示 approval を取得し、Core が processing-unit password authorization、specified key、AccountContext compatibility、raw signing primitive を担う構造は一貫している。Core は transaction meaning、payload presentation、blind-signing UI を担わない。悪意ある Application が表示していない payload を `Approved` と assertion することは Core が防げないが、これは上位 Application responsibility と host compromise limitation に含まれる。Core が status を password から補完したり、Chain / Network を fallback したりする設計はない。

### Profile / Mnemonic / Software Key / Account / Chain / Network

- Profile は Network に固定され、Chain には固定されない。
- Profile は Mnemonic を1つ持つ。
- Derived / Imported / Generated Software Key は Chain に固定され、同じ秘密鍵利用 lifecycle を持つ。
- Account は Software Key と、その fixed Chain + Profile Network 上の利用概念である。
- Application が Account を選択・提示し、Core が Profile / key / Chain / Network compatibility を検証する。
- Symbol ↔ NEM、Mainnet ↔ Testnet の implicit conversion、chain inference、network inference、default fallback は Design から導けない。
- `account_index` は Requirements の HD Wallet compatibility に存在し、Design は HD derivation の責任を Core に残し具体 path / index handling を下流へ委譲している。これは Design-level omission ではない。

### Mnemonic Creation / Handoff / Pending

Architecture と Security Design は、明示的な初回 backup request がある生成経路について、Core generate → intended Application → intended user presentation → receipt confirmation → Application confirmation → Core finalization の6段階を定義する。pending は committed Profile ではなく、stale / unconfirmed state は自動昇格せず、restart 後に authorization を復元しない。Application / Binding が secret output や partial success を勝手に作らない責任も明確である。

Bindings Design の条件省略と downstream evidence の相反文言により、backup request なしの生成経路の success boundary だけが不一致である。DR-XA-004 として上流で解消する。

### Pending / Retry / Restart

失敗・中断・retry・restart 後に existing committed state、secret ownership、Profile isolation、authorization boundary を維持し、temporary / decrypted secret、pending、prior authorization を通常状態へ残さない点は一貫している。retry は新しい operation で、password / required confirmation / approval を再取得する。ただし、再取得を Application assertion の再提出から Core-enforced freshness へ昇格させるかは DR-XA-002。

### Store / Opaque / Atomic Replacement / Fail-closed

Core が version / structure / validity / integrity / consistency を検証し、Binding / Application は opaque blob として保存・転送し、unsupported / unknown / corrupt / inconsistent input、unknown enum、invalid mapping を success / fallback / skip / guessed interpretation に変えない方針は一貫している。状態変更は replacement candidate を返し、Application の保存成功まで committed state としない。保存失敗時に old Store を維持する責任も明確である。

このモデルは入力の改ざん・破損には fail-closed だが、正当な古い Store の再提示には freshness property がない。これは単なる parser 詳細ではなく deletion と committed Store integrity に影響するため DR-XA-001 とした。

### Binding Responsibility / Parity

Native / WASM は同じ Core policy、authorization、secret exposure、failure meaning を使い、Binding は独立 encryption、key management、Store interpretation、migration、approval、fallback、secret retention を持たない。Binding 自身が検証可能な malformed / conversion / ownership failure を fail-safe に扱う正の責任と、任意 invalid pointer / host process memory safety を保証しない限界も矛盾しない。

### Adversarial Scenario Results

| Adversary / scenario | Design result | 判定 |
| --- | --- | --- |
| Malicious Application | Core は target、Profile / key、context、password、Store validity を検証できるが、Application が本当に payload / Mnemonic を提示し、user が確認したかは証明しない。これは明示された Application responsibility と host limitation。 | Accepted boundary。完全な malicious Application prevention を新規要求にしない。Replay の operation freshness は DR-XA-002。 |
| Compromised Binding | status / field omission、malformed conversion、Core error を success に変えることは Design 上禁止され、Core / Binding parity と fail-safe conversion responsibility がある。valid な別 request への rewrite を侵害 Binding から完全に防ぐ authority は Design にない。 | Accepted boundary + downstream focus。Binding が Core security condition を省略可能という gap はない。 |
| Attacker-controlled Store blob | malformed、unsupported version、tampering、inconsistent metadata、unknown enum、partial corruption は Core reject / no mutation / no secret result。valid old snapshot は暗号的に正常なため reject 根拠がない。 | DR-XA-001 Critical。resource exhaustion は downstream / later verification。 |
| Replay attacker | prior password authorization は carry-over されない。pending は stale 非昇格。しかし confirmation / approval assertion の explicit replay freshness / one-shot consumption は定義されていない。 | DR-XA-002 Major。 |
| Confused deputy | Core は profile_id、key_id、AccountContext、fixed Chain、Profile Network の組合せを検証し、mismatch / fallback を拒否する。Application が user intent を偽装する場合は accepted Application boundary。 | Context / authority 分離は合格。status freshness は DR-XA-002。 |
| Cross-chain / cross-network | Profile Network と Software Key fixed Chain を分離し、Symbol / NEM、Mainnet / Testnet の mismatch、unsupported、invalid combination を Core が reject。same raw private key の別 Chain 利用は Requirements どおり別 Software Key。 | 合格。 |
| Secret lifecycle abuse | 通常処理で secret を返さず、explicit handoff / export のみ例外。Core 継続 owner、Binding non-retention、no persistent unlock、failure 後非残留が一貫。実際の copy / memory / JS string lifecycle は下流。 | Design 合格、Implementation focus。 |
| Failure-path abuse | password failure、Store corruption、random / crypto failure、mismatch、pending failure、confirmation failure は state / replacement / secret output を安全側へ保つ設計。persistent storage rollback と valid snapshot replay は DR-XA-001。 | 部分合格。 |

### Application / UI Responsibility Consistency

Application / UI の責任は、Account selection、public information presentation、signing contents presentation、explicit signing approval、export target / request / confirmation、Mnemonic handoff presentation / receipt confirmation、opaque Store save / replacement / backup / transfer に一貫している。Application は signing authority、cryptographic authority、key ownership authority、Store validity authority ではない。Password quality policy は上位 Application / Package であり、Core は empty / unspecified を拒否するだけで独自品質評価を持たない。

### Binding Responsibility Consistency

Native / WASM Binding は transport / representation / ownership / lifecycle / error mediation に限定される。Core contract を省略・補正せず、独立 key management、encryption、authorization、approval、migration、Store parsing、secret retention、fallback をしない。Native と WASM の guarantee boundary は同一であり、Native を Web より強い secret isolation としていない。

### Password / Signing / Export Consistency

- Password authorization: Core が operation ごとに判定し、次 operation、restart、Application session へ持ち越さない。
- Signing approval: Application / UI の content presentation と explicit approval、Core の password authorization / key use を分離する。
- Secret export: target、user explicit request、Application confirmation、per-operation password、operation-specific result を分離し、failure では secret / replacement を返さない。
- Handoff confirmation: user receipt confirmation と Core の Profile finalization を分離する。初回 backup request の適用範囲だけ DR-XA-004。

## Validation Results

- 実施: `AGENTS.md` 全文、共通 review playbook / output format、Concept Review / Requirements Review / Design Review の Skill、reviewers、security-checklist、review-gates、output-format を確認した。
- 実施: `AGENTS.md` に対象 Phase Context の登録がないことを確認し、Phase Context は使用していない。
- 実施: primary target 5文書、latest READY / cleanup review、downstream consistency evidence の対象箇所を確認した。
- 実施: Concept → Requirements → Design、Requirements → Design、Design → Requirements / Concept の traceability を表形式で再確認した。
- 実施: adversarial 8シナリオ、Core ownership、Application / UI、Binding、Profile model、Chain / Network、auth / approval、handoff、pending、Store、atomicity、fail-closed を確認した。
- 実施: 新規 artifact 作成後に Markdown 章順、相対リンク、finding ID 定義の一意性、phase attribution、severity / gate consistency、変更範囲、`git diff --check`、`git diff --cached --check` を機械的に確認した。
- 未実施: Rust formatter、clippy、cargo test、WASM build / check、Native / WASM 実行検証。コード変更がないため対象外。
- 未実施: Implementation Review、Specification Review、Wallet Store Format Review。downstream impact の確認に限定した。

## Review Gates

Design Review Skill の8 Gate と、今回の cross-review Gate を適用した。Gate 不合格に結び付く formal finding は `Critical` の DR-XA-001 である。

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | Concept、Requirements、3 Design が共通 Rust Core、Desktop / Mobile / Web、v1 対象外および downstream phase boundary を共有する。 | なし |
| 2. コンテキストと責任 | 合格 | User、Application / UI、Native / WASM Binding、Core、opaque Store、Browser / OS / host の責任と guarantee limitation が一貫する。 | なし |
| 3. 依存方向 | 合格 | Application / UI → Binding → Core の方向、Core authority、Binding non-authority、Application の non-owner が維持される。 | なし |
| 4. 主要フロー | 不合格 | deletion 後に過去 valid Store が再提示される flow の current-state / reject responsibility が未定義。初回 handoff の条件にも横断不一致がある。 | DR-XA-001、DR-XA-004 |
| 5. データ所有 | 不合格 | Core が秘密情報と logical Store meaning を所有する一方、persistent Store の現在性と削除後無効化の所有者がない。 | DR-XA-001 |
| 6. Security と相互運用性 | 不合格 | Chain / Network、non-disclosure、auth / approval、fail-closed は合格だが、deleted secret non-reuse と valid Store rollback が両立せず、side-channel の normative source も未解決。 | DR-XA-001、DR-XA-003 |
| 7. 上流整合性 | 不合格 | Requirements の deletion / handoff semantics と Design / Bindings / downstream evidence に、rollback および handoff 条件の未解決差がある。 | DR-XA-001、DR-XA-004 |
| 8. 下流実装可能性 | 不合格 | current Store 判定、assertion freshness、handoff optionality、side-channel authority を下流が推測しないと security architecture を一意に実装できない。 | DR-XA-001〜DR-XA-004 |

| Cross-review Gate | `REVISE UPSTREAM DESIGN` | Critical な Store rollback / deletion invariant が残り、Design → Requirements の clarification と Design の責任配置が必要。 | DR-XA-001 |

個別 Design Review の過去 `READY` は維持されるが、本横断 Gate の判定を上書きしない。`Critical = 1` のため、Skill の標準対応値は `REVISE DESIGN` である。

## Remaining Risks and Open Decisions

### Upstream Open Decisions

1. **Deletion と historical Store rollback**: 過去の正当な Store の再提示を deletion non-reuse の脅威として扱うか。扱う場合の current-state authority、reject / recovery 責任、Application / storage / Core の境界。
2. **Confirmation / approval replay**: v1 が禁止するのは implicit carry-over だけか、Core が stale assertion の再提出も拒否するか。悪意ある Application の UI 偽装を完全防止する新規要件とは分離する。
3. **Initial handoff optionality**: explicit initial-backup request がある生成経路だけの条件か、新規生成全件の必須条件か。restore が別経路であること。
4. **Side-channel normative source**: Requirements-level security property とするか、Design invariant として Requirements に追跡するか、実装・release verification の non-normative consideration へ戻すか。

### Accepted / Non-blocking Residual Risks

- Malicious Application / compromised host が、表示していない payload を `Approved` と偽装する、Mnemonic を提示せず `Confirmed` と送る、password を保持して export / sign を呼ぶことを Core が人間の UI 事実として独立証明しない。これは現行 Concept / Requirements の責任境界および host compromise limitation として受け入れ、完全防止を要求していない。
- Compromised Binding が valid な Core request を別の valid request へ書き換える能力を、Binding の non-authority 記述だけで暗号学的に防ぐことは保証されない。Core の context / target validation と Binding parity を後続実装 review で確認する。
- Parser resource exhaustion、actual FFI / memory / zeroization、third-party dependency temporary、browser runtime の完全消去は downstream / Implementation / release verification の範囲であり、今回の上流 Gate を独立に不合格にする根拠にはしていない。

## Automatic Changes

レビュー中の自動変更はない。変更したファイルはこの新規 artifact のみであり、Concept、Requirements、Design、Specification、Implementation、tests、fixtures、README、過去 review artifact は変更していない。

## Final Decision

`REVISE UPSTREAM DESIGN`

`UPSTREAM DESIGN READY` は宣言できない。DR-XA-001 の valid historical Store rollback が、Requirements の deletion non-reuse、committed Store integrity および Core / Application persistence boundary を同時に成立させられないためである。

`SAFE TO PROCEED TO IMPLEMENTATION REVIEW` も宣言できない。少なくとも DR-XA-001 を解消し、DR-XA-002〜DR-XA-004 の open decision / cross-document discrepancy を Requirements / Design の正式資料で確定した後に、Specification および Implementation Review へ進める。
