# OPEN-001 Decision

- Decision ID: `OPEN-001`
- Status: Closed
- Decided date: 2026-08-17
- Scope: symbol-nem-wallet-core v1

## Decision

v1のSymbol / NEMにおける鍵、公開鍵、アドレス、署名およびHD Wallet導出の互換性基準は、2026-08-17時点の `symbol-sdk` **3.3.2** に準拠する。

Mainnet / Testnetを含むChain / Networkごとの処理結果は、同一入力に対して `symbol-sdk` 3.3.2 と互換な結果となることを受入基準とする。

対象範囲は次のとおりとする。

- MnemonicからのHD Wallet導出
- 秘密鍵・公開鍵の生成および対応関係
- Chain / Networkに対応するアドレス生成
- Symbol / NEMそれぞれの署名結果
- Mainnet / Testnetの区別

具体的な導出パス、鍵生成方式、公開鍵生成方式、アドレス生成方式、署名方式、データ表現その他の実装詳細は、`symbol-sdk` 3.3.2との互換性を満たすことを前提として仕様設計で確定する。

## Compatibility policy

`symbol-sdk` の将来バージョンへ自動追従することはv1の要件としない。v1の互換性基準は `symbol-sdk` 3.3.2 に固定し、将来SDKの仕様または挙動が変更された場合は、wallet-core側で互換性影響を評価した上で別途変更を決定する。

## Requirements impact

本決定により、`docs/requirements/requirements.md` の `OPEN-001` は解消済みとして扱う。

要件本文中の次の表現は、本決定を参照するものとして読み替える。

- 「OPEN-001で承認された対象Chain・Networkの外部検証規則」
  - `symbol-sdk` 3.3.2との互換性基準
- 「OPEN-001で承認された対象プロトコル版、互換性基準、基準時点および参照資料」
  - 2026-08-17時点の `symbol-sdk` 3.3.2をv1の互換性基準とする本決定

`OPEN-001` を未決定事項として記載している既存文言は、本決定によって失効する。`OPEN-002` は引き続き未決定事項として扱う。

## Traceability

- Related requirement: `FR-003`, `FR-009`, `FR-013`, `DR-008`
- Related acceptance criteria: `AC-009`, `AC-033`
- Related review finding: `RR-001`
