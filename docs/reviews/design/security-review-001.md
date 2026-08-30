# Design Review Findings: Security

## Review Target

- 対象: [`docs/design/security.md`](../../design/security.md)
- 確認日: 2026-08-30
- 成果物: `docs/reviews/design/security-review-001.md`
- 対象ベース名: `security`。Security Design の既存 review artifact はなく、本書を `security-review-001` とした。
- Review Scope: Security Design の protected asset、secret ownership、lifecycle、trust boundary、processing-unit authentication、initial Mnemonic handoff、explicit secret export、signing authority、Store security / version / migration、pending / partial state、failure / retry / restart、Chain / Network separation、Native / WASM Binding、host compromise、constant-time / side-channel、zeroization / memory、third-party crypto dependency、Specification / Implementation handoff および同一 Design フェーズの Architecture / Bindings との整合を、現行 Architecture を確定済みの基準として独立評価した。
- 未確認範囲: Specification / Implementation / Test / fixture の適合性、具体的な暗号方式・KDF・nonce・salt・tag・key length、API / ABI / DTO / wire format、parser、pointer safety、exact buffer lifetime、zeroize 実装、actual constant-time arithmetic、assembly、実際の Application / UI、外部 Node および host compromise 防止。下流資料は必要な委譲・回帰境界の確認に限定し、Security Design の normative upstream にはしていない。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として、根拠管理、候補の反証・統合、重大度、Gate および成果物を担当した。
- Reviewer A（構造と責務）: 完了。Security Design の目的・範囲、Source of Truth、Architecture との依存方向、Core / Binding / Application の責務、protected asset の所有および Chain / Network 境界を確認した。
- Reviewer B（Security primary）: 完了。Mnemonic、Software Key private key、derived / decrypted secret material、Profile password、temporary secret、Core 管理下 Store、signing authority、pending / partial state を対象に、trust boundary、secret lifecycle、authorization、handoff、export、signing、failure safety、environment boundary および security invariant を確認した。
- Reviewer C（フローと運用）: 完了。generation、recovery、import、derivation、signing、password change、deletion、handoff、export、Store failure、pending / partial、retry、restart および existing state preservation の責任を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept → Requirements → Design → Specification → Implementation の依存方向、Architecture から Security Design への traceability、security responsibility の downstream handoff、constant-time / zeroization の phase boundary を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を `docs/design/security.md` 1件、normative upstream を Concept / Requirements、同一 Design の確定済み Architecture を基準、Bindings を補助確認先、Specification / Implementation を条件付きの下流確認先として確定した。`AGENTS.md` に Design Phase Context の登録がないため Context は使用していない。
- Phase 1（独立レビュー）: 完了。A〜D の担当観点から、現行 Security Design を Architecture、Requirements および Concept に照合した。
- Phase 2（反証・統合）: 完了。候補の根拠、影響、Design で決めるべき責任か、Specification / Implementation へ委譲すべき詳細か、重複および重大度を再確認した。Security の責任欠落を10件の Majorへ、constant-time / zeroization の実装詳細混入を2件の Minorへ統合した。
- Phase 3（ゲート・成果物）: 完了。成果物作成後に共通章順、finding ID、相対リンク、参照先、`git diff --check` および変更範囲を検証した。

## Evidence Used

### Review Basis

| 種別 | 参照資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、フェーズ順、Scope Discipline、秘密情報保護、検証および Git 運用を確認 |
| Design Reviewer Skill | [`SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/design-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/design-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/design-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/design-review/output-format.md) | Reviewer A〜D、Security primary、finding 採用条件、Design phase boundary、Severity、formal Gate および成果物構成を確認 |
| 共通 reviewer policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、Upstream Feedback / Deferred Findings の分離、finding 必須項目、検証および成果物構成を確認 |
| 上流 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1、§3、§7〜§10、§13 | Core の継続 secret ownership、通常処理での非開示、明示的 secret access、全環境共通原則および host compromise 保証限界を確認 |
| Concept review | [`concept-sheet-review-009.md`](../concept/concept-sheet-review-009.md) | `READY` / `CONCEPT READY` と Concept 側の finding 状態を履歴として確認。Security Design の正否の代替にはしていない |
| 上流 Requirements | [`requirements.md`](../../requirements/requirements.md) §2.1〜§2.4、§4、§7、§8、§10、§12 | protected asset、Core ownership、processing-unit authentication、handoff、explicit export、signing approval、Store policy、atomicity、failure および下流委譲の主根拠 |
| Requirements review | [`requirements-review-008.md`](../requirements/requirements-review-008.md) | `READY` / `REQUIREMENTS READY` と RR-001〜RR-029 の Resolved 状態を履歴として確認。Requirements 本文の代替にはしていない |
| 同一 Design の確定済み基準 | [`architecture.md`](../../design/architecture.md) §2.1、§3〜§10 | Security Design が詳細化・補完すべき responsibility、ownership、trust boundary、lifecycle、authorization、failure model および downstream handoff の基準 |
| Architecture review | [`architecture-review-002.md`](architecture-review-002.md) | `READY` / `ARCHITECTURE READY`、DR-001〜DR-009 Resolved、Architecture-level Open Decision なしを履歴として確認。Security Design の独立判定を先取りしていない |
| 同一 Design の補助資料 | [`bindings.md`](../../design/bindings.md) §3〜§6 | Binding non-authority、Native / WASM 境界および Security Design との責務整合を補助確認。Bindings の独立レビューは行っていない |
| 対象 Security Design | [`security.md`](../../design/security.md) §1〜§9 | 現行本文の責務、asset、lifecycle、認可、署名、constant-time、zeroization、Binding 境界および委譲を独立評価 |

### Upstream Source of Truth

Security Design の normative upstream は、[`concept-sheet.md`](../../consept/concept-sheet.md) と [`requirements.md`](../../requirements/requirements.md) である。Concept / Requirements が定める目的、責任、security property および受入条件を、同一 Design の [`architecture.md`](../../design/architecture.md) が確定済みの全体 responsibility、ownership、trust boundary、lifecycle、authorization boundary および failure responsibility へ配置している。Security Design はこの Architecture と整合して Security responsibility を詳細化するが、Architecture を上書きしない。

[`bindings.md`](../../design/bindings.md) は同一 Design フェーズの関連設計であり、整合確認先である。Specification は API、validation、concrete crypto contract、serialization、error および external contract の下流正本、Implementation は memory lifetime、copy / clone、zeroization、unsafe、FFI、actual crypto usage、constant-time implementation および side-channel mitigation implementation の責任である。対象文書の §2 が Specification と Bindings を `上流根拠` と同列に列挙している点は DR-001 とした。

## Review Result

`READY`（Design Reviewer Skill の formal Review Gate）

### Review Gate

Skill の formal gate は、Gate 不合格に対応する `Critical` が1件以上ある場合だけ `REVISE DESIGN` とする。今回の Security Design では `Critical = 0` であるため、formal Review Result は `READY` とする。ただし `Major = 10` の New finding があり、これは Security Design の責任・境界・下流 handoff を修正する必要がある。したがって本書は `SECURITY DESIGN READY` を宣言せず、`bindings.md` の review 開始前に Major を解消すべきと判断する。

## Summary

### Finding Summary

現行 Security Design は、Core が秘密情報を扱い、通常処理で秘密情報を返さず、Core の unlocked state を継続しないという基本方針を示している。しかし、確定済み Architecture が Security Design に引き渡している protected asset、全環境の trust boundary、処理単位認証の全適用範囲、handoff / export / signing の actor 責任、Store version policy、pending / retry / restart および Chain / Network compatibility が一意に配置されていない。これらは Specification / Implementation の具体化だけでは解消できない Design-level の欠落である。

constant-time と zeroization / memory については、必要な security intent は維持すべきだが、現行本文が具体関数、loop、mask、byte、pointer、JavaScript type、free および exact buffer を基本設計の規範として固定している。これは Implementation technique と Design-level invariant の分離不足であり、下流へ委譲する形へ整理すべきである。

| 集計範囲 | Critical | Major | Minor |
| --- | ---: | ---: | ---: |
| 今回の New finding | 0 | 10 | 2 |
| Open / Reopened | 0 | 10 | 2 |
| Resolved | 0 | 0 | 0 |

### Finding Detail

各 finding は、Architecture の確定内容を Security Design に反映するための最小修正を示す。暗号方式、API、ABI、wire format、具体 buffer または実装手法を指定するものではない。

### DR-001 — Security Design の normative source と下流委譲の方向

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:7-15`](../../design/security.md#L7)
- 発生条件または確認できた事実: §2 の見出しが `上流根拠` であり、Concept、Requirements、Specification、Architecture、Bindings を同列に列挙している。§1 も具体契約は Specification の正本に従うと書いている。
- 既存の根拠: [`architecture.md:24-41`](../../design/architecture.md#L24) は Concept / Requirements だけを normative upstream とし、Security / Bindings は同一 Design の関連資料、Specification は下流正本と明示する。Requirements も [`requirements.md:17-19`](../../requirements/requirements.md#L17) と [`requirements.md:362-398`](../../requirements/requirements.md#L362) で具体方式を下流へ委譲している。
- 問題と影響: Security Design が Specification や関連 Design を上流規範として扱う読解余地があり、crypto contract、API、Binding の現行形式から security responsibility や trust boundary を逆算する依存方向を許す。これにより、Security Design の ownership / authorization / disclosure boundary が下流の方式に依存し得る。
- 必要な最小修正または確認: Concept / Requirements を normative upstream、Architecture を確定済み同一 Design 基準、Bindings を整合確認先、Specification / Implementation を下流委譲先として明示的に分離する。Specification に従う記述は、Security Design がその security architecture を上書きしないことが分かる形にする。
- 完了条件または再確認方法: Security Design の source map だけで、`Concept → Requirements → Architecture → Security / Bindings → Specification → Implementation` の責任関係と、Security Design が Architecture を上書きしないことを第三者が説明できる。

### DR-002 — Protected asset と secret ownership / lifecycle の不足

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:31-57`](../../design/security.md#L31)
- 発生条件または確認できた事実: §3.1 は Core が所有・生成する buffer の例として password、Mnemonic entropy / normalized Mnemonic、seed、private key、encryption key、decrypted payload、署名 temporary を列挙する。しかし Core 管理下 Store、signing authority、pending / partial state に含まれ得る秘密情報を protected asset として配置せず、各 asset の継続 owner、一時的な取扱い、公開例外、失敗責任、lifecycle 終了責任を表にしていない。
- 既存の根拠: [`architecture.md:181-193`](../../design/architecture.md#L181) は Mnemonic、Software Key private key、derived / decrypted material、Profile password、temporary secret、Core 管理下 Store、signing authority を別 asset として定義する。[`architecture.md:120-131`](../../design/architecture.md#L120) と [`requirements.md:66-92`](../../requirements/requirements.md#L66) は Core 継続 ownership、外部 copy、failure responsibility を定める。
- 問題と影響: generation、recovery、import、derivation、signing、initial handoff、explicit export、password change、deletion、failure、retry、restart の各段階で、Mnemonic / Software Key 原本と一時 material の責任を下流が推測する必要がある。特に export 後に Core 原本の ownership が残ること、Application / Binding の mediation が継続 ownership の移転でないこと、pending secret の扱いが一意でない。
- 必要な最小修正または確認: Architecture §5.1 に対応する asset / responsibility table を Security Design に置き、各 asset の Core 継続 owner、必要範囲の一時 mediation、通常非公開、handoff / explicit export の成功結果だけの例外、failure / interruption 後の非残留、終了責任を示す。具体 buffer type、copy count、zeroize API は定めない。
- 完了条件または再確認方法: 指定された全 protected assetについて、生成から削除・失敗・再起動まで owner と許可された境界が一意に追跡でき、Core 外 copy と Core 内原本の責任を説明できる。

### DR-003 — 全環境の trust boundary と共通 security invariant の不足

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:17-29`](../../design/security.md#L17)、[`security.md:45`](../../design/security.md#L45)、[`security.md:88-95`](../../design/security.md#L88)
- 発生条件または確認できた事実: 図は User / Application input、Native / WASM Binding、Rust Core、opaque Store を示すが、Desktop、Mobile、Web Application、Browser Extension、Browser、OS、host process、persistent storage、Transaction layer、Network layer の全境界を Security Design の共通 model として示していない。本文も Application / Browser の侵害限界に寄り、Native / Desktop / Mobile に同じ invariant を明記していない。
- 既存の根拠: [`architecture.md:54-100`](../../design/architecture.md#L54) は全 actor と境界、host compromise 非保証、compromise 非保証でも Core / Binding の通常非開示・authorization boundary を弱めない invariant を確定する。[`requirements.md:230-233`](../../requirements/requirements.md#L230) および [`requirements.md:255-260`](../../requirements/requirements.md#L255) は全環境共通の責任を要求する。
- 問題と影響: Native 経路を理由に非開示責任や認可責任を弱める実装、Desktop / Mobile の OS / host process 侵害を Core の保証と誤認する実装、または host compromise 非保証を通常処理での secret 返却の許可と解釈する実装余地が残る。
- 必要な最小修正または確認: Desktop / Mobile / Web、Native / WASM、Application、Browser、OS、host process、Core、Binding、storage、Transaction、Network を含む trust / guarantee boundary を列挙し、全環境で継続 owner、通常非開示、Core authorization、Binding non-authority を共通化する。OS sandbox や Browser internals は固定しない。
- 完了条件または再確認方法: 各実行環境について、host compromise 防止は保証外であることと、通常処理の非開示・authorization・Binding responsibility は環境差で弱まらないことを表または本文から追跡できる。

### DR-004 — Processing-unit authentication の適用範囲と非継続境界

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:47-50`](../../design/security.md#L47)、[`security.md:94`](../../design/security.md#L94)
- 発生条件または確認できた事実: §3.2 は password を処理ごとに受け、Core が継続 cache / unlocked state を持たないとするが、signing、derivation、import、generated key registration、password change、export、Software Key deletion、Profile deletion の全 operation を列挙しない。Core 外の Application unlock session、Binding authorization cache、retry の再認証、restart 後の authorization 非継続も明記されていない。
- 既存の根拠: [`architecture.md:294-309`](../../design/architecture.md#L294) は全 secret-capable operation に Core の per-operation authorization を適用し、Core / Binding / Application の session・cache・carry-over・restart 継続を禁止する。Requirements [`requirements.md:163-165`](../../requirements/requirements.md#L163) と [`requirements.md:242-255`](../../requirements/requirements.md#L242) も同じ境界を要求する。
- 問題と影響: Application または Binding が前操作の認証結果を次の処理へ持ち越し、Core の password authorization を代替する security architecture を許す。Signing、export、削除などの高影響 operation だけ別扱いになる余地も残る。
- 必要な最小修正または確認: secret-capable operation の適用一覧と、Core が各 operation だけを認可する invariant を明記する。Binding に unlock session / authorization cache を作らせず、Application に Core 代替 session を持たせず、retry / restart では再入力・再認証とする。token や session API は固定しない。
- 完了条件または再確認方法: 指定された全 operation について、authorization owner、持続範囲、carry-over 禁止、retry / restart 後の非継続を Security Design から一意に判定できる。

### DR-005 — Initial Mnemonic handoff の成功境界

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:51-53`](../../design/security.md#L51)
- 発生条件または確認できた事実: 初回 Mnemonic backup handoff を export と並ぶ例外とするだけで、Core 生成、意図された Application への受渡し、Application の利用者提示、利用者の明示受領、Application から Core への確認伝達、Core の Profile 最終確定という6段階を定義していない。確認前の未確定状態、handoff failure / interruption、Core が UI / 人間の保存を独立検証しない境界も不足している。
- 既存の根拠: [`architecture.md:223-240`](../../design/architecture.md#L223) と [`requirements.md:135-149`](../../requirements/requirements.md#L135) は handoff 成功の全条件、確認前非成功、failure 時の非開示・非部分状態、Application / 利用者の外部保管責任を確定する。
- 問題と影響: Mnemonic を生成したこと、Binding を通過したこと、Application が受け取ったことだけで Profile success と解釈する実装や、確認不能時に partial Profile を正常状態として残す実装を Security Design が排除できない。
- 必要な最小修正または確認: 6段階の actor と success boundary、確認前は committed Profile でないこと、受領・提示・確認・伝達・最終確定の失敗時に正常 Profile / partial state / 診断漏えいを残さないことを明記する。Core は UI / 人間の外部保存を独立検証せず、handoff 後の外部 copy は受領側、Core 内原本は Core とする。
- 完了条件または再確認方法: 新規 Profile 作成の成功・失敗を6段階に照合でき、確認なしで成功する解釈がなく、具体 callback / ACK / pending 型は下流に委譲されている。

### DR-006 — Explicit secret export の二重 authorization boundary

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:51-53`](../../design/security.md#L51)
- 発生条件または確認できた事実: export の条件を「正しい Profile password を伴う明示的な個別 export」とだけ記載し、対象指定、利用者の明示要求、Application / UI の intent confirmation、確認済み request のみを送る責任を分離していない。成功後も Core 内原本の ownership が Core に残ること、通常処理から暗黙 export しないことも明示されていない。
- 既存の根拠: [`architecture.md:277-292`](../../design/architecture.md#L277) と [`requirements.md:187-191`](../../requirements/requirements.md#L187) は target、user intent、Application / UI confirmation、Core operation-unit password authorization、対象外非返却、原本 / 外部 copy の責任を別 property として定める。
- 問題と影響: password possession または任意の API 呼出しだけで Mnemonic / Software Key を返す実装、Application が user intent を確認していなくても Core が export する実装、export 後に Core の原本 ownership が移る実装を許す。
- 必要な最小修正または確認: Mnemonic と Software Key private key の対象指定、user explicit request、Application / UI の確認、confirmed request、Core の当該 operation authorization、対象外非返却、非暗黙遷移および失敗時不変を明記する。Core 外 copy は受領側、Core 内原本は Core とする。UI や request field は固定しない。
- 完了条件または再確認方法: password authorization と user intent confirmation が独立して確認でき、対象指定・失敗・原本 ownership・外部 copy responsibility が両対象に適用される。

### DR-007 — Signing authority と user signing approval の分離

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:59-64`](../../design/security.md#L59)
- 発生条件または確認できた事実: `sign()` を上位層から渡された raw payload の primitive とし、Transaction の意味・権限・user intent を判断しないと記載するが、Application / UI が Account と payload を選択・提示し、利用者の明示承認を得て、approved request だけを Core へ送る責任を記載していない。
- 既存の根拠: [`architecture.md:256-275`](../../design/architecture.md#L256) と [`requirements.md:167-169`](../../requirements/requirements.md#L167) は `password authorization != user signing approval`、Application の提示・明示承認・approved-only request、Core の Account / Software Key / Chain / Network 確認・秘密鍵利用・signing primitive・結果返却を確定する。
- 問題と影響: raw payload primitive という記述だけでは、Application が利用者確認なしに任意 payload と password を Core へ渡してよい security architecture と読める。Core が user intent を推測しない境界と、Application の承認責任の間に責任空白がある。
- 必要な最小修正または確認: Application / UI と Core の責任を分け、Application は内容を利用者が確認できる状態にして明示承認済み request だけを送る、Core は per-operation password authorization、指定 Account / Software Key / Chain / Network compatibility、private key use、primitive、結果を担うと明記する。Transaction の意味説明、UI、構築は Core 外とする。
- 完了条件または再確認方法: signing request の user approval と Core authorization の両方が必要で、password の正しさだけでは承認成立しないことを Security Design から判定できる。

### DR-008 — Opaque Store の validity、version および v1 migration policy

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:17-29`](../../design/security.md#L17)、[`security.md:55-57`](../../design/security.md#L55)
- 発生条件または確認できた事実: Store を opaque とし Store 破損時には失敗するとするが、Core が version / validity / integrity を検証する責任、v1 が migration を提供しないこと、unsupported / unknown / corrupt / inconsistent data の reject、no fallback / no guessed interpretation、Application の opaque non-authority および reject 時の existing committed state 不変がない。
- 既存の根拠: [`architecture.md:195-209`](../../design/architecture.md#L195) と [`requirements.md:266-278`](../../requirements/requirements.md#L266) は Store security、version policy、opaque boundary、reject、no implicit migration および既存状態保護を定める。
- 問題と影響: attacker-controlled Store を Application / Binding が独自解釈・読み替えする、Core が未知 version / data を推測して秘密情報処理を続ける、reject 時に既存 committed state を置換する、といった複数の security architecture を許す。
- 必要な最小修正または確認: Core の validation responsibility、対応 version 限定、v1 migration 非提供、unsupported / unknown / corrupt / inconsistent data の fail-closed reject、Application / Binding の opaque non-authority、reject / failure 時の秘密非開示・既存状態不変を明記する。Parser、field、wire format、error code は下流へ委譲する。
- 完了条件または再確認方法: Store が attacker-controlled input になり得ることを前提に、Core の trust transition と reject 後の状態保護が Security Design から一意に追跡できる。

### DR-009 — Pending / partial、failure、retry、restart の security responsibility

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:47-57`](../../design/security.md#L47)
- 発生条件または確認できた事実: failure 時に replacement Store、partial application、secret を返さず既存 Store を変更しないとするが、pending / partial は committed state ではないこと、Core が security meaning / success boundary を所有すること、stale / unconfirmed の自動昇格禁止、retry の再入力・再認証、restart 後の authorization / pending 非継続がない。
- 既存の根拠: [`architecture.md:211-221`](../../design/architecture.md#L211) と [`architecture.md:294-309`](../../design/architecture.md#L294) は pending ownership、既存 committed state 保護、stale 非昇格、retry を新規 operation とすること、restart 後非継続を確定する。Requirements [`requirements.md:335-350`](../../requirements/requirements.md#L335) も同じ failure model を要求する。
- 問題と影響: stale confirmation、pending secret、decrypted material または前回 authentication result を次 operation の authorization として再利用する実装、Application が partial state を committed と扱う実装、restart 後に stale state を復活させる実装余地が残る。
- 必要な最小修正または確認: pending / partial の意味と Core ownership、success promotion 条件、stale / unconfirmed 非昇格、failure / interruption / restart 時の ownership・Profile isolation・existing committed state 保護、retry の input / confirmation / password 再取得を明記する。pending representation、timeout、rollback、memory lifetime は下流へ委譲する。
- 完了条件または再確認方法: 各 failure / retry / restart 経路について、何が committed で何が未確定か、誰が再認証し、どの secret / state を再利用しないかを Security Design から説明できる。

### DR-010 — Account と Chain / Network compatibility の security boundary

- Severity: `Major`
- Status: `New`
- 対象箇所: [`security.md:59-64`](../../design/security.md#L59)
- 発生条件または確認できた事実: Profile Network と Software Key Chain の固定は記載するが、Profile は Chain 非固定、Software Key は Chain 固定、Account はその Chain + Profile Network 上で利用する概念であること、Core が compatibility を検証して unsupported / mismatch を fail-closed reject すること、fallback / implicit conversion と reject 時の状態・secret 非変更が不足している。
- 既存の根拠: [`architecture.md:311-321`](../../design/architecture.md#L311) と [`requirements.md:179-181`](../../requirements/requirements.md#L179) および [`requirements.md:220-222`](../../requirements/requirements.md#L220) は Profile / Software Key / Account の関係、Core reject、fallback 禁止を定める。
- 問題と影響: Binding / Application の補正、wrong Account / key の signing、unsupported Chain / Network の fallback、Symbol / NEM または Mainnet / Testnet の暗黙共通化を Security Design が排除できない。
- 必要な最小修正または確認: Profile / Software Key / Account の固定関係、Core の supported / mismatch validation と fail-closed reject、reject 時の既存状態・秘密非変更、Binding / Application non-authority、no fallback / implicit conversion を security boundary として明記する。identifier、network byte、derivation path は下流へ委譲する。
- 完了条件または再確認方法: Derived / Imported / Generated の全経路で、指定 Account と Chain / Network compatibility の責任が Core にあり、失敗時の非変更加工と fallback 禁止を判定できる。

### DR-011 — Constant-time / side-channel の Design phase boundary

- Severity: `Minor`
- Status: `New`
- 対象箇所: [`security.md:66-86`](../../design/security.md#L66)
- 発生条件または確認できた事実: §5.1 が `scalar_add_mod_order` / `scalar_mul_mod_order`、固定長 byte 走査、固定回数 bit 処理、mask、carry / borrow、intermediate byte を基本設計の規範として固定する。§5.2〜§5.3 には source shape、machine code、compiler / target、optimized assembly inspection、wall-clock threshold も混在する。
- 既存の根拠: [`architecture.md:366-381`](../../design/architecture.md#L366) は具体 crypto、byte、memory、implementation および検証方式を下流へ委譲し、Design が変更できない security invariant と下流方式を分離する。ユーザー要求も Design-level invariant と Implementation technique の分離を明示している。
- 問題と影響: 特定 function / arithmetic shape を Security Design の必須方式と誤読し、別の安全な実装方式を不必要に排除する。逆に source-level 形状を定める一方で timing leakage や final machine code は保証外とするため、Design-level guarantee の境界も曖昧になる。
- 必要な最小修正または確認: secret-dependent behavior を避ける必要性、side-channel risk を扱う責任層、Core の Design-level invariant、Specification / Implementation / release verification への handoff を残す。特定関数、byte 算術、loop、mask、carry / borrow、stack、register、machine code、assembly inspection は下流へ移す。
- 完了条件または再確認方法: security intent と保証範囲は追跡でき、下流が technique を選択でき、どの層が source / target / release の検証を担うかを推測せず判定できる。

### DR-012 — Zeroization / memory responsibility の phase boundary

- Severity: `Minor`
- Status: `New`
- 対象箇所: [`security.md:31-45`](../../design/security.md#L31)、[`security.md:88-95`](../../design/security.md#L88)
- 発生条件または確認できた事実: §3.1 が zeroize 対象 buffer を具体列挙し、§6 が Native input の borrow / output ownership、C ABI pointer、WASM mutable byte sequence、JavaScript string、`Uint8Array`、localStorage / sessionStorage / IndexedDB、free および copy の扱いを Security Design に固定する。
- 既存の根拠: [`architecture.md:193`](../../design/architecture.md#L193) と [`architecture.md:366-381`](../../design/architecture.md#L366) は memory representation、copy、lifetime、zeroize、FFI および free を下流へ委譲し、ownership、通常非開示、失敗時非残留だけを Design invariant とする。Requirements [`requirements.md:371-388`](../../requirements/requirements.md#L371) も同じ区分である。
- 問題と影響: exact buffer / pointer / mutable type / free / allocator / copy を Security Design が規範化し、Specification / Binding Design / Implementation の責任を混在させる。実行環境ごとの合理的な安全方式を不必要に制限し、zeroization の保証対象と best effort の境界を一貫して判定しにくくする。
- 必要な最小修正または確認: secret lifetime を必要最小限にし、不要 retention / persistent secret storage を許さず、Binding を継続 owner にせず、failure 後に通常利用可能状態・診断・cache へ残さないという原則を残す。exact representation、pointer、copy、free、allocator、zeroize target は Specification / Implementation へ委譲する。
- 完了条件または再確認方法: Core / Binding の責任境界、通常非開示、failure 後非残留および host copy の保証限界が追跡でき、具体 memory / FFI 契約は下流へ移されている。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| DR-001 | Major | New | security-review-001 | §2 が Specification / Bindings を `上流根拠` と同列に置き、Architecture の normative dependency と異なる。 |
| DR-002 | Major | New | security-review-001 | protected asset の一覧と、各 asset の継続 owner・一時取扱い・公開例外・失敗責任・lifecycle 終了責任が一意でない。 |
| DR-003 | Major | New | security-review-001 | Desktop / Mobile / Native / Web / Browser / OS / host process を含む共通 trust boundary が Security Design から追跡できない。 |
| DR-004 | Major | New | security-review-001 | processing-unit authentication の全 operation 適用、Binding / Application の session 非提供、carry-over / restart 非継続が一意でない。 |
| DR-005 | Major | New | security-review-001 | Initial Mnemonic handoff の6段階、未確認時の非確定、failure / interruption 責任および Core 外コピー境界が不足している。 |
| DR-006 | Major | New | security-review-001 | Explicit export が password と `明示的` という表現だけで、対象指定、user intent confirmation、confirmed request および原本 ownership を分離していない。 |
| DR-007 | Major | New | security-review-001 | raw payload の `sign()` 記述が Application の表示・明示承認・approved-only request と Core authorization を分離していない。 |
| DR-008 | Major | New | security-review-001 | Opaque Store の validity / version owner、v1 migration 非提供、reject / no fallback / existing state preservation が不足している。 |
| DR-009 | Major | New | security-review-001 | pending / partial state の意味・owner、stale 非昇格、retry 再認証、restart 後の非継続および existing committed state 保護が不足している。 |
| DR-010 | Major | New | security-review-001 | Account と Profile Network / Software Key Chain の compatibility および Core の fail-closed reject 責任が不足している。 |
| DR-011 | Minor | New | security-review-001 | constant-time の Design-level invariant と、特定関数・byte 算術・loop・mask・machine code 検証の実装詳細が混在している。 |
| DR-012 | Minor | New | security-review-001 | zeroization / memory の Design 原則と、exact buffer、pointer、mutable type、free、copy / allocator の下流詳細が混在している。 |

## Required Changes

なし。`Critical` の New / Open / Reopened は確認されなかったため、Skill の formal Gate 上の Required Changes はない。

## Optional Improvements

Skill の形式上、`Major` / `Minor` は Optional Improvements に分類される。ただし DR-001〜DR-010 は Security Design の responsibility、ownership、authorization、failure model または invariant の欠落であり、次の `bindings.md` review へ進む前に Security Design で解消すべき実質的な修正事項である。

| ID | Severity | 修正の方向 |
| --- | --- | --- |
| DR-001〜DR-010 | Major | Architecture と同じ責任・境界・lifecycle・security invariant を Security Design に明記し、Specification / Implementation が security architecture を推測しない状態にする。 |
| DR-011 | Minor | secret-dependent behavior を避ける Design-level invariant、責任層および下流検証への handoff を残し、具体 arithmetic / code shape / machine code を委譲する。 |
| DR-012 | Minor | 必要最小限の lifetime、不要 retention 禁止、Binding non-owner、failure 後非残留を残し、exact representation / pointer / free / zeroize を委譲する。 |

## Resolved Findings

なし。Security Design の既存 review artifact はなく、今回が初回レビューである。

## Upstream Feedback

なし。Concept review 009 は `CONCEPT READY`、Requirements review 008 は `REQUIREMENTS READY` であり、Requirements の product-level / security-level 未解決事項は確認されなかった。今回の不足は Requirements の欠落ではなく、確定済み Requirements / Architecture の Security Design への配置不足である。Architecture review 002 も `ARCHITECTURE READY` であり、Architecture を上書きする feedback は不要である。

## Deferred Findings

正式な Deferred Finding はない。以下は Security Design が責任・境界・invariant を定めた後に、下流または後続検証へ委譲する事項である。

- KDF、AEAD、nonce、salt、tag、key length、署名方式、HD derivation、protocol constant および署名対象 byte 列。
- API、DTO、Native C ABI、WASM export、callback / ACK、error code、wire / schema、Store field、parser、resource limit および公開契約。
- exact buffer representation、copy / clone、allocator、stack / register、memory lifetime、zeroization API、unsafe、FFI pointer、free semantics および JavaScript の具体型。
- constant-time arithmetic の具体方式、actual crypto usage、compiler / target / runtime の挙動、machine code / assembly inspection、side-channel test および release verification の実装。
- Store parser / validation implementation、fuzz、unit test、interop fixture および実際の Native / WASM / Application / UI の適合性。
- Browser、OS、host process、Application そのものの compromise 防止、process isolation、OS sandbox および Browser internals。これらは Core の保証外であり、Core / Binding の通常処理での非開示責任を弱める理由にはならない。
- 第三者暗号ライブラリ内部の temporary の完全消去および、そのための fork / local patch の実装判断。v1 の guarantee boundary は DR-011 / DR-012 の修正後も、Core / Binding が明示的に所有する範囲と第三者依存内部を区別する。

## Scope and Traceability

### Architecture → Security Design Traceability

| Architecture の確定内容 | Security Design の現状 | 判定 / finding |
| --- | --- | --- |
| §2.1 の Concept / Requirements → Architecture → Specification → Implementation と関連 Design の区分 | §2 は Concept、Requirements、Specification、Architecture、Bindings を `上流根拠` と同列に列挙 | Specification / 関連 Design の区分を修正すべき。DR-001 |
| §5.1 の protected assets と Core ownership | §3.1 は一部の Core buffer を列挙するが、Store、signing authority、pending / partial、asset ごとの境界・終了責任がない | Security asset / lifecycle table が必要。DR-002 |
| §3〜§4 の全環境 trust boundary と共通 invariant | §2 の図と本文は Application / Browser、Native / WASM を中心とし、Desktop / Mobile / OS / host process の共通性が不足 | 全環境の trust / guarantee boundary を明記すべき。DR-003 |
| §6.5 の全 secret-capable operation に対する per-operation authorization | §3.2 は一般論として password を処理単位で使うが、全 operation、Binding / Application、retry / restart を列挙しない | authorization model を operation matrix として補うべき。DR-004 |
| §6.1 の6段階 handoff と失敗時非確定・非開示 | §3.3 は handoff を例外と呼ぶだけで、受領確認、Core 最終確定、partial state 非成功を示さない | handoff success boundary を明記すべき。DR-005 |
| §6.4 の target / intent / confirmation / password authorization の分離 | §3.3 は「正しい password を伴う明示的 export」とだけ記載 | export security properties と原本 / 外部 copy の ownership を分離すべき。DR-006 |
| §6.3 の Application approval と Core signing authority の分離 | §4 は `sign()` を raw payload primitive と定義するが approved-only request を定めない | user approval と Core authorization の境界を明記すべき。DR-007 |
| §5.2、§8、§9.3 の opaque Store、Core validity、v1 no migration、reject、既存状態不変 | §2 の opaque 図と §3.4 の Store 破損時失敗だけで、version / migration / guessed interpretation を扱わない | Store security boundary を補うべき。DR-008 |
| §5.3、§6.1、§6.2、§6.5 の pending / partial、failure、retry、restart | §3.4 は部分適用を返さないとするが、pending meaning、stale state、retry 再認証、restart 非継続がない | state / failure responsibility を補うべき。DR-009 |
| §5.1、§6.2、§7 の Profile Network、Software Key Chain、Account compatibility、Core reject | §4 は Profile Network / Software Key Chain を述べるが、Account の関係、unsupported / mismatch reject、fallback 禁止が不足 | Chain / Network security boundary を補うべき。DR-010 |
| §10 の crypto / memory / implementation 詳細委譲と下流 invariant | §5 は関数名、byte 算術、loop、mask、carry / borrow、machine code まで固定し、§6 は pointer / type / free / storage を固定 | Design intent と下流 technique を分離すべき。DR-011、DR-012 |

### Related Design Consistency

- [`architecture.md`](../../design/architecture.md) §2.1、§3〜§10 は、Security Design が security responsibility を詳細化するための同一 Design フェーズの確定済み基準であり、current `security.md` の §2、§3〜§6 の不足・過剰記述と不整合する。
- [`bindings.md`](../../design/bindings.md) §3〜§6 は Binding を thin boundary とし、Core の認証・暗号・意味判定・秘密情報 ownership を代替しない点で Architecture と整合する。Security Design の Binding 記述はこの境界を維持する必要があるが、`bindings.md` 自体の独立レビュー結果は本書で先取りしない。
- Architecture review 002 の DR-001〜DR-009 を Security Design の finding ID として再利用していない。Architecture 側の finding は全件 `Resolved` であり、本書の DR-001〜DR-012 は対象ベース名 `security` に対する新規 ID である。

### Phase Boundary

Security Design で決めるべき protected asset、継続 owner、一時取扱い、trust boundary、authorization boundary、signing authority、failure responsibility、全環境共通 invariant、side-channel に対する設計意図および Specification / Implementation への handoff は、現行本文に部分的に存在する。DR-001〜DR-010 は不足している Design responsibility を補う指摘である。

一方、KDF / AEAD / nonce / salt / key length、API / ABI、wire、parser、exact buffer、memory lifetime、copy / clone、zeroization 実装、unsafe、pointer、具体 constant-time arithmetic、assembly および test は下流で決める。DR-011 / DR-012 は security intent を削除する要求ではなく、Design-level invariant と Implementation technique を分離する要求である。

## Domain Checks

### Protected Assets

Architecture §5.1 の asset 表と比較し、Security Design の記載は次の状態である。

| protected asset | 現行 Security Design の記載 | Design review 判定 |
| --- | --- | --- |
| Mnemonic | entropy / normalized buffer、通常結果で非返却、handoff / export 例外を記載 | Core owner、generation / recovery / import、handoff 前後、failure、export 後の原本 responsibility が不足。DR-002、DR-005、DR-006 |
| Software Key private key | `private key` buffer、通常結果で非返却を記載 | Derived / Imported / Generated の全 lifecycle、Chain 固定、削除後非再利用、原本 owner が不足。DR-002、DR-010 |
| derived secret / decrypted secret material | seed、復号済み Profile payload を記載 | 必要処理中の Core responsibility、pending / retry / restart 後の意味および非残留が不足。DR-002、DR-009 |
| Profile password | Rust 側 copy と処理単位 authorization を記載 | Core / Application / Binding の一時取扱い、全 operation への適用、carry-over 非継続が不足。DR-002、DR-004 |
| temporary secret | 署名 temporary と部分適用非返却を記載 | handoff、導出、復号、署名、export、failure、interruption、retry、restart の owner / 終了責任が不足。DR-002、DR-009、DR-012 |
| Core 管理下 Store | opaque Store と replacement Store の非返却を記載 | Core の validity / version / integrity responsibility、Application の opaque 保存、reject 時 existing state preservation が不足。DR-008 |
| signing authority | `sign()` primitive を記載 | Core が指定 Account / Software Key の signing authority を管理し、Application approval と別 property であることが不足。DR-007、DR-010 |
| pending / partial state に含まれ得る秘密情報 | 部分適用を返さないと記載 | pending の security meaning、Core owner、stale / unconfirmed 非昇格、restart / retry での扱いが不足。DR-009 |

各 asset について、継続管理主体は Architecture と同じく Core、一時的な mediation は Application / Binding が必要範囲で担い得るが継続 ownership を得ない、通常公開は不可、handoff / explicit export の成功結果だけが明示例外、failure / interruption では正常状態・診断・通常利用可能状態へ残さない、という一貫した表を Security Design に追加する必要がある。具体 buffer type や zeroize API は必要ない。

### Secret Ownership / Lifecycle

Architecture §5.1、§5.3、§6.1〜§6.5 は Mnemonic / Software Key 原本の継続 owner を Core とし、generation、recovery、import、derivation、signing、initial handoff、explicit export、password change、Software Key deletion、Profile deletion、failure、retry、restart を同じ ownership model に接続している。現行 `security.md` は Core buffer の例と一般的な failure non-retention は示すが、これらの lifecycle を個別に接続していない。

特に Application / Binding による初期 mediation は ownership transfer ではなく、explicit export 後に Core 外へ渡った copy の保護責任だけが受領側へ移る一方、Core 内原本は Core が継続管理する、という境界を明記すべきである。DR-002、DR-005、DR-006、DR-009 が対象である。

### Trust Boundary

現行 §2 の図は User / Application input、Native / WASM Binding、Rust Core、opaque Store を示す。しかし、Architecture が確定した Desktop、Mobile、Web Application、Browser Extension、Native、Web / WASM、Browser、OS、host process、persistent storage、Transaction layer、Network layer の責任と、各環境で同一の非開示・authorization invariant を一意に示していない。DR-003 とする。

### Authentication / Authorization

現行 §3.2 は Profile password を処理ごとに受け、Core が継続 cache / unlocked state を持たないとする点は適合する。一方、Architecture §6.5 が列挙する signing、derivation、Imported / Generated registration、password change、explicit export、Software Key deletion、Profile deletion の全てを示さず、Binding の unlock session / authorization cache、Application の代替 unlock session、previous result carry-over、restart 後の継続禁止も一意でない。DR-004 とする。Password authorization と user intent confirmation は別 property であり、DR-006 / DR-007 と接続する。

### Initial Mnemonic Handoff

現行 §3.3 は初回 handoff を例外として扱うだけで、Architecture §6.1 の次の6段階を示していない。

1. Core が完全な Mnemonic を生成する。
2. 意図された Application へ渡す。
3. Application が意図した利用者へ提示する。
4. 利用者が明示的に受領確認する。
5. Application が確認成立を Core へ伝える。
6. Core がその後だけ Profile を成功確定する。

確認前は正常 Profile ではなく、受領不能、提示不能、拒否、未確認、確認伝達不能、handoff 中断または最終確定失敗では Profile / partial state を成功状態として残さず、Mnemonic を通常・失敗・診断へ漏らさない必要がある。Core は UI や人間の外部保存を独立検証せず、handoff 後の外部 copy は受領側責任、Core 内原本は Core responsibility とする。DR-005 とする。

### Explicit Secret Export

現行 §3.3 は「正しい Profile password を伴う明示的な個別 export」を例外とするが、Architecture §6.4 の対象指定、user explicit request、Application / UI の intent confirmation、confirmed request のみの Core 送信、Core の operation-unit password authorization を分離していない。単なる API 呼出し、password possession、通常処理成功では export できず、Core は UI を持たず、意図を推測せず、通常処理から暗黙 export へ遷移しない必要がある。

成功後も Core 内原本は Core、Core 外 copy の表示・保管・利用・紛失防止は受領側であることを明記する。DR-006 とする。

### Signing Authority

現行 §4 は `sign()` を raw payload primitive とし、Transaction の意味や user intent を判断しないとする。しかし、この記述だけでは Application が Account を選び、payload / Transaction 内容を提示し、利用者が確認可能な状態を得て、明示的な署名承認を行い、approved request だけを Core へ送る責任が引き渡されない。正しい Profile password は user signing approval ではない。

Security Design は、Application / UI の user approval と Core の operation-unit password authorization、Account / Software Key / Chain / Network compatibility、private key use、signing primitive、result を別責任として明記すべきである。Transaction の意味説明、confirmation UI、user intent 推測、Transaction 構築を Core に要求する必要はない。DR-007 とする。

### Store Security / Version / Migration

現行 §2 と §3.4 は Store を opaque とし、破損時に失敗する方針を示すが、Architecture §5.2、§8、§9.3 の次の security boundary がない。

- Store / Profile version を Core が識別する。
- v1 は明示的に対応する version だけを処理し、version migration を提供しない。
- unsupported / unknown / corrupt / inconsistent data は reject する。
- no fallback、no guessed interpretation、no implicit migration とする。
- Application / Binding は opaque Store の内部意味を代替解釈・編集しない。
- reject / failure 時に existing committed state を変更せず、秘密情報を返さない。

Store が attacker-controlled input になり得る前提で、validation responsibility、fail-closed、secret disclosure prohibition および existing state preservation を Security Design に配置すべきである。Parser、field、CBOR、error code は下流へ委譲する。DR-008 とする。

### Chain / Network Separation

現行 §4 は Profile Network と Software Key Chain の固定、および Core が差異を扱うことを記載する。しかし、Profile = Network 固定・Chain 非固定、Software Key = Chain 固定、Account = Software Key をその Chain + Profile Network 上で利用する概念、Core が supported / mismatch を検証して fail-closed reject する責任、fallback / implicit conversion 禁止、reject 時の状態・secret 非変更が不足している。

Symbol / NEM と Mainnet / Testnet を暗黙に共通化しないこと、Binding / Application が policy を代替しないことも含め、Account compatibility を security boundary として追跡可能にする必要がある。具体 identifier、network byte、derivation path は下流へ委譲する。DR-010 とする。

### Pending / Failure / Retry / Restart

現行 §3.4 は failure 時に replacement Store、partial application、secret を返さず、既存 Store を変更しないとする点は適合する。しかし、Architecture §5.3 / §6.5 の pending / partial が committed state ではないこと、Core が security meaning / success boundary を所有すること、stale / unconfirmed state を自動昇格しないこと、failure / interruption / restart で ownership / Profile isolation / authorization boundary を変更しないこと、retry は新しい operation として Store・input・confirmation・password authorization を再取得することが不足している。

temporary secret、pending secret、decrypted material および authorization state を stale state や次 operation の authorization として再利用しないことを Design invariant として明記すべきである。具体 pending representation、timeout、rollback、memory lifetime は下流へ委譲する。DR-009 とする。

### Native / Web Binding Security Boundary

現行 §6 は Native input の borrow、output ownership、C ABI pointer、WASM の JavaScript string / `Uint8Array`、storage 名および zeroize best effort を混在させている。Binding が Core の authorization、cryptographic meaning、Store / pending meaning、secret ownership を代替しないこと、Native 経路でも Web 経路でも同じ非開示・failure・authorization invariant を適用することを Design-level に残すべきである。

一方、exact pointer、mutable byte type、free、copy count、allocator、JavaScript representation は Specification / Implementation へ委譲する。DR-003、DR-004、DR-012 が対象である。`bindings.md` §3〜§6 は補助的な整合確認に使用したが、その実装契約の正否は本レビュー範囲外である。

### Host Compromise / Guarantee Boundary

現行 §3.1 と §6 は Application / Browser、JavaScript、runtime、allocator、OS、process の全 copy 消去を保証しないとする点で一部適合する。ただし Architecture が定めた Desktop / Mobile / Web、Native / WASM、Application / Browser / OS / host process の compromise 非保証と、compromise 非保証でも Core / Binding の通常処理での非開示・authorization boundary を弱めない共通 invariant が不足している。DR-003 とする。

process isolation、OS sandbox、Browser internals の実装を Core の Design finding として要求しない。必要なのは保証しない範囲と、保証しないことを理由に通常処理の非開示責任を弱めない境界である。

### Constant-time / Side-channel Design Boundary

現行 §5.1 は `scalar_add_mod_order` / `scalar_mul_mod_order`、固定長 byte 演算、固定回数 loop、mask、carry / borrow および intermediate byte を具体的に規範化している。§5.2〜§5.3 は source-level、machine code、compiler、runtime および release verification も同じ節に置いている。

Design が定めるべきなのは、secret-dependent control flow / data access を避ける必要性、timing / side-channel risk をどの層が扱うか、Core が保証する invariant、および Specification / Implementation / release verification への handoff である。特定関数名、byte-array arithmetic、bit loop、mask、carry / borrow、stack / register、actual machine code または assembly inspection は Implementation / release verification の責任である。DR-011 とする。

完了条件は、security intent と保証範囲を設計原則として追跡でき、実装手法を選択する余地を残し、下流がどの invariant を検証するかだけを推測なしに判定できることである。

### Zeroization / Memory Responsibility Boundary

現行 §3.1 は zeroize 対象として password copy、Mnemonic entropy、normalized buffer、seed、private key、Profile encryption key、decrypted payload、signature temporary を列挙する。§6 は borrowed input、owned output、C ABI pointer、mutable byte sequence、JavaScript string、`Uint8Array`、localStorage / sessionStorage / IndexedDB、free および best-effort zeroize を指定する。

Design が定めるべきなのは、secret lifetime を必要最小限にすること、不要 retention / persistent secret storage を許さないこと、Binding を継続 secret owner にしないこと、failure 後に secret を通常利用可能状態・診断・cache に残さないこと、および Core / Binding の responsibility boundary である。exact buffer ownership、pointer contract、mutable byte type、copy count、allocator、free semantics、具体 zeroize target は Specification / Implementation へ委譲する。DR-012 とする。

完了条件は、上記の Design invariant と guarantee boundary を維持しつつ、下流の安全な memory / FFI 実装方式を不当に固定しないことである。

### Third-party Crypto / Dependency Guarantee Boundary

現行 §5.2 および §7 の「第三者暗号ライブラリ内部の temporary を zeroize するためだけに、v1 で fork / local patch を必須構成にしない」という判断は、第三者依存内部の完全消去を v1 の Core / Binding guarantee に含めないという trust / guarantee boundary としては Architecture / Requirements の責任分界に整合する。現時点でこの方針自体を formal finding とはしない。

ただし、Security Design の修正では、特定ライブラリの現行実装事情ではなく、(1) Core / Binding が明示的に所有する範囲、(2) 外部依存内部の保証外範囲、(3) 依存更新時に互換性・secret exposure・security boundary を下流検証へ渡す責任、という設計原則として記載する必要がある。特定 library の temporary、fork の実装可否および依存更新の実コード確認は Implementation / release readiness の範囲である。

### Specification / Implementation Handoff

現行 §8〜§9 は KDF、crypto constant、ABI、error、copy、free、runtime および assembly verification を下流へ委譲する点は適合する。しかし、DR-001〜DR-010 の不足により、Specification が handoff / export / signing / Store / authorization / Chain / Network / pending の security architecture を Security Design から一意に受け取れない。DR-011 / DR-012 では逆に、実装 technique が Security Design に過剰固定されている。

修正後に Specification へ引き継ぐべきものは、Design が確定した success boundary、per-operation authorization、allowed secret flow、Core / Binding / Application responsibility、Store reject / no migration、Chain / Network reject、pending / failure / retry / restart invariant、side-channel / lifetime の security intent である。具体 API、field、error、parser、crypto parameter、buffer、zeroize、pointer、test は下流が定める。

## Validation Results

- 実施: `AGENTS.md`、Design Reviewer Skill 一式、共通 reviewer policy、Concept 本文、Concept review 009、Requirements 本文、Requirements review 008、Architecture 本文、Architecture review 002、対象 Security Design および Bindings Design の確認。
- 実施: Reviewer A〜D の独立自己レビュー、Chair による候補の根拠・影響・フェーズ境界・重複の反証と統合。
- 実施: Security finding ID の対象ベース名単位の連番確認。既存 `security-review-*.md` はなく、DR-001〜DR-012 を本 review の新規 ID とした。Architecture の DR-001〜DR-009 は再利用していない。
- 実施: Markdown の共通章順、指定された Domain Check の見出し、相対リンク先、Concept / Requirements / Architecture / Security Design の参照、`git diff --check` および変更範囲を確認した。
- 未実施: Rust formatter、clippy、cargo test、WASM check。変更対象は review artifact のみで、コード、Binding、Specification、Test を変更していないため対象外。
- 未確認: Specification / Implementation / Test / fixture の適合性、外部 Node、実 Application / UI、実際の handoff / export / signing approval、暗号方式、wire format、具体 memory / FFI 契約および第三者ライブラリ内部の保証。これらは今回の Security Design 判定の正本根拠ではない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格（formal） | §1 は秘密情報、trust boundary、認可、署名および constant-time を対象とし、具体契約を Specification へ委譲している。Source of Truth の方向には DR-001 があるが、Critical ではない。 | DR-001 |
| 2. コンテキストと責任 | 合格（formal） | Core / Binding / Application の基本境界はある。全環境、protected asset、継続 owner の不足は DR-002、DR-003 で記録したが、Critical はない。 | DR-002、DR-003 |
| 3. 依存方向 | 合格（formal） | Core が意味・認可・secret lifecycle を担い Binding が橋渡しを担う方向はある。Specification / Bindings の上流扱いを DR-001 とした。 | DR-001 |
| 4. 主要フロー | 合格（formal） | 一般的な failure non-retention はある。handoff、export、pending、retry、restart の不足を DR-005、DR-006、DR-009 とした。 | DR-005、DR-006、DR-009 |
| 5. データ所有 | 合格（formal） | Core buffer と通常結果非開示の方針はある。全 protected asset、原本 / 外部 copy、Store / pending ownership の不足を DR-002、DR-008、DR-009 とした。 | DR-002、DR-008、DR-009 |
| 6. Security と相互運用性 | 合格（formal） | password、署名 primitive、Profile Network / Software Key Chain の基本記載はある。全 operation authorization、signing authority、Chain / Network reject、side-channel / memory boundary の不足・過剰を DR-004、DR-007、DR-010〜DR-012 とした。 | DR-004、DR-007、DR-010〜DR-012 |
| 7. 上流整合性 | 合格（formal） | Concept / Requirements / Architecture の確定内容と重大な逆転はなく、Security Design の配置不足・参照方向混在を DR-001〜DR-010 とした。Critical はない。 | DR-001〜DR-010 |
| 8. 下流実装可能性 | 合格（formal） | §8〜§9 に下流委譲はあるが、Security responsibility の不足と具体実装の過剰固定が残るため DR-001〜DR-012 の解消が必要。Formal Gate は Critical 0 のため合格とする。 | DR-001〜DR-012 |

Formal Gate: `READY`。現行 Critical は 0 件である。ただし、Security Design の実質的な修正完了条件として、Major 10件を `Resolved` にしてから Bindings review へ進む必要がある。

## Remaining Risks and Open Decisions

- Security Design-level Open Decision: なし。Architecture review 002 が確定した責任、ownership、trust boundary、authorization、handoff、export、signing、Store policy、failure model および Chain / Network policy を採用すべきであり、今回の未解消事項は新たな選択肢ではなく Security Design への反映不足である。
- 残存する Major risk: Security Design の現状のままでは、下流が handoff、export、signing、Store reject、per-operation authentication、pending / retry / restart および Chain / Network compatibility の security responsibility を本書だけから一意に追跡できない。Architecture は補助できるが、Security Design の独立成果物としては不足する。
- 残存する phase boundary risk: constant-time と zeroization / memory の必要な security intent は維持しつつ、exact implementation detail を下流へ移す必要がある。
- Third-party dependency risk: 外部暗号依存内部の temporary 完全消去を v1 guarantee に含めない方針は妥当だが、依存更新時の互換性、secret exposure および下流検証範囲を release readiness で確認する必要がある。
- Host compromise risk: Application、Browser、OS、host process の compromise 防止は Core の保証外である。この限界は、Native / WASM を含む通常処理の非開示、Core authorization、Binding non-authority を弱めない。

## Automatic Changes

レビュー中に Concept、Requirements、Architecture、`security.md`、`bindings.md`、Specification、Implementation、Test、README、Skill 本体または過去レビュー成果物は変更していない。新規に追加した成果物は本 review artifact のみである。

## Final Decision

`READY`（formal Review Result）

Security Design の現行本文には DR-001〜DR-010 の Major、DR-011〜DR-012 の Minor がある。Critical はないため Skill の formal Gate は `READY` だが、Major は Security Design の責任・境界・lifecycle・authorization・failure model の不足であり、Bindings review 前に解消すべきである。現時点では `SECURITY DESIGN READY` を宣言せず、Security Design の修正・再レビュー後に `bindings.md` review へ進む状態とする。
