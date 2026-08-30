# symbol-nem-wallet-core コンセプトシート

## 1. 概要

symbol-nem-wallet-core v1 は、Symbol / NEMウォレットで使う秘密情報を管理し、署名に使うSoftware Key（Coreが管理する秘密鍵）を扱う共通のRust製Coreを作るプロジェクトである。Symbol / NEMは、取引を記録し、ウォレットがAccount（その仕組み上で利用する単位）を利用する対象の仕組みである。

Coreは、MnemonicやSoftware Keyを管理し、必要な署名を行う中心部分である。UI / Applicationは、ユーザー操作、表示、ウォレット固有の設定を担当する外側の部分である。CoreとUI / Applicationを分けることで、ウォレットごとに秘密鍵処理を分散させず、管理責任を整理しやすくする。

対象はDesktop / Mobile / Webのウォレットである。WebにはWeb ApplicationおよびBrowser Extensionを含む。Coreが担う範囲と、UI / Applicationやホスト環境が担う範囲は、実行環境が変わっても共通に保つ。

Symbol / NEMウォレットでは、Mnemonic、秘密鍵、HD Wallet、暗号化保存、ロック、署名などの高リスクな処理を扱う。これらがUIや実行環境ごとに分散すると、秘密情報の露出箇所、実装差異、レビュー対象が増える可能性がある。

v1では、製品像をソフトウェアウォレットの秘密鍵ライフサイクルを担う鍵管理Coreに絞る。外部署名者やOS固有の鍵保管機能を同じ製品責任へ含めず、将来の拡張候補として分離する。

秘密鍵またはMnemonicの取込み時には、UI / Applicationがユーザー入力を一時的に仲介する場合がある。取込み後の秘密情報の継続的な管理責任はCoreが担う。この一時的な仲介は、UI / Applicationへ管理責任が移ることを意味しない。

MnemonicはCoreが継続的に管理する秘密情報であり、生成・復元・取込み後もCore管理下のHD Walletの元秘密情報として扱う。Mnemonicはそこから導出されたSoftware Keyとは別の管理対象であり、UI / Applicationは取込み後のMnemonicを継続的に保有・管理する責任を持たない。Core管理下の秘密情報に関するSecurity Invariantと例外の扱いは、§7で定める。

## 2. 解決したい課題

### 利用者が実際に直面する課題

- 対象者: Symbol / NEMウォレットを開発するソフトウェア開発者。
- 現在の課題: ウォレットの画面やアプリケーション本体（UI / Application）が、Mnemonicや秘密鍵の生成、導出、保存、ロック、署名などを直接扱う可能性がある。
- 課題の原因: Desktop / Mobile / Webなど実行環境ごとに鍵管理処理が分散し、秘密情報の扱いと責任境界が一貫しない可能性がある。また、Symbol / NEMおよびMainnet / Testnetの区別を共通処理の中で曖昧に扱う可能性がある。
- 放置した場合の影響: 秘密情報の露出箇所や実装差異が増え、セキュリティレビューと保守の対象範囲が広がる可能性がある。

### プロジェクト上の仮定

- 既存手段の不足: ウォレット開発者が、UIから秘密鍵処理を分離したソフトウェア鍵管理の責任領域を、Desktop / Mobile / Webで共通に利用できる形は、現時点で確定していないと本プロジェクトは仮定する。

### 未検証の価値仮説

- 本プロジェクトは、UIから秘密鍵処理を分離してCoreへ責任を集約することで、秘密情報の露出箇所や実装差異、セキュリティレビューと保守の対象範囲を抑えられる可能性があると仮定する。

利用者の課題、プロジェクト上の仮定、未検証の価値仮説は区別して扱う。具体的な脅威モデルやリスク低減効果は、このコンセプトで検証済みの事実とはしない。

## 3. 目的

symbol-nem-wallet-core v1 は、Desktop / Mobile / WebのSymbol / NEMウォレットから、次の状態を実現することを目的とする。WebにはWeb ApplicationおよびBrowser Extensionを含む。

1. Mnemonicを基礎とするHD Walletの生成、復元、そこからの鍵導出をCoreの責任領域として扱う。Mnemonicは導出後もCore管理下の秘密情報として扱う。
2. HD Walletから導出された秘密鍵、外部から直接取り込んだ秘密鍵、Core内で独立して生成した秘密鍵を、いずれもSoftware KeyとしてCoreの管理下で扱う。Mnemonicは導出されたSoftware Keyとは別の管理対象とする。
3. Software Keyの暗号化保存、ロック、アンロック、署名への利用、破棄までをCoreの鍵管理責任として扱う。
4. Symbol / NEMおよびMainnet / Testnetを区別し、HD Walletの導出パスを対象ネットワークに合わせる。
5. 秘密鍵またはMnemonicの取込み時にUI / Applicationがユーザー入力を一時的に仲介する場合があっても、取込み後の秘密情報の継続的な管理責任をCoreが担う状態を作る。
6. UI / Applicationを秘密鍵やMnemonicの継続的な管理・保存主体とせず、Core管理下の秘密情報を通常の処理結果としてCore外へ返却・共有せずに、Coreの鍵管理・署名の結果を利用できる状態を作る。
7. Desktop / Mobile / Webの実行環境の違いによって、Coreが担う秘密情報管理責任や秘密情報の公開範囲が変わらない状態を作る。

## 4. 対象ユーザーと主要利用場面

### Symbol / NEMウォレット開発者

- 利用目的: Desktop / Mobile / Webウォレットへ、共通のソフトウェア鍵管理・署名Coreを組み込む。WebにはWeb ApplicationおよびBrowser Extensionを含む。
- 利用時の前提: ウォレットの画面やアプリケーション本体に、共通のCoreを組み込んで利用する。利用者に必要な専門知識の範囲は要件定義で確認する。
- 解決される課題: UI / Applicationごとに秘密鍵ライフサイクルを実装する負担と、秘密情報の責任境界のばらつきを抑える。

### 主要利用場面

- 誰が: Symbol / NEMウォレットの開発者が。
- どのような状況で: Desktop / Mobile / Webウォレットに、HD Walletからのアカウント導出、秘密鍵の直接取込み、Software Keyの生成・保管・ロック、署名を組み込むときに。秘密鍵またはMnemonicの取込み時には、UI / Applicationがユーザー入力を一時的に仲介する場合がある。
- 何に困っており: UI / Applicationが秘密鍵を継続的に保持・管理したまま、鍵管理と署名を実装することに困っている。
- どのような状態になることを期待するか: Mnemonicを基礎とするHD Walletから導出された秘密鍵や他経路の秘密鍵を、Core管理下のSoftware Keyとして扱い、Accountとして利用できる状態。どのAccountを利用するかはUI / Applicationが選択するが、秘密鍵やMnemonicの継続的な管理責任をUI / Applicationが持つことを意味しない。Core管理下の秘密情報は、通常の処理結果としてCore外へ返却・共有しない。

CLI、署名専用アプリ、認証・SSO向けクライアントは、v1の成功判定対象ではなく、将来の利用候補とする。一般利用者がCoreを直接操作することは想定しない。

## 5. 用語

- Symbol / NEM: 取引を記録し、ウォレットがAccountを利用する対象の仕組み。SymbolとNEMは同一のものとして扱わない。
- Chain / Network: ChainはSymbolまたはNEMのように取引やAccountを扱うブロックチェーンの区分。Networkは同じChainのMainnet（本番用）またはTestnet（検証用）を区別する区分。
- Core: MnemonicとSoftware Keyを管理し、Software Keyを署名に利用する中心部分。
- UI / Application: ユーザー操作、表示、ウォレット固有の設定を担当する画面やアプリケーション本体。秘密鍵またはMnemonicの取込み時には、ユーザー入力を一時的に仲介する場合がある。
- 秘密鍵: Accountの利用や署名に使う、他者に知られてはいけない鍵。Core管理下ではSoftware Keyとして扱う。
- 秘密鍵処理: 秘密鍵そのものを利用する処理の総称。生成、導出、直接取込み、署名、暗号化などを含む。
- Mnemonic: HD Walletの元になる秘密情報。生成・復元・取込みの後もCoreが継続的に管理し、導出後もCoreの責任から外れない。Software Keyとは別の管理対象として扱う。
- HD Wallet: Mnemonicを基礎として、複数のSoftware Keyを導出するウォレットの考え方。HD Walletから導出された秘密鍵は、Coreの管理下ではSoftware Keyとして扱う。
- 鍵管理: MnemonicをCore管理下の秘密情報として扱い、Software Keyについて、生成、秘密鍵の直接取込み、HD Walletからの導出、暗号化保存、ロック、アンロック、署名への利用、破棄までを扱う領域。
- 署名処理: 管理下の秘密鍵を利用して、取引などを鍵の持ち主の操作として扱うための結果を生成する処理。
- Signer: 署名能力を持つ主体。v1ではCoreが管理するSoftware Keyのみを指す。
- Software Key: Coreが管理し、署名に利用する秘密鍵の総称。HD Walletから導出された鍵、外部から直接取り込まれた鍵、Coreが独立して生成した鍵を含み、Mnemonicとは別の管理対象とする。
- Account: Chain上で資産や取引の主体として扱う利用単位。Software Keyを利用する対象であり、どのAccountを利用するかはUI / Applicationが選択するが、秘密鍵やMnemonicの管理責任をUI / Applicationが持つことを意味しない。
- Core管理下の秘密情報: このConceptで対象とするMnemonicおよびSoftware Keyに属する秘密情報。これらはCoreが継続的な管理主体となる。
- Watch-only: 署名能力を持たないアカウント利用形態。SignerおよびSigner実装候補とは別の概念として扱う。
- Web: Web ApplicationおよびBrowser Extensionを含む実行環境。Web固有の実装方式やブラウザAPIはコンセプトシートでは定義しない。

関係を簡単に言うと、MnemonicがHD Walletの元になり、HD WalletからSoftware Keyが導出される。CoreはそのMnemonicとSoftware Keyを管理し、Software KeyをAccountで利用できるようにする。どのAccountを利用するかはUI / Applicationが選択するが、秘密情報の管理責任を持つことを意味しない。

Hardware Wallet、External Signer、OS-backed Keyは、v1には含めず、将来のSigner実装候補として扱う。Watch-onlyはSigner実装候補ではなく、署名能力を持たない別のアカウント利用形態として扱う。

## 6. 提供価値

| 対象ユーザー | 得られる価値 | 利用する理由 |
| --- | --- | --- |
| Desktop / Mobile / Webウォレット開発者 | UI / Applicationから秘密鍵処理を分離し、鍵管理の責任範囲を限定しやすくなる | ウォレットごとの秘密鍵処理の実装・レビュー・保守負担を抑えるため |
| Desktop / Mobile / Webウォレット開発者 | HD Walletから導出した鍵、直接取り込んだ鍵、Coreが生成した鍵を共通のSoftware KeyとしてCoreへ集約しやすくなる | 実行環境ごとの鍵管理処理の差異を抑えるため |
| Symbol / NEMウォレット開発者 | Symbol / NEMおよびMainnet / Testnetを区別した鍵管理の前提を共有できる | チェーンやネットワークの混同を避けるため |

## 7. v1のスコープと責任境界

### v1で扱う範囲

v1は、Desktop / Mobile / WebのSymbol / NEMウォレット向けソフトウェア鍵管理Coreとして、次の能力と責任を担う。WebにはWeb ApplicationおよびBrowser Extensionを含む。

- Mnemonicを生成・復元・取込みした後も、MnemonicをCore管理下の秘密情報として継続的に扱うこと。MnemonicはHD Walletの基礎であり、導出されたSoftware Keyとは別の管理対象とする。
- Mnemonicを基礎とするHD Walletの生成、復元、アカウント導出。
- HD Walletからの秘密鍵の導出。導出された秘密鍵はSoftware Keyとして扱う。
- 外部からの秘密鍵そのものの直接インポート。取り込まれた秘密鍵はSoftware Keyとして扱う。
- Core内で独立したSoftware Keyの新規生成。
- Symbol / NEMおよびMainnet / Testnetを区別したアカウント導出。
- 現行のSymbol / NEMのMainnet / Testnetに合わせたHD Wallet導出パスの扱い。
- Software Keyの暗号化保存、ロック、アンロック、署名への利用、破棄。
- 取込み時のユーザー入力をUI / Applicationが一時的に仲介する場合を含め、取込み後の秘密情報の管理責任をCoreへ集約する責任境界。
- Core管理下の秘密情報を、通常の処理結果としてCore外へ返却・共有しない責任境界。
- Desktop / Mobile / Webのいずれから利用する場合も、Coreの秘密情報管理責任と秘密情報公開方針を共通に保つこと。

具体的な導出パスの値、秘密鍵の入力形式・検証方法、暗号方式、保存形式、API、データ形式、Binding方式、受渡し方法、メモリ上の保持方法、破棄の安全性保証・消去方式は後続工程で決定する。

### Core管理下秘密情報の Security Invariant（不変条件）

ここでいうSecurity Invariantは、利用する環境や場面が変わっても維持する、秘密情報の管理主体と責任境界の原則である。このConceptでいうCore管理下の秘密情報は、MnemonicおよびSoftware Keyに属する秘密情報を指す。

- MnemonicおよびSoftware Keyに属する秘密情報は、生成・復元・取込み後もCoreが継続的な管理主体となる。
- UI / Applicationが取込み時などに秘密情報を一時的に仲介しても、それは継続的な管理責任がUI / Applicationへ移転することを意味しない。
- Core管理下の秘密情報は、通常の処理結果としてCore外へ返却・共有しない。
- Desktop / Mobile / Webの違いによって、この管理責任と通常処理での非開示原則を変えない。
- UI / Application、Browser、OSなどのホスト環境そのものの侵害をCoreが防止できるという保証は、この原則とは別であり、Coreの保証範囲に含めない。

ユーザーが明示的に求めるMnemonicやSoftware Keyの回復、表示、exportなどは、通常の処理とは異なる「意図的な秘密情報アクセス」として扱う。その可否、認可条件、UX、受渡し方式は、このConceptでは決定せず、Requirements / Designで決定する。

### v1では実施しないこと

v1では、次の能力を製品責任に含めない。

- Hardware Walletとの連携
- External Signerとの連携
- OS Keychain、Secure Enclave、TPMなどOS固有の鍵保管機能との連携
- Watch-onlyアカウントの提供。Watch-onlyは署名能力を持たない別のアカウント利用形態であり、Signerには含めない。
- SNIF連携

これらはv1の対象外であり、v1の成功判定には含めない。

### プロジェクトとして扱わないこと

次の領域は、v1に限らず本プロジェクトの責任範囲に含めない。

- REST Client、WebSocket Client、ノード選択、Blockchain Explorer
- 一般的なトランザクション構築・シリアライズ
- UIコンポーネント、Wallet UIそのもの
- Node.js代替実装
- 特定ウォレットアプリ専用ロジック

### 外部へ委ねること

- UI / Application: どのAccountを利用するかの選択、公開情報の表示、ユーザー操作、ウォレット固有の表示や設定。秘密鍵またはMnemonicの取込み時には、ユーザー入力を一時的に仲介する場合があるが、Core管理下の秘密情報の継続的な保存・管理主体とはしない。
- Web Application / Browser Extension: Web固有のApplication状態、Browser固有Storage、ページまたはExtensionの実行環境とそのセキュリティ。これらをCoreの秘密情報管理責任へ含めない。
- Network層: REST、WebSocket、announceなどのネットワーク通信。
- Transaction構築層: Transactionの生成とシリアライズ。

取込み後の秘密情報の管理責任はCoreが担う。上記のSecurity Invariantにより、Core管理下の秘密情報を通常の処理結果としてCore外へ返却・共有しない。Desktop / Mobile / Webの実行環境の違いは、この責任境界を変更しない。具体的なBinding方式、受渡し方式、メモリ上の保持方法および消去方式は後続工程で決定する。

## 8. 成功条件

v1は、少なくとも次の状態を満たしたときに、コンセプト上の目的を達成したとみなす。

1. Desktop / Mobile / WebのSymbol / NEMウォレットから、同じRust製Coreへ鍵管理と署名の責任を集約できる。
2. HD Wallet由来、直接取込み、Core独立生成の秘密鍵を、共通のSoftware Keyとして扱える。
3. UI / Applicationが取込み時などに秘密情報を一時的に仲介しても、取込み後のMnemonicおよびSoftware Keyの継続的な秘密情報管理主体にならない。
4. Core管理下の秘密情報が通常の処理結果としてCore外へ返却・共有されない。
5. Symbol / NEMおよびMainnet / Testnetの区別を保った鍵管理ができる。
6. Desktop / Mobile / Webの実行環境の違いによって、Coreの秘密情報管理責任や秘密情報公開方針が変化しない。

具体的な暗号方式、API、Binding方式、保存形式、対象OS・Browser、配布方式、メモリ消去方式は、上記の成功条件を満たすための後続設計事項とする。

## 9. 前提・制約

- Rust製のポータブルCoreとして提供し、Desktop / Mobile / Webから共通利用できることを前提とする。
- WebにはWeb ApplicationおよびBrowser Extensionを含む。
- Desktop / Mobile / Webの各実行環境へCoreを接続する具体的なBinding方式は後続工程で決定する。
- Web実行環境そのものを、秘密情報を恒久的に隔離できる保護境界とは前提にしない。
- SymbolとNEM、MainnetとTestnetを暗黙に同一視しない。
- OS固有の鍵保管機能はv1のCore責任外とする。
- 秘密情報の保存方式、暗号方式、消去方式などの具体設計はコンセプトシートでは決定しない。

## 10. リスクと注意点

- Webをv1対象に含めることで、Desktop / Mobileに加えてBrowser環境の実装・レビュー対象が増える。ただし、Web固有の秘密情報管理ロジックを別実装せず、Coreへ責任を集約する方針は維持する。
- UI / ApplicationやBindingの境界を越える秘密情報の扱いは、実行環境によってコピーや保持の性質が異なる可能性があるため、具体的な保護方式は後続工程で検証する必要がある。
- Coreへ秘密情報管理を集約しても、UI / Application、Browser、OSなどのホスト環境そのものの侵害を防止できることを意味しない。これはCoreの秘密情報管理に関するSecurity Invariantとは別の責任範囲である。
- 対象Chain・Networkとの互換性、秘密情報の保護強度、状態変更時の整合性などは、要件定義および仕様設計で受入基準を具体化する必要がある。

## 11. 将来の拡張候補

- Hardware Wallet
- External Signer
- OS Keychain、Secure Enclave、TPMなどOS-backed Key
- Watch-onlyアカウント
- SNIF連携
- CLI、署名専用アプリ、認証・SSO向けクライアント

これらはv1の成功条件には含めない。

## 12. 未決定事項

コンセプトレベルでは、v1の対象をDesktop / Mobile / WebのSymbol / NEMウォレットとし、WebにWeb ApplicationおよびBrowser Extensionを含める方針を確定する。

次の具体事項は要件定義または仕様設計で決定する。

- 対象とするSymbol / NEMのプロトコル版、互換性基準、基準時点。
- Profile、Mnemonic、Software Keyなどの具体的な管理単位、保存・保護・消去などの詳細なライフサイクル。MnemonicをCore管理下の秘密情報とする責任境界はコンセプトで定める。
- 秘密情報保護に必要なパスワード安全性や認可条件。
- ユーザーが明示的に求めるMnemonicやSoftware Keyの回復、表示、exportなどをv1で許可するか、その認可条件、UX、受渡し方式。
- Native / Webを含む具体的なBinding方式とパッケージ構成。
- 対象OS・Browser・バージョン、ビルド・配布方式。
- Web環境における秘密情報の具体的な受渡し、コピー、保持、消去方式。

## 13. 次工程への引継ぎ

要件定義では、次を一意に判定できる状態へ具体化する。

- Desktop / Mobile / Webから利用するCoreとApplicationの責任境界。
- Profile、Mnemonic、Software Keyの具体的な管理単位と詳細なライフサイクル。
- Symbol / NEMおよびMainnet / Testnetの区別。
- 通常処理と、ユーザーが明示的に求める回復・表示・exportなどの意図的な秘密情報アクセスを区別すること。そのアクセスをv1で許可するか、認可条件、UX、受渡し方式およびCore管理下の秘密情報を通常処理の結果としてCore外へ返却・共有しない境界。
- Native Binding / Web向けBindingを含むv1機能の利用可能範囲。
- Web環境を秘密情報の恒久的な保護境界とみなさない前提。

具体的なAPI、データ形式、暗号方式、保存形式、Binding実装方式、メモリ消去方式は要件定義を超えるため、必要な受入条件を要件で定めたうえで仕様設計へ引き継ぐ。
