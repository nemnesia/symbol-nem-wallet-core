# Requirements Baseline Decision 001

- Decision ID: `DEC-REQ-001`
- Status: Approved / Active
- Approved date: 2026-08-17
- Target: `docs/requirements/requirements.md`
- Related review finding: `RR-005`

## Initial approved baseline

- Commit: `99fa54bb4bd64ca4ae9ecb7452f91c679a4c5fba`
- Blob: `930d22b30bb1b48126895dd7bdbaedc9bfcb601f`

この状態を、Profile、Network、Chain、Mnemonic、Software Key、Profileパスワード、署名、削除、Bindingおよび責任境界に関する初期承認済み要件ベースラインとして扱う。

当時の要件本文で「ユーザー確定事項 §…」または「要件定義更新依頼」と表記されていた事項は、この初期ベースラインに取り込まれた決定として追跡する。

## Current effective baseline

2026-08-17 の全体整合性見直しにより、OPEN-001 / OPEN-002 の決定、RR-005 の承認追跡、Web/WASM対応、および requirements amendment を `docs/requirements/requirements.md` へ統合した。

現在の有効な統合要件ベースラインは次とする。

- Requirements consolidation commit: `2ef959be4a57cf25623a81edfb7750db161128af`
- Requirements blob: `e6a5eae4a30f357f5b1b40d57be5b51cf2a05330`
- OPEN-001 clarification commit: `b2969dc2011aff7d339848b793b5b5e03088d877`
- Superseded OPEN-002 amendment removal commit: `6eaaa2ba0462e18025d1966c397a4710cea4aedd`

`docs/requirements/requirements.md` の現行内容を v1 要件の単一の現行正本とする。個別の決定理由は次の決定記録へ追跡する。

- `docs/decisions/open-001.md`: Symbol / NEM互換性基準
- `docs/decisions/open-002.md`: Profileパスワード品質ポリシーの責任境界

## Superseded statements

初期要件に存在した次の状態・記述は、その後の承認済み決定によって失効している。

- 「独立した承認記録は存在しない」という記述: 本 `DEC-REQ-001` により失効。
- `OPEN-001` を未決定事項とする記述: `docs/decisions/open-001.md` により失効。
- `OPEN-002` を未決定事項とし、Wallet Coreへパスワード品質判定を要求する記述: `docs/decisions/open-002.md` により失効。
- `requirements-amendment-open-002.md` を別正本として扱う状態: 現行 `requirements.md` への統合により失効し、ファイルを削除済み。

過去の commit / blob / review は、その時点の監査・変更履歴として保持する。

## Approval and traceability

第三者は、次の順序で現在の要件と決定理由を追跡できる。

1. `docs/requirements/requirements.md` で現在有効な要件を確認する。
2. 本 `DEC-REQ-001` で初期ベースラインから現在の統合ベースラインへの系譜を確認する。
3. OPEN-001 / OPEN-002 の個別決定記録で変更理由を確認する。
4. Git commit / blob および `docs/reviews/` の過去レビューで変更前後を検証する。

過去の承認対象を追跡不能にする履歴の消去は行わない。

## RR-005 resolution

RR-005の修正完了条件は、要件の出所・承認状態・変更後の現行正本を第三者がリポジトリ内で追跡できることである。

本記録に初期承認blobと現在有効な統合blobの双方を記録し、個別決定記録およびGit履歴へ接続することで、この追跡性を維持する。RR-005はResolvedとする。
