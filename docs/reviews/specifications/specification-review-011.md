# Specification Review Findings

## Review Target

- 対象: [`docs/specifications/specification.md`](../../specifications/specification.md)
- 確認日: 2026-08-30 +0900
- 成果物: `docs/reviews/specifications/specification-review-011.md`
- Review Scope: 現行 Specification 単体の目的、API / DTO、入力・出力、validation、error、状態・atomicity、secret flow、processing-unit authentication、initial Mnemonic handoff、explicit export、signing approval、Account / Chain / Network、Store / version / migration、Native / WASM、暗号、determinism、interoperability、unknown field / enum、phase boundary および上流 traceability。
- 補助確認範囲: 同一 Specification フェーズの [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) と過去 Specification reviews は整合性・状態履歴の確認に使用した。Implementation / Test / Fixture は Specification を正当化する根拠に使用していない。許可された実装者 feedback の存在と解決記録だけを補助確認した。
- 未確認範囲: 実装適合性、Native ABI 実装、WASM 生成物、実 Application / UI、外部 Node、実際の暗号 library の挙動、runtime / host の完全消去および実 fixture の値。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として統合した。
- Reviewer A（契約の明確性と完全性）: 完了。API / DTO、入力・出力、validation、error、状態、ordering、determinism、受入可能性および過去 finding の回帰を確認した。
- Reviewer B（利用価値と運用適合性）: 完了。上流要求との追跡、Application / Core / Binding の責任、handoff、export、signing、failure、retry、restart および Profile isolation を確認した。
- Reviewer C（Security / Interoperability primary）: 完了。protected asset、processing-unit authentication、user intent、signing authority、Chain / Network、Store、cryptographic contract、Native / WASM、fail-closed、unknown / version および wire interoperability を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を `specification.md` に限定し、関連 Store 仕様を整合確認へ限定した。
- Phase 1（独立レビュー）: 完了。Reviewer A / B / C の各観点を別々に確認した。
- Phase 2（反証・統合）: 完了。重複候補を統合し、過去 SR-001〜SR-019 の再発、上流根拠、Specification で決める事項、Design / Implementation への委譲および重大度を再確認した。
- Phase 3（Gate・成果物）: 完了。Critical 2件、Major 5件、Minor 2件を確定し、`REVISE SPECIFICATION` と判定した。

## Evidence Used

### Review Basis

| 区分 | 資料 | 用途 |
| --- | --- | --- |
| 作業規則 | [`AGENTS.md`](../../../AGENTS.md)、[`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/spec-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/spec-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/spec-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/spec-review/output-format.md) | Source of Truth、Phase 0〜3、Reviewer A〜C、formal finding 条件、phase boundary、Gate、成果物構成を確認 |
| 共通 policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`review-common/output-format.md`](../../../.agents/skills/review-common/output-format.md) | finding の採用・統合、Upstream Feedback / Deferred Findings、Git、検証および共通章順を確認 |
| Concept | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`concept-sheet-review-009.md`](../concept/concept-sheet-review-009.md) | 製品範囲、Core 継続 ownership、通常非開示、host compromise guarantee boundary、`CONCEPT READY` を確認 |
| Requirements | [`requirements.md`](../../requirements/requirements.md)、[`requirements-review-008.md`](../requirements/requirements-review-008.md) | UC-001〜UC-011、FR-001〜FR-024、NFR-001〜NFR-005、SEC-001〜SEC-022、DR-001〜DR-009、AC-001〜AC-047、`REQUIREMENTS READY` を確認 |
| Architecture | [`architecture.md`](../../design/architecture.md)、[`architecture-review-002.md`](../design/architecture-review-002.md) | responsibility、ownership、trust boundary、processing-unit authentication、handoff、export、signing、Store、pending、retry、restart、`ARCHITECTURE READY` を確認 |
| Security Design | [`security.md`](../../design/security.md)、[`security-review-002.md`](../design/security-review-002.md) | protected asset、secret flow、authorization、signing approval、failure safety、migration、phase boundary、`SECURITY DESIGN READY` を確認 |
| Bindings Design | [`bindings.md`](../../design/bindings.md)、[`bindings-review-002.md`](../design/bindings-review-002.md) | Binding non-authority、Native / WASM 共通境界、handoff、export、signing、opaque Store、Native fail-safe、`BINDINGS DESIGN READY` および `DESIGN PHASE READY TO CLOSE` を確認 |
| 対象 Specification | [`specification.md`](../../specifications/specification.md) | 現行の normative API、data、crypto、Store、error、state、Binding、testability の判定対象 |
| Related Specification | [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) | CBOR、wire field、enum、AAD、unknown field、duplicate、version、migration、Store error との整合性を確認 |
| 過去 Specification review | [`specification-review-001.md`](specification-review-001.md)〜[`specification-review-010.md`](specification-review-010.md) | SR-001〜SR-019 の初出、完了条件、状態履歴および回帰対象を確認 |
| Related Store reviews | [`wallet-store-format-v1-review-001.md`](wallet-store-format-v1-review-001.md)、[`wallet-store-format-v1-review-002.md`](wallet-store-format-v1-review-002.md) | Store 側 SR-001〜SR-008 と companion 仕様との関係を確認 |
| 実装者 feedback | [`implement-spec-feedback.md`](../implementation/implement-spec-feedback.md) | 許可された formal Specification feedback の解決状況を補助確認。実装の現状を正しさの根拠にはしていない |

### Source of Truth

- Normative upstream は Concept / Requirements、同一 Design の responsibility・ownership・trust boundary は Architecture / Security Design / Bindings Design、対象の外部契約は `specification.md`、Wallet Store wire は `wallet-store-format-v1.md` と区分した。
- Review artifact は判定履歴であり、現行本文の代替にしていない。過去の `READY` または `Resolved` を現在の適合性の根拠にしていない。
- Symbol / NEM の暗号・導出・公開情報は、Requirements が指定し、Specification が参照する `symbol-sdk` 3.3.2、BIP39、BIP44、SLIP-0044 および RFC 8949 の範囲で確認した。reviewer の方式の好みで変更を要求していない。

## Review Result

`REVISE SPECIFICATION`

## Summary

現行 Specification は、HD 導出、BIP39、KDF / AEAD / AAD、Store wire への委譲、unknown field / enum、ID 一意性、Chain 内重複、Profile duplicate tag、基本的な atomicity および秘密情報の byte 境界を具体化している。過去 SR-001〜SR-019 のうち、SR-002、SR-006、SR-007、SR-016 は最新 Design が追加した責任・外部境界との突合で再発と判定した。

新たに、explicit secret export と signing approval の user intent が API / Binding contract に現れず、正しい password と payload / target だけで秘密返却・署名が成立し得る曖昧さを確認した。initial Mnemonic handoff も Application の確認を Core が受け取る外部契約が欠けている。さらに Account / Chain / Network の signing context、署名 byte interoperability、Native / WASM ownership・error 境界が一意でない。

Critical 2件、Major 5件、Minor 2件であり、formal Gate は `REVISE SPECIFICATION`。したがって、`CORE SPECIFICATION READY` は宣言しない。上流の Design gap は確認されず、blocking Upstream Feedback は 0 件である。

### Finding Summary

| 区分 | New | Reopened | Open 合計 |
| --- | ---: | ---: | ---: |
| Critical | 2 | 0 | 2 |
| Major | 2 | 3 | 5 |
| Minor | 1 | 1 | 2 |

## Finding Status

### SR-001〜SR-019 Regression Status

| ID | Severity | 今回の状態 | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Resolved | specification-review-001 | §4.2、§14.1 が Chain 別 BIP32、path、NEM reverse、SDK 3.3.2 および deterministic fixture 基準を固定している。 |
| SR-002 | Major | **Reopened** | specification-review-001 | §8.1 は Application の事前確認を要求するが、Core が確認成立を受け取る input / external condition を `finalize_generated_profile` に定義していない。最新 Architecture / Security Design の6段階 handoff と不一致。SR-002 詳細を参照。 |
| SR-003 | Major | Resolved | specification-review-001 | Store format §2、§7.1、§11 が CBOR、AAD、wire 表現を正本としている。 |
| SR-004 | Major | Resolved | specification-review-001 | §9 が主要 DTO、secret boundary、raw byte、Native / WASM の共通結果を定義している。具体 ABI の不足は SR-016 として分離した。 |
| SR-005 | Major | Resolved | specification-review-001 | §6.3、Store format §11〜§12 が `registry_key` / `duplicate_tag` / index を AAD と意味検証へ結び付けている。 |
| SR-006 | Minor | **Reopened** | specification-review-001 | §10 の mapping は主要な Store / auth / duplicate を網羅するが、unsupported Chain / Network、fixed Chain mismatch および Binding conversion / ownership failure の公開結果が一意でない。SR-006 詳細を参照。 |
| SR-007 | Major | **Reopened** | specification-review-001 | §8.1、§14.2 は Pending の基本 validation を定めるが、stale / unconfirmed、retry の新規 operation・再認証、restart 後の authorization / pending 非継続を外部契約として定義していない。 |
| SR-008 | Major | Resolved | specification-review-002 | §9.3 が passwordless `list_software_keys` から `origin` を除外している。 |
| SR-009 | Major | Resolved | specification-review-002 | §5.2 が CSPRNG、予測可能な fallback 禁止、invalid key reject、`RandomSourceFailure` を定めている。 |
| SR-010 | Minor | Resolved | specification-review-003 | §6.4、§14.2 が password recovery / reset 禁止と紛失時 failure を定めている。 |
| SR-011 | Major | Resolved | specification-review-003 | §8.3、§9.2 が display name を Core / Store から除外している。 |
| SR-012 | Major | Resolved | specification-review-004 | §3.1、§7、§9.2、§10 が Profile / Key ID の一意性と曖昧な対象の `InvalidStore` を定めている。 |
| SR-013 | Major | Resolved | specification-review-004 | §6.3、§10、§11、§14.2 が認証後の `duplicate_tag` と Mnemonic / Network の意味的一致を検証する。 |
| SR-014 | Major | Resolved | specification-review-005 | §5.3、§14.2、Store format §9 が同一 Profile・同一 Chain・同一 private key のみを duplicate としている。 |
| SR-015 | Major | Resolved | specification-review-006 | §8.2、§17 と Store format §14.1 が、重複保証を整合した Core-owned Store に限定し、passwordless 全 Store 意味検証を行わない範囲を同じく定めている。 |
| SR-016 | Major | **Reopened** | specification-review-006 | §13 は C ABI / `wasm-bindgen` の方式名と型の一部だけを定め、最新 Bindings Design が Specification へ委譲した ownership、length、free、output initialization、error mapping、malformed input の具体契約を定めていない。 |
| SR-017 | Minor | Resolved | specification-review-007 | §6.3、§7、Store format §2、§11 が current schema version 内の opaque / lossless 保持に限定し、将来 version の一般的 forward compatibility を保証していない。 |
| SR-018 | Major | Resolved | specification-review-008 | §12.1 の third-party temporary guarantee boundary と現行 Security Design §8.3 が一致し、local patch の状態を再定義していない。 |
| SR-019 | Major | Resolved | specification-review-009 | §7、§10、Store format §2〜§2.1 が完全な deterministic CBOR item 1個、trailing / multiple item、型、top-level および version error を `InvalidStore` 等へ統一している。 |

### New Finding Status

| ID | Severity | Status | 初出レビュー | 概要 |
| --- | --- | --- | --- | --- |
| SR-020 | Critical | New | specification-review-011 | Explicit secret export に user explicit request / Application confirmation / confirmed request の契約がない。 |
| SR-021 | Critical | New | specification-review-011 | Signing API が user approval を表す request condition を持たず、password + raw payload で approval を満たす解釈が残る。 |
| SR-022 | Major | New | specification-review-011 | Signing の Chain / Network context と mismatch reject が API / payload 契約へ落ちていない。 |
| SR-023 | Major | New | specification-review-011 | `symbol-sdk` 3.3.2 を参照するだけで、signature scheme / exact bytes / deterministic interop fixture の拘束が不足する。 |
| SR-024 | Minor | New | specification-review-011 | NFR-005 / AC-044 の coverage verification scope が Specification の testability 契約へ追跡されていない。 |

## New Finding Detail

今回の新規 finding は次の5件である。Critical は SR-020〜SR-021、Major は SR-022〜SR-023、Minor は SR-024 であり、各 finding の事実、根拠、影響、最小修正および完了条件を以下に記載する。

| ID | 主題 | 詳細 |
| --- | --- | --- |
| SR-020 | Explicit secret export | `Required Changes` に記載。 |
| SR-021 | Signing approval / authority | `Required Changes` に記載。 |
| SR-022 | Account / Chain / Network signing context | `Optional Improvements` に記載。 |
| SR-023 | Signature scheme / exact interop result | `Optional Improvements` に記載。 |
| SR-024 | Coverage verification traceability | `Optional Improvements` に記載。 |

## Required Changes

`Critical` の New と、Specification completion を妨げる Reopened Major は以下である。これらを解消するまで Specification Gate は不合格である。

### SR-002 — Reopened: Initial Mnemonic handoff の Core-visible confirmation contract

- 対象箇所: `specification.md` §8.1:302-325、§9.2:384-394、§14.2:748
- 確認できた事実: §8.1 は Application が Mnemonic を提示し利用者の明示確認を得た後だけ `finalize_generated_profile` を呼ぶとする。しかし `finalize_generated_profile(store, pending_profile, password_utf8)` に確認成立を表す input / request condition はなく、Core が検証するものは Pending、Store、password、schema および既存 Profile との整合性とされる。成功条件も replacement Store が返ることだけである。
- 上流根拠: Architecture §6.1、Security Design §6.2、Bindings Design §6.3 は、Core生成 → intended Applicationへの受渡し → intended userへの提示 → userの明示確認 → ApplicationからCoreへの確認伝達 → CoreのProfile最終確定、の6段階を定める。Requirements FR-001、SEC-010、SEC-017〜SEC-018、AC-001、AC-034 も同じ成功境界を要求する。
- 問題と影響: Application が確認を得ていない状態でも同じ `finalize` 入力を呼べるため、確認済み request と未確認 request が Core / Binding の外部契約上区別されない。実装は「finalize呼出し自体を確認伝達と扱う」場合と「別の confirmed request を要求する」場合に分岐し、未確認時の Profile success、pending、replacement、error が一意にならない。
- 必要な最小修正または確認: UI方式や本人性検証を決めず、Application が成立させた確認を Core へ伝える外部 request condition または、当該 operation invocation 自体を confirmed handoff と定義する規範を明記する。Binding がその意味を変更せず伝え、確認条件不成立・中断・最終確定失敗では Profile、partial state、replacement、secret / diagnostic を返さないことを API / error 契約へ結び付ける。
- 完了条件または再確認方法: confirmation 未成立、伝達不能、確認済み、finalization failure の各ケースで、Profile success、committed state、replacement、error、secret exposure が同じ結果になることを Specification と Binding 契約から独立判定できる。

### SR-016 — Reopened: Native / WASM binding external contract

- 対象箇所: `specification.md` §9.1-§9.2:353-480、§10:561-611、§12.3:670-691、§13:695-707
- 確認できた事実: §13 は Native が `bindings/native` の C ABI、WASM が `wasm-bindgen` を使うこと、WASM の一部の `Uint8Array` 表現および secret non-disclosure を定める。しかし Native の exported operation、C struct / buffer、length、NULL / malformed input、caller / Core ownership、success / failure output initialization、allocation / release / free、conversion failure、Core error mapping は定義されていない。WASM も operation mapping、result / exception error mapping、output ownership / lifecycle、malformed input、opaque Store / Pending の返却契約が同程度に未定義である。
- 上流根拠: Bindings Design §4.2、§5、§8、§10.1 は Binding 自身が検証可能な malformed / conversion / ownership failure を fail-safe に扱い、具体 ABI・pointer・NULL・length・free・JavaScript type と error を Specification / Implementation へ引き継ぐ。Requirements NFR-001〜NFR-004、SEC-011〜SEC-012、SEC-017、SEC-020、FR-019、AC-015〜AC-016、AC-023〜AC-024、AC-040、AC-043 は Native / WASM で同じ外部 security meaning を要求する。
- 問題と影響: C ABI と WASM の合理的な binding が、caller-owned output と binding-owned output、failure 時の out parameter、invalid length の扱い、free responsibility、Core error の mapping および secret output の破棄で異なる結果を持ち得る。未初期化 output、leak / double-free、failure 時 secret return、Core error の success 化を外部契約から禁止できない。
- 必要な最小修正または確認: 内部 pointer arithmetic や allocator 実装を決めず、各 exported operation の input / output、length、ownership、release responsibility、success / failure 時の output、検証可能な malformed / conversion / allocation failure、Core error mapping、secret return boundary、opaque Store / Pending および Native / WASM の security meaning 同一性を規範契約として定義する。
- 完了条件または再確認方法: Native と WASM が同じ operation sequence、入力、failure class、secret return condition、Store / Pending result、error meaning および release responsibility を外部から同じように判定できる。任意の invalid memory address を救済する保証を追加しない。

### SR-007 — Reopened: Pending / failure / retry / restart contract

- 対象箇所: `specification.md` §8.1:302-325、§11:615-635、§14.2:764-770
- 確認できた事実: Pending の version、Store 結合、改ざん、password、重複の拒否は定められている。しかし、stale / unconfirmed Pending を通常状態・committed Profileへ昇格させない条件、retry を前回と別 operation として扱い password / confirmation を再取得する条件、restart 後に authorization / unlocked state / unconfirmed Pending を継続しない条件が本文の API / result contract にない。
- 上流根拠: Requirements SEC-003、SEC-005、SEC-017〜SEC-019、AC-037〜AC-039、AC-046、Architecture §5.3、§6.5、Security Design §6.6、Bindings Design §6.6。
- 問題と影響: 同じ pending を再利用して finalize するか、前回の authentication / confirmation を retry に持ち越すか、restart 後に pending を復元するかが実装ごとに分かれる。失敗後の Profile success、replacement、secret retention、authorization state および Profile isolation の観測結果が一意でない。
- 必要な最小修正または確認: 内部 state machine、timeout 実装、token 方式を指定せず、pending / committed の公開意味、stale / unconfirmed の非昇格、retry の新規 operation・再認証・再確認、restart 後の authorization / pending 非継続、失敗時 existing state 不変を operation contract として定義する。
- 完了条件または再確認方法: initial handoff、mutation、retry、restart、storage / finalization failure の各 sequence で、committed / pending、authentication、confirmation、replacement、error、secret exposure が独立実装で一致する。

### SR-020 — New: Explicit secret export authorization contract

- 対象箇所: `specification.md` §1:16-17、§8.4:337-343、§9.2:403-414、§9.4:511-525、§14.2:771-773
- 確認できた事実: API は `export_mnemonic(store, profile_id, password_utf8)` と `export_private_key(store, profile_id, key_id, password_utf8)` の target と password だけを持つ。§8.4 / §9.4 は「明示的な個別エクスポート操作」と「正しい password」を要求するが、user explicit request、Application / UI confirmation、confirmed request を Core / Binding が受け取る契約を定義していない。
- 上流根拠: Requirements UC-011、FR-022〜FR-023、SEC-010、SEC-015、SEC-021、AC-025〜AC-026、AC-041〜AC-043、Architecture §6.4、Security Design §6.3、Bindings Design §6.4。
- 問題と影響: password を知る Application が同じ target を指定して API を呼べば、user の明示要求・UI確認なしでも export success と解釈できる。別実装が API invocation を confirmed request とみなすか、別の確認状態を要求するかで、Mnemonic / private key の disclosure、unauthorized request の error、state result が分岐する。これは `password possession == export approval` を許す曖昧さである。
- 必要な最小修正または確認: UI方式を追加せず、target、user explicit request、Application / UI confirmation、confirmed request、per-operation password authorization の各条件を外部契約として区別し、Binding が確認済み request の security meaning を変えないことを定義する。未確認、target mismatch、authentication failure、処理失敗では secret / normal result / state mutation を返さない。
- 完了条件または再確認方法: Mnemonic と指定 Software Key private key の各 export について、confirmed / unconfirmed、wrong target、wrong password、failure の input / result / error / secret exposure / Core original ownership が独立実装で同じ判定になる。

### SR-021 — New: Signing approval と signing authority の分離契約

- 対象箇所: `specification.md` §2.2:45-56、§9.2:453-459、§9.5:527-557、§14.1:717-729
- 確認できた事実: `sign` は `profile_id`、`key_id`、`password_utf8`、`payload` だけを受け取る。§9.5 は Core が payload を意味解釈せず、固定 Software Key の signing primitive を適用すると定めるが、Application / UI が内容を提示し explicit approval を取得し、approved request だけを送るという外部 precondition が仕様 API / Binding contract に現れていない。
- 上流根拠: Requirements UC-006、FR-009、SEC-022、AC-009、Architecture §6.3、Security Design §6.4、Bindings Design §6.5。
- 問題と影響: password と raw payload のみで sign が成立する実装は、Core の password authorization と user signing approval を同一視できる。Application が approved request だけを送る責任を記録するだけでは、Binding がその security meaning を保持する条件、approval 不成立時の非署名・error・state不変が外部から一意に判定できない。Transaction の意味を Core に解釈させる必要はない。
- 必要な最小修正または確認: Account 選択・内容提示・user approval を UI方式なしで上位責任として明記し、Core に渡される request が approved request であることを表す外部契約と、Binding の意味無変更 mediation を定義する。Core はその条件、password authorization、target compatibility、raw signing primitive を分離して扱い、approval 不成立では signing result / secret / state change を返さない。
- 完了条件または再確認方法: 同じ target / payload / password で approved request と unapproved request を区別でき、後者が署名を生成しないこと、password が正しいだけでは approval にならないこと、Native / WASM が同じ結果になることを確認できる。

## Optional Improvements

以下には Minor と、Skill の Critical-only formal Gate では自動的に Gate を決めないものの、本プロジェクトの Specification completion 条件を妨げる Major の追加詳細を含める。SR-022〜SR-023 は completion-blocking Major である。

### SR-006 — Reopened: Unsupported / mismatch / binding failure error mapping

- 対象箇所: `specification.md` §10:561-611
- 確認できた事実: `NetworkMismatch` は「Profile Network と Chain / Network 条件の不一致」と定義され、`InvalidArgument` は入力不正を広く包含する。一方、unsupported Chain、unsupported Network、Software Key fixed Chain mismatch、invalid combination、Binding conversion / ownership / allocation failure の各 class と公開 error / result / state 不変の対応が個別に定まっていない。
- 上流根拠: Requirements FR-024、SEC-018、AC-047、Architecture §7〜§8、Bindings Design §8.1〜§8.2 および §10.1。
- 問題と影響: 同じ unsupported / mismatch / conversion failure を `InvalidArgument`、`NetworkMismatch`、`CryptoFailure`、未定義の binding error などに分ける実装が可能で、Native / WASM で failure class、retry 可否、output 初期化、state change および secret exposure が分岐する。新しい error code 数を増やすこと自体が問題ではなく、現行 code への mapping と外部結果が不足していることが問題である。
- 必要な最小修正または確認: 既存 error code を用いるか、上流範囲内で必要な分類を定義するかを含め、unsupported Chain / Network、fixed mismatch、invalid combination、conversion / allocation / ownership failure の accept / reject、error mapping、output、state、secret boundary を一意に記録する。Native 任意 invalid address の保証は追加しない。
- 完了条件または再確認方法: 各 failure class について、Core、Native、WASM、Application が同じ error category、success 非成立、replacement / secret 非返却および retry 条件を判定できる。

### SR-022 — New: Account / Chain / Network signing context

- 対象箇所: `specification.md` §3.2-§3.3:79-87、§9.2:446-459、§9.5:527-557、§10:595-601、§14.1:720-722
- 確認できた事実: derive / import / generate は Chain を受け取るが、`get_public_account` と `sign` は requested Chain / Network を受け取らず、`payload` は opaque bytes である。本文は保存済み Software Key の Chain を使うとは定めるが、signing request がどの Network / Chain context に対するものか、その mismatch をどの条件で reject するかを定義していない。
- 上流根拠: Requirements FR-009、FR-013、FR-024、DR-005、AC-009、AC-013、AC-047、Architecture §7、Security Design §7、Bindings Design §7。
- 問題と影響: 実装が (a) stored Profile Network / Software Key Chain に無条件に bind して任意 payload を署名する、(b) request context を別途受け取って mismatch を拒否する、のいずれも現在の API から排除されない。Symbol / NEM、Mainnet / Testnet の取り違え、wrong-account / wrong-context signing の reject と result が分岐する。
- 必要な最小修正または確認: Transaction の意味解釈や構築を Core に戻さず、signing / public account の target context を fixed Profile Network + fixed Software Key Chain として扱うのか、外部 request context を受け取って mismatch を reject するのかを、Account / Chain / Network の API / DTO / error 契約として一意に記録する。fallback、implicit conversion、Symbol/NEM・Mainnet/Testnet の読み替えは許可しない。
- 完了条件または再確認方法: same target の correct / wrong Chain・Network、unsupported 値、Profile / Key mismatch に対して、Native / WASM と Core の input / output / error / state / signature result が一致する。

### SR-023 — New: Signature scheme / exact interop result

- 対象箇所: `specification.md` §4.2:116-146、§5.2:178-188、§9.5:527-557、§14.1:717-729、§18:820-834
- 確認できた事実: `Signature.signature` は `bytes[64]`、payload は raw bytes とされ、`symbol-sdk` 3.3.2 との互換性および「signature verification」の fixture が要求される。しかし、Chain ごとの signature scheme / encoding の規範的な参照、同一 payload から期待される signature bytes、または別実装間で exact signature bytes を一致させる受入条件が明示されていない。HD、BIP39、KDF、AEAD、AAD、payload を暗黙変換しない規則とは区別される。
- 上流根拠: Requirements DR-008、FR-009、AC-009、AC-033、Architecture §7、Security Design §7、Specification §18 の SDK / protocol 参照。
- 問題と影響: 有効な signature を検証できる randomized / non-identical output と、SDK 互換の deterministic output の両方が、verification のみを満たす解釈になり得る。Native / WASM 間だけでなく、別 Core 実装間の signature bytes、Chain-specific behavior および fixture 判定が分岐する。
- 必要な最小修正または確認: reviewer の好みで方式を変更せず、既存の `symbol-sdk` 3.3.2 / protocol 参照をどの signing operation・signature encoding・Chain-specific behavior に適用するか、および exact signature bytes を受入結果に含めるかを規範的に固定する。payload の意味解釈、generation hash の組立てを Core に追加する修正は要求しない。
- 完了条件または再確認方法: Symbol / NEM の同一 raw payload、target context、Software Key について、scheme、signature byte representation、verification、failure および interop fixture の結果を独立実装が同じように判定できる。

### SR-024 — New: Coverage verification traceability

- 対象箇所: `specification.md` §14:711-777、§15:781-795
- 確認できた事実: §14 は多数の compatibility / security / state test condition を列挙するが、Requirements NFR-005 / AC-044 の行・関数 90%、分岐 85% の目標、未達時の未カバー範囲・理由・影響の記録、coverage 単独で security / interop 合格にしない検証条件を本書の testability / traceability へ反映していない。§15 の要件表にも NFR-005 がない。
- 上流根拠: Requirements NFR-005、AC-044、§12.4。これは SHOULD であり、外部 API の security boundary を変更する要求ではない。
- 問題と影響: 実装・release verification が coverage 目標、未達記録および仕様適合性との関係を個別に解釈し、検証成果物の比較可能性が下がる。
- 必要な最小修正または確認: test harness や CI tool を指定せず、NFR-005 / AC-044 の目標、未達時に確認可能な記録、coverage を単独の合格証拠としない条件を Specification の検証契約または明示的な下流委譲として追跡可能にする。
- 完了条件または再確認方法: NFR-005 / AC-044 が §14 / §15 または明示的委譲先へ追跡でき、coverage 未達と重要な仕様・security・interop 未検証が同一視されないことを確認できる。

## Resolved Findings

今回、現行本文から解消を確認した過去 finding は次のとおりである。詳細な regression status は上記表に記録した。

| ID | 解消確認 |
| --- | --- |
| SR-001 | HD master / child、Chain 別 root HMAC、NEM reverse、path、SDK 3.3.2 および fixture 基準が §4.2 / §14.1 にある。 |
| SR-003 | CBOR、AAD、HMAC、wire 表現の正本が Store format へ追跡される。 |
| SR-004 | DTO と公開 secret boundary、raw byte 表現、Native / WASM 共通値が §9 / §13 にある。ただし具体 binding ABI は SR-016。 |
| SR-005 | `registry_key` / `duplicate_tag` / index 改変、AAD 認証および意味的一致検証が §6.3 / §11 にある。 |
| SR-008〜SR-009 | passwordless list の `origin` 非返却、Generated key の CSPRNG / fallback 禁止 / failure が §5 / §9 / §14 にある。 |
| SR-010〜SR-011 | password recovery / reset 禁止および display name の Application 責任が §6.4 / §8.3 / §9.2 にある。 |
| SR-012〜SR-014 | ID 解決、Store duplicate、Chain 固定、同一 Chain 内重複が §3 / §5 / §7 / §9 / §10 にある。 |
| SR-015 | `duplicate_tag` の passwordless 適用範囲は Requirements の整合 Store 限定と Store format §14.1 に追跡できる。 |
| SR-017 | unknown field は current schema version 内の opaque / lossless 保持に限定され、unknown enum は fatal、future version migration ではない。 |
| SR-018 | third-party temporary の完全消去保証外と local patch の非必須境界が Security Design と一致する。 |
| SR-019 | complete deterministic CBOR item、top-level、trailing / multiple item、version type / value および公開 error が両仕様で一致する。 |

## Upstream Feedback

なし。Concept、Requirements、Architecture、Security Design、Bindings Design はそれぞれ確定済みであり、今回の formal finding は現行 Specification の具体契約不足である。新しい ownership、trust boundary、product requirement または security architecture を Specification Review から上流へ追加する必要は確認されなかった。したがって `Specification Review → Design` および `Specification Review → Requirements` の blocking feedback は 0 件である。

## Deferred Findings

- `specification.md` §12.1〜§12.2 の `zeroize` 対象列挙、owned buffer を1個に限定する表現、`clone()` 回避、Secret wrapper / `Debug` / `Display` / serde の指定は、Security Design §8.2 が下流へ委譲した implementation technique に近い。scalar helper、byte loop、mask / carry、exact temporary、library call、pointer arithmetic、exact memory wiping は Specification finding とせず、Implementation / release verification の phase boundary として扱う。次回の仕様修正では、外部から判定可能な non-retention / non-disclosure / lifecycle semantics と、実装方式を分離して確認する。
- 実装コード、Rust / WASM test、fixture 値、外部 Node、Application / UI の実適合性、runtime / host の完全消去および actual side-channel / zeroization は下流で検証する。今回の `REVISE SPECIFICATION` は、それらの実装不備を意味しない。
- `wallet-store-format-v1.md` は本レビューの対象ではない。Store 仕様の独立再レビューを次工程として実施する。

## Scope and Traceability

### Requirements → Specification Traceability

| Requirements | 主な対応箇所 | 判定 |
| --- | --- | --- |
| FR-001、FR-019、SEC-010、SEC-017〜SEC-018、AC-001、AC-034 | §8.1、§9.2、§11、§14.2 | 基本 state / failure はあるが、Core-visible confirmation が不足（SR-002）。 |
| FR-003、FR-021、DR-008、AC-003、AC-033、AC-035、AC-046 | §4、§5、§14.1〜§14.2 | HD / key validity / failure は追跡可能。 |
| FR-004〜FR-005、FR-018、FR-021、FR-024、AC-004〜AC-005、AC-020、AC-047 | §5、§9.2、§10、§14.2 | 基本登録・duplicate・failure はある。unsupported / mismatch error の詳細は SR-006、context は SR-022。 |
| FR-007、UC-005、SEC-002、SEC-007、SEC-014、AC-007、AC-027、AC-031 | §1、§4.3、§6.4、§9.2 | 各 secret-capable API の password input と no persistent unlocked state はある。retry / restart の非継続が SR-007。 |
| FR-009、UC-006、SEC-022、AC-009 | §2.2、§9.2、§9.5、§14.1 | raw signing primitive はあるが approval / context / exact interop が SR-021〜SR-023。 |
| FR-010〜FR-012、SEC-005〜SEC-006、SEC-008〜SEC-009、SEC-018〜SEC-019、AC-010〜AC-012、AC-037〜AC-039 | §6.4〜§6.5、§9.2、§11、§14.2 | password change、delete、atomicity、Profile isolation は追跡可能。 |
| FR-013、FR-024、DR-005、AC-013、AC-019〜AC-020、AC-047 | §3、§4.2、§5.3、§9.2、§9.5 | 固定関係と fallback 禁止はあるが signing context / mismatch contract が SR-022。 |
| DR-009、SEC-004、AC-018、AC-045 | §7、§10、§11、§14.2、Store format §2〜§14 | version、reject、unknown data、no migration、existing state protection は追跡可能。 |
| NFR-001〜NFR-004、SEC-011〜SEC-012、SEC-017、SEC-020、AC-015〜AC-016、AC-023〜AC-024、AC-040、AC-043 | §12.3、§13、§14.2 | 共通 secret invariant はあるが concrete Native / WASM contract が SR-016。 |
| FR-022〜FR-023、SEC-021、AC-025〜AC-026、AC-041〜AC-043 | §8.4、§9.4、§14.2 | target / password / return boundary はあるが explicit intent / confirmation が SR-020。 |
| NFR-005、AC-044 | §14、§15 | coverage goal / record contract が未追跡（SR-024）。 |

### Architecture → Specification Traceability

| Architecture の確定事項 | Specification 対応 | 判定 |
| --- | --- | --- |
| Core ownership、Profile = Network 固定、Software Key = Chain 固定、Account 関係 | §1〜§5、§9.3、§9.5、§11 | 基本関係は整合。signing context は SR-022。 |
| per-operation password authorization、no unlocked / cache / carry-over | §1、§4.3、§6.4、§9.2 | operation input はある。retry / restart 明示が SR-007。 |
| 6段階 Mnemonic handoff、Core finalization | §8.1、§9.2、§14.2 | confirmation transmission が SR-002。 |
| Application approval / Core signing primitive | §2.2、§9.5 | approved request の binding contract が SR-021。 |
| explicit export 二重条件、Core original ownership | §8.4、§9.4、§12.3 | user intent / confirmed request が SR-020。 |
| Store validity、opaque boundary、no migration、existing state protection | §7、§11、Store format | 整合。 |
| pending / committed、failure、retry、restart | §8.1、§11、§14.2 | retry / restart / stale contract が SR-007。 |
| Native / WASM same security meaning、Native fail-safe | §12.3、§13 | concrete external contract が SR-016。 |

### Security Design → Specification Traceability

| Security Design の確定事項 | Specification 対応 | 判定 |
| --- | --- | --- |
| protected asset、Core original、通常非開示 | §1、§2、§8.4、§9.3〜§9.4、§12 | Mnemonic / private key boundary は追跡可能。 |
| processing-unit authentication | §1、§4.3、§6.4、§9.2 | listed operations は password input を持つ。retry / restart の明示は SR-007。 |
| initial handoff | §8.1、§14.2 | 6段階のうち Core-visible confirmation が SR-002。 |
| explicit export | §8.4、§9.4 | 二重条件と failure result が SR-020。 |
| signing approval と password authorization の分離 | §2.2、§9.5 | API / Binding の approved request 表現が SR-021。 |
| Store / version / no migration | §7、§10〜§11、Store format | 整合。 |
| pending / failure / retry / restart | §8.1、§11、§14.2 | stale / retry / restart が SR-007。 |
| side-channel / zeroization phase boundary | §12、§14 | §12 は一部 implementation detail を含み、外部 lifecycle semantics と分離して下流扱いにする（Deferred）。 |

### Bindings Design → Specification Traceability

| Bindings Design の確定事項 | Specification 対応 | 判定 |
| --- | --- | --- |
| thin / non-authoritative mediation | §2.2、§12.3、§13 | Binding の役割は整合。 |
| handoff confirmation / export confirmed request / approved signing request | §8.1、§9.2、§9.4〜§9.5 | confirmation / intent / approval の具体 external condition が SR-002、SR-020、SR-021。 |
| Core error / warning / pending / replacement の meaning 無変更 | §9.1、§10〜§11 | concrete Native / WASM mapping と ownership が SR-016、error class が SR-006。 |
| opaque Store / no migration / unknown field | §7、§11、Store format | 整合。 |
| Native fail-safe malformed / conversion / ownership failure | §13 | input / output / ownership / error boundary が SR-016。 |
| Native / WASM same secret boundary and host guarantee limitation | §12.3、§13 | security intent はある。具体 lifecycle / mapping が SR-016。 |

### Phase Boundary

- Specification が定めるべきものは、operation request / result、target、confirmation / approval の security meaning、Store / pending の外部状態、validation、error、ownership、wire、cryptographic result および failure-visible behavior である。
- Architecture / Security / Bindings Design の responsibility、trust boundary、Core ownership、Application user intent、Binding non-authority を Specification で再定義していない。今回の finding はそれらの既存判断を具体契約へ落とし切れていない点である。
- Rust module、clone / copy の内部方式、stack / heap、pointer arithmetic、`unsafe`、parser / fuzz framework、actual library call、exact zeroize implementation、runtime / host の完全消去は Implementation / release verification へ委譲する。
- Browser Extension の page / background / extension topology、permissions、storage architecture および UI の具体方式は本 Specification の対象外である。

## Domain Checks

### API / DTO / Data Contract

部分合格。Profile / Software Key / export / public account / signature DTO、raw bytes、opaque Store / Pending および `MutationResult` / `ReadResult` は記載されている。一方、confirmed handoff、confirmed export request、approved signing request、signing context、および binding result / error / ownership の外部表現がない（SR-002、SR-016、SR-020、SR-021、SR-022）。

### Processing-unit Authentication

部分合格。初期 Profile 作成・復元、signing、HD derivation、Imported / Generated registration、`get_public_account`、password change、Mnemonic export、Software Key private key export、Software Key deletion、Profile deletion は password または password 保護入力を持ち、§1 は毎回の認証と persistent unlocked state 非提供を定める。wrong password は `AuthenticationFailed`、認証失敗時の state / secret 非返却も定義される。Application / Binding の unlock session、authorization cache、previous result carry-over および retry / restart の外部非継続が operation contract として不十分であり、SR-007 に統合した。

### Initial Mnemonic Handoff

不合格（SR-002）。完全な Mnemonic の generation、Application 受渡し、user 表示、user confirmation、Core finalization の責任は本文に近い形であるが、Application が確認成立を Core へ伝える具体的 external condition がない。generation / pending creation / Binding 通過 / Application 受領だけでは success でないこと、failure 時の Profile / partial / secret 非開示は記載されている。

### Explicit Secret Export

不合格（SR-020）。Mnemonic と指定 Software Key の個別 export、target、password、成功結果、原本 ownership、失敗時非返却・Store 不変は記載されるが、user explicit request、Application / UI confirmation、confirmed request が API / Binding で欠落している。

### Signing Authority / Approval

不合格（SR-021）。raw payload signing primitive、private key 非返却、public result、password authorization、Core が Transaction を解釈しない境界は定義される。しかし Application / UI の Account 選択、内容提示、explicit user approval、approved-only request が Core / Binding 外部契約に入っていない。`password authorization != signing approval` の明示もない。

### Account / Chain / Network

部分合格（SR-022）。Profile Network 固定、Profile Chain 非固定、Software Key Chain 固定、ID 解決、Chain duplicate および fallback / implicit conversion 禁止は整合する。signing / public-account request context と wrong Network / Chain reject の input / error が未定義である。

### Store / Version / Migration

合格。Store format への委譲、version / schema version の型・未対応分類、unsupported / unknown / corrupt reject、no fallback、no implicit migration、existing state preservation、opaque Application / Binding boundary が `specification.md` §7、§10〜§11 と related specification で一致する。v1 migration は提供されない。

### Pending / Failure / Retry / Restart

不合格（SR-007）。pending / committed 分離、finalize validation、atomic replacement、failed mutation の replacement 非返却および existing state 保護はある。stale / unconfirmed 非昇格、retry 再認証・再確認、restart 後 authorization / pending 非継続が不足する。

### Native Contract

不合格（SR-016）。C ABI の採用方式は固定されるが、operation、buffer / length、ownership、free / release、NULL / malformed、success / failure output initialization、allocation / conversion failure、Core error mapping、secret output 境界が一意でない。任意 invalid memory address を救済する guarantee を求めるものではない。

### WASM / JavaScript Contract

不合格（SR-016）。`Uint8Array` 相当の binary、strict UTF-8、raw private key、opaque Pending / Store および secret return の上限はある。operation mapping、result / exception error、output ownership / lifecycle、malformed input、failure output、Core error mapping が不足する。Browser Extension topology、permissions、storage architecture は対象外として正しく境界付けられている。

### Cryptographic Contract

部分合格（SR-023）。BIP39 English 24 words、NFKD、PBKDF2-HMAC-SHA512、Chain 別 HD root / child、NEM reverse、Argon2id parameters、AES-256-GCM、nonce / salt / tag、AAD、duplicate HMAC、raw payload および byte length は具体的である。signature scheme / chain-specific signing operation / exact deterministic signature result は verification-only fixture では一意でない。

### Error / Fail-closed

部分合格（SR-006、SR-002、SR-007、SR-016、SR-020、SR-021、SR-022）。主要な invalid input、authentication、duplicate、Store、version、Pending、crypto / random / serialization failure、state non-mutation および secret non-disclosure はある。しかし confirmation / approval、unsupported / mismatch、binding conversion / ownership / allocation failureの外部分類と Native / WASM mapping が不足する。fail-closed の基本 invariant はあるため、欠落を実装者の自由な fallback として扱ってはならない。

### Determinism / Interoperability

部分合格。Store CBOR / ordering / AAD / ID / duplicate / unknown field preservation、HD fixture、Native / WASM の同一 DTO 値および同一 signature bytes の要求がある。署名 fixture は verification のみで exact signature scheme / bytes の拘束がない（SR-023）。signing context も未定義（SR-022）。

### Unknown Field / Enum / Version

合格。現行 schema version 内の unknown field は意味解釈せず warning なしで受理し、必要な mutation で lossless 保持、保持不能なら `InvalidStore`。unknown enum は fatal `InvalidStore`。Store / Profile version の欠落・型不正と unsigned integer の unsupported value を分類し、future version migration を提供しない。Related Store format と矛盾しない。

### Side-channel / Zeroization Phase Boundary

部分合格。host / runtime / third-party 全体の完全消去保証外、不要 retention / log / diagnostic 非開示、WASM の非隔離境界は上流と整合する。一方、§12.1〜§12.2 に zeroize buffer list、owned buffer 数、`clone()` 回避、Secret wrapper 等の implementation prescription が残るため、Deferred Findings として下流境界を記録した。scalar、loop、mask、carry、exact memory wipe、library call 等を formal Specification finding にはしていない。

### Related `wallet-store-format-v1.md` Consistency

合格。`specification.md` §7、§10、§11、§14.2 と Store format §2〜§14 は、complete deterministic CBOR item、top-level map、integer key、enum、unknown field / enum、AAD、index / payload mapping、duplicate tag、version error、migration 非提供、mutation preservation および failure result を同じ外部結果として扱う。過去の Store review SR-002 / SR-007 / SR-008 の状態も確認した。Store format 自体の独立再レビューは未完了である。

## Validation Results

- 実施: `git status --short --branch` により branch が `agent/concept-review-follow-up`、作業開始時に既存変更なしであることを確認した。
- 実施: Markdown の見出し構造、必須章、finding ID、SR-001〜SR-019 status、target / related / upstream の相対リンク、Concept / Requirements / Design reference、phase boundary、変更範囲を成果物作成後に検査し、すべて合格した。
- 実施: `git diff --check` および staged diff に対する `git diff --cached --check`。whitespace error は検出されなかった。
- 未実施: `cargo fmt --all -- --check`、`cargo clippy --workspace --all-targets --all-features -- -D warnings`、`cargo test --workspace --all-features`、`cargo check --target wasm32-unknown-unknown --features wasm`。今回の変更対象は review artifact のみで、Rust / Binding / test を変更していないため対象外。
- 未確認: 仕様適合を実装・テスト・fixture の通過で裏付ける検証、実 Native ABI / WASM 生成物、外部 Node、Application / UI の実 handoff / export / signing approval、coverage 実測。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | §1〜§2 が Core、Binding、Application、対象外および Store format との境界を示す。 | なし |
| 2. 契約 | **不合格** | handoff confirmation、export confirmation、approved signing request、Native / WASM ownership / error が一意でない。 | SR-002、SR-016、SR-020、SR-021 |
| 3. 処理と例外 | **不合格** | confirmation / approval failure、stale / retry / restart および binding failure の公開結果が不足する。 | SR-002、SR-007、SR-020、SR-021 |
| 4. 内部整合性 | 合格 | Store / version / unknown field / enum / duplicate / AAD は related specification と整合し、直接の wire contradiction は確認されない。 | SR-015、SR-017、SR-019（回帰なし） |
| 5. 検証可能性 | **不合格** | Native / WASM ownership、approval / confirmation、signing context、exact signature interop を独立判定できない。 | SR-016、SR-020、SR-021、SR-022、SR-023 |
| 6. 安全性と相互運用性 | **不合格** | password と user approval の分離、secret export 条件、binding failure safety、Chain / Network context および signature result が一意でない。 | SR-002、SR-016、SR-020、SR-021、SR-022、SR-023 |
| 7. 上流整合性 | **不合格** | 上流の確定済み handoff、export、signing、retry / restart、Native fail-safe invariant が仕様契約へ十分に落ちていない。 | SR-002、SR-007、SR-016、SR-020、SR-021 |

Formal Gate: **`REVISE SPECIFICATION`**。Critical 2件（SR-020、SR-021）が存在するため、Skill の Gate を不合格とする。Reopened Major 3件（SR-002、SR-007、SR-016）、New Major 2件（SR-022、SR-023）および Minor 2件（SR-006、SR-024）も残るため、ユーザー指定の completion condition を満たさない。

## Remaining Risks and Open Decisions

- Specification-level Open Decision / unresolved contract gap: 5領域。`finalize_generated_profile` の confirmed handoff、export の confirmed user intent、signing の approved request、signing / public-account の Chain / Network context、signature scheme / exact interop result。これらは暗黙に実装で決定してはならない（SR-002、SR-020〜SR-023）。
- 残存する formal finding: Critical 2、Major 5、Minor 2。特に secret disclosure、署名承認、Binding ownership / error、interop に関わるため、`CORE SPECIFICATION READY` の条件を満たさない。
- Upstream blocking feedback: 0。上流の確定判断は存在し、今回の問題は Specification がその判断を外部契約へ具体化していないことにある。
- Design security invariant との重大不整合: あり。Design の six-step handoff、double-condition export、approval と password の分離、retry / restart、Binding contract が現行 Specification だけでは実装者間で同じ behavior を強制できない。
- Store / Profile migration: v1 は migration を提供しないという上流・関連仕様との一致を確認した。
- 次工程: `wallet-store-format-v1.md` の独立再レビューへ進める。ただし本レビューの Critical / Major を解消する Specification 更新後に、必要な回帰確認を行う。

## Automatic Changes

なし。レビュー中に Concept、Requirements、Design、`docs/specifications/specification.md`、`docs/specifications/wallet-store-format-v1.md`、Implementation、Test、Fixture、Skill、過去 review は変更していない。新規作成対象は本 review artifact のみである。

## Final Decision

`REVISE SPECIFICATION`

SR-002、SR-006、SR-007、SR-016 は最新上流との突合でそれぞれ Reopened とした。SR-020〜SR-024 は今回の新規 finding である。Critical 2、Major 5、Minor 2、Specification-level unresolved contract gap 5、blocking Upstream Feedback 0 である。

したがって、今回の対象 `docs/specifications/specification.md` は `CORE SPECIFICATION READY` ではない。`wallet-store-format-v1.md` の独立再レビューへ進めることはできるが、本 Specification の修正・再レビューも必要である。
