# 秘密情報・署名 Security 基本設計

## 1. 目的、対象、対象外

本書は、Wallet Core v1 における秘密情報の所有、trust boundary、認証・認可、署名権限、状態 lifecycle、失敗時責任および security invariant を定める基本設計である。確定済み Architecture の security responsibility を、Security Design として一意に下流へ引き継ぐ。

対象は、Desktop / Mobile / Web の Symbol / NEM ウォレットから利用する Rust Core、Native Binding、Web / WASM Binding およびそれらを取り巻く秘密情報の境界である。Web には Web Application と Browser Extension を含める。

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
利用者 ──確認・承認──> Application / UI ──> Native または Web / WASM Binding ──> Rust Core
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
| Desktop Application / Mobile Application | UI、利用者への表示、Account 選択、handoff、export、signing の確認・承認取得、opaque Store の保存・置換 | Core 管理下 secret の継続 owner、Core authorization または signing authority にはならない |
| Web Application / Browser Extension | Web 固有の UI / state、利用者確認、opaque Store の保存および Web 実行環境との連携 | Browser / host の安全性は別責任であり、Core の通常非開示 invariant を弱めない |
| Native Binding | Application と Core の間の値・ownership・lifecycle の橋渡し | Core の security decision、認証、暗号、導出、署名意味、Store 意味を代替しない |
| Web / WASM Binding | Web Application / Browser Extension と Core の間の値・ownership・lifecycle の橋渡し | JavaScript / Browser と同じ実行 context でも、Native と異なる secret policy を持たない |
| Rust Core | secret ownership、processing-unit authentication、Store validity、Chain / Network compatibility、signing primitive、成功状態の確定および失敗時保護 | 秘密情報とその security meaning の継続 owner。UI、Transaction 意味、host security を担わない |
| Browser | Web の実行環境およびその安全性 | Core の秘密情報隔離境界または host compromise 防止保証ではない |
| OS | Desktop / Mobile の実行環境およびその安全性 | Core の host compromise 防止保証ではない |
| host process | Application と Binding の実行・保持環境 | 侵害防止は Core の保証外。ただし Core / Binding の非開示責任は維持する |
| persistent storage | Application が選択する opaque Store の保存先 | Store の内部を解釈せず、Core の validity 判断を代替しない。読み込み値は attacker-controlled input になり得る |
| Transaction layer | Transaction の構築、内容の提示に必要な情報およびシリアライズ | Core の署名 authority、意味判断または利用者承認を代替しない |
| Network layer | REST、WebSocket、announce 等の通信 | Core の秘密情報管理、Chain / Network policy または署名承認を代替しない |

### 3.2 全環境共通 security invariant

Desktop、Mobile、Web、Native および Web / WASM のすべてで、次を共通に維持する。

- Mnemonic および Software Key 原本の継続的な secret owner は Core である。
- Application / Binding は input、初回 handoff または明示的 export の受渡しを一時的に mediation できるが、Core とは別の継続的な secret authority にならない。
- Core 管理下の secret は通常処理の結果として返さない。初回 Mnemonic handoff と条件を満たす個別 export の成功結果だけが明示的な例外である。
- Profile password authorization は Core が operation ごとに担う。Binding / Application は security decision、unlock session または authorization cache により代替しない。
- Application、Browser、OS または host process の compromise 自体を Core が防止する保証はない。
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

Core は UI を提供せず、利用者の intent を推測せず、Transaction を構築・説明・解釈せず、保存先の availability を所有しない。

### 4.2 Application / UI

Application / UI は次を担う。

- 利用者操作、公開情報の表示、Account の選択および利用者への提示
- 初回 Mnemonic handoff の提示と、利用者の明示的な受領確認の取得
- explicit export の対象表示、秘密情報取得要求の確認および確認済み request だけの送信
- signing payload / Transaction 内容の提示、利用者が確認できる状態の提供、明示的な signing approval の取得および approved request だけの送信
- Core が返す opaque Store の保存、置換、バックアップ、同期および端末間 transfer
- handoff / export により Core 外へ渡った秘密情報 copy の表示、保管、利用および紛失防止

Application / UI は Core 管理下の secret、signing authority、Profile password authorization または Store の内部意味の正本にならない。

### 4.3 Binding と依存方向

Binding は入力・出力の型変換、raw / opaque data の受渡し、ownership の橋渡しおよび error / warning の境界変換を担う。依存方向は次のとおりである。

~~~text
Application / UI → Native Binding または Web / WASM Binding → Rust Core
~~~

Binding は暗号、認証、Mnemonic validation、導出、署名、Store / pending の意味、Chain / Network policy、Transaction の意味または Wallet 固有の security policy を複製・補正しない。Native と Web / WASM の経路差は境界の transport / conversion に限定し、Core の ownership、authorization、公開範囲および failure policy を変更しない。

## 5. Protected assets、secret ownership および lifecycle

### 5.1 Protected asset model

| Protected asset | 継続的 security responsibility | 一時的な取扱い | 通常処理での公開可否 | Trust Boundary を越える明示例外 | failure / interruption 時の責任 | lifecycle 終了時の Design-level obligation |
| --- | --- | --- | --- | --- | --- | --- |
| Mnemonic | Core が root secret として生成、保持、利用、保護および破棄を管理 | Application / Binding は生成直後の handoff、取込みまたは利用者入力を必要範囲で mediation できるが、継続 owner にならない | 不可 | 初回 handoff、または条件を満たす個別 export の成功結果 | Core が未確定 Profile、通常結果、失敗結果または診断へ残さない。handoff / export 後の Core 外 copy は受領側が保護する | Core 内原本の責任は Core に残し、不要な継続保持・再利用・診断出力を許さない |
| Software Key private key | Core が Chain 固定の Software Key として保持、利用および破棄を管理 | Imported / Generated input、Derived key または署名処理の mediation は必要範囲に限る | 不可 | 条件を満たす対象 Software Key の個別 export の成功結果 | 登録・導出・署名・削除の失敗時に不完全状態、通常結果または診断へ残さない | 削除後に Core の署名、導出、登録その他の秘密処理へ再利用しない |
| derived secret / decrypted secret material | Core が必要な処理中だけ security responsibility を持つ | 導出、復号、署名、保存更新等の処理に限定する | 不可 | 通常の明示 export の対象そのものとして仕様上許可される場合を除き不可 | pending、cache、診断または通常利用可能状態へ残さない | 目的の処理が終了または失敗した後、継続利用可能な状態として保持しない |
| Profile password | Core が各 operation の authorization を担う。password を継続保存・cache しない | 利用者、Application または Binding が入力を一時的に mediation できる | Core から返さない。診断・結果にも含めない | authorization のために要求された operation へ入力する場合のみ | 認証失敗・中断時に authorization を成立させず、以前の結果を再利用しない | operation の authorization 終了後に、次 operation の権限または継続 Unlocked state として残さない |
| temporary secret | 生成・利用した処理に対する Core の security responsibility。Binding は自身の境界内の一時値を管理する | handoff、導出、復号、署名、export 等の必要範囲だけ | 不可 | 明示 handoff / export の成功結果に含まれる対象 secret のみ | failure、interruption、retry または restart 後に通常利用可能状態、cache、診断へ残さない | Core / Binding が自身の責任範囲で lifecycle 終了を扱い、継続 owner や永続 copy を作らない |
| Core 管理下 Wallet Store | Core が logical state、version、validity、integrity、consistency および秘密情報保護を管理 | Application が opaque blob を保存・転送・置換する | 内部 secret または復元可能表現を通常結果・診断へ出さない | Core が成功した replacement を Application が opaque に保存する場合のみ | reject / 保存失敗時に existing committed state を維持し、未対応入力を正常な secret として扱わない | Core の committed state として確定した値だけを正本とし、Application の独自解釈・編集を許さない |
| signing authority | Core が指定 Account / Software Key に対応する署名能力を管理 | Application が Account と signing request を選択・提示し、Binding が受渡しを mediation する | private key を公開せず、通常結果は署名結果に限定する | Core が authorization、compatibility、承認済み request の条件を満たして署名結果を返す場合 | account / chain / network 不整合、認証失敗または署名失敗時に署名能力・秘密鍵・既存状態を変更しない | Software Key / Profile の削除後に signing authority を再利用しない |
| pending / partial state に含まれ得る秘密情報 | Core が security meaning、success promotion 条件および失敗時の扱いを管理 | Application / Binding は未確定値を受渡し・保存する場合も opaque に扱う | committed state、通常結果または診断として公開しない | 成功境界を満たした後に Core が committed state として確定する場合のみ | stale / unconfirmed state を自動昇格せず、failure / interruption / restart 後に秘密情報を通常利用可能にしない | 未確定状態を次 operation の authorization、秘密情報または committed state として再利用しない |

Mnemonic / Software Key の原本について、Application / Binding の input、initial handoff、explicit export による一時的 mediation は ownership の移転ではない。明示的に Core 外へ渡された copy の保護責任は受領側へ移るが、Core 内原本の継続責任は Core に残る。

具体的な buffer type、copy count、stack / heap、zeroize API、pointer、memory lifetime は本表では決めない。

### 5.2 共通 lifecycle 原則

generation、restoration、import、derivation、use、signing、persistence、replacement、deletion のすべてで、secret の security meaning と owner を Core から外さない。成功時だけ対象の全体結果を committed state とし、failure / interruption 時は既存の committed state、Profile isolation および authorization boundary を維持する。

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

Core は operation ごとに Profile password を認証し、authorization をその operation だけに有効とする。次の operation へ持ち越さない。Core に継続 Unlocked state を持たせず、Binding は unlock session / authorization cache を作らず、Application は Core の代替 unlock session を保持しない。previous authentication result を次の operation の authorization として使わない。retry は再認証であり、restart 後に authorization state を継続しない。

具体的な token、session API、password の memory representation は下流へ委譲する。authorization の責任主体と持続範囲は下流の方式によって変更できない。

### 6.2 初回 Mnemonic handoff

利用者が初回バックアップを明示的に要求した新規 Mnemonic 生成経路では、次の 6 段階を handoff の成功境界とする。

1. Core が完全な Mnemonic を生成する。
2. Core が意図された Application へ完全な Mnemonic を渡す。
3. Application が意図した利用者へ Mnemonic を提示する。
4. 利用者が Mnemonic を受領したことを明示的に確認する。
5. Application が確認成立を Core へ伝える。
6. Core がその後だけ Profile 作成を成功状態として最終確定する。

Mnemonic の生成、Core 内での一時保持、Binding の通過、Application の受領または Application の呼出しだけでは Profile success にならない。利用者確認前は committed Profile ではなく、正常 Profile として利用できない。

受領不能、提示不能、利用者の拒否・未確認、Application から Core への確認伝達不能、handoff の中断または最終確定失敗では、Core は partial Profile を成功状態として残さず、stale / unconfirmed state を自動昇格させず、Mnemonic を通常結果、失敗結果または診断へ漏らさない。既存の committed state は壊さない。

Core は UI を担当せず、利用者が紙・外部媒体へ保存したことまたは将来紛失しないことを独立検証しない。handoff 後の Core 内 Mnemonic 原本は Core が継続管理し、Core 外 copy の表示・保管・紛失防止は Application / 利用者が担う。callback、ACK、Pending Profile、transport および具体的な確認表現は下流へ委譲する。

### 6.3 Explicit secret export

Mnemonic および Software Key private key の export は、通常処理とは別の security-sensitive operation とする。

#### Application / UI と利用者

- export 対象を明示する。
- 利用者が秘密情報取得を明示的に要求したことを確認する。
- Application / UI が user intent を確認し、confirmed request だけを Core へ送る。

#### Core

- 対象 Profile または対象 Profile / Software Key を解決する。
- 当該 export operation の Profile password authorization を行う。
- target、user intent、confirmed request および authorization が成立した場合だけ対象 secret を返す。
- UI を持たず、user intent を推測せず、通常処理から暗黙に export へ遷移せず、対象外 secret を返さない。

**Profile password authorization != user intent confirmation** である。password が正しいこと、Application が password を保持していること、または通常 operation が成功したことだけでは export の成立条件にならない。

成功時も Core 内原本の継続 owner は Core であり、Core 外 copy の表示・保管・利用・紛失防止は Application / 利用者の責任である。誤認証、意思確認のない要求、対象不存在または処理失敗時は secret を返さず、Profile / Store を変更しない。具体的な UI、request field、export buffer および受渡し方式は下流へ委譲する。

### 6.4 Signing authority と利用者承認

#### Application / UI と利用者

- 利用する Account を選択する。
- signing payload / Transaction 内容を利用者へ提示する。
- 利用者が内容を確認可能な状態を提供する。
- 利用者から明示的な signing approval を得る。
- approved request だけを Core へ送信する。

#### Core

- signing operation の Profile password authorization を行う。
- Account、Software Key、Chain および Network の compatibility を検証する。
- 対応する private key を利用して signing primitive を実行する。
- 署名結果を返す。

**Profile password authorization != signing approval** である。Core は Transaction の意味判断、内容説明、UI、user intent の推測または Transaction 構築を担わない。ただし raw payload に対する signing primitive であることは、Application が利用者承認なしに任意 payload を Core へ送ってよいことを意味しない。Application の明示承認と Core の password authorization は、それぞれの責任境界で成立しなければならない。

### 6.5 Store security、version および migration

Wallet Store は attacker-controlled input になり得る境界として扱う。

Core は、Store / Profile version を識別し、validity、integrity および consistency を検証する。v1 は明示的に対応する version だけを処理する。unsupported version、unknown version、corrupt data、不整合 data および安全に対応できない data は fail-closed に reject する。Core は意味を推測せず、別 version と読み替えず、fallback、黙った解釈・無視または implicit migration を行わない。reject された data から秘密情報処理を成功させない。

reject / failure 時は既存の committed state を変更せず、secret を外へ返さず、reject data を正常な秘密情報として扱わない。Application / Binding は Store を opaque として保存・転送するだけであり、内部を独自解釈・編集せず、unsupported version を v1 と読み替えず、Core の Store security policy を代替しない。

v1 は Store / Profile version migration を提供しない。将来 migration を提供する場合は、将来 version の Requirements → Design → Specification で source / target、明示的な開始、成功境界、失敗時の existing committed state 不変および秘密情報非開示を改めて定義する。具体的な parser、serialization、field、version 表現、error および migration 手順は下流へ委譲する。

### 6.6 Pending / partial、failure、retry および restart

Pending / partial state は committed state ではない。Core がその security meaning と success promotion 条件を所有し、Application は Core が成功確定していない状態を committed Profile / Software Key として扱わず、Binding はその意味・authorization policy を変更しない。stale / unconfirmed state を自動的に成功状態へ昇格させない。

failure または interruption の後は、次を維持する。

- existing committed state を保護する。
- secret ownership、Profile isolation および authorization boundary を変更しない。
- temporary / decrypted secret を通常利用可能状態、diagnostic または cache に残さない。
- partial Profile、partial Software Key または未保存 replacement を成功状態として扱わない。

retry は新しい operation とする。必要な Store、入力、利用者確認および Profile password authorization を再提供・再取得し、previous authentication result、stale pending または temporary secret を次 operation の authorization として再利用しない。

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

- secret-dependent behavior による不要な timing / side-channel exposure を避ける責任を持つ。
- secret-dependent control flow、memory access その他の処理形状が side-channel risk を生む可能性を Implementation で考慮する。
- cryptographic secret handling の side-channel responsibility は Core 実装にある。Binding は Core の responsibility を代替しない。
- Design が保証する security intent と、compiler、target、dependency、runtime、OS、host process 等の保証外範囲を区別する。
- Specification、Implementation および release verification は、本書の side-channel invariant と保証境界を受け取り、具体的な検証責任を定める。
- 単純な wall-clock threshold だけを security guarantee の唯一の根拠にしない。

特定の関数、byte-array arithmetic、固定 loop、mask、carry / borrow、intermediate value、stack / register、machine code または assembly inspection の具体方式は本書で固定しない。

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

- 判断: handoff の受領確認、explicit export の取得要求および signing approval は Application / UI と利用者、Profile password authorization と secret use は Core の責任とする。
- 根拠: Requirements の handoff、explicit export、signing approval および processing-unit authentication、Architecture の user intent / authorization boundary。
- 代替案: password 所有だけで利用者意思を推定する方式、または Core が UI / 人間の行動を独立検証する方式は、責任境界を混同するため採用しない。
- 影響: export と signing の両方で、利用者側の確認と Core 側の authorization を別々に引き継げる。
- 見直し条件: 利用者確認または Core authorization の責任を変更する上位 Requirements が承認された場合。

### 9.3 Store を opaque とし、v1 migration を提供しない

- 判断: Core が Store security responsibility と reject policy を所有し、Application / Binding は opaque data を保存・転送する。v1 は version migration を提供しない。
- 根拠: Requirements の Store version、fail-closed、no fallback、no guessed interpretation、no implicit migration および existing state preservation、Architecture の Store boundary。
- 代替案: Application の独自解釈または v1 の暗黙 migration は、attacker-controlled input に対する trust transition と責任を分散させるため採用しない。
- 影響: 将来 migration は将来 version の Requirements → Design → Specification で改めて定義し、現行 v1 の reject invariant を維持する。
- 見直し条件: 将来 version の migration を提供する上位 Requirements が承認された場合。

### 9.4 Design invariant と Implementation technique を分離する

- 判断: side-channel、secret lifetime、不要 retention、failure 後非残留および guarantee boundary を本書で定め、具体的な crypto / memory technique は下流へ委譲する。
- 根拠: Requirements の下流委譲および Architecture の security invariant。
- 代替案: 特定の arithmetic、buffer、pointer、zeroize 手法を本書に固定する方式は、別の安全な実装方式を不必要に排除するため採用しない。
- 影響: 下流が具体方式を選択・検証できる一方、Core ownership、非開示、authorization、failure safety および side-channel intent は変更できない。
- 見直し条件: 上位 Requirements または Architecture が具体的な保証範囲を変更した場合。

## 10. 未決定事項と下流への引継ぎ

本書で確定した security responsibility、ownership、trust boundary、success / failure boundary、authorization boundary および invariant を、次のとおり下流へ引き継ぐ。

### Specification へ引き継ぐもの

- 初回 Mnemonic handoff の 6 段階、確認前非 committed、失敗時非開示および既存状態保護
- explicit export の target、user intent、confirmed request、processing-unit authorization、対象外非返却および状態不変
- signing の Application approval、Core authorization、Account / Software Key / Chain / Network compatibility および raw signing primitive の責任分界
- Store の version 識別、対応 version 限定、unsupported / unknown / corrupt / inconsistent reject、no fallback、no guessed interpretation、no implicit migration および existing state preservation
- Account / Chain / Network の固定関係、Core の compatibility reject、fallback / implicit conversion 禁止
- pending / partial の非 committed 性、stale 非昇格、failure / retry / restart の authorization・ownership・state invariant
- 全環境共通の secret non-disclosure、Binding non-authority、processing-unit authentication および user intent 分離

### Implementation / release verification へ引き継ぐもの

- side-channel risk を避ける具体的な crypto implementation と対象 target / compiler / dependency / runtime の保証確認
- secret lifetime、unnecessary retention、zeroization、copy、allocator、FFI、pointer および ownership の具体的実現
- parser、validation、resource limit、error、fuzz、test、fixture および assembly / release verification の具体方式

### 本書で決めない事項

API / ABI、DTO、request field、callback / ACK、wire / schema、version identifier、error code、KDF、AEAD、nonce、salt、key length、署名対象 byte 列、derivation path、buffer type、copy count、free semantics、memory layout、zeroize API、timeout、rollback、UI、Browser 固有 API および保存先 API は本書で固定しない。

## 11. Traceability と参照資料

### 11.1 上流・同一 Design・下流の対応

| 設計領域 | 上流根拠 | Architecture との対応 | Security Design の配置 |
| --- | --- | --- | --- |
| Core 継続 ownership と通常非開示 | Concept §1、§3、§7〜§10、Requirements §2.2〜§2.4、SEC-010、SEC-015、SEC-017、SEC-020 | Architecture §3.1〜§4.3、§5.1 | §3.2、§4、§5 |
| Profile / Mnemonic / Software Key / Account | Requirements §2.1、DR-001〜DR-007、FR-013、AC-013、AC-020 | Architecture §2.2、§5.1、§7 | §2.2、§5.1、§7 |
| Processing-unit authentication | Requirements FR-007、UC-005、SEC-002、SEC-007、SEC-014、AC-007、AC-027、AC-031 | Architecture §3.2、§4.1〜§4.3、§6.5 | §3.2、§6.1 |
| 初回 Mnemonic handoff | Requirements UC-001、FR-001、FR-019、SEC-010、SEC-017〜SEC-018、AC-001、AC-034 | Architecture §3.1、§4.3、§6.1 | §5.1、§6.2 |
| Explicit export | Requirements UC-011、FR-022〜FR-023、SEC-010、SEC-021、AC-025〜AC-026、AC-041〜AC-043 | Architecture §3.1、§4.3、§6.4 | §3.2、§5.1、§6.3 |
| Signing authority と user approval | Requirements UC-006、FR-009、SEC-022、AC-009 | Architecture §3、§5.1、§6.3 | §3.1、§6.4、§7 |
| Store / version / migration | Requirements DR-009、SEC-004、SEC-018、AC-018、AC-045 | Architecture §5.2、§6.2、§8、§9.3 | §5.1、§6.5 |
| Pending / failure / retry / restart | Requirements SEC-003、SEC-005、SEC-017〜SEC-019、AC-037〜AC-039、AC-046 | Architecture §5.3、§6.1〜§6.2、§6.5、§9.4 | §5.1、§5.2、§6.6 |
| Chain / Network separation | Requirements FR-013、FR-024、DR-005、AC-013、AC-047 | Architecture §5.1、§6.2、§7 | §6.4、§7 |
| Binding non-authority と全環境境界 | Requirements §2.2〜§2.4、NFR-001〜NFR-004、SEC-011〜SEC-012、AC-015、AC-024、AC-040、AC-043 | Architecture §3〜§4、§8、§9.1 | §3、§4、§8 |
| Side-channel / memory guarantee boundary | Requirements SEC-003、SEC-012、SEC-015、SEC-017、AC-028、AC-032、AC-037、§12.2〜§12.3 | Architecture §4.2、§8、§10 | §8、§9.4、§10 |

### 11.2 参照資料の役割

| 区分 | 資料 | 本書での扱い |
| --- | --- | --- |
| Normative upstream | [docs/consept/concept-sheet.md](../consept/concept-sheet.md)、[docs/requirements/requirements.md](../requirements/requirements.md) | 目的、範囲、責任、security property および受入条件の根拠 |
| 同一 Design の基準 | [docs/design/architecture.md](architecture.md) | Security responsibility、ownership、trust boundary、lifecycle および invariant の整合基準 |
| 同一 Design の関連資料 | [docs/design/bindings.md](bindings.md) | Binding non-authority、値・ownership 境界および環境差の整合確認先 |
| 下流正本・引継ぎ先 | [docs/specifications/specification.md](../specifications/specification.md)、[docs/specifications/wallet-store-format-v1.md](../specifications/wallet-store-format-v1.md) | 本書の invariant を具体 contract、保存形式、validation、error および crypto contract へ落とす先 |
| 履歴資料 | docs/reviews/ | 判断履歴。現行 Security Design の normative source ではない |

本書は Architecture の security responsibility を詳細化する Design 正本であり、上流を追加せず、Architecture を変更せず、Specification / Implementation の具体方式を先取りしない。
