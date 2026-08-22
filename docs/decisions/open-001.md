# OPEN-001 Decision

- Decision ID: `OPEN-001`
- Status: Closed
- Decided date: 2026-08-17
- Scope: symbol-nem-wallet-core v1

## Decision

v1のSymbol / NEMにおける秘密鍵・公開鍵の対応、アドレス生成、署名およびMainnet / Testnetを含むChain / Network処理の互換性基準は、2026-08-17時点の `symbol-sdk` **3.3.2** に準拠する。

同一の秘密鍵、公開鍵、署名対象データ、ChainおよびNetwork条件に対して、`symbol-sdk` 3.3.2と互換な公開情報・署名検証結果となることを受入基準とする。

対象範囲は次のとおりとする。

- 秘密鍵と公開鍵の対応
- Chain / Networkに対応するアドレス生成
- Symbol / NEMそれぞれの署名結果
- Mainnet / Testnetの区別

## HD Wallet

HD WalletおよびMnemonicによる復元はv1対象とするが、具体的なMnemonic方式、seed生成方式、導出パス、index表現を `symbol-sdk` 3.3.2 が規定しているとは扱わない。

HD Walletの復元互換性は、本仕様で固定した導出規則および deterministic fixture との一致によって判定する。特定の既存 Symbol / NEM Wallet 製品との包括的互換性は v1 の保証対象としない。特定 Wallet との互換性を追加する場合は、名称、version または commit、入力および期待値を fixture として固定した範囲に限り保証する。

## Compatibility policy

`symbol-sdk` の将来バージョンへ自動追従することはv1の要件としない。v1の上記互換性基準は `symbol-sdk` 3.3.2 に固定し、将来SDKの仕様または挙動が変更された場合は、wallet-core側で互換性影響を評価した上で別途変更を決定する。

## Requirements impact

本決定により `OPEN-001` は解消済みとする。

- 鍵・公開鍵、アドレス、署名、Chain / Network処理: `symbol-sdk` 3.3.2との互換性を基準とする。
- HD Wallet / Mnemonic復元: 本仕様で固定した導出規則および deterministic fixture との一致を受入基準とする。特定 Wallet との互換性は明示した fixture の範囲に限り保証する。

`OPEN-001` を未決定事項として記載した過去文書は、その時点の履歴記録として扱う。

## Traceability

- Related requirement: `FR-003`, `FR-009`, `FR-013`, `DR-008`
- Related acceptance criteria: `AC-009`, `AC-033`
- Related review finding: `RR-001`, `RR-015`
