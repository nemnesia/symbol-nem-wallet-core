# React Native Binding / Platform Specification v1

## 1. 位置づけ、適用範囲および規範語

本書は、`@nemnesia/symbol-nem-wallet-core` の React Native Android / iOS 対応について、
承認済み Requirements、Design および Platform Baseline を実装・検証可能な外部契約へ
具体化する canonical Specification である。対象は次の単一経路である。

```text
TypeScript public facade
  → private React Native entry
  → TurboModule / JSI adapter
  → Android / iOS thin native layer
  → existing public C ABI contract
  → Rust Wallet Core
```

本書は、既存の公開 TypeScript facade、Core の cryptography / validation / authorization、
Wallet Store Format、既存 Node / Browser / WASM routing および既存 release / supply-chain
policy を再定義しない。共通契約は次を正本として参照する。

- [`specification.md`](specification.md): Rust Core、公開 operation、Core error、共通 C ABI、
  secret lifecycle、security および parity 契約
- [`npm-typescript-facade.md`](npm-typescript-facade.md): single npm package、公開 TypeScript
  declaration、DTO、conditional exports、Node / Browser routing、Node artifact および WASM
  契約
- [`wallet-store-format-v1.md`](wallet-store-format-v1.md): Wallet Store wire format、version、
  size、deterministic serialization および integrity

Normative terms are used as follows.

- **MUST**: 実装、package assembly または supported consumer が満たさなければならない契約
- **MUST NOT**: 実装、package assembly または consumer が行ってはならないこと
- **SHOULD**: 互換性を変えずに満たすべき契約。満たせない場合は evidence に理由を残す
- **MAY**: 外部可視契約を変えない範囲で許可される実装上の選択

### 1.1 適用する承認入力

本書は、Requirements Review `docs/reviews/requirements/requirements-review-010.md` の
`READY`、Design Review `docs/reviews/design/react-native-design-review-003.md` の
`READY`、および [`react-native-platform-baseline.md`](../decisions/react-native-platform-baseline.md)
の `PD-RN-001`〜`PD-RN-007 = APPROVED` を入力とする。

Platform Baseline は次であり、本書は後続の正式承認なしに変更してはならない。

| 項目                      | v1 の確定値                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| React Native              | `>= 0.86.x`。`0.87.x` を primary validation line。stable のみ                                                       |
| Android                   | `minSdk = 24`。formal ABI は `arm64-v8a`、`x86_64`                                                                  |
| Bare RN iOS               | iOS `15.1+`                                                                                                         |
| Expo subset               | Expo SDK `57` stable + RN `0.86.x`。iOS `16.4+`、Android は approved Android baseline                               |
| iOS architecture          | device `arm64`、Apple Silicon simulator `arm64`                                                                     |
| React Native architecture | New Architecture mandatory                                                                                          |
| Native integration        | TurboModule / JSI required。Legacy Architecture / Bridge は unsupported                                             |
| Expo                      | Bare RN、Development Build、Prebuild / CNG、custom native module workflow を formal support。Expo Go は unsupported |

`>= 0.86.x` は minimum compatibility floor であり、将来の RN minor line を無期限または自動的に
formal support する wildcard ではない。v1 の formal RN support window は、stable patch release を
含む `0.86.x`（compatibility verification line）および `0.87.x`（primary validation line）だけである。
`0.88.x` 以降または表に列挙されていない minor line は、stable であっても Specification と
release / CI matrix が更新されるまで unsupported とする。canary、nightly、`next` はこの window
に含めない。

次のいずれかが発生した場合、次の support claim または release gate の前に support window の
re-baseline を行う。

- 新しい stable RN minor line を formal support に追加する場合
- formal window 内の line が upstream で End of Cycle / Unsupported になった場合、または security / native compatibility を維持できなくなった場合
- RN version、Codegen、New Architecture または native toolchain の変更により、既存 line の互換性根拠が失われた場合

re-baseline は primary / compatibility line、Expo compatibility pair、CI / release evidence の
対象を同時に更新するまで有効な support claim とみなさない。re-baseline 前に未列挙 line を
formal support として扱ったり、既存 line の status 変更を無視したりしてはならない。これは
新しい platform choice を追加する判断ではなく、`PD-RN-001` の approved baseline を維持するための
Specification / release gate である。

### 1.2 対象外と責任境界

RN binding は transport、conversion、runtime registration、native artifact load、lifecycle、
concurrency coordination および error propagation だけを担う。次を RN binding に実装・
移転してはならない。

- cryptography、Mnemonic / seed / key derivation、private key handling、signing semantics
- Profile password authorization、confirmation / approval の生成または freshness 判定
- Wallet Store の decode、migration、current Store 選択、rollback 判定または意味編集
- secret cache、unlocked session、Profile state、current Store cache または Wallet Core singleton
- RN consumer が直接呼び出す C ABI、JNI、Swift / Objective-C binding、TurboModule object、JSI host object

Rust Core は cryptography、private key、Mnemonic、signature semantics、Wallet Store integrity、
validation、authorization、zeroization および secret lifecycle の authority であり続ける。
Application は Core が返す opaque Store の current Store としての保存・置換、利用者への表示・
確認・承認および Core 外へ渡った secret copy の管理を担う。

## 2. Public API と data representation

### 2.1 Public TypeScript surface

RN は [`npm-typescript-facade.md`](npm-typescript-facade.md) §3〜§8 の public surface をそのまま
実装する。root package の named function は既存の次の 16 個だけであり、RN のために追加しない。

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

引数順、return type、DTO の required field、`null` / `undefined`、warning、replacement Store、
`AccountContext`、confirmation、approval、export request および 18 個の Core `ErrorCode` は
既存 facade 仕様と完全に一致させる。RN だけの `Promise` variant、backend selector、native
handle、`AbortSignal`、secret export または DTO variant を追加しない。

`MutationResult<null>.value` は成功時の JavaScript `null`、optional な `key_id` は absent または
`undefined`、それ以外の declaration field は required である。RN にだけ異なる `null` / `undefined`
または output shape を認めない。

### 2.2 Binary

公開 binary はすべて `Uint8Array` とする。RN では `Buffer`、`ArrayBuffer`、`SharedArrayBuffer`、
`DataView`、Base64、hex または secret の JavaScript string を public representation として受け付けない。

| public field                          | representation | RN contract                                                               |
| ------------------------------------- | -------------- | ------------------------------------------------------------------------- |
| `store`, `pending_profile`, `payload` | `Uint8Array`   | opaque bytes。binding は decode / edit / normalize しない                 |
| `password_utf8`, `mnemonic_utf8`      | `Uint8Array`   | strict UTF-8 bytes。NUL terminator を使わず、bytes を Core へそのまま渡す |
| `private_key`                         | `Uint8Array`   | raw 32 bytes。text encoding は受け付けない                                |
| `public_key`                          | `Uint8Array`   | raw 32 bytes                                                              |
| `signature`                           | `Uint8Array`   | raw 64 bytes                                                              |

入力は caller-owned であり、RN binding は入力 buffer の ownership を取得しない。返却 binary は
Core buffer の alias ではない新しい caller-visible `Uint8Array` とする。secret-containing output の
JS copy を完全に zeroize する保証はしないが、binding は cache、log、warning、exception detail、
global state または component state に保持してはならない。Application は受け取った secret copy を
利用後速やかに上書きし参照を破棄する。

### 2.3 TypeScript facade の同期契約

16 operation の public function は、呼出し開始から成功値の return または error の throw までを
同期呼出しとして観測できなければならない。return type は `Promise` を含まず、RN における
`await`、callback または event delivery は契約ではない。

public synchrony は Core が JS runtime thread 上で直接実行されることを意味しない。native worker、
platform executor または別の native execution context を使うことは MAY だが、public call が
completion まで同期 wait する場合、その wait は synchronous call の一部であり、JS thread を
block しないと宣言してはならない。

初期化前、runtime invalidation 後、process-wide teardown 中、native artifact 不在または integrity
failure の場合は、成功値を返さず同期的に既存の `BackendInitializationError` または
`WalletCoreError(code = "BindingFailure")` を報告する。RN backend が利用不能な場合に WASM / Node
へ移って同期契約を見かけ上維持してはならない。

## 3. Runtime selection と package entry

### 3.1 Selection authority

runtime selection の authority は package `exports` の conditional resolution と、RN private
entry における native module registration の存在である。`process`, `window`, `navigator`、user agent、
`Platform.OS`、`global.nativeCallSyncHook` その他の brittle heuristic を backend selection の
authority として組み合わせない。

selection は次の exact order とする。

| environment                 | exports condition / entry | backend                             | failure policy                                                                             |
| --------------------------- | ------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Node.js normal              | `node-addons`             | existing Node native adapter        | existing Node target lookup。許可された target 不在だけ package-local WASM へ明示 fallback |
| Node.js `--no-addons`       | `default`                 | existing package-local WASM adapter | WASM initialization failure は `BackendInitializationError`                                |
| Browser / Browser Extension | `default`                 | existing package-local WASM adapter | Node / RN native へ進まない                                                                |
| React Native Android / iOS  | `react-native`            | RN private entry + native binding   | native module / artifact failure は fail closed。Node / WASM fallback なし                 |

`react-native` condition は Node / Browser condition より RN entry を優先するための resolver
contract であり、application-facing public API ではない。RN web やその他の non-native host で
RN condition が選ばれた場合でも、registered native module がなければ initialization failure
として失敗し、WASM へ fallback しない。Node が明示的な custom condition で RN entry を強制した
場合も同じ fail-closed policy を適用する。

Node の既存 target fallback は `npm-typescript-facade.md` §10.2 の場合だけ許可する。RN の
initialization error、operation error、C ABI error、conversion error、secret export failure または
signing failure を別 backend で再試行してはならない。

### 3.2 Private entry placement and resolution

package root の exact conditional exports object は [`npm-typescript-facade.md`](npm-typescript-facade.md)
§9.1 を正本とする。RN に関する追加条件は、root object の `types` の後、`node-addons` および
`default` の前に `"react-native": "./dist/react-native/index.js"` を置くことである。これにより
Metro の native resolution が `react-native` entry を選べる。

`dist/react-native/index.js` は package-private bootstrap entry である。`@nemnesia/symbol-nem-wallet-core/react-native`、`/node`、`/wasm`、`/native`、raw `.node`、raw `.wasm`、C ABI、TurboModule object、JSI object および internal manifest は `exports` の public subpath として列挙しない。package root の型解決は常に `dist/index.d.ts` へ向き、RN 専用 declaration file を作らない。

Metro / RN bundling は package `exports` を有効にし、native platform で `react-native` condition
を解決できなければならない。`react-native` condition の選択は package resolver の責任であり、
application が backend selector を渡す方式にしてはならない。Expo / Prebuild の resolver 設定が
package exports を無効化または別 entry を強制する場合は supported integration ではなく、build または
initialization failure とする。

`react-native` entry は registered New Architecture TurboModule / JSI provider を同期的に取得し、
module registration、native capability、artifact identity および process coordinator を初期化する。
provider 不在、legacy bridge だけの登録、provider の型不一致または initialization failure は
`BackendInitializationError` とする。bootstrap は Node native addon、WASM asset、network download、
runtime-generated native code を読み込まない。

## 4. RN operation execution contract

### 4.1 Admission と result delivery

すべての RN invocation は、同じ process-wide coordinator の admission、Core / C ABI execution、
output validation、temporary cleanup および delivery eligibility check をこの順で通過する。

```text
public call
  → non-secret argument shape check
  → runtime / context validity check
  → process-wide admission ticket
  → secret conversion and C ABI materialization
  → one Core / C ABI invocation
  → output validation and C ABI release
  → runtime / context / request identity check
  → synchronous return or throw
```

admission wait は同期 public call の一部である。先行 invocation が完了し、output の validation と
cleanup が終わるまで次の Core / C ABI invocation を開始しない。実装が wait を native worker へ
移した場合でも、caller が同期 return を待つなら JS blocking / responsiveness evidence の対象とする。

成功時だけ既存 facade の result を返す。mutation の replacement Store は `MutationResult.store`
として一度だけ返し、binding が current Store として保存・適用しない。failure、stale、cancelled、
teardown または output conversion failure の場合は success DTO、secret、signature、pending または
replacement Store を返さず、temporary を cleanup する。

### 4.2 Operation classification

分類は経過時間の固定 threshold ではなく、operation が要求する Core step、secret lifetime、Store
mutation および evidence の種類で決める。実測結果だけで operation の classification を変更しない。
class は速度、JS thread の non-blocking または AC-061 の適用除外を保証するものではない。

| operation                    | class                                  | serialization scope         | cancellation relevance                                     | cleanup requirement                                   | evidence                              |
| ---------------------------- | -------------------------------------- | --------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| `create_empty_store`         | C0: bounded direct                     | process-wide RN coordinator | admission / teardown のみ                                  | output buffer、request metadata                       | parity / lifecycle / blocking         |
| `prepare_generated_profile`  | C2: potentially expensive secret / KDF | process-wide                | admission 前は取り消し可能。Core 開始後は forced stop 不可 | mnemonic、pending、KDF temporary                      | AC-061 execution / resource / cleanup |
| `finalize_generated_profile` | C2: KDF / Store mutation               | process-wide                | 同上                                                       | password、pending、decrypted data、replacement        | AC-061 + Store parity                 |
| `restore_profile`            | C2: mnemonic / KDF / Store mutation    | process-wide                | 同上                                                       | mnemonic、password、seed、replacement                 | AC-061 + restore parity               |
| `list_profiles`              | C0: manifest read                      | process-wide                | admission / teardown のみ                                  | DTO、warning buffer                                   | AC-061 size / blocking / cleanup      |
| `export_mnemonic`            | C2: secret export / decrypt            | process-wide                | delivery cancellation が重要。Core 開始後 forced stop 不可 | password、decrypted mnemonic、output                  | AC-061 + secret cleanup               |
| `export_private_key`         | C2: secret export / decrypt            | process-wide                | delivery cancellation が重要。Core 開始後 forced stop 不可 | password、decrypted key、output                       | AC-061 + secret cleanup               |
| `list_software_keys`         | C0: manifest read                      | process-wide                | admission / teardown のみ                                  | DTO、warning buffer                                   | AC-061 size / blocking / cleanup      |
| `derive_software_key`        | C2: derivation / Store mutation        | process-wide                | 同上                                                       | password、seed、private key、replacement              | AC-061 + Store parity                 |
| `import_software_key`        | C1: secret-capable crypto / mutation   | process-wide                | admission / teardown、delivery cancellation                | private key、password、replacement                    | AC-061 trigger / parity / cleanup     |
| `generate_software_key`      | C1: randomness / crypto / mutation     | process-wide                | admission / teardown、delivery cancellation                | generated key、password、replacement                  | AC-061 trigger / parity / cleanup     |
| `get_public_account`         | C1: secret-capable read                | process-wide                | admission / teardown、delivery cancellation                | password、decrypted key / public derivation temporary | AC-061 trigger / parity / cleanup     |
| `sign`                       | C2: signing / secret use               | process-wide                | delivery cancellation が重要。Core 開始後 forced stop 不可 | password、decrypted key、signing temporary、signature | AC-061 + signing parity               |
| `change_profile_password`    | C2: KDF / re-encryption mutation       | process-wide                | 同上                                                       | old/new password、decrypted payload、replacement      | AC-061 + Store parity                 |
| `delete_software_key`        | C1: decrypt / mutation                 | process-wide                | admission / teardown、delivery cancellation                | password、decrypted payload、replacement              | AC-061 trigger / deletion cleanup     |
| `delete_profile`             | C1: decrypt / mutation                 | process-wide                | admission / teardown、delivery cancellation                | password、decrypted payload、replacement              | AC-061 trigger / deletion cleanup     |

C0 は、empty Store の生成または manifest / metadata の direct read のように、current contract 上
bounded direct と定義された operation である。C1 は password、secret-capable crypto、bounded decrypt または
Store mutation を含み得る bounded secret-capable operation であり、常に低コストとは限らない。C2 は
password KDF、Store-wide encryption / decryption または re-encryption、Mnemonic seed / derivation、key
derivation、signing、secret export / decrypt または large Store processing を含む、current contract 上
potentially expensive として指定された operation である。
いずれも速度や resource の保証ではなく、いずれの class も process-wide parallel execution を許可する
根拠にはならない。

Evidence の適用範囲は class とは独立して次の規則で決まる。

1. 全16 operation は、API / error parity、synchronous return / throw、admission wait、JS / UI thread
   blocking、cross-runtime starvation、resource retention、cancellation / teardown cleanup および
   stale result rejection の common baseline evidence を持たなければならない。process-wide serialization
   があるため、C0 も admission wait または blocking の対象から外れない。
2. operation の declared Core step、secret lifetime、Store / opaque input size または result lifecycle が、
   `NFR-015` / `AC-061` の password KDF、Store / profile payload encrypt / decrypt、Mnemonic seed /
   derivation、key derivation、signing、large Store processing、resource boundedness または interruption /
   cleanup のいずれかに該当し得る場合、class が C0 または C1 であっても §23 の operation-specific
   evidence を適用する。C1 の current rows は password / decrypt / mutation / secret-capable work を含むため、
   trigger-set evidence の対象であり、class を理由に測定を省略してはならない。C0 の manifest read も
   variable Store envelope の size が processing cost に影響する場合は同じ扱いとする。
3. C2 は常に operation-specific evidence の対象である。C0 / C1 の trigger がないことを採用する場合は、
   operation 単位で該当する Core step、input envelope、secret lifetime および除外理由を evidence に記録する。

現行16 operationの適用は次のとおりである。`create_empty_store` は secret、Store input、crypto、mutation
および C2 trigger を持たないため、full §23 execution-cost measurement から除外できる唯一の C0 operation
であるが、common blocking / lifecycle baseline は必須である。`list_profiles` と `list_software_keys` は
variable Store envelope を読むため input-size trigger があり、full §23 evidence の対象である。表の全 C1
operation は password、decrypt、secret-capable crypto または mutation を含むため full §23 evidence の対象で
あり、C1 という class を理由に除外してはならない。C2 operation はすべて full §23 evidence の対象である。

この規則は classification の付与と evidence の包含関係を分離し、C0 / C1 の class 名だけを根拠に
`NFR-015` / `AC-061` の blocking、resource、starvation または cleanup evaluation を省略することを禁止する。

### 4.3 Sync / async decision gate

現時点の public contract は同期型であり、negative responsiveness evidence がない状態で async
化してはならない。native worker + synchronous wait を non-blocking と宣言してはならない。

次の evidence が operation-specific に確認された場合だけ、下流は operation、入力 envelope、
影響範囲、compatibility impact、secret lifetime、cancellation / interruption および cleanup を
記録し、別途 user decision を要求する。

- reasonable worst-case input で JS runtime thread の許容不能な blocking / responsiveness impact
- process-wide serialization による starvation または resource exhaustion
- interruption / cancellation / teardown 時の安全な cleanup 不成立
- in-flight Core invocation の lifetime / ownership を安全に閉じられないこと

evidence が negative でも、`Promise` 化、operation-specific API、RN support exclusion または
silent fallback は自動採用しない。現在の gate は **`DEFERRED UNTIL NEGATIVE EVIDENCE`** である。

## 5. Process-wide coordination

### 5.1 Authority と scope

同一 OS process 内の全 RN runtime、module registry、module instance および logical consumer context
から RN binding を通じて到達する全 invocation は、一つの process-wide RN coordination boundary を
通過しなければならない。v1 は read-only、secret-capable、Store read / mutation を区別せず、同時に
一つの Core / C ABI execution だけを許可する。

coordinator は Core の cryptographic authority、Store authority、authorization authority または
current Store authority ではない。coordinator が共有するのは execution coordination metadata だけで、
secret / Store content を共有しない。

### 5.2 Admission state と ordering

意味上の state は次の通りである。exact mutex、queue container、executor、atomic primitive、thread
affinity、memory ordering は Implementation に委譲する。

| state           | admission                                                                                                           | in-flight                                               | 遷移                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `uninitialized` | registration only                                                                                                   | none                                                    | first valid registration が initialization を開始                                                        |
| `initializing`  | new execution は全 runtime 共通で即時 fail closed。registration metadata のみ許可し、ticket / descriptor を作らない | initialization 1 件のみ                                 | success で `ready`、failure または initiating identity の invalidation で process generation unavailable |
| `ready`         | valid runtime / context から受理                                                                                    | 最大 1 件                                               | ticket order で `in_flight` へ                                                                           |
| `in_flight`     | 次の request は ticket と descriptor のみ保持                                                                       | exactly 1 Core / C ABI execution                        | completion + release + delivery check 後に `ready`                                                       |
| `draining`      | 受理しない                                                                                                          | existing operation は forced kill せず cleanup まで処理 | zero in-flight 後に `closed`                                                                             |
| `closed`        | 旧 coordinator lifecycle では受理しない                                                                             | none                                                    | 全 cleanup 後の new coordinator lifecycle registration のみ再初期化可能                                  |
| `unavailable`   | 受理しない                                                                                                          | failure に応じ cleanup                                  | integrity / shared init failure は process restart または明示的 lifecycle reset まで terminal            |

coordinator は、受理した request に単調増加する admission identity を割り当てる。execution order は
その identity の順序であり、受理済み request を後から並べ替えてはならない。admission 前に取消・
失効した request は execution order から除外し、ticket を割り当てない。queue の fairness algorithm は
固定しないが、長時間 operation がある場合の starvation を evidence で観測可能にし、無期限待機を
成功動作として扱ってはならない。

待機中の request descriptor は operation kind、runtime / registry identity、context identity、
request identity、non-secret scalar、cancellation state だけを保持する。password、Mnemonic、seed、
private key、decrypted Store、payload bytes または signing intermediate を process-wide queue に
コピー・保持してはならない。secret の native materialization は admission 後かつ Core invocation
直前に行う。

`initializing` 中の new execution は待機させず、既存 public contract の
`BackendInitializationError` を同期的に返す。これらの request には admission identity、ticket、queue
descriptor、secret conversion、C ABI invocation または自動 retry を与えない。初期化が成功した後の
再試行は、caller が新たに開始する別 request として扱う。初期化が失敗した場合、または initialization
中に initiating runtime / registry が invalid になった場合は、initialization-local resource を cleanup
して `unavailable` へ遷移し、全 runtime の後続 execution を同じ `BackendInitializationError` で拒否する。
process restart または明示的な新 coordinator lifecycle reset まで、失敗した initialization を再利用・
部分成功・別 backend fallback として扱わない。この rule は runtime A が initialization を開始した場合も
runtime B が先に public operation を呼ぶ場合も同一である。

### 5.3 Runtime registration と validity

coordinator が operation を受理するには、次のすべてが valid でなければならない。

1. process lifecycle が `ready` である。
2. RN private entry が registered New Architecture native provider を持つ。
3. runtime identity と module-registry identity が active registration と一致する。
4. logical consumer context が active である。
5. request identity が一意で、cancelled / superseded でない。

runtime-local conversion failure、Core error、cancellation または stale completion は原則として
その runtime / context に閉じる。shared native library の load、integrity、initialization または
access safety の failure は process-wide `unavailable` とし、他の runtime へ成功として伝播しない。

## 6. Runtime / module registry identity

### 6.1 Identity semantics

runtime identity は一つの RN JavaScript runtime の lifecycle、module-registry identity はその runtime
に登録された New Architecture module registry の lifecycle を表す。module instance、runtime reload、
registry replacement または native provider replacement は同じ identity の継続として扱わず、新しい
registration identity を作る。

identity は application が指定する public string、profile ID、Store ID または user-visible value では
ない。generation / token / opaque handle 等の primitive は Implementation で選べるが、外部からは観測
できない。

### 6.2 Registration、replacement および invalidation

- **registration**: private RN entry が native provider とともに coordinator へ一度登録する。重複登録は
  idempotent であっても、異なる registry identity を同じ identity として結合してはならない。
- **validity**: runtime、registry、process lifecycle が active で、module provider が対応 artifact に
  bind している間だけ valid である。
- **invalidation**: runtime destroy、module unregistration、native teardown、reload または provider
  failure は旧 identity を直ちに invalid にする。新規 admission と旧 identity への delivery を止める。
- **reload / replacement**: 新しい runtime / registry は新しい identity で登録し、旧 completion を引き継がない。
- **delivery eligibility**: completion が process generation、runtime identity、registry identity、
  context identity および request identity のすべてに一致し、各 state が valid の場合だけ result を
  public facade へ届ける。

runtime A の invalidation は runtime B の validity、context、admission または process-wide resource を
破壊してはならない。B が有効な間は A が共有 resource cleanup を実行してはならない。

## 7. Logical consumer context

logical consumer context は、RN private adapter が一つの binding registration に対する invocation
ordering、reentrancy および cancellation scope を管理するための内部概念である。

- creation は private entry の native provider registration と同時、または最初の public operation の
  admission 前に行う。
- ownership は RN binding adapter にあり、Application が context ID を生成、保存、指定または再利用しない。
- 同一 context の request は coordinator の ticket order に従い、同時 Core / C ABI invocation を持たない。
- context は runtime / registry を跨いで共有しない。複数 context があっても process-wide coordinator を bypass しない。
- context destruction、module instance destruction、runtime reload、explicit internal cancellation または
  process teardown は context を invalid にする。
- cancellation scope は当該 context とその request に限る。shared native resource failure の場合だけ
  process-wide barrier が適用される。

context は Profile、Store、password、Mnemonic、private key、authorization result または secret cache を
所有しない。context の lifetime は secret の lifetime anchor にならない。

## 8. Reentrancy、ordering および deadlock

次の behavior を exact contract とする。

| event                                                  | 必須動作                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 同一 context の nested synchronous invocation          | 内側を実行・再帰・queue 待ちさせず `BindingFailure` として拒否。外側の Core operation と state は維持                                                                                                                                                                              |
| callback-originated re-entry                           | 現在の process / runtime / registry / context identity が valid で、既存 invocation が active な場合は nested request を即時 `BindingFailure` として拒否する。identity が既に invalid、cancelled または teardown 中なら nested request を admission せず stale cleanup-only とする |
| lower scope → upper scope の同期再入                   | coordinator、runtime scope、context scope、C ABI、Core の下位から public facade / upper coordinator への同期再入を要求しない                                                                                                                                                       |
| teardown during invocation                             | identity を invalid にし、新規 admission / delivery を止める。Core invocation は unsafe forced thread termination をせず完了または安全な native unwind を待ち、output / temporary を cleanup                                                                                       |
| cancellation during invocation                         | cancellation flag を delivery eligibility に反映する。Core を強制停止せず、completion は stale として cleanup                                                                                                                                                                      |
| process-wide coordinator と context coordinator の競合 | 下位が上位を同期 wait して循環しない。process-wide admission が execution authority で、context は local metadata のみを持つ                                                                                                                                                       |

lock hierarchy、queue type、worker count、callback mechanism、thread affinity、memory ordering および
reentrancy guard の具体実装は固定しない。ただし上表の外部 behavior を変える実装は認めない。

re-entry request の outcome は、検出時点の identity validity を先に評価して決める。valid な active
context での callback-originated、public-facade または recursive invocation は常に
`WalletCoreError(code = "BindingFailure")` を同期的に観測させ、queue 待ち、Core / C ABI 呼出し、success
delivery または retry を行わない。runtime / registry / context が既に invalid、request が cancelled / superseded、
または process teardown 中である場合は、その nested request に error callback を合成せず、stale cleanup-only
とする。後者は既に admission 済みの outer request の stale completion mapping とは別の event であり、outer
request の caller-visible result は §9.2 に従う。

## 9. Cancellation、stale completion および teardown

### 9.1 Cancellation phase

public cancellation API は現行 facade に存在せず、本書も追加しない。ここでいう cancellation は
runtime / context lifecycle、reload、teardown および internal invalidation の意味である。

| phase                               | behavior                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| admission 前                        | request identity を cancelled とし、queue から除外または skip。secret を materialize せず、Core / C ABI を呼ばない                               |
| admission 後 / Core invocation 前   | validity を再確認し、失効なら invocation を開始せず descriptor を破棄                                                                            |
| Core invocation 中                  | unsafe forced thread termination をしない。Core が完了するまで native lifecycle を保ち、delivery を禁止                                          |
| Core completion 後 / JS delivery 前 | cancelled / invalid identity を再確認。stale なら JS success を届けず、output、replacement、secret、warning を cleanup                           |
| runtime invalidation                | 当該 runtime / registry / context の future delivery と新規 admission を停止。無関係 runtime は継続可能                                          |
| process teardown                    | new admission を停止し、in-flight は completion / cleanup barrier を通過させる。shared resource は全 runtime と in-flight が安全に離れた後に解放 |

Core invocation が Store replacement を生成してから stale になった場合、binding は replacement を
Application へ届けず、current Store として適用しない。Core は stateless processor であり、binding の
drop が persistent Store mutation を暗黙に commit したことにはならない。

### 9.2 Stale completion identity

completion は次のいずれかに該当すれば stale である。

- runtime が invalidated された
- module registry が replaced / reloaded された
- request が cancelled された
- logical consumer context が destroyed された
- process-wide teardown / generation change が発生した
- request identity が superseded された
- process-wide resource が completion 前に unavailable になった

stale completion は MUST NOT:

- JS へ success として delivery する
- secret、decrypted material、signature、payload、warning または Store replacement を保持する
- public state mutation、current Store application または authorization state を再実行する

stale を検出した時点で native owned bytes を C ABI release contract に従い解放し、secret-containing
temporary は可能な範囲で zeroize する。runtime がすでに失効して JS error を受け取れない場合、binding は
新しい error callback を合成せず cleanup だけを行う。caller がなお同期的に outer request の error を
観測できる場合は `WalletCoreError(code = "BindingFailure")` とし、stale を成功として返さない。この mapping は
既に admission 済みの completion に適用し、§8 の valid re-entry request に対する即時拒否または invalid
re-entry request に対する cleanup-only の二択を再導入しない。

### 9.3 Runtime-local teardown

runtime-local teardown は当該 runtime / registry / context の validity を失効させ、future admission、
future delivery および runtime-local temporary / registration metadata を cleanup する。他の runtime の
registration、in-flight operation、shared native library、coordinator state または context を停止・破壊
してはならない。

### 9.4 Process-wide teardown

process-wide teardown は runtime-local teardown と別の state transition である。

1. coordinator を `draining` にし、新規 admission を拒否する。
2. 全 active runtime / registry / context に対する delivery を無効化する。
3. in-flight operation があれば forced kill せず completion / cleanup barrier を待つ。
4. C ABI owned bytes、native temporary、registration metadata および shared native resource を cleanup する。
5. in-flight がゼロになった後だけ coordinator を `closed` に遷移する。

process-wide integrity / initialization failure は `unavailable` とし、Node / WASM fallback、best-effort
resource reuse または別 ABI の substitution を行わない。新しい coordinator lifecycle が成立した場合
だけ、新しい identity で初期化できる。これは同じ OS process で runtime を再生成する場合にも適用できるが、
旧 lifecycle の completion、request、context または secret を新 lifecycle へ引き継がない。

## 10. Shared resource と secret ownership

### 10.1 process-wide shared state allowlist

次だけを process-wide に共有してよい。

- coordinator state、admission barrier、ticket metadata
- runtime / module-registry registration metadata
- native library availability、artifact identity、initialization state
- in-flight lifecycle metadata、request / context validity
- process lifecycle state、teardown barrier

### 10.2 共有禁止対象

次を process-wide、runtime、module registry、context、TurboModule、JSI host object または native
singleton の shared state として保持してはならない。

- private key、Mnemonic、seed、password、passphrase、decrypted material
- Wallet Store、Pending Profile、payload、signature intermediate
- Profile / Software Key state、current Store、Store history
- unlocked session、authorization result、secret cache、previous result

process-wide serialization は secret state の共有・cache・session 化を意味しない。

## 11. Secret transport、string encoding および buffer ownership

### 11.1 Secret transport path

secret-capable operation は次の path を通る。

```text
JS Uint8Array
  → RN private entry validation
  → JSI / TurboModule typed buffer view
  → Android byte span / iOS NSData or byte span
  → C ABI InputBytes { data, len }
  → Rust Core
```

各 boundary の contract は次の通りである。

1. `Uint8Array` は view の `byteOffset` と `byteLength` が示す範囲だけを読む。backing
   `ArrayBuffer` 全体を暗黙に送らない。
2. detached、unreadable、型不一致または length overflow の buffer は Core invocation 前に拒否し、
   `BindingFailure` とする。
3. native layer は C ABI の `InputBytes` に exact pointer + length を渡し、NUL terminator を追加しない。
4. input pointer は C ABI call の終了までだけ有効であり、C ABI / Core は caller buffer を保持・cache しない。
5. native worker または platform object の lifetime が同期 call より長くなる場合は、admission 後に
   operation-local native temporary を作り、completion / failure / cancellation / teardown で cleanup
   する。process-wide queue は secret bytes を保持しない。
6. C ABI output は既存の `OwnedBytes` として受け、JS へ渡す場合だけ新しい `Uint8Array` へ copy する。
   copy 後ただちに `snwc_release_bytes` を一度だけ呼ぶ。
7. output copy 前に request identity と runtime validity を確認し、stale output は JS へ copy しない。

対象は `private key`、`mnemonic`、`password`、`passphrase`、`seed`、decrypted material および
signing intermediate である。現行 public facade に passphrase 専用 field はないため新しい API を
導入せず、既存の byte field だけにこの規則を適用する。

### 11.2 String encoding

- public secret input は JavaScript string ではなく、既存契約の UTF-8 `Uint8Array` とする。
- password / mnemonic bytes は native layer が再 encode、trim、case conversion、Unicode normalization
  または NUL termination を行わず、strict UTF-8 validation と semantic validation を Core に委譲する。
- UUID、status、chain / network name、address その他の semantic JS string は strict UTF-8 として encode
  する。unpaired UTF-16 surrogate、embedded NUL または required field の欠落は `InvalidArgument` とする。
- string encoding は NFC / NFKC その他の Unicode normalization を行わない。mnemonic の BIP39 validation、
  password の authentication および identifier の意味判定は Core / existing facade semantics に従う。
- C ABI の text field は pointer + byte length で渡し、NUL terminator を要求しない。temporary string
  buffer は operation-local とし、成功・失敗・cancellation・teardown 後に保持しない。

### 11.3 Length、ownership および cleanup

Core の既存 validation を置き換えないが、binding は次の fixed representation を破壊してはならない。

- private key: raw 32 bytes
- public key: raw 32 bytes
- signature: raw 64 bytes
- Store / pending / payload: variable-length opaque bytes。Store の 16 MiB 等の上限は
  `wallet-store-format-v1.md` と Core が authority となる

invalid fixed-length output、unexpected null pointer、length mismatch、allocation failure または
release failure は `BindingFailure` とし、partial DTO / secret / replacement Store を返さない。
Android の `jbyteArray` / native buffer、iOS の `NSData` / native buffer、C ABI `OwnedBytes` および
JS `Uint8Array` の ownership は暗黙に移転しない。caller-owned input は read-only mediation、native
temporary は binding-owned、returned JS copy は caller-owned とする。

## 12. C ABI integration contract

RN-private adapter は既存 [`specification.md`](specification.md) §13.1 の C ABI を内部再利用する。
RN 専用 public C ABI、RN 専用 error code、RN 専用 cryptographic function または Application から
直接呼ぶ FFI surface を追加しない。

各 invocation は次を満たす。

- `InputBytes` は caller-owned borrow。`data` / `len` は exact bytes を表し、NUL terminator を付けない。
- caller が確保した `OperationResult` を開始時に empty / zero / NULL の failure-safe state へ初期化する。
- Core operation、status、target、context、password、payload、Store および pending の field を省略・補完・
  並べ替え・意味変換しない。
- Core error code は既存 18 `ErrorCode` へ 1 対 1 に保ち、C ABI error を success、NULL success、warning-only
  result または別 backend retry へ変換しない。
- variable-length output は C ABI allocator が所有する `OwnedBytes` とし、RN adapter は `snwc_release_bytes`
  を exact once 呼ぶ。caller が `free`、`delete`、`delete[]` または別 allocator を使わない。
- allocation、conversion、ownership、lifecycle または output validation failure は `BindingFailure` とし、
  partial allocation を JS へ渡さず、全 output を failure-safe にする。
- C ABI / Rust Core の execution は process-wide coordinator の in-flight scope 内で一つだけ実行する。
- RN native layer は C ABI の結果を解釈して Store、approval、authorization または Chain / Network policy を
  生成しない。

RN artifact は既存 C ABI public release artifact と同一視しない。RN artifact は同じ Core source と
existing C ABI contract に bind された npm 内部 integration artifact であり、RN consumer は C ABI package
を別途 install しない。

## 13. Android binding specification

### 13.1 Module registration と native boundary

Android は New Architecture の TurboModule / Codegen registration を必須とし、JSI を private な
synchronous / binary transfer substrate とする。Legacy Native Module、Legacy Bridge、Bridge compatibility
shim および JavaScript FFI は formal path ではない。

Android native layer の責務は次に限定する。

- TurboModule provider / Codegen registration と RN runtime identity の接続
- JSI / typed buffer と native byte span の conversion
- approved Android artifact の ABI selection / load と C ABI symbol availability check
- process-wide coordinator、runtime / context lifecycle hook および stale delivery prevention
- existing C ABI の `InputBytes` / `OperationResult` / `snwc_release_bytes` mediation
- C ABI error、binding failure、initialization failure の既存 facade への propagation

Kotlin / Java / C++ class hierarchy、JNI method name、file layout、Gradle task、CMake target、thread pool
library および lock primitive は固定しない。ただし上記責務と failure / ownership contract を変更しない。

### 13.2 C ABI invocation と lifecycle

TurboModule / JSI から C ABI call へ入る前に runtime / registry / context validity と coordinator admission
を確認する。Android activity / context の destroy、reload、background transition、process shutdown または
native provider invalidation は新規 admission を停止し、in-flight result は §9 の stale contract に従う。

Android native layer は Activity、React context、TurboModule object または JNI global reference を
Core secret の lifetime anchor にしてはならない。Android lifecycle callback が invocation 中に再入を試みる
場合、callback が runtime / registry / context を invalid にする lifecycle event なら invalidation を先に確定し、
nested request は stale cleanup-only とする。それ以外の valid active identity に対する lifecycle callback re-entry
は `WalletCoreError(code = "BindingFailure")` として即時拒否し、同期 recursive call、queue 待ちまたは Core / C ABI
呼出しを行わない。

### 13.3 Android failure behavior

library missing、wrong ABI、load error、C ABI symbol mismatch、New Architecture provider missing、integrity
metadata mismatch または initialization failure は `BackendInitializationError` とする。Core operation の
`WalletCoreError` は RN backend failure として別 backend へ retry しない。

ABI / platform が unsupported の場合、unsupported ABI artifact を選ばず、最も近い ABI、WASM、Node addon、
remote binary または runtime download へ substitution しない。

## 14. Android native artifact / API contract

### 14.1 Artifact identity and layout

formal Android native artifacts は次だけである。

```text
dist/react-native/android/jni/arm64-v8a/libsymbol_nem_wallet_core_rn.so
dist/react-native/android/jni/x86_64/libsymbol_nem_wallet_core_rn.so
```

`.so` は corresponding ABI に対応し、existing C ABI / Rust Core integration を含む。`armeabi-v7a`、
`x86`、その他の ABI の formal artifact を assembly または support claim に含めない。package assembly
は ABI directory、artifact filename、manifest entry、sha256 および actual file bytes を一致させる。

Android loader は device ABI を allowlist と照合し、`arm64-v8a` または `x86_64` だけを選択する。
unsupported ABI、missing file、wrong path、wrong ELF identity、manifest mismatch または load failure は
initialization failure とする。

### 14.2 Integrity verification point

Android の source revision → controlled build → target artifact → digest / provenance → npm assembly の
trust chain は release / package assembly が検証する。assembly は次を検証してから package を出力する。

- `source_commit` と controlled build evidence が一致する
- artifact path、ABI、filename、target identity、package version が一致する
- `sha256` が実 artifact bytes と一致する
- published / candidate package に manifest が指す file だけが存在する
- unsupported ABI / extra native artifact がない

runtime loader は manifest entry、ABI identity、package-local path および native load success を確認する。
assembly / release evidence を代替するための毎回の runtime cryptographic hash verification は必須契約に
しない。loader が参照する artifact が欠落、読取不能、wrong target または unapproved である場合は
`BackendInitializationError` とする。

### 14.3 Android API policy

- `minSdk` は API 24 とする。API 24 未満は build / install / initialization の最も早い検出点で fail closed とする。
- `targetSdk` と `compileSdk` は将来の固定値として焼き込まない。release / build 時点の official Android / Google Play requirements に追従する policy とする。
- target / compile policy の更新は RN public API、Core semantics、approved ABI および `minSdk = 24` を変更しない。

## 15. iOS binding specification

### 15.1 Module registration と native boundary

iOS は New Architecture の TurboModule / Codegen registration と JSI private substrate を必須とする。
Swift / Objective-C / Objective-C++ layer は registration、lifecycle、buffer conversion、approved
framework / archive integration、C ABI call および error propagation に限定する。iOS layer は Rust Core
の cryptography、Store semantics、authorization、secret cache または signing implementation を持たない。

`NSData`、native byte buffer、C pointer および JS `Uint8Array` は §11 の ownership / length contract に
従う。`NSData` の object lifetime が C ABI invocation より長くなる場合は operation-local mediation を
行い、global cache や shared secret buffer にしない。

### 15.2 Lifecycle と teardown

RN runtime invalidation、module registry replacement、scene / application teardown、native artifact unload
または process termination は runtime-local / process-wide teardown を適用する。scene background transition
だけで shared resource を破壊して他 runtime を invalid にしてはならない。in-flight operation に対する
unsafe forced thread termination を行わず、completion、C ABI release、temporary cleanup および stale check
を完了する。

### 15.3 iOS failure behavior

TurboModule / JSI provider missing、C ABI symbol mismatch、missing slice、link / load failure、wrong platform
identity、integrity / provenance mismatch、unsupported host または initialization failure は
`BackendInitializationError` とする。Core error は existing `WalletCoreError` として保持し、WASM / Node
fallback に変換しない。

## 16. iOS native artifact contract

### 16.1 Required XCFramework slices

正式 artifact 名は次とする。

```text
dist/react-native/ios/SymbolNemWalletCoreRN.xcframework
```

XCFramework は次の二つの slice だけを formal artifact として含む。

| slice                 | target                                                     | required binary                  |
| --------------------- | ---------------------------------------------------------- | -------------------------------- |
| `ios-arm64`           | physical device、iOS 15.1+                                 | `libsymbol_nem_wallet_core_rn.a` |
| `ios-arm64-simulator` | Apple Silicon simulator、iOS 15.1+（Expo subset は 16.4+） | `libsymbol_nem_wallet_core_rn.a` |

Intel `x86_64` simulator slice、device 非対応 slice、未承認 architecture、runtime download、
application-local Rust rebuild および WASM substitution を正式対象にしない。XCFramework の slice selection
は Xcode / native integration の責任であり、JS が architecture を選択しない。

### 16.2 Link / packaging / provenance

iOS は static linkage first の native artifact composition を採用する。XCFramework の package assembly / link
input は source revision、package version、slice identity、artifact digest および approved release evidence
へ追跡できなければならない。package assembly は required slice の不在、extra x86_64 slice、wrong platform、
digest mismatch、manifest mismatch または unapproved binary を reject する。

iOS runtime は link 済み native code を remote download、dynamic replacement または別 architecture へ
差し替えない。slice / link / load failure は `BackendInitializationError` とし、application が iOS device
または Apple Silicon simulator の formal target 外で動作したことを成功として扱わない。

## 17. Expo integration

### 17.1 Formal / unsupported scope

formal support は次である。

- Bare React Native
- Expo Development Build
- Expo Prebuild / CNG
- custom native module integration

Expo Go は unsupported である。Expo Go に native RN artifact を後から追加するための WASM / Node
fallback、runtime download または別 package を提供しない。

Expo consumer の formal compatibility pair は **Expo SDK `57` stable + React Native `0.86.x`** の一つだけ
である。この pair では New Architecture enabled、Android approved baseline、Expo iOS subset iOS `16.4+`
を満たす。RN `0.87.x` は bare RN の primary validation line であり、Expo SDK 57 に RN `0.87.x` を強制的に
組み合わせることは formal Expo support ではない。SDK 57 / RN 0.86.x 以外の stable pair、unlisted pair、
canary、nightly、`next`、SDK / RN mismatch および custom fork は unsupported とする。

Expo の formal workflow（Development Build、Prebuild / CNG、custom native module integration）は、上記の
exact pair に限って適用する。pair の判定は prebuild / native build の support-matrix gate で行い、unlisted / mismatch
を成功した native project として出力してはならない。gate を bypass した場合も最初の RN backend initialization
で `BackendInitializationError` とし、Node / WASM fallback を行わない。

Expo workflow は §1.1 の finite RN support window と re-baseline rule を共有し、formal workflow であることだけを
理由に未列挙の RN minor line または Expo SDK / RN pair を追加してはならない。

### 17.2 Prebuild / CNG contract

package を追加または version 更新した後、native project は package の native integration を含む状態へ
再生成 / 再ビルドしなければならない。Prebuild / CNG integration は次を満たす。

- package-local Android ABI artifact、iOS XCFramework slice、TurboModule registration および build metadata
  が生成された native project に反映される
- config plugin が必要な integration では、plugin は同じ npm package 内の private integration asset とし、
  idempotent、version-aligned、offline、no-download である。plugin は Core semantics、secret handling または
  public API を変更しない
- prebuild は unsupported ABI / slice、Legacy Architecture、incompatible RN / Expo pair、missing artifact
  または invalid manifest を成功として出力しない
- native project の再生成後、Development Build を作り直す。JavaScript-only reload で native artifact / module
  registration の変更を反映したことにしない

config plugin の JavaScript function name、file layout、Gradle / Pod mutation、Xcode setting および exact
autolinking implementation は固定しないが、上記の generated native project behavior は固定する。

### 17.3 Expo Go detection

Expo Go は installation-time に確実に識別できないため、次の fail-closed detection を適用する。

- build / prebuild で custom native module を含められない構成は unsupported として文書化し、可能な場合は
  build-time reject する
- runtime で `react-native` condition が解決されても required TurboModule / JSI provider が登録されて
  いなければ `BackendInitializationError` とする
- Expo Go の不在 native module を理由に Browser / WASM / Node backend を選択しない

## 18. New Architecture contract

New Architecture は mandatory である。formal integration は TurboModule / Codegen registration と JSI
private substrate の組合せだけを対象とする。

- Legacy Architecture は unsupported。Legacy-only provider、Legacy Bridge または compatibility shim が
  しか存在しない場合は build-time または initialization-time に fail fast する。
- Legacy Native Module method、Bridge serialization、legacy fallback および dual architecture public API
  を提供しない。
- New Architecture の disabled flag、unsupported RN version、missing Codegen output または provider type
  mismatch は `BackendInitializationError` または native build failure とする。
- New Architecture を理由に public TypeScript API、DTO、binary、error、sync contract または Rust Core
  authority を分岐させない。

## 19. Error model と fail-closed mapping

### 19.1 Public error namespace

既存 public error namespace だけを使用する。新しい public `ErrorCode`、RN-specific error class、backend
selector または diagnostics object を追加しない。

| failure source                                                                                                                             | public mapping                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Rust Core operation error                                                                                                                  | existing `WalletCoreError`。18 個の `ErrorCode` と `message = code` を維持                                                       |
| existing C ABI `ErrorCode`                                                                                                                 | Core code へ 1 対 1 mapping。成功・warning-only へ変換しない                                                                     |
| public DTO field 欠落、unknown literal、malformed UUID、semantic enum / context 不正                                                       | existing `InvalidArgument`                                                                                                       |
| typed array 型不一致、detached / unreadable buffer、pointer / length / allocation / ownership / output conversion failure                  | existing `BindingFailure`                                                                                                        |
| valid active identity における callback / lifecycle-originated recursive invocation                                                        | `WalletCoreError(code = "BindingFailure")`。queue 待ち、Core / C ABI invocation、success delivery または retry を行わない        |
| invalid / cancelled / teardown 中の callback / lifecycle-originated recursive invocation                                                   | nested request を admission せず、public error callback を合成しない stale cleanup-only。outer request の mapping は §9.2 に従う |
| native module missing、TurboModule / JSI registration failure、library load / symbol / link failure、artifact integrity / manifest failure | `BackendInitializationError`                                                                                                     |
| unsupported RN version、Legacy Architecture、Android API / ABI、iOS host / slice、incompatible Expo pair、Expo Go                          | `BackendInitializationError`。近い backend へ fallback しない                                                                    |
| runtime invalidation、context destruction、request cancellation、stale completion、teardown delivery failure                               | caller が観測できる場合は `WalletCoreError(code = "BindingFailure")`; runtime が既に無効なら success delivery を行わず cleanup   |
| process-wide shared resource unavailable                                                                                                   | initialization phase は `BackendInitializationError`、operation phase は `BindingFailure`。いずれも new admission を止める       |

`BackendInitializationError` の public `name` / `message` は既存契約の
`WalletCoreBackendInitializationError` / `backend initialization failed` とする。unsupported ABI、
Expo Go、integrity failure 等の内部原因、path、filename、digest、native detail、secret を message、
cause、warning、debug output または public DTO に含めない。内部検証 record では原因 category と target
identity を記録できるが、consumer-visible error shape は増やさない。

Core `AuthenticationFailed`、`InvalidStore`、`NetworkMismatch`、`PendingProfileInvalid`、
`CryptoFailure`、`SerializationFailure` その他の既存 code を RN infrastructure error に畳み込まない。
逆に native load / integrity failure を Core `BindingFailure` として operation success に隠さない。

## 20. Build target matrix と unsupported environment

### 20.1 Formal matrix

| target                            | formal baseline                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Android device / emulator         | API 24+、ABI `arm64-v8a` / `x86_64`、New Architecture、stable RN `0.86.x` / `0.87.x`（0.87 primary）                           |
| Bare RN iOS device                | iOS 15.1+、`arm64`、New Architecture、stable RN `0.86.x` / `0.87.x`（0.87 primary）                                            |
| Bare RN iOS simulator             | Apple Silicon、`arm64`、iOS 15.1+、stable RN `0.86.x` / `0.87.x`（0.87 primary）                                               |
| Expo Development Build / Prebuild | Expo SDK `57` stable + RN `0.86.x` only、New Architecture、approved Android baseline、iOS 16.4+、custom native module workflow |
| RN primary validation             | RN `0.87.x`                                                                                                                    |
| package-wide non-RN               | Node / Browser / Browser Extension の existing `npm-typescript-facade.md` contract。RN entry / artifact が影響を与えない       |

この matrix は v1 の finite support window であり、`>= 0.86.x` の floor を満たすだけでは formal support にならない。
新しい minor line の追加、既存 line の End of Cycle / Unsupported または compatibility evidence の喪失は §1.1 の
re-baseline trigger である。matrix 更新前に未列挙 line または Expo pair を release / support claim に含めない。

### 20.2 Detection point

| unsupported condition                                               | earliest required detection                           | final fail-closed behavior                              |
| ------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| RN `< 0.86.x`                                                       | package manager warning または native build / Codegen | bypass 時も initialization failure                      |
| RN `>= 0.88.x` または support matrix 外の stable minor              | build / support-matrix gate                           | bypass 時も initialization failure                      |
| canary / nightly / `next` RN                                        | build / support-matrix gate                           | bypass 時も initialization failure                      |
| Legacy Architecture                                                 | build configuration / Codegen                         | initialization failure。legacy shim なし                |
| Android `< API 24`                                                  | Gradle / native build target                          | runtime 到達時も initialization failure                 |
| Android `armeabi-v7a` / `x86` / other ABI                           | package assembly / native link                        | artifact selection failure。近似 ABI / WASM なし        |
| Intel iOS simulator `x86_64`                                        | XCFramework / link stage                              | runtime 到達時も initialization failure                 |
| Expo Go                                                             | integration / build stage、または missing provider    | `BackendInitializationError`。WASM / Node fallback なし |
| Expo SDK `57` stable + RN `0.86.x` 以外、または mismatch / unlisted | prebuild / native build support matrix                | bypass 時も initialization failure                      |
| missing / wrong / extra native artifact                             | assembly / link / load verification                   | `BackendInitializationError`                            |
| Metro package exports disabled or wrong entry forced                | build / bundle resolution                             | initialization failure。silent alternate backend なし   |

installation-time に検出できない condition を installation success と扱わない。build-time に検出
できるものは native build / prebuild gate で早期に reject し、runtime にしか観測できないものは最初の
backend initialization で fail fast する。いずれの場合も silent degradation は禁止する。

## 21. Artifact integrity / provenance と npm assembly

### 21.1 RN manifest

Node の [`dist/native/artifact-manifest.json`](npm-typescript-facade.md) とは別に、RN artifact manifest
を次へ置く。

```text
dist/react-native/artifact-manifest.json
```

manifest の exact schema は次である。

```json
{
  "schema_version": 1,
  "package_name": "@nemnesia/symbol-nem-wallet-core",
  "package_version": "<semver>",
  "source_commit": "<40 lowercase hexadecimal characters>",
  "artifacts": [
    {
      "target_id": "android-arm64-v8a",
      "platform": "android",
      "environment": "device",
      "architecture": "arm64-v8a",
      "relative_path": "dist/react-native/android/jni/arm64-v8a/libsymbol_nem_wallet_core_rn.so",
      "artifact_filename": "libsymbol_nem_wallet_core_rn.so",
      "sha256": "<64 lowercase hexadecimal characters>",
      "toolchain_identifier": "<non-empty build toolchain identifier>"
    }
  ]
}
```

`artifacts` は formal target の全件を canonical order
`android-arm64-v8a`, `android-x86_64`, `ios-arm64`, `ios-simulator-arm64` で含める。iOS entry の
`relative_path` は XCFramework 内の slice binary (`ios-arm64/libsymbol_nem_wallet_core_rn.a` または
`ios-arm64-simulator/libsymbol_nem_wallet_core_rn.a`) を指す。top-level、field、target、path、filename、
digest、toolchain の validation は Node manifest の strictness と同じく行い、unknown target、duplicate
target、extra field、secret、Store、local cache または unapproved artifact を含めない。

manifest entry が指す actual file の欠落、basename mismatch、target / architecture mismatch、sha256
mismatch、package version / source revision mismatch または formal matrix 外の extra native binary は
assembly failure である。formal package は extra `armeabi-v7a`、`x86` または iOS `x86_64` slice を含めない。

### 21.2 Provenance chain

release evidence は次の一方向 chain を保持する。

```text
source revision
  → controlled build
  → target-specific RN artifact
  → target identity + manifest digest association
  → approved npm assembly
  → published npm package
```

各 target artifact、RN manifest、package tarball、既存 Node manifest、WASM binary、SBOM および provenance
record の digest / identity を相互に検証する。既存の `docs/migration` の release / supply-chain policy、
SBOM および provenance artifact を置き換えず、RN artifact を standalone public C ABI release asset とも
扱わない。

### 21.3 Single npm package inventory

RN 対応後も公開 package は `@nemnesia/symbol-nem-wallet-core` 一つだけである。assembly は少なくとも次の
inventory を満たす。

```text
dist/index.d.ts
dist/node/index.mjs
dist/node/index.cjs
dist/wasm/index.mjs
dist/wasm/index.cjs
dist/wasm/<one canonical .wasm>
dist/native/artifact-manifest.json
dist/native/<declared Node artifact>
dist/react-native/index.js
dist/react-native/artifact-manifest.json
dist/react-native/android/jni/arm64-v8a/libsymbol_nem_wallet_core_rn.so
dist/react-native/android/jni/x86_64/libsymbol_nem_wallet_core_rn.so
dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64/libsymbol_nem_wallet_core_rn.a
dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64-simulator/libsymbol_nem_wallet_core_rn.a
```

package-native integration source (`android/`, `ios/`) および Prebuild 用 private plugin は、release
assembly が必要とする場合だけ同じ package に含める。いずれも public `exports` subpath、backend selector、
Core logic、secret data または raw C ABI を公開しない。postinstall compile、runtime download、install-time
binary download、別 RN package および RN 用の別 WASM binary は禁止する。

## 22. Acceptance / verification evidence matrix

下表の evidence は、Implementation / integration / release verification で収集する。今回の
Specification authoring では runtime build、device test、Expo build または full test を実行しない。

| acceptance                               | required evidence                                                                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AC-054` public API parity               | Android / iOS が同じ 16 facade function、argument order、DTO、`null` / `undefined`、sync return / throw を観測する declaration + runtime parity record                                                                                |
| `AC-055` Core authority / secret cleanup | Core / C ABI / RN adapter responsibility inspection、secret-bearing input/output ownership、failure / exception / cancellation / teardown cleanup、no cache / no log evidence                                                         |
| `AC-056` fail closed / error parity      | missing provider、missing artifact、wrong ABI / slice、manifest digest failure、Core error、C ABI error、conversion error、runtime invalidation、stale result の mapping matrix。Node / WASM fallback がない execution trace          |
| `AC-057` non-regression                  | Node native、Node `--no-addons` WASM、Browser WASM、Browser Extension、existing C ABI、public API、release / provenance の before / after parity record                                                                               |
| `AC-058` version support                 | RN `0.86.x` compatibility / `0.87.x` primary の finite support window、stable-only、re-baseline record、Android API 24、Bare iOS 15.1、Expo SDK 57 stable + RN 0.86.x、Expo iOS 16.4、New Architecture の build / release gate record |
| `AC-059` architecture / ABI              | Android `arm64-v8a` / `x86_64`、iOS device `arm64`、Apple Silicon simulator `arm64` の load / link / invoke record。unsupported ABI / Intel simulator rejection                                                                       |
| `AC-060` integration path                | Node / Browser が RN setup を要求しないこと、RN が Node addon / WASM を要求しないこと、single package root import、private condition resolution の Metro / bundler record                                                             |
| `AC-061` responsiveness / resource       | §23 の production-equivalent evidence protocol。negative evidence がなければ sync gate 継続、negative evidence があれば user decision record を作成                                                                                   |

追加の acceptance evidence は次を含む。

- Android native load、iOS native load、C ABI invocation、exact output / signature parity
- Store mutation、replacement Store、wrong password、wrong Chain / Network、malformed / truncated input、error parity
- runtime-local teardown、process-wide teardown、multi-runtime serialization、reentrancy rejection
- admission 前 cancellation、in-flight cancellation cleanup、stale result rejection、secret cleanup
- artifact manifest、target digest、provenance、approved npm assembly、extra artifact rejection
- Expo Development Build と Expo Prebuild / CNG の native regeneration / custom module integration

## 23. Responsiveness / resource evidence protocol

### 23.1 Test setup

各 C2 operation と、§4.2 の trigger-set に該当する C0 / C1 operation を、次の条件で測定する。全 operation は
common admission / blocking / starvation / cleanup baseline の対象であり、class 名だけを理由に §23 の観測を
省略してはならない。

- representative Android physical device class: approved `arm64-v8a` device、release-equivalent build
- representative Android emulator class: approved `x86_64` emulator、同じ native artifact family
- representative iOS physical device class: approved `arm64` device、Bare RN iOS baseline
- representative Apple Silicon simulator class: approved `arm64` simulator。Expo subset は iOS 16.4+
- RN `0.87.x` primary validation、`0.86.x` compatibility line、stable release、New Architecture
- Expo evidence は formal pair の Expo SDK `57` stable + RN `0.86.x` に限定し、他の Expo SDK / RN pair へ
  compatibility claim を推論しない
- production-equivalent native build、debugger / profiler の影響を除いた release configuration、published
  package assembly と同じ native artifacts
- representative Store / input と、Wallet Store Format が許す reasonable worst-case valid Store / input class。
  秘密値そのものを evidence、log、trace または report に保存せず、入力 class、size、digest だけを記録

### 23.2 Observation protocol

各実行で次を separate observation として記録する。

- Core execution cost と process-wide admission wait
- JS runtime thread / UI thread の blocking、frame / event responsiveness impact
- native CPU、memory、allocation、queue depth および resource retention
- long-running operation 中に別 runtime / context が starvation しないか
- admission 前 cancellation、runtime invalidation、teardown、process shutdown の cleanup
- Core invocation 中は forced thread termination を行わず、completion 後の output / temporary / C ABI release
- success、Core error、binding error、stale completion、retry、reload 後に secret、partial result、authorization、
  replacement Store が残らないこと

exact milliseconds threshold、device model、queue fairness algorithm、worker count、timeout および public
cancellation API は本書で新規に固定しない。evidence は raw observation、environment、operation class、
input class、build identity、artifact digest、再現手順、評価結果および compatibility impact を含む。

### 23.3 Negative evidence gate

次のいずれかが evidence で確認された場合、negative responsiveness evidence として記録する。

- Requirements が求める reasonable responsiveness / resource boundedness を同期 contract で満たせない
- process-wide serialization が operation-specific に indefinite starvation または unsafe resource retention を示す
- lifecycle interruption / cancellation / teardown が secret cleanup、ownership または result rejection を保証できない

negative evidence は async 化または RN support exclusion の自動決定ではない。対象 operation、影響範囲、
compatibility impact、evidence、選択肢および user decision を別 record で承認するまで、既存 sync facade を
silent に変更しない。negative evidence が存在しない現在の状態は **`DEFERRED UNTIL NEGATIVE EVIDENCE`** とする。

## 24. Traceability

### 24.1 Requirements → Design → Specification

| upstream           | specification contract                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `UF-RN-001`        | §4.3、§23。sync compatibility、responsiveness / resource evidence、failure cleanup、async / exclusion の user decision gate |
| `NFR-008`          | §2、§3、§4。public API parity、sync baseline、no silent runtime divergence                                                  |
| `NFR-015`          | §4.2、§4.3、§23。operation classification、blocking、resource、cancellation、cleanup evidence                               |
| `AC-054`〜`AC-061` | §22。public parity、Core authority、fail closed、non-regression、version、ABI、integration、responsiveness evidence         |
| `DR-RN-001`        | §4、§8、§9。public sync と native execution context、reentrancy、lifecycle                                                  |
| `DR-RN-002`        | §5〜§10。process-wide coordinator、runtime / context identity、serialization、teardown、stale completion                    |
| `DR-RN-003`        | §1.2、§11、§12、§13、§15。existing C ABI reuse、private boundary、non-exposure                                              |
| `DR-RN-004`        | §21、§22、§25。source → build → target → digest / provenance → npm assembly                                                 |

### 24.2 Approved Platform Decision traceability

| decision    | reflected contract                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PD-RN-001` | §1.1、§17.1、§20.1、§23。RN `>=0.86.x` を floor とし、formal window を `0.86.x` compatibility / `0.87.x` primary に限定、stable-only、re-baseline を要求                         |
| `PD-RN-002` | §1.1、§14.3、§20.1。Android API 24、target / compile policy                                                                                                                      |
| `PD-RN-003` | §1.1、§15、§16、§17.1、§20.1。Bare iOS 15.1、Expo iOS 16.4                                                                                                                       |
| `PD-RN-004` | §1.1、§14.1、§20.1、§21。Android `arm64-v8a` / `x86_64` only                                                                                                                     |
| `PD-RN-005` | §1.1、§16、§20.1。iOS device arm64、Apple Silicon simulator arm64                                                                                                                |
| `PD-RN-006` | §1.1、§13、§15、§18。TurboModule / JSI required、Legacy unsupported                                                                                                              |
| `PD-RN-007` | §1.1、§17、§20.1、§20.2、§22、§23。Bare / Development Build / Prebuild formal、Expo SDK 57 stable + RN 0.86.x pair、unlisted / mismatch / canary / nightly / Expo Go unsupported |

### 24.3 Non-regression references

Node native / WASM fallback、Browser WASM、Browser Extension、Node engine、Node artifact manifest、single WASM
binary、C ABI public semantics および package root declaration は [`npm-typescript-facade.md`](npm-typescript-facade.md)
§4〜§16 を変更せずに参照する。Rust Core の chain / network、signature、Store、error、zeroize および
Native C ABI は [`specification.md`](specification.md) §4〜§14 を参照し、RN adapter が別 semantics を作らない。

## 25. Specification / Implementation / Release boundary

本書で固定したものは、public API parity、runtime routing、private entry placement、TurboModule / JSI
requirement、C ABI reuse、buffer / encoding / ownership、process-wide coordination、identity、ordering、
cancellation、teardown、stale result、secret boundary、error mapping、artifact identity、platform matrix、
Expo scope、acceptance evidence および responsiveness gate である。

次は、外部 behavior が本書を変えない限り Implementation / release verification に委譲する。

- mutex、queue container、executor、worker、lock ordering、atomic / memory ordering
- exact C++ / Kotlin / Swift / Objective-C class decomposition、file layout、helper function name、JNI method name
- TurboModule Codegen schema の内部 method、JSI HostObject の内部構造、autolinking の内部実装
- allocator、zero-copy optimization、temporary buffer の具体 copy count。ただし ownership、length、cleanup は §11 を満たす
- Gradle / CMake / CocoaPods の内部 task、target、build flag。`minSdk`、required slice / ABI、New Architecture は固定
- exact manifest generation command、attestation provider、CI job name、release workflow の内部構成。ただし existing
  SBOM / provenance policy と §21 の evidence relationship は維持する
- device model、exact benchmark threshold、timeout および public cancellation API。negative evidence の判定は §23 に従う

### 25.1 Decision / follow-up status

- `NEEDS USER DECISION`: **なし**。RN version、Android API / ABI、iOS baseline / architecture、New Architecture および Expo scope は `PD-RN-001`〜`PD-RN-007` の Approved input として確定済み
- `REQUIREMENTS FOLLOW-UP REQUIRED`: **なし**。`requirements-review-010.md` は `READY`、`UF-RN-001` は Resolved
- `DESIGN FOLLOW-UP REQUIRED`: **なし**。`react-native-design-review-003.md` は `READY`、`DR-RN-001`〜`DR-RN-004` は Resolved
- async API / operation-specific RN support exclusion: **`DEFERRED UNTIL NEGATIVE EVIDENCE`**。negative evidence は現時点で確認されておらず、gate を発動しない

## 26. References

- [`concept-sheet.md`](../consept/concept-sheet.md)
- [`requirements.md`](../requirements/requirements.md)
- [`requirements-review-010.md`](../reviews/requirements/requirements-review-010.md)
- [`architecture.md`](../design/architecture.md)
- [`bindings.md`](../design/bindings.md)
- [`security.md`](../design/security.md)
- [`react-native-design-review-003.md`](../reviews/design/react-native-design-review-003.md)
- [`react-native-platform-baseline.md`](../decisions/react-native-platform-baseline.md)
- [`specification.md`](specification.md)
- [`npm-typescript-facade.md`](npm-typescript-facade.md)
- [`wallet-store-format-v1.md`](wallet-store-format-v1.md)
- [React Native package exports support](https://reactnative.dev/blog/2023/06/21/package-exports-support)
- [Metro package exports](https://metrobundler.dev/docs/package-exports/)
- [Metro configuration](https://github.com/react/metro/blob/main/docs/Configuration.md)
