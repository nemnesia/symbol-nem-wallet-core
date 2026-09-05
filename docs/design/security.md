# 秘密情報・署名 Security 基本設計

## 1. 目的、対象、対象外

本書は、Wallet Core v1 における秘密情報の所有、trust boundary、認証・認可、署名権限、状態 lifecycle、失敗時責任および security invariant を定める基本設計である。確定済み Architecture の security responsibility を、Security Design として一意に下流へ引き継ぐ。

対象は、Desktop / React Native Android / React Native iOS / Web / Node.js の Symbol / NEM ウォレットから利用する Rust Core、Native C ABI、Node-API、Web / WASM / React Native Binding およびそれらを取り巻く秘密情報の境界である。Web には Web Application と Browser Extension を含める。React Native の JS/native boundary、native artifact、runtime resolution および platform failure も対象とする。

本書の対象外は、Wallet UI の具体的な表示、Transaction の構築・シリアライズ・意味解釈、REST / WebSocket / announce、Hardware Wallet、External Signer、OS-backed Key、Profile データの保存先選択および端末間 transfer の具体方式である。v1 は Store / Profile version migration を提供しないが、将来 version の migration 方式は本書で定めない。

暗号アルゴリズム、KDF、暗号パラメータ、署名対象の具体的な byte 列、API / ABI、DTO、wire format、parser、error、buffer 表現、memory layout、zeroization 実装および具体的な検証方法は、下流へ委譲する。これらは本書の security invariant、責任境界および成功・失敗境界を変更してはならない。

## 2. 上流根拠、依存方向および用語

### 2.1 Source of Truth と依存方向

Security Design の normative upstream は次のとおりである。

- [docs/consept/concept-sheet.md](../consept/concept-sheet.md): 製品目的、v1 範囲、全環境共通の責任境界および Core 継続管理の原則
- [docs/requirements/requirements.md](../requirements/requirements.md): protected asset、認証・認可、handoff、export、signing、Store、Chain / Network、failure および受入条件

[docs/design/architecture.md](architecture.md) は確定済みの全体 Architecture であり、Security Design が従う responsibility、ownership、trust boundary、lifecycle および security invariant の同一 Design フェーズ基準である。Architecture を本書で上書きしない。

[docs/design/bindings.md](bindings.md) は同一 Design フェーズの関連設計であり、責務と境界の整合確認先である。Security Design と Bindings Design は相互に整合させるが、片方をもう片方の normative upstream としない。

Specification は Security Design が確定した security invariant と責任境界を、API、validation、error、暗号・保存契約およびその他の外部契約へ具体化する下流正本である。Implementation は Specification と本書の invariant を実現・検証する下流である。下流の具体契約や実装から security responsibility を逆算しない。

開発フェーズの関係は次のとおりである。

~~~text
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
~~~

### 2.2 用語

- **Profile**: 固定された Network、1 つの Mnemonic および 0 個以上の Software Key を持つ秘密情報管理単位。Chain には固定しない。
- **Mnemonic**: Profile の root secret。Software Key とは別の protected asset として Core が継続管理する。
- **Software Key**: Derived、Imported または Generated の秘密鍵を同じ鍵管理 lifecycle で扱う単位。Chain に固定する。
- **Account**: Software Key を、その Software Key の固定 Chain と Profile の固定 Network 上で利用する概念。
- **Core 管理下 Store**: Core が version、validity、integrity、consistency および秘密情報保護を検証する opaque な保存データ。保存先は Application の責任である。
- **Pending / partial state**: Profile または Software Key の成功確定前に存在し得る未確定状態。正常な committed state ではなく、その security meaning と成功状態への昇格条件は Core が管理する。
- **Processing-unit authentication**: 1 つの secret-capable operation のために Core が行う Profile password authorization。次の operation へ持ち越さない。
- **Signing authority**: 指定された Account / Software Key に対応する秘密鍵を使って署名できる権限。Profile password authorization と利用者の signing approval は別の property である。

## 3. システムコンテキストと trust boundary

~~~text
利用者 ──確認・承認──> Application / UI ──> Native C ABI、Node-API、Web / WASM または React Native Binding ──> Rust Core
   │                              │                                      │
   │                              ├── opaque Store ──> persistent storage
   │                              └── Transaction layer ──> Network layer
   │
   └── Browser / OS / host process（実行環境。Core の compromise 防止保証外）
~~~

### 3.1 Actor と boundary の責任

| Actor / boundary | Security responsibility | Core との関係 |
| --- | --- | --- |
| 利用者 | 初回 Mnemonic handoff の受領確認、署名承認、明示的 export の要求、および Core 外へ受け取った秘密情報 copy の保管 | Core は利用者の UI 操作、紙・外部媒体への保存または将来の紛失を独立検証しない |
| Desktop Application / React Native Application / Node.js Application | UI、利用者への表示、Account 選択、handoff、export、signing の確認・承認取得、opaque Store の current-state selection、保存・置換および stale / historical Store の再適用防止 | Core 管理下 secret の継続 owner、Core authorization または signing authority にはならない。assertion freshness と current Store authority は Application / persistence layer の責任である。Node.js / React Native Application は Rust Wallet Core と独立した Wallet Core を実装しない |
| Web Application / Browser Extension | Web 固有の UI / state、利用者確認、opaque Store の current-state selection、保存・置換および Web 実行環境との連携 | Browser / host の安全性は別責任であり、Core の通常非開示 invariant を弱めない。assertion freshness と historical Store rollback prevention は Application / persistence layer の責任である |
| Native C ABI | Application と Core の間の値・ownership・lifecycle の橋渡し | Core の security decision、認証、暗号、導出、署名意味、Store 意味を代替しない |
| Node-API Binding | Node.js Application と Core の間の値・ownership・lifecycle の橋渡し | Core の security decision、認証、暗号、導出、署名意味、Store 意味を代替しない。C ABI を JavaScript FFI から呼び出す authority ではない |
| Web / WASM Binding | Web Application / Browser Extension と Core の間の値・ownership・lifecycle の橋渡し | JavaScript / Browser と同じ実行 context でも、Native と異なる secret policy を持たない |
| React Native Binding | TypeScript facade と Android / iOS native layer の間の runtime resolution、JS/native buffer・error・lifecycle mediation | JSI / TurboModule、platform loader および C ABI の接続を含むが、暗号、認証、Store processing、secret owner にはならない。Node addon / WASM へ fallback しない |
| Android / iOS native layer | package 内 native artifact の load、platform registration および RN adapter への接続 | artifact、ABI、device / simulator の不一致を fail-closed に伝える。Core の意味を変更せず、秘密情報を継続保持しない |
| Rust Core | secret ownership、processing-unit authentication、入力 Store の validity、Chain / Network compatibility、signing primitive、成功状態の確定および失敗時保護 | 秘密情報とその security meaning の継続 owner。UI、Transaction 意味、Application assertion freshness、Store currentness または host security を担わない。過去に返した Store を永続記憶しない stateless processor である |
| Browser | Web の実行環境およびその安全性 | Core の秘密情報隔離境界または host compromise 防止保証ではない |
| Node.js host process | Node.js Application と Node-API が動作する実行環境およびその安全性 | Core の秘密情報隔離境界または host compromise 防止保証ではない |
| OS | Desktop / React Native の実行環境およびその安全性 | Core の host compromise 防止保証ではない |
| host process | Application と Binding の実行・保持環境 | 侵害防止は Core の保証外。ただし Core / Binding の非開示責任は維持する |
| persistent storage | Application が選択する opaque Store の保存先および current Store の保持先 | Store の内部を解釈せず、Core の validity 判断を代替しない。Application / persistence layer は current Store の選択、replacement の適用、stale / historical Store の再適用防止を担う。読み込み値は attacker-controlled input になり得る |
| Transaction layer | Transaction の構築、内容の提示に必要な情報およびシリアライズ | Core の署名 authority、意味判断または利用者承認を代替しない |
| Network layer | REST、WebSocket、announce 等の通信 | Core の秘密情報管理、Chain / Network policy または署名承認を代替しない |

### 3.2 全環境共通 security invariant

Desktop、React Native Android / iOS、Web、Node.js、Native C ABI、Node-API、Web / WASM および React Native のすべてで、次を共通に維持する。

- Mnemonic および Software Key 原本の継続的な secret owner は Core である。
- Application / Binding は input、初回 handoff または明示的 export の受渡しを一時的に mediation できるが、Core とは別の継続的な secret authority にならない。
- Core 管理下の secret は通常処理の結果として返さない。初回 Mnemonic handoff と条件を満たす個別 export の成功結果だけが明示的な例外である。
- Profile password authorization は Core が operation ごとに担う。Binding / Application は security decision、unlock session または authorization cache により代替しない。
- Handoff confirmation、export confirmation および signing approval の freshness は Application / UI が担う。Core は Application が実際に表示・確認・承認を取得したこと、または assertion が fresh であることを独立には証明しない。
- Core は過去の operation の authorization、pending または秘密情報を次の operation へ暗黙に持ち越さず、pending を confirmation なしに committed へ昇格させない。
- Core は stateless な opaque Store processor として、現在の operation に入力された Store の validity、integrity、consistency および mutation を処理する。過去に返した Store を記憶せず、valid historical Store の freshness または rollback を単独では検出・拒否しない。
- Application、Browser、OS、Node.js または host process の compromise 自体を Core が防止する保証はない。
- host compromise を保証しない場合でも、Core / Binding の通常処理における非開示、authorization boundary、failure safety および non-authority の責任は弱まらない。

## 4. コンポーネント責務と依存方向

### 4.1 Rust Core

Core は次を所有する。

- Profile、Mnemonic、Software Key、signing authority、pending / partial state の security responsibility と lifecycle
- Profile password の processing-unit authorization。認証結果を別 operation へ持ち越さない
- Mnemonic の生成・復元・取込み、Software Key の導出・生成・取込みおよび必要な秘密情報の利用
- Store の version、validity、integrity、consistency および秘密情報保護の検証
- Account、Software Key、Chain、Network の compatibility 判定と fail-closed reject
- Profile / Software Key が正常な committed state になったことの成功確定
- failure、interruption、保存失敗および不正入力時の existing committed state 保護、Profile isolation および秘密情報非開示

Core は UI を提供せず、利用者の intent または Application assertion の freshness を推測・独立検証せず、Transaction を構築・説明・解釈せず、保存先の availability を所有しない。

### 4.2 Application / UI

Application / UI は次を担う。

- 利用者操作、公開情報の表示、Account の選択および利用者への提示
- 初回 Mnemonic handoff の提示と、利用者の明示的な受領確認の取得。新規 Mnemonic 生成では常に handoff confirmation を完了させる
- explicit export の対象表示、秘密情報取得要求の確認および確認済み request だけの送信
- signing payload / Transaction 内容の提示、利用者が確認できる状態の提供、明示的な signing approval の取得および approved request だけの送信
- Core が返す opaque Store の current Store としての選択、保存、replacement の適用、バックアップ、同期および端末間 transfer。stale / historical Store の再適用防止と最新版 snapshot の管理を含む
- handoff、export および signing における現在の operation の利用者確認・承認 assertion の freshness 管理。過去に保存した `Approved`、`Confirmed` または `Requested` を新しい利用者意思として再利用しない
- handoff / export により Core 外へ渡った秘密情報 copy の表示、保管、利用および紛失防止

Application / UI は Core 管理下の secret、signing authority、Profile password authorization または Store の内部意味の正本にならない。Application が current Store の選択と freshness を担うことは、Core の Store validity 判断を代替することを意味しない。

### 4.3 Binding と依存方向

Binding は入力・出力の型変換、raw / opaque data の受渡し、ownership の橋渡しおよび error / warning の境界変換を担う。依存方向は次のとおりである。

~~~text
Application / UI → Native C ABI、Node-API、Web / WASM または React Native Binding → Rust Core
~~~

Binding は暗号、認証、Mnemonic validation、導出、署名、Store / pending の意味、Chain / Network policy、Transaction の意味または Wallet 固有の security policy を複製・補正しない。Native C ABI、Node-API と Web / WASM の経路差は境界の transport / conversion に限定し、Core の ownership、authorization、公開範囲および failure policy を変更しない。Node.js host process の compromise に対する native-isolation guarantee は追加しない。

## 5. Protected assets、secret ownership および lifecycle

### 5.1 Protected asset model

| Protected asset | 継続的 security responsibility | 一時的な取扱い | 通常処理での公開可否 | Trust Boundary を越える明示例外 | failure / interruption 時の責任 | lifecycle 終了時の Design-level obligation |
| --- | --- | --- | --- | --- | --- | --- |
| Mnemonic | Core が root secret として生成、保持、利用、保護および破棄を管理 | Application / Binding は生成直後の handoff、取込みまたは利用者入力を必要範囲で mediation できるが、継続 owner にならない | 不可 | 初回 handoff、または条件を満たす個別 export の成功結果 | Core が未確定 Profile、通常結果、失敗結果または診断へ残さない。handoff / export 後の Core 外 copy は受領側が保護する | Core 内原本の責任は Core に残し、不要な継続保持・再利用・診断出力を許さない |
| Software Key private key | Core が Chain 固定の Software Key として保持、利用および破棄を管理 | Imported / Generated input、Derived key または署名処理の mediation は必要範囲に限る | 不可 | 条件を満たす対象 Software Key の個別 export の成功結果 | 登録・導出・署名・削除の失敗時に不完全状態、通常結果または診断へ残さない | 削除後に Core の署名、導出、登録その他の秘密処理へ再利用しない |
| derived secret / decrypted secret material | Core が必要な処理中だけ security responsibility を持つ | 導出、復号、署名、保存更新等の処理に限定する | 不可 | 通常の明示 export の対象そのものとして仕様上許可される場合を除き不可 | pending、cache、診断または通常利用可能状態へ残さない | 目的の処理が終了または失敗した後、継続利用可能な状態として保持しない |
| Profile password | Core が各 operation の authorization を担う。password を継続保存・cache しない | 利用者、Application または Binding が入力を一時的に mediation できる | Core から返さない。診断・結果にも含めない | authorization のために要求された operation へ入力する場合のみ | 認証失敗・中断時に authorization を成立させず、以前の結果を再利用しない | operation の authorization 終了後に、次 operation の権限または継続 Unlocked state として残さない |
| temporary secret | 生成・利用した処理に対する Core の security responsibility。Binding は自身の境界内の一時値を管理する | handoff、導出、復号、署名、export 等の必要範囲だけ | 不可 | 明示 handoff / export の成功結果に含まれる対象 secret のみ | failure、interruption、retry または restart 後に通常利用可能状態、cache、診断へ残さない | Core / Binding が自身の責任範囲で lifecycle 終了を扱い、継続 owner や永続 copy を作らない |
| Core 管理下 Wallet Store | Core が入力 Store の logical state、version、validity、integrity、consistency および秘密情報保護を管理 | Application / persistence layer が opaque blob の current Store authority として保存・転送・replacement 適用・stale / historical Store の再適用防止を担う | 内部 secret または復元可能表現を通常結果・診断へ出さない | Core が成功した replacement を Application が opaque に current Store として適用する場合のみ | reject / 保存失敗時に existing committed state を維持し、未対応入力を正常な secret として扱わない | Core は過去 Store を記憶せず、valid historical Store の freshness / rollback を単独で保証しない。Application の独自解釈・編集は許さない |
| signing authority | Core が指定 Account / Software Key に対応する署名能力を管理 | Application が Account と signing request を選択・提示し、Binding が受渡しを mediation する | private key を公開せず、通常結果は署名結果に限定する | Core が authorization、compatibility、承認済み request の条件を満たして署名結果を返す場合 | account / chain / network 不整合、認証失敗または署名失敗時に署名能力・秘密鍵・既存状態を変更しない | Software Key / Profile の削除後に signing authority を再利用しない |
| pending / partial state に含まれ得る秘密情報 | Core が security meaning、success promotion 条件および失敗時の扱いを管理 | Application / Binding は未確定値を受渡し・保存する場合も opaque に扱う | committed state、通常結果または診断として公開しない | 成功境界を満たした後に Core が committed state として確定する場合のみ | stale / unconfirmed state を自動昇格せず、failure / interruption / restart 後に秘密情報を通常利用可能にしない | 未確定状態を次 operation の authorization、秘密情報または committed state として再利用しない |

Mnemonic / Software Key の原本について、Application / Binding の input、initial handoff、explicit export による一時的 mediation は ownership の移転ではない。明示的に Core 外へ渡された copy の保護責任は受領側へ移るが、Core 内原本の継続責任は Core に残る。

具体的な buffer type、copy count、stack / heap、zeroize API、pointer、memory lifetime は本表では決めない。

### 5.2 共通 lifecycle 原則

generation、restoration、import、derivation、use、signing、persistence、replacement、deletion のすべてで、secret の security meaning と owner を Core から外さない。成功時だけ対象の全体結果を committed state とし、failure / interruption 時は既存の committed state、Profile isolation および authorization boundary を維持する。Application / persistence layer が current Store を選択・保持することは、Core の Store validity / integrity 判断を代替しない。

Profile パスワード変更、Software Key 削除および Profile 削除も同じ Core ownership と processing-unit authentication の境界で扱う。削除前から利用者が保持する Mnemonic による新しい Profile 作成は、削除済み Core data の復旧・再利用とは別の外部入力であり、本書はその Core 外 copy の保護責任を利用者 / Application に置く。

## 6. 主要フロー、認証、失敗および状態遷移

### 6.1 Processing-unit authentication

次の secret-capable operation には、共通して Core による当該 operation 単位の Profile password authorization を適用する。

- signing
- derivation
- Imported Software Key 登録
- Generated Software Key 登録
- Profile password change
- Mnemonic export
- Software Key private key export
- Software Key deletion
- Profile deletion

Core は operation ごとに Profile password を認証し、authorization をその operation だけに有効とする。次の operation へ持ち越さない。Core に継続 Unlocked state を持たせず、Binding は unlock session / authorization cache を作らず、Application は Core の代替 unlock session を保持しない。previous authentication result を次の operation の authorization として使わない。retry は再認証であり、restart 後に authorization state を継続しない。Handoff、export および signing の confirmation / approval assertion は現在の operation に結び付いたものを Application / UI が fresh に取得し、過去に保存した `Approved`、`Confirmed` または `Requested` を新しい利用者意思として再利用しない。Core は assertion freshness を独立には証明しない。

具体的な token、session API、password の memory representation は下流へ委譲する。authorization の責任主体と持続範囲は下流の方式によって変更できない。

### 6.2 初回 Mnemonic handoff

すべての新規 Mnemonic 生成では、次の 6 段階を handoff の成功境界とする。handoff を行わない新規生成経路は v1 で提供しない。既存 Mnemonic の restore はこの生成時 handoff confirmation の対象外とし、Mnemonic validity、password、Store、duplicate 等の通常 restore 条件に従う。

1. Core が完全な Mnemonic を生成する。
2. Core が意図された Application へ完全な Mnemonic を渡す。
3. Application が意図した利用者へ Mnemonic を提示する。
4. 利用者が Mnemonic を受領したことを明示的に確認する。
5. Application が確認成立を Core へ伝える。
6. Core がその後だけ Profile 作成を成功状態として最終確定する。

Mnemonic の生成、Core 内での一時保持、Binding の通過、Application の受領または Application の呼出しだけでは Profile success にならない。利用者確認前は committed Profile ではなく、正常 Profile として利用できない。

受領不能、提示不能、利用者の拒否・未確認、Application から Core への確認伝達不能、handoff の中断または最終確定失敗では、Core は partial Profile を成功状態として残さず、stale / unconfirmed state を自動昇格させず、Mnemonic を通常結果、失敗結果または診断へ漏らさない。既存の committed state は壊さない。

Core は UI を担当せず、利用者が紙・外部媒体へ保存したことまたは将来紛失しないことを独立検証しない。handoff confirmation の freshness は Application / UI が管理し、過去に保存した確認済み assertion を新しい利用者意思として再利用しない。Core は Application が実際に Mnemonic を提示し、利用者が確認したこと、または assertion が fresh であることを独立には証明しない。handoff 後の Core 内 Mnemonic 原本は Core が継続管理し、Core 外 copy の表示・保管・紛失防止は Application / 利用者が担う。callback、ACK、Pending Profile、transport および具体的な確認表現は下流へ委譲する。

### 6.3 Explicit secret export

Mnemonic および Software Key private key の export は、通常処理とは別の security-sensitive operation とする。

#### Application / UI と利用者

- export 対象を明示する。
    - 利用者が現在の export operation について秘密情報取得を明示的に要求したことを確認する。
    - 過去に保存した `Confirmed` / `Requested` assertion を新しい利用者意思として再利用せず、assertion freshness を管理する。
    - Application / UI が user intent を確認し、fresh な confirmed request だけを Core へ送る。

#### Core

- 対象 Profile または対象 Profile / Software Key を解決する。
- 当該 export operation の Profile password authorization を行う。
- target、user intent、confirmed request および authorization が成立した場合だけ対象 secret を返す。
- UI を持たず、user intent を推測せず、通常処理から暗黙に export へ遷移せず、対象外 secret を返さない。

**Profile password authorization != user intent confirmation** である。password が正しいこと、Application が password を保持していること、または通常 operation が成功したことだけでは export の成立条件にならない。Core は target、payload、AccountContext および渡された assertion を仕様どおり検証するが、Application が表示・確認を取得したことや assertion の freshness を独立には証明しない。v1 Core に challenge、nonce、expiry または one-shot token による freshness 機構は追加しない。

成功時も Core 内原本の継続 owner は Core であり、Core 外 copy の表示・保管・利用・紛失防止は Application / 利用者の責任である。誤認証、意思確認のない要求、対象不存在または処理失敗時は secret を返さず、Profile / Store を変更しない。具体的な UI、request field、export buffer および受渡し方式は下流へ委譲する。

### 6.4 Signing authority と利用者承認

#### Application / UI と利用者

- 利用する Account を選択する。
- signing payload / Transaction 内容を利用者へ提示する。
- 利用者が内容を確認可能な状態を提供する。
- 利用者から明示的な signing approval を得る。
- 過去に保存した `Approved` assertion を新しい利用者意思として再利用せず、現在の signing operation に対する approval assertion の freshness を管理する。
- approved request だけを Core へ送信する。

#### Core

- signing operation の Profile password authorization を行う。
- Account、Software Key、Chain および Network の compatibility を検証する。
- 対応する private key を利用して signing primitive を実行する。
- 署名結果を返す。

**Profile password authorization != signing approval** である。Core は Transaction の意味判断、内容説明、UI、user intent の推測または Transaction 構築を担わない。ただし raw payload に対する signing primitive であることは、Application が利用者承認なしに任意 payload を Core へ送ってよいことを意味しない。Application の明示承認と Core の password authorization は、それぞれの責任境界で成立しなければならない。Core は Application が実際に提示・承認を取得したことや approval assertion の freshness を独立には証明しない。

### 6.5 Store security、version および migration

Wallet Store は attacker-controlled input になり得る境界として扱う。

Core は、現在の operation に入力された Store / Profile version を識別し、validity、integrity および consistency を検証する。v1 は明示的に対応する version だけを処理する。unsupported version、unknown version、corrupt data、不整合 data および安全に対応できない data は fail-closed に reject する。Core は意味を推測せず、別 version と読み替えず、fallback、黙った解釈・無視または implicit migration を行わない。reject された data から秘密情報処理を成功させない。

reject / failure 時は既存の committed state を変更せず、secret を外へ返さず、reject data を正常な秘密情報として扱わない。Application / Binding は Store を opaque として保存・転送するだけであり、内部を独自解釈・編集せず、unsupported version を v1 と読み替えず、Core の Store security policy を代替しない。Application / persistence layer は current Store authority として、Core が成功した replacement の適用、stale / historical Store の再適用防止および最新版 snapshot の管理を担う。

Core は過去に返した Store snapshot を永続記憶しないため、authentication / integrity に成功する valid historical Store が削除・変更前の snapshot であることを単独で知ることができず、valid historical Store の freshness または rollback を検出・拒否する保証を持たない。これは malformed、tampered、authentication failure、unsupported version または inconsistent Store を fail-closed に reject する責任を弱めない。削除成功時の replacement Store と Application が current Store として正しく適用した committed state における削除済み秘密情報の non-reuse は SEC-005 の範囲で維持する。

脅威モデル上、Application または persistent storage を操作できる攻撃者が、削除・変更前に取得した正当な Store snapshot を current Store として再提示する valid historical rollback を想定する。この snapshot は暗号認証・構造検証に成功し得るため、Core 単独では malformed / tampered Store と区別できない。rollback の再適用防止、current Store の最新版選択および rollback protection が必要な場合の上位機構は Application / persistence layer の責任であり、v1 Core の保証対象外である。

v1 は Store / Profile version migration を提供しない。将来 migration を提供する場合は、将来 version の Requirements → Design → Specification で source / target、明示的な開始、成功境界、失敗時の existing committed state 不変および秘密情報非開示を改めて定義する。具体的な parser、serialization、field、version 表現、error および migration 手順は下流へ委譲する。

### 6.6 Pending / partial、failure、retry および restart

Pending / partial state は committed state ではない。Core がその security meaning と success promotion 条件を所有し、Application は Core が成功確定していない状態を committed Profile / Software Key として扱わず、Binding はその意味・authorization policy を変更しない。stale / unconfirmed state を自動的に成功状態へ昇格させない。

failure または interruption の後は、次を維持する。

- existing committed state を保護する。
- secret ownership、Profile isolation および authorization boundary を変更しない。
- temporary / decrypted secret を通常利用可能状態、diagnostic または cache に残さない。
- partial Profile、partial Software Key または未保存 replacement を成功状態として扱わない。

retry は新しい operation とする。必要な Store、入力、現在の operation に対する fresh な利用者確認および Profile password authorization を再提供・再取得し、previous authentication result、stale pending または temporary secret を次 operation の authorization として再利用しない。Core は再提出された assertion の freshness を独立には証明せず、Application が過去に保存した確認・承認を新しい利用者意思として再利用しないことを要求する。

脅威モデル上、悪意ある Application が過去 operation の `Approved`、`Confirmed` または `Requested` assertion を現在の operation のものとして再提出する replay を想定する。Core は UI 表示、実際の利用者操作または Application 内での保存・再利用を独立に証明しないため、この Application compromise を完全に防止する保証は持たない。Core が保証するのは、内部の authorization / pending state を operation 間で暗黙に持ち越さないこと、request の target / payload / AccountContext と渡された assertion を仕様どおり検証すること、および confirmation なしで pending を committed に昇格させないことである。

restart 後は unlocked state、authorization state または未確認 pending を復元しない。pending の具体的な形式、timeout、rollback、再利用条件および memory lifetime は下流へ委譲する。

## 7. Account、Chain / Network および signing context

次の関係を Security Design の境界として維持する。

- Profile は Network（Mainnet / Testnet）を固定する。
- Profile は Chain（Symbol / NEM）には固定しない。
- Software Key は Chain（Symbol / NEM）に固定する。
- Account は Software Key を、その fixed Chain と Profile の fixed Network 上で利用する。

Core は supported Chain、supported Network、Profile Network、requested Network、Software Key Chain、requested Chain、および Account / Software Key / Chain / Network の compatibility を検証する。unsupported、mismatch または不正な組合せは fail-closed に reject する。

reject 時は Profile、Software Key、existing committed Store および秘密情報を変更・返却しない。Core は別 Chain / Network へ fallback せず、implicit conversion を行わない。Application は Account を選択・提示するが、Binding / Application は Core の compatibility policy を代替・補正しない。

Symbol / NEM、Mainnet / Testnet の Chain 固有処理、鍵、公開情報、アドレス、署名および導出の具体規則は、下流の互換性仕様へ委譲する。identifier、byte 表現および derivation path を本書で固定しない。

## 8. Security guarantee boundary

### 8.1 Side-channel に関する Design-level invariant

- Requirements `SEC-023` に基づき、Core 自身が実装・管理する秘密情報処理では、secret-dependent control flow、secret-dependent timing behavior または secret-dependent data access を不必要に導入しない。
- この invariant の責任主体は Core である。Binding は Core の side-channel responsibility を代替せず、Application compromise を完全に防止する責任も負わない。
- 本設計の保証範囲は Core 自身が導入する不要な秘密依存の処理形状を対象とする。third-party cryptographic library の内部、compiler、runtime、OS、browser、hardware または CPU microarchitecture における完全な side-channel absence は保証対象外である。
- Specification、Implementation および release verification は、SEC-023 と本保証境界を受け取り、具体的な実装・依存関係・target ごとの検証責任を定める。
- 特定の constant-time library、assembly inspection、third-party library fork、zeroize technique、compiler option または side-channel test tool は本書で固定しない。単純な wall-clock threshold だけを security guarantee の唯一の根拠にもしない。

### 8.2 Zeroization、secret lifetime および memory responsibility

- secret の lifetime を必要最小限にし、unnecessary secret retention を禁止する。
- persistent secret copy を不要に増やさず、Binding を継続的な secret owner にしない。
- failure、interruption、retry または restart 後に secret を通常利用可能状態へ残さない。
- secret を log、diagnostic または cache に残さない。
- Core / Binding は自身の responsibility boundary 内で、秘密情報の lifecycle 終了を扱う。
- Web の persistent storage へ secret を継続保存しない。これは security principle であり、特定の Browser API や保存形式を本書で規範化するものではない。
- host、runtime、third-party dependency 全体の完全消去は本書の guarantee 外である。保証外であることを、不要な secret retention の正当化に使わない。

exact zeroize target、buffer list、borrow / owned の具体 ABI、pointer、free semantics、mutable byte type、copy count、allocator、memory layout、exact memory lifetime、zeroize library / API および FFI pointer safety は下流へ委譲する。

### 8.3 Third-party crypto dependency の guarantee boundary

Core / Binding が明示的に ownership を持つ秘密情報と、third-party dependency、compiler、runtime または host が内部で扱う temporary を区別する。第三者依存内部の temporary の完全消去は、v1 の Core / Binding が暗黙に保証する範囲へ含めない。

v1 では、第三者暗号ライブラリ内部の temporary の完全消去だけを目的として fork / local patch を必須構成にしない。この判断は Core / Binding の明示的な ownership 範囲を定めるものであり、秘密情報の必要最小限保持、非開示、failure safety および security boundary を弱めるものではない。

依存更新時の compatibility、secret exposure、side-channel および security guarantee boundary の確認は、Specification、Implementation および release verification へ引き継ぐ。特定 library の現在の内部実装、temporary、patch または fork implementation を本書の normative detail にしない。

## 9. 採用した設計判断と代替案

### 9.1 Core を継続 secret owner とする

- 判断: Mnemonic / Software Key の原本、signing authority、secret lifecycle および security meaning を Core に集約する。
- 根拠: Concept / Requirements の Core 継続管理、通常処理での非開示、全環境共通責任および Architecture の ownership model。
- 代替案: Application / Binding ごとに秘密情報管理や認証を持つ方式は、環境ごとの責任差、authority の重複および境界漏れを生むため採用しない。
- 影響: input、handoff、export の一時 mediation と、explicit export 後の Core 外 copy の保護責任を両立する。
- 見直し条件: Core の継続 ownership または Binding non-authority を変更する上位 Requirements が承認された場合。

### 9.2 User intent と Core authorization を分離する

- 判断: handoff の受領確認、explicit export の取得要求、signing approval および assertion freshness は Application / UI と利用者、Profile password authorization と secret use は Core の責任とする。Core は Application の表示・確認・承認を独立検証せず、過去 operation の authorization / pending state を暗黙に再利用しない。
- 根拠: Requirements の handoff、explicit export、signing approval、AC-050 および processing-unit authentication、Architecture の user intent / authorization boundary。
- 代替案: password 所有だけで利用者意思を推定する方式、または Core が UI / 人間の行動を独立検証する方式は、責任境界を混同するため採用しない。
- 影響: export と signing の両方で、利用者側の fresh な確認・承認と Core 側の per-operation authorization を別々に引き継げる。Core は assertion の freshness を独立には証明せず、v1 に challenge、nonce、expiry または one-shot token を追加しない。
- 見直し条件: 利用者確認または Core authorization の責任を変更する上位 Requirements が承認された場合。

### 9.3 Store を opaque とし、current Store authority を Application に置く

- 判断: Core が入力 Store の security responsibility と reject policy を所有し、Application / persistence layer は opaque data の current Store authority、replacement の適用、stale / historical Store の再適用防止および最新版 snapshot の管理を担う。v1 は version migration を提供しない。Core は過去に返した Store を永続記憶せず、valid historical Store の freshness または rollback を単独で検出・拒否しない。
- 根拠: Requirements の Store version、fail-closed、no fallback、no guessed interpretation、no implicit migration、SEC-005、AC-048、Application の current Store responsibility および existing state preservation、Architecture の Store boundary。
- 代替案: Core に monotonic counter、trusted persistent generation、rollback database、revocation list、external trusted anchor または server dependency を追加する方式は、stateless な Core 方針と v1 の責任境界を変更するため採用しない。Application の独自解釈または v1 の暗黙 migration も、attacker-controlled input に対する trust transition と責任を分散させるため採用しない。
- 影響: 将来 migration は将来 version の Requirements → Design → Specification で改めて定義し、現行 v1 の reject invariant を維持する。current-state selection、successful replacement の適用および historical rollback prevention は Application / persistence layer に引き継ぐ。Core の削除 guarantee は、Application が current Store として正しく選択した committed state と successful replacement の状態に限る。
- 見直し条件: 将来 version の migration を提供する上位 Requirements が承認された場合。

### 9.4 Design invariant と Implementation technique を分離する

- 判断: Requirements `SEC-023` に対応する side-channel property、secret lifetime、不要 retention、failure 後非残留および guarantee boundary を本書で定め、具体的な crypto / memory technique は下流へ委譲する。
- 根拠: Requirements `SEC-003`、`SEC-012`、`SEC-015`、`SEC-017`、`SEC-023` および Architecture の security invariant。
- 代替案: 特定の arithmetic、buffer、pointer、zeroize 手法を本書に固定する方式は、別の安全な実装方式を不必要に排除するため採用しない。
- 影響: 下流が具体方式を選択・検証できる一方、Core ownership、非開示、authorization、failure safety および side-channel intent は変更できない。
- 見直し条件: 上位 Requirements または Architecture が具体的な保証範囲を変更した場合。

## 10. 未決定事項と下流への引継ぎ

本書で確定した security responsibility、ownership、trust boundary、success / failure boundary、authorization boundary および invariant を、次のとおり下流へ引き継ぐ。

### Specification へ引き継ぐもの

- 初回 Mnemonic handoff の 6 段階、全新規生成への適用、restore の対象外化、確認前非 committed、失敗時非開示および既存状態保護
- explicit export の target、fresh な user intent、confirmed request、processing-unit authorization、対象外非返却および状態不変
- signing の Application approval、approval assertion freshness、Core authorization、Account / Software Key / Chain / Network compatibility および raw signing primitive の責任分界。Application が実際に提示・承認したことや assertion の freshness は Core が独立証明しない
- Store の version 識別、対応 version 限定、unsupported / unknown / corrupt / inconsistent reject、no fallback、no guessed interpretation、no implicit migration および existing state preservation。Core は stateless で valid historical Store の freshness / rollback を保証せず、current Store authority、replacement 適用および stale / historical Store の再適用防止は Application / persistence layer が担う
- Account / Chain / Network の固定関係、Core の compatibility reject、fallback / implicit conversion 禁止
- pending / partial の非 committed 性、stale 非昇格、failure / retry / restart の authorization・ownership・state invariant
- 全環境共通の secret non-disclosure、Binding non-authority、processing-unit authentication、user intent 分離および SEC-023 side-channel property とその保証外範囲

### Implementation / release verification へ引き継ぐもの

- SEC-023 に適合する side-channel risk 回避の具体的な crypto implementation と対象 target / compiler / dependency / runtime の保証確認。third-party cryptographic library、compiler、runtime、OS、browser、hardware および CPU microarchitecture の完全な side-channel absence は Core の保証外として扱う
- secret lifetime、unnecessary retention、zeroization、copy、allocator、FFI、pointer および ownership の具体的実現
- parser、validation、resource limit、error、fuzz、test、fixture および assembly / release verification の具体方式

### 本書で決めない事項

API / ABI、DTO、request field、callback / ACK、wire / schema、version identifier、error code、KDF、AEAD、nonce、salt、key length、署名対象 byte 列、derivation path、buffer type、copy count、free semantics、memory layout、zeroize API、timeout、UI、Browser 固有 API および保存先 API は本書で固定しない。Application / persistence layer における current Store の選択、replacement の適用、stale / historical Store の再適用防止および上位 rollback protection の具体方式も固定しない。Core に challenge、nonce、expiry、one-shot token、rollback counter または trusted anchor を追加する方式は v1 で採用しない。

## 11. Traceability と参照資料

### 11.1 上流・同一 Design・下流の対応

| 設計領域 | 上流根拠 | Architecture との対応 | Security Design の配置 |
| --- | --- | --- | --- |
| Core 継続 ownership と通常非開示 | Concept §1、§3、§7〜§10、Requirements §2.2〜§2.4、SEC-010、SEC-015、SEC-017、SEC-020 | Architecture §3.1〜§4.3、§5.1 | §3.2、§4、§5 |
| Profile / Mnemonic / Software Key / Account | Requirements §2.1、DR-001〜DR-007、FR-013、AC-013、AC-020 | Architecture §2.2、§5.1、§7 | §2.2、§5.1、§7 |
| Processing-unit authentication | Requirements FR-007、UC-005、SEC-002、SEC-007、SEC-014、AC-007、AC-027、AC-031 | Architecture §3.2、§4.1〜§4.3、§6.5 | §3.2、§6.1 |
| 初回 Mnemonic handoff | Requirements UC-001、FR-001、FR-019、SEC-010、SEC-017〜SEC-018、AC-001、AC-034 | Architecture §3.1、§4.3、§6.1 | §5.1、§6.2 |
| Explicit export と assertion freshness | Requirements UC-011、FR-022〜FR-023、SEC-010、SEC-021、AC-025〜AC-026、AC-041〜AC-043、AC-050 | Architecture §3.1、§4.3、§6.4〜§6.5 | §3.2、§5.1、§6.1、§6.3、§6.6 |
| Signing authority、user approval と assertion freshness | Requirements UC-006、FR-009、SEC-022、AC-009、AC-050 | Architecture §3、§5.1、§6.3、§6.5 | §3.1、§6.4、§7 |
| Store / version / migration / currentness boundary | Requirements FR-012、DR-009、SEC-004〜SEC-005、SEC-018、AC-012、AC-018、AC-045、AC-048 | Architecture §3.1、§3.3、§4.1、§4.3〜§4.4、§5.1〜§5.2、§6.2、§8、§9.3〜§9.4 | §3.2、§4、§5.1、§6.5 |
| Pending / failure / retry / restart | Requirements SEC-003、SEC-005、SEC-017〜SEC-019、AC-037〜AC-039、AC-046 | Architecture §5.3、§6.1〜§6.2、§6.5、§9.4 | §5.1、§5.2、§6.6 |
| Chain / Network separation | Requirements FR-013、FR-024、DR-005、AC-013、AC-047 | Architecture §5.1、§6.2、§7 | §6.4、§7 |
| Binding non-authority と全環境境界 | Requirements §2.2〜§2.4、NFR-001〜NFR-004、SEC-011〜SEC-012、AC-015、AC-024、AC-040、AC-043 | Architecture §3〜§4、§8、§9.1 | §3、§4、§8 |
| React Native JS/native boundary、artifact、secret flow、failure、sync resource evidence および host limitation | Requirements NFR-006〜NFR-015、SEC-011〜SEC-012、SEC-015、SEC-017、AC-051〜AC-061、UF-RN-001、DR-RN-001〜DR-RN-004 | Architecture §12.1〜§12.7 | Security §12.1〜§12.6 |
| Side-channel / memory guarantee boundary | Requirements SEC-003、SEC-012、SEC-015、SEC-017、SEC-023、AC-028、AC-032、AC-037、AC-049、§12.2〜§12.3 | Architecture §4.2、§8、§10 | §8.1〜§8.3、§9.4、§10 |

### 11.2 参照資料の役割

| 区分 | 資料 | 本書での扱い |
| --- | --- | --- |
| Normative upstream | [docs/consept/concept-sheet.md](../consept/concept-sheet.md)、[docs/requirements/requirements.md](../requirements/requirements.md) | 目的、範囲、責任、security property および受入条件の根拠 |
| 同一 Design の基準 | [docs/design/architecture.md](architecture.md) | Security responsibility、ownership、trust boundary、lifecycle および invariant の整合基準 |
| 同一 Design の関連資料 | [docs/design/bindings.md](bindings.md) | Binding non-authority、値・ownership 境界および環境差の整合確認先 |
| 下流正本・引継ぎ先 | [docs/specifications/specification.md](../specifications/specification.md)、[docs/specifications/wallet-store-format-v1.md](../specifications/wallet-store-format-v1.md) | 本書の invariant を具体 contract、保存形式、validation、error および crypto contract へ落とす先 |
| 履歴資料 | docs/reviews/ | 判断履歴。現行 Security Design の normative source ではない |

本書は Architecture の security responsibility を詳細化する Design 正本であり、上流を追加せず、Architecture を変更せず、Specification / Implementation の具体方式を先取りしない。

## 12. React Native security boundary

### 12.1 JS / native / Core の trust boundary

React Native は JavaScript engine、JSI / TurboModule adapter、Android / iOS native layer、internal Native C ABI および Rust Core の複数境界を持つ。境界が増えても、Core の secret ownership、processing-unit authentication、Store の opaque 性、explicit export、signing approval および failure safety の invariant は一つである。

```text
Application / UI
  ↓ public TypeScript facade（既存 16 operation）
private RN entry / resolver
  ↓
RN-private JSI / TurboModule adapter
  ↓
Android / iOS native loader・registration
  ↓
existing public C ABI contract
  ↓
Rust Wallet Core（secret / authorization authority）
```

JSI、TurboModule、Codegen、JNI、Swift / Objective-C++、RN-private adapter および C ABI は trust authority ではなく、transport / registration / ownership / error の境界である。RN-private adapter は existing public C ABI contract の semantics を再利用するが、新しい public C ABI surface、RN-only supported symbol または standalone C ABI release artifact を作らない。Application / UI は Core 外へ明示的に渡された handoff / export copy の保護を担うが、Core 管理下 secret の継続 owner、password authorization、signing authority または Store semantics にはならない。

### 12.2 React Native secret flow と guarantee boundary

既存の public API は password、Mnemonic import、private key import、opaque Store 等の入力を必要とするため、「secret が JS memory に一切存在しない」とは保証しない。保証する設計は、不要な copy、保持期間、文字列化、cache、log および authority の増加を防ぐことである。

| Secret / operation | JS / Application | RN native boundary | Core / security outcome |
| --- | --- | --- | --- |
| Profile password | 現行 operation の input として一時的に存在し得る。通常 object、global state、log、error へ複製しない | validated bytes を operation-local temporary / view として mediation し、success / failure / exception / cancellation の全経路で lifetime を終了する | Core が当該 operation の authorization にのみ使う。password cache、unlock session、previous authorization を持たない |
| Mnemonic handoff | 新規生成の初回 handoff の明示例外として、意図された利用者へ提示する copy が存在し得る | Core output を一時的に transport し、確認前に committed success へ昇格させない | Core 内原本は Core が継続所有。handoff 後の外部 copy は Application / user が保護する |
| Mnemonic import | 明示 import input として一時的に存在し得る。通常結果へ再出力しない | buffer view / temporary から Core へ渡し、binding が保持しない | restore / import / validation / persistence は Core が所有する |
| private key import | 明示 import input として一時的に存在し得る | bounded temporary で Core へ渡し、native cache を残さない | Software Key private key は Core が継続管理し、通常結果で返さない |
| private key export | explicit target、user request、confirmation および password が成立した成功時だけ output copy が存在し得る | Core output を新しい JS binary output へ移し、native temporary を release する | fail / target mismatch 時は secret を返さず、Core 外 copy の保護は Application / user の責任 |
| signing | payload と password が一時的に存在し得る。private key を JS output にしない | approved request の transport に限定し、private key / decrypted material の継続 copy を作らない | authorization、Chain / Network compatibility、private key use および signature は Core が所有する |
| Wallet Store blob | Application / persistence が current opaque bytes を所有する | bytes を opaque に渡し、Store history、Profile state、decrypted state を cache しない | Core が validity / integrity / replacement を判定し、Application が成功 replacement を current として保存する |

immutable DTO、unexpected object / proxy、detached / altered `Uint8Array` または exception によって secret copy が増えないよう、binding は validated snapshot / view を境界の単位とする。exact copy count、zero-copy、allocator、pointer、free、zeroization および JS engine の object lifetime は下流へ委譲する。JS GC、crash dump、OS swap、debugger、runtime、third-party dependency または compromised host の全 memory を消去する保証はしないが、その保証外を不要 retention の理由にしない。

RN adapter の serialization queue は secret cache ではない。password、Mnemonic、private key、decrypted material または plaintext Store を待機 item として長期保持せず、secret-bearing input は admission 後できるだけ遅く native materialize する。admission 前の cancellation / rejection、initialization failure、shutdown、exception または output conversion failure では queue descriptor と一時 native buffer を解放し、secret を error / diagnostic に含めない。JS call frame に自然に存在する copy と adapter が ownership を取得する copy を区別し、後者の lifetime は operation に限定する。

### 12.3 Buffer、error および fail-closed invariant

canonical binary model は JS `Uint8Array` とし、hex / Base64 / UTF-8 string への暗黙変換を設けない。input は caller-owned として扱い、native は call 中のみ有効な validated view または bounded owned temporary を用いる。Rust byte slice / owned buffer の lifetime は operation に限定し、output は native alias ではない新しい JS `Uint8Array` とする。入力 mutation、output alias、global native buffer、profile singleton および Store cache は禁止する。

Security-relevant error は次の原因領域を区別できなければならない。

- Core error: password authorization、Store validity、Chain / Network mismatch、Core operation reject
- binding conversion error: invalid DTO / bytes、detached / altered buffer、invalid output、ownership conversion failure
- native initialization / load error: registration、artifact、integrity、ABI / slice、required native state の failure
- unsupported runtime / platform: RN entry でない host、unsupported device / architecture、unsupported API / OS
- internal binding failure: invocation exception、unexpected result、allocation / release failure、reentrancy violation

これらの区別は Application が failure の原因領域を判断できるためのものであり、Core error の意味を RN error へ書き換えるためのものではない。exact error class、code、message、cause chain および secret-safe redaction は Specification へ委譲する。error / warning / diagnostic / log に password、Mnemonic、private key、Store plaintext または secret-derived representation を含めない。

次のどの failure も、RN native path を明示的に失敗させる。

| Failure | Security behavior |
| --- | --- |
| resolver mis-detection / RN module 未登録 | unsupported runtime / initialization failure。別 backend を選ばない |
| artifact missing / substitution / integrity failure | native library load failure。remote download、Node addon、WASM へ fallback しない |
| ABI / slice / device / architecture mismatch | unsupported platform / load failure。誤った binary の実行を試みない |
| initialization / invocation / reentrancy failure | internal binding / native failure。partial result、secret output、replacement を commit しない |
| invalid output / release failure / exception | binding failure。既存 committed state を成功として変更しない |
| cancellation / interruption | operation を未確定として終了し、authorization、secret、pending を次 operation へ持ち越さない |

RN が利用不能でも Browser / WASM や Node addon を成功 fallback にする設計は、runtime mis-detection、異なる security / performance boundary および unintended artifact の使用を隠すため採用しない。

### 12.4 Native artifact と追加 threat surface

RN 追加で明示的に threat model へ加える対象は次のとおりである。

| Threat surface | Design response |
| --- | --- |
| malformed、truncated、invalid-length、detached / altered typed array | Core invocation / state commit 前に binding validation。失敗を Core success に変換しない |
| unexpected object / proxy / getter side effect | accepted byte / DTO boundary を明確にし、意図しない object evaluation / conversion を成功条件にしない |
| JSI / TurboModule reentrancy と JS thread race | Core call 中の callback / public-facade re-entry を許さず、initialization / invocation state を operation 外へ漏らさない |
| C ABI pointer、length、alias、free および native lifetime | internal boundary で ownership / lifetime を検証し、exact mechanics は下流で検証する |
| native library substitution、artifact missing、ABI / slice mismatch | package-local artifact、allowlist / integrity / provenance、native load check および fail-closed を既存 native Node の lessons と整合させる |
| package resolver の RN / Node / Browser 競合 | dedicated private RN entry と unambiguous resolution。resolver failure は明示 error |
| error object、log、warning、crash-facing diagnostic | secret-safe error boundary。secret、plaintext Store および password を含めない |
| secret copy、immutable object、GC、crash dump、debugger | operation-local ownership、不要 copy / cache 禁止、ただし host-wide erasure は guarantee 外と明示 |
| native initialization race、concurrent invocation、same-Store mutation | process-wide RN binding coordination を全 RN domain の admission / serialization authority とし、runtime / module-registry と logical consumer context の local lifecycle をその配下で管理する。Core / C ABI の thread-safety を RN integration contract にせず、initialization、reentrancy および cleanup を binding boundary で検証し、current Store ordering は Application に残す |
| Android / iOS の background / foreground、scene 切替、teardown、process termination | lifecycle invalidation 後の新規 admission を止め、in-flight operation は完全な Core result と cleanup の両方が成立した場合だけ delivery する。中断・終了を partial state、stale result、継続 authorization または secret cache の成功へ変換しない |

RN artifact の trust chain は次で一意に定める。

```text
Git source revision
        ↓
controlled release build
        ↓
target-specific RN artifact
        ↓
target identity + package version + digest / provenance evidence
        ↓
approved npm package assembly
        ↓
published package
```

source revision と controlled release build / release evidence が trust authority である。Android は package / release assembly が expected target / ABI、package-approved artifact および digest / provenance relationship を検証した後に loader が使用し、runtime の毎回の cryptographic hash verification を必須にしない。iOS は package assembly、framework / archive composition、link input および release evidence の段階で expected target / slice、source、version および approved artifact を検証する。iOS static / integrated artifact は Android のような runtime load 前 verification ではなく、link / packaging boundary を verification point とする。

existing public C ABI release artifact と RN package-internal artifact は同一概念ではない。RN consumer は public C ABI artifact を別途 install せず、npm release chain で approved された RN artifact を利用する。RN-only internal symbol を public supported C ABI として宣言せず、既存 public C ABI compatibility semantics を RN private adapter が変更しない。missing、wrong target / ABI / slice、manifest mismatch、release evidence mismatch または unapproved artifact は fail closed とし、Node / WASM へ fallback しない。

concurrent invocation、reentrancy および same-Store mutation の authority は process-wide RN binding coordination に固定する。runtime / module-registry と logical consumer context の adapter はその配下で local lifecycle と ordering を管理し、Core / C ABI の thread-safety を条件に RN 側の並列実行を許可しない。v1 の read / mutation は process-wide に直列化し、serialization queue は secret-bearing input を保持せず、initialization / shutdown lifecycle と result cleanup を含む binding boundary で管理する。

Android の per-ABI artifact、iOS の device / simulator slice、static linkage first の推奨、および package-local distribution は `docs/design/bindings.md` と整合させる。既存 Node の package-local artifact verification と Browser の package-local WASM / no-remote-code policy を RN に再利用するが、release workflow や supply-chain model 自体は変更しない。

### 12.5 Statelessness、threading および side-channel boundary

RN Binding は Profile state、password authorization、decrypted secret、unlocked session、current Store、Store history または mutable Wallet Core singleton を保持しない。Core は既存の stateless opaque Store processor のまま、各 operation の input Store と operation-local secret を処理する。Application が current Store authority と mutation ordering を持ち、Binding は Store を merge、deduplicate、reorder、auto-retry または stale state として判定しない。

public synchronous API の synchrony と Rust Core の execution context は分離する。public sync は caller が return / throw を同期的に観測する contract であり、Core が JS runtime thread 上で直接実行されることを意味しない。native worker を使っても同期 wait が JS runtime thread を block するだけなら responsiveness の解決ではなく、同じ execution cost / resource evidence gate を適用する。Core operation 中の JS callback、UI re-entry、binding re-entry および callback 中の recursive invoke を禁止する。

process-wide RN binding coordination を v1 の Core invocation admission / concurrency / serialization / shared lifecycle authority とする。logical consumer context は一つの RN JS runtime と module registry に結び付いた local admission domain、runtime / module-registry scope は registration と runtime validity の domain であるが、いずれも process-wide coordinator を bypass しない。同一 process 内の複数 runtime、module registry、module instance および context からの全 invocation を process-wide coordination が受け付け、read / mutation、secret-capable operation および Store processing を含めて v1 では process-wide に一つずつ実行する。Core / C ABI の concurrent thread-safety または reentrancy を RN integration contract とせず、operation completion、output validation、temporary release および result delivery の可否判定後に次の Core invocation を開始する。initialization は process-wide single-flight または同等の一意な lifecycle、runtime-local shutdown / invalidation と process-wide teardown は別々の barrier とする。locking primitive、executor、queue、thread affinity、generation および memory ordering は Specification / Implementation へ委譲する。

process-wide shared state は、RN registration、native resource availability、admission barrier、in-flight lifecycle および context / runtime validity の coordination metadata に限定する。runtime-local state は registration、result delivery、local invalidation とし、logical consumer context-local state は ordering、reentrancy と request lifecycle に限定する。これらのいずれも Profile state、password/session/key cache、unlocked state、decrypted secret、mutable singleton または current Store cache ではない。runtime A の teardown、reload、module registry 再生成または cancellation は A の admission と A への delivery を停止するが、runtime B の生存中に shared resource を破棄しない。A の completion は process-wide と A の lifecycle が有効な場合だけ受け入れ、その他は stale result として破棄・cleanup する。shared native resource の load / initialization / integrity failureなど process-wide access safety を失う failure の場合だけ、coordinator は全 RN domain の新規 admission を止める。context-local failure は原則として他 context へ伝播させない。

serialization は password/session/key cache、unlocked state、decrypted secret、Profile state、mutable singleton または current Store cache を意味しない。v1 では read-only / independent operation も process-wide に並列化せず、same-Store mutation の current Store authority と replacement 適用順は Application に残す。queued secret を保持せず、failure、cancellation、exception、retry、restart 後に authorization / secret-capable state を継続しない。authority の依存方向は process-wide coordination → runtime / module-registry → logical consumer context → C ABI → Core とし、context-local coordination と process-wide coordination が相互に完了を待つ構造、または teardown が invalidated callback を待つ構造を要求しない。Core の cryptographic、private-key、Mnemonic、signature semantics、Wallet Store integrity、validation、zeroization authority は Rust Core に残る。

Requirements `SEC-023` の side-channel invariant は Core が所有する。RN binding は secret-dependent policy、authorization shortcut、別の timing-sensitive fallback または secret-derived branching を追加しない。JSI、native runtime、OS、compiler、third-party library、hardware、crash dump および host process 全体の完全な side-channel absence / memory erasure は保証外である。一方、binding が作る不要な secret-dependent conversion、copy、cache、log、fallback および継続 retention は設計上許可しない。

### 12.6 Security Design Decision Records

#### DDR-SEC-RN-001: JS/native boundary は Core authority にならない

- **Decision**: TurboModule / JSI、Android / iOS native layer および RN-private adapter による existing public C ABI contract の利用は、transport / lifecycle / conversion boundary に限定し、Core の security meaning を複製しない。
- **Alternatives considered**: RN adapter に password cache / authorization、Store processor、signing approval または key management を持たせる方式。
- **Rationale**: Core の単一 authority、全環境共通 policy および duplicate business logic 禁止を維持する。
- **Security implications**: boundary が増えても Core ownership、per-operation authorization、non-disclosure、failure safety が分岐しない。
- **Compatibility implications**: RN は既存 16 operation と DTO / error / binary semantics を再利用する。
- **Deferred details**: TurboModule / JSI / C ABI の exact contract、generated code、method、threading。

#### DDR-SEC-RN-002: secret は operation-local mediation に限定する

- **Decision**: `Uint8Array` input / output の必要な handoff、import、export、password および Store の mediation は許可するが、binding の継続 owner、cache、singleton または persistent secret state は作らない。
- **Alternatives considered**: secret を完全に JS 外へ隠す主張、shared mutable alias、global native cache、string / Base64 transport。
- **Rationale**: existing public API と host reality を満たしながら不要 copy / lifetime を減らす。
- **Security implications**: private key は通常 Core 内に留まり、explicit handoff / export だけが output 例外となる。host-wide erase は保証しない。
- **Compatibility implications**: existing binary model と sync operation semantics を維持する。
- **Deferred details**: copy count、zero-copy、allocator、zeroization、pointer / free、GC / crash behavior。

#### DDR-SEC-RN-003: infrastructure failure は別 backend に隠さない

- **Decision**: RN resolution、artifact、ABI、load、initialization、invocation、output および unsupported platform の failure を明示的に fail closed する。
- **Alternatives considered**: WASM / Node fallback、last-known backend、best-effort ABI selection。
- **Rationale**: NFR-010、NFR-014、artifact substitution 防止および security semantics の一貫性。
- **Security implications**: 意図しない backend、未検証 artifact、invalid output、partial state を成功として扱わない。
- **Compatibility implications**: RN consumer は supported native artifact と native project を正しく含める必要があり、Expo Go 等の固定 runtime は別途 support policy が必要。
- **Deferred details**: error mapping、manifest / digest、retry、loader、packaging。

#### DDR-SEC-RN-004: host compromise limitation を正しく引き継ぐ

- **Decision**: JS engine、OS、crash dump、debugger、GC、Application または host process の完全な compromise 防止・秘密消去は保証しない。ただし通常処理の non-disclosure、no unnecessary retention、authorization、fail-closed は維持する。
- **Alternatives considered**: RN native boundary を強い秘密隔離境界と主張する方式、または host compromise を理由に binding invariant を緩める方式。
- **Rationale**: Requirements と既存 Node / Browser guarantee boundary の整合。
- **Security implications**: guarantee 外を明示しつつ、不要な secret disclosure / cache / diagnostic を許さない。
- **Compatibility implications**: RN だけ異なる security promise や public API を追加しない。
- **Deferred details**: platform-specific secure memory capability、crash reporting、debug build policy、release verification。

#### DDR-SEC-RN-005: sync baseline と evidence gate

- **Decision**: existing synchronous public API を RN の baseline とし、bounded operation、reasonable worst-case、許容不能でない JS responsiveness、safe lifetime / cleanup および reentrancy 不在を prototype / benchmark / 実測で確認する。evidence が不足または不成立の場合、async 化または RN support exclusion を自動採用せず `NEEDS USER DECISION` とする。
- **Alternatives considered**: API parity のため無条件に JS blocking を受容、RN だけ Promise 化、native worker + synchronous wait を non-blocking とみなす。
- **Rationale**: API compatibility と safety / responsiveness / resource boundedness を同時に扱い、unsafe な同期性を隠さない。
- **Security implications**: unsafe timeout / interruption、長期 secret lifetime、partial result または exception cleanup 不備を API parity の理由に許可しない。
- **Compatibility implications**: async 化は対象 operation、影響範囲および compatibility impact を伴う public API change であり、user decision 前に semantics を変更しない。
- **Deferred details**: operation class、device、production-equivalent build、threshold、timeout / cancellation および measurement protocol。

#### DDR-SEC-RN-006: artifact trust chain と verification point

- **Decision**: RN artifact を source revision、controlled release build、target-specific artifact、target identity / digest / provenance evidence、approved npm assembly および published package へ bind する。Android は package / release assembly 検証後に load input とし、iOS は package / link / composition / release evidence を verification point とする。
- **Alternatives considered**: local artifact の自己申告、runtime download、毎回の runtime hash verification を唯一の trust anchor、RN artifact と standalone public C ABI artifact の同一視。
- **Rationale**: artifact bytes と source・version・platform・architecture・package inclusion の対応を追跡し、既存 supply-chain model を RN に接続する。
- **Security implications**: missing、wrong target / ABI / slice、digest / provenance / package mismatch および unapproved artifact は Node / WASM fallback なしで fail closed にする。
- **Compatibility implications**: RN consumer は published package の approved native artifact と対応 native project を利用する。既存 public C ABI、Node routing、Browser / WASM routing および release workflow の semantics は変更しない。
- **Deferred details**: manifest、digest、attestation、Android loader、iOS artifact composition、CI / release implementation および exact predicate。

## 13. RN security verification handoff

将来の検証は exact command を本書で固定せず、次の security property を実行可能な形で検証できるようにする。

- Android / iOS の実 consumer で 16 operation、DTO、binary、Core error と infrastructure failure の parity を確認する。
- malformed / truncated / invalid-length / detached / altered buffer、unexpected object / proxy、wrong Chain / Network、wrong password、invalid Store を secret operation / commit 前に reject することを確認する。
- missing / substituted artifact、integrity failure、ABI / slice mismatch、unsupported device / architecture、module unregistered、initialization / invocation / reentrancy failure が no-fallback で失敗することを確認する。
- password、Mnemonic、private key、decrypted material、Store plaintext が log、error、warning、diagnostic、cache、singleton、partial result に現れないことを確認する。
- failure、exception、cancellation、retry、restart および repeated / concurrent invocation で operation-local lifetime、authorization non-carry-over、stateless Store processing、same-Store ordering の責任分界を確認する。
- Potentially expensive operation について、代表的な Android / iOS device、production-equivalent native build、代表的な Store / input size および合理的な worst-case input class で execution cost、JS blocking、responsiveness、resource behavior、cancellation / interruption および failure cleanup を測定する。同期 baseline が成立しない evidence は対象 operation と compatibility impact を記録し、user decision 前に async semantics を導入しない。
- Node / Browser / Browser Extension の既存 routing、artifact verification、WASM non-regression、Node 22.x / 24.x support および release / supply-chain evidence が RN 追加で変わらないことを確認する。

exact test、fuzz、fixture、sanitizer、artifact filename、CI / release job および platform-specific inspection は下流へ委譲する。
