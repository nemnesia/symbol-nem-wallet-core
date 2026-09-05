# Native C ABI / Node-API / WASM Binding 基本設計

## 1. 目的、対象、対象外

本書は、Rust Wallet Core を Desktop / React Native Android / React Native iOS / Web / Node.js の Application へ接続する Native C ABI、Node-API、Web / WASM および React Native Binding について、責務、依存方向、trust boundary、所有権および lifecycle の配置を定める。Web には Web Application と Browser Extension を含む。React Native は Mobile の具体的な v1 実行環境である。

Binding は、Core が所有する処理と各実行環境の間で、入力、出力、representation、ownership、lifecycle および error / warning を橋渡しする境界層である。Binding は Core の単一の security meaning、成功・失敗境界および authorization boundary を変更しない。

対象は Native C ABI、Node-API、Web / WASM および React Native Binding に共通する設計責任と、React Native の Android / iOS 接続方式、package 内 runtime 分離、native artifact、buffer、error および failure policy である。特定の crate、ABI、JavaScript 型、package exports JSON、storage API、Browser context または memory technique は本書で決定しない。

対象外は、Core の暗号、Mnemonic / Software Key の生成・導出・検証、Profile password authorization、署名 primitive、Store の内部解釈、Store の currentness / historical rollback の判定、UI / user intent の判定、Browser / OS / host の侵害防止および統合先 Application の architecture である。これらの責任を Binding に複製しない。

## 2. 上流根拠と用語

### 2.1 Source of Truth と依存方向

Bindings Design の normative upstream は次のとおりである。

- [`docs/consept/concept-sheet.md`](../consept/concept-sheet.md): 製品目的、v1 範囲、対象環境、Core の継続 ownership および通常処理での秘密情報非開示
- [`docs/requirements/requirements.md`](../requirements/requirements.md): Binding を含む責任、security property、processing-unit authentication、handoff、export、signing、Store、Chain / Network および受入条件

開発フェーズの関係は次のとおりである。

```text
Concept
  ↓
Requirements
  ↓
Architecture
  ↓
Security Design / Bindings Design
  ↓
Specification
  ↓
Implementation
```

`Architecture` は確定済み全体設計として、Binding の責務、依存方向、ownership、lifecycle および全環境共通 invariant を拘束する。`Security Design` は security responsibility、guarantee boundary、secret ownership、authorization および failure safety の同一 Design フェーズにおける整合基準である。Security Design と Bindings Design は相互に整合させるが、片方を他方の normative upstream としない。

[`docs/specifications/specification.md`](../specifications/specification.md) と [`docs/specifications/wallet-store-format-v1.md`](../specifications/wallet-store-format-v1.md) は、Bindings Design から委譲された API、ABI、DTO、wire、validation、error、保存およびその他の具体契約の下流正本である。Specification に既に記載された形式や既存実装の都合を理由に、Binding の responsibility、trust boundary、secret policy または security meaning を決めない。Implementation は下流の実現と検証を担う。

Concept / Requirements の review、Architecture / Security Design の review およびその他の review artifact は判断履歴であり、本書の normative source ではない。

### 2.2 用語

- **Binding**: Application と Rust Wallet Core の間で、値、representation、ownership、lifecycle、error および warning を橋渡しする境界層。Core の security authority ではない。React Native では TypeScript facade、private runtime entry、JSI/TurboModule adapter および Android / iOS native layer を含む。
- **Core-owned security meaning**: Core / Architecture / Security Design が定める authorization、user intent、success / failure、handoff、export、pending / committed、Store、compatibility および Profile / Software Key の状態の意味。
- **Mediation**: 外部環境から Core へ入力を渡し、Core の結果を同じ意味で外部環境へ返すこと。意味の生成、補正、推測または昇格は含まない。
- **Core 管理下の秘密情報**: Mnemonic、Software Key private key、derived / decrypted secret および Profile password に関係する秘密情報。継続的な owner は Core である。
- **Committed state / Pending state**: Core が成功を最終確定し、Application が必要な replacement を保存した正常状態と、それ以前の未確定・部分状態。Binding は両者の意味を変更しない。

## 3. システムコンテキストと trust / guarantee boundary

```text
             ┌──────────────────────────────────────────┐
             │ host environment                         │
             │ Application / Browser / OS / host process│
             │ （侵害防止を Core / Binding は保証しない）│
             └──────────────────────────────────────────┘
                              │
User / 利用者 ──表示・確認・承認──> Application / UI
                                      │
                    Native C ABI、Node-API、Web / WASM または React Native Binding
                                      │
                                      ▼
                              Rust Wallet Core

Core ──公開結果 / replacement / error / warning──> Binding ──> Application
Application ──opaque Store──> Binding ──> Core
Application ──承認済み要求──> Binding ──> Core
```

### 3.1 Binding non-authority

Binding は thin かつ non-authoritative な境界である。Core / Architecture / Security Design が確定した security meaning、success / failure boundary および authorization boundary を、Binding は生成、変更、補正または推測せず橋渡しする。次の正本および security authority は Core または上位 Application の責任であり、Binding は代替しない。

- Core 管理下の秘密情報の ownership、lifecycle、生成、導出、使用および破棄
- Profile password の processing-unit authorization
- user intent、signing approval、Mnemonic handoff の受領確認および export の明示要求。confirmation / approval assertion の freshness は Application / UI の責任であり、Binding は判断しない
- Profile / Software Key の success、failure、pending、partial、replacement および existing committed state の意味
- Store validity、Store / Profile version policy、migration および compatibility。current Store の選択、historical rollback prevention および保存先の freshness は Application / persistence layer の責任であり、Binding は判断しない
- Symbol / NEM、Mainnet / Testnet、Chain / Network の supported set と整合性

Binding は、Core の `result`、`error`、`warning`、`pending`、`replacement` および公開結果を、security meaning を変更せず Application へ伝達する。Binding を通過したこと、値を返せたことまたは Application が値を受け取れたことだけを成功条件に追加しない。

### 3.2 Native / Node.js / Web 共通の guarantee boundary

Native C ABI、Node-API、Desktop、Mobile、Web、WASM の方式差は、実行環境との representation、ownership および lifecycle の橋渡しに限定する。次の invariant は全経路で共通とし、Native C ABI または Node-API を Web / WASM より強い secret isolation boundary と扱わない。

- Mnemonic と Software Key の継続的な secret owner は Core である。
- Binding は authorization、user intent、signing approval または Core の security policy を持たない。
- 通常処理の結果として秘密情報を開示せず、Binding 自身が不要な copy、retention、cache、log または diagnostic を作らない。
- Core の per-operation authorization を維持し、Binding の session、cache または previous result に置き換えない。
- Core の fail-safe、existing committed state 保護、pending 非昇格および Store policy を変更しない。
- Binding は過去の Store を保持・比較して currentness または historical rollback を判定する authority を持たない。Core も過去に返した Store を永続記憶しないため、valid historical Store の rollback は v1 の Core / Binding guarantee 外である。
- Account、Chain、Network の compatibility を補正せず、fallback または implicit conversion を行わない。

Application compromise、Browser compromise、OS compromise、Node.js host process compromise および host process compromise の防止は、Core / Binding の guarantee 外である。この limitation は、不要な秘密情報の disclosure / retention、authorization の弱体化、Core の意味の変更または failure safety の弱体化を許可する根拠にならない。host の security architecture は統合先 Application の責任であり、Binding の guarantee に含めない。

## 4. コンポーネント責務と依存方向

### 4.1 Rust Wallet Core

Core は次を所有する。

- Profile、Mnemonic、Software Key、pending / partial state の security responsibility と lifecycle
- Profile password の processing-unit authorization、および認証結果を次の operation へ持ち越さない policy
- Mnemonic / Software Key の生成、復元、取込み、導出、暗号化保存、利用および破棄
- Account、Software Key、Chain、Network の compatibility と fail-closed な reject
- Store の version、validity、integrity、consistency、migration policy および replacement の意味。Core は stateless に入力 Store を処理し、過去 Store の currentness / rollback を記憶に基づいて判定しない
- Profile / Software Key が committed state になったことの最終確定
- signing authority、signing primitive、success / failure の意味および failure 時の existing state 保護

Core は UI、利用者への表示、利用者意思の推測、紙や外部媒体への記録の独立検証および Browser / OS policy を所有しない。

### 4.2 Binding

Binding は次だけを担う。

- Application と Core の間の representation、型、opaque data、ownership および lifecycle の mediation
- Core への入力と Core からの公開結果、error、warning、pending および replacement の transport
- Binding 自身の境界で検出できる入力・変換・ownership / lifecycle の失敗を安全側に終了させること
- Native C ABI / Node-API / Web WASM / React Native の経路差が Core の security meaning、secret policy、authorization または failure policy を変更しないことの維持

Binding は暗号、認証、Mnemonic validation、導出、署名、Store / Profile version の解釈、migration、重複判定、Chain / Network policy、Transaction の意味解釈および UI / permission の判定を複製しない。Node-API は C ABI を JavaScript FFI から呼び出さず、独立した security authority とならない。

### 4.3 Application / UI

Application / UI は次を担う。

- 利用者操作、公開情報の表示、Account の選択および内容の提示
- 初回 Mnemonic handoff における intended user への提示と明示的な受領確認。新規 Mnemonic 生成では全件で handoff confirmation を成立させる
- explicit export における target の提示、利用者の取得要求および確認済み要求の成立。現在の operation に対する fresh な confirmation を用い、過去に保存した assertion を新しい利用者意思として再利用しない
- signing における内容の提示、利用者の明示的な approval および approved request の作成。現在の operation に対する fresh な approval を用い、過去に保存した assertion を新しい利用者意思として再利用しない
- Core が返す opaque Store の current Store としての選択、保存、replacement、同期および端末間転送。stale / historical Store の再適用防止と最新版 snapshot の管理は Application / persistence layer の責任である
- explicit handoff / export により Core 外へ渡された secret copy の表示、保管、利用および紛失防止

Application は、Core 管理下の秘密情報の継続 owner、Core の signing authority または Profile password authorization の正本にならない。入力や明示的 handoff / export を一時的に仲介することは、継続 ownership の移転を意味しない。

### 4.4 依存方向

```text
Application / UI → Native C ABI、Node-API、Web / WASM または React Native Binding → Rust Wallet Core
```

Application と Binding は Core の security authority を代替しない。Core は UI、Browser、OS または host-specific policy に依存しない。Binding は、別の Binding、Application または下流の具体形式へ authority を逆流させない。

## 5. データ所有、秘密情報境界および lifecycle

### 5.1 所有と公開範囲

| 対象 | 継続的な責任主体 | Binding の扱い |
| --- | --- | --- |
| Mnemonic | Core | 初回 handoff または条件を満たす個別 export の一時 mediation 以外では通常結果として返さない |
| Software Key / private key | Core | 署名等の Core operation に使うが、通常結果として返さない |
| Profile password | Core が operation ごとの認証を判定 | Binding は認証結果を保存・cache・再利用しない |
| decrypted / derived secret | Core | 必要な処理範囲を越えて保持、診断出力または公開しない |
| Wallet Store | Core が入力 Store の validity、version および内部意味を管理 | Binding は opaque data として転送し、Application / persistence layer は current Store を選択・保存し replacement を適用する。Binding は Store history、freshness または rollback を判断しない |
| pending / partial / replacement | Core が状態の意味と成功境界を管理 | Binding は committed への昇格や成功判定を行わない |

通常処理では Mnemonic、private key、Profile password、decrypted secret または復元可能表現を Binding から返さない。成功した明示的 handoff / export の外部 copy は受領側の責任となるが、Core 内原本の継続 ownership は Core に残る。

Binding は継続的な secret owner にならず、persistent secret state を作らない。不要な secret copy、retention、cache、global state、log、diagnostic または保存を行わない。秘密情報の具体的な representation、copy 数、memory lifetime、破棄・zeroization 方法および runtime 上の保証は下流へ委譲するが、不要な文字列化・encoding 変換・永続保存を行わない security intent は維持する。

### 5.2 Store を opaque とする境界

Binding は Wallet Store / Profile data を opaque として mediation する。Binding は version interpretation、schema normalization、migration、fallback、guessed interpretation、unknown data の補正または内部編集を行わない。Application も Store の内部意味を代替しない。

v1 は Store / Profile version migration を提供しない。この policy、unsupported / unknown / corrupt / inconsistent data の reject、reject / failure の意味、replacement の意味および existing committed state の保護を Binding が変更しない。Application / persistence layer が current Store として選択する値、成功 replacement の適用、stale / historical Store の再適用防止および最新版 snapshot の管理は Application の責任である。Binding は Store history を保持・比較せず、未保存の replacement を committed state と扱わず、reject された data を正常な秘密情報として扱わない。

Store の version、validity、integrity、consistency、対応範囲および reject の最終判断は Core が所有する。具体的な Store / Pending Profile の representation、schema、parser、wire および error 契約は下流で定める。

## 6. 主要フローと意味の無変更 mediation

### 6.1 共通原則

Binding は次の意味を生成、変更、補正または推測しない。

- authorization、user intent および signing approval
- handoff success、export success、Profile success および Software Key success
- pending / partial と committed の区別、stale state の扱いおよび replacement の確定
- Store validity、Store version policy および migration policy
- Chain / Network compatibility

Binding は、Core の入力条件と Application の確認・承認条件を混同せず、Core が返した result / error / warning / pending / replacement / public result を同じ security meaning で伝える。Binding 通過、値の受領、変換の成功または返却の成功を、Core の成功境界へ置き換えない。

Binding は、Core contract に含まれる request の field、status、target、payload および AccountContext を欠落・書換えせずに伝達する。Binding は assertion の freshness を生成・補完・判定せず、conversion failure または受渡し不能を成功として扱わない。

### 6.2 Processing-unit authentication

Binding は次の認証状態を持たない。

- unlock session
- authorization cache
- previous authentication result の持越し
- restart 後の authorization state の復元
- Core authorization を代替する継続 secret-capable state

retry は新しい operation として Core へ橋渡しする。必要な入力、Profile password authorization および現在の operation に対する fresh な user confirmation / approval は、その operation のために上位責任主体が再取得しなければならない。Binding は過去に保存された `Approved`、`Confirmed` または `Requested` を新しい利用者意思として再利用せず、retry を再認証済み operation として扱わない。Core が assertion freshness を独立に証明しないこと、challenge、nonce、expiry または one-shot token を v1 Core に追加しないことを、Binding は変更しない。

### 6.3 Initial Mnemonic handoff

すべての新規 Mnemonic 生成における初回 handoff の success boundary は、次の6段階を変更せずに維持する。handoff を行わない新規生成経路は v1 で提供しない。既存 Mnemonic の restore は生成時 handoff confirmation の対象外であり、通常の restore 条件に従う。

1. Core が Mnemonic を生成する。
2. Core が intended Application へ渡す。
3. Application が intended user へ提示する。
4. User が明示的に受領確認する。
5. Application が確認成立を Core へ伝達する。
6. Core が Profile success を最終確定する。

Binding は、この順序と責任を shortcut しない。Binding を通過したこと、Binding が Mnemonic を返したことまたは Application が値を受け取ったことだけでは handoff success または Profile success ではない。Binding は user confirmation を生成・推測せず、confirmation assertion の freshness を保証せず、Profile success を独自確定せず、unconfirmed / stale pending を committed state へ昇格させない。

提示不能、受領未確認、確認伝達不能、中断または Core の最終確定失敗時は、Binding が新規 Profile、partial state または secret output を成功として作らない。具体的な受渡し、確認表現、pending representation および Core への伝達契約は下流へ委譲する。

### 6.4 Explicit export

Mnemonic または Software Key private key の export は通常処理から分離し、次の条件を別々に維持する。

- target
- user explicit request
- Application / UI confirmation
- confirmed request
- Core による per-operation Profile password authorization

Binding は password を所有していることだけで export success とせず、normal operation を export に変換せず、user intent または assertion freshness を推測せず、target を補正しない。confirmed request を生成・追加・削除・補正せず、Core が判定する条件と結果を意味変更なく橋渡しする。対象外の secret を生成・追加せず、認証・確認・対象検証または処理の failure を success に変換しない。

export failure 時は secret を返さず、Profile / Store の状態を成功状態へ変更しない。成功後も Core 内原本の owner は Core であり、Core 外 copy の保護・保存・利用責任は受領側にある。具体的な request、confirmation、transport および output representation は下流へ委譲する。

### 6.5 Signing

Application / UI は Account を選択し、signing content を提示し、現在の operation に対する fresh な user の明示的な signing approval を得て、過去に保存した `Approved` assertion を新しい利用者意思として再利用せず、approved request だけを Binding へ渡す。Binding は signing approval または assertion freshness を生成・判断・推測せず、Core password authorization を signing approval として扱わない。

Binding は Application の approved request の security meaning を変更せず Core へ渡し、Core の signing result、error および warning を意味変更せず返す。Core は per-operation authorization、Account / Software Key / Chain / Network compatibility および signing primitive を所有する。Binding は Transaction の意味説明、内容確認、UI、permission または signing authority を代替しない。

### 6.6 Pending、failure、retry および restart

Pending / partial state は committed state ではない。Binding は次を行わない。

- pending / partial を committed と解釈する
- stale pending または unconfirmed state を復活・昇格する
- failure、interruption または conversion error を success に変換する
- 未保存 replacement を committed と扱う
- previous authentication result または temporary secret を retry の authorization として利用する
- restart をまたいで authorization、unlocked state または secret-capable state を継続する

Binding は Core の failure、existing committed state の保護、Profile isolation、ownership および authorization boundary の意味を維持する。retry は入力、現在の operation に対する fresh な confirmation / approval および password authorization を再取得する新しい operation として Core へ渡す。Binding は Core の過去 authorization / pending state を再利用せず、Application assertion の freshness を独立に保証しない。pending の形式、timeout、再利用条件および memory lifetime は下流へ委譲する。Store の valid historical rollback prevention は Application / persistence layer の責任であり、Binding は rollback を判断しない。

## 7. Account、Chain / Network および環境差

Binding は Account、Chain / Network、Profile または Software Key の representation を bridge できるが、supported set、compatibility、mismatch および reject の判断主体ではない。Core が Symbol / NEM、Mainnet / Testnet、Profile Network、Software Key の固定 Chain および Account の対応を検証する。

Binding は次を行わない。

- Symbol と NEM を暗黙に共通化する
- Mainnet と Testnet を暗黙に共通化する
- mismatch を別の Chain / Network へ補正する
- unsupported な組合せを fallback する
- Chain / Network の implicit conversion を行う

Native C ABI、Node-API と Web / WASM の representation 差は、Core の compatibility、signing authority、secret ownership、authorization または failure meaning を変更しない。具体的な identifier、byte 表現、address、derivation、protocol および interop contract は下流へ委譲する。

## 8. Native boundary の安全側責任と guarantee limitation

### 8.1 Binding の正の Design intent

Binding が受け付ける外部入力境界では、Binding 自身が検証可能な範囲について、次を責任として持つ。

- 検証可能な malformed input を fail-safe に扱う
- representation conversion failure を fail-safe に扱う
- ownership / lifecycle conversion failure を fail-safe に扱う
- Binding 自身が検出可能な境界条件違反を fail-safe に扱う

この責任により、Binding は検証可能な不正入力を意味不明のまま Core へ渡さず、失敗を success に変換せず、Core の result / error / warning の meaning を置き換えない。失敗経路で secret output、secret retention、persistent secret state または partial state を増やさず、existing committed state を成功状態として壊さない。この intent は Native C ABI に固有の緩和ではなく、Native C ABI / Node-API / Web WASM / React Native の共通 security invariant と整合する。

### 8.2 Guarantee limitation

Binding は、次を保証する層ではない。

- 任意の無効な memory address を救済すること
- 呼出し側 process 全体の memory safety
- 任意の pointer dereference の安全性

これは、Binding が受け付け可能な境界入力について検証・変換・ownership failure を安全側に扱う責任を免除しない。pointer validity、NULL、length、alias、free、具体的な panic handling および FFI safety は下流の Specification / Implementation で定める。

## 9. 採用した設計判断と代替案

### 9.1 Thin / non-authoritative mediation

- **判断**: Binding は representation、ownership、lifecycle、error / warning および transport の mediation に限定し、Core の security meaning を変更しない。
- **根拠**: Concept / Requirements の Core 継続 ownership と全環境共通責任、および Architecture / Security Design の Binding non-authority。
- **代替案**: Binding ごとに認証、秘密情報管理、Store 解釈または signing approval を実装する方式は、環境ごとの authority と security architecture を分岐させるため採用しない。
- **影響**: Native C ABI / Node-API / Web WASM / React Native の具体方式が変わっても、Core ownership、per-operation authorization、non-disclosure、failure safety および compatibility policy を維持できる。
- **見直し条件**: Core と Binding の責任分担を変更する上位 Requirements または Architecture が承認された場合。

### 9.2 Native / Node.js / Web 共通の guarantee boundary

- **判断**: Native C ABI、Node-API と Web / WASM を同一の security invariant、host compromise limitation および non-authority boundary で扱う。Native C ABI または Node-API を Web より強い秘密隔離境界としない。
- **根拠**: Concept / Requirements の全環境共通原則、Architecture の全環境 trust boundary および Security Design の guarantee boundary。
- **代替案**: Web だけに host compromise limitation を置く方式は、Native / Mobile / Desktop の責任を曖昧にするため採用しない。
- **影響**: host compromise 防止は保証外のまま、全環境の通常処理 non-disclosure、non-retention、authorization および failure safety を維持する。Node.js host process の compromise に対する native-isolation guarantee は追加しない。
- **見直し条件**: 対象環境または上位 security responsibility が承認済み資料で変更された場合。

### 9.3 Store の opaque mediation、current Store authority および v1 no migration

- **判断**: Binding / Application は Store を opaque として渡し、Core の version、validity、reject、replacement および existing committed state の意味を変更しない。Application / persistence layer は current Store を選択・保存し、successful replacement を適用し、stale / historical Store の再適用を防止する。Binding は Store history、freshness または rollback を判断せず、Core も過去 Store を記憶しない。v1 は Store / Profile version migration を提供しない。
- **根拠**: Requirements の Store policy、SEC-005、AC-048、Architecture の Store boundary および Security Design の fail-closed / no migration invariant。
- **代替案**: Core に rollback counter、trusted persistent generation、rollback database、revocation list、external trusted anchor または server dependency を追加する方式、ならびに Binding / Application による schema normalization、fallback、独自解釈または暗黙 migration は、stateless Core、opaque boundary および attacker-controlled input に対する責任分界を変更するため採用しない。
- **影響**: Store の具体 wire / schema / parser が変わっても、opaque boundary、Core ownership、reject および既存状態保護を維持できる。valid historical Store の freshness / rollback は v1 Core / Binding の保証外であり、Application / persistence layer の current-state responsibility として下流へ引き継ぐ。
- **見直し条件**: migration を提供する上位 Requirements と、それに対応する Architecture / Security Design が承認された場合。

### 9.4 Design invariant と implementation technique の分離

- **判断**: 本書は Binding responsibility、trust / guarantee boundary、security meaning の無変更 mediation、secret non-retention、failure responsibility および downstream handoff を定める。具体的な実装・packaging・representation technique は定めない。
- **根拠**: Concept / Requirements の下流委譲、Architecture / Security Design の phase boundary および Binding の environment-independent invariant。
- **代替案**: 特定 crate、ABI、型、encoding、storage API または Browser context を基本設計に固定する方式は、責務を変えない実装選択肢を不必要に排除するため採用しない。
- **影響**: 下流が具体方式を選択しても、Core non-authority、secret ownership、全環境 invariant および failure meaning を変更できない。
- **見直し条件**: 上位資料が具体方式を要求し、かつその方式が Binding responsibility または guarantee boundary を変更する場合。

## 10. 未決定事項と下流への引継ぎ

### 10.1 Specification へ引き継ぐもの

- API、ABI、DTO、request / result / warning / pending / replacement の具体契約
- representation、ownership transfer、lifecycle、error mapping および malformed input の外部可視契約
- 初回 Mnemonic handoff の確認伝達、全新規生成への適用、restore の対象外化、explicit export の target / status / confirmation freshness、signing の approved request / approval freshness および Core result の具体契約
- Store / Profile version、対応範囲、reject、opaque data、wire / schema および既存状態保護の具体契約。current Store の選択・replacement 適用、stale / historical Store の再適用防止は Application / persistence layer の統合責任として扱う
- Account / Chain / Network compatibility と mismatch reject の具体契約
- pending / partial、failure、retry、restart および committed state の外部観測可能な契約

### 10.2 Implementation / release verification へ引き継ぐもの

- Native C ABI / Node-API / WASM の具体 bridge、crate、directory、package、build および distribution
- exact C ABI、struct、pointer、NULL / length、alias、free、ownership mechanics および panic handling
- exact JavaScript type、generated binding、raw / UTF-8 / hex / Base64 等の representation、encoding および buffer lifecycle
- secret copy、memory lifetime、allocator、zeroization、runtime、compiler、target および third-party dependency の検証
- parser、resource limit、SEC-023 に対応する side-channel、error path、test、fixture、interop および release verification。Binding は Core の side-channel responsibility を代替せず、third-party library、compiler、runtime、OS、browser、hardware および CPU microarchitecture の完全な side-channel absence を保証しない

### 10.3 Application / Browser Extension architecture へ引き継ぐもの

Browser Extension の page context、background context、extension context、process topology、sandbox、permission、storage architecture および Application state は、統合先 Application / Browser Extension architecture の責任である。これらを Binding の normative policy または guarantee としない。

WASM が JavaScript / Browser compromise の secret isolation boundary ではないこと、Binding が secret owner でなく不要な retention を行わないこと、host compromise 非保証が non-disclosure / failure safety を弱めないことは、本書の Binding invariant として維持する。

### 10.4 本書で決めない事項

特定の crate、directory、`wasm-bindgen`、`cdylib`、`staticlib`、exact C ABI、pointer / NULL / length、free contract、exact JavaScript type、`Uint8Array`、raw / UTF-8 表現、hex / Base64、package layout、generated package、Browser storage API、`localStorage`、`sessionStorage`、`IndexedDB`、具体的な zeroize API、panic implementation、process isolation または memory lifetime は、本書で固定しない。これらを変えても Binding の responsibility、trust boundary および security invariant が変わらない構成とする。

## 11. Traceability と参照資料

### 11.1 上流・同一 Design・下流の対応

| 設計領域 | Concept / Requirements | Architecture | Security Design | Binding での配置 |
| --- | --- | --- | --- | --- |
| Core 継続 ownership と通常非開示 | Concept §1、§3、§7〜§10、Requirements SEC-003、SEC-007、SEC-010〜SEC-012、SEC-015、SEC-017、SEC-020 | §3〜§5 | §3〜§5、§8 | §3.1、§3.2、§5.1 |
| Binding non-authority と依存方向 | Requirements NFR-001〜NFR-004、SEC-011、SEC-014 | §3、§4 | §3、§4 | §2.1、§3、§4 |
| Processing-unit authentication | Requirements FR-007、SEC-002、SEC-007、SEC-014 | §3.2、§4.1、§6.5 | §6.1 | §3.1、§6.2 |
| Initial Mnemonic handoff | Requirements FR-001、FR-019、SEC-010、SEC-017、AC-034 | §6.1 | §6.2 | §6.3 |
| Explicit export と assertion freshness | Requirements FR-022〜FR-023、SEC-021、AC-026、AC-041、AC-050 | §6.4〜§6.6 | §6.3、§6.6 | §3.1、§6.2、§6.4 |
| Signing approval と assertion freshness | Requirements FR-009、SEC-022、AC-009、AC-050 | §3、§6.3、§6.5 | §6.4、§6.6 | §6.5 |
| Store / version / current Store authority / no migration | Requirements FR-012、DR-009、SEC-004〜SEC-005、SEC-018、AC-012、AC-045、AC-048 | §3.3、§5.2、§6.2、§8、§9.3 | §3.2、§5.1、§6.5 | §3.1、§5.1〜§5.2、§6.6、§9.3 |
| Pending / failure / retry / restart | Requirements SEC-003、SEC-005、SEC-017〜SEC-019、AC-037〜AC-039、AC-046 | §5.3、§6.1〜§6.2、§6.5、§9.4 | §6.6 | §3.1、§6.1、§6.2、§6.6、§8.1 |
| Account / Chain / Network | Requirements FR-013、FR-024、DR-005、AC-013、AC-047 | §5.1、§7 | §7 | §3.1、§7 |
| Native / Node.js / Web 共通 guarantee boundary | Concept §7、§9、Requirements NFR-004、SEC-020 | §3.1、§4.4、§8 | §3、§8 | §3.2、§9.2 |
| Native / Node-API boundary safety intent | Requirements NFR-002〜NFR-003、SEC-012、SEC-018 | §4.2、§8 | §3、§10 | §4.2、§8 |
| React Native architecture、runtime resolution、artifact、buffer、error、sync resource evidence、support matrix および verification | Requirements FR-019、NFR-006〜NFR-015、AC-051〜AC-061、UF-RN-001、DR-RN-001〜DR-RN-004 | §12.1〜§12.15 | §12.1〜§12.15 | §12.1〜§12.17 |
| Core secret processing の side-channel property | Requirements SEC-023、AC-049、§12.2〜§12.3 | §4.1、§8、§10 | §8.1、§8.3、§10 | §8.1、§10.2 |

### 11.2 参照資料の役割

| 区分 | 資料 | 本書での扱い |
| --- | --- | --- |
| Normative upstream | [`docs/consept/concept-sheet.md`](../consept/concept-sheet.md)、[`docs/requirements/requirements.md`](../requirements/requirements.md) | 目的、範囲、責任、security property および受入条件の根拠 |
| 同一 Design の確定済み全体設計 | [`docs/design/architecture.md`](architecture.md) | responsibility、ownership、trust boundary、lifecycle、依存方向および共通 invariant の整合基準 |
| 同一 Design の security 整合基準 | [`docs/design/security.md`](security.md) | security responsibility、guarantee boundary、authorization、secret lifecycle、failure safety および invariant の整合基準 |
| 下流正本・引継ぎ先 | [`docs/specifications/specification.md`](../specifications/specification.md)、[`docs/specifications/wallet-store-format-v1.md`](../specifications/wallet-store-format-v1.md)、Implementation | API、ABI、DTO、wire、validation、error、parser、memory、具体実装および検証の根拠 |
| 履歴資料 | `docs/reviews/` | review の状態と判断履歴。本書の normative source ではない |

本書は、Architecture / Security Design と相互整合する Binding の責務・境界・invariant を統合する。下流の具体方式が本書の security meaning、ownership、authorization、failure safety または trust boundary を変更しないことを、Specification / Implementation へ引き継ぐ。

## 12. React Native Android / iOS Binding 設計

### 12.1 適用範囲と現行構成への接続

React Native 対応は、既存の単一 repository、単一 npm package および単一 Rust Wallet Core に追加する runtime-specific な Binding である。現行 repository の `crates/core`、`crates/c-abi`、`crates/node`、`crates/wasm` と `packages/wallet-core` の構造を前提にするが、RN 用の source directory、manifest、artifact filename、build script または package exports object を本書で確定しない。RN 専用 npm package、別の Core、別の暗号実装は作らない。

論理的な内部構成は次とする。

```text
@nemnesia/symbol-nem-wallet-core の public TypeScript facade
        │ 共通の operation / DTO / Uint8Array / error semantics
        ▼
private RN runtime entry / runtime resolver
        ▼
RN-private JSI / TurboModule adapter
        │ New Architecture では TurboModule registration / Codegen と整合
        ▼
Android / iOS の薄い native layer
        │ library loading / platform registration / lifetime mediation
        ▼
existing public C ABI contract
        │ RN からは非公開
        ▼
Rust Wallet Core
```

JSI は同期 invocation と binary transfer の内部 transport、TurboModule は RN の module lifecycle、registration および typed native boundary として扱う。TurboModule の公開 spec、JSI HostObject、Codegen 生成物、JNI、Swift / Objective-C++ の method、または C ABI の関数形式は下流へ委譲する。この設計は「JSI を直接公開する」ことも「RN Application が C ABI を直接呼ぶ」ことも意味しない。

### 12.2 Binding architecture の比較と推奨

| 候補 | 評価 | Design 判断 |
| --- | --- | --- |
| New Architecture / TurboModule を module boundary として使う | 型付き spec、Codegen、module lifecycle、RN の将来経路と整合する。単独では binary の同期・低 copy transport の詳細を解決しない | 採用。New Architecture の primary registration boundary とする |
| JSI を内部 invocation / binary substrate として使う | direct call と byte buffer の mediation に適し、既存 synchronous facade との整合を取りやすい。単独では module registration、typed contract、autolinking および lifecycle の責任が不足する | 採用。ただし private adapter の内部機構に限定する |
| Legacy Native Module / async bridge のみ | legacy compatibility は広いが、serialization、非同期制約および追加 copy が synchronous 16-operation facade と衝突し得る。将来の RN support も主軸にしにくい | primary には不採用。互換層を持つ場合も、同期契約を維持できる範囲に限る |
| Android JNI と iOS Swift / Objective-C++ の個別 binding | platform の native integration は必要だが、個別 Rust binding を持つと semantics、error、ownership の重複が生じる | 薄い platform layer として採用。business logic / cryptographic logic は持たせない |
| existing public C ABI contract を RN-private adapter から再利用 | Rust Core との既存責務境界、ABI error / ownership boundary および native mediation の考え方を再利用できる。JSI から C ABI までの mediation は必要 | 推奨。RN Application-facing API には露出させず、RN 専用 public C ABI は作らない |
| Rust から RN 専用 binding surface を別経路で追加 | C ABI の境界を避けられる可能性はあるが、Rust 側の変換、error、secret lifetime、テストおよび release 証跡を重複させる | 不採用。C ABI が要件を満たせない具体的証拠が出た場合だけ Design を再検討する |
| RN 専用 npm package | consumer の導入が単純になる可能性はあるが、single package、同一 facade および routing policy に反する | 不採用 |

従って、推奨案は「TurboModule / New Architecture を RN integration の registration boundary とし、JSI を内部の同期・binary mediation に使い、薄い Android / iOS layer の RN-private adapter から existing public C ABI contract を呼ぶ hybrid」である。ここで再利用するのは C ABI の contract / semantics と Core への既存境界であり、既存 C ABI の standalone release artifact を RN consumer に別途 install させることではない。RN package に同梱する target-specific native artifact は npm release chain が所有する RN integration artifact として扱い、既存 C ABI の public consumer 向け release identity と混同しない。C ABI はあくまで internal implementation detail であり、C ABI が Core の cryptographic semantics を決めたり、RN が C ABI を直接見ることはない。Binding 内に duplicate business logic、password policy、Store processor、signing policy または key management を追加しない。

既存 C ABI の contract / ownership / error semantics だけでは RN の buffer lifetime、registration または platform lifecycle を安全に表現できない具体的な不足が確認された場合に限り、RN-private adaptation の必要性を別途 Design decision として再評価する。単なる実装都合で新しい public C ABI surface、RN-only symbol または既存 public ABI の破壊的変更を追加しない。

React Native New Architecture の current direction は、公式資料上も JSI、Turbo Native Module および Codegen を中心にしている。したがって New Architecture を primary とするが、minimum RN major、legacy compatibility の期間および mandatory policy は product support policy として未決定である。具体的な integration API はその決定後に Specification へ委譲する。

### 12.3 Public API baseline と sync / async policy

現行 facade の 16 operation を RN の baseline とする。

```text
create_empty_store
prepare_generated_profile
finalize_generated_profile
restore_profile
list_profiles
export_mnemonic
export_private_key
list_software_keys
derive_software_key
import_software_key
generate_software_key
get_public_account
sign
change_profile_password
delete_software_key
delete_profile
```

RN でも同じ operation set、同じ TypeScript-facing DTO semantics、同じ `Uint8Array` を中心とする binary model、同じ Core error semantics および既存 synchronous call contract を compatibility baseline として扱う。RN 固有 API、backend selector、native handle、session object、Promise 版の別 API または秘密情報を容易に返す convenience API は追加しない。exact signature、DTO field、error code、exports および generated declaration は Specification へ委譲する。

現行の TypeScript public API の synchrony と、native / Rust Core が実際に処理する execution context は分離して設計する。public sync は、呼出し側がその call の return または throw を同期的に観測する contract を意味し、Rust Core が必ず JS runtime thread 上で直接実行されることを意味しない。RN adapter は admission、native invocation、Core completion、output validation および result delivery を一つの同期 call の責任範囲として扱う。worker / native thread へ処理を移す構成は許容候補になり得るが、同期 call が worker 完了まで blocking wait するだけなら JS responsiveness の問題を解消しないため、同じ evidence gate を通過しなければならない。

v1 の execution baseline は、bounded な operation / input / Store envelope、reasonable な worst-case execution、許容不能な JS runtime blocking を生じない responsiveness、native lifetime / failure cleanup の安全性および reentrancy 不在を確認できる範囲で、existing synchronous public contract を維持することである。operation は少なくとも次の概念クラスで評価する。

- **Lightweight**: metadata / validation 的処理、小さな deterministic transformation。
- **Potentially expensive**: password KDF、Wallet Store encrypt / decrypt、Mnemonic seed / derivation、key derivation、signing、大きな Store processing。これらを常に遅いと仮定せず、実測対象となる可能性がある class とする。

Specification を確定して RN Implementation / formal support claim へ進む前に、代表的な Android device、代表的な iOS device、production-equivalent native build（debug build だけではない）、代表的な Store / input size および合理的な worst-case input class を用いた prototype / benchmark / 実測 gate を設ける。Implementation 後および release evidence 作成時には同じ operation class と入力 envelope を再確認する。execution cost、JS runtime thread の blocking、responsiveness、memory / resource behavior、cancellation / interruption の実現可能性および成功・失敗・例外時の cleanup を評価し、exact device、threshold および measurement protocol は下流へ委譲する。

この evidence により対象 operation の同期実行が reasonable responsiveness、resource boundedness、safe lifetime / cleanup または必要な cancellation / interruption semantics を満たせない場合は、対象 operation と影響範囲を特定して `NEEDS USER DECISION` に戻す。選択肢は async public contract の採用または当該 RN support claim の除外であり、async 化は API design / compatibility change として記録する。user decision なしの Promise 化、async 化、sync / async の runtime-specific な黙った分岐または自動 async fallback は行わない。同期 baseline は「API parity のために危険な blocking を受容する」意味ではない。

同期 baseline は public cancellation contract を新設しない。admission 前の待機 request は secret-bearing payload を保持せずに破棄可能とし、Core invocation 後の処理を任意に thread kill しない。安全な cancellation semantics が必要で sync contract で成立しない場合も、async 化または support scope を `NEEDS USER DECISION` とする。

RN の native module / artifact 初期化が operation 実行前に必要な場合、その失敗は明示的な initialization failure とする。初期化の具体的な同期点、load API、prewarm、thread dispatch および lifecycle callback は下流へ委譲するが、consumer の通常 operation が暗黙に Node / WASM backend へ切り替わる設計は許可しない。

### 12.4 Single package と runtime-specific internal architecture

public package root は共通 facade を提供し、runtime-specific implementation は package 内部の論理 backend として分離する。

| Runtime | 通常の内部 backend | 通常経路で選ばない backend |
| --- | --- | --- |
| Node.js | 現行 Node native addon routing。target artifact が存在しない既存の許容ケースは現行 policy に従う | RN native layer、Browser-only module |
| Browser | 現行 package-local WASM routing | RN native layer、Node addon |
| Browser Extension | Browser と同じ WASM routing。Extension page / worker の統合責任は Application 側 | RN native layer、Node addon |
| React Native Android / iOS | RN private entry から対応する native artifact / adapter | Node addon、Browser / WASM backend |

consumer が通常利用時に backend を直接選択しないよう、resolver と entry は private にする。RN consumer が `process.platform`、Node-API addon、Node 用 `.node` artifact または Browser/WASM entry を通常経路で要求しないことを invariant とする。Browser consumer が RN native implementation を要求することも許可しない。package root は共通だが、internal backend の cross-runtime import や public subpath export を前提にしない。exact package exports JSON、条件名および bundler 設定は Specification へ委譲する。

### 12.5 Runtime resolution と mis-detection 防止

RN は一般的な `window`、`process`、`navigator` または user-agent heuristic で推測しない。package resolver が利用できる RN ecosystem の entry resolution / condition を第一候補とし、必要なら dedicated private RN entry へ分離する。build-time resolver が RN entry を選び、runtime native layer が実際の platform / architecture / module availability を確認するという二段階の分離を採る。

resolver が RN entry を選べない、RN native module が登録されていない、platform が Android / iOS 以外、artifact が対象外、または host が想定外の場合は、`Unsupported runtime/platform` または native initialization / load failure として明示的に失敗する。誤検出を WASM または Node addon の成功へ変換しない。Node / Browser / RN の resolver 条件が複数成立し得る曖昧な設計、backend implementation の public selector、silent fallback は採用しない。test-only の internal override は検証のためだけに存在できるが、public contract と release package へ露出させない。

### 12.6 Android integration

Android は package に同梱する、release で識別・検証可能な per-ABI Rust native library の集合を native layer が利用する論理構成とする。Application は C ABI、Rust symbol または artifact filename を直接扱わない。Android native layer は loader、RN registration、JSI / TurboModule adapter および buffer / error lifetime の mediation に限定し、Core semantics を持たない。

```text
RN TypeScript facade
  → private RN entry
  → Android JSI / TurboModule adapter
  → Android native loader / registration
  → internal Native C ABI
  → Rust Core
```

ABI は build / packaging で選択し、JavaScript が ABI を選択しない。missing artifact、load error、ABI mismatch、registration / initialization failure、invocation failure または invalid output は明示的に伝播させ、Browser/WASM、Node addon、別 ABI へ fallback しない。RN native artifact は source revision、package version、Android target / ABI、digest および release provenance evidence と結び付いた approved package input でなければならない。package / release assembly が target identity、package-approved artifact および integrity relationship を検証してから、Android loader が使用する。runtime の各 load で暗号学的 hash を再検証することは本 Design で要求しないが、loader は実行時の target / ABI と package-approved entry の不一致を成功として扱わない。入力は一つの bounded な native mediation を経て existing public C ABI contract / Core へ渡し、出力は呼出し結果の所有権を明確にした新しい JS `Uint8Array` として返す。exact JNI symbol、Gradle / CMake、API level、artifact filename、AAR layout、C ABI signature、pointer / free rule は下流へ委譲する。

Android の support matrix は arm64 device と x86_64 emulator を基本候補とし、armeabi-v7a は product requirement がない限り追加しない。minimum Android API level は RN と target application の互換性を合わせて別途決定する。

Android の module initialization は RN adapter が一意に管理し、初期化完了前の operation admission を許可しない。Application の background / foreground 遷移は Profile state、current Store、password authorization または secret の永続化・継続保持を発生させない。teardown、runtime invalidation または process termination が発生した場合、新規 admission を停止し、in-flight operation は完了して検証済みの結果を返すか、失敗して temporary、native resource および authorization-capable state を cleanup する。Core invocation を thread kill で強制中断したことを成功とみなさず、復帰後は lifecycle が有効な adapter と native artifact の初期化境界から再開する。Android lifecycle callback、keep-alive、再初期化の具体方式は下流へ委譲する。

### 12.7 iOS integration

iOS は package に同梱する、承認済み device / simulator slice を含む統合 native artifact を native layer が利用する論理構成とする。予測可能な load、link および application packaging のため、static linkage を第一候補とするが、exact archive / framework / XCFramework / pod / Swift Package boundary は下流へ委譲する。dynamic runtime download や JS による artifact 選択は行わない。

```text
RN TypeScript facade
  → private RN entry
  → iOS JSI / TurboModule adapter
  → ObjC++ / Swift registration / loader
  → internal Native C ABI
  → Rust Core
```

device / simulator の slice は native build が選択する。RN native artifact は source revision、package version、iOS target / slice、digest および release provenance evidence と結び付いた approved package input でなければならない。iOS は static / integrated artifact の link input、framework / archive composition、package assembly および release evidence の段階で approved artifact だけを受け入れる。static linkage では Android のような runtime load 前 hash verification を要求せず、link / build 時の source・target・slice・package identity の検証を trust point とする。missing slice、unsupported device / simulator、link / load failure、ABI mismatch、initialization failure または invalid output は native infrastructure error として明示的に失敗させ、WASM / Node addon へ fallback しない。static / dynamic の最終形式、Xcode build setting、podspec、artifact filename、method signature、buffer release は下流へ委譲する。

iOS の architecture 候補は arm64 device と arm64 simulator を基本とし、x86_64 simulator は product requirement がある場合だけ追加する。device / simulator の同一 artifact grouping を release evidence で検証できる構成にする。

iOS の module initialization、device / simulator artifact の利用可能性および adapter lifecycle は一意に管理し、初期化・link 確認前の operation admission を許可しない。Application の background / foreground 遷移、scene の切替または native teardown は secret、authorization、Profile state または current Store の継続 owner を生じさせない。teardown、runtime invalidation または process termination では新規 admission を停止し、in-flight operation の成功は Core completion、output validation および replacement の完全性が確認できた場合だけ delivery する。それ以外は失敗として temporary、native resource および authorization-capable state を cleanup し、復帰後に stale result や partial replacement を再利用しない。iOS lifecycle callback、scene integration、再初期化および link boundary の具体方式は下流へ委譲する。

### 12.8 Byte buffer boundary と ownership

既存 public contract の canonical binary model は JS `Uint8Array` とする。hex、Base64、UTF-8 string または JSON array を RN native boundary の暗黙変換形式にしない。

```text
JS Uint8Array（caller-owned input）
  → validated native view または bounded owned temporary
  → Rust C ABI byte slice / owned temporary
  → Core operation
  → native owned output
  → 新しい JS Uint8Array（caller-owned output）
```

入力は caller-owned のまま Core が保持する前提にせず、native layer は call 中だけ有効な view または必要最小限の owned temporary を用いる。Core へ渡す pointer / slice は呼出し中にだけ有効とし、JS object、proxy、detached buffer、length 不整合または変換不能値は Core invocation 前に拒否する。出力は native buffer の alias を外へ返さず、JS が所有する新しい値へ移す。入力を in-place mutation せず、output は caller が解放・GC する通常の JS value とし、native temporary は return / error / exception の全経路で release する。

copy count、zero-copy の可否、allocator、memory layout、pointer / length、release API、zeroization target および exact C ABI struct は Specification / Implementation へ委譲する。「zero-copy」または JS memory 上の secret が直ちに消えることを保証しない。ただし不要な string 化、immutable object の追加保持、global cache、native singleton または input / output alias は設計上作らない。

### 12.9 React Native secret memory flow

JS から秘密情報を一切通さない保証は既存 public API と矛盾するため採用しない。代わりに、JS、native adapter および Core の各責任範囲で copy と lifetime を限定する。

| 操作 / asset | JS / Application 境界 | native / C ABI 境界 | Core / 終了条件 |
| --- | --- | --- | --- |
| Profile password | 現行 operation の入力として一時的に存在し得る。object / string 化、global state、log を避ける | validated byte input を bounded temporary として一度 mediation し、operation 終了時・failure・exception・cancellation path で release / zeroize responsibility を果たす | 各 operation の authorization にだけ使い、継続 cache / unlock session を持たない |
| Mnemonic handoff | 新規生成の明示された初回 handoff だけ、Application が利用者に提示するための output copy が存在し得る | Core の output を一時 buffer として transport し、handoff 未確認なら success / committed として扱わない | handoff 完了前に Profile success を確定せず、Core 内原本を継続所有する |
| Mnemonic import | 利用者入力として一時的に存在し得る。通常結果へ再出力しない | input view / temporary から Core へ渡し、完了後に native retention を残さない | restore / import semantics、検証、保存および破棄を Core が所有する |
| private key import | 明示的な import input として一時的に存在し得る | bounded temporary から Core へ渡し、登録後に binding が private key を保持しない | Software Key の登録・保護を Core が所有し、通常結果で返さない |
| private key export | 明示的 target / user request / confirmation が成立した成功時だけ output copy が存在し得る | Core output を一時 native buffer から新しい JS `Uint8Array` へ移す | Core は target / authorization を判定し、失敗時は secret output を返さない。Core 外 copy の保管は Application / user の責任 |
| signing | payload と password input が一時的に存在し得る。private key は facade output にしない | request / password の mediation に限定し、private key の native retention を作らない | Core が authorization、compatibility、private key use および signature を所有する |
| Wallet Store blob | Application / persistence が current opaque bytes を所有する | Store は opaque byte buffer として渡し、binding が profile state や Store history を保持しない | Core が validity / integrity / replacement を判定し、Application が成功 replacement を current Store として適用する |

immutable DTO、proxy、detached / altered typed array および例外経路で追加の secret copy を残さないことを binding invariant とする。JS engine、GC、crash dump、OS swap、debugger または host compromise における全 copy 消去は保証外だが、保証外であることを不要な retention、log または診断出力の理由にしてはならない。

concurrency serialization のための待機列は、password、Mnemonic、private key、decrypted material または plaintext Store を queue item として長期保持する secret cache になってはならない。secret-bearing input は admission 後、実行直前に必要最小限だけ native materialize し、admission 前の待機 request は descriptor / cancellation state だけで表現して secret を所有しない。queued request の rejection、cancellation、exception、shutdown または initialization failure では、その一時値と native resource を cleanup し、diagnostic へ secret を出さない。JS の call frame に自然に存在する期間と、binding が ownership を取得する期間を混同しない。

### 12.10 Error model と fail-closed propagation

内部的には、少なくとも次の原因領域を区別できる構造とする。

| 原因領域 | 例 | Application-facing 方針 |
| --- | --- | --- |
| Core error | password authorization、Store validity、Chain / Network mismatch、Core operation reject | 既存 facade の Core error semantics を維持する |
| Binding conversion error | `Uint8Array` 形状、DTO、detached / altered buffer、output validation、ownership conversion | success に変換せず、secret / replacement を破棄して明示的に失敗する |
| Native initialization error | module registration、adapter initialization、required native state の確立失敗 | operation 前に明示的に失敗し、Node / WASM へ fallback しない |
| Native library load error | artifact missing、load failure、ABI / slice mismatch、integrity failure | infrastructure failure として明示し、別 runtime backend を選ばない |
| Unsupported runtime / platform | RN entry 以外の host、unsupported Android / iOS platform / architecture | fail clearly / fail closed。silent success を作らない |
| Internal binding failure | invocation exception、unexpected native result、release / allocation failure、reentrancy violation | Core error と混同せず、部分 output / replacement を commit しない |

Application が Core operation failure と RN infrastructure failure を識別できる分類を持つことを設計要求とする。exact class、error name、numeric code、message、cause chain および mapping は Specification へ委譲する。error、warning、diagnostic、native exception、load path または crash report に password、Mnemonic、private key、Store plaintext または signature input の秘密部分を含めない。

次の状態では RN native backend を唯一の通常経路として fail closed にする。

- resolver の mis-detection、RN module 未登録、unsupported runtime / platform
- package artifact、device / simulator slice または ABI の欠落・不整合
- native library load、integrity、initialization、registration の失敗
- Core invocation、buffer conversion、unexpected output、release または exception の失敗

これらを Browser / WASM、Node addon、別 architecture または stale native result へ fallback しない。Core が返した operation error と binding infrastructure error のどちらでも、未保存 replacement、partial Profile、secret output および既存 committed Store を success として扱わない。

### 12.11 Threading、concurrency および stateless Store processor

RN adapter を v1 の concurrency boundary / serialization authority とする。ここでの logical consumer context は、一つの RN JS runtime とその module registry に結び付いた adapter-owned admission domain とし、module instance が複数見える場合も同じ domain を bypass しない。RN runtime からの全 Core invocation は adapter の admission を通過し、同一の logical consumer context では read / mutation を区別せず v1 では一つずつ deterministic に実行する。Core または C ABI の global thread-safety、reentrant implementation または concurrent invocation capability を、RN integration の public contract として要求しない。Core は adapter が許可した一つの invocation に対して既存の stateless semantics を実行し、RN binding 自身が並列 Core call を許可しない。

admission 順序を execution 順序として扱い、現在の operation が Core completion、output validation、temporary release および result delivery を終えるまで次の operation を Core へ開始しない。callback 中の public facade 再入、JS callback、UI re-entry、同一 adapter への recursive invoke および shutdown 中の新規 invoke を禁止する。initialization は single-flight または同等の一意な lifecycle とし、未初期化状態で operation を開始しない。shutdown / invalidation は admission barrier として扱い、in-flight operation の cleanup / completion 後に module を無効化し、無効化済み adapter から新規 invoke しない。mutex、queue、executor、thread affinity、single-flight primitive および memory ordering は下流へ委譲する。

この serialization は Core thread-safety の代替であるが、password/session/key cache、unlocked state、decrypted secret、Profile state、mutable Wallet Core singleton または current Store cache を意味しない。queued request は前節の secret lifetime policy に従い、待機中の plaintext secret を保持しない。same logical consumer context の mutation は無秩序に並列実行せず、Application が current Store authority として成功 replacement を順序どおり適用する。Binding は Store を merge、retry、reorder、deduplicate または current Store として判断しない。

v1 では read-only / independent operation も最適化目的で並列化しない。将来の並列化は、Core の事実、secret overlap、ordering、reentrancy、lifetime および error semantics を再評価した明示的な Design / Specification change として扱う。failure、cancellation、exception、retry、restart の後に authorization または secret-capable state を継続しない。

### 12.12 Native artifact、supply-chain および packaging boundary

Android は approved ABI ごとの native library group、iOS は approved device / simulator slice を含む統合 artifact group を単一 package の release input とする。artifact は package-local で、runtime download や postinstall compile を通常経路にしない。RN artifact の trust chain は次で一意に定める。

```text
Git source revision
        ↓
controlled release build
        ↓
target-specific RN Android / iOS artifact
        ↓
target identity + package version + digest / provenance evidence
        ↓
approved npm package assembly
        ↓
published @nemnesia/symbol-nem-wallet-core package
```

trust authority は source revision と、それを基にした controlled CI / release build および release evidence である。Android の package / release assembly は target / ABI、package-approved artifact および digest / provenance relationship を検証してから loader の使用可能 input とし、iOS の package assembly / framework or archive composition / link input は target / slice と同じ関係を検証してから published package または native integration input とする。runtime は毎回 artifact の hash を再計算する責任を持たないが、target identity、package-approved entry または link / load の不一致を成功として扱わない。

existing public C ABI release artifact と RN package-internal artifact は別の release concept である。RN consumer は public C ABI artifact を別途 install せず、RN package の approved native artifact を利用する。RN artifact の release ownership は npm release / package assembly chain に属し、RN-only internal symbol を supported public C ABI として宣言しない。RN adapter は public C ABI contract の semantics、ownership および error boundary を変更しない。

artifact の取得、link / load、ABI / slice 選択および integrity 検証は native / packaging / release boundary の責任であり、JavaScript consumer の backend selector にしない。missing artifact、wrong target / ABI / slice、manifest mismatch、release evidence mismatch または unapproved artifact は fail closed とし、Node / WASM へ fallback しない。package layout、manifest field、digest format、archive / framework形式、Gradle / pod / build integration、autolinking および release workflow は Specification / Implementation / release verification へ委譲する。

### 12.13 Version、architecture、New Architecture および Expo の候補

以下は compatibility を伴う product policy の候補であり、本 Design では最終値を確定しない。現行 Node.js 22.x / 24.x policy と既存 Browser / native Node / WASM の保証は変更しない。

#### Minimum React Native version

| 項目 | 内容 |
| --- | --- |
| Option | A: 実装開始時点で選んだ stable RN major のみを minimum とする。B: legacy interop を含む古い major まで広げる。 |
| Rationale | A は JSI / TurboModule / Codegen と native artifact の検証対象を限定し、B は既存 consumer の移行余地を広げる。 |
| Compatibility impact | A は古い RN / legacy bridge consumer を対象外にし、B は resolver・registration・test matrix を増やす。 |
| Maintenance impact | A は support branch を抑え、B は New Architecture と legacy の二重 adapter を維持する。 |
| Recommendation | New Architecture / JSI の安定実装を利用できる stable major を基準に、少なくとも一つの明示的 support line とする。 exact major は release planning で決める。 |
| NEEDS USER DECISION | minimum major、support window、experimental / canary の扱い。 |

#### Minimum Android API level

| 項目 | 内容 |
| --- | --- |
| Option | A: target Application / RN template が採用する modern API floor。B: より古い Android API まで native artifact と loader を維持する。 |
| Rationale | A は ABI、loader、security patch、test matrix を絞り、B は device coverage を広げる。 |
| Compatibility impact | A は古い端末を対象外にし、B は build / runtime 検証と保守範囲を拡大する。 |
| Maintenance impact | A を推奨するが、具体 API number は RN と MosaicLynx の deployment policy に合わせる。 |
| Recommendation | current RN support floor と実利用端末の共通範囲を採用し、legacy compatibility を「念のため」に足さない。 |
| NEEDS USER DECISION | minimum Android API number。 |

#### Minimum iOS version

| 項目 | 内容 |
| --- | --- |
| Option | A: RN の stable support floor と target Application が採用する iOS floor の高い方。B: older iOS device まで維持する。 |
| Rationale | A は static artifact、JSI / TurboModule、simulator / device test を単純化し、B は device coverage を広げる。 |
| Compatibility impact | A は古い iOS を対象外にし、B は native API / packaging matrix を増やす。 |
| Maintenance impact | A を推奨するが、exact version は RN と MosaicLynx の policy に依存する。 |
| Recommendation | RN integration と target application が共通に検証できる modern floor。 |
| NEEDS USER DECISION | minimum iOS version。 |

#### Supported browser baseline

| 項目 | 内容 |
| --- | --- |
| Option | A: 既存の modern evergreen の current / previous major baseline を継続する。B: older browser / special embedded WebView を追加する。 |
| Rationale | A は既存 ESM / WASM / Browser Extension routing と整合し、B は WASM / storage / worker matrix を増やす。 |
| Compatibility impact | A は既存 baseline 外を対象外にし、B は Browser guarantee と release evidence を拡大する。 |
| Maintenance impact | A を推奨し、RN 対応を理由に Browser baseline を変更しない。 |
| Recommendation | 既存 package / specification が示す modern evergreen current / previous major、Extension は既存 MV3 policy を継続する。 |
| NEEDS USER DECISION | Requirements で未固定の product baseline を再確認するか、既存 baseline を正式 support policy として承認するか。 |

#### Android architecture matrix

| 項目 | 内容 |
| --- | --- |
| Option | A: `arm64-v8a` device + `x86_64` emulator。B: `armeabi-v7a`、`x86` 等も追加する。 |
| Rationale | A は現行の主要 device / emulator coverage と artifact count の均衡がよい。B は古い・非主要 target を追加する。 |
| Compatibility impact | A は 32-bit device / x86 emulator を対象外にし、B は対応端末を増やす。 |
| Maintenance impact | A を推奨し、B は build、test、release integrity evidence を ABI ごとに増やす。 |
| Recommendation | arm64-v8a と x86_64 を初期候補とし、armeabi-v7a は実利用要求がある場合のみ採用する。 |
| NEEDS USER DECISION | final Android ABI matrix。 |

#### iOS architecture matrix

| 項目 | 内容 |
| --- | --- |
| Option | A: arm64 device + arm64 simulator。B: x86_64 simulator も追加する。 |
| Rationale | A は現行 Apple Silicon 開発 / simulator と device の主要範囲を満たし、B は Intel Mac simulator 互換を加える。 |
| Compatibility impact | A は x86_64 simulator host を対象外にし、B は追加 slice / test を必要とする。 |
| Maintenance impact | A を推奨し、B は必要な consumer が明確な場合だけ追加する。 |
| Recommendation | arm64 device / arm64 simulator を初期候補とする。 |
| NEEDS USER DECISION | final iOS device / simulator matrix。 |

#### React Native New Architecture policy

| 項目 | 内容 |
| --- | --- |
| Option | A: New Architecture only。B: New Architecture primary + legacy compatibility adapter。C: legacy-compatible design を主軸にする。 |
| Rationale | A は将来方向と構造が最も単純、B は現行 consumer 移行を吸収、C は古い consumer を優先するが将来負債が大きい。RN 0.82 以降の公式方向は New Architecture only であり、legacy interop は移行用の位置付けである。 |
| Compatibility impact | A は legacy app を除外、B は両方を検証、C は future RN との整合を損なう可能性がある。 |
| Maintenance impact | A が最小、B は二重 registration / test matrix、C は legacy bridge を長期維持する。 |
| Recommendation | New Architecture primary。legacy は support decision があり、かつ 16 operation の synchronous contract を保てる場合のみ compatibility adapter として追加する。 |
| NEEDS USER DECISION | mandatory / optional、legacy support window。async 化は §12.3 / DDR-RN-004 の条件付き future decision として別管理する。 |

#### Expo compatibility

| 項目 | 内容 |
| --- | --- |
| Option | A: bare RN と Expo development build / prebuild で native project を生成した範囲。B: Expo Go も含む。 |
| Rationale | Wallet Core は custom native code / artifact を必要とする。Expo Go は固定 native library のため、任意の native module を後から追加する経路ではない。development build は custom native code を含められる。 |
| Compatibility impact | A は Expo Go を対象外とするが、native artifact を load できる。B は Expo Go の固定 runtime と矛盾し、RN native backend の保証を崩す。 |
| Maintenance impact | A は config plugin / prebuild / native project の version matrix を管理し、B は実現不能または別の non-native fallback を要求する。 |
| Recommendation | bare RN、または development build / prebuild 後の native project を formal support 候補とする。Expo Go では RN Wallet Core を formal support しない。 |
| NEEDS USER DECISION | Expo development build / prebuild の正式 support、config plugin の提供責任、Expo Go を明示的対象外にするか。 |

### 12.14 Security threat surface と対策の配置

RN 追加で増える threat surface は、JS/native boundary、malformed / detached / altered typed array、unexpected object / proxy、C ABI pointer / length、native library substitution、ABI / slice mismatch、package resolver mis-detection、error object leakage、secret copy lifetime、crash dump、JSI reentrancy、native initialization race および concurrent Store mutation である。

設計上の主な対策は次とする。

- typed array、length、detached state、DTO および output を binding boundary で検証し、変換不能時は Core invocation / commit 前に fail closed する。
- C ABI、JSI、TurboModule、JNI および Swift / Objective-C++ を security authority とせず、Core に任せる validation / authorization を複製しない。
- artifact allowlist / integrity / provenance、ABI / slice check および resolver の明示的 environment check を行い、load failure を WASM / Node へ隠さない。既存 release / supply-chain invariant は維持する。
- native adapter、JS object、error、warning、log、diagnostic、crash-facing message に secret を含めず、operation-local temporary 以外の cache / singleton を作らない。
- JS callback、reentrancy、初期化 race、部分 output、stale replacement および same-Store mutation を成功境界に混ぜない。
- host、GC、crash dump、OS、debugger および compromised Application の完全な秘密隔離は保証外と明示する。ただし通常処理の non-disclosure、不要 retention、per-operation authorization および failure safety は維持する。

既存 Node native / Browser WASM の lessons（package-local routing、declared artifact failure の非 fallback、malformed input reject、Core の単一 authority、host compromise limitation）を RN に再利用する。RN だけに弱い fallback、秘密情報の追加 export または security exception を設けない。

### 12.15 Testability / verification design

Implementation / CI の具体 command は固定せず、次の検証面を将来の Specification / Implementation / release verification が直接テストできる構造にする。

- Android RN consumer と iOS RN consumer が同じ 16 operation、DTO、binary、warning / error semantics を観測できること。
- Node / Browser / Browser Extension との API parity、error parity、Chain / Network reject、Store failure、既存 routing の non-regression。
- arm64-v8a / x86_64 Android、arm64 device / simulator iOS の各 artifact と、選択された追加 matrix の load / invoke / release 検証。
- missing artifact、load failure、ABI / slice mismatch、initialization failure、unsupported platform / architecture、invocation failure、invalid output が明示的に失敗し、WASM / Node へ fallback しないこと。
- malformed、truncated、invalid-length、detached / altered `Uint8Array`、unexpected object / proxy、wrong DTO が secret operation / Store commit 前に reject されること。
- password、Mnemonic、private key、Store blob の failure / exception / cancellation / retry / restart で、binding cache、log、diagnostic、partial output、authorization carry-over が発生しないことを観測可能な範囲で確認すること。JS GC / crash dump 全体の消去は guarantee 外として別記すること。
- repeated invocation、concurrent invocation、same-Store mutation ordering、reentrancy、initialization race および process restart 後の statelessness。
- package artifact の integrity / provenance、consumer が Node addon / WASM backend を RN で要求しないこと、および unsupported environment が fail clearly すること。
- Potentially expensive operation について、代表的な Android / iOS device、production-equivalent native build、代表的な Store / input size および合理的な worst-case input class で execution cost、JS blocking、responsiveness、resource bound、cancellation / interruption および failure cleanup を測定できること。worker へ移した後の同期 wait も別の実行方式として評価し、debug build だけを根拠にしないこと。
- synchronous baseline が安全に成立しない evidence が出た場合、対象 operation と影響範囲、compatibility impact、async contract または support exclusion の候補を記録し、user decision 前に public semantics を変更しないこと。

### 12.16 React Native Design Decision Records

#### DDR-RN-001: RN binding architecture

- **Decision**: New Architecture / TurboModule を registration boundary、JSI を内部の同期・binary substrate、Android / iOS native layer を薄い platform mediation、C ABI を Rust Core への internal boundary とする。
- **Alternatives considered**: legacy bridge only、pure JSI public surface、platform ごとの Rust binding、RN 専用 package。
- **Rationale**: 同一 Core、既存 synchronous facade、binary transfer、New Architecture の将来方向、共通性および maintenance cost の均衡を取る。
- **Security implications**: RN adapter は authorization、暗号、Store semantics、secret ownership を持たず、JS/native boundary を fail-closed にする。
- **Compatibility implications**: New Architecture を primary とし、legacy は別途選択された場合だけ compatibility adapter を持つ。exact minimum RN は未決定。
- **Deferred details**: TurboModule spec、Codegen、JSI object、JNI / ObjC++ method、thread dispatch、build integration、test command。

#### DDR-RN-002: C ABI boundary

- **Decision**: RN-private adapter は existing public C ABI contract を内部境界として再利用する。RN TypeScript / Application は C ABI を直接見ない。RN package の target-specific artifact は npm release chain が所有する内部 integration artifact とし、既存 C ABI の standalone public release artifact と同一視しない。既存 C ABI の semantics、ownership、error、release identity は変更しない。
- **Alternatives considered**: Rust から RN 専用 public binding surface を新設、Application が C ABI を FFI 呼出し、C ABI contract を満たせない根拠なしに adapted public C ABI を追加。
- **Rationale**: Core の semantics、error、ownership、security boundary および既存 C ABI consumer との互換性の重複を避け、RN-specific transport / lifecycle を private adapter に閉じ込める。
- **Security implications**: C ABI / RN adapter は cryptographic semantics、authorization、Store processing、secret ownership を変更せず、duplicate business logic、secret cache、authorization shortcut を追加しない。
- **Compatibility implications**: RN consumer は public C ABI artifact を別途 install しない。RN artifact は同じ Core source / C ABI contract に bind された npm asset だが、RN-only internal symbol は supported public C ABI ではない。
- **Deferred details**: C ABI contract の適用範囲、必要な RN-private transport adaptation、ABI versioning、struct、pointer / free、artifact build / load。existing contract で安全に表現できない具体的不足が見つかった場合だけ、別 Design decision とする。

#### DDR-RN-003: package runtime separation

- **Decision**: public package root と共通 facade を維持し、Node / Browser / Extension / RN backend と private entry / resolver を内部分離する。
- **Alternatives considered**: RN 専用 package、consumer に backend selector を公開、単一 universal backend、platform heuristic。
- **Rationale**: single package、API parity、cross-runtime non-regression、accidental backend loading 防止。
- **Security implications**: RN が Node addon / WASM に fallback せず、Browser が native artifact を要求しないため、misrouting と artifact confusion を減らす。
- **Compatibility implications**: Node の既存 routing、Browser / Extension の WASM routing および Node 22.x / 24.x policy を変更しない。
- **Deferred details**: exact exports condition、entry filename、bundler / Metro integration、artifact manifest。

#### DDR-RN-004: synchronous public contract baseline

- **Decision**: existing 16 operation の synchronous TypeScript facade を RN の compatibility baseline とする。bounded operation / input、reasonable worst-case execution、許容不能でない JS responsiveness、safe lifetime / cleanup および reentrancy 不在を evidence で確認できる範囲で維持し、async 化、Promise variant または automatic fallback は導入しない。
- **Alternatives considered**: all async RN API、operation ごとの hybrid API、native worker + blocking wait、native worker + Promise。
- **Rationale**: public API preservation、DTO / error / binary parity を baseline としつつ、API parity を理由に危険な JS blocking、resource exhaustion、unsafe lifetime または不可能な cancellation semantics を受容しないため。
- **Security implications**: operation-local ownership、failure cleanup、per-call authorization、queue 上の secret non-retention および no reentrancy を一つの admission / invocation 境界で扱う。worker + synchronous wait は responsiveness の解決とみなさない。
- **Compatibility implications**: prototype / benchmark / measurement evidence が対象 operation の synchronous contract を安全に成立させられないことを示した場合、対象と影響範囲を明示し、async public contract または RN support exclusion の採否を `NEEDS USER DECISION` とする。user decision 前に RN だけ Promise 化しない。
- **Deferred details**: operation envelope、measurement protocol / threshold、initialization timing、thread dispatch、worker、timeout / cancellation、exception translation。

#### DDR-RN-005: secret buffer ownership

- **Decision**: input は caller-owned `Uint8Array` から operation-local native temporary / view を経て Core へ渡し、output は新しい JS `Uint8Array` とする。native buffer、Core secret、Core 外 output copy の ownership を分離する。
- **Alternatives considered**: string / Base64 transport、shared mutable alias、global native cache、JS から secret を完全排除する主張。
- **Rationale**: 既存 binary contract、不要 copy の削減、lifetime の限定および現実的な host guarantee。
- **Security implications**: private key は Core 内に留め、handoff / export だけ明示 output。failure / exception / cancellation で temporary を cleanup する。
- **Compatibility implications**: JS consumer の binary semantics を変更せず、JS engine による copy retention は guarantee 外として明示する。
- **Deferred details**: exact copy count、zero-copy opportunity、allocator、zeroization、pointer / free、detached buffer handling。

#### DDR-RN-006: fail-closed backend behavior

- **Decision**: RN backend の resolver、artifact、load、ABI、initialization、invocation、output または platform failure は明示的に伝播し、Node / WASM へ fallback しない。
- **Alternatives considered**: universal WASM fallback、Node addon fallback、best-effort platform choice、stale last-known backend。
- **Rationale**: NFR-010、NFR-014、runtime mis-detection 防止および security semantics の一貫性。
- **Security implications**: unavailable native path が weaker / unintended backend へ切り替わらず、invalid output / partial replacement を commit しない。
- **Compatibility implications**: RN native artifact を package / native project に正しく含める責任が必要。unsupported environment は対象外として観測可能に失敗する。
- **Deferred details**: error mapping、artifact integrity format、initialization retry policy、message / code。

#### DDR-RN-007: Android artifact model

- **Decision**: package-local per-approved-ABI Rust native artifact group を Android native layer が loader / registration する。
- **Alternatives considered**: runtime download、single universal binary、JavaScript FFI、Application-managed external artifact。
- **Rationale**: offline determinism、release evidence、ABI-specific loading、C ABI reuse および supply-chain boundary。
- **Security implications**: artifact allowlist / integrity / provenance と mismatch fail-closed を適用し、runtime substitution を黙って受け入れない。
- **Compatibility implications**: arm64-v8a + x86_64 を推奨候補とし、armeabi-v7a は user decision。API level も user decision。
- **Deferred details**: AAR / jni layout、Gradle / CMake、filename、ABI list、API level、loader method。

#### DDR-RN-008: iOS artifact model

- **Decision**: package-local grouped native artifact with approved device / simulator slices を static linkage first で利用する。
- **Alternatives considered**: dynamic download、device-only archive、Application-built Rust artifact、JS/WASM fallback。
- **Rationale**: link / load の予測可能性、device / simulator parity、単一 package、release provenance。
- **Security implications**: missing slice / link / load / integrity failure を fail-closed にし、未知 artifact を runtime 取得しない。
- **Compatibility implications**: arm64 device + arm64 simulator を推奨候補とし、x86_64 simulator は user decision。minimum iOS も user decision。
- **Deferred details**: XCFramework / static archive / pod boundary、Xcode setting、artifact filename、slice verification、link flags。

#### DDR-RN-009: RN adapter concurrency authority

- **Decision**: RN adapter を v1 の Core invocation admission、serialization、ordering、reentrancy および initialization / shutdown lifecycle の authority とする。同一 logical consumer context の read / mutation を v1 では adapter 内で一つずつ処理し、Core / C ABI の concurrent thread-safety を RN integration contract にしない。
- **Alternatives considered**: Core / C ABI の thread-safety を public integration にする、mutation だけを条件付きで serialize して read を無秩序に並列化する、Application ごとに任意の ordering を任せる。
- **Rationale**: RN runtime lifecycle と Core invocation を分離し、Store mutation ordering、secret overlap、reentrancy、initialization race および shutdown safety を一意に制御する。
- **Security implications**: serialization は secret/session/key cache ではなく、queued secret を保持しない admission policy と組み合わせる。callback re-entry、partial result、authorization carry-over を許可しない。
- **Compatibility implications**: v1 は read-only を含めて並列最適化を行わず、public synchronous contract と同じ admission / completion 順序を保つ。将来の緩和は明示的な設計変更が必要である。
- **Deferred details**: queue / mutex / executor、thread affinity、single-flight 実装、cancellation、shutdown barrier および memory ordering。

#### DDR-RN-010: RN artifact trust chain

- **Decision**: RN Android / iOS artifact は `Git source revision → controlled release build → target-specific artifact → target identity + digest / provenance evidence → approved npm assembly → published package` の chain に bind する。package / release assembly が approved artifact を検証した後だけ native load / link input とし、unapproved / mismatched artifact は fail closed にする。
- **Alternatives considered**: local artifact の自己申告、runtime download、runtime ごとの毎回 hash verification を唯一の根拠にする、RN artifact を既存 C ABI artifact と同じ standalone release asset とみなす。
- **Rationale**: source、version、platform、architecture / slice、artifact bytes、package inclusion および release evidence を追跡可能にし、既存 Node / WASM の supply-chain assurance を RN package に接続する。
- **Security implications**: missing、wrong target / ABI / slice、digest / provenance / package manifest mismatch および unapproved artifact は Node / WASM fallback なしで失敗する。runtime hash verification の追加を本 Design で要求せず、verification responsibility を assembly / link / load boundary に分ける。
- **Compatibility implications**: RN consumer は published package の approved native artifact と対応 native project を利用する。既存 public C ABI release artifact、Node routing、Browser / WASM routing および release workflow の semantics は変更しない。
- **Deferred details**: artifact filename、digest / manifest schema、attestation format、Android package / loader、iOS framework / archive composition、CI / release workflow および exact verification predicate。

### 12.17 Specification / Implementation boundary

本 section で確定したのは、RN の責務構造、共通 facade、runtime 分離、C ABI の内部再利用、sync policy、secret / buffer ownership の invariant、error category、fail-closed、thread / Store 境界および候補 support policy である。次の事項は Specification / Implementation / release verification に委譲する。

- exact public TypeScript declaration、operation parameter / result、error name / numeric code、package exports JSON、resolver condition、private entry filename
- TurboModule spec、Codegen schema、JSI object / HostObject、legacy adapter の method、JNI / Swift / Objective-C++ signature、callback / exception ABI
- exact C ABI signature、struct / pointer / length、allocator、free、zeroization、copy count、memory layout、thread primitive、reentrancy guard
- Android API level、Gradle / CMake / AAR / per-ABI filename、iOS version、podspec / XCFramework / archive / slice、Metro / autolinking / prebuild integration
- artifact digest / manifest / provenance format、build command、test command、CI job、release workflow および publish evidence
- exact malformed input detection、output validation、initialization retry、timeout、cancellation、error message および fixture

sync baseline を維持できるかを判断する exact operation envelope、benchmark device、production-equivalent build definition、measurement threshold、resource budget および evidence format も下流へ委譲する。ただし、unsafe evidence が出た場合に async 化を自動採用せず `NEEDS USER DECISION` とする責任境界は本書で確定する。

#### Design Review follow-up traceability

次表は canonical Design における correction の所在を示すものであり、既存 review artifact の finding status を変更するものではない。正式な `Resolved` 判定は、更新後の Design に対する次の Design Review で行う。

| Finding | Canonical Design における解消内容 | 主な位置 |
| --- | --- | --- |
| UF-RN-001 | Requirements `NFR-008`、`NFR-015` および `AC-061` を、operation 分類、実行コンテキスト、blocking / resource evidence、failure cleanup および async 化の future decision gate へ接続する | `bindings.md` §12.3、§12.9、§12.17; `architecture.md` §12.3; `security.md` §12.5 |
| DR-RN-001 | public synchrony と Core の execution context を分離し、adapter-owned admission、worker + blocking wait の扱い、bounded baseline、benchmark gate、cancellation / interruption および automatic async fallback 禁止を一意に定める | `bindings.md` §12.3、§12.11、DDR-RN-004 |
| DR-RN-002 | RN adapter を v1 の concurrency / serialization / ordering / reentrancy / initialization / shutdown authority とし、Core / C ABI の thread-safety を RN integration contract にしない | `bindings.md` §12.11、DDR-RN-009; `security.md` §12.5 |
| DR-RN-003 | RN-private adapter が existing public C ABI contract を内部再利用し、RN Application には公開せず、RN artifact の release ownership を npm package assembly chain に置く。RN-specific public C ABI は追加しない | `bindings.md` §12.1、§12.2、§12.12、DDR-RN-002 |
| DR-RN-004 | RN artifact を source revision から controlled build、target、digest / provenance、approved npm assembly、published package まで bind し、Android は package / release assembly、iOS は package / link / composition を verification point とする | `bindings.md` §12.6、§12.7、§12.12、DDR-RN-010; `security.md` §12.4 |

## 13. React Native 技術資料の参照位置

次の公式資料は、New Architecture、JSI、TurboModule、Codegen および Expo の技術的 feasibility を確認するための参考資料であり、minimum version、support scope、public API または release policy の normative source ではない。

- [React Native New Architecture](https://reactnative.dev/architecture/landing-page)
- [Turbo Native Modules](https://reactnative.dev/docs/turbo-native-modules-introduction)
- [React Native Codegen](https://reactnative.dev/docs/the-new-architecture/what-is-codegen)
- [Pure C++ Turbo Native Modules](https://reactnative.dev/docs/the-new-architecture/pure-cxx-modules)
- [React Native 0.82 New Architecture](https://reactnative.dev/blog/2025/10/08/react-native-0.82)
- [Expo: customizing development builds](https://docs.expo.dev/workflow/customizing/)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)

これらの資料で示される ecosystem の方向性は、上記の「New Architecture primary」「Expo Go を native artifact の正式 support 候補から外す」推奨理由としてのみ利用する。product policy の最終決定は `NEEDS USER DECISION` に残す。
