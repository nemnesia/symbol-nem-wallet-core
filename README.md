# symbol-nem-wallet-core

Symbol と NEM のウォレット向け Wallet Core の仕様・設計・実装を管理するリポジトリです。

Wallet Core v1 の対象は、Profile とその秘密情報の管理です。Mnemonic、Software Key、Profile パスワード、暗号化された Wallet Store、公開鍵・アドレスの取得、署名などを扱います。Transaction の構築、REST / WebSocket 通信、ウォレットUI、外部Signer、Hardware Wallet、OS固有の安全な鍵保管は対象外です。

## リポジトリの状態

現在の `main` ブランチには、要件・仕様・設計判断・レビュー資料が含まれています。Rust の実装と Native / WASM Binding は `agent/implement-wallet-core` 系の実装ブランチで管理されています。このため、`main` ブランチ単体では Cargo パッケージとしてビルド・利用できません。

実装を利用する場合は、実装ブランチの `Cargo.toml`、公開API、テストおよびレビュー結果を確認してから利用してください。未確認のAPIや対応環境をこのREADMEでは保証しません。

## 仕様の概要

- Profile は Mainnet または Testnet のいずれかに固定されます。
- 1つの Profile は1つの Mnemonic と、0個以上の Software Key を持ちます。
- Software Key は Symbol または NEM に固定され、Derived / Imported / Generated のいずれかの由来を持ちます。
- 秘密情報は Profile パスワードで保護され、秘密情報を必要とする処理ごとに認証します。
- 保存先は Core が所有せず、不透明な Wallet Store Blob の読み込み・更新を行います。
- Native と WASM では同じ Core ロジックを利用し、Binding は境界の変換を担当します。

## ドキュメント

- [要件定義書](docs/requirements/requirements.md)
- [Wallet Core 仕様設計書](docs/specifications/specification.md)
- [Wallet Store フォーマット v1](docs/specifications/wallet-store-format-v1.md)
- [コンセプトシート](docs/consept/concept-sheet.md)
- [設計判断](docs/decisions/)
- [仕様レビュー](docs/reviews/specifications/)
- [実装レビュー・実装からの改善依頼](docs/reviews/implementation/)
- [技術知識ベース](docs/knowledge/)

仕様・実装・SDKの利便APIは同一視せず、互換性やプロトコル上の判断が必要な場合は、まず承認済み仕様と対応するレビュー・決定記録を確認してください。

## 注意事項

このリポジトリの仕様では、Mnemonic、秘密鍵、Profile パスワードなどの秘密情報をログやエラーへ含めないこと、数量計算に浮動小数を使わないこと、Symbol と NEM、Mainnet と Testnet を明示的に区別することを求めています。実装やアプリケーション側で秘密情報を扱う場合も、これらの責任境界を維持してください。

## ライセンス

現行 `main` ブランチにはライセンスファイルが含まれていません。ライセンス条件が必要な利用・配布については、対象の実装ブランチおよび配布物に含まれるライセンス表示を確認してください。
