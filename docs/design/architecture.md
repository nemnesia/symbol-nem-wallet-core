# Wallet Core 基本設計

## 1. 目的、対象、対象外

本書は、`symbol-nem-wallet-core` v1 の責務、境界、依存方向、データ所有、主要ライフサイクルおよび設計判断を定める基本設計の現行正本である。上位の Concept / Requirements を、次工程が実装可能な責務配置と security invariant へつなぐ。

対象は、Desktop / Mobile / Web の Symbol / NEM ウォレットから利用する Rust Wallet Core と、Core へ接続する Native / Web WASM Binding である。Web には Web Application と Browser Extension を含める。システムコンテキストには、利用者、各 Application、Browser、OS、host process、persistent storage、Transaction layer および Network layer を含める。

Core は、Profile を単位として Mnemonic と Software Key の生成、復元、導出、取込み、暗号化保存、署名、個別エクスポートおよび削除を扱う。Profile の Network、Software Key の Chain、Symbol / NEM の違いは明示的に扱い、暗黙に共通化しない。

次は本設計の対象外である。

- Wallet UI、表示の具体的な方式、ユーザー操作の具体的な実装およびウォレット固有設定
- REST / WebSocket / announce、ノード選択および Explorer
- Transaction の構築、シリアライズ、意味解釈および署名承認 UI
- Hardware Wallet、External Signer、OS Keychain / Secure Enclave / TPM
- Profile データの保存先選択、バックアップ UI、同期、端末間データ移行および外部復旧の具体的な方式
- Store / Profile version migration の具体的な方式。v1 は version migration を提供しない

端末間データ移行は、Application が opaque な Store を保存・転送する責任を指す。Store schema / version migration とは別の概念であり、Application が Store の内部を解釈・編集する権限を与えない。

## 2. 上流根拠と用語

### 2.1 上流根拠と依存方向

Architecture の normative な上流 Source of Truth は次の二つだけである。

- [`docs/consept/concept-sheet.md`](../consept/concept-sheet.md): 製品目的、v1 範囲、対象環境および上位責任境界
- [`docs/requirements/requirements.md`](../requirements/requirements.md): Profile、Mnemonic、Software Key、Account、Chain / Network、責任、security property および受入条件

開発フェーズの normative dependency は、次の方向とする。

```text
Concept → Requirements → Architecture → Specification → Implementation
```

Concept review や Requirements review は、上流成果物の判定履歴であり、Architecture の規範内容を置き換えない。Architecture が定める責務、ownership、trust boundary、security architecture および lifecycle は Concept / Requirements から導出し、下流の形式や実装の都合から逆生成しない。

[`docs/specifications/specification.md`](../specifications/specification.md) は、Architecture から委譲された API、validation、error、crypto、protocol およびその他の外部契約の下流正本である。[`docs/specifications/wallet-store-format-v1.md`](../specifications/wallet-store-format-v1.md) は Store の具体的な wire / format 契約の下流正本である。これらは Architecture の上流根拠ではなく、Architecture の判断と矛盾しないことを確認する補助資料および下流委譲先として扱う。

[`docs/design/security.md`](security.md) と [`docs/design/bindings.md`](bindings.md) は同一 Design フェーズの関連設計であり、責務の整合確認に用いる。関連設計の具体契約を Architecture の上流根拠として扱わず、競合を見つけた場合は黙って統合しない。

### 2.2 用語

- **Profile**: 固定された Network、1 つの Mnemonic、および 0 個以上の Software Key を持つ秘密情報管理の単位。Profile は Chain には固定しない。
- **Mnemonic**: Profile のルート秘密情報。Core が生成、復元、取込み、保護および継続管理を担う。
- **Software Key**: Derived、Imported または Generated の秘密鍵を、同じ鍵管理ライフサイクルで扱う単位。Software Key は Chain に固定する。
- **Account**: Software Key を、その Software Key の固定 Chain と Profile の固定 Network 上で利用する概念。利用する Account の選択・提示は Application が担い、対応関係の検証は Core が担う。
- **Wallet Store**: Core が読み込み、version、整合性および秘密情報保護を検証する opaque な保存データ。保存先は Application の責任である。
- **Pending / partial state**: Profile または Software Key の成功確定前に存在し得る未確定状態。正常な committed Profile / Software Key ではなく、具体的表現によらずその意味を Core が管理する。
- **Binding**: Core と Native / Web WASM の実行環境の間で型、buffer、error および ownership を橋渡しする境界層。
- **Signing authority**: 指定された Account / Software Key に対応する秘密鍵を使用して署名できる権限。Profile password の正しさや利用者の署名承認とは別の security property とする。

## 3. システムコンテキストと trust boundary

```text
                              ┌──────────────────────────────────────┐
                              │ host environment                     │
                              │ Browser / OS / host process          │
                              │ （侵害防止を Core は保証しない）     │
                              └──────────────────────────────────────┘
                                                │
User / 利用者 ──表示・確認・承認──> Application / UI ──> Binding ──> Rust Wallet Core
                              │                    │              │
                              │                    │              └─ signing / key lifecycle
                              │                    │
      Desktop Application ───┘              Native Binding       │
      Mobile Application  ───┘                                  │
      Web Application / Browser Extension ─ Web / WASM Binding   │
                                                                 │
Rust Wallet Core ──replacement Store──> Application / UI ──opaque 保存──> persistent storage
persistent storage ──opaque Store──> Application / UI ──> Binding ──> Rust Wallet Core

Transaction layer ──内容・payload──> Application / UI
Application / UI ──承認済み要求──> Binding ──> Rust Wallet Core
Rust Wallet Core ──署名結果──> Application / Transaction layer ──> Network layer
```

上図の各主体と境界の責任は次のとおりである。

- **利用者**: Mnemonic の初回 handoff における受領確認、署名要求の明示承認および秘密情報を外部へ受け取った後の保管責任を持つ。Core は紙への記録や外部保存を独立検証しない。
- **Desktop Application / Mobile Application / Web Application / Browser Extension**: UI、利用者への表示、利用者意思の確認、Account の選択、opaque Store の保存および外部層との連携を担う。Application は current Store の authority として、Core が返した replacement Store の正しい適用、stale / historical Store の再適用防止および最新版の backup / snapshot 管理を担う。Application は Core 管理下秘密情報の継続的な管理主体にならない。
- **Native Binding / Web WASM Binding**: Application と Core の間の transport、型変換、ownership および error の橋渡しを担う。意味、認証、暗号、Chain / Network policy および秘密情報 ownership を決めない。
- **Rust Wallet Core**: Profile、Mnemonic、Software Key、処理単位認証、Chain / Network compatibility、signing primitive、入力 Store の validity および成功状態の最終確定を担う。Core は stateless な opaque Store processor であり、自身が返した過去 Store を永続記憶せず、valid historical Store の currentness または rollback を単独では判定しない。
- **Browser / OS / host process**: Application と Binding が動作する host environment であり、Core がその侵害を防止する保証の対象ではない。
- **persistent storage**: Application が選択・利用する Store の保存先であり、Store の内部意味を決めない。Application / persistence layer は current Store の選択・保持を担い、Core はその freshness を保証しない。
- **Transaction layer**: Transaction の構築、内容およびシリアライズを担う。Core は Transaction の意味を説明・解釈しない。
- **Network layer**: REST、WebSocket、announce などの通信を担う。Core の秘密情報管理を代替しない。

### 3.1 全環境共通の security invariant

Desktop、Mobile、Web、Native および Web / WASM の経路で、次の invariant を共通に適用する。

- Mnemonic および Software Key 原本の継続的な管理主体は Core である。
- Binding / Application は、入力や明示的な handoff / export の受渡しを一時的に仲介できるが、Core とは別の継続的な秘密情報管理主体にならない。
- Core 管理下の秘密情報は、通常処理の結果として Core 外へ返さない。初回 Mnemonic handoff と条件を満たした個別 export だけが明示的な例外である。
- Desktop / Mobile / Web の違いによって、Core の管理責任、認可責任および通常処理での非開示原則を変えない。Native 経路だから Web より弱い非開示原則にはしない。
- Application、Browser、OS または host process の compromise 自体を Core が防止する保証はない。
- host compromise を保証しない場合でも、Core / Binding が不要な秘密情報を返却、共有、継続保持または診断出力することを許容しない責任は維持する。
- Application / Browser / OS / host process の compromise を理由に、通常処理での秘密情報非開示責任や authorization boundary を弱めない。

### 3.2 Core boundary

Core は、秘密情報 lifecycle、Profile と Software Key の対応付け、処理単位の Profile password authorization、秘密情報の導出・検証・暗号化・復号・署名利用、Chain / Network compatibility、Store の validity および状態変更を所有する。Core は UI を提供せず、利用者意思を推測せず、Transaction の意味解釈、Transaction の構築または署名承認を担わない。

Core は処理をまたぐ継続的な Unlocked state、Profile password の永続保存または継続 cache を持たない。Core 外へ返す秘密情報は、初回 Mnemonic handoff または明示的な個別 export の成功結果に限定する。

### 3.3 Application / Binding / storage boundary

Application と UI は、利用者が何を操作しているかを表示し、必要な利用者の確認・承認を得たうえで Core を呼び出す。Application は Core に代わって password authorization、秘密情報利用可否、Chain / Network compatibility または Store の内部意味を決めない。

Binding は Core の結果を実行環境へ橋渡しするが、unlock session、authorization cache、秘密情報の継続管理または独自の security policy を持たない。

Application は Core が生成した replacement Store を opaque な値として保存し、current Store として正しく選択・適用する。persistent storage の失敗時に Core の未保存 replacement を committed state と扱わず、既存の committed Store を正本として維持する。Application / persistence layer は stale / historical Store の再適用を防止し、Core は valid historical Store が過去 snapshot であることを知るための履歴を持たない。

## 4. コンポーネント責務と依存方向

### 4.1 Rust Wallet Core

Core は次を所有する。

- Profile、Mnemonic、Software Key、pending / partial state の security responsibility と lifecycle
- Profile password の処理単位 authorization。認証結果を次の操作へ持ち越さない
- Mnemonic の生成・検証・復元、HD 導出および Software Key の生成・取込み
- Account、Software Key、Chain、Network の compatibility 判定と fail-closed な reject
- Symbol / NEM の Chain 固有の鍵、公開情報、署名および Network 処理
- Store の version 識別、構造・整合性検証、秘密情報の暗号化・復号、重複判定および replacement 候補の生成。Core は入力 Store の validity を処理するが、過去 Store の currentness / rollback を記憶に基づいて判定しない
- Profile / Software Key が正常な committed state になったことの最終確定
- 失敗時に existing committed state を変更しないこと、対象外 Profile へ越境しないことおよび秘密情報を返さないこと

Core は、利用者の紙への記録、Transaction の意味説明、UI、利用者意思の独立検証、Application assertion の freshness または保存先の availability を所有しない。

### 4.2 Binding

Native / Web WASM Binding は、Core の共通動作を各実行環境へ公開するための型変換、raw / opaque data の受渡し、error / warning mapping、lifecycle および ownership の橋渡しだけを行う。

Binding は暗号化、認証、Mnemonic validation、導出、署名、重複判定、Chain / Network の意味判定、Store / pending state の意味解釈、Transaction の意味解釈を複製しない。Binding の経路差は Core の秘密情報公開範囲、authorization、failure policy または ownership を変更しない。

### 4.3 Application / UI

Application / UI は次を担う。

- 利用者操作、公開情報の表示、利用する Account の選択および利用者への提示
- 初回 Mnemonic handoff における完全な Mnemonic の意図された利用者への提示と、利用者の明示的な受領確認の取得
- explicit secret export における対象の表示、利用者の取得要求の確認および確認済み要求だけの送信
- signing における Account の選択、payload / Transaction 内容の提示、利用者が確認できる状態の提供、明示的な署名承認の取得および承認済み要求だけの送信
- Core が返す opaque Store の current Store としての保存、置換、バックアップ、同期または端末間転送。これらは Store schema / version migration とは別の外部責任であり、stale / historical Store の再適用防止を含む
- handoff、export および signing における現在の操作に対する利用者の確認・承認 assertion の freshness を管理し、過去に保存した `Approved`、`Confirmed` または `Requested` を新しい利用者意思として再利用しないこと
- Core 外へ明示的に渡された秘密情報コピーの表示、保管、利用および紛失防止

Application は、Core 管理下の Mnemonic / Software Key 原本、Core の signing authority または Profile password authorization の正本にならない。

### 4.4 Transaction layer、Network layer、persistent storage、host

- Transaction layer は Transaction の生成、意味、表示に必要な内容およびシリアライズを担い、Core へ署名対象 payload を提供する。
- Network layer は通信を担い、Chain / Network の暗黙変換や秘密情報管理を行わない。
- persistent storage は Application が選択し、opaque Store を保存する。Store を正常な秘密情報として解釈する責任は Core にある。
- Browser、OS および host process は実行環境の安全性を担うが、その compromise 防止は Core の保証範囲外である。Core / Binding の通常処理での非開示責任はこの制限によって変わらない。

### 4.5 依存方向

component の依存方向は次とする。

```text
Application / UI → Native Binding または Web WASM Binding → Rust Wallet Core
```

Application、Binding、Transaction layer および Network layer は Core の secret lifecycle、authorization、signing authority または Store validity を代替しない。Core は UI、Browser API、OS policy または host-specific policy に依存しない。Binding 固有の判断を Core や別 Binding へ横展開せず、秘密情報処理の実装源を Core に集約する。

## 5. データ所有、秘密情報境界、lifecycle

### 5.1 Profile、Account および protected assets

Profile と Software Key の関係は次のとおりである。

- Profile は Network を固定する。Profile は Chain には固定しない。
- Profile は 1 つの Mnemonic と 0 個以上の Derived / Imported / Generated Software Key を持つ。
- Software Key は Chain に固定する。由来にかかわらず同じ秘密鍵利用 lifecycle で扱う。
- Account は Software Key を、その固定 Chain と Profile の固定 Network 上で利用する概念である。
- 同一 Profile・同一 Chain では同一秘密鍵を重複管理せず、異なる Chain では同じ秘密鍵に対応する Software Key を別の利用単位として扱える。

本設計の protected assets と継続的な security responsibility は次のとおりである。

| protected asset | 継続的な security responsibility | 境界と扱い |
| --- | --- | --- |
| Mnemonic | Core | Profile の root secret として Core が生成・保持・利用・破棄する。通常結果には含めず、初回 handoff または条件を満たす個別 export だけを例外とする。 |
| Software Key private key | Core | Chain 固定の Software Key として Core が保持・利用・破棄する。通常の Application / Binding 結果には含めない。 |
| derived secret / decrypted secret material | Core | Core が必要な処理中だけ security responsibility を持つ。通常結果、診断、pending の正常状態として返さない。 |
| Profile password | Core の処理単位 authorization | Core は継続的に保存・cache せず、各 operation の authorization にだけ使用する。Application が一時的に扱う場合も Core の認可を代替しない。 |
| temporary secret | 生成・利用した境界における Core の security responsibility | handoff、導出、復号、署名、export 等の必要な処理範囲に限定する。成功・失敗・中断・再起動後に継続利用可能な pending、cache または診断として残さない。 |
| Core 管理下 Store | Core が入力 Store の論理状態・validity・秘密情報保護を管理 | Application / persistence layer は opaque blob の current Store authority、保存・replacement の適用、stale / historical Store の再適用防止および backup / snapshot の最新版管理を担う。Core は過去 Store を記憶せず、valid historical Store の freshness / rollback を単独で判定しない。保存先へ渡された値の内部を Application / Binding が独自解釈・編集しない。 |
| signing authority | Core | 指定 Account / Software Key に対応する秘密鍵を使う能力を Core が管理する。Application の Account 選択と利用者の署名承認は別の責任である。 |

秘密情報の具体的な memory representation、copy、保持期間、破棄方式および zeroize の詳細は下流へ委譲する。ただし、上表の ownership、通常処理での非開示、明示的アクセスの境界および失敗時の非残留 invariant は変更しない。

### 5.2 Wallet Store の ownership と v1 version policy

Core は、現在の operation に入力された Store の version、構造、整合性および秘密情報保護を検証し、処理結果を反映した replacement Store を生成する。Application はその replacement Store を opaque blob として persistent storage へ保存し、次の current Store として正しく選択・適用する。Application が保存できなかった場合、committed old Store が正本として残り、Core の未保存 replacement は committed state ではない。

Application / persistence layer は current Store の authority であり、成功 replacement の適用、stale / historical Store の再適用防止および backup / snapshot の最新版管理を担う。Core は自身が返した過去 Store snapshot を永続記憶しないため、authentication / integrity に成功する valid historical Store が削除・変更前の snapshot であることを単独で知ることができず、valid historical Store の freshness または rollback を検出・拒否する保証を持たない。これは malformed、tampered、authentication failure、unsupported version または inconsistent Store の fail-closed 検証を弱めない。

v1 の Store / Profile version policy は次のとおりである。

- Core は Store / Profile version を識別する。
- v1 Core は、v1 が明示的に対応する version だけを処理する。
- unsupported version、unknown version、破損・不整合 data および対応できない data は reject する。
- unsupported data を別 version と推測せず、fallback、黙った解釈・無視、暗黙 migration を行わない。
- unknown data は意味を推測して処理せず、意味を持たない拡張として安全に保持できない場合は reject する。
- Application は Store を opaque blob として扱い、内部を独自解釈・編集しない。unsupported version を v1 として読み替えない。
- reject / failure 時は existing committed state を変更せず、reject された Store を正常な秘密情報として扱わない。

v1 は Store / Profile version migration を提供しない。将来 migration が必要になった場合は、将来 version の Requirements → Design → Specification で source / target、明示的な開始、成功境界、失敗時の existing state 不変および秘密情報非開示を改めて設計する。端末間で opaque Store を転送することは、この schema / version migration 方針を変更しない。

### 5.3 committed state、pending / partial state および lifecycle

Core が Profile または Software Key の論理的な成功状態を最終確定するまで、pending / partial state は正常な committed Profile / Software Key ではない。replacement Store の persistent な committed state は Application の保存成功によって成立し、未保存 replacement は committed state ではない。pending / partial state の security responsibility、成功状態への昇格条件および stale state の拒否意味は Core が所有する。具体的な表現、保存場所および受渡し方式によらず、次を満たす。

- Application は Core が成功確定していない状態を committed Profile / Software Key と扱わない。
- Binding は pending / partial state の意味や authorization policy を独自に変更しない。
- stale / unconfirmed pending state を通常状態として採用せず、自動的に成功状態へ昇格させない。
- failure、interruption または restart によって secret ownership、Profile 間分離または authorization boundary を変更しない。
- Core は、成功・失敗・中断後に一時秘密情報を通常利用可能な状態、cache または診断として残さない。

主要な lifecycle は Profile 作成・復元、Derived / Imported / Generated Software Key 登録、署名、Profile password 変更、Software Key 削除、Profile 削除、初回 handoff および個別 export である。各 mutation は、成功時だけ対象の全体結果を committed state とし、失敗時には existing committed state を維持する。Application が current Store として扱う値の選択と履歴管理は Core の lifecycle には含めない。

## 6. 主要フロー、失敗、atomicity、再試行・再起動

### 6.1 初回 Mnemonic handoff

すべての新規 Mnemonic 生成では、次の順序と責任を成功境界とする。生成時の handoff を行わない Profile creation path は v1 で提供しない。既存 Mnemonic の restore はこの生成時 handoff の対象外であり、指定 Mnemonic、password、Store、duplicate 等の通常 restore 条件に従う。

1. Core が完全な Mnemonic を生成する。
2. Core がその完全な Mnemonic を意図された呼出し元 Application へ渡す。
3. Application が完全な Mnemonic を意図された利用者へ提示する。
4. 利用者が Mnemonic を受領したことを明示的に確認する。
5. Application が利用者の確認成立を Core へ伝える。
6. Core がその確認を受けた後だけ、Profile 作成を成功状態として最終確定する。

Application が利用者から確認を得て、その事実を Core へ伝えることが、この handoff の trust boundary である。Core は UI を提供せず、利用者が紙や外部媒体へ正しく記録したこと、または将来紛失しないことを独立検証しない。handoff confirmation の freshness は Application / UI が管理し、過去に保存した確認済み状態を新しい利用者意思として再利用しない。handoff 後に Core 外へ渡された Mnemonic の表示、保管および紛失防止は Application / 利用者の責任である。

Mnemonic を生成したこと、Core 内で一時保持したこと、Binding を通過したこと、Application が受け取ったこと、または Application が Core を呼び出したことだけでは Profile 作成成功にならない。確認前の状態は正常な Profile として扱わない。受領不能、提示不能、利用者の拒否・確認未成立、Application から Core への確認伝達不能、handoff 中断または Core の最終確定失敗では、新規 Profile または部分状態を成功状態として残さず、stale / unconfirmed state から通常 Profile へ自動昇格させず、Mnemonic を通常結果・失敗結果・診断へ漏らさない。

pending / partial state が存在する場合も、それは Core が管理する未確定状態であり、Application は committed Profile として扱わない。pending state の具体的形式や handoff の具体的な受渡し方式は下流へ委譲する。Application が確認済み assertion を保存して再利用しても、その freshness を Core が独立に証明する設計にはしない。

### 6.2 共通の secret-capable mutation

Profile 作成・復元、Derived / Imported / Generated Software Key 登録、Profile password 変更、Software Key 削除および Profile 削除は、次の責任分担で扱う。

1. Application が current Store、対象 Profile、Account / Software Key、Chain / Network および処理入力を選択・提示する。利用者意思の明示確認が要件となる処理では、Application が現在の operation に対する fresh な確認を成立させる。
2. Binding は入力を Core へ橋渡しするが、入力の意味、認証、authorization または処理可否を独自に補正しない。
3. Core が Store の version、構造、整合性、対象 Profile および Chain / Network compatibility を検証する。
4. Core が当該 operation の Profile password を認証する。
5. Core が必要な秘密情報を処理単位の範囲で利用し、導出、生成、検証、登録、変更または削除を行う。
6. Core が操作全体を成功状態として最終確定し、成功した公開結果または replacement Store を返す。削除 operation では、返す replacement Store 内から対象 Profile / Software Key とその対象秘密情報が削除済みであることを満たす。通常処理で秘密情報を返さない。
7. Application が replacement Store を保存し、保存成功を committed state として扱う。保存に失敗した場合は旧 Store を維持し、未保存 replacement を採用しない。

認証失敗、入力不正、unsupported / inconsistent data、Store 破損、Chain / Network mismatch、導出・生成・検証・削除・保存の失敗または中断時は、Profile、既存 Software Key、existing committed Store および秘密情報を変更・返却せず、部分適用や不完全な秘密情報を成功状態として残さない。操作は要求対象 Profile のみに作用し、他 Profile へ越境しない。

### 6.3 Signing authority と署名承認

署名では、Profile password authorization と利用者の署名承認を別の security property とする。

Application / UI は次を担う。

- 利用する Account を選択する。
- signing payload / Transaction 内容を利用者へ提示する。
- 利用者が内容を確認可能な状態を提供する。
- 利用者から、その signing request に対する明示的な署名承認を得る。
- 過去に保存した `Approved` assertion を新しい利用者意思として再利用せず、現在の signing request に対する approval assertion の freshness を管理する。
- 承認済みの signing request だけを Core へ送る。

Core は次を担う。

- 処理単位の Profile password authorization を行う。
- 指定 Account / Software Key と、その Chain / Network compatibility を確認する。
- 対応する秘密鍵を利用して signing primitive を実行する。
- 署名結果を返す。

Core は Transaction の意味解釈、内容の説明、確認 UI、利用者意思の推測または Transaction 構築を担わない。正しい Profile password であることだけでは、利用者がその signing request を承認したことにならない。Application / UI の明示承認と Core の password authorization の両方が、それぞれの責任境界で成立する必要がある。Core は Application が実際に提示・承認を取得したこと、または approval assertion が fresh であることを独立には証明しない。

### 6.4 Explicit secret export

Mnemonic または Software Key private key の export は通常処理から分離した、明示的な秘密情報アクセスである。Application / UI は次を担う。

- export 対象を利用者が認識できるようにする。
- 利用者がその秘密情報取得を明示的に要求したことを確認する。
- 過去に保存した `Confirmed` / `Requested` assertion を新しい利用者意思として再利用せず、現在の export operation に対する confirmation assertion の freshness を管理する。
- Application / UI が意思を確認した要求だけを Core へ送る。

Core は次を担う。

- 指定された Profile、または Profile と Software Key を処理対象として解決する。
- 当該 export operation の Profile password authorization を行う。
- 対象指定、password authorization および確認済み explicit request が成立した場合だけ、要求された対象秘密情報を返す。
- UI を提供せず、利用者意思を推測せず、通常処理から暗黙に export へ遷移せず、対象外秘密情報を返さない。

単なる API 呼出し、Application が password を保有していること、または通常処理が成功したことだけでは explicit export の成立条件を満たさない。Core は target、payload、AccountContext および渡された assertion を仕様どおり検証するが、Application が表示・確認を取得したことや assertion の freshness を独立には証明しない。誤認証、意思確認のない要求、対象不存在または処理失敗時は秘密情報を返さず、Profile / Store を変更しない。成功した export の後も Mnemonic / Software Key 原本の継続管理責任は Core に残る。Core 外へ渡されたコピーの表示、保存、利用、紛失防止は Application / 利用者側の責任である。

### 6.5 処理単位 authentication、retry および restart

次の secret-capable operation には、共通して Core による当該 operation 単位の Profile password authorization を適用する。

- signing
- derivation
- Imported Software Key の登録
- Generated Software Key の登録
- Profile password の変更
- Mnemonic / Software Key private key の個別 export
- Software Key の削除
- Profile の削除

authorization は当該 operation にだけ有効であり、次の operation へ持ち越さない。Core は継続 Unlocked state を持たず、Binding は unlock session / authorization cache を作らず、Application は Core の代わりとなる unlock session を保持しない。Application が以前の認証結果を次回 Core 操作の authorization として利用することもできない。restart 後に unlocked / authorized state を継続しない。

retry は、必要な Store、処理入力、現在の operation に対する fresh な利用者意思の確認および Profile password authorization を改めて提供して、新しい処理として開始する。前回の authentication result、pending state または秘密情報を、次の secret-capable operation の authorization として再利用しない。Core は自身の authorization state を暗黙継承せず、Application が確認・承認 assertion を再提出しただけで、その freshness を証明したものとは扱わない。v1 Core は challenge、nonce、expiry または one-shot token による freshness 機構を持たない。failure、interruption、retry および restart は、secret ownership、committed state または authorization boundary を変更しない。

## 7. Symbol / NEM、Mainnet / Testnet、Account、Core / Binding の境界

- Profile は Network（Mainnet / Testnet）を固定し、Chain（Symbol / NEM）には固定しない。
- Software Key は Chain（Symbol / NEM）に固定する。
- Account は Software Key を、その固定 Chain と Profile の固定 Network 上で利用する概念である。
- Application は利用 Account を選択し、利用者へ提示する。
- Core は supported Chain、supported Network、Profile の fixed Network と requested Network、Software Key の fixed Chain と requested Chain、および Account / Software Key / Chain / Network の整合を検証する。
- unsupported Chain / Network、不一致または不正な組合せは Core が fail-closed に reject する。reject 時は Profile、Software Key、existing committed Store および秘密情報を変更・返却しない。
- Core は reject 時に別 Chain / Network へ fallback せず、implicit conversion も行わない。Binding はこの意味判定を代替・補正しない。
- Symbol / NEM の Chain 固有の鍵、公開鍵、アドレス、署名、HD 導出および Network 処理は Core の責任範囲で扱うが、具体的な Chain identifier、Network identifier、byte 表現、derivation path および protocol contract は下流へ委譲する。
- Native / Web WASM Binding は同一 Core の Chain / Network policy、authorization および秘密情報公開範囲を共有する。

## 8. 運用前提、resource、検証方針

- Core は Store、Profile、Software Key、処理入力および秘密情報を外部入力として扱い、validity と compatibility を検証してから処理する。具体的な parser、validation contract、公開 error および resource limit は下流へ委譲する。
- Application / persistence layer は opaque Store の current Store authority として、保存先、atomic replacement、current-state selection、stale / historical Store の再適用防止、バックアップ、同期および端末間転送の availability を担う。ただし、その責任は Store schema / version migration の提供を意味しない。Core は valid historical Store の freshness または rollback を保証しない。
- v1 は Store / Profile version migration を提供しない。unsupported / unknown / corrupt / inconsistent data を別 version と推測せず、安全に扱えない場合は reject して existing committed state を維持する。
- Web では JavaScript、WASM runtime、Browser process の全 copy 消去を Core が保証しない。Native / Desktop / Mobile でも OS / host process の compromise 防止を保証しない。いずれも通常処理での秘密情報非開示責任を弱めない。
- Native / Web WASM の検証では、Core の同じ security invariant、責務、authorization、Chain / Network policy および公開範囲が保たれることを確認する。Binding 固有の変換、ownership、free および具体 ABI / WASM 契約は関連設計・仕様へ委譲する。
- Handoff、explicit export、signing approval、assertion freshness の Application responsibility、Store reject、処理単位 authentication、atomicity、retry / restart、valid historical Store rollback の保証外範囲および fail-closed の外部可視条件を、下流の仕様・実装・テストへ引き渡す。カバレッジだけを仕様適合性または security の単独証拠としない。

## 9. 採用した設計判断と代替案

### 9.1 単一 Rust Core と全環境共通 policy

- 判断: Desktop / Mobile / Web から同じ Rust Core を利用し、秘密情報処理、authorization、Chain / Network policy および signing primitive を Binding / Application へ複製しない。全環境で通常処理の秘密情報非開示原則を共通にする。
- 根拠: Concept / Requirements が、共通 Core、Core の継続的 secret ownership、Binding / Application の非代替性および環境差によらない責任境界を定めている。
- 代替案: 実行環境ごとに鍵管理や認証を実装する方式は、責任境界と外部可視動作を分散させるため採用しない。
- 影響: Host environment の compromise 防止は保証しないが、compromise を理由に Core / Binding の非開示責任を弱めない。Native と Web / WASM の経路差は transport の差に限定する。
- 見直し条件: v1 の対象環境、Core の責任または全環境共通 security property を変更する上位要求が承認された場合。

### 9.2 User intent と Core authorization の分離

- 判断: Handoff の受領確認、explicit export の取得要求、signing の明示承認およびそれらの assertion freshness は Application / UI と利用者の責任とし、Profile password authorization、secret use および成功状態の確定は Core の責任とする。password の正しさだけで user intent を成立させない。Core は Application が表示・確認・承認を実施したことや assertion の freshness を独立には証明しない。
- 根拠: Requirements の初回 handoff、SEC-021、SEC-022、AC-050 および処理単位 authentication の要求。
- 代替案: Core が UI / 利用者行動を推測・検証する方式、または Application が password を根拠に承認を代替する方式は、trust boundary と責任の逆流を生むため採用しない。
- 影響: Application は現在の operation に対して fresh な確認済み request のみを送信し、Core は target、payload、AccountContext および渡された assertion を仕様どおり検証したうえで security-sensitive operation を認可・実行する。具体 UI、callback、ACK および API は固定しない。v1 Core に challenge、nonce、expiry または one-shot token を追加しない。
- 見直し条件: 上位 Requirements が利用者確認、明示 export または署名承認の責任境界を変更した場合。

### 9.3 Store を opaque とし、current Store authority を Application に置く

- 判断: Core が入力 Store の version / validity と replacement の security responsibility を所有し、Application / persistence layer は opaque Store の current Store authority、replacement の適用、stale / historical Store の再適用防止および backup / snapshot の最新版管理を担う。v1 Core は明示的に対応する version だけを処理し、migration、fallback、推測による読み替えを行わない。Core は過去に返した Store を永続記憶せず、valid historical Store の freshness または rollback を単独で検出・拒否しない。
- 根拠: Requirements の v1 migration 非提供、unsupported / unknown / corrupt / inconsistent data reject、Application の current Store responsibility、SEC-005、AC-048 および existing state 不変の要求。
- 代替案: Core に monotonic counter、trusted persistent generation、rollback database、revocation list、external trusted anchor または server dependency を追加する方式は、stateless な Core 方針と v1 の責任境界を変更するため採用しない。Application が Store の内部を編集・読み替えする方式、または v1 が未知 version を暗黙 migration する方式も採用しない。
- 影響: Store の具体 wire / schema は下流へ委譲するが、reject、no fallback、no implicit migration、existing state preservation は下流が変更できない invariant とする。current-state selection と historical rollback prevention は Application / persistence layer へ引き継ぎ、Core の rollback detection を保証しない。将来 migration または rollback protection を提供する場合は、将来 version の Requirements → Design → Specification で再設計する。
- 見直し条件: 将来 version で migration を提供する上位要求が承認された場合。

### 9.4 committed state と fail-closed

- 判断: Core が Profile / Software Key の成功状態を最終確定し、Application はその成功を確認した状態だけを committed と扱う。pending / partial state は正常状態ではなく、failure、interruption、retry、restart で既存 committed state を変更しない。
- 根拠: Requirements の atomic / fail-closed、初回 handoff、Store replacement、秘密情報非開示および Profile 間分離の要求。
- 代替案: Application または Binding が途中状態を正常状態へ昇格させる方式は、失敗後の部分適用と security boundary の変更を許すため採用しない。
- 影響: replacement の具体的な保存・pending representation は下流へ委譲するが、成功境界、ownership、stale pending state の非採用および failure safety は一意になる。Store の current-state selection と valid historical Store rollback prevention は Application / persistence layer の責任であり、Core の rollback detection は保証外である。
- 見直し条件: committed state または pending state に関する上位 Requirements が変更された場合。

## 10. 未決定事項と仕様への引継ぎ

次の事項は、本書で責務、境界、lifecycle および invariant を決定したうえで、具体方式を下流へ引き継ぐ。本書は、下記の具体方式を新たに決定しない。

- 公開 API、DTO、error code、Native C ABI、WASM export、callback、ACK、ownership transfer および外部公開の詳細
- 初回 Mnemonic handoff の transport、確認伝達、提示方式および pending / partial state の具体形式・保存表現
- Explicit export と signing approval の具体 UI、要求表現、確認表現および受渡し方式
- Wallet Store / Profile の wire field、schema、version identifier の具体値、canonical encoding、未知値の表現および保存形式
- v1 の対応 version を表す具体的な形式、Store parser、validation、公開 error、resource limit、replacement の具体方式。v1 が migration を提供しない invariant、および Core が valid historical Store の freshness / rollback を保証しないことは本書で確定している。current Store の選択、replacement の適用、stale / historical Store の再適用防止および backup / snapshot の最新版管理の具体方式は Application / persistence layer へ委譲する
- Mnemonic、HD 導出、Symbol / NEM の鍵・署名・アドレス・Network に関する具体方式、protocol constant、derivation path および署名対象 byte 列
- KDF、AEAD、salt、nonce、tag、鍵長、署名方式および暗号パラメータ
- Native / Web WASM の具体的な ABI、JavaScript 境界、byte encoding、memory representation、buffer lifetime、copy、free、zeroize および runtime 制約
- timeout、expiry、retry count、pending state の再利用条件および個別のテストケース。Core の authorization / assertion state に challenge、nonce、expiry または one-shot token を追加する方式、ならびに Core の Store rollback detection は v1 では扱わない
- 対象 OS / Browser、package layout、build、distribution、保存先 API および UI の具体的な方式

上記の下流方式は、Core が最終確定する success boundary、per-operation authorization、全環境共通の秘密情報非開示、Account / Chain / Network compatibility、v1 reject policy、existing state preservation および Binding non-authority を変更してはならない。将来 migration だけは、将来 version の Requirements → Design → Specification で新たに設計する。

## 11. Traceability と参照資料

### 11.1 Requirements → Architecture traceability

| 設計領域 | Concept / Requirements の根拠 | Architecture の配置 |
| --- | --- | --- |
| 目的、対象環境、Core 継続管理、通常処理での非開示 | [`concept-sheet.md`](../consept/concept-sheet.md) §1、§3、§7〜§9、Requirements §1〜§2、NFR-001〜NFR-004、SEC-010、SEC-020 | §1、§3.1、§3.2、§4.1〜§4.5 |
| Profile / Mnemonic / Software Key / Account | Requirements §2.1、DR-001〜DR-005、FR-002、FR-008、FR-013、AC-002、AC-008、AC-013 | §2.2、§5.1、§7 |
| 初回 Mnemonic handoff の成功境界 | Requirements UC-001、FR-001、FR-019、SEC-010、SEC-017〜SEC-018、AC-001、AC-034 | §3.1、§4.3、§5.3、§6.1 |
| 処理単位 authentication と no unlock session | Requirements FR-007、UC-005、SEC-002、SEC-007、SEC-014、AC-007、AC-027、AC-031 | §3.2、§4.2、§6.2、§6.5 |
| Explicit secret export | Requirements UC-011、FR-022〜FR-023、SEC-010、SEC-021、AC-025〜AC-026、AC-041〜AC-043 | §3.1、§4.3、§5.1、§6.4 |
| Signing authority と user approval | Requirements FR-009、UC-006、SEC-022、AC-009 | §2.2、§3、§4.3、§5.1、§6.3 |
| Store validity、current Store authority、atomicity、v1 migration policy および historical rollback の保証外範囲 | Requirements FR-012、FR-017、DR-009、SEC-004、SEC-005、SEC-018、AC-018、AC-038、AC-045、AC-048 | §1、§3.3、§4.1、§4.3、§4.4、§5.2〜§5.3、§6.2、§8、§9.3〜§9.4 |
| Assertion freshness と Core の per-operation boundary | Requirements FR-009、FR-007、SEC-002、SEC-007、SEC-014、SEC-021、SEC-022、AC-007、AC-009、AC-031、AC-050 | §3.2〜§3.3、§4.3、§6.3〜§6.5、§9.2 |
| Account / Chain / Network compatibility | Requirements FR-013、FR-024、DR-005、AC-013、AC-019、AC-020、AC-047 | §2.2、§4.1、§5.1、§6.2、§7 |
| Failure、pending、retry、restart、Profile 間分離 | Requirements SEC-005、SEC-018〜SEC-019、AC-037〜AC-039、AC-046 | §5.3、§6.1〜§6.2、§6.5、§9.4 |
| Binding responsibility と環境共通境界 | Requirements §2.2〜§2.4、FR-019、NFR-001〜NFR-004、SEC-011〜SEC-012、AC-015〜AC-016、AC-023〜AC-024、AC-040、AC-043 | §3、§4.2〜§4.5、§8、§9.1 |
| Core secret processing の side-channel property | Requirements SEC-023、AC-049、§12.2〜§12.3 | §4.1、§8、§10 |

### 11.2 Source of Truth と下流参照の区分

| 区分 | 資料 | 本書での扱い |
| --- | --- | --- |
| 上流 normative source | [`docs/consept/concept-sheet.md`](../consept/concept-sheet.md)、[`docs/requirements/requirements.md`](../requirements/requirements.md) | Architecture の目的、責任、security property、成功境界および制約を導出する根拠 |
| 同一 Design の関連資料 | [`docs/design/security.md`](security.md)、[`docs/design/bindings.md`](bindings.md) | 責務・境界の整合確認先。Architecture の上流根拠ではない |
| 下流委譲先・整合確認先 | [`docs/specifications/specification.md`](../specifications/specification.md)、[`docs/specifications/wallet-store-format-v1.md`](../specifications/wallet-store-format-v1.md) | API、wire、crypto、parser、具体 validation、error、Store format 等を定める下流の正本。Architecture の responsibility / ownership / trust boundary を決める根拠にはしない |
| 履歴資料 | [`docs/reviews/`](../reviews/) | Concept / Requirements / Design の判定履歴。現行の normative source ではない |

本書の設計・設計判断の正本は `docs/design/` にある。上流の Concept / Requirements と本書の dependency を維持し、Specification が先に定めた形式や実装上の都合を理由に、本書の責務・ownership・trust boundary・security architecture を変更しない。
