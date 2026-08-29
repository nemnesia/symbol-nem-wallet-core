# Review Gates

Gate を不合格にする finding は `Critical` の正式指摘へ対応付ける。`Critical` が1件以上存在する場合は `REVISE DESIGN`、`Critical` がなく `Major` / `Minor` のみの場合は `READY` とする。

1. 目的と範囲: 設計の目的、対象、対象外、前提が一意に理解できる。
2. コンテキストと責任: 外部主体、コンポーネント責務、trust boundary、秘密情報境界が明確である。
3. 依存方向: 依存が意図した方向に流れ、責務の逆流や循環がない。
4. 主要フロー: 正常、失敗、再試行、再起動、重複、結果対応の責任が確認できる。
5. データ所有: 状態、秘密情報、保持、更新、破棄の所有者と境界が明確である。
6. セキュリティと相互運用性: security invariant、Symbol / NEM、Mainnet / Testnet、Core / Native / WASM の境界を弱めていない。
7. 上流整合性: 要件、仕様、既存設計と重大な矛盾がない。
8. 下流実装可能性: 下位仕様・実装・検証へ必要な設計判断を推測なしに引き渡せる。

API、schema、暗号パラメータなど下位工程の未決定だけでは Gate 不合格にしない。Gate 不合格に対応する Critical がない場合、Major / Minor のみを理由に差し戻さない。
