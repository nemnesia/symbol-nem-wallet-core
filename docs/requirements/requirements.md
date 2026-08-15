# symbol-nem-wallet-core 要件定義書

## 1. 概要

- 背景: Symbol / NEMウォレットでは、ニーモニック、秘密鍵、HD Wallet、Software Key、署名などの秘密情報を扱う。これらをUI / Applicationや実行環境ごとに管理すると、保存責任、利用時の保護、鍵の由来による処理差異が不明確になる可能性がある。
- 目的: Desktop / MobileのSymbol / NEMウォレット向けに、MainnetまたはTestnetへ所属するProfileを秘密情報管理の基本単位とし、その配下のMnemonicおよびSoftware Keyを共通のライフサイクルで管理・利用できるRust Wallet Coreと、Desktop / Mobile Applicationから利用するためのBindingを提供する。MnemonicはCoreで生成する場合と既存Mnemonicから復元する場合の両方を扱い、署名処理は対象Chainごとに区別する。
- 解決する課題: MnemonicとSoftware Keyの管理単位が分散すること、Derived / Imported / Generated Software Keyの利用処理が別系統になること、Profile単位のパスワード保護と秘密情報利用時の責任境界が不明確になることを解消する。

本書は `docs/consept/concept-sheet.md` の確定方針を、仕様設計へ引き渡せる要件へ整理したものである。API、データ形式、暗号方式、保存形式、アーキテクチャ、Binding方式、内部処理は決定しない。

## 2. 対象範囲と責任境界

### 対象

v1では、Desktop / MobileのSymbol / NEMウォレットから利用する、Profile単位のSoftware Key管理・署名Coreと、両ApplicationからCoreの主要機能を利用するためのBindingを対象とする。BindingはDesktop / Mobile ApplicationとRust Wallet Coreの境界層であり、Coreとは別の秘密情報管理主体ではない。

#### Profile管理モデル

Profileは、秘密情報を管理する基本単位であり、作成時にMainnetまたはTestnetのいずれかへ所属し、必ず1つのMnemonicを持つ。Mnemonicを持たないProfileはv1で許可しない。MnemonicはCoreが新規生成する場合と、既存MnemonicからProfileを復元・作成する場合の両方を扱う。

概念上の関係は次のとおりである。これは要件上の個数関係を示すものであり、データ構造、ID、スキーマ、Rust型を定義するものではない。

```text
Profile
├─ Network [Mainnet | Testnet、必須・作成時に確定]
├─ Mnemonic [必須・1つ、Profileのルート秘密情報]
├─ Derived Software Key [0..n]
├─ Imported Software Key [0..n]
└─ Generated Software Key [0..n]
```

- Network: Profile作成時に確定してProfile管理下で保存するネットワーク情報。Profileのライフサイクル中は変更できない。別Networkを利用する場合は別Profileを作成する。
- Mnemonic: Profileのルート秘密情報。Profile管理下で保存し、暗号化保存の対象とする。
- Derived Software Key: Profile管理下のMnemonicから導出され、Profile配下へ保存されるSoftware Key。
- Imported Software Key: 外部から直接インポートされ、既存Profile配下へ保存されるSoftware Key。
- Generated Software Key: Coreが独立して生成し、既存Profile配下へ保存されるSoftware Key。
- Software Key: 由来にかかわらず、Profile配下で同じ秘密鍵利用ライフサイクルの対象となる秘密鍵。
- HD Wallet: Mnemonicから複数の秘密鍵を導出する仕組み。そこから導出された秘密鍵は、Core管理下ではDerived Software Keyとして扱う。
- アカウント: ProfileのNetworkと指定Chainに対応する公開情報を利用する単位。Coreの追加アカウント導出は、保存済みMnemonicからDerived Software Keyを導出してProfileへ保存することを指す。アカウントの選択・表示はUI / Applicationの責任とする。
- ProfileはSymbolまたはNEMの特定Chainへ固定されない。同一Profile内で、ProfileのNetworkに対応するSymbol / NEM双方のSoftware Keyを扱う。
- Derived Software Keyの導出では、NetworkはProfileに保存されたNetworkを使用し、Chainは導出処理ごとにSymbolまたはNEMを指定する。導出処理ごとに上流側がNetworkを指定することは要件としない。Profileと異なるNetwork向けのDerived Software Keyは作成しない。
- 同一Networkにおける同一MnemonicのProfile重複登録、および同一Profile内の同一秘密鍵に対応するSoftware Keyの重複登録は許可しない。異なるNetworkの同一Mnemonicは別Profileとして登録できる。

Imported Software KeyおよびGenerated Software KeyだけでProfileを作成することはできない。すべてのSoftware Keyは、Mnemonicを持つ既存Profileへ追加する。

Symbol / NEMで共通に扱う処理は、Mnemonic生成、秘密鍵導出、暗号化を含むProfile・Software Key管理処理とする。署名処理は対象チェーン固有の処理として区別して扱う。

概念上の利用関係は次のとおりである。これは責任境界を示すものであり、API、FFI方式、言語間の型変換方式を定義するものではない。

```text
Desktop / Mobile Application
          │
          │ 操作要求・公開情報・Profileパスワード・署名対象データ
          ▼
        Binding
          │
          ▼
    Rust Wallet Core
          │
          ├─ Profile管理
          ├─ Mnemonic管理
          ├─ Software Key管理
          └─ 署名処理
```

BindingはCoreのv1主要機能をDesktop / Mobile Applicationへ公開する薄い境界層とし、Mnemonic管理、Software Key管理、暗号化保存、秘密鍵導出、署名、Profileパスワード管理、Network通信、Transaction構築などの独自ロジックを持たない。

#### Profileパスワードと利用時の責任境界

- Profileごとに1つのProfileパスワードを使用し、Profile配下のMnemonic、Derived Software Key、Imported Software Key、Generated Software Keyを同じProfile保護単位として扱う。
- Profileパスワードは、Profile作成およびパスワード変更時に、未指定でも空でもない値として提示されなければならない。未指定または空の値、およびCoreが内部で補った既定値による作成・変更は許可しない。具体的な文字種、長さ、正規化は仕様設計で決定する。
- Software Keyごとの個別パスワードはv1で設けない。
- CoreはProfileパスワードを永続保存または継続的にキャッシュしない。
- Applicationは、秘密情報を必要とする処理の実行時に、ProfileパスワードをBinding経由でCoreへ渡せる。Bindingは受け取ったProfileパスワードを永続保存または継続的にキャッシュしない。
- 秘密情報を必要とする処理ごとにProfileパスワードを受け取り、必要な秘密情報を一時的に利用する。CoreはProfileまたはSoftware Keyを継続的なUnlocked状態として保持しない。
- v1のロックは、処理単位のProfileパスワードが提示されるまでProfile配下の秘密情報を利用できない状態を指す。アンロックは、正しいProfileパスワードにより現在の秘密情報処理だけを許可する処理単位の扱いを指し、継続的なUnlocked状態を提供するものではない。
- Profileパスワードを紛失または不明とした場合の復旧・リセット機能はv1で提供せず、正しいProfileパスワードを必要とする秘密情報処理、パスワード変更、削除を成功させない。
- Profileパスワードを必要とする処理の認可判定はCoreが担う。BindingおよびApplicationは処理の開始とパスワードの受渡しを担うが、正しいパスワードなしにCoreの認可を代替または回避しない。
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
- Binding: Desktop / Mobile ApplicationからRust Wallet Coreのv1主要機能を利用可能にする境界層。Coreの責任範囲をCoreへ委譲し、Coreとは別系統の秘密情報管理、Profileパスワード管理、UI、Application状態管理、Wallet固有ロジック、OS Keychain、Secure Enclave、TPM、Hardware Wallet、External Signer、Network通信、Transaction構築を担わない。Mnemonic、秘密鍵、Profileパスワードの継続的な保存・管理主体とはしない。
- Network層: REST、WebSocket、announceなどのネットワーク通信。
- Transaction構築層: Transactionの生成とシリアライズ。
- 上流側: 利便性のためにProfileパスワードを一時的に保持する場合の管理責任。CoreはProfileパスワードを永続保存または継続的にキャッシュしない。

CoreはProfile配下のMnemonicおよびSoftware Keyの管理、秘密情報を必要とする処理、署名、追加アカウント導出、パスワード変更、個別Software Key削除、Profile削除を担う。BindingはこれらをApplicationから利用可能にするが、Core管理下のMnemonicまたは秘密鍵を通常の処理結果としてBinding越しにApplicationへ返さない。

## 3. 利用者と関係者

### 主な利用者

- Desktop / MobileのSymbol / NEMウォレット開発者

CLI、署名専用アプリ、認証・SSO向けクライアントの開発者は、v1の主な利用者および成功判定の対象外とする。

一般利用者がCoreを直接操作することは想定しない。ウォレット利用者のMnemonicまたは秘密鍵の入力は、UI / Applicationを通じて取込み処理へ渡される場合がある。

### 関係者

- Wallet Core: Profile、Mnemonic、Software Keyの秘密情報管理と署名を担う主体。
- Binding: Desktop / Mobile ApplicationとWallet Coreの境界を担う主体。Core機能の利用を仲介するが、秘密情報管理主体にはならない。
- UI / Application: ユーザー操作、アカウント選択、公開情報の表示、ウォレット固有の表示・設定を担う主体。
- Network層: ネットワーク通信を担う外部主体。
- Transaction構築層: Transactionの生成・シリアライズを担う外部主体。
- 上流側: Profileパスワードを一時的に保持する場合の管理主体。
- 仕様・設計担当者: 本書の要件を満たす具体方式を決定する担当者。

## 4. 前提条件と制約

### 前提条件

- SymbolとNEMの双方を対象とする。Mnemonic生成、秘密鍵導出、暗号化を含むProfile・Software Key管理処理は共通に扱い、署名処理は対象チェーン固有として区別する。
- MainnetとTestnetを明示的に区別する。
- HD Walletの導出パスは、v1で承認されたSymbolおよびNEMそれぞれの対象プロトコル版、Mainnet / Testnetの区分、互換性基準および基準時点に合わせる。対象プロトコル版、互換性基準、基準時点および承認済み参照資料はOPEN-001で確定し、具体的なパス値は仕様設計で決定する。
- Rust製のポータブルCoreとして提供し、Desktop / Mobile双方からCoreの主要機能を利用するBindingをv1対象とする。Bindingの具体的な実装方式、対象OS・バージョン、配布方式は仕様設計またはリリース要件で決定する。

### 制約

- Profileは必ず1つのMnemonicとMainnetまたはTestnetのNetwork情報を持つ。MnemonicなしProfileは作成・利用できない。
- ProfileのNetworkは作成時に確定し、ライフサイクル中に変更できない。別Networkを利用する場合は別Profileを作成する。
- ProfileはSymbolまたはNEMのChainに固定されず、同一Profile内でProfileのNetworkに対応する両ChainのSoftware Keyを扱う。
- Derived / Imported / Generated Software Keyは、すべて既存Profile配下で管理する。
- 同一Profile内で同一秘密鍵に対応するSoftware Keyを、由来をまたいで重複登録しない。
- Profile配下のMnemonicおよびすべてのSoftware Keyは、Profile単位の1つのProfileパスワードで保護する。Software Keyごとの個別パスワードは設けない。
- Profile作成およびProfileパスワード変更では、未指定または空のProfileパスワードを受け付けない。Profileパスワードの紛失・不明時の復旧・リセットはv1対象外とする。
- CoreはProfileパスワードを永続保存または継続的にキャッシュせず、継続的なUnlocked状態を保持しない。
- ロックは処理単位のパスワード提示前の利用不可を、アンロックは正しいパスワードによる現在の処理だけの利用許可を意味し、処理をまたぐUnlocked状態は保持しない。
- BindingもProfileパスワードを永続保存または継続的にキャッシュせず、Bindingを秘密情報の継続的な保存・管理主体としない。
- Desktop / Mobile Applicationは、Binding経由でCoreのv1主要機能を利用できる。Bindingの方式が異なっても、Coreの秘密情報管理方針は変わらない。
- ニーモニックおよび秘密鍵の入力形式、バイト表現、API、データ形式は本書で決定しない。
- 暗号方式、KDF、Vault形式、保存形式、メモリ上の保持方法、消去方法は本書で決定しない。
- Symbol / NEMおよびMainnet / Testnetを暗黙に同一視しない。

## 5. ユースケース

### UC-001: 新規Mnemonicまたは既存MnemonicでProfileを作成・復元する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: MainnetまたはTestnetのNetworkへ所属し、1つのMnemonicとProfileパスワードを持つ秘密情報管理単位を作成する。
- 経路1（新規Profile作成）: ProfileパスワードとMainnetまたはTestnetを受け取り、Coreが新規Mnemonicを生成してProfileを作成する。
- 経路2（MnemonicからProfile復元）: 既存Mnemonic、Profileパスワード、MainnetまたはTestnetを受け取り、指定Mnemonicを持つProfileを復元・作成する。
- 期待結果: いずれの経路でもMnemonicを必ず1つ持つProfileが作成され、指定NetworkがProfile管理下へ保存される。MnemonicはProfile管理下のルート秘密情報として保存対象になる。
- 主な失敗条件: MnemonicなしProfileが作成される。同一Mnemonicと同一NetworkのProfileが重複登録される。ProfileパスワードまたはNetworkがない状態、または空のProfileパスワードでProfile作成が成功する。

### UC-002: 保存済みMnemonicからアカウントを追加導出する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: 保存済みProfileのMnemonicから、後から追加のアカウントおよびSoftware Keyを導出する。
- 事前条件: Mnemonicを持つProfile、Profileに保存されたNetwork、正しいProfileパスワード、対象ChainとしてSymbolまたはNEMが指定されている。
- 期待結果: ProfileのNetworkと指定Chainに対応する秘密鍵が導出され、Derived Software KeyとしてProfile配下へ保存される。同じ秘密鍵が既にProfile配下に存在する場合は新しいSoftware Keyとして登録されない。導出パス、index表現、具体的なHD Wallet仕様は仕様設計で決定する。
- 主な失敗条件: Profileパスワードが正しくない、Profileが存在しない、対象Chainが指定されていない、Profileと異なるNetwork向けの導出が要求される、または導出に失敗した場合に、Derived Software Keyが正常な保存対象として扱われる。

### UC-003: 秘密鍵を既存Profileへ直接インポートする

- 利用者: Desktop / Mobileウォレット開発者
- 目的: 外部から入力された秘密鍵をImported Software Keyとして既存Profileへ追加する。
- 事前条件: Mnemonicを持つ既存Profileと、直接インポートする秘密鍵が扱われる。
- 期待結果: Imported Software KeyがProfile配下へ保存され、Derived / Generated Software Keyと同じ秘密鍵利用ライフサイクルの対象になる。同じ秘密鍵が既にProfile配下に存在する場合は重複登録されない。
- 主な失敗条件: ProfileなしでImported Software Keyだけが管理される。取込みに失敗した秘密鍵、または既存のSoftware Keyと重複する秘密鍵が正常なSoftware Keyとして保存される。

### UC-004: Software Keyを既存Profileへ個別生成する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: Coreが独立して生成した秘密鍵をGenerated Software Keyとして既存Profileへ追加する。
- 事前条件: Mnemonicを持つ既存Profileが存在する。
- 期待結果: Generated Software KeyがProfile配下へ保存され、他の由来のSoftware Keyと同じ秘密鍵利用ライフサイクルの対象になる。
- 主な失敗条件: ProfileなしでGenerated Software Keyだけが管理される。生成結果が既存のDerived / Imported / Generated Software Keyと重複するのに新しいSoftware Keyとして保存される。

### UC-005: Profileパスワードを使用して秘密情報を必要とする処理を行う

- 利用者: Desktop / Mobileウォレット開発者
- 目的: Profileパスワードを処理ごとに使用し、Profile配下のMnemonicまたはSoftware Keyを必要な処理で利用する。
- 事前条件: Mnemonicを持つProfile、対象秘密情報、Profileパスワードが存在する。
- 期待結果: Profileは処理単位のロック状態として扱われ、正しいProfileパスワードが処理ごとに与えられた場合に限り、現在の対象秘密情報を必要とする処理を成功させられる。アンロックは現在の処理に限って有効であり、Coreは処理をまたぐUnlocked状態を保持しない。
- 主な失敗条件: 誤った、未指定または空のProfileパスワードで処理が成功する。Profileパスワードを紛失・不明とした状態で復旧・リセットまたは秘密情報処理が成功する。処理終了後も平文秘密情報が継続利用可能な状態で保持される。

### UC-006: Software Keyで署名する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: 指定されたSoftware KeyとProfileパスワードを使用し、上流から渡された署名対象データの署名を生成する。
- 事前条件: 対象Software Keyを持つProfile、正しいProfileパスワード、対象ChainとしてSymbolまたはNEM、署名対象データが存在する。
- 期待結果: 指定Chainに対応する署名処理が使用され、Derived / Imported / Generatedの由来にかかわらず、指定Software Keyを使用した署名結果を得られる。ProfileのNetworkと矛盾する処理は許可しない。
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
- 事前条件: Mnemonicを持つProfile、対象のSoftware KeyまたはProfile、正しいProfileパスワードが存在する。
- 期待結果: 正しいProfileパスワードにより、個別Software Keyの削除では対象だけを削除してProfileとMnemonicを残し、Profile削除ではMnemonic、Derived / Imported / Generated Software KeyおよびProfile全体を破棄する。Derived Software Keyを削除しても、Mnemonicが残るProfileでは再導出できる。
- 主な失敗条件: 誤った、未指定または空のProfileパスワードで削除が成功する。Profileパスワードを紛失・不明とした状態で復旧・リセットまたは削除が成功する。Profile削除後の秘密情報が署名、追加アカウント導出その他の秘密情報を必要とする処理へ利用できる。Profile削除と個別Software Key削除が同じ結果として扱われる。

### UC-009: Symbol / NEMおよびMainnet / Testnetを区別して利用する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: ProfileのNetworkに対応する対象Chainのアカウント導出結果を利用し、対象Chainを明示してSoftware Keyを署名処理へ渡す。
- 事前条件: Profile作成時に確定したNetwork、対象Chain、対応範囲が明示されている。
- 期待結果: ProfileはSymbolまたはNEMの特定Chainへ固定されず、同一Profile内でProfileのNetworkに対応する両ChainのSoftware Keyを扱える。異なるチェーンまたはネットワークの結果が同一対象として扱われず、Mnemonic生成、秘密鍵導出、暗号化を含む管理処理は共通方針として、署名処理は対象Chain固有として扱われる。ProfileのNetworkは作成後変更できない。
- 主な失敗条件: チェーンまたはネットワークの区分が不明なまま処理が成功する。

### UC-010: Binding経由でDesktop / MobileからCoreを利用する

- 利用者: Desktop / Mobileウォレット開発者
- 目的: Desktop / Mobile Applicationから、同じ責任範囲のRust Wallet CoreをBinding経由で利用する。
- 事前条件: DesktopまたはMobile ApplicationがBindingを利用できる。
- 期待結果: Binding経由で、FR-019に列挙するv1 Core主要機能を利用できる。取得できる公開情報はProfileの所属Network、Chainに対応するアカウント情報、公開鍵およびアドレスに限り、Mnemonic、秘密鍵、Profileパスワードそのものを返すことを意味しない。
- 主な失敗条件: DesktopまたはMobileの一方からCore機能を利用できない。BindingがCoreと別の秘密情報管理や署名ロジックを実行する。Core管理下のMnemonicまたは秘密鍵が通常の処理結果としてApplicationへ返される。

## 6. 機能要件

根拠欄の「ユーザー確定事項 §…」は、本要件定義の更新依頼（ユーザー入力）に記載された同番号の確定事項を示す。独立した承認記録は本リポジトリに提供されていないため、これを承認記録そのものとは扱わない。コンセプト由来の要件は `docs/consept/concept-sheet.md` の該当節を根拠とする。

| ID | 優先度 | 要件 | 根拠 | 対応ユースケース |
| --- | --- | --- | --- | --- |
| FR-001 | MUST | Coreは、未指定でも空でもないProfileパスワードとMainnetまたはTestnetを受け取り、新規Mnemonicを生成してProfileを作成できること。また、既存Mnemonic、未指定でも空でもないProfileパスワード、Networkを受け取り、Profileを復元・作成できること。いずれの場合も1つのMnemonicを持つProfileを作成し、Mnemonicを持たないProfileを作成できないこと。 | ユーザー確定事項 §1、§2、§11 | UC-001 |
| FR-002 | MUST | Coreは、ProfileのMnemonicをProfile管理下のルート秘密情報として保存すること。 | ユーザー確定事項 §2、§6 | UC-001、UC-005 |
| FR-003 | MUST | Coreは、保存済みProfileのMnemonicから、Profileに保存されたNetworkと指定Chainに対応する追加アカウントおよび秘密鍵を導出し、Derived Software KeyとしてProfile配下へ保存できること。導出処理ごとに上流側がNetworkを指定することは要件としない。 | ユーザー確定事項 §3、§4、§5、§12 | UC-002 |
| FR-004 | MUST | Coreは、外部から直接取り込んだ秘密鍵を、Mnemonicを持つ既存Profile配下のImported Software Keyとして保存できること。 | ユーザー確定事項 §1、§5 | UC-003 |
| FR-005 | MUST | Coreは、独立して生成した秘密鍵を、Mnemonicを持つ既存Profile配下のGenerated Software Keyとして保存できること。 | ユーザー確定事項 §1、§5 | UC-004 |
| FR-006 | MUST | Coreは、Mnemonic、Derived / Imported / Generated Software Keyを暗号化保存の対象として扱えること。保存状態のこれらの秘密情報を平文で永続保存しないこと。 | ユーザー確定事項 §2、§3、§6、§11 | UC-001、UC-002、UC-003、UC-004 |
| FR-007 | MUST | Coreは、Profile配下の秘密情報を必要とする処理ごとにProfileパスワードを使用すること。ロックはパスワード提示前の利用不可、アンロックは正しいパスワードによる現在の処理だけの利用許可を意味し、ProfileまたはSoftware Keyを処理をまたぐ継続的なUnlocked状態として保持しないこと。 | ユーザー確定事項 §6、§7 | UC-005、UC-006 |
| FR-008 | MUST | Coreは、Derived / Imported / Generatedの由来にかかわらず、Software Keyを同じ秘密鍵利用ライフサイクルの対象として扱えること。 | ユーザー確定事項 §3 | UC-002、UC-003、UC-004、UC-006 |
| FR-009 | MUST | Coreは、対象Chain、指定されたSoftware Key、Profileパスワードを使用し、上流から渡された署名対象データに対する署名を生成できること。ProfileのNetworkと矛盾する処理を許可せず、Transaction等のアプリケーション上の意味を判断しないこと。 | ユーザー確定事項 §6、§10 | UC-006 |
| FR-010 | MUST | Coreは、正しい現在のProfileパスワードを要求したうえで、Profile単位のProfileパスワードを変更できること。変更後はProfile配下のすべての秘密情報を新しいパスワードで利用できること。 | ユーザー確定事項 §8 | UC-007 |
| FR-011 | MUST | Coreは、正しいProfileパスワードを要求したうえで、Profileを残したまま個別Software Keyを削除できること。削除対象以外のSoftware Key、Mnemonic、Profileは保持し、Derived Software Keyを削除してもMnemonicを持つProfile自体は削除しないこと。 | ユーザー確定事項 §9、§10、§14、§16 | UC-008 |
| FR-012 | MUST | Coreは、正しいProfileパスワードを要求したうえで、Profile削除時に、ProfileのMnemonic、すべてのDerived / Imported / Generated Software KeyおよびProfile自体を破棄できること。Profile削除は不可逆な操作として扱うこと。 | ユーザー確定事項 §9、§14、§16 | UC-008 |
| FR-013 | MUST | CoreはProfileをSymbolまたはNEMの特定Chainへ固定せず、同一Profile内でProfileのNetworkに対応する両ChainのSoftware Keyを扱えること。Software Keyによる署名では対象Chain、鍵、上流から渡された署名対象データを使用し、Transaction等のアプリケーション上の意味を判断しないこと。 | コンセプト §3、§7、ユーザー確定事項 §5、§6、§10 | UC-006、UC-009 |
| FR-014 | MUST | Coreは、Mnemonic生成、秘密鍵導出、暗号化を含むProfile・Software Key管理処理をSymbol / NEMで共通の管理方針として扱えること。 | 要件定義更新依頼（チェーン共通処理の確定指示）、§10 | UC-002、UC-005、UC-009 |
| FR-015 | MUST | Coreは、Profile作成時にMainnetまたはTestnetのNetworkを必ず指定させ、指定されたNetworkをProfile管理情報として保存できること。 | ユーザー確定事項 §2、§11、§15 | UC-001、UC-009 |
| FR-016 | MUST | Coreは、Profile作成後にProfileのNetworkを変更できないこと。異なるNetworkを利用する場合は、別Profileとして作成できること。 | ユーザー確定事項 §3 | UC-009 |
| FR-017 | MUST | Coreは、同一Mnemonicと同一NetworkのProfile重複登録を拒否し、同一Mnemonicと異なるNetworkのProfile作成を許可できること。 | ユーザー確定事項 §7、§11 | UC-001 |
| FR-018 | MUST | Coreは、同一Profile内で、Derived / Imported / Generatedの由来をまたいだ同一秘密鍵に対応するSoftware Keyの重複登録を拒否し、新しいSoftware Keyとして追加しないこと。 | ユーザー確定事項 §8、§13 | UC-002、UC-003、UC-004 |
| FR-019 | MUST | v1のBindingは、DesktopおよびMobile Applicationから、Mnemonicの新規生成によるProfile作成、既存MnemonicによるProfile復元・作成、Profile情報の取得、Profileの所属Network・Chainに対応するアカウント情報・公開鍵・アドレスの取得、Mnemonicからの追加アカウント / Derived Software Key導出、秘密鍵の直接インポート、Software Keyの個別生成、Software Keyを使用した署名、Profileパスワード変更、個別Software Key削除、Profile削除を利用可能にすること。Profile情報・公開情報の取得は、Mnemonic、秘密鍵、Profileパスワードそのものを返すことを意味しない。 | ユーザー確定事項 §1、§2、§9、§10 | UC-010 |
| FR-020 | MUST | Coreは、Profile作成およびProfileパスワード変更で、未指定または空のProfileパスワードを受け付けず、Profileパスワードを内部で補って処理を成功させないこと。 | レビュー指摘 RR-002、ユーザー確定事項 §6、§8 | UC-001、UC-007 |

## 7. 非機能要件

| ID | 優先度 | 要件 | 根拠 | 対応ユースケース |
| --- | --- | --- | --- | --- |
| NFR-001 | MUST | DesktopおよびMobileのウォレットApplicationが、Binding経由で共通するProfileおよびSoftware Keyの秘密鍵処理を個別に再実装せず、Coreの責任範囲として利用できること。 | コンセプト §6、§9、ユーザー確定事項 §1、§10、§11 | UC-005、UC-006、UC-009、UC-010 |
| NFR-002 | MUST | Bindingを含むDesktop / Mobile側で個別に実装・レビュー・保守する範囲と、Coreへ集約するProfile・Mnemonic・Software Key処理の範囲を区別できること。BindingはCoreの責任範囲を重複実装せず、Application責任または外部責任の機能を引き受けないこと。 | コンセプト §6、§9、ユーザー確定事項 §3、§7、§11 | UC-005、UC-008、UC-010 |
| NFR-003 | MUST | Core、Binding、UI / Application、上流側の責任境界とProfileパスワードの管理責任を第三者が説明できること。 | コンセプト §6、§8、ユーザー確定事項 §4、§5、§7、§11 | UC-005、UC-007、UC-010 |
| NFR-004 | MUST | Desktop / MobileのBinding方式が異なる場合でも、CoreのProfile、Mnemonic、Software Key、Profileパスワードに関する秘密情報管理方針および責任境界が変わらないこと。 | ユーザー確定事項 §5、§8、§11 | UC-010 |

## 8. セキュリティ要件

| ID | 優先度 | 要件 | 根拠 | 対応ユースケース |
| --- | --- | --- | --- | --- |
| SEC-001 | MUST | Profileの保存状態にあるMnemonicおよびすべてのSoftware Keyを、暗号化保存の対象とし、平文で永続保存しないこと。 | ユーザー確定事項 §2、§3、§6、§11 | UC-001、UC-002、UC-003、UC-004 |
| SEC-002 | MUST | 正しいProfileパスワードが与えられない場合、MnemonicまたはSoftware Keyを必要とする処理を成功させないこと。 | ユーザー確定事項 §6、§7、§11 | UC-002、UC-005、UC-006、UC-007 |
| SEC-003 | MUST | 秘密情報を必要とする処理の終了後、CoreがMnemonicまたは秘密鍵を平文のまま継続利用可能な状態として保持しないこと。 | ユーザー確定事項 §7、§11 | UC-005、UC-006 |
| SEC-004 | MUST | 破損または認証に失敗した保存データを、正常なMnemonicまたはSoftware Keyとして秘密情報利用処理へ使用しないこと。 | ユーザー確定事項 §11 | UC-001、UC-002、UC-003、UC-005 |
| SEC-005 | MUST | 削除済みSoftware Keyまたは削除済みProfile配下の秘密情報を、署名、追加アカウント導出その他の秘密情報を必要とする処理へ使用できないこと。 | ユーザー確定事項 §9、§11 | UC-002、UC-006、UC-008 |
| SEC-006 | MUST | Profileパスワード変更は正しい現在のProfileパスワードと未指定でも空でもない新しいProfileパスワードを要求し、変更後はProfile配下のすべての秘密情報を新しいパスワードで利用でき、旧パスワードでは利用できないこと。認可判定はCoreが行うこと。 | ユーザー確定事項 §8、レビュー指摘 RR-002、RR-007 | UC-007 |
| SEC-007 | MUST | CoreはProfileパスワードを永続保存または継続的にキャッシュしないこと。上流側が利便性のため一時保持する場合、その管理責任は上流側にあること。 | ユーザー確定事項 §6 | UC-005、UC-007 |
| SEC-008 | MUST | Profile削除は正しいProfileパスワードを要求し、認可判定をCoreが行うこと。誤った、未指定または空のProfileパスワードによる削除要求ではProfileまたは配下の秘密情報の状態を変更しないこと。 | ユーザー確定事項 §9、§14、§16、レビュー指摘 RR-007 | UC-008 |
| SEC-009 | MUST | 個別Software Key削除は正しいProfileパスワードを要求し、認可判定をCoreが行うこと。誤った、未指定または空のProfileパスワードによる削除要求では対象Software Keyまたはその他のProfile配下の秘密情報の状態を変更しないこと。 | ユーザー確定事項 §10、§14、§16、レビュー指摘 RR-007 | UC-008 |
| SEC-010 | MUST | Bindingは、Core管理下のMnemonicまたは秘密鍵を、通常のProfile管理、追加導出、署名その他の処理結果としてApplicationへ返さないこと。 | ユーザー確定事項 §4、§9 | UC-001、UC-002、UC-006、UC-010 |
| SEC-011 | MUST | BindingはMnemonic、秘密鍵、Profileパスワードの永続保存または継続的なキャッシュを行わず、Coreとは別の秘密情報管理主体にならないこと。Applicationが利便性のためProfileパスワードを一時保持する場合の管理責任はApplication / 上流側にあること。 | ユーザー確定事項 §4、§5、§7 | UC-005、UC-010 |
| SEC-012 | MUST | 秘密情報がBinding境界を通過する場合、不必要な複製や長期保持を前提としないこと。具体的な受渡し・所有権・消去方式は仕様設計で決定する。 | ユーザー確定事項 §6 | UC-001、UC-002、UC-003、UC-005、UC-006、UC-010 |
| SEC-013 | MUST | Profileパスワードを紛失または不明とした場合、v1はProfileパスワードの復旧・リセットを提供せず、正しいProfileパスワードを必要とする秘密情報処理、パスワード変更、Software Key削除およびProfile削除を成功させないこと。 | レビュー指摘 RR-007、ユーザー確定事項 §6、§8、§9、§10 | UC-005、UC-007、UC-008 |
| SEC-014 | MUST | Profileパスワードを必要とする処理の認可判定はCoreが行い、BindingまたはApplicationからの要求は正しいProfileパスワードなしに認可を回避できないこと。BindingおよびApplicationは操作の開始と入力の受渡しを担うが、Coreに代わる認可主体とはならない。 | レビュー指摘 RR-007、ユーザー確定事項 §4、§5、§9、§10 | UC-007、UC-008、UC-010 |
| SEC-015 | MUST | CoreおよびBindingがApplicationへ返す通常結果、失敗結果、認証失敗、入力エラー、破損データの処理結果、診断・補助出力に、Mnemonic、秘密鍵、Profileパスワードまたはそれらを復元可能な表現を含めないこと。Applicationも、これらの秘密情報を診断・補助出力へ含めない責任を負う。 | レビュー指摘 RR-008、ユーザー確定事項 §4、§6 | UC-001、UC-002、UC-003、UC-005、UC-006、UC-010 |

暗号方式、KDF、salt / nonce等の具体形式、Vault形式、再暗号化の方法、メモリ保持・消去方式および具体的な消去保証は仕様設計で決定する。

## 9. データ要件

| ID | 優先度 | 要件 | 根拠 | 影響 |
| --- | --- | --- | --- | --- |
| DR-001 | MUST | Profileは、必須のNetwork（MainnetまたはTestnet）、必須の1つのMnemonic、および0個以上のDerived / Imported / Generated Software Keyを管理対象として持つこと。 | ユーザー確定事項 §1、§2 | UC-001、UC-002、UC-003、UC-004 |
| DR-002 | MUST | MnemonicはProfileのルート秘密情報として扱い、Derived / Imported / Generated Software KeyとともにProfileの秘密情報管理対象とすること。 | ユーザー確定事項 §1、§2、§3 | UC-001、UC-002、UC-003、UC-004 |
| DR-003 | MUST | Profile配下のMnemonicおよびすべてのSoftware Keyは、同じProfileパスワードによる保護対象とし、Software Keyごとの個別パスワードを持たないこと。 | ユーザー確定事項 §6 | UC-005、UC-007 |
| DR-004 | MUST | Derived / Imported / GeneratedというSoftware Keyの由来を区別可能としても、署名など基本的な秘密鍵利用処理は同じProfile管理ライフサイクルの対象として扱うこと。 | ユーザー確定事項 §3 | UC-002、UC-003、UC-004、UC-006 |
| DR-005 | MUST | Profileは作成時に確定したMainnetまたはTestnetのNetwork情報を持ち、ライフサイクル中に変更できないこと。ProfileはSymbolまたはNEMのChainへ固定せず、Derived Software Keyは指定ChainとProfileのNetworkに対応する結果として扱うこと。 | ユーザー確定事項 §2、§3、§4、§5、§15 | UC-002、UC-006、UC-009 |
| DR-006 | MUST | Profileの重複関係はMnemonicとNetworkの組み合わせで扱い、同一Mnemonicと同一Networkは重複登録せず、同一Mnemonicと異なるNetworkは別Profileとして管理できること。 | ユーザー確定事項 §7、§15 | UC-001 |
| DR-007 | MUST | 同一Profile内のSoftware Keyは、Derived / Imported / Generatedの由来をまたいで同一秘密鍵を重複して管理しないこと。 | ユーザー確定事項 §8、§13、§15 | UC-002、UC-003、UC-004 |
| DR-008 | MUST | HD Walletからの導出結果およびChain / Networkに対応するアカウント・公開情報は、v1で承認されたSymbolおよびNEMそれぞれの対象プロトコル版、互換性基準、基準時点および参照資料と整合すること。具体的な導出パス値および識別形式は仕様設計で決定する。 | レビュー指摘 RR-001、OPEN-001 | UC-002、UC-009 |

Profile ID、フィールド名、型、スキーマ、保存レコード構造、バイト配置、署名入力の具体形式は本書では定めない。

## 10. 受け入れ条件

| ID | 対応要件 | 受け入れ条件 |
| --- | --- | --- |
| AC-001 | FR-001、FR-015、FR-020、DR-001 | Given: 未指定でも空でもないProfileパスワードとMainnetまたはTestnetが与えられる。When: Coreが新規Mnemonicを生成してProfileを作成する。Then: 生成されたMnemonicを1つ持ち、指定Networkを保存したProfileが作成され、MnemonicなしProfileは作成されない。When: Profileパスワードが未指定または空である。Then: Profileは作成されない。 |
| AC-002 | FR-002、FR-006、SEC-001 | Given: Mnemonicを持つProfileを作成する。When: Profileを保存状態として扱う。Then: MnemonicがProfileのルート秘密情報として暗号化保存の対象になり、平文で永続保存されない。 |
| AC-003 | FR-003、DR-002、DR-005、DR-007 | Given: 保存済みMnemonicを持つProfile、Profileに保存されたNetwork、正しいProfileパスワード、対象ChainとしてSymbolまたはNEMが存在する。When: 追加アカウントを導出する。Then: ProfileのNetworkと指定Chainに対応する秘密鍵がDerived Software KeyとしてProfile配下へ保存され、同じ秘密鍵が既に存在する場合は新規登録されない。 |
| AC-004 | FR-004、FR-018、DR-001、DR-007 | Given: Mnemonicを持つ既存Profileと外部からの秘密鍵が存在する。When: 直接インポートする。Then: 未登録の秘密鍵であればImported Software KeyがProfile配下へ保存され、MnemonicなしProfileは作成されない。同じ秘密鍵が既存のDerived / Imported / Generated Software Keyに対応する場合は追加されない。 |
| AC-005 | FR-005、FR-018、DR-001、DR-007 | Given: Mnemonicを持つ既存Profileが存在する。When: Coreが独立したSoftware Keyを生成する。Then: 既存鍵と重複しない生成結果であればGenerated Software KeyがProfile配下へ保存され、Profileなしで管理されない。同じ秘密鍵が既存のDerived / Imported / Generated Software Keyに対応する場合は追加されない。 |
| AC-006 | FR-006、SEC-001 | Given: Derived / Imported / Generated Software KeyをProfileへ追加する。When: 保存状態を確認する。Then: すべてのSoftware Keyが暗号化保存の対象であり、平文で永続保存されない。 |
| AC-007 | FR-007、SEC-002、SEC-003、SEC-007 | Given: Profile配下の秘密情報を必要とする処理がある。When: Profileパスワードを処理ごとに渡して処理を行い、処理を終了する。Then: 正しいパスワードの場合だけ現在の処理が成功し、Coreは継続的なUnlocked状態または平文秘密情報を継続利用可能な状態で保持せず、Profileパスワードを永続保存・継続キャッシュしない。処理終了後のProfileは次の処理に対してロック状態として扱われる。 |
| AC-008 | FR-008、DR-004 | Given: Derived / Imported / GeneratedのいずれかのSoftware Keyが存在する。When: 同じ種類の秘密鍵利用処理を行う。Then: 由来にかかわらず同じProfile管理ライフサイクルの対象として扱われる。 |
| AC-009 | FR-009 | Given: Profile、対象Software Key、正しいProfileパスワード、対象ChainとしてSymbolまたはNEM、上流から渡された署名対象データが存在する。When: 対象Chainを指定して署名を要求する。Then: 指定Chainに対応する署名処理により、Software Keyの由来にかかわらず署名結果を得られ、ProfileのNetworkと矛盾する処理は成功せず、CoreがTransaction等のアプリケーション上の意味を判断することを前提としない。 |
| AC-010 | FR-010、SEC-006 | Given: Profileと正しい現在のProfileパスワードが存在する。When: Profileパスワードを新しいパスワードへ変更する。Then: Profile配下のMnemonicおよびすべてのSoftware Keyを新しいパスワードで利用でき、旧パスワードでは利用できない。 |
| AC-011 | FR-011、SEC-005、SEC-009 | Given: Mnemonicと複数のSoftware Keyを持つProfileが存在する。When: 正しいProfileパスワードで1つのSoftware Keyを削除する。Then: 対象Software Keyだけが削除され、その他のSoftware Key、Mnemonic、Profileは残る。Derived Software Keyを削除した場合、Mnemonicが残るため再導出可能な状態をProfile削除と同一視しない。When: 誤ったProfileパスワードで削除を要求する。Then: Software Keyを含むProfileの状態は変更されない。 |
| AC-012 | FR-012、SEC-005、SEC-008 | Given: Mnemonicと複数のSoftware Keyを持つProfileが存在する。When: 正しいProfileパスワードでProfileを削除する。Then: Mnemonic、すべてのDerived / Imported / Generated Software Key、Profile自体が破棄され、以後それらを署名、追加導出その他の秘密情報利用処理へ使用できない。Profile削除は不可逆な操作として扱われる。When: 誤ったProfileパスワードで削除を要求する。Then: Profileおよび配下の秘密情報は削除されない。 |
| AC-013 | FR-013、DR-005 | Given: ProfileのNetworkと、対象ChainとしてSymbolまたはNEMが指定される。When: Mnemonicから導出またはアカウントを導出する。Then: ProfileのNetworkと指定Chainに対応する結果として扱われ、異なる区分と混同されない。署名時は指定されたSoftware Key、対象Chain、上流から渡された署名対象データが使われ、Transaction等の意味判断をCoreが行うことを前提としない。 |
| AC-014 | FR-014 | Given: Symbol / NEMのいずれかを対象とする。When: Mnemonic生成、秘密鍵導出、暗号化を含むProfile・Software Key管理処理を確認する。Then: Chainにかかわらず共通の管理方針で扱われる。 |
| AC-015 | NFR-001、NFR-002 | Given: Desktop / MobileウォレットがBindingを利用する。When: 共通CoreのProfile、Mnemonic、Software Key処理の実装・レビュー・保守責任を確認する。Then: 両ApplicationからBinding経由でCoreを利用でき、Coreへ集約する範囲とApplication側で個別に扱う範囲を区別できる。 |
| AC-016 | NFR-003 | Given: Core、Binding、UI / Application、上流側の責任分担を第三者が確認する。When: Profileパスワードと秘密情報の管理範囲を説明する。Then: CoreがProfile配下の秘密情報を管理し、Bindingが利用境界を担い、Application / 上流側がProfileパスワードを一時保持する場合の責任がApplication / 上流側にあることを説明できる。 |
| AC-017 | SEC-004 | Given: 破損または認証に失敗した保存データがある。When: MnemonicまたはSoftware Keyを必要とする処理を行う。Then: その保存データが正常な秘密情報として利用されず、処理は成功しない。 |
| AC-018 | FR-001、FR-017、DR-006 | Given: 既存Mnemonic、Profileパスワード、MainnetまたはTestnetが与えられる。When: MnemonicからProfileを復元・作成する。Then: 指定Mnemonicを1つ持ち、指定Networkを保存したProfileが作成される。同一Mnemonicと同一NetworkのProfileが既に存在する場合は作成されず、同一Mnemonicと異なるNetworkであれば別Profileとして作成できる。 |
| AC-019 | FR-016、DR-005 | Given: MainnetまたはTestnetで作成済みのProfileが存在する。When: ProfileのNetworkを別Networkへ変更する。Then: 変更は成功せず、Profileは作成時のNetworkを保持する。ProfileはSymbolまたはNEMに固定されず、ProfileのNetworkに対応する両ChainのSoftware Keyを同一Profile内で扱える。 |
| AC-020 | FR-018、DR-007 | Given: Derived / Imported / GeneratedのいずれかのSoftware Keyが既にProfile配下に存在する。When: 同じ秘密鍵に対応するSoftware Keyを別の由来で追加する、または同じ導出結果を再登録する。Then: 新しいSoftware Keyとして追加されず、既存Profile配下の秘密情報の状態は重複登録によって変更されない。 |
| AC-021 | FR-019、NFR-001 | Given: Desktop ApplicationがBindingを利用する。When: FR-019に列挙されたv1 Core主要機能を要求する。Then: すべての機能をBinding経由で利用でき、取得できる公開情報はProfileの所属Network、Chainに対応するアカウント情報、公開鍵およびアドレスに限られる。 |
| AC-022 | FR-019、NFR-001 | Given: Mobile ApplicationがBindingを利用する。When: FR-019に列挙されたv1 Core主要機能を要求する。Then: すべての機能をBinding経由で利用でき、取得できる公開情報はProfileの所属Network、Chainに対応するアカウント情報、公開鍵およびアドレスに限られる。 |
| AC-023 | NFR-002 | Given: DesktopまたはMobile ApplicationがBinding経由でCore機能を利用する。When: Profile、Mnemonic、Software Key、暗号化保存、導出、署名、Profileパスワード管理の責任範囲を確認する。Then: これらのCore責任をBindingが独自実装せず、Wallet固有ロジック、Network通信、Transaction構築もBindingへ移されない。 |
| AC-024 | NFR-004 | Given: Desktop / MobileでBinding方式が異なる。When: Profile、Mnemonic、Software Key、Profileパスワードの管理方針を確認する。Then: Coreの秘密情報管理方針と責任境界はBinding方式によって変わらない。 |
| AC-025 | SEC-010 | Given: Core管理下のSoftware Keyが存在する。When: Binding経由で署名その他の通常処理を実行する。Then: 秘密鍵そのものが通常の処理結果としてApplicationへ返されない。 |
| AC-026 | SEC-010 | Given: 保存済みMnemonicを持つProfileが存在する。When: Binding経由で追加導出その他の通常処理を実行する。Then: 保存済みMnemonicそのものが通常の処理結果としてApplicationへ返されない。 |
| AC-027 | SEC-011 | Given: ApplicationからBinding経由でProfileパスワードを渡して処理を実行する。When: 処理が終了する。Then: BindingおよびCoreがProfileパスワードを永続保存または継続的にキャッシュせず、Bindingが別の秘密情報保存主体にならない。 |
| AC-028 | SEC-012 | Given: 秘密情報がBinding境界を通過する処理がある。When: その処理の秘密情報管理方針を確認する。Then: Binding境界で不必要な複製や長期保持を前提とせず、具体的な受渡し・所有権・消去方式は仕様設計へ引き継がれている。 |
| AC-029 | FR-020、SEC-006 | Given: ProfileまたはProfileパスワード変更の対象が存在する。When: Profileパスワードが未指定または空のまま作成・変更を要求する。Then: 処理は成功せず、CoreがProfileパスワードを補って成功させない。 |
| AC-030 | SEC-013 | Given: Profileパスワードが紛失または不明である。When: 秘密情報処理、パスワード変更、Software Key削除またはProfile削除を要求する。Then: v1で復旧・リセットは行われず、処理は成功しない。 |
| AC-031 | SEC-014 | Given: Binding経由でProfileパスワードを必要とする処理を要求する。When: ApplicationまたはBindingが正しいProfileパスワードを提示しない。Then: Coreが認可せず、ApplicationまたはBindingの要求だけで処理を成功させられない。 |
| AC-032 | SEC-015 | Given: 認証失敗、入力エラー、破損データまたは通常処理の結果を外部へ返す。When: Core、BindingまたはApplicationが結果、診断・補助出力を生成する。Then: Mnemonic、秘密鍵、Profileパスワードまたはそれらを復元可能な表現を出力に含めない。 |
| AC-033 | DR-008、OPEN-001 | Given: v1のSymbolおよびNEMそれぞれの対象プロトコル版、互換性基準、基準時点および承認済み参照資料が確定している。When: HD Walletからの導出結果およびChain / Networkに対応する公開情報の互換性を判定する。Then: 判定は確定した対象版・基準・参照資料に基づき、具体的な導出パス値を要件から推測しない。 |

## 11. 未決定事項

次の要件レベルの事項は、HD Wallet導出およびアカウント互換性の受け入れ判定に必要なため、仕様設計開始前に確定する。

| ID | 未決定事項 | 理由・影響 | 対応する要件 |
| --- | --- | --- | --- |
| OPEN-001 | v1で対象とするSymbolおよびNEMそれぞれのプロトコル版、互換性基準、基準時点および承認済み参照資料 | 導出結果、アカウント・公開情報の互換性および受け入れ判定を一意にするため。具体的な導出パス値はこの決定後に仕様設計で定める。 | FR-003、FR-013、DR-008、AC-033 |

旧 `OPEN-003`（Desktop / MobileからCoreを利用するBindingの対象範囲）は、v1でDesktop / Mobile双方から利用できるBindingを提供し、Bindingを薄い境界層とすることを確定したため解消した。Mnemonic生成・復元、ProfileのNetwork所属と変更禁止、Chain非固定、MnemonicとNetworkによるProfile重複判定、Software Key重複拒否、Profile / Software Key削除時のパスワード要求も未決定事項ではない。旧 `OPEN-002`、旧 `OPEN-004`、旧 `OPEN-005` も未決定事項ではない。暗号方式、Binding方式、対象OSなどの具体事項は仕様設計またはリリース要件へ引き継ぐ。

## 12. 仕様設計への引継ぎ

### 確定した要件

- Profileを秘密情報管理の基本単位とし、Profileごとに必ず1つのMnemonicを持たせる。
- Coreによる新規Mnemonic生成と、既存MnemonicからのProfile復元・作成をv1で扱う。
- Profile作成時にMainnetまたはTestnetのNetworkを指定・保存し、作成後のNetwork変更を許可しない。異なるNetworkは別Profileとして扱う。
- ProfileをSymbolまたはNEMの特定Chainへ固定せず、同一Profile内でProfileのNetworkに対応するSymbol / NEM双方のSoftware Keyを扱う。
- MnemonicをProfileのルート秘密情報として保存対象にする。
- Derived / Imported / Generated Software Keyを、すべて既存Profile配下へ保存する。
- Derived Software Keyの導出時はProfileのNetworkを使用し、処理ごとにSymbolまたはNEMのChainを指定する。導出処理ごとに上流側がNetworkを指定することは要件としない。Profileと異なるNetwork向けのDerived Software Keyは作成しない。
- 同一Mnemonicと同一NetworkのProfile重複登録を拒否し、同一Mnemonicと異なるNetworkのProfile作成を許可する。
- 同一Profile内の同一秘密鍵に対応するSoftware Keyを、由来をまたいで重複登録しない。
- すべてのSoftware Keyを、由来にかかわらず同じ秘密鍵利用ライフサイクルで扱う。
- Profile単位で1つのProfileパスワードを使用し、Profile配下のすべての秘密情報を保護する。
- Profileパスワードを処理ごとに使用する。ロックは処理単位のパスワード提示前の利用不可、アンロックは正しいパスワードによる現在の処理だけの利用許可を意味し、Core自身は処理をまたぐ継続的なUnlocked状態を保持しない。
- Profile作成およびパスワード変更では未指定または空のProfileパスワードを受け付けず、パスワード紛失・不明時の復旧・リセットはv1で提供しない。Profileパスワードを必要とする処理の認可判定はCoreが行う。
- Profileパスワードを変更でき、正しい現在パスワードが必要である。
- 正しいProfileパスワードを要求して個別Software Keyを削除でき、削除対象以外を保持する。正しいProfileパスワードを要求してProfileを削除し、Mnemonicと配下の全Software Keyを破棄する。
- 上流から渡された署名対象データを、指定Chainおよび指定Software Keyで署名できる。Transaction構築・シリアライズはCoreの対象外とする。
- Profile配下のMnemonicおよびSoftware Keyを暗号化保存の対象とし、平文で永続保存せず、誤ったパスワード、破損・認証失敗データ、削除済み秘密情報を秘密情報利用処理の成功へ使用しない。
- 認証失敗、入力エラー、破損データおよび診断・補助出力を含む外部出力に、Mnemonic、秘密鍵、Profileパスワードまたはそれらを復元可能な表現を含めない。
- Mnemonic生成、秘密鍵導出、暗号化を含むProfile・Software Key管理処理をSymbol / NEMで共通に扱い、署名処理を対象チェーン固有として区別する。
- Desktop / Mobile双方からRust Wallet Coreのv1主要機能を利用するBindingを提供する。
- BindingをCoreとApplicationの薄い境界層とし、Coreの主要機能をApplicationへ公開する。Bindingは独自の秘密情報管理、署名、導出、暗号化保存、Profileパスワード管理を行わない。
- Binding経由でProfile作成・復元、Profile情報・公開情報取得、追加導出、秘密鍵直接インポート、Software Key個別生成、署名、Profileパスワード変更、Software Key削除、Profile削除を利用できる。
- Core管理下のMnemonicおよび秘密鍵を通常の処理結果としてBinding越しにApplicationへ返さず、BindingおよびCoreはProfileパスワードを永続保存・継続キャッシュしない。

### 確定した制約

- Hardware Wallet、External Signer、OS固有の鍵保管機能、Watch-only、SNIF、CLI、署名専用アプリ、認証・SSO向けクライアントはv1対象外とする。
- REST、WebSocket、ノード選択、Explorer、Transaction構築・シリアライズ、UI、特定ウォレットアプリ専用ロジックはCoreの責任外とする。
- HD Walletの導出パスは、OPEN-001で承認されたSymbolおよびNEMそれぞれの対象プロトコル版、Mainnet / Testnetの区分、互換性基準および基準時点に合わせる。具体的なパス値は仕様設計で決定する。
- CoreはProfileパスワードを永続保存または継続的にキャッシュしない。上流側が一時保持する場合の管理責任は上流側にある。
- Profile削除および個別Software Key削除には、正しいProfileパスワードを必須とする。誤ったパスワードによる削除要求で秘密情報の状態を変更しない。
- Profileパスワードを必要とする破壊的または影響の大きい操作の認可判定はCoreが行い、BindingおよびApplicationは認可を回避しない。
- BindingはCoreの責任範囲を重複実装せず、UI、Application状態管理、OS Keychain、Secure Enclave、TPM、Hardware Wallet、External Signer、Network通信、Transaction構築、Wallet固有設定、Application側のProfileパスワードキャッシュを担わない。

### 仕様設計で決定する事項

- Mnemonicの具体的な生成・検証方式、正規化・重複比較方式。
- OPEN-001で承認された対象プロトコル版、互換性基準、基準時点および参照資料に基づく、HD Walletの具体的な導出パスの値、index表現、Chain / Networkとの対応表。
- Chain / Networkの具体的な識別形式、Software Keyの重複判定方式。
- Profile、Mnemonic、Software Key、Profileパスワードの具体的なデータ形式、ID、スキーマ、保存レコード構造。
- API、暗号方式、KDF、salt / nonce等の具体形式、Vault形式、保存方式、再暗号化の方法。
- Profileパスワードを処理ごとに受け渡す具体方式、署名入力のbytes形式、digestの扱い、Symbol / NEM固有の署名前処理、署名結果の具体形式。
- Profileパスワードの変更・Profile削除・Software Key削除における具体的なストレージ削除およびメモリ消去方式。
- Bindingの具体的な実装方式、FFI方式、言語間の型変換、エラー表現、秘密情報のコピー回数、バッファ所有権、メモリ配置、zeroize方式、メモリ解放方式、秘密情報の一時受渡し方式、Profileパスワードの受渡し方式。
- Mnemonicの新規生成または既存Mnemonicからの復元時に、一時的な入力・受渡し・バックアップ表示を行う場合の具体的な扱い。
- Desktop / Mobile別のBindingパッケージ構成、対象OS・バージョン、ビルド・配布方式。

### 要件レベルの未決定事項

- `OPEN-001`: v1で対象とするSymbolおよびNEMそれぞれのプロトコル版、互換性基準、基準時点および承認済み参照資料。仕様設計開始前に確定する。

### 参照資料

| 資料 | 参照箇所 | 用途 |
| --- | --- | --- |
| `docs/consept/concept-sheet.md` | §1–§13 | 背景、目的、v1範囲、Software Keyの由来、責任境界、提供価値、未決定事項の上位根拠 |
| `docs/knowledge/symbol-technicalref-jp.pdf` | 1.1、3.1、3.2、5 | Symbolのネットワーク、鍵、署名、アカウント・アドレス概念の確認 |
| `docs/knowledge/nem-technicalref.pdf` | 2、3.1、3.2、9 | NEMのアカウント、鍵、署名、ネットワーク概念の確認 |
| 要件定義更新依頼（本タスク入力） | §1–§20、およびチェーン共通処理の確定指示 | Profile、Network、Chain、Binding、秘密情報管理、署名、削除および責任境界に関する確定事項の根拠 |

上記技術資料はチェーン、ネットワーク、鍵、署名、アカウントの前提確認に使用した。Profile、Mnemonicの保持、Software Keyの由来、Profileパスワード、削除・署名ライフサイクルは要件定義更新依頼（本タスク入力）として反映し、暗号方式・保存形式・Binding方式は本書で確定していない。
