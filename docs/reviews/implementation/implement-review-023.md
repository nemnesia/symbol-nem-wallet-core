# 実装レビュー 023 — リポジトリ全体のセキュリティ重点レビュー

## Review Target

- リポジトリ: `nemnesia/symbol-nem-wallet-core`
- ブランチ: `main`
- レビュー対象 HEAD: `78113ef340af289c2c9ee79d37d856252634906d`
- レビュー日: 2026-09-30 (JST)
- 成果物: `docs/reviews/implementation/implement-review-023.md`
- 対象範囲: 承認済み Requirements、Design、Specification に照らした現行リポジトリの実装および CI / release 設定。Rust Core、Native C ABI、Node-API、WASM、React Native、npm package、CI、release assembly の各境界における秘密情報のライフサイクルと trust boundary を重点的に確認した。
- 基準: review 022 の対象 `7cd1af89e8f015449b47f297b5610682fc73b4e8`。現 HEAD はその子孫である。過去の open / deferred lifecycle finding と関連する実装を再確認した。IR-027 は review 022 から Deferred のままである。
- 未確認: 現在の GitHub Actions run 状態、外部 registry の audit 結果、ブラウザ上の WASM 実行、実機 RN device、release publication 全体の実行。過去の run 結果から現 HEAD の状態を推定していない。

## Execution Audit

- Reviewer A / Specification 適合性: Requirements、architecture / binding / security Design、Core / Wallet Store / npm / RN Specification、現在の公開 API、binding 間の動作を確認した。
- Reviewer B / Security: mnemonic / password / key / seed の経路、暗号化と署名、成功・失敗時の cleanup、C ABI と unsafe code、Node / WASM / RN boundary、log / error、外部入力と資源消費を確認した。
- Reviewer C / 相互運用性: Symbol と NEM、Mainnet と Testnet、canonical bytes、SDK fixture、Native / WASM / Node / RN の API parity、package / release identity を確認した。
- Reviewer D / テスト品質: negative / boundary test、認証・tamper・parser case、FFI panic containment、lifecycle cleanup、fuzz / audit script、今回のローカル検証制約を確認した。
- Chair 統合: 完了。候補 finding を契約、実際の call path、既存防御、過去 finding の lifecycle と照合した。サブエージェントは使用していない。

## Evidence Used

| 根拠資料 | 用途・結果 |
| --- | --- |
| `AGENTS.md`、Implementation Review Skill、`review-playbook.md`、`reviewers.md`、`review-gates.md`、`security-checklist.md`、共通 output format | 正式な手順、Severity、ID lifecycle、gate、成果物形式 |
| `docs/requirements/requirements.md`、`docs/design/{architecture,bindings,security}.md` | 承認済み範囲、ownership、trust boundary |
| `docs/specifications/specification.md`、`wallet-store-format-v1.md`、`react-native.md`、`npm-typescript-facade.md` | 規範 API、secret lifecycle、parse、保存、binding、RN、package の契約 |
| `implement-review-016.md` 〜 `022.md` | 過去 finding の lifecycle と根拠。回帰がない IR-001〜026 は Resolved、IR-027 は Deferred のまま |
| Core、C ABI、Node、WASM、package の実装と test | 現在の data path、ownership、validation、cryptography、異常系、公開動作 |
| `.github/workflows/*`、`scripts/ci/*`、release / package script と manifest | workflow permission、action reference、audit 入口、artifact / package validation |
| `cargo test --workspace --all-features --locked` | PASS — Core、C ABI、Node、WASM、doc test を含む workspace 全 test が完了 |
| `bash scripts/check-local.sh native` | PASS — release build、C header compile、C ABI runtime |
| `bash scripts/check-local.sh all` | invisible-character scan、format、Clippy は PASS。fuzz check は sandbox の read-only registry cache が原因で停止 |
| `node scripts/test-npm-package.mjs` | PARTIAL — facade / parity と assembly case は通過。sandbox のため package dry-run が Node subprocess を起動できず (`EPERM`) |
| GitHub API / `gh run list` | 外部 API 接続ができず、現在の hosted run 状態を取得できなかった |

## Review Result

`READY`

## Summary

CRITICAL または HIGH の実装欠陥は確認されなかった。確認した Core の暗号・Store 経路では、固定 Argon2id parameter、新しい乱数 salt / nonce、AES-256-GCM による認証付き処理、Chain 別の導出・署名、上限付き Wallet Store parse、Core の secret buffer 用 zeroize owner、failure-atomic な mutation を確認した。C ABI の input / output ownership と panic containment、Node / WASM の binary 契約、RN の delivery / lifecycle 保護も確認した。ローカル test はこれらの確認を裏付けるが、環境制約による未検証範囲は後述のとおり記録する。

Implementation Review gate 上は任意修正となる MEDIUM finding が2件ある。`IR-028` は Node-API の typed array 作成に渡す secret bytes に関するもので、外部 buffer が使えない場合の fallback、error path、finalizer で Rust allocation が zeroize されずに解放される。`IR-029` は攻撃者が制御できる mnemonic の長さに関するもので、24-word BIP39 parse が拒否する前に `restore_profile` が UTF-8 全体を正規化・allocation するため、回避可能な memory exhaustion が起き得る。どちらも過去レビューでは記録されていない。IR-027 は Deferred のままであり、再 open していない。

## Finding Status

| ID | Severity | 状態 | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| IR-028 | MEDIUM | New | 023 | Node-API の secret byte 出力 allocation は、external buffer の finalization、fallback、変換失敗時に zeroize されず解放され得る |
| IR-029 | MEDIUM | New | 023 | restore が mnemonic byte 数を制限せず、24個の有効な BIP39 word を確認する前に正規化・allocation する |
| IR-023–IR-026 | HIGH | Resolved、回帰なし | 017 | RN integration、artifact provenance、identity、lifecycle の修正が現 HEAD に存在する |
| IR-027 | LOW | Deferred / non-blocking | 017 | 外部 dependency alert の根拠は Deferred のまま。今回 hosted audit / Dependabot の状態を取得できなかった |
| IR-001–IR-022 | — | Resolved、回帰なし | 001–016 | 過去の解決記録は引き続き適用可能。確認した Core / binding / crypto に回帰は見つからなかった |

Open finding 数: **CRITICAL 0 / HIGH 0 / MEDIUM 2 / LOW 0**。IR-027 は別途 Deferred とする。

## Required Changes

なし。CRITICAL / HIGH の New / Open / Reopened finding はない。

## Optional Improvements

### IR-028 — Node-API の secret 出力 allocation が zeroize されず解放される (MEDIUM / New)

- 対象箇所: `crates/node/src/lib.rs:436-445` (`output_bytes`)、Node-API dependency `napi 3.12.2` の `src/bindgen_runtime/js_values/arraybuffer.rs:990-1040`。
- 発生条件: mnemonic / private key export など secret を含む結果を JS typed array に変換し、その array が garbage collection される場合。または Node-API が `napi_no_external_buffers_allowed` を返す場合、あるいは後続の N-API construction が失敗する場合。
- 確認事実: `output_bytes` は入力を通常の `Vec<u8>` に copy し、所有権を `Uint8ArraySlice::from_data` へ渡す。external ArrayBuffer 作成が成功すると `napi` は Vec を `forget` し、finalizer は zeroize せず再構築・drop する。external buffer が使えない fallback では Node 所有 storage へ copy 後、元の Vec が zeroize されず drop する。error return でも通常の Vec がそのまま drop する。同 helper は secret 出力にも使われる。JS に返す bytes 自体は明示的に許可された export である。本 finding の対象は、zeroize されず解放される別個の Rust allocation と、JS 側の owner が回収された後に残る Node external backing buffer である。
- 根拠となる契約: `docs/specifications/specification.md` §§12.1–12.3 は、明示的に所有・生成した secret buffer を使用終了時に zeroize し、不要な copy を避け、binding temporary を可能な範囲で cleanup するよう求めている。Node facade の仕様は明示的な byte export を許可するが、この Rust temporary や GC 後の allocator 残留を caller-owned とは定めていない。
- 影響: 解放済み allocator 領域に mnemonic / private key bytes が Node process 内で残留し得る。これは認可済み secret return と、その後の memory 再利用または process memory へのアクセスを要する、局所的な機密性・lifetime 上の問題である。export authorization を迂回するものではなく、JS 側に返した値を本来の API 利用範囲外へ公開するものでもない。
- 最小修正: secret 出力の所有権と transfer 前・fallback・error 時の cleanup を見直し、Rust 所有 bytes を wipe する。binding が lifecycle を所有する場合は、明示的に返す secret を含む Node-owned backing allocation も finalizer 時に wipe する。別の未消去 copy を追加しない。
- 完了条件: 通常の finalization、fallback copy、各 construction failure path で wipe されることを示す targeted test または注入可能な N-API abstraction を追加し、成功時の出力 bytes と Node / WASM public parity を再確認する。

### IR-029 — mnemonic の無制限な正規化による memory exhaustion (MEDIUM / New)

- 対象箇所: `crates/core/src/crypto.rs:76-83`、公開 entry point `crates/core/src/store.rs:312-320`、Node / WASM / C ABI の `restore_profile` binding。
- 発生条件: caller が非常に大きいが UTF-8 としては有効な mnemonic byte sequence を渡す。`parse_mnemonic` は UTF-8 を検証後、word list、checksum、24-word count を調べる `Mnemonic::parse_in_normalized` より先に、NFKD iterator 全体を新しい `String` へ collect する。この allocation より前に mnemonic byte 数を制限する処理は Binding / Core 経路にない。
- 確認事実: normalized buffer は正しく `Zeroizing` で包まれ、通常サイズの不正 phrase は拒否される。ただし、それによって allocation は制限されない。極端に大きい hostile input は、拒否前に入力全体分の allocation と正規化処理を発生させる。公開 restore operation は import / user input を受けるため hostile input が到達可能であり、過大な入力は allocator failure / process abort または wallet consumer の memory pressure を引き起こし得る。
- 根拠となる契約: `docs/specifications/specification.md` §§4.1、7、12、19 および `wallet-store-format-v1.md` は、import bytes を検証対象として扱い、resource limit が定義される箇所では hostile-data parse と failure を制限する。現行 Specification に mnemonic の具体的な最大 byte 数はない。受け入れ可能な形式は English 24-word BIP39 だが、その byte 上限は明記されていない。本 finding は検証前の無制限 allocation が回避可能な点を指し、新しい製品入力制限を提案するものではない。
- 影響: 巨大な restore request による caller process の局所的な可用性低下。secret の機密性や完全性を迂回する問題は確認していない。
- 最小修正: 既存の 24-word UTF-8 BIP39 契約で受け入れ可能な正規形に根拠を置いた上限で正規化前に拒否するか、有効 mnemonic を変えずに正規化を bounded にする。canonical な受け入れ形式と互換性のない狭い入力規則を暗黙に追加しない。
- 完了条件: Core と各公開 binding boundary に oversized-input test を追加し、panic / abort せず上限内の資源で拒否することを確認する。有効な正規化済み 24-word vector は引き続き受理する。

## Resolved Findings

- IR-023–IR-026 は review 020–022 に基づき Resolved のままとする。現 checkout には、source-controlled な RN dependency / Pod graph validation、platform artifact identity check、実 runtime / provider lifecycle binding、stale output rejection、cleanup ordering、および対応する integration gate が存在する。現ツリーで回帰は確認していない。
- IR-001–IR-022 は過去の正式レビューに基づき Resolved のままとする。確認した security-sensitive な Core、C ABI、Node、WASM、package 経路は、過去の解決根拠と矛盾しない。

## Upstream Feedback

なし。

## Deferred Findings

- IR-027 は LOW / Deferred のままとする。今回の環境では hosted dependency alert の詳細と外部 registry audit 状態を取得できなかった。新しい alert や exploit path があるとは断定していない。
- 現在の GitHub Actions run、browser runtime、Android / iOS 実機、RN 0.86.x、Expo 57、production 相当の RN resource 観測は未確認である。過去の review 022 で成功した RC run は、そのレビュー対象 HEAD に対する証拠に限る。
- fuzz workspace check と npm pack dry-run validation は、下記の sandbox filesystem / process 制約により完了しなかった。

## Scope and Traceability

| 契約 / boundary | 実装・根拠 | 結果 |
| --- | --- | --- |
| secret 生成、正規化、seed、key 導出 | Core `crypto.rs`、secret DTO owner、SDK vector | IR-029 の任意修正事項を除き PASS |
| password 暗号化 / 認証付き復号 | Core crypto / Store path、fixture、tamper test | PASS。Argon2id / AES-GCM parameter 固定。bypass は確認せず |
| Store decode / hostile serialization | 上限付き CBOR parser、malformed / oversized / tamper test | 定義済み上限の範囲で PASS |
| C ABI pointer / length、ownership、panic boundary | exported function、owned buffer、runtime / header / panic test | 確認した経路で PASS |
| Node-API byte input / output | type / detached validation、zeroizing input copy、typed-array output | input は PASS。出力 allocation cleanup は IR-028 |
| WASM binary API と cleanup | `Uint8Array` 契約、parity test | source / test 上 PASS。browser runtime は未確認 |
| React Native lifecycle / stale output / package | platform adapter、lifecycle coordinator、package gate、review 022 | source / 過去に確認した CI 範囲で PASS。実機は未確認 |
| Symbol / NEM と network の相互運用 | 明示的な chain / network dispatch、固定 SDK fixture | PASS |
| CI / release と package assembly | SHA pin 済み action、job 単位の権限、immutable artifact name、厳格な release / package validator | 具体的欠陥は未確認。現在の hosted run / registry 状態は未取得 |

適用した security checklist の主な項目: protected asset、secret ownership / lifetime / copy、log / error / debug の redaction、RNG / KDF / AEAD / AAD / signing と chain 分離、暗号化 Store parse と failure atomicity、FFI pointer / length / ownership / panic containment、WASM / JS byte 表現と copy、Node 出力 ownership、RN lifecycle / stale completion、hostile input の allocation、dependency と release trust。Core の Store parser は allocation 上限を持つ。nonce reuse、弱い KDF、認証 bypass、chain 混同、公開 binding における secret の text 化、FFI UAF / double free、unsafe memory violation、secret logging は確認されなかった。第三者暗号ライブラリ内部の temporary、実機動作、hosted audit、現行 GitHub run 状態は独立検証していない。

## Domain Checks

| 領域 | 結果 | 根拠 |
| --- | --- | --- |
| Specification Conformance | 任意 finding 付きで PASS | 公開動作と secret export authorization は契約に整合。IR-028 / 029 は局所的な lifecycle / resource issue |
| Test Evaluation | 実行済み test は PASS、外部 lane は未完了 | Core / Store / crypto、C ABI case は通過。npm subprocess に依存する package と fuzz check は sandbox により停止 |
| Security | finding あり | mnemonic / password / key、entropy / seed、AEAD、RNG、error redaction、zeroization、secret delivery を確認。IR-028 / 029 |
| Interoperability | 確認・実行した範囲で PASS | Chain / network 別 SDK vector と Node / WASM facade parity test が通過 |
| Abnormal paths | IR-029 付きで PASS | malformed CBOR、tamper、wrong authorization、allocation / panic path を確認。oversized mnemonic には早期上限がない |
| Implementation quality / memory safety | 確認した範囲で PASS | C ABI ownership、panic containment、RN lifecycle、unsafe boundary を確認。memory corruption defect は確認せず |
| Types / dependencies / public compatibility | IR-028 付きで PASS | 16 operation の public facade と package validator を確認。外部 dependency audit は未取得 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| `cargo test --workspace --all-features --locked` | PASS — Core、C ABI、Node、WASM、doc test を含む workspace 全 test が成功 |
| `bash scripts/check-local.sh native` | PASS — release build、C header compile、C ABI runtime |
| `bash scripts/check-local.sh native-sanitizers` | NOT VALIDATED — runtime 後に LeakSanitizer が終了。現在の環境の ptrace 制約下では動作できず、source-level sanitizer finding は報告されていない |
| `bash scripts/check-local.sh all` | PARTIAL — invisible-character scan、`cargo fmt --all -- --check`、locked Clippy は PASS。Cargo が read-only registry cache に `arbitrary` を unpack できず fuzz check 前に停止 (`os error 30`)。script 内の workspace-test 段階には進まなかった。workspace test は上記の独立実行で成功 |
| `node scripts/test-npm-package.mjs` | PARTIAL — facade / parity と assembly case は通過。`npm pack --dry-run` の subprocess 起動が sandbox に拒否された (`EPERM`)。後続の個別 `test-npm-parity`、`test-npm-release`、`test-npm-bundlers` は実行されていない |
| `bash scripts/check-local.sh wasm` | NOT VALIDATED — `verify-wasm-bindgen.mjs` が sandbox 内で Git を spawn できず (`EPERM`)、wasm-pack / runtime 段階に進めなかった |
| `bash scripts/ci/audit.sh` | NOT VALIDATED — `cargo-audit` が read-only Cargo home の advisory database path を lock できず、audit 結果を生成できなかった |
| 現在の GitHub Actions run | NOT VALIDATED — GitHub API に接続できなかった |
| RN 実機 / iOS toolchain / browser WASM runtime | NOT VALIDATED — 現環境では利用できなかった |

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 1. Specification 適合性 | PASS | CRITICAL / HIGH の契約違反なし。IR-028 / 029 は局所的な任意 finding |
| 2. Security | MEDIUM finding 付きで PASS | 直接的な secret disclosure、crypto bypass、高影響の lifecycle failure は確認せず。出力 allocation の残留と入力上限の欠落を記録 |
| 3. 相互運用性 | 確認した範囲で PASS | Symbol / NEM vector、chain / network dispatch、実行できた facade parity が通過 |
| 4. 異常系 | IR-029 付きで PASS | Store malformed / tamper path は通過。oversized mnemonic は局所的な入力 robustness issue として記録 |
| 5. テスト十分性 | 確認した契約で PASS、外部 lane は未完了 | security negative test を確認・実行。fuzz / package / hosted lane の未実行を成功扱いしていない |
| 6. 実装品質 / memory safety | PASS | 悪用可能な unsafe / FFI memory defect は確認せず。Node owned-buffer cleanup は IR-028 に記録 |

## Remaining Risks and Open Decisions

IR-028 と IR-029 は、この Skill の MEDIUM severity gate では non-blocking だが、secret memory hygiene と hostile restore input を重視する release の前に検討する必要がある。IR-027 は権威ある dependency alert の確認待ちで Deferred のままである。現在の hosted CI、完全な fuzz run、npm pack、browser WASM、RN 実機 validation が成功したとは本レビューでは主張しない。

## Automatic Changes

レビュー成果物 `implement-review-023.md` のみを新規作成した。実装、仕様、test、README、workflow、lockfile は変更していない。

## Final Decision

`READY`

CRITICAL / HIGH の New / Open / Reopened finding はない。IR-028 と IR-029 は MEDIUM / Optional / non-blocking、IR-027 は LOW / Deferred である。記録した finding と未検証範囲を前提として、現実装は正式な Implementation Review gate を満たす。
