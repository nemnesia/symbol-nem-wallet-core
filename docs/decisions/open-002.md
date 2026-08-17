# OPEN-002 Decision

- Decision ID: `OPEN-002`
- Status: Closed
- Decided date: 2026-08-17
- Scope: symbol-nem-wallet-core v1

## Decision

v1のWallet Coreは、Profileパスワードの品質ポリシーを規定しない。

パスワードの最小長、最大長、文字種、複雑性、辞書チェック、既知の弱いパスワードの拒否、強度表示その他の品質基準は、Wallet Coreを利用する上位Application / Packageの責任とする。

Wallet Coreは、Profileパスワードについて次だけを要求する。

- Profile作成およびProfileパスワード変更時に、パスワードが未指定または空でないこと。
- Profile配下の秘密情報を必要とする処理、Software Key登録、Profileパスワード変更、Software Key削除およびProfile削除について、正しいProfileパスワードによるCoreの認可が成立すること。
- CoreはProfileパスワードを永続保存または継続的にキャッシュしないこと。

パスワード品質をWallet Coreが独自に判定・拒否する機能はv1の責任範囲に含めない。

## Security boundary

パスワード品質ポリシーを上位Application / Packageへ委ねることは、保存秘密情報の暗号学的保護方式まで上位へ委ねることを意味しない。

KDF、salt、暗号方式、保存形式、パラメータ、パスワードから暗号鍵を導出する具体方式などはWallet Coreの仕様設計で決定する。

## Requirements impact

本決定により、`docs/requirements/requirements.md` の `OPEN-002` は解消済みとして扱う。

要件本文にある次の要素は削除または読み替えの対象とする。

- 「v1で承認されたProfileパスワード安全性方針」
- 「安全性方針を満たさない値の拒否」
- Wallet Core自身にパスワードの推測攻撃耐性を判定させる要件

`FR-020` は、Profile作成およびProfileパスワード変更で未指定・空・Coreが内部で補った既定値を拒否する要件として扱う。

`SEC-016` はCore側のパスワード品質要件としては不要となるため削除対象とする。パスワード品質ポリシーの責任は上位Application / Packageへ移す。

`AC-001` および `AC-029` からパスワード品質判定に関する条件を外す。`AC-036` は不要となるため削除対象とする。

## Traceability

- Related requirement: `FR-020`, `SEC-002`, `SEC-006`, `SEC-007`, `SEC-013`, `SEC-014`
- Related acceptance criteria: `AC-001`, `AC-029`
- Related review finding: `RR-012`
