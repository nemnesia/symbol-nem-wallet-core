# symbol-nem-wallet-core 要件定義書

## 1. 概要

- 背景: Symbol / NEMウォレットでは、ニーモニック、秘密鍵、HD Wallet、Software Key、署名などの秘密情報を扱う。これらをUI / Applicationや実行環境ごとに管理すると、保存責任、利用時の保護、鍵の由来による処理差異が不明確になる可能性がある。
- 目的: Desktop / MobileのSymbol / NEMウォレット向けに、Profileを秘密情報管理の基本単位とし、その配下のMnemonicおよびSoftware Keyを共通のライフサイクルで管理・利用できるCoreを提供する。
- 解決する課題: MnemonicとSoftware Keyの管理単位が分散すること、Derived / Imported / Generated Software Keyの利用処理が別系統になること、Profile単位のパスワード保護と秘密情報利用時の責任境界が不明確になることを解消する。

本書は `docs/consept/concept-sheet.md` の確定方針を、仕様設計へ引き渡せる要件へ整理したものである。API、データ形式、暗号方式、保存形式、アーキテクチャ、Binding方式、内部処理は決定しない。

## 2. 対象範囲と責任境界

### 対象

v1では、Desktop / MobileのSymbol / NEMウォレットから利用する、Profile単位のSoftware Key管理・署名Coreを対象とする。

#### Profile管理モデル

Profileは、秘密情報を管理する基本単位であり、必ず1つのMnemonicを持つ。Mnemonicを持たないProfileはv1で許可しない。

概念上の関係は次のとおりである。これは要件上の個数関係を示すものであり、データ構造、ID、スキーマ、Rust型を定義するものではない。

```text
Profile
├─ Mnemonic [必須・1つ、Profileのルート秘密情報]
├─ Derived Software Key [0..n]
├─ Imported Software Key [0..n]
└─ Generated Software Key [0..n]
```

- Mnemonic: Profileのルート秘密情報。Profile管理下で保存し、暗号化保存の対象とする。
- Derived Software Key: Profile管理下のMnemonicから導出され、Profile配下へ保存されるSoftware Key。
- Imported Software Key: 外部から直接インポートされ、既存Profile配下へ保存されるSoftware Key。
- Generated Software Key: Coreが独立して生成し、既存Profile配下へ保存されるSoftware Key。
- Software Key: 由来にかかわらず、Profile配下で同じ秘密鍵利用ライフサイクルの対象となる秘密鍵。

Imported Software KeyおよびGenerated Software KeyだけでProfileを作成することはできない。すべてのSoftware Keyは、Mnemonicを持つ既存Profileへ追加する。

#### Profileパスワードと利用時の責任境界

- Profileごとに1つのProfileパスワードを使用し、Profile配下のMnemonic、Derived Software Key、Imported Software Key、Generated Software Keyを同じProfile保護単位として扱う。
- Software Keyごとの個別パスワードはv1で設けない。
- CoreはProfileパスワードを永続保存または継続的にキャッシュしない。
- 秘密情報を必要とする処理ごとにProfileパスワードを受け取り、必要な秘密情報を一時的に利用する。CoreはProfileまたはSoftware Keyを継続的なUnlocked状態として保持しない。
- 処理終了後、Coreは平文のMnemonicまたは秘密鍵を継続的に利用可能な状態として保持しない。具体的なメモリ保持・消去方式は仕様設計で決定する。

### 対象外

次はv1の対象外とする。

- Hardware Walletとの連携
- External Signerとの連携
- OS Keychain、Secure Enclave、TPMなどOS固有の鍵保管機能との連携
- Watch-onlyアカウントの提供。Watch-onlyはSignerとは別の、署名能力を持たないアカウント利用形態である。
- SNIF連携
- CLI、署名専用アプリ、認証・SSO向けクライアントへのv1提供
- REST Client、WebSocket Client、ノード選択、Blockchain Explorer
- Transactionの構築およびシリアライズ
- UIコンポーネント、Wallet UIそのもの
- Node.js代替実装
- 特定ウォレットアプリ専用ロジック

### 外部へ委ねる責任

- UI / Application: ユーザー操作、アカウント選択、公開情報の表示、ウォレット固有の表示・設定。Mnemonicまたは秘密鍵の取込み時には、ユーザー入力を一時的に仲介する場合があるが、秘密情報の継続的な保存・管理主体とはしない。
- Network層: REST、WebSocket、announceなどのネットワーク通信。
- Transaction構築層: Transactionの生成とシリアライズ。
- 上流側: 利便性のためにProfileパスワードを一時的に保持する場合の管理責任。CoreはProfileパスワードを永続保存または継続的にキャッシュしない。

CoreはProfile配下のMnemonicおよびSoftware Keyの管理、秘密情報を必要とする処理、署名、追加アカウント導出、パスワード変更、個別Software Key削除、Profile削除を担う。Core管理下の秘密鍵を通常の処理結果としてUI / Applicationへ返さない。

## 3. 利用者と関係者

### 主な利用者

- Desktop / MobileのSymbol / NEMウォレット開発者

CLI、署名専用アプリ、認証・SSO向けクライアントの開発者は、v1の主な利用者および成功判定の対象外とする。

一般利用者がCoreを直接操作することは想定しない。ウォレット利用者のMnemonicまたは秘密鍵の入力は、UI / Applicationを通じて取込み処理へ渡される場合がある。

### 関係者

- Wallet Core: Profile、Mnemonic、Software Keyの秘密情報管理と署名を担う主体。
- UI / Application: ユーザー操作、アカウント選択、公開情報の表示、ウォレット固有の表示・設定を担う主体。
- Network層: ネットワーク通信を担う外部主体。
- Transaction構築層: Transactionの生成・シリアライズを担う外部主体。
- 上流側: Profileパスワードを一時的に保持する場合の管理主体。
- 仕様・設計担当者: 本書の要件を満たす具体方式を決定する担当者。

## 4. 前提条件と制約

### 前提条件

- SymbolとNEMの双方を対象とする。ただし、共通化する処理とチェーン固有として扱う処理の範囲は `OPEN-001` で決定する。
- MainnetとTestnetを明示的に区別する。
- HD Walletの導出パスは、現行のSymbol / NEMにおけるMainnet / Testnetの区分に合わせる。具体的なパス値と参照バージョンは仕様設計で確認する。
- Rust製のポータブルCoreとして提供する構想を維持する。Desktop / MobileからCoreを利用するBindingの対象範囲は `OPEN-003` で決定する。

### 制約

- Profileは必ず1つのMnemonicを持つ。MnemonicなしProfileは作成・利用できない。
- Derived / Imported / Generated Software Keyは、すべて既存Profile配下で管理する。
- Profile配下のMnemonicおよびすべてのSoftware Keyは、Profile単位の1つのProfileパスワードで保護する。Software Keyごとの個別パスワードは設けない。
- CoreはProfileパスワードを永続保存または継続的にキャッシュせず、継続的なUnlocked状態を保持しない。
- ニーモニックおよび秘密鍵の入力形式、バイト表現、API、データ形式は本書で決定しない。
- 暗号方式、KDF、Vault形式、保存形式、メモリ上の保持方法、消去方法は本書で決定しない。
- Symbol / NEMおよびMainnet / Testnetを暗黙に同一視しない。

## 5. ユースケース

### UC-001: Mnemonicを持つProfileを作成する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: 1つのMnemonicとProfileパスワードを持つ秘密情報管理単位を作成する。
- 事前条件: 有効なMnemonicとProfileパスワードが与えられる。
- 期待結果: Mnemonicを必ず1つ持つProfileが作成され、MnemonicはProfile管理下のルート秘密情報として保存対象になる。
- 主な失敗条件: MnemonicなしProfileが作成される。Profileパスワードがない、または要件を満たさない入力でProfile作成が成功する。

### UC-002: 保存済みMnemonicからアカウントを追加導出する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: 保存済みProfileのMnemonicから、後から追加のアカウントおよびSoftware Keyを導出する。
- 事前条件: Mnemonicを持つProfileと正しいProfileパスワードが存在する。
- 期待結果: 導出された秘密鍵がDerived Software KeyとしてProfile配下へ保存される。導出パス、index表現、具体的なHD Wallet仕様は仕様設計で決定する。
- 主な失敗条件: Profileパスワードが正しくない、Profileが存在しない、または導出に失敗した場合に、Derived Software Keyが正常な保存対象として扱われる。

### UC-003: 秘密鍵を既存Profileへ直接インポートする

- 利用者: Desktop / Mobileウォレット開発者
- 目的: 外部から入力された秘密鍵をImported Software Keyとして既存Profileへ追加する。
- 事前条件: Mnemonicを持つ既存Profileと、直接インポートする秘密鍵が扱われる。
- 期待結果: Imported Software KeyがProfile配下へ保存され、Derived / Generated Software Keyと同じ秘密鍵利用ライフサイクルの対象になる。
- 主な失敗条件: ProfileなしでImported Software Keyだけが管理される。取込みに失敗した秘密鍵が正常なSoftware Keyとして保存される。

### UC-004: Software Keyを既存Profileへ個別生成する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: Coreが独立して生成した秘密鍵をGenerated Software Keyとして既存Profileへ追加する。
- 事前条件: Mnemonicを持つ既存Profileが存在する。
- 期待結果: Generated Software KeyがProfile配下へ保存され、他の由来のSoftware Keyと同じ秘密鍵利用ライフサイクルの対象になる。
- 主な失敗条件: ProfileなしでGenerated Software Keyだけが管理される。

### UC-005: Profileパスワードを使用して秘密情報を必要とする処理を行う

- 利用者: Desktop / Mobileウォレット開発者
- 目的: Profileパスワードを処理ごとに使用し、Profile配下のMnemonicまたはSoftware Keyを必要な処理で利用する。
- 事前条件: Mnemonicを持つProfile、対象秘密情報、Profileパスワードが存在する。
- 期待結果: 正しいProfileパスワードが与えられた場合に限り、対象秘密情報を必要とする処理を成功させられる。Coreは継続的なUnlocked状態を保持しない。
- 主な失敗条件: 誤ったProfileパスワードで処理が成功する。処理終了後も平文秘密情報が継続利用可能な状態で保持される。

### UC-006: Software Keyで署名する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: 指定されたSoftware KeyとProfileパスワードを使用し、上流から渡された署名対象データの署名を生成する。
- 事前条件: 対象Software Keyを持つProfile、正しいProfileパスワード、署名対象データが存在する。
- 期待結果: Derived / Imported / Generatedの由来にかかわらず、Software Keyを使用した署名結果を得られる。
- 主な失敗条件: 誤ったProfileパスワード、存在しない・削除済みSoftware Key、または要件を満たさない署名入力で署名が成功する。

TransactionかMessageかなどのアプリケーション上の意味の判断、Transactionの構築・シリアライズはCoreの責任外とする。署名入力の具体的なbytes形式、digestの扱い、Symbol / NEM固有の署名前処理、署名結果の具体形式は仕様設計で決定する。

### UC-007: Profileパスワードを変更する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: Profile単位でProfileパスワードを変更する。
- 事前条件: Mnemonicを持つProfileと正しい現在のProfileパスワードが存在する。
- 期待結果: 変更後のProfileパスワードで、Profile配下のMnemonicおよびすべてのSoftware Keyを利用できる。旧パスワードでは利用できない。
- 主な失敗条件: 正しい現在のProfileパスワードが与えられないのに変更が成功する。Profile配下の秘密情報の一部だけが新しいパスワードで利用できる。

### UC-008: Software KeyまたはProfileを削除する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: 個別Software Keyの削除とProfile全体の削除を区別して実行する。
- 事前条件: Mnemonicを持つProfileと、対象のSoftware KeyまたはProfileが存在する。
- 期待結果: 個別Software Keyの削除ではProfileとMnemonicを残し、Profile削除ではMnemonic、Derived / Imported / Generated Software KeyおよびProfile全体を破棄する。Derived Software Keyを削除しても、Mnemonicが残るProfileでは再導出できる。
- 主な失敗条件: Profile削除後の秘密情報が署名、追加アカウント導出その他の秘密情報を必要とする処理へ利用できる。Profile削除と個別Software Key削除が同じ結果として扱われる。

### UC-009: Symbol / NEMおよびMainnet / Testnetを区別して利用する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: 対象チェーン・ネットワークに対応するアカウント導出結果を利用し、対応するSoftware Keyを署名処理へ渡す。
- 事前条件: 対象チェーン、ネットワーク、対応範囲が明示されている。
- 期待結果: 異なるチェーンまたはネットワークの結果が同一対象として扱われない。
- 主な失敗条件: チェーンまたはネットワークの区分が不明なまま処理が成功する。

## 6. 機能要件

| ID | 優先度 | 要件 | 根拠 | 対応ユースケース |
| --- | --- | --- | --- | --- |
| FR-001 | MUST | Coreは、1つのMnemonicと1つのProfileパスワードを持つProfileを作成できること。Mnemonicを持たないProfileを作成できないこと。 | ユーザー確定事項 §1、§5 | UC-001 |
| FR-002 | MUST | Coreは、ProfileのMnemonicをProfile管理下のルート秘密情報として保存対象にできること。 | ユーザー確定事項 §2、§6 | UC-001、UC-005 |
| FR-003 | MUST | Coreは、保存済みProfileのMnemonicから、後から追加のアカウントおよび秘密鍵を導出し、Derived Software KeyとしてProfile配下へ保存できること。 | ユーザー確定事項 §3、§4 | UC-002 |
| FR-004 | MUST | Coreは、外部から直接取り込んだ秘密鍵を、Mnemonicを持つ既存Profile配下のImported Software Keyとして保存できること。 | ユーザー確定事項 §1、§5 | UC-003 |
| FR-005 | MUST | Coreは、独立して生成した秘密鍵を、Mnemonicを持つ既存Profile配下のGenerated Software Keyとして保存できること。 | ユーザー確定事項 §1、§5 | UC-004 |
| FR-006 | MUST | Coreは、Mnemonic、Derived / Imported / Generated Software Keyを暗号化保存の対象として扱えること。 | ユーザー確定事項 §2、§3、§6、§11 | UC-001、UC-002、UC-003、UC-004 |
| FR-007 | MUST | Coreは、Profile配下の秘密情報を必要とする処理ごとにProfileパスワードを使用し、ProfileまたはSoftware Keyを継続的なUnlocked状態として保持しないこと。 | ユーザー確定事項 §6、§7 | UC-005、UC-006 |
| FR-008 | MUST | Coreは、Derived / Imported / Generatedの由来にかかわらず、Software Keyを同じ秘密鍵利用ライフサイクルの対象として扱えること。 | ユーザー確定事項 §3 | UC-002、UC-003、UC-004、UC-006 |
| FR-009 | MUST | Coreは、指定されたSoftware KeyとProfileパスワードを使用し、上流から渡された署名対象データに対する署名を生成できること。 | ユーザー確定事項 §10 | UC-006 |
| FR-010 | MUST | Coreは、正しい現在のProfileパスワードを要求したうえで、Profile単位のProfileパスワードを変更できること。変更後はProfile配下のすべての秘密情報を新しいパスワードで利用できること。 | ユーザー確定事項 §8 | UC-007 |
| FR-011 | MUST | Coreは、Profileを残したまま個別Software Keyを削除できること。Derived Software Keyを削除しても、Mnemonicを持つProfile自体は削除しないこと。 | ユーザー確定事項 §9 | UC-008 |
| FR-012 | MUST | Coreは、Profile削除時に、ProfileのMnemonic、すべてのDerived / Imported / Generated Software KeyおよびProfile自体を破棄できること。Profile削除は不可逆な操作として扱うこと。 | ユーザー確定事項 §9 | UC-008 |
| FR-013 | MUST | Coreは、Symbol / NEMおよびMainnet / Testnetを区別し、対象チェーン・ネットワークに対応するHD Wallet導出およびアカウント導出の結果を扱えること。Software Keyによる署名は、指定された鍵と上流から渡された署名対象データを対象とし、Transaction等のアプリケーション上の意味を判断しない。 | コンセプト §3、§7、ユーザー確定事項 §10 | UC-002、UC-006、UC-009 |

## 7. 非機能要件

| ID | 優先度 | 要件 | 根拠 | 対応ユースケース |
| --- | --- | --- | --- | --- |
| NFR-001 | MUST | Desktop / Mobileウォレットが、共通するProfileおよびSoftware Keyの秘密鍵処理を個別に実装せず、Coreの責任範囲として利用できること。 | コンセプト §6、§9 | UC-005、UC-006、UC-009 |
| NFR-002 | MUST | UI / Application側で個別に実装・レビュー・保守する範囲と、Coreへ集約するProfile・Mnemonic・Software Key処理の範囲を区別できること。 | コンセプト §6、§9 | UC-005、UC-008 |
| NFR-003 | SHOULD | CoreとUI / Applicationの責任境界、Profileパスワードの管理責任、上流側が一時保持する場合の責任を第三者が説明できること。 | コンセプト §6、§8、ユーザー確定事項 §6、§7 | UC-005、UC-007 |

## 8. セキュリティ要件

| ID | 優先度 | 要件 | 根拠 | 対応ユースケース |
| --- | --- | --- | --- | --- |
| SEC-001 | MUST | Profileの保存状態にあるMnemonicおよびすべてのSoftware Keyを、平文で永続保存しないこと。 | ユーザー確定事項 §2、§3、§6、§11 | UC-001、UC-002、UC-003、UC-004 |
| SEC-002 | MUST | 正しいProfileパスワードが与えられない場合、MnemonicまたはSoftware Keyを必要とする処理を成功させないこと。 | ユーザー確定事項 §6、§7、§11 | UC-002、UC-005、UC-006、UC-007 |
| SEC-003 | MUST | 秘密情報を必要とする処理の終了後、CoreがMnemonicまたは秘密鍵を平文のまま継続利用可能な状態として保持しないこと。 | ユーザー確定事項 §7、§11 | UC-005、UC-006 |
| SEC-004 | MUST | 破損または認証に失敗した保存データを、正常なMnemonicまたはSoftware Keyとして秘密情報利用処理へ使用しないこと。 | ユーザー確定事項 §11 | UC-001、UC-002、UC-003、UC-005 |
| SEC-005 | MUST | 削除済みSoftware Keyまたは削除済みProfile配下の秘密情報を、署名、追加アカウント導出その他の秘密情報を必要とする処理へ使用できないこと。 | ユーザー確定事項 §9、§11 | UC-002、UC-006、UC-008 |
| SEC-006 | MUST | Profileパスワード変更は正しい現在のProfileパスワードを要求し、変更後はProfile配下のすべての秘密情報を新しいパスワードで利用でき、旧パスワードでは利用できないこと。 | ユーザー確定事項 §8 | UC-007 |
| SEC-007 | MUST | CoreはProfileパスワードを永続保存または継続的にキャッシュしないこと。上流側が利便性のため一時保持する場合、その管理責任は上流側にあること。 | ユーザー確定事項 §6 | UC-005、UC-007 |

暗号方式、KDF、salt / nonce等の具体形式、Vault形式、再暗号化の方法、メモリ保持・消去方式および具体的な消去保証は仕様設計で決定する。

## 9. データ要件

| ID | 優先度 | 要件 | 根拠 | 影響 |
| --- | --- | --- | --- | --- |
| DR-001 | MUST | Profileは、必須の1つのMnemonicと、0個以上のDerived / Imported / Generated Software Keyを管理対象として持つこと。 | ユーザー確定事項 §1 | UC-001、UC-002、UC-003、UC-004 |
| DR-002 | MUST | MnemonicはProfileのルート秘密情報として扱い、Derived / Imported / Generated Software KeyとともにProfileの秘密情報管理対象とすること。 | ユーザー確定事項 §1、§2、§3 | UC-001、UC-002、UC-003、UC-004 |
| DR-003 | MUST | Profile配下のMnemonicおよびすべてのSoftware Keyは、同じProfileパスワードによる保護対象とし、Software Keyごとの個別パスワードを持たないこと。 | ユーザー確定事項 §6 | UC-005、UC-007 |
| DR-004 | MUST | Derived / Imported / GeneratedというSoftware Keyの由来を区別可能としても、署名など基本的な秘密鍵利用処理は同じProfile管理ライフサイクルの対象として扱うこと。 | ユーザー確定事項 §3 | UC-002、UC-003、UC-004、UC-006 |
| DR-005 | MUST | Symbol / NEMおよびMainnet / Testnetの区分を、Mnemonicからの導出、アカウント導出、Software Keyの利用結果の意味と整合する形で扱うこと。 | コンセプト §3、§7 | UC-002、UC-006、UC-009 |

Profile ID、フィールド名、型、スキーマ、保存レコード構造、バイト配置、署名入力の具体形式は本書では定めない。

## 10. 受け入れ条件

| ID | 対応要件 | 受け入れ条件 |
| --- | --- | --- |
| AC-001 | FR-001、DR-001 | Given: 有効なMnemonicとProfileパスワードが与えられる。When: Profileを作成する。Then: Mnemonicを必ず1つ持つProfileが作成され、MnemonicなしProfileは作成されない。 |
| AC-002 | FR-002、SEC-001 | Given: Mnemonicを持つProfileを作成する。When: Profileを保存状態として扱う。Then: MnemonicがProfileのルート秘密情報として管理対象になり、平文で永続保存されない。 |
| AC-003 | FR-003、DR-002 | Given: 保存済みMnemonicを持つProfileと正しいProfileパスワードが存在する。When: 追加アカウントを導出する。Then: 導出された秘密鍵がDerived Software KeyとしてProfile配下へ保存される。 |
| AC-004 | FR-004、DR-001 | Given: Mnemonicを持つ既存Profileと外部からの秘密鍵が存在する。When: 直接インポートする。Then: Imported Software KeyがProfile配下へ保存され、MnemonicなしProfileは作成されない。 |
| AC-005 | FR-005、DR-001 | Given: Mnemonicを持つ既存Profileが存在する。When: Coreが独立したSoftware Keyを生成する。Then: Generated Software KeyがProfile配下へ保存され、Profileなしで管理されない。 |
| AC-006 | FR-006、SEC-001 | Given: Derived / Imported / Generated Software KeyをProfileへ追加する。When: 保存状態を確認する。Then: すべてのSoftware Keyが暗号化保存の対象であり、平文で永続保存されない。 |
| AC-007 | FR-007、SEC-002、SEC-003、SEC-007 | Given: Profile配下の秘密情報を必要とする処理がある。When: Profileパスワードを処理ごとに渡して処理を行い、処理を終了する。Then: 正しいパスワードの場合だけ処理が成功し、Coreは継続的なUnlocked状態または平文秘密情報を継続利用可能な状態で保持せず、Profileパスワードを永続保存・継続キャッシュしない。 |
| AC-008 | FR-008、DR-004 | Given: Derived / Imported / GeneratedのいずれかのSoftware Keyが存在する。When: 同じ種類の秘密鍵利用処理を行う。Then: 由来にかかわらず同じProfile管理ライフサイクルの対象として扱われる。 |
| AC-009 | FR-009 | Given: Profile、対象Software Key、正しいProfileパスワード、上流から渡された署名対象データが存在する。When: 署名を要求する。Then: Software Keyの由来にかかわらず署名結果を得られ、CoreがTransaction等のアプリケーション上の意味を判断することを前提としない。 |
| AC-010 | FR-010、SEC-006 | Given: Profileと正しい現在のProfileパスワードが存在する。When: Profileパスワードを新しいパスワードへ変更する。Then: Profile配下のMnemonicおよびすべてのSoftware Keyを新しいパスワードで利用でき、旧パスワードでは利用できない。 |
| AC-011 | FR-011、SEC-005 | Given: Mnemonicと複数のSoftware Keyを持つProfileが存在する。When: 1つのSoftware Keyを削除する。Then: 対象Software Keyだけが秘密鍵利用処理へ使用できなくなり、ProfileとMnemonicは残る。Derived Software Keyを削除した場合、Mnemonicが残るため再導出可能な状態をProfile削除と同一視しない。 |
| AC-012 | FR-012、SEC-005 | Given: Mnemonicと複数のSoftware Keyを持つProfileが存在する。When: Profileを削除する。Then: Mnemonic、すべてのDerived / Imported / Generated Software Key、Profile自体が破棄され、以後それらを署名、追加導出その他の秘密情報利用処理へ使用できない。Profile削除は不可逆な操作として扱われる。 |
| AC-013 | FR-013、DR-005 | Given: Symbol / NEMおよびMainnet / Testnetの対象が指定される。When: Mnemonicから導出またはアカウントを導出する。Then: 選択したチェーン・ネットワークの結果として扱われ、異なる区分と混同されない。署名時は指定されたSoftware Keyと上流から渡された署名対象データが使われ、Transaction等の意味判断をCoreが行うことを前提としない。 |
| AC-014 | NFR-001、NFR-002 | Given: Desktop / Mobileウォレットから共通Coreを利用する。When: Profile、Mnemonic、Software Keyの実装・レビュー・保守責任を確認する。Then: 共通Coreへ集約する範囲とUI / Application側で個別に扱う範囲を区別できる。 |
| AC-015 | NFR-003 | Given: Core、UI / Application、上流側の責任分担を第三者が確認する。When: Profileパスワードと秘密情報の管理範囲を説明する。Then: CoreがProfile配下の秘密情報を管理し、上流側がProfileパスワードを一時保持する場合の責任が上流側にあることを説明できる。 |
| AC-016 | SEC-004 | Given: 破損または認証に失敗した保存データがある。When: MnemonicまたはSoftware Keyを必要とする処理を行う。Then: その保存データが正常な秘密情報として利用されず、処理は成功しない。 |

## 11. 未決定事項

| ID | 論点 | 要件確定前に判断が必要な理由 | 影響する要件・範囲 |
| --- | --- | --- | --- |
| OPEN-001 | Symbol / NEMでどこまで共通Core化するか | 両チェーンを対象とするが、共通処理とチェーン固有処理の境界が未確定である | FR-013、DR-005、UC-002、UC-009 |
| OPEN-003 | Desktop / MobileからCoreを利用するBindingの対象範囲 | 共通Coreを利用する環境と責任境界が未確定である | NFR-001、NFR-002、NFR-003、UC-004 |

今回の確定により、旧 `OPEN-002`（必要な安全性特性）、旧 `OPEN-004`（署名対象のアプリケーション上の種類）、旧 `OPEN-005`（Mnemonicの保持要否）は未決定事項ではない。暗号方式等の具体方式、署名入力の具体形式は仕様設計へ引き継ぐ。

## 12. 仕様設計への引継ぎ

### 確定した要件

- Profileを秘密情報管理の基本単位とし、Profileごとに必ず1つのMnemonicを持たせる。
- MnemonicをProfileのルート秘密情報として保存対象にする。
- Derived / Imported / Generated Software Keyを、すべて既存Profile配下へ保存する。
- すべてのSoftware Keyを、由来にかかわらず同じ秘密鍵利用ライフサイクルで扱う。
- Profile単位で1つのProfileパスワードを使用し、Profile配下のすべての秘密情報を保護する。
- Profileパスワードを処理ごとに使用し、Core自身は継続的なUnlocked状態を保持しない。
- Profileパスワードを変更でき、正しい現在パスワードが必要である。
- 個別Software Key削除とProfile削除を区別し、Profile削除ではMnemonicと配下の全Software Keyを破棄する。
- 上流から渡された署名対象データを指定Software Keyで署名できる。Transaction構築・シリアライズはCoreの対象外とする。
- Profile配下のMnemonicおよびSoftware Keyを平文で永続保存せず、誤ったパスワード、破損・認証失敗データ、削除済み秘密情報を秘密情報利用処理の成功へ使用しない。

### 確定した制約

- Hardware Wallet、External Signer、OS固有の鍵保管機能、Watch-only、SNIF、CLI、署名専用アプリ、認証・SSO向けクライアントはv1対象外とする。
- REST、WebSocket、ノード選択、Explorer、Transaction構築・シリアライズ、UI、特定ウォレットアプリ専用ロジックはCoreの責任外とする。
- HD Walletの導出パスは、現行のSymbol / NEMにおけるMainnet / Testnetの区分に合わせる。
- CoreはProfileパスワードを永続保存または継続的にキャッシュしない。上流側が一時保持する場合の管理責任は上流側にある。

### 仕様設計で決定する事項

- HD Walletの具体的な導出パスの値、index表現、対象チェーン・ネットワークとの対応表、参照バージョン。
- Profile、Mnemonic、Software Key、Profileパスワードの具体的なデータ形式、ID、スキーマ、保存レコード構造。
- API、暗号方式、KDF、salt / nonce等の具体形式、Vault形式、保存方式、再暗号化の方法。
- Profileパスワードを処理ごとに受け渡す具体方式、署名入力のbytes形式、digestの扱い、Symbol / NEM固有の署名前処理、署名結果の具体形式。
- Profileパスワードの変更・Profile削除・Software Key削除における具体的なストレージ削除およびメモリ消去方式。
- CoreとDesktop / Mobileを接続するBindingの実装方式。

### 要件レベルの未決定事項

- `OPEN-001` と `OPEN-003` を要件として決定する。

### 参照資料

| 資料 | 参照箇所 | 用途 |
| --- | --- | --- |
| `docs/consept/concept-sheet.md` | §1–§13 | 背景、目的、v1範囲、Software Keyの由来、責任境界、提供価値、未決定事項の上位根拠 |
| `docs/knowledge/symbol-technicalref-jp.pdf` | 1.1、3.1、3.2、5 | Symbolのネットワーク、鍵、署名、アカウント・アドレス概念の確認 |
| `docs/knowledge/nem-technicalref.pdf` | 2、3.1、3.2、9 | NEMのアカウント、鍵、署名、ネットワーク概念の確認 |

上記技術資料はチェーン、ネットワーク、鍵、署名、アカウントの前提確認に使用した。Profile、Mnemonicの保持、Software Keyの由来、Profileパスワード、削除・署名ライフサイクルはユーザー確定事項として反映し、暗号方式・保存形式・Binding方式は本書で確定していない。
