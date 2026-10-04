# 公開前レビュー 005 — PR #22 のマージ・リリース可否

## Review Target

- 確認日: 2026-10-04。
- 対象: [PR #22](https://github.com/nemnesia/symbol-nem-wallet-core/pull/22)、head `dfaf41c386e5e73ffa600ef75e993d72f06c9059`、base `main`。
- Composite release target: Rust Core、Native C ABI、Node addon、WASM、npm facade、React Native Android / iOS、統合 release workflow / evidence。
- PR 差分は36ファイル。source、公開契約、manifest、CI、registry の公開済み version、host validation を確認。
- 全 OS / mobile candidate、実 npm Trusted Publisher、実 provenance / durable asset digest、長時間 fuzz / coverage は未確認。今回 publish、merge、tag、CI dispatch は実施しない。

## Execution Audit

サブエージェントは使用せず、A: 公開契約と文書、B: metadata / package inventory、C: API / ABI / version、D: CI / validation / supply chain の4観点で自己レビューした。過去 snapshot の成功を現在の head の証拠に置き換えなかった。

## Evidence Used

- `docs/requirements/requirements.md` UC-001 / FR-001 / AC-034、`docs/specifications/specification.md` §8、npm facade specification §5 / §7、security design: handoff 契約の追跡。
- Core / C ABI / Node / WASM / npm declaration / RN adapter の PR 差分、README 日英: 3引数への変更、定数公開、JSDoc、責任境界。
- `packages/wallet-core/test/package.test.mjs:112`、`scripts/check-local.sh`、`scripts/ci/npm-package.sh`: 実際の失敗箇所と標準 validation。
- [Rust quality run](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/37167560778)、[Release candidate validation run](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/37167560756): 最新 head の failed logs を確認。
- `.github/workflows/{release,node,c-abi-release}.yml`、`scripts/release-identity.mjs`、release operation / recovery / record、migration 文書: release gate / identity / recovery。
- npm registry は `npm view @nemnesia/symbol-nem-wallet-core version --ignore-scripts` で `0.1.0`、GitHub Release は `gh release list` で既存 `v0.1.0` を確認。
- GitHub `release` Environment: required reviewer と deployment branch policy の存在を read-only API で確認。
- release reviews 001–004: finding lifecycle の参照。旧 RL-004 の解消は現 snapshot の full matrix なしには認定しない。

## Review Result

`NOT READY`

## Summary

PR は Git 上 MERGEABLE だが、GitHub の merge state は UNSTABLE。Rust checks と Pull request npm package checks が失敗しており、現状でマージを推奨しない。加えて、handoff の変更は上流要件と不整合がある。公開済み `0.1.0` のまま新しい変更をリリースできず、今回の head に対する正式な全 platform 配布物・証跡も未成立である。

今回確認した失敗は、整形、JSDoc と文字列比較テスト、要件との責任境界、release version / evidence の問題として区別する。秘密情報の漏えいや署名の不正をこれらから推定しない。

## Finding Status

| ID | Severity | Status | 初出 | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| RL-005 | Major | New | 005 | ローカルと GitHub CI の fmt check failure |
| RL-006 | Major | New | 005 | 最新 PR CI の declaration 完全一致テスト failure |
| RL-007 | Major | New | 005 | UC-001 / FR-001 / AC-034 と変更後の確定契約が不整合 |
| RL-008 | Major | New | 005 | 全 release manifests が公開済み 0.1.0 のまま |
| RL-004 | Major | Open（解消未確認） | 004 | 旧 iOS failure の解消を現 head の complete candidate で確認していない。現在の PR では全 platform matrix が条件により skipped |

RL-001〜003 は過去の解決記録を参照したが、今回の全実 artifact の再照合が完了した意味ではない。

## Required Changes

### RL-005 — Rust 整形チェックが失敗する

- 対象: `crates/c-abi/src/lib.rs:32`、`crates/core/src/lib.rs:32`、`crates/core/src/store.rs:17`、`crates/core/tests/core.rs:12` / `487`、`crates/core/tests/unit/store.rs:601`、`crates/wasm/src/lib.rs:32`。
- 事実: `bash scripts/check-local.sh rust` は不可視文字検査の後、`cargo fmt --all -- --check` で exit 1。CI も同じ箇所の fmt 差分で failure。
- 根拠 / 影響: repository の標準 Rust gate を通過せず、後続の標準検証がその run では実行されない。
- 最小対応: 対象差分の Rust 整形を反映し、標準 Rust validation と PR CI を再実行する。
- 完了条件: 最終 head の Rust checks が成功する。

### RL-006 — 日本語 JSDoc が declaration の byte 完全一致テストを失敗させる

- 対象: `packages/wallet-core/test/package.test.mjs:112` / `122`、`packages/wallet-core/src/index.d.ts`、npm facade specification §5。
- 事実: test は source / dist declaration を仕様書の TypeScript code block と byte 完全一致で比較する。日本語 JSDoc は仕様 block にないため、最新 PR CI で assertion failure。
- 根拠 / 影響: `scripts/ci/npm-package.sh` が停止し、後続の clean tarball consumer 検証まで完了しない。API の意味が JSDoc により変わったことを示す failure ではない。
- 最小対応: JSDoc を許容しつつ宣言の型・引数・export の差を検出できる比較へ更新する。単に assertion を削除して契約照合を失わない。
- 完了条件: declaration 適合検査、npm package checks、clean tarball consumers が最終 head で成功する。

### RL-007 — Mnemonic handoff の責任境界が上流要件と揃っていない

- 対象: `docs/requirements/requirements.md:140` / `200` / `331`、`docs/specifications/specification.md:326`、`docs/design/security.md`、`crates/core/src/store.rs:225`。
- 事実: UC-001 / FR-001 / AC-034 は Application から Core への確認伝達を要求し、Application が呼出しを行ったことだけでは handoff 成功とみなさない。変更後は確認引数・検証を削除し、仕様が finalize 呼出し自体を確認済みの確定要求として扱う。
- 根拠 / 影響: 上流要件は PR で変更されていない。確認未取得に対する Core の契約と受け入れ条件が新しい仕様・実装と一致せず、security boundary の traceability を認定できない。Application の UI 実施を独立証明する新機能を要求する指摘ではない。
- 最小対応: 意図した責任境界を上流要件で決定・承認して下流と整合させるか、現在の要件を満たす確定契約へ戻す。レビュー判断だけで要件を変更しない。
- 完了条件: UC-001 / FR-001 / AC-034、設計、仕様、Core / 全 binding、関連テストの一致を確認する。

### RL-008 — 既存 version のまま新規公開できない

- 対象: `crates/{core,c-abi,node,wasm}/Cargo.toml:3`、`packages/wallet-core/package.json:3`、`scripts/release-identity.mjs:272`、既存 npm `0.1.0` / GitHub `v0.1.0`。
- 事実: 全対象 manifest は 0.1.0 のまま。registry と GitHub Release には同 version が存在し、fresh publish の identity gate は既存 version を拒否する。
- 根拠 / 影響: Rust / npm / WASM の引数・関連型を削除し、C ABI の引数位置も変更する破壊的変更を含む。同 version の差し替えや旧 tag の付替えを release recovery として扱えない。
- 最小対応: repository の version policy に基づき、新しい release version と migration 説明を決定し、4 Cargo packages、npm、lockfiles、RN pod version / frozen evidence 等の関連 identity を整合させる。具体的な新 version はこのレビューでは決めない。
- 完了条件: 新しい version / tag の identity gate、正式 candidate / C ABI assets / release record が同じ最終 main snapshot に結び付いて成功する。

RL-004: 旧 checksum remediation を含めた最終 source で両 iOS producer、XCFramework、final npm assembly、全 platform consumers、browser / MV3 と release evidence を成功させる。PR での条件付き skipped は defect と断定しないが、公開済み artifact の証拠には使えない。

## Optional Improvements

なし。任意の改善を公開 blocker に昇格していない。

## Resolved Findings

今回、新たに解決済みと判定した過去 finding はなし。release Environment の reviewer / branch policy の存在は確認したが、npm Trusted Publisher と実 provenance の確認まで完了した意味ではない。

## Upstream Feedback

- 送信元: Release Readiness / Implementation contract inspection。
- 受領先: Requirements、必要に応じて Design / Specification。
- 対象: UC-001、FR-001、AC-034。
- 不整合: 上流は呼出しのみでは確認成立とせず、下流は finalize 呼出しを確認済み確定要求とする。
- 下流影響: RL-007 の security boundary / traceability を認定できない。
- non-normative status: 本 feedback は要件・設計・仕様の変更または承認ではない。
- 解消条件: 現在意図する責任境界の正式決定と、全 surface の契約・検証の整合。

## Deferred Findings

- PR checks 成功後も、main / workflow dispatch / formal release 用の全 target candidate と C ABI asset set の確認が必要。今回は workflow を起動していない。
- npm Trusted Publisher の外部設定、実 attestation、最終 SBOM / third-party license / checksum / durable release inventory、production retry / recovery は未実施。
- RN 0.86 / Expo SDK 57 の検証未完了は README に明記されている。現時点で検証済みと主張しない。
- Dependabot #16 の braces 3.0.3 は RN consumer の transitive dependency。修正版なし、攻撃入力からの到達性未確認という直前調査の状態を保持する。アラートを dismiss していない。公開 npm facade の依存ではなく、これだけを今回の Core security blocker としない。

## Scope and Traceability

| Surface | 追跡 / 現状 |
| --- | --- |
| Rust Core | 要件、仕様、source、locked validation。handoff は RL-007、fmt は RL-005 |
| C ABI | 公開 header の確認引数削除、Rust binding / RN copied header。旧 caller に ABI migration が必要 |
| Node / WASM | 3引数、定数 export、runtime scope separation、WASM refresh。host CI の facade tests は成功、package contract test は RL-006 |
| npm | metadata / export / declaration / README、host dry-run inventory。version は RL-008 |
| RN Android / iOS | native adapter の変更、既存 0.87 consumer、full producer matrix は未確認 |
| release workflow | source / version equality、main ancestry、fresh version gate、protected Environment、OIDC、provenance、SBOM / durable evidence / retry の source と deterministic tests |

## Domain Checks

| Domain | 結果 |
| --- | --- |
| Version Assessment | FAIL: RL-008。破壊的 API / ABI 変更に対する新 version / migration の決定が必要 |
| Documentation / Translation Parity | README 日英の主要変更は一致。要件との整合は FAIL: RL-007 |
| Package Metadata | identity metadata の主要項目を確認、version availability は FAIL |
| API / ABI | source surface 間は3引数へ更新。上流 handoff と declaration gate は FAIL |
| Distribution | host dry-run は46 files、test / fixture / node_modules / .env / source map の指定パターン混入なし。正式全 target inventory は未確認 |
| Platform | host validation を実行。full release matrix は未成立 |
| Security | RL-007 の契約不整合。既存 dependency advisory は到達性未確認、無リスクとは判定しない |
| SBOM / License | source gate / deterministic tests を確認。現 head の final digest-bound bundle は未確認 |
| Provenance | OIDC / protected Environment / required provenance の source と Environment 設定を確認。npm Trusted Publisher の外部設定は未確認 |
| Durable Publication | GitHub v0.1.0 は既存。新 release の exact asset set は未生成 |
| Retry / Recovery | fixture validation を実行。旧 version を今回の fresh publish に再利用できない |
| Validation Evidence | FAIL: PR CI 2件の failure。局所 PASS を全 release 成功として扱わない |
| Public Hygiene | 公開 docs / metadata / host inventory を確認。全 target archive の実 scan は未確認 |

## Validation Results

release gate のため実行した。通常の変更分類も Rust / WASM / C ABI / Node / npm に該当する。

| 検証 | 結果 |
| --- | --- |
| `bash scripts/check-local.sh rust` | FAIL: fmt。不可視文字検査は PASS。スクリプトの後続は未実行 |
| locked workspace Clippy（全 target / feature、warnings を error） | PASS |
| locked fuzz workspace check | PASS |
| locked workspace tests（全 feature） | PASS: 59件、0 failure |
| `bash scripts/check-local.sh native` | PASS: release build、header compile、C ABI runtime |
| `bash scripts/check-local.sh native-sanitizers` | PASS: sandbox の LeakSanitizer ptrace 制約による初回停止後、同じ検証を制限外で再実行 |
| Node.js 24 `bash scripts/check-local.sh wasm` | PASS: matched wasm-bindgen、7 tests、locked WASM target check |
| Node.js 24 `scripts/ci/node-source.sh` | PASS: identity、evidence、secret cleanup、license、RN lifecycle / Pod graph、provenance、GitHub Release、record、recovery、browser parity |
| `npm pack --dry-run --json` | PASS: 46 files。host inventory の限定検査、formal all-target package ではない |
| `git diff --check origin/main...HEAD` | PASS |
| GitHub PR Rust checks | FAIL: fmt、ローカルと同じ原因 |
| GitHub PR npm package checks | FAIL: declaration 完全一致。先行 facade / RN tests は success、後続 clean consumer は未完了 |

Node.js 24 は 24.18.0、標準ローカル環境は Node.js 26.5.0 / rustc 1.98.0。GitHub npm job は Node.js 24.21.0。source gate の negative fixture による tar/gzip error 出力と、スクリプト全体の成功を区別した。

Dependency lockfiles は PR 差分にないため install group を再実行していない。全 OS / mobile matrix、coverage、長時間 fuzz、正式最終 bundle、実 publish / provenance / registry signatures は未実行。

## Review Gates

| Gate | 結果 / 根拠 |
| --- | --- |
| 1. Target identification | PASS: composite target を発見 |
| 2. Public documentation | FAIL: RL-007 |
| 3. Metadata | FAIL: RL-008 |
| 4. API / ABI / compatibility | FAIL: RL-006 / RL-007 / RL-008 |
| 5. Distribution contents | host inventory の限定確認。formal artifact 未確認 |
| 6. Platform / runtime | 未完了: RL-004 の解消未確認、full matrix skipped |
| 7. Security boundary | FAIL: RL-007 |
| 8. SBOM / license | deterministic の限定確認、final bundle 未確認 |
| 9. Provenance / identity | source / Environment の限定確認、fresh version は RL-008 |
| 10. Durable publication | source / fixture の限定確認、今回の実 release 未生成 |
| 11. Retry / recovery | fixture の限定確認、production recovery 未実施 |
| 12. Validation evidence | FAIL: RL-005 / RL-006 |
| 13. Public hygiene | host inventory の限定確認、formal全 artifact 未確認 |

## Remaining Risks and Open Decisions

マージ前: fmt と declaration CI の修正、handoff の上流要件整合、最終 PR CI の成功確認。
リリース前: 新 version / migration の決定、main 上の全 target candidate / C ABI / evidence の成功確認、外部 Trusted Publisher と実 provenance / durable evidence の確認。

## Automatic Changes

新規レビュー文書のみ作成。レビュー対象 source、manifest、lockfile、README、設定、生成 npm package を変更せず、commit / push / merge / tag / publish / workflow dispatch は行っていない。build / test の出力は target と /tmp に置いた。

## Final Decision

`NOT READY`。現状の PR をマージ・リリースすることは推奨しない。
