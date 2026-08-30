# Implementation Review Findings

## Review Target

- 対象: `HEAD ffd305a9757a25ddcc99a9eaaaf797530dead38f` の Rust Core、Native C ABI、WASM Binding、公開 API、tests、fixture、fuzz target、Cargo manifest / lock、feature configuration、build / runtime / coverage 導線
- 確認日: 2026-08-31（Asia/Tokyo）
- 成果物: `docs/reviews/implementation/implement-review-011.md`
- レビュー種別: 旧 `implement-review-010` の follow-up ではない、現行 HEAD と現行確定済み Specification 全体に対するゼロベースの独立再レビュー
- 適用範囲: Phase 0〜3、Reviewer A〜D、Specification conformance、security、Symbol / NEM interoperability、異常系、ownership / memory safety、Native / WASM parity、test / fixture / fuzz / coverage、dependency / feature
- Phase Context: `AGENTS.md` に Implementation Context の登録はなく、Context は探索・生成・使用していない
- 未確認範囲: 外部ネットワーク上の SDK / reference verifier を追加実行する検証、fuzz campaign の実行、branch coverage の有効な実測、実行環境制約により完了しなかった Native sanitizer runtime

## Execution Audit

- 実行モード: Review Board Chair として同一エージェント内で Reviewer A〜D の self-review path を分離して実施。サブエージェントは使用していない。
- Reviewer A — Specification Conformance: 完了。Core / Native / WASM の API shape、入力・出力、request DTO、state、error、replacement、atomicity、lifecycle を現行 Specification §8〜§13 と照合した。
- Reviewer B — Security: 完了。Mnemonic、entropy、seed、private key、KDF output、decrypted payload、signing authority、Pending、Store、RNG、AEAD、secret lifecycle、side-channel、FFI、WASM、failure path を追跡した。
- Reviewer C — Symbol / NEM interoperability: 完了。Chain / Network 分離、BIP39 / HD path、NEM byte handling、hash、raw payload、signature representation、AAD / deterministic CBOR、fixture を照合した。
- Reviewer D — Test / quality: 完了。normal / negative / boundary、known vector、independent oracle、differential arithmetic、Native ownership、WASM conversion、fuzz target、coverage、CI / runtime script を確認した。
- Phase 2 refutation: custom scalar arithmeticの correctness defect、AEAD authentication bypass、nonce reuse、Store history / rollback detector、Pending auto-promotion、Symbol / NEM primitive混同、通常の secret zeroization欠落は候補段階でコード・fixture・仕様を再確認し、採用しなかった。未知 field type、request assertion omission、Native output / release、BindingFailure mapping および SEC-023 の具体的な不一致だけを採用した。
- Phase 3 integration: 完了。既存 IR の root cause と今回の新規 root cause を分離し、旧 Major / Minor を現行 CRITICAL / HIGH / MEDIUM / LOW gate へ機械的には移していない。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| Review rules | `AGENTS.md`、`.agents/skills/review-common/review-playbook.md`、`.agents/skills/implement-review/{SKILL.md,reviewers.md,review-gates.md,output-format.md,security-checklist.md}` | Phase、Chair、finding、severity、gate、security checklist、出力構成の根拠 |
| Specification | `docs/specifications/specification.md:1-26,309-357,395-468,470-576,605-672,676-733,737-845,849-903,907-989` | handoff、restore、request DTO、authorization、context、signing、error、stateless Store、secret、Binding、test / coverage 契約 |
| Store Format | `docs/specifications/wallet-store-format-v1.md:11-135,162-217,279-344,563-624` | deterministic CBOR、unknown field type boundary、resource limit、unknown enum、AAD、lossless preservation |
| Upstream | `docs/requirements/requirements.md`、`docs/design/{architecture.md,security.md,bindings.md}`、`docs/consept/concept-sheet.md`、`docs/reviews/design/upstream-cross-adversarial-review-{001,002}.md` | 上流の責任分界、SEC-023、current Store authority、上流 Open Decision の不存在確認 |
| Latest upstream reviews | `docs/reviews/specifications/specification-review-013.md`、`docs/reviews/specifications/wallet-store-format-v1-review-004.md` | Specification / Store Format が READY であり、Implementation を評価するための契約が確定済みであることを確認 |
| Previous implementation reviews | `docs/reviews/implementation/implement-review-001.md`〜`implement-review-010.md`、`implement-spec-feedback.md` | IR-001〜IR-015 の初出、過去の completion condition、今回の再確認対象の抽出。過去 status は現行判定へ継承していない |
| Rust Core | `src/{cbor.rs,crypto.rs,error.rs,lib.rs,store.rs,types.rs}` | parser、crypto、API、state、error、secret owner、Store / Pending、public DTO の実装確認 |
| WASM | `src/wasm.rs`、`tests/unit/wasm.rs` | Uint8Array、Number / UUID / enum conversion、DTO、error、secret output、Core parity の確認 |
| Native | `bindings/native/src/lib.rs`、`bindings/native/include/symbol_nem_wallet_core.h`、`bindings/native/tests/{api.rs,caller_runtime.c,header_compile.c,run_c_abi_runtime.sh}` | C ABI input / output、ownership、release、panic / error mapping、runtime、sanitizer導線 |
| Tests / fixtures | `tests/core.rs`、`tests/unit/{cbor.rs,crypto.rs,store.rs,types.rs,wasm.rs}`、Native API / C runtime | success / failure / boundary、known vectors、AAD / CBOR、atomicity、diagnostic、binding test evidence |
| Fuzz / CI | `fuzz/fuzz_targets/wallet_store_decode.rs`、`fuzz/Cargo.toml`、`.github/workflows/{fuzz.yml,coverage.yml}`、`scripts/build-wasm.sh` | fuzz target、CI導線、coverage target、WASM生成導線、feature / lock 検証 |
| 実行結果 | 下記 `Validation Results` | 現行 HEAD の formatter、clippy、workspace test、WASM、Native、fuzz check、coverageの実測 |

## Review Result

`REVISE IMPLEMENTATION`

## Summary

現行 Specification に対して、公開 API が handoff confirmation、export request、signing approval、AccountContext を受け取らず、正しい password だけで生成 Profile の finalize、Mnemonic / private key export、任意 payload の signing に到達できる。これは現行 API の security boundary を成立させない認可バイパスであり、`IR-016` を CRITICAL / New とする。Native release handle の by-value 契約も、呼出し後の NULL 化をできず同じ handle の再解放を防げないため、`IR-019` を HIGH / New とする。

さらに、Store decoder が unknown field の negative / tag / simple / boolean / null / undefined を保存可能な generic `Value` として受理し、current Store boundary の再帰的な許可 type 検証を行っていない（`IR-017`）、Native の failure-safe output 初期化がない（`IR-018`）、BindingFailure を error model として実装・mappingしていない（`IR-020`）、Core-owned private-key validation に secret-dependent early exit がある（`IR-021`）。

低レベルの BIP39 / HD、Argon2id / AES-256-GCM、AAD、Pending integrity、Store atomicity、Symbol / NEM signing fixture、scalar arithmetic differential、WASM numeric boundary、既存 secret owner は確認できた。ただし既存テストが現行仕様には存在しない旧 signature で confirmation / approval なしの成功を固定しているため、テスト成功は Implementation READY の根拠にならない。

現行未解決 formal finding は `CRITICAL 1 / HIGH 1 / MEDIUM 3 / LOW 2`。CRITICAL / HIGH の New / Open / Reopened があるため Gate は `REVISE IMPLEMENTATION` であり、`IMPLEMENTATION READY` は宣言できない。

## Finding Status

Severity は現行 Skill の分類で記録する。過去 artifact の Major / Minor は履歴としてのみ参照し、current gate 判定へ機械的には継承していない。

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| IR-001 | HIGH | Resolved | `implement-review-001` | Core-owned signing scalar / byte temporary の現行 zeroize 経路と第三者 library guarantee boundaryを確認した。 |
| IR-002 | HIGH | Resolved | `implement-review-001` | BIP39 `zeroize` feature、normalized mnemonic、entropy、seed の owner を確認した。 |
| IR-003 | HIGH | Resolved | `implement-review-001` | decrypted payload、CBOR Value、KeyRecord、early return の secret owner を確認した。 |
| IR-004 | MEDIUM | Resolved | `implement-review-001` | fixed field / enum の fatal error contractを確認した。 |
| IR-005 | MEDIUM | Resolved | `implement-review-001` | AAD、duplicate semantics、atomicity、malformed Storeの旧 completion conditionを確認した。現行 request assertion の不足は別 root cause の IR-016。 |
| IR-006 | MEDIUM | Resolved | `implement-review-001` | 旧 findingの対象だった Native / WASM parity・ownership の実行 evidenceを確認した。現行 assertion DTO omission は別 root cause の IR-016、IR-018、IR-020。 |
| IR-007 | LOW | Open | `implement-review-001` | helper-levelの RNG / candidate / save failure はあるが、public `generate_software_key` boundaryから独立検証する evidenceは未成立。 |
| IR-008 | MEDIUM | Resolved | `implement-review-002` | fixed bytes / enum / known field の fatal `InvalidStore`分類を確認した。 |
| IR-009 | MEDIUM | Resolved | `implement-review-004` | authenticated Pending の Profile ID collision が `PendingProfileInvalid`になることを確認した。 |
| IR-010 | HIGH | Resolved | `implement-review-006` | partial RNG fill failure時のzeroizing ownerとerror propagationを確認した。 |
| IR-011 | HIGH | Resolved | `implement-review-007` | WASM Number の finite / integer / range validationが狭い型への変換前に行われる。 |
| IR-012 | HIGH | Resolved | `implement-review-007` | Native prepareの同一 mnemonic / pending output pointer alias rejectを確認した。 |
| IR-013 | LOW | Resolved | `implement-review-007` | Rust-side prepare / export bufferの`mem::take`による所有権移動を確認した。 |
| IR-014 | LOW | Resolved | `implement-review-007` | public `list_profiles`で16 MiB boundaryを確認した。 |
| IR-015 | LOW | Resolved | `implement-review-009` | secret-bearing test failureのdiagnosticが固定文言で、secretを出さないことを確認した。 |
| IR-016 | CRITICAL | New | `implement-review-011` | 現行必須 assertion DTO / AccountContextがRust Core、Native、WASMの全公開境界から欠落している。 |
| IR-017 | MEDIUM | New | `implement-review-011` | unknown field valueの再帰的 allow-list validationがなく、禁止型をcurrent Storeとして受理する。 |
| IR-018 | MEDIUM | New | `implement-review-011` | Native operation開始時・failure return前の全output failure-safe初期化がない。 |
| IR-019 | HIGH | New | `implement-review-011` | `snwc_free_bytes`等がhandleを値渡しし、release後のNULL化ができずdouble-freeを防げない。 |
| IR-020 | MEDIUM | New | `implement-review-011` | `BindingFailure` enum / mappingがなく、conversion / panicを別errorへ誤分類する。 |
| IR-021 | LOW | New | `implement-review-011` | Core-owned all-zero private-key validationがsecret-dependent early exitを持つ。 |

## Required Changes

### IR-016 — 公開認可境界から handoff / export / signing assertion と context が欠落

- Severity: `CRITICAL`
- Status: `New`
- 対象箇所: `src/store.rs:219-223,405-409,434-439,648-653,686-692`、`src/types.rs:146-205`、`src/lib.rs:33-46`、`src/wasm.rs:341-353,381-412,519-554`、`bindings/native/src/lib.rs:406-427,479-530,717-770`、`bindings/native/include/symbol_nem_wallet_core.h:92-122,166-181`
- 確認できた事実:
  - `finalize_generated_profile`は`store, pending_profile, password_utf8`だけを受け取り、`HandoffConfirmation`またはstatusを受け取らない。password認証とPending検証が成功すれば、`src/store.rs:272-292`でProfileを追加しreplacement Storeを返す。
  - `export_mnemonic`と`export_private_key`はIDとpasswordだけであり、`ExportRequest`、`Requested`、target-specific `Confirmed`を受け取らない。認証成功後にsecretを返す。
  - `get_public_account`はrequested `AccountContext`を受け取らず、Store内のProfile Networkとkey Chainをそのまま返す。`sign`は`SigningRequest`、`SigningApproval`、contextを受け取らず、password認証後に`payload_bytes`をそのまま署名する。
  - `src/types.rs` / `src/lib.rs`に`HandoffConfirmation`、`ExportRequest`、`AccountContext`、`SigningRequest`、status型が存在しない。Native headerとWASM public functionも同じ欠落したsignatureを公開している。Binding側で status を生成してはいないが、Coreへ渡す入力自体がない。
  - 現行テストも`tests/core.rs:157-173,263-271,362-384`、`tests/unit/wasm.rs:85-155`、Native C runtimeの`snwc_export_mnemonic` / `snwc_sign`呼出しで、assertionなし成功を固定している。
- 根拠: `docs/specifications/specification.md:313-339`（生成Profileは確認済みhandoffだけでfinalize）、`395-468`（request DTO、status、target、context）、`481-505,537-549`（concept API）、`605-627`（export / signing条件）、`649-672`（contextとchain-specific signing）、`docs/design/security.md:178-239`、`docs/design/bindings.md:187-247`。
- 問題: 現行仕様が必須とする条件を検証する分岐を追加する以前に、公開境界で表現できない。正しいProfile passwordを持つ到達可能なcallerは、利用者へのMnemonic提示・受領確認なしにProfileをcommitでき、Requested / ConfirmedなしにMnemonic / private keyを取得でき、Approvedなしに任意raw payloadへ署名できる。Profile Network / Software Key Chainと要求contextの不一致を入力できないため、required `NetworkMismatch`契約も提供できない。
- 影響: Mnemonic / private keyの直接漏えい、signing authorityの無承認利用、wrong contextの静かな受理またはcontext mismatch errorの欠落。Application assertion freshnessをCoreが独立証明しないという契約とは異なり、ここではassertionを受け取って必須条件として検証するCore責務そのものが欠落している。
- Severity根拠: protected asset（Mnemonic / private key）とsigning authorityに直接影響し、通常のpublic Rust API、Native ABI、WASM APIから現実的に到達可能である。password possessionだけでは intent / approval ではないという明示契約を破るため、CRITICALとする。
- 必要な最小修正: 現行Specification §9.1.1 / §9.2の既存DTOをRust Core、Native、WASMの全対応operationへ追加し、missing / unknown / inconsistent status、target、payload、contextを`InvalidArgument`として拒否する。`Confirmed`なしのfinalize、全条件未成立のexport、`Approved`なしのsign、context不一致を成功させない。assertion challenge、nonce、expiry、one-shot token、replay cacheを新設しない。restoreはhandoffなしで従来条件だけを維持する。
- 完了条件: `Unconfirmed` / missing handoffでProfile、replacement、success、secretを返さない。同一構造のtarget・`Requested`・target-specific `Confirmed`・passwordだけでexportし、wrong target / statusで拒否する。`SigningTarget`、payload、`Approved`、password、fixed Chain / Profile Networkの全一致だけでsignし、payloadを変更しない。Native / WASMで同じ結果・error・secret return boundaryをruntime testで確認する。

### IR-019 — Native release handleの値渡しによる再解放防止不能

- Severity: `HIGH`
- Status: `New`
- 対象箇所: `bindings/native/include/symbol_nem_wallet_core.h:38-41,206-209`、`bindings/native/src/lib.rs:861-920`。
- 確認できた事実: public headerは`void snwc_free_bytes(SnwcOwnedBytes value)`を宣言し、実装も`snwc_free_bytes(value: SnwcOwnedBytes)`である。`Box::from_raw`で解放しzeroizeするが、値渡しのためcaller側`SnwcOwnedBytes.ptr/len`を`NULL/0`へ書き戻せない。`snwc_free_warnings`、配列freeも同じ形で、既存runtime testは一度だけ値渡しする。
- 根拠: `docs/specifications/specification.md:865-893`、特に`882-884`の`OwnedBytes *`型、`889-891`のrelease後`data=NULL,len=0`、NULL / zero-length no-op、`docs/design/bindings.md:287-349`。
- 発生条件: 正常に返されたsecret-containing `SnwcOwnedBytes`をcallerが`snwc_free_bytes(handle)`へ渡した後、同じ未変更handleをcleanupまたはerror pathで再度渡す。by-value APIではfirst release後も非NULLのdangling pointerが残る。
- 問題: first call後にhandleを安全なfailure-safe stateへ遷移できず、second callが同じallocationを再び`Box::from_raw`する。C callerにとって自然なidempotent cleanup、error cleanup、再利用防止の契約を満たさず、secret outputを含む公開FFIでuse-after-free / double-freeを到達可能にする。
- 影響: Native process crash、allocator corruption、未定義動作。secret outputのfree pairingとlifecycleが壊れ、C ABI境界のmemory safetyを破る。
- Severity根拠: public C ABIから低い事前条件で到達でき、release後のhandle状態は通常のcaller cleanupでは避けにくく、memory unsafetyへ直接つながるためHIGHとする。任意のforeign pointerに対する安全性を要求するfindingではない。
- 必要な最小修正: 現行契約に合わせてrelease APIをcaller handleへのmutable pointerで受け、正常解放後に必ず`ptr=NULL,len=0`へ更新する。NULL handle、NULL / zero-length bufferをno-opとし、発行していないpointerの安全性は追加保証しない。warnings / list arrayのreleaseにも同等の再利用不能契約を適用する。
- 完了条件: C runtime / sanitizerでsecret bytes、address、store、pending、signature、warnings、list arrayを一度解放した後のhandleがNULL/0になり、二度目のreleaseがno-opになること、foreign pointerの保証範囲をheaderと実装で一致させることを確認する。

## Optional Improvements

### IR-007 — public `generate_software_key` failure boundaryの独立証拠不足

- Severity: `LOW`
- Status: `Open`
- 対象箇所: `src/store.rs:578-637`、`tests/unit/store.rs:650-679`、`src/crypto.rs:51-59,189-202`。
- 確認できた事実: private helperへ注入したRNG failure、invalid candidate retry、save serialization failureは`tests/unit/store.rs:650-679`およびcrypto unit testで確認できる。public `generate_software_key`はproduction RNG / `encode_store`を直接渡す薄いwrapperであり、public Core / Native / WASM boundaryからRNG failure、candidate invalidity、save failureを独立注入するテストはない。
- 根拠: `docs/specifications/specification.md:530-535,726,907-989`、`requirements.md AC-005`、旧IR-007。
- 問題と影響: 現行コードの`?` propagationとlocal wallet mutationから明確なfailure defectは確認できないが、public wiringの変更で`RandomSourceFailure`、input Store不変、replacement非返却を壊しても既存helper testだけでは検出できない。これはsecurity-sensitive verification evidenceの不足であり、今回のGateを単独でblockする実装欠陥とは判定しない。
- 最小確認: public APIから同じ失敗条件を再現できるtest seamまたは適用可能な公開境界runtime testを追加し、RNG failure、invalid candidate、serialization failure、error propagation、input unchanged、replacementなしを確認する。productionでtest RNGを使用しないことも維持する。

### IR-017 — unknown fieldの許可外CBOR型をStore decoderが受理

- Severity: `MEDIUM`
- Status: `New`
- 対象箇所: `src/cbor.rs:45-64,247-317`、`src/store.rs:818-922,925-966,979-1058,1226-1358,1634-1638`、`tests/core.rs:124-131,505-508`。
- 確認できた事実: generic CBOR `Value`は`Negative`、`Tag`、`Simple`、`Bool`、`Null`を表現し、parserはそれらをdecodeする。Store側の`unknown_fields`はknown keyを除くvalueを型検証せずcloneし、top-level、Profile、KDF、Cipher、payload、key record、originおよびindexのunknown fieldへ適用する。`tests/core.rs:124-131`は`0xf7`（undefined / simple value）をunknown fieldへ置き、`restore_profile`成功を期待する。
- 根拠: `docs/specifications/wallet-store-format-v1.md:13-65`、特に許可集合（unsigned integer、byte string、text string、array、map）、nested recursive rule、negative / tag / float / simple / bool / null / undefined拒否、`69-106`のwhole Store `InvalidStore`、`112-135`のlimit、`337-342`のindex nested rule。
- 問題: generic parserが内部表現として禁止型を表せること自体は許容されるが、current Store boundaryでrecursive allow-listを呼び出していない。禁止型unknown fieldを含むStoreが`list_profiles`、restoreおよびmutationへ進み、opaque preservationとして再出力される。
- 影響: invalid Storeをvalid current Storeとして受理し、別実装とforward field boundaryが不一致になる。unknown fieldのfatal `InvalidStore`、no secret processing、no replacementの契約を破る。AADに含まれるindexにも同じ未検証値が到達し得るが、ここでは暗号認証 bypassを主張しない。
- Severity根拠: protected assetの直接漏えい・認可 bypassではなく、attacker-controlled Storeのwire validation / interoperability boundaryに局所化した不一致であるためMEDIUMとする。
- 必要な最小修正: Store decoderがunknown field valueとnested array / mapを再帰検証し、map key unsigned integer、deterministic、limit、full itemを確認した上で許可集合外を`InvalidStore`とする。unknown enumは従来どおりopaque保持せずfatalとする。既存のlossless preservationとAAD wire value保持は許可型だけに適用する。
- 完了条件: top-level、Profile、KDF、Cipher、payload、key record、origin、indexの各unknown fieldについて、allowed 5 typesはwarningなしで保持・再出力し、negative / tag / float / simple / bool / null / undefined、nested違反、noncanonical、duplicate、oversizeを`InvalidStore`として秘密処理・replacementなしで拒否する。

### IR-018 — Native failure-safe outputの初期化不足

- Severity: `MEDIUM`
- Status: `New`
- 対象箇所: `bindings/native/src/lib.rs:188-203,322-332,341-347,406-428,437-470,479-530,539-562,717-770,779-858`、`bindings/native/include/symbol_nem_wallet_core.h:17-19`、`bindings/native/tests/caller_runtime.c:173-192`。
- 確認できた事実: `require_output` / `output`はNULL pointerを検査するだけで、operation開始時やCore / conversion failure前にoutput structをempty / zero / NULLへ初期化しない。たとえば`snwc_restore_profile`はinvalid mnemonicを検出するまでoutputを書かず、error return時にcallerの`SnwcProfileInfo`、`SnwcWarnings`、`SnwcOwnedBytes`をそのまま残す。headerは「callerが初期化し、error時は既存outputを上書きしない」と現行Specificationとは異なる契約を記載し、runtime testもsentinel維持を期待する。
- 根拠: `docs/specifications/specification.md:865-893`、特に`886`の全request field、`889`のoperation開始時およびfailure return前の全field failure-safe初期化、`893`の部分allocation禁止。
- 問題: current contractが要求するfailure outputのempty / zero / NULL guaranteeがNative bindingにない。callerが前回の可変長fieldを正しくreleaseした後でも、scalar DTO、length、warning handle等のstale値がerror resultに残り得る。古い成功状態をerror後のresultとして誤って観測し、未初期化・stale outputを次のcleanupや処理へ流す。
- 影響: failure時のpartial success / stale profile / stale length / stale diagnosticsの観測、secret-containing buffer handleについてはIR-019と組み合わさったlifecycle risk。Coreのinput Storeやcommitted state自体は変わらないためMEDIUMとする。
- 必要な最小修正: callerが所有するoutputのprior variable-length fieldをrelease済みという前提を維持しつつ、各public Native operationの開始直後と全failure return経路でoutput全fieldをempty / zero / NULLへ初期化する。conversion、allocation、Core failureの途中で部分結果を公開しない。header、runtime test、sanitizer testを同じ契約へ更新する。
- 完了条件: invalid input、wrong password、unknown enum、Core error、conversion / allocation failureの全Native operationでoutputをfailure-safe状態として観測でき、success時だけDTO / replacement / diagnosticsを設定する。既存 outputをcallerがreleaseしていないケースを新契約のvalid callとして扱わない。

### IR-020 — BindingFailureの欠落と誤mapping

- Severity: `MEDIUM`
- Status: `New`
- 対象箇所: `src/error.rs:16-76`、`src/wasm.rs:36-49`、`bindings/native/src/lib.rs:144-164,322-331`。
- 確認できた事実: `ErrorCode`に`BindingFailure`がなく、Native `error_name`は将来値を含むwildcardで`InvalidArgument`へ落とす。WASM `conversion_error()`はJS object / `Reflect::set`の変換失敗を`SerializationFailure`へ変換する。Nativeの`ffi_call!`はpanic crossing FFIを`CryptoFailure`へ変換する。
- 根拠: `docs/specifications/specification.md:676-731`（`BindingFailure`、Core errorとの区別、success変換禁止）、`849-857`、`865-903`、`895-903`。
- 問題: Binding自身のrepresentation conversion、output allocation、ownership / lifecycle failureをCore errorと区別できず、Core failure codeの1対1 mappingも満たさない。WASMの変換不能がserialization、Native panicがcryptoとして観測される。
- 影響: callerがmalformed Core input、Core cryptographic failure、Binding representation / lifecycle failureを区別できず、failure handling・diagnostics・parityが仕様と不一致になる。通常成功を返す欠陥ではないためMEDIUMとする。
- 必要な最小修正: `ErrorCode::BindingFailure`と全Bindingのstable mappingを追加し、malformed inputだけは`InvalidArgument`、Binding conversion / allocation / ownership / lifecycle failureは`BindingFailure`、Coreが返したerrorはそのまま保持する。panicを一律にcryptoへ分類しない。output failure-safe処理はIR-018と統合して確認する。
- 完了条件: Native / WASMのconversion failure、detached / unreadable buffer、DTO conversion、output / ownership failureが成功値・empty success・warning-onlyにならず`BindingFailure`となり、Coreの`InvalidStore`、`AuthenticationFailed`、`CryptoFailure`等が変換されずparity testを通る。

### IR-021 — private-key validationのsecret-dependent early exit

- Severity: `LOW`
- Status: `New`
- 対象箇所: `src/crypto.rs:169-182`、補助的に`src/store.rs:1452-1465`。
- 確認できた事実: `validate_private_key`は`private_key.iter().all(|byte| *byte == 0)`を使用し、最初のnon-zero byteで走査を終了する。Core-owned private key validationにおけるexplicit secret-dependent early exitである。duplicate検査にもsecret byte equalityを伴うearly-exit可能な比較がある。
- 根拠: `docs/specifications/specification.md:787-845`、特に`841-845`のSEC-023 / AC-049適用範囲、`docs/design/security.md:289-295`。
- 問題: private-key materialの位置に応じてvalidation pathの処理形状が変化する。第三者crypto library内部のtiming、compiler、runtime、OS、browserまたはhardwareの完全なconstant-timeを要求するものではなく、Coreが明示的に導入したvalidation control flowだけを対象とする。
- 影響: authenticated stored keyまたはimport inputを処理する同一process境界で、測定可能な場合にprivate materialのbyte位置に関するtiming signalを与え得る。remote exploitやsecret recoveryをこのレビューで実証したものではないためLOWとする。
- 必要な最小修正: all-zero判定とCore-owned secret comparisonについて、secret-dependent early exitを避ける実装形状を選択し、通常・invalid・duplicate failureの挙動を維持する。third-party arithmeticのfork、assembly inspection、wall-clock thresholdを追加要求しない。
- 完了条件: Core source reviewでvalidation / duplicate pathにsecret-dependent branch、early exit、indexingが不要に残っていないことを確認し、Symbol / NEM fixture、invalid private-key、duplicate testを維持する。

## Resolved Findings

### IR-001〜IR-003 — secret temporary / Mnemonic / payload owner

`src/crypto.rs:211-257,267-316`のsigning temporaryは明示zeroizeまたは`Zeroizing` ownerで管理され、scalar arithmeticはfixed-loop / mask形状である。`Cargo.toml:22`のBIP39 `zeroize` feature、`src/crypto.rs:76-100`、`src/store.rs:49-153,985-1085`、`src/types.rs:207-293`によりnormalized mnemonic、entropy、seed、decrypted payload、KeyRecord、export DTO、Pendingのownerを確認した。Specificationが保証外とする第三者library内部temporaryだけを理由に再openしない。

### IR-004 / IR-008 — fixed field / enum fatal handling

`src/store.rs:818-1058,1661-1675`はknown fieldを型・長さ・値として解釈し、unknown enumをopaque保持せず`InvalidStore`とする。`tests/unit/store.rs:714-766,1066-1182,1313-1408`のmalformed / enum / version testを確認した。

### IR-005 — Store / AAD / atomicity evidence

`src/store.rs:1061-1222`の認証順序、AAD、duplicate tag、payload/index consistency、`src/store.rs:1226-1409`のreplacement / unknown preservationと、`tests/unit/store.rs:768-1055`のtamper・semantic mismatch・AAD・atomicity testを確認した。現行仕様で追加されたassertion DTOの未実装はこの旧root causeではなくIR-016へ分離した。

### IR-006 — 旧 Native / WASM parity evidence gap

`tests/unit/wasm.rs`、`bindings/native/tests/api.rs`およびC runtimeで、旧APIのbyte、DTO、signature、ownership、runtime境界を確認した。現行仕様のrequest DTO欠落、failure-safe output、BindingFailureの具体的欠陥は、旧テストの存在だけで解消されたとは扱わず、別のIR-016、IR-018、IR-020として記録した。

### IR-009〜IR-015 — Pending collision、RNG、WASM、Native alias、ownership、size、diagnostic

`src/store.rs:254-270,1499-1617`と`tests/unit/store.rs:900-932`でPending collision / malformed / target bindingを確認した。`src/crypto.rs:42-59,189-202`と`tests/unit/crypto.rs:284-311`でRNG failure / invalid candidate / zeroizing ownerを確認した。`src/wasm.rs:57-131`とWASM runtimeでNumber境界、`bindings/native/src/lib.rs:365-373`とC runtimeでprepare alias、`src/store.rs:194-204,405-457`およびNative `mem::take`でownership、16 MiB public boundary、`tests/unit/wasm.rs:103-147`のsecret-free diagnosticを確認した。release handleの再解放防止不足は別root causeのIR-019である。

## Upstream Feedback

なし。現行 Requirements / Design / Specification / Store Format は、今回の実装不適合を判定するために必要な handoff、restore、export、signing approval、AccountContext、BindingFailure、Native release、unknown field type、SEC-023、stateless Store、coverage の契約を確定している。`specification-review-013`、`wallet-store-format-v1-review-004`、upstream cross / adversarial review 002でOpen Decisionがないことと整合する。IR-016、IR-017、IR-018、IR-019、IR-020、IR-021は上流不足ではなく現行Implementationの不一致である。

## Deferred Findings

- 外部 `symbol-sdk` 3.3.2 / reference verifierをネットワーク経由で追加実行していない。Repository内のSDK由来と記録されたdeterministic fixture、Native NEM fixture、Core arithmetic differentialは確認したが、別processのverifier実行結果は未確認として残す。
- fuzz targetの存在とlocked compileは確認したが、今回のreviewでcampaign自体は実行していない。既存targetは`list_profiles` Store decoderへ直接到達し、panic oracleを持つ。Pending、Native boundary、WASM conversion専用target / corpusは確認できないが、「targetがない」だけのformal findingにはしない。
- Native sanitizer runtimeは実行導線を起動したが、`LeakSanitizer has encountered a fatal error` / `does not work under ptrace`で環境終了した。C runtimeのassertion failureやコードのsanitizer reportとは確認できず、PASS扱いしない。
- branch coverageはstable `cargo llvm-cov`出力のbranch counterが`0/0`で実測不能。line / function targetは実測したが、branch targetの達成とは扱わない。

## Scope and Traceability

今回の対象は変更差分限定ではなく、現行HEADの`src/`全体、`bindings/native/`、WASM、公開Rust API、C header / ABI、tests、fixture、fuzz target、Cargo manifest / lock、feature、CI / build / runtime / coverage導線である。上流のConcept / Requirements / Designは責任分界とtraceabilityの確認に使用し、外部可視動作の最終根拠は現行 `docs/specifications/specification.md` と `docs/specifications/wallet-store-format-v1.md` とした。

実装と仕様の主要な追跡は次のとおりである。

- `§8.1 / §9.1.1 / §9.2 / §9.4 / §9.5` → `src/store.rs` public operation、`src/types.rs` DTO、`src/lib.rs` export、`src/wasm.rs`、Native header / functions。request assertion / contextの欠落はIR-016。
- Store Format `§2 / §2.1 / §2.2 / §7.1 / §11` → `src/cbor.rs` parser、`src/store.rs` parser / unknown preservation / AAD。unknown type validation omissionはIR-017。
- `§10 / §13.1 / §13.2` → `src/error.rs`、Native / WASM conversion、output / release。BindingFailureはIR-020、outputはIR-018、releaseはIR-019。
- `§11 / §12.1 / §12.4` → `src/store.rs` local replacement / no global state、`src/crypto.rs` owner / scalar arithmetic / validation。stateless、delete atomicity、secret ownerは適合、SEC-023の具体的early exitはIR-021。
- `§14.1 / §14.2 / §14.3` → `tests/`、Native / WASM runtime、fuzz、CI coverage。現行mandatory assertion negative testの不在はIR-016の根拠、public generated-key failure evidenceはIR-007。

責任分界として、Application / persistenceはcurrent Store authority、successful replacementの保存、stale / historical Storeの再適用防止、assertion freshnessを担う。CoreはStore historyを保持せず、入力sliceの構造・認証・整合性を評価するだけであり、process-global current Store、rollback DB、revision counter、authorization cache、unlock state、pending auto-resumeは確認されなかった。

## Domain Checks

### Reviewer A — Specification Conformance

| # | 確認項目 | 判定 | 根拠 / 主要所見 |
| ---: | --- | --- | --- |
| 1 | Generated Mnemonic handoff | **FAIL** | prepareはStoreを変更せずPending / Mnemonicを返すが、finalizeにconfirmation inputがなくpasswordだけでcommitする（IR-016）。 |
| 2 | Restore lifecycle | **PASS** | `restore_profile`はgenerated handoffを要求せず、UTF-8 / BIP39 24 words / Network / password / duplicate / Store条件を処理する。生成secretをrestoreから作るshortcutはない。 |
| 3 | Assertion freshness boundary | **PARTIAL** | challenge / nonce / expiry / replay cache / sessionはなく、Coreがfreshnessを証明する実装もない点は適合。ただしcurrent assertionを受け取るDTO自体が欠落（IR-016）。 |
| 4 | Core per-operation authorization | **PARTIAL** | passwordは各secret-capable operationで認証され、persistent authorization stateはない。一方、password以外の必須 assertion条件がAPIにない（IR-016）。 |
| 5 | Binding assertion behavior | **FAIL** | Native / WASMがstatusを勝手に生成するのではなく、status fieldをCoreへ渡せないため、省略された意味でoperationを成立させている（IR-016）。 |
| 6 | Signing approval | **FAIL** | `sign`はID、password、raw payloadだけで成功し、`SigningApproval=Approved`を要求しない（IR-016）。 |
| 7 | Export authorization | **FAIL** | Mnemonic / private key exportがID + passwordだけで、Requested / target-specific Confirmedを要求しない（IR-016）。 |
| 8 | AccountContext | **FAIL** | `get_public_account` / `sign`にrequested contextがなく、callerがChain / Networkを提示・不一致検出できない（IR-016）。 |
| 9 | Chain / Network | **PARTIAL** | Store Profile Network、Software Key fixed Chain、Symbol / NEM / Mainnet / Testnetの内部分岐は適合。requested context欠落により全combinationの外部検証契約は未達（IR-016）。 |
| 10 | Symbol signing interoperability | **PASS / external verifier deferred** | `src/crypto.rs:211-257,356-362`はSHA-512、raw payload、raw 64-byte `R||S`。Symbol key/address/signature、HD fixtureを確認。追加reference verifier runtimeは未実行。 |
| 11 | NEM signing interoperability | **PASS / external verifier deferred** | Keccak-512、NEM final key byte handling、raw payload、raw 64-byte signatureを確認。NEM fixtureはSymbol pathと共有されていない。追加reference verifier runtimeは未実行。 |
| 12 | Custom cryptographic arithmetic | **PASS** | `scalar_add_mod_order` / `scalar_mul_mod_order`はfixed 32 / 256 loop、mask selection、little-endian order reduction。boundary + 4,096 differential cases + SDK signature vectorsでcorrectness defectなし。 |
| 13 | SEC-023 side-channel | **FAIL (LOW)** | `validate_private_key`の`.all`が最初のnon-zeroでearly exitする（IR-021）。第三者library / compiler / runtime等の完全absenceは要求していない。 |
| 14 | Current Store / stateless Core | **PASS** | Coreは各operationの入力Storeだけをdecodeし、global / persistent history、current selector、rollback DB、revision security stateはない。 |
| 15 | Valid historical Store | **PASS (code analysis)** | validなS0を過去に見たことだけで拒否する状態がなく、history-based rollback rejectはない。rollback preventionはApplication responsibility。専用runtime scenarioは未追加。 |
| 16 | Deletion guarantee | **PASS (code + tests)** | `delete_profile`はtarget envelopeをlocal walletから除去、`delete_software_key`はtarget keyだけretain除去し、success時encode。failureはinput sliceを変更せずreplacementを返さない。 |
| 17 | Deterministic CBOR | **PARTIAL** | full consumption、truncated / trailing / concatenated、indefinite、shortest integer、duplicate key、order、float、limitsは実装・test済み。unknown field forbidden-type boundaryはIR-017。 |
| 18 | Unknown field type boundary | **FAIL** | `Value`が禁止型を表せ、`unknown_fields`がrecursive allow-listを実施しない。`0xf7`を受理するtestも存在（IR-017）。 |
| 19 | Unknown field preservation | **PARTIAL** | permitted unknown fieldのkey/value、nested value、index wire valueをclone / re-emitし、mutation / AADへ保持する経路はある。禁止型をInvalidStoreにせず保持するため境界全体はIR-017。 |
| 20 | Unknown enum | **PASS** | known enum parserはUIntの割当値だけを受理し、unknown enumをskip / warning / opaque preservationしない。 |
| 21 | AAD wire semantics | **PASS for permitted wire values** | `src/store.rs:1203-1222`はmagic、version、registry、profile、network、duplicate tag、schema、KDF、cipher、受信index wire valueを仕様順にencode。unknown index fieldはlogical DTOへ再構成せず保持する。 |
| 22 | Resource limits | **PASS** | raw 16 MiB、profiles 128、keys 256、bytes/text 1 MiB、ciphertext 1 MiB、array/map 256、depth 32をVec / String / ciphertext clone前に確認。WASM Storeはcopy前にも確認。 |
| 23 | Parser robustness | **PARTIAL** | malformed / truncation / UTF-8 / fixed length / version / duplicate / trailing / tamper / depth / lengthはfail-closed。unknown forbidden typesのみIR-017。Native invalid addressの救済は仕様保証外。 |
| 24 | Fuzz evidence | **PARTIAL** | Store decoderを直接呼ぶ`wallet_store_decode` targetとCI scheduled/manual導線、locked checkは存在。campaign / corpus / Pending / Native / WASM専用targetは未確認。 |
| 25 | PendingProfileBlob | **PASS except finalize assertion** | fixed opaque version、target Store hash、password-derived Argon2id / AES-GCM、tamper / wrong Store / wrong password / collision / version reject、no committed Profile、no auto-promotionを確認。confirmation input欠落はIR-016。 |
| 26 | Retry / restart | **PASS for hidden state** | Core / Bindingにunlock、approval、confirmation、history cache、auto-resume stateはなく、pendingは外部opaque input。retry / restart authorization継承はコード上ない。必須assertionを受け取れない問題はIR-016。 |
| 27 | Error / fail-closed | **PARTIAL** | Core error propagation、wrong password、tamper、malformed、RNG、crypto、serialization、pending failureでnormal value / replacement / signatureを返さない。`BindingFailure`欠落とNative stale outputはIR-018 / IR-020。 |
| 28 | RNG | **PASS + IR-007 open evidence** | `getrandom::fill` CSPRNG、partial fill `Zeroizing`、failure propagation、ID collision retry、salt / nonce / key / entropy生成を確認。public Generated Software Key failure injectionの独立証拠だけIR-007。 |
| 29 | KDF / AEAD | **PASS** | Argon2id v0x13、65536 KiB、3、1、32-byte output、16-byte salt、AES-256-GCM 12-byte nonce / 16-byte tag、AAD、authenticate-before-parse、wrong password / tag failureを確認。 |
| 30 | Secret lifecycle / zeroization | **PASS with Native release issue** | Core / Binding ownerのpassword copy、entropy、mnemonic、seed、private key、decrypted payload、KDF key、sign temp、export / pending DTOを追跡。Native returned secret handleのrelease/null lifecycleはIR-019。JS GC / third-party internal zeroizationは仕様保証外。 |

### Reviewer B — Security

Protected assetsはMnemonic、seed、entropy、private key、derived key、signing authority、password、Argon2 output、decrypted payload、Pending内ciphertextとし、Core / Native / WASM / Application境界を追跡した。IR-016はauthorization bypass、IR-019はNative memory safety、IR-021はCore-owned side-channelとして採用した。secretの不要なclone、Debug / Display / error / warning / panic leakage、AEAD authentication bypass、nonce reuse、predictable RNG fallback、pending auto-promotion、global authorization cacheは、現行コード上の具体的欠陥を確認しなかった。

適用した主要checklistは protected asset mapping、secret lifecycle / copies / zeroization、diagnostic leakage、primitive / KDF / AEAD / RNG、custom arithmetic、side-channel、Store crypto persistence、attacker parser、Native C ABI、WASM boundary、failure / replacement / atomicity、dependency / feature、security tests、known vector / differential、fuzz evidenceである。Concurrency checklistは共有状態・async・thread synchronizationが対象実装に存在しないため非適用。第三者crypto library内部、compiler、runtime、OS、browser、hardwareの完全なside-channel / zeroizationはSpecificationの保証範囲外としてfindingにしていない。

### Reviewer C — Symbol / NEM interoperability

| # | 確認項目 | 判定 | 根拠 / 主要所見 |
| ---: | --- | --- | --- |
| 31 | Native C ABI | **FAIL** | Input NULL / zero-length / fixed enum checksとCore pointer非公開はある。request DTO欠落（IR-016）、output初期化（IR-018）、release by-value（IR-019）、BindingFailure mapping（IR-020）が現行ABI契約に不適合。 |
| 32 | WASM | **PARTIAL FAIL** | Uint8Array、secret string禁止、Number finite / integer / range、UUID、opaque Store / Pending、no cacheは適合。request DTO / context omission（IR-016）とconversion error mapping（IR-020）が不適合。 |
| 33 | Binding parity | **FAIL** | Native / WASMは旧Core signatureを1対1にbridgeするが、現行§9.1.1の同じ status / target / contextをどちらも受け取らない。したがって parityは同じ欠落を共有するだけで現行security meaning parityではない。 |
| 34 | Chain / Network all combinations | **PASS internally / context boundary fail** | `crypto.rs`のSymbol/NEM hash、NEM reverse、Network identifier、HD coin typeは4組合せfixtureで確認。requested contextのall combinationsはIR-016で外部契約未達。 |
| 35 | Canonical bytes / signing | **PASS** | raw payloadをそのままhashへ渡し、generation hash、transaction parse / normalize、prefixを追加しない。outputはraw 64 bytes。 |
| 36 | SDK / protocol compatibility | **PASS fixture / verifier deferred** | SDK由来のpublic key/address/signature/HD expected values、Native NEM fixture、4,096 scalar differentialを確認。独立reference verifierを今回追加実行していない。 |

### Reviewer D — Test / Quality / Independent Evidence

| # | 確認項目 | 判定 | 根拠 / 主要所見 |
| ---: | --- | --- | --- |
| 37 | Test coverage of happy / negative / boundary | **PARTIAL** | Store / CBOR / AEAD / Pending / deletion / password / malformed / WASM Number / Native basic ownershipの広いtestがある。現行 handoff / export request / sign approval / context negative testがなく、旧API成功を固定（IR-016）。 |
| 38 | Known vectors / differential | **PASS for implemented primitive** | Symbol / NEM expected fixture、BIP39 / HD intermediate、AAD / encryption / duplicate tag、curve25519-dalekとの差分を確認。external verifier runtimeはdeferred。 |
| 39 | Fuzz / panic / resource | **PARTIAL** | Store decoder fuzz targetとresource parser testはある。fuzz campaign / corpus未実行、Pending / binding conversion専用target未確認。ただしtarget不在単独ではfindingにしない。 |
| 40 | Test diagnostics leakage | **PASS** | `Signature`、`MnemonicExport`、`PrivateKeyExport`、`PreparedProfile`のDebug redactionとWASM mismatch固定文言を確認（IR-015 resolved）。 |
| 41 | IR-007 public generated-key failure | **OPEN LOW** | helper evidenceはpass、public boundary evidenceは未成立。下記IR-007を機械的にResolvedへ変更しない。 |
| 42 | Native ownership / sanitizer | **PARTIAL FAIL** | 通常C runtime、header compile、Native API testsはpass。by-value release欠陥をsource reviewで確認し、sanitizer runtimeはptrace環境エラーで完了しなかった。 |
| 43 | WASM representation conversion | **PARTIAL FAIL** | Uint8Array and numeric validation runtimeはpass。current DTO missing、conversion failureの`SerializationFailure` mapping（IR-020）がある。 |
| 44 | Failure atomicity | **PARTIAL** | Core local mutation / replacement failure atomicityはtest済み。Native failure output initializationは未実装（IR-018）、assertion failure operation自体が表現不能（IR-016）。 |
| 45 | Dependency / feature | **PASS (no concrete insecure fallback)** | `aes-gcm` AES + alloc、`argon2` alloc、`bip39` zeroize、`curve25519-dalek` zeroize、`getrandom` wasm_js、`wasm` optional feature、Native staticlib / cdylibをmanifest / lock / feature treeで確認。version freshnessだけのfindingは作成していない。 |
| 46 | Specification conformance overall | **FAIL** | IR-016、IR-019を含むため現行外部contractに適合しない。 |

## Validation Results

| 検証 | 結果 | 実行結果 / 未確認 |
| --- | --- | --- |
| `cargo fmt --all -- --check` | PASS | exit 0 |
| `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` | PASS | exit 0 |
| `cargo test --workspace --all-features --locked` | PASS | Core unit 45、Core integration 5、Native API 2、doc-tests 0。既存のassertionなし旧API成功も含むためSpecification適合の証明にはしない。 |
| `cargo check --target wasm32-unknown-unknown --features wasm --locked` | PASS | exit 0 |
| `wasm-pack test --node --locked --features wasm` | PASS | WASM runtime 2 tests passed。WASM testは旧APIに対するもの。 |
| `cargo build --package symbol-nem-wallet-core-native --release --locked` | PASS | exit 0 |
| `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c` | PASS | exit 0 |
| `./bindings/native/tests/run_c_abi_runtime.sh` | PASS | exit 0 |
| `SNWC_C_ABI_SANITIZERS=1 ./bindings/native/tests/run_c_abi_runtime.sh` | NOT VALIDATED | exit 1。LeakSanitizerがptrace環境で起動不能。コードassertion / sanitizer findingのPASS扱いはしない。 |
| `cargo check --manifest-path fuzz/Cargo.toml --locked --bin wallet_store_decode` | PASS | exit 0。campaignは未実行。 |
| `cargo llvm-cov --package symbol-nem-wallet-core --all-features --locked --json` | PARTIAL | `/tmp`出力でline 1794/1870 = 95.9358%、function 191/211 = 90.5213%。 |
| branch coverage | NOT VALIDATED | stable計測結果のbranch counterが0/0で、85% targetとの比較不能。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 finding |
| --- | --- | --- | --- |
| 仕様適合性 | 不合格 | request assertion / context、unknown field type、Native failure-safe output、BindingFailure、release契約が不一致。 | IR-016, IR-017, IR-018, IR-019, IR-020 |
| セキュリティ | 不合格 | password-only export、confirmationなしのProfile commit、approvalなしのarbitrary signing、Native double-free risk。SEC-023 low findingも残る。 | IR-016, IR-019, IR-021 |
| 相互運用性とプロトコル | 不合格（外部契約） | Symbol / NEM primitiveとwire bytesはfixture上適合するが、current AccountContext / signing requestを公開APIが受け取れず、external verifier runtimeも未実行。 | IR-016 |
| 処理と異常系 | 不合格 | unknown forbidden CBOR typeを受理、Native failure outputを初期化せず、binding failureを別errorへ分類。 | IR-017, IR-018, IR-020 |
| テスト十分性 | 不合格（security-sensitive gap） | 現行仕様必須のhandoff / export / sign / context negative testがなく、旧API bypassをsuccessとして固定。public generated-key failure evidenceも未成立。 | IR-016, IR-007 |
| 変更範囲内の品質 | 不合格 | formatter / clippy / ordinary testsはpassするが、public contract、FFI release、sanitizer完了条件を満たさない。 | IR-016, IR-018, IR-019, IR-020 |

現行 Gate policyでは CRITICAL / HIGH の New / Open / Reopenedが1件以上あるため Required Changeがあり、`Review Result: REVISE IMPLEMENTATION`となる。MEDIUM / LOWのfindingだけになった場合に限り、coverage / external verifier / fuzz campaignの未確認を明示した上で次の判定を再評価できる。

## Remaining Risks and Open Decisions

- security blocking gap: **あり**。IR-016（CRITICAL: assertion / approval omissionによるsecret export・arbitrary signing・handoff bypass）とIR-019（HIGH: Native release double-free risk）。
- interoperability blocking gap: **あり（API contract）**。内部のSymbol / NEM primitive fixtureは適合するが、IR-016により現行 `SigningRequest` / `AccountContext`の外部契約をNative / WASM / Rust public APIとして提供できない。protocol bytes自体の誤りを示すfindingではない。
- Implementation Open Decision: **なし**。必要な仕様判断はすべて現行Specificationにあり、残件は実装修正・再検証である。assertion challenge / nonce / expiry / one-shot tokenを追加する未決定事項はない。
- current formal finding count: `CRITICAL 1 / HIGH 1 / MEDIUM 3 / LOW 2`（IR-016〜IR-021とIR-007）。Resolved IRはgate countへ含めない。
- Coverage target: line / functionはNFR-005 target以上（95.94% / 90.52%）。branchはcounter 0で未測定。targetはSHOULDであり、coverageだけでsecurity proofとはしない。
- 依存構成に、feature flagによる明示的なinsecure RNG / crypto fallbackは確認されなかった。Cargo.lockを使った検証はpass。新versionの存在だけをfindingにしていない。
- `IMPLEMENTATION READY`: **宣言不可**。Required Changeの再実装、current DTO / error / FFI契約更新、negative / runtime / sanitizer再検証が必要。

## Automatic Changes

なし。Rust Core、Native、WASM、tests、fixture、Cargo、fuzz、Specification、Requirements、Design、Concept、README、過去review、`implement-spec-feedback.md`は変更していない。本artifactだけを新規作成する。

## Final Decision

`REVISE IMPLEMENTATION`

### 完了報告（52項目）

1. Review artifact: `docs/reviews/implementation/implement-review-011.md`
2. Review target HEAD / commit: `ffd305a9757a25ddcc99a9eaaaf797530dead38f`
3. Review Gate: `REVISE IMPLEMENTATION`
4. Severity: `CRITICAL 1 / HIGH 1 / MEDIUM 3 / LOW 2`（current unresolved）
5. IR-001〜IR-015: IR-001〜IR-006、IR-008〜IR-015はResolved、IR-007はOpen / LOW
6. 新規 IR finding: IR-016 CRITICAL、IR-017 MEDIUM、IR-018 MEDIUM、IR-019 HIGH、IR-020 MEDIUM、IR-021 LOW
7. Generated Mnemonic handoff: **FAIL**。prepareはnon-committingだがfinalize confirmationが欠落（IR-016）
8. Restore lifecycle: **PASS**。generated handoffを要求せずBIP39 / Store / duplicate / password条件を処理
9. Assertion freshness boundary: **PARTIAL**。freshness機構は不要なまま、assertion DTOが欠落
10. Core per-operation authorization: **PARTIAL**。passwordはper-call、assertion条件が欠落
11. Signing approval: **FAIL**。password-only signが可能（IR-016）
12. Export authorization: **FAIL**。password-only Mnemonic / private key exportが可能（IR-016）
13. AccountContext: **FAIL**。requested contextがAPIにない（IR-016）
14. Chain / Network: 内部の固定分離はPASS、requested context boundaryはFAIL（IR-016）
15. Symbol signing interoperability: **PASS fixture**。SHA-512、raw payload、64-byte signature、SDK fixture。external verifier deferred
16. NEM signing interoperability: **PASS fixture**。Keccak-512、NEM byte handling、raw payload、64-byte signature。external verifier deferred
17. Custom cryptographic arithmetic: **PASS**。boundary / 4096 differential / fixed loop確認
18. SEC-023 side-channel: **FAIL LOW**。all-zero private-key validationのearly exit（IR-021）
19. Current Store / stateless Core: **PASS**。history / global current / rollback DBなし
20. Valid historical Store behavior: **PASS code analysis**。valid historicalであることだけを理由に拒否しない
21. Deletion guarantee: **PASS**。target除去、unrelated preservation、failure atomicityを確認
22. Deterministic CBOR: **PARTIAL**。generic deterministic parserは適合、unknown forbidden typeはIR-017
23. Unknown field type boundary: **FAIL**（IR-017）
24. Unknown field preservation: permitted typeではPASS、禁止型の受理によりboundary全体はPARTIAL（IR-017）
25. Unknown enum: **PASS**。fatal `InvalidStore`
26. AAD wire semantics: **PASS for permitted values**。received software_key_index wire valueを維持
27. Resource limits: **PASS**。all fixed limitsをallocation / clone前に確認
28. Parser robustness: **PARTIAL**。主要malformedはfail-closed、unknown forbidden typeのみ不一致
29. Fuzz evidence: Store decoder target / locked checkはPASS、campaign / corpus / binding targetsは未確認
30. PendingProfileBlob: **PASS except missing finalize assertion**（IR-016）
31. Retry / restart: **PASS for hidden state**。auth / approval / confirmation cache / auto-resumeなし
32. Error / fail-closed: **PARTIAL**。Coreは概ねpass、BindingFailure / Native outputはIR-018 / IR-020
33. RNG: **PASS + IR-007 Open**。CSPRNG / failure propagation、public generated-key evidence不足
34. KDF / AEAD: **PASS**。Argon2id / AES-GCM / nonce / salt / AAD / auth-before-use
35. Secret lifecycle / zeroization: **PASS Core owner、Native release issue**（IR-019）
36. Native C ABI: **FAIL**。IR-016、IR-018、IR-019、IR-020
37. WASM: **PARTIAL FAIL**。byte / Number boundaryはpass、DTO / context / BindingFailureは不一致
38. Binding parity: **FAIL**。両Bindingが現行request security meaningを省略
39. Test / fixture quality: **PARTIAL FAIL**。crypto / Store coverageは広いが現行assertion negativeがない
40. IR-007 status: **OPEN / LOW**。helper failure evidenceはあるがpublic boundary独立証拠なし
41. Coverage: line 95.94%、function 90.52%、branch未測定（0/0）
42. Dependency / features: **PASS**。CSPRNG、crypto、zeroize、WASM / Native featureにinsecure fallbackなし
43. Specification conformance: **FAIL**。Required Changeあり
44. Upstream Feedback: なし
45. security blocking gap: あり（IR-016、IR-019）
46. interoperability blocking gap: あり（current API / SigningRequest / AccountContext boundary; primitive bytesの誤りではない）
47. Implementation Open Decision: なし
48. `IMPLEMENTATION READY`: **宣言不可**
49. Validation results: fmt PASS、clippy PASS、workspace test PASS、WASM check/runtime PASS、Native ordinary/header/release PASS、sanitizer NOT VALIDATED、fuzz check PASS、coverage line/function実測、branch未測定
50. 未確認範囲: external reference verifier、fuzz campaign / corpus、branch coverage、Native sanitizer完了、現行assertion DTOを含むruntime（未実装のため実行不能）
51. Commit hash: review target `ffd305a9757a25ddcc99a9eaaaf797530dead38f`。artifact commit hashはcommit後の完了報告で確定
52. Push先 branch: `agent/concept-review-follow-up`（remote `origin`）
