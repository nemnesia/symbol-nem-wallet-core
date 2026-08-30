# Specification Review 012

## Review Target

- 対象: [`docs/specifications/specification.md`](../../specifications/specification.md)
- 確認日: 2026-08-30 +0900
- 成果物: `docs/reviews/specifications/specification-review-012.md`
- 前回 review: [`specification-review-011.md`](specification-review-011.md)
- 同一 Specification フェーズの整合確認対象: [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md)
- Review Scope: Review 011 で Reopened / New となった SR-002、SR-006、SR-007、SR-016、SR-020〜SR-024 の completion condition、SR-001〜SR-019 の regression、API / DTO、pending / committed、error / fail-closed、Native / WASM、Chain / Network、暗号 interoperability、coverage、phase boundary および上流 traceability。
- 未確認範囲: Implementation の適合性、実際の Native ABI header / generated WASM、Application / UI の実動作、外部 Node、実行時の memory lifetime、coverage 実測および fixture の実行結果。これらは Specification の正当化根拠に使用していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として統合した。
- Reviewer A（契約の明確性と完全性）: 完了。API / DTO、入力・出力、validation、error、状態、順序、determinism、Native / WASM の外部契約および過去 finding の回帰を確認した。
- Reviewer B（利用価値と運用適合性）: 完了。Requirements との追跡、Core / Application / Binding の責任、handoff、export、signing、failure、retry、restart、Profile isolation を確認した。
- Reviewer C（Security / Interoperability primary）: 完了。protected asset、processing-unit authentication、user intent、signing authority、Account / Chain / Network、Store、cryptographic contract、Native / WASM、fail-closed および security testability を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を `specification.md` に限定し、Store 仕様は同一フェーズ整合確認に限定した。Implementation は正当化根拠にしていない。
- Phase 1（独立レビュー）: 完了。Reviewer A / B / C の担当観点を分離して確認した。
- Phase 2（反証・統合）: 完了。SR-002、SR-006、SR-007、SR-016、SR-020〜SR-024 の completion condition、SR-001〜SR-019 の回帰、重複候補、上流 gap および phase boundary を再確認した。
- Phase 3（Gate・成果物）: 完了。現行 Skill の Gate と severity を適用し、Critical / Major / Minor はすべて 0 件と判定した。

## Evidence Used

### Review Basis

| 区分 | 資料 | 用途 |
| --- | --- | --- |
| 作業規則 | [`AGENTS.md`](../../../AGENTS.md)、[`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/spec-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/spec-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/spec-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/spec-review/output-format.md) | Source of Truth の区分、Reviewer A〜C、security 観点、phase boundary、Gate、成果物構成を確認 |
| 共通 policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`review-common/output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、finding の採用条件、Upstream Feedback / Deferred Findings、章構成および検証規則を確認 |
| Concept | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`concept-sheet-review-010.md`](../concept/concept-sheet-review-010.md) | v1 範囲、Core 継続 ownership、通常非開示、明示的アクセスおよび `CONCEPT READY` を確認 |
| Requirements | [`requirements.md`](../../requirements/requirements.md)、[`requirements-cleanup-review-001.md`](../requirements/requirements-cleanup-review-001.md) | UC-001〜UC-011、FR-001〜FR-024、NFR-001〜NFR-005、SEC-001〜SEC-022、DR-001〜DR-009、AC-001〜AC-047および `REQUIREMENTS READY` を確認 |
| Architecture | [`architecture.md`](../../design/architecture.md)、[`architecture-review-002.md`](../design/architecture-review-002.md) | Core ownership、trust boundary、handoff、export、signing、pending、retry、restart、Chain / Network、`ARCHITECTURE READY` を確認 |
| Security Design | [`security.md`](../../design/security.md)、[`security-review-002.md`](../design/security-review-002.md) | protected asset、authorization、signing approval、failure safety、migration、security boundary、`SECURITY DESIGN READY` を確認 |
| Bindings Design | [`bindings.md`](../../design/bindings.md)、[`bindings-review-002.md`](../design/bindings-review-002.md) | Binding non-authority、Native / WASM 共通境界、ownership、fail-safe、`BINDINGS DESIGN READY` および `DESIGN PHASE READY TO CLOSE` を確認 |
| 前回 review | [`specification-review-011.md`](specification-review-011.md) | SR-001〜SR-019 の状態、SR-002 / SR-006 / SR-007 / SR-016 の completion condition、SR-020〜SR-024 の completion condition を確認 |
| 対象 Specification | [`specification.md`](../../specifications/specification.md) | 現行の normative API、DTO、validation、error、state、binding、crypto、Store、testability の判定対象 |
| Related Specification | [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) | CBOR、AAD、wire field、enum、unknown field、duplicate、version、migration および Store error との整合性を確認 |

### Latest upstream review state

- Concept review 010: `READY` / `CONCEPT PHASE READY TO CLOSE`。
- Requirements cleanup review 001: `READY` / `REQUIREMENTS CLEANUP READY` / `REQUIREMENTS PHASE READY TO CLOSE`。
- Architecture review 002: `READY` / `ARCHITECTURE READY`。
- Security Design review 002: `READY` / `SECURITY DESIGN READY`。
- Bindings Design review 002: `READY` / `BINDINGS DESIGN READY` / `DESIGN PHASE READY TO CLOSE`。
- `AGENTS.md` に登録された `docs/context/design-context.md` は存在しなかった。Phase Context は作成・推測せず、正式資料を直接確認した。この不在は非規範的 Context の問題であり、Specification の判定根拠にはしていない。

## Review Result

`READY`

## Summary

Review 011 の Reopened / New finding である SR-002、SR-006、SR-007、SR-016、SR-020〜SR-024 は、各 completion condition を現行 Specification から独立に判定できる状態へ更新されており、すべて `RESOLVED` と判定する。

初回 Mnemonic handoff は `HandoffConfirmationStatus = Unconfirmed | Confirmed`、同じ pending から返された完全な Mnemonic に対する Application の確認成立、finalize への伝達、未確認時の非確定および失敗時の非返却を定めている。Export は target、user request、Application confirmation、confirmed request、per-operation password authorization を分離している。Signing は approval と password authorization を分離し、Account / Chain / Network context、raw payload、Chain-specific scheme、raw `R || S`、reference verification および deterministic fixture を定めている。

Native / WASM は入力、出力初期化、固定長・可変長、ownership、release、allocation / conversion failure、error mapping、secret lifecycle および同一 security meaning を定めている。Pending / retry / restart、fail-closed、Store integrity、Profile isolation、HD derivation、unknown field / enum、deterministic CBOR、coverage traceability にも明確な回帰はない。

現行の formal finding はなく、Critical / Major / Minor は `0 / 0 / 0` 件である。したがって現行 Skill の Gate は `READY` であり、blocking Upstream Feedback、Specification-level Open Decision および security / interoperability 上の blocking gap もない。

## Finding Status

### SR-001〜SR-019 Regression Status

| ID | Severity | 今回の状態 | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | `RESOLVED` | specification-review-001 | §4.2、§14.1 が Chain 別 root HMAC、BIP32 path、NEM reverse、SDK 3.3.2 および deterministic fixture を維持している。 |
| SR-002 | Major | `RESOLVED` | specification-review-001 | §8.1、§9.1.1、§9.2、§10、§11、§14.2 が Confirmed handoff、pending 対応、未確認・失敗時の非確定と非返却を定める。詳細は Resolved Findings。 |
| SR-003 | Major | `RESOLVED` | specification-review-001 | §7、§10、§11 が Store format 仕様へ CBOR、AAD、wire 表現および failure mapping を追跡する。 |
| SR-004 | Major | `RESOLVED` | specification-review-001 | §9、§12.3、§13 が DTO、raw byte、secret boundary および Native / WASM 共通結果を定める。具体 ABI の再発は確認されない。 |
| SR-005 | Major | `RESOLVED` | specification-review-001 | §6.3、§7、§11 および Store format §11〜§12 が `registry_key`、`duplicate_tag`、AAD、index / payload 写像を維持している。 |
| SR-006 | Minor | `RESOLVED` | specification-review-001 | §10 が unsupported、invalid combination、fixed mismatch、Binding failure の error / result / state mapping を定める。詳細は Resolved Findings。 |
| SR-007 | Major | `RESOLVED` | specification-review-001 | §8.1、§11、§14.2 が pending / committed、stale / unconfirmed、retry 再認証・再確認および restart 後非継続を定める。詳細は Resolved Findings。 |
| SR-008 | Major | `RESOLVED` | specification-review-002 | §9.3 の passwordless list 結果は `key_id` / `chain` のみで `origin` を含まない。 |
| SR-009 | Major | `RESOLVED` | specification-review-002 | §5.2 が CSPRNG、予測可能な fallback 禁止、invalid key reject、`RandomSourceFailure` を維持している。 |
| SR-010 | Minor | `RESOLVED` | specification-review-003 | §6.4、§9.2、§10 が password recovery / reset 禁止と紛失時 failure を維持している。 |
| SR-011 | Major | `RESOLVED` | specification-review-003 | §8.3、§9.2、§9.3 が display name を Core / Store から除外している。 |
| SR-012 | Major | `RESOLVED` | specification-review-004 | §3.1、§7、§9.2、§10 が Profile / Key ID の一意性と曖昧な対象の reject を維持している。 |
| SR-013 | Major | `RESOLVED` | specification-review-004 | §6.3、§10、§11 および Store format §12 が認証後の `duplicate_tag` と Mnemonic / Network の意味的一致を維持している。 |
| SR-014 | Major | `RESOLVED` | specification-review-005 | §5.3、§7、§14.2 および Store format §9 が同一 Profile・同一 Chain・同一 private key の duplicate 条件を維持している。 |
| SR-015 | Major | `RESOLVED` | specification-review-006 | §8.2、§9.3、§11 および Store format §14.1 が整合 Store に限定した duplicate 保証と passwordless metadata 境界を維持している。 |
| SR-016 | Major | `RESOLVED` | specification-review-006 | §13.1〜§13.2 が Native / WASM の input、output、ownership、release、failure mapping および共通 security meaning を定める。詳細は Resolved Findings。 |
| SR-017 | Minor | `RESOLVED` | specification-review-007 | §6.3、§7、§10、§11 および Store format §2 が current schema の opaque / lossless 保持と future version の reject を維持している。 |
| SR-018 | Major | `RESOLVED` | specification-review-008 | §12 が third-party / host の guarantee boundary と Core / Binding の non-retention responsibility を区別している。 |
| SR-019 | Major | `RESOLVED` | specification-review-009 | §7、§10、§11 および Store format §2〜§2.1 が complete deterministic CBOR item 1個、trailing / multiple item、型および version error を維持している。 |

### Review 011 Reopened / New findings

| ID | Severity | 今回の状態 | 初出レビュー | Completion condition の再確認 |
| --- | --- | --- | --- | --- |
| SR-002 | Major | `RESOLVED` | specification-review-001 / Reopened in 011 | `Confirmed` / `Unconfirmed`、Application → Core の確認伝達、同じ pending との関係、未確認時の Profile 非確定、retry の再確認、restart 後の authorization / pending 非継続、failure 時の replacement / secret 非返却が §8.1、§9.1.1、§11、§13、§14.2 から判定できる。 |
| SR-006 | Minor | `RESOLVED` | specification-review-001 / Reopened in 011 | unsupported Chain / Network、invalid combination、fixed Chain / Network mismatch、malformed / conversion / allocation / ownership failure の mapping、normal result 非成立、state 不変および secret / replacement 非返却が §10、§13 から判定できる。 |
| SR-007 | Major | `RESOLVED` | specification-review-001 / Reopened in 011 | pending / committed、stale / invalid / unconfirmed pending、retry の新規 operation・再認証・再確認、restart 後の authorization 非継続・自動復元禁止、failure 時の existing committed state 不変が §8.1、§11、§14.2 から判定できる。 |
| SR-016 | Major | `RESOLVED` | specification-review-006 / Reopened in 011 | Native の pointer / length、NULL / malformed、output 初期化、固定・可変長、caller / Binding / Core ownership、`snwc_release_bytes`、double release / invalid pointer の保証範囲、allocation / conversion failure、partial output 禁止、secret output lifecycle、Core / Binding error mapping と、WASM の Uint8Array / DTO / error / detached buffer / lifecycle / 共通 observable result が §13 から判定できる。 |
| SR-020 | Critical | `RESOLVED` | specification-review-011 | target、user explicit request、Application / UI confirmation、confirmed export request、per-operation password authorization が独立した field / condition として §8.4、§9.1.1、§9.4、§10、§14.2 にあり、password possession を export approval とみなさない。未要求、未確認、target mismatch、認証失敗、処理失敗では secret、normal result、replacement、state change がない。 |
| SR-021 | Critical | `RESOLVED` | specification-review-011 | signing approval と password authorization を分離し、`Approved` 以外を署名せず、target / payload / context と approval の関係、Binding の意味無変更、Core の Transaction 非解釈、failure 時の signature / success 非返却を §2.2、§9.1.1、§9.5、§10、§13.2、§14.2 に定める。 |
| SR-022 | Major | `RESOLVED` | specification-review-011 | Profile fixed Network、Software Key fixed Chain、requested Account context、Profile / key 解決、unsupported / invalid / mismatch mapping、Symbol / NEM と Mainnet / Testnet の fallback / implicit conversion 禁止を §3.2〜§3.3、§9.1.1〜§9.2、§10、§14.2 に定める。 |
| SR-023 | Major | `RESOLVED` | specification-review-011 | Symbol / NEM の normative scheme、Chain-specific hash / private-key handling、raw 64-byte `R || S`、raw payload 非変換、SDK 3.3.2 / protocol reference の適用範囲、reference verification、deterministic fixture および exact bytes の supplementary な位置付けが §4.2、§5.2、§9.5.1、§14.1、§18 で整合している。 |
| SR-024 | Minor | `RESOLVED` | specification-review-011 | NFR-005 / AC-044、line / function 90%、branch 85%、未達時の uncovered range・理由・影響の記録、coverage 単独で security / interoperability 合格としない条件が §14.3、§15 に追跡できる。 |

## Required Changes

なし。現行 Skill で必須となる `Critical` の New / Open / Reopened は確認されない。

## Optional Improvements

なし。`Major` / `Minor` の New / Open / Reopened は確認されない。

## Resolved Findings

### SR-002 — Initial Mnemonic handoff

§8.1 の `finalize_generated_profile` は `handoff_confirmation` を明示的に受け取り、§9.1.1 は `Unconfirmed | Confirmed` を定義する。Application は同じ pending から返された完全な Mnemonic を intended user へ提示し、明示確認後だけ `Confirmed` を設定する。Core は `Confirmed` request だけを受理し、pending / Store / password と最終確定を検証する。確認未成立、欠落、対応不能、stale、失敗時は `InvalidArgument` または `PendingProfileInvalid` とし、Profile、replacement、Mnemonic および中間秘密情報を返さない。retry / restart では確認、authorization、pending の自動継続を許さない。UI 方式や内部 token は規定していない。

### SR-006 — Error / fail-closed mapping

§10 は unsupported Chain / Network と invalid combination を `InvalidArgument`、Profile fixed Network / Software Key fixed Chain との mismatch を `NetworkMismatch`、検証可能な Binding malformed input を `InvalidArgument`、Binding の conversion / allocation / ownership / lifecycle failure を `BindingFailure` に対応付ける。§10.713〜715 は全 error が success でなく、正常 value、signature、secret、replacement を返さず、Profile / Software Key / existing committed Store を変更しないことを定める。Native / WASM もこの mapping を保持する。

### SR-007 — Pending / failure / retry / restart

§11.1〜11.2 は pending / partial を committed state または authorization と区別し、stale / invalid / unconfirmed pending を reject する。retry は新しい operation として Store、入力、password、confirmation / approval を再提供・再取得し、前回結果を継承しない。restart 後は authorization、unlocked state、confirmation、approval、secret-capable state、pending を自動復元しない。failure / interruption / Binding failure 時は existing committed Store、Profile isolation、secret ownership および authorization boundary を維持する。

### SR-016 — Native / WASM Binding

§13.1 は `InputBytes { data, len }`、`OwnedBytes { data, len }`、caller が確保する `OperationResult`、operation 開始時と failure return 前の output zero / empty / NULL 初期化、固定長 field と Binding-owned variable-length field の区別を定める。caller は `snwc_release_bytes` のみを使用し、release 後の NULL / zero、NULL / zero-length no-op、Binding 未発行 pointer の保証外、double release の扱いを判定できる。allocation / conversion / ownership / lifecycle failure は partial output を返さず `BindingFailure` とする。§13.2 は Uint8Array、DTO field、`Err { code, diagnostics }`、detached / unreadable buffer、caller lifecycle および Native と WASM の同一 observable security meaning を定める。具体的 pointer arithmetic、allocator実装、generated headerおよび runtime memory guarantee は Implementation / release verification に委譲されており、SR-016 の completion condition を損なわない。

### SR-020 — Explicit secret export

§9.1.1 の `ExportRequest` は `target`、`user_request`、`application_confirmation` を別々に持ち、target の構造・識別子一致、`Requested`、`Confirmed`、password authorization を独立条件とする。§8.4、§9.4、§10、§14.2 は password possession、未要求、未確認、target mismatch、対象不存在、authentication / processing failure を export success とせず、secret、normal result、replacement、Store mutation を返さない。Core 内原本の ownership は Core に残る。

### SR-021 — Signing approval / authority separation

§9.1.1 の `SigningRequest` は target、payload、approval を持ち、`Approved` は Application / UI が同じ target / payload を提示して明示承認を取得した assertion と定義される。§9.5 は approval、per-operation password authorization、context compatibility、raw signing primitive を別々に検証し、`NotApproved`、approval 欠落、target / context mismatch、認証失敗では signature / success / secret を返さない。Core は Transaction の意味解釈・構築・UI を引き取らず、Binding は approval の意味を変更しない。

### SR-022 — Account / Chain / Network context

§3.3、§9.1.1〜§9.2 は Profile の固定 Network、Software Key の固定 Chain、`AccountContext`、`SigningTarget`、`requested_context` および `profile_id + key_id` による解決を結び付ける。unsupported / invalid combination は `InvalidArgument`、fixed value mismatch は `NetworkMismatch` とし、Symbol / NEM、Mainnet / Testnet の読み替え、fallback、implicit conversion を禁止する。

### SR-023 — Signature scheme / exact interoperability result

§9.5.1 は Symbol を Ed25519 / SHA-512、NEM を NEM `ed25519-keccak` variant / Keccak-512 とし、private-key handling、Chain-specific verifier、raw `R || S` 64 bytes、text / CBOR wrapper 禁止、raw payload 非変換を定める。SDK 3.3.2 は key pair、Chain-specific primitive、representation および supplied raw payload verification の互換性基準、protocol reference は scheme / canonical validation の基準と分けている。§14.1 は deterministic signing fixture と reference verification を要求し、SDK に固定 expected bytes がある場合の exact byte equality を supplementary evidence と位置付ける。これは Requirements DR-008 の外部 verification 条件を越えて別 gate にせず、§9.5.1 と矛盾しない。

### SR-024 — Coverage verification traceability

§14.3 は Requirements NFR-005 / AC-044 を明示し、line / function 90%以上、branch 85%以上を SHOULD の target とする。未達時は uncovered range、理由、security / interoperability / failure-path への影響を記録し、coverage 率だけで Specification、security、cryptographic interoperability、Chain / Network compatibility または重要異常系を合格としない。§15 の要件表にも NFR-005 / AC-044 が追跡される。

## Upstream Feedback

なし。Concept、Requirements、Architecture、Security Design、Bindings Design の現行本文と最新公開 review state は、Specification を安全に評価・完了するための責任、security invariant、success / failure boundary、Binding non-authority および Chain / Network policy を提供している。今回の不足は上流の欠落ではなく、Review 011 後の Specification 契約への反映で解消されている。

## Deferred Findings

- 実際の Rust / Native / WASM 実装適合性、generated C header、実行時の pointer safety、allocator、zeroization、runtime / host の完全消去、Application / UI の handoff・export・approval 適合性は下流で検証する。これは未解決 Specification finding ではない。
- §14.1 の deterministic fixture は、実装・test / release verification で具体値および reference implementation との実行結果を確認する。Specification は scheme、representation、reference verification、determinism および exact-byte equality の位置付けを定めており、実行結果を本レビューで成功扱いしていない。
- `docs/context/design-context.md` の登録とファイル不在は非規範的 Context の整備事項であり、Specification の formal finding や upstream feedback には分類しない。

## Scope and Traceability

### Requirements → Specification

| Requirements | Specification の主な対応 | 判定 |
| --- | --- | --- |
| FR-001、FR-019、SEC-010、SEC-017〜SEC-018、AC-001、AC-034 | §8.1、§9.1.1〜§9.2、§10〜§11、§13.2、§14.2 | handoff、confirmation、Profile 非確定、failure non-disclosure を追跡可能。 |
| FR-007、UC-005、SEC-002〜SEC-003、SEC-007、SEC-014、AC-007、AC-027、AC-031 | §1、§4.3、§6.4、§9.2、§11.2 | per-operation password authorization と no unlocked / carry-over を追跡可能。 |
| FR-009、FR-013、FR-024、UC-006、SEC-022、DR-005、DR-008、AC-009、AC-013、AC-047 | §3.2〜§3.3、§9.1.1、§9.2、§9.5〜§9.5.1、§10、§14.1〜§14.2 | approval、Account context、Chain / Network reject、Chain-specific signature を追跡可能。 |
| FR-022〜FR-023、SEC-010、SEC-015、SEC-017、SEC-020〜SEC-021、AC-025〜AC-026、AC-041〜AC-043 | §8.4、§9.1.1、§9.2、§9.4、§10、§11、§13、§14.2 | explicit export の全条件、secret boundary、failure non-return を追跡可能。 |
| FR-019、NFR-001〜NFR-004、SEC-011〜SEC-012、SEC-017、SEC-020、AC-015〜AC-016、AC-021〜AC-024、AC-040、AC-043 | §12.3、§13、§14.2 | Native / WASM の共通責任、representation、error、ownership を追跡可能。 |
| FR-003〜FR-005、FR-018、FR-021、DR-001〜DR-004、DR-006〜DR-009、AC-002〜AC-008、AC-018、AC-020、AC-033、AC-035、AC-045〜AC-046 | §3〜§7、§10〜§11、§14.1〜§14.2、Store format §2〜§14 | HD、Store、duplicate、version、unknown field / enum、atomicity、failure を追跡可能。 |
| FR-010〜FR-012、SEC-005〜SEC-006、SEC-008〜SEC-009、SEC-018〜SEC-019、AC-010〜AC-012、AC-037〜AC-039 | §6.4〜§6.5、§9.2、§10〜§11、§14.2 | password change、delete、atomicity、Profile isolation を追跡可能。 |
| NFR-005、AC-044 | §14.3、§15 | coverage target、未達記録および独立合格条件を追跡可能。 |

### Design → Specification

| Design の確定事項 | Specification の対応 | 判定 |
| --- | --- | --- |
| Core 継続 secret ownership、通常非開示、user intent と Core authorization の分離 | §1〜§2、§8.1、§8.4、§9.1.1、§9.4〜§9.5、§10〜§13 | handoff / export / signing の security meaning と責任を維持。 |
| Initial Mnemonic handoff の6段階、confirmation 前非 committed、failure non-disclosure | Architecture §6.1、Security Design §6.2、Bindings Design §6.3 → Specification §8.1、§9.1.1、§11、§13.2、§14.2 | 外部 request condition、pending 関係、失敗結果を具体化。 |
| Explicit export の target / user intent / confirmation / per-operation authorization | Architecture §6.4、Security Design §6.3、Bindings Design §6.4 → Specification §8.4、§9.1.1、§9.4、§10、§13、§14.2 | 5条件を独立に保持。 |
| Signing approval と signing authority の分離、Core の raw signing responsibility | Architecture §6.3、Security Design §6.4、Bindings Design §6.5 → Specification §2.2、§9.1.1、§9.5、§10、§13.2、§14.2 | approval、password、context、primitive および非解釈境界を維持。 |
| Profile Network、Software Key fixed Chain、Account context、fallback / implicit conversion 禁止 | Architecture §5.1、§7、Security Design §7、Bindings Design §7 → Specification §3.2〜§3.3、§9.1.1〜§9.2、§9.5、§10、§14.2 | fixed relation と reject mapping が一意。 |
| Pending / committed、atomicity、failure、retry、restart および existing state 保護 | Architecture §5.2〜§5.3、§6.1〜§6.2、§6.5、Security Design §6.5〜§6.6、Bindings Design §6.1〜§6.6 → Specification §8.1、§10〜§11、§13、§14.2 | pending 非昇格、再認証・再確認、restart 非継続を維持。 |
| Native / WASM thin non-authority、opaque Store、ownership / lifecycle / failure mediation | Architecture §3.3、§4.2、§5.2、Security Design §4.3、§8.2、Bindings Design §3.1〜§3.2、§4.2、§5.2、§8.1〜§8.2 → Specification §7、§9.1、§10、§12.3、§13、§14.2 | Binding の security meaning 非変更と fail-safe を具体化。 |
| Chain-specific cryptographic scheme と Transaction responsibility 委譲 | Architecture §7、§10、Security Design §7、§10、Bindings Design §7、§10.1 → Specification §4.2、§5、§9.5.1、§14.1、§18 | scheme、payload byte、reference verifier および委譲範囲が整合。 |

Specification は、Design の responsibility / ownership / trust boundary を上書きせず、API、DTO、wire、error、state、cryptographic result、Binding representation へ具体化している。Implementation / Test / Fixture は適合性の下流確認対象であり、本レビューの正当化根拠ではない。

## Domain Checks

### API / DTO / Data Contract

合格。`HandoffConfirmation`、`ExportRequest`、`AccountContext`、`SigningTarget`、`SigningApproval`、`SigningRequest` が追加され、§9.2 の該当 operation と接続している。target、status、context、payload の欠落・未知・不整合は `InvalidArgument` で拒否される。

### Initial Mnemonic Handoff

合格。`Confirmed` は Application の確認成立 assertion として、同じ pending から返された完全な Mnemonic の提示・受領確認後だけ設定される。未確認 pending は committed Profile へ昇格せず、retry / restart では confirmation と authorization を継承しない。Core が UI 方式や内部 token を検証する仕様へ逸脱していない。

### Explicit Secret Export

合格。target、user explicit request、Application / UI confirmation、confirmed request および per-operation password authorization は別条件である。`password possession == export approval` を許さず、失敗時は secret、normal result、replacement、state change を返さない。

### Signing Approval / Authority

合格。`Approved` request のみを対象とし、approval と password authorization を分離する。target / payload / context と approval の関係、Binding の意味無変更、Core の Transaction 非解釈、failure 時の signature 非返却が一意である。

### Account / Chain / Network

合格。Profile の Network、Software Key の Chain、requested Account context、`profile_id + key_id` 解決の関係が明確である。unsupported / invalid combination、fixed mismatch、wrong Profile / Key を §10 の error と state 不変へ結び付け、Symbol / NEM、Mainnet / Testnet の implicit conversion / fallback を禁止している。

### Store / Version / Migration / Regression

合格。`wallet-store-format-v1.md` と照合し、CBOR complete item、deterministic encoding、AAD、unknown field / enum、duplicate、version、no migration、atomic replacement および existing state protection に回帰はない。passwordless metadata の `origin` 非開示、Profile / key duplicate、Profile isolation も維持している。

### Pending / Failure / Retry / Restart

合格。pending と committed を区別し、stale / invalid / unconfirmed pending を reject する。retry は新しい operation であり、password、confirmation、approval を再取得する。restart 後の authorization / pending 自動復元と previous result の継承を禁止し、失敗時の existing committed state を保護する。

### Error / Fail-closed

合格。Core の `InvalidArgument`、`NetworkMismatch`、`AuthenticationFailed`、`PendingProfileInvalid`、`CryptoFailure` 等と Binding の `BindingFailure` の境界が定義されている。各 failure class は normal result 非成立、signature / secret / replacement 非返却、state 不変へ結び付いている。任意の無効 memory address の救済保証は追加していない。

### Native C ABI

合格。`InputBytes` の pointer / length、NULL / malformed 条件、caller-owned output struct、failure-safe 初期化、固定・可変長 field、Binding-owned buffer、`snwc_release_bytes`、double release / invalid pointer の保証範囲、allocation / conversion / ownership failure、partial output 禁止および secret output の caller lifecycle が §13.1 にある。caller が output struct を allocation し、Binding が variable-length buffer を所有・release する関係に矛盾はない。具体的 generated header / allocator は下流へ委譲されている。

### WASM / JavaScript Contract

合格。binary は Uint8Array 相当、DTO field / status / target / context は保持され、Core / Binding failure は `Err { code, diagnostics }` 相当として success value なしで返される。detached / unreadable buffer、secret result の caller lifecycle、opaque Store / Pending および Native と同一の security meaning が定義されている。

### Cryptographic Contract / Interoperability

合格。Symbol / NEM を分離し、Chain-specific scheme、hash、private-key handling、raw 64-byte `R || S`、raw payload 非変換、SDK 3.3.2 / protocol reference の役割、reference verification および deterministic signing fixture を定義している。§9.5.1 は exact byte equality を supplementary evidence とし、§14.1 も同じ位置付けであるため矛盾しない。protocol の transaction construction / generation hash は上位層へ委譲されている。

### Coverage / Security Testability

合格。§14.3 と §15 は NFR-005 / AC-044、line / function 90%、branch 85%、未達記録、coverage 単独合格の禁止を追跡可能にしている。§14.1〜§14.2 の fixture、negative、tamper、failure、binding および authorization 条件は coverage と独立している。

### Phase Boundary

合格。UI の具体方式、internal token、Rust module、pointer arithmetic、allocator、generated binding、runtime / host の完全消去、実 fixture 値および実装コードを Specification の規範詳細として要求していない。§12.1〜§12.2 に残る zeroize wrapper 等の記述は既存の implementation / release verification への Deferred 扱いであり、今回の外部契約を変更しない。

## Validation Results

- 実施: 指定順序で AGENTS.md、review playbook、登録 Phase Context の存在確認、`spec-review` Skill 一式、対象 Specification、Review 011、上流 Concept / Requirements / Design および同一フェーズ Store Specification を確認した。
- 実施: 最新 upstream review の公開判定を確認し、Concept、Requirements、Architecture、Security Design、Bindings Design の `READY` 状態を記録した。
- 実施: Markdown の必須18章と順序、SR-001〜SR-024 の status 28行、severity と Gate の整合を検査し、合格した。
- 実施: 成果物内の相対リンク24件のリンク先存在を検査し、すべて合格した。
- 実施: `git diff --check` を実行し、whitespace error は検出されなかった。`git diff --cached --check` は commit 前に実行する。
- 未実施: `cargo fmt --all -- --check`、`cargo clippy --workspace --all-targets --all-features -- -D warnings`、`cargo test --workspace --all-features`、`cargo check --target wasm32-unknown-unknown --features wasm`。変更対象は review artifact のみで、Rust / Binding / test は変更していないため対象外。
- 未確認: 実装・generated binding・実 fixture・coverage 実測・外部 Node・Application / UI の実 handoff / export / signing approval 適合性。これらを Specification の成功証拠として扱っていない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | §1〜§2 が Core、Binding、Application、対象外および Store format との責任境界を示す。 | なし |
| 2. 契約 | 合格 | §9.1.1〜§9.5、§13 が handoff、export、approval、context、error、ownership、length、release および result を定める。 | なし |
| 3. 処理と例外 | 合格 | §8.1、§10〜§11、§13、§14.2 が pending、failure、retry、restart、fail-closed、partial output 禁止を定める。 | なし |
| 4. 内部整合性 | 合格 | §9.5.1 と §14.1 の scheme / deterministic fixture / exact-byte equality の位置付け、Store format の CBOR / AAD / version / unknown field 規則に矛盾はない。 | なし |
| 5. 検証可能性 | 合格 | §14.1〜§14.3 が deterministic fixture、reference verification、negative 条件、coverage target / 未達記録および独立合格条件を定める。 | なし |
| 6. 安全性と相互運用性 | 合格 | §1、§3、§8、§9、§10、§11、§12.3、§13 が secret boundary、authorization、signing authority、Chain / Network、Store、raw signature、Native / WASM same meaning を定める。 | なし |
| 7. 上流整合性 | 合格 | Concept、Requirements、Architecture、Security Design、Bindings Design の確定済み責任・invariant・委譲範囲と整合する。 | なし |

Formal Gate: **`READY`**。Critical / Major / Minor は `0 / 0 / 0` 件であり、現行 Skill の `Critical = 0` 条件を満たす。未解決 Major / Minor を理由とする例外は存在しない。

## Remaining Risks and Open Decisions

- Specification-level Open Decision: 0。確認、export、approval、context、error、ABI、WASM、pending、retry、restart、cryptographic result および coverage の対象契約に未決定事項は残っていない。
- Upstream Feedback: 0。現行上流本文と最新公開 review state に、Specification の安全な完了を妨げる gap はない。
- Security / interoperability blocking gap: 0。secret export authorization、signing approval、Chain / Network binding、signature representation、Store integrity、Native / WASM failure safety は外部契約から判定できる。
- 残存する下流リスク: 実装が本仕様、Store format、参照 verifier、deterministic fixture および Native / WASM lifecycle 契約に適合するかは、Implementation / Test / release verification で独立に確認する必要がある。
- 非規範的 Context: `docs/context/design-context.md` は登録されているが存在しない。今回の判定は正式資料のみで成立しており、Context の不在は Specification Gate に影響しない。

以上により、`CORE SPECIFICATION READY` を宣言できる。これは実装適合性、generated binding、実 fixture、coverage 実測または host compromise 防止を宣言するものではない。

## Automatic Changes

レビュー中に `docs/specifications/specification.md`、Concept、Requirements、Design、`wallet-store-format-v1.md`、Implementation、Test、Fixture、README、過去 review artifact または Skill を変更していない。新規作成対象は本 review artifact のみである。

## Final Decision

`READY`

SR-002、SR-006、SR-007、SR-016、SR-020〜SR-024 はすべて `RESOLVED`。SR-001〜SR-019 の明確な regression はなく、新規 formal finding もない。Critical / Major / Minor は `0 / 0 / 0`、Upstream Feedback はなく、Specification-level Open Decision と security / interoperability 上の blocking gap は 0 である。

したがって、現行 Skill の formal Review Result は `READY`、および本フェーズの完了状態として **`CORE SPECIFICATION READY`** と判定する。
