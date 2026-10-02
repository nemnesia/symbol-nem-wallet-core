# 公開前レビュー 004 — セキュリティと現行 release evidence

## Review Target

- 確認日: 2026-10-02。開始 HEAD: `12e9c1a44a88fd0c4530f76d9e4bc9e5d0ba7cc5`、version `0.1.0`。完了時 HEAD: `d2e75e821a02ac10c999d4354f2c7d4e9032abb8`。
- Composite target: Rust workspace（Core / C ABI / Node / WASM）、`@nemnesia/symbol-nem-wallet-core` npm package、Node addon、canonical WASM、React Native Android / iOS、C ABI release assets、公開 workflow / evidence。
- 開始時の未コミット変更は CI 3件。途中で Pod lock 関連3件の変更が現れ、差分とローカル test も確認した。最終状態は計6件の既存変更であり、HEAD の hosted CI と同じ source snapshot ではない。
- 完了直前に別途 `d2e75e8` が作成され、上記6ファイルが commit された。開始 HEAD からの変更範囲を再確認した。本文の失敗 run は開始 HEAD の証拠であり、新 commit の失敗を示すものではない。修正後 complete matrix の成功は依然として未確認。
- 最終 read-only 確認: `d2e75e8` の [candidate run 37010606353](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/37010606353)、Rust quality、CodeQL は in_progress、Dependency review は success、C ABI release preparation は skipped。進行中 run を合格として扱わず、PR 検証を full release matrix の代替にしない。
- 成果物: 本文と [implementation review 024](../implementation/implement-review-024.md)。公開操作は依頼範囲に含めず、実施していない。
- 未確認: working tree 修正後の全 target matrix、正式な final tarball / C ABI archive 全 inventory、実ブラウザ / MV3、RN 実機、外部 npm Trusted Publisher / GitHub Environment 設定、実際の provenance / durable publication。

## Execution Audit

サブエージェントは使用しない。A: README / metadata / security claims、B: package / artifact / secret boundary、C: public API / native routing / ownership / platform、D: validation / audit / permissions / release operation の4パスで自己レビューした。実装 security の根拠は別記録へ追跡し、過去の READY を現 HEAD の合格証拠へ置換しなかった。

## Evidence Used

| 資料 / 検証 | 用途 |
| --- | --- |
| root / crate manifests、package manifest、README 日英、LICENSE | name / version / runtime / public API / 責任境界 |
| Core / npm / RN Specification、Security Design、Requirements SEC | 既存契約と security boundary |
| npm ESM / CJS loaders、facade、C ABI / Node / WASM / RN source | SHA-256、routing、所有権、secret path |
| `scripts/check-local.sh`、`scripts/ci/{node-source,npm-package}.sh`、release deterministic tests | 現行検証入口と今回の実行結果 |
| `.github/workflows/{release,node,c-abi-release,coverage,dependency-audit}.yml`、release operation / record / recovery scripts | clean source、tag / source binding、protected publish、provenance、durable evidence |
| [現 HEAD の candidate run](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/37008351798) の jobs / failed logs | iOS producer の failure と下流 skip を read-only API で確認 |
| [Rust quality](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/37008351670)、[C ABI release](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/37008351618)、[CodeQL](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/37008351397) | 現 HEAD で completed / success。working tree 変更の evidence ではない |
| release reviews 001–003、implementation review 023 | finding lifecycle の識別。過去の full matrix は現 snapshot の証拠として再利用しない |

## Review Result

`NOT READY`

## Summary

現 HEAD の release candidate が iOS frozen CocoaPods install で失敗し、XCFramework、final npm assembly、全 OS consumer、browser integration が skipped になっている。作業中に checksum 修正が working tree へ追加され、失敗ログの expected value と一致しローカル Pod graph test は通ったが、実際の iOS build と complete matrix の回復は未確認である。

確認範囲で重大な secret leak、認証迂回、不正署名を確認しなかった。ただし Node の secret allocation 消去、過大 Mnemonic 正規化、RN 再入 deadlock の MEDIUM 3件が残る。「セキュリティ上問題がない」とは結論しない。Linux / Node 24 の local package は通過したが、host-only artifact は正式な composite release package を代替しない。

## Finding Status

| ID | Severity | Status | 初出 | 今回の根拠 |
| --- | --- | --- | --- | --- |
| RL-004 | Major | New | 004 | 現 HEAD の iOS producer failure、下流 release gate 未完了。working tree remediation は full matrix 未確認 |
| RL-001 | Major | Resolved（限定再確認） | 001 | ESM source の digest、ESM / CJS clean consumer の fail-closed test PASS |
| RL-002 | Major | Resolved（source 設定） | 001 | publish / publication Environment と least privilege を保持。外部 Environment 設定は未確認 |
| RL-003 | Major | Resolved（source 設定） | 003 | identity evidence を RUNNER_TEMP へ出力後 copy。operation / identity tests PASS |

未解決 blocker: Major 1件。実装の MEDIUM finding は IR-028 / 029 / 030 として別記録し、二重採番しない。

## Required Changes

### RL-004 — iOS frozen Pod graph の不一致で complete release candidate が成立しない

- 対象: HEAD の `integration/react-native/consumer/ios/Podfile.lock:2040` / `2043`、`scripts/build-react-native-release.mjs:232`–254、`node.yml` の iOS producer / downstream jobs。
- 発生事実: run `37008351798` の ios-arm64 と ios-simulator-arm64 は `pod install --deployment --no-repo-update` で失敗。ログは `SymbolNemWalletCoreRN` の old `246efb4239eee83198f327bb3ca7dc44af02a872` / new `a9e466142f176a04597f0c99ef58a16f6f2f0a36`、Podfile old `c8ace2530830ae36bc4efd992573910bcc41b792` / new `0520ed7ec0410642ae17624443ab721ca12816a2` を示す。
- 根拠: 現行 producer は source-controlled lock を変更しない frozen install を要求し、formal npm assembly は4つの Node native artifacts、RN platform artifacts / XCFramework、canonical WASM、対応する identity / evidence を要求する。supported runtime と release evidence を確認する release gates 6 / 12 に該当する。
- 影響: iOS archive を生成できず、XCFramework、final npm package assembly、Windows / macOS / Linux consumer、browser / MV3 jobs が skipped。公開を妨げる具体的な配布物 / evidence 不成立として Major。誤った配布物の公開や secret exposure は確認していない。
- 現在の修正候補: working tree の Pod lock と validator digest が updated values を採用し、Podfile SHA-1 の assertion と負例 test を追加。差分と `node scripts/test-react-native-pod-lock.mjs` / `node-source.sh` は PASS。これだけで iOS producer の実成功を認定しない。
- 最小対応: reviewable な最終 source snapshot に既存修正を反映し、その snapshot の complete candidate を成功させる。deployment / identity / checksum gate を削除して回避しない。
- 完了条件: 両 iOS producer、XCFramework、final tarball、全 platform clean consumers、browser / MV3、release evidence が同じ最終 commit / version に結び付いて成功する。修正後の CI evidence を照合してから Resolved にする。

## Optional Improvements

- IR-028 / IR-029 / IR-030 は MEDIUM / non-blocking という Implementation Skill の分類。秘密情報 hygiene と RN failure-path を改善してから公開を再評価することが望ましい。詳細・完了条件は implementation review 024。
- `pnpm-workspace.yaml` の `fast-uri 3.1.7` は root build / bundler dev dependency。root audit が moderate 1件を報告し、[advisory](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) は patched 3.1.8 を示す。公開 runtime への混入や実際の host-filter bypass path は確認していないので、Core の重大欠陥とは扱わない。更新時は lockfile と bundler checks を照合する。

## Resolved Findings

RL-001 の digest verification、RL-002 の source-controlled Environment / permissions、RL-003 の identity temporary capture は保持され、関連する deterministic / clean consumer checks が通過した。実際の registry / Environment 設定や本番公開の確認まで完了した意味ではない。

## Upstream Feedback

なし。現在の阻害事項は既存 release / platform 契約と実行証拠で判断できる。

## Deferred Findings

- 外部 npm Trusted Publisher、GitHub Environment の protection、registry collision、tag recovery、実際の provenance と durable Release inventory は本レビューでは未確認。
- final composite tarball、全 target C ABI archives、SBOM / third-party license text / checksum の全実成果物照合は未完了。deterministic fixture test の成功と区別する。
- RN 実機、browser / MV3、長時間 fuzz、coverage の新規実行は未実施。

## Scope and Traceability

| Surface | 根拠 / 結果 |
| --- | --- |
| Rust Core 0.1.0 | manifest、Specification、locked tests / Clippy / fmt / root audit PASS。crates.io publish は実施しない |
| C ABI 0.1.0 | manifest、header、ownership、runtime / sanitizer PASS、hosted C ABI preparation success。各 durable archive の照合は未実施 |
| Node native / WASM | npm manifest、16 public operations、loader digest / routing、Node 24 ESM / CJS clean consumer PASS |
| npm @nemnesia/symbol-nem-wallet-core 0.1.0 | pack allowlist / public declaration / host smoke PASS。formal全 target assembly は RL-004 |
| React Native Android / iOS | C++ lifecycle / secret owner、private entry / manifest tests。iOS producer failure、local checksum remediation、再入 IR-030 |
| release operation / evidence | tag / source / version、OIDC、SBOM / license / record / recovery fixture tests PASS。実 publication 未実施 |

## Domain Checks

| Domain | 結果 |
| --- | --- |
| Version Assessment | workspace / npm 0.1.0。レビュー自体に API / format change はなく version 変更なし |
| Documentation / Translation Parity | 16関数、binary bytes、Application / Core 責任、secret / signing / rollback の主要公開説明は確認範囲で整合 |
| Package Metadata / API / ABI | host pack / declarations / consumer PASS。npm と C ABI を別 artifact として扱う |
| Distribution | host allowlist PASS。正式 package / 全 target archives は未確認 |
| Platform | local Linux Node24 / WASM / Native PASS。full matrix は RL-004 |
| Security | 実装 MEDIUM 3件、root dev advisory 1件。重大な認証迂回等は確認範囲で未検出 |
| SBOM / License | deterministic / negative tests PASS。final digest-bound evidence 未確認 |
| Provenance / Durable Publication | source 設定・fixture tests PASS。registry attestation / durable assets 未確認 |
| Retry / Recovery | identity / operation / recovery / record fixture tests PASS。実 partial publication recovery は未実施 |
| Validation Evidence | 現 HEAD candidate failure を確認。working tree と過去・host-only evidence を混同しない |
| Public Hygiene | host pack tests は test / fixture / development file の不適切混入を拒否。正式全成果物の secret scan は未確認 |

## Validation Results

**release gate のため実行した**。詳細は implementation review 024。

- PASS: `check-local.sh rust`（locked workspace 58 tests、fmt、Clippy、fuzz check）、`wasm`（7 tests / target check）、`native`、`native-sanitizers`。
- PASS: Node24 `scripts/ci/npm-package.sh`、`scripts/ci/node-source.sh`、Pod graph negative tests。
- PASS: release identity / operation / recovery、browser parity observability、npm provenance、GitHub Release、release evidence、SBOM、license policy、C ABI release / SBOM、release record、third-party license evidence の13 deterministic test scripts。
- PASS: root / fuzz RustSec audit。RN consumer npm audit は vulnerability 報告0。
- FINDING: root `pnpm audit --json` は moderate 1 / high 0 / critical 0、exit1。
- EXPECTED INCOMPLETE INPUT: `node scripts/test-npm-release.mjs` は local host-only package の native artifact が4個でないため exit1。正式 package での合格とせず、product source defect とも断定しない。
- REPRODUCED: RN nested admission component の停止。実 JSI / Hermes 実機とは区別する。
- PASS: `git diff --check`。

WASM / audit / sanitizer の初回 sandbox 制約は安全な同一検証の制限外 retry で解消した。sanitizer は C harness の ASan / UBSan。未実施の platform / publication gate は成功扱いにしない。dependency install の全再実行は行わず、既存 lock と audit / locked builds を使用した。

## Review Gates

| Gate | 結果 |
| --- | --- |
| 1. Target identification | PASS、composite target を一意に発見 |
| 2. Public documentation | 確認範囲 PASS |
| 3. Metadata | 確認範囲 PASS |
| 4. API / ABI / compatibility | host evidence PASS、RN 再入は IR-030 |
| 5. Distribution contents | host-only PASS、final inventory は未確認 |
| 6. Platform / runtime | FAIL、RL-004 |
| 7. Security / secret handling | MEDIUM finding 付き、問題なしとは判定しない |
| 8. SBOM / license | deterministic PASS、actual final evidence 未確認 |
| 9. Provenance / identity | source / fixture PASS、external binding 未確認 |
| 10. Durable publication | fixture PASS、実公開未実施 |
| 11. Retry / recovery | deterministic PASS、実運用未実施 |
| 12. Validation evidence | FAIL、RL-004、final snapshot full matrix 不成立 |
| 13. Public hygiene | host-only PASS、final全成果物未確認 |

## Remaining Risks and Open Decisions

公開準備の阻害は complete candidate evidence の未成立。修正候補のローカル成功では解消確認できない。MEDIUM 3件と開発依存 advisory も残る。現在の source を修正・公開する作業は今回実施していない。

## Automatic Changes

レビュー文書2件のみ作成。既存 CI / Pod lock 関連6ファイルは別途 commit され、完了時の未追跡ファイルは本レビュー文書だけ。source、manifest、lock、workflow、README、commit / push / tag / registry / release は本レビューで変更していない。

## Final Decision

`NOT READY`。現段階で「セキュリティ上問題もなく公開できる」とは判定できない。最終 snapshot の complete release candidate を成功させ、残る実装指摘を再確認してから公開可否を再判定する。
