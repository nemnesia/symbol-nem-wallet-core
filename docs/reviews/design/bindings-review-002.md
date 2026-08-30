# Bindings Design Review 002

## Review Target

- 対象: [`docs/design/bindings.md`](../../design/bindings.md)
- 確認日: 2026-08-30
- 成果物: 本書
- Review Scope: 更新後 Bindings Design の Source of Truth、Concept / Requirements / Architecture / Security Design との依存方向、DR-001〜DR-006 の解消、Binding non-authority、Core-owned security meaning、processing-unit authentication、初回 Mnemonic handoff、explicit export、signing approval、Store / version / migration、pending / failure / retry / restart、Account / Chain / Network、secret ownership / retention、Native / Web guarantee boundary、Native fail-safe responsibility、Browser Extension の責任境界、Design / Specification / Implementation phase boundary および新規 Design-level finding の有無。
- 対象外: Specification / Implementation / Test の適合性、具体的な ABI、pointer / NULL / length / free 契約、JavaScript の具体型、encoding、wire / schema、暗号方式、parser、memory layout、zeroize 実装、実 Application / UI、Browser / OS / host process の compromise 防止。これらは必要な下流整合確認を除き本レビューの規範的根拠としない。
- 変更範囲: レビュー中は Concept、Requirements、Architecture、Security Design、Bindings Design、Specification、Implementation、Test、Skill および過去 review を変更しない。新規作成対象は本 review artifact のみとする。

## Execution Audit

サブエージェントは使用していない。Review Board Chair が次の4つの独立自己レビュー・パスを実施し、候補を反証・統合した。

- Reviewer A（構造と責務）: 完了。Source of Truth、依存方向、コンテキスト、Core / Binding / Application の責務、ownership、trust / guarantee boundary、Native / Web 共通責任および Browser Extension の責任配置を確認した。
- Reviewer B（Security Reviewer）: 完了。protected asset、secret ownership / lifecycle、processing-unit authentication、handoff、explicit export、signing authority、Store、pending、failure safety、chain / network separation、non-authority および downstream security handoff を確認した。
- Reviewer C（フローと運用）: 完了。handoff、export、signing、Store replacement、pending / partial、failure、retry、restart、restart 後の authorization、retention および既存 committed state 保護を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept → Requirements → Architecture → Security Design / Bindings Design → Specification → Implementation の dependency、上流との traceability、下流委譲および推測余地を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を `docs/design/bindings.md` 1件、成果物を本書、Concept / Requirements を normative upstream、Architecture を確定済み全体 Design 基準、Security Design を同一 Design の security consistency 基準、Specification / Implementation を下流として確定した。`AGENTS.md` に Design Phase Context の登録はなく、Context は使用していない。
- Phase 2（反証・統合）: 完了。前回 DR-001〜DR-006 の完了条件を上流資料と更新後 Design の該当箇所へ追跡し、重複候補、回帰および新規 Design-level defect がないことを確認した。

## Evidence Used

### Review Basis

| 区分 | 資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、フェーズ境界、Scope Discipline、秘密情報保護、Validation、変更範囲および Git 運用の確認 |
| Design Reviewer Skill | [`SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/design-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/design-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/design-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/design-review/output-format.md) | Reviewer A〜D、security 観点、finding 採用条件、Gate / Severity、成果物構成および phase boundary の確認 |
| 共通 reviewer policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、Upstream Feedback / Deferred Findings の分離、formal finding の必須項目、検証および成果物規則の確認 |
| Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1、§3、§7〜§10、§12〜§13 | 製品目的、Core 継続 ownership、通常処理での非開示、全環境責任、host compromise の保証限界および下流委譲の確認 |
| Concept review | [`concept-sheet-review-009.md`](../../reviews/concept/concept-sheet-review-009.md) | `CONCEPT READY` と上流 finding の状態確認。Concept 本文の代替にはしていない |
| Requirements | [`requirements.md`](../../requirements/requirements.md) §1〜§2、UC-001 / UC-005 / UC-006 / UC-010 / UC-011、FR-001 / FR-007 / FR-009 / FR-019 / FR-022〜FR-024、NFR-001〜NFR-004、SEC-002〜SEC-004、SEC-010〜SEC-022、AC-001、AC-007、AC-009、AC-024〜AC-026、AC-031〜AC-034、AC-040〜AC-047、§10〜§12 | Binding と Core、processing-unit authentication、handoff、export、signing、Chain / Network、Store、failure、全環境および Binding の責任・受入条件・下流委譲の確認 |
| Requirements review | [`requirements-review-008.md`](../../reviews/requirements/requirements-review-008.md) | `REQUIREMENTS READY` と上流 finding の状態確認。Requirements 本文の代替にはしていない |
| Architecture | [`architecture.md`](../../design/architecture.md) §2〜§5、§6〜§10 | 確定済み全体 Design 基準として、全環境 trust boundary、Binding non-authority、ownership、主要フロー、failure、Store、Chain / Network、downstream handoff を確認 |
| Architecture review | [`architecture-review-002.md`](architecture-review-002.md) | `ARCHITECTURE READY`、Architecture DR-001〜DR-009 の Resolved 状態および同一 Design 基準の確認 |
| Security Design | [`security.md`](../../design/security.md) §2〜§10 | 同一 Design の security consistency 基準として、protected asset、secret mediation、authorization、handoff、export、signing、Store、pending、retention、guarantee boundary および phase boundary を確認 |
| Security review | [`security-review-002.md`](security-review-002.md) | `SECURITY DESIGN READY`、Security Design DR-001〜DR-012 の Resolved 状態および Open Decision 0 の確認 |
| 前回 Bindings review | [`bindings-review-001.md`](bindings-review-001.md) | DR-001〜DR-006 の初出、severity、完了条件および前回状態を確認。前回の自己説明を今回の解消根拠にはしていない |

### Source of Truth

Bindings Design の normative upstream は Concept と Requirements である。Architecture は確定済み全体設計として Binding の責務、依存方向、ownership、lifecycle および全環境共通 invariant を拘束し、Security Design は同一 Design の security responsibility、guarantee boundary、secret ownership、authorization および failure safety の整合基準である。Bindings Design は Binding responsibility を定める同一 Design の成果物であり、Security Design と相互に整合するが、どちらかを他方の normative upstream とはしない。

Specification は Bindings Design から委譲された API、ABI、DTO、wire、validation、error、保存およびその他の具体契約の下流正本であり、Implementation は下流の実現と検証を担う。Specification の既存契約や既存 Implementation の都合から、Binding の responsibility、trust boundary、secret policy、authorization または security meaning を逆算していないことを、Bindings Design §2.1、§10、§11.2 と Architecture / Security Design の source map との照合で確認した。

## Review Result

`READY`

これは Design Reviewer Skill の formal result である。現行の `Critical / Major / Minor` はすべて 0 件で、Gate 不合格に対応する Critical はない。ユーザー指定の Binding Design 完了条件である Critical 0、Major 0、Binding Design-level Open Decision 0、Architecture / Security Design との重大不整合 0、新規重大 finding 0 も満たす。

## Summary

更新後 `bindings.md` は、前回指摘の自己説明だけでなく、Concept / Requirements を上流根拠、Architecture を確定済み全体 Design 基準、Security Design を同一 Design の security consistency 基準、Specification / Implementation を下流として明示している。`Application → Binding → Rust Wallet Core` の依存方向、Binding non-authority、全環境共通の guarantee boundary、Core ownership、主要 security flow および downstream handoff が、上流の確定内容と一致する。

DR-002 の中心である Core-owned security meaning についても、Binding が authorization、user intent、signing approval、handoff / export / Profile success、pending / committed、Store validity / version / migration、Chain / Network compatibility を生成・変更・補正・推測しないことが明示されている。Core の result / error / warning / pending / replacement を同じ意味で返し、failure safety、existing committed state、Profile isolation および retry / restart の境界を維持する責任が下流へ引き渡せる。

Native / Web / WASM の guarantee boundary は対称であり、Application、Browser、OS、host process の compromise 防止を Core / Binding の保証外としつつ、non-disclosure、non-retention、authorization boundary および failure safety を弱めない。Native boundary では、Binding が検証可能な malformed input、変換失敗、ownership / lifecycle failure を fail-safe に扱う正の intent と、任意の invalid memory address・caller process 全体の memory safety・任意 pointer dereference を保証しない限界が分離されている。

Browser Extension の page / background / extension context、process topology、permissions、sandbox、storage architecture は統合先 Application / Browser Extension architecture へ委譲され、Binding は継続 secret owner にならず unnecessary retention を行わない invariant だけを保持する。具体 ABI、pointer、JavaScript type、encoding、package、memory、zeroize、parser、test は Design で過剰に固定されず、適切な下流へ委譲されている。

新規 Design-level finding、Architecture / Security Design の既存 Resolved finding の再発、Upstream Feedback および Binding Design-level Open Decision は確認されなかった。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| DR-001 | Major | Resolved | bindings-review-001 | `bindings.md` §2.1、§10、§11.2 が Concept / Requirements、Architecture / Security Design、Specification / Implementation の役割と依存方向を分離し、下流契約・実装から Binding responsibility を決めないことを明示している。 |
| DR-002 | Major | Resolved | bindings-review-001 | `bindings.md` §3.1、§5.2、§6.1〜§6.6、§9.1、§10.1 が Core-owned meaning、per-operation authentication、handoff、export、signing、Store、pending / failure / retry / restart の無変更 mediation を一意に定めている。 |
| DR-003 | Major | Resolved | bindings-review-001 | `bindings.md` §3.2、§8.1、§9.2 が Native / Desktop / Mobile / Web / WASM を同じ guarantee boundary で扱い、host compromise 非保証と全環境の non-disclosure / failure safety を分離している。 |
| DR-004 | Major | Resolved | bindings-review-001 | `bindings.md` §4.2、§8.1〜§8.2 が Binding 自身の検証可能な入力・変換・ownership / lifecycle failure の fail-safe 責任と、任意 pointer / process memory safety の guarantee limitation を分離している。 |
| DR-005 | Minor | Resolved | bindings-review-001 | `bindings.md` §1、§9.4、§10.2、§10.4 が具体 crate、ABI、型、encoding、storage API、package、memory、zeroize を固定せず、責務・trust boundary・security invariant のみを下流へ引き渡している。 |
| DR-006 | Minor | Resolved | bindings-review-001 | `bindings.md` §10.3 が Browser Extension の topology、context、permissions、sandbox、storage architecture を統合先 Application / Browser Extension architecture へ委譲し、Binding 固有の共通 invariant だけを残している。 |

## Required Changes

なし。Critical の New / Open / Reopened は確認されなかった。ユーザー指定の Binding Design completion condition でも、Major の現行 Open / Reopened は 0 件である。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened はなく、今回の Design review で追加修正を要求する finding はない。

## Resolved Findings

### DR-001 — Source of Truth / Dependency Direction

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`bindings.md:15-42`](../../design/bindings.md#L15)、[`bindings.md:317-374`](../../design/bindings.md#L317)
- 前回の発生条件: 前回は Specification と公開契約が Binding responsibility の上流根拠に見え、Concept / Requirements、Architecture、Security Design、Specification、Implementation の役割分離が不十分だった。
- 今回確認した事実: §2.1 は Concept / Requirements を normative upstream とし、Architecture を確定済み全体 Design の拘束基準、Security Design を同一 Design の security consistency 基準として置いている。Specification は API / ABI / DTO / wire / validation / error / 保存等の具体契約の下流正本、Implementation は下流実現としている。§10、§11.2 も同じ区分を維持し、Specification の既存形式や Implementation の都合で Binding の responsibility、trust boundary、secret policy、security meaning を決めないと明記している。
- 上流との照合: Architecture §2.1、§11.2 は Concept / Requirements → Architecture → Specification / Implementation の方向と、Security / Bindings を同一 Design の関連資料とする。Security Design §2.1、§11.2 は Architecture に従い、Bindings を整合確認先、Specification / Implementation を下流とする。Bindings Design はこの全体関係を Binding の責務へ適用しており、Architecture / Security Design を上書きしていない。
- 影響確認: 第三者は本書と上流資料から、`Concept → Requirements → Architecture → Security Design / Bindings Design → Specification → Implementation` を説明できる。Specification / Implementation の下流具体化は責任・境界の根拠になっていない。
- 解消判定: `Resolved`。前回の source map 逆転余地は除去され、下流から security architecture を逆生成しない境界が一意になった。
- 完了条件または再確認方法: Concept / Requirements を normative upstream、Architecture / Security Design を同一 Design の基準、Specification / Implementation を下流とする対応を本文と上流 Design の source map で確認した。

### DR-002 — Core-owned Security Meaning の無変更 Mediation

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`bindings.md:73-97`](../../design/bindings.md#L73)、[`bindings.md:115-124`](../../design/bindings.md#L115)、[`bindings.md:174-244`](../../design/bindings.md#L174)、[`bindings.md:301-307`](../../design/bindings.md#L301)
- 前回の発生条件: 前回は Binding が `opaque` data を運ぶ一般責務は示していたが、authentication、handoff、export、signing、Store、pending / failure / retry / restart の Core-owned meaning を変更しない条件が一意でなかった。
- 今回確認した事実: §3.1 は authorization、user intent、signing approval、handoff / export / Profile / Software Key success、pending / committed、Store validity / version / migration、Chain / Network compatibility を Binding が生成・変更・補正・推測しないと定め、Core の result / error / warning / pending / replacement を同じ security meaning で伝える。§6.1 は unlock session、authorization cache、previous authentication result carry-over、restart 後の authorization state および継続 secret-capable state を禁止し、retry を新しい operation とする。
- Initial Mnemonic handoff: §6.3 は Core が生成し、intended Application へ渡し、Application が intended user へ提示し、user が明示受領確認し、Application が Core へ伝達し、Core が Profile success を最終確定する順序を示す。Binding 通過、Mnemonic の返却、Application が受領したことだけでは success とせず、confirmation を推測せず、Profile success を確定せず、unconfirmed / stale pending を committed へ昇格しない。提示不能、未確認、確認伝達不能、中断、最終確定失敗時も success output / partial success を作らない。
- Explicit export: §6.4 は target、user explicit request、Application / UI confirmation、confirmed request、Core の per-operation password authorization を別条件として保持する。Binding は password authorization を user intent と同一視せず、normal operation を export へ変換せず、confirmed request を生成・追加・削除・補正せず、failure を success にしない。`password authorization != user intent confirmation` が維持されている。
- Signing: §6.5 は Application / UI の Account 選択、内容提示、明示 approval、approved request と、Core の password authorization、compatibility、signing primitive、result / error / warning を分離する。Binding は approval を生成・推測せず、Profile password authorization を approval として扱わない。
- Store / state: §5.2 は Store を opaque とし、version interpretation、schema normalization、migration、fallback、guessed interpretation、unknown data correction、内部編集を Binding が行わない。v1 no migration、unsupported / unknown / corrupt / inconsistent reject、replacement、existing committed state 保護を Core の意味として維持する。§6.6 は pending / partial を committed にせず、stale pending を復活・昇格せず、未保存 replacement を committed とせず、failure / interruption / conversion error を success にしない。retry は再入力・再確認・再認証を伴う新しい operation、restart 後は authorization / unlocked / secret-capable state を継続しない。
- 上流との照合: Requirements の FR-001、FR-007、FR-009、FR-019、FR-022〜FR-024、SEC-002、SEC-004、SEC-010、SEC-014、SEC-018、SEC-021、SEC-022、AC-001、AC-007、AC-009、AC-018、AC-034、AC-041〜AC-047、§10 はこれらを Core / Application の責任として定める。Architecture §3〜§6、Security Design §3、§6 は同じ success / failure / authorization / state boundary を定める。Bindings Design はこれらを変更せず transport / mediation へ反映している。
- 解消判定: `Resolved`。Binding が security meaning を作る・補正する・昇格する余地は、Design-level invariant と下流 handoff により除去された。
- 完了条件または再確認方法: authentication、handoff、export、signing、Store、pending / failure / retry / restart の各条件を上流資料と本文で逐条照合し、Binding が Core の result / error / warning / pending / replacement を意味変更なく伝えることを確認した。

### DR-003 — Native / Web 共通 Guarantee Boundary

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`bindings.md:52-97`](../../design/bindings.md#L52)、[`bindings.md:283-299`](../../design/bindings.md#L283)
- 前回の発生条件: 前回は Web / Browser compromise の保証限界が具体化されていたが、Native / Desktop / Mobile の OS / host process / Application compromise を同じ guarantee boundary とする記述が明示不足だった。
- 今回確認した事実: §3.2 は Native、Desktop、Mobile、Web、WASM の方式差を representation、ownership、lifecycle の mediation に限定し、Native Binding を Web / WASM より強い secret isolation boundary と扱わない。Application、Browser、OS、host process の compromise 防止は Core / Binding の guarantee 外である一方、non-disclosure、non-retention、per-operation authorization、pending 非昇格、failure safety、compatibility policy を全経路で維持するとしている。§9.2 も同じ判断を採用している。
- 上流との照合: Concept §7、§9〜§10、Requirements NFR-004、SEC-020、AC-024、AC-040、Architecture §3.1、§4.4、§8、Security Design §3.2、§8 は全環境の host compromise 非保証と、compromise を理由に Core / Binding の責任を弱めない原則を定める。Bindings Design は Web 固有の防御方式や Native 固有の強い隔離を追加していない。
- 影響確認: Native / Desktop / Mobile だけ secret retention / disclosure を緩和する読み方、または Native Binding が Web より強い保護境界であるという読み方は成立しない。
- 解消判定: `Resolved`。全環境共通 guarantee boundary と、保証外でも維持する Binding invariant が同一文脈で明示されている。
- 完了条件または再確認方法: Native と Web / WASM の両経路について、host compromise 非保証と non-disclosure / non-retention / authorization / failure safety 維持を同じ design rule として確認した。

### DR-004 — Native Boundary Safety Intent

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`bindings.md:115-124`](../../design/bindings.md#L115)、[`bindings.md:260-281`](../../design/bindings.md#L260)
- 前回の発生条件: 前回は任意の不正 pointer を救済しない限界はあったが、Binding 自身が検証可能な malformed input、変換失敗、ownership / lifecycle failure を安全側に扱う正の Design intent と、Core meaning / secret exposure を変えない責任の分離が不足していた。
- 今回確認した事実: §4.2 は Binding 自身が検出できる input、conversion、ownership / lifecycle failure を fail-safe に扱う責任を定める。§8.1 は検証可能な malformed input を Core へ意味不明のまま渡さず、failure を success に変換せず、Core の result / error / warning の meaning を置き換えず、失敗経路で secret output、retention、persistent secret state、partial state を増やさない intent を定める。§8.2 は任意の invalid memory address の救済、caller process 全体の memory safety、任意 pointer dereference の安全性を保証しないと分離し、pointer validity、NULL、length、alias、free、panic handling、FFI safety を下流へ委譲している。
- 上流との照合: Requirements NFR-002、NFR-003、SEC-012、SEC-018、Architecture §4.2、§8、Security Design §3、§10 は Binding の conversion / ownership / failure boundary と、具体 FFI / memory implementation の下流委譲を区別している。Bindings Design は任意 pointer の安全性を新しい保証にせず、検証可能な境界入力の fail-safe 責任だけを定めている。
- 影響確認: Native 経路だけが変換失敗、入力不備、panic / error、出力失敗を通じて Core の security meaning、secret exposure または partial state を変更する設計余地はない。
- 解消判定: `Resolved`。正の fail-safe responsibility と guarantee limitation が混同されていない。
- 完了条件または再確認方法: Native の Design responsibility と、具体的 pointer / NULL / aliasing / panic handling の下流事項を分離して確認した。WASM を含む共通 invariant との矛盾もない。

### DR-005 — Design / Implementation Phase Boundary

- Severity: `Minor`
- Status: `Resolved`
- 対象箇所: [`bindings.md:3-11`](../../design/bindings.md#L3)、[`bindings.md:283-315`](../../design/bindings.md#L283)、[`bindings.md:317-344`](../../design/bindings.md#L317)
- 前回の発生条件: 前回は具体 crate、package type、JavaScript representation、encoding、storage API 等が基本設計の採用判断として読める部分があった。
- 今回確認した事実: §1 は特定 crate、ABI、JavaScript 型、package、storage API、Browser context、memory technique を決定しない。§9.4 は Design で定めるものを Binding responsibility、trust / guarantee boundary、security meaning の無変更 mediation、secret non-retention、failure responsibility および downstream handoff に限定している。§10.2、§10.4 は `wasm-bindgen`、`cdylib`、`staticlib`、exact C ABI、pointer、free、JavaScript type、`Uint8Array`、raw / UTF-8、hex / Base64、package layout、storage API、zeroize API、memory lifetime 等を固定せず、Specification / Implementation / release verification または Application architecture へ委譲している。
- Design invariant の保持: 具体方式を委譲しても、no implicit conversion、no unnecessary retention、no persistent secret state、Core meaning の無変更 mediation、failure safety および all-environment invariant は維持される。方式未決定を理由に security responsibility まで委譲していない。
- 上流との照合: Concept §7、§9、Requirements §1.3、§12.3、Architecture §10、Security Design §10 は Binding の具体方式、API / ABI、memory、encoding、storage、zeroization、test を下流へ委譲する。Bindings Design は phase boundary をこの委譲と一致させている。
- 解消判定: `Resolved`。基本設計の責務と implementation technique の混在は解消され、下流が方式を選択しても本書の invariant を変更できない構造になっている。
- 完了条件または再確認方法: 指定された具体方式を本書の mandatory implementation として固定していないことと、責務・trust boundary・security invariant が下流へ明示的に引き渡されることを確認した。

### DR-006 — Browser Extension Responsibility Boundary

- Severity: `Minor`
- Status: `Resolved`
- 対象箇所: [`bindings.md:86-97`](../../design/bindings.md#L86)、[`bindings.md:317-344`](../../design/bindings.md#L317)
- 前回の発生条件: 前回は page / background / extension context の構成が Binding の採用方針として読め、統合先 Browser Extension architecture の責任と混在していた。
- 今回確認した事実: §10.3 は page context、background context、extension context、process topology、sandbox、permission、storage architecture および Application state を統合先 Application / Browser Extension architecture の責任と明示し、Binding の normative policy / guarantee としていない。§3.2、§9.2、§10.3 は、WASM が JavaScript / Browser compromise から secret を完全隔離する境界ではないこと、Binding が継続 secret owner ではなく不要な retention を行わないこと、host compromise 非保証が non-disclosure / failure safety を弱めないことだけを Binding invariant として残している。
- 上流との照合: Concept §7、§9〜§10、Requirements §2.4、§12.3、Architecture §3〜§4、Security Design §3〜§4、§8 は Browser / Extension の状態・storage・host security と Core / Binding の共通責任を分けている。Bindings Design は特定の Extension topology、permission、sandbox または storage API を規範化していない。
- 影響確認: Extension の topology を変更しても Binding responsibility、Core guarantee、secret ownership、non-retention および failure safety の設計を変更する必要はない。
- 解消判定: `Resolved`。Browser Extension architecture の責任越境は除去され、Binding が保持する invariant と統合先への委譲が分離されている。
- 完了条件または再確認方法: 指定された Browser Extension topology を本書の normative policy としていないことと、WASM / Binding の限界・non-disclosure・failure safety が維持されることを確認した。

## Upstream Feedback

なし。Concept review 009、Requirements review 008、Architecture review 002、Security review 002 の状態は、それぞれ `CONCEPT READY`、`REQUIREMENTS READY`、`ARCHITECTURE READY`、`SECURITY DESIGN READY` である。さらに、Concept / Requirements 本文、Architecture、Security Design の責任・security property・全環境 boundary・下流委譲は Bindings Design を安全に完了判定するために十分であり、Bindings Design 自身の責任不足を上流 gap として扱う必要はない。

## Deferred Findings

正式な Deferred Finding はない。次の事項は Bindings Design の設計欠陥ではなく、本文から下流または統合先へ明示的に委譲された事項である。

- Specification へ委譲: API、ABI、DTO、request / result / warning / pending / replacement、handoff confirmation、explicit export 条件、approved signing request、Store / Profile version、reject、opaque data、Account / Chain / Network mismatch、pending / failure / retry / restart の具体的外部契約。
- Implementation / release verification へ委譲: exact pointer / NULL / length / alias / free、JavaScript type、raw / UTF-8 / hex / Base64、buffer lifecycle、copy、allocator、memory lifetime、zeroization、parser、resource limit、side-channel、FFI、test、fixture、interop および runtime / target の検証。
- Application / Browser Extension architecture へ委譲: page / background / extension context、process topology、permissions、sandbox、storage architecture、Application state、host security。WASM が Browser / JavaScript compromise の完全隔離境界でないことと、Binding が unnecessary retention を許容しないことは Bindings Design の invariant として残る。
- 未確認範囲: Specification / Implementation / Test / fixture の適合性、実 Application / UI / Binding、外部 Node、実 handoff / export / signing approval、具体 crypto、wire / schema、parser、actual memory / FFI、actual zeroization および runtime / OS の完全消去。これらの未確認は本レビューの判定を妨げない。

## Scope and Traceability

- 対象境界: `docs/design/bindings.md` の Native Binding と Web / WASM Binding に共通する責務、Core / Application 間の mediation、trust / guarantee boundary、secret ownership / lifecycle および下流 handoff。
- Concept → Requirements: Concept の Core 継続 ownership、通常処理での非開示、Desktop / Mobile / Web 共通原則、host compromise 非保証を Requirements §2.2〜§2.4、UC-001 / UC-005 / UC-006 / UC-010 / UC-011、NFR-001〜NFR-004、SEC-010、SEC-015、SEC-017、SEC-020〜SEC-022、AC-024〜AC-026、AC-032、AC-034、AC-040〜AC-043 へ追跡した。
- Requirements → Architecture: Profile = Network 固定・Chain 非固定、Software Key = Chain 固定、Core processing-unit authentication、handoff、export、signing、Store no migration、pending / failure / retry / restart、Profile isolation および Binding non-authority を Architecture §3〜§9 へ追跡した。
- Architecture / Security Design → Bindings: Architecture §3〜§6、§8〜§10 と Security Design §3〜§10 の確定済み responsibility、ownership、trust boundary、authorization、failure safety、guarantee boundary および phase boundary を `bindings.md` §3〜§10 へ照合した。Bindings Design はこれらを上書きせず、Binding-specific mediation として詳細化している。
- Binding → downstream: `bindings.md` §10.1〜§10.4 は、security architecture を変更しない具体契約を Specification、Implementation / release verification、Application / Browser Extension architecture へ分けている。具体 API / ABI / wire / memory / parser / test の不足を本レビューの Design finding としていない。
- Design phase boundary: Binding は representation、ownership、lifecycle、transport、error / warning の bridge として定義され、Core security meaning、authorization、Store interpretation、signing authority、Browser Extension topology を所有しない。specific crate、package、type、encoding、pointer、free、memory、zeroize、parser、test は固定されていない。
- 回帰確認: Architecture review 002 の DR-001〜DR-009 および Security review 002 の DR-001〜DR-012 が確定した Core ownership、全環境 trust boundary、processing-unit authentication、handoff、export、signing、Store、Chain / Network、pending / failure / retry / restart、side-channel / memory phase boundary と矛盾しない。Account / Chain / Network と secret ownership / retention にも回帰はない。

## Domain Checks

### System Context / Responsibility / Dependency

合格。`bindings.md` §3〜§4 は User、Application / UI、Native Binding、Web / WASM Binding、Rust Wallet Core、Browser、OS、host process、persistent storage を配置し、`Application / UI → Binding → Rust Wallet Core` の方向を明示している。Binding は transport、representation、ownership、lifecycle、error / warning の mediation に限定され、Core の security authority や Application の user intent / UI responsibility を代替しない。

### Protected Assets / Secret Ownership / Lifecycle

合格。§5.1 は Mnemonic、Software Key private key、Profile password、derived / decrypted secret、Wallet Store、pending / partial / replacement を区別する。Core が継続的な owner / security responsibility を持ち、handoff / export の外部 copy と Core 内原本を分離する。Binding は persistent secret state、cache、global state、log、diagnostic、不要 copy / retention を作らず、具体的 lifetime / zeroize は下流へ委譲する。

### Trust / Guarantee Boundary

合格。Native、Desktop、Mobile、Web、WASM を同一の non-authority、non-disclosure、non-retention、per-operation authorization、failure safety invariant で扱う。Application、Browser、OS、host process の compromise 防止は保証外だが、保証外を理由に Binding の責任を弱めない。Native を Web / WASM より強い secret isolation boundary としていない。

### Authentication / Authorization

合格。§6.2 は processing-unit authentication を Core に残し、Binding の unlock session、authorization cache、previous result carry-over、restart 後の authorization state および継続 secret-capable state を禁止する。retry は入力・必要 confirmation・password authorization を再取得する新しい operation である。password authorization は user intent または signing approval の代替にならない。

### Initial Mnemonic Handoff

合格。§6.3 は Core 生成 → intended Application への handoff → Application による intended user への提示 → user の明示受領確認 → Application から Core への確認伝達 → Core の Profile 最終確定の6段階を維持する。Binding 通過、Mnemonic の返却、Application が値を受け取ったことだけでは success にならず、confirmation を推測せず、unconfirmed / stale pending を committed に昇格しない。失敗・中断・最終確定失敗時に Profile / partial state / secret output を成功扱いしない。

### Explicit Export

合格。§6.4 は export target、user explicit request、Application / UI confirmation、confirmed request、Core per-operation password authorization を独立条件として保持する。`password authorization != user intent confirmation` を維持し、normal operation から export へ変換せず、target / request を補正せず、失敗時に secret / Profile / Store を成功状態へ変更しない。成功後は Core 内原本を Core、外部 copy を受領側が責任を持つ。

### Signing Authority

合格。§6.5 は Application / UI の Account 選択、内容提示、明示 approval、approved request と、Core の authorization、compatibility、signing primitive、result / error / warning を分ける。Binding は signing approval を生成・推測せず、Profile password authorization を approval と扱わず、Core の signing result の意味を変更しない。

### Store / Version / Migration

合格。§5.2 は Wallet Store / Profile data を opaque とし、Binding / Application の version interpretation、schema normalization、migration、fallback、guessed interpretation、unknown data correction、内部編集を禁止する。v1 no migration、Core の validity / version / reject、existing committed state 保護および未保存 replacement の非 committed 性を維持する。

### Pending / Failure / Retry / Restart

合格。§6.6 は pending / partial != committed、stale / unconfirmed 非昇格、failure / interruption / conversion error の success 変換禁止、未保存 replacement の非 committed、previous auth / temporary secret の retry authorization 再利用禁止、restart 後の authorization / unlocked / secret-capable state 非継続を定める。Core の failure、Profile isolation、existing committed state および ownership の意味を変更しない。

### Native Fail-safe Responsibility

合格。§8.1 は Binding 自身が検証可能な malformed input、representation conversion failure、ownership / lifecycle conversion failure、境界条件違反を fail-safe に扱う責任を定める。同時に §8.2 は任意 invalid address、caller process 全体、任意 pointer dereference の安全性を保証外とし、具体 pointer / NULL / aliasing / free / panic handling を下流へ委譲している。二つの責任は混同されていない。

### Account / Chain / Network

合格。§7 は Profile Network、Software Key Chain、Account の対応関係を維持し、Core を supported set、compatibility、mismatch、reject の判断主体とする。Binding は Symbol / NEM、Mainnet / Testnet を共通化せず、mismatch を補正せず、fallback / implicit conversion を行わない。具体 identifier、byte、address、derivation、protocol は下流委譲である。

### Browser Extension Responsibility

合格。§10.3 は page / background / extension context、process topology、permissions、sandbox、storage architecture を統合先 Application / Browser Extension architecture の責任とする。Binding は topology を規範化せず、WASM / Browser compromise 非隔離、継続 secret owner でないこと、unnecessary retention をしないこと、host compromise 非保証でも non-disclosure / failure safety を維持することだけを保持する。

### Security Invariants / Downstream Handoff

合格。§10.1 は handoff、export、signing、Store、Chain / Network、pending / failure / retry / restart、all-environment non-disclosure、Binding non-authority、processing-unit authentication および user intent 分離を Specification へ引き継ぐ。§10.2 は memory、FFI、zeroization、parser、side-channel、test / fixture 等を Implementation / release verification へ引き継ぐ。下流が security architecture を推測する必要はない。

## Validation Results

- 実施: `AGENTS.md`、更新済み Design Reviewer Skill 一式、共通 reviewer policy、指定された Concept / Concept review / Requirements / Requirements review / Architecture / Architecture review / Security Design / Security review、更新後 `bindings.md` および `bindings-review-001.md` の確認。
- 実施: Reviewer A〜D の独立自己レビュー、Chair による DR-001〜DR-006 の完了条件・上流根拠・影響・phase boundary・重複・回帰・新規候補の反証と統合。
- 実施: Markdown の章順・見出し、finding ID heading の重複、DR-001〜DR-006 の status、相対リンク先、Concept / Requirements / Architecture / Security / target 参照、Design phase boundary、変更範囲および `git diff --check` の確認。
- 未実施: Rust formatter、clippy、cargo test、WASM check。変更対象は review artifact のみで、コード、Binding、Specification、Implementation、Test を変更していないため対象外。
- 未確認: Specification / Implementation / Test / fixture の適合性、実 Application / UI / Binding、外部 Node、実 handoff / export / signing approval、具体 crypto、wire / schema、parser、actual memory / FFI、actual zeroization、actual constant-time および runtime / OS の完全消去。これらは下流の検証範囲であり、今回の Design 判定の normative source ではない。

## Review Gates

Design Reviewer Skill の formal Gate は、Gate 不合格に対応する Critical がないため `READY` である。加えて、今回のユーザー指定 Binding Design completion gate は以下のとおりである。

| Gate / 完了条件 | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | §1 が Native / Web / WASM Binding の対象、対象外、Core との関係および下流委譲を示す。 | DR-005、DR-006（解消確認） |
| 2. コンテキストと責任 | 合格 | §3〜§5 が Application / Binding / Core、全環境 guarantee boundary、secret ownership、外部 copy、Browser Extension の責任を分離する。 | DR-002、DR-003、DR-004、DR-006（解消確認） |
| 3. 依存方向 | 合格 | §2.1、§4、§11.2 が Concept / Requirements → Architecture → Security Design / Bindings Design → Specification → Implementation を区分する。 | DR-001（解消確認） |
| 4. 主要フロー | 合格 | §6.1〜§6.6 が authentication、handoff、export、signing、Store、pending、failure、retry、restart の meaning と責任を定める。 | DR-002（解消確認） |
| 5. データ所有 | 合格 | §5 が Core original、external copy、opaque Store、pending / partial / replacement、non-retention および既存状態保護を定める。 | DR-002、DR-003（解消確認） |
| 6. Security と相互運用性 | 合格 | §3、§5〜§8 が non-authority、per-operation authorization、signing boundary、Store policy、Chain / Network separation、fail-safe および全環境 guarantee を定める。 | DR-002、DR-003、DR-004、DR-006（解消確認） |
| 7. 上流整合性 | 合格 | Concept / Requirements の ownership、explicit access、handoff、signing、Store、failure、Chain / Network と Architecture / Security Design の確定責任に重大な矛盾がない。 | DR-001〜DR-006（解消確認） |
| 8. 下流実装可能性 | 合格 | §10〜§11 が security architecture を固定し、API、ABI、wire、encoding、memory、parser、zeroize、test、Browser Extension topology 等を適切な下流へ委譲する。 | DR-001、DR-004、DR-005、DR-006（解消確認） |
| Critical = 0 | 合格 | 現行 Critical 0 件。 | なし |
| Major = 0 | 合格 | DR-001〜DR-004 はすべて Resolved、現行 Open / Reopened Major 0 件。 | DR-001〜DR-004 |
| Binding Design-level Open Decision = 0 | 合格 | §9 の設計判断は上流へ追跡でき、§10 の具体事項は下流委譲されている。 | なし |
| Architecture / Security Design との重大不整合 = 0 | 合格 | Architecture review 002、Security review 002 の既存 Resolved finding を再発させていない。 | なし |
| 新規重大 finding = 0 | 合格 | 独立4パスで新規 Critical / Major を確認しなかった。 | なし |

Formal Review Gate: `READY`。

以上により、**BINDINGS DESIGN READY**。

Design フェーズ全体の完了条件も次のとおり満たす。

| Design phase completion condition | 結果 | 根拠 |
| --- | --- | --- |
| Architecture = `ARCHITECTURE READY` | 合格 | `architecture-review-002.md` の確定状態。 |
| Security Design = `SECURITY DESIGN READY` | 合格 | `security-review-002.md` の確定状態。 |
| Bindings Design = `BINDINGS DESIGN READY` | 合格 | 本レビューの Binding completion gate。 |
| Design-level Critical = 0 | 合格 | Architecture / Security / Bindings の現行 Critical 0。 |
| Design-level Major = 0 | 合格 | Architecture / Security の既存 finding および DR-001〜DR-004 はすべて Resolved。 |
| Design-level Open Decision = 0 | 合格 | Architecture、Security、Bindings の completion condition を満たす。 |
| Concept / Requirements への Upstream Feedback = 0 | 合格 | 現在の上流資料に不足・矛盾を返す必要はない。 |
| Design phase boundary の重大違反 = 0 | 合格 | 具体 ABI、memory、crypto、parser、test、Browser Extension topology を Design の mandatory implementation として固定していない。 |

以上により、**DESIGN PHASE READY TO CLOSE**。これは Specification の正しさを示すものではなく、更新済み Specification Reviewer Skill による Specification の独立再レビューへ進める状態を示す。

## Remaining Risks and Open Decisions

- Binding Design-level Open Decision: なし（0件）。
- 残存する下流リスク: Specification / Implementation / release verification が、handoff、explicit export、signing approval、Store reject、per-operation authentication、Account / Chain / Network compatibility、pending / failure / retry / restart、non-disclosure、non-retention、FFI / ownership および memory phase boundary を具体契約・実装・検証へ正しく反映する必要がある。
- Host compromise risk: Application、Browser、OS、host process の compromise 防止は Core / Binding の保証外である。ただし、これは通常処理の non-disclosure、non-retention、Core authorization、Binding non-authority または failure safety を弱めない。
- 未確認事項: 実下流実装、fixture、runtime、外部 Node、Application / UI の実際の handoff / export / signing approval および具体的 memory / zeroization。これらは Specification / Implementation の独立レビュー・検証事項である。
- Upstream Feedback: なし。

## Automatic Changes

なし。Concept、Requirements、Architecture、Security Design、`docs/design/bindings.md`、Specification、Implementation、Test、README、Skill および `bindings-review-001.md` は変更していない。新規に作成したのは本 review artifact のみである。

## Final Decision

`READY`

DR-001〜DR-006 はすべて `Resolved`、新規 finding はなく、現行の `Critical / Major / Minor = 0 / 0 / 0` 件である。Binding Design-level Open Decision は 0 件で、Architecture / Security Design との重大不整合、Concept / Requirements への Upstream Feedback、Design phase boundary の重大違反もない。

**BINDINGS DESIGN READY**

Architecture = `ARCHITECTURE READY`、Security Design = `SECURITY DESIGN READY`、Bindings Design = `BINDINGS DESIGN READY` を満たし、Design-level blocking finding がないため、**DESIGN PHASE READY TO CLOSE** と判定する。次のフェーズとして、更新済み Specification Reviewer Skill による Specification の独立再レビューへ進めることができる。この判定は Specification 自体の正しさを意味しない。
