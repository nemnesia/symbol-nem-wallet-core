# Native / WASM Binding 基本設計

## 1. 目的、対象、対象外

本書は、Rust Wallet Core を Desktop / Mobile / Web の Application へ接続する Native Binding と Web / WASM Binding について、責務、依存方向、trust boundary、所有権および lifecycle の配置を定める。Web には Web Application と Browser Extension を含む。

Binding は、Core が所有する処理と各実行環境の間で、入力、出力、representation、ownership、lifecycle および error / warning を橋渡しする境界層である。Binding は Core の単一の security meaning、成功・失敗境界および authorization boundary を変更しない。

対象は Native Binding と Web / WASM Binding に共通する設計責任である。特定の crate、ABI、JavaScript 型、package、storage API、Browser context または memory technique は本書で決定しない。

対象外は、Core の暗号、Mnemonic / Software Key の生成・導出・検証、Profile password authorization、署名 primitive、Store の内部解釈、UI / user intent の判定、Browser / OS / host の侵害防止および統合先 Application の architecture である。これらの責任を Binding に複製しない。

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

- **Binding**: Application と Rust Wallet Core の間で、値、representation、ownership、lifecycle、error および warning を橋渡しする境界層。Core の security authority ではない。
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
                    Native Binding または Web / WASM Binding
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
- user intent、signing approval、Mnemonic handoff の受領確認および export の明示要求
- Profile / Software Key の success、failure、pending、partial、replacement および existing committed state の意味
- Store validity、Store / Profile version policy、migration および compatibility
- Symbol / NEM、Mainnet / Testnet、Chain / Network の supported set と整合性

Binding は、Core の `result`、`error`、`warning`、`pending`、`replacement` および公開結果を、security meaning を変更せず Application へ伝達する。Binding を通過したこと、値を返せたことまたは Application が値を受け取れたことだけを成功条件に追加しない。

### 3.2 Native / Web 共通の guarantee boundary

Native、Desktop、Mobile、Web、WASM の方式差は、実行環境との representation、ownership および lifecycle の橋渡しに限定する。次の invariant は全経路で共通とし、Native Binding を Web / WASM より強い secret isolation boundary と扱わない。

- Mnemonic と Software Key の継続的な secret owner は Core である。
- Binding は authorization、user intent、signing approval または Core の security policy を持たない。
- 通常処理の結果として秘密情報を開示せず、Binding 自身が不要な copy、retention、cache、log または diagnostic を作らない。
- Core の per-operation authorization を維持し、Binding の session、cache または previous result に置き換えない。
- Core の fail-safe、existing committed state 保護、pending 非昇格および Store policy を変更しない。
- Account、Chain、Network の compatibility を補正せず、fallback または implicit conversion を行わない。

Application compromise、Browser compromise、OS compromise および host process compromise の防止は、Core / Binding の guarantee 外である。この limitation は、不要な秘密情報の disclosure / retention、authorization の弱体化、Core の意味の変更または failure safety の弱体化を許可する根拠にならない。host の security architecture は統合先 Application の責任であり、Binding の guarantee に含めない。

## 4. コンポーネント責務と依存方向

### 4.1 Rust Wallet Core

Core は次を所有する。

- Profile、Mnemonic、Software Key、pending / partial state の security responsibility と lifecycle
- Profile password の processing-unit authorization、および認証結果を次の operation へ持ち越さない policy
- Mnemonic / Software Key の生成、復元、取込み、導出、暗号化保存、利用および破棄
- Account、Software Key、Chain、Network の compatibility と fail-closed な reject
- Store の version、validity、integrity、consistency、migration policy および replacement の意味
- Profile / Software Key が committed state になったことの最終確定
- signing authority、signing primitive、success / failure の意味および failure 時の existing state 保護

Core は UI、利用者への表示、利用者意思の推測、紙や外部媒体への記録の独立検証および Browser / OS policy を所有しない。

### 4.2 Binding

Binding は次だけを担う。

- Application と Core の間の representation、型、opaque data、ownership および lifecycle の mediation
- Core への入力と Core からの公開結果、error、warning、pending および replacement の transport
- Binding 自身の境界で検出できる入力・変換・ownership / lifecycle の失敗を安全側に終了させること
- Native / Web / WASM の経路差が Core の security meaning、secret policy、authorization または failure policy を変更しないことの維持

Binding は暗号、認証、Mnemonic validation、導出、署名、Store / Profile version の解釈、migration、重複判定、Chain / Network policy、Transaction の意味解釈および UI / permission の判定を複製しない。

### 4.3 Application / UI

Application / UI は次を担う。

- 利用者操作、公開情報の表示、Account の選択および内容の提示
- 初回 Mnemonic handoff における intended user への提示と明示的な受領確認
- explicit export における target の提示、利用者の取得要求および確認済み要求の成立
- signing における内容の提示、利用者の明示的な approval および approved request の作成
- Core が返す opaque Store の保存、replacement、同期および端末間転送
- explicit handoff / export により Core 外へ渡された secret copy の表示、保管、利用および紛失防止

Application は、Core 管理下の秘密情報の継続 owner、Core の signing authority または Profile password authorization の正本にならない。入力や明示的 handoff / export を一時的に仲介することは、継続 ownership の移転を意味しない。

### 4.4 依存方向

```text
Application / UI → Native Binding または Web / WASM Binding → Rust Wallet Core
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
| Wallet Store | Core が validity、version および内部意味を管理 | Binding / Application は opaque data として転送・保存する |
| pending / partial / replacement | Core が状態の意味と成功境界を管理 | Binding は committed への昇格や成功判定を行わない |

通常処理では Mnemonic、private key、Profile password、decrypted secret または復元可能表現を Binding から返さない。成功した明示的 handoff / export の外部 copy は受領側の責任となるが、Core 内原本の継続 ownership は Core に残る。

Binding は継続的な secret owner にならず、persistent secret state を作らない。不要な secret copy、retention、cache、global state、log、diagnostic または保存を行わない。秘密情報の具体的な representation、copy 数、memory lifetime、破棄・zeroization 方法および runtime 上の保証は下流へ委譲するが、不要な文字列化・encoding 変換・永続保存を行わない security intent は維持する。

### 5.2 Store を opaque とする境界

Binding は Wallet Store / Profile data を opaque として mediation する。Binding は version interpretation、schema normalization、migration、fallback、guessed interpretation、unknown data の補正または内部編集を行わない。Application も Store の内部意味を代替しない。

v1 は Store / Profile version migration を提供しない。この policy、unsupported / unknown / corrupt / inconsistent data の reject、reject / failure の意味、replacement の意味および existing committed state の保護を Binding が変更しない。未保存の replacement を committed state と扱わず、reject された data を正常な秘密情報として扱わない。

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

### 6.2 Processing-unit authentication

Binding は次の認証状態を持たない。

- unlock session
- authorization cache
- previous authentication result の持越し
- restart 後の authorization state の復元
- Core authorization を代替する継続 secret-capable state

retry は新しい operation として Core へ橋渡しする。必要な入力、Profile password authorization および必要な user confirmation は、その operation のために上位責任主体が再取得しなければならない。Binding は retry を再認証済み operation として扱わず、具体的な token / session API を本書で定めない。

### 6.3 Initial Mnemonic handoff

新規 Mnemonic の初回 handoff の success boundary は、次の6段階を変更せずに維持する。

1. Core が Mnemonic を生成する。
2. Core が intended Application へ渡す。
3. Application が intended user へ提示する。
4. User が明示的に受領確認する。
5. Application が確認成立を Core へ伝達する。
6. Core が Profile success を最終確定する。

Binding は、この順序と責任を shortcut しない。Binding を通過したこと、Binding が Mnemonic を返したことまたは Application が値を受け取ったことだけでは handoff success または Profile success ではない。Binding は user confirmation を生成・推測せず、Profile success を独自確定せず、unconfirmed / stale pending を committed state へ昇格させない。

提示不能、受領未確認、確認伝達不能、中断または Core の最終確定失敗時は、Binding が新規 Profile、partial state または secret output を成功として作らない。具体的な受渡し、確認表現、pending representation および Core への伝達契約は下流へ委譲する。

### 6.4 Explicit export

Mnemonic または Software Key private key の export は通常処理から分離し、次の条件を別々に維持する。

- target
- user explicit request
- Application / UI confirmation
- confirmed request
- Core による per-operation Profile password authorization

Binding は password を所有していることだけで export success とせず、normal operation を export に変換せず、user intent を推測せず、target を補正しない。confirmed request を生成・追加・削除・補正せず、Core が判定する条件と結果を意味変更なく橋渡しする。対象外の secret を生成・追加せず、認証・確認・対象検証または処理の failure を success に変換しない。

export failure 時は secret を返さず、Profile / Store の状態を成功状態へ変更しない。成功後も Core 内原本の owner は Core であり、Core 外 copy の保護・保存・利用責任は受領側にある。具体的な request、confirmation、transport および output representation は下流へ委譲する。

### 6.5 Signing

Application / UI は Account を選択し、signing content を提示し、user の明示的な signing approval を得て、approved request だけを Binding へ渡す。Binding は signing approval を生成・判断・推測せず、Core password authorization を signing approval として扱わない。

Binding は Application の approved request の security meaning を変更せず Core へ渡し、Core の signing result、error および warning を意味変更せず返す。Core は per-operation authorization、Account / Software Key / Chain / Network compatibility および signing primitive を所有する。Binding は Transaction の意味説明、内容確認、UI、permission または signing authority を代替しない。

### 6.6 Pending、failure、retry および restart

Pending / partial state は committed state ではない。Binding は次を行わない。

- pending / partial を committed と解釈する
- stale pending または unconfirmed state を復活・昇格する
- failure、interruption または conversion error を success に変換する
- 未保存 replacement を committed と扱う
- previous authentication result または temporary secret を retry の authorization として利用する
- restart をまたいで authorization、unlocked state または secret-capable state を継続する

Binding は Core の failure、existing committed state の保護、Profile isolation、ownership および authorization boundary の意味を維持する。retry は入力、confirmation および password authorization を再取得する新しい operation として Core へ渡す。pending の形式、timeout、rollback、再利用条件および memory lifetime は下流へ委譲する。

## 7. Account、Chain / Network および環境差

Binding は Account、Chain / Network、Profile または Software Key の representation を bridge できるが、supported set、compatibility、mismatch および reject の判断主体ではない。Core が Symbol / NEM、Mainnet / Testnet、Profile Network、Software Key の固定 Chain および Account の対応を検証する。

Binding は次を行わない。

- Symbol と NEM を暗黙に共通化する
- Mainnet と Testnet を暗黙に共通化する
- mismatch を別の Chain / Network へ補正する
- unsupported な組合せを fallback する
- Chain / Network の implicit conversion を行う

Native と Web / WASM の representation 差は、Core の compatibility、signing authority、secret ownership、authorization または failure meaning を変更しない。具体的な identifier、byte 表現、address、derivation、protocol および interop contract は下流へ委譲する。

## 8. Native boundary の安全側責任と guarantee limitation

### 8.1 Binding の正の Design intent

Binding が受け付ける外部入力境界では、Binding 自身が検証可能な範囲について、次を責任として持つ。

- 検証可能な malformed input を fail-safe に扱う
- representation conversion failure を fail-safe に扱う
- ownership / lifecycle conversion failure を fail-safe に扱う
- Binding 自身が検出可能な境界条件違反を fail-safe に扱う

この責任により、Binding は検証可能な不正入力を意味不明のまま Core へ渡さず、失敗を success に変換せず、Core の result / error / warning の meaning を置き換えない。失敗経路で secret output、secret retention、persistent secret state または partial state を増やさず、existing committed state を成功状態として壊さない。この intent は Native に固有の緩和ではなく、Native / Web / WASM の共通 security invariant と整合する。

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
- **影響**: Native / Web / WASM の具体方式が変わっても、Core ownership、per-operation authorization、non-disclosure、failure safety および compatibility policy を維持できる。
- **見直し条件**: Core と Binding の責任分担を変更する上位 Requirements または Architecture が承認された場合。

### 9.2 Native / Web 共通の guarantee boundary

- **判断**: Native と Web / WASM を同一の security invariant、host compromise limitation および non-authority boundary で扱う。Native を Web より強い秘密隔離境界としない。
- **根拠**: Concept / Requirements の全環境共通原則、Architecture の全環境 trust boundary および Security Design の guarantee boundary。
- **代替案**: Web だけに host compromise limitation を置く方式は、Native / Mobile / Desktop の責任を曖昧にするため採用しない。
- **影響**: host compromise 防止は保証外のまま、全環境の通常処理 non-disclosure、non-retention、authorization および failure safety を維持する。
- **見直し条件**: 対象環境または上位 security responsibility が承認済み資料で変更された場合。

### 9.3 Store の opaque mediation と v1 no migration

- **判断**: Binding / Application は Store を opaque として渡し、Core の version、validity、reject、replacement および existing committed state の意味を変更しない。v1 は Store / Profile version migration を提供しない。
- **根拠**: Requirements の Store policy、Architecture の Store boundary および Security Design の fail-closed / no migration invariant。
- **代替案**: Binding / Application による schema normalization、fallback、独自解釈または暗黙 migration は、attacker-controlled input の trust transition と committed state の責任を分散させるため採用しない。
- **影響**: Store の具体 wire / schema / parser が変わっても、opaque boundary、Core ownership、reject および既存状態保護を維持できる。
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
- 初回 Mnemonic handoff の確認伝達、explicit export の条件、signing の approved request および Core result の具体契約
- Store / Profile version、対応範囲、reject、opaque data、wire / schema および既存状態保護の具体契約
- Account / Chain / Network compatibility と mismatch reject の具体契約
- pending / partial、failure、retry、restart および committed state の外部観測可能な契約

### 10.2 Implementation / release verification へ引き継ぐもの

- Native / Web / WASM の具体 bridge、crate、directory、package、build および distribution
- exact C ABI、struct、pointer、NULL / length、alias、free、ownership mechanics および panic handling
- exact JavaScript type、generated binding、raw / UTF-8 / hex / Base64 等の representation、encoding および buffer lifecycle
- secret copy、memory lifetime、allocator、zeroization、runtime、compiler、target および third-party dependency の検証
- parser、resource limit、side-channel、error path、test、fixture、interop および release verification

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
| Explicit export と user intent | Requirements FR-022〜FR-023、SEC-021、AC-026、AC-041 | §6.4 | §6.3 | §3.1、§6.4 |
| Signing approval と signing authority | Requirements FR-009、SEC-022、AC-009 | §3、§6.3 | §6.4 | §6.5 |
| Store / version / no migration | Requirements DR-009、SEC-004、SEC-018、AC-045 | §5.2、§6.2、§9.3 | §6.5 | §5.2、§6.6、§9.3 |
| Pending / failure / retry / restart | Requirements SEC-003、SEC-005、SEC-017〜SEC-019、AC-037〜AC-039、AC-046 | §5.3、§6.1〜§6.2、§6.5、§9.4 | §6.6 | §3.1、§6.1、§6.2、§6.6、§8.1 |
| Account / Chain / Network | Requirements FR-013、FR-024、DR-005、AC-013、AC-047 | §5.1、§7 | §7 | §3.1、§7 |
| Native / Web 共通 guarantee boundary | Concept §7、§9、Requirements NFR-004、SEC-020 | §3.1、§4.4、§8 | §3、§8 | §3.2、§9.2 |
| Native boundary safety intent | Requirements NFR-002〜NFR-003、SEC-012、SEC-018 | §4.2、§8 | §3、§10 | §4.2、§8 |

### 11.2 参照資料の役割

| 区分 | 資料 | 本書での扱い |
| --- | --- | --- |
| Normative upstream | [`docs/consept/concept-sheet.md`](../consept/concept-sheet.md)、[`docs/requirements/requirements.md`](../requirements/requirements.md) | 目的、範囲、責任、security property および受入条件の根拠 |
| 同一 Design の確定済み全体設計 | [`docs/design/architecture.md`](architecture.md) | responsibility、ownership、trust boundary、lifecycle、依存方向および共通 invariant の整合基準 |
| 同一 Design の security 整合基準 | [`docs/design/security.md`](security.md) | security responsibility、guarantee boundary、authorization、secret lifecycle、failure safety および invariant の整合基準 |
| 下流正本・引継ぎ先 | [`docs/specifications/specification.md`](../specifications/specification.md)、[`docs/specifications/wallet-store-format-v1.md`](../specifications/wallet-store-format-v1.md)、Implementation | API、ABI、DTO、wire、validation、error、parser、memory、具体実装および検証の根拠 |
| 履歴資料 | `docs/reviews/` | review の状態と判断履歴。本書の normative source ではない |

本書は、Architecture / Security Design と相互整合する Binding の責務・境界・invariant を統合する。下流の具体方式が本書の security meaning、ownership、authorization、failure safety または trust boundary を変更しないことを、Specification / Implementation へ引き継ぐ。
