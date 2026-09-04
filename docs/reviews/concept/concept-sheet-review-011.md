# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- Reviewed branch: `agent/react-native-support`
- Current HEAD before review work: `576d233835ce1b7a1073e2bf6072c9572cd70451`
- Reviewed HEAD: `bb529efd19c4e0b45f596a0588a4bb2a3f9a1db7`
- 成果物: `docs/reviews/concept/concept-sheet-review-011.md`
- Review Scope: React Native Concept Sheet 変更 commit の Concept Sheet §1〜§13 全体を対象に、React Native Android / iOS の追加、Desktop / Node.js / Browser / Browser Extension との platform coverage、単一 repository・単一 npm package、共通 Rust Core、runtime / platform 差異の隠蔽方針、公開 API の一貫性、Security Boundary、既存 v1 scope・out-of-scope・責任境界および過去 finding の回帰を確認した。
- Reviewed content の固定: 本レビューの Concept 本文は、現在 branch の downstream 文書や現在 HEAD の Requirements / Requirements Review / Design の内容ではなく、`git show bb529efd19c4e0b45f596a0588a4bb2a3f9a1db7:docs/consept/concept-sheet.md` で取得した本文に固定した。
- 未確認範囲: Requirements、Design、Specification、Implementation、API、schema、wire format、暗号方式、KDF / Cipher、保存形式、Binding 実装、runtime resolution、ABI、thread / async、詳細 UX、CI および release workflow の適合性。これらは Concept の欠陥を判定する根拠として扱っていない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。
- Reviewer A（品質と論理）: 完了。React Native 追加後の説明順、目的・課題・価値・成功条件の因果、Mobile / Web の用語、単一 Core 方針、v1 と将来候補の分離および Concept の抽象度を確認した。
- Reviewer B（課題と価値）: 完了。対象ユーザー、Desktop / Node.js / Browser / Browser Extension / React Native Android / iOS の利用場面、共通 Rust Core による価値、利用環境追加による製品像の変化の有無を確認した。
- Reviewer C（境界と成立性）: 完了。Core と UI / Application の責任境界、Mnemonic / Software Key / private key / signing の管理責任、通常処理での秘密情報非開示、platform 差異、v1 対象外、前提およびリスクを確認した。
- Phase 0: 完了。レビュー対象を `bb529efd...` 時点の Concept Sheet に固定し、成果物の出力先、既存 finding ID および Concept フェーズの境界を確認した。
- Phase 1: 完了。Reviewer A / B / C の観点で Concept の品質、価値、境界および成立性を確認した。
- Phase 2: 完了。React Native 変更差分、既存 Concept Review 001〜010、過去 finding の状態、再発候補および後工程への委譲を確認した。
- Chair 統合: 完了。Concept の解釈・viability・boundary に直接影響する候補だけを採用基準に照合し、新規 formal finding は採用していない。

## Evidence Used

| 種別 | Reviewed Documents / 参照箇所 | 用途 |
| --- | --- | --- |
| 主対象文書 | `bb529efd19c4e0b45f596a0588a4bb2a3f9a1db7:docs/consept/concept-sheet.md` §1〜§13 | React Native Android / iOS の意味、platform coverage、単一 repository・単一 npm package、共通 Rust Core、責任境界、Security Invariant、v1 scope、out-of-scope、リスク、未決定事項および Requirements への引継ぎを確認 |
| React Native Concept 差分 | `bb529efd19c4e0b45f596a0588a4bb2a3f9a1db7` の Concept Sheet 差分 | Browser / Browser Extension の明確化、Mobile の定義、React Native Android / iOS の v1 対象化、共通 Core・security invariant・success condition・risk・後工程委譲の追加が Concept の抽象度を越えていないか確認 |
| 過去レビュー | `docs/reviews/concept/concept-sheet-review-001.md`〜`concept-sheet-review-010.md` | `CR-001〜CR-012` および `CS-001〜CS-005` の初出、解消状態、完了条件、既存 Gate 判定および finding ID の連続性を追跡 |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、Concept フェーズ境界、変更範囲、未決定事項、レビューおよび docs-only 検証方針を確認 |
| Concept Review 手順 | [`SKILL.md`](../../../.agents/skills/concept-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/concept-review/reviewers.md)、[`review-gates.md`](../../../.agents/skills/concept-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/concept-review/output-format.md) | Reviewer A / B / C、finding 採用基準、Severity、Gate、Review Result および成果物形式を確認 |
| 共通レビュー手順 | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、過去 finding 追跡、Deferred Findings、検証および Git 運用を確認 |
| Phase Context | なし | `AGENTS.md` に Concept の Context 登録がないため、Phase Context は使用していない |

## Review Result

`READY`

## Review Gate Rule

Concept Review Skill の rule を適用した。Concept Review の7つの Gate（明確さ、課題、対象ユーザーと価値、v1 の境界、責任境界、内部整合性、成立性）がすべて合格した場合は `READY`、いずれかが不合格の場合は `REVISE CONCEPT` とする。Gate 不合格に相当する Critical finding が必要であり、Major / Minor の改善事項だけでは Gate を不合格にしない。

## Findings Summary

正式 finding は確認されなかった。React Native Android / iOS の追加は、既存 Concept の目的、対象ユーザー、v1 scope、Core の責任、UI / Application の責任、Security Invariant および out-of-scope を変更せずに、既存の利用環境の定義と coverage を具体化している。

| 区分 | 件数 |
| --- | ---: |
| Open Critical | 0 |
| Open Major | 0 |
| Open Minor | 0 |
| Reopened | 0 |
| New finding IDs | なし |

## Finding Status

Formal findings: なし。新規、Open、Reopened の Critical / Major / Minor finding は確認されなかった。

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| CR-001〜CR-009 | 過去の各 Severity | Resolved / 回帰なし | concept-sheet-review-001〜003 | v1 能力・対象外・責任境界・対象ユーザー・用語・価値・成功条件・取込み境界を、React Native 追加後の §1、§2、§4〜§8、§10、§12〜§13 で再確認した。 |
| CR-010〜CR-012 | 過去の各 Severity | Resolved / 回帰なし | concept-sheet-review-004〜006 | Mnemonic の継続管理、課題・仮定・価値仮説の分離、`Mnemonic → HD Wallet → Software Key → Account` と Core / UI の責任関係を再確認した。 |
| CS-001〜CS-003 | Major / Minor | Resolved / 回帰なし | concept-sheet-review-006〜007 | Mnemonic と Software Key の関係、課題分類、鍵モデル、Account 利用および Core / UI の境界が維持されている。 |
| CS-004〜CS-005 | Critical | Resolved / 回帰なし | concept-sheet-review-008〜009 | 非エンジニア向けの製品説明、用語、Security Invariant、通常処理と明示的アクセスの区別、ホスト侵害への保証限界が維持され、React Native 追加による再発はない。 |

## Open Findings

なし。現時点で Concept Sheet の解釈、viability、v1 boundary または responsibility boundary を阻害する Open finding はない。

## Reopened Findings

なし。既存の Resolved finding `CR-001〜CR-012` および `CS-001〜CS-005` を再度 Open にする根拠は確認されなかった。

## New Finding IDs

なし。既存 ID と重複する新規 finding は発行していない。

## Platform Coverage

合格。§1、§4、§5、§7、§8、§10、§12〜§13 で、次の関係を一貫して追跡できる。

- `Desktop` は既存の desktop wallet 利用環境として扱われる。
- `Node.js` は Node.js Application の利用環境として扱われる。
- `Browser` は Web Application の実行環境として扱われる。
- `Browser Extension` は Browser と同じ Web の利用形態として扱われ、独立した別の製品ラインや別の Wallet Core にはなっていない。
- `Mobile` は `React Native Android / iOS` を意味する Concept 上の呼称として定義されている。
- v1 の対象列挙では、曖昧な `Mobile` のみではなく `React Native Android / iOS` が明記されている。

React Native の実装方式を Concept で固定しておらず、対象環境の追加が別 Core や別の責任境界を導入する記述にもなっていない。

## Single Repository / Single npm Package

合格。§1、§7、§8、§12〜§13 は、repository を `nemnesia/symbol-nem-wallet-core` に、npm package を `@nemnesia/symbol-nem-wallet-core` に統一することを維持している。React Native 専用 npm package を作らないこと、Node.js / Browser / Browser Extension / React Native Android / iOS から同じ Rust Core を利用すること、runtime / platform 固有差異を可能な限り package 内部へ隠蔽する方向が、Concept の製品方針として自然に記載されている。

一方、directory layout、exact artifact packaging、package exports、runtime 条件、autolinking または distribution artifact は固定されていない。これらを未定義であること自体の Concept finding とはせず、後工程への引継ぎ事項として扱う。

## Shared Rust Core Boundary

合格。Concept は各 runtime 向けに Wallet Core を個別実装する方針を採らず、単一の Rust Core を共通利用する方針を維持している。Mnemonic、private key、Software Key、HD Wallet 由来の導出、signing、secret management および暗号処理に相当する Core の責任を React Native 側へ移していない。

React Native 側に関する記述は、共通 Core を各利用環境から利用するという製品境界、ならびに runtime / platform 差異を package 内部へ隠蔽する方向に留まる。具体的な platform integration、data transfer、invocation、error propagation、binding 実装、memory / erase 方式は Concept で決められていない。したがって、binding が Core の validation や security boundary を bypass できるという要求も導入されていない。

## Public API Concept

合格。platform 固有に分ける必然性がない公開 API について、一貫した利用モデルを目指すという Concept は、複数 runtime に共通する利用者価値と責任境界を示す高レベルな方針として適切である。Android / iOS 差異だけを理由に application-facing model を分岐する記述、React Native 対応だけを理由に公開 API surface を増やす記述、exact API signature・型・TypeScript declaration・error code を固定する記述はない。

platform 固有 API が必要になる場合の具体的な判断基準や API 契約は、Concept の責務ではなく Requirements / Design / Specification へ委譲されている。

## Security Boundary

合格。§1、§3、§5、§7、§8、§9〜§10、§12〜§13 の Security Invariant は、Mnemonic と Software Key を Core が継続管理し、通常処理で Core 管理下の秘密情報を Core 外へ返却・共有しないという責任を維持している。秘密鍵または Mnemonic の取込み時に UI / Application が一時的に入力を仲介する場合があるが、それは取込み後の Core 管理責任の移転ではない。

Desktop、Node.js、Browser / Browser Extension、React Native Android / iOS の環境差異によって Core の秘密情報管理責任や通常処理での非開示原則を変えない。明示的な recovery / display / export は通常処理と区別され、権限、認証、UX、transport および詳細なライフサイクルは後工程へ委譲されている。なお、host compromise 自体を Core が防止する保証ではないという限界も維持されている。

## Concept Scope

合格。React Native 追加は「誰が、どの利用環境で、どの共通 Core を利用するか」という Concept レベルに留まっている。対象本文には、JSI、TurboModule、JNI、Kotlin、Swift、Objective-C++、Android NDK、AAR、XCFramework、CocoaPods、Metro、exact package exports、exact runtime resolution、ABI、thread / async implementation、exact API signature、CI job または release workflow implementation の決定はない。

React Native 固有の実装方式、minimum version、OS/API level、CPU architecture、Expo、New Architecture、具体的な release matrix 等は、Concept の未決定事項または次工程への委譲として扱われている。これらを Concept の欠陥や未解消 finding とはしていない。

## Existing Concept Integrity

合格。React Native の coverage 追加によって、既存 Concept の次の意味に semantic regression は確認されなかった。

- `Mnemonic` は Core 管理下の秘密情報であり、`Software Key` と同一視されず、取込み後も Core が継続管理する。
- `HD Wallet` から導出される秘密鍵を Software Key として扱い、Account の利用・選択と秘密情報の継続管理を分離する関係が維持されている。
- `Profile`、Mnemonic、Software Key の具体的な管理単位・保存・保護・消去・詳細ライフサイクルは、既存どおり後工程へ委譲されており、React Native 追加で別の管理モデルを導入していない。
- Core は秘密情報の生成、復元、導出、管理および署名利用の責任を担い、UI / Application はユーザー操作、表示、設定、Account の選択および入力の一時仲介を担うという境界が維持されている。
- v1 は Software Key 管理 Core の範囲であり、Hardware Wallet、External Signer、OS-backed Key、Watch-only、SNIF 連携等の対象外・将来候補との境界を変更していない。
- Symbol / NEM、Chain / Network、Mainnet / Testnet の区別を共通化によって曖昧にしていない。

## Requirements Follow-up

Concept Gate を通過するための Concept 修正は不要である。次工程では、Concept が明示した以下の引継ぎを、Concept の方針を変えずに具体化する必要がある。

- Requirements: Desktop、Node.js、Browser、Browser Extension、React Native Android / iOS の support matrix と検証可能な外部要求、共通利用モデル、Core の security responsibility、secret handling、failure semantics、non-regression、受入条件および後続 decision gate を定義する。
- Requirements / Design: minimum React Native version、minimum Android API level、minimum iOS version、対応 architecture、React Native New Architecture、Expo compatibility、supported browser baseline 等の support decision の責任主体と決定時点を明確にする。
- Design / Specification: binding の選択、runtime resolution、package 内部での差異隠蔽、公開 API 契約、data transfer、ownership、error mapping、thread / async、secret lifetime / zeroization の具体化を行う。
- Release planning: 単一 npm package と各対象環境の release / distribution / evidence matrix を、Requirements と Design の決定に従って定義する。

上記は Concept Review の formal finding ではなく、Concept §12〜§13 が既に示している後工程への引継ぎである。

## NEEDS USER DECISION

Concept Review の Gate 判定を妨げる追加の user decision はない。上記の React Native support matrix、binding、Expo / New Architecture、package distribution および release evidence の具体値は未決定事項だが、Concept で決めるべき事項ではなく、Requirements / Design / Release planning の decision gate で決定する。

## Resolved Findings

既存の `CR-001〜CR-012` および `CS-001〜CS-005` は、今回の reviewed content で再発していない。

- `CR-001〜CR-009`: v1 scope、out-of-scope、責任境界、対象ユーザー、用語、価値、成功条件および取込み境界を確認した。React Native は既存の対象環境を具体化しただけで、これらの意味を変更していない。
- `CR-010 / CS-001`: Mnemonic の Core 継続管理と Software Key との区別を確認した。
- `CR-011 / CS-002`: 実際の利用者課題、プロジェクト上の仮定、未検証の価値仮説の分離を確認した。
- `CR-012 / CS-003`: `Mnemonic → HD Wallet → Software Key → Account`、Core の導出・管理責任および UI / Application の Account 選択責任を確認した。
- `CS-004`: 非エンジニアにも追える製品像、主要用語、v1 scope および責任境界を確認した。
- `CS-005`: Mnemonic / Software Key の Security Invariant、一時的な入力仲介、通常処理での非返却・非共有、環境差異によらない原則および host compromise への保証限界を確認した。

既存 finding を勝手に削除・改名せず、今回の artifact では継続性と再発なしの状態だけを記録した。

## Upstream Feedback

なし。Concept より上流の正式資料または decision の不足・矛盾を、今回の判定根拠として確認していない。

## Deferred Findings

Formal finding はない。以下は本文が未決定事項または次工程への引継ぎとして明示しており、Concept の欠陥として扱わない。

- React Native / Android / iOS の minimum version、OS/API level、device / simulator architecture および Browser baseline。
- React Native New Architecture、Expo compatibility、具体的な binding 方式、runtime resolution、package exports、autolinking および distribution artifact。
- API、型、data format、ownership、error、暗号、保存、memory retention / erase、secret lifetime / zeroization および詳細な処理順序。
- explicit recovery / display / export の可否、認可条件、UX、transport および host security の強度。
- CI job、release workflow、release matrix および supply-chain evidence の具体的な実装。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | 合格 | §2 が実行環境ごとの秘密情報処理の分散と責任境界の不一致を課題として示し、§3、§6、§8 が共通 Core による責任集約と共通利用の価値・成功条件を示している。 |
| 対象ユーザー | 合格 | §4 が Symbol / NEM ウォレット開発者を対象とし、Desktop / Node.js / Browser / Browser Extension / React Native Android / iOS を含む利用場面を追跡できる。 |
| Platform Coverage | 合格 | Browser Extension は Browser を含む Web の利用形態、Mobile は React Native Android / iOS と定義され、別の consumer target や別 Core として復活していない。 |
| 単一 repository・単一 package | 合格 | `nemnesia/symbol-nem-wallet-core`、`@nemnesia/symbol-nem-wallet-core`、React Native 専用 package を作らない方針および package 内部への差異隠蔽方針が明記されている。 |
| Shared Rust Core | 合格 | 各 environment で個別 Wallet Core を実装せず、暗号処理、key derivation、signing、Mnemonic / private key / secret management を共通 Rust Core に集約している。 |
| Public API Concept | 合格 | platform 固有に分ける必然性がない公開 API は一貫した利用モデルを目指すが、exact API contract は固定していない。 |
| Security Boundary | 合格 | Core の継続的な secret management、通常処理での非開示、一時的な入力仲介は責任移転でないこと、環境差異に依存しない invariant および host compromise の保証限界が維持されている。 |
| v1 の境界 | 合格 | Software Key 管理 Core を v1 とし、Hardware Wallet、External Signer、OS-backed Key、Watch-only、SNIF 等を対象外または将来候補として分離している。 |
| 成功条件・成立性 | 合格 | §8 が共通 Rust Core、全対象 environment、秘密情報管理責任、非開示、Symbol / NEM と Chain / Network の区別を success condition として追跡でき、§9〜§10 が成立条件と限界を示している。 |
| Phase Boundary | 合格 | Concept は目的、対象、価値、scope、責任、原則、制約および risk を扱い、binding、API、schema、暗号、保存、CI / release implementation を後工程へ委譲している。 |

## Validation Results

- 実施: `git rev-parse HEAD` により、レビュー開始時の current HEAD が `576d233835ce1b7a1073e2bf6072c9572cd70451` であることを確認した。
- 実施: `git cat-file -t bb529efd19c4e0b45f596a0588a4bb2a3f9a1db7` および `git show bb529efd19c4e0b45f596a0588a4bb2a3f9a1db7:docs/consept/concept-sheet.md` により、reviewed HEAD と対象 Concept 本文を確認した。
- 実施: React Native Concept Sheet 変更 commit の差分を確認し、Mobile = React Native Android / iOS、Web = Browser / Browser Extension、単一 repository・単一 npm package、共通 Rust Core および責任境界の追加を追跡した。
- 実施: `concept-sheet-review-001.md`〜`concept-sheet-review-010.md` を確認し、既存 finding ID `CR-001〜CR-012` / `CS-001〜CS-005` の連続性、Resolved 状態および review 011 の欠落を確認した。
- 実施: `AGENTS.md`、Concept Review Skill 一式および共通 review playbook / output format を確認した。
- 実施: reviewed content が13章で構成され、Mobile / Web の定義、v1、Security Invariant、out-of-scope、未決定事項および次工程引継ぎの internal reference を確認した。
- 未実施: Rust formatter、clippy、cargo test、WASM check、Native / Node / Browser / React Native の build・test、Android / iOS 検証、release / supply-chain 検証。今回の変更およびレビュー対象は Concept Review artifact だけであり、ユーザー指定によりフルテストを実施していない。
- 未実施: Requirements / Design / Specification / Implementation の適合性検証。今回の reviewed content として現在 branch HEAD の downstream 文書を混同しないため、Concept Review の根拠にしていない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 明確さ | 合格 | §1、§4〜§5、§7 に製品像、platform 用語、鍵モデル、v1 scope、対象外および Core / UI / Application の役割がある。 | なし（CS-004 回帰なし） |
| 課題 | 合格 | §2 に実行環境ごとの秘密情報処理の分散、責任境界の不一致および Symbol / NEM・Mainnet / Testnet の区別という課題がある。 | なし |
| 対象ユーザーと価値 | 合格 | §4、§6、§8 にウォレット開発者、各対象 environment、共通 Core に責任を集約する価値および成功条件がある。 | なし |
| v1 の境界 | 合格 | §7 が Desktop、Node.js、Browser / Browser Extension、React Native Android / iOS の v1 対象を示し、§7・§11 が対象外・将来候補を分離している。 | なし（CR-001 回帰なし） |
| 責任境界 | 合格 | §7 の Security Invariant が Mnemonic / Software Key の Core 継続管理、一時仲介、通常処理での非返却・非共有、environment 非依存の原則および host compromise の保証限界を示している。 | なし（CS-005 回帰なし） |
| 内部整合性 | 合格 | React Native の追加は対象 environment と共通利用方針を拡張するが、Core の責任、UI / Application の責任、v1 scope、out-of-scope および既存の鍵モデルを変更していない。 | なし（CR-001〜CR-012、CS-001〜CS-005 回帰なし） |
| 成立性 | 合格 | §9〜§10 がポータブル Rust Core の前提、environment / platform 差異による実装・レビュー範囲の増加、binding 境界の risk および host security の限界を示しており、Concrete implementation を Concept の事実として固定していない。 | なし |

全 Gate 合格。Concept Review Gate は `READY` とする。

## Remaining Risks and Open Decisions

- React Native Android / iOS を含めることで、environment・platform 差異の implementation / review scope と binding 境界の risk は増加する。Concept は秘密情報管理ロジックを environment ごとに別実装しない方針と、binding 境界の詳細を後工程へ委譲する方針を示している。
- support version、OS / API level、architecture、New Architecture、Expo、Browser baseline、runtime resolution、package distribution、secret lifetime / erase、error semantics および release evidence は未決定である。
- これらは reviewed Concept の欠陥ではなく、Requirements / Design / Specification / Release planning で decision gate と検証条件を設けるべき後工程の事項である。

## Automatic Changes

レビュー中に `docs/consept/concept-sheet.md`、Requirements、Design、Specification、Implementation、テスト、package、CI、release または既存 Concept Review artifact 001〜010 は変更していない。新規成果物として本レビュー文書のみを作成した。

## Final Review Gate

`READY`

**CONCEPT PHASE READY TO CLOSE**

`bb529efd19c4e0b45f596a0588a4bb2a3f9a1db7` 時点の Concept Sheet は、React Native Android / iOS の追加を含め、Requirements へ進むための製品目的、対象 environment、単一 repository・単一 npm package 方針、共通 Rust Core の責任、Security Boundary、v1 scope および後工程への委譲を十分に明確化している。これは React Native の具体的な implementation、support matrix、Specification または release readiness が完了したことを意味せず、それらは後続工程で確認する。
