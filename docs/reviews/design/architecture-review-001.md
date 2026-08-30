# Design Review Findings: Architecture

## Review Target

- 対象: [`docs/design/architecture.md`](../../design/architecture.md)
- 確認日: 2026-08-30
- 成果物: `docs/reviews/design/architecture-review-001.md`
- Review Scope: Architecture 本文の目的・対象・対象外、Concept / Requirements からの追跡、システムコンテキスト、component responsibility、dependency direction、protected assets、secret ownership、trust boundary、authentication / authorization、signing authority、初回 Mnemonic handoff、explicit secret export、Store ownership / version / migration、Chain / Network / Account 境界、failure / atomicity / retry / restart、Native / WASM Binding 責任、Specification への委譲および設計フェーズ境界。
- 未確認範囲: `security.md` および `bindings.md` の設計本文は関連設計との整合確認に限り参照し、レビュー対象には含めていない。Specification、Implementation、Test、fixture、実際の Application / UI、外部 Node、具体 API / ABI、DTO、wire format、暗号方式・パラメータ、memory lifetime、zeroize 実装および個別テストの適合性は判定していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。各パスの結果を Chair として反証・統合した。
- Phase 0（対象・根拠・境界）: 完了。対象を `docs/design/architecture.md` 1件、出力先を `docs/reviews/design/architecture-review-001.md`、上流を Concept / Requirements、関連設計を補助資料として確定した。`docs/reviews/design/` に既存成果物がないことも確認した。
- Reviewer A（構造と責務）: 完了。目的・範囲、component responsibility、Core / Binding / Application の依存方向、Store ownership、Profile / Software Key / Account の境界、設計本文の内部整合を確認した。
- Reviewer B（Security primary）: 完了。Mnemonic、Software Key private key、derived secret、Profile password、Store、temporary secret、signing authority を対象に、secret ownership、trust boundary、認証・認可、署名承認、handoff、export、failure safety、Chain / Network separation、Binding 境界を確認した。
- Reviewer C（フローと運用）: 完了。Profile 作成・復元、handoff、derivation、import / generation、signing、password change、export、削除、Store rejection、retry、restart および pending / partial state の責任を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept → Requirements → Design → Specification の依存方向、Requirements の各 security property の Architecture への引継ぎ、下流が security architecture を推測せずに済むか、未決定事項の委譲範囲を確認した。
- Phase 1（独立レビュー）: 完了。A〜D の観点ごとに候補を記録した。
- Phase 2（反証・統合）: 完了。上流根拠、対象箇所、影響、Design で決めるべき事項か、Specification / Implementation だけでは安全に補完できないかを再確認し、重複する handoff と failure の論点を分離して統合した。
- Phase 3（ゲート・成果物）: 本文作成後に、formal Gate、finding ID、Markdown 構造、相対リンク、変更範囲および Git 差分を検証する。

## Evidence Used

### Review Basis

| 種別 | 参照資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、フェーズ境界、Scope Discipline、秘密情報保護、Validation、変更範囲および Git 運用を確認 |
| Design Reviewer Skill | [`SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/design-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/design-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/design-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/design-review/output-format.md) | Reviewer A〜D、Security primary、finding 採用条件、設計フェーズ境界、重大度、formal Gate および成果物構成を確認 |
| 共通 reviewer policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、finding と Upstream Feedback / Deferred Findings の分離、検証および成果物構成を確認 |
| 対象 Design | [`architecture.md`](../../design/architecture.md) §1〜§11 | 現行 Architecture の外部可視な責任、境界、所有、lifecycle、設計判断および下流委譲を主根拠として独立評価 |
| 上流 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1〜§13 | 製品目的、v1 境界、Core 継続管理、通常処理での秘密情報非開示、環境差異によらない原則を確認 |
| Concept review | [`concept-sheet-review-009.md`](../concept/concept-sheet-review-009.md) | `READY` / `CONCEPT READY`、Concept 側に未解決 Critical がないこと、および上流の最終判定を確認。Architecture の正否の代替根拠にはしていない |
| 上流 Requirements | [`requirements.md`](../../requirements/requirements.md) §1〜§13 | Architecture が配置すべき Profile、ownership、handoff、処理単位認証、explicit export、signing approval、Store migration、Chain / Network、atomicity および Binding 要求の主根拠 |
| Requirements review | [`requirements-review-008.md`](../requirements/requirements-review-008.md) | `READY` / `REQUIREMENTS READY`、RR-001〜RR-029 が全件 Resolved であることを確認。Requirements 本文の代替にはしていない |
| 関連 Design | [`security.md`](../../design/security.md)、[`bindings.md`](../../design/bindings.md) | 同一 Design フェーズの関連設計との責任・境界の整合を補助確認。Architecture の不足を埋める normative source としては扱っていない |

### Upstream Source of Truth

Architecture の上流 Source of Truth は [`concept-sheet.md`](../../consept/concept-sheet.md) と [`requirements.md`](../../requirements/requirements.md) である。最新レビュー判定は上流の確定状態を確認する履歴根拠として使用した。`specification.md` および `wallet-store-format-v1.md` は Architecture の下流であり、既存成果物との回帰・委譲境界の確認対象に留めた。Architecture §2.1 が Specification を「上流根拠」に列挙し、§11 でもその参照を上流・下流の区別なく配置している点は、DR-001 として評価した。

## Review Result

`REVISE DESIGN`

## Summary

Architecture は、単一 Rust Core、Core 管理下の Profile / Mnemonic / Software Key、処理単位の Profile password 認証、Application が Store の保存先と atomic replacement を担う責任、Binding を薄い境界層とする依存方向、および主要 mutation の replacement / fail-closed 方針を概ね示している。

しかし、Requirements で確定した security architecture を下流へ一意に渡すために必要な責任境界が不足している。特に、Desktop / Mobile / Native / OS / host process の trust boundary、初回 Mnemonic handoff の成功境界と actor 責任、explicit export の intent / authorization boundary、password authentication と signing approval の分離、Application-held unlock session の禁止、v1 Store / Profile version migration 非提供、Account と Chain / Network の対応および pending / restart の failure responsibility が本文から一意に確定できない。

これらは API、wire format、暗号方式、UI の具体設計を要求する指摘ではない。Requirements の security property を、誰が所有し、どの境界を越え、失敗時に誰が状態を保護するかという Design 責任へ配置する不足であり、Specification だけで安全に補完できない。Critical 8件のため、formal Gate は `REVISE DESIGN` とする。DR-001 の Major も、次の `security.md` review 前に Architecture の Source of Truth 表現を修正すべきである。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| DR-001 | Major | New | architecture-review-001 | §2.1 が Specification / wire format を Architecture の「上流根拠」として列挙し、Design → Specification の委譲方向と混在させている。 |
| DR-002 | Critical | New | architecture-review-001 | §3.1〜§3.3 は Web runtime / Browser Storage に触れるが、Native / Desktop / Mobile / OS / host process の compromise 非保証と Core / Binding の非開示責任を全環境共通の境界として確定していない。 |
| DR-003 | Critical | New | architecture-review-001 | §3.1、§4.3、§5.3 は handoff と Profile 確定の分離を示すが、完全な Mnemonic、意図された Application、利用者提示、明示受領、確認伝達、Core 最終確定という成功境界と actor 責任を一意に定めていない。 |
| DR-004 | Critical | New | architecture-review-001 | §3.1、§4.3、§6.3 は password と「明示的 export」を示すだけで、対象指定、利用者の明示要求、UI / Application の意思確認、確認済み要求だけを送る責任および export 後の Core 原本責任を配置していない。 |
| DR-005 | Critical | New | architecture-review-001 | §3.3、§4.3〜§4.4 は Core を payload の signing primitive とし UI / 承認を除外するが、Application が内容を提示し利用者の明示承認を得て承認済み要求だけを送る責任を明記していない。 |
| DR-006 | Critical | New | architecture-review-001 | §5.2、§9、§10 は Store version / unknown field / migration を Specification に委譲し、v1 の migration 非提供、Core の version 識別・reject・既存状態不変を Architecture の product-level invariant として保持していない。 |
| DR-007 | Critical | New | architecture-review-001 | §2.2、§4.1、§7 は Chain / Network の差異を Core に置くが、Account = Software Key を対象 Chain + Profile Network で利用する関係、unsupported / mismatch の Core reject、fallback / implicit conversion 禁止を一意に配置していない。 |
| DR-008 | Critical | New | architecture-review-001 | §3.1、§6.1〜§6.2 は Core の unlocked state を禁止するが、Application が unlock session や認証結果を保持・持越ししないことを明記していない。処理単位 authentication が全境界の model として一意でない。 |
| DR-009 | Critical | New | architecture-review-001 | §5.3、§6.2 は failure 後の旧 Store 維持を示す一方、pending / partial state の owner、handoff 中断・再起動後の状態、stale pending の非成功扱い、retry / restart の再認証・再入力責任を Specification へ委譲している。 |

### Finding Summary

| Severity | New | Open / Reopened | Resolved | 合計 |
| --- | ---: | ---: | ---: | ---: |
| Critical | 8 | 0 | 0 | 8 |
| Major | 1 | 0 | 0 | 1 |
| Minor | 0 | 0 | 0 | 0 |

### Finding Detail

#### DR-001 — Specification を Architecture の上流根拠として扱う参照方向

- Severity: `Major`
- Status: `New`
- 対象箇所: [`architecture.md:21-30`](../../design/architecture.md#L21)、[`architecture.md:193-204`](../../design/architecture.md#L193)
- 発生条件または確認できた事実: §2.1 の「上流根拠」に Concept / Requirements と並べて `specification.md` および `wallet-store-format-v1.md` を記載し、「上記の要求・仕様を実装へ配置する」としている。§11 の traceability でも Profile、暗号・認可・Store、Binding の根拠欄に Specification を上流資料と同列で配置している。
- 既存の根拠: Concept → Requirements → Design → Specification → Implementation のフェーズ順は [`AGENTS.md`](../../../AGENTS.md) のフェーズ境界にある。Requirements は `requirements.md:11-19` で Concept を上位根拠とし、API、wire、暗号等を下流へ委譲している。`requirements-review-008.md:119-125` は Requirements → Design / Specification の委譲方向を確認している。
- 問題と影響: Design が Specification を上流の規範根拠として扱うと、Specification に先に書かれた API / state / wire の都合で責任、ownership、trust boundary を逆向きに決める余地が生じる。実際の component 依存方向 `Application → Binding → Core` とは別に、設計判断の normative dependency が逆転し、下流仕様が Architecture の security boundary を規定する構造になる。
- 必要な最小修正または確認: §2.1 と §11 の参照を、Concept / Requirements を Architecture の上流 Source of Truth、Specification を Architecture から下流へ引き渡す契約・既存成果物との回帰確認として明確に分離する。Specification の wire/API 正本であるという記述は残せるが、Architecture の上流根拠・Design 判断の根拠として扱わない。
- 完了条件または再確認方法: Architecture の参照表だけから `Concept → Requirements → Design → Specification` の方向を第三者が説明でき、Specification に存在することだけを理由に責任・境界を決める表現がないことを確認する。

#### DR-002 — Native / Desktop / Mobile / OS / host process の trust boundary 不足

- Severity: `Critical`
- Status: `New`
- 対象箇所: [`architecture.md:40-70`](../../design/architecture.md#L40)、[`architecture.md:85-95`](../../design/architecture.md#L85)、[`architecture.md:137-153`](../../design/architecture.md#L137)
- 発生条件または確認できた事実: システムコンテキストは Desktop / Mobile Application、Web Application / Browser Extension、Native / WASM Binding、Core、Storage、Transaction / Network 層を示す。§3.2 は Web execution environment、JavaScript state、Browser Storage を恒久的保護境界としないと記載するが、Desktop / Mobile の OS、host process、Native Application の compromise 非保証を対応する主体・境界として列挙していない。
- 既存の根拠: `requirements.md:48-62`、`requirements.md:80-92`、NFR-004、SEC-020、AC-024 / AC-040 は Desktop / Mobile / Native / Web Application / Browser / OS / host process の環境差を問わず、host compromise 防止は Core の保証外でありながら Core / Binding の不要な秘密情報非開示責任は共通と定める。Concept §7 の Security Invariant も実行環境差異によらない非開示と host compromise 保証限界を定める。
- 問題と影響: Native を介した Desktop / Mobile では OS / host process をどの trust boundary とみなすかが本文から確定せず、Application や Binding がホスト侵害を理由に秘密情報公開責任を弱める実装と、Web と同様に host compromise を保証外としつつ Core / Binding の非開示責任を維持する実装の双方が成立する。秘密情報の公開範囲と Core の保証限界が環境ごとに変わり得るため、全環境共通の security invariant を下流へ安全に渡せない。
- 必要な最小修正または確認: System Context に利用者、Desktop / Mobile Application、Web Application、Browser Extension、Browser、OS、host process、Native / WASM Binding、Core、Transaction layer、Network layer、persistent storage を責任主体・境界として配置する。OS / host process / Browser / Application の compromise を Core が防止しないことと、それを理由に Core / Binding の通常処理での秘密情報非開示責任を弱めないことを Native / Web 共通原則として記載する。具体的な OS 分離方式や ABI は決めない。
- 完了条件または再確認方法: Desktop、Mobile、Web の各経路について、どの境界が host compromise 防止の保証外で、どの主体が秘密情報を継続管理し、通常処理の非開示に誰が責任を持つかを Architecture だけから説明できる。

#### DR-003 — 初回 Mnemonic handoff の成功境界と actor 責任不足

- Severity: `Critical`
- Status: `New`
- 対象箇所: [`architecture.md:56-66`](../../design/architecture.md#L56)、[`architecture.md:89-95`](../../design/architecture.md#L89)、[`architecture.md:111-115`](../../design/architecture.md#L111)
- 発生条件または確認できた事実: §3.1 は初回 handoff を限定例外とし、§5.3 は Application の backup handoff と Core の Profile 確定を分離すると記載する。しかし、Core が完全な Mnemonic を生成して意図された Application へ渡すこと、Application が意図した利用者へ提示すること、利用者の明示的受領確認、Application から Core への確認伝達、Core がその確認に基づき Profile 作成を成功確定することを、順序と責任を伴う lifecycle として記載していない。
- 既存の根拠: `requirements.md:82-91`、UC-001、FR-001、AC-001 / AC-034、SEC-017 / SEC-018 は上記5段階を成功条件とし、生成・一時保持・Binding 受渡し・Application 呼出しだけでは成功としない。handoff の未確認・中断・最終確定失敗では新規 Profile または部分状態を成功扱いしない。
- 問題と影響: 「handoff と Profile 確定を分離する」だけでは、Application 呼出し時点、Binding 受渡し時点、利用者確認時点、Core の最終確定時点のどこを成功境界とするかを Specification が選べる。利用者確認なしに Profile を成功状態へする方式と、Core が UI / 人間の行動を直接検証しようとする方式の双方が残り、初回バックアップに関する secret exposure と Profile 成功状態の security architecture が一意にならない。
- 必要な最小修正または確認: Architecture に、(1) Core の完全な Mnemonic 生成、(2) 意図された Application への handoff、(3) Application による意図した利用者への提示、(4) 利用者の明示的受領確認、(5) Application による確認成立の Core への伝達、(6) Core による確認後の Profile 成功確定、という責任関係を記載する。Core は UI や人間の行動を独立検証せず、Application が確認事実を伝える境界とする。API、callback、ACK、PendingProfile 型は決めない。
- 完了条件または再確認方法: Handoff の各 actor、確認前・確認後の Profile 成功状態、失敗・中断時の非成功および非開示を Architecture から一意に追跡できることを確認する。

#### DR-004 — Explicit secret export の authorization / intent boundary 不足

- Severity: `Critical`
- Status: `New`
- 対象箇所: [`architecture.md:56-66`](../../design/architecture.md#L56)、[`architecture.md:89-95`](../../design/architecture.md#L89)、[`architecture.md:133-135`](../../design/architecture.md#L133)
- 発生条件または確認できた事実: Architecture は「正しい Profile password を伴う明示的な個別エクスポート」「返却後の表示・保管は Application / 利用者」とするが、対象秘密情報の指定、利用者が取得を要求した事実、UI / Application が意思を確認する責任、確認済み要求だけを Core へ送る責任を定めていない。export 後も Core 内原本の継続管理責任が Core に残ることも明記されていない。
- 既存の根拠: `requirements.md:187-191`、FR-022 / FR-023、SEC-010 / SEC-021、AC-025〜AC-026 / AC-041〜AC-043 は対象指定、処理単位 password authorization、利用者の明示要求、Application / UI の意思確認を別々の条件とし、単なる API 呼出しや password 所有だけでは成立しないと定める。成功後の Core 原本は Core、外部コピーは受領側が所有する。
- 問題と影響: Password と export flag、または Application からの任意の呼出しだけで export できる設計と、利用者確認済み要求だけを受ける設計の双方が成立する。通常処理から暗黙に secret export へ遷移する可能性、対象外秘密情報を返す可能性、export 後に原本の管理主体が移ったと解釈される可能性が残る。
- 必要な最小修正または確認: Architecture に、対象指定、利用者の明示要求、UI / Application の意思確認、Application が確認済み要求だけを送ること、Core は UI を担当せず意思を推測しないこと、通常処理から export へ暗黙遷移しないことを配置する。成功後も Core 内原本の継続管理は Core、Core 外コピーの表示・保存・利用・紛失防止は受領側とする。具体 UI、API、export buffer は決めない。
- 完了条件または再確認方法: Mnemonic と Software Key の各個別 export について、password authorization と user intent confirmation が別 property として Architecture から追跡でき、失敗時に secret を返さず Store を変更しない責任も下流へ一意に渡ることを確認する。

#### DR-005 — Signing authority と利用者の明示承認の分離不足

- Severity: `Critical`
- Status: `New`
- 対象箇所: [`architecture.md:11-18`](../../design/architecture.md#L11)、[`architecture.md:68-70`](../../design/architecture.md#L68)、[`architecture.md:89-95`](../../design/architecture.md#L89)
- 発生条件または確認できた事実: §1 は Transaction の意味解釈と署名承認 UI を対象外とし、§3.3 は Core の署名を payload に対する primitive としている。§4.3 は Application の Account 選択を示すが、Transaction / signing payload を利用者へ提示し、利用者から明示承認を得て、承認済み署名要求だけを Core へ送る責任を記載していない。
- 既存の根拠: `requirements.md:82-84`、UC-006、FR-009、SEC-022、AC-009 は Application / UI の Account 選択、署名対象内容の提示、利用者の確認可能性、明示承認および承認済み要求の送信を要求し、Core の Profile password 認証、指定 Account / Software Key の利用、署名 primitive、結果返却と分離する。password の正しさだけでは承認済みとしない。
- 問題と影響: Core が UI を担わないことだけを根拠に、Application が payload を表示・承認しないまま password と payload を送る設計が成立する。password authentication が signing authority の user authorization を兼ねる実装と、利用者承認を別にする実装が分岐し、秘密鍵利用の authorization boundary が一意でない。§3.1 の「処理の意味」を Core が所有するという表現も、Transaction 意味解釈との境界を曖昧にする。
- 必要な最小修正または確認: Application / UI が Account と signing payload を選択・提示し、利用者の明示承認を得た要求だけを Core へ送る責任を記載する。Core は処理単位の Profile password authorization、指定 Account / Software Key の秘密鍵利用、signing primitive、結果返却を担うが、Transaction の意味説明、確認 UI、利用者意思の推測は担わないと明確化する。表示形式、承認 UI、payload field は決めない。
- 完了条件または再確認方法: password authorization と user approval が別 property として表にでき、Account 選択・内容提示・承認済み request の送信は Application、鍵利用・署名は Core と Architecture から追跡できることを確認する。

#### DR-006 — v1 Store / Profile version migration 非提供の Architecture 不在

- Severity: `Critical`
- Status: `New`
- 対象箇所: [`architecture.md:105-109`](../../design/architecture.md#L105)、[`architecture.md:146-152`](../../design/architecture.md#L146)、[`architecture.md:172-191`](../../design/architecture.md#L172)
- 発生条件または確認できた事実: §5.2 は Store の wire encoding、version、unknown field、AAD、migration を `wallet-store-format-v1.md` と `specification.md` の正本へ委譲する。§9 は Store mutation、migration、unknown field を Core の Specification contract とし、§10 でも version / migration の具体契約を下流へ送る。§8 は Application に「移行」の責任を明示するが、v1 が Store / Profile version migration を提供しないこと、Core が対応 version のみ処理すること、unsupported / unknown / corrupt / inconsistent data を拒否することを Architecture の invariant として記載していない。
- 既存の根拠: `requirements.md:94-107`、DR-009、AC-018 / AC-045、§10、SEC-004 / SEC-018 は v1 migration 非提供、Core による version 識別、unsupported / unknown / corrupt / inconsistent data の reject、fallback / guessed interpretation / implicit migration 禁止、拒否時の既存状態不変、Application の opaque boundary を確定している。将来 migration は将来 version の Requirements / Design / Specification で改めて定義する。
- 問題と影響: `migration` が外部バックアップの移行なのか Store / Profile version migration なのかも曖昧であり、Specification が v1 Core の migration、Application による独自読み替え、unknown data の無視または fallback を選べる。秘密情報を含む未対応 Store を正常状態として利用したり、既存状態を更新したりする security / integrity architecture が変わり得る。
- 必要な最小修正または確認: Architecture に、Core が Store / Profile version を識別し、v1 の対応 version のみ処理し、unsupported / unknown / corrupt / inconsistent data を fail-closed に reject すること、implicit migration / fallback / guessed interpretation を行わないこと、Application は opaque Store を編集・独自解釈しないこと、拒否・失敗時は既存 state を不変にすること、v1 migration は提供せず将来 version で改めて設計することを記載する。version number、unknown field の形式、wire schema、migration algorithm は下流へ委譲する。
- 完了条件または再確認方法: Architecture の product-level decision だけから、v1 に migration がなく、version recognition / reject / opaque storage / existing-state preservation の責任が Core と Application に一意に配置されていることを確認する。

#### DR-007 — Account と Chain / Network compatibility responsibility の不足

- Severity: `Critical`
- Status: `New`
- 対象箇所: [`architecture.md:32-38`](../../design/architecture.md#L32)、[`architecture.md:72-83`](../../design/architecture.md#L72)、[`architecture.md:137-145`](../../design/architecture.md#L137)
- 発生条件または確認できた事実: Architecture の用語に Account がなく、§3.2 / §4.3 は Application のアカウント選択を示すだけである。§4.1 と §7 は Core が Chain、Profile Network、公開情報および署名の処理・差異を扱うとするが、Account が指定 Software Key をその固定 Chain と Profile Network 上で利用する概念であること、unsupported Chain / Network や Profile Network / requested Network、Software Key Chain / requested Chain の mismatch を Core が拒否すること、fallback / implicit conversion を禁止することを明示していない。
- 既存の根拠: `requirements.md:25-46`、UC-009、FR-013 / FR-024、DR-005、AC-013 / AC-047 は Profile = Network 固定・Chain 非固定、Software Key = Chain 固定、Account = Software Key を対象 Chain + Profile Network 上で利用する関係を定め、全経路で mismatch / unsupported を reject し、状態・secret を変更または返却せず、fallback / implicit conversion を行わないことを要求する。
- 問題と影響: Account 選択を Application が担う一方、Account と Software Key の対応および Chain / Network compatibility を Binding、Application、Core のどこで確定するかが曖昧である。誤った Chain / Network の公開情報・署名を返す実装、Binding が独自に補正する実装、unsupported 値を別値へ fallback する実装が成立し、signing authority と相互運用性の境界を弱める。
- 必要な最小修正または確認: Architecture に Account の関係を定義し、Application は利用 Account を選択して表示・要求するが、Core が Software Key の固定 Chain、Profile の固定 Network、要求の Chain / Network の compatibility と supported set を検証・拒否する責任を持つと記載する。Binding は意味判定を代替せず、implicit conversion / fallback を行わないとする。derivation path、network byte、chain identifier は決めない。
- 完了条件または再確認方法: Derived / Imported / Generated の全経路で、Account 選択、Core の compatibility validation / reject、Binding の非権威性、Profile / Key state 不変および secret 非返却が Architecture から追跡できることを確認する。

#### DR-008 — Application-held unlock session と処理単位 authentication の境界不足

- Severity: `Critical`
- Status: `New`
- 対象箇所: [`architecture.md:56-60`](../../design/architecture.md#L56)、[`architecture.md:62-66`](../../design/architecture.md#L62)、[`architecture.md:117-131`](../../design/architecture.md#L117)
- 発生条件または確認できた事実: Architecture は Core が継続的 Unlocked state / password cache を持たないこと、Core が処理ごとに password authorization を行うことを明記する。しかし、Application / Binding が unlock session、authorization token または前操作の authentication result を保持して次の秘密情報処理へ持ち越さないことは明記していない。§3.2 の「別の継続管理主体にしてはならない」は secret ownership の表現であり、継続 authorization state の禁止を一意に示さない。
- 既存の根拠: `requirements.md:64-78`、UC-005、FR-007、SEC-002 / SEC-007 / SEC-011、AC-007 / AC-027 / AC-031 は Core が秘密情報を必要とする処理ごとに Profile password を認証し、Application が unlock session を保持せず、認証結果を持ち越さず、Core / Binding が password を永続保存・継続 cache しないことを定める。
- 問題と影響: Core 内に unlocked state がなくても、Application-held session を Binding が後続要求へ付与し、Core がそれを受け入れる session 型の仕様と、毎回 password を受け取る処理単位型の仕様の双方が Architecture と両立する。前操作の authorization が後続の signing、export、mutation、deletion に越境し、Profile password を単位とする v1 の security property が崩れる可能性がある。
- 必要な最小修正または確認: Architecture に、secret-capable operation ごとに Core が Profile password を認証し、その authorization は当該処理にのみ有効で、Core / Binding / Application が unlock session、authorization cache、前処理の認証結果を次の処理へ持ち越さないことを記載する。再起動後は継続認証状態を持たず、次の処理は新しい入力と password authorization から開始する責任も示す。token、session API、memory lifetime は決めない。
- 完了条件または再確認方法: Profile password を必要とする signing、derivation、registration、password change、deletion、export の各処理について、前操作の認証を再利用できないことが Architecture から一意に確認できる。

#### DR-009 — pending / partial state と failure・retry・restart の責任不足

- Severity: `Critical`
- Status: `New`
- 対象箇所: [`architecture.md:97-115`](../../design/architecture.md#L97)、[`architecture.md:117-131`](../../design/architecture.md#L117)、[`architecture.md:180-191`](../../design/architecture.md#L180)
- 発生条件または確認できた事実: §5.2 / §5.3 は Core が完全な replacement Store を生成し、失敗時に既存 Store を変更しないとする。§6.2 は保存失敗時に Application が旧 Store を維持するとする一方、Pending Profile の再利用、期限、具体的 retry 条件を Specification へ委譲する。handoff confirmation 前後の pending secret / partial Profile を誰が所有し、restart・中断後に何を廃棄・再入力し、stale pending を成功状態として扱わない責任が本文から確定しない。
- 既存の根拠: `requirements.md:133-149`、AC-001 / AC-034、SEC-017 / SEC-018、§10、AC-038 / AC-046 は handoff、Profile 作成、登録、password 変更、削除の失敗・中断時に Profile / partial state / incomplete secret を成功状態として残さず、既存 state を壊さず、秘密情報を返さないことを定める。`requirements-review-008.md:145-149`、`161-167` も確認伝達・失敗責任と下流委譲の境界を示している。
- 問題と影響: Pending を Core が永続保持する、Application が秘密情報を保有して再送する、restart 後に確認だけを再利用する、または stale state を通常 Profile として採用する設計が下流で選べる。handoff failure だけでなく、保存 failure、binding interruption、再起動後の retry における秘密情報残留、認証越境、部分適用の扱いが security architecture として一意でない。
- 必要な最小修正または確認: Architecture に、pending / partial state の管理主体、handoff confirmation 前後の状態所有、failure / interruption / restart 時に正常 Profile として扱わないこと、既存 Store を保護する責任、retry は必要な入力と処理単位 authorization を再取得すること、stale / unconfirmed state を通常処理へ流さない invariant を記載する。Pending 型、wire representation、timeout、retry count、rollback algorithm は下流へ委譲する。
- 完了条件または再確認方法: Profile creation、restore、derivation、import、generation、signing、password change、export、key deletion、Profile deletion、Store rejection の各 flow で、failure / interruption / restart 後の owner、成功扱いしない状態、retry 条件および既存 state preservation が Architecture から追跡できることを確認する。

## Required Changes

以下は Critical の New であり、formal Gate を回復するために Architecture へ反映が必要である。

- DR-002: 全実行環境の trust boundary、host compromise 非保証および Core / Binding の共通非開示責任を明記する。
- DR-003: 初回 Mnemonic handoff の actor、確認伝達、Profile 成功確定および失敗境界を lifecycle として明記する。
- DR-004: explicit export の対象指定、利用者要求、Application / UI の意思確認、Core の非 UI 責任、原本と外部コピーの ownership を明記する。
- DR-005: password authentication と利用者の署名承認を分離し、Application / UI と Core の signing authority 責任を明記する。
- DR-006: v1 Store / Profile version migration 非提供、Core の version reject、opaque Store、fallback 禁止および既存 state 不変を明記する。
- DR-007: Account と Software Key / Chain / Profile Network の関係、Core の mismatch / unsupported reject、Binding の非権威性を明記する。
- DR-008: secret operation ごとの password authentication、Application / Binding の unlock session 非提供および authorization 持越し禁止を明記する。
- DR-009: pending / partial state の ownership、failure / interruption / restart、stale state 非成功扱い、retry / 再認証責任を明記する。

API、callback、ACK、PendingProfile 型、UI 画面、wire format、暗号方式、timeout、retry count は Required Changes に含めない。

## Optional Improvements

### DR-001

- Severity: `Major`
- Status: `New`
- Formal Gate: この finding 単独では Gate 不合格とはしない。ただし、Design の normative dependency を正す必要があるため、Critical 修正と同じ Architecture 更新で解消し、次の `security.md` review 前に再確認する。

## Resolved Findings

なし。`docs/reviews/design/` に対象 Architecture の過去 review artifact はなく、追跡すべき過去 Design finding は確認されなかった。

## Upstream Feedback

なし。最新 Requirements review 008 は `READY` / `REQUIREMENTS READY` で、RR-001〜RR-029 は全件 Resolved である。handoff、explicit export、signing approval、処理単位 authentication、Store migration、Chain / Network、failure / atomicity の product-level / security-level 判断は Requirements 本文に存在する。今回の不足は Requirements gap ではなく、その確定要求を Architecture の responsibility / ownership / boundary / lifecycle へ配置していない Design 側の問題である。

## Deferred Findings

正式 finding はなし。次の事項は Architecture の責任境界と security invariant が確定した後に、Specification / Implementation / Test へ引き継ぐ下流事項である。

- Handoff の API、callback / ACK、buffer、transport、PendingProfile 型、state machine の具体表現。
- Explicit export と signing approval の具体 UI、API / ABI、DTO、error、表示形式および受渡し方式。
- Store / Profile の version field、unknown data 表現、wire encoding、CBOR、schema、AAD、migration algorithm、具体 rollback / file operation。
- KDF、AEAD、salt、nonce、tag、key length、署名対象 byte 列、HD derivation path、network byte、chain identifier。
- Rust の型、memory lifetime、clone / copy、zeroize、unsafe、FFI pointer safety、parser / fuzz、unit test および fixture 実装。
- timeout、retry count、resource limit の具体値、公開 error code、Binding の pointer / buffer / free 契約。
- `docs/design/security.md`、`docs/design/bindings.md` 自体の独立 review と、Specification / Implementation / Test の適合性。

下流成果物がこれらの具体方式を持つことは、Architecture の不足を解消した根拠とはしない。Architecture 修正後に、下流が本レビューで確定した責任境界と security invariant を保持しているかを別途確認する。

## Scope and Traceability

### Review Basis / 上流・下流の境界

Concept review 009 の `CONCEPT READY` と Requirements review 008 の `REQUIREMENTS READY` を、最新の上流確定状態として確認した。Requirements 本文を、Architecture の外部可視な ownership、responsibility、trust boundary、lifecycle、failure responsibility および invariant の主根拠とした。Specification / Implementation / Test の内容から Architecture を逆生成していない。

### Requirements → Architecture Traceability

| Requirements の要求 | Architecture の現状 | 判定 / 対応 |
| --- | --- | --- |
| Concept / Requirements を上流とするフェーズ順 | §2.1 は Specification を上流根拠に含める | 方向の混在。DR-001 |
| Core が Mnemonic / Software Key を継続管理し、通常処理で非開示 | §3.1、§4.1、§5.1 に Core ownership と通常非返却がある | 基本は追跡可能。export / handoff 後の原本責任は DR-003 / DR-004 で補強が必要 |
| Desktop / Mobile / Web 共通の Core policy と host compromise 非保証 | Web Browser / JS の限界は記載、Native / Desktop / Mobile / OS / host process は不足 | DR-002 |
| Profile = Network 固定、Chain 非固定、Software Key = Chain 固定 | §5.1、§7 に部分的に記載 | Account 関係、unsupported / mismatch reject、fallback 禁止が不足。DR-007 |
| 処理単位 Profile password、no unlocked state、no session / carry-over | Core の継続 unlocked state 禁止と per-operation auth は記載 | Application / Binding の session / carry-over 禁止が不足。DR-008 |
| Profile 作成の initial Mnemonic handoff | handoff と Profile 確定の分離、失敗時非成功は記載 | actor、明示受領、確認伝達、最終確定の成功境界が不足。DR-003、DR-009 |
| Explicit Mnemonic / Software Key export | password と明示 export、返却後の Application 責任は記載 | target、user intent、UI confirmation、Core 原本 ownership が不足。DR-004 |
| Signing approval と password authentication の分離 | Core が raw payload primitive、Transaction 意味 / approval UI を担当しない | Application の提示・明示承認・承認済み要求送信が不足。DR-005 |
| Store ownership / atomicity | Core が validation / replacement image、Application が保存 / atomic replacement | ownership と主要 mutation の fail-closed は概ね追跡可能 |
| v1 Store / Profile version migration 非提供 | version / migration を Specification の正本へ委譲 | product-level decision、Core reject、opaque / fallback 禁止が不足。DR-006 |
| 失敗・中断時の existing state 不変 | replacement Store と旧 Store 維持は記載 | pending / partial / restart owner と stale state の扱いが不足。DR-009 |
| Binding thin boundary、Core security policy 共通 | §4.2、§4.4、§7 に明記 | 追跡可能。具体 ABI / WASM / ownership は下流委譲 |

Requirements から Architecture への traceability は、基本方針の一部（Core ownership、Binding thin boundary、replacement / atomicity、Core per-operation auth）では成立しているが、上表の DR-002〜DR-009 により security-critical な責任配置が未完了である。Requirements の不足ではない。

### System Context / Dependency Direction

`Application → Binding → Rust Core` の component dependency direction は §4.4 で明確であり、Binding が Core logic を再実装しない方向も追跡可能である。Application storage と opaque Store の保存責任も §3.2、§5.2 で整理されている。一方、Specification を Architecture の上流根拠とした normative dependency は DR-001、Desktop / Mobile / Native / OS / host process の trust context 不足は DR-002 とした。

### Component Responsibility

- Core: Profile、Mnemonic、Software Key、per-operation password authorization、derivation / signing / state mutation、Store validation / replacement image の責任は記載されている。
- Application: Account 選択、user operation、公開情報表示、Store の保存・atomic replacement の責任は記載されている。ただし handoff confirmation、explicit export intent、signing approval の責任が不足している（DR-003〜DR-005）。
- Binding: type / buffer / error / ownership の橋渡しに限定し、crypto / validation / authentication / signing / Chain policy を再実装しない責任は記載されている。
- Storage / Network / Transaction layer: 保存先、通信、transaction 構築の外部責任は概ね記載されている。host OS / host process および利用者の境界は DR-002、DR-003、DR-004 の対象である。

### Protected Assets / Secret Ownership

Mnemonic、Software Key private key、derived secret と decrypted material、Profile password、Core 管理下 Store、temporary secret、signing authority を適用対象とした。Core が Mnemonic / Software Key / password authorization / replacement を所有し、通常処理で返却しない原則は確認できる。export 後の Core 原本 ownership、handoff 中の temporary / pending secret ownership、Application / Binding / host の exposure boundary は一意でなく、DR-002〜DR-004、DR-009 とした。

### Trust Boundary

Core / Native Binding / WASM Binding / Application / Web runtime / Browser Storage の関係は部分的に記載されている。Web の host compromise 非保証は明記されるが、Desktop / Mobile の OS / host process と Native 経路に同じ invariant を適用する記述がない。Browser / OS / host process の compromise を Core が防止しない一方で、Core / Binding が不要な秘密情報を公開しない責任を維持する全環境原則が必要であり、DR-002 とした。

### Authentication / Authorization

Core の per-operation Profile password authorization と Core 内継続 Unlocked state 非提供は合格範囲である。ただし Application-held unlock session と authorization carry-over の禁止が明記されておらず、DR-008 とした。Explicit export の password authorization と user intent confirmation、signing の password authorization と user approval は別 property であるべきだが、Architecture での責任配置が不足している（DR-004、DR-005）。

### Signing Authority

Core が秘密鍵を使用して signing primitive と結果返却を担い、Transaction の意味解釈や approval UI を担わないという境界は記載されている。しかし、Application / UI が Account と payload を選択・提示し、利用者の明示承認を得た要求だけを送る責任がないため、signing authority の user approval boundary は未完了である（DR-005）。

### Mnemonic Handoff Lifecycle

Core ownership、Application の backup handoff、Profile 確定の分離、handoff 失敗時の正常 Profile 非生成は部分的に記載されている。Requirements が確定した「Core生成 → 意図された Application → 意図した利用者への提示 → 明示受領 → Application の確認伝達 → Core の成功確定」の各 actor と成功境界が不足しており DR-003、pending / interruption / restart の責任不足は DR-009 とした。

### Explicit Secret Export

個別 export を通常処理の限定例外とし、password を要求し、返却後の Application / 利用者責任を記載する点は確認できる。対象 secret の指定、利用者の明示要求、UI / Application の意思確認、確認済み request のみ送信、通常処理からの暗黙遷移禁止、export 後の Core 原本 ownership が不足している（DR-004）。

### Store Ownership / Version / Migration

Core が opaque Store を検証し完全な replacement image を生成し、Application が保存先と atomic replacement を所有する責任は成立している。Profile 作成、Derived / Imported / Generated Software Key 登録、password change、Software Key deletion、Profile deletion を対象とする fail-closed 方針も §5.3 にある。しかし v1 migration 非提供、Core version identification / reject、unknown / corrupt / inconsistent data reject、Application の独自解釈禁止および将来 version での再設計が Architecture に配置されていないため DR-006 とした。

### Chain / Network / Account Boundary

Profile Network 固定、Software Key Chain 固定、Symbol / NEM と Mainnet / Testnet の暗黙共通化禁止は記載されている。Account の概念、Application の選択と Core の compatibility validation / reject の分担、unsupported / mismatch 時の state 不変・secret 非返却・fallback / implicit conversion 禁止が不足しているため DR-007 とした。

### Failure / Atomicity / Retry / Restart

旧 Store を保存 failure から保護し、成功時に replacement Store を返す atomicity の責任は概ね成立している。処理単位 authorization、入力 Store 再提供による retry、Core の unlocked state 非保持も記載されている。一方、handoff / pending / partial state の owner、restart 後の状態、stale confirmation、retry 時の再認証・再入力および失敗後の secret 非残留が一意でない（DR-009）。Application-held authorization carry-over は DR-008 として分離した。

### Binding Responsibility

Native / WASM Binding は type conversion、buffer transfer、error / warning mapping、ownership bridge に限定され、crypto、authentication、Mnemonic validation、derivation、signing、duplicate check、Chain / Network meaning を再実装しないことが明記されている。Native と WASM で Core policy を変えない点も確認できる。具体 C ABI、WASM API、pointer、buffer、free、zeroize は対象外であり、今回の finding にはしていない。

### Specification への委譲評価

API、DTO、error code、wire field、CBOR、KDF / AEAD、nonce / salt / tag、derivation path、memory lifetime、zeroize、具体 UI、timeout、retry count を委譲していること自体は Design のフェーズ境界に適合する。ただし、handoff の actor / success boundary、export / signing の authorization boundary、per-operation authentication、Store migration product decision、Chain / Network reject responsibility、pending / restart ownership は下流へ委譲できない。これらを Specification が選べる状態を DR-003〜DR-009 とした。Specification が既に具体化していても Architecture の欠落を解消した根拠とはしない。

## Domain Checks

### 設計目的・範囲・責務境界

目的、対象環境、Core の責任、対象外の UI / Network / Transaction / OS-backed key は理解可能である。Core が Profile 単位の secret lifecycle を担い、Application が保存先と UI / user operation を担う大枠も成立している。handoff、export、signing approval、version migration を security architecture として明記する必要がある。

### System Context / Dependency Direction

component の依存方向は `Application → Binding → Rust Core` で合格。Specification を上流根拠とする文書上の依存方向は DR-001、Native / Desktop / Mobile / OS / host process の context 不足は DR-002。

### Component Responsibility

Core の key management / cryptographic meaning / per-operation authorization / Store replacement、Application の UI / storage、Binding の thin boundary、Network / Transaction layer の外部責任は概ね分離されている。Application の handoff / export intent / signing approval、Core の compatibility reject と pending ownership の不足は DR-003〜DR-009 に対応する。

### Protected Assets / Secret Ownership

Mnemonic、Software Key private key、derived secret、Profile password、Core 管理下 Store、decrypted / temporary secret、signing authority を確認した。Core ownership の基礎はあるが、export 後の原本、handoff / pending 中の temporary secret、host 境界の exposure が不足している。

### Trust Boundary

Web runtime / Browser Storage の限界は記載される。Native / Desktop / Mobile の OS / host process / Application compromise 非保証と、全環境での Core / Binding 非開示責任が不足するため DR-002。

### Authentication / Authorization

Core の処理単位 password authorization と継続 Unlocked state 非提供は確認できる。Application / Binding の unlock session、authorization cache、認証結果 carry-over 禁止は DR-008。Export intent と signing approval の別 authorization property は DR-004 / DR-005。

### Signing Authority

Core は designated Software Key を用いる primitive / result owner、Application は Account selection owner と読める。Payload の利用者提示、明示承認、approved-only request の送信が不足するため DR-005。

### Mnemonic Handoff Lifecycle

Handoff と Profile finalization を分ける意図はある。Core生成、Application handoff、Application presentation、user acknowledgment、Application confirmation、Core finalization の順序・責任・成功境界が不足するため DR-003。中断・再起動・pending は DR-009。

### Explicit Secret Export

Individual export を通常処理から分離する意図、password、返却後の受領側責任はある。対象指定、明示要求、意思確認、confirmed request、原本継続管理、暗黙遷移禁止が不足するため DR-004。

### Store Ownership / Version / Migration

Core validation / replacement image と Application persistence / atomic replacement の分担は合格範囲。v1 migration 非提供、version reject、unknown / corrupt reject、opaque / no fallback、future migration の再設計責任が不足するため DR-006。

### Chain / Network / Account Boundary

Profile Network と Software Key Chain の固定および Symbol / NEM、Mainnet / Testnet の明示的分離はある。Account mapping、compatibility reject、unsupported / mismatch、no fallback / implicit conversion の責任が不足するため DR-007。

### Failure / Atomicity / Retry / Restart

Replacement Store、旧状態保護、主要 mutation の fail-closed は概ね成立。Pending / partial の owner、handoff failure、stale state、restart、再試行時の再認証・再入力と secret 非残留が不足するため DR-009。認証 carry-over は DR-008。

### Binding Responsibility

Native / WASM は Core logic、authentication、crypto、Chain policy、secret ownership を奪わない thin boundary として明確である。具体 ABI / pointer / buffer / zeroize は下流へ委譲されており、Design finding にはしていない。

### Security Invariants / Downstream Handoff

Core ownership、通常処理での secret 非開示、Binding non-authority、replacement / existing state preservation の一部は下流へ引き渡せる。全環境 trust boundary、handoff success、explicit access、signing approval、per-operation auth、version reject、Chain / Network reject、pending / restart invariant は DR-002〜DR-009 の修正後でなければ Specification が一意に受け取れない。

### Specification への委譲評価

具体 API、wire、crypto、parser、memory、UI、error、timeout を委譲する境界は妥当である。ただし security architecture を規定する責任・所有・境界・lifecycle を Specification に委譲している箇所は過剰であり、DR-001、DR-003〜DR-009 とした。

## Validation Results

- 実施: `AGENTS.md`、Design Reviewer Skill 一式、共通 reviewer policy、Concept 本文、Concept review 009、Requirements 本文、Requirements review 008、対象 Architecture、関連 Design (`security.md` / `bindings.md`) の確認。
- 実施: Reviewer A〜D の独立自己レビュー、Chair による候補の根拠・影響・フェーズ境界・重複の反証と統合。
- 実施予定: review artifact 作成後に Markdown 見出し構造、共通章の順序、finding ID 重複、相対リンク、Concept / Requirements / Design target 参照、`git diff --check`、変更範囲を確認する。
- 未実施: Rust formatter、clippy、cargo test、WASM check。コード、Binding、Specification、Test は変更していないため対象外。
- 未確認: Specification / Implementation / Test / fixture の適合性、外部 Node、実 Application / UI、実際の handoff / export / signing approval、暗号方式、wire format および具体 memory / FFI 契約。これらは本 Architecture 判定の正本根拠ではない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | §1 が v1 の対象、対象外、Core の責任および外部層を概ね示す。 | なし |
| 2. コンテキストと責任 | 不合格 | Native / Desktop / Mobile / OS / host process の trust boundary、handoff actor、export intent、signing approval の責任が一意でない。 | DR-002, DR-003, DR-004, DR-005 |
| 3. 依存方向 | 合格（component）/ 要修正（normative reference） | `Application → Binding → Core` は明確。Specification を上流根拠とする参照方向は DR-001 で修正対象だが、DR-001 単独では formal Gate failure としない。 | DR-001 |
| 4. 主要フロー | 不合格 | handoff の success boundary、pending / partial state、failure / interruption / retry / restart の owner が不足する。 | DR-003, DR-009 |
| 5. データ所有 | 不合格 | Core / Application の Store ownership は概ね成立するが、export 後原本、version reject、pending / partial state の owner が不足する。 | DR-004, DR-006, DR-009 |
| 6. Security と相互運用性 | 不合格 | 全環境 trust boundary、export / signing authorization、per-operation auth、Store reject、Chain / Network / Account compatibility が一意でない。 | DR-002, DR-004, DR-005, DR-006, DR-007, DR-008, DR-009 |
| 7. 上流整合性 | 不合格 | Requirements の handoff、explicit access、signing、migration、Chain / Network、failure invariant を Architecture が完全には配置していない。 | DR-003, DR-004, DR-005, DR-006, DR-007, DR-008, DR-009 |
| 8. 下流実装可能性 | 不合格 | Specification が security architecture を推測しなければならない領域が残る。参照方向の混在もある。 | DR-001, DR-002, DR-003, DR-004, DR-005, DR-006, DR-007, DR-008, DR-009 |

Formal Gate: `REVISE DESIGN`。Critical の New が8件あり、Gate 不合格条件を満たす。

## Remaining Risks and Open Decisions

- Architecture は次の `security.md` review へ進める状態ではない。DR-002〜DR-009 を修正し、DR-001 も Design baseline の参照方向を直した後に Architecture を再レビューする必要がある。
- Requirements → Architecture の不足は現行 Requirements の欠落ではない。上流 Requirements が `READY` であることを理由に、Architecture の responsibility / ownership / boundary の欠落を下流へ先送りしてはならない。
- Store の具体 version / wire / migration algorithm、handoff transport、explicit export / signing UI、暗号・memory・ABI は、Architecture の security invariant が確定した後に Specification 等で決定する。
- 関連する `security.md` と `bindings.md` に同様または追加の設計課題があっても、今回の成果物では Architecture 以外の Design を formal review 対象としていない。Architecture 修正後に関連 Design 間の整合を確認する必要がある。
- host compromise を防止する保証は Core の対象外だが、host compromise を理由に通常処理での秘密情報非開示責任を弱めないという境界は、Desktop / Mobile / Web 全体で明記される必要がある。

## Automatic Changes

- 追加した変更: [`docs/reviews/design/architecture-review-001.md`](architecture-review-001.md) のみ。
- 変更していないもの: Concept、Requirements、Architecture 本文、`security.md`、`bindings.md`、Specification、Implementation、Source code、Test、Reviewer Skill および過去 review。

## Final Decision

`REVISE DESIGN`

Critical 8件（DR-002〜DR-009）により formal Gate は不合格である。DR-001 の Major も、Specification を Architecture の上流根拠として扱う参照方向を修正する必要がある。Architecture の修正と再レビューが完了するまで、次の `security.md` review へ進めない。
