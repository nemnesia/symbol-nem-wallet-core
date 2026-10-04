# 公開前レビュー 005 の修正記録

確認日: 2026-10-04。対象は PR #22 のローカル修正差分。
元の [レビュー 005](release-readiness-review-005.md) は commit `458fe84` に記録し、
その後に本修正を行った。過去 snapshot のレビュー結果は変更しない。
本書は修正状況の記録であり、正式 release gate の成功認定ではない。

## 承認された判断

- ユーザーは3引数の Profile 確定 API の維持と、受領確認を Application の責務へ揃える要件更新を承認した。
- 追加された platform を含むリリースの version は、ユーザー指定により `0.2.0` とした。
- PR の P1「Restore explicit handoff confirmation before finalization」は変更前の要件との不整合を指摘していた。確認引数を戻す案は採用せず、承認された責任境界を要件・設計・仕様・移行案内へ反映した。
- Application が正しい Pending Profile と password を持てば確認なしでも確定を要求できる。確認取得後だけ要求する制御と、その確認が現在の操作に対するものであることは Application が保証する。Core が独立検証するとは記載しない。

## 指摘ごとの対応

| ID | 修正内容 | 残る確認 |
| --- | --- | --- |
| RL-005 | 対象 Rust 差分へ `cargo fmt --all` を反映 | 最終 commit の GitHub Rust checks |
| RL-006 | JSDoc だけを除いて仕様の declaration と厳密比較し、source と dist は JSDoc を含めて厳密比較。parity test の定数 export と削除済み変数参照も修正 | 最終 commit の npm checks、Browser / MV3 の実行 |
| RL-007 | UC-001、FR-001、AC-001、AC-034、AC-050、責任分担、および関連設計・仕様を整合 | 最終差分のレビュー |
| RL-008 | 4 Cargo packages、npm、root / fuzz / consumer lockfiles、RN Podspec / Pod lock、公開 metadata gate、publication gate と関連 fixture を `0.2.0` に整合。[移行案内](../../migration/0.2.0.md)を追加 | 最終 main snapshot の identity / candidate / release record |
| RL-004 | Podspec 更新後の正規 checksum と固定 lockfile digest を更新 | iOS 両 producer、XCFramework、全 target の正式 candidate は未実行。Open を維持 |

独立した旧 version のテスト fixture、過去のレビュー・migration 記録、既存公開版を対象とする recovery workflow の default は、今回の公開 version 指定とは区別する。

## 検証

実装・manifest・npm package・依存 lockfile の変更に対応する検証を実行した。
Node の検証は Node.js `24.18.0` を使用した。

| 検証 | 結果 |
| --- | --- |
| `bash scripts/check-local.sh rust` | PASS: format、locked Clippy、locked fuzz check、workspace tests |
| `bash scripts/check-local.sh wasm` | PASS: Node 実行の7テスト、locked target check |
| `bash scripts/check-local.sh native` | PASS: release build、C header compile、C ABI runtime |
| `bash scripts/check-local.sh dependencies` | PASS: frozen workspace / consumer install、install scripts 無効 |
| `bash scripts/ci/node-source.sh` | PASS: release evidence、identity、Pod lock、provenance、record、recovery、browser 観測用の決定的テスト |
| `node scripts/test-release-operation.mjs` | PASS: 決定的な運用制約テスト |
| `bash scripts/ci/npm-package.sh` | PASS: build、pack、Linux x64 native / WASM の ESM / CJS consumer、fallback、fail-closed |
| `git diff --check` | PASS |
| npm registry の `0.2.0` 照会 | E404: その version の公開は確認されなかった |

CocoaPods `1.16.2` で Podspec の `to_pretty_json` の SHA-1 を算出した。
更新前の `a9e466142f176a04597f0c99ef58a16f6f2f0a36` を再現できた後、
`0.2.0` の値 `a838e7c0f5da38450954d345fbe48696b629a4e2` を Podfile.lock に反映した。
Linux での checksum 算出は iOS の `pod install`、compile、simulator 検証の代替ではない。

## リリース前に残る事項

- 修正を含む最終 commit の PR CI とレビュー。
- iOS、Android、他 OS の実 native / consumer、Browser / MV3、全配布物の最終 snapshot に対する検証。
- npm Trusted Publisher、実 provenance、SBOM / license evidence、durable assets、正式 release record の照合。
- Dependabot #16 は修正版なしという先行調査の状態を維持し、dismiss や無関係な依存更新は行っていない。consumer の依存 install 成功は脆弱性解消を意味しない。

全 platform / release gate が未完了のため、リリース可能とは判定しない。
