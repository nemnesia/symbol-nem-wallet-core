# Design Review Findings: Architecture

## Review Target

- 対象: [`docs/design/architecture.md`](../../design/architecture.md)
- 確認日: 2026-08-30
- 成果物: `docs/reviews/design/architecture-review-002.md`
- Review Scope: Architecture 本文の目的・対象・対象外、Concept / Requirements からの追跡、システムコンテキスト、component responsibility、dependency direction、protected assets、secret ownership、trust boundary、authentication / authorization、signing authority、初回 Mnemonic handoff、explicit secret export、Store ownership / version / migration、Chain / Network / Account 境界、failure / atomicity / retry / restart、Native / WASM Binding 責任、Specification への委譲および設計フェーズ境界。特に architecture-review-001 の DR-001〜DR-009 の解消実体、修正による回帰および新規問題を、Architecture 本文の状態宣言に依存せず Concept / Requirements と照合した。
- 未確認範囲: Specification、Implementation、Test、fixture、実際の Application / UI、外部 Node、具体 API / ABI、DTO、wire format、暗号方式・パラメータ、memory lifetime、zeroize 実装および個別テストの適合性。これらは今回の Architecture 判定の正本根拠にしていない。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として候補の反証・統合、重大度、Gate および成果物を担当した。
- Reviewer A（構造と責務）: 完了。目的・範囲、全主体の責務、component dependency、Store ownership、Profile / Software Key / Account のモデル、Architecture 本文の内部整合および前回修正による責務逆流を確認した。
- Reviewer B（Security primary）: 完了。Mnemonic、Software Key private key、derived / decrypted secret、Profile password、temporary secret、Core 管理下 Store、signing authority を対象に、protected asset、secret lifecycle、trust boundary、認証・認可、export、handoff、signing approval、failure safety、chain / network separation、Binding 境界および security invariant を確認した。
- Reviewer C（フローと運用）: 完了。Profile 作成・復元、初回 handoff、derivation、import / generation、signing、password change、export、削除、Store rejection、pending / partial state、atomicity、retry、restart および persistence failure の責任を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept → Requirements → Architecture → Specification → Implementation の normative dependency、Requirements の security property の Architecture への traceability、下流が責務・境界・invariant を推測せずに済むか、Design phase boundary を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を `docs/design/architecture.md` 1件、成果物を本書、normative upstream を Concept / Requirements、同一 Design の関連資料を補助確認先として確定した。`AGENTS.md` に Design Phase Context の登録がないため Context は使用していない。
- Phase 1（独立レビュー）: 完了。A〜D の担当観点から現行本文を前回 finding の完了条件と Requirements に照合した。
- Phase 2（反証・統合）: 完了。DR-001〜DR-009 の各完了条件、修正箇所、上流根拠、重複候補、Design で決めるべき事項か、下流委譲で足りる事項かを再確認した。新規 finding 候補は正式採用しなかった。
- Phase 3（ゲート・成果物）: 完了。本書作成後に共通章順、finding ID、相対リンク、参照先、`git diff --check` および変更範囲を検証した。

## Evidence Used

### Review Basis

| 種別 | 参照資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、フェーズ境界、Scope Discipline、秘密情報保護、Validation、変更範囲および Git 運用を確認 |
| Design Reviewer Skill | [`SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/design-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/design-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/design-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/design-review/output-format.md) | Reviewer A〜D、Security primary、finding 採用条件、設計フェーズ境界、重大度、formal Gate および成果物構成を確認 |
| 共通 reviewer policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、finding と Upstream Feedback / Deferred Findings の分離、検証および成果物構成を確認 |
| 上流 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1〜§13 | 製品目的、v1 境界、Core 継続管理、通常処理での秘密情報非開示、全環境共通原則および host compromise の保証限界を確認 |
| Concept review | [`concept-sheet-review-009.md`](../concept/concept-sheet-review-009.md) | `READY` / `CONCEPT READY` と Concept 側の未解決 finding がないことを履歴として確認。Architecture 本文の正否の代替にはしていない |
| 上流 Requirements | [`requirements.md`](../../requirements/requirements.md) §1〜§13 | Profile、Mnemonic、Software Key、Account、Chain / Network、処理単位認証、handoff、explicit export、signing approval、Store version / migration、atomicity、failure、Binding および受入条件の主根拠 |
| Requirements review | [`requirements-review-008.md`](../requirements/requirements-review-008.md) | `READY` / `REQUIREMENTS READY` と RR-001〜RR-029 の全件 Resolved を履歴として確認。Requirements 本文の代替にはしていない |
| 対象 Design | [`architecture.md`](../../design/architecture.md) §1〜§11 | 現行 Architecture の責務、ownership、trust boundary、lifecycle、設計判断、failure model および下流委譲を独立評価 |
| 前回 Design review | [`architecture-review-001.md`](architecture-review-001.md) | DR-001〜DR-009 の発生条件、完了条件、重大度および今回の再確認対象を追跡 |
| 同一 Design の関連資料 | [`security.md`](../../design/security.md)、[`bindings.md`](../../design/bindings.md) | 必要な範囲の責務・境界整合を補助確認。Architecture の上流根拠、または今回の Architecture finding の根拠にはしていない |

### Upstream Source of Truth

Architecture の normative な上流 Source of Truth は [`concept-sheet.md`](../../consept/concept-sheet.md) と [`requirements.md`](../../requirements/requirements.md) に限定される。Concept review 009 と Requirements review 008 は、それぞれの上流フェーズの判定履歴として使用した。`docs/design/security.md` と `docs/design/bindings.md` は同一 Design フェーズの関連資料であり、`docs/specifications/` は下流の契約・整合確認先であるため、Architecture の responsibility、ownership、trust boundary または security architecture を逆算する根拠にはしていない。

## Review Result

`READY`

### Review Gate

Design Reviewer Skill の formal Gate を適用した。DR-001〜DR-009 はすべて `Resolved` で、現行の `Critical` は 0 件である。新規 `Critical`、`Major`、`Minor` も確認されなかったため、formal Review Result は `READY` とする。Architecture の観点では、次の `security.md` review へ進めてよい。`security.md` 自体の独立レビュー結果を本書から先取りするものではない。

## Summary

更新済み Architecture は、前回の DR-001〜DR-009 で要求された責務・所有・trust boundary・lifecycle・failure responsibility・authorization boundary・security invariant を、Requirements の本文へ追跡可能な形で配置している。

具体的には、Architecture の normative upstream を Concept / Requirements に限定し、Specification を下流委譲先・整合確認先として分離した。Desktop / Mobile / Web、Native / WASM、Application、Browser、OS、host process、persistent storage、Transaction layer、Network layer および利用者をシステムコンテキストに配置し、全環境で Core の継続的 secret ownership、通常処理の非開示、host compromise 非保証、Native 経路での invariant 維持を共通化している。

また、初回 Mnemonic handoff の6段階の成功境界、explicit export の対象・明示要求・Application / UI 確認・Core password authorization の分離、signing の user approval と password authorization の分離、v1 Store / Profile version migration 非提供、Account / Chain / Network の固定関係と Core reject、全 secret-capable operation の処理単位認証、pending / partial state と failure / retry / restart の責任が、Architecture 本文から一意に追跡できる。

修正は Design の責務範囲に留まり、API、ABI、DTO、wire format、暗号パラメータ、具体 UI、memory handling、zeroize、parser、test implementation を過剰に固定していない。Requirements の新規追加や上流への差戻しを必要とする欠陥、修正による Architecture レベルの回帰、新規 finding は確認されなかった。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| DR-001 | Major | Resolved | architecture-review-001 | §2.1 と §11.2 が Concept / Requirements のみを normative upstream とし、Specification を下流委譲先・整合確認先に明示的に分離している。 |
| DR-002 | Critical | Resolved | architecture-review-001 | §1、§3、§3.1、§4.4、§8 が全環境の主体・境界、host compromise 非保証および Core / Binding の共通非開示責任を配置している。 |
| DR-003 | Critical | Resolved | architecture-review-001 | §5.3、§6.1 が Core 生成から Application の提示、利用者の明示受領、確認伝達、Core の最終確定までを成功境界として定義している。 |
| DR-004 | Critical | Resolved | architecture-review-001 | §3.1、§4.3、§5.1、§6.4 が export 対象、明示要求、UI 確認、Core authorization、非暗黙遷移、原本と外部コピーの責任を分離している。 |
| DR-005 | Critical | Resolved | architecture-review-001 | §2.2、§3.2、§4.3、§6.3 が Application / UI の提示・明示承認・approved-only request と Core の password authorization・key use・signing primitive を分離している。 |
| DR-006 | Critical | Resolved | architecture-review-001 | §1、§5.2、§8、§9.3、§10 が v1 migration 非提供、version 識別・対応 version 限定・reject・opaque boundary・既存状態不変を定義している。 |
| DR-007 | Critical | Resolved | architecture-review-001 | §2.2、§5.1、§6.2、§7 が Profile / Software Key / Account のモデル、Core の compatibility reject、Binding non-authority、状態不変・secret 非返却・fallback 禁止を定義している。 |
| DR-008 | Critical | Resolved | architecture-review-001 | §3.2、§4.2、§6.2、§6.5 が全 secret-capable operation の per-operation authorization、session / cache / carry-over / restart 継続禁止を定義している。 |
| DR-009 | Critical | Resolved | architecture-review-001 | §5.2〜§5.3、§6.1〜§6.2、§6.5、§9.4 が pending / partial の意味・所有、failure safety、retry 再入力・再認証、restart 後の非継続および Store persistence を定義している。 |

### DR-001 Status

`Resolved`。現行 Architecture は Specification を Architecture の上流根拠として扱わず、Concept → Requirements → Architecture → Specification → Implementation の方向を明示している。

### DR-002 Status

`Resolved`。全環境の actor と境界が列挙され、host compromise 非保証と、host compromise を理由に Core / Binding の非開示・authorization boundary を弱めない invariant が共通化されている。

### DR-003 Status

`Resolved`。初回 handoff は、Core 生成、意図された Application への受渡し、Application による利用者提示、利用者の明示受領、Application から Core への確認伝達、Core の成功確定の全条件を満たす場合だけ成功する。

### DR-004 Status

`Resolved`。export 対象、利用者の明示要求、Application / UI の確認済み要求、Core の operation 単位 password authorization、非 UI・非推測・非暗黙遷移、対象外非返却、export 後の所有責任が分離されている。

### DR-005 Status

`Resolved`。Application / UI の Account 選択・payload 提示・利用者明示承認・approved-only request と、Core の password authorization・compatibility 検証・秘密鍵利用・signing primitive が分離され、`password authorization != user signing approval` が明示されている。

### DR-006 Status

`Resolved`。v1 は Store / Profile version migration を提供せず、Core の対応 version 限定、unsupported / unknown / corrupt / inconsistent data の reject、Application の opaque 扱い、fallback / implicit migration / guessed interpretation の禁止、reject 時の既存状態不変が明示されている。

### DR-007 Status

`Resolved`。Profile は Network 固定・Chain 非固定、Software Key は Chain 固定、Account は固定 Chain + Profile Network 上の利用単位であり、Core が supported / mismatch を fail-closed に reject し、Binding が意味判定を代替しない。

### DR-008 Status

`Resolved`。signing、derivation、Imported / Generated Software Key 登録、password change、export、Software Key deletion、Profile deletion へ共通の per-operation authorization が適用され、Core / Binding / Application の session・cache・認証結果持越しと restart 後の認証継続が禁止されている。

### DR-009 Status

`Resolved`。pending / partial は committed state ではなく、その security meaning と成功昇格条件を Core が所有する。failure / interruption / retry / restart でも既存 committed state、secret ownership、authorization boundary を変更せず、stale / unconfirmed state を自動昇格しない。

### New Finding Summary

新規 finding はない。現行の New / Open / Reopened は 0 件である。履歴上の finding は DR-001（Major）と DR-002〜DR-009（Critical）であり、今回すべて `Resolved` と判定した。

| 集計範囲 | Critical | Major | Minor |
| --- | ---: | ---: | ---: |
| 現行の New / Open / Reopened | 0 | 0 | 0 |
| 今回確認した履歴上の Resolved | 8 | 1 | 0 |

## Required Changes

なし。Critical の New / Open / Reopened がなく、formal Gate 不合格に対応する Required Change はない。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened もなく、Architecture に追加の任意改善を求める finding はない。

## Resolved Findings

### DR-001 — Specification を Architecture の上流根拠として扱う参照方向

- Severity: `Major`
- Status: `Resolved`
- 対象箇所: [`architecture.md:24-41`](../../design/architecture.md#L24)、[`architecture.md:383-409`](../../design/architecture.md#L383)
- 発生時の事実: 前回は §2.1 と §11 で Specification / Wallet Store format を Architecture の上流参照と同列に置き、Design → Specification の委譲方向と normative dependency が混在していた。
- 今回確認した事実: §2.1 は Architecture の normative な上流 Source of Truth を Concept と Requirements の二つだけとし、`Concept → Requirements → Architecture → Specification → Implementation` を明記している。Specification と Wallet Store format は Architecture から委譲された API、validation、error、crypto、protocol、wire / format の下流正本・整合確認先と記載し、Architecture の上流根拠ではないと明示している。§11.2 も同じ区分を表で再確認し、Specification を理由に責務・ownership・trust boundary・security architecture を変更しないことを記載している。
- 既存の根拠: Concept / Requirements を上流とし、Design から Specification へ進むフェーズ境界は [`AGENTS.md`](../../../AGENTS.md)、Requirements §1.2 / §1.3、Requirements review 008 にある。今回の判定は前回レビューの自己申告ではなく、現行 Architecture の §2.1 / §11.2 と上流資料を突合して行った。
- 問題と影響の再確認: 現行文書では Specification に既存の API、wire、state、crypto があることだけを理由に Architecture の responsibility、ownership または trust boundary を逆算する読解余地は解消されている。Specification の具体契約を下流正本として扱うこと自体は Requirements と Design phase boundary に適合する。
- 必要な最小修正または確認: 前回の完了条件は、参照表から normative dependency の方向を第三者が説明でき、Specification の下流正本性を維持したまま Architecture の上流根拠としないことだった。現行本文がこの条件を満たすことを確認した。
- 完了条件または再確認方法: §2.1、§11.1、§11.2、末尾の dependency 説明を読み、Concept / Requirements → Architecture → Specification の方向、下流正本と上流根拠の区別、逆算禁止が一貫していることを確認した。

### DR-002 — Native / Desktop / Mobile / OS / host process の trust boundary

- Severity: `Critical`
- Status: `Resolved`
- 対象箇所: [`architecture.md:3-20`](../../design/architecture.md#L3)、[`architecture.md:54-100`](../../design/architecture.md#L54)、[`architecture.md:152-167`](../../design/architecture.md#L152)
- 発生時の事実: 前回は Web runtime の限界は示されていたが、Desktop / Mobile / Native / OS / host process を含む全環境の trust boundary と共通非開示責任が一意でなかった。
- 今回確認した事実: §1 と §3 のコンテキストに利用者、Desktop Application、Mobile Application、Web Application、Browser Extension、Native Binding、Web WASM Binding、Rust Core、Browser、OS、host process、persistent storage、Transaction layer、Network layer を配置している。§3.1 は Desktop / Mobile / Web / Native / Web WASM に同じ invariant を適用し、Mnemonic / Software Key の継続管理主体を Core、Binding / Application を非継続管理主体とする。Application / Browser / OS / host process の compromise 防止は Core の保証外だが、Core / Binding が不要な secret を返却・共有・継続保持・診断出力する責任と authorization boundary は弱めないと明記している。§4.4 と §8 も Native / Desktop / Mobile の保証限界を再確認している。
- 既存の根拠: Concept §7、§9〜§10、Requirements §2.2〜§2.4、NFR-004、SEC-011、SEC-020、AC-024、AC-040 が、Web 固有に閉じない全環境共通の Core responsibility、host compromise 非保証および不要な secret 非開示を要求する。
- 問題と影響の再確認: Native 経路を理由に Web より弱い security invariant とする実装、または host compromise 非保証を秘密情報公開の許可と解釈する実装は、現行 Architecture の本文と矛盾する。各環境の具体的 isolation / ABI は下流へ委譲されたままである。
- 必要な最小修正または確認: 前回の完了条件である全 actor / boundary の列挙、host compromise 非保証、Native を含む全環境での Core / Binding 非開示責任の共通化を満たすことを確認した。
- 完了条件または再確認方法: §3、§3.1、§4.2、§4.4、§4.5、§8 を対象に、Desktop / Mobile / Web の各経路について host compromise の保証主体、継続 secret owner、通常結果の非開示責任および Binding non-authority を追跡した。

### DR-003 — 初回 Mnemonic handoff の成功境界と actor 責任

- Severity: `Critical`
- Status: `Resolved`
- 対象箇所: [`architecture.md:122-129`](../../design/architecture.md#L122)、[`architecture.md:139-150`](../../design/architecture.md#L139)、[`architecture.md:211-240`](../../design/architecture.md#L211)
- 発生時の事実: 前回は handoff と Profile 確定の分離はあったが、Core 生成から Application、利用者確認、確認伝達、Core 最終確定までの actor と成功条件が一意でなかった。
- 今回確認した事実: §6.1 は、(1) Core が完全な Mnemonic を生成し、(2) 意図された呼出し元 Application へ渡し、(3) Application が意図した利用者へ提示し、(4) 利用者が明示的に受領確認し、(5) Application が確認成立を Core へ伝え、(6) Core が確認後だけ Profile 作成を成功状態として最終確定する順序を定義している。生成、一時保持、Binding 通過、Application 受領、Application の呼出しだけでは成功としない。受領不能、提示不能、拒否・未確認、確認伝達不能、中断または最終確定失敗では Profile / partial state を成功状態として残さず、Mnemonic を通常・失敗・診断結果へ漏らさない。Core は紙・外部媒体への記録や将来紛失を独立検証せず、Application の確認伝達を trust boundary としている。
- 既存の根拠: Requirements UC-001、FR-001、FR-019、SEC-010、SEC-017〜SEC-018、AC-001、AC-034 が同じ6段階、失敗時非成功・非開示および Core 非独立検証の責任境界を定める。Concept §7 も明示的アクセスと Core 管理境界を定める。
- 問題と影響の再確認: Application 呼出しや Binding 通過だけで Profile を成功扱いする設計、または Core が UI / 人間の行動を直接検証する設計は、現行 §6.1 の成功境界と両立しない。具体 API / callback / ACK / pending 型は未固定で、Design phase boundary に適合する。
- 必要な最小修正または確認: 前回の完了条件である各 actor、確認前後の Profile 成功状態、failure / interruption 時の非成功・非開示、Core が紙への記録を検証しない境界が Architecture にあることを確認した。
- 完了条件または再確認方法: §3.1、§4.3、§5.3、§6.1 を Requirements UC-001 / FR-001 / AC-001 / AC-034 と突合し、6段階と成功・失敗境界を再確認した。

### DR-004 — Explicit secret export の authorization / intent boundary

- Severity: `Critical`
- Status: `Resolved`
- 対象箇所: [`architecture.md:90-114`](../../design/architecture.md#L90)、[`architecture.md:181-193`](../../design/architecture.md#L181)、[`architecture.md:277-292`](../../design/architecture.md#L277)
- 発生時の事実: 前回は password と個別 export の存在は示されていたが、対象指定、利用者の明示要求、Application / UI の意思確認、confirmed request、Core の非 UI 責任および export 後の原本 ownership が一意でなかった。
- 今回確認した事実: §6.4 は Mnemonic と Software Key private key の export を通常処理から分離し、Application / UI に対象の表示、利用者の明示要求の確認、確認済み要求だけの Core 送信を割り当てる。Core には対象 Profile / Software Key の解決、当該 operation の Profile password authorization、対象指定・authorization・confirmed request が成立した場合だけの要求対象返却、UI 非提供、意思非推測、通常処理からの暗黙遷移禁止、対象外非返却を割り当てる。誤認証、意思確認なし、対象不存在、処理失敗では secret を返さず Profile / Store を変更しない。成功後も Core 内原本は Core、外部コピーの表示・保存・利用・紛失防止は Application / 利用者である。§5.1 も protected assets と境界を同じく定義している。
- 既存の根拠: Requirements UC-011、FR-022〜FR-023、SEC-010、SEC-021、AC-025〜AC-026、AC-041〜AC-043 が Mnemonic / Software Key の個別 export に別々の対象指定、明示要求、意思確認、処理単位 password authorization、原本と外部コピーの責任を要求する。
- 問題と影響の再確認: password possession や任意の API 呼出しだけで export できる設計、通常処理から暗黙に export へ遷移する設計、対象外 secret を返す設計、export 後に Core 原本の ownership が移る設計は、現行 Architecture と両立しない。password authorization と user intent confirmation は別 property として一意である。
- 必要な最小修正または確認: 前回の完了条件である export 対象、明示要求、UI 確認、Core authorization、非 UI・非推測・非暗黙、対象外非返却、失敗時不変、原本と外部コピーの責任分離を確認した。
- 完了条件または再確認方法: §4.3、§5.1、§6.4 を Requirements UC-011、SEC-021、AC-041〜AC-043 と突合し、Mnemonic と Software Key の双方に同じ境界が適用されることを確認した。

### DR-005 — Signing authority と利用者の明示承認の分離

- Severity: `Critical`
- Status: `Resolved`
- 対象箇所: [`architecture.md:43-52`](../../design/architecture.md#L43)、[`architecture.md:102-110`](../../design/architecture.md#L102)、[`architecture.md:139-150`](../../design/architecture.md#L139)、[`architecture.md:256-275`](../../design/architecture.md#L256)
- 発生時の事実: 前回は Core が payload の signing primitive を担い、Transaction の意味解釈・承認 UI を担わないことはあったが、Application / UI の payload 提示、利用者の明示承認、approved-only request の責任が不足していた。
- 今回確認した事実: §6.3 は `Profile password authorization` と利用者の署名承認を別の security property とする。Application / UI は Account 選択、signing payload / Transaction 内容の提示、利用者が確認可能な状態の提供、明示的署名承認の取得、承認済み request だけの Core 送信を担う。Core は operation 単位の Profile password authorization、指定 Account / Software Key と Chain / Network compatibility の確認、対応秘密鍵の利用、signing primitive、署名結果返却を担う。Core は Transaction の意味説明・解釈、確認 UI、利用者意思の推測、Transaction 構築を担わない。正しい password だけでは利用者の承認にならない。
- 既存の根拠: Requirements UC-006、FR-009、SEC-022、AC-009 が Account 選択、内容提示、利用者の明示承認、approved-only request、Core の password authorization / key use / signing および両 property の分離を定める。
- 問題と影響の再確認: Application が表示・承認なしに password と payload を送る設計、または password authorization を user approval とみなす設計は、現行 Architecture と両立しない。具体的な UI、payload field、署名対象 byte 列は下流へ適切に委譲されている。
- 必要な最小修正または確認: 前回の完了条件である Account 選択、内容提示、明示承認、approved-only request、Core authorization、key use、primitive、結果返却および非担当範囲の分離が明示されていることを確認した。
- 完了条件または再確認方法: §2.2、§3.2、§4.3、§6.3 を Requirements UC-006 / SEC-022 / AC-009 と突合し、`password authorization != user signing approval` の invariant を再確認した。

### DR-006 — v1 Store / Profile version migration 非提供

- Severity: `Critical`
- Status: `Resolved`
- 対象箇所: [`architecture.md:11-20`](../../design/architecture.md#L11)、[`architecture.md:118-131`](../../design/architecture.md#L118)、[`architecture.md:195-209`](../../design/architecture.md#L195)、[`architecture.md:323-330`](../../design/architecture.md#L323)、[`architecture.md:350-356`](../../design/architecture.md#L350)
- 発生時の事実: 前回は Store version、unknown data、migration の責任を下流へ委譲する表現が先行し、v1 の migration 非提供、Core の version reject、Application の opaque boundary および既存状態不変が Architecture の product-level invariant として不在だった。
- 今回確認した事実: §1 は Store / Profile version migration を v1 が提供しないと明記する。§5.2 は Core の version 識別、v1 が明示的に対応する version のみ処理、unsupported / unknown / corrupt / inconsistent data の reject、推測・fallback・黙った解釈 / 無視・implicit migration の禁止、unknown data の意味推測禁止、安全に保持できない場合の reject、Application の opaque 保持・独自編集禁止、reject 時の existing committed state 不変を定義する。§5.2 は端末間の opaque Store 転送と schema / version migration を区別し、将来 migration を将来 version の Requirements → Design → Specification で再設計するとしている。§9.3 と §10 はこの invariant と下流委譲の境界を再確認する。
- 既存の根拠: Requirements §2.5、DR-009、AC-018、AC-045、§10、SEC-004、SEC-018 が v1 migration 非提供、対応 version 限定、unsupported / unknown / corrupt / inconsistent data reject、Application opaque、fallback / guessed interpretation / implicit migration 禁止、既存状態不変および将来 version での再設計を定める。
- 問題と影響の再確認: Application が Store を独自編集・読み替えする設計、Core が unsupported version を別 version と解釈する設計、unknown data を意味推測で利用する設計、端末間転送を migration と混同する設計は、現行 Architecture から排除されている。具体 version number、wire schema、unknown field representation、migration algorithm は下流事項として残っている。
- 必要な最小修正または確認: 前回の完了条件である v1 migration 非提供、Core の識別・対応限定・reject、opaque Application、fallback 禁止、reject 時 state 不変、将来 version での再設計および端末転送との区別を確認した。
- 完了条件または再確認方法: §5.2、§5.3、§8、§9.3、§10 を Requirements DR-009 / AC-018 / AC-045 と突合し、v1 の product decision と下流の具体方式を分離して再確認した。

### DR-007 — Account と Chain / Network compatibility responsibility

- Severity: `Critical`
- Status: `Resolved`
- 対象箇所: [`architecture.md:43-52`](../../design/architecture.md#L43)、[`architecture.md:118-129`](../../design/architecture.md#L118)、[`architecture.md:171-179`](../../design/architecture.md#L171)、[`architecture.md:242-254`](../../design/architecture.md#L242)、[`architecture.md:311-321`](../../design/architecture.md#L311)
- 発生時の事実: 前回は Chain / Network の差異を Core に置く大枠はあったが、Account のモデル、Software Key / Profile Network との compatibility、Core reject、Binding non-authority、reject 時の状態・secret 保護が不足していた。
- 今回確認した事実: §2.2、§5.1、§7 は Profile = Network 固定・Chain 非固定、Software Key = Chain 固定、Account = Software Key を固定 Chain と Profile 固定 Network 上で利用する概念と定義する。Application は Account の選択・提示を担い、Core は supported Chain / Network、Profile fixed Network と requested Network、Software Key fixed Chain と requested Chain、Account / Software Key / Chain / Network の整合を検証する。unsupported / mismatch / 不正な組合せは Core が fail-closed に reject し、Profile、Software Key、existing committed Store、secret を変更・返却せず、fallback / implicit conversion をせず、Binding は意味判定を代替・補正しない。Derived / Imported / Generated の由来に依存しない共通 lifecycle も §5.1 と §6.2 にある。
- 既存の根拠: Requirements §2.1、UC-009、FR-013、FR-024、DR-005、AC-013、AC-019、AC-020、AC-047 が同じ Profile / Software Key / Account モデルと全経路の fail-closed reject を定める。
- 問題と影響の再確認: Application / Binding が unsupported 値を別値へ fallback したり、Profile Network または Software Key Chain mismatch を補正したり、wrong Account / key で署名したりする architecture は現行本文と両立しない。具体 identifier、byte representation、derivation path、protocol contract は下流へ委譲されている。
- 必要な最小修正または確認: 前回の完了条件であるモデル、Application selection、Core validation / reject、Binding non-authority、reject 時 state 不変・secret 非返却・fallback / conversion 禁止を確認した。
- 完了条件または再確認方法: §2.2、§5.1、§6.2、§7 を Requirements DR-005 / FR-013 / FR-024 / AC-047 と突合し、Derived / Imported / Generated の全経路に責任境界が適用されることを再確認した。

### DR-008 — Application-held unlock session と処理単位 authentication

- Severity: `Critical`
- Status: `Resolved`
- 対象箇所: [`architecture.md:90-114`](../../design/architecture.md#L90)、[`architecture.md:118-137`](../../design/architecture.md#L118)、[`architecture.md:242-254`](../../design/architecture.md#L242)、[`architecture.md:294-309`](../../design/architecture.md#L294)
- 発生時の事実: 前回は Core の継続 Unlocked state 非提供と per-operation password authorization はあったが、Binding / Application の unlock session、authorization cache、前操作の認証結果持越し、restart 後の継続禁止が一意でなかった。
- 今回確認した事実: §6.5 は signing、derivation、Imported Software Key 登録、Generated Software Key 登録、Profile password 変更、Mnemonic / Software Key private key 個別 export、Software Key 削除、Profile 削除に共通して Core の operation 単位 Profile password authorization を適用する。authorization は当該 operation のみに有効で、Core に継続 Unlocked state がなく、Binding は unlock session / authorization cache を作らず、Application は代替 unlock session を保持せず、以前の認証結果を次回 authorization に利用できず、restart 後に unlocked / authorized state を継続しない。§3.2、§4.2、§6.2 も同じ境界を確認し、retry は新しい入力と再 authorization から開始するとしている。
- 既存の根拠: Requirements §2.3、UC-005、FR-007、SEC-002、SEC-007、SEC-011、SEC-014、AC-007、AC-027、AC-031 が全 secret-capable operation の処理単位認証、session / cache / carry-over / restart 継続禁止を定める。
- 問題と影響の再確認: Core が session を持たない場合でも Application-held token / session で後続 operation を authorization する実装余地は現行本文から排除されている。password quality policy や password の一時保持は上位責任として扱われ、Core の authorization boundary と混同されていない。
- 必要な最小修正または確認: 前回の完了条件である全 operation への共通適用、Core / Binding / Application の session・cache 非提供、previous authentication result 非再利用、restart 後の非継続および retry の再入力・再認証を確認した。
- 完了条件または再確認方法: §3.2、§4.2、§6.2、§6.5 を Requirements FR-007 / UC-005 / SEC-014 / AC-007 と突合し、列挙された signing、derivation、registration、password change、export、削除へ共通に適用されることを再確認した。

### DR-009 — pending / partial state と failure・retry・restart の責任

- Severity: `Critical`
- Status: `Resolved`
- 対象箇所: [`architecture.md:169-221`](../../design/architecture.md#L169)、[`architecture.md:223-254`](../../design/architecture.md#L223)、[`architecture.md:294-309`](../../design/architecture.md#L294)、[`architecture.md:358-364`](../../design/architecture.md#L358)
- 発生時の事実: 前回は旧 Store 維持と一部 mutation の fail-closed はあったが、pending / partial state の security meaning、Core ownership、handoff 中断、stale state、retry 再入力・再認証、restart 後の authorization / committed state の責任が不足していた。
- 今回確認した事実: §5.3 は Core が Profile / Software Key の成功状態を最終確定するまで pending / partial を正常な committed state としないこと、pending / partial の security responsibility・成功昇格条件・stale state の拒否意味を Core が所有すること、Application は未確定状態を committed と扱わず、Binding は意味・authorization policy を変更せず、stale / unconfirmed state を自動昇格させず、failure / interruption / restart で secret ownership、Profile isolation、authorization boundary を変更せず、一時 secret を通常利用可能状態・cache・診断として残さないことを定義する。§6.1 は handoff 中断・確認未成立・最終確定失敗を、§6.2 は認証、入力、Store、Chain / Network、導出・生成・検証・削除・保存の失敗を、既存 committed state 不変・secret 非返却・部分適用非成功とする。§6.5 は retry で Store、処理入力、利用者確認、Profile password authorization を改めて提供し、前回の認証結果、pending state、secret を次の operation authorization に再利用しないこと、restart 後に authorization state を継続しないことを定める。§5.2、§6.2 は Application の replacement Store 保存失敗時に old committed Store を正本とし、未保存 replacement を committed としない責任を定義する。
- 既存の根拠: Requirements AC-001、AC-034、AC-037〜AC-039、AC-046、SEC-004、SEC-005、SEC-018〜SEC-019、§10 が pending / partial、失敗・中断・retry・restart、Store replacement、既存状態不変、secret 非残留、Profile isolation および no stale promotion を要求する。
- 問題と影響の再確認: pending を Application が committed とみなす設計、stale confirmation を再利用する設計、failure 後に old Store を置換する設計、retry で password / input / confirmation を省略する設計、restart 後に authorization を引き継ぐ設計は現行 Architecture と両立しない。PendingProfile 型、保存場所、wire representation、timeout、expiry、retry count、rollback algorithm は下流へ適切に委譲されている。
- 必要な最小修正または確認: 前回の完了条件である pending ownership、成功昇格条件、failure / interruption / restart の既存 state 保護、stale state 非採用、retry 再入力・再認証、temporary secret 非残留、Store persistence failure の old state 正本を確認した。DR-003 の正常 handoff success boundary とは別に、DR-009 の failure / interruption / retry / restart security responsibility が成立している。
- 完了条件または再確認方法: §5.2〜§5.3、§6.1〜§6.2、§6.5、§9.4 を Requirements §10、AC-001、AC-034、AC-037〜AC-039、AC-046 と突合し、Profile creation、restore、registration、signing、password change、export、deletion、Store rejection に共通の failure model を再確認した。

## Upstream Feedback

なし。Concept review 009 は `CONCEPT READY`、Requirements review 008 は `REQUIREMENTS READY` であり、Requirements の product-level / security-level 未解決事項は確認されない。DR-001〜DR-009 の不足は、Requirements が定めた内容を Architecture の responsibility / ownership / trust boundary / lifecycle / invariant に配置していなかった Design 側の問題であり、Requirements への新しい feedback を必要としない。

## Deferred Findings

正式 finding はなし。次の事項は、現行 Architecture が責務、境界、成功・失敗条件および security invariant を確定した後に下流へ委譲される事項であり、今回の Design finding ではない。

- Handoff の API、callback / ACK、buffer、transport、PendingProfile 型、state machine、具体的な pending 保存表現。
- Explicit export と signing approval の具体 UI、API / ABI、DTO、error、表示形式および受渡し方式。
- Store / Profile の version field、unknown data 表現、wire encoding、schema、canonical encoding、crypto format、migration algorithm、具体的 rollback / file operation。
- KDF、AEAD、salt、nonce、tag、key length、署名対象 byte 列、HD derivation path、network byte、chain identifier。
- Rust の型、memory lifetime、clone / copy、zeroize、unsafe、FFI pointer safety、parser / fuzz、unit test および fixture 実装。
- timeout、expiry、retry count、resource limit の具体値、公開 error code、Binding の pointer / buffer / free 契約。
- 対象 OS / Browser、package layout、build、distribution、保存先 API および UI の具体的な方式。
- `docs/design/security.md`、`docs/design/bindings.md` の独立レビューと、Specification / Implementation / Test の適合性。

下流成果物がこれらの具体方式を持つこと自体は、Architecture の不足を解消した根拠とはしない。下流は、Architecture が確定した success boundary、per-operation authorization、全環境共通の秘密情報非開示、Account / Chain / Network compatibility、v1 reject policy、existing state preservation および Binding non-authority を維持する必要がある。

## Scope and Traceability

### Requirements → Architecture Traceability

| Requirements の要求 | Architecture の配置 | 判定 |
| --- | --- | --- |
| Core continuous secret management / normal-output non-disclosure | §3.1、§3.2、§4.1、§5.1、§6.1、§6.4、§8 | Concept §7〜§10、Requirements §2.2〜§2.4、SEC-010、SEC-015、SEC-017、SEC-020 に追跡可能。通常処理の非開示と初回 handoff / explicit export の限定例外を分離している。 |
| host compromise responsibility | §3、§3.1、§4.4、§8、§9.1 | Browser / OS / host process / Application の compromise 防止は Core の保証外で、Core / Binding の不要な secret 非開示責任は維持する。 |
| processing-unit authentication | §3.2、§4.2、§6.2、§6.5 | Core が operation ごとに Profile password を認証し、session・cache・previous result carry-over・restart 継続を禁止する。 |
| initial Mnemonic handoff | §4.3、§5.3、§6.1、§9.2 | Core 生成 → 意図された Application → 利用者提示 → 明示受領 → Application 確認伝達 → Core 最終確定の6段階と失敗時非成功・非開示が追跡可能。 |
| explicit secret export | §3.1、§4.3、§5.1、§6.4、§9.2 | 対象指定、利用者要求、Application / UI 確認、Core authorization、対象外非返却、原本と外部コピーの責任を分離する。 |
| signing approval | §2.2、§3.2、§4.3、§6.3、§9.2 | Application / UI の Account 選択・内容提示・明示承認・approved-only request と、Core の password authorization・key use・signing primitive を分離する。 |
| Store / version / no migration | §1、§4.1、§4.3、§5.2、§8、§9.3、§10 | v1 migration 非提供、Core の version 識別・対応限定・reject、Application opaque、fallback / implicit migration 禁止、existing state preservation、terminal transfer との区別がある。 |
| Account / Chain / Network | §2.2、§5.1、§6.2、§7、§9.1 | Profile = Network 固定・Chain 非固定、Software Key = Chain 固定、Account の固定 Chain + Profile Network 利用、Core compatibility reject、Binding non-authority が追跡可能。 |
| atomic / fail-closed | §4.1、§5.2〜§5.3、§6.1〜§6.2、§9.4 | 成功時だけ全体結果を committed とし、失敗・中断・保存失敗で既存 committed state、秘密情報および部分状態を保護する。 |
| Profile isolation | §4.1、§5.3、§6.2、§7、§9.4 | 操作は対象 Profile のみに作用し、他 Profile の secret、authorization、利用可否および削除結果へ越境しない。 |
| Binding non-authority | §3.1〜§3.3、§4.2、§4.5、§7、§8 | Binding は transport / type / ownership / error の橋渡しに限定し、crypto、validation、authorization、Chain / Network policy、Store / pending の意味を代替しない。 |

### System Context / Dependency Direction

§3 は利用者、Desktop Application、Mobile Application、Web Application、Browser Extension、Native Binding、Web WASM Binding、Rust Core、Browser、OS、host process、persistent storage、Transaction layer、Network layer を明示する。§4.5 は component dependency を `Application / UI → Native Binding または Web WASM Binding → Rust Wallet Core` と定める。Transaction layer は payload / 内容を Application / UI へ、Core は署名結果を Application / Transaction layer へ返すデータフローとして配置されるが、Application、Binding、Transaction layer、Network layer が Core の secret lifecycle、authorization、signing authority、Store validity を代替する依存方向にはしていない。Core は UI、Browser API、OS policy、host-specific policy に依存しない。

### Phase Boundary

Architecture が決める範囲は、責務、ownership、trust boundary、dependency direction、主要 lifecycle、success boundary、failure responsibility、authorization boundary、security invariant および下流委譲である。現行本文はこれらを決めたうえで、API、ABI、DTO、error、wire / schema、crypto contract、exact validation、parser、memory handling、zeroization、unsafe、具体 UI、test implementation を §10 で下流へ委譲している。v1 migration 非提供、pending の security meaning、explicit export / signing / handoff の actor responsibility は下流詳細へ流出させていない。

### Specification Handoff

§8 と §10 は、handoff、explicit export、signing approval、Store reject、処理単位 authentication、atomicity、retry / restart、fail-closed の外部可視条件を下流へ引き渡す一方、Core が所有する success boundary、per-operation authorization、全環境共通の秘密情報非開示、Account / Chain / Network compatibility、v1 reject policy、existing state preservation および Binding non-authority を下流が変更できない invariant としている。Specification は API、validation、error、crypto、protocol、wire / format の下流正本であり、Architecture の security architecture を推測して補完する必要はない。

## Domain Checks

### Protected Assets / Secret Ownership

合格。§5.1 は次の protected assets を列挙し、それぞれの継続 responsibility、通常処理での公開範囲、temporary handling および failure 時の境界を配置している。

| Protected asset | Architecture 上の継続 responsibility / 境界 | 判定 |
| --- | --- | --- |
| Mnemonic | Core が root secret として生成・保持・利用・破棄。通常結果には含めず、初回 handoff / 条件を満たす個別 export のみ例外。handoff 後の外部コピーは Application / 利用者。 | 合格 |
| Software Key private key | Core が Chain 固定の鍵として保持・利用・破棄。通常の Application / Binding 結果には含めない。 | 合格 |
| derived / decrypted secret material | Core が必要な処理中だけ responsibility を持ち、通常結果・診断・pending 正常状態へ返さない。 | 合格 |
| Profile password | Core が継続保存・cache せず、operation 単位 authorization にだけ使用。Application の一時取扱いは Core authorization を代替しない。 | 合格 |
| temporary secret | 必要な処理範囲に限定し、成功・失敗・中断・再起動後に通常利用可能状態、pending、cache、診断として残さない。 | 合格 |
| Core 管理下 Store | Core が論理状態・validity・secret protection を管理し、Application は opaque blob の保存先・置換を担う。 | 合格 |
| signing authority | Core が指定 Account / Software Key に対応する秘密鍵を使う能力を管理し、Application の Account 選択・利用者承認と分離する。 | 合格 |

memory representation、copy、保持期間、破棄方式、zeroize の実装詳細は下流へ委譲されているが、ownership、通常非開示、明示的アクセス、失敗時非残留 invariant は確定している。

### Trust Boundary

合格。Core / Native Binding / Web WASM Binding / Application / UI / Browser / OS / host process / persistent storage / Transaction layer / Network layer の責任が §3〜§4 にある。Application は利用者の表示・確認・承認、Account 選択、opaque Store 保存および外部連携を担い、Binding は transport、type、ownership、error の橋渡しに限定される。Browser / OS / host process の compromise 防止は Core の保証外だが、通常処理の非開示・authorization boundary・Binding non-authority は Native / Web を問わず維持される。persistent storage は opaque Store の保存先、Transaction layer は構築・内容・serialize、Network layer は通信の責任である。

### Authentication / Authorization

合格。§6.5 が全 secret-capable operation（signing、derivation、Imported / Generated 登録、password change、export、Software Key deletion、Profile deletion）に Core の operation 単位 Profile password authorization を適用する。authorization はその operation だけに有効で、Core に継続 Unlocked state はなく、Binding / Application は unlock session / authorization cache を持たず、previous result を次回へ持ち越さず、restart 後にも継続しない。export の user intent と signing approval は password authorization とは別 property であり、Application / UI が確認責任、Core が認証・実行責任を持つ。

### Signing Authority

合格。Application / UI が Account を選択し、payload / Transaction 内容を提示し、利用者が確認できる状態を提供し、明示承認済み request だけを Core へ送る。Core が Profile password authorization、Account / Software Key / Chain / Network compatibility、秘密鍵利用、signing primitive、署名結果を担う。Core は Transaction の意味説明・解釈、confirmation UI、利用者意思の推測、Transaction 構築を担わない。`password authorization != user signing approval` が Architecture の明示的 invariant である。

### Initial Mnemonic Handoff

合格。§6.1 の6段階が正常成功境界であり、Core の完全な生成、意図された Application への受渡し、Application の意図した利用者への提示、利用者の明示的受領確認、Application の Core への確認伝達、Core の Profile 成功確定が全て必要である。生成、temporary hold、Binding 通過、Application 受領、Core 呼出しだけでは成功しない。Core は紙・外部媒体の記録を独立検証せず、Application が得た利用者確認を Core へ伝えることを trust boundary とする。未確認・拒否・中断・最終確定失敗では Profile / partial state を成功状態にせず、Mnemonic を通常・失敗・診断結果へ漏らさない。

### Explicit Secret Export

合格。§6.4 は Mnemonic / Software Key private key の個別 export を通常処理から分離する。対象指定、利用者の秘密情報取得要求、Application / UI の意思確認、確認済み request の送信、Core による対象解決と operation 単位 password authorization、要求対象だけの返却が別々に配置される。Core は UI を持たず、意思を推測せず、通常処理から暗黙遷移せず、対象外 secret を返さない。失敗時は secret と Profile / Store を変更せず、成功後の Core 原本は Core、外部コピーは Application / 利用者が責任を持つ。

### Store / Version / Migration

合格。§5.2 と §9.3 が v1 は Store / Profile version migration を提供しないと明示する。Core が version を識別し、対応 version のみを処理し、unsupported / unknown / corrupt / inconsistent data を reject する。推測、fallback、黙った解釈・無視、implicit migration を行わず、unknown data は意味を推測せず安全に保持できない場合 reject する。Application は Store を opaque として保存・転送し、内部編集・v1 としての読み替えをしない。reject / failure 時は existing committed state を不変にし、端末間 transfer と schema / version migration を区別する。将来 migration は将来 version の Requirements → Design → Specification で再設計する。

### Account / Chain / Network

合格。Profile は Mainnet / Testnet の Network を固定し Chain は固定しない。Software Key は Symbol / NEM の Chain を固定し、Account はその固定 Chain と Profile Network 上の利用単位である。Application は選択・提示、Core は supported set、Profile Network / requested Network、Software Key Chain / requested Chain、Account / Software Key / Chain / Network compatibility の検証・reject を担う。Binding は意味判定を代替・補正せず、reject 時は state / secret を変更・返却せず fallback / implicit conversion をしない。

### Pending / Failure / Retry / Restart

合格。pending / partial は Core が security meaning、成功昇格条件、stale 拒否意味を所有し、Application は committed と扱わず、Binding は意味や authorization を変えず、自動昇格を行わない。failure / interruption は existing committed state、secret ownership、Profile isolation、authorization boundary を維持し、temporary secret を通常状態・cache・診断に残さない。retry は Store、処理入力、利用者確認、Profile password authorization を再提供して新規 operation とし、前回 result、pending、secret を authorization に使わない。restart 後に unlocked / authorized state を引き継がない。Application の replacement Store 保存失敗時は old committed Store が正本で、未保存 replacement は committed ではない。

### Binding Responsibility

合格。Native / Web WASM Binding は type、raw / opaque data、error、ownership、lifecycle の橋渡しだけを行い、暗号化、認証、Mnemonic validation、導出、署名、重複判定、Chain / Network meaning、Store / pending meaning、Transaction meaning を複製しない。Binding の経路差は Core の secret exposure、authorization、failure policy、ownership を変更しない。Native 経路を Web より弱くしないことも §3.1、§4.2、§4.5、§8 にある。

## Validation Results

- 実施: `AGENTS.md`、Design Reviewer Skill 一式、共通 reviewer policy、Concept 本文、Concept review 009、Requirements 本文、Requirements review 008、現行 Architecture、architecture-review-001 および関連 Design の確認。
- 実施: Reviewer A〜D の独立自己レビュー、Chair による候補の根拠・影響・フェーズ境界・重複の反証と統合、DR-001〜DR-009 の完了条件再確認、新規 finding 候補の確認。
- 実施: 現行 Architecture の見出し・相対リンク先・Concept / Requirements / Design / Specification 参照先の存在確認。Specification 本文の内容は Architecture の normative source にせず、今回の判定に不要なため読んでいない。
- 実施: 本書作成後に Markdown 構造、共通章の順序、finding ID 重複、DR-001〜DR-009 の status、相対リンク、変更範囲および `git diff --check` を検証した。
- 未実施: Rust formatter、clippy、cargo test、WASM check。変更対象はレビュー成果物のみで、コード、Binding、Specification、Test を変更していないため対象外。
- 未確認: Specification / Implementation / Test / fixture の適合性、外部 Node、実 Application / UI、実際の handoff / export / signing approval、暗号方式、wire format および具体 memory / FFI 契約。これらは今回の Architecture 判定の正本根拠ではない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | §1 が v1 の対象、対象外、migration 非提供、端末間 transfer と schema migration の区別および次工程への境界を示す。 | なし |
| 2. コンテキストと責任 | 合格 | §3〜§4 が全主体、trust boundary、Core / Binding / Application / storage / Transaction / Network の責任を示し、全環境共通の非開示責任を定める。 | DR-002（解消確認） |
| 3. 依存方向 | 合格 | §2.1 が Concept → Requirements → Architecture → Specification → Implementation を示し、§4.5 が Application / UI → Binding → Core を示す。 | DR-001（解消確認） |
| 4. 主要フロー | 合格 | §6.1〜§6.5 が handoff、mutation、signing、export、authentication、failure、retry、restart の成功・失敗責任を示す。 | DR-003、DR-009（解消確認） |
| 5. データ所有 | 合格 | §5.1〜§5.3 が protected asset、Core 原本、外部コピー、opaque Store、pending / partial、replacement、existing state preservation を示す。 | DR-004、DR-006、DR-009（解消確認） |
| 6. Security と相互運用性 | 合格 | §3.1、§5.1、§6.3〜§6.5、§7 が非開示、authorization、signing authority、Chain / Network separation、fail-closed、Binding non-authority を定める。 | DR-002、DR-004、DR-005、DR-006、DR-007、DR-008、DR-009（解消確認） |
| 7. 上流整合性 | 合格 | Concept §7〜§10 と Requirements の handoff、explicit access、signing、migration、Chain / Network、atomicity、failure、Binding 要求へ追跡でき、Requirements gap はない。 | DR-003〜DR-009（解消確認） |
| 8. 下流実装可能性 | 合格 | §10 が責務・境界・invariant を固定したうえで API、wire、crypto、parser、memory、UI、test 等を委譲し、Specification が security architecture を推測する必要がない。 | DR-001〜DR-009（解消確認） |

Formal Gate: `READY`。現行の Critical は 0 件であり、Major / Minor の New / Open / Reopened も 0 件である。

## Remaining Risks and Open Decisions

- Architecture-level Open Decision: なし。Requirements が確定した product-level / security-level の責務、境界、成功・失敗条件、authorization および migration policy は Architecture に配置済みである。
- 残存する下流リスク: Specification / Implementation / Test が、handoff、explicit export、signing approval、Store reject、per-operation authentication、atomicity、retry / restart、fail-closed の外部可視条件と、Architecture の不変条件を正しく契約・実装・検証する必要がある。
- 端末間 opaque Store transfer は v1 Store / Profile version migration ではない。Application が transfer を担っても Store 内部を編集・読み替えできない境界を維持する必要がある。
- Browser、OS、host process、Application の compromise 防止は Core の保証外である。この限界は、通常処理の秘密情報非開示、Core authorization、Binding non-authority を弱める根拠にならない。
- `security.md` review: Architecture の未解消 Major / security architecture blocker はないため、次レビューへ進める状態である。ただし `security.md` の独立した責務・secret lifecycle・constant-time・Native / WASM 境界の適合性は、そのレビューで判定する。

## Automatic Changes

レビュー中に Concept、Requirements、Architecture、`security.md`、`bindings.md`、Specification、Implementation、Test、README、Skill 本体または過去レビュー成果物は変更していない。本レビュー成果物 `docs/reviews/design/architecture-review-002.md` のみを新規作成した。

## Final Decision

`READY`

DR-001〜DR-009 はすべて `Resolved`、新規 finding はなく、現行の Critical / Major / Minor は 0 / 0 / 0 件である。Requirements の Core continuous secret management、normal-output non-disclosure、host compromise responsibility、processing-unit authentication、initial Mnemonic handoff、explicit secret export、signing approval、Store / version / no migration、Account / Chain / Network、atomic / fail-closed、Profile isolation、Binding non-authority が Architecture の responsibility、trust boundary、ownership、lifecycle および downstream invariant へ追跡できる。Specification / Implementation に委譲すべき API、wire、crypto、memory、UI、test の詳細も過剰に固定していない。

Architecture レベルの Open Decision はないため、次の `security.md` review へ進める状態である。

**ARCHITECTURE READY**
