# Design Review Findings: Security

## Review Target

- 対象: [`docs/design/security.md`](../../design/security.md)
- 確認日: 2026-08-30
- 成果物: `docs/reviews/design/security-review-002.md`
- 対象ベース名: `security`。前回成果物 [`security-review-001.md`](security-review-001.md) の DR-001〜DR-012 を再確認し、更新後本文の回帰と新規 finding を独立評価した。
- Review Scope: Security Design の Source of Truth、protected asset、secret ownership / lifecycle、全環境 trust boundary、processing-unit authentication、初回 Mnemonic handoff、explicit secret export、signing authority、Store security / version / migration、pending / failure / retry / restart、Account / Chain / Network、constant-time / side-channel、zeroization / memory、third-party dependency guarantee boundary、Specification / Implementation handoff および Architecture / Bindings との整合。
- 未確認範囲: Specification / Implementation / Test / fixture の実装適合性、具体 API / ABI / DTO / wire format / parser / error、暗号方式・パラメータ、具体 memory / FFI / zeroization、実 Application / UI、外部 Node、host compromise 防止および第三者ライブラリ内部の完全消去。これらは Security Design の normative source ではなく、必要な下流委譲・整合境界の確認範囲に限った。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として、根拠管理、候補の反証・統合、重大度、Gate および成果物を担当した。
- Reviewer A（構造と責務）: 完了。目的・範囲、Source of Truth、Architecture との依存方向、全 actor、Core / Binding / Application の責務、ownership および境界を確認した。
- Reviewer B（Security primary）: 完了。指定された protected asset、trust boundary、secret lifecycle、authorization、handoff、export、signing、Store、failure safety、Chain / Network および phase boundary を確認した。
- Reviewer C（フローと運用）: 完了。生成、復元、取込み、導出、登録、署名、password change、削除、handoff、export、Store failure、pending、retry、restart および committed state protection を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept → Requirements → Architecture → Security / Bindings → Specification → Implementation の依存、Architecture から Security Design への traceability、security invariant の下流 handoff および具体実装詳細の非固定を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を `docs/design/security.md` 1件、Concept / Requirements を normative upstream、Architecture を確定済み同一 Design 基準、Bindings を整合確認先、Specification / Implementation を下流委譲先として確定した。`AGENTS.md` に Design Phase Context の登録はなく、Context は使用していない。
- Phase 1（独立レビュー）: 完了。A〜D の担当観点から、更新後 Security Design を Concept、Requirements、Architecture および前回 finding の完了条件へ照合した。
- Phase 2（反証・統合）: 完了。DR-001〜DR-012 の対象一致、根拠、影響、Design で決める事項と下流委譲事項の境界、回帰および重複を再確認した。新規 finding 候補は formal finding として採用しなかった。
- Phase 3（ゲート・成果物）: 完了。成果物作成後に共通章順、finding ID、status、相対リンク、参照先、変更範囲および `git diff --check` を検証する。

## Evidence Used

### Review Basis

| 種別 | 参照資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、フェーズ順、Scope Discipline、秘密情報保護、Validation および Git 運用を確認 |
| Design Reviewer Skill | [`SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/design-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/design-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/design-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/design-review/output-format.md) | Reviewer A〜D、Security primary、finding 採用条件、phase boundary、severity、formal Gate および成果物構成を確認 |
| 共通 reviewer policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、Upstream Feedback / Deferred Findings の分離、finding 必須項目、検証および成果物構成を確認 |
| 上流 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1、§3、§7〜§10、§12〜§13 | Core 継続 secret ownership、通常処理での非開示、明示的 secret access、全環境共通原則および host compromise 保証限界を確認 |
| Concept review | [`concept-sheet-review-009.md`](../concept/concept-sheet-review-009.md) | `CONCEPT READY` と CS-004 / CS-005 の Resolved 状態を履歴として確認。Security Design の正否の代替にはしていない |
| 上流 Requirements | [`requirements.md`](../../requirements/requirements.md) §2、UC-001〜UC-011、FR-001〜FR-024、SEC-001〜SEC-022、DR-005、DR-009、AC-001〜AC-047、§10〜§12 | protected asset、Core ownership、processing-unit authentication、handoff、export、signing approval、Store policy、Chain / Network、atomicity、failure および下流委譲の主根拠 |
| Requirements review | [`requirements-review-008.md`](../requirements/requirements-review-008.md) | `REQUIREMENTS READY` と RR-001〜RR-029 の Resolved 状態を履歴として確認。Requirements 本文の代替にはしていない |
| 同一 Design の確定基準 | [`architecture.md`](../../design/architecture.md) §2.1、§3〜§10 | Security Design が従う responsibility、ownership、trust boundary、lifecycle、authorization、failure model および downstream handoff の基準 |
| Architecture review | [`architecture-review-002.md`](architecture-review-002.md) | `ARCHITECTURE READY`、Architecture DR-001〜DR-009 の Resolved、Architecture-level Open Decision なしを履歴として確認。Security Design の独立判定を先取りしていない |
| 同一 Design の整合確認先 | [`bindings.md`](../../design/bindings.md) §2〜§8 | Binding non-authority、Native / WASM の境界、ownership / lifecycle の責務整合を補助確認。Bindings の独立レビューは行っていない |
| 対象 Security Design | [`security.md`](../../design/security.md) §1〜§11 | 更新後本文の責務、asset、lifecycle、authorization、handoff、export、signing、Store、Chain / Network、phase boundary および委譲を独立評価 |
| 前回レビュー | [`security-review-001.md`](security-review-001.md) | DR-001〜DR-012 の発生条件、完了条件、severity および status 追跡 |

### Source of Truth

Concept / Requirements が Security Design の normative upstream である。Architecture は確定済み同一 Design フェーズの基準であり、Security Design はその security responsibility、ownership、trust boundary、lifecycle および invariant を詳細化するが、Architecture を上書きしない。Bindings は同一 Design の整合確認先であり、Specification / Implementation は Security Design が確定した責任・境界・invariant を具体化する下流である。更新後 §2.1 はこの関係を明示し、下流の具体契約から security responsibility を逆算しない。

## Review Result

`READY`

## Summary

更新後の Security Design は、前回 DR-001〜DR-012 が要求した責任・境界・lifecycle・認可・成功 / 失敗条件・phase boundary を Architecture と Requirements に追跡可能な形で配置している。Security Design は Architecture を上書きせず、Bindings を同一 Design の整合確認先、Specification / Implementation を下流委譲先として扱っている。

現在の正式 finding はなく、DR-001〜DR-012 はすべて `Resolved` である。新規 finding、Architecture regression、Security Design-level Open Decision は確認されなかった。したがって formal Gate は `READY`、かつ次工程の `bindings.md` review へ進める Security Design 完了条件を満たす。

| 集計範囲 | Critical | Major | Minor |
| --- | ---: | ---: | ---: |
| DR-001〜DR-012（現行 New / Open / Reopened） | 0 | 0 | 0 |
| DR-001〜DR-012（今回 Resolved） | 0 | 10 | 2 |
| 新規 finding | 0 | 0 | 0 |

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| DR-001 | Major | Resolved | security-review-001 | §2.1 が Concept / Requirements を normative upstream、Architecture を同一 Design 基準、Bindings を整合確認先、Specification / Implementation を下流として分離し、Architecture の非上書きと逆算禁止を明示する。 |
| DR-002 | Major | Resolved | security-review-001 | §5.1 が指定された全 protected asset の継続 responsibility、一時取扱い、通常非開示、明示例外、failure / interruption、lifecycle 終了責任を配置する。 |
| DR-003 | Major | Resolved | security-review-001 | §3 が全 actor / boundary と全環境共通 invariant を配置し、host compromise 非保証が Core / Binding の通常非開示・authorization responsibility を弱めないと明示する。 |
| DR-004 | Major | Resolved | security-review-001 | §6.1 が全 secret-capable operation、Core per-operation password authorization、session / cache / carry-over / restart 非継続および retry 再認証を明示する。 |
| DR-005 | Major | Resolved | security-review-001 | §6.2 が Mnemonic handoff の6段階、確認前非 committed、失敗時非成功・非開示・既存状態保護および Core 外 copy の責任を定める。 |
| DR-006 | Major | Resolved | security-review-001 | §6.3 が export target、user explicit request、Application / UI confirmation、confirmed request、Core authorization、非暗黙遷移、対象外非返却および原本 / 外部 copy を分離する。 |
| DR-007 | Major | Resolved | security-review-001 | §6.4 が Application / UI の Account 選択・内容提示・明示承認・approved request と、Core の authorization・compatibility・key use・signing primitive・result を分離する。 |
| DR-008 | Major | Resolved | security-review-001 | §6.5 が Core の version / validity / integrity / consistency 検証、対応 version 限定、fail-closed reject、no fallback / guessed interpretation / implicit migration、opaque boundary、existing state preservation を定める。 |
| DR-009 | Major | Resolved | security-review-001 | §6.6 が pending / partial 非 committed、Core の成功昇格責任、stale 非昇格、failure safety、retry 再取得、previous state 非再利用および restart 後非継続を定める。 |
| DR-010 | Major | Resolved | security-review-001 | §7 が Profile / Software Key / Account の固定関係、Core compatibility 検証、fail-closed reject、状態・secret 不変、fallback / implicit conversion 禁止および Binding / Application non-authority を定める。 |
| DR-011 | Minor | Resolved | security-review-001 | §8.1 が side-channel の Design-level intent、Core implementation responsibility、保証外範囲および Specification / Implementation / release verification への handoff を定め、具体 technique を固定しない。 |
| DR-012 | Minor | Resolved | security-review-001 | §8.2 が必要最小限 lifetime、retention / persistent copy 禁止、Binding non-owner、failure 後非残留、log / diagnostic / cache 禁止および guarantee boundary を定め、具体 memory / FFI を委譲する。 |

## Required Changes

なし。`Critical` の New / Open / Reopened はなく、formal Gate 不合格に対応する Required Change はない。

## Optional Improvements

なし。`Major` / `Minor` の New / Open / Reopened はなく、Bindings review 前に解消すべき Security Design-level finding も残っていない。

## Resolved Findings

### DR-001 — Security Design の normative source と下流委譲の方向

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:15-42`](../../design/security.md#L15)
- 発生条件または確認できた事実: 前回は Specification / Bindings が `上流根拠` と同列に扱われ、下流形式から security responsibility を逆算できる読解余地があった。
- 今回確認した事実: §2.1 は Concept / Requirements を normative upstream、Architecture を確定済み同一 Design 基準、Bindings を整合確認先、Specification / Implementation を下流と明示する。Architecture を上書きせず、下流から security responsibility を逆算しない。
- 既存の根拠: [`architecture.md:24-41`](../../design/architecture.md#L24)、[`requirements.md:11-19`](../../requirements/requirements.md#L11)。
- 影響と判定: 第三者が `Concept → Requirements → Architecture → Security / Bindings → Specification → Implementation` の方向と Security Design の位置を説明でき、依存方向の逆転は解消された。
- 必要な最小修正または確認: 追加修正なし。今後も Specification / Implementation の具体契約を Security Design の normative source として扱わないことを下流へ引き継ぐ。
- 完了条件または再確認方法: §2.1、§10、§11.2 と Architecture §2.1 の source map が一致し、Architecture の上書き・下流からの逆算を許さないことを確認した。

### DR-002 — Protected asset と secret ownership / lifecycle

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:133-156`](../../design/security.md#L133)
- 発生条件または確認できた事実: 前回は asset ごとの継続 owner、一時 mediation、公開例外、failure / interruption、lifecycle 終了責任が一意でなかった。
- 今回確認した事実: §5.1 は Mnemonic、Software Key private key、derived / decrypted secret material、Profile password、temporary secret、Core 管理下 Store、signing authority、pending / partial state に含まれ得る secret を個別行で扱う。各行に Core の継続 responsibility、必要範囲の一時取扱い、通常非開示、handoff / export の明示例外、failure / interruption および終了時 obligation がある。
- 既存の根拠: [`architecture.md:169-193`](../../design/architecture.md#L169)、[`requirements.md:64-92`](../../requirements/requirements.md#L64)。
- 影響と判定: Core 外の mediation は ownership transfer ではなく、export / handoff 後の external copy は受領側、Core 内原本は Core という区分が §5.1、§5.2 から一意に追跡できる。temporary / derived material は必要処理中の Core responsibility として、継続利用可能な状態への残留を禁じている。
- 必要な最小修正または確認: 追加修正なし。具体 buffer、copy count、zeroize API、memory lifetime は下流委譲のままとする。
- 完了条件または再確認方法: 指定された全 asset の生成・利用・公開例外・失敗・中断・終了責任を §5.1、§5.2、§6.6、§8.2 から確認した。

### DR-003 — 全環境の trust boundary と共通 security invariant

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:55-92`](../../design/security.md#L55)
- 発生条件または確認できた事実: 前回は Desktop / Mobile / Web、Native / WASM、Browser / OS / host process および周辺層を含む共通 model が不足していた。
- 今回確認した事実: §3.1 の actor table は User、Desktop / Mobile Application、Web Application / Browser Extension、Native Binding、Web / WASM Binding、Rust Core、Browser、OS、host process、persistent storage、Transaction layer、Network layer を配置する。§3.2 は全環境で Core ownership、通常非開示、Core authorization、Binding / Application non-authority を共通 invariant とする。
- 既存の根拠: [`architecture.md:54-100`](../../design/architecture.md#L54)、[`requirements.md:230-233`](../../requirements/requirements.md#L230)。
- 影響と判定: Browser / OS / host process の compromise 防止を Core の保証外としつつ、その保証外を理由に通常処理の非開示・authorization・failure safety を弱めないことが明確で、環境差による security architecture の分岐はない。
- 必要な最小修正または確認: 追加修正なし。OS sandbox、Browser internals、process isolation は本 Design の normative detail としない。
- 完了条件または再確認方法: §3.1 の全 actor、§3.2 の共通 invariant、§4.3 の経路差非変更を Architecture §3〜§4 と突合した。

### DR-004 — Processing-unit authentication の適用範囲と非継続境界

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:158-176`](../../design/security.md#L158)
- 発生条件または確認できた事実: 前回は全 secret-capable operation の一覧、Binding / Application の session 非提供、carry-over / retry / restart 非継続が不足していた。
- 今回確認した事実: §6.1 は signing、derivation、Imported / Generated Software Key registration、Profile password change、Mnemonic export、Software Key private key export、Software Key deletion、Profile deletion を列挙する。Core が各 operation の Profile password を authorization し、Binding / Application の unlock session / authorization cache、previous result carry-over、Core の継続 Unlocked state および restart 後の authorization state を禁止し、retry を再認証としている。
- 既存の根拠: [`architecture.md:294-309`](../../design/architecture.md#L294)、[`requirements.md:163-165`](../../requirements/requirements.md#L163)。
- 影響と判定: password authorization の有効範囲が当該 operation のみに限定され、Application / Binding が Core の認可を代替できない。高影響 operation だけが別の認可 model になる余地は解消された。
- 必要な最小修正または確認: 追加修正なし。token、session API、password representation は下流へ委譲する。
- 完了条件または再確認方法: §6.1 の一覧と継続禁止を Architecture §6.5、Requirements FR-007 / SEC-002 / SEC-014 と突合した。

### DR-005 — Initial Mnemonic handoff の成功境界と actor 責任

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:178-193`](../../design/security.md#L178)
- 発生条件または確認できた事実: 前回は handoff を例外とするだけで、6段階の成功境界、確認前非 committed、failure / interruption、外部 copy の責任が不足していた。
- 今回確認した事実: §6.2 は Core の完全な Mnemonic 生成、意図された Application への受渡し、Application による利用者提示、利用者の明示的受領確認、Application から Core への確認伝達、Core によるその後の Profile 最終確定を順序づける。確認前は committed Profile ではなく、提示・受領・伝達・確定の失敗、中断、未確認では partial Profile を成功扱いしない。
- 既存の根拠: [`architecture.md:225-240`](../../design/architecture.md#L225)、[`requirements.md:135-149`](../../requirements/requirements.md#L135)。
- 影響と判定: Core は UI、紙・外部媒体への保存または将来の紛失を独立検証せず、Core 内原本は Core、handoff 後の Core 外 copy は Application / 利用者とする。failure / diagnostic への Mnemonic 漏えいと existing committed state の破壊も禁止される。
- 必要な最小修正または確認: 追加修正なし。callback / ACK、pending 表現、transport は下流へ委譲する。
- 完了条件または再確認方法: §6.2 を Architecture §6.1、Requirements FR-001 / SEC-010 / SEC-017 / SEC-018 / AC-034 と突合した。

### DR-006 — Explicit secret export の二重 authorization boundary

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:195-214`](../../design/security.md#L195)
- 発生条件または確認できた事実: 前回は export の対象、user intent、Application / UI confirmation、confirmed request、Core authorization、原本 ownership が分離されていなかった。
- 今回確認した事実: §6.3 は target、利用者の明示要求、Application / UI の intent confirmation、confirmed request の送信、Core の対象解決と当該 operation の Profile password authorization、対象 secret のみの返却を独立して定める。password authorization と user intent confirmation を別 property とし、通常処理から暗黙 export しない。
- 既存の根拠: [`architecture.md:277-292`](../../design/architecture.md#L277)、[`requirements.md:187-191`](../../requirements/requirements.md#L187)。
- 影響と判定: password possession や任意の API 呼出しだけでは成立せず、対象外 secret は返らない。failure 時は secret と Profile / Store を変更せず、成功後も Core 内原本は Core、external copy は受領側となる。
- 必要な最小修正または確認: 追加修正なし。具体 UI、request field、export buffer、受渡し方式は下流へ委譲する。
- 完了条件または再確認方法: §6.3 を Architecture §6.4、Requirements FR-022〜FR-023 / SEC-021 / AC-041〜AC-043 と突合した。

### DR-007 — Signing authority と user signing approval の分離

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:216-233`](../../design/security.md#L216)
- 発生条件または確認できた事実: 前回は raw payload の signing primitive の記述に対し、Application の Account 選択・内容提示・明示承認・approved-only request が引き渡されていなかった。
- 今回確認した事実: §6.4 は Application / UI の Account 選択、payload / Transaction 内容の提示、利用者が確認できる状態、明示的 signing approval、approved request のみの送信を定める。Core は per-operation password authorization、Account / Software Key / Chain / Network compatibility、private key use、signing primitive、署名結果を担う。
- 既存の根拠: [`architecture.md:256-275`](../../design/architecture.md#L256)、[`requirements.md:167-169`](../../requirements/requirements.md#L167)。
- 影響と判定: `Profile password authorization != signing approval` が明示され、Core が UI や user intent を推測しないことと Application の承認責任が両立する。Core は Transaction の意味説明・構築・確認 UI を担わない。
- 必要な最小修正または確認: 追加修正なし。具体 sign API、payload field、表示方式は下流へ委譲する。
- 完了条件または再確認方法: §6.4 を Architecture §6.3、Requirements FR-009 / SEC-022 / AC-009 と突合した。

### DR-008 — Opaque Store の validity、version および v1 migration policy

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:235-243`](../../design/security.md#L235)
- 発生条件または確認できた事実: 前回は Store を opaque とする記述はあったが、Core の version / validity 検証、unsupported / corrupt reject、no fallback、v1 migration 非提供、reject 時の状態保護が不足していた。
- 今回確認した事実: §6.5 は Store を attacker-controlled input とし、Core が version、validity、integrity、consistency を検証し、v1 の対応 version だけを処理する。unsupported / unknown / corrupt / inconsistent / 安全に対応できない data は fail-closed に reject し、推測、読み替え、fallback、黙った解釈・無視、implicit migration をしない。Application / Binding は opaque 保存・転送だけを行い、reject 時は existing committed state 不変、secret 非返却とする。v1 は Store / Profile version migration を提供しない。
- 既存の根拠: [`architecture.md:195-209`](../../design/architecture.md#L195)、[`requirements.md:266-278`](../../requirements/requirements.md#L266)。
- 影響と判定: attacker-controlled Store の trust transition と reject 後の状態保護が Security Design から一意に追跡でき、Application / Binding が Core policy を代替する余地は解消された。
- 必要な最小修正または確認: 追加修正なし。parser、field、serialization、error、migration 手順は下流へ委譲する。
- 完了条件または再確認方法: §6.5 を Architecture §5.2、§8、§9.3、Requirements DR-009 / SEC-004 / AC-045 と突合した。

### DR-009 — Pending / partial、failure、retry、restart の security responsibility

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:245-258`](../../design/security.md#L245)
- 発生条件または確認できた事実: 前回は failure 時の一般的な非返却だけで、pending / partial の意味、stale 非昇格、retry 再認証、restart 後の非継続および previous state 非再利用が不足していた。
- 今回確認した事実: §6.6 は pending / partial を committed state ではないとし、Core が security meaning と success promotion 条件を所有し、Application は committed と扱わず、Binding は意味・authorization policy を変更せず、stale / unconfirmed を自動昇格させない。failure / interruption では existing state、ownership、Profile isolation、authorization boundary を維持し、temporary / decrypted secret を通常状態・diagnostic・cache に残さない。retry は Store、input、confirmation、password authorization を再取得する新規 operation、restart 後は unlocked / authorization / 未確認 pending を復元しない。
- 既存の根拠: [`architecture.md:211-221`](../../design/architecture.md#L211)、[`architecture.md:294-309`](../../design/architecture.md#L294)、[`requirements.md:335-350`](../../requirements/requirements.md#L335)。
- 影響と判定: Application が partial を committed と扱うこと、stale pending / secret / previous auth を再利用すること、restart 後に認可状態を復活させることを Security Design が排除する。
- 必要な最小修正または確認: 追加修正なし。pending representation、timeout、rollback、memory lifetime は下流へ委譲する。
- 完了条件または再確認方法: §6.6 を Architecture §5.3 / §6.5、Requirements SEC-003 / SEC-005 / SEC-017〜SEC-019 / AC-037〜AC-039 / AC-046 と突合した。

### DR-010 — Account と Chain / Network compatibility の security boundary

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`security.md:260-273`](../../design/security.md#L260)
- 発生条件または確認できた事実: 前回は Profile Network と Software Key Chain の固定はあったが、Profile の Chain 非固定、Account の関係、Core compatibility reject、fallback / implicit conversion 禁止および reject 時の不変条件が不足していた。
- 今回確認した事実: §7 は Profile = Network 固定・Chain 非固定、Software Key = Chain 固定、Account = fixed Chain + fixed Profile Network 上の利用を明示する。Core が supported / requested Chain / Network、Profile Network、Software Key Chain および compatibility を検証し、unsupported / mismatch / invalid combination を fail-closed に reject する。reject 時は Profile、Software Key、committed Store、secret を変更・返却せず、fallback / implicit conversion をしない。
- 既存の根拠: [`architecture.md:311-321`](../../design/architecture.md#L311)、[`requirements.md:179-181`](../../requirements/requirements.md#L179)、[`requirements.md:220-222`](../../requirements/requirements.md#L220)。
- 影響と判定: Symbol / NEM と Mainnet / Testnet の境界、Derived / Imported / Generated を含む Core の compatibility responsibility、Binding / Application non-authority が一意である。
- 必要な最小修正または確認: 追加修正なし。identifier、byte 表現、derivation path、chain-specific contract は下流へ委譲する。
- 完了条件または再確認方法: §7 を Architecture §7、Requirements FR-013 / FR-024 / DR-005 / AC-013 / AC-047 と突合した。

### DR-011 — Constant-time / side-channel の Design phase boundary

- Severity: `Minor`
- Status: `Resolved`
- 対象箇所: [`security.md:275-286`](../../design/security.md#L275)
- 発生条件または確認できた事実: 前回は specific function、byte arithmetic、loop、mask、carry / borrow、intermediate、machine code、assembly inspection および wall-clock threshold が Design の規範と混在していた。
- 今回確認した事実: §8.1 は不要な timing / side-channel exposure を増やさない security intent、secret-dependent behavior の risk を Implementation で扱う責任、Core implementation の cryptographic side-channel responsibility、compiler / target / dependency / runtime / OS / host の保証外範囲、Specification / Implementation / release verification への handoff を定める。具体関数・算術・loop・mask・中間値・machine code・assembly inspection は固定しない。
- 既存の根拠: [`architecture.md:366-381`](../../design/architecture.md#L366)、[`requirements.md:371-388`](../../requirements/requirements.md#L371)。
- 影響と判定: security intent は失われず、下流が安全な technique と検証方式を選択できる。Design guarantee と target / compiler / dependency / runtime 等の guarantee 外を区別できるため、phase boundary の過剰固定は解消された。
- 必要な最小修正または確認: 追加修正なし。actual arithmetic、machine code、assembly および release verification の詳細は Implementation / release 側で確認する。
- 完了条件または再確認方法: §8.1、§10 の委譲項目および §11.1 の traceability を、Architecture §8、§10 と突合した。

### DR-012 — Zeroization / memory responsibility の phase boundary

- Severity: `Minor`
- Status: `Resolved`
- 対象箇所: [`security.md:288-306`](../../design/security.md#L288)
- 発生条件または確認できた事実: 前回は exact buffer、pointer、mutable type、free、storage API、copy および zeroize の実装詳細が Security Design に固定されていた。
- 今回確認した事実: §8.2 は必要最小限の secret lifetime、unnecessary retention / persistent copy の禁止、Binding non-owner、failure / interruption / retry / restart 後の non-residual principle、log / diagnostic / cache 非開示、Core / Binding の lifecycle responsibility、host / runtime / third-party 全体の guarantee 外を定める。exact zeroize target、buffer、borrow / owned ABI、pointer、free、type、copy count、allocator、memory lifetime、zeroize library / API は下流へ委譲する。
- 既存の根拠: [`architecture.md:181-193`](../../design/architecture.md#L181)、[`architecture.md:366-381`](../../design/architecture.md#L366)、[`requirements.md:371-388`](../../requirements/requirements.md#L371)。
- 影響と判定: Core / Binding の責任境界、通常非開示、failure 後非残留および host / runtime / third-party copy の保証限界を維持しつつ、実装方式を不必要に固定しない。第三者内部 temporary の完全消去を v1 の暗黙保証にせず、そのためだけの fork / local patch を v1 必須にしない方針も、明示 ownership 範囲と下流検証へ整理されている。
- 必要な最小修正または確認: 追加修正なし。具体 memory / FFI / zeroization と dependency update の検証は Specification / Implementation / release verification へ委譲する。
- 完了条件または再確認方法: §8.2〜§8.3、§10、§11.1 を Architecture §4.2、§8、§10 と突合し、Design invariant と Implementation technique の境界を確認した。

## Upstream Feedback

なし。Concept review 009 は `CONCEPT READY`、Requirements review 008 は `REQUIREMENTS READY`、Architecture review 002 は `ARCHITECTURE READY` であり、本文の実体照合でも Security Design の安全な評価・完了を妨げる上流の不足、曖昧さまたは矛盾は確認されなかった。今回の DR-001〜DR-012 は上流欠落ではなく、更新前 Security Design の配置・境界の問題として解消された。

## Deferred Findings

正式な Deferred Finding はない。以下は Security Design が確定した responsibility、ownership、trust boundary、success / failure boundary および invariant を、下流で具体化・検証する事項である。

- API、ABI、DTO、request field、callback / ACK、error code、wire / schema、parser、resource limit および具体的な Store / pending representation。
- KDF、AEAD、nonce、salt、key length、署名方式、HD derivation、protocol byte 列および Chain 固有の具体 contract。
- exact buffer、copy / clone、allocator、pointer、free、memory layout、exact lifetime、zeroize API、unsafe、FFI pointer safety、JavaScript の具体型および Browser 固有 storage API。
- handoff / export / signing の具体 UI、transport、確認表現、実 Application / UI / Binding の適合性、実際の external node および interop fixture。
- Store validation、authentication failure、failure safety、side-channel、zeroization、release verification、test / fuzz の具体実装。
- Browser、OS、host process、Application 自体の compromise 防止、process isolation、OS sandbox、Browser internals、および third-party dependency 内部 temporary の完全消去。これらは本書の guarantee 外であり、Core / Binding の通常処理での非開示・authorization・failure responsibility を弱める理由にはならない。

## Scope and Traceability

### 上流・同一 Design・下流の責任関係

| 区分 | 正本 / 参照 | Security Design での扱い |
| --- | --- | --- |
| Normative upstream | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md) | 目的、v1 範囲、Core 継続 ownership、security property、外部責任および受入条件の根拠 |
| 同一 Design の確定基準 | [`architecture.md`](../../design/architecture.md) | Architecture の ownership、trust boundary、lifecycle、authorization、failure responsibility および invariant に従って詳細化する。上書きしない |
| 同一 Design の整合確認先 | [`bindings.md`](../../design/bindings.md) | Binding non-authority、Native / WASM の値・ownership・lifecycle 境界を確認する。Security Design の upstream ではない |
| 下流委譲先 | Specification / Implementation | Security Design の invariant と責任境界を API、validation、error、crypto、wire、memory、FFI、実装および検証へ具体化する。下流から逆算しない |
| 履歴資料 | Concept / Requirements / Architecture / Security の各 review | finding と Gate の状態履歴。現行 normative source ではない |

### Architecture regression

Architecture review 002 で `Resolved` の Architecture DR-001〜DR-009 を再発させる記述はない。現行 Security Design は、normative dependency（§2.1）、全環境 trust boundary（§3）、handoff（§6.2）、export（§6.3）、signing（§6.4）、Store / migration（§6.5）、Account / Chain / Network（§7）、per-operation auth（§6.1）、pending / failure / retry / restart（§6.6）を Architecture の確定内容と整合させている。

### Related Design Consistency

重大な Related Design inconsistency はない。`bindings.md` §2〜§8 の `Application → Binding → Rust Wallet Core`、Binding non-authority、opaque data の受渡し、Native / WASM で Core policy を変えない責務は、Security Design §3〜§4、§6、§8 と整合する。`bindings.md` の API / ABI・memory・実装契約そのものは今回の独立レビュー対象ではない。

### Phase Boundary

Security Design が確定するのは、protected asset、継続 owner、temporary mediation、allowed secret flow、trust boundary、authorization boundary、signing authority、failure responsibility、全環境共通 invariant、side-channel / lifetime の security intent および downstream handoff である。API、ABI、DTO、wire、parser、error、暗号方式・パラメータ、具体 UI、buffer、pointer、free、copy、allocator、zeroize、actual constant-time、assembly、test は下流へ委譲され、本文の normative detail として固定されていない。

### Specification / Implementation Handoff

Specification へは、handoff 6段階、explicit export の二重条件、signing の Application approval と Core authorization、全 operation の per-operation authentication、Store reject / no migration、Account / Chain / Network compatibility、pending / failure / retry / restart、全環境共通 non-disclosure および Binding non-authority を引き継ぐ。Implementation / release verification へは、side-channel risk、secret lifetime、不要 retention、zeroization、FFI / ownership、parser、validation、error、test / fixture および target / dependency / runtime の guarantee 確認を引き継ぐ。下流が security architecture を推測して補完する必要はない。

## Domain Checks

### Protected Asset

合格。§5.1 は Mnemonic、Software Key private key、derived / decrypted secret material、Profile password、temporary secret、Core 管理下 Store、signing authority、pending / partial に含まれ得る secret を個別に扱う。Core の継続 responsibility、temporary mediation、通常非開示、handoff / export の成功例外、failure / interruption 時の扱い、lifecycle 終了 obligation が追跡可能である。Core 外 mediation は ownership transfer ではなく、external copy の受領側責任と Core 内原本の Core responsibility が分離されている。

### Trust Boundary

合格。§3.1 は User、Desktop Application、Mobile Application、Web Application、Browser Extension、Native Binding、Web / WASM Binding、Core、Browser、OS、host process、persistent storage、Transaction layer、Network layer を配置する。§3.2 は全環境で ownership、通常非開示、Core authorization、Binding / Application non-authority、failure safety を共通化し、host compromise 非保証が Core / Binding の責任を弱めない。

### Processing-unit authentication

合格。§6.1 は signing、derivation、Imported / Generated registration、password change、Mnemonic / Software Key export、Software Key deletion、Profile deletion に Core の per-operation Profile password authorization を適用する。authorization は当該 operation のみ有効で、Core の継続 Unlocked state、Binding / Application の session / cache、previous result carry-over、restart 後の authorization state はない。retry は再認証である。

### Mnemonic handoff

合格。§6.2 は Core 生成 → 意図された Application への受渡し → Application による利用者提示 → 利用者の明示的受領確認 → Application から Core への確認伝達 → Core の Profile 最終確定の6段階を成功境界とする。確認前は committed Profile ではなく、failure / interruption / 未確認では partial を成功扱いせず、既存 committed state を壊さず、secret を failure / diagnostic へ漏らさない。Core は UI / 外部 backup を独立検証しない。

### Explicit export

合格。§6.3 は export target、user explicit request、Application / UI intent confirmation、confirmed request、Core の当該 operation password authorization を独立条件として扱う。password authorization と user intent は別であり、通常処理から暗黙 export せず、対象外 secret を返さず、failure 時は secret / state を変更しない。成功後も原本は Core、external copy は受領側である。

### Signing authority

合格。§6.4 は Application / UI の Account 選択、payload / Transaction 内容提示、確認可能性、明示承認、approved-only request と、Core の password authorization、Account / Software Key / Chain / Network compatibility、private key use、signing primitive、result を分離する。`password authorization != signing approval` が明示され、Core は Transaction の意味や UI を担わない。

### Store / migration

合格。§6.5 は attacker-controlled input、Core による version / validity / integrity / consistency validation、対応 version 限定、unsupported / unknown / corrupt / inconsistent reject、no fallback / guessed interpretation / implicit migration、existing committed state preservation、secret 非返却、Application / Binding の opaque non-authority を定める。v1 は Store / Profile version migration を提供しない。

### Pending / failure / retry / restart

合格。§6.6 は pending / partial を committed から分離し、Core が meaning / promotion を所有、Application の committed 扱いと Binding の policy 変更を禁止する。stale 自動昇格をせず、failure / interruption で existing state、ownership、Profile isolation、authorization boundary を維持し、temporary / decrypted secret を残さない。retry は input / confirmation / password を再取得する新規 operation、restart 後は authorization / unconfirmed pending を復元しない。

### Account / Chain / Network

合格。§7 は Profile = Network 固定・Chain 非固定、Software Key = Chain 固定、Account = fixed Chain + fixed Profile Network とする。Core が supported / mismatch / invalid combination を検証して fail-closed に reject し、reject 時に state / secret を変更・返却せず、fallback / implicit conversion をしない。Application / Binding は policy を代替しない。

### Constant-time phase boundary

合格。§8.1 は不要な timing / side-channel exposure を増やさない intent、Core implementation の responsibility、secret-dependent behavior の下流扱い、compiler / target / dependency / runtime / host の保証外範囲、Specification / Implementation / release verification handoff を定める。specific function、arithmetic、loop、mask、carry / borrow、intermediate、machine code、assembly は固定しない。

### Zeroization / memory phase boundary

合格。§8.2 は必要最小限 lifetime、unnecessary retention / persistent copy 禁止、Binding non-owner、failure / interruption / retry / restart 後の non-residual、log / diagnostic / cache 非開示、Core / Binding lifecycle responsibility を定める。host / runtime / third-party 完全消去を guarantee 外とし、exact buffer、pointer、free、type、allocator、copy count、zeroize API 等を下流へ委譲する。

### Third-party dependency guarantee boundary

合格。§8.3 は Core / Binding が明示的に ownership を持つ範囲と third-party dependency / compiler / runtime / host 内部 temporary を区別し、第三者内部 temporary の完全消去を v1 の暗黙保証に含めない。そのためだけの fork / local patch を v1 必須にせず、依存更新時の compatibility、secret exposure、side-channel、guarantee boundary の確認を下流へ引き継ぐ。特定 library の現行実装を normative detail としていない。

### Specification / Implementation handoff

合格。§10 は security responsibility、ownership、trust boundary、success / failure boundary、authorization boundary および invariant を Specification と Implementation / release verification へ明示的に分けて引き継ぐ。Security Design が決めるべき security architecture は一意であり、API、wire、parser、crypto parameter、buffer、zeroize、pointer、test 等の方式を下流が選択できる。

## Validation Results

- 実施: `AGENTS.md`、更新済み Design Reviewer Skill 一式、共通 reviewer policy、Concept 本文、Concept review 009、Requirements 本文、Requirements review 008、Architecture 本文、Architecture review 002、更新後 Security Design、前回 Security review 001 および Bindings Design の確認。
- 実施: Reviewer A〜D の独立自己レビュー、Chair による DR-001〜DR-012 の完了条件・根拠・影響・フェーズ境界・重複・回帰の反証と統合。
- 実施: Markdown の章順・見出し、finding ID heading の重複、DR-001〜DR-012 の status、相対リンク先、Concept / Requirements / Architecture / Security の参照、phase boundary、変更範囲および `git diff --check` の検証。
- 未実施: Rust formatter、clippy、cargo test、WASM check。変更対象は review artifact のみで、コード、Binding、Specification、Implementation、Test を変更していないため対象外。
- 未確認: Specification / Implementation / Test / fixture の適合性、実 Application / UI / Binding、外部 Node、実際の handoff / export / signing approval、暗号方式、wire format、parser、具体 memory / FFI、actual constant-time、third-party library 内部の完全消去。これらは下流の検証範囲であり、今回の Security Design 判定の normative source ではない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | §1 が Security Design の対象、対象外、v1 migration 非提供および下流委譲を示す。 | DR-001（解消確認） |
| 2. コンテキストと責任 | 合格 | §3〜§4 が全 actor、trust / guarantee boundary、Core / Binding / Application / storage / Transaction / Network の責任と全環境共通 invariant を示す。 | DR-002、DR-003（解消確認） |
| 3. 依存方向 | 合格 | §2.1 が Concept / Requirements → Architecture → Security / Bindings → Specification → Implementation を区分し、Architecture の非上書きと下流からの逆算禁止を明示する。 | DR-001（解消確認） |
| 4. 主要フロー | 合格 | §6.1〜§6.6 が handoff、export、signing、authentication、Store failure、pending、retry、restart の success / failure responsibility を示す。 | DR-004、DR-005、DR-006、DR-007、DR-008、DR-009（解消確認） |
| 5. データ所有 | 合格 | §5.1〜§5.2 が全 protected asset、Core 原本、external copy、opaque Store、pending / partial、replacement、existing state preservation を示す。 | DR-002、DR-005、DR-006、DR-008、DR-009（解消確認） |
| 6. Security と相互運用性 | 合格 | §3、§5、§6.1、§6.3〜§6.6、§7〜§8 が non-disclosure、authorization、signing authority、Chain / Network separation、fail-closed、Binding non-authority、side-channel / memory boundary を定める。 | DR-003、DR-004、DR-006、DR-007、DR-008、DR-009、DR-010、DR-011、DR-012（解消確認） |
| 7. 上流整合性 | 合格 | Concept / Requirements の Core ownership、explicit access、handoff、signing、Store policy、failure、Chain / Network および Architecture の確定責任と矛盾しない。 | DR-001〜DR-010（解消確認） |
| 8. 下流実装可能性 | 合格 | §10〜§11 が security architecture を固定し、API、wire、parser、crypto、memory、FFI、UI、test 等を適切な下流へ委譲する。 | DR-001〜DR-012（解消確認） |

Formal Gate: `READY`。現行の `Critical / Major / Minor` は `0 / 0 / 0` 件である。

### Security Design completion gate

| 完了条件 | 結果 | 根拠 |
| --- | --- | --- |
| Critical = 0 | 合格 | 現行 Critical 0 件。 |
| Major = 0 | 合格 | DR-001〜DR-010 はすべて Resolved、現行 Open / Reopened Major 0 件。 |
| Security Design-level Open Decision = 0 | 合格 | §9 の判断が Architecture / Requirements に追跡でき、§10 の下流事項は仕様方式として委譲されている。 |
| Architecture との重大不整合 = 0 | 合格 | Architecture review 002 の DR-001〜DR-009 は再発せず、確定責任を §2〜§8 へ反映している。 |
| 新規重大 finding = 0 | 合格 | 独立再レビューで New Critical / Major は確認されなかった。 |

以上により、**SECURITY DESIGN READY**。`bindings.md` review へ進める。

## Remaining Risks and Open Decisions

- Security Design-level Open Decision: なし。
- Architecture regression: なし。Architecture review 002 の DR-001〜DR-009 は全件 `Resolved` のままである。
- 残存する下流リスク: Specification / Implementation / release verification が、handoff、export、signing approval、Store reject、per-operation authentication、Chain / Network compatibility、pending / failure / retry / restart、side-channel intent、secret lifetime および non-residual invariant を具体契約・実装・検証へ正しく反映する必要がある。
- Host compromise risk: Browser、OS、host process、Application 自体の compromise 防止は Core の保証外である。ただしこれは通常処理の非開示、Core authorization、Binding non-authority、failure safety を弱めない。
- Third-party dependency risk: third-party 内部 temporary の完全消去は v1 の Core / Binding guarantee 外であり、その保証境界、依存更新時の compatibility、secret exposure、side-channel を下流・release verification で確認する。

## Automatic Changes

なし。レビュー中に Concept、Requirements、Architecture、`security.md`、`bindings.md`、Specification、Implementation、Test、README、Skill 本体または過去レビュー成果物は変更していない。新規に作成したのは本 review artifact のみである。

## Final Decision

`READY`

DR-001〜DR-012 はすべて `Resolved`、新規 finding はなく、現行の `Critical / Major / Minor` は `0 / 0 / 0` 件である。更新後 Security Design は、Concept / Requirements を normative upstream、Architecture を確定済み同一 Design 基準、Bindings を整合確認先、Specification / Implementation を下流委譲先として扱い、全 protected asset、全環境 trust boundary、per-operation authentication、Mnemonic handoff、explicit export、signing authority、Store / migration、pending / failure / retry / restart、Account / Chain / Network、side-channel / memory の phase boundary を一意に引き渡せる。

Architecture との重大不整合および Security Design-level Open Decision はなく、指定された完了条件を満たすため、**SECURITY DESIGN READY** と判定する。`bindings.md` review へ進める。
