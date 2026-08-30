# Wallet Store Format v1 Review 003

## Review Target

- 対象: [`docs/specifications/wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md)
- 確認日: 2026-08-30 +0900
- 成果物: `docs/reviews/specifications/wallet-store-format-v1-review-003.md`
- 前回 Store review: [`wallet-store-format-v1-review-001.md`](wallet-store-format-v1-review-001.md)、[`wallet-store-format-v1-review-002.md`](wallet-store-format-v1-review-002.md)
- Companion Specification: [`docs/specifications/specification.md`](../../specifications/specification.md)
- Review scope: 現行 Wallet Store wire contract 全体、SR-001〜SR-008 の独立再判定、CBOR、version / migration、ID、enum、Mnemonic、Profile envelope / payload、KDF / Cipher、AAD、`duplicate_tag`、unknown field / enum、mutation / atomicity、error mapping、security / interoperability、上流 traceability および review gate。
- 未確認範囲: Implementation、実際の Native C ABI / generated WASM、Application / UI、実行時 parser / allocation、memory lifetime、zeroization、実 fixture の実行結果および外部 Node。これらを Specification の正当化根拠には使用していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として統合した。
- Reviewer A（契約の明確性と完全性）: 完了。wire field、型、順序、determinism、validation、error、version、mutation および境界条件を確認した。
- Reviewer B（利用価値と運用適合性）: 完了。Requirements、Core / Application / Binding の責任、Profile duplicate、replacement、失敗時状態および companion Specification との整合を確認した。
- Reviewer C（Security / Interoperability primary）: 完了。attacker-controlled Store、protected asset、AEAD / AAD、unknown data、fail-closed、atomic visible result、resource boundary および独立実装間の wire 結果を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象を Store Format に限定し、companion Specification は API / error / state との整合確認、Implementation / Test / Fixture は正当化根拠外とした。登録済み Phase Context はないため使用していない。
- Phase 1（独立レビュー）: 完了。Reviewer A / B / C の担当観点を分離して確認した。
- Phase 2（反証・統合）: 完了。SR-001〜SR-008、全体 wire contract、SR-009 候補、上流 gap、companion との競合および対象範囲を再確認した。
- Phase 3（Gate・成果物）: 完了。現行 `spec-review` Skill の Gate / Severity / output format を適用した。

## Evidence Used

### Review Basis

| 区分 | 資料 | 用途 |
| --- | --- | --- |
| 作業規則 | [`AGENTS.md`](../../../AGENTS.md)、[`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/spec-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/spec-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/spec-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/spec-review/output-format.md) | Source of Truth、Reviewer A〜C、security 観点、Gate、finding 重大度および成果物構成を確認 |
| 共通 review policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`review-common/output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、finding 採用条件、Upstream Feedback / Deferred Findings、章順および検証規則を確認 |
| Review target | [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) | 現行 wire、CBOR、version、ID、enum、payload、AAD、duplicate、unknown field、mutation および error 境界を判定 |
| Companion Specification | [`specification.md`](../../specifications/specification.md) | Store API boundary、error mapping、Profile duplicate、state、atomicity、Binding および testability との整合を確認 |
| Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) | v1 scope、Core 継続 ownership、通常非開示および責任境界を確認 |
| Requirements | [`requirements.md`](../../requirements/requirements.md) | FR-017、DR-006、DR-009、SEC-004、SEC-018〜SEC-019、AC-018、AC-039、AC-045 等を現行正本として確認 |
| Design | [`architecture.md`](../../design/architecture.md)、[`security.md`](../../design/security.md)、[`bindings.md`](../../design/bindings.md) | Store ownership、opaque boundary、fail-closed、replacement、secret lifecycle、Binding non-authority および migration policy を確認 |
| Latest Specification review | [`specification-review-012.md`](specification-review-012.md) | 公開された `READY` / `CORE SPECIFICATION READY` 状態と、現行 companion Specification の Store 整合確認範囲を確認。本文の代替にはしていない |
| 過去 Store reviews | [`wallet-store-format-v1-review-001.md`](wallet-store-format-v1-review-001.md)、[`wallet-store-format-v1-review-002.md`](wallet-store-format-v1-review-002.md) | SR-001〜SR-008 の初出、過去 status および履歴を確認。現行本文・現行上流資料を優先した |
| 外部技術資料 | [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html) §4.2.1、§5.2〜§5.3 | Core Deterministic Encoding、unexpected / invalid CBOR および decoder の reject / stop 境界を確認 |

### Latest upstream review state

- Concept review 010: `READY` / `CONCEPT PHASE READY TO CLOSE`。
- Requirements cleanup review 001: `READY` / `REQUIREMENTS CLEANUP READY` / `REQUIREMENTS PHASE READY TO CLOSE`。
- Architecture review 002: `READY` / `ARCHITECTURE READY`。
- Security Design review 002: `READY` / `SECURITY DESIGN READY`。
- Bindings Design review 002: `READY` / `BINDINGS DESIGN READY` / `DESIGN PHASE READY TO CLOSE`。
- Latest companion Specification review 012: `READY` / `CORE SPECIFICATION READY`。
- `AGENTS.md` に実登録された Phase Context はないため、Context は探索・作成・使用していない。

## Review Result

`READY`

## Summary

現行 Requirements、Design、companion Specification および Store Format 本文を独立に突合した結果、SR-001〜SR-008 はすべて現行資料上 `RESOLVED` と判定する。前回 SR-002 の「同一 Mnemonic + Network は常に拒否」という解釈は、現行 Requirements が対象を「Core が生成・維持する、本要件・仕様に適合した整合した Store」に限定しているため、そのまま継承しない。整合 Store では同じ `registry_key`、Network および Mnemonic entropy から同じ `duplicate_tag` になるため duplicate を許さず、password-less の不一致ケースは保証対象外として明示されている。

CBOR の完全な item 境界、RFC 8949 Core Deterministic Encoding、全体 `InvalidStore` mapping、child skip 禁止、version 専用 error、unknown field の現行 schema 内 opaque / lossless 保持、unknown enum の fatal 扱い、AAD、意味的一致検証および atomic replacement は、本文と companion Specification で整合している。

ただし、unknown field の opaque value に許される CBOR type の集合は、既知 field の型定義とは別に明示されていない。RFC 8949 の deterministic 条件だけでは tag、simple value、text、float 等の受理範囲は閉じないため、独立実装間で未知 field の受理可否が分岐し得る。この限定的な wire interoperability clarification を `SR-009`（Minor / New）として記録する。Critical はなく、現行 Skill の Gate 判定は `READY` のままとする。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | `RESOLVED` | wallet-store-format-v1-review-001 | §3.3 が外部 UUID、raw `bytes[16]`、左から右の byte order、case、malformed input の `InvalidArgument` および Store 内不正の `InvalidStore` を定める。 |
| SR-002 | Major | `RESOLVED` | wallet-store-format-v1-review-001 / Open in review-002 | 現行 Requirements の整合 Store 限定保証と、§14.1 / companion §8.2 の candidate tag 比較、後続認証・復号時の意味的一致検証が一貫している。 |
| SR-003 | Major | `RESOLVED` | wallet-store-format-v1-review-001 | §2.1、§13、§14.1 が missing / invalid type、unsupported version、Store 全体拒否、child skip 禁止および replacement 非返却を定める。 |
| SR-004 | Major | `RESOLVED` | wallet-store-format-v1-review-001 | §2.1、§7.1、§8〜§9 が必須 field、型・長さ・enum、order、duplicate、index / payload 写像を fatal `InvalidStore` とする。 |
| SR-005 | Major | `RESOLVED` | wallet-store-format-v1-review-001 | 認証・復号後の payload 構造、順序、duplicate、index 写像および意味検証の失敗で正常 Profile、secret、mutation、replacement を返さない。 |
| SR-006 | Major | `RESOLVED` | wallet-store-format-v1-review-001 | §2、§7.1、§11 が unknown field の logical non-use、AAD wire value、lossless mutation、保持不能時の `InvalidStore` および replacement 非返却を定める。 |
| SR-007 | Major | `RESOLVED` | wallet-store-format-v1-review-002 | §2、§2.1 が complete item 1 個、全 input 消費、truncated / trailing / multiple item / deterministic violation の拒否と `InvalidStore` mapping を明示する。 |
| SR-008 | Minor | `RESOLVED` | wallet-store-format-v1-review-002 | §2、§11、§13、§14.1 が現行 schema version 内の opaque / lossless 保持に限定し、future version、future schema、意味解釈、migration、unsupported fallback を保証しない。 |
| SR-009 | Minor | `New` | 本レビュー | unknown field value の CBOR type 受理集合および reject 境界が、known field の schema type と別に閉じられていない。詳細は Optional Improvements。 |

## Required Changes

なし。`Critical` の New / Open / Reopened は確認されない。

## Optional Improvements

### SR-009 — Unknown field の CBOR type 境界

- Severity: `Minor`
- Status: `New`
- 対象箇所: [`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) §2、§2.1、§7.1、§11; companion [`specification.md`](../../specifications/specification.md) §7、§10
- 確認できた事実: 既知 field の型は各 schema で `map`、`array`、unsigned integer、byte string 等として示され、map key は unsigned integer、float は使用しないと定められている。一方、unknown field は opaque extension として key/value を lossless に保持するとされ、§2.1 は「v1 が許可しない CBOR 型」を拒否するとするが、unknown field の value に対する許可 type 集合を明示していない。
- 既存の根拠: Requirements DR-009 は未知データを意味解釈せず、安全に保持できない変更を拒否することを要求し、具体的な保存表現・未知値の表現を Specification へ委譲する。RFC 8949 §5.2〜§5.3 は generic decoder が well-formed data を扱い得る一方、CBOR protocol が unexpected / invalid data の扱いを定めることを求める。RFC 8949 §4.2.1 の deterministic 条件だけでは、tag、simple value、text、float 等の受理集合を決めない。
- 問題: unknown field の value が deterministic に符号化された text、tag、simple value、negative integer、float または別の well-formed item である場合に、受理して raw wire value を保持するのか、`InvalidStore` として拒否するのかが独立実装間で分かれ得る。これにより current schema の opaque extension を含む Store の decode、mutation、相互運用性および negative fixture の結果が一致しない。
- 影響: 既知 field の正常な wire contract、unknown enum の fatal policy および future version reject は明確なままだが、unknown field の type boundary だけが曖昧である。unknown field は意味解釈しないため、現時点で既存 secret の意味検証や duplicate 判定を直接 bypass する根拠にはならないが、attacker-controlled Store に対する受理・拒否と lossless preservation の結果が分岐する。
- 必要な最小修正: unknown field の value に許される CBOR type / major type と、deterministic well-formed item の受理・拒否および lossless 保持条件を、現行 schema version の wire contract として明示する。unknown enum は従来どおり別の fatal `InvalidStore` とし、future version の一般的 forward compatibility、意味解釈または migration を追加しない。
- 完了条件: 各許可・拒否 type、unknown field を含む decode、mutation、AAD に含まれる `software_key_index`、保持不能時の `InvalidStore` および replacement 非返却を、独立実装が同じ結果で検証できる。

## Resolved Findings

### SR-001 — UUID representation

§3.3 は external UUID を hyphen-separated hexadecimal UUID string とし、英大文字・小文字を入力として受理し、外部出力を lowercase とする。Store は文字列の16進値を左から右へ raw `bytes[16]` とし、field endian conversion、reverse、並べ替えを行わない。malformed / conversion failure は `InvalidArgument`、Store 内の欠落・型不正・`bytes[16]` 以外は `InvalidStore` とし、raw bytes からの出力も同じ順序を使用する。Profile / Software Key の order と uniqueness はこの raw bytes を基準にするため、独立実装間の valid UUID 結果は一意である。

### SR-002 — Profile duplicate detection

現行 Requirements FR-017、DR-006、AC-018 は、duplicate 拒否保証の対象を Core が生成・維持する要件・仕様適合の整合 Store に限定する。Store 内の `registry_key` は固定され、同じ candidate Mnemonic entropy と Network は同じ `duplicate_tag` になるため、整合 Store では平文 tag 一致を `DuplicateProfile` として拒否すれば要件を満たす。

§14.1 と companion §8.2 は、既存 Profile の password を受け取らない作成・復元では全 Profile の意味的一致を事前検証しないこと、candidate tag 不一致だけを理由に拒否しないこと、`DuplicateProfile` では input Store を変更せず replacement を返さないことを明示する。これは不整合 Store に対する一般的な重複受理保証ではなく、現行 Requirements が定める保証範囲である。後続の対象 Profile 認証・復号では `duplicate_tag` と decrypted Mnemonic / authenticated Network を再計算して比較し、不一致は AEAD failure ではない `InvalidStore` として、secret、正常結果、mutation および replacement を返さずに拒否する。全 Store を password なしで意味検証する新 API は要求されていない。

### SR-003 — Profile schema version

§2.1 は version field の存在・unsigned integer 型を構造検証し、欠落・型不正を `InvalidStore`、値だけが未対応の場合を `UnsupportedStoreVersion` / `UnsupportedProfileSchemaVersion` と区別する。§14.1 は未対応 Profile schema version を一覧、個別読出し、作成・復元時 duplicate 判定、secret operation および全 mutation に適用し、child skip、partial read、replacement 生成を禁止する。§13 は implicit migration、fallback、auto rewrite を禁止し、companion §10 / §11 は同じ Store-wide failure result を定める。

### SR-004 — Malformed child object / enum / index

§2.1 は child object の必須 field 欠落、型・固定長・値不正、unknown enum、重複、canonical order 違反および index / payload 不一致を対象 object の skip なしで Store 全体拒否とする。`SoftwareKeyIndexEntryV1` は §7.1 で `key_id` raw bytes order、profile 内 uniqueness、型・長さ・値、認証・復号後の `key_id -> chain` 有限写像一致を定め、`SoftwareKeyRecordV1` は §9 で chain、private key、origin および Derived `account_index` を定める。未知 enum は unknown field と区別され fatal `InvalidStore` である。

### SR-005 — Authenticated payload validation

§8 は `ProfilePayloadV1` の必須 field、`mnemonic_entropy = bytes[32]`、`software_keys` の order、空配列および key uniqueness を定め、§7.1 / §11 は AEAD 認証・復号後に index と payload の写像および `duplicate_tag` の意味的一致を検証する。構造・order・duplicate・mapping・意味的一致の失敗は `InvalidStore` とし、§2.1、§12、companion §10〜§11 により正常 Profile、secret、normal read result、mutation、partial state および replacement を返さない。AEAD authentication success を payload semantic validity の証明として扱っていない。

### SR-006 — Unknown field preservation

§2 は unknown field を current schema version 内の opaque extension とし、logical model、一覧、duplicate 判定および index / payload mapping へ使用しない。§7.1、§11 は受信 wire value、未知 map key/value、要素順および空配列表現を保持して AAD を再構成し、対象外 Profile の ciphertext / tag / AAD を変えず、対象 Profile の mutation では既知 field のみ canonical に再生成しつつ unknown field を lossless に保持することを定める。保持不能時は mutation 全体を `InvalidStore` として拒否し replacement を返さない。unknown enum はこの preservation policy の対象外で fatal である。

### SR-007 — Deterministic CBOR / top-level boundary

§2 は Wallet Store input を complete CBOR item ちょうど1個とし、item が input bytes 全体を消費することを要求する。empty、truncated、trailing、multiple concatenated item、indefinite-length、integer / length の非最短表現、duplicate map key、float、top-level 非 map、known field の型・長さ・値不正およびその他の deterministic / structural violation を受理しない。これらの公開 error は内部 parser error の種類にかかわらず `InvalidStore` であり、version field が構造上 unsigned integer で値だけ未対応の場合だけ version-specific error となる。companion §7、§10、§11 も同じ boundary、state unchanged、replacement 非返却および child skip 禁止を定める。

### SR-008 — Forward compatibility wording

§2、§11、§13、§14.1 は unknown field の保持を現行 schema version の wire object 内に限定し、unknown field の意味解釈、future Store / Profile version の受理、unsupported fallback、automatic migration および version の意味変更を保証しない。unknown enum は opaque preservation ではなく fatal `InvalidStore` である。したがって過去 review の「限定的保持を forward-compatible と誤解し得る」という指摘は現行本文で解消されている。

## Upstream Feedback

なし。現行 Requirements、Architecture、Security Design、Bindings Design および companion Specification との間に、Store Format の安全な判定を妨げる明確な矛盾は確認されない。SR-009 は Requirements DR-009 が具体化を委譲した current Store wire contract の局所的な clarification であり、Requirements / Design の再定義を求めるものではない。

## Deferred Findings

- なし（Specification-level の未解決 security blocking finding はない）。
- Implementation Review へ委譲する範囲: CBOR crate の実際の parser 挙動、parser 内部 allocation、length check の全 allocation 経路、unsafe / pointer、zeroization、constant-time compare、具体 C ABI / WASM ownership、実 fixture の実行および fuzz harness。
- 上記は本レビューの `READY` 判定を変更しないが、仕様契約の実装適合性を別途検証する必要がある。

## Scope and Traceability

### 対象境界

Wallet Store Format は、Core が validity、integrity、consistency、秘密情報保護および replacement の意味を所有し、Application / Binding が opaque blob を保存・転送する境界である。Store Format 自体は保存先、UI、backup availability、Native implementation または WASM runtime の保証を決めない。

### Requirements traceability

| 要件 | Store Format / companion Specification の対応 | 判定 |
| --- | --- | --- |
| FR-017、DR-006、AC-018 | Store §12、§14.1、companion §8.2、§10、§17。整合 Store では同一 Mnemonic + Network を `DuplicateProfile` とし、candidate tag 不一致だけを理由に password-less reject しない。 | 適合 |
| DR-009、AC-045 | Store §2、§2.1、§13、§14.1、companion §7、§10〜§11。version 識別、unsupported reject、unknown field の限定的保持、no fallback / no implicit migration。 | 適合 |
| SEC-004、AC-017 | Store §2.1、§4、§7.1、§11〜§12、companion §10〜§11。破損、認証失敗、意味的不一致および不整合 payload を正常 secret processing へ進めない。 | 適合 |
| SEC-018、AC-038、AC-046 | Store §2.1、§11、companion §7、§11。success 時のみ complete replacement、failure 時 replacement 非返却、input / existing committed state の保護。 | 適合 |
| SEC-019、AC-039 | Store §6、§11、companion §11。対象 Profile mutation と他 Profile の ciphertext、tag、AAD、ID、利用可否を分離する。 | 適合 |

### Design traceability

| Design の確定事項 | Store Format / companion Specification の対応 | 判定 |
| --- | --- | --- |
| Core が Store validity / integrity / consistency と秘密情報保護を所有 | Architecture §4.1、§5.2、Security Design §5.1、§6.5 → Store §2、§2.1、§11〜§12、companion §7、§10〜§11 | 適合 |
| Application / Binding は opaque Store を mediation し、内部意味・migration・fallback を代替しない | Architecture §3.3、Bindings Design §3.1、§5.2、§6.1 → Store §1、§11、§13、companion §13 | 適合 |
| attacker-controlled input、fail-closed、existing committed state 保護 | Security Design §3.1、§6.5〜§6.6、Architecture §5.2〜§5.3 → Store §2.1、§2.2、§11、companion §10〜§11 | 適合 |
| version migration 非提供、future migration は将来 version で再定義 | Architecture §5.2、Security Design §9.3、Bindings Design §9.3 → Store §13、§14.1、companion §7 | 適合 |

## Domain Checks

| 領域 | 判定 | 確認内容 |
| --- | --- | --- |
| CBOR deterministic encoding | 適合。ただし SR-009 の局所 clarification あり | RFC 8949 Core Deterministic Encoding、definite length、最短 integer / length、unsigned integer map key、duplicate map key 禁止、float 不使用、array / map order、complete item 1 個、全 bytes 消費および invalid input の `InvalidStore` を確認した。unknown field の value type 集合だけは明示不足。 |
| CBOR completeness / malformed | 適合 | empty、truncated、trailing、複数 item、indefinite-length、非最短表現、top-level 非 map、型・長さ・値不正および internal parser error の公開 mapping が `InvalidStore` に統一されている。 |
| Resource / DoS boundary | 適合 | raw Store 16 MiB、Profile 128、Profile あたり Software Key 256、Bytes / Text 1 MiB、ciphertext 1 MiB、array / map 256、nesting depth 32 の固定上限を確認した。length 読取り後かつ Vec / String / ciphertext clone 前の検査も定義され、上限超過は child skip なしの `InvalidStore`。crate 固有 allocation は未確認。 |
| Version / migration | 適合 | Store / Profile version の missing / invalid type は `InvalidStore`、unsigned integer で値だけ unsupported は `UnsupportedStoreVersion` / `UnsupportedProfileSchemaVersion`。Store-wide reject、child skip / replacement 禁止、implicit / automatic migration / fallback 禁止。 |
| IDs / ordering / uniqueness | 適合 | UUID と raw bytes[16] の left-to-right mapping、lowercase output、ProfileId は Store 内、SoftwareKeyId は Profile 内 Chain-independent に一意。`profiles` と `software_keys` / index は raw ID bytewise strict ascending。 |
| Enum wire values | 適合 | Network、Chain、SoftwareKeyOrigin、KDF、Cipher の value と再利用禁止を確認。unknown enum は unknown field と区別して Store-wide `InvalidStore`、skip / warning なし。 |
| Mnemonic storage | 適合 | BIP39 English 24 words、entropy `bytes[32]` を保存し、words と seed を永続保存しない。 |
| WalletStoreV1 | 適合 | magic `SNWC`、version 1、`registry_key bytes[32]`、profiles、profile ID ordering / uniqueness、empty profiles を確認。`registry_key` は CSPRNG 生成の平文 context で secret 扱いしない。 |
| ProfileEnvelope | 適合 | profile_id、network、duplicate_tag、schema_version、KDF、Cipher、software_key_index の必須 field / type / fixed length / order を確認。plain metadata と encrypted payload は AAD および復号後 semantic validation で結び付く。 |
| ProfilePayload / Software Key | 適合 | mnemonic entropy、software key records、key_id、chain、origin、raw private key、Derived account index、canonical order、duplicate、index ↔ payload finite-map consistency を確認。Chain 上の private key validity は companion Specification の責任境界で定義されている。 |
| KDF / Cipher | 適合 | Argon2id version 19、memory 65536 KiB、iterations 3、parallelism 1、salt 16 bytes、output 32 bytes、および AES-256-GCM、nonce 12 bytes、tag 16 bytes、ciphertext を target / companion で照合した。nonce CSPRNG / per-encryption 規則は companion §6.2 と整合する。 |
| AAD / domain | 適合 | AAD は `[magic, store_version, registry_key, profile_id, network, duplicate_tag, profile_schema_version, kdf_algorithm_id, cipher_algorithm_id, software_key_index]` の deterministic CBOR array。各 wire representation、順序、received `software_key_index` の unknown map key/value、element order、integer key、empty array を保持する。`duplicate_tag` の domain separator は別途 UTF-8 固定値。 |
| duplicate_tag / Profile duplicate | 適合 | HMAC-SHA256、`registry_key`、固定 domain separator、Network 1 byte、Mnemonic entropy 32 bytes、32-byte compare、AAD authenticated tag、復号後 semantic validation、`DuplicateProfile` / `InvalidStore` 境界を確認。tag は平文 metadata であり、秘密鍵・Mnemonic の代替公開値として扱わない。 |
| Unknown field / enum | 適合。ただし SR-009 | unknown field は current schema 内 opaque / logical non-use / lossless preservation。unknown enum は fatal `InvalidStore` で preservation 対象外。future Store / Profile version の一般 forward compatibility、意味解釈、automatic migration、unsupported fallback はない。 |
| Mutation / atomic replacement | 適合 | input / existing committed state を failure で変更せず、success 時のみ complete replacement、partial Store / secret / normal result を返さない。対象外 Profile の ciphertext / tag / AAD / wire value、unknown field を保持し、対象 Profile の known field は canonical に再生成。保持不能時は `InvalidStore`、replacement 非返却。 |
| Error interoperability | 適合 | `InvalidStore`、`UnsupportedStoreVersion`、`UnsupportedProfileSchemaVersion`、`AuthenticationFailed`、`DuplicateProfile` の境界が target / companion で一致。parser-specific error を Application-facing error として追加しない。Stored child malformed は `InvalidStore`、operation duplicate は `DuplicateProfile` / `DuplicateSoftwareKey` と区別される。 |
| Security / fail-closed | 適合 | tampered metadata / ciphertext / AAD、AEAD failure、unknown enum、version、duplicate ID、index / payload mismatch、tag semantic mismatch、malformed payload の全体 reject、secret 非返却、mutation 非実行、replacement 非返却を確認。parser implementation、unsafe、zeroization 等は Implementation Review に委譲。 |

## Validation Results

- Markdown structure: 実施。共通 output format の18章を指定順で構成し、finding ID、severity、status、required field および Gate 判定の整合を確認した。
- Relative links: 実施。成果物内の repository-relative Markdown link の対象存在を確認した。RFC link は外部公式資料への HTTPS link とした。
- Finding IDs: 実施。過去 SR-001〜SR-008 の status を1件ずつ記録し、新規 finding は `SR-009` とした。重複 ID はない。
- Past finding status: 実施。review-001 / review-002 の status を履歴として確認し、現行本文・Requirements・companion Specification と再照合した。
- Scope check: 実施。新規 review artifact 以外の repository file は変更していないことを確認した。
- `git diff --check`: 実施。既存の unstaged / tracked diff に whitespace error はない。
- `git diff --cached --check`: 実施。staged artifact に whitespace error はない。
- Rust / WASM build、lint、test: 未実行。コード変更ではなく、ユーザー指定どおり不要とした。
- Implementation / fixture validation: 未実行。レビュー対象外であり、Specification の正当化根拠にしていない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 目的と範囲 | 合格 | §1〜§2、companion §1〜§2 が opaque Store、Core / Application / Binding の責任および current wire scope を定める。 | なし |
| 契約 | 合格 | §2〜§14 と companion §7、§9〜§11 が field、型、order、version、AAD、duplicate、unknown、error、replacement および禁止事項を定める。unknown field type の局所 clarification は SR-009。 | SR-009（Minor） |
| 処理と例外 | 合格 | malformed / tampered / unsupported / semantic mismatch、全体 reject、child skip 禁止、secret / replacement 非返却および mutation failure が一意である。 | なし |
| 内部整合性 | 合格 | Store Format と companion Specification の wire delegation、`InvalidStore`、duplicate scope、AAD、unknown policy、version / migration が一致する。 | なし |
| 検証可能性 | 合格 | deterministic CBOR、negative input、AAD、duplicate、version、unknown preservation、atomic replacement の独立 fixture 条件を確認できる。SR-009 は追加の type-boundary fixture を求める Minor。 | SR-009（Minor） |
| 安全性と相互運用性 | 合格 | protected asset、AEAD / AAD、fail-closed、secret 非返却、Profile isolation、opaque extension および deterministic wire の主要契約がある。 | なし |
| 上流整合性 | 合格 | Concept、Requirements、Architecture、Security Design、Bindings Design および companion Specification review-012 の公開状態と current本文が矛盾しない。 | なし |

Gate policy に従い、`Critical = 0` のため `READY` とする。`SR-009` は未解決の Minor だが、独自の Gate failure 条件は追加しない。

## Remaining Risks and Open Decisions

- Store-format-level Open Decision: `SR-009`。現行 schema version の unknown field value に許される CBOR type 集合と、各 type の `InvalidStore` / lossless preservation 境界を、実装前に明示する必要がある。これは non-blocking Minor であり、現行 Gate の `READY` を変更しない。
- 既知 field、unknown enum、version、AAD、duplicate tag、mutation および failure semantics に関する blocking Open Decision はない。
- malformed CBOR の実装挙動、resource limit の crate 内 allocation coverage、memory / FFI、zeroization、実 fixture の実行結果は未確認であり、Implementation / release verification で確認する。
- `WALLET STORE FORMAT V1 READY` は、現行 `spec-review` Gate の判定として宣言できる。ただし SR-009 の non-blocking clarification と下流 Implementation / verification を引き継ぐ。

## Automatic Changes

なし。レビュー中に変更したのは本新規 review artifact のみである。

## Final Decision

`READY`

**WALLET STORE FORMAT V1 READY**

Critical は 0 件であり、SR-001〜SR-008 は `RESOLVED`。SR-009 は unknown field value type の相互運用性を明示するための Minor / New で、現行 Skill の Gate failure には該当しない。
