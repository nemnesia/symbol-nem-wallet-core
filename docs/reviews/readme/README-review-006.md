# README Review 006 — React Native指摘の再確認

## Review Target

- 対象: [`README.md`](../../../README.md)、[`README.en.md`](../../../README.en.md)、[`packages/wallet-core/README.md`](../../../packages/wallet-core/README.md)、[`packages/wallet-core/README.en.md`](../../../packages/wallet-core/README.en.md)
- 確認日: 2026-09-23（Asia/Tokyo）
- 成果物: `docs/reviews/readme/README-review-006.md`
- モード: root / package / JA / EN parity review
- レビュー範囲: commit `239b443`によるReact Native導入手順、support status、実証済み範囲、最初の呼び出しへの導線と、`RM-005`、`RM-006`の完了条件。
- 未確認範囲: Android / iOS実機・simulator build、RN `0.86.x`、Expo SDK 57 + RN `0.86.x`、正式npm tarballのrelease evidence。READMEはこれらを検証済みと表現していない。

## Execution Audit

- Reviewer A: manifest、conditional export、RN source、consumer、仕様と公開主張を独立に照合した。
- Reviewer B: installからAndroid / iOS native integration、package root import、`create_empty_store`までの導線とrelative linkを独立に確認した。
- Reviewer C: support status、fail-closed、no fallback、Expo Go対象外、secret boundary、JA / EN parityを独立に確認した。
- Chair統合: 完了。サブエージェントは使用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| 対象差分 | commit `239b443` | READMEの変更内容 |
| 直前レビュー | [`README-review-005.md`](README-review-005.md) | `RM-005`、`RM-006`の完了条件 |
| npm manifest | [`package.json`](../../../packages/wallet-core/package.json) | package root、`react-native` condition、Codegen、同梱ファイル |
| Android consumer | `settings.gradle`、`app/build.gradle`、`CMakeLists.txt`、`OnLoad.cpp`、`MainApplication.kt` | manual provider / CMake / lifecycle手順の照合 |
| iOS consumer | `Podfile`、`AppDelegate.swift` | Pod / factory / lifecycle手順の照合 |
| RN specification | [`react-native.md`](../../specifications/react-native.md) | v1対象、検証evidence、fail-closed、Expo scope |
| Regression test | `packages/wallet-core/test/react-native.test.mjs` | private entry、provider failure、artifact identity、conditional export |

## Review Result

`READY`

## Summary

root READMEはMobileの概要からpackage READMEのReact Native導入へ誘導する。package READMEは、New Architecture、package artifact、fail-closedを共通前提とし、AndroidのGradle project、CMake、`OnLoad.cpp`、Cxx provider、lifecycle hook、iOSのPod、factory、lifecycle delegate、Expo Development Build / Prebuildの必要条件を説明する。package rootから`create_empty_store`を同期呼び出しする最小例もあり、`RM-005`の導線不足は解消した。

RN `0.86.x`とExpo SDK 57 + RN `0.86.x`は仕様上のv1対象として維持しつつ、現在のリポジトリで実証済みのBare RN `0.87.x`と明確に区別している。未検証の環境を対応済みと誤認させないため、`RM-006`も解消した。JA / EN、root / packageの公開意味は一致する。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `RM-001`〜`RM-004` | WARN | Resolved / 回帰なし | 過去のREADME Review | handoff、C ABI ownership、package-local asset、release boundaryに回帰なし。 |
| `RM-005` | WARN | Resolved | `README-review-005.md` | Android / iOS / Expoの必須integration、source-controlled consumer、最初の呼び出しへの導線を追加した。 |
| `RM-006` | WARN | Resolved | `README-review-005.md` | 仕様上のv1対象と実証済みBare RN `0.87.x`、未検証のRN `0.86.x` / Expo pairを区別した。 |

## Required Changes

なし。

## Optional Improvements

なし。

## Resolved Findings

- `RM-005`: consumer-side provider / lifecycle / native build integrationと、`create_empty_store`までの利用導線を日英package READMEへ追加した。
- `RM-006`: support targetとvalidation statusを分離し、未取得のevidenceを成功済みと表現しないようにした。

## Upstream Feedback

なし。

## Deferred Findings

- RN `0.86.x`およびExpo SDK 57 + RN `0.86.x`のbuild / integration / runtime evidenceはrelease verificationで取得する。READMEはその状態を未検証と明示する。
- Android / iOSの実機・simulator buildは本READMEレビューでは実行していない。

## Scope and Traceability

| Public contract | Root | Package | Evidence | Result |
| --- | --- | --- | --- | --- |
| Mobile v1対象 | あり | あり | RN Specification | PASS |
| 実証済み範囲 | Bare RN `0.87.x` | Bare RN `0.87.x` | consumer / lockfile / workflow | PASS |
| Android integration | packageへ誘導 | 手順とsource links | consumer Android files | PASS |
| iOS integration | packageへ誘導 | 手順とsource links | consumer iOS files | PASS |
| Expo status | 未検証を明示 | 条件と未検証を明示 | RN Specification | PASS |
| no fallback / fail-closed | あり | あり | package source / specification | PASS |
| JA / EN parity | 同義 | 同義 | 4 README comparison | PASS |

## Domain Checks

| Domain | Result | 根拠 |
| --- | --- | --- |
| Documentation / onboarding | PASS | installからnative integration、package root import、最初の呼び出しまで追跡できる。 |
| Examples | PASS | `create_empty_store`の同期最小例は公開declarationと一致する。 |
| Links | PASS | 追加したrepository-relative targetは存在する。 |
| Constraints | PASS | 仕様上のv1対象と検証済み環境を区別する。 |
| Security | PASS | missing provider / artifact / lifecycleのfail-closedとno fallbackを維持する。 |
| Translation / Cross-document Parity | PASS | JA / EN、root / packageでcapability、status、制約、導線が一致する。 |

## Validation Results

| Validation | Result |
| --- | --- |
| `git diff --check` | PASS |
| 追加relative links | PASS |
| manifest / RN source / consumer / specification cross-check | PASS |
| `node packages/wallet-core/test/react-native.test.mjs` | PASS: 6 / 6（sandbox外で子Node process起動を許可） |
| RN `0.86.x` / Expo / device build | NOT RUN。READMEは未検証と明示し、成功扱いしない。 |

## Review Gates

| Gate | Result | 根拠 |
| --- | --- | --- |
| 1. 正確性 | PASS | 仕様対象と現在のevidenceを区別する。 |
| 2. 利用可能性 | PASS | Android / iOSの必須integrationと最初の呼び出しへ進める。 |
| 3. 制約の正確性 | PASS | 未検証のRN / Expoを対応済みと表現しない。 |
| 4. 整合性 | PASS | manifest、source、consumer、仕様、testと整合する。 |
| 5. 構成 | PASS | rootからpackageの導入節へ誘導する。 |
| 6. Translation / multi-document parity | PASS | 4 READMEの公開意味が一致する。 |

## Remaining Risks and Open Decisions

- `RM-005`、`RM-006`は解消済み。
- RN `0.86.x` / Expoのevidence取得自体はrelease gateに残るが、READMEは現状を正確に表示する。

## Automatic Changes

なし。レビュー中にREADME、実装、仕様は変更していない。

## Final Decision

`READY`
