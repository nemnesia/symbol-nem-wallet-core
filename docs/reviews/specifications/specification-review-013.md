# Specification Review 013

## Review Target

- 対象: [`docs/specifications/specification.md`](../../specifications/specification.md)
- 対象 commit: `266d679cb5e1a2006a72dbfc9c9d4c6826ea9af1`
- 確認日: 2026-08-31 +0900
- 成果物: `docs/reviews/specifications/specification-review-013.md`
- Review Scope: 上流横断・敵対再レビュー後の Specification 再整合。全新規 Mnemonic 生成の handoff、restore の対象外化、Application assertion freshness と Core authorization の境界、current Store authority、valid historical Store rollback、deletion guarantee、Wallet Store Format 非変更、SEC-023、Native / WASM Binding、retry / restart、既存 SR-001〜SR-024 の回帰、Requirements / Design traceability、Gate および Implementation Review への引継ぎを確認した。
- Related Specification: [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md)。Store Format 自体は独立再レビューせず、現行 `specification.md` との整合性だけを確認した。
- Previous review: [`specification-review-011.md`](specification-review-011.md)、[`specification-review-012.md`](specification-review-012.md)。Review 012 の READY は機械的に継承せず、現行本文と現行上流資料から再評価した。
- 未確認範囲: Rust / Native / WASM の実装適合性、generated binding、実 fixture、coverage 実測、実 Application / UI の handoff・export・signing assertion freshness、persistent storage 実装、外部 Node、host / runtime / third-party library の実動作。これらは本レビューの Specification 適合の証拠として扱っていない。
- Phase Context: `AGENTS.md` に対象フェーズの登録はなく、使用していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない自己レビュー。実施していない起動や投票は記録していない。
- Reviewer A（契約の明確性と完全性）: 完了。API / DTO、入力・出力、validation、error、状態、順序、determinism、Store、Native / WASM の外部契約を確認した。
- Reviewer B（利用価値と運用適合性）: 完了。Requirements との追跡、Core / Application / persistence / Binding の責任、handoff、restore、export、signing、delete、replacement、failure、retry、restart を確認した。
- Reviewer C（Security / Interoperability primary）: 完了。protected asset、per-operation authorization、assertion、signing authority、Account / Chain / Network、Wallet Store integrity、fail-closed、SEC-023、Symbol / NEM、Native / WASM parity を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を `specification.md` と新規 review artifact に限定し、上流・同一フェーズ Store Format・過去 review を指定範囲で参照した。
- Phase 1（独立レビュー）: 完了。Reviewer A / B / C の担当観点を分離して確認した。
- Phase 2（反証・統合）: 完了。生成 handoff、restore、assertion replay、historical Store rollback、delete、Store schema、side-channel、Binding、retry / restart および SR-001〜SR-024 を敵対シナリオで再確認した。重複候補は統合し、新しい root cause は確認されなかった。
- Phase 3（Gate・成果物）: 完了。現行 `review-gates.md` の Critical 基準で判定し、Finding Status、traceability、validation、Gate および残存リスクを本 artifact に記録した。

## Evidence Used

| 区分 | 資料 | 用途 |
| --- | --- | --- |
| Review rules | [`AGENTS.md`](../../../AGENTS.md)、[`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/spec-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/spec-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/spec-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/spec-review/output-format.md) | Phase boundary、Reviewer A〜C、security 観点、finding 採用条件、Gate、成果物構成を確認 |
| Common review policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`review-common/output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、Upstream Feedback / Deferred Findings、章構成、検証および Git ルールを確認 |
| Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) | Core 継続 ownership、通常非開示、Symbol / NEM、Mainnet / Testnet、v1 境界を確認 |
| Requirements | [`requirements.md`](../../requirements/requirements.md) | 指定された FR / SEC / AC、per-operation authorization、handoff、Store currentness、side-channel、Binding および coverage の normative source を確認 |
| Architecture | [`architecture.md`](../../design/architecture.md) | Core / Application / persistence / Binding の責任、handoff、Store、pending、rollback、retry / restart を確認 |
| Security Design | [`security.md`](../../design/security.md) | protected asset、authorization、failure safety、assertion freshness、side-channel guarantee boundary を確認 |
| Bindings Design | [`bindings.md`](../../design/bindings.md) | Binding non-authority、opaque Store、handoff、retry / restart、Native / WASM parity を確認 |
| Upstream cross review | [`upstream-cross-adversarial-review-001.md`](../design/upstream-cross-adversarial-review-001.md)、[`upstream-cross-adversarial-review-002.md`](../design/upstream-cross-adversarial-review-002.md) | DR-XA-001〜DR-XA-004 の確定状態、上流 Open Decision、Specification への realignment 範囲を確認 |
| Wallet Store Format | [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md)、[`wallet-store-format-v1-review-004.md`](wallet-store-format-v1-review-004.md) | deterministic CBOR、unknown field / enum、version、AAD、duplicate_tag、atomic replacement との整合だけを確認 |
| Previous Specification reviews | [`specification-review-011.md`](specification-review-011.md)、[`specification-review-012.md`](specification-review-012.md) | SR-001〜SR-024 の初出、completion condition、既存状態および回帰確認の基準を確認 |

### Current upstream review state

- Upstream Cross Review 002: `READY` / `UPSTREAM DESIGN READY`。
- DR-XA-001、DR-XA-002、DR-XA-003、DR-XA-004: すべて `RESOLVED`。
- Upstream Open Decision: なし。Upstream Feedback: なし。
- Wallet Store Format Review 004: `READY` / `WALLET STORE FORMAT V1 READY`、SR-001〜SR-009 はすべて `RESOLVED`。

## Review Result

`READY`

## Summary

対象 commit `266d679` の Specification は、上流で確定した次の事項を現行外部契約へ反映している。

- Core が Mnemonic を新規生成するすべての Profile creation は、`prepare_generated_profile`、handoff、利用者の明示的受領確認、`Confirmed` の伝達、`finalize_generated_profile`、replacement Store の順で確定する。handoff なしの committed success は定義されていない。
- 既存 Mnemonic の restore は生成時 handoff confirmation の対象外であり、通常の Mnemonic validity、Store、duplicate および password 条件で処理する。§8.2 の全文に誤った「新規生成時の backup confirmation は要求しない」文言は残っていない。
- `Requested`、`Confirmed`、`Approved` は Application / UI が current operation の利用者意思を表す assertion として生成し、freshness は Application / UI が管理する。Core は per-operation password authorization、status、target、payload、AccountContext、pending および Store 条件を検証するが、UI 表示・実利用者操作・assertion freshness を独立証明しない。
- v1 に challenge、assertion freshness 用 nonce、expiry、one-shot token、replay cache または freshness 専用 request ID は追加されていない。Store 暗号化に必要な nonce と assertion freshness protocol は混同されていない。
- current Store の選択、successful replacement の保存・適用、stale / historical Store の再適用防止および snapshot 最新版管理は Application / persistence layer の責任である。Core は stateless な opaque Store processor として過去 Store history を保持しない。
- `S0` のような valid historical Store は historical であることだけで Core が reject せず、malformed / tampered と誤分類しない。rollback を安全とする保証ではなく、current Store の選択と stale 再適用防止を Application / persistence layer に残す residual risk として明示されている。
- deletion guarantee は、Core が返した successful replacement Store から対象 secret が除去され、Application / persistence layer がそれを current Store として正しく保存・適用した状態に対する保証である。Core が過去 snapshot 全体を無効化する過剰保証にはなっていない。
- Wallet Store wire schema は変更されていない。generation / revision counter、rollback marker、revocation list、current-state field、monotonic field、external anchor は要求されず、Store Format の deterministic CBOR、unknown field / enum、version、AAD、duplicate_tag、atomic replacement と矛盾しない。
- SEC-023 / AC-049 は §12.4、§14.2、§15、§15.1 に trace され、Core 自身の不要な secret-dependent control flow / timing behavior / data access を契約とする。一方、third-party cryptographic library、compiler、runtime、OS、browser、hardware、CPU microarchitecture の完全な side-channel absence、specific library、assembly inspection、fork、compiler flag、specific tool は固定・保証されていない。
- Native / WASM Binding は status を生成・補完せず、assertion を別 operation へ再利用せず、target / payload / AccountContext を書き換えず、current Store selector、rollback detector、Store history DB にならない。

新規 formal finding はなく、SR-001〜SR-024 の回帰も確認されない。Critical / Major / Minor は `0 / 0 / 0` であり、Implementation Review へ安全に進める。これは実装、Application、generated binding、fixture、coverage 実測または host compromise 防止の完了を意味しない。

## Finding Status

### SR-001〜SR-024 Regression Status

| ID | Severity | 今回の状態 | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | `RESOLVED` | specification-review-001 | §4.2、§14.1 の Chain 別 root HMAC、BIP32 path、NEM reverse、SDK 3.3.2、deterministic fixture を維持している。 |
| SR-002 | Major | `RESOLVED` | specification-review-001 / Reopened in 011 | §8.1、§9.1.1、§11.2、§14.2 が全新規生成 handoff、`Confirmed`、pending 非昇格、失敗時非確定・非返却を定めている。 |
| SR-003 | Major | `RESOLVED` | specification-review-001 | §7、§10、§11 が Store Format の CBOR、AAD、wire 表現および failure mapping を参照している。 |
| SR-004 | Major | `RESOLVED` | specification-review-001 | §9、§12.3、§13 が DTO、raw bytes、secret boundary、Native / WASM 共通結果を定めている。 |
| SR-005 | Major | `RESOLVED` | specification-review-001 | §6.3、§7、§11 と Store Format §11〜§12 が `registry_key`、`duplicate_tag`、AAD、index / payload 写像を維持している。 |
| SR-006 | Minor | `RESOLVED` | specification-review-001 / Reopened in 011 | §10 が unsupported / invalid / fixed mismatch、Binding failure、正常結果非成立、state 不変および secret / replacement 非返却を対応付けている。 |
| SR-007 | Major | `RESOLVED` | specification-review-001 / Reopened in 011 | §8.1、§11、§14.2 が pending / committed、stale / unconfirmed、retry の再認証・再確認、restart 後非継続を定めている。 |
| SR-008 | Major | `RESOLVED` | specification-review-002 | §9.3 の passwordless list は `key_id` / `chain` のみで `origin` を返さない。 |
| SR-009 | Major | `RESOLVED` | specification-review-002 | §5.2 が CSPRNG、予測可能な fallback 禁止、invalid key reject、`RandomSourceFailure` を維持している。 |
| SR-010 | Minor | `RESOLVED` | specification-review-003 | §6.4、§9.2、§10 が password recovery / reset 禁止と紛失時 failure を維持している。 |
| SR-011 | Major | `RESOLVED` | specification-review-003 | §8.3、§9.2、§9.3 が display name を Core / Store から除外している。 |
| SR-012 | Major | `RESOLVED` | specification-review-004 | §3.1、§7、§9.2、§10 が Profile / Key ID の一意性と曖昧な対象の reject を維持している。 |
| SR-013 | Major | `RESOLVED` | specification-review-004 | §6.3、§10、§11 と Store Format §12 が認証後の `duplicate_tag` と Mnemonic / Network の意味的一致を維持している。 |
| SR-014 | Major | `RESOLVED` | specification-review-005 | §5.3、§7、§14.2 と Store Format §9 が同一 Profile・同一 Chain・同一 private key の重複条件を維持している。 |
| SR-015 | Major | `RESOLVED` | specification-review-006 | §8.2、§9.3、§11 と Store Format §14.1 が整合 Store に限定した duplicate 保証と passwordless metadata 境界を維持している。 |
| SR-016 | Major | `RESOLVED` | specification-review-006 / Reopened in 011 | §13.1〜§13.2 が input / output、NULL / length、ownership、release、failure mapping、secret lifecycle、Native / WASM 同一意味を定めている。 |
| SR-017 | Minor | `RESOLVED` | specification-review-007 | §6.3、§7、§10、§11 と Store Format §2 が current schema の opaque / lossless 保持と future version reject を維持している。 |
| SR-018 | Major | `RESOLVED` | specification-review-008 | §12、§12.3、§13 が third-party / host の保証境界と Core / Binding の non-retention responsibility を区別している。 |
| SR-019 | Major | `RESOLVED` | specification-review-009 | §7、§10、§11 と Store Format §2〜§2.1 が complete deterministic CBOR item 1 個、trailing / multiple item、型および version error を維持している。 |
| SR-020 | Critical | `RESOLVED` | specification-review-011 | §8.4、§9.1.1、§9.4、§10、§14.2 が export target、`Requested`、target-specific `Confirmed`、per-operation password authorization を分離している。 |
| SR-021 | Critical | `RESOLVED` | specification-review-011 | §9.1.1、§9.5、§10、§13.2、§14.2 が `Approved` と password authorization、target / payload / context、failure 時の signature 非返却を分離している。 |
| SR-022 | Major | `RESOLVED` | specification-review-011 | §3.2〜§3.3、§9.1.1〜§9.2、§10、§14.2 が Profile fixed Network、Software Key fixed Chain、AccountContext および mismatch mapping を定めている。 |
| SR-023 | Major | `RESOLVED` | specification-review-011 | §4.2、§5.2、§9.5.1、§14.1、§18 が Symbol / NEM scheme、raw `R||S` 64 bytes、raw payload、reference verifier、SDK 3.3.2 を分離している。 |
| SR-024 | Minor | `RESOLVED` | specification-review-011 | §14.3、§15 が line / function 90%、branch 85%、SHOULD target、未達記録および coverage 単独合格禁止を trace している。 |

Formal finding: なし。今回、新規 finding ID は発行していない。

## Required Changes

なし。現行 Skill で必須となる `Critical` の New / Open / Reopened は確認されない。

## Optional Improvements

なし。`Major` / `Minor` の New / Open / Reopened は確認されない。実装・release verification への引継ぎ事項は Deferred Findings に分離した。

## Resolved Findings

### Upstream realignment findings

- `SR-002`: 新規生成全件に `HandoffConfirmation.status = Confirmed` を要求し、restore には要求しない。retry / restart で handoff、authorization、pending を暗黙継承しない。
- `SR-006`: Core error と BindingFailure を分け、missing / invalid status、mismatch、malformed input、allocation / conversion / ownership failure の結果を fail-closed にしている。
- `SR-007`: pending は opaque な未確定値であり、confirmed finalize 以外で committed Profile へ昇格しない。各 retry は独立 operation、restart 後は自動 resume しない。
- `SR-016`: Native / WASM の DTO preservation、input / output ownership、length、release、failure-safe output、secret lifecycle、error mapping および同一 observable security meaning を維持している。
- `SR-020`: export は target、`Requested`、target-specific `Confirmed`、per-operation password authorization の全条件を必要とし、password 所有だけでは成功しない。
- `SR-021`: signing は `Approved`、target、payload、AccountContext、per-operation password authorization を検証し、Core は Transaction の意味解釈や UI の承認事実を引き取らない。
- `SR-022`: Profile fixed Network、Software Key fixed Chain、AccountContext、wrong Profile / Key、unsupported / invalid combination、fallback / implicit conversion 禁止を維持している。
- `SR-023`: Symbol / NEM の Chain-specific scheme、NEM private-key handling、raw `R||S` 64 bytes、raw payload 非変換、reference verification と SDK 互換性を維持している。
- `SR-024`: coverage の line / function 90%、branch 85% は SHOULD-level target として扱い、未達記録と security / interoperability / failure-path の独立検証を要求している。

その他の SR-001、SR-003〜SR-005、SR-008〜SR-015、SR-017〜SR-019 も Finding Status 表のとおり `RESOLVED` を維持しており、今回の変更による root cause の回帰はない。

## Upstream Feedback

なし。Requirements / Design のどちらが正しいかを Specification だけで決める必要がある矛盾は確認されなかった。Review 002 の `Upstream Open Decision = none` と整合し、reviewer preference による新しい上流 decision は返していない。

## Deferred Findings

- 実装上の Rust Core、Native C ABI、WASM binding、parser、allocator、pointer safety、zeroization、実際の secret lifetime、実装上の side-channel、fixture、coverage 実測および release verification は Implementation / Release 側で確認する。
- Application / UI が実際に Mnemonic を提示したか、利用者が現在 operation で受領・export・signing を確認したか、Application が stale assertion を再利用しないかは Application responsibility であり、本 Specification Review の実行証拠ではない。Core がこれらを独立証明しない境界は仕様上確定している。
- Application / persistence layer が successful replacement を current Store として保存・適用し、stale / historical Store を再適用しないことは統合先の責任である。Core が過去 Store history を持たないことと矛盾する rollback rejection test は要求しない。
- `wallet-store-format-v1.md` は Review 004 で READY であり、今回の Store 確認は整合性だけに限定した。明確な wire contradiction は確認されなかった。

## Scope and Traceability

### Requirements → Specification

| Requirements | Specification の対応 | 判定 |
| --- | --- | --- |
| FR-001、FR-019、SEC-010、SEC-017、SEC-018、AC-001、AC-034 | §1、§8.1〜§8.2、§9.1.1〜§9.2、§10〜§11、§13.2、§14.2 | 全新規 Mnemonic generation の handoff 必須、confirmed finalize、失敗時非確定・非返却、restore の handoff 対象外を追跡できる。 |
| FR-007、FR-009、SEC-002、SEC-007、SEC-014、SEC-021、SEC-022、AC-050 | §1、§9.1.1、§9.4〜§9.5、§10、§11.2、§13、§14.2 | Application assertion freshness と Core の per-operation password authorization、request validation、pending 非昇格、retry / restart 非継承を分離している。 |
| FR-012、FR-017、SEC-005、SEC-018、AC-012、AC-018、AC-048 | §2.3、§7、§10〜§11、§13、§14.2 | current Store authority、successful replacement、stateless Core、valid historical Store の保証外 rollback、deletion guarantee を追跡できる。 |
| SEC-023、AC-049 | §12.4、§14.2、§15、§15.1 | Core 自身の不要な secret-dependent behavior と、third-party / host の完全 side-channel absence を保証しない境界を追跡できる。 |
| FR-019、SEC-010、SEC-017、SEC-020、AC-025〜AC-026、AC-041〜AC-043 | §8.4、§9.1.1、§9.4、§10、§11、§12.3、§13 | explicit export、secret boundary、Native / WASM の representation / ownership / failure を追跡できる。 |
| FR-013、FR-024、DR-005、DR-008、AC-009、AC-013、AC-047 | §3.2〜§3.3、§9.1.1〜§9.2、§9.5〜§9.5.1、§10、§14.1〜§14.2 | Profile Network、Software Key fixed Chain、AccountContext、wrong context、Symbol / NEM interoperability を追跡できる。 |
| DR-009、AC-018、AC-045 | §7、§10、§11、§14.1〜§14.2、Store Format §2〜§14 | version、deterministic CBOR、unknown field / enum、AAD、duplicate、no migration、fatal malformed handling を追跡できる。 |
| NFR-005、AC-044 | §14.3、§15 | line / function 90%、branch 85%、SHOULD target、shortfall record、coverage 単独で security 合格としない条件を追跡できる。 |

指定された FR-001、FR-007、FR-009、FR-012、FR-017、FR-019、SEC-005、SEC-010、SEC-017、SEC-018、SEC-021、SEC-022、SEC-023、AC-001、AC-012、AC-018、AC-034、AC-048、AC-049、AC-050 は、上表または同表が参照する仕様箇所にすべて対応する。

### Design → Specification

| Design の確定事項 | Specification の対応 | 判定 |
| --- | --- | --- |
| Core 継続 secret ownership、通常非開示、user intent と Core authorization の分離 | Architecture §3.1〜§3.3、§4、§5.1、§6.1〜§6.5; Security Design §3〜§6; Bindings Design §3〜§6 → §1〜§2、§8.1、§8.4、§9.1.1、§9.4〜§9.5、§10〜§13 | 一貫。handoff / export / signing の明示例外と Core ownership を維持している。 |
| Initial Mnemonic handoff の6段階、confirmation 前非 committed、失敗時非開示 | Architecture §6.1; Security Design §6.2; Bindings Design §6.3 → §8.1、§9.1.1、§11、§13.2、§14.2 | 一貫。new generation と restore を区別し、handoff なし成功を排除している。 |
| Application assertion freshness と Core guarantee boundary | Architecture §6.1、§6.3〜§6.5、§9.2; Security Design §6.1〜§6.6、§9.2; Bindings Design §6.1〜§6.6、§9.1 → §1、§8、§9.1.1、§9.4〜§9.5、§11.2、§13、§14.2 | 一貫。Application は fresh assertion を管理し、Core は UI 事実・freshness を独立証明しない。 |
| Current Store authority、stateless Core、valid historical Store rollback の保証外範囲 | Architecture §5.2〜§5.3、§8、§9.3〜§9.4; Security Design §6.5、§9.3; Bindings Design §5.2、§6.6、§9.3 → §2.3、§7、§11、§13、§14.2 | 一貫。Core は prior-call history を使用せず、currentness / rollback は Application / persistence に残る。 |
| Binding thin non-authority、opaque Store、ownership / lifecycle / failure mediation | Architecture §3.3、§4.2、§5.2; Security Design §4.3、§8; Bindings Design §3、§5、§6、§8、§9 → §7、§9.1、§10、§12.3、§13、§14.2 | 一貫。Binding は status、target、payload、AccountContext、Store を補正・解釈しない。 |
| Profile fixed Network、Software Key fixed Chain、Account context、fallback / implicit conversion 禁止 | Architecture §5.1、§7; Security Design §7; Bindings Design §7 → §3.2〜§3.3、§9.1.1〜§9.2、§9.5、§10、§14.1〜§14.2 | 一貫。Symbol / NEM と Mainnet / Testnet を分離している。 |
| SEC-023 side-channel property と guarantee boundary | Architecture §4.1、§8、§10; Security Design §8.1〜§8.3、§10; Bindings Design §10.2 → §12.4、§14.2、§15、§16 | 一貫。Core の contract と downstream implementation / release verification を分離している。 |

### Wallet Store Format consistency

`specification.md` §7、§10、§11、§14.1〜§14.2 は、Store Format §2、§4、§7.1、§11〜§14 と次の点で一致する。

- 完全な deterministic CBOR item 1 個、top-level map、trailing / multiple item、duplicate map key、型・長さ・canonical order 違反、unknown enum、unsupported version は `InvalidStore` または version 専用 error として全体 reject する。
- unknown field は current schema version の opaque extension として意味解釈せず、warning なしで受理し、mutation 時に lossless 保持できなければ `InvalidStore` とする。`software_key_index` は受信 wire 値を AAD に使用する。
- `registry_key`、`duplicate_tag`、Profile Network、Mnemonic entropy の意味的一致、index / encrypted payload の有限写像および duplicate semantics を維持する。
- password change / key mutation の atomic replacement、対象外 Profile の wire preservation、Profile delete の envelope 除去を維持する。
- Store Format に current-state field、monotonic field、generation / revision counter、rollback marker、revocation list、external anchor を要求する新規契約はない。currentness は Application / persistence responsibility であり、wire schema と混同されていない。

## Domain Checks

### Profile / Mnemonic / Software Key model

合格。Profile は Network（Mainnet / Testnet）を固定し Chain には固定しない。Software Key は Symbol / NEM の Chain に固定され、Derived / Imported / Generated を共通 lifecycle で扱う。Profile は Mnemonic を 1 つ持ち、display name、origin、`account_index` の passwordless metadata 境界および duplicate semantics に回帰はない。

### Generated Mnemonic handoff

合格。新規 generation の一意な success flow は次のとおりである。

```text
new generation
    -> prepare_generated_profile
    -> complete Mnemonic handoff
    -> explicit receipt confirmation
    -> HandoffConfirmation.status = Confirmed
    -> finalize_generated_profile
    -> successful replacement Store
```

`prepare_generated_profile` は Store に Profile を追加せず、`finalize_generated_profile` は `Confirmed`、同じ pending、同じ password、対象 Store / Profile 条件の検証と replacement Store の返却が全て成立した場合だけ成功する。confirmation missing、`Unconfirmed`、表示値不一致、handoff failure、user refusal、interruption、retry / restart、finalization failure では Profile success、replacement、秘密情報または partial success を返さない。handoff なしの generated Profile committed success は仕様上存在しない。

### Restore lifecycle and §8.2 stale wording

合格。`restore_profile` は既存 Mnemonic を入力し、BIP39 validity、Store / Profile 構造、duplicate、password 等の通常条件で処理する。生成時 handoff confirmation は要求しない。対象文書全文を検索し、§8.2 に `新規生成時の backup confirmation は要求しない` または同義の誤った条件付き生成規則は確認されず、restore の handoff 対象外だけが明示されている。

### Assertion freshness and Core boundary

合格。`Requested`、`Confirmed`、`Approved` は Application / UI の current operation assertion であり、Application は過去 assertion を新しい利用者意思として再利用しない。Core は次を保証する。

- operation ごとの Profile password authorization。
- required status、request target、payload、AccountContext、Profile / key 解決、Chain / Network compatibility、Store validity、pending 条件の検証。
- confirmation / approval の欠落や不成立、target / payload / context mismatch の reject。
- unconfirmed pending の committed Profile への非昇格。
- retry / restart における Core 内 authorization、pending、secret-capable state の非継承。

Core は UI が実際に表示したこと、利用者が実際に今承認・確認したこと、Application assertion が fresh であることを独立証明しない。この境界は Application responsibility と矛盾しない。

### No new freshness protocol

合格。§9.1.1、§11.2 は既存 DTO structure を維持し、challenge、assertion freshness 用 nonce、expiry、one-shot token、approval token、confirmation token、replay cache、freshness 専用 request ID を追加していない。§6.2 / §6.3 の encryption nonce は暗号化ごとの CSPRNG nonce であり、Application assertion freshness protocol ではない。Pending の内部 representation や timeout 等は公開 freshness protocol として固定されていない。

### Current Store authority and stateless Core

合格。§2.3、§7、§11.1〜§11.3、§13、§14.2、§15.1 が、Application / persistence layer の current Store selector、successful replacement の保存・適用、stale / historical Store の再適用防止、backup / snapshot 最新版管理を定める。Core は opaque Store の structure / version / authentication / integrity / consistency と current operation の mutation を処理するが、prior-call Store history、currentness database、rollback detector を持たない。

### Valid historical Store rollback boundary

合格。`S0` = delete 前の valid Store、`S1` = delete 成功後の replacement Store とした場合、Application が `S1` を current として保存した後に `S0` を Core へ渡しても、Core は `S0` が historical であることだけでは reject しない。`S0` が structure / version / authentication / integrity / consistency を満たす限り malformed / tampered と誤分類しない。Core は prior-call history を受入条件にせず、rollback prevention は Application / persistence responsibility、rollback 自体は安全保証外の residual risk である。

### Deletion guarantee

合格。Profile delete / Software Key delete の保証は、Core が返した successful replacement Store に対象 Profile / Software Key と対象 secret が存在せず、Application / persistence layer がその replacement を current Store として正しく保存・適用した状態に対して定義される。Core が全ての過去 snapshot を世界から無効化する保証や historical Store の reject 保証はない。

### Wallet Store / serialization / validation

合格。deterministic CBOR、unknown field、unknown enum、version、AAD、`duplicate_tag`、duplicate semantics、resource limits、complete item、atomic replacement、migration 非提供および malformed / tampered / inconsistent input の fail-closed は Store Format と一致する。Store schema 変更の要求はなく、上流方針により新しい current-state field 等を導入していない。

### SEC-023 side-channel contract

合格。§12.4 は SEC-023 / AC-049 を直接参照し、Core 自身が実装・管理する秘密情報処理で不要な secret-dependent control flow、timing behavior、data access を導入しない契約を定める。§14.2 は implementation evidence の確認を要求し、§15 / §15.1 は Requirements / Design に trace する。

### Side-channel guarantee boundary

合格。third-party cryptographic library、compiler、runtime、OS、browser、hardware、CPU microarchitecture の完全な side-channel absence は Core の保証対象外である。specific constant-time library、assembly inspection、third-party fork、specific compiler flag、specific side-channel tool、specific zeroization technique を仕様上固定していない。具体 verification は Implementation / Release verification に委譲される。

### Binding assertion and Store behavior

合格。Native / WASM Binding は assertion を生成・補完せず、password から status を作らず、stale assertion を cache して別 operation へ再利用せず、target / payload / AccountContext を書き換えない。Binding は current Store selector、rollback detector、Store history DB にならず、Wallet Store / PendingProfileBlob を opaque のまま transport する。Core の error、warning、success、replacement、secret return condition を意味変更しない。

### Retry / restart

合格。各 API call は independent operation である。retry は password、confirmation、approval、Store、input を current operation として再提供・再取得し、Core の前回 authorization、pending、secret、success result を継承しない。同じ pending を再入力する場合も current validation、確認、authorization が必要である。restart 後に authorization、unlocked state、unconfirmed pending を auto-resume / auto-promote しない。

### Failure / fail-closed

合格。malformed、wrong password、tampered / corrupted Store、unsupported version、duplicate、wrong Chain / Network、missing / invalid status、target / payload / AccountContext mismatch、handoff / export / signing failure、allocation / conversion / ownership failure では、対応する error を返し、secret、signature、normal success result、replacement Store、partial mutation を返さず、既存 committed state を変更しない。Core error と `BindingFailure` の境界も維持されている。

### Chain / Network and signing interoperability

合格。Profile fixed Network と Software Key fixed Chain を分離し、wrong context、unsupported value、invalid combination、implicit conversion / fallback を拒否する。Symbol は Ed25519 / SHA-512、NEM は `ed25519-keccak` / Keccak-512 として分離し、raw payload に対する exact raw `R||S` 64-byte signature、Chain-specific verifier、`symbol-sdk` 3.3.2 compatibility、deterministic fixture および reference verification を定める。Symbol signing と NEM signing を同一 scheme として扱っていない。

### Secret lifecycle / Native C ABI / WASM

合格。Core ownership、zeroize 対象の契約、不要 copy / retention 回避、diagnostic non-leakage、WASM の `Uint8Array` 相当、Native の pointer / length / ownership / release、failure-safe output、Core error と BindingFailure、secret result の caller lifecycle、Native / WASM の同一 observable security meaning を維持している。具体 pointer arithmetic、allocator、runtime memory、actual host copy は下流へ委譲されている。

### Tests / verification / coverage

合格。§14.1〜§14.2 は deterministic key / address / signature / reference verifier / Store / AAD fixture、missing status、Unconfirmed / NotApproved / NotRequested、target / context mismatch、password separation、pending、retry / restart、stateless Store acceptance、valid historical Store boundary、SEC-023 evidence、Binding boundary、failure safety を要求する。Core test に「user が本当に今 UI で押した」ことの独立証明や、Core が Store history を持たないことと矛盾する historical rollback rejection test を要求していない。§14.3 は line / function 90%、branch 85% の SHOULD target、shortfall record、coverage 単独で security proof としない条件を維持する。

## Validation Results

- 実施: 指定された review rules、対象 Specification、Concept、Requirements、Architecture、Security Design、Bindings Design、upstream cross reviews、Wallet Store Format と Review 004、Specification Review 011 / 012 を読み、現行 commit `266d679` に対して再評価した。
- 実施: `specification.md` 全文の stale handoff wording、generated / restore lifecycle、assertion freshness、challenge / nonce / expiry / token、current Store / historical rollback、deletion guarantee、SEC-023、Binding boundary を検索・照合した。
- 実施: SR-001〜SR-024 の finding ID、severity、status、completion condition および今回の root cause 回帰を確認した。全件 `RESOLVED`、新規 finding なし。
- 実施: Requirements traceability（指定 FR / SEC / AC を含む）、Design traceability、Store Format consistency、generated / restore、assertion、historical rollback、SEC-023、Binding および fail-closed を確認した。
- 実施: Review artifact の Markdown 必須章と順序、relative link、finding ID、SR status、severity / Gate consistency、review artifact 以外の変更範囲を確認した。
- 実施: `git diff --check` を実行し、whitespace error は検出されなかった。
- 実施: `git diff --cached --check` を artifact の staging 後に実行し、whitespace error は検出されなかった。
- 未実施: `cargo fmt`、`cargo clippy`、`cargo test`、WASM check、Native / WASM 実行検証。Rust、Binding、test、fixture は変更していないため今回の対象外である。
- 未確認: 実装が本 Specification に適合すること、実 Application / UI が assertion freshness を守ること、実 storage が current Store authority を正しく実装すること、実 fixture / coverage の結果。未実行・未確認を成功結果として扱っていない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | §1〜§2 が Core、Binding、Application / persistence、対象外および Store Format の境界を示す。 | なし |
| 2. 契約 | 合格 | §8、§9、§10、§13 が handoff、restore、export、approval、context、Store、error、ownership、length、release、replacement を定める。 | なし |
| 3. 処理と例外 | 合格 | §8、§10〜§11、§14.2 が generated / restore、pending、failure、retry、restart、fail-closed、historical boundary、partial output 禁止を定める。 | なし |
| 4. 内部整合性 | 合格 | generated handoff と restore の区別、Application freshness と Core validation、current Store と stateless Core、deletion guarantee と valid historical Store、Store Format の wire 契約に矛盾はない。 | なし |
| 5. 検証可能性 | 合格 | §14.1〜§14.3 が deterministic fixture、negative case、interop、SEC-023 evidence、Binding boundary、coverage target / shortfall を定める。 | なし |
| 6. 安全性と相互運用性 | 合格 | §3〜§7、§9〜§13 が secret exposure、authorization、signing authority、Chain / Network、Store integrity、fail-closed、Native / WASM、Symbol / NEM raw signature を定める。 | なし |
| 7. 上流整合性 | 合格 | Concept、Requirements、Architecture、Security Design、Bindings Design および upstream cross review 002 の確定事項と整合し、DR-XA-001〜004 の再発はない。 | なし |

Formal Gate: **`READY`**。Critical / Major / Minor は `0 / 0 / 0` 件であり、現行 `review-gates.md` の `Critical = 0` 条件を満たす。Major / Minor を独自に Gate failure へ変更していない。

## Remaining Risks and Open Decisions

- Specification-level Open Decision: なし。handoff、restore、export、signing、assertion freshness、Store currentness、historical rollback、delete、SEC-023、Binding、retry / restart、Chain / Network、signature representation、coverage の外部契約に未決定事項はない。
- Upstream Feedback: なし。上流に新しい decision を返す必要はない。
- Security blocking gap: なし。secret return boundary、per-operation authorization、pending 非昇格、Store fail-closed、deletion guarantee、SEC-023 scope、Native / WASM failure safety は仕様から判定できる。
- Interoperability blocking gap: なし。Symbol / NEM の scheme、Profile Network、Software Key fixed Chain、AccountContext、raw payload、raw `R||S` 64 bytes、reference verifier および Store wire boundary は一意である。
- Accepted residual risk: Application が stale assertion または valid historical Store を再提出する場合の完全防止は Core の保証外である。Application / persistence layer は current Store authority として再適用を防止するが、Core は過去 history を保持しない。rollback は安全保証ではない。
- Accepted out-of-scope risk: Application / Browser / OS / host compromise、third-party crypto library、compiler、runtime、hardware、CPU microarchitecture の完全保証、実際の JS / FFI memory lifetime は下流確認範囲である。

以上により、`CORE SPECIFICATION READY` を宣言できる。`SPECIFICATION PHASE READY TO CLOSE` とし、次工程は Implementation Review へ進めてよい。ただし、上記 Deferred Findings の実装・運用検証は別途必要である。

## Automatic Changes

レビュー中に変更したのは本新規 artifact のみである。`specification.md`、Concept、Requirements、Architecture、Security Design、Bindings Design、`wallet-store-format-v1.md`、Implementation、Tests、Fixtures、README、既存 review artifact および Skill は変更していない。

## Final Decision

`READY`

`CORE SPECIFICATION READY`

`SPECIFICATION PHASE READY TO CLOSE`

SR-001〜SR-024 はすべて `RESOLVED`、新規 formal finding はない。Critical / Major / Minor は `0 / 0 / 0`、Upstream Feedback はなく、Specification-level Open Decision、security blocking gap、interoperability blocking gap もない。現行 Specification は上流確定事項と Wallet Store Format に整合しており、Implementation Review へ安全に進める。
