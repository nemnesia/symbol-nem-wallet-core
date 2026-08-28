# Requirements Review Findings

## Review Target

- 対象: [`docs/requirements/requirements.md`](../../requirements/requirements.md)
- 対象ブランチ: `agent/tailor-project-skills`
- 確認日: 2026-08-28
- 成果物: `docs/reviews/requirements/requirements-review-005.md`
- レビュー範囲: Requirements 本文の目的、利用者、範囲、責任境界、機能・非機能・セキュリティ・データ要件、受入条件、ライフサイクル、失敗時整合性、未決定事項、Concept との traceability、および過去 RR-001〜RR-022 の回帰
- 未確認範囲: Specification、Implementation、Tests、fixture、README の適合性。これらは Requirements の欠陥を補う根拠として使用していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない、3つの独立した自己レビュー・パス
- Reviewer A（明確性と完全性）: 完了。要求の主体・対象・条件・観測結果・受入条件、用語、範囲、責任、MUST / SHOULD、内部矛盾を確認
- Reviewer B（利用価値とスコープ）: 完了。Concept からの目的・利用者・主要利用場面・v1境界・Account選択責任・Core管理責任の追跡を確認
- Reviewer C（成立性と安全性）: 完了。認証、lock / unlock、署名承認、完全性、fail-closed、秘密情報公開、破壊的操作、import / restore / delete、Native / WASM 境界を確認
- Phase 0: 完了。対象、上流根拠、補助資料、変更禁止範囲、成果物出力先を確定
- Phase 1: 完了。Reviewer A/B/C の観点を独立して確認
- Phase 2: 完了。候補ごとに根拠、影響、Requirements での解決必要性、最小修正、後工程へ委譲可能な詳細を反証・統合
- Phase 3: 完了。Review Gate、正式 ID、状態、成果物形式を確定
- サブエージェント記録: 使用していないため、agent ID・起動・並列実行の記録はない

## Evidence Used

| 種別 | 参照資料 | 用途 |
| --- | --- | --- |
| 作業指針 | `AGENTS.md` | Source of Truth、Scope Discipline、秘密情報保護、変更範囲、検証、Git運用を確認 |
| Review Skill | [`requirements-review/SKILL.md`](../../../.agents/skills/requirements-review/SKILL.md)、[`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`reviewers.md`](../../../.agents/skills/requirements-review/reviewers.md)、[`review-gates.md`](../../../.agents/skills/requirements-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/requirements-review/output-format.md)、[`common output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、Reviewer A/B/C、finding採用基準、Review Gate、成果物構成を確認 |
| 対象本文 | [`requirements.md`](../../requirements/requirements.md) §1〜§14 | 現行要件を直接評価。目的、Profile、Mnemonic、HD Wallet、Software Key、Account、Chain / Network、Binding、認証、秘密情報保護、ライフサイクル、受入条件、未決定事項を確認 |
| 上流 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1〜§13 | Concept の確定した目的、v1範囲、Mnemonic の継続管理、Software Key との区別、HD Wallet 関係、Account 選択、責任境界を確認 |
| 上流レビュー | [`concept-sheet-review-007.md`](../concept/concept-sheet-review-007.md) | `READY`、未解決 Critical / Major / Minor が 0 件であること、および Concept Review の確認範囲を確認 |
| 過去 Requirements Review | [`requirements-review-001.md`](requirements-review-001.md)〜[`requirements-review-004.md`](requirements-review-004.md) | RR-001〜RR-022 の正式 ID、初出、状態、回帰確認に使用。過去の READY 判定を今回の判定根拠にはしていない |
| 関連 Design | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md) | Core / Binding / Application、署名 primitive、WASM trust boundary 等の既存設計判断を確認。Requirements に設計詳細を追加する根拠にはしていない |
| 除外した資料 | Specification、Implementation、Tests、fixture、README | 下流で決めれば既存要件を満たせる事項を Requirements finding にしないため、今回の欠陥判定の根拠から除外 |

## Review Result

`READY`

## Summary

現行 Requirements は、Concept Review 007 が確定した Mnemonic の Core 継続管理、Mnemonic と Software Key の区別、HD Wallet からの導出、Core の鍵生成・復元・導出・管理、および UI / Application の Account 選択責任を、Profile、ユースケース、機能要件、セキュリティ要件および受入条件へ概ね追跡できる形で反映している。Profile password の処理単位認証、秘密情報の非開示、Profile 間分離、破壊的操作の認可、保存データ破損時の fail-closed、Native / WASM の共通責任も確認できる。

一方、現行本文を直接評価すると、過去に解消済みとされた lock / unlock の外部的な扱いと、Mnemonic / 秘密鍵の「妥当性・安全性基準」は本文上の定義・追跡が不足している。また、初回 Mnemonic backup handoff の完了契約と、署名時の Profile password 認証と利用者の明示的な署名承認との責任境界が一意ではない。Chain / Network の用語関係も軽度の解釈余地を残す。

正式 finding は Critical 0 件、Major 4 件、Minor 1 件である。

これらは Requirements レベルの品質・責任・外部契約に関する Major / Minor であり、API、ABI、schema、暗号方式、KDF、nonce、内部 state、処理順序、個別テストを要求する指摘ではない。Critical な品質ゲート不合格は確認されないため、Major / Minor を次工程へ引き継ぐ `READY` と判定する。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| RR-001 | Major | Resolved | requirements-review-001 | §3.1〜§3.2、FR-009、DR-008、AC-009、AC-033 が `symbol-sdk` 3.3.2、基準日、HD 復元互換性および fixture の判定基準を示す。 |
| RR-002 | Major | Resolved | requirements-review-001 | §2.3、FR-020、AC-001、AC-029 が未指定・空・Core 既定値の拒否を示し、品質ポリシーを上位 Application / Package の責任としている。 |
| RR-003 | Minor | Resolved | requirements-review-001 | FR-006、SEC-001、AC-002、AC-006 が Mnemonic と全 Software Key の暗号化保存および平文永続保存禁止を直接対応付ける。 |
| RR-004 | Minor | Resolved | requirements-review-001 | §2.4、FR-019、SEC-010、SEC-015、AC-025〜AC-026、AC-032 が公開情報と秘密情報の返却境界を示す。 |
| RR-005 | Minor | Resolved | requirements-review-001 | §1.2 が初期・現行 baseline の commit / blob と変更経路を示し、現行要件を単一正本として Git 履歴・レビュー履歴へ追跡できる。 |
| RR-006 | Major | Reopened | requirements-review-001 | §2.3、UC-005、FR-007 は処理単位認証と継続 Unlocked 禁止を定めるが、Concept の v1 能力である lock / unlock を独立能力として扱うか、処理単位モデルで置換するかを明示しない。 |
| RR-007 | Major | Resolved | requirements-review-001 | §2.3、SEC-008〜SEC-014、AC-030〜AC-031 が password 紛失時の復旧・リセット非提供と Core 認可責任を示す。 |
| RR-008 | Major | Resolved | requirements-review-001 | SEC-015、AC-032 が通常・失敗・入力エラー・認証失敗・破損データ・診断出力での秘密情報非開示を示す。 |
| RR-009 | Major | Resolved | requirements-review-002 | UC-003、UC-004、FR-004、FR-005、AC-004、AC-005 が Imported / Generated 登録の password 認可と失敗時状態不変を示す。 |
| RR-010 | Major | Resolved | requirements-review-002 | UC-001、§2.4〜§2.5、FR-001、FR-019、AC-001、AC-034 が Mnemonic backup、Profile data backup の範囲、保管・紛失防止責任を区別する。 |
| RR-011 | Minor | Resolved | requirements-review-002 | UC-009、FR-013、DR-005、AC-013 が Derived / Imported / Generated 全ての Chain / Network 公開情報・署名結果を対象とする。 |
| RR-012 | Major | Resolved | requirements-review-002 | §2.3、FR-020、SEC-016 廃止記録、AC-029 が password 品質判定を Core の責任外とする承認済み方針を示す。 |
| RR-013 | Major | Reopened | requirements-review-002 | FR-004、FR-005、FR-021、AC-035、§12.1 は「本要件書で定める」または「本要件書で承認した」基準を参照するが、現行本文に基準の内容または現行の承認済み識別子がない。 |
| RR-014 | Major | Resolved | requirements-review-002 | SEC-017、AC-037 が import / backup / export 等で一時的に扱う秘密情報の範囲と成功・失敗・中断後の非保持を示す。 |
| RR-015 | Major | Resolved | requirements-review-002 | FR-009、DR-008、AC-009、AC-033 が Symbol / NEM、Chain / Network の外部検証互換性を受入条件とする。 |
| RR-016 | Major | Resolved | requirements-review-002 | SEC-018、AC-038、§10 が password 変更、登録、削除の外部観測上の atomicity と部分適用禁止を示す。 |
| RR-017 | Major | Resolved | requirements-review-002 | SEC-019、AC-039、§10 が要求対象 Profile 以外への秘密情報・認証状態・利用可否の越境を禁止する。 |
| RR-018 | Minor | Resolved | requirements-review-003 | §1.2 が Concept の背景・課題・目的・利用者・場面・責任境界へ明示的に追跡する。 |
| RR-019 | Major | Resolved | requirements-review-003 | UC-008、FR-012、SEC-005、AC-012 が Core 管理下の削除データ再利用禁止と、利用者が保持する Mnemonic による新規 Profile 作成を区別する。 |
| RR-020 | Minor | Open | requirements-review-004 | Profile の固定 Network、Software Key の指定 Chain、`Chain / Network` 表記および FR-014 の共通管理方針の関係が一意ではない。詳細は Optional Improvements に記載する。 |
| RR-021 | Major | Resolved | requirements-review-004 | §3.2 が HD 復元の基準を仕様固定の導出規則・deterministic fixture とし、既存 Wallet の包括的互換性を保証せず、明示 fixture の範囲だけを保証すると定める。 |
| RR-022 | Major | Open | requirements-review-004 | 初回 handoff の失敗時 Profile 非作成と保管責任はあるが、意図した受領者、完了成立条件、handoff 中の公開範囲を一意に定めていない。 |
| RR-023 | Major | New | requirements-review-005 | 署名時の Core password 認証と、UI / Application が担うべき利用者の明示的な署名承認・Transaction 意味判断との責任境界が Requirements に明記されていない。 |

## Required Changes

### RR-006

- Severity: Major
- Status: Reopened
- 対象箇所: Concept §3、§7、Requirements §2.3、UC-005、FR-007、FR-019、AC-007
- 発生条件または確認できた事実: Concept は Software Key の lock / unlock を v1 の能力として含める。一方、Requirements は処理ごとの Profile password 認証と継続 Unlocked 状態の禁止を定めるが、独立した lock / unlock を提供するのか、処理単位の利用モデルが lock / unlock の要件上の代替なのかを定めていない。FR-019 の v1 主要機能一覧にも lock / unlock はない。
- 既存の根拠: [`concept-sheet.md`](../../consept/concept-sheet.md) §3、§7、[`requirements.md`](../../requirements/requirements.md) §2.3、UC-005、FR-007、FR-019、AC-007。過去 RR-006 は処理単位認証を確認して Resolved としていたが、今回の判定は現行本文を直接再評価した。
- 問題: 仕様設計が lock / unlock を公開ライフサイクルとして省略しても、Concept の能力を満たしたと解釈できる。反対に、処理をまたぐ unlocked 状態を設ける設計も、Concept 由来の意味を補完する形で入り得るため、利用者から観測できる lifecycle の契約が一意でない。
- 影響: Profile / Mnemonic / Software Key の秘密情報利用可否、signing authorization、失敗後の利用可否を仕様設計で任意に解釈できる。
- Requirements で解決する必要性: lock / unlock の提供範囲と秘密情報利用可否は外部可視の lifecycle・security policy であり、API 名や内部 state machine では解決できない。
- 必要な最小修正または確認: v1 で独立した lock / unlock を提供するか、処理ごとの password 認証をその概念上の実現とするかを Requirements で明示する。含める場合も、外部から見た利用可否だけを定め、API、内部 state、処理順序は Specification に残す。
- 完了条件または再確認方法: 第三者が、lock / unlock の v1 範囲、正しい password が必要な処理との関係、処理後の利用可否を Requirements だけから一意に判定できる。

### RR-013

- Severity: Major
- Status: Reopened
- 対象箇所: FR-004、FR-005、FR-021、AC-004、AC-005、AC-035、§11、§12.1、§13
- 発生条件または確認できた事実: FR-004 / FR-005 / FR-021 は外部 Mnemonic、Generated / Imported / Derived Software Key、Mnemonic restore の登録・利用に「本要件書で定める妥当性・安全性基準」を要求する。AC-035 も「本要件書で承認した」基準を参照する。しかし、現行本文にはその基準の内容、適用範囲の明示的な一覧、または現行の承認済み根拠識別子がない。§13 は解消済みと記録するだけで、基準を定義していない。
- 既存の根拠: [`requirements.md`](../../requirements/requirements.md) FR-004、FR-005、FR-021、AC-035、§12.1。過去の承認記録は Git 履歴上で確認できるが、現行本文の「本要件書で定める」という参照を満たす現行記載にはなっていない。
- 問題: 「妥当性・安全性基準」が何を要求するか、どの生成・復元・導出・取込み経路へ適用するか、誰の判定責任かを現行 Requirements から再現できない。単なる `valid` 判定を実装へ委譲する循環参照になっている。
- 影響: 無効・未対応・検証不能な秘密情報の登録・利用可否を受入判定できず、Core、Binding、Application の判定責任も一意に追跡できない。暗号方式、Mnemonic 標準、秘密鍵の具体的検証アルゴリズムを固定しないままでも解決できる欠落である。
- Requirements で解決する必要性: 登録・利用を許可する秘密情報の品質と Core の判定責任は、security と外部契約であり、Specification が方式を決めるだけでは要求の合否基準を補えない。
- 必要な最小修正または確認: 適用経路、Core の判定責任、無効・不適合時の非登録・非利用という高レベル基準を現行 Requirements または現行の承認済み資料へ明示する。Mnemonic 標準、seed / HD 導出方式、入力表現、乱数方式、検証アルゴリズムは Specification に残す。
- 完了条件または再確認方法: 生成・復元・Derived / Imported / Generated 登録の各経路について、満たすべき妥当性・安全性の性質、Core / Binding / Application の責任、失敗時の外部可視結果を Requirements から追跡できる。

### RR-022

- Severity: Major
- Status: Open
- 対象箇所: UC-001、FR-001、FR-019、SEC-010、SEC-015、SEC-017、AC-001、AC-034
- 発生条件または確認できた事実: 新規 Mnemonic 生成では初回 backup handoff が完了した場合だけ Profile 作成を成功させ、失敗・中断時は正常 Profile を残さない。handoff 後の保管・紛失防止は利用者および上位 Application / Package の責任とし、Core / Binding は秘密情報を継続保持しない。一方、handoff の完了を誰がどの外部事実で成立させるか、意図した受領者以外へ返さない境界、handoff 中に返してよい秘密情報の範囲が明示されていない。
- 既存の根拠: [`requirements.md`](../../requirements/requirements.md) UC-001、FR-001、FR-019、SEC-010、SEC-015、SEC-017、AC-001、AC-034。過去 RR-022 は同じ不足を指摘しており、現行本文で解消を確認できない。
- 問題: 不完全な受領、意図しない受領者への公開、または Core / Binding による handoff 中の不要な残留があっても、単に「完了」と解釈できる余地がある。
- 影響: 新規 Profile の作成可否、Mnemonic の confidentiality、Application / Binding / 利用者の責任分界が不安定になり、初回 backup の失敗時安全性を外部から判定できない。
- Requirements で解決する必要性: handoff の成功条件、公開範囲、責任主体および失敗時結果は外部契約・security 要件であり、受渡し方式や callback、buffer、ACK の実装詳細ではない。
- 必要な最小修正または確認: 意図した Application / 利用者への初回 handoff だけを対象とすること、Profile 成功とみなす外部確認条件、handoff 中の不要な公開・保持・診断出力の禁止、失敗・中断時の Profile 状態を Requirements で明示する。受渡し方式、API、内部状態遷移は Specification に残す。
- 完了条件または再確認方法: 初回 Mnemonic handoff の保護対象、成功成立条件、責任主体、失敗・中断時の Profile と秘密情報の状態を第三者が Requirements から一意に判定できる。

### RR-023

- Severity: Major
- Status: New
- 対象箇所: §2.4〜§2.5、UC-006、FR-009、SEC-002、SEC-014、AC-009、AC-023
- 発生条件または確認できた事実: Core は指定 Chain、Software Key、Profile password、上流から渡された署名対象データで署名する。Transaction の構築・意味判断は外部責任とされ、Profile password の認可は Core が担う。しかし、正しい Profile password が署名の十分条件なのか、UI / Application が利用者の明示的な署名承認を得る責任を持つのか、その責任境界が Requirements に明記されていない。
- 既存の根拠: [`requirements.md`](../../requirements/requirements.md) §2.4〜§2.5、UC-006、FR-009、SEC-002、SEC-014、AC-009、AC-023。関連 Design は Transaction の意味解釈・承認 UI を Core / Binding の責任外としているが、Requirements の欠落を下流資料だけで補完してはいけない。
- 問題: Application が利用者の明示的な承認を得ずに、正しい password だけで任意の raw payload の署名を要求してもよいのか、また Core が利用者意図を確認するのかが複数に解釈できる。
- 影響: signing authorization、blind signing、利用者責任、Core が保証する署名範囲を一意に受入判定できず、秘密鍵保護があっても利用者の意図しない署名を防ぐ責任が不明になる。
- Requirements で解決する必要性: 署名を許可する条件と、利用者の明示的承認・Transaction 意味判断の責任分担は security と外部契約であり、API や UI の具体設計ではない。
- 必要な最小修正または確認: Profile password による Core の鍵利用認可と、利用者の明示的な署名承認を要求するか否かを Requirements で決定し、Application / UI と Core / Binding の責任を明示する。承認画面、表示項目、API、署名対象 byte 列の詳細は下流へ残す。
- 完了条件または再確認方法: 署名要求が成功する認可条件、Core が保証すること、Application / UI が保証すること、Core が利用者意図を判断しない範囲を Requirements から一意に判定できる。

## Optional Improvements

### RR-020

- Severity: Minor
- Status: Open
- 対象箇所: §2.1、§3.1〜§3.2、UC-002、UC-006、UC-009、FR-003、FR-009、FR-013、FR-014、DR-005〜DR-008
- 発生条件または確認できた事実: Profile は Mainnet / Testnet の Network を持ち Chain に固定されない。Software Key は指定 Chain と Profile Network に対応するとされる一方、DR-005 は `Chain / Network`、FR-014 は Symbol / NEM の Mnemonic 生成・秘密鍵導出・暗号化を「共通管理方針」と表現する。Chain、Network、Profile Network、Software Key の Chain / Network の関係と許容組合せの用語定義はない。
- 既存の根拠: [`requirements.md`](../../requirements/requirements.md) §2.1、§3、UC-002、UC-006、UC-009、FR-003、FR-009、FR-013、FR-014、DR-005。Concept の Symbol / NEM と Mainnet / Testnet を混同しない方針とも照合した。
- 問題: `Profile Network` を Software Key が継承するのか、Software Key 自体が別 Network を持つのか、`共通管理方針` が共通の責任・ライフサイクルだけを指すのか、Chain 固有処理まで同一化するのかを複数に解釈できる。
- 影響: HD 導出、アドレス、署名、重複判定の適用範囲を Specification で定義する際に、Symbol / NEM または Mainnet / Testnet の誤った組合せを許可する余地が残る。
- Requirements で解決する必要性: 用語と固定範囲、許容される外部組合せは interoperability と責任境界の要求であり、具体的な protocol constant や derivation path を要求するものではない。
- 必要な最小修正または確認: Chain と Network の概念上の関係、Profile が固定する範囲、Software Key が参照する範囲、および FR-014 の「共通管理方針」が責任・ライフサイクルの共通化であることを Requirements で明示する。具体的な組合せ値、導出 path、protocol constant は Specification に残す。
- 完了条件または再確認方法: Symbol / NEM、Mainnet / Testnet、Profile、Software Key、Account の関係と、導出・署名時にどの主体が Network / Chain を検証するかを第三者が Requirements から一意に判定できる。

## Resolved Findings

- RR-001〜RR-005: 対象互換性基準、空 password 拒否、Mnemonic を含む暗号化保存、秘密情報返却境界、承認 baseline の追跡を現行本文で確認した。
- RR-007〜RR-012: password 紛失・復旧、失敗時非開示、Imported / Generated 認証、Mnemonic / Profile backup 責任、全 Software Key の公開情報、上位 Application の password 品質責任を現行本文で確認した。
- RR-014〜RR-019: 一時秘密情報の残留禁止、Symbol / NEM 外部互換性、状態変更 atomicity、Profile 間分離、Concept 追跡、Profile 削除後の外部 Mnemonic 再作成境界を現行本文で確認した。
- RR-021: 既存 Wallet との包括的互換性を保証せず、追加保証は明示した名称・version / commit・入力・期待値・fixture の範囲に限定する記述が現行 §3.2 と AC-033 にあるため、今回の直接評価では Resolved とした。

## Deferred Findings

以下は Requirements の欠陥として採用せず、仕様設計・詳細設計・実装・検証へ引き継ぐ事項である。

- Mnemonic 標準、seed 生成、HD 導出 path、index 表現、Symbol / NEM の protocol constant
- 暗号方式、KDF、salt、nonce、鍵長、保存 schema、wire format、zeroize の具体方式
- API、parameter、response、error code、Native C ABI、WASM export、DTO、memory ownership
- handoff の具体的な受渡し方式、署名対象 byte 列、Transaction の具体的構築・表示、内部 state machine、処理順序
- 具体的な fixture、個別 unit test、CI、coverage implementation、対象 OS / Browser の release 条件

これらは要求された品質・責任・外部契約を満たす具体方式として下流で定めるべきものであり、今回の finding ではない。

## Scope and Traceability

- Concept の Mnemonic 継続管理は、Requirements §2.1、FR-002、DR-002、UC-001、FR-022、SEC-010 へ追跡できる。Mnemonic は Profile の root secret とされ、保存済み Mnemonic は通常結果で返さず、明示的な個別 export の例外だけを持つ。
- Mnemonic と Software Key の区別は、Profile model の単独 Mnemonic と Derived / Imported / Generated Software Key、FR-002〜FR-008、DR-001〜DR-004、個別 export の FR-022〜FR-023 に反映されている。
- Mnemonic → HD Wallet → Software Key → Account の関係は、§3.2、UC-002、UC-009、FR-003、FR-013、DR-005 から概ね追跡できる。Account の選択は §2.4 と UC-009 で UI / Application の責任とされ、秘密情報管理は Core に置かれている。Account を独立した秘密情報管理単位や API object として追加要求する必要はない。
- Core の鍵生成・復元・導出・管理責任は FR-001〜FR-013、SEC-001〜SEC-021、DR-001〜DR-008 に反映される。UI / Application は Account 選択、公開情報表示、ユーザー操作、backup / export 後の外部責任を担い、Core の秘密情報管理主体ではない。
- Native / WASM Binding は §2.2、FR-019、NFR-001〜NFR-004、SEC-011〜SEC-012、SEC-020、AC-015〜AC-016、AC-024、AC-040、AC-043 で、Core の認可・秘密情報公開方針を変更しない薄い境界として追跡できる。
- Network / Node access と Transaction construction は §2.4、§2.5、UC-006、AC-023 で Core 外に区分される。署名の利用者承認責任だけは RR-023 として、Requirements に必要な外部責任の明示が不足している。
- §1.3、§12 は方式詳細を下流へ委譲している。ただし FR-004 / FR-005 / FR-021 の妥当性・安全性基準、lock / unlock の外部ライフサイクル、handoff 契約、署名承認責任は、方式ではなく Requirements の品質・責任・契約であるため Deferred Findings にはしていない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 要求の完全性・品質 | 合格（Major 引継ぎ） | 主体、対象、MUST / SHOULD、受入条件、失敗時結果は主要範囲で確認できる。lock / unlock、妥当性・安全性基準、handoff、署名承認は RR-006、RR-013、RR-022、RR-023。 |
| 利用価値・スコープ | 合格 | §1、§2.4〜§2.5、UC-001〜UC-011 が対象利用者、利用場面、v1対象外、外部責任を示す。Concept Review 007 は `READY`。 |
| 責任境界 | 合格（Major 引継ぎ） | Core、Native / WASM Binding、UI / Application、上位 Application / Package、Network、Transaction 構築の大枠は区別される。署名承認・handoffの責任契約に RR-022 / RR-023 が残る。 |
| セキュリティ | 合格（Major 引継ぎ） | 認証、暗号化保存、完全性失敗、秘密情報非開示、Profile 間分離、破壊的操作、WASM 境界、部分適用禁止がある。lock / unlock、秘密情報妥当性、署名承認に RR-006 / RR-013 / RR-023 が残る。 |
| 相互運用性 | 合格（Minor 引継ぎ） | `symbol-sdk` 3.3.2、Symbol / NEM、Mainnet / Testnet、HD fixture の基準がある。Chain / Network の用語・許容範囲に RR-020 が残る。 |
| Lifecycle / failure / atomicity | 合格（Major 引継ぎ） | create、restore、import、derive、register、password change、delete、export、失敗時非変更・部分適用禁止がある。lock / unlock と初回 handoff の外部契約に RR-006 / RR-022 が残る。 |
| Phase separation | 合格 | 今回の finding は利用者に必要な品質、責任、範囲、外部契約に限定し、API、ABI、schema、algorithm、KDF、nonce、内部 state、個別 test は要求していない。 |

## Validation Results

- 実施: 指定された `AGENTS.md`、Requirements Review Skill 一式、共通 review playbook / output format、Requirements、Concept、Concept Review 007 の全文確認。
- 実施: 過去 Requirements Review 001〜004、関連 Design 3資料の確認。
- 実施: Reviewer A/B/C の独立自己レビュー、Phase 0〜3、finding 候補の反証・統合、RR-001〜RR-023 の状態追跡。
- 実施: `git diff --check` — 成功。
- 実施: `git diff --cached --check` — 成功。
- 実施: 成果物内の Markdown local link の参照先確認 — 成功。レビュー成果物から参照したローカル資料が存在することを確認した。
- 未実施: Rust formatter、clippy、cargo test、WASM check。コード、Binding、仕様、テストを変更していないため対象外。
- 未確認: 外部 Node、実プロトコル相互運用、暗号方式、API / ABI、fixture 実行、Implementation / Specification の適合性。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と課題 | 合格 | §1.1〜§1.2 に目的と Concept への追跡があり、Concept Review 007 も `READY`。 | なし |
| 2. 利用者と責任 | 合格 | UI / Application の Account 選択・公開情報表示・外部保管責任、Core の秘密情報管理・認可、Binding、Network、Transaction 層の大枠を説明できる。署名承認・handoff の追加明確化は Major として引継ぐ。 | RR-022, RR-023 |
| 3. 対象範囲 | 合格 | Profile、Mnemonic、Software Key、Account、Symbol / NEM、Mainnet / Testnet、Native / WASM、対象外領域を区別できる。Chain / Network の用語精度に Minor があるが Critical ではない。 | RR-020 |
| 4. 要件と制約 | 合格 | 機能、品質、security、互換性、失敗時整合性、外部責任、下流委譲を識別できる。妥当性基準と lock / unlock の明確化を Major として引継ぐ。 | RR-006, RR-013 |
| 5. 受入条件 | 合格 | AC-001〜AC-044 が主要な create、restore、鍵管理、署名、削除、export、Binding、秘密情報保護、atomicity を観測可能にする。handoff、lock / unlock、署名承認の条件には追加明確化が必要。 | RR-006, RR-022, RR-023 |
| 6. 内部整合性 | 合格 | 目的、Profile model、秘密情報保護、Profile 間分離、削除後再作成境界および互換性基準に Critical な矛盾はない。FR-014 と Chain / Network 用語に Minor がある。 | RR-020 |
| 7. 不可欠な前提 | 合格 | Core の暗号化保存・認証・非開示・fail-closed・Binding 境界は成立条件として確認できる。妥当性基準、handoff、署名承認の明示不足は Major だが、方式を推測せず次工程へ引継ぎ可能である。 | RR-013, RR-022, RR-023 |
| 8. Concept 整合性 | 合格 | Concept Review 007 は `READY`、未解決 Critical / Major / Minor は 0 件。Mnemonic の継続 Core 管理、Software Key との区別、HD Wallet 関係、Account 選択、秘密情報管理責任は Requirements に反映される。lock / unlock の外部契約だけ追加確認が必要。 | RR-006 |

Critical な品質ゲート不合格はない。Skill の判定規則に従い、Major / Minor は Required Changes / Optional Improvements として記録したうえで `READY` とする。

## Remaining Risks and Open Decisions

### Open Decisions

- RR-006: v1 の lock / unlock を独立した外部能力として扱うか、処理単位の Profile password 認証をその概念上の実現とするか。
- RR-013: Mnemonic / 秘密鍵の妥当性・安全性基準の内容、適用経路、Core の判定責任。
- RR-020: Chain、Network、Profile Network、Software Key、Account の用語関係と許容範囲。
- RR-022: 初回 Mnemonic backup handoff の完了条件、意図した受領者、公開範囲、失敗時責任。
- RR-023: Profile password による Core 認可と、Application / UI の明示的な署名承認・Transaction 意味判断の責任分担。

### Unconfirmed

- `symbol-sdk` 3.3.2 および HD deterministic fixture に対する実際の互換性は確認していない。
- 現行 Requirements と Specification / Implementation / Tests / README の整合性は今回の対象外であり、確認していない。
- 外部 Node、Browser runtime、Native runtime、実際の秘密情報 buffer の挙動は確認していない。

## Automatic Changes

レビュー中に Requirements、Concept、Design、Specification、Implementation、Tests、README、設定または既存レビュー成果物は変更していない。新規作成した成果物は本ファイルのみである。

## Final Decision

`READY`
