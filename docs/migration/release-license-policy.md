# Phase 4B — release-time license policy

## Scope

Phase 4B は Phase 4A の `sbom.spdx.json` と `license-inventory.json` を入力として、
runtime dependency closure の license policy を release-time に評価する。Phase 4A の
SBOM、inventory schema v2、artifact identity、runtime および public API は変更しない。

実装は [`scripts/release-license-policy.mjs`](../../scripts/release-license-policy.mjs) が担当し、
次の deterministic artifact を生成する。

- `license-policy.json`
- `THIRD_PARTY_LICENSES.json`
- `LICENSE-POLICY-SHA256SUMS`

`LICENSE-POLICY-SHA256SUMS` は Phase 4A の `SBOM-SHA256SUMS` とは別の digest set である。

## Policy

現在の allowlist は次の SPDX license identifier に限定する。

`MIT`、`Apache-2.0`、`BSD-3-Clause`、`CC0-1.0`、`ISC`、`Zlib`、`Unlicense`、
`Unicode-3.0`

SPDX expression は文字列比較ではなく構文解析して評価する。`AND`、`OR`、括弧および
`WITH` の構造を保持し、compound expression は式中のすべての license identifier と
exception が policy で承認済みの場合だけ `allowed` とする。この closed-world 規則により、
`OR` の文字列順序差は policy の差にならない一方、未承認 identifier を別の `OR` branch に
隠して通過させない。

SPDX syntax / identifier catalogue は、法的な許可判断を行う allowlist とは別に管理する。
したがって、catalogue に存在するが allowlist にない identifier も自動許可しない。

## Results and fail-closed behavior

component ごとに次の status を区別する。

- `allowed`
- `needs-user-decision`
- `invalid-metadata`
- `missing-declared-metadata`
- Phase 4A から引き継ぐ `license_text_status`（license text の観測）

未知・未承認 identifier、copyleft / reciprocal identifier、未承認 exception は
`needs-user-decision` とし、gate の結果を `NEEDS USER DECISION` として停止する。Codex は
allowlist への自動追加、license compatibility の法的判断、permanent deny の確定を行わない。

SPDX grammar を満たさない metadata は `invalid-metadata` とし、policy 上の user decision
とは区別して fail する。declared metadata がない場合も `missing-declared-metadata` として
fail する。inventory と SBOM の identity、license、source comment または checksum が一致
しない場合も fail する。

## License text / notice evidence boundary

`THIRD_PARTY_LICENSES.json` は、runtime の Cargo registry component ごとに Phase 4A が観測した
license / notice file path と SHA-256、および収集状態を deterministic に記録する。metadata を
明示した finalization 実行では target-filtered Cargo metadata の `manifest_path` から上流 file
を読み、inventory の SHA-256 と一致した text だけを `license_texts` として artifact に収録する。
通常の Phase 4B CI では inventory の path / SHA-256 と policy artifact の deterministic 構造を
検証し、上流 source の実体収集は metadata を明示した別の finalization 実行へ委譲できる。
source evidence が見つからない場合も Phase 4B の allowability failure とは分離し、final text
gate の `pending` として記録する。既存 path が存在するのに SHA-256 が一致しない場合は
evidence mismatch として fail する。license text の欠落だけでは Phase 4B policy gate を失敗にしない。
checked-in authoritative source evidence は live registry に依存せずに使用できる。

以前の Phase 4A missing observation は、
[`third-party-license-evidence/manifest.json`](../../third-party-license-evidence/manifest.json)
に記録した authoritative upstream text で解消する。対象は次のとおりである。

- `bitcoin_hashes@0.14.101` — `CC0-1.0`
- `napi@3.12.2` — `MIT`
- `napi-sys@3.3.0` — `MIT`
- `napi-derive@3.6.3` — `MIT`
- `napi-derive-backend@6.1.2` — `MIT`

checked-in text の digest または upstream identity が一致しない場合は evidence mismatch として
fail closed する。法的要否はこの implementation で判断しない。

この artifact は第三者 text の法的要否を決めず、text を推測・生成もしない。最終 release
では、必要な上流 license / notice text を取得・検証できない場合に fail closed とする。
その検証は `release-license-policy.mjs --require-third-party-license-text` を明示して行う。
したがって Phase 4B の current gate と、最終 text evidence の finalization gate を分離する。

## Verification boundary

deterministic / negative test は [`scripts/test-release-license-policy.mjs`](../../scripts/test-release-license-policy.mjs)
で実行する。CI では既存の release-candidate package assembly の Phase 4A generate / validate
の後に Phase 4B artifact を生成し、最終 bundle で再検証する。

この Phase で実装しないものは npm publish、GitHub Release の durable publication、provenance
finalization、C ABI release asset publication、CHANGELOG finalization である。
