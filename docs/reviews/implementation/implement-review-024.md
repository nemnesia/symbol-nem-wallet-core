# 実装レビュー 024 — 公開前のセキュリティ再確認

## Review Target

- 確認日: 2026-10-02。開始 HEAD: `12e9c1a44a88fd0c4530f76d9e4bc9e5d0ba7cc5`。完了時 HEAD: `d2e75e821a02ac10c999d4354f2c7d4e9032abb8`。
- 対象: repository 全体の公開可否という依頼に対し、Core の秘密情報・暗号・Store、C ABI、Node、WASM、React Native の主要境界を確認した。
- 開始時のユーザー変更: `.github/workflows/{coverage,node,c-abi-release}.yml`。途中で別途現れた `integration/react-native/consumer/ios/Podfile.lock` と `scripts/{react-native-pod-lock,test-react-native-pod-lock}.mjs` の変更も確認した。これらを本レビューが修正したものとして扱わない。
- 完了直前に上記6ファイルは別途 commit された。開始 HEAD との差分はこの6件のみで、Core / binding source は変わっていない。実行結果は開始 snapshot と上記修正に対する local evidence であり、新 commit の complete hosted matrix は未確認。
- 未確認: RN 実機での再入、全 platform matrix、実ブラウザ / MV3、長時間 fuzz、依存ライブラリ全内部・生成機械語の完全な監査。公開準備の判定は [release review 004](../release/release-readiness-review-004.md) を参照。

## Execution Audit

サブエージェントは使用せず、次の4パスで自己レビューした。

- A: 規範契約と認証、handoff / export / approval、失敗時の Store replacement を照合。
- B: entropy、password、鍵、復号 payload の owner / Drop、KDF / AEAD / RNG、binding の copy と再入を確認。
- C: Chain / Network 分岐、raw signing bytes、SDK fixture、独自 scalar 演算の境界・dalek oracle を確認。
- D: locked workspace / fuzz check、WASM、C ABI runtime / sanitizers、Node clean consumer、依存監査を実施。候補を到達経路・既存防御と照合した。

## Evidence Used

| 資料 / 検証 | 用途 |
| --- | --- |
| `docs/requirements/requirements.md` §7、`docs/design/security.md` §§3–4 | 秘密情報、認証、Application / Binding / Core の責任 |
| `docs/specifications/specification.md` §§9、12–14、`wallet-store-format-v1.md` | 公開契約、消去、暗号パラメータ、認証・parser・fixture |
| `docs/specifications/react-native.md` §8、`npm-typescript-facade.md` §§10–12 | 再入、配布・loader の契約 |
| `crates/core/src/{crypto,store,cbor,types}.rs`、対応する unit / integration tests | secret path、暗号、atomicity、parser 上限、独立 oracle |
| `crates/{c-abi,node,wasm}/src/lib.rs`、`packages/wallet-core/cpp/{NativeSymbolNemWalletCore,RnLifecycleCoordinator}.{cpp,h}`、facade / loaders | ownership、変換、再入、fail-closed |
| ローカルの `napi 3.12.2` source `arraybuffer.rs` §§990–1045、1531–1542 | IR-028 の owner、fallback、finalizer を直接確認 |
| [review 023](implement-review-023.md) | IR-028 / IR-029 の識別子と状態。結論は現在の source を再確認 |
| 下記 Validation Results | 今回実行した証拠。過去テストを今回の成功として扱わない |

## Review Result

`READY`

## Summary

確認範囲では CRITICAL / HIGH の欠陥を確認しなかった。固定 Argon2id、乱数 salt / nonce、GCM 認証、操作単位の password authorization、承認と target / context の照合、秘密 DTO の redacted Debug / Drop、上限付き Store parse、失敗時に入力 Store を変更しない処理を確認した。

中程度の問題は3件ある。既存の Node 出力消去と過大 Mnemonic 入力の2件が未解決であり、RN の再入拒否より先に mutex を取得する欠陥を新たに確認した。Skill の `READY` は HIGH 以上の必須指摘がないという判定であり、無欠陥または公開準備完了を意味しない。

## Finding Status

| ID | Severity | Status | 初出 | 今回の根拠 |
| --- | --- | --- | --- | --- |
| IR-028 | MEDIUM | Open | 023 | `output_bytes` と napi finalizer / fallback の未消去が残る |
| IR-029 | MEDIUM | Open | 023 | Mnemonic validation 前の無制限な NFKD collect が残る |
| IR-030 | MEDIUM | New | 024 | RN の nested ticket が再入検査に到達せず停止する |
| IR-027 | LOW | Deferred | 017 | hosted alerts 全体の状態は未取得。今回の lockfile audit は別途実施 |

以前の全 finding を一括して Resolved と再認定するレビューではない。

## Required Changes

なし。CRITICAL / HIGH の New / Open / Reopened は確認していない。

## Optional Improvements

### IR-028 — Node の秘密出力 allocation が消去されず解放される

- 対象: `crates/node/src/lib.rs:436` の `output_bytes`。`napi 3.12.2` の `Uint8ArraySlice::from_data` / `finalize_slice`。
- 事実: mnemonic / private key を通常の Vec に copy して渡す。external buffer の finalizer は Vec を再構築して drop するだけで、wipe しない。external buffer 禁止時の fallback と creation error でも通常 Vec の drop になる。
- 根拠: Specification §§12.1–12.3、Requirements SEC-012 の temporary copy / lifecycle。
- 影響: 認可済み export 後に allocator の解放領域へ秘密 bytes が残留し得る。追加の process memory access を要し、認証や export confirmation の迂回は確認していないため MEDIUM。
- 最小修正 / 完了条件: transfer、fallback、error、binding が所有する backing allocation の解放における消去を確認できる構成にし、各経路の targeted test と byte / backend parity を確認する。

### IR-029 — Mnemonic 拒否前に入力全体を正規化・allocation する

- 対象: `crates/core/src/crypto.rs:76` の `parse_mnemonic`、`store.rs:305` の `restore_profile`、その bindings。
- 事実: 有効 UTF-8 入力全体を NFKD String に collect した後で BIP39 word / checksum / 24-word validation を行う。Store 上限はこの入力に適用されない。
- 根拠: 規範的な English 24-word BIP39 契約、外部入力 validation と failure safety。具体的な mnemonic 最大 byte 数は仕様にない。
- 影響: 巨大 input の CPU / memory 消費、OOM による caller の局所的な可用性低下。秘密漏えいや不正署名は確認していないため MEDIUM。
- 最小修正 / 完了条件: 有効な正規化入力の互換性を維持して bounded processing とする。Core / bindings の過大入力、通常の不正入力、有効 vector を確認する。新しい byte 制限を無根拠に仕様へ追加しない。

### IR-030 — React Native の再入 guard より先に非再帰 mutex を取得する

- 対象: `packages/wallet-core/cpp/NativeSymbolNemWalletCore.cpp:83`–87、`invoke` の685行、`property` の321行、`RnLifecycleCoordinator.h` の `executionMutex()`。
- 事実: `AdmissionTicket` の member initializer が `std::unique_lock<std::mutex>` を取得してから、constructor body で `hasActiveRequestOnCurrentThread()` を検査する。outer ticket が同じ mutex を所有する nested synchronous call は、検査より先に待機する。
- 到達経路: `invoke` は ticket を取得後に JSI object property を読む。export / signing request の getter などから public operation を再呼出しできる。facade の事前 validation は nested field を immutable snapshot にせず、そのまま native へ渡す。native の property read 時だけ再入する getter でこの順序に到達できる。
- 根拠: `react-native.md` §8 は nested synchronous invocation を即時 `BindingFailure` とし、queue 待ちや内側の実行を禁止している。
- 影響 / Severity: 同じ JS thread の停止、outer の secret temporary / request lifecycle の終了不能。JS getter / callback による再入が必要であり、secret recovery / arbitrary signing は確認していない。局所的な可用性・契約上の問題として MEDIUM。
- 再現: production source から `AdmissionTicket` class 本体を変更せず `/tmp/snwc-review-reentry.cpp` へ抽出し、Runtime 型だけを dummy に置換。実際の `RnLifecycleCoordinator.cpp` と `c++ -std=c++17 -pthread` で compile した。valid registration の outer ticket と active flag を確認後、同じ thread で nested ticket を作成すると、2秒の subprocess timeout まで reject / return しなかった。これは admission component の再現であり、RN / Hermes 実機の再現成功とは扱わない。
- 最小修正: 再入を mutex 待ちより前に拒否できる順序にし、identity / stale の既存契約も維持する。
- 完了条件: 実際の JSI request getter / callback から再入し、内側が即時 `BindingFailure`、outer が既存契約どおりに完了・cleanup、並行 runtime は適切に直列化されることを確認する。

## Resolved Findings

今回新たに解決確認した finding はなし。

## Upstream Feedback

なし。IR-030 は §8 の既存契約で判断できる。IR-029 の処理修正で外部入力の受理範囲を変更する場合だけ、Specification への確認が必要。

## Deferred Findings

- RN 実機での IR-030 再現、全 platform matrix、browser / MV3、長時間 fuzz。
- root pnpm audit で `fast-uri 3.1.7` の moderate advisory [GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) を確認。`pnpm-workspace.yaml:5` が固定する webpack / ajv の開発依存であり、公開 npm runtime dependency ではない。patched version は 3.1.8。repository の該当 host-filter bypass 攻撃経路は確認していないため、新しい Core defect や HIGH finding にしない。

## Scope and Traceability

秘密情報生成・認証・導出・export・署名は Core、型・copy・memory ownership は binding、表示・assertion freshness・current Store の選択は Application の責任として照合した。Wallet Store の untrusted metadata を認証済み secret authority と扱わず、GCM と payload / index / duplicate tag の照合後に秘密を利用する経路を確認した。

RN 再入は Specification §8 → AdmissionTicket / coordinator →今回の component reproduction に追跡する。SDK fixture と dalek oracle は cryptographic interop / arithmetic の証拠であり、テストの存在だけを protocol の正本にしていない。

## Domain Checks

| Domain | 結果 |
| --- | --- |
| Specification Conformance | HIGH 以上なし。RN 再入契約は IR-030 |
| Security | lifecycle、copy / zeroization、diagnostics、RNG、KDF / AEAD、authorization、parser、FFI を確認。IR-028 / 029 / 030 |
| 相互運用性 | Chain / Network 分離、raw bytes、SDK fixture、独自 scalar と dalek oracle のテスト PASS |
| 異常系 | authentication、tamper、malformed、allocation / panic、detached / wrong typed array のテスト PASS。過大 Mnemonic と RN 再入に指摘 |
| 実装品質 / memory safety | C header / runtime / sanitizers PASS。C ABI pointer validity は caller 契約を前提とする |
| 型 / 依存 / 公開互換性 | Node 24 native / WASM ESM / CJS smoke PASS。pnpm 開発依存 advisory は Deferred |
| 適用外 / 未確認 | host compromise 防止・完全な runtime memory 消去は保証外。hardware / compiler side-channel 全否定、全依存内部監査は未実施 |

## Validation Results

コード差分がなくても、ユーザーの公開可否確認と release gate のため実行した。

| コマンド / 範囲 | 結果 |
| --- | --- |
| `bash scripts/check-local.sh rust` | PASS。不可視文字、fmt、locked Clippy、locked fuzz check、workspace tests。実行 test は47+6+2+2+1=58、doc tests も PASS |
| `bash scripts/check-local.sh wasm` | PASS。CLI / lock 一致、Node WASM 7 tests、locked wasm32 check |
| `bash scripts/check-local.sh native` | PASS。release build、C11 header、runtime |
| `bash scripts/check-local.sh native-sanitizers` | PASS（sandbox 制限外で再実行）。C harness に ASan / UBSan を適用。Rust 全体の sanitizer instrumentation とは主張しない |
| Node 24 で `bash scripts/ci/npm-package.sh` | PASS。host package tests / pack / clean consumer、ESM / CJS native / WASM、fallback、fail-closed |
| `bash scripts/ci/node-source.sh`、`node scripts/test-react-native-pod-lock.mjs` | PASS。途中追加された Pod lock 修正も対象 |
| `cargo audit --db /tmp/snwc-review-advisory-db`、`--no-fetch --file fuzz/Cargo.lock` | PASS。今回取得した RustSec database で root117 / fuzz67依存、脆弱性報告なし |
| `pnpm audit --json` | exit 1、moderate 1 / high 0 / critical 0。fast-uri の開発依存 |
| `npm audit --prefix integration/react-native/consumer --json --ignore-scripts` | PASS、報告0 |
| AdmissionTicket component reproduction | nested call timeout を確認。RN 実機は未実施 |
| `git diff --check` | PASS |

初回 WASM は Node child process の EPERM、初回 Rust audit は sandbox 外の database lock、初回 sanitizer は LeakSanitizer の ptrace 制約で停止。制限外の同じ検証が通過した。npm 初回は空白入り PATH の実行指定誤りで停止し、引用を修正して同じ検証を完了した。これらを source の assertion failure と混同しない。

長時間 fuzz、coverage の再計測、全 OS / mobile / browser matrix は今回ローカルで実施していない。最終 release package gate は host-only package で停止（4 native artifacts 不足）し、正式な全 target package の合格証拠はない。

## Review Gates

| Gate | 結果 / 根拠 |
| --- | --- |
| 1. 仕様適合性 | MEDIUM IR-030 付き、HIGH 以上なし |
| 2. セキュリティ | MEDIUM IR-028 / 029 / 030 付き、HIGH 以上なし |
| 3. 相互運用性 | 確認範囲 PASS |
| 4. 異常系 | IR-029 / 030 付き、HIGH 以上なし |
| 5. テスト十分性 | 確認範囲 PASS。実機再入の未確認を記録 |
| 6. 実装品質 / memory safety | MEDIUM 指摘付き。確認した Native validation は PASS |

## Remaining Risks and Open Decisions

MEDIUM 3件が残る。無欠陥の宣言や本番公開の承認ではない。実装 gate と repository 全体の release gate は別判定である。

## Automatic Changes

本レビュー文書のみ新規作成。再現 harness / logs は `/tmp`。製品 source、spec、lockfile、workflow、既存ユーザー変更、commit / push / tag / publish は変更していない。

## Final Decision

`READY`（Implementation Skill の HIGH 以上必須修正 gate）。公開可否は release review 004 の `NOT READY` に従う。
