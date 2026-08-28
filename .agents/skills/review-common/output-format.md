# Review Output Format

すべてのレビュー成果物は Markdown とし、以下の章構成・順序を共通で使用する。レビュー種別ごとに異なる正式指摘の接頭辞、重大度、Review Result の値、Domain Checks の内容は各 Skill の `output-format.md` に従う。該当項目がない場合も「なし」と明記する。

## 共通構成

1. `Review Target`: 対象、確認日、成果物、レビュー範囲、未確認範囲
2. `Execution Audit`: self-review の観点別パス、または実際に使用したサブエージェントと完了状態
3. `Evidence Used`: 確認資料、用途、実行結果
4. `Review Result`: 対象 Skill の Review Result 値
5. `Summary`: 総評
6. `Finding Status`: ID、Severity、Status、初出レビュー、今回の状態根拠
7. `Required Changes`: 対象 Skill で必須とされる重大度の New / Open / Reopened
8. `Optional Improvements`: 対象 Skill で任意改善とされる重大度の New / Open / Reopened
9. `Resolved Findings`: 対応確認できた過去指摘
10. `Deferred Findings`: 後工程へ引き継ぐ指摘、未決定事項、確認事項
11. `Scope and Traceability`: 対象境界、上流・下流資料との追跡、責任分界
12. `Domain Checks`: 対象 Skill 固有の評価項目
13. `Validation Results`: 実行した検証、結果、未実行・未確認範囲
14. `Review Gates`: 各ゲートの合否、根拠、対応 ID
15. `Remaining Risks and Open Decisions`: 残存リスク、未決定事項、前提
16. `Automatic Changes`: レビュー中に行った変更。変更しない場合は「なし」
17. `Final Decision`: `Review Result` と同じ最終判定

各指摘には、対象箇所（実装レビューではファイルと行）、発生条件または確認できた事実、既存の根拠、問題、影響、必要な最小修正または確認、完了条件または再確認方法を含める。レビュー本文へ討議、投票、思考過程を出力しない。秘密情報、復号データ、credential も記録しない。
