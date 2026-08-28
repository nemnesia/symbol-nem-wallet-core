# Review Gates

1. 対象: 公開対象packageを一意に特定でき、private packageやappを誤って対象にしていない。
2. 文書: README、license、移行情報が公開内容と一致し、利用開始に必要な情報がある。
3. Metadata: crate名、version、公開API、features、環境、公開設定、依存分類が正しい。
4. 配布物: crate package、Native artifact、WASM生成物に必要なコード・header・型・文書が含まれ、秘密情報・不要な開発物が含まれない。
5. SemVer: 差分、公開契約、tagとversion判断が整合する。
6. 検証: 実行可能な品質検証とrelease evidenceの結果を事実どおり確認できる。
7. capabilityとsecurity: Symbol / NEM、network、署名、Wallet Store、Native / WASM ownership、秘密情報、保証範囲が過剰でない。

対象不明は TARGET CONFIRMATION REQUIRED、公開阻害事項は NOT READY、阻害しないMinorだけなら READY WITH MINOR FIXES、すべて合格なら READYとする。
