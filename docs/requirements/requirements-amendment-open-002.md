# Requirements Amendment: OPEN-002

- Amendment ID: `REQ-AMEND-OPEN-002`
- Status: Effective
- Effective date: 2026-08-17
- Applies to: `docs/requirements/requirements.md`
- Decision source: `docs/decisions/open-002.md`

## Purpose

`OPEN-002` の決定に基づき、Profileパスワード品質に関するWallet Coreの責任範囲を訂正する。本改訂は `docs/requirements/requirements.md` に対する規範的な差分として扱い、同本文に残る矛盾する記述より優先する。

## Responsibility boundary

Profileパスワードの最小長、最大長、文字種、複雑性、辞書チェック、既知の弱いパスワードの拒否、強度表示その他の品質基準は、Wallet Coreを利用する上位Application / Packageの責任とする。

Wallet Coreはパスワード品質を独自に評価しない。Wallet Coreが要求するのは、未指定・空の拒否と、秘密情報を必要とする処理における正しいProfileパスワードによる認可である。

KDF、salt、暗号方式、保存形式、パラメータ、パスワードから暗号鍵を導出する具体方式はWallet Coreの仕様設計で決定する。

## Normative changes

### FR-020

次の内容へ読み替える。

> **FR-020 (MUST)** Coreは、Profile作成およびProfileパスワード変更で、未指定または空のProfileパスワード、およびCoreが内部で補った既定値を受け付けないこと。Profileパスワードの品質基準は上位Application / Packageの責任とし、Coreは長さ、文字種、複雑性その他の品質条件を独自に要求しないこと。

### SEC-016

削除する。Wallet Core自身へパスワード品質または推測攻撃耐性の判定を要求しない。

### AC-001

Profileパスワードについて「v1で承認された安全性方針を満たす」という条件を削除する。未指定・空・Coreが内部で補った既定値の場合にProfileが作成されないことを受入条件とする。

### AC-029

Profileパスワードについて「v1で承認された安全性方針を満たさない」という条件を削除する。未指定・空・Coreが内部で補った既定値の場合にProfile作成またはパスワード変更が成功しないことを受入条件とする。

### AC-036

削除する。Wallet CoreによるProfileパスワード品質判定はv1の受入対象としない。

### OPEN-002

Closedとする。決定内容は `docs/decisions/open-002.md` を正本とする。

## Other affected wording

`docs/requirements/requirements.md` 内の次の表現は、本改訂によって失効する。

- 「安全性方針を満たさないProfileパスワード」
- 「v1で承認されたProfileパスワード安全性方針」
- 「推測攻撃への耐性を持つこと」をWallet Coreが判定する旨の記述
- `OPEN-002` を仕様設計開始前の未決定事項として扱う記述

これらは、Profileパスワード品質を上位Application / Packageへ委ねるという本改訂の責任境界に置き換える。

## Unchanged requirements

次は変更しない。

- 正しいProfileパスワードによるCoreの認可
- 未指定・空のProfileパスワードの拒否
- CoreによるProfileパスワードの永続保存・継続キャッシュ禁止
- Profileパスワード紛失時の復旧・リセット非提供
- パスワード変更、Software Key削除、Profile削除等の認可要件
- 秘密情報の暗号化保存
- KDFその他の暗号学的保護方式を仕様設計で決定する方針
