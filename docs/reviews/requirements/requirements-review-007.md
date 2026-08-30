# Requirements Review 007

## 1. Review Target / Review Scope

対象は、現在の要件定義書 [`docs/requirements/requirements.md`](../../requirements/requirements.md) 全体である。対象候補は `docs/requirements/requirements.md` の1件に特定した。今回のレビューでは、前回 `requirements-review-006` 後に更新された現行本文を主対象とし、本文中の `Resolved` 記載は解消の根拠にしていない。

## 2. Execution Audit

Requirements Review Skill の Phase 0〜3 に従い、対象、上流根拠、同一フェーズの過去レビュー、フェーズ境界、Security / Trust Boundary、受入条件および Review Gate を確認した。

Reviewer A（明確性・完全性）、Reviewer B（目的・範囲・責任）、Reviewer C（Security primary）の観点を独立した確認パスとして実施し、候補を根拠・影響・Requirements フェーズで必要な修正かの観点から反証・統合した。別のサブエージェント起動は行っていない。

今回の変更は本レビュー成果物の追加だけとし、Requirements、Concept、Design、Specification、Implementation、Test、Skill および過去レビューは変更していない。

## 3. Evidence Used

### Review Basis / 使用 Reviewer Skill

更新済み [`requirements-review` Skill](../../../.agents/skills/requirements-review/SKILL.md) と、その `reviewers.md`、`security-checklist.md`、`review-gates.md`、`output-format.md`、および共通 reviewer policy を使用した。Requirements の何を満たすかという抽象度を維持し、外部から観測可能な要求、責任、禁止事項、成功・失敗条件、Concept への追跡可能性を確認した。

### Upstream Source of Truth

上流の正本は [`docs/consept/concept-sheet.md`](../../consept/concept-sheet.md) と、そこで `CONCEPT READY` を確認した [`concept-sheet-review-009.md`](../concept/concept-sheet-review-009.md) である。前回 Requirements review は finding の状態と完了条件の追跡に限定して参照した。

| 資料 | 用途 |
| --- | --- |
| [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、フェーズ境界、変更範囲、秘密情報、Validation および Git 運用の確認 |
| [`requirements-review/SKILL.md`](../../../.agents/skills/requirements-review/SKILL.md) | 対象特定、根拠範囲、Reviewer A/B/C、Requirements フェーズ境界、Severity および Review Result の確認 |
| [`requirements-review/reviewers.md`](../../../.agents/skills/requirements-review/reviewers.md) | Reviewer ごとの確認観点 |
| [`requirements-review/security-checklist.md`](../../../.agents/skills/requirements-review/security-checklist.md) | Protected asset、認証・認可、Lifecycle、Failure safety、Trust Boundary の確認補助 |
| [`requirements-review/review-gates.md`](../../../.agents/skills/requirements-review/review-gates.md) | Gate と Critical の対応関係 |
| [`requirements-review/output-format.md`](../../../.agents/skills/requirements-review/output-format.md) | 要件レビュー成果物の構成 |
| [`review-common/review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md) | 共通 Phase 0〜3、Finding 採用条件、下流委譲、Validation および成果物運用 |
| [`docs/consept/concept-sheet.md`](../../consept/concept-sheet.md) | Requirements の上流 Source of Truth。Core、Mnemonic、Software Key、責任境界、Security Invariant の確認 |
| [`concept-sheet-review-009.md`](../concept/concept-sheet-review-009.md) | 最新 Concept review の公開判定 `READY` / `CONCEPT READY` と、Concept finding の状態確認 |
| [`requirements-review-006.md`](requirements-review-006.md) | RR-001〜RR-029 の前回状態、今回再評価する対象および各完了条件の確認 |
| [`requirements-review-001.md`](requirements-review-001.md)〜[`requirements-review-005.md`](requirements-review-005.md) | 過去 finding の初出、状態および回帰対象の追跡 |

Phase Context は `AGENTS.md` に Requirements 用の登録がないため使用していない。Design、Specification、Implementation、Test、fixture は Requirements の不足を補う根拠として使用していない。

## 4. Review Result

`READY`（Requirements Reviewer Skill の formal Review Gate）

Critical の New / Open / Reopened は確認されなかった。Major 2件を Reopened としたが、現行 Skill は Major / Minor だけでは Gate を不合格にしない。

ただし、今回の依頼が求める「未解消 Major がない場合の `REQUIREMENTS READY`」という進行条件は満たさない。RR-022 と RR-026 を Requirements 上で再確認してから Design review へ進めることを推奨する。

## 5. Summary

更新後の Requirements は、前回指摘の大部分を実体として解消している。特に、処理単位の Profile password 認証、継続的 Unlocked state の非提供、Mnemonic / Software Key の Core 継続管理、通常処理での秘密情報非開示、明示的 export の条件、署名承認と password 認証の分離、全環境共通の host compromise 非目標、Chain / Network の関係、Derived 登録の fail-closed、Store の version・unknown data・暗黙 migration 禁止および Requirements フェーズ委譲は、外部から確認できる要件として追跡できる。

一方、次の2点は、本文の条件文だけでは後続工程が同じ製品判断に到達できない。

- RR-022: 初回 Mnemonic backup handoff の「成功は外部から判定可能」とは定められているが、成功を成立させる外部事実、受領の確定主体および Profile 作成を成功状態にする判定条件が定義されていない。§12.2 も成功判定を下流へ残している。
- RR-026: Store version と安全な拒否方針は定義されたが、`migration を行う場合` という条件のままで、v1 が migration を提供するのか提供しないのか、Core / Application のどちらがどの Store を担当するのか、migration の開始・成功条件が確定していない。

## 6. Finding Status

| ID | Severity | 今回の状態 | 前回状態 | 判定概要 |
| --- | --- | --- | --- | --- |
| RR-001 | Major | Resolved | Resolved | `symbol-sdk` 3.3.2、基準時点、HD 復元互換性および fixture の範囲が追跡できる。 |
| RR-002 | Major | Resolved | Resolved | Profile password の未指定・空・Core 既定値拒否と上位責任が明確である。 |
| RR-003 | Minor | Resolved | Resolved | Mnemonic と全 Software Key の暗号化保存および平文永続保存禁止がある。 |
| RR-004 | Minor | Resolved | Resolved | 公開情報と秘密情報の返却境界が通常処理・export として区別されている。 |
| RR-005 | Major | Resolved | Resolved | Requirements の承認 baseline と変更・レビュー履歴を追跡できる。 |
| RR-006 | Major | Resolved | Reopened | 継続的 Unlocked state、Application の unlock session、認証結果の持越しを明示的に禁止し、Concept の lock / unlock を処理単位認証として扱う。 |
| RR-007 | Major | Resolved | Resolved | password 紛失時の復旧・reset 非提供と Core 認可責任がある。 |
| RR-008 | Major | Resolved | Resolved | 通常・失敗・破損・診断経路での秘密情報非開示がある。 |
| RR-009 | Major | Resolved | Resolved | Imported / Generated 登録の認証、妥当性、保存失敗時状態不変がある。 |
| RR-010 | Major | Resolved | Resolved | Mnemonic backup と Profile data backup の範囲・責任が区別されている。 |
| RR-011 | Minor | Resolved | Resolved | Derived / Imported / Generated の全経路で Chain / Network の公開情報・署名結果を対象とする。 |
| RR-012 | Major | Resolved | Resolved | password 品質ポリシーを上位 Application / Package に置き、Core の独自評価を要求しない。 |
| RR-013 | Major | Resolved | Reopened | Mnemonic は BIP-0039 英語24語、Software Key は §3.3 基準を全経路に適用し、Core 判定責任を定める。 |
| RR-014 | Major | Resolved | Resolved | 一時的秘密情報の必要範囲限定と成功・失敗・中断後の残留禁止がある。 |
| RR-015 | Major | Resolved | Resolved | Symbol / NEM の外部互換性を `symbol-sdk` 3.3.2 と受入条件に結び付ける。 |
| RR-016 | Major | Resolved | Resolved | password 変更、鍵登録・削除、Profile 削除の部分適用禁止がある。 |
| RR-017 | Major | Resolved | Resolved | 要求対象 Profile 外への認証・秘密情報・状態の越境を禁止する。 |
| RR-018 | Minor | Resolved | Resolved | Concept の目的・責任境界・利用者への追跡がある。 |
| RR-019 | Major | Resolved | Resolved | 削除済み Core データの再利用と利用者保有 Mnemonic による新規 Profile 作成を区別する。 |
| RR-020 | Minor | Resolved | Open | Profile は Network 固定・Chain 非固定、Software Key は Chain 固定、Account は両者上で利用するモデルが明示されている。 |
| RR-021 | Major | Resolved | Resolved | 既存 Wallet の包括的互換性を保証せず、明示 fixture の範囲に限定する。 |
| RR-022 | Major | Reopened | Open | recipient と外部判定可能性は追加されたが、handoff 成功の成立事実・判定主体・Profile 成功条件が循環的である。 |
| RR-023 | Major | Resolved | Open | UI / Application の提示・明示承認と Core の password 認証・署名、Core 非担当の意味判断・UI が分離されている。 |
| RR-024 | Major | Resolved | New | export を通常処理と区別し、対象・password・明示要求・UI / Application 確認、原本と外部コピーの責任を定める。 |
| RR-025 | Major | Resolved | New | Desktop / Mobile / Native / Web を横断して非開示責任を維持し、host compromise 防止を Core の保証外とする。 |
| RR-026 | Major | Reopened | New | version、unsupported / corrupt、unknown data、暗黙 migration 禁止、失敗時不変はあるが、v1 migration 方針の選択と責任・成功条件が未確定である。 |
| RR-027 | Major | Resolved | New | Derived の導出・検証・登録・保存を atomic / fail-closed の対象に含める。 |
| RR-028 | Major | Resolved | New | unsupported / mismatch Chain / Network を reject し、状態・秘密情報を変更せず fallback / conversion しない。 |
| RR-029 | Minor | Resolved | New | C ABI、wasm-bindgen、内部 field、内部 error、wire 詳細および処理順序の要求を除去し、外部性質と委譲を残す。 |

正式 finding は Critical 0件、Major 2件、Minor 0件である。新規 finding はない。

### RR-022 Finding Detail

- **ID:** RR-022
- **Severity:** Major
- **Category:** Secret lifecycle / Confidentiality / Responsibility boundary
- **対象 Requirements:** §2.4、UC-001、FR-001、FR-019、SEC-010、SEC-015、SEC-017、AC-001、AC-034、§12.2
- **問題:** UC-001 と AC-034 は、初回 Mnemonic を「意図された呼出し元 Application」へ渡し、「受渡しの成功は外部から判定可能」とする。しかし、どの外部事実が受領成功を成立させるか、誰がその成立を確定するか、またその確定前後で Profile 作成を成功状態にする条件が Requirements から判定できない。§12.2 も成功判定を仕様設計へ委譲している。
- **根拠:** Concept §7 の Security Invariant（[`concept-sheet.md`](../../consept/concept-sheet.md) §7）は明示的な秘密情報アクセスの可否・認可・受渡しを Requirements / Design へ委譲している。前回 RR-022 の完了条件は、初回 handoff の受領者、成功成立条件、責任主体、失敗・中断時状態を Requirements だけから判定できることである。現行本文は受領者の類型、失敗時の新規 Profile 非保持、不要な宛先・ログの禁止、受渡し後の保管責任を追加したが、成立事実自体は「受渡しが成功した」と循環的に記載する。
- **なぜ問題なのか:** Application が実際に受領できたこと、単に Core 内で生成または一時コピーしたこと、あるいは受領確認が失われたことを区別できない。Profile 作成成功のタイミングと初回バックアップの製品保証が複数に解釈でき、秘密情報を意図した受領者へ渡す前に成功状態とする設計も排除できない。
- **Concept / Security Invariant への影響:** Core が Mnemonic を継続管理すること、UI / Application の一時仲介が責任移転でないこと、通常処理で秘密情報を返さないことの明示的 handoff 例外の境界に影響する。Core が人間の紙・外部保存の完了を保証しないこと自体は現行本文で維持されている。
- **Requirements フェーズとして必要な修正方向:** callback、ACK、buffer、API signature、transport、memory handling を決めるのではなく、意図された受領者、受領が成立したとみなす外部事実、Profile 作成成功の条件、判定責任、未確認・拒否・中断・失敗時の状態および秘密情報の扱いを製品要件として明示する。
- **完了条件:** 第三者が Requirements だけから、初回 Mnemonic の受領者、成功を成立させる観測可能な事実、Profile 作成の成功条件、Core / Application / 利用者の責任、失敗・中断時の Profile と秘密情報の状態を一意に判定できる。

### RR-026 Finding Detail

- **ID:** RR-026
- **Severity:** Major
- **Category:** Persistence / Migration / Integrity / Recoverability
- **対象 Requirements:** §2.5、DR-009、AC-018、AC-045、§10、§11、§12.2
- **問題:** DR-009、AC-045 および §10 は Store version の識別、unsupported / corrupt / inconsistent data の非利用、unknown data の意味推測禁止、暗黙 migration 禁止、読込み・migration 失敗時の既存状態不変、deterministic / interoperability を定めている。しかし migration は「行う場合」とされ、v1 が明示的 migration を提供するのか提供しないのか、提供する場合の責任主体、開始条件および成功条件が決まっていない。§2.5 の「明示的 migration 方針は v1 の要件」も、方針の具体的な製品選択を完了していない。
- **根拠:** 前回 RR-026 の完了条件は、version、unsupported / unknown data、migration、失敗時状態、Core / Application の責任および deterministic / interoperability の対象範囲を Requirements から判定できることである。現行本文は version、unknown data、失敗時状態および相互運用範囲を具体化したが、`migration を行う場合` により migration の可否と外部契約を条件付きのまま残す。§12.2 も migration の実施方式だけでなく成功判定へ読める事項を下流へ委譲している。
- **なぜ問題なのか:** 同一の旧または未知 Store に対し、読み込みを拒否する製品と、明示操作で移行する製品のいずれも Requirements に適合し得る。移行を提供する場合にも、Core が責任を負うのか Application が移行済みデータを渡すのか、いつ成功して旧状態を置換するのかが受入判定できず、復旧・互換性の期待が確定しない。
- **Concept / Security Invariant への影響:** Core 管理下の暗号化秘密情報を破損・未知・将来 version から安全に扱う integrity、fail-closed および継続管理責任に影響する。現行の暗黙 migration 禁止と failure 時状態不変は Security Invariant に整合するが、それを適用する migration の製品範囲が未確定である。
- **Requirements フェーズとして必要な修正方向:** Store の field、schema、wire format、migration algorithm、内部 version 値を決めるのではなく、v1 の migration 提供可否、Core / Application の責任分担、対象 version の方針、開始条件、成功条件および失敗時の既存状態・秘密情報の扱いを明示する。未知 data、unsupported version、deterministic / interoperability の既存制約は維持する。
- **完了条件:** 第三者が Requirements だけから、v1 で migration を提供するか、対象と責任主体、開始・成功・失敗条件、旧状態の扱い、unsupported / unknown / corrupt data の reject 方針および deterministic / interoperability の範囲を一意に判定できる。

## 7. Required Changes

なし。Requirements Reviewer Skill の Gate を不合格にする Critical finding はない。

## 8. Optional Improvements

Major である RR-022 と RR-026 は Skill 上は Optional Improvements の出力区分だが、秘密情報 handoff と Store migration の製品契約に関わるため、Design review の開始前に Requirements で解消することを推奨する。

## 9. Resolved Findings

### RR-006

`requirements.md` §2.3、UC-005、FR-007、SEC-002、AC-007 は、秘密情報を必要とする処理ごとに正しい Profile password を認証し、処理をまたぐ継続的・永続的な Unlocked state、Application が保持する unlock session および認証結果の持越しを提供しないと定める。§2.3 は Concept の lock / unlock をこの処理単位の利用可能性として明示している。独立した継続 Unlocked 能力を残す解釈はできないため解消と判定する。

### RR-013

§3.2 は Mnemonic の生成・復元・取込みすべてに BIP-0039 英語24語基準を適用し、Core の妥当性判定責任と Binding / Application の回避禁止を定める。§3.3 は Generated / Imported / Derived Software Key を対象 Chain と Profile Network で利用でき、§3.1 の Symbol / NEM 互換性基準に適合する値だけを登録・利用すると定める。FR-021、AC-035 が全経路と失敗時状態へ追跡する。具体的な検証手順・導出方式は §12.1 へ委譲され、循環参照は解消している。

### RR-020

§2.1、FR-013〜FR-014、DR-005、UC-009、AC-013、AC-014 は、Chain を Symbol / NEM、Network を Mainnet / Testnet と区別し、Profile は Network 固定・Chain 非固定、Software Key は Chain 固定、Account は Software Key をその Chain と Profile Network 上で利用する概念と定義する。Chain / Network の暗黙変換および不正な組合せも拒否するため、前回のモデル曖昧さは解消している。

### RR-023

UC-006、FR-009、SEC-022、AC-009 は、UI / Application が署名対象を利用者に提示し明示承認を得た要求だけを Core へ送る責任、Core が処理単位 password を認証して指定 Account / Software Key で署名する責任、password の正しさだけでは利用者承認としないことを明示する。Core は Transaction の意味説明、利用者意思の推測、内容確認 UI、Transaction 構築を担わないため、blind signing 防止 UI の責任が Core へ逆流していない。

### RR-024

UC-011、FR-022〜FR-023、SEC-010、SEC-015、SEC-021、AC-025〜AC-026、AC-041〜AC-043 は、Mnemonic / Software Key の個別 export を v1 の明示的秘密情報アクセスとして扱う。対象指定、処理単位 password、利用者の明示的要求、Application / UI の意思確認を必要とし、単なる API call や password possession だけでは成立しない。通常処理での非開示、失敗時非返却、Core 内原本の継続管理、外部コピーの受領側責任も区別されている。Mnemonic display は独立した通常結果ではなく、許可された明示的 export 後の外部側責任として記述されている。

### RR-025

§2.2、§2.4、NFR-004、SEC-020、AC-024、AC-040 は Desktop / Mobile / Native / Web Application / Browser Extension / Browser / OS / host process を横断して、Core / Binding の通常処理での秘密情報非開示責任を維持する。同時に Application、Browser、OS、host process の侵害を Core が防止する保証ではないと明記するため、host compromise の非目標と Core の非開示責任を混同しない。

### RR-027

UC-002、FR-003、FR-021、SEC-018、AC-003、AC-038、AC-046、§10 は Derived Software Key の導出、妥当性確認、登録、保存を状態変更の atomic / fail-closed 対象へ含める。いずれかの失敗・中断時に不完全な鍵、部分変更、既存 Profile / Software Key の破壊、秘密情報返却を残さないため、Imported / Generated と扱いが分離していない。

### RR-028

§2.1、FR-013、FR-024、DR-005、UC-009、AC-013、AC-047 は unsupported Chain / Network、Profile Network と要求 Network の不一致、Software Key 固定 Chain と要求 Chain の不一致、不正な組合せを reject する。拒否時は Profile、Software Key、秘密情報を変更・返却せず、fallback や暗黙 conversion を行わない。Profile = Network 固定 / Chain 非固定、Software Key = Chain 固定、Account = その組合せ上での利用というモデルも一貫している。

### RR-029

§1.3 は API、型、保存レコード構造、暗号、KDF、salt / nonce、具体 path、Binding 実装、memory layout、zeroize、具体 UI 等を委譲する。§12.3〜§12.4 も Native / Web Binding の外部契約、保存表現、version field、unknown data の具体表現、migration 手順等を下流へ委譲しており、前回問題となった C ABI、wasm-bindgen、duplicate_tag、InvalidStore、内部処理順序は現行 Requirements に残っていない。要求として残るのは外部から観測可能な安全性・責任・状態条件である。

## 10. Upstream Feedback

なし。最新 Concept review は `READY` / `CONCEPT READY` であり、未解決 Concept Critical は確認されない。Concept の Security Invariant と責任境界は Requirements の評価根拠として利用できる。Concept の修正を要求する上流 finding はない。

## 11. Deferred Findings

次の事項は Requirements に必要な外部性質・責任・期待結果が記述されており、具体方式を下流へ委譲している。これらは current-phase finding ではない。

- API signature、公開型、公開 error code、Native / Web Binding の具体契約。
- BIP-0039 の入力処理、seed 生成、HD derivation path、index および Chain / Network 対応の具体方式。
- 秘密鍵表現、検証手順、生成方式、KDF、cipher、AEAD、salt / nonce、鍵長および保存 schema。
- memory layout、ownership / lifetime、保持時間、copy、zeroize / 解放方法。
- 初回 handoff の callback / ACK / buffer / transport、署名対象 byte 列、Transaction 構築・表示 UI、内部 state machine、内部処理順序。
- Store の具体 version field、unknown data の具体表現、migration algorithm、duplicate 判定 algorithm、wire format、fixture および test framework。

RR-022 の handoff 成功契約と RR-026 の migration の v1 方針・責任は、方式詳細ではなく Requirements で決定すべきため、Deferred Findings には移していない。

## 12. Scope and Traceability

### Concept → Requirements Traceability 評価

| Concept の方針 | Requirements の対応 | 評価 |
| --- | --- | --- |
| Desktop / Mobile / Web の共通 Core。Web は Web Application / Browser Extension を含む | §1.1、§2.2、UC-010、FR-019、NFR-001、NFR-004、AC-015、AC-021〜AC-024、AC-040 | 反映。Binding 名称に依存せず、環境差で Core の責任・認可・通常非開示を変えない。 |
| Core が Mnemonic / Software Key を継続管理し、署名責任を担う | §2.1〜§2.4、DR-001〜DR-004、FR-001〜FR-014、SEC-001〜SEC-019 | 反映。Mnemonic と Software Key は別管理対象で、Core が継続管理主体である。 |
| UI / Application は継続管理主体にならず、Account 選択・表示・ユーザー操作を担う | §2.2〜§2.4、UC-006、UC-011、NFR-002〜NFR-003、SEC-010〜SEC-017 | 概ね反映。明示的 export の外部コピーは受領側、Core 内原本は Core と分けている。 |
| Network / Transaction 構築等は Core 外 | §2.4、UC-006、FR-009、AC-023 | 反映。Transaction 意味説明・確認 UI の責任は UI / Application、Transaction 構築・Network は Core 外である。 |
| Symbol / NEM と Mainnet / Testnet を区別する | §2.1、§3.1〜§3.3、UC-009、FR-013〜FR-018、DR-005〜DR-008、AC-013、AC-033、AC-047 | 反映。Chain と Network の責任単位、互換性基準、mismatch / unsupported reject が追跡できる。 |
| 通常処理で Core 管理下秘密情報を返却・共有しない | §2.3、UC-001、UC-005、UC-011、FR-007、FR-022〜FR-023、SEC-010、SEC-015、AC-025〜AC-026、AC-032、AC-041〜AC-043 | 反映。初回 handoff と個別 export だけが明示的アクセスの例外である。handoff の成立契約は RR-022。 |
| Host compromise 防止保証と Core の秘密情報非開示を分ける | §2.2、§2.4、NFR-004、SEC-020、AC-024、AC-040 | 反映。Desktop / Mobile / Web に共通の非目標と、Core / Binding の非開示責任が併記されている。 |

### Security / Trust Boundary / Responsibility 評価

Concept Security Invariant の6項目は、次のとおり Requirements へ具体化されている。

1. Mnemonic / Software Key の Core 継続管理: §2.3、DR-001〜DR-004、SEC-010、SEC-017、AC-025〜AC-026、AC-041〜AC-042。
2. UI / Application の一時仲介は管理責任を移転しない: §2.3、§2.4、SEC-017。
3. 通常処理での Core 外返却・共有禁止: FR-007、FR-022〜FR-023、SEC-010、SEC-015、AC-025〜AC-026、AC-032。
4. Desktop / Mobile / Web で原則を変えない: §2.2、NFR-004、SEC-020、AC-024、AC-040。
5. Host compromise 防止保証との区別: §2.4、SEC-020、AC-024。
6. Explicit secret access は通常処理と別扱い: §2.3、UC-001、UC-011、SEC-010、SEC-021、AC-025〜AC-026、AC-034、AC-041〜AC-043。

Core は秘密情報の管理、処理単位認証、鍵利用、署名および結果を担い、UI / Application は Account 選択、内容提示、利用者承認、明示的 secret access の意思確認を担う。Binding、Browser、OS、host process の侵害防止は Core の保証外だが、Binding / Core の通常非開示責任は放棄されていない。

### Mnemonic / Software Key Lifecycle 評価

Mnemonic は生成、既存 Mnemonic による Profile 復元、取込み、Profile の root secret としての継続管理、個別 export、Profile 削除まで追跡できる。HD Wallet の Mnemonic と Derived Software Key は別の管理対象であり、Profile と Software Key の関係も明示されている。初回 backup handoff の成功条件だけ RR-022 に残る。

Software Key は HD Wallet 由来の Derived、外部 import の Imported、Core 内生成の Generated を同じ利用ライフサイクルで扱う。Chain 固定、origin、duplicate、creation、import、derivation、storage、処理単位認証、signing、個別削除、Profile 削除が各要件へ追跡でき、Derived を含む registration failure の atomic / fail-closed もある。

### Authentication / Authorization 評価

Profile password は Core が処理単位ごとに認証し、認証結果を次の秘密情報処理へ持ち越さない。継続的 Unlocked state、Application unlock session、password possession だけによる secret export または利用者承認は認めない。Profile 作成、鍵登録、署名、password 変更、鍵削除、Profile 削除、secret export に認証条件がある。認証方式、KDF、token および具体 API は下流委譲として適切である。

### Signing Responsibility 評価

Account 選択、Transaction 内容の提示および利用者の明示的承認は UI / Application の責任である。Core は指定 Account / Software Key、処理単位 password、署名対象 data を受けて署名し、結果を返す。password の正しさは利用者承認とは別 property である。Core に Transaction の意味説明、利用者意思の推測、確認 UI、Transaction 構築の責任はない。Requirements から blind signing 防止 UI の責任が Core へ逆流する解釈は生じない。

### Chain / Network 評価

Requirements は Chain を Symbol / NEM の区分、Network を Mainnet / Testnet の区分として扱う。Profile は Network 固定・Chain 非固定、Software Key は Chain 固定、Account はその Software Key を Chain と Profile Network 上で利用する。Derived / Imported / Generated 全経路に同じ組合せ条件を適用し、unsupported、Network mismatch、Chain mismatch、不正組合せは状態不変・秘密情報非返却・fallback / 暗黙 conversion なしで reject する。具体的 Chain ID、Network ID、derivation path は下流へ委譲されている。

### Failure / Fail-Closed 評価

wrong password、破損・認証失敗・整合性不備 Store、unsupported version、unknown data の安全な保持不能、invalid import、duplicate、Derived / Imported / Generated の登録失敗、password 変更、削除、handoff、secret export、Chain / Network mismatch が failure 条件として現れる。状態変更は成功時に全体反映し、失敗・中断時は既存 Profile / Software Key を壊さず、秘密情報を返さず、曖昧な fallback を行わない。初回 handoff の成功成立条件の不足は RR-022、migration の v1 方針の不足は RR-026 である。

### Persistence / Migration 評価

Mnemonic / Software Key の暗号化保存、平文永続保存禁止、Store version の識別、unsupported / corrupt / inconsistent data の非利用、unknown data の意味推測禁止、unsafe extension の reject、deterministic / stable / interoperable な対応範囲、読込み・migration 失敗時の既存状態不変および暗黙 migration 禁止は定義されている（§8 DR-009、AC-018、AC-045、§10）。ただし、migration は「行う場合」とされ、v1 が提供するか否か、どの責任主体・操作範囲か、成功条件が未確定である（RR-026）。

### Requirements → Design / Specification 委譲評価

委譲が適切な事項は、API / ABI、型、保存 schema、wire format、CBOR key、具体 error、暗号方式、KDF、nonce / salt、memory layout、zeroize、ownership / lifetime、derivation path、内部 state machine、Binding 実装、UI layout および handoff transport である。現行 Requirements はこれらの詳細を直接要求せず、外部性質・責任・failure result を残している。

RR-022 の handoff 成功契約と RR-026 の migration の有無・責任・外部成功条件は、callback や migration algorithm の問題ではなく、後続設計が選択すべき製品制約である。そのため現状の §12.2 への委譲は過剰な下流委譲である。

### 非エンジニアを含む可読性評価

§1、§2.1〜§2.4、UC、用語、責任境界および受入条件により、製品目的、Core の責任、Application の責任、Mnemonic / Software Key の関係、通常処理と explicit access の違いを概ね読者が追跡できる。`Chain`、`Network`、`Profile`、`Software Key`、`Derived / Imported / Generated` は本文内で一貫している。RR-022 の handoff 成功条件と RR-026 の migration の v1 位置付けは、非エンジニアが製品として何を保証するかを確定しにくくする。

## 13. Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 要求の完全性・検証可能性 | 条件付き合格 | MUST、主体、主な成功結果、秘密情報非開示、状態不変および受入条件は広く存在する。handoff の成功成立条件と migration の v1 方針は RR-022 / RR-026。 |
| Concept → Requirements traceability | 条件付き合格 | Core 継続管理、通常非開示、explicit access、共通環境、Chain / Network 分離は追跡できる。handoff 契約と migration 選択に残りがある。 |
| Protected assets / confidentiality | 合格 | Mnemonic、Software Key、derived secret、Profile password、Store material、signing authority を認識し、通常結果・診断・失敗で非開示とする。 |
| Integrity | 条件付き合格 | 状態変更の atomic / fail-closed、Store の corrupt / unknown / unsupported 拒否、Chain / Network mismatch 拒否はある。migration の成功・失敗契約は RR-026。 |
| Authentication / Authorization | 合格 | 処理単位 Profile password、Core 認可、明示的 export、署名承認の分離、認証結果の持越し禁止がある。 |
| Mnemonic lifecycle | 条件付き合格 | 生成、復元、取込み、継続管理、HD root、export、削除および外部コピー責任はある。初回 handoff の成立条件が RR-022。 |
| Software Key lifecycle | 合格 | Derived / Imported / Generated、origin、Chain、duplicate、registration、storage、signing、削除および失敗安全性を追跡できる。 |
| Signing responsibility | 合格 | UI / Application の提示・承認と Core の認証・署名を分離し、Core が Transaction 意味判断・UI を担わない。 |
| Chain / Network separation | 合格 | Symbol / NEM、Mainnet / Testnet、Profile / Software Key / Account の関係および reject 条件がある。 |
| Failure / Fail-Closed | 条件付き合格 | 主要 failure は状態不変・秘密情報非返却・fallback なしで扱う。RR-022 / RR-026 の未確定契約を除く。 |
| Persistence / Migration | 条件付き合格 | version、unsupported、unknown、corrupt、deterministic / interoperability、暗黙 migration 禁止はあるが、migration の v1 可否・責任・開始条件が未決定。 |
| Trust / responsibility boundary | 条件付き合格 | Core、Binding、UI / Application、Browser / OS / host、Network、Transaction の境界はある。handoff の確定判定主体だけ RR-022 に残る。 |
| Requirements フェーズ境界 | 合格 | API、ABI、schema、wire、Rust type、具体暗号、memory、内部 state machine、具体 UI を要求せず、外部性質を下流へ委譲している。 |
| 非エンジニアを含む可読性 | 条件付き合格 | 用語と責任は説明可能だが、handoff と migration の製品保証範囲が未確定である。 |

## 14. Validation Results

実行結果は次のとおりである。

- `git status --short` でレビュー開始時に変更がなく、作成後の変更が本レビュー成果物だけであることを確認した。
- Requirements 候補、Requirement ID 定義、参照 ID、レビュー finding ID、見出し構造、相対リンクを確認した。
- Finding status table は RR-001〜RR-029 の29件を一度ずつ定義し、Requirement ID の重複定義はなく、成果物内の FR / NFR / SEC / DR / AC 参照はすべて現行 Requirements に存在することを確認した。
- Concept Security Invariant と Requirements の traceability を本文の対応箇所で確認した。
- `git diff --check` および `git diff --cached --check` は成功した。
- `git diff --cached --name-only` は `docs/reviews/requirements/requirements-review-007.md` だけを示した。
- コード、Binding、Specification、Test を変更していないため、Rust formatter、clippy、cargo test、WASM check は実行対象外とした。

未確認範囲は、下流の API / ABI、具体暗号、Store wire format、外部 Node、実装、fixture および実際の Application / UI の handoff である。これらは今回の Requirements 判定で不足を補う根拠にはしていない。

## 15. Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と課題 | 合格 | §1 に Core の目的、対象環境、管理対象がある。 | なし |
| 2. 利用者と責任 | 条件付き合格 | Core、UI / Application、Binding、Browser / OS、Network、Transaction の責任は明確。初回 handoff の成功判定主体が RR-022。 | RR-022 |
| 3. 対象範囲 | 合格 | Profile、Mnemonic、Software Key、Account、Symbol / NEM、Mainnet / Testnet、Desktop / Mobile / Web を区別する。 | なし |
| 4. 要件と制約 | 条件付き合格 | 機能、security、互換性、failure safety、下流委譲はある。migration の v1 方針が RR-026。 | RR-026 |
| 5. 受入条件 | 条件付き合格 | 主な処理の合否は観測可能。handoff 成功の外部事実と migration 選択を一意に判定できない。 | RR-022、RR-026 |
| 6. 内部整合性 | 条件付き合格 | Security Invariant と責任境界は整合する。§11 の「要件レベルの未決定事項はない」と handoff / migration の実質的未決定が不整合である。 | RR-022、RR-026 |
| 7. 不可欠な前提 | 条件付き合格 | Core が Store と秘密情報を管理する前提はある。handoff 受領の成立および migration の提供範囲が未確定である。 | RR-022、RR-026 |
| 8. Concept 整合性 | 合格 | Concept review 009 は `CONCEPT READY`。Security Invariant、通常非開示、explicit access、host compromise 非目標は Requirements に引き継がれている。 | なし |

Review Gates の formal 判定は `Critical` がないため `READY` である。ただし、RR-022 / RR-026 は安全な Design の入力として先に解消すべき Major であり、今回の依頼でいう `REQUIREMENTS READY` はまだ宣言しない。

## 16. Remaining Risks and Open Decisions

### Open Decisions

- RR-022: 初回 Mnemonic handoff について、誰を受領主体とし、どの外部事実で受領完了とみなし、誰が Profile 作成成功を確定するか。失敗・中断・受領未確認時に Profile をどう扱うかは一部定義済みだが、成功契約が未確定である。
- RR-026: v1 で Core 管理下 Store の migration を提供するか提供しないか。提供する場合の担当主体、対象 version の範囲、開始条件、成功条件および failure 時の既存状態保持を Requirements で確定する必要がある。

### Remaining Risks

- RR-022 が残ると、初回 Mnemonic の外部受領前に Profile を成功状態とする実装と、受領確認まで成功させない実装を同じ Requirements が許容する。
- RR-026 が残ると、同じ unsupported / older Store に対して reject と explicit migration の異なる製品動作を、どちらも Requirements 違反なく設計できる。
- host compromise 防止は Core の保証外であるため、下流の Binding / Application 仕様でも Core の通常非開示責任と混同しない必要がある。これは現行 Requirements の欠落 finding ではない。
- 明示的 export の具体的な UX、受渡し方式および memory handling は下流で決める必要がある。現行 Requirements は v1 で個別 export を許可する判断と条件を定義しているため、下流詳細の未定義は finding ではない。

## 17. Automatic Changes

Requirements、Concept、Design、Specification、Implementation、Test、README、Skill 本体および過去レビュー成果物は変更していない。新規に追加したのは [`requirements-review-007.md`](requirements-review-007.md) だけである。

## 18. Final Decision

`READY`（formal Review Gate）

RR-006、RR-013、RR-020、RR-023、RR-024、RR-025、RR-027、RR-028、RR-029 は現行 Requirements の実体から解消と判定する。RR-022 と RR-026 は更新後も product-level の成立条件・責任・v1 方針が条件付きまたは下流委譲のまま残っているため Reopened とする。新規 finding はない。Critical はないため Reviewer Skill 上の Gate は `READY` だが、Major の残存により `REQUIREMENTS READY` はまだ宣言せず、Requirements 修正後に Design review へ進める。
