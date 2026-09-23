# README Review 005 — Mobile の v1 対象化

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Reviewed commit: `f98a67f9a335d0b845d1b2979b1f9da906fde3fd`
- Review date: 2026-09-23（Asia/Tokyo）
- 成果物: `docs/reviews/readme/README-review-005.md`
- Review mode: README parity mode
- Target README set:
  - [`README.md`](../../../README.md) — repository root の日本語正本
  - [`packages/wallet-core/README.md`](../../../packages/wallet-core/README.md) — npm package の日本語正本
- Review scope: commit `f98a67f` による日本語表現の整理と、Mobile（React Native Android / iOS）を v1 対象として示す公開説明について、root / package 間の semantic parity、manifest、公開 TypeScript API、runtime routing、React Native integration、security boundary、テスト、license、関連仕様との一致を確認した。
- 未確認範囲: Android / iOS の実機・simulator build、Expo SDK 57 + RN `0.86.x` の Development Build / Prebuild、RN `0.86.x` の compatibility build、正式な4 target RN artifact を含む npm tarball、production publish。これらを成功済みとは扱っていない。

## Execution Audit

- Reviewer A（Factual / API accuracy）: package / crate 名、install、conditional exports、16関数、型、runtime routing、supported environment、license を manifest、declaration、実装、仕様と照合した。
- Reviewer B（Onboarding / Examples / Links）: root / package の役割分担、Node.js quick start、React Native の導入経路、consumer integration、相対リンクを独立に確認した。
- Reviewer C（Constraints / Security / Cross-document parity）: React Native の対象 / 対象外、Node / WASM fallback 禁止、artifact / provider failure、secret、handoff / export / signing、root / package 間の意味の一致を独立に確認した。
- Chair が候補を反証・統合した。サブエージェントは使用していない。
- README、manifest、仕様、実装、テスト、workflow は変更していない。本成果物だけを新規作成した。

## Evidence Used

| Evidence | Use |
| --- | --- |
| [`README.md`](../../../README.md)、[`packages/wallet-core/README.md`](../../../packages/wallet-core/README.md) | 対象本文、root / package の公開契約、導入、Mobile scope、security、license |
| `README.en.md`、`packages/wallet-core/README.en.md` | 対象外 translation に Mobile の同じ公開意味が存在することの補助確認 |
| `packages/wallet-core/package.json`、root `package.json`、Cargo manifest、`LICENSE` | package / crate 名、version、exports、Node engine、files、codegen、license、build / test entry |
| `packages/wallet-core/src/index.d.ts` | 16関数、同期 API、DTO、`Uint8Array`、error contract |
| `packages/wallet-core/src/react-native/*`、`android/*`、`ios/*`、`cpp/*`、`react-native.config.cjs` | private RN entry、TurboModule、artifact identity、provider、lifecycle、Android autolinking boundary、iOS integration |
| `integration/react-native/consumer/*` | 現行 RN `0.87.0` consumer が必要とする Android CMake / provider / lifecycle と iOS AppDelegate / Pod integration |
| `.github/workflows/node.yml` | RN artifact / consumer の current validation line と release assembly |
| `packages/wallet-core/test/react-native.test.mjs`、`manifest.test.mjs`、`package.test.mjs` | conditional export、provider failure、artifact identity、package inventory の検証意図と現在の実行結果 |
| `docs/specifications/npm-typescript-facade.md`、`react-native.md`、`specification.md` | facade、RN platform / integration、Core / C ABI / error の公開契約 |
| `docs/reviews/specifications/*-review-*.md` の今回成果物 | Specification Gate が `READY`、RN 追跡更新だけが non-blocking Minor `SR-029` であることの確認 |
| [`README-review-004.md`](README-review-004.md) | `RM-001`〜`RM-004` の状態と前回 Gate |

## Review Result

`REVISE README`

## Summary

commit `f98a67f` 後の2つの日本語 README は、Mobile を React Native Android / iOS の v1 対象として示し、同一 package root、16個の同期 API、`Uint8Array`、New Architecture、Android / iOS の対象値、Expo Go 非対応、Node addon / WASM fallback 禁止を同じ意味で説明している。package manifest、公開 declaration、React Native Specification とも契約値は一致し、Node.js quick start、Wallet Store の置換規則、handoff / export / signing、secret handling に回帰はない。

ただし、package README は「同じ package root から利用できる」と説明する一方、現行実装が必要とする consumer-side integration を案内していない。Android は generic autolinking が明示的に無効で、application CMake、`OnLoad.cpp`、Cxx package provider、lifecycle hook の接続が必要である。iOS も lifecycle-aware AppDelegate / factory と Pod integration が必要である。`npm install` と通常の import だけでは provider が登録されず fail closed するため、現在の README だけでは RN 利用者が最初の呼び出しまで進めない。

また、README は RN `0.86.x` および Expo SDK 57 + RN `0.86.x` を正式な対応範囲として断定するが、repository の source-controlled consumer、lock graph、workflow toolchain は RN `0.87.0` / `RN-0.87.x` だけである。`0.86.x` compatibility line と Expo pair の build / device evidence は確認できず、support claim を現在の実装・テストが裏付けていない。これら2件を `WARN` とし、README Gate は不合格とする。

## Finding Status

| ID | Severity | Status | Initial review | Current status basis |
| --- | --- | --- | --- | --- |
| `RM-001` | WARN | Resolved / 回帰なし | `README-review-001` | Generated Mnemonic の明示 handoff confirmation が root / package に維持される。 |
| `RM-002` | WARN | Resolved / 回帰なし | `README-review-001` | C ABI ownership、free API、failure-safe output の説明に回帰はない。 |
| `RM-003` | WARN | Resolved / 回帰なし | `README-review-001` | package root、package-local WASM、no remote download の説明に回帰はない。 |
| `RM-004` | WARN | Resolved / 回帰なし | `README-review-003` | C ABI / Node-API / npm の境界、standalone Mobile C ABI の委譲、release / supply-chain boundary は維持される。 |
| `RM-005` | WARN | New | `README-review-005` | RN の consumer-side provider / lifecycle / native build integration が README から辿れず、最初の利用へ進めない。 |
| `RM-006` | WARN | New | `README-review-005` | RN `0.86.x` / Expo SDK 57 + RN `0.86.x` の support claim に対応する実装・build / runtime evidence を確認できない。 |

Unresolved count: `ERROR 0`, `WARN 2`, `NIT 0`。

## Required Changes

### RM-005 — React Native の必須 consumer integration を案内する

- Severity: WARN
- Status: New
- 対象箇所: `packages/wallet-core/README.md` の「インストール」「React Native」、および root `README.md` の Mobile 導線。
- 確認事実: package README は `npm install`、package root import、`codegenConfig` と同梱 source / artifact manifest を説明するが、Android / iOS の具体的な integration または利用者向け手順へのリンクを示さない。`react-native.config.cjs` は Android autolinking を `android: null` にし、source-controlled consumer は application CMake / `OnLoad.cpp`、`cxxReactPackageProviders`、`SymbolNemWalletCoreRnLifecycle.attach` を明示的に追加する。iOS consumer は Pod と `SnwcRnLifecycleDelegate` / `SnwcRnReactNativeFactory` を AppDelegate へ接続する。
- 既存の根拠: `packages/wallet-core/react-native.config.cjs`、`integration/react-native/consumer/android/app/src/main/jni/*`、`MainApplication.kt`、`ios/Podfile`、`AppDelegate.swift`、`docs/specifications/react-native.md` §§3、13〜17。
- 問題: README の手順だけを実行すると required provider / lifecycle registration に到達できず、runtime は `WalletCoreBackendInitializationError` で fail closed する。利用者は、どの application files をどう接続するかを公開文書から判断できない。
- 影響: Mobile を v1 対象とする公開説明があっても、Android / iOS / Expo 利用者は install から最初の呼び出しまで再現可能に進めない。独自の接続を推測すると lifecycle、artifact identity、security boundary を外すおそれがある。
- 必要な最小修正: package README に、対応 workflow ごとの必須 integration と最小実行手順を追加するか、同じ package version に対応する利用者向け integration guide / sample へ明示的にリンクする。Android の manual provider / lifecycle / CMake / `OnLoad.cpp`、iOS の Pod / AppDelegate lifecycle、Expo Development Build / Prebuild の必要条件、New Architecture / package exports の前提を含める。root README からその導線へ到達できるようにする。
- 完了条件: 新規 consumer が README の導線だけで、対象 platform の package artifact を使い、registered provider を通して `create_empty_store` を1回呼び出せる。手順が source-controlled consumer と一致し、Node / WASM fallback や別 package を導入しない。

### RM-006 — RN 0.86 / Expo の support claim を実証済み範囲と一致させる

- Severity: WARN
- Status: New
- 対象箇所: `README.md` の React Native 概要、`packages/wallet-core/README.md` の「React Native」。
- 確認事実: 両 README は stable RN `0.86.x` / `0.87.x` と Expo SDK 57 + RN `0.86.x` を対応範囲として断定する。現行の source-controlled consumer、`package-lock.json`、Pod graph は RN `0.87.0` で、workflow の toolchain evidence も `RN-0.87.x-*` である。repository の docs / README 以外から RN `0.86.x` consumer、lock graph、build matrix または Expo pair の実行 evidence を確認できなかった。
- 既存の根拠: `integration/react-native/consumer/package.json` / `package-lock.json` / `README.md`、`.github/workflows/node.yml`、`docs/specifications/react-native.md` §§1.1、17、22〜24。
- 問題: Specification が formal compatibility line とする値を README は正しく転記しているが、README Skill が要求する「現在の実装とテストによる裏付け」を満たしていない。対象環境で未検証の状態と、利用可能な support を区別できない。
- 影響: RN `0.86.x` または Expo SDK 57 利用者が、build / provider / lifecycle compatibility が検証済みであると誤認する可能性がある。特に Expo pair は README が Mobile v1 の利用経路として明示するため、単なる内部 evidence 不足ではない。
- 必要な最小修正: 承認済み仕様を勝手に狭めず、RN `0.86.x` および Expo pair の required build / integration / runtime evidence を追加して support claim を裏付ける。evidence が整う前に README を公開する場合は、仕様・release status と整合する明確な未検証表示へ変更し、`0.87.x` の実証済み範囲と区別する。
- 完了条件: RN `0.86.x` compatibility consumer と Expo SDK 57 + RN `0.86.x` workflow について、approved Android / iOS target、New Architecture、provider / lifecycle、package root import、代表 operation、fail-closed negative path を同一 release candidate で再現でき、README の support wording と evidence が一致する。

## Optional Improvements

なし。`NIT` の New / Open / Reopened finding はない。

## Resolved Findings

- `RM-001`: Generated Mnemonic の全体提示と現在の利用者による明示確認を、finalize 前の Application 責任として維持している。
- `RM-002`: root README は C ABI の caller / Binding ownership、対応する free API、静的 error、partial result 非返却を維持している。
- `RM-003`: root / package は package root を consumer entry とし、raw WASM / generated module を公開せず、remote download を行わない。
- `RM-004`: root README は C ABI と Node-API artifact を分離し、Android / iOS の standalone C ABI 公開と RN private adapter を区別している。release provenance を Core runtime security とも混同していない。

## Upstream Feedback

なし。Concept、Requirements、Design、Specification は Mobile を v1 対象として一貫している。`RM-005` は利用者向け onboarding の欠落、`RM-006` は公開 support claim と下流 evidence の不一致であり、上流要求の曖昧さではない。

## Deferred Findings

- `packages/wallet-core/test/react-native.test.mjs` は6件中1件だけ成功し、残る5件は temporary package copy に `dist/react-native/` を作成せず `index.js` を書き込むため `ENOENT` で失敗した。これは対象 README の本文誤りとは断定せず、Implementation / test maintenance へ引き継ぐ。修正後に private entry、missing provider、invalid manifest、wrong artifact identity、conditional export の5経路を再実行する必要がある。
- Android / iOS 実機・simulator、Expo、正式 npm tarball、release provenance の検証は README review 環境では実行していない。`RM-006` の解消 evidence として別途必要である。
- React Native Specification の `SR-029` は現行 Requirements / Design review reference の軽微な更新であり、README の公開契約または本 Gate を追加で悪化させるものではない。

## Scope and Traceability

| Public contract | Root README | Package README | Supporting source / evidence | Result |
| --- | --- | --- | --- | --- |
| Package name / install / root import | Present | Present | package manifest、exports | PASS |
| 16 synchronous functions / DTO | Summary | Detailed | `src/index.d.ts`、RN private entry | PASS |
| `Uint8Array` / replacement Store | Present | Detailed | declaration、facade、Core / facade Specification | PASS |
| RN conditional export / no fallback | Present | Present | package exports、RN private entry、RN Specification | PASS |
| Android / iOS target matrix | Present | Present | RN Specification、artifact manifest model | PASS |
| RN consumer integration | Link to package README only | Required steps / consumer guide absent | RN config、source-controlled consumer | FAIL (`RM-005`) |
| RN `0.86.x` / Expo support evidence | Claimed | Claimed | current consumer / workflow are RN `0.87.x` only | FAIL (`RM-006`) |
| Handoff / export / signing | Present | Detailed | declaration、Core / facade Specification | PASS |
| Secret / security boundary | Present | Present | security / binding design、implementation boundary | PASS |
| License | Present | Present | Cargo / npm metadata、`LICENSE` | PASS |

## Domain Checks

| Domain | Result | Basis |
| --- | --- | --- |
| Documentation / onboarding | FAIL | Node.js は最初の利用まで進めるが、RN は必須 native integration の手順・導線がなく `RM-005`。 |
| Examples | PASS with limitation | Node.js / Rust examplesは型・Store replacement・secret入力を正しく示す。RN の最小例不足は integration 全体の欠落として `RM-005` に統合した。 |
| Links | PASS | 対象 README の repository-relative link target は存在する。package の公開 repository / license URL も metadata と一致する。 |
| Constraints | FAIL | platform 値と unsupported case は一致するが、RN `0.86.x` / Expo support の evidence がなく `RM-006`。 |
| Security | PASS | handoff、export、signing、secret log 禁止、Binding non-authority、fail-closed / no fallback が維持される。 |
| Translation / Cross-document Parity | PASS | root / package の共有する package、API、Mobile matrix、fallback、security、license に意味の矛盾はない。英語版も補助確認の範囲で同じ Mobile 契約を示す。 |

## Validation Results

| Validation | Result |
| --- | --- |
| `git diff --check f98a67f^ f98a67f -- README.md packages/wallet-core/README.md` | PASS |
| commit diff / root-package parity / manifest / declaration / specification cross-check | PASS。ただし `RM-005`、`RM-006` を検出 |
| repository-relative links in the target README set | PASS。参照先の存在を確認 |
| `node packages/wallet-core/test/react-native.test.mjs` | FAIL。6件中1件成功、5件は test helper が temporary copy の `dist/react-native/` を作成しないため `ENOENT`。README の成功 evidence として扱っていない |
| Rust / Native C ABI / WASM / Node full test | `NOT APPLICABLE / SKIPPED (docs-only change; README review に必要な静的実装照合のみ実施)` |
| RN Android / iOS / Expo build、device / simulator、formal package assembly | NOT RUN。この環境で未確認。成功扱いにしていない |

## Review Gates

| Gate | Result | Basis / finding |
| --- | --- | --- |
| 1. 正確性 | FAIL | RN `0.86.x` / Expo support claim が current implementation / test evidence で裏付けられない (`RM-006`)。 |
| 2. 利用可能性 | FAIL | RN consumer が required native integration を README から再現できない (`RM-005`)。 |
| 3. 制約の正確性 | FAIL | 対象値は仕様と一致するが、実証済みと未検証の support status を区別していない (`RM-006`)。 |
| 4. 整合性 | FAIL | README と specification は一致する一方、consumer / workflow evidence は RN `0.87.x` に限定され、RN test も5経路を完走しない (`RM-006`)。 |
| 5. 構成 | FAIL | Node.js の開始導線は明確だが、Mobile の最初の利用に必須の情報が consumer実装にしか存在しない (`RM-005`)。 |
| 6. Translation / multi-document parity | PASS | target の root / package、および補助確認した日本語 / 英語間で公開意味の矛盾はない。 |

## Remaining Risks and Open Decisions

- Open README findings: `RM-005`、`RM-006`。
- Mobile を v1 対象とするユーザー判断は確定済みであり、本レビューはその判断を差し戻していない。v1 対象であることと、利用者向け導入手順・support evidence が揃っていることは別に確認する必要がある。
- RN `0.86.x` / Expo pair を formal support のまま維持する場合、対応する consumer / CI / release evidence が必要である。scope の変更が必要になった場合は README だけで決めず、承認済み仕様と decision を更新する。
- `NEEDS USER DECISION`: なし。現行仕様を維持して evidence を追加する経路が存在する。

## Automatic Changes

本レビュー成果物 `docs/reviews/readme/README-review-005.md` だけを新規作成した。対象 README、manifest、仕様、実装、テスト、workflow、既存レビューは変更していない。

## Final Decision

`REVISE README`

`WARN` 2件が New のため README Gate は不合格。Mobile の v1 対象化そのものは root / package 間および承認済み仕様と整合しているが、利用者向け RN integration 導線と RN `0.86.x` / Expo support evidence を公開説明に一致させる必要がある。
