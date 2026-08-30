# Requirements Review Findings

## Review Target

- 対象: [`docs/requirements/requirements.md`](../../requirements/requirements.md)
- 確認日: 2026-08-30
- 成果物: `docs/reviews/requirements/requirements-review-006.md`
- Review Scope: Requirements 全体（§1〜§14）の目的、利用者、v1 範囲、Profile、Mnemonic、HD Wallet、Software Key、Account、Chain / Network、Native / WASM Binding、認証・認可、秘密情報公開、ライフサイクル、永続化、失敗時安全性、受入条件、Concept traceability、Requirements → Design / Specification 委譲および過去 Requirements review の回帰。
- 重点確認: Concept の Security Invariant、Core / Application / UI / Browser / OS の責任境界、通常処理と明示的な秘密情報アクセス、Mnemonic / Software Key の責任・ライフサイクル、Symbol / NEM と Mainnet / Testnet の分離、Signing responsibility、検証可能性。
- 未確認範囲: Design、Specification、Implementation、Test、fixture、README、外部 Node および外部 SDK の実際の適合性。これらは Requirements の不足を補う根拠として使用していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない、Reviewer A / B / C の3つの独立した自己レビュー・パス。
- Reviewer A（明確性と完全性）: 完了。要求の主体・対象・条件・外部観測結果、用語、MUST / SHOULD、受入条件、内部整合性、未決定事項および Requirements フェーズ境界を確認した。
- Reviewer B（利用価値とスコープ）: 完了。Concept からの目的、対象利用者、利用場面、v1 境界、Account 選択責任、Core 管理責任、Network / Chain 範囲および外部責任の追跡を確認した。
- Reviewer C（Security primary reviewer）: 完了。`security-checklist.md` の適用可能な protected assets、confidentiality、integrity、authentication / authorization、secret lifecycle、failure safety、trust / responsibility boundary、chain / network separation、input boundary、recoverability を確認した。
- Phase 0: 完了。対象 Requirements、上流 Source of Truth、変更禁止範囲、成果物の出力先を確定した。
- Phase 1: 完了。Reviewer A / B / C を独立した観点で確認した。
- Phase 2: 完了。候補ごとに根拠、外部影響、Requirements での解決必要性、下流へ委譲可能な詳細、重複および重大度を再確認した。
- Phase 3: 完了。正式 ID、状態、Review Gate、成果物構成および検証範囲を確定した。
- サブエージェント記録: 使用していないため、agent ID・起動・並列実行の記録はない。

## Evidence Used

| 種別 | 参照資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、フェーズ境界、Scope Discipline、秘密情報保護、変更範囲および Validation を確認 |
| Reviewer Skill | [`requirements-review/SKILL.md`](../../../.agents/skills/requirements-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/requirements-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/requirements-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/requirements-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/requirements-review/output-format.md) | 更新済み Requirements Reviewer の Reviewer A / B / C、Security primary review、finding 採用条件、Severity、Review Gate、出力区分を確認 |
| 共通 reviewer policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`common output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、formal finding と Deferred Findings の分離、成果物構成、検証および Git 運用を確認 |
| 上流 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1〜§13 | 製品目的、v1 範囲、Mnemonic / Software Key の関係、Account 選択、Security Invariant、Trust Boundary、Core 外責任および次工程委譲を主な上流根拠として確認 |
| 最新 Concept review | [`concept-sheet-review-009.md`](../concept/concept-sheet-review-009.md) | 対象一致、公開された `READY` / `CONCEPT READY` 判定、Concept の未解決 Critical がないこと、および Requirements へ引き継ぐ Security Invariant の確認。過去 Requirements の判定の代替にはしていない |
| 対象 Requirements | [`requirements.md`](../../requirements/requirements.md) §1〜§14 | 現行 Requirements を独立評価。要件、責任、受入条件、失敗時整合性、未決定事項、引継ぎおよび過去 finding の対応状態を直接確認 |
| 過去 Requirements review | [`requirements-review-001.md`](requirements-review-001.md)〜[`requirements-review-005.md`](requirements-review-005.md) | RR-001〜RR-023 の初出、Severity、状態および未解消論点の回帰確認。過去の `READY` 判定や resolved 記録は今回の判定根拠にしていない |
| Phase Context | なし | `AGENTS.md` に Requirements の Phase Context 登録がないため、Context は探索・使用していない |

## Review Result

`READY`

## Summary

現行 Requirements は、Concept の主要方針である Core による Mnemonic / Software Key の管理、通常処理での秘密情報非返却、Profile 単位の認証、Symbol / NEM と Mainnet / Testnet の区別、Derived / Imported / Generated Software Key、個別エクスポート、Native / WASM の共通方針および主要な fail-closed 条件を、機能要件・セキュリティ要件・受入条件へ広く反映している。

ただし、現在の本文を独立に評価すると、次の Requirements レベルの未解消事項がある。

- Concept の v1 能力である lock / unlock と、処理単位の password 認証・継続 Unlocked 禁止との関係が外部ライフサイクルとして確定していない（`RR-006`）。
- Mnemonic / 秘密鍵の「妥当性・安全性基準」が本文に定義されず、「本要件書で定める」という循環参照になっている（`RR-013`）。
- 初回 Mnemonic handoff の完了条件、意図した受領者、handoff 中の公開範囲が不明確である（`RR-022`）。
- Signing では Core の password による鍵利用認可と、Application / UI の利用者承認・Transaction 意味確認の責任が分離されていない（`RR-023`）。
- 明示的な Mnemonic / Software Key export は v1 で許可されているが、「明示的な要求」が利用者の明示的意思をどう表すか、また成功した返却が Core の継続管理責任を移転しないことが一意でない（`RR-024`）。
- Concept が定める Browser / OS 等ホスト侵害に対する保証限界が、WASM に偏らず Desktop / Mobile / Native を含めて明示されていない（`RR-025`）。
- Core 管理下 Store の version、unsupported data、unknown data、migration および deterministic / interoperability 方針が要件として確定していない（`RR-026`）。
- Derived Software Key の導出・保存失敗時の Profile 整合性が、Imported / Generated 登録と同じ fail-closed 要件へ明示的に含まれていない（`RR-027`）。
- Unsupported または Chain / Network 不一致の入力を拒否し、状態を変更しない要件が一意でない（`RR-028`）。
- `bindings/native`、C ABI、`wasm-bindgen`、`duplicate_tag`、`InvalidStore`、平文 `duplicate_tag` など、Requirements で決める必要のない実装・保存・内部エラー詳細が混入している（`RR-029`）。

正式 finding は `Critical` 0件、`Major` 9件、`Minor` 2件である。更新済み Skill の Review Gate は `Critical` のみで不合格となるため、Major / Minor を記録したうえで `READY` と判定する。ただし、`Major` の未解消事項を解決済みとして Design / Specification の根拠に取り込んではならず、Requirements の修正または明示的な承認を先行させることを推奨する。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| RR-001 | Major | Resolved | requirements-review-001 | §3.1〜§3.2、FR-009、DR-008、AC-009、AC-033 が `symbol-sdk` 3.3.2、基準日、HD 復元互換性および fixture の判定基準を示す。 |
| RR-002 | Major | Resolved | requirements-review-001 | §2.3、FR-020、AC-001、AC-029 が未指定・空・Core 既定値の拒否を示し、品質ポリシーを上位 Application / Package の責任としている。 |
| RR-003 | Minor | Resolved | requirements-review-001 | FR-006、SEC-001、AC-002、AC-006 が Mnemonic と全 Software Key の暗号化保存および平文永続保存禁止を直接対応付ける。 |
| RR-004 | Minor | Resolved | requirements-review-001 | §2.4、FR-019、SEC-010、SEC-015、AC-025〜AC-026、AC-032 が公開情報と秘密情報の返却境界を示す。 |
| RR-005 | Minor | Resolved | requirements-review-001 | §1.2 が現行要件ベースライン、変更経路、Git 履歴および Requirements review 履歴への追跡を示す。 |
| RR-006 | Major | Reopened | requirements-review-001 | §2.3、UC-005、FR-007、AC-007 は処理単位の password 認証と継続 Unlocked 禁止を示すが、Concept の lock / unlock 能力を独立提供するか、処理単位モデルで置換するかを明示しない。 |
| RR-007 | Major | Resolved | requirements-review-001 | §2.3、SEC-008〜SEC-014、AC-030〜AC-031 が password 紛失時の復旧・リセット非提供と Core 認可責任を示す。 |
| RR-008 | Major | Resolved | requirements-review-001 | SEC-015、AC-032 が通常・失敗・入力エラー・破損データ・診断出力での秘密情報非開示を示す。 |
| RR-009 | Major | Resolved | requirements-review-002 | UC-003、UC-004、FR-004、FR-005、AC-004、AC-005 が Imported / Generated 登録の Profile password 認可と失敗時状態不変を示す。 |
| RR-010 | Major | Resolved | requirements-review-002 | UC-001、§2.4〜§2.5、FR-001、FR-019、AC-001、AC-034 が Mnemonic backup、Profile data backup の範囲、保管・紛失防止責任を区別する。 |
| RR-011 | Minor | Resolved | requirements-review-002 | UC-009、FR-013、DR-005、AC-013 が Derived / Imported / Generated 全ての Chain / Network 公開情報・署名結果を対象とする。 |
| RR-012 | Major | Resolved | requirements-review-002 | §2.3、FR-020、AC-029、§11 が password 品質ポリシーを上位 Application / Package の責任とし、Core の独自評価を要求しないことを示す。 |
| RR-013 | Major | Reopened | requirements-review-002 | FR-004、FR-005、FR-021、AC-035、§12.1 は「本要件書で定める」基準を参照するが、現行本文に基準の内容、適用範囲または承認済み識別子がない。§13 の Resolved 記録とも実体が一致しない。 |
| RR-014 | Major | Resolved | requirements-review-002 | SEC-017、AC-037 が一時的に扱う秘密情報を必要範囲に限定し、成功・失敗・中断後の継続利用可能状態や診断出力への残留を禁止する。 |
| RR-015 | Major | Resolved | requirements-review-002 | FR-009、DR-008、AC-009、AC-033 が `symbol-sdk` 3.3.2 と外部検証互換性を受入基準とする。 |
| RR-016 | Major | Resolved | requirements-review-002 | SEC-018、AC-038、§10 が password 変更、鍵登録・削除、Profile 削除の部分適用禁止を示す。 |
| RR-017 | Major | Resolved | requirements-review-002 | SEC-019、AC-039、§10 が要求対象 Profile 以外への秘密情報・認証状態・利用可否の越境を禁止する。 |
| RR-018 | Minor | Resolved | requirements-review-003 | §1.2 が Concept の背景・課題・目的・利用者・利用場面・責任境界への追跡を示す。 |
| RR-019 | Major | Resolved | requirements-review-003 | UC-008、FR-012、SEC-005、AC-012、AC-018 が Core 管理下の削除データ再利用禁止と利用者保有 Mnemonic による新規 Profile 作成を区別する。 |
| RR-020 | Minor | Open | requirements-review-004 | Profile は Network を固定するが Chain に固定せず、Software Key の Chain / Network 関係と FR-014 の「共通管理方針」の意味が現行本文でも一意でない。 |
| RR-021 | Major | Resolved | requirements-review-004 | §3.2、AC-033 が既存 Wallet との包括的互換性を保証せず、追加保証を明示した名称・version / commit・入力・期待値・fixture の範囲に限定する。 |
| RR-022 | Major | Open | requirements-review-004 | UC-001、FR-001、SEC-010、SEC-015、SEC-017、AC-001、AC-034 は handoff 完了を要求するが、意図した受領者、完了成立条件、handoff 中の公開範囲を定義しない。 |
| RR-023 | Major | Open | requirements-review-005 | UC-006、FR-009、SEC-002、SEC-014、AC-009、AC-023 は Core password 認証と raw transaction の外部構築を示すが、利用者の明示的署名承認と Application / UI の責任を定義しない。 |
| RR-024 | Major | New | requirements-review-006 | FR-022〜FR-023、SEC-010、SEC-017、SEC-021、AC-025〜AC-026、AC-041〜AC-043 は個別 export を許可するが、「明示的な要求」が利用者意思を表す条件と、返却後も Core 管理責任が移転しない境界を定義しない。 |
| RR-025 | Major | New | requirements-review-006 | Concept §7 のホスト侵害に対する保証限界に対し、Requirements の明示は SEC-020 の WASM / Web 境界にほぼ限定され、Desktop / Mobile / Native の OS / host compromise を共通の非目標としていない。 |
| RR-026 | Major | New | requirements-review-006 | §1.3、SEC-004、AC-017〜AC-018、§10〜§12 は保存データの破損・認証失敗を扱うが、Store version、unsupported / unknown data、migration 責任、失敗時の既存状態保持、deterministic / interoperability 方針を定義しない。 |
| RR-027 | Major | New | requirements-review-006 | FR-003、UC-002、AC-003 は Derived Software Key の導出・保存を要求するが、§10 と SEC-018 の明示対象は Imported / Generated 登録であり、Derived の導出・検証・保存失敗時の原子性・既存状態不変が明示されない。 |
| RR-028 | Major | New | requirements-review-006 | FR-003、FR-009、FR-013、FR-015〜FR-018、AC-003、AC-009、AC-013、AC-019〜AC-020 は指定 Chain / Profile Network を扱うが、unsupported Chain / Network、組合せ不一致、不正な Chain 入力の拒否と状態不変を一意に要求しない。 |
| RR-029 | Minor | New | requirements-review-006 | §1.3 が実装詳細を決定しないとする一方、§12.3 と AC-018 に具体的 Binding 実装、保存フィールド、内部エラーおよび処理順序が記載されている。 |

## Required Changes

なし。Critical の New / Open / Reopened は確認されなかった。Major / Minor の正式 finding は、更新済み Skill の出力区分に従い Optional Improvements に記載するが、Major については安全な Design / Specification の基礎を確定する前に Requirements で解決または明示的に承認すべきである。

## Optional Improvements

### RR-006

- Severity: Major
- Category: Lifecycle / Security policy / Scope
- Status: Reopened
- 対象 Requirements: `requirements.md` §2.3、UC-005、FR-007、FR-019、AC-007。上流根拠は [`concept-sheet.md`](../../consept/concept-sheet.md) §3、§5、§7。
- 問題: Concept は Software Key の lock / unlock を v1 の鍵管理能力に含める。一方、Requirements は処理ごとの Profile password 認証と継続的 Unlocked 状態の禁止を定めるだけで、独立した lock / unlock を提供するのか、処理単位の password 利用がその外部的な代替なのかを定義しない。FR-019 の v1 機能一覧にも lock / unlock がない。
- 根拠: Concept §3 の「暗号化保存、ロック、アンロック、署名への利用、破棄」、Requirements §2.3、UC-005、FR-007、FR-019、AC-007。
- なぜ問題なのか: 仕様設計が lock / unlock を公開ライフサイクルとして省略しても Concept の能力を満たすと解釈できる一方、処理をまたぐ unlocked 状態を補完的に導入する解釈も残る。秘密情報利用可否、signing authorization、失敗後の利用可否を一意に受入判定できない。
- Concept / Security Invariant への影響: Core が秘密情報を継続管理し、通常処理で非開示にする原則と、秘密情報を利用できる状態の境界が曖昧になる。継続 Unlocked 禁止自体は保護方向だが、Concept の v1 ライフサイクルとの対応が不明確である。
- Requirements フェーズとして必要な修正方向: v1 で独立した lock / unlock を提供するか、提供せず処理ごとの password 認証を外部的な利用モデルとするかを決定する。含める場合も、lock 後・unlock 後・処理終了後の秘密情報利用可否だけを定め、API、内部 state machine、処理順序は Specification / Design に委譲する。
- 完了条件: 第三者が Requirements だけから、v1 の lock / unlock の範囲、正しい password が必要な処理との関係、処理後の利用可否および失敗後の状態を一意に判定できる。

### RR-013

- Severity: Major
- Category: Input validation / Security / Traceability
- Status: Reopened
- 対象 Requirements: FR-004、FR-005、FR-021、AC-004、AC-005、AC-035、§11、§12.1、§13。
- 問題: 外部 Mnemonic / 秘密鍵、生成 Mnemonic、Generated Software Key 等について「本要件書で定める妥当性・安全性基準」を満たす値だけを登録・利用すると要求するが、現行本文にその基準の内容、各経路への適用範囲、判定責任または承認済み識別子がない。§13 は Resolved と記録するだけである。
- 根拠: `requirements.md` FR-004、FR-005、FR-021、AC-035、§12.1、§13。現在の本文は過去に削除された `OPEN-VALIDITY-001` の内容を代替する基準を示していない。
- なぜ問題なのか: 何を無効・未対応・検証不能として拒否するか、生成物と外部入力に同じ基準を適用するか、Derived も含めるか、誰が受入判定を担うかを本文から再現できない。単なる `valid` 判定を Specification へ循環委譲するため、異なる安全性を持つ合理的な実装が成立する。
- Concept / Security Invariant への影響: Core が Mnemonic / Software Key を継続管理する前提の下で、Core 管理下へ取り込める秘密情報の品質境界が不明となり、無効・未対応の秘密情報を正常状態として管理する余地が残る。
- Requirements フェーズとして必要な修正方向: Mnemonic の生成・復元・取込み、秘密鍵の生成・導出・取込みの各経路について、満たすべき高レベルな妥当性・安全性の性質、Core の判定責任、失敗時の非登録・非利用を本文または現行の承認済み根拠へ追跡可能にする。Mnemonic 標準、seed 方式、入力表現、暗号方式、検証アルゴリズムは下流へ委譲する。
- 完了条件: 各生成・復元・導出・取込み経路に適用する基準、Core / Application / Binding の責任、無効時の外部結果および承認済み根拠を Requirements から追跡できる。

### RR-020

- Severity: Minor
- Category: Terminology / Interoperability / Scope
- Status: Open
- 対象 Requirements: §2.1、§3.1〜§3.2、UC-002、UC-006、UC-009、FR-003、FR-009、FR-013、FR-014、DR-005〜DR-008、AC-003、AC-009、AC-013、AC-014、AC-020、AC-033。
- 問題: Profile は Mainnet / Testnet の Network を持ち Chain には固定されない。Software Key は指定 Chain と Profile Network に対応するとされるが、Software Key が Profile Network を継承するのか、`Chain / Network` が一つの属性なのか、FR-014 の「共通管理方針」が責任・ライフサイクルの共通化だけを意味するのか、Chain 固有の導出・鍵・アドレス・署名処理まで共通化するのかが明示されない。
- 根拠: 上流 Concept §5 は Chain と Network を別概念として扱い、Symbol と NEM、Mainnet と Testnet を暗黙に同一視しない。現行 Requirements §2.1、§3、FR-003、FR-013、FR-014、DR-005 は用語関係を完全には再現していない。
- なぜ問題なのか: Symbol / NEM または Mainnet / Testnet の誤った組合せ、Chain 固有処理の共通化、重複判定の適用範囲を Specification が補完する余地が残る。
- Concept / Security Invariant への影響: Concept の Chain / Network 分離と、対象 Network に正しい鍵導出・公開情報・署名を適用する前提に解釈差が生じる。
- Requirements フェーズとして必要な修正方向: Chain と Network の意味、Profile が固定する範囲、Software Key が参照する範囲、Account との関係、および「共通管理方針」が責任・ライフサイクルの共通化に限られることを明示する。具体的な derivation path、network byte、protocol constant は下流へ委譲する。
- 完了条件: Symbol / NEM、Mainnet / Testnet、Profile、Software Key、Account の関係と、導出・公開情報・署名・重複判定で Chain / Network を検証する責任が Requirements から一意に判定できる。

### RR-022

- Severity: Major
- Category: Secret lifecycle / Confidentiality / Responsibility boundary
- Status: Open
- 対象 Requirements: UC-001、FR-001、FR-019、SEC-010、SEC-015、SEC-017、AC-001、AC-034。
- 問題: 新規 Mnemonic の初回 backup handoff が完了した場合だけ Profile 作成を成功させるが、誰が意図した受領者か、どの外部事実で handoff 完了とみなすか、handoff 中に返してよい秘密情報の範囲、handoff の完了判定責任が定義されていない。
- 根拠: Concept §7 の Security Invariant は、通常処理と明示的アクセスを区別し、責任と受渡し方式を Requirements / Design へ委譲している。現行 Requirements は handoff の失敗・中断時の Profile 非作成と受渡し後の保管責任は定めるが、成立契約を定めていない。
- なぜ問題なのか: 不完全な受領、意図しない受領者への公開、handoff 中の不要な保持または診断出力があっても「完了」と扱える余地が残る。Profile 作成成功、Mnemonic の confidentiality、Application / Binding / 利用者の責任を外部から判定できない。
- Concept / Security Invariant への影響: Core が継続管理主体であること、一時的仲介が責任移転でないこと、通常処理で秘密情報を返さないことの境界に直接影響する。初回 handoff は Concept で許容された明示的例外だが、例外の成立条件が未確定である。
- Requirements フェーズとして必要な修正方向: 意図した Application / 利用者への初回 handoff だけを対象とすること、Profile 成功を成立させる外部確認条件、handoff 中の不要な公開・保持・診断出力の禁止、完了判定責任および失敗・中断時の Profile 状態を定める。callback、ACK、buffer、API、内部状態遷移は下流へ委譲する。
- 完了条件: 初回 Mnemonic handoff の保護対象、受領者、成功成立条件、責任主体、失敗・中断時の Profile と秘密情報の状態を第三者が Requirements だけから判定できる。

### RR-023

- Severity: Major
- Category: Signing authorization / Trust boundary / User responsibility
- Status: Open
- 対象 Requirements: §2.4〜§2.5、UC-006、FR-009、SEC-002、SEC-014、AC-009、AC-023。
- 問題: Core は指定 Chain、Software Key、Profile password、上流から渡された署名対象データを用いて署名し、Transaction の構築・意味判断は外部責任とされる。しかし、正しい password が鍵利用認可の十分条件なのか、Application / UI が利用者の明示的な署名承認を得る責任を持つのか、Core が利用者意図を判断しないことが明示されない。
- 根拠: Concept §4〜§7 は Account 選択と UI / Application のユーザー操作を外部責任とし、Core を署名主体とする。現行 Requirements の UC-006、FR-009、§2.4 は raw transaction の外部構築を示すが、利用者承認契約を示さない。
- なぜ問題なのか: Application が利用者の承認なしに、正しい password だけで任意の raw payload の署名を要求してよいのか、Core が内容確認を保証するのかが複数に解釈できる。秘密鍵の保護と利用者の意図した signing は別の security property である。
- Concept / Security Invariant への影響: Core が signing authority を担う一方で、Account 選択・Transaction 意味判断・UI 確認を担わないという責任境界が曖昧になり、意図しない signing や blind signing の責任が逆流する。
- Requirements フェーズとして必要な修正方向: Profile password による Core の鍵利用認可と、利用者の明示的な署名承認を要求するかどうかを決定し、Application / UI が Account 選択・内容提示・承認を担う範囲、Core / Binding が意味判断・UI を担わない範囲を明示する。承認画面、表示項目、API、署名対象 byte 列は下流へ委譲する。
- 完了条件: 署名要求の成功条件、Account と Software Key の対応選択、Profile password の役割、利用者の明示的承認の要否、Application / UI と Core / Binding の責任、および Core が利用者意図を判定しない範囲を Requirements から一意に判定できる。

### RR-024

- Severity: Major
- Category: Explicit secret access / Authorization / Responsibility boundary
- Status: New
- 対象 Requirements: UC-001、UC-011、FR-001、FR-019、FR-022〜FR-023、SEC-010、SEC-017、SEC-021、AC-025〜AC-026、AC-032、AC-034、AC-041〜AC-043。
- 問題: 現行 Requirements は Mnemonic と Software Key 秘密鍵の個別 export を v1 で許可し、正しい Profile password と「明示的な要求」を条件にしている。しかし、明示的な要求が利用者の明示的意思を意味するのか、Application / UI がその意思を確認して要求する責任を持つのか、Mnemonic recovery / display がこの個別 export と同じ明示的アクセスなのかを定義しない。また、返却後に Application / 利用者がコピーを保管する責任を定める一方、Core の継続管理責任が移転しないことを明記しない。
- 根拠: Concept §7 の Security Invariant は、通常処理と「ユーザーが明示的に求める」回復・表示・exportを区別し、一時的仲介は管理責任の移転ではないと定める。現行 Requirements §2.4、UC-011、SEC-010、SEC-017、SEC-021 は password と返却対象を定めるが、利用者意思と非移転の関係を十分に定義しない。
- なぜ問題なのか: 保存された password を持つ自動処理・背景処理・意図しない呼出しが「明示的な要求」と解釈され、通常処理の例外として秘密情報を返せる余地が残る。個別に返却された秘密情報のコピーについて、Core が管理する原本と外部側の意図的なコピーの責任分界も受入判定できない。
- Concept / Security Invariant への影響: Security Invariant の「通常処理で返却しない」は反映されているが、「明示的アクセスであること」と「一時仲介・返却が Core の継続管理責任を移転しないこと」が弱い。実行環境差異によらず同じ例外条件を適用する必要がある。
- Requirements フェーズとして必要な修正方向: v1 の Mnemonic recovery / display / export および Software Key secret export の可否を明示し、現行の個別 export を許可するなら、要求ごとの Profile password 認可に加えて利用者の明示的意思を必要条件とし、Application / UI がその意思を確認して要求する責任を定める。Core は UI で意思を推測・表示確認せず、通常処理では返却しないこと、返却されたコピーの外部責任と Core 管理下原本の継続管理を区別する。画面、API、memory transfer は下流へ委譲する。
- 完了条件: 第三者が、v1 で許可される明示的秘密情報アクセスの種類、password 認可、利用者意思の成立条件、Application / UI の責任、通常処理との区別、返却後も Core が管理する原本の扱いを Requirements から一意に判定できる。

### RR-025

- Severity: Major
- Category: Trust boundary / Security non-goal / Environment responsibility
- Status: New
- 対象 Requirements: §2.2、§2.4〜§2.5、NFR-001〜NFR-004、SEC-011〜SEC-012、SEC-020、AC-015〜AC-016、AC-023〜AC-024、AC-040、AC-043。
- 問題: Concept §7 は UI / Application、Browser、OS 等のホスト環境そのものの侵害を Core が防止する保証を、Core の秘密情報管理原則と区別している。現行 Requirements の明示的な記述は SEC-020 の WASM Binding / Web Application 境界に偏っており、Desktop / Mobile の Native Binding、Application、OS / host compromise に対する同じ保証限界を明示しない。
- 根拠: Concept §7、§9〜§10、§13。現行 Requirements §2.2、§2.4、NFR-004 は環境差による Core 方針変更を禁じるが、Core がホスト侵害を防止する保証ではないという非目標を全環境へ明示していない。
- なぜ問題なのか: Native 環境では Application / OS の侵害を Core の責任範囲と誤って解釈し、WASM だけに異なる脅威責任を課す設計・受入判定が成立し得る。Core が保証する秘密情報の管理・非返却と、ホストの実行環境安全性は別の品質特性である。
- Concept / Security Invariant への影響: Security Invariant の第4項（環境差によらない原則）と第5項（ホスト侵害の保証限界）が Requirements に完全には追跡されない。
- Requirements フェーズとして必要な修正方向: Desktop / Mobile / Web、Native / WASM、Application / UI、Browser、OS / host のすべてについて、Core が保証する秘密情報管理・認可・通常処理の非返却と、ホスト侵害・外部 Storage security を Core が防止する保証ではないことを共通の責任境界として明示する。具体的な threat model、OS API、Browser 実装は下流へ委譲する。
- 完了条件: いずれの実行環境でも、Core の保証範囲、Application / Binding / Browser / OS の責任、host compromise を Core が防止しない非目標を第三者が Requirements から同じように判定できる。

### RR-026

- Severity: Major
- Category: Persistence / Migration / Integrity / Recoverability
- Status: New
- 対象 Requirements: §1.3、§2.4〜§2.5、FR-006、SEC-001、SEC-004、AC-002、AC-006、AC-017〜AC-018、§10〜§12、§11。
- 問題: Requirements は Mnemonic / Software Key の暗号化保存、破損・認証失敗データの非利用、Profile data backup / migration / recovery の v1 対象外を定めるが、Core が読む Store の version 概念、unsupported version、unknown data、同一 version 内の migration、migration の責任主体、失敗時の既存状態保持および保存データの deterministic / interoperability 方針を定めない。
- 根拠: `requirements.md` §1.3 は保存レコード構造を下流へ委譲し、§2.5 は保存済み暗号化 Profile データそのものの backup / migration / recovery を対象外とする。一方、FR-006、SEC-001、SEC-004 は Core 管理下 Store の永続化と読込みを要求し、AC-017〜AC-018 は破損・意味的不一致を扱うが version / unknown data の方針を持たない。
- なぜ問題なのか: 外部から受け取った Store が未知 version や未知 data を含む場合に、拒否、無視、移行、部分読込み、既存状態維持のどれを採用するかを安全に一意判定できない。Profile data backup を対象外にすることは、Core 自身の保存形式の読み込み・更新・互換性方針を決めないこととは別である。
- Concept / Security Invariant への影響: Core が暗号化された秘密情報を継続管理するための integrity、fail-closed、recoverability の責任範囲が曖昧になる。未知データを安全に扱わない設計は、破損・改ざん・将来 version の秘密情報を正常状態として扱う余地を残す。
- Requirements フェーズとして必要な修正方向: v1 の Store version 管理、受け入れる version、unsupported / unknown data の扱い、migration を提供するか対象外とするか、migration 責任主体、失敗時の秘密情報非開示・既存状態不変を決定する。保存 schema、version 値、wire format、migration algorithm、deterministic serialization の実現方法は下流へ委譲する。Store の deterministic / interoperability が製品要件でない場合は、その非目標も明示する。
- 完了条件: version、unsupported / unknown data、migration、失敗時状態、Core / Application の責任および deterministic / interoperability の対象範囲を Requirements から判定できる。

### RR-027

- Severity: Major
- Category: Software Key lifecycle / Failure safety / Integrity
- Status: New
- 対象 Requirements: UC-002、FR-003、FR-008、AC-003、AC-008、SEC-018、§10、§12.4。
- 問題: Derived Software Key の導出・保存は要求されるが、導出・妥当性確認・重複判定・保存のいずれかが失敗または中断した場合に、Profile の既存状態を保持し、Derived Key の部分登録を残さないことが明示されない。§10 と SEC-018 が列挙する登録は Imported / Generated Software Key であり、Derived の登録を明示しない。
- 根拠: FR-003、UC-002、AC-003 は成功時の導出・保存・重複条件を示す。FR-021 は「新規生成または外部入力」の Mnemonic / 秘密鍵を対象とするが、保存 Mnemonic からの Derived Software Key 登録を明示的に含めず、§10 の状態変更一覧にも Derived 登録がない。
- なぜ問題なのか: 失敗した導出結果や重複・保存途中の状態が Profile に残る、または既存の Derived / Imported / Generated Key が変更される実装を、現行受入条件だけでは排除できない。
- Concept / Security Invariant への影響: HD Wallet から導出した Software Key も Core が継続管理する秘密情報であり、Derived / Imported / Generated を共通ライフサイクルで扱うという FR-008 と fail-closed が一致しない。
- Requirements フェーズとして必要な修正方向: Derived Software Key の導出、検証、重複判定、保存を状態変更操作として明示し、失敗・中断時に部分登録・既存 Profile 変更・秘密情報出力を残さないことを要求する。transaction、rollback、保存方式は下流へ委譲する。
- 完了条件: Derived / Imported / Generated の各登録経路について、成功時の追加対象と、認証・導出・検証・重複・保存の各失敗時の Profile 状態不変および秘密情報非開示を受入判定できる。

### RR-028

- Severity: Major
- Category: Chain / Network separation / Input validation / Failure safety
- Status: New
- 対象 Requirements: §2.1、§3.1、UC-002、UC-006、UC-009、FR-003、FR-009、FR-013、FR-015〜FR-018、AC-003、AC-009、AC-013、AC-019〜AC-020、DR-005〜DR-008。
- 問題: Requirements は Symbol / NEM、Mainnet / Testnet、Profile Network、指定 Chain を扱うが、対象外 Chain、unsupported Network、Chain / Network の不一致、malformed な Chain 入力をどの時点で拒否し、失敗時に Profile や Key を変更しないことを明示しない。FR-009 の「Profile の Network と矛盾する処理を許可しない」だけでは、許容集合と失敗結果を再現できない。
- 根拠: Concept §5、§7、§9、§13 は Symbol / NEM と Mainnet / Testnet の区別および正しい導出規則への委譲を定める。現行 Requirements §3、FR-003、FR-009、FR-013、DR-005 は対応する処理を要求するが、unsupported / mismatch の安全な拒否を一貫して受入条件にしていない。
- なぜ問題なのか: Symbol 用の Profile Network に NEM として許されない Network を組み合わせる、未対応 Chain を fallback で処理する、異常な指定を部分的に保存するなどの解釈が残る。Chain / Network の正しい分離を外部から判定できない。
- Concept / Security Invariant への影響: Concept が明示する Symbol / NEM、Mainnet / Testnet の非混同に反し得る。誤った Chain / Network の署名・アドレス・導出結果は相互運用性だけでなく signing authority の取り違えにも影響する。
- Requirements フェーズとして必要な修正方向: v1 の対象 Chain / Network の概念上の許容範囲、Profile Network と指定 Chain の整合条件、unsupported / mismatch input の拒否、秘密情報を返さず状態を変更しない failure safety を要求する。具体的な chain ID、network byte、derivation path、error code は下流へ委譲する。
- 完了条件: 各導出・公開情報・署名・登録経路について、許容 Chain / Network、検証責任、unsupported / mismatch 時の外部結果および Profile 状態不変を Requirements から判定できる。

### RR-029

- Severity: Minor
- Category: Requirements phase separation / Over-specification
- Status: New
- 対象 Requirements: §1.3、AC-018、§12.3〜§12.4。
- 問題: §1.3 は API、保存レコード構造、FFI / WASM 実装等を本要件書で決定しないと宣言する一方、§12.3 は `bindings/native` の C ABI と `wasm-bindgen` を指定し、AC-018 は `duplicate_tag`、既存の平文フィールド、password なし復号の事前判定、`InvalidStore` という内部保存・処理・エラー表現を要求する。
- 根拠: `requirements.md` §1.3、AC-018、§12.3〜§12.4。これらは Core が満たすべき外部性質（重複拒否、秘密情報非開示、破損 Store の非利用）を越え、具体的な Binding / 保存 / 内部エラー実現を固定する。
- なぜ問題なのか: Requirements が設計上の選択肢を不必要に狭め、`duplicate_tag` や `InvalidStore` が定義されないまま受入条件に現れるため、Requirements 単独の検証可能性も下がる。別の方式で同じ外部 security property を満たす実装を、要件違反として扱う余地が生じる。
- Concept / Security Invariant への影響: Security Invariant 自体の不足ではないが、Core / Binding の責任境界と fail-closed を方式名・内部形式へ逆輸入し、Requirements と Design / Specification の責務境界を混在させる。
- Requirements フェーズとして必要な修正方向: Requirements には重複登録拒否、password なしで秘密情報を解釈・利用しないこと、破損・不整合 Store を正常状態として扱わないことなど外部性質だけを残し、Binding 実装、保存フィールド名、内部エラー、事前処理順序を Design / Specification へ委譲する。
- 完了条件: §1.3 と本文・受入条件の間に実装詳細の矛盾がなく、API / ABI、保存 field、内部 error、処理順序を固定せずに同じ security property と受入条件を判定できる。

## Resolved Findings

- `RR-001`〜`RR-005`: 現行本文の互換性基準、空 password 拒否、Mnemonic を含む暗号化保存、秘密情報返却境界、承認 baseline の追跡を確認した。
- `RR-007`〜`RR-012`: password 紛失・復旧、失敗時非開示、Imported / Generated 登録認証、Mnemonic / Profile backup 責任、全 Software Key の公開情報、上位 Application / Package の password 品質責任を確認した。
- `RR-014`〜`RR-019`: 一時秘密情報の残留禁止、Symbol / NEM 外部互換性、状態変更の部分適用禁止、Profile 間分離、Concept traceability、Profile 削除後の外部 Mnemonic 再作成境界を確認した。
- `RR-021`: 既存 Wallet との包括的互換性を保証せず、追加保証を明示した名称・version / commit・入力・期待値・fixture の範囲に限定する記述を確認した。

上記は現在の Requirements 本文との対応を確認したものであり、過去 review の `READY` 判定を再利用したものではない。`RR-006`、`RR-013`、`RR-022`、`RR-023`、`RR-020` は解消済みとは扱わない。

## Upstream Feedback

なし。Concept Review 009 は `READY` / `CONCEPT READY` であり、今回の formal finding は Requirements 本文の不足・曖昧さ・過剰指定に追跡している。Concept の上流修正を要求する不足・矛盾は確認していない。

## Deferred Findings

Requirements の外部性質を満たす具体方式として、次の事項は Design / Specification / Implementation / 後続検証へ委譲する。これら自体は今回の Requirements finding ではない。

- API signature、型、公開 error code、Native C ABI / WASM export の具体契約
- Mnemonic 標準、seed 生成、HD derivation path、index 表現、chain ID / network byte、protocol constant
- KDF、cipher、AEAD、salt / nonce、鍵長、保存 schema、wire format、deterministic serialization の実現方式
- memory layout、ownership / lifetime、保持時間、copy、zeroize / 解放方式
- 初回 Mnemonic handoff の callback / ACK / buffer / transport、署名対象 byte 列、Transaction 構築・表示 UI、内部 state machine、処理順序
- version field、unknown data の具体表現、migration algorithm、duplicate 判定アルゴリズム、fixture、test framework、coverage implementation

未決定のまま Requirements に残してはならない製品判断（lock / unlock の提供範囲、explicit secret access の利用者意思、handoff 契約、署名承認責任、host compromise の非目標、Store version / migration 方針、unsupported Chain / Network の拒否）は、上記の具体方式とは異なり、今回の formal finding として Requirements に戻している。

## Scope and Traceability

### Concept → Requirements Traceability

| Concept 方針 | 現行 Requirements の対応 | 評価 |
| --- | --- | --- |
| Desktop / Mobile / Web の共通 Core。Web は Web Application / Browser Extension を含む | §1.1、§2.2、FR-019、NFR-001、NFR-004、AC-015、AC-021〜AC-024、AC-040 | 概ね反映。共通 Core / Binding は追跡可能だが、host compromise の共通非目標は `RR-025`。 |
| Core が Software Key の管理・署名責任を担う | §2.2〜§2.3、FR-003〜FR-013、SEC-001〜SEC-021 | 反映。Signing の利用者承認・意味判断との責任境界は `RR-023`。 |
| UI / Application は秘密情報の継続管理主体にならず、Account 選択・表示・ユーザー操作を担う | §2.2、§2.4、NFR-001〜NFR-003、UC-009、AC-016 | 大枠は反映。明示的 export で返却されたコピーと Core 管理下原本の責任非移転が `RR-024`。 |
| Network / Transaction 構築は Core 外 | §2.4〜§2.5、UC-006、AC-023 | 反映。Transaction 意味確認・署名承認の Application 責任は `RR-023`。 |
| Mnemonic は生成・復元・取込み後も Core が継続管理し、Software Key と別対象 | §2.1、UC-001〜UC-002、FR-001〜FR-003、DR-001〜DR-002、FR-022 | 主要関係は反映。妥当性基準は `RR-013`、handoff は `RR-022`、明示的 export の非移転は `RR-024`。 |
| Derived / Imported / Generated は Software Key として扱う | §2.1、UC-002〜UC-004、FR-003〜FR-008、DR-004、AC-003〜AC-008 | 反映。ただし Derived の失敗時整合性が `RR-027`。 |
| Symbol / NEM と Mainnet / Testnet を混同しない | §2.1、§3、UC-009、FR-013〜FR-018、DR-005〜DR-008 | 概ね反映。用語・許容範囲・unsupported failure が `RR-020`、`RR-028`。 |
| 通常処理で Core 管理下秘密情報を返却・共有しない | UC-001、UC-011、FR-019、FR-022〜FR-023、SEC-010、SEC-015、AC-025〜AC-026、AC-032、AC-041〜AC-043 | 通常結果と個別 export の区別は反映。利用者意思・handoff 完了条件・継続管理責任の非移転が `RR-022`、`RR-024`。 |
| Desktop / Mobile / Web の違いで Security Invariant を変えない | NFR-004、AC-024、AC-040 | 管理・認可方針は反映。Host compromise の保証限界の全環境追跡は `RR-025`。 |

### Requirements → Design / Specification 委譲評価

委譲できている事項は、暗号方式、KDF、salt / nonce、保存 schema、具体的 HD derivation path、API / ABI、memory / zeroize、handoff transport、署名対象 byte 列、内部 state machine、error code、fixture 実装である。これらの不足を Requirements finding にはしていない。

一方、次は方式詳細ではなく、後続工程が安全な設計判断を一意に行うための製品要件・責任・期待結果であるため、Requirements に残す必要がある。lock / unlock（`RR-006`）、秘密情報妥当性の基準と Core 判定責任（`RR-013`）、handoff の成立契約（`RR-022`）、署名承認の責任（`RR-023`）、explicit secret access の意思条件と責任非移転（`RR-024`）、全環境の host compromise 非目標（`RR-025`）、Store version / migration 方針（`RR-026`）、Derived 登録失敗時の状態（`RR-027`）、unsupported Chain / Network の拒否（`RR-028`）である。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 要求の完全性・検証可能性 | 合格（Major / Minor 引継ぎ） | MUST / SHOULD、主体、主要成功結果、失敗時の非開示・状態不変、受入条件は広く存在する。一方、lock / unlock、妥当性基準、handoff、署名承認、explicit access、Store version、Derived failure、unsupported input に明確化余地がある（`RR-006`、`RR-013`、`RR-022`〜`RR-028`）。 |
| Concept → Requirements traceability | 部分合格 | Core 管理、Mnemonic / Software Key 分離、共通 Binding、通常結果の非返却、Chain / Network 区別は追跡可能。Security Invariant の explicit access、host compromise、署名承認の具体化が不足（`RR-023`〜`RR-025`）。 |
| Protected assets / confidentiality | 合格（Major 引継ぎ） | Mnemonic、Software Key、Profile password、暗号化保存状態、署名能力を認識し、平文永続保存・通常結果・診断出力への露出を禁止する。handoff の成立・explicit export の意思・Core 管理原本の非移転が不足（`RR-022`、`RR-024`）。 |
| Integrity | 合格（Major 引継ぎ） | 破損・認証失敗データの非利用、Profile 間分離、Chain / Network 整合、状態変更の部分適用禁止がある。Store version / unknown data、Derived 登録、unsupported input の扱いが不足（`RR-026`〜`RR-028`）。 |
| Authentication / Authorization | 合格（Major 引継ぎ） | Profile password を処理ごとに Core が認可し、登録・署名・削除・変更・export に適用する。lock / unlock の外部モデル、署名時の利用者承認、explicit export の利用者意思が未確定（`RR-006`、`RR-023`、`RR-024`）。 |
| Mnemonic lifecycle | 合格（Major 引継ぎ） | 生成、既存 Mnemonic からの復元・作成、Profile 継続管理、HD の root secret、個別 export、Profile 削除、外部バックアップ責任を示す。初回 handoff 契約と妥当性基準が不足（`RR-013`、`RR-022`）。 |
| Software Key lifecycle | 合格（Major 引継ぎ） | Derived / Imported / Generated、重複、暗号化保存、署名、個別削除、Profile 削除、共通利用ライフサイクルを示す。lock / unlock と Derived 失敗時状態が不足（`RR-006`、`RR-027`）。 |
| Signing responsibility | 部分合格（Major 引継ぎ） | Core の password 認証、指定 Software Key / Chain、外部から渡された data、SDK 互換結果、Transaction 構築外部責任はある。利用者承認、Account 選択と signer authorization の分界が不足（`RR-023`）。 |
| Chain / Network separation | 部分合格（Major / Minor 引継ぎ） | Symbol / NEM、Mainnet / Testnet、Profile Network 固定、Chain 別重複、SDK / fixture 互換性を定める。用語関係、許容範囲、unsupported / mismatch failure が不足（`RR-020`、`RR-028`）。 |
| Failure / Fail-Closed | 合格（Major 引継ぎ） | wrong password、corrupt/auth-failed data、invalid import、duplicate、password change / deletion の部分適用、secret non-disclosure を扱う。handoff、Derived 登録、unsupported version / Chain / Network の失敗結果が不足（`RR-022`、`RR-026`〜`RR-028`）。 |
| Persistence / Migration | 部分合格（Major 引継ぎ） | secret の暗号化保存と破損データ非利用はあるが、Store version、unknown data、migration、deterministic / interoperability 方針がない（`RR-026`）。 |
| Trust / responsibility boundary | 部分合格（Major 引継ぎ） | Core、Binding、UI / Application、上位 Package、Network、Transaction 層の大枠は説明できる。署名承認、explicit export 後の原本責任、Native を含む host compromise 非目標が不足（`RR-023`〜`RR-025`）。 |
| Input / attacker boundary | 合格（Major 引継ぎ） | Wallet Store、Mnemonic、private key、password、transaction data を入力境界として扱い、破損・認証失敗・不正入力を正常な秘密情報として利用しない。妥当性基準・unsupported Chain / Network の適用範囲が不足（`RR-013`、`RR-028`）。 |
| Recoverability | 合格（Major 引継ぎ） | Mnemonic export / external backup、Mnemonic からの Profile 再作成、暗号化 Profile data の backup / migration / recovery 外部責任を区別する。handoff の成功成立と Store migration 方針が不足（`RR-022`、`RR-026`）。 |
| 非エンジニアを含む可読性 | 概ね合格 | §1 の目的、§2.4 の外部責任、§5 相当の用語使用、UC、受入条件により主要な製品責任は追跡できる。未定義語「妥当性・安全性基準」「明示的な要求」「handoff 完了」「共通管理方針」が判断を妨げる（`RR-013`、`RR-020`、`RR-022`、`RR-024`）。 |
| Requirements フェーズ境界 | 部分合格 | 暗号、API、schema、memory、path 等の委譲は適切。ただし C ABI / wasm-bindgen、`duplicate_tag`、`InvalidStore`、平文 field 等の混入がある（`RR-029`）。 |

## Validation Results

- 実施: `AGENTS.md`、更新済み Requirements Reviewer Skill 一式、共通 reviewer policy、Concept Sheet、最新 Concept review 009、現行 Requirements、Requirements review 001〜005 の確認。
- 実施: Reviewer A / B / C の独立自己レビュー、Phase 0〜3、候補の反証・重複統合、RR-001〜RR-023 の状態追跡および Concept Security Invariant の traceability 確認。
- 未実施: Rust formatter、clippy、cargo test、WASM check。今回の変更対象はレビュー成果物のみであり、コード・Binding・Specification・Test を変更していないため対象外。
- 未実施: 外部 Node、実プロトコル相互運用、`symbol-sdk` 3.3.2 の実行検証、HD fixture、暗号方式、API / ABI、Store format、Implementation の適合性確認。これらは本 Requirements review の欠陥判定根拠にしていない。
- 成果物作成後に、Markdown 見出し順、finding ID の重複、相対参照先、対象 Requirements への参照、`git diff --check`、変更範囲を検証する。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と課題 | 合格 | §1.1〜§1.2 が Core 集約の目的と Concept への追跡を示す。 | なし |
| 2. 利用者と責任 | 合格 | Desktop / Mobile / Web、UI / Application、上位 Package、Binding、Network、Transaction 層の大枠を説明できる。署名承認、explicit access、host compromise の責任に Major を引継ぐ。 | RR-023〜RR-025 |
| 3. 対象範囲 | 合格 | Profile、Mnemonic、Software Key、Account、Symbol / NEM、Mainnet / Testnet、Native / WASM、対象外領域を区別する。Chain / Network の用語と unsupported input に明確化余地があるが Critical ではない。 | RR-020、RR-025、RR-028 |
| 4. 要件と制約 | 合格 | 機能、非機能、security、互換性、失敗時整合性、外部責任、下流委譲を識別できる。lock / unlock、妥当性基準、handoff、Store migration、Derived failure を Major として引継ぐ。 | RR-006、RR-013、RR-022、RR-026〜RR-028 |
| 5. 受入条件 | 合格 | AC-001〜AC-044 が主要な create、restore、鍵管理、署名、削除、export、Binding、秘密情報保護、部分適用禁止、互換性を観測可能にする。explicit access の意思、handoff、Derived failure、unsupported version / Chain / Network の条件が不足する。 | RR-022〜RR-028 |
| 6. 内部整合性 | 合格 | 目的、Profile model、秘密情報保護、Profile 間分離、削除後再作成、互換性の主方針に Critical な矛盾はない。§11 の「要件レベルの未決定事項はない」と、RR-006、RR-013、RR-022〜RR-028 の実質的な未決定事項が不整合である。 | RR-006、RR-013、RR-022〜RR-029 |
| 7. 不可欠な前提 | 合格 | Core の暗号化保存、password 認証、秘密情報非開示、部分適用禁止、Binding 境界は成立条件として確認できる。妥当性、handoff、Store version、unsupported input、host compromise に安全上の前提不足を Major として引継ぐ。 | RR-013、RR-022、RR-025〜RR-028 |
| 8. Concept 整合性 | 合格 | 最新 Concept review 009 は `READY` / `CONCEPT READY` で、未解決 Concept Critical はない。Mnemonic / Software Key 継続管理、通常結果非返却、Environment 共通性、Chain / Network 分離は Requirements に概ね反映されるが、explicit access、署名承認、host non-goal の具体化が不足する。 | RR-023〜RR-025 |

`Critical` な Gate failure はない。Skill の判定規則に従い、Major / Minor を正式 finding として記録したうえで `READY` とする。

## Remaining Risks and Open Decisions

### Open Decisions

- `RR-006`: v1 の lock / unlock を独立した外部能力として扱うか、処理単位の Profile password 認証をその外部的な利用モデルとするか。
- `RR-013`: Mnemonic / 秘密鍵の妥当性・安全性基準の内容、適用経路、Core の判定責任および承認済み根拠。
- `RR-020`: Chain、Network、Profile Network、Software Key、Account の用語関係と許容組合せ。FR-014 の共通管理方針の範囲。
- `RR-022`: 初回 Mnemonic handoff の意図した受領者、完了成立条件、公開範囲、完了判定責任、失敗時責任。
- `RR-023`: Profile password による Core 認可と、Application / UI の利用者の明示的署名承認・Account 選択・Transaction 意味判断の責任分担。
- `RR-024`: Mnemonic recovery / display / export、Software Key secret export の v1 可否、利用者の明示的意思、返却後の外部コピーと Core 管理下原本の責任分界。
- `RR-025`: Native / WASM、Desktop / Mobile / Web 全環境で共通に適用する host compromise 非目標と外部責任。
- `RR-026`: Store version、unsupported / unknown data、migration、deterministic / interoperability の v1 方針。
- `RR-027`: Derived Software Key 登録の失敗・中断時の状態不変と秘密情報非開示。
- `RR-028`: 対象 Chain / Network の許容範囲、mismatch / unsupported input の拒否および状態不変。

### Remaining Risks

- §13 は RR-001〜RR-019 を解消済みと記載するが、`RR-006` と `RR-013` は現行本文の不足が残り、`RR-020`、`RR-022`、`RR-023` は過去 review でも未解消である。解消記録だけで実体の確認を代替しないこと。
- Core 管理下秘密情報の通常結果非返却、暗号化保存、Profile password 認証、主要な状態変更の部分適用禁止は要件化されているが、明示的アクセスの例外条件と host compromise の境界が不十分なままでは責任解釈が分岐する。
- `symbol-sdk` 3.3.2 互換性および deterministic fixture の実行結果は今回確認していない。
- Store の version / migration 方針、Native / WASM 実行環境の具体的な受渡し、署名承認 UI、入力妥当性の詳細は未確認である。これらは本レビューで方式を決めていない。

## Automatic Changes

レビュー中に Concept、Requirements、Design、Specification、Implementation、Test、README、Skill 本体または過去 review 成果物は変更していない。新規作成した成果物は本ファイルのみである。

## Final Decision

`READY`

Requirements は主要な目的、対象、Core / Application / Binding の責任、Mnemonic / Software Key の基本ライフサイクル、秘密情報非開示、Profile password 認証、Symbol / NEM と Network の互換性基準および受入条件を備えている。`Critical` は確認されないため、更新済み Requirements Reviewer Skill の Gate では `READY` とする。

ただし、`RR-006`、`RR-013`、`RR-022`、`RR-023`、`RR-024`、`RR-025`、`RR-026`、`RR-027`、`RR-028` の Major は、Requirements の責任・安全性・外部契約を一意にするための未解消事項である。Requirements を修正または承認済みの明確化記録へ反映した後に、Design / Specification の再レビューへ進むことを推奨する。`RR-020` と `RR-029` は Minor として次工程へ引継ぎ可能だが、Chain / Network の解釈および実装詳細の混入を整理することが望ましい。
