# React Native Platform Baseline Decision Gate

Status: **Decision preparation only — no user decision has been approved, adopted, or finalized.**

Research date: **2026-09-05 (Asia/Tokyo)**

Repository: `nemnesia/symbol-nem-wallet-core`

Branch: `agent/react-native-support`

Decision preparation baseline: `ad2ff78c8f5ae66005abbfa1f465a9b9c18e7f07`

Reviewed Design HEAD: `37facb8bbaa68d3a1e507ec91e2adeb586d4d238`

Design Review artifact: [`react-native-design-review-003.md`](../reviews/design/react-native-design-review-003.md), Review Gate `READY`

## 1. Purpose

React Native の native binding は、React Native version、Android / iOS deployment floor、native architecture、ABI / slice、New Architecture、Expo workflow の組合せに依存する。これらを Specification で暗黙に選ぶと、正式サポート範囲、native artifact、package resolver、lifecycle adapter、CI matrix、release evidence および利用者への compatibility claim が同時に変わる。

この artifact は、Specification に進む前に必要な Platform Baseline Decision を、現在の公式 platform support、技術的制約、保守・release・testing cost、security / lifecycle implication および ecosystem compatibility とともに比較可能にする。ここで示す `Recommended` は技術的推奨であり、ユーザーの承認を意味しない。

この artifact は Specification 本体、実装、package、native project または CI policy を定義しない。

### Freshness boundary

外部 platform 情報は 2026-09-05 に確認した。公式資料自身の更新日が確認できる場合は各行に記載した。React Native、Expo、Android、Apple、Xcode の version / support claim は将来変化し得るため、user decision を Specification に反映する直前に再確認が必要である。

## 2. Constraints inherited from Requirements / Design

今回の platform decision で変更してはいけない既存方針は次のとおりである。

- Concept は単一の Rust Core に秘密情報管理責任を集約し、Desktop / Mobile / Web / Node.js で秘密情報の通常公開範囲を変えない。React Native 専用の Wallet Core 実装や React Native 専用 npm package は導入しない。
- Repository と npm package は single repository / single npm package とする。platform 差異は package 内部へ隠蔽し、application-facing public API は共通 facade を中心に扱う。
- Requirements は React Native Android / iOS から同一 Rust Wallet Core の v1 主要機能を利用できること、既存 runtime と責務・error・binary semantics を不必要に変えないこと、unsupported platform / artifact / invocation を fail-closed に扱うことを要求する。
- TypeScript public facade → private RN entry → TurboModule / JSI adapter → Android / iOS thin native layer → existing public C ABI contract → Rust Core の topology を維持する。RN Application に C ABI を直接公開しない。
- Existing public C ABI は RN-private adapter が内部再利用する境界であり、RN-specific public C ABI、RN-specific cryptographic logic、authorization shortcut、Store cache または secret cache は追加しない。
- Rust Core は cryptography、Mnemonic、private key、signature semantics、Wallet Store integrity、validation、authorization、zeroization および secret lifecycle の authority であり、RN coordinator / adapter へ移転しない。
- process-wide RN binding coordination は、同一 process 内の全 RN runtime / module registry / logical consumer context に対する admission、serialization、cross-context ordering、shared native resource lifecycle、stale completion rejection および process-wide teardown barrier の authority とする。下位 scope は coordinator を bypass しない。
- v1 の process-wide serialization、既存 16 operation の synchronous TypeScript facade、runtime-local teardown と process-wide teardown の区別、fail-closed routing、queued secret non-retention、stale result cleanup および no silent fallback を保つ。
- Native artifact の source → controlled build → target artifact → digest / provenance → npm assembly の trust chain と、ABI / slice / load mismatch の fail-closed 処理を保つ。
- 現在の compatibility baseline は synchronous public API である。responsiveness、blocking、resource、cancellation / interruption または cleanup が Requirements を満たさないという operation-specific の実測 evidence が発生した場合のみ、async contract または RN support exclusion を別の user decision gate とする。
- 既存 Node.js policy（`engines.node >=22.0.0`、Node 22.x minimum / support line、Node 24.x primary verification line）、既存 Browser baseline、既存 backend routing および C ABI public contract は今回変更しない。
- Design Review 003 は `DR-RN-001`〜`DR-RN-004` がすべて Resolved、Open Critical / Major / Minor が 0、Requirements follow-up なし、Review Gate `READY` と判定している。platform baseline の未決定状態は Design Review の未解消 finding ではない。

根拠: [`concept-sheet.md`](../consept/concept-sheet.md) §1、§7〜§10、[`requirements.md`](../requirements/requirements.md) §1〜§2、§6、§9〜§12、[`architecture.md`](../design/architecture.md) RN sections、[`bindings.md`](../design/bindings.md) §12.1〜§12.17、[`security.md`](../design/security.md) §3〜§5、[`react-native-design-review-003.md`](../reviews/design/react-native-design-review-003.md) §17〜§21。

## 3. Decision Summary

| ID | Decision | Options | Recommended | User Decision |
| --- | --- | --- | --- | --- |
| PD-RN-001 | Minimum RN | `>=0.87`; `>=0.86`; `>=0.82`; `>=0.76` with legacy range | `>=0.86.x`; `0.87.x` primary verification、`0.86.x` compatibility、stable channel only | NEEDS USER DECISION |
| PD-RN-002 | Android API | API 24+; API 26+; API 28+ / 29+ | API 24+ (Android 7.0); Play `targetSdk` / compile SDK は別に現行値へ追随 | NEEDS USER DECISION |
| PD-RN-003 | Minimum iOS | iOS 15.1+; iOS 16.4+; iOS 17+ | iOS 15.1+ for bare RN package; Expo formal subset is iOS 16.4+ on SDK 57 | NEEDS USER DECISION |
| PD-RN-004 | Android ABI | `arm64-v8a`; `arm64-v8a + x86_64`; add `armeabi-v7a`; add `x86` | Formal `arm64-v8a + x86_64`; `armeabi-v7a` and `x86` are not formal in v1 | NEEDS USER DECISION |
| PD-RN-005 | iOS architecture / environment | device only; device + Apple Silicon simulator; add Intel `x86_64` simulator | Formal arm64 device + arm64 simulator; Intel simulator is not formal | NEEDS USER DECISION |
| PD-RN-006 | New Architecture policy | A mandatory; B primary + Legacy formal; C primary + Legacy best effort | Option A: New Architecture mandatory for formal support | NEEDS USER DECISION |
| PD-RN-007 | Expo scope | Go; development build; prebuild / CNG; bare RN; canary / other workflows | Bare RN + Expo development build + deterministic prebuild / CNG workflow formal; Expo Go and canary / nightly unsupported | NEEDS USER DECISION |

この表の `Recommended` は承認済み baseline ではない。

## 4. PD-RN-001 — Minimum React Native version

### Current platform facts

- React Native の [Releases Overview](https://reactnative.dev/releases/) は、最新 3 minor series を維持する commitment を示す。2026-09-05 に確認した表では `0.87.x` と `0.86.x` が `Active`、`0.85.x` が `End of Cycle`、`0.84.x` 以下が `Unsupported` である。stable `latest` は production 用、`next` と `nightly` は production 用ではないと定義されている。ページの最終更新は 2026-07-27。
- [React Native 0.86](https://reactnative.dev/blog/2026/06/11/react-native-0.86) は 2026-06-11 リリースで、0.85 からの user-facing breaking changes がない。0.86 は当該リリース時点で latest stable とされた。
- [React Native 0.87](https://reactnative.dev/blog/2026/08/11/react-native-0.87) は 2026-08-11 リリースで、Strict TypeScript API を default 化し、Node.js `>=22.13.0`、Android AGP 9、Kotlin 2.0+、`minCompileSdk` 34、`compileSdk` / build tools 37 を要求する。Swift Package Manager support は experimental で、CocoaPods が supported path とされている。
- [React Native 0.82](https://reactnative.dev/blog/2025/10/08/react-native-0.82) は New Architecture only の最初の release であり、Legacy Architecture の残存 code を将来さらに除去すると説明している。RN 0.84 以降も Legacy Architecture code の除去が継続している。
- 現行の [Native Modules guide](https://reactnative.dev/docs/turbo-native-modules-introduction) は TypeScript / Flow の spec、Codegen、generated native interface、Turbo Native Module を標準的な custom native module の流れとして示している。Legacy Architecture と双方を対象にする場合は別の backwards compatibility path が必要である。
- [New Architecture overview](https://reactnative.dev/architecture/landing-page) は JSI による JavaScript / native 間の直接参照と、bridge serialization の除去を説明している。これは binary transfer と typed native boundary に有利だが、同期 native call が JS thread / responsiveness に与える影響を免除する根拠にはならない。

したがって、現時点で「actively maintained」を正式 support の主な根拠にするなら `0.86.x` / `0.87.x` が現実的な範囲である。`0.82`〜`0.85` は New Architecture only でも、research date 時点では RN 自体が Unsupported であるため、active support と同じ意味には扱わない。

### Option A — `>=0.87.x` only

- **Pros**: 最新 Active series、Strict TypeScript API、最新の Android toolchain、最小の formal RN test matrix。Legacy Architecture を含めず、将来の API / module direction と最も直接に整合する。
- **Cons**: 2026-06-09 に Active となった 0.86 と、current stable Expo SDK 57 が pin する RN 0.86 を正式対象から外す。0.87 は 2026-08-11 の新しい release で、移行差分と ecosystem adoption の検証期間が短い。
- **Risks**: Expo SDK 57 と RN 0.87 を混在させると、Expo SDK が検証した native / JS version pair と異なる。0.87 の Strict TypeScript API / AGP 9 / compile SDK 37 への移行コストを consumer に集中させる。
- **Maintenance cost**: 低。1 RN line を primary として追跡しやすいが、latest release に追随する upgrade pressure は高い。
- **Release / CI cost**: 最小の RN version matrix。ただし current Expo formal support を同時に持つなら、0.87 bare と 0.86 Expo の二系統が必要になり、package の説明・evidence が逆に分岐する。
- **Security / lifecycle**: New Architecture / JSI / Codegen に一本化し、Legacy bridge の async serialization、追加 copy、別 lifecycle adapter を避けられる。Rust Core の secret lifecycle / process-wide coordinator は変わらない。
- **Recommendation**: 将来 consumer が Expo を対象外とし、最新 RN only を明示的に選ぶ場合の候補。現時点の組合せとしては次の Option B より ecosystem 整合が弱い。

### Option B — `>=0.86.x`、`0.87.x` primary + `0.86.x` compatibility

- **Pros**: 2026-09-05 時点の Active 2 line を formal support の範囲にできる。Expo SDK 57 の RN 0.86 と整合し、bare RN では RN 0.87 を primary verification line にできる。0.86 は 0.85 からの user-facing breaking changes がなく、移行負担の予測可能性も比較的高い。
- **Cons**: 0.86 / 0.87 の native registration、Codegen、toolchain、warning / build behavior を両方確認する必要がある。0.87 の Strict TypeScript API と 0.86 の API surface を同じ public facade に閉じ込める検証が必要になる。
- **Risks**: RN の release cadence が速いため、support window を固定しないと formal matrix が膨張する。0.86 は将来 End of Cycle / Unsupported へ移るため、定期的な re-baseline が必要である。
- **Maintenance cost**: 中。2 RN line の compile / registration / integration evidence を保持するが、いずれも New Architecture only であり、Legacy adapter の二重化は避けられる。
- **Release / CI cost**: 0.86 + 0.87 の native build、Android / iOS、selected ABI / slice、bare / Expo integration の組合せを検証する。RN version と OS / architecture matrix を掛け合わせるため、single-line より増える。
- **Security / lifecycle**: 同一 TurboModule / JSI topology と process-wide coordination を両 line に適用できる。Legacy bridge の別 semantics を導入しないため、secret-bearing queue、stale completion、teardown barrier の invariant を一つの方式で検証しやすい。
- **Recommendation**: **Recommended**。最小 version を `0.86.x` とし、`0.87.x` を primary、`0.86.x` を compatibility verification line とする。`latest` / stable のみを formal support とし、`next` / `nightly` は対象外とする。

### Option C — `>=0.82.x`、New Architecture only

- **Pros**: New Architecture only の RN range を一つの module topology でカバーし、Legacy bridge を含めない。0.82 からの architecture policy と概念上は整合する。
- **Cons**: 0.82〜0.85 は research date 時点で Unsupported。formal support claim のために古い RN line を実際に維持する必要があり、active security / bug-fix support の根拠が弱い。Expo の current stable SDK との direct alignment もない。
- **Risks**: 古い Gradle / Xcode / Hermes / Codegen / native artifact behavior の検証を継続する必要がある。unsupported RN を formal minimum にすると、consumer に古い ecosystem を長く保証することになる。
- **Maintenance cost**: 中〜高。architecture は単純でも、4 minor line 前後の version-specific native behavior が増える。
- **Release / CI cost**: Option B より RN version axis が増え、obsolete toolchain の維持・再現が難しい。
- **Security / lifecycle**: Legacy bridge は避けられるが、古い runtime / toolchain の native loading、threading、binary lifetime の差を security / cleanup evidence で確認し続ける必要がある。
- **Recommendation**: active support を重視する正式 baseline には推奨しない。過去 consumer を救済する temporary compatibility window としてのみ検討可能。

### Option D — `>=0.76.x`、Legacy interop を含む

- **Pros**: RN 0.76 の New Architecture default 以降から、Legacy Architecture を opt-out している app と Legacy app の両方を広く受け入れられる。既存 consumer の移行余地が最大になる。
- **Cons**: Legacy Native Module / Bridge と TurboModule / JSI の二重 adapter、二重 registration、異なる serialization / callback / lifecycle path が必要になる。RN 0.76 は New Architecture by default だが、RN 0.82 以降は Legacy opt-out ができないため、support range の境界も複雑になる。
- **Risks**: Design の synchronous public baseline と Legacy bridge の asynchronous / serializable call modelを同じ外部契約へ安全に合わせられるか未証明である。sync facade を守るために blocking wait、別 Promise semantics または adapter-specific exception path を導入すると、既存の conditional async decision を暗黙に確定するおそれがある。
- **Maintenance cost**: 高。二重 native implementation、二重 test matrix、Legacy deprecation / removal の追随、module registry と teardown の差を維持する。
- **Release / CI cost**: RN version × architecture × Android / iOS × ABI / slice の組合せが増える。Legacy build が将来の RN release で動かなくなるたびに emergency compatibility work が必要になる。
- **Security / lifecycle**: bridge serialization による secret copy / retention、callback re-entry、異なる cancellation / cleanup を追加評価しなければならない。既存 Core authority は保てるが、binding の trust surface と failure path が増える。
- **Recommendation**: v1 の formal baseline には推奨しない。採用する場合でも、Legacy formal support の exact window と synchronous contract の成立を別途明示し、実測なしに support claim を広げない。

### PD-RN-001 recommendation boundary

`>=0.86.x` は package の public API version claim と formal verification window の候補であり、RN が将来 0.88 へ進んだときも無期限に 0.86 を support することを意味しない。Specification では minimum version、primary / compatibility line、stable-only、support window、re-baseline 条件、canary / nightly exclusion を個別に記述する必要がある。

`RN 0.87` の build toolchain が Node.js `>=22.13.0` を要求することは、既存 package の `engines.node >=22.0.0` を変更する根拠ではない。RN native build / consumer toolchain precondition と package runtime engine を分離して記録する。

## 5. PD-RN-002 — Minimum Android API level

### Facts and distinction between min / target / compile

- React Native 0.75 の [release announcement](https://reactnative.dev/blog/2024/08/12/release-0.75) は、0.76 から minimum SDK を API 23 から API 24（Android 7.0）へ、minimum iOS を 13.4 から 15.1 へ引き上げると説明している。React Native 0.76 の [release post](https://reactnative.dev/blog/2024/10/23/release-0.76) でも同じ minimum platform change を確認できる。
- React Native repository の公式 `main` の [Android version catalog](https://github.com/react/react-native/blob/main/packages/react-native/gradle/libs.versions.toml) は、2026-09-05 の確認時点で `minSdk = 24`、`targetSdk = 36`、`compileSdk = 37`、`ndkVersion = 27.1.12297006` を示していた。これは current implementation baseline の evidence であり、本 repository の target policy を自動確定するものではない。
- RN 0.87 の [release post](https://reactnative.dev/blog/2026/08/11/react-native-0.87) は `minCompileSdk = 34`、`compileSdk` / build tools 37、AGP 9、Kotlin 2.0+ を要求する。`compileSdk` / `targetSdk` は install 可能な minimum OS (`minSdk`) とは別である。
- Google Play の [target API requirement](https://developer.android.com/google/play/requirements/target-sdk) は、2026-08-31 から新規 app と app update の submission に Android 16 / API 36 以上の target を要求する（Wear OS 等の例外を除く）。これは minimum install API を 36 にする要求ではなく、古い Android での runtime compatibility を保持したまま target を上げられる。
- Android NDK の [ABI / platform guidance](https://developer.android.com/about/versions/nougat/android-7.0-changes) は、API 24 以降で private platform library access が制限されることを示す。Rust native artifact は public NDK / platform API のみを利用し、private library dependency を作らない前提で API 24 を扱う必要がある。
- Native code を含む app は 16 KB page size の影響を受ける。[Android 16 KB page-size guidance](https://developer.android.com/guide/practices/page-sizes) は、Android 15 以降の 64-bit device 対応と、2027-02-01 から Play update に対する compatibility requirement を説明している。API floor を下げても、Rust / NDK artifact の 16 KB rebuild / test 責任は消えない。

### Option comparison

| Option | Compatibility / practical coverage | Tooling / native constraints | Maintenance / release / test cost | Recommendation |
| --- | --- | --- | --- | --- |
| API 24+ (Android 7.0+) | RN 0.76+ の platform floor と一致。古い ARM device を含む install range を維持できる。公式資料に current device share の数値はないため、coverage percentage は主張しない。 | API 24 の dynamic linker / private library restriction を前提に public NDK API のみで load する。Rust Android target と modern NDK の組合せを lower runtime で実機検証する。 | Oldest supported OS の loader、thread、crypto / native loading、failure cleanup を含めた device / emulator test が必要。AAB なら ABI-specific configuration APK で配布サイズを抑えられる。 | **Recommended**。RN floor との整合と coverage の均衡がよい。 |
| API 26+ (Android 8.0+) | API 24–25 device を除外する。Android 8.0 の platform behavior を floor とする、より modern な app policy。 | API 24 / 25 の古い loader / behavior を formal test から外せるが、Rust native artifact と RN compile / target settings は別に必要。 | API 24+ より test / support 範囲は小さい。Play target 36、16 KB、64-bit の責任は残る。 | 広い device coverage が不要と確認できる場合の alternative。 |
| API 28+ または API 29+ (Android 9 / 10+) | 古い device を大きく除外し、64-bit / modern Android behavior を優先する。exact market share を根拠にした選択ではない。 | lower API の compatibility workaround を減らせる可能性があるが、API floor 自体は Rust / loader / security correctness を保証しない。 | 最小寄りの device test matrix。application consumer の install exclusion と support claim を明示するコストがある。 | Minimal set には候補だが、v1 package の default recommendation ではない。 |

### Security, cryptography and lifecycle implications

API 24+ を採用する場合、native loader が古いから暗号処理を古い OS の private library へ委ねる、という設計はできない。Rust Core の cryptographic authority は維持し、native layer は approved artifact の load、registration、C ABI mediation、error propagation に限定する。API 24 の real device / emulator では、library load failure、unsupported ABI、initialization failure、concurrent invocation、teardown、stale completion、secret temporary cleanup を検証対象にする。

API 26+ / 28+ は古い OS の動作差を減らせる可能性があるが、OS floor を上げることは host compromise、crash dump、JS GC、native substitution または application secret handling を安全にする保証ではない。Design の trust boundary と no-secret-cache invariant は全 option で同じである。

### PD-RN-002 recommendation

**Recommended: minimum Android API 24 (Android 7.0) +.** `minSdk` は RN / native artifact の install floor とし、Play submission の `targetSdk`（research date では API 36+）、`compileSdk` / build tools（current RN 0.87 implementation evidence では 37）および NDK version を混同しない。Specification ではこれらを別の build / release inputs として扱う。

## 6. PD-RN-003 — Minimum iOS version

### Current facts

- React Native 0.75 / 0.76 の公式 release information は、RN 0.76 から minimum iOS version を 13.4 から 15.1 へ変更したことを示す（[0.75 announcement](https://reactnative.dev/blog/2024/08/12/release-0.75)、[0.76 release](https://reactnative.dev/blog/2024/10/23/release-0.76)）。
- Apple の [Xcode system requirements](https://developer.apple.com/xcode/system-requirements) は、research date に確認した Xcode 26 series で iOS 15 以降の deployment / device / simulator range を示している。Xcode 26 は macOS Sequoia 15.6 以降を要求する（[Xcode 26 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes)）。
- Apple の [upcoming requirements](https://developer.apple.com/news/upcoming-requirements/) は、2026-04-28 以降 App Store Connect に upload する app を Xcode 26 以降、iOS 26 SDK などで build する必要があると示す。これは deployment target を iOS 26 にする要求ではない。
- iOS native artifact は device と simulator を同じ binary に混在させず、XCFramework で platform / environment ごとに分ける必要がある。Apple の [multiplatform binary framework guidance](https://developer.apple.com/documentation/Xcode/creating-a-multi-platform-binary-framework-bundle) は、device arm64 と simulator の arm64 / x86_64 slices を別 binary として扱うことを説明する。
- Expo SDK 57 の [SDK reference](https://docs.expo.dev/versions/latest/) は、RN 0.86、Android 7+、iOS 16.4+、Xcode 26.4+ を対応 pair として示す（research date に latest は SDK 57）。これは bare React Native package の iOS floor ではなく、Expo SDK 57 integration subset の floor である。

### Option comparison

| Option | Compatibility | Xcode / native module impact | Maintenance / release / test cost | Recommendation |
| --- | --- | --- | --- | --- |
| iOS 15.1+ | RN 0.76+ floor、RN 0.86 / 0.87 bare integration と整合。iOS 15.x device を含められる。 | Xcode 26 の current distribution toolchain と併用できる。thin Objective-C / Swift / Objective-C++ layer は availability check と deployment target を明示する必要がある。 | iOS 15.1 device、arm64 device、selected simulator、link / load / lifecycle / cleanup を最古 floor で検証する。 | **Recommended for bare RN package**。 |
| iOS 16.4+ | Current Expo SDK 57 の iOS floor と一致し、Expo formal matrix を一つにしやすい。iOS 15.1–16.3 を除外する。 | Xcode 26.4+ / Expo SDK 57 と直接整合。iOS availability branching と古い device testing を減らせる。 | Bare RN の compatibility は狭くなるが、Expo formal support を主対象にする場合は CI / release evidence が単純になる。 | Expo-first product policy の alternative。 |
| iOS 17+ | より modern な OS range に限定し、older OS test / availability を最小化する。 | Native APIs を newer floor に寄せやすいが、Rust target / XCFramework / RN native boundary 自体の主要 complexity は残る。 | 最小寄りの test matrix。consumer coverage と iOS 16.x support を失う。 | Minimal set の候補だが、platform requirement からは導かれない。 |

### Security and lifecycle implications

iOS floor を上げても、Rust Core の secret ownership、C ABI reuse、native temporary の cleanup、process-wide coordinator、runtime-local teardown、stale result rejection または fail-closed loader policy は変えない。older iOS を除外することで test burden は下がるが、native artifact が正しい slice を load すること、device / simulator を取り違えないこと、failure 時に secret-bearing state を保持しないことは全 option で必要である。

Apple の distribution SDK requirement と package の deployment target は別の Specification field とする。少なくとも Apple の current Xcode 26 policy は iOS 26 SDK build を要求するが、iOS 15.1 deployment target を自動的に禁止していない。最終的な App Store submission evidence は user decision 後の selected Xcode / SDK policy と照合する。

### PD-RN-003 recommendation

**Recommended: bare React Native package は iOS 15.1+.** Expo を正式対象にする場合、Expo SDK 57 consumer は iOS 16.4+ の subset と明示する。これにより package の broad native floor と Expo SDK の own floor を混同しない。

## 7. PD-RN-004 — Android ABI matrix

### Evaluation criteria

Android native artifact は ABI ごとに Rust target、NDK link / load、AAR / `jni` layout、Gradle resolution、package size、runtime mismatch failure、CI build、device / emulator test および release evidence が増える。Android NDK の [supported ABIs](https://developer.android.com/ndk/guides/abis) は `arm64-v8a`、`armeabi-v7a`、`x86`、`x86_64` を区別する。Rust の [Android platform support](https://doc.rust-lang.org/rustc/platform-support/android.html) は `aarch64-linux-android`、`armv7-linux-androideabi`、`i686-linux-android`、`x86_64-linux-android` 等を cross-compile target として挙げる。

Google Play は native code app に 64-bit support を要求し、[App Bundle](https://developer.android.com/guide/app-bundle/app-bundle-format) は device configuration ごとに ABI-specific APK を生成・配布できる。したがって、ABI を増やすと published package の consumer download size を AAB split で抑えられる一方、npm package に bundled native artifact を含める場合の package size、assembly、digest / provenance、local install size は増える。

### ABI-by-ABI assessment

| ABI | Current device / emulator relevance | Google Play relevance | Rust artifact cost | CI / testing requirement | npm / release impact | Long-term assessment |
| --- | --- | --- | --- | --- | --- | --- |
| `arm64-v8a` | **Primary physical-device target**。64-bit ARM Android device の標準的な native target。 | 64-bit native app の主要 device ABI。Play の 64-bit requirement と直接整合する。 | `aarch64-linux-android`。Rust official platform support の supported Android target。1 production device artifact。 | 少なくとも API floor の physical device / emulator、load / invoke / release、16 KB page-size environment を検証する。 | 1 device `.so` group。AAB では device-specific delivery になり、fat APK の重複を避けられる。 | **Formal support recommended**。v1 の必須 ABI。 |
| `armeabi-v7a` | 32-bit ARM device でのみ必要。古い Android hardware を救済できるが、current new-device target としての優先度は低い。市場比率は primary sources で確認していないため数値を主張しない。 | 32-bit ARM compatibility を提供するが、native app は対応する 64-bit variant も必要。`arm64-v8a` の代替にはならない。 | `armv7-linux-androideabi` 等の 32-bit artifact。pointer width、alignment、atomic、assembly、crypto dependency、C ABI width の別検証が必要。 | 実機または API floor emulator を 32-bit ARM で維持し、ABI-specific loader / C ABI pointer / length / error / cleanup を検証する。 | 追加 `.so` と package bytes、manifest / allowlist / provenance entry。AAB download は split でも npm tarball / cache は増える。 | **Optional compatibility only**。明示的 consumer demand がなければ v1 formal scope から除外する。 |
| `x86_64` | Android emulator / CI の主要な 64-bit x86 option。実機は ARM より限定的だが、native integration を再現する検証 target として価値がある。 | x86_64 device / emulator への configuration delivery が可能。Play で ARM device の代替とはみなさない。 | `x86_64-linux-android`。別 `.so` と ABI-specific linker / runtime test。 | CI emulator、load / invoke、invalid ABI fail-closed、16 KB x86-64 environment を検証する。Apple Silicon host では ARM64 emulator option もあるため、formal x86_64 は explicit CI target とする。 | 追加 `.so` と release digest / SBOM / provenance。AAB による consumer download split は可能だが npm package assembly は増える。 | **Formal verification recommended**。device distributionより emulator / CI reproducibility の価値で含める。 |
| `x86` | 32-bit x86 device / emulator。現行 Android native release の優先 target としては低く、`x86_64` の代替にもならない。 | 32-bit x86 distribution の benefit は限定的。64-bit requirement を満たすには `x86_64` も別途必要。 | `i686-linux-android`。32-bit pointer / alignment / C ABI / third-party dependency の追加 path。 | 32-bit x86 emulator / artifact を継続的に維持する必要がある。 | 追加 size、loader branch、provenance、test evidence。 | **Not recommended / unsupported in v1** unless a named consumer requires it. |

### Additional ABI candidates

NDK が列挙する deprecated / historically removed ABI（MIPS、`armeabi`、古い 32-bit target）や、Rust / Android の current mainstream support path でない architecture は、仕様にない compatibility claim を追加しない。将来の Android target ABI は別の user decision / release gate とする。`riscv64-linux-android` は Rust docs で Tier 3 とされるため、現時点の formal v1 ABI 候補には含めない。

### Package size, distribution and testing nuance

fat APK に全 ABI を同梱すると native library の重複によりサイズが増える。Play AAB は configuration APK へ分割できるが、RN package 自身が配布する npm tarball、local cache、CI artifact、SBOM、digest / provenance は ABI ごとに増える。`x86_64` を formal に含める理由は主に emulator / CI の native path verification であり、`x86` や `armeabi-v7a` を自動的に含める理由にはならない。

### PD-RN-004 recommendation

**Recommended formal matrix: `arm64-v8a` + `x86_64`.** `arm64-v8a` は physical device / Play primary、`x86_64` は emulator / CI および存在する x86-64 device の native artifact target として扱う。`armeabi-v7a` は named consumer / distribution requirement がある場合のみ追加候補、`x86` は v1 formal support 外とする。

## 8. PD-RN-005 — iOS architecture matrix

### Architecture / environment distinction

以下は一つの「iOS architecture」としてまとめず、device、simulator environment、host Mac と artifact slice を区別する。

| Environment / architecture | Relevance and artifact | Rust target / support | CI / release implication | Recommendation |
| --- | --- | --- | --- | --- |
| Physical iPhone / iPad device, arm64 | Current iOS device native execution target。Production code signing / archive の device slice。 | `aarch64-apple-ios`。Rust [Apple iOS platform support](https://doc.rust-lang.org/stable/rustc/platform-support/apple-ios.html) に記載された target。Rust docs は iOS 10.0 minimum を示すが、RN / product deployment floor は別途 15.1 or selected value。 | Apple device archive、real-device smoke / lifecycle / load / cleanup、App Store archive evidence。 | **Formal required**。 |
| Apple Silicon Mac simulator, arm64 | Xcode / current CI host で native simulator を実行する主要 environment。device と同じ CPU family でも iOS simulator は別 platform slice。 | `aarch64-apple-ios-sim`。Rust docs の supported iOS simulator target。 | Apple Silicon runner / local Mac、arm64 simulator runtime、XCFramework simulator slice。 | **Formal required**。 |
| Intel Mac simulator, x86_64 | Intel Mac host の simulator compatibility。Apple docs は simulator framework の universal simulator に x86_64 と arm64 slices を入れられると説明するが、Xcode 26 updates は Intel-based Mac support を含まない smaller simulator runtime を default としている。 | `x86_64-apple-ios` は Rust docs の supported target。source build は可能だが、published artifact、host runner、runtime availability を別に維持する必要がある。 | Intel macOS runner / Xcode runtime availability、x86_64 simulator slice、additional CI job / release evidence。Apple Silicon Mac では Rosetta は host translation であり、x86_64 iOS simulator slice test の代替とみなさない。 | **Not formal in recommended v1**。explicit consumer requirement がある場合の conservative option。 |
| Device-only archive without simulator | Production archive のみ。 | Device target だけで足りるが、developer / CI が native module を simulator で検証できない。 | Local and CI integration feedback が遅く、link / load / JSI / lifecycle failure の早期検出を失う。 | Formal package support としては不十分。 |

Apple の [XCFramework guidance](https://developer.apple.com/documentation/Xcode/creating-a-multi-platform-binary-framework-bundle) は、iOS device binary は ARM64、simulator universal binary は x86_64 と Apple Silicon ARM64 の slices を持ち得ること、device / simulator binary を一つへ `lipo` で混在させないことを示す。したがって、slice を増やすことは単なる architecture flag ではなく、Rust build target、XCFramework assembly、artifact digest、link / load test および release evidence の増加である。

### Intel simulator assessment

Intel simulator を formal support に含める価値は、Intel Mac を開発・CI host として現に維持している named consumer がある場合に限り高い。研究日現在、Apple は Apple Silicon を中心とした Xcode / simulator workflow を強め、Xcode 26.3 の更新情報は Intel-based Mac support を含まない smaller simulator runtimes を default としている。一方で Apple の XCFramework documentation と Rust target support は x86_64 simulator を技術的には扱えると示している。

この差から、x86_64 simulator は「技術的に不可能」ではなく、「正式保証の追加費用に対する current ecosystem value が低い」候補である。Recommended policy では published formal slice / CI を arm64 device + arm64 simulator に限定し、Intel simulator を formal support claim に含めない。consumer が Intel host を必要とするなら、user decision で Option B を選び、x86_64 simulator slice、Intel runner、Xcode runtime availability、同一 security / lifecycle test を追加する。

### PD-RN-005 recommendation

**Recommended formal matrix: arm64 physical device + arm64 Apple Silicon simulator.** Intel `x86_64` simulator は current formal target から除外する。device-only は native integration の testability が不足するため推奨しない。

## 9. PD-RN-006 — New Architecture policy

### Current direction and Design alignment

React Native 0.76 で New Architecture が production-ready とされ default になり、RN 0.82 で runtime option として New Architecture only になった。Expo も [New Architecture guide](https://docs.expo.dev/guides/new-architecture/) で、Legacy Architecture を 2025-06 に freeze し、SDK 55 以降は New Architecture only と説明している。RN 0.87 は TurboModules を常に enabled とし、Legacy TypeScript deep-import opt-out も temporary bridge と位置付けている。

既存 Design は New Architecture / TurboModule を registration boundary、JSI を private synchronous / binary substrate とし、Android / iOS thin native layer と existing public C ABI を接続する。したがって、New Architecture を primary とすること自体は既存 Design で定義済みである。今回 user が決めるのは、Legacy Architecture を formal support contract に含めるかどうかであり、TurboModule / JSI topology を Legacy bridge topology へ置換することではない。

### Option A — New Architecture mandatory

- **Pros**: Design の TurboModule / Codegen / JSI topology と完全に整合する。RN 0.82+、current RN active lines、Expo SDK 55+ の方向に直接追随できる。registration、binary transport、synchronous return、process-wide admission、lifecycle / teardown、stale result cleanup の path を一つに保てる。
- **Cons**: Legacy Architecture を必要とする RN app / old native module ecosystem を正式対象外にする。consumer は New Architecture enabled project を用意する必要がある。
- **Risks**: Legacy app が formal support 外であることを package documentation、runtime detection、error semantics、support matrix に明示しないと、consumer が best-effort behavior を support claim と誤認する。RN 0.76〜0.81 の legacy opt-out app は adoption path を失う。
- **Maintenance cost**: 最小。one registration model、one Codegen / JSI adapter、one lifecycle / concurrency model。
- **Release / CI cost**: 最小の architecture axis。RN 0.86 / 0.87、Android / iOS、ABI / slice は残るが Legacy-specific jobs は不要。
- **Lifecycle / concurrency**: JSI の synchronous / binary substrate と process-wide coordinator を直接検証できる。Legacy bridge の callback re-entry、async serialization、bridge queue retention を別 path として抱えない。
- **Security**: native binding が crypto / authorization authority にならない invariant、secret-bearing queue non-retention、fail-closed artifact load を一つの path で保ちやすい。
- **Backward compatibility / ecosystem**: Current RN / Expo direction との整合は最も高いが、old app compatibility は最も狭い。
- **Recommendation**: **Recommended**。formal support の条件に `New Architecture enabled / required` を含める。

### Option B — New Architecture primary + Legacy Architecture formal support

- **Pros**: RN 0.76〜0.81 の legacy consumer を救済し、migration period を長くできる。New Architecture は primary のまま current app を優先できる。
- **Cons**: TurboModule / JSI adapter と Legacy Native Module / Bridge adapter を formal support する必要がある。method registration、binary conversion、error translation、callback / promise、teardown、reentrancy、cancellation、threading を二重に検証する。
- **Risks**: Legacy bridge は native calls を asynchronous / serializable model で扱うため、既存 16 operation の synchronous TypeScript facade を安全に同一 semantics で提供できるかが未確認である。blocking wait や operation-specific Promise を追加すれば、Design が conditional gate に残した async decision を実質的に先取りする可能性がある。Legacy path の result delivery が process-wide coordinator、runtime-local invalidation、stale completion cleanup を bypass しないことも必要。
- **Maintenance cost**: 高。二重 adapter、二重 module registry / lifecycle integration、RN removal schedule への追随、legacy app fixtures を継続する。
- **Release / CI cost**: RN version × architecture × platform × ABI / slice の matrix が増える。Legacy でのみ発生する copy lifetime、callback re-entry、exception / error mapping、shutdown race の evidence が必要。
- **Lifecycle / concurrency**: process-wide authority は共通でも、bridge queue と JSI direct call の実行 context が異なる。共通の admission / teardown barrier を維持できるかを formal test する必要がある。
- **Security**: bridge serialization と追加 temporary copy が secret lifecycle の検証対象を増やす。Core security authority を移転しないこと自体は可能だが、boundary threat surface が大きくなる。
- **Backward compatibility / ecosystem**: compatibility は最も広いが、Legacy Architecture の future deprecation risk と current ecosystem direction に逆行する。
- **Recommendation**: v1 formal support には推奨しない。採用するには Legacy の exact support window と sync contract feasibility を user decision と下流 evidence で別途成立させる。

### Option C — New Architecture primary + Legacy best effort / unsupported

- **Pros**: current implementation は Option A と同じく一つにできる。古い app で偶然 interop layer が動く場合の migration value を残せる。
- **Cons**: best effort の compatibility は、formal support、error / lifecycle guarantee、security evidence の範囲が曖昧になる。consumer が production wallet に採用したとき、unsupported path の failure behavior を予測できない。
- **Risks**: Legacy runtime で module が registration できるか、binary / error semantics が一致するか、secret cleanup と teardown が成立するかを保証できない。unsupported path に silent fallback や accidental success を残すと fail-closed policy に反する。
- **Maintenance cost**: Option A より説明・issue triage・compatibility investigation が増えるが、formal CI を省く分だけ実装 cost は lower。実際には不具合ごとに ad hoc support pressure が発生しやすい。
- **Release / CI cost**: Legacy formal matrix は省略できるが、negative compatibility checks と clear unsupported error を検証しなければならない。
- **Lifecycle / concurrency**: best effort で process-wide coordinator を bypass しないこと、stale completion / cleanup を失わないことを最低限検証する。未検証の behavior を成功扱いしない。
- **Security / ecosystem**: security-sensitive wallet module の compatibility label と実際の behavior の差が risk になる。RN / Expo の current direction との整合はあるが、consumer usability は ambiguous。
- **Recommendation**: formal compatibility を提供しないなら、明示的な unsupported / fail-closed policy を要求する。production wallet の v1 policy としては Option A の方が明確。

### PD-RN-006 recommendation

**Recommended: Option A — New Architecture mandatory.** New Architecture / TurboModule / Codegen / private JSI を formal integration boundary とし、Legacy Architecture は supported / compatible claim に含めない。Legacy consumer を将来救済する場合は、Option B として exact RN window、async / sync semantics、lifecycle evidence、追加 CI / release cost を改めて user decision にする。

これは、現行 Design の「New Architecture primary」を無断で別の public API policyへ変えるものではない。Specification 前に formal support claim をどこまで広げるかを明確化する推奨である。

## 10. PD-RN-007 — Expo support scope

「Expo 対応」は native runtime、workflow、SDK version pair、native artifact integration が異なるため、次のように分ける。

### Expo Go

Expo の [Development builds FAQ](https://docs.expo.dev/develop/development-builds/faq/) と [custom native code guide](https://docs.expo.dev/workflow/customizing/) は、Expo Go が fixed native libraries を含む pre-built app であり、Expo Go に同梱されていない custom native code を追加できないと説明する。Expo Go に JS bundle を upload しても native library は追加されない。

本 Wallet Core は RN native artifact、TurboModule / JSI registration、platform loader および existing C ABI mediation を必要とするため、Expo Go の fixed runtime では formal integration を成立させられない。

- **Proposed status**: `unsupported`。
- **Why**: Expo Go に package native artifact を追加できず、Node / WASM へ fallback する既存 fail-closed policy も許可しない。JS-only mock / demo は Wallet Core の formal support ではない。
- **Maintenance / release cost**: formal Go support は custom Go build / fork または別 native integrationを必要とし、Expo Go の SDK / store release cycle を package が制御できない。
- **Security / lifecycle**: fixed runtime へ native Wallet Core がない状態で JS fallback を行うと、backend semantics と secret boundary が変わる。成功扱いの fallback は不可。

### Expo development build

Expo の [development build introduction](https://docs.expo.dev/develop/development-builds/introduction/) は、development build を custom native libraries と native configuration を含められる、自分専用の Expo Go 相当の build と説明する。native code を含む library を追加した場合は development client の rebuild が必要である。

- **Proposed status**: `formal support`。
- **Scope**: package native artifact を含む debug / release-equivalent native app、TurboModule / JSI registration、Android / iOS selected ABI / slice、lifecycle / concurrency / failure behavior。
- **Cost**: Expo SDK / RN pinned pair、prebuild / autolinking、local or EAS build、Xcode / Gradle / NDK、development client rebuild を matrix 化する必要がある。
- **Security / lifecycle**: Expo layer は native artifact の packaging / integration を担うが、Rust Core security authority、process-wide RN coordination、secret lifecycle を置換しない。Expo Go へ fallback しない。

### Expo prebuild / CNG

Expo の [config plugin introduction](https://docs.expo.dev/config-plugins/introduction/) は、config plugin が `npx expo prebuild` で生成される Android / iOS native project を予測可能に変更する仕組みである。[Expo workflow overview](https://docs.expo.dev/workflow/overview/) は、native dependency / app config changes で prebuild と native rebuild が必要になること、native project を直接編集すると再生成で上書きされ得ることを説明する。

- **Proposed status**: `formal support` as an integration workflow, only if the package publishes a deterministic, versioned native integration / config-plugin contract and verifies the generated project.
- **Scope**: clean prebuild、native artifact inclusion、autolinking / Codegen registration、selected deployment floors、ABI / slice allowlist、load / invoke / release、EAS / local build parity。
- **Cost**: config plugin / generated project diff、Expo SDK / RN pair、prebuild version、clean regeneration、EAS image、Xcode / Gradle、native artifact integrity evidence を保守する。
- **Risk**: prebuild は生成物を変更するため、config plugin が application-specific native edits を破壊しないこと、native artifact が欠落したら fail-closed になることを検証する必要がある。config plugin が package の責任か application の責任かは user decision として残る。
- **Recommendation**: development build の formal support と一体の documented workflow とする。formal support を宣言するなら、config plugin / prebuild responsibility を Specification で明記する。

### Bare React Native

React Native の [environment setup](https://reactnative.dev/docs/environment-setup) は、Framework を使わず Android Studio / Xcode で native project を管理する path を説明している。Expo の [bare overview](https://docs.expo.dev/bare/overview/) も、Expo tools は existing React Native app で利用できると説明するが、custom native code を含む library には native project integration が必要である。

- **Proposed status**: `formal support`。
- **Scope**: user-selected RN formal line、New Architecture mandatory、Android / iOS formal OS and architecture matrix、native artifact load、existing C ABI reuse、process-wide coordination、release evidence。
- **Cost**: application consumer が Gradle / Xcode / CocoaPods / native project を管理する。package は integration instructions / validation contract を明示する必要がある。
- **Recommendation**: package の primary formal integration target とする。Expo workflow はこの bare native behavior を再現する subset として扱う。

### Expo SDK version pair and other workflows

Expo [SDK reference](https://docs.expo.dev/versions/latest/) は、各 SDK が一つの React Native version を target することを示す。研究日に current latest は SDK 57 = RN 0.86、Android 7+、iOS 16.4+、Xcode 26.4+ である。Expo SDK 57 の [changelog](https://expo.dev/changelog/sdk-57) は 2026-06-30 release と、2026-08-27 の RN 0.86.3 update を記録している。

このため、Recommended RN baseline が `>=0.86.x` なら Expo SDK 57 / RN 0.86 を formal Expo compatibility line として具体化でき、bare RN では RN 0.87 を primary verification line にできる。Expo SDK 57 の native project に RN 0.87 を強制的に差し替えること、Expo canary / nightly、未検証の SDK / RN mismatch は formal support に含めない。

EAS Build、EAS local / cloud、`npx expo run:*` は development build / prebuild の実行手段であり、Expo Go とは別 workflow である。EAS / canary / nightly の exact support は、対応する SDK / native image / release evidence を選択した場合だけ Specification で宣言する。

### PD-RN-007 recommendation matrix

| Expo / RN workflow | Proposed status | Reason / boundary |
| --- | --- | --- |
| Expo Go | `unsupported` | Fixed native runtime に Wallet Core native artifact を追加できない。WASM / Node fallback はしない。 |
| Expo development build | `formal support` | Custom native module / artifact を含む production-equivalent native app を build できる。 |
| Expo prebuild / CNG | `formal support` as documented workflow | Versioned deterministic config plugin / prebuild integration と clean regeneration evidence を条件とする。 |
| Bare React Native | `formal support` | Primary native integration target。 |
| Expo SDK 57 stable / RN 0.86 pair | `formal compatibility line` | Current Expo stable pair。Expo SDK 自体の iOS floor 16.4+、Xcode 26.4+ を適用する。 |
| Expo canary / nightly、RN / SDK mismatch、unlisted custom fork | `unsupported` | Formal release / regression evidence がない。 |
| Expo web / JS-only usage | `not an RN native support claim` | Existing Browser / WASM routing の範囲で扱い、RN native backend の Expo support と混同しない。 |

## 11. Recommended Baseline Set

以下は、7 decision を組み合わせたときの整合性を最もよく保つ案である。**`RECOMMENDED — NOT YET APPROVED`**。

- **RN**: `>=0.86.x`; `0.87.x` primary verification、`0.86.x` compatibility verification、stable `latest` only。`next` / `nightly` は unsupported。
- **Android minimum**: API 24+ (Android 7.0+)。Play `targetSdk` は research date 時点の API 36+ requirement、current RN 0.87 tooling companion は compile SDK 37 / AGP 9 / NDK 27.1 evidence と分離して管理する。
- **Android ABI**: formal `arm64-v8a` physical device + `x86_64` emulator / CI。`armeabi-v7a` は named demand がある場合のみ追加、`x86` は unsupported。
- **iOS minimum**: bare RN package は iOS 15.1+。Expo SDK 57 formal subset は iOS 16.4+。
- **iOS architecture / environment**: formal arm64 physical device + arm64 Apple Silicon simulator。Intel `x86_64` simulator は formal support 外。
- **New Architecture**: Option A — New Architecture mandatory; TurboModule / Codegen / private JSI を formal path とする。Legacy Architecture は unsupported。
- **Expo**: bare RN、Expo development build、deterministic prebuild / CNG workflow を formal support 候補とする。Expo Go、canary / nightly、RN / SDK mismatch は unsupported。
- **Security / lifecycle invariant**: platform choice にかかわらず Rust Core authority、private RN entry、existing C ABI reuse、process-wide coordination、synchronous baseline、fail-closed routing、no secret cache / fallback を維持する。

この set の主な整合性は、RN minimum `0.86` が current Expo SDK 57 の RN 0.86 と重なり、RN 0.82+ の New Architecture only direction とも整合し、iOS / Android floor は current RN floor に合わせながら Expo の上位 floorを別 subsetとして扱える点にある。RN 0.87 only にすると current stable Expo line との重なりが消え、Legacy formal を加えると sync / lifecycle / test matrix が増える。

## 12. Alternative Conservative Set

**CONSERVATIVE COMPATIBILITY ALTERNATIVE — NOT YET APPROVED**

- RN: `>=0.76.x`、New Architecture primary + Legacy formal support。
- Android: API 24+。
- Android ABI: formal `arm64-v8a` + `armeabi-v7a` + `x86_64`。`x86` はなお optional / unsupported。
- iOS: 15.1+、arm64 device + arm64 simulator + `x86_64` Intel simulator formal。
- Expo: development build / prebuild formal、Expo Go unsupported。
- Stable-only support; older RN lines are retained only with explicit support window and end date.

| Axis | Recommended set | Conservative set |
| --- | --- | --- |
| Compatibility | Current active RN lines、New Architecture、current Expo SDK 57 pairに集中 | Legacy RN app、32-bit ARM device、Intel simulator まで救済しやすい |
| Maintenance | RN 2 lines、one architecture path、3 native architecture targets | RN old lines、2 architecture paths、extra ABI / simulator slice |
| Package size | arm64 + x86_64 native artifact | armeabi-v7a と x86_64 を追加し増加 |
| CI / release cost | New Arch matrixのみ | Legacy bridge、32-bit ABI、Intel Mac runner、追加 artifact / provenance evidence が増加 |
| Native complexity | TurboModule / JSI + thin native layer | TurboModule / JSI + Legacy Bridge adapters と別 lifecycle / callback path |
| Future-proofing | RN current direction と高い整合 | Legacy removal / deprecation に対する負債が大きい |
| Main risk | Old consumer を formal support 外にする | synchronous contract、cleanup、test matrix を formalに成立できない可能性 |

この案は「広い互換性」を優先する比較対象であり、current RN support status と formal security evidence を考慮すると Recommended ではない。Legacy formal support を追加する場合は、`PD-RN-006` の user decision だけでなく、Specification で architecture-specific semantics を明示する必要がある。

## 13. Alternative Minimal Set

**MINIMAL MAINTENANCE / CI / ARTIFACT ALTERNATIVE — NOT YET APPROVED**

- RN: `>=0.87.x` only、stable latest、New Architecture mandatory。
- Android: API 29+ (Android 10+)。これは RN requirement ではなく、old device compatibility を意図的に狭める product policy。
- Android ABI: formal `arm64-v8a` only。Android emulator は arm64 host / image に限定し、`x86_64` を published formal artifact に含めない。
- iOS: 17.0+、arm64 physical device + arm64 Apple Silicon simulator。
- Expo: development build / prebuild formal only if the exact Expo SDK / RN pair is listed; Expo Go unsupported; canary / nightly unsupported.

| Axis | Recommended set | Minimal set |
| --- | --- | --- |
| Compatibility | RN 0.86 / 0.87、API 24、iOS 15.1、x86_64 emulator / Expo 57 subset | RN 0.87、API 29、iOS 17、arm64 device / simulator only |
| Maintenance | Active 2 RN lines and broad OS floor | 1 RN line and newer OS floor |
| Package size | 2 Android ABI groups and 2 iOS environments | 1 Android ABI group and 2 iOS environments |
| CI cost | RN × OS × ABI / slice × bare / Expo selected matrix | Smallest selected matrix; no Intel / x86_64 simulator path |
| Native complexity | Current RN plus lower OS compatibility checks | Fewer lower-OS availability / loader checks, but same Rust / C ABI / JSI authority |
| Future-proofing | Keeps current Expo 57 and lower OS consumers | Easier upgrades but may force consumer migration and loses current Expo / device coverage |
| Main risk | More evidence to maintain | Overly narrow install / consumer compatibility and RN 0.87 early-line dependence |

この案は maintenance / CI / artifact size を最小化する比較対象であり、formal product baseline の推奨ではない。API 29 / iOS 17 は current RN native module requirement からは導かれず、consumer coverage を意図的に失う。

## 14. Specification Impact

Decision が承認された後、Specification は少なくとも次の領域を選択値と traceability 付きで具体化する必要がある。

| Decision | Specification impact |
| --- | --- |
| PD-RN-001 | RN peer / support claim、minimum version と support window、stable / canary / nightly policy、TurboModule Codegen compatibility、Metro / bundler integration、RN version CI matrix、release evidence。Existing Node package engine と RN build-tool precondition の分離。 |
| PD-RN-002 | Android `minSdk`、native loader availability、Rust Android target の minimum API、Gradle / NDK / AGP / Kotlin companion versions、Play `targetSdk` / compile SDK policy、API-floor device test、16 KB page-size test、unsupported OS failure。`minSdk` と `targetSdk` を一つの値にしない。 |
| PD-RN-003 | iOS deployment target、Xcode / iOS SDK support window、Objective-C / Swift / Objective-C++ availability、Pod / native integration constraints、oldest-device lifecycle / cleanup test、App Store archive evidence。Apple submission SDK requirement と deployment target を分離。 |
| PD-RN-004 | Approved ABI allowlist、Rust target、AAR / `jni` layout、Gradle ABI selection、package artifact assembly、resolver / loader mismatch error、per-ABI digest / provenance / SBOM、AAB split expectations、device / emulator tests。未承認 ABI への silent fallback を禁止。 |
| PD-RN-005 | Approved device / simulator environments、Rust target triples、XCFramework groups / slices、Xcode archive and simulator build、CI runner / runtime requirements、Intel simulator status、link / load / release evidence、architecture mismatch failure。Device と simulator の binary を混在させない。 |
| PD-RN-006 | TurboModule / Codegen / private JSI formal contract、Legacy module status、registration and runtime detection、architecture-specific support error、process-wide coordinator integration、lifecycle / concurrency / reentrancy tests、package consumer prerequisites。Legacy formal support を選ぶ場合は separate adapter semantics と matrix を明示。 |
| PD-RN-007 | Bare RN / Expo development build / prebuild workflow、Expo SDK ↔ RN version pair、config plugin responsibility、clean prebuild and native artifact inclusion、EAS / local build evidence、Expo Go unsupported message、Expo / RN mismatch policy、integration documentation。Expo Go fallback は仕様化しない。 |

全 decision に共通する Specification impact は、private RN entry、TypeScript public facade、existing C ABI reuse、Rust Core authority、process-wide coordination、fail-closed routing、secret lifecycle、cleanup、stale result rejection、no WASM / Node fallback、package artifact trust chain および release evidence である。これらの既存方針を platform option の都合で弱めない。

## 15. Conditional Decision

### Async / RN support exclusion

Status:

`DEFERRED UNTIL NEGATIVE EVIDENCE`

Trigger:

`NFR-015` / `AC-061` の representative environment、production-equivalent native build、representative Store / input size および worst-case input class の evidence により、responsiveness、JS blocking、resource boundedness、cancellation / interruption、safe lifetime または failure cleanup が Requirements を満たさない場合。

Potential decisions:

- operation-specific async API / Promise contract
- 当該 operation または影響範囲の RN support exclusion

現時点では決定しない。worker、blocking wait、timeout、cancellation primitive、Promise 化または runtime-specific semantics を、この gate の結果だけで追加しない。process-wide serialization による cross-runtime admission wait / starvation risk も、negative evidence が発生するまではこの conditional gate の evidence 対象として扱う。

## 16. Unresolved User Decisions

以下は、今回 user が回答すべき項目である。すべて `NEEDS USER DECISION` であり、推奨値は承認済みではない。

| ID | Recommended option | Alternatives | Decision required |
| --- | --- | --- | --- |
| PD-RN-001 | `>=0.86.x`; `0.87.x` primary、`0.86.x` compatibility、stable-only | `>=0.87.x`; `>=0.82.x`; `>=0.76.x` + Legacy range | Minimum RN version、formal support window、canary / nightly policy を承認するか。 |
| PD-RN-002 | Android API 24+ | API 26+; API 28+ / 29+ | Minimum install API を承認するか。`targetSdk` / `compileSdk` は別に決める。 |
| PD-RN-003 | bare RN iOS 15.1+; Expo SDK 57 subset 16.4+ | iOS 16.4+; iOS 17+ | Minimum iOS version と Expo subset の関係を承認するか。 |
| PD-RN-004 | formal `arm64-v8a + x86_64` | `arm64-v8a` only; add `armeabi-v7a`; add `x86` | Android formal distribution / verification ABI matrix を承認するか。 |
| PD-RN-005 | formal arm64 device + arm64 Apple Silicon simulator | device-only; add Intel `x86_64` simulator formal | iOS device / simulator environment と Intel simulator の formal status を承認するか。 |
| PD-RN-006 | Option A: New Architecture mandatory | Option B: primary + Legacy formal; Option C: primary + Legacy best effort / unsupported | Legacy Architecture を formal support / compatibility claim に含めるか。 |
| PD-RN-007 | Bare RN + Expo development build + deterministic prebuild / CNG formal; Expo Go unsupported | Expo development build only; prebuild compatible-not-formal; Expo formal support 対象外 | Expo Go、development build、prebuild / CNG、bare RN、SDK / RN pair および config plugin responsibility の scope を承認するか。 |

### Out of scope for this gate

negative responsiveness / resource / cleanup evidence 発生時の operation-specific async contract または RN support exclusion は、上記 7 decision とは別に **`DEFERRED UNTIL NEGATIVE EVIDENCE`** とする。現時点で user decision を求めない。

## 17. Research Evidence and Primary Sources

### Project source of truth

- [Concept](../consept/concept-sheet.md)
- [Requirements](../requirements/requirements.md)
- [Requirements Review 010](../reviews/requirements/requirements-review-010.md)
- [Canonical Architecture](../design/architecture.md)
- [Canonical Bindings](../design/bindings.md)
- [Canonical Security](../design/security.md)
- [React Native Design Review 003](../reviews/design/react-native-design-review-003.md)

### External primary sources checked on 2026-09-05

| Area | Primary source | Claims used |
| --- | --- | --- |
| React Native release support | [Releases Overview](https://reactnative.dev/releases/)、[Versioning Policy](https://reactnative.dev/releases/versioning-policy) | Active / End of Cycle / Unsupported series、latest 3 minor commitment、stable vs next / nightly。Releases page last updated 2026-07-27。 |
| React Native current releases | [RN 0.86 release](https://reactnative.dev/blog/2026/06/11/react-native-0.86)、[RN 0.87 release](https://reactnative.dev/blog/2026/08/11/react-native-0.87)、[RN 0.82 release](https://reactnative.dev/blog/2025/10/08/react-native-0.82)、[New Architecture overview](https://reactnative.dev/architecture/landing-page) | Current active lines、0.87 toolchain、0.82 New Architecture only、JSI / TurboModule direction。 |
| React Native native modules | [Turbo Native Modules introduction](https://reactnative.dev/docs/turbo-native-modules-introduction)、[New Architecture is here](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here) | TypeScript / Codegen / TurboModule flow、JSI direct interface、Legacy compatibility distinction。 |
| Android RN baseline | [RN 0.75 announcement](https://reactnative.dev/blog/2024/08/12/release-0.75)、[RN 0.76 release](https://reactnative.dev/blog/2024/10/23/release-0.76)、[official RN Android version catalog](https://github.com/react/react-native/blob/main/packages/react-native/gradle/libs.versions.toml) | RN minimum API 24 / Android 7、iOS 15.1、current main min / target / compile / NDK evidence。 |
| Android distribution / API | [Google Play target API requirement](https://developer.android.com/google/play/requirements/target-sdk)、[Android NDK ABIs](https://developer.android.com/ndk/guides/abis)、[Android App Bundle](https://developer.android.com/guide/app-bundle/app-bundle-format) | API 36 target requirement from 2026-08-31、ABI definitions、configuration APK / split behavior。 |
| Android native security / lifecycle | [Android 7.0 behavior changes](https://developer.android.com/about/versions/nougat/android-7.0-changes)、[16 KB page sizes](https://developer.android.com/guide/practices/page-sizes) | API 24 private-library restrictions、NDK native artifact requirement、16 KB rebuild / test and Play timing。 |
| Apple / Xcode | [Apple upcoming requirements](https://developer.apple.com/news/upcoming-requirements/)、[Xcode system requirements](https://developer.apple.com/xcode/system-requirements)、[Xcode 26 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes) | Xcode 26 / iOS 26 SDK App Store submission requirement、deployment / device / simulator range、Xcode host constraints。 |
| Apple binary architecture | [Creating a multiplatform XCFramework](https://developer.apple.com/documentation/Xcode/creating-a-multi-platform-binary-framework-bundle)、[Xcode updates](https://developer.apple.com/documentation/updates/xcode) | Device arm64、simulator arm64 / x86_64 separation、XCFramework slices、Xcode 26 Intel simulator runtime direction。 |
| Rust targets | [`*-apple-ios` platform support](https://doc.rust-lang.org/stable/rustc/platform-support/apple-ios.html)、[`*-android` platform support](https://doc.rust-lang.org/rustc/platform-support/android.html) | Rust target triples、Android NDK target families、iOS device / simulator target availability。 |
| Expo SDK / compatibility | [Expo SDK reference](https://docs.expo.dev/versions/latest/)、[Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)、[Expo New Architecture guide](https://docs.expo.dev/guides/new-architecture/) | Current SDK 57 = RN 0.86、Android 7+、iOS 16.4+、Xcode 26.4+、Legacy support direction。 |
| Expo native integration | [Development builds FAQ](https://docs.expo.dev/develop/development-builds/faq/)、[Custom native code](https://docs.expo.dev/workflow/customizing/)、[Config plugins](https://docs.expo.dev/config-plugins/introduction/)、[Expo workflow overview](https://docs.expo.dev/workflow/overview/) | Expo Go fixed native runtime、development build custom native code、prebuild / CNG / config plugin behavior、rebuild requirement。 |

## 18. Gate Result

`Platform Baseline Decision Gate: PREPARED FOR USER DECISION`

この artifact は decision を準備したものであり、platform baseline を `Approved`、`Adopted` または `Final` としていない。ユーザー承認後にのみ、選択値を Specification の各 contract、support matrix、build target、artifact、CI、release evidence および integration documentation へ反映する。

### POTENTIAL DESIGN FOLLOW-UP

**なし。** Platform research は version / support scope の未決定を具体化したが、single repository、single npm package、TypeScript facade、private RN entry、TurboModule / JSI topology、existing public C ABI reuse、Rust Core authority、process-wide coordination、fail-closed routing、secret lifecycle または concurrency model との明確な技術的矛盾を確認していない。Design は変更しない。

### POTENTIAL REQUIREMENTS FOLLOW-UP

**なし。** 現行 Requirements は minimum version、OS floor、architecture matrix、New Architecture、Expo scope を user decision とし、support matrix / release gate へ引き継いでいる。RN / Expo toolchain の Node、Xcode、AGP、Kotlin、NDK 条件は downstream Specification / release evidence の具体化事項であり、既存 package Node engine policy を変更する要求不足とは扱わない。
