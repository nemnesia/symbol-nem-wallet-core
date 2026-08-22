# OPEN-VALIDITY-001: Mnemonic / 秘密鍵の妥当性・安全性基準

## Status

Closed

## Decision

symbol-nem-wallet-core v1 では、Mnemonic および秘密鍵について、生成・復元・取込みの各経路で対象方式に対して妥当な値だけを登録・利用する。

適用範囲は次のとおりとする。

- Core が新規生成する Mnemonic
- 既存 Mnemonic から Profile を復元・作成する経路
- Core が独立生成する Generated Software Key
- 外部秘密鍵を取り込む Imported Software Key
- 保存済み Mnemonic から導出する Derived Software Key

妥当性・安全性の判定責任は Wallet Core に置く。Binding / Application は Core の判定を代替または回避しない。

要件レベルでは、採用する Mnemonic 標準、seed 生成方式、HD 導出方式、秘密鍵の具体的な検証アルゴリズム、入力表現、乱数生成方式等は固定しない。これらは仕様設計で決定し、Symbol / NEM の鍵・公開情報・署名・Network 処理は `symbol-sdk` 3.3.2 と、HD 復元互換性は仕様で固定した導出規則および deterministic fixture と一致させる。特定の既存 Wallet 製品との互換性は、名称、version または commit、入力、期待値および fixture を明示した範囲に限り保証する。

## Rationale

要件定義では、無効または不適切な Mnemonic / 秘密鍵を登録・利用しないことと、その判定責任・適用範囲を固定すれば十分である。BIP39 等の具体標準や検証アルゴリズムまで要件段階で固定すると、HD Wallet の具体方式を仕様設計へ委ねる既存の責任境界を越える。

このため、要件では妥当性確認を必須とし、具体方式は仕様設計へ引き継ぐ。

## Consequences

- Generated / Imported / Mnemonic Restore / Derived の各経路で妥当性確認を必須とする。
- 妥当性確認に失敗した値は登録・利用しない。
- 具体的な Mnemonic 標準、seed 生成、HD 導出、秘密鍵検証方式、乱数生成方式は仕様設計事項とする。
- 仕様設計では固定テストベクタ等により互換性と妥当性を検証可能にする。

## Traceability

- `docs/requirements/requirements.md` FR-004, FR-005, FR-021
- `docs/requirements/requirements.md` AC-004, AC-005, AC-035
- `docs/requirements/requirements.md` §3.2, §11, §12.1
- `docs/reviews/requirements/requirements-review-003.md` RR-013
