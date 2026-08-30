# Bindings Design Review 001

## Review Target

- 対象: [`docs/design/bindings.md`](../../design/bindings.md)
- 確認日: 2026-08-30
- 成果物: 本書
- Review Scope: Binding Design の Source of Truth、Concept / Requirements / Architecture / Security Design との依存方向、Binding non-authority、全環境 trust boundary、secret mediation、processing-unit authentication、初回 Mnemonic handoff、explicit export、signing approval、Account / Chain / Network、Store / version / migration、pending / failure / retry / restart、Native / WASM の Design boundary、Browser Extension の責任境界および Specification / Implementation への委譲。
- 対象外: Specification / Implementation / Test の適合性、具体的な ABI、pointer validity、NULL / length / free 契約、JavaScript の具体型、wire / schema、暗号方式、buffer lifetime、zeroize API、panic conversion の実装、実 Application / UI および Browser / OS / host の侵害防止。
- 変更範囲: レビュー中は対象 Design、上流資料、同一 Design 資料、Specification、Implementation、Test、過去 review および Skill を変更しない。新規作成対象は本 review artifact のみとする。

## Execution Audit

サブエージェントは使用していない。Review Board Chair が次の4つの独立自己レビュー・パスを実施し、候補を反証・統合した。

- Reviewer A（構造と責務）: 完了。目的、対象、Source of Truth、依存方向、Core / Binding / Application の責務、ownership、Native / Web 境界および Browser Extension の責任配置を確認した。
- Reviewer B（Security Reviewer）: 完了。protected asset、secret ownership / lifecycle、全環境 trust boundary、processing-unit authentication、handoff、export、signing authority、Store、Chain / Network、failure safety、non-authority および downstream handoff を確認した。
- Reviewer C（フローと運用）: 完了。handoff、export、signing、Store replacement、pending / failure、retry、restart、retention および environment-specific lifecycle が Core の security meaning を変更しないか確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept → Requirements → Architecture → Security / Bindings → Specification → Implementation の dependency、Architecture / Security から Binding への traceability、下流委譲および推測余地を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を `docs/design/bindings.md` 1件、成果物を本書、Concept / Requirements を normative upstream、Architecture を確定済み同一 Design 基準、Security Design を同一 Design の security consistency 基準、Specification / Implementation を下流として確定した。`AGENTS.md` に Design Phase Context の登録はなく、Context は使用していない。

## Evidence Used

### Review Basis

| 区分 | 資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、フェーズ境界、Scope Discipline、秘密情報保護、Validation、変更範囲および Git 運用の確認 |
| Design Reviewer Skill | [`SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/design-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/design-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/design-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/design-review/output-format.md) | Reviewer A〜D、security 観点、finding 採用条件、Gate / Severity、成果物構成および phase boundary の確認 |
| 共通 reviewer policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、Upstream Feedback / Deferred Findings の分離、formal finding の必須項目、検証および成果物規則の確認 |
| Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1、§3、§7〜§10、§12〜§13 | 製品目的、Core 継続 ownership、通常処理での非開示、全環境責任、host compromise の保証限界および下流委譲の確認 |
| Concept review | [`concept-sheet-review-009.md`](../../reviews/concept/concept-sheet-review-009.md) | `CONCEPT READY` と上流指摘の状態確認。Concept 本文の代替にはしていない |
| Requirements | [`requirements.md`](../../requirements/requirements.md) §1〜§2、§4〜§12 | Binding と Core、processing-unit authentication、handoff、export、signing、Chain / Network、Store、failure、全環境および Binding の受入条件・委譲の確認 |
| Requirements review | [`requirements-review-008.md`](../../reviews/requirements/requirements-review-008.md) | `REQUIREMENTS READY` と上流指摘の状態確認。Requirements 本文の代替にはしていない |
| Architecture | [`architecture.md`](../../design/architecture.md) §2〜§5、§6〜§10 | 確定済み同一 Design 基準として、全環境 trust boundary、Binding non-authority、ownership、主要フロー、failure、Store、Chain / Network、downstream handoff を確認 |
| Architecture review | [`architecture-review-002.md`](architecture-review-002.md) | `ARCHITECTURE READY`、DR-001〜DR-009 の Resolved 状態および同一 Design 基準の確認 |
| Security Design | [`security.md`](../../design/security.md) §2〜§10 | 同一 Design の security consistency 基準として、protected asset、secret mediation、authorization、handoff、export、signing、Store、pending、retention および guarantee boundary を確認 |
| Security review | [`security-review-002.md`](security-review-002.md) | `SECURITY DESIGN READY`、DR-001〜DR-012 の Resolved 状態および Security Design-level Open Decision 0 の確認 |

### Source of Truth

Bindings Design の normative upstream は Concept と Requirements である。Architecture は確定済みの全体設計として Binding の責務・依存方向・共通 invariant を拘束し、Security Design は同一 Design の security responsibility、ownership、trust boundary、lifecycle、authorization および failure safety との整合確認基準である。Security Design と Bindings Design は相互に整合させるが、片方を他方の normative upstream としない。

Specification は API、ABI、DTO、wire、validation、error、暗号・保存契約を具体化する下流正本であり、Implementation はそれを実現・検証する下流である。Specification の既存契約から Binding の responsibility、trust boundary、secret ownership または security meaning を逆算しない。現行 `bindings.md` §1〜§2 および §9 の記述はこの区分を明示できておらず、DR-001 の対象とした。

## Review Result

`READY`

これは Design Reviewer Skill の formal result である。Gate 不合格に対応する `Critical` はない。一方、`Major` の New finding が4件あり、Skill の判定とは別に、ユーザー指定の完了条件に従えば Bindings Design は修正確認前に Design フェーズをクローズできない。

## Summary

`bindings.md` は、Application → Binding → Rust Wallet Core の方向、型・buffer・opaque data・error・ownership の橋渡し、Core の暗号・認証・導出・署名・意味判断を複製しない方針、WASM を JavaScript / Browser の完全な秘密隔離境界としない方針、通常処理での secret 非開示を記載している。Account / Chain / Network の独自補正をしないことと、explicit signing approval の UI / permission authority を Binding が持たないことも確認できる。

ただし、現行文書は更新済み Architecture / Security Design が確定した security-sensitive な成功・失敗・再試行・再起動の意味を、Binding が「変更せず橋渡しする」責務として十分に明示していない。特に、processing-unit authentication の非継続、Mnemonic handoff の6段階、explicit export の条件、Store の no migration / reject、pending の非昇格および retry / restart の非継続は、`opaque` や「認証をしない」という一般表現だけでは、下流実装者が Binding の authoritative state を作らないことまで一意に引き渡せない。

また、Source of Truth の配置が前段 Design と異なり、Specification が「上流根拠」に見える。Native / WASM の guarantee boundary は Web 側の記載に偏り、Native / Desktop / Mobile の OS / host process compromise に関する同じ保証限界が明示されていない。Native FFI についても、任意の不正 pointer を安全化しないという限界はあるが、Design レベルで必要な「外部入力・変換失敗を安全側に扱い、Core の意味と secret exposure を増やさない」という正の責任が不足している。

`wasm-bindgen`、`cdylib` / `staticlib`、具体ディレクトリ、raw / UTF-8、JavaScript string / hex / Base64、Browser storage API、および background / extension context の記述には、責務・trust boundaryを変更しない具体方式を基本設計へ固定している部分があり、Minor の phase-boundary finding とした。具体 ABI、pointer、NULL、free、JavaScript type、wire format、buffer lifetime、zeroize API の未決定自体は finding としていない。

### Finding Summary

| 集計範囲 | Critical | Major | Minor |
| --- | ---: | ---: | ---: |
| 現行 New / Open / Reopened | 0 | 4 | 2 |
| Resolved | 0 | 0 | 0 |

Major は formal Gate を自動的に不合格にするものではないが、ユーザー指定の Design フェーズ完了条件に照らし、修正・再レビュー前のクローズを許可しない。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| DR-001 | Major | New | bindings-review-001 | §1〜§2 が Specification を「上流根拠」に含め、Concept と Security Design を normative source map に含めていない。 |
| DR-002 | Major | New | bindings-review-001 | §3〜§6 が Core-owned な authentication、handoff、export、Store、pending / retry / restart の security meaning を Binding が変更しない条件として一意に引き渡していない。 |
| DR-003 | Major | New | bindings-review-001 | §5〜§6 は Web / Browser compromise を詳述するが、Native / Desktop / Mobile の OS / host process compromise 非保証を同じ guarantee boundary として明示していない。 |
| DR-004 | Major | New | bindings-review-001 | §4 は任意の不正 pointer の安全化を否定し、具体契約を下流へ委譲するが、Native boundary の安全側入力処理・意味保存・secret exposure 非増加という Design intent が不足している。 |
| DR-005 | Minor | New | bindings-review-001 | §1、§4、§5、§7〜§8 が、役割を変えない具体的な crate / package / encoding / JavaScript representation / storage API を基本設計の判断として固定している。 |
| DR-006 | Minor | New | bindings-review-001 | §5 が Browser Extension の page / background / extension context の構成を wallet-core Binding の方針として規定している。 |

### Finding Detail

#### DR-001 — Source of Truth と dependency direction の逆転余地

- Severity: `Major`
- Status: `New`
- 対象箇所: [`bindings.md:7-15`](../../design/bindings.md#L7)、[`bindings.md:104-111`](../../design/bindings.md#L104)
- 発生条件または確認できた事実: §1 は API、DTO、wire、error、free の「全契約」を Specification と公開ヘッダーの正本に従うと記載し、§2 の「上流根拠とコンテキスト」には Requirements、Specification、Architecture を並べている。Concept と Security Design は挙げられていない。§9 も Architecture / Requirements と Specification を同じ「参照」表に置き、Security Design の整合確認先を持たない。
- 既存の根拠: Architecture は [`architecture.md:24-41`](../../design/architecture.md#L24) および [`architecture.md:400-409`](../../design/architecture.md#L400) で Concept / Requirements だけを normative upstream とし、Specification を下流委譲先・整合確認先に分離している。Security Design も [`security.md:15-26`](../../design/security.md#L15) と [`security.md:384-394`](../../design/security.md#L384) で同じ方向を定めている。Requirements は [`requirements.md:11-19`](../../requirements/requirements.md#L11) と [`requirements.md:383-388`](../../requirements/requirements.md#L383) で Binding 詳細を下流へ委譲している。
- 問題: Specification と公開ヘッダーを具体契約の下流正本として扱うこと自体は正しいが、現在の配置では、既存 API / ABI / wire またはヘッダーが Binding の責務・trust boundary・secret policy の根拠であるように読める。Binding が Core の non-authority や security responsibility を下流形式から逆算する dependency direction が明示的に排除されていない。
- 影響: 後続の仕様変更や binding 実装の都合が、Native / WASM の secret mediation、authorization、pending、Store または failure meaning を設計へ逆流させ、同一 Design の Architecture / Security invariant と異なる security architecture を許す。
- 必要な最小修正または確認: §1〜§2 および §9 の source map を、Concept / Requirements = normative upstream、Architecture = 確定済み同一 Design 基準、Security Design = 同一 Design の security consistency 基準、Specification = API / ABI / wire 等の下流正本、Implementation = 下流実現へ分ける。Specification の具体契約を下流正本として残すことはできるが、Binding の responsibility / trust boundary を Specification から決めないことを明記する。
- 完了条件または再確認方法: 第三者が本書だけで `Concept → Requirements → Architecture → Security / Bindings → Specification → Implementation` の位置付けを説明でき、Architecture / Security と同じ source map が §2 / §9 に存在し、Specification を理由に責務を変更できないことを確認する。

#### DR-002 — Core-owned security meaning の mediation 不足

- Severity: `Major`
- Status: `New`
- 対象箇所: [`bindings.md:31-41`](../../design/bindings.md#L31)、[`bindings.md:51-65`](../../design/bindings.md#L51)
- 発生条件または確認できた事実: §3 は raw bytes、opaque Store、Pending Profile、署名 payload の受渡しと型・error・ownership の橋渡しを定め、「意味検証、認証、暗号、導出、署名」を行わないとする。しかし、(a) Binding に unlock session / authorization cache / previous authentication result の carry-over を持たせないこと、retry は再入力・再認証であること、restart 後に authorization を継続しないこと、(b) Binding 通過・Mnemonic 返却・Application 呼出しだけでは handoff / Profile success にならず、pending / stale を committed に昇格しないこと、(c) export の target、explicit request、UI confirmation、Core の per-operation password authorization を別条件として保持し、通常処理を export に変換しないこと、(d) Store version / validity / migration / fallback / existing committed state の意味を Binding が解釈・変更しないこと、を Binding の mediation invariant として明示していない。
- 既存の根拠: Requirements は [`requirements.md:137-149`](../../requirements/requirements.md#L137)、[`requirements.md:163-191`](../../requirements/requirements.md#L163)、[`requirements.md:199-222`](../../requirements/requirements.md#L199)、[`requirements.md:251-262`](../../requirements/requirements.md#L251) で handoff、auth、export、signing、Store、全環境 non-disclosure を定める。Architecture は [`architecture.md:90-114`](../../design/architecture.md#L90)、[`architecture.md:120-167`](../../design/architecture.md#L120) および [`architecture.md:332-381`](../../design/architecture.md#L332) で Binding が security meaning、success boundary、pending、authorization を代替しないことを定める。Security Design は [`security.md:160-193`](../../design/security.md#L160)、[`security.md:195-214`](../../design/security.md#L195)、[`security.md:235-258`](../../design/security.md#L235) で具体的な Design invariant と下流 handoff を確定している。
- 問題: 「Binding は認証しない」「opaque data を渡す」という一般原則だけでは、Binding が運ぶ値の security meaning を変更しないこと、特に pending / authorization / explicit access の境界を下流実装が推測せずに済むことが一意にならない。§2 に Security Design の整合基準がなく、§3〜§6 からは lifecycle の成功・失敗・再試行・再起動を Binding がどのように無変更で橋渡しするかを追跡できない。
- 影響: 下流実装が opaque Pending を通常状態として復活させる、前回の認証結果を binding state として再利用する、handoff の受渡しや export の password を成功条件と扱う、Store を version normalize / migrate する、または失敗時の replacement / committed state を別の意味で返す余地が残る。これは Core の authorization、user intent、success boundary、Store policy および failure safety を Binding 側へ逆流させる。
- 必要な最小修正または確認: Binding の設計原則として、Core が返す result / warning / error / pending / replacement の security meaning と success / failure boundary を変更せず、Binding 通過や値変換だけを成功判定にしないことを追記する。併せて、Binding は unlock session、authorization cache、previous auth carry-over、stale pending promotion、normal-to-export conversion、Store interpretation / migration / fallback を持たず、confirmed export / approved signing request を生成・推測・補正せず Core へ橋渡しすることを記載する。callback、token、wire、API、状態表現は決めない。
- 完了条件または再確認方法: handoff、export、signing、Store、pending / failure / retry / restart の各入力・結果について、Binding が意味を決めず、Core の結果を同じ意味で伝達し、失敗・中断・再起動後に authorization または secret-capable state を継続させないことが本文から一意に追跡できることを確認する。

#### DR-003 — Native / Web の guarantee boundary の非対称

- Severity: `Major`
- Status: `New`
- 対象箇所: [`bindings.md:17-27`](../../design/bindings.md#L17)、[`bindings.md:51-57`](../../design/bindings.md#L51)、[`bindings.md:59-65`](../../design/bindings.md#L59)
- 発生条件または確認できた事実: §2 は Native と WASM の Core policy を共通にすると記載し、§5 は JavaScript、glue code、runtime、Browser process、page context および悪意ある extension の compromise を具体的に記載する。一方で、Native / Desktop / Mobile における OS、host process、Application の compromise は、同じく Core の保証外であることが本文から明示されていない。§6 の不要 retention 禁止は全経路に読めるが、host compromise の保証限界と通常非開示責任を全環境へ対応付ける source / boundary 記載がない。
- 既存の根拠: Concept は [`concept-sheet.md:105-113`](../../consept/concept-sheet.md#L105) および [`concept-sheet.md:157-168`](../../consept/concept-sheet.md#L157) で host compromise 非保証と、環境差によらない Core の非開示原則を定める。Requirements は [`requirements.md:80-92`](../../requirements/requirements.md#L80) と [`requirements.md:238-262`](../../requirements/requirements.md#L238) で Desktop / Mobile / Web / Browser / OS / host process を一つの責任境界としている。Architecture は [`architecture.md:54-100`](../../design/architecture.md#L54)、Security Design は [`security.md:55-92`](../../design/security.md#L55) で全環境の guarantee boundary を明示する。
- 問題: Web についてのみ「同じ context なので隔離境界ではない」「侵害を防止しない」が明示され、Native 側の OS / host process について同じ境界がない。Native 経路では Binding または C ABI が Web より強い秘密隔離境界であると誤読できる。
- 影響: Native / Desktop / Mobile で host compromise を Core / Binding が防止する、または compromise を理由に Native Binding が secret retention / disclosure を許容するという環境依存の解釈を下流へ許す。これは Architecture / Security Design の全環境 invariant を弱める。
- 必要な最小修正または確認: Native / Web / WASM の方式差を transport / representation / host property の差に限定し、Browser / OS / host process / Application の compromise 防止は Core / Binding の保証外であること、ただし全環境で通常処理の non-disclosure、non-retention、authorization boundary、failure safety は維持することを一つの共通原則として記載する。OS sandbox、process isolation、specific runtime は固定しない。
- 完了条件または再確認方法: Native と Web / WASM の両経路について、host compromise 非保証と、それを理由に Binding の不要な secret exposure / retention を許可しない責任が同じ文脈で追跡できることを確認する。

#### DR-004 — Native FFI safety intent の不足

- Severity: `Major`
- Status: `New`
- 対象箇所: [`bindings.md:43-49`](../../design/bindings.md#L43)
- 発生条件または確認できた事実: §4 は「呼び出し側の任意の不正 pointer を安全化する層ではない」とし、NULL、length、出力初期化、buffer 再利用、解放条件を公開ヘッダーと仕様へ委譲する。panic を ABI 越しに伝えず error へ変換する点はあるが、Native boundary で外部から渡された malformed / conversion-failure input を安全側に扱い、Core の外部可視意味を壊さず、失敗時に secret exposure を増やさないという Design intent が正の責務として整理されていない。
- 既存の根拠: Requirements の Binding 責任と外部入力・失敗時原則は [`requirements.md:183-191`](../../requirements/requirements.md#L183)、[`requirements.md:226-262`](../../requirements/requirements.md#L226) にある。Architecture は [`architecture.md:79-88`](../../design/architecture.md#L79) と [`architecture.md:133-167`](../../design/architecture.md#L133) で Binding を transport / conversion / ownership / error の境界とし、Core の意味・security responsibility を代替しない。Security Design は [`security.md:237-243`](../../design/security.md#L237) および [`security.md:356-364`](../../design/security.md#L356) で attacker-controlled input、failure safety、FFI の具体方式を分離している。
- 問題: 任意の無効アドレスを安全に dereference できることを要求する必要はないが、その限界と、Binding が責任を持つ well-formed boundary input の検証・変換失敗・ownership failure の fail-safe 責任が区別されていない。「安全化する層ではない」だけを根拠に、外部入力を検証前に Core へ渡す実装や、変換・panic・error で Core の失敗意味を置換する実装を排除できない。
- 影響: Native 経路だけが malformed input、変換失敗、出力失敗または panic を通じて異なる security / state meaning を作り、secret を含む結果や継続利用可能な一時値を増やす可能性がある。WASM と Native の共通 invariant、fail-closed および secret non-disclosure を下流へ一意に引き渡せない。
- 必要な最小修正または確認: 任意の不正 pointer を救済する保証はしないと明記したまま、Binding が受け付けられる外部入力境界では、検証可能な malformed input / conversion failure を Core へ渡す前に安全側へ拒否し、失敗を Core / Application の意味を変えずに伝達し、失敗経路で secret output / retention を増やさないという Design intent を追加する。pointer validity、NULL、struct、free-once、aliasing、panic conversion の実装は下流へ残す。
- 完了条件または再確認方法: Native boundary の責務が「任意の無効アドレスを安全化する保証」と「検証可能な外部入力・変換・失敗を安全側に扱う責務」に分離され、後者が WASM を含む共通 security invariant と矛盾しないことを確認する。

#### DR-005 — Binding implementation technique の過剰固定

- Severity: `Minor`
- Status: `New`
- 対象箇所: [`bindings.md:7-9`](../../design/bindings.md#L7)、[`bindings.md:43-55`](../../design/bindings.md#L43)、[`bindings.md:65-75`](../../design/bindings.md#L65)、[`bindings.md:93-102`](../../design/bindings.md#L93)
- 発生条件または確認できた事実: §1 / §2 が `bindings/native`、`wasm-bindgen` を対象方式として固定し、§4 が独立 crate と `cdylib` / `staticlib` を固定する。§5 は secret の raw / UTF-8 byte sequence、JavaScript string / hex / Base64 の禁止、`Uint8Array` と runtime copy を記載し、§6 は `localStorage`、`sessionStorage`、`IndexedDB` を列挙する。§7 はこれらを「採用した設計判断」として扱う。§8 で一部の具体契約を下流へ委譲しているが、方式選択と representation の一部は本書の normative detail に残っている。
- 既存の根拠: Concept は [`concept-sheet.md:98-103`](../../consept/concept-sheet.md#L98) および [`concept-sheet.md:140-153`](../../consept/concept-sheet.md#L140) で Binding 方式、API、受渡し、memory、消去を後続へ委譲している。Requirements は [`requirements.md:17-19`](../../requirements/requirements.md#L17) および [`requirements.md:383-388`](../../requirements/requirements.md#L383) で具体 Binding、値変換、WASM / JavaScript、Browser storage、build / distribution を下流へ委譲する。Architecture / Security Design も [`architecture.md:366-381`](../../design/architecture.md#L366) および [`security.md:342-364`](../../design/security.md#L342) で同様に具体方式を固定していない。
- 問題: これらの具体方式を変更しても、Binding が thin / non-authoritative boundary であり、Core ownership、authorization、non-disclosure、failure safety を維持する責務・trust boundary は変わらない。したがって、本書で crate、package type、JavaScript representation、encoding、storage API を採用決定することは、Binding 基本設計の責務と下流方式を混在させる。
- 影響: 下流が同じ security invariant を保った別の representation / package / bridge を選択できず、仕様変更時に Design の更新が必要となる。具体方式が security architecture の根拠と誤認され、DR-001 の dependency direction を補強する。
- 必要な最小修正または確認: 「Native / Web WASM は環境境界として存在し、方式差は representation / ownership / lifecycle の橋渡しに限定する」という Design intent と、「secret の implicit conversion、不要 retention、persistent secret state を許可しない」という invariant を残す。`wasm-bindgen`、`cdylib` / `staticlib`、exact type、encoding、storage API、directory / package は Specification / Implementation または Application / Extension 設計へ委譲する。
- 完了条件または再確認方法: 具体方式を変更しても、本書の責務・trust boundary・security invariant の変更を要求しない構成になり、下流が方式を選択しても Core non-authority と全環境 invariant を満たす条件だけが本書から引き渡されることを確認する。

#### DR-006 — Browser Extension architecture の責任越境

- Severity: `Minor`
- Status: `New`
- 対象箇所: [`bindings.md:51-57`](../../design/bindings.md#L51)、[`bindings.md:93-100`](../../design/bindings.md#L93)
- 発生条件または確認できた事実: §5 は「可能な限り page context から分離した background / extension context で Core を管理する方針」と記載する。これは WASM が JavaScript / Browser compromise を防ぐ境界ではないという guarantee boundary と異なり、Browser Extension の実行コンテキスト配置を wallet-core Binding の採用方針として指定している。
- 既存の根拠: Concept は [`concept-sheet.md:131-140`](../../consept/concept-sheet.md#L131) で Web Application / Browser Extension の Web 固有 state、Browser storage、page / Extension environment security を外部責任とする。Requirements は [`requirements.md:80-92`](../../requirements/requirements.md#L80)、[`requirements.md:383-388`](../../requirements/requirements.md#L383) で同じ責任を Application / Browser Extension 側へ置く。Architecture は [`architecture.md:79-88`](../../design/architecture.md#L79) と [`architecture.md:152-167`](../../design/architecture.md#L152) で Browser / host と Binding の責任を分け、specific process / runtime を固定していない。
- 問題: page / background / extension context の構成は統合先 Browser Extension / Application の architecture であり、wallet-core Binding が選択・保証する構造ではない。現在の表現は「可能な限り」で弱いが、§5 の方針として下流の Extension architecture を拘束する。
- 影響: Binding の仕様範囲が Browser Extension の process / context topology へ拡張され、Application 側の ownership、storage、host security と Binding の transport / representation responsibility が混ざる。context 分離を実施しても、WASM が compromise を防ぐ保証にはならない。
- 必要な最小修正または確認: Binding は WASM / Browser が恒久的 secret isolation boundary ではないことと、通常処理の non-disclosure / non-retention を記載するに留める。background / extension context の採用は Browser Extension / Application 設計への非規範的な integration consideration として明示するか、本書から外す。specific process isolation を Binding の保証にしない。
- 完了条件または再確認方法: Browser Extension の page / background 構成を変更しても Binding の責務・trust boundary・Core guarantee が変わらず、Application 側の別設計として扱えることを確認する。

## Required Changes

なし。Design Reviewer Skill の formal Gate 不合格に対応する `Critical` の New / Open / Reopened はない。

ただし、ユーザー指定の Design 完了条件では `Major` を解消すべきであり、DR-001〜DR-004 は Bindings Design をクローズする前に修正・再確認する。

## Optional Improvements

以下は Skill 上の `Major` / `Minor` の New finding である。formal Gate は `READY` のままでも、`Major` は Design フェーズ完了前に解消する。

- DR-001〜DR-004（Major / New）: Bindings Design の修正と再レビューが必要。
- DR-005〜DR-006（Minor / New）: Design と downstream / Application の責任を分離する修正が望ましい。

## Resolved Findings

なし。`bindings-review-001.md` より前の対象 basename に対応する Bindings Design review は存在しない。Architecture review の DR-001〜DR-009 および Security review の DR-001〜DR-012 は、Bindings review の過去 finding として引き継がず、同一 Design の確定基準・状態確認として参照した。

## Upstream Feedback

なし。Concept review 009、Requirements review 008、Architecture review 002、Security review 002 は、それぞれ `CONCEPT READY`、`REQUIREMENTS READY`、`ARCHITECTURE READY`、`SECURITY DESIGN READY` であり、Bindings Design を安全に評価するための上流責任・security property・全環境 boundary・下流委譲は不足していない。今回の問題は上流 gap ではなく、`bindings.md` における同一 Design 基準の配置、Binding-specific mediation responsibility および phase boundary の問題として記録した。

## Deferred Findings

正式な Deferred Finding はない。以下は本レビューで Design finding として要求せず、下流へ委譲または後続検証へ残す事項である。

- Native C ABI の exact struct、pointer validity、NULL / length rule、aliasing、free-once、panic conversion の実装、memory layout、allocator および actual ownership mechanics。
- WASM / JavaScript の exact public type、`Uint8Array` を採用するかどうか、glue code、generated package、encoding、copy count、runtime behavior および JavaScript 側の buffer lifecycle。
- `cdylib` / `staticlib`、`wasm-bindgen`、specific crate / directory、package layout、build / distribution の採用可否。ただし、これらは DR-005 の phase-boundary 修正後に下流で決定する。
- Wallet Store / Pending Profile の wire、schema、version、parser、error、resource limit、具体 migration / reject contract。Binding は opaque mediation とし、Core の no migration / reject / existing state preservation invariant を変更しないことが前提となる。
- Handoff、explicit export、signing approval の具体 callback、ACK、request field、UI、transport および Application / UI の実装適合性。Binding は user intent / approval / success を推測しないことが前提となる。
- secret buffer の exact lifetime、copy、zeroize、FFI memory safety、constant-time、fuzz / test、fixture、release verification、および Browser / OS / host process / third-party dependency 内部の完全消去。
- Browser Extension の page / background / extension context、process isolation、storage、permission、sandbox および Application architecture。WASM が Browser / JavaScript compromise を防止する保証ではないことと、不要な secret retention を許可しないことは Design invariant として残る。

## Scope and Traceability

### Design phase boundary

Bindings Design が確定すべきなのは、Native / Web Binding という environment boundary、Application と Core の mediation responsibility、Core non-authority、secret ownership / non-disclosure / non-retention、Core-owned security meaning の無変更伝達、environment guarantee boundary、failure / lifecycle の責任分界および Specification / Implementation への handoff である。

具体 ABI、pointer、NULL、free、JavaScript type、exact encoding、wire / schema、storage API、package、buffer lifetime、copy count、zeroize API、panic conversion、parser、test は下流で決める。具体方式が変わっても責務・trust boundary・security invariant が変わらない限り、本書の責任ではない。

### Architecture → Binding Traceability

| Architecture の確定内容 | Bindings Design の対応 | 評価 |
| --- | --- | --- |
| §3〜§4: Application → Binding → Core、Binding non-authority、全環境の通常 non-disclosure | `bindings.md` §2〜§3、§6 | 部分合格。方向と non-authority はあるが、DR-001 の source map と DR-003 の Native guarantee boundary を補う必要がある。 |
| §5.1、§7: Profile / Software Key / Account / Chain / Network を Core が所有し、Binding は意味判定・補正しない | `bindings.md` §3、§6 | 合格。Symbol / NEM、Mainnet / Testnet、Network / Chain の独自解釈をしないことを明示している。 |
| §5.2、§6.2、§9.3: opaque Store、Core の version / validity / migration policy、Application の replacement responsibility | `bindings.md` §3、§8 | 部分合格。opaque transfer はあるが、DR-002 の no interpretation / no migration / no fallback / committed-state meaning の mediation が明示不足。 |
| §5.3、§6.1、§6.5、§9.4: processing-unit auth、pending 非昇格、failure / retry / restart、existing state protection | `bindings.md` §3〜§4、§6 | 要修正。DR-002 により Binding の state / authorization non-authority と無変更伝達が一意でない。 |
| §9.1〜§9.2: 全環境共通 policy、user intent / Core authorization の分離 | `bindings.md` §2、§6〜§7 | 部分合格。signing UI / permission を持たない点は合格、DR-002 の approved / confirmed request mediation と DR-003 の all-environment guarantee が不足。 |
| §10: concrete ABI / WASM / JS / memory / storage は下流委譲 | `bindings.md` §8 | 部分合格。委譲リストはあるが、§1、§4、§5、§7 の方式固定と競合し、DR-005 とした。 |

### Security Design → Binding Traceability

| Security Design の確定内容 | Bindings Design の対応 | 評価 |
| --- | --- | --- |
| §3〜§4、§8: 全環境 trust / guarantee boundary、Binding non-authority、secret lifetime / retention | `bindings.md` §2、§5〜§6 | 部分合格。WASM boundary と non-retention はあるが、DR-003 により Native / OS / host boundary の対称性が不足。 |
| §6.1: processing-unit authentication、no session / cache / carry-over / restart authorization | `bindings.md` §3、§6 | 要修正。認証を行わないことと cache 非許可はあるが、DR-002 の明示的な processing-unit mediation invariant がない。 |
| §6.2〜§6.4: handoff、explicit export、signing approval と Core authorization の分離 | `bindings.md` §6 | 部分合格。通常 secret 非開示、signing primitive、UI / permission non-authority はあるが、DR-002 により handoff / export の success / request meaning の無変更伝達が不足。 |
| §6.5〜§6.6: Store / version / no migration、pending / failure / retry / restart | `bindings.md` §3、§8 | 要修正。opaque transfer はあるが、DR-002 により version・pending・failure meaning の non-authority が一意でない。 |
| §7: Profile Network、Software Key Chain、Account compatibility を Core が検証し、fallback / implicit conversion をしない | `bindings.md` §3 | 合格。Binding が独自に Chain / Network 組合せを解釈せず Core と異なる結果を返さない。 |
| §10: Specification / Implementation への security invariant、FFI、memory、parser、test handoff | `bindings.md` §8〜§9 | 部分合格。具体 detail の委譲先はあるが、DR-001 の source map、DR-004 の Native safety intent、DR-005 の方式固定を修正する必要がある。 |

### Binding Responsibility / Non-authority

部分合格。型、opaque data、error / warning、ownership / lifecycle の橋渡しと `Application → Binding → Core` の方向は §3 にある。Binding が Core の暗号、認証、導出、署名、Transaction 意味、Chain / Network policy を代替しないことも明示されている。一方、Core-owned security meaning を成功・失敗・pending・authorization の各状態で変更しないことが十分に書かれておらず、DR-002 の修正が必要である。

### Native / Web Trust Boundary

要修正。Native と WASM が Core policy を共有すること、および WASM が JavaScript の完全隔離境界でないことは合格である。Browser / Web の compromise だけが具体化され、Native / Desktop / Mobile の OS / host process compromise 非保証が同じ design boundary として明示されていないため、DR-003 を採用した。

### Processing-unit Authentication

要修正。§3 の「Binding は認証を行わない」と §6 の cache / global state 禁止は正しい。しかし、Binding の unlock session / authorization cache / previous result carry-over の禁止、retry 再認証、restart 後の非継続を明示しないため、Architecture §6.5 / Security Design §6.1 の invariant を下流へ一意に渡せない。DR-002 に対応する。

### Mnemonic Handoff Mediation

要修正。初回 handoff を要件・仕様で限定する点はあるが、Binding 通過、Mnemonic の返却または Application 呼出しだけでは成功でなく、Application の提示・利用者の明示受領・Core への確認伝達・Core の Profile 最終確定が必要であること、pending / unconfirmed を昇格しないことが本書から直接追跡できない。DR-002 に対応する。callback / ACK / PendingProfile の具体形式は要求しない。

### Explicit Export Mediation

要修正。§6 は export を通常処理と分け、正しい password を条件にするが、target selection、user explicit request、Application / UI confirmation、confirmed request、Core per-operation authorization の独立条件、対象外非返却、normal operation からの暗黙 export 禁止および export 後の原本 / external copy 境界を Binding mediation として一意に記載していない。Binding がこれらを判断する必要はないが、生成・推測・補正せず、Core の条件と結果をそのまま橋渡しする責務が必要であり、DR-002 に対応する。

### Signing Approval Boundary

合格（DR-002 の共通 mediation 修正は必要）。§6 は `sign()` を raw payload の signing primitive とし、Transaction 解釈、human-readable confirmation、署名承認 UI、権限管理を Binding が行わないとする。これは `Profile password authorization != user signing approval` と整合する。Application / UI の Account 選択、内容提示、explicit approval、approved request only は上流 Application responsibility であり、Binding は承認を生成・推測・代替せず、request の意味を変えず Core へ橋渡しすることを DR-002 の修正で明示する。raw primitive 自体を blind signing authority と誤認する根拠は現行本文にない。

### Account / Chain / Network

合格。§3 は Symbol / NEM、Mainnet / Testnet、Network / Chain の組合せを Binding が独自解釈せず、Core と異なる結果を返さないとする。Core が supported set、compatibility、mismatch、fallback、implicit conversion を authoritative に扱う Architecture / Security Design を弱めていない。specific identifier、byte order、derivation、protocol contract は下流事項である。

### Store / Version / Migration

部分合格。§3 の opaque Store / Pending Profile transfer と Core への input meaning 委譲は方向として正しい。しかし、Binding が Store 内部を解釈せず、version を読み替えず、unknown / corrupt / inconsistent data を補正せず、migration / fallback / schema normalization を行わず、reject 時の existing committed state を別の成功状態として扱わないという invariant が明示不足である。これは DR-002 に含め、wire / schema / parser は下流へ残す。

### Pending / Failure / Retry / Restart

要修正。Pending Profile を受渡し対象に列挙し、Core error / warning を写像する点はあるが、pending / partial は committed でなく、stale / unconfirmed を昇格せず、failure / interruption で existing state を保護し、retry は新規入力・再認証、restart 後に authorization / pending を継続しないという責任がない。DR-002 に対応する。

### Secret Mediation / Retention

合格（DR-002〜DR-003 の周辺修正は必要）。§6 は通常処理で Mnemonic、private key、password、復号済み payload を返さず、処理完了後の secret retention、unnecessary copy、cache、global state、diagnostic、log、Browser storage を許容しない。WASM の best-effort zeroize が host copy の完全消去を保証しないことも明示され、host guarantee 外を retention の根拠にしていない。具体 copy count、buffer lifetime、zeroize API は下流である。Native を含む全経路共通であることを DR-003 の修正でさらに明示する。

### Host Compromise / Guarantee Boundary

要修正。Web / Browser compromise の防止が保証外である点は合格だが、OS / host process / Application の compromise も同じく保証外であり、compromise を理由に Binding の non-disclosure / non-retention / authorization / failure responsibility を弱めないことが Native / Web 共通に必要である。DR-003 に対応する。

### Native Design Boundary

要修正。独立 crate、`cdylib` / `staticlib`、borrowed input、owned output、free-once、NULL / length / pointer、panic conversion の多くは Specification / Implementation の詳細であり、§8 に委譲されるべきである。§4 にある「任意の不正 pointer を安全化しない」という guarantee boundary は残せるが、検証可能な malformed input / conversion failure を fail-safe に扱い、Core meaning と secret exposure を変更しない正の Design intent が必要であり、DR-004 に対応する。

### WASM / JavaScript Design Boundary

部分合格。WASM が JavaScript / Browser の完全な secret isolation boundary でなく、host copy の完全消去を保証しないこと、Application 側の表示・保持責任を Core / Binding の保証と混同しないことは適切である。一方、raw / UTF-8、JavaScript string / hex / Base64、`Uint8Array` 等の exact representation は、no implicit conversion / no unnecessary retention という intentを除き下流へ委譲すべきであり、DR-005 に対応する。

### Browser Extension Responsibility Boundary

要修正。Browser Extension の Web 固有 state、storage、page / extension environment security は Application / Extension 側である。WASM が侵害防止境界でないことは Binding Design に残すが、background / extension context での管理方針は統合先 architecture へ委譲し、DR-006 に対応する。

### Design vs Specification / Implementation Boundary

要修正。§8 は exact API、ABI、wire、schema、memory、copy、zeroize、OS / Browser を下流へ委譲しており、未決定のままでも Design defect ではない。しかし §1 / §4 / §5 / §7 は一部の具体方式を Design decision として先取りし、§2 / §9 は Specification を upstream と読める。下流の具体契約はそのまま正本として扱いつつ、責務・trust boundary・security invariant の根拠を上流 / 同一 Design に戻す必要がある。DR-001、DR-005 に対応する。

### Related Design Consistency

Architecture `ARCHITECTURE READY` および Security Design `SECURITY DESIGN READY` と、`bindings.md` の意図する `Application → Binding → Core`、Binding non-authority、opaque data、Native / WASM 共通 policy、secret non-disclosure は基本的に整合する。Architecture / Security Design を上書きする別 policy、Symbol / NEM または Mainnet / Testnet の fallback、Core 外の secret owner を明示する記述は確認されない。

ただし、`bindings.md` の Source of Truth 配置、Native の guarantee boundary、security lifecycle の mediation 詳細、Browser Extension の責任配置は、確定済み同一 Design の明示性に達していない。これは上流不整合ではなく、DR-001〜DR-006 として本対象の finding に整理した。

## Validation Results

- 実施: `AGENTS.md`、Design Reviewer Skill 一式、共通 reviewer policy、指定された Concept / Concept review / Requirements / Requirements review / Architecture / Architecture review / Security Design / Security review および `bindings.md` の確認。
- 実施: `bindings-review-001.md` の Markdown 見出し構造、共通章順、finding ID の重複、相対リンクの対象ファイル、Concept / Requirements / Architecture / Security / target 参照、Design phase boundary、変更範囲および `git diff --check` の確認。
- 未実施: Rust formatter、clippy、cargo test、WASM check。変更対象は review artifact のみで、コード、Binding、Specification、Implementation、Test を変更していないため対象外。
- 未確認: Specification / Implementation / Test / fixture の適合性、実 Application / UI / Binding、外部 Node、実際の handoff / export / signing approval、暗号方式、wire / schema、parser、具体 memory / FFI、actual zeroization、runtime / OS の完全消去。これらは下流の検証範囲であり、本レビューの normative source ではない。

## Review Gates

Design Reviewer Skill の Gate 不合格は `Critical` に対応付ける。今回、`Major` / `Minor` の New finding はあるが、Skill 上の formal Gate failure とする `Critical` はないため、各 Gate は形式上合格、Design 完了は Major 修正確認待ちと判定する。

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | §1 は Native / WASM Binding の目的・対象・Core との関係を示す。具体方式の過剰記載は DR-005、Browser Extension の越境は DR-006 として別評価する。 | DR-005、DR-006（Major なし） |
| 2. コンテキストと責任 | 合格（修正待ち） | §2〜§6 に Application / Binding / Core、WASM / Browser、secret non-disclosure がある。ただし Native / host guarantee の非対称と Binding lifecycle responsibility の不足がある。 | DR-002、DR-003、DR-004 |
| 3. 依存方向 | 合格（修正待ち） | §3 は `Application → Binding → Core` を明記するが、§2 / §9 は Specification を上流根拠として読め、source map が前段 Design と一致しない。 | DR-001 |
| 4. 主要フロー | 合格（修正待ち） | handoff、export、signing、Store、pending の受渡し対象は列挙されるが、success / failure / retry / restart の Core-owned meaning を Binding が変更しない条件が不足する。 | DR-002 |
| 5. データ所有 | 合格（修正待ち） | secret の通常非開示、不要 retention 禁止、opaque data の transfer はある。Core 原本、external copy、pending / committed、replacement、authorization state の無変更 mediation を補う必要がある。 | DR-002、DR-003 |
| 6. Security と相互運用性 | 合格（修正待ち） | Core non-authority、signing UI / permission non-authority、Chain / Network 独自変換禁止、WASM guarantee boundary はある。全環境 guarantee、processing auth、handoff / export / Store / pending の明示が不足する。 | DR-002、DR-003、DR-004 |
| 7. 上流整合性 | 合格（修正待ち） | Requirements、Architecture、Security Design の実体と意図は大きく矛盾しないが、Source of Truth の配置と具体方式の先取りが前段 Design の phase boundary と不一致である。 | DR-001、DR-005、DR-006 |
| 8. 下流実装可能性 | 合格（修正待ち） | §8 は多くの具体事項を委譲している。Security architecture の mediation invariant と Native safety intent を下流が推測しないようにする必要がある。 | DR-002、DR-004、DR-005 |

Formal Gate: `READY`（Critical 0 件）。ただし、ユーザー指定の完了条件における Bindings Design completion は `NOT READY TO CLOSE`。DR-001〜DR-004 の Major が解消されるまで Design フェーズをクローズしない。

## Remaining Risks and Open Decisions

- Binding Design-level Open Decision: 0件。未解消の New finding は DR-001〜DR-006 であり、DR-001〜DR-004 は Design completion blocker、DR-005〜DR-006 は phase / responsibility boundary correction である。具体 API、ABI、wire、memory、Browser API の未決定は Binding Design-level Open Decision ではなく下流委譲事項である。
- 残存リスク: Binding の一般的な thin / non-authoritative 記述だけでは、下流が processing-unit authorization、pending、handoff、export、Store または retry / restart の security meaning を変えないことを誤実装する余地がある。
- Environment risk: Web の host compromise 非保証は明記されるが、Native / Desktop / Mobile の OS / host process と同じ guarantee boundary が現在明示されていない。
- Native risk: 任意の無効 pointer を安全に救済する保証と、検証可能な外部入力・変換失敗を安全側へ扱う責務の区別が不十分である。
- 下流への前提: Specification / Implementation は、DR-001〜DR-004 の修正で確定する mediation invariant を、具体 API / ABI / state / error / memory 契約へ反映する必要がある。下流の既存契約があることだけで、現行 Design の不足を補完したとは扱わない。
- Upstream Feedback: なし。Requirements、Architecture、Security Design の不足を推測で埋める必要は確認されない。

## Automatic Changes

なし。Concept、Requirements、Architecture、Security Design、`docs/design/bindings.md`、Specification、Implementation、Test、README、Skill および過去 review は変更していない。新規に作成したのは本 review artifact のみである。

## Final Decision

`READY`

Design Reviewer Skill の formal result は `READY` とする。現行の正式 finding は `Critical / Major / Minor = 0 / 4 / 2` で、Critical はないため formal Gate は不合格ではない。

しかし、`BINDINGS DESIGN READY` は宣言しない。DR-001〜DR-004 は、Source of Truth、Core-owned security meaning、全環境 guarantee boundary および Native FFI safety intent に関する Bindings Design-level Major であり、修正・再レビュー前に Design フェーズをクローズできない。DR-005〜DR-006 も具体方式と Browser Extension architecture の責任越境を整理する必要がある。
