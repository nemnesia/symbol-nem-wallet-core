# Release operation / provenance implementation

## Scope

本書は、Stage 10 で承認された release / supply-chain policy を workflow、gate、テストへ
接続した Final RC 実装記録である。対象は npm package の formal release path、post-publish
provenance、durable GitHub Release record、その retry boundary、および publish 前後の
source / version / evidence / permission boundary である。

既存の Core security semantics、runtime / public API、native target matrix、canonical WASM、npm
assembly、`release-manifest.json` schema v1、Phase 4A / 4B artifact は変更しない。C ABI の
durable asset publication は npm の actual publish と分離する。actual npm publish は Final RC
では実行しないが、正式 workflow の実装対象である。GitHub Release publication と CHANGELOG も
同じ正式 release path の対象である。

## Implemented

### Release identity and source gate

- formal release workflow は `v*` tag push のみを受け付ける。
- 正式 release は `main` に含まれる clean source commit だけを受け付ける。
- tag は `v<SemVer>` とし、formal release では pre-release version を受け付けない。
- Cargo の4 package、npm package、release manifest、npm tarball の version equality を確認する。
- tag event が exact tag の unforced creation であること、tag target / checkout / source evidence が
  同じ commit であることを確認する。
- npm registry の既存 version、network error、曖昧な HTTP response を区別し、duplicate または
  確認不能の場合は fail closed とする。workflow retry では既存 version を検知して npm publish
  を再実行せず、registry tarball と provenance を再検証する。
- publish 対象 package の source / tarball `package.json` に、`nemnesia/symbol-nem-wallet-core` と
  `packages/wallet-core` を指す canonical npm repository metadata が存在することを確認する。

`scripts/release-operation.mjs` は、release identity evidence、release manifest、npm tarball、
native / WASM evidence、Phase 4A / 4B evidence の identity と digest を publish job で再確認する。
`release-manifest.json` の schema v1 は拡張していない。

### Protected Environment and permission boundary

`.github/workflows/release.yml` は次の job split を使用する。

| job | Environment | permission | responsibility |
| --- | --- | --- | --- |
| `identity` | なし | `contents: read` | tag、source、version、npm duplicate gate |
| `candidate` | なし | `contents: read` | reusable `node.yml` による build / test / assembly / evidence |
| `publish` | `release` | `contents: read`, `id-token: write` | publish 前の bundle gate と npm provenance publish |
| `publication` | なし | `contents: write` | exact asset set の GitHub Release durable publication / verification |

通常の build / test / SBOM / license policy / assembly job は `release` Environment に接続しない。
`packages: write`、`actions: write` および長期 npm token は workflow に要求しない。publication job
だけに `contents: write` を付与し、npm publish job には付与しない。

### Trusted Publishing / provenance

publish command は次の一つだけを canonical path とする。

```text
npm publish --provenance --access public <release tarball>
```

`id-token: write` は `publish` job に限定し、OIDC runtime context が存在しない場合は publish
command の前に停止する。provenance 無効の publish、長期 token 経由の fallback、通常経路の
break-glass publish は実装していない。

publish 前には次の対応を `release-operation.json` と release evidence から追跡できる。

```text
git tag
  -> release commit
  -> release-source.json
  -> release-manifest.json
  -> npm tarball + SHA-256
  -> npm publish --provenance / npm provenance
```

artifact digest、build / lockfile / toolchain evidence、SBOM / license evidence digest は npm
provenance へ統合せず、独立した assurance として保持する。

### Post-publish provenance and durable release record

publish job は registry metadata、published tarball、tarball integrity、attestation endpoint
を取得する。registry tarball の SHA-256 / SHA-512 が release manifest と一致し、npm の実際の
signature verifier が対象 package の provenance attestation を `verified` と報告しなければ
停止する。raw attestation の DSSE payload は package PURL、tarball SHA-512、repository、
`release.yml`、`refs/tags/v0.1.0`、source commit、workflow invocation identity を照合する。
この検証結果と registry response は `npm-provenance.json` に保存する。自己申告の
`--provenance` 実行結果や mock evidence は PASS の根拠にしない。

`release-operation.json` は publication mode、workflow ref、run id / attempt、registry URL、
provenance evidence digest および実際の provenance invocation identity を記録する。
published-mode `release-record.json` はこの2ファイルを exact npm evidence set に含め、
`RELEASE-RECORD-SHA256` とともに durable GitHub Release へ保存する。

### Partial failure and retry

`npm publish` 成功後に provenance capture、published record、または GitHub Release upload が
失敗した場合、workflow rerun は `GITHUB_RUN_ATTEMPT > 1` の identity gate で既存 version を
明示的に認識する。publish job は `recovered-existing` mode へ入り、同じ source-built tarball、
registry integrity、実 provenance、published record を検証してから publication job へ進む。
既存 version の bytes、attestation identity、tag/source/workflow binding が一致しない場合は
再 publish や asset 上書きをせず fail closed とする。既存 GitHub Release は exact metadata と
existing asset digest を検証し、欠落 asset だけを upload する。unexpected asset、同名の異なる
asset、draft/prerelease、tag/source mismatch は自動 recovery しない。

### Phase 4A / 4B final boundary

通常の release candidate validation は既存どおり Phase 4B artifact を生成する。formal release
mode の candidate job だけは Cargo metadata を用いて third-party license text evidence を finalise
し、次の fail-closed gate を実行する。

```text
node scripts/release-license-policy.mjs ... --require-third-party-license-text
```

license text の法的要否はこの実装で判断しない。回収不能、要否不明または policy 判断が必要な
状態は `NEEDS USER DECISION` / gate failure として publish へ進めない。

## User-side configuration required

次は repository / external service 側の設定であり、workflow の commit だけでは完了しない。Final RC
では、ユーザーが提示した設定済み状態を前提として扱う。

1. GitHub repository の Environment 名を正確に `release` として作成する。
2. `release` に required reviewer を1名設定する。
3. `release` の deployment branch / tag protection を approved `main` source と `v<SemVer>`
   release tag に限定する。workflow の identity gate も同じ条件を検証する。
4. npm package `@nemnesia/symbol-nem-wallet-core` の Trusted Publisher を GitHub Actions / OIDC
   として設定する。repository owner は `nemnesia`、repository は
   `symbol-nem-wallet-core`、Environment は `release` とする。repository 内の実ファイル path:
   `.github/workflows/release.yml`。npm Trusted Publisher の workflow filename 設定値:
   `release.yml` だけである。npm 側へ full path を入力しない。通常 release 用の long-lived npm
   automation token は登録・保存しない。
5. GitHub Actions の repository policy が required reviewer、OIDC token issuance および tag
   workflow 実行を許可することを確認する。

### Environment bootstrap order

正式 release workflow を有効にする前、最低でも最初の `v<SemVer>` tag push より前に、次の順序で
外部設定を完了する。

1. GitHub Environment `release` を明示的に作成する。
2. `release` に required reviewer を1名設定する。
3. deployment branch / tag protection を承認済み release policy に合わせて設定する。
4. 設定完了を確認してから npm Trusted Publisher を有効化する。
5. その後にのみ production release tag を作成する。

Environment が workflow 実行で暗黙生成されることを正常な bootstrap path としない。GitHub が
workflow の Environment 参照を契機に `release` を protection rule なしで暗黙生成する場合があっても、
`release` の事前作成と protection 設定が確認できるまで、Trusted Publisher の有効化および production
tag 作成へ進めない。

Environment protection rule の追加条件、Trusted Publisher の複数候補、break-glass policy、
pre-release policy の変更または permission 拡大が必要になった場合は、実装者が決定せず
`NEEDS USER DECISION` とする。

## Not executed

Final RC では次を実行していない。

- actual `npm publish`
- npm version の registry 公開
- GitHub Release の作成・公開（workflow path と deterministic fixture は検証済み）
- production release tag の作成
- npm Trusted Publisher の外部設定変更
- GitHub Environment の外部設定変更
- C ABI durable release publication（production tag が未作成のため）

workflow 内に publish / durable publication command は実装済みだが、tag push と reviewer approval
が発生していないため、公開操作は行われていない。

## Validation intent

`test-release-operation.mjs` は valid tag、malformed / mismatched tag、version mismatch、source
commit mismatch、non-main ancestry、repository metadata / tarball metadata mismatch、Environment
boundary、least-privilege permission、OIDC-only publish、provenance fallback 不在、長期 token 不在、
Phase 4A / 4B digest mismatch rejection を deterministically 確認する。

formal release を実際に進める前には、既存の Phase 1〜4B evidence と current release candidate
assembly を含む relevant CI を通し、`release` Environment と npm Trusted Publisher の設定を
reviewer が確認する。
