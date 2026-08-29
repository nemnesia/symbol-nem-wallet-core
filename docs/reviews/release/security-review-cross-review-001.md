# Security Review Skill Cross Review

## Review Information

### Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/tailor-project-skills`
- Commit: `3f9541bd4e8369a8d7eb85a0570f5b26bd054f96`
- 確認日: 2026-08-29
- 成果物: `docs/reviews/release/security-review-cross-review-001.md`
- 対象: `AGENTS.md`、`review-common`、Requirements / Design / Specification / Implementation の各 Review Skill と、存在する `SKILL.md`、`reviewers.md`、`review-gates.md`、`output-format.md`、`security-checklist.md`
- 補助確認: 承認済み Requirements / Design / Specification、既存の phase review、実装・テストの構成。これらは Skill の現行責務と handoff の実在性を照合するために使用し、既存成果物の判定を本レビューへ逆生成していない。
- 未確認範囲: 外部 node / registry / network、Rust の lint・test・build、WASM runtime、Native sanitizer。今回の対象は Review Skill 群の整合性であり、コード系検証は実施しない。

### Execution Audit

- 実行モード: サブエージェントを使用しない Chair の4観点自己レビュー。未実施の agent 起動や並列レビューは記録していない。
- Reviewer A: Phase Boundary。各 Skill の上流・下流責務、委譲、normative source、upstream feedback を比較した。
- Reviewer B: Security Coverage。protected asset、secret lifecycle、signing、Wallet Store、Native / WASM、crypto、parser、memory、test の phase 適用を matrix 化した。
- Reviewer C: Traceability / Handoff。Requirements → Design → Specification → Implementation の縦方向と、Implementation → 上流の feedback 分離を確認した。
- Reviewer D: Gate / Severity / Context。Review Result、Severity、Gate、Phase Context、output / reference の整合を確認した。
- Chair 統合: 重複確認を layered review として統合し、Coverage Gap、Boundary Gap、Responsibility Duplication を分離して判定した。

### Evidence Used

| 種別 | 参照資料 | 用途 |
| --- | --- | --- |
| 共通作業指針 | [`AGENTS.md`](../../../AGENTS.md:95)、[`AGENTS.md`](../../../AGENTS.md:163)、[`AGENTS.md`](../../../AGENTS.md:203) | phase order、Source of Truth、Phase Context、下流詳細の上流逆生成禁止を確認 |
| 共通 Review Skill | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md:12)、[`output-format.md`](../../../.agents/skills/review-common/output-format.md:5) | Chair、Phase 0〜3、Context、Gate、共通成果物構成を確認 |
| Requirements Review | [`SKILL.md`](../../../.agents/skills/requirements-review/SKILL.md:35)、[`reviewers.md`](../../../.agents/skills/requirements-review/reviewers.md:13)、[`review-gates.md`](../../../.agents/skills/requirements-review/review-gates.md:3)、[`output-format.md`](../../../.agents/skills/requirements-review/output-format.md:5)、[`security-checklist.md`](../../../.agents/skills/requirements-review/security-checklist.md:7) | 要件レベルの security property、役割、Gate、適用条件を確認 |
| Design Review | [`SKILL.md`](../../../.agents/skills/design-review/SKILL.md:33)、[`reviewers.md`](../../../.agents/skills/design-review/reviewers.md:9)、[`review-gates.md`](../../../.agents/skills/design-review/review-gates.md:3)、[`output-format.md`](../../../.agents/skills/design-review/output-format.md:5)、[`security-checklist.md`](../../../.agents/skills/design-review/security-checklist.md:7) | owner、trust boundary、lifecycle、failure、invariant、下流 handoff を確認 |
| Specification Review | [`SKILL.md`](../../../.agents/skills/spec-review/SKILL.md:33)、[`reviewers.md`](../../../.agents/skills/spec-review/reviewers.md:13)、[`review-gates.md`](../../../.agents/skills/spec-review/review-gates.md:3)、[`output-format.md`](../../../.agents/skills/spec-review/output-format.md:5)、[`security-checklist.md`](../../../.agents/skills/spec-review/security-checklist.md:9) | exact external contract、crypto / persistence / binding contract、testability を確認 |
| Implementation Review | [`SKILL.md`](../../../.agents/skills/implement-review/SKILL.md:10)、[`reviewers.md`](../../../.agents/skills/implement-review/reviewers.md:5)、[`review-gates.md`](../../../.agents/skills/implement-review/review-gates.md:3)、[`output-format.md`](../../../.agents/skills/implement-review/output-format.md:5)、[`security-checklist.md`](../../../.agents/skills/implement-review/security-checklist.md:7) | actual code、secret lifecycle、crypto misuse、memory / FFI / WASM、test evidence を確認 |
| 正式資料・既存成果物 | `docs/requirements/requirements.md` §2〜§7、`docs/design/security.md` §2〜§8、`docs/design/bindings.md` §3〜§6、`docs/specifications/specification.md` §9〜§14、`docs/specifications/wallet-store-format-v1.md` §2〜§14、phase review latest files | matrix の concern が実際の対象に存在し、各 phase の委譲が成立することを照合 |

## Overall Result

### Review Result

`READY`

### Summary

4フェーズの責務モデル、security concern の適用範囲、upstream feedback の分離、Gate / Severity policy は全体として成立している。Requirements / Design / Specification は `Critical` のみを Gate failure とし、Implementation は `CRITICAL` / `HIGH` を blocking とする差異も、共通 playbook が Skill 固有 policy を許容しているため矛盾しない。

ただし、上流3フェーズでは Security Reviewer の担当は明示されている一方、security と clarity・architecture・flow・interoperability・testability の相互確認を各担当へ明示的に要求していない。この境界ギャップを `SCR-001`（Major）とした。また、Design / Specification の upstream gap を記録する output lane が下流 Deferred Findings と分離されていないため `SCR-002`（Major）、4つの `SKILL.md` の実行節に phase directory から解決できない bare `review-playbook.md` 参照があるため `SCR-003`（Minor）とした。いずれも Gate を不合格にする Critical ではない。

### Finding Counts

| Severity | 件数 | Gate への影響 |
| --- | ---: | --- |
| Critical | 0 | なし |
| Major | 2 | non-blocking。Optional Improvements へ引継ぎ |
| Minor | 1 | non-blocking。Optional Improvements へ引継ぎ |

## Phase Responsibility Model

| Phase | Security Review の問い | normative に決める範囲 | 下流へ委譲する範囲 |
| --- | --- | --- | --- |
| Requirements | What security properties are required? | protected asset、confidentiality / integrity、authentication / authorization、lifecycle property、failure safety、責任・対象境界、chain / network separation | API、field、algorithm、KDF / AEAD、nonce / salt、memory layout、zeroization method、FFI / WASM implementation、test technique |
| Design | What security architecture realizes them? | owner、trust boundary、allowed secret flow、dependency direction、signing authority、lifecycle / failure / replacement responsibility、security invariant、Specification handoff | exact API / ABI、wire format、cryptographic parameter、具体 error、pointer / memory implementation、parser / fuzz / test implementation |
| Specification | What exact security contracts must implementations follow? | external input / output / state / error、signing bytes、chain / network binding、KDF / AEAD / nonce / salt / AAD、serialization、Store、Native / WASM ownership contract、observable test condition | Rust function / module、clone / copy、zeroization、unsafe、actual library call、side-channel implementation、parser / fuzz harness |
| Implementation | Does actual code satisfy those contracts safely? | source code、binding、test、fixture、dependency feature の具体挙動。既存 invariant / safety condition を破る concrete defect | 新しい Requirement / Design / Specification、仕様の未決定の勝手な補完 |

Implementation の上流 feedback は `Implementation defect` と `Specification ambiguity / gap`、`Design feedback` を分離して Deferred Findings に置く。上流の各 Reviewer は下流不足から新しい Requirement / Design Decision / Specification policy を逆生成しない。

## Security Concern Matrix

| Concern | Requirements | Design | Specification | Implementation |
| --- | --- | --- | --- | --- |
| Protected asset / confidentiality | Mnemonic、private key、derived secret、Profile password、復号済み Store、signing authority の保護対象と公開範囲 | owner、Core / Binding / Application / storage の trust boundary、allowed secret flow | API / binding の input・output・error・persistence で secret を返してよい範囲 | actual copy、lifetime、Drop、zeroization、log / panic / error leakage |
| Secret lifecycle / ownership | generation、restoration、import、derivation、use、storage、replacement、deletion。unlock / signing は auth・failure property として接続 | 各段階の owner、activation / unlock、signing、restart / recovery、failure responsibility | auth 条件、state transition、secret output、replacement result、failure observable result | temporary representation、clone / copy、early return、partial failure、replacement / deletion / recovery の実挙動 |
| Authentication / authorization / signing authority | secret access、signing capability、Account 選択、delete / replace / restore の権限 | signing boundary、Core の authority、Application の approval / transaction meaning 責任 | target Account、key mapping、signing condition、wrong account / unauthorized result | 実際の key selection、arbitrary signing、wrong account / chain / network、signature result |
| Chain / network / signing bytes | Symbol / NEM と Mainnet / Testnet の混同を防ぐ property | chain / network を跨ぐ責任、Profile / Software Key / Account 境界 | exact signing target、canonical bytes、domain、chain / network binding、encoding | actual byte computation、serialization、wrong context、replay / substitution、interop fixture |
| Wallet Store / persistence | encrypted-at-rest、改ざん・置換・保存失敗時の保護、Store ownership | opaque boundary、Store owner、old / pending / new state、replacement / failure responsibility | version、fields、KDF、AEAD、nonce、salt、AAD、authentication、unknown value、decode / error、migration、atomic visible result | actual crypto、parser、tamper / authentication handling、partial mutation、zeroization、fuzz / vector |
| Attacker input / fail-closed / state consistency | malformed / tampered input を安全に拒否し、既存状態・secret を守る property | validation / trust transition / failure owner、fail-closed と atomicity invariant | malformed、truncated、duplicate、unknown、wrong password / network、state unchanged、error | panic / UB / resource exhaustion、actual parser、error propagation、atomicity defect |
| Native C ABI / WASM | binding が Core の secret owner / crypto authority を代替しない責任 | Application → Binding → Core の境界、opaque data、ownership transfer、binding non-authority | buffer、length、ownership、free、error、JS output / `Uint8Array`、secret output allowance | pointer validity、bounds、aliasing、allocation / free、JS copy / lifetime、unsafe、binding leakage |
| Crypto / arithmetic / side-channel / RNG | 必要な confidentiality / integrity / signing correctness の property のみ | 暗号・導出・署名を Core が所有する責任と invariant。具体方式は委譲 | 上流または protocol に根拠がある exact algorithm / parameter、nonce / salt / AAD、known expected bytes | actual primitive usage、custom arithmetic correctness、carry / reduction、timing、CSPRNG failure、nonce reuse |
| Tests / oracle / fuzz / differential | 主要 property の観測可能な受入条件 | 検証責任と下流 handoff | known vector、negative、tamper、deterministic bytes、interop 条件 | test implementation、independent oracle、known vector、fuzz、differential、secret-bearing fixture の実証 |

Requirements / Design の「具体方式を決めない」、Specification の「外部契約を一意にする」、Implementation の「実挙動を安全に検証する」は、同じ concern を異なる抽象度で確認する layered review であり、責任 duplication ではない。

## Cross-Phase Traceability

### Scope and Traceability

上流の security property は、Design の owner / boundary / invariant、Specification の observable contract、Implementation の actual safety check へ順方向に追跡できる。既存資料との照合でも、次の handoff は一貫している。

### Secret Lifecycle

| Lifecycle | Requirement | Owner / boundary | External contract | Implementation verification |
| --- | --- | --- | --- | --- |
| 生成・復元・import | FR-001〜FR-005、SEC-010、SEC-017 | Core が Mnemonic / key を管理し、Binding / Application は限定的 handoff | restore / import / pending の入力、認証、成功・失敗結果 | generation / restoration / import、validation、failure、secret output / copy |
| 導出・unlock・利用 | FR-003、FR-007、SEC-002〜SEC-004、SEC-014 | Core が導出・password 認可・利用可否を担当し、継続 unlocked state を持たない | password 条件、signing-capable state、wrong password、state unchanged | derived secret、KDF key、early return、authorization failure、lifetime |
| 署名 | FR-009、FR-013、SEC-019、SEC-021 | Core が signing authority を保有し、Application が意味判断 / approval、Binding は transport | Account / key mapping、exact payload bytes、signature、wrong chain / network result | key selection、canonical bytes、domain、arbitrary / wrong-context signing |
| 永続化・replacement | FR-006、FR-010〜FR-012、SEC-001、SEC-018 | Core が encrypted material と replacement の意味を所有、storage は opaque | KDF / AEAD / nonce / salt / AAD、version、authentication、old / new result | crypto、parser、tamper、partial mutation、atomic replacement、zeroization |
| 削除・失敗・再起動 / recovery | FR-010〜FR-012、SEC-005、SEC-013、SEC-018 | Core が失敗時の state / secret safety を担い、失われた secret の復旧責任は上位外部責任 | fail-closed、no replacement on failure、no secret output、deletion result | deletion / Drop、failure propagation、stale state、recovery path、logging |

Profile password、KDF-derived key、decrypted Wallet Store material は上表の auth、persistence、temporary lifecycle に接続されている。Requirements checklist の lifecycle 欄は unlock / signing / failure を独立の lifecycle bullet として列挙しないが、同じ concern が Authentication / Authorization と Failure Safety に明記され、Design / Specification / Implementation では明示的に接続されている。このため Coverage Gap とはしない。

### Signing Security

責任は全フェーズで次のまま変化しない。

`Application / UI (Account 選択・Transaction 意味・user approval) → Binding (raw bytes / ownership / error の橋渡し) → Core (key ownership・authorization・chain / network に対応した signing primitive) → signature result`

Requirements は指定 Account / Software Key / password / payload と SDK 互換結果を要求し、Design は Core の signing boundary と Application の意味判断を分離する。Specification は signing target、canonical bytes、chain / network、signature output を固定し、Implementation は actual key selection と byte computation、wrong account / key / chain / network、replay / substitution を確認する。上位層が Core の signing authority を代替する規則や、Binding が独自の cryptographic authority になる規則はない。

### Wallet Store Security

Requirements は秘密情報の暗号化保存、改ざん・失敗時の state 保護を定める。Design は Store を opaque として扱う boundary、Core の解釈・replacement ownership、old / pending / new の整合性を定める。Specification は Wallet Store v1 で format、version、KDF、AEAD、nonce、salt、AAD、authentication、unknown field / enum、decode / error、migration、replacement を定義する。Implementation Review は actual crypto、parser、tamper handling、zeroization、atomicity、fuzz、known vector を確認する。したがって、Store の exact detail を Requirements / Design へ逆流させず、Implementation が未定義の防御方法だけを理由に concrete security defect を無視することもない。

### Native / WASM

Requirements は Core / Binding / Application の責任境界と secret non-exposure property を定める。Design は Binding を thin boundary、Core を意味・認可・暗号の owner とし、Native / WASM の依存方向と opaque transfer を定める。Specification は C ABI の buffer / length / ownership / free / error と、WASM の `Uint8Array`、secret output、opaque data、error mapping を定める。Implementation Review は pointer validity、allocation / free、aliasing、panic crossing、JS conversion / copy / lifetime、`unsafe` を確認する。

### Custom Cryptographic Arithmetic

上流3フェーズは「custom arithmetic を禁止する」「特定 curve library を採用する」といった新しい implementation policy を発明していない。Specification は根拠のある cryptographic result / encoding / vector を契約として扱い、Implementation checklist は custom scalar / field / modular arithmetic が実在する場合に correctness、reduction、carry / borrow、timing、independent oracle、differential testing を深く確認する。したがって、具体的 arithmetic defect は仕様に防御手段が逐語的にない場合も Implementation finding とでき、反対に reviewer の方式の好みを上流 Requirement へ逆生成しない。

### Upstream Feedback

- Implementation defect: 実装が既存 Specification / Design / security invariant / safety condition に違反する場合に Implementation finding とする。
- Specification ambiguity / gap: contract 自体が不足・曖昧で実装の正否を決められない場合に Implementation defect と分離して Deferred Findings へ置く。
- Design feedback: Specification が owner、trust boundary、allowed secret flow、authorization / failure responsibility を推測する必要がある場合に `upstream Design gap` とする。
- Requirements feedback: Design で要求上の security property 不足を発見しても、Design Decision や新 Requirement として確定せず upstream gap とする。

この順序は `Implementation → Specification / Design feedback` を通常の normative source に昇格させず、正式資料の更新が必要な場合にだけ別途判断を要求する。ただし、Design / Specification の output format には upstream feedback の専用 lane がなく、下流 Deferred Findings と方向を分離する記録契約が不足している（`SCR-002`）。

## Gate / Severity Consistency

### Review Gates

| Phase | Severity vocabulary | Blocking condition | Result |
| --- | --- | --- | --- |
| Requirements | `Critical` / `Major` / `Minor` | `Critical` の New / Open / Reopened が1件以上 | `REVISE REQUIREMENTS`。Critical なしは Major / Minor があっても `READY` |
| Design | `Critical` / `Major` / `Minor` | `Critical` が Gate failure に対応 | `REVISE DESIGN`。Critical なしは `READY` |
| Specification | `Critical` / `Major` / `Minor` | `Critical` が Gate failure に対応 | `REVISE SPECIFICATION`。Critical なしは `READY` |
| Implementation | `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` | `CRITICAL` / `HIGH` の New / Open / Reopened が1件以上 | `REVISE IMPLEMENTATION`。MEDIUM / LOW のみは `READY` |

`review-common/review-playbook.md` は upstream 3フェーズの共通方針を示し、異なる Severity 体系を持つ Skill は固有 policy を適用できる。したがって Implementation の uppercase 4段階は、cross-review での `Critical` / `Major` / `Minor` と混同せず、`CRITICAL` / `HIGH` を blocking class、`MEDIUM` / `LOW` を non-blocking class として評価した。

次の矛盾は確認されない。

- `READY` と blocking finding / Required Change の同時成立を許していない。
- upstream 3フェーズで Major / Minor を自動的に Gate failure にしていない。
- Implementation で `READY` と `Required Changes: HIGH` の組合せを明示的に禁止している。
- Security checklist を独立した大量の Gate にせず、既存 Gate へ対応付けている。

### Gap Classification

- Coverage Gap: なし。重要 concern は適切な phase に少なくとも一度配置され、下流で具体化される。
- Boundary Gap: `SCR-001` と `SCR-002`。前者は上流 Board の cross-cutting security challenge、後者は upstream feedback の記録方向の明示責任が不足する。
- Responsibility Duplication: なし。same concern の property → architecture → contract → actual behavior の反復は防御的な layered review である。
- Reference defect: `SCR-003`。これは security coverage / ownership の gap ではなく、実行手順の参照表記の問題である。

## Phase Context Consistency

`AGENTS.md` に実際の `Phase Contexts` 登録はなく、記載されている `Design: docs/context/design-context.md` は登録例の code block である。したがって4フェーズとも Context は未定義であり、本レビューでは Context を探索・作成・根拠利用していない。

4つの Skill と common playbook は、登録された場合だけ Context を初期理解・探索・共通前提・cross-cutting invariant の把握に使い、正式資料の代替や単独の finding / Gate 根拠にしない。正式資料との競合時は正式資料を優先し、Context から Requirement / Design / Specification を生成しない。Implementation でも Context を単独の finding 根拠にしない。4フェーズでこの policy に矛盾はない。

## Findings

### Finding Status

| ID | Type | Severity | Status | Gate impact |
| --- | --- | --- | --- | --- |
| SCR-001 | Boundary Gap | Major | New | non-blocking。上流3フェーズの Gate failure なし |
| SCR-002 | Boundary Gap | Major | New | non-blocking。upstream feedback の記録契約改善 |
| SCR-003 | Reference defect | Minor | New | non-blocking |

### Required Changes

なし。cross-review policy では Critical がなく、Implementation blocking class に該当する finding もない。

### Optional Improvements

#### SCR-001

- 対象箇所: [`requirements-review/reviewers.md`](../../../.agents/skills/requirements-review/reviewers.md:5)、[`design-review/reviewers.md`](../../../.agents/skills/design-review/reviewers.md:5)、[`spec-review/reviewers.md`](../../../.agents/skills/spec-review/reviewers.md:5)、および各 `SKILL.md` の独立レビュー実行節
- 発生条件または確認できた事実: Requirements は Reviewer C、Design は Reviewer B、Specification は Reviewer C が Security Reviewer として checklist を適用する。一方、Requirements の A / B、Design の A / C / D、Specification の A / B に対し、各自の clarity・scope・architecture・flow・consistency・testability の担当範囲で security intersection を独立に反証する指示がない。Implementation だけは「Security の責任を B だけに集中させない」とし、Protocol と Tests の Reviewer C / D に security 観点の重複確認を明示している。
- 既存の根拠: [`review-common/review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md:44) の独立レビュー・Chair 統合、上記各 phase の `reviewers.md` と `SKILL.md`。各 checklist 自体は十分な cross-cutting 観点を含むため、coverage の欠落ではない。
- 問題: 上流3フェーズでは、security property と clarity、security architecture と flow / ownership、security contract と interoperability / testability の境界を specialist Reviewer の単独判断へ委ねる余地が残る。防御的な同一 checklist の全件重複を要求する必要はないが、どの非Security Reviewerが自分の担当範囲で交差確認するかが明文化されていない。
- 影響: 仕様の完全性・設計の責任・相互運用性・検証可能性の問題が security handoff に影響する場合、独立した反証が phase 間で一貫しない可能性がある。ただし、Security Reviewer、Chair、checklist、各 Gate は存在するため、現状を Critical とするほどの coverage failure ではない。
- 必要な最小確認: 上流3フェーズの reviewer charter に、各非Security Reviewerが自分の担当領域に現れる security implication を cross-check し、重複候補は Chair が統合することを明記する。全 checklist の再適用、全 concern の全フェーズ重複、仕様外の新規 requirement は要求しない。
- 完了条件 / 再確認方法: Requirements / Design / Specification の各 reviewer matrix に security intersection の担当と Chair 統合規則が記載され、Security Reviewer 単独に閉じない実行経路が Implementation と同じ粒度で確認できること。

#### SCR-002

- 対象箇所: [`design-review/SKILL.md`](../../../.agents/skills/design-review/SKILL.md:65)、[`design-review/output-format.md`](../../../.agents/skills/design-review/output-format.md:12)、[`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md:57)、[`spec-review/output-format.md`](../../../.agents/skills/spec-review/output-format.md:12)、および共通 [`output-format.md`](../../../.agents/skills/review-common/output-format.md:16)
- 発生条件または確認できた事実: Design は Requirements 不足を `upstream gap`、Specification は Design 不足を `upstream Design gap` として扱う。しかし Design / Specification / common の `Deferred Findings` はそれぞれ下位仕様・実装・運用、実装・検証、後工程への引継ぎとして定義され、upstream の受領フェーズ、方向、status を記録する専用項目がない。Implementation だけは `Implementation → Specification / Design feedback` を Deferred Findings の値として明示している。
- 既存の根拠: [`review-common/review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md:55) の未決定事項分離、Design / Specification の upstream gap 規則、Implementation の feedback 分離規則。禁止規則自体は存在するため、downstream → upstream の normative feedback が通常経路になっているわけではない。
- 問題: Design / Specification Reviewer が upstream gap を発見した際、下流 Deferred Findings、Remaining Risks、または通常 finding のどこへ、どの方向で、どの上流フェーズへ返すかを output format だけから一意に決められない。結果として upstream feedback が下流の未決定事項へ誤分類されるか、記録されずに Chair の裁量へ残る。
- 影響: Requirement → Design → Specification の安全性・責任 handoff で、上流の不足・曖昧さを normative source に昇格させずに返す追跡性が弱くなる。Security contract の不足を下流実装の Required Change と誤認するリスクがある。
- 必要な最小確認: common または各 upstream review output format に、`Upstream Feedback`（送信元、受領フェーズ、対象根拠、non-normative status、解消条件）を追加するか、既存欄で方向を必須記録する規則を定義する。Implementation の仕様 feedback と同様、feedback は正式資料更新まで normative source にならないことを維持する。
- 完了条件 / 再確認方法: Design の Requirements gap と Specification の Design gap が、下流 Deferred Findings と別の方向・status で記録でき、次フェーズが feedback を要件・設計・仕様の確定根拠として誤読しないこと。

#### SCR-003

- 対象箇所: [`requirements-review/SKILL.md`](../../../.agents/skills/requirements-review/SKILL.md:55)、[`design-review/SKILL.md`](../../../.agents/skills/design-review/SKILL.md:77)、[`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md:76)、[`implement-review/SKILL.md`](../../../.agents/skills/implement-review/SKILL.md:55)
- 発生条件または確認できた事実: 各 Skill の資料読込順には `../review-common/review-playbook.md` があるが、実行節では `review-playbook.md` と記載されている。phase directory を基準にした場合、`.agents/skills/<phase>/review-playbook.md` は存在せず、正しい common file は `../review-common/review-playbook.md` である。
- 既存の根拠: 各 `SKILL.md` の読込順・終了節、実在確認した `../review-common/review-playbook.md`。同じ Skill 内に正しい参照もあるため、現行レビューの実行が必ず停止するわけではない。
- 問題: 実行節を独立した手順として追う利用者が、Phase 0〜3 の共通規則を解決できない。Security checklist、Gate、Chair の適用漏れを誘発し得るが、security responsibility や Gate policy 自体の欠陥ではない。
- 影響: 再現性と参照追跡性が低下する。
- 必要な最小確認: 4箇所の bare reference を `../review-common/review-playbook.md` に統一する。
- 完了条件 / 再確認方法: 各 phase directory を基準に実行節の参照が実在する common playbook へ解決でき、相対参照検証で missing path が0件になること。

### Resolved Findings

なし。本 cross-review で新規に作成した成果物であり、既存 SCR ID の再確認対象はない。

### Deferred Findings

なし。未決定事項として上流へ返す必要がある security contract は本 Skill 横断レビューでは確認されなかった。`SCR-001`〜`SCR-003` は Optional Improvements として記録した。

## Non-Findings / Confirmed Boundaries

- Requirements は「何を守るか」、Design は「誰がどの境界で守るか」、Specification は「どの外部契約を守るか」、Implementation は「実コードが安全に守るか」を明示しており、phase boundary は成立している。
- checklist は4フェーズすべてで非規範的な探索補助と明記され、checklist 項目から新しい Requirement、Design Decision、Specification policy、暗号方式を発明しない規則がある。
- Requirements / Design / Specification の `Critical` Gate policy と Implementation の `CRITICAL` / `HIGH` blocking policy は、common playbook の Skill-specific policy 許容と各 `review-gates.md` / `output-format.md` により整合する。
- Security concern の繰り返しは、property、architecture、contract、actual behavior を別の抽象度で確認する防御的な重複であり、normative decision の duplication ではない。
- custom scalar arithmetic、side-channel、RNG、zeroization、secret copies、unsafe、fuzzing、differential testing は、必要な phase へ委譲されている。上流が具体 implementation policy を発明せず、Implementation が concrete defect を仕様列挙の有無だけで無視しない。
- Phase Context は4フェーズとも未登録のため未使用。Context を単独の Critical / Major / HIGH、Gate failure、Requirement / Design / Specification の根拠にする経路は確認されない。
- Token / complexity: `SKILL.md` は routing / execution rule、詳細観点は checklist、出力は適用した主要項目だけという分離になっている。Specification checklist は314行、Implementation checklist は249行だが、全件適用・全件出力を要求していないため、行数のみを問題としない。
- 既存の phase review 成果物には現行 Skill 導入前の日本語 `Review Result` 値が残るが、これは履歴であり現行 Skill の normative policy ではない。`AGENTS.md` の過去レビュー取扱いに従い、今回の Gate は現行 Skill の値と finding status で判定し、過去の結果語を逆に正規化していない。

## Validation

### Domain Checks

- 適用: protected asset / confidentiality、secret lifecycle / ownership、authorization / signing、chain / network / canonical bytes、Wallet Store、attacker input / fail-closed、Native / WASM、crypto / arithmetic / side-channel / RNG、test / oracle / fuzz / differential。
- 適用外: 外部 node、registry、network、Rust build、WASM runtime、Native sanitizer。Skill framework の整合性レビューに不要であり、成功扱いにしていない。
- checklist 全件の機械的な出力は行わず、matrix と主要な handoff のみを記録した。

### Validation Results

| 検証 | 結果 |
| --- | --- |
| 4 phase の `security-checklist.md` 存在確認 | 成功。4件すべて存在 |
| 各 phase から `../review-common/review-playbook.md` 解決 | 成功。4件すべて実在 |
| 各 phase から `../review-common/output-format.md` 解決 | 成功。4件すべて実在 |
| 各 phase の local `reviewers.md` / `review-gates.md` / `output-format.md` 解決 | 成功。存在する対象を確認 |
| Phase Context 登録確認 | 登録なし。未登録 Context は探索・作成していない |
| Markdown / YAML / relative-reference 用既存 validation | 該当する repository command は確認できなかったため、推測実行していない |
| `git diff --check` | 成果物作成後に実行。tracked diff に診断なしで成功 |
| 新規成果物の whitespace check | `git diff --no-index --check /dev/null docs/reviews/release/security-review-cross-review-001.md` に診断なし（no-index の差分終了コード `1` は想定値） |
| Rust lint / test / build / WASM / Native runtime | 未実行。今回の review artifact には不要 |

### Review Gates

| Gate | 判定 | 根拠 |
| --- | --- | --- |
| Phase responsibility / boundary | 合格 | SCR-001 は Major の境界改善であり、4段階の normative boundary 自体は成立 |
| Security coverage / handoff | 合格 | Coverage Gap なし。secret、signing、Store、binding、crypto、failure、test の配置と順方向 handoff を確認 |
| Gate / Severity | 合格 | upstream Critical-only、Implementation CRITICAL/HIGH blocking の policy が矛盾しない |
| Phase Context | 合格 | Context 未登録。conditional / non-normative / formal source precedence が一貫 |
| Output / reference | 合格（SCR-002 / SCR-003を記録） | current output values と common fields は整合。upstream feedback lane は Major、4箇所の bare reference は Minor |

### Remaining Risks and Open Decisions

- SCR-001 が解消されるまで、上流3フェーズの security cross-check は担当者の解釈に依存する。
- SCR-002 が解消されるまで、upstream gap の記録方向が下流 Deferred Findings と明確に分離されない。
- SCR-003 が解消されるまで、実行節だけを参照する利用者には common playbook の相対参照が解決できない。
- Cross-review 自体の専用 Skill / output format は存在せず、今回の成果物はユーザー指定の章構成に common output の必須情報を内包した。これは今回の Skill の security handoff を壊す欠陥とは判定しない。

### Automatic Changes

なし。レビュー対象の Skill、正式資料、コード、テスト、fixture、既存レビュー成果物、Phase Context は変更していない。新規成果物のみ作成した。

## Final Decision

`READY`

Critical 0件のため、横断判定は `READY` とする。Major 2件（SCR-001、SCR-002）と Minor 1件（SCR-003）は non-blocking の Optional Improvements であり、次の Skill 更新時に修正要否を判断する。
