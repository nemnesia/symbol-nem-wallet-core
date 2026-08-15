# symbol-nem-wallet-core コンセプトシート

## 1. 概要

- 一言で説明: symbol-nem-wallet-core v1 は、Symbol / NEMウォレット向けに、ニーモニックとSoftware Keyの鍵管理・署名をRust製Coreへ集約し、UI / Applicationが秘密鍵そのものを保持せず利用できるようにする。
- 背景: Symbol / NEMウォレットでは、ニーモニック、秘密鍵、HD Wallet、暗号化保存、ロック、署名などの高リスクな処理を扱う。これらがUIや実行環境ごとに分散すると、秘密情報の露出箇所、実装差異、レビュー対象が増える可能性がある。

v1では、製品像をソフトウェアウォレットの秘密鍵ライフサイクルを担う鍵管理Coreに絞る。外部署名者やOS固有の鍵保管機能を同じ製品責任へ含めず、将来の拡張候補として分離する。

## 2. 解決したい課題

- 対象者: Symbol / NEMウォレットを開発するソフトウェア開発者。
- 現在の課題: ウォレットのUIやアプリケーション本体が、ニーモニックや秘密鍵の生成、導出、保存、ロック、署名などを直接扱う可能性がある。
- 課題の原因: 実行環境ごとに鍵管理処理が分散し、秘密情報の扱いと責任境界が一貫しない可能性がある。また、Symbol / NEMおよびMainnet / Testnetの区別を共通処理の中で曖昧に扱う可能性がある。
- 既存手段の不足: ウォレット開発者が、UIから秘密鍵処理を分離したソフトウェア鍵管理の責任領域を、DesktopとMobileで共通に利用できる形が確定していない。
- 放置した場合の影響: 秘密情報の露出箇所や実装差異が増え、セキュリティレビューと保守の対象範囲が広がる可能性がある。

上記はプロジェクト上の課題と仮定の整理であり、具体的な脅威モデルやリスク低減効果が検証済みであることを示すものではない。

## 3. 目的

symbol-nem-wallet-core v1 は、DesktopまたはMobileのSymbol / NEMウォレットから、次の状態を実現することを目的とする。

1. ニーモニックを用いたHD Walletの生成、復元、アカウント導出をCoreの責任領域として扱う。
2. HD Walletから導出された秘密鍵、外部から直接取り込んだ秘密鍵、Core内で独立して生成した秘密鍵を、いずれもSoftware KeyとしてCoreの管理下で扱う。
3. Software Keyの暗号化保存、ロック、アンロック、署名への利用、破棄までをCoreの鍵管理責任として扱う。
4. Symbol / NEMおよびMainnet / Testnetを区別し、HD Walletの導出パスを対象ネットワークに合わせる。
5. UI / Applicationが秘密鍵そのものを保持せずに、Coreの鍵管理・署名の結果を利用できる状態を作る。

## 4. 対象ユーザーと主要利用場面

### Symbol / NEMウォレット開発者

- 利用目的: DesktopまたはMobileウォレットへ、共通のソフトウェア鍵管理・署名Coreを組み込む。
- 前提知識: Symbol / NEMウォレット、秘密鍵、ニーモニック、HD Wallet、ユーザー操作に関する知識を持つことを想定する。詳細な前提知識の範囲は要件定義で確認する。
- 解決される課題: UI / Applicationごとに秘密鍵ライフサイクルを実装する負担と、秘密情報の責任境界のばらつきを抑える。

### 主要利用場面

- 誰が: Symbol / NEMウォレットの開発者が。
- どのような状況で: DesktopまたはMobileウォレットに、HD Walletからのアカウント導出、秘密鍵の直接取込み、Software Keyの生成・保管・ロック、署名を組み込むときに。
- 何に困っており: UI / Applicationが秘密鍵を保持したまま鍵管理と署名を実装することに困っている。
- どのような状態になることを期待するか: ウォレットが、鍵の由来にかかわらずSoftware KeyとしてCoreが担う鍵管理・署名を利用し、秘密鍵そのものをUIへ返さない状態。

CLI、署名専用アプリ、認証・SSO向けクライアントは、v1の成功判定対象ではなく、将来の利用候補とする。一般利用者がCoreを直接操作することは想定しない。

## 5. 用語

- 秘密鍵処理: 秘密鍵そのものを利用する処理の総称。生成、導出、直接取込み、署名、暗号化などを含む。
- HD Wallet: ニーモニックから秘密鍵を決定的に導出する仕組み。HD Walletから導出された秘密鍵は、Coreの管理下ではSoftware Keyとして扱う。
- 鍵管理: Software Keyについて、生成、ニーモニックによる復元、秘密鍵の直接取込み、HD Walletからの導出、暗号化保存、ロック、アンロック、署名への利用、破棄までを扱う領域。
- 署名処理: 管理下の秘密鍵を利用して署名結果を生成する処理。
- Signer: 署名能力を持つ主体。v1ではCoreが管理するSoftware Keyのみを指す。
- Software Key: Coreがソフトウェア上で管理・利用する秘密鍵の総称。HD Walletから導出された鍵、外部から直接取り込まれた鍵、Coreが独立して生成した鍵を含む。
- Watch-only: 署名能力を持たないアカウント利用形態。SignerおよびSigner実装候補とは別の概念として扱う。

Hardware Wallet、External Signer、OS-backed Keyは、v1には含めず、将来のSigner実装候補として扱う。Watch-onlyはSigner実装候補ではなく、署名能力を持たない別のアカウント利用形態として扱う。

## 6. 提供価値

| 対象ユーザー | 得られる価値 | 利用する理由 |
| --- | --- | --- |
| Desktop / Mobileウォレット開発者 | UI / Applicationから秘密鍵処理を分離し、鍵管理の責任範囲を限定しやすくなる | ウォレットごとの秘密鍵処理の実装・レビュー・保守負担を抑えるため |
| Desktop / Mobileウォレット開発者 | HD Walletから導出した鍵、直接取り込んだ鍵、Coreが生成した鍵を共通のSoftware KeyとしてCoreへ集約しやすくなる | 実行環境ごとの鍵管理処理の差異を抑えるため |
| Symbol / NEMウォレット開発者 | Symbol / NEMおよびMainnet / Testnetを区別した鍵管理の前提を共有できる | チェーンやネットワークの混同を避けるため |

## 7. v1のスコープと責任境界

### v1で扱う範囲

v1は、Desktop / MobileのSymbol / NEMウォレット向けソフトウェア鍵管理Coreとして、次の能力と責任を担う。

- ニーモニックを用いたHD Walletの生成、復元、アカウント導出。
- HD Walletからの秘密鍵の導出。導出された秘密鍵はSoftware Keyとして扱う。
- 外部からの秘密鍵そのものの直接インポート。取り込まれた秘密鍵はSoftware Keyとして扱う。
- Core内で独立したSoftware Keyの新規生成。
- Symbol / NEMおよびMainnet / Testnetを区別したアカウント導出。
- 現行のSymbol / NEMのMainnet / Testnetに合わせたHD Wallet導出パスの扱い。
- Software Keyの暗号化保存、ロック、アンロック、署名への利用、破棄。
- UI / Applicationへ秘密鍵そのものを直接返さない責任境界。

具体的な導出パスの値、秘密鍵の入力形式・検証方法、暗号方式、保存形式、API、データ形式、破棄の安全性保証・メモリ消去方式は後続工程で決定する。

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

- UI / Application: アカウント選択、公開情報の表示、ユーザー操作、ウォレット固有の表示や設定。
- Network層: REST、WebSocket、announceなどのネットワーク通信。
- Transaction構築層: Transactionの生成とシリアライズ。

v1ではOS固有の鍵保管機能、Hardware Wallet、External Signerを外部責任として採用しない。将来採用する場合は、その時点で責任境界を再定義する。

## 8. 判断原則

### v1の製品責任を絞る

- 原則: v1は、由来にかかわらずSoftware KeyをCore自身が管理・利用するウォレット向けCoreとして判断する。
- 理由: 外部署名者やOS固有機能まで同時に扱うと、製品責任と成功判定が不明確になるため。
- 判断への適用: Hardware Wallet、External Signer、OS-backed Keyはv1のSignerへ追加せず、Watch-onlyもSignerとして扱わない。

### 秘密鍵をUIへ返さない

- 原則: UI / Applicationは秘密鍵そのものを保持せず、Coreが担う鍵管理・署名の結果を利用する。
- 理由: 秘密鍵処理とUIの責任を分離することが本プロジェクトの中心価値であるため。
- 判断への適用: CoreとUI / Applicationの境界を定めるときに適用する。

### Symbol / NEMとネットワークを明示する

- 原則: SymbolとNEM、MainnetとTestnetを暗黙に同一視しない。
- 理由: HD Walletの導出とアカウントの意味を対象チェーン・ネットワークに整合させる必要があるため。
- 判断への適用: 共通化範囲、導出パス、署名対象の扱いを後続工程で定めるときに適用する。

### 将来拡張をv1へ混ぜない

- 原則: v1で検証するウォレット価値と、将来のSigner拡張・用途拡張を分離する。
- 理由: 初期の成功判定をDesktop / Mobileウォレットに集中させるため。
- 判断への適用: CLI、署名専用アプリ、認証・SSO、Hardware Wallet、External Signer等の採否を判断するときに適用する。

### 原則間の優先順位

v1の製品責任の明確さと秘密鍵のUI非公開を、将来拡張や対象環境の拡大より優先する。具体的な安全性要求と共通化範囲は要件定義で定める。

## 9. 成功条件

- DesktopまたはMobileのSymbol / NEMウォレットが、秘密鍵処理を個別実装せず、ニーモニックによるHD Walletの復元・導出、秘密鍵の直接インポート、独立したSoftware Keyの生成を共通Coreの責任として利用できる。
- DesktopまたはMobileのSymbol / NEMウォレットが、鍵の由来にかかわらずSoftware Keyについて、暗号化保存、ロック、アンロック、署名への利用、破棄を利用できる。
- 秘密鍵処理の実装・レビュー・保守対象をCoreへ集約しやすく、UI / Applicationとの責任境界を説明できる。
- HD Walletの導出が、Symbol / NEMおよびMainnet / Testnetの区分と整合する。
- Core、UI / Application、Network層、Transaction構築層の責任境界を説明できる。
- Hardware Wallet、External Signer、OS固有の鍵保管機能、Watch-only、SNIFがv1の成功判定へ混入していない。

## 10. 前提条件と主なリスク

### 前提条件

- Rust製のポータブルCoreとして提供する構想を維持する。
- Desktop / Mobileウォレットが、UI / Application、Network層、Transaction構築層を別責任として扱う。
- HD Wallet導出パスは、現行のSymbol / NEMのMainnet / Testnetに合わせる。具体的なパス値と参照バージョンは未確認である。
- v1ではSoftware KeyをCore自身が管理・利用する。

### 主なリスク

- SymbolとNEMの共通化範囲を広げすぎると、チェーン固有の差異を誤って隠蔽する可能性がある。
- 暗号化保存、ロック、アンロックに必要な安全性要求が曖昧なままだと、鍵管理Coreとしての成立条件を評価できない。
- Desktop / MobileとCoreを接続するBindingの範囲が曖昧だと、秘密鍵の責任境界を一貫して維持できない可能性がある。
- 将来のHardware Wallet、External Signer、OS-backed Keyを早期に混ぜると、v1の製品責任が再び拡大する可能性がある。

## 11. 将来構想

v1の成功判定から分離する将来構想は次のとおりである。

- Hardware Wallet、External Signer、OS-backed KeyなどのSigner実装候補。
- Watch-onlyアカウントの提供。これはSigner拡張ではなく、署名能力を持たない別のアカウント利用形態として扱う。
- CLI、署名専用アプリ、認証・SSO向けクライアントでの利用。
- SNIFによるアカウント、ニーモニック、秘密鍵などのデータ交換。
- v1で対象としない追加の署名方式やBinding。

## 12. 未決定事項

| ID | 論点 | 判断が必要な理由 | 決定先 | コンセプトへの影響 |
| --- | --- | --- | --- | --- |
| CU-001 | Symbol / NEMでどこまで共通Core化するか | 両チェーンを対象とするが、チェーン固有処理と共通処理の境界は未確認である | 要件定義 | Coreの責任範囲と相互運用性の説明が変わる |
| CU-002 | 暗号化保存・ロック・アンロックに必要な安全性要求 | v1の鍵管理Coreとして、どの安全性を満たす必要があるかを要件レベルで定める必要がある | 要件定義 | 鍵管理Coreの成立条件と評価方法が変わる |
| CU-003 | v1のBinding提供範囲 | Desktop / MobileウォレットからCoreを利用する接続範囲が未確定である | 要件定義 | CoreとUI / Applicationの責任境界が変わる |

## 13. 要件定義への引継ぎ

- Symbol / NEMに共通化する処理と、チェーン固有として扱う処理の範囲を決める。
- HD Wallet由来、直接インポート、独立生成というSoftware Keyの各由来に共通する、暗号化保存、ロック、アンロック、秘密情報の保持・破棄に関する安全性要求を決める。暗号方式、保存形式、入力形式・検証方法、破棄の安全性保証・メモリ消去方式は仕様・設計で決定する。
- Desktop / MobileウォレットからCoreを利用するBindingの対象範囲と責任境界を決める。Bindingの実装方式は設計で決定する。
- HD Walletの導出パスの具体値と、Symbol / NEMおよびMainnet / Testnetとの対応表を、承認済み仕様に基づいて確認する。
- Software Keyの署名対象、対応する署名処理の範囲、鍵管理ライフサイクルの詳細を決める。

## 参照資料

| 資料 | 参照箇所 | このコンセプトで確認したこと |
| --- | --- | --- |
| [`docs/knowledge/symbol-technicalref-jp.pdf`](../knowledge/symbol-technicalref-jp.pdf) | 1.1「ネットワーク・フィンガープリント」(p.2)、3.1「公開鍵/秘密鍵ペア」(p.11)、3.2「署名と検証」(p.12)、5「アカウントとアドレス」(p.22–25) | Symbolではネットワーク識別子がアドレスとトランザクションに関係し、秘密鍵・公開鍵・署名・アカウント/アドレスを区別して扱うこと。 |
| [`docs/knowledge/nem-technicalref.pdf`](../knowledge/nem-technicalref.pdf) | 2「Accounts and Addresses」(p.2–6)、3.1「Private and public key」(p.7)、3.2「Signing and verification of a signature」(p.8)、9「Network」(p.49–50) | NEMでもアカウント、アドレス、鍵ペア、署名、ネットワーク通信を区別して扱うこと。 |
| [`docs/knowledge/symbol-openapi3.yml`](../knowledge/symbol-openapi3.yml) | `/accounts` (行27–87)、`/network` (行299–312)、`/transactions` のannounce系 (行542–557) | アカウント情報・ネットワーク情報の取得とトランザクションannounceはREST API側の責任であり、v1 Coreの対象外とする境界の確認。 |
| [`docs/knowledge/nem-openapi3.yaml`](../knowledge/nem-openapi3.yaml) | `NetworkId` (行164–170) | NEMのMainnet/TestnetをネットワークIDとして区別する前提の確認。 |

上記資料はSymbol/NEMの技術上の前提と、Network/API層との責任境界を確認するために参照した。ニーモニック、HD Wallet、具体的な導出パスは上記資料から確認できないため、このコンセプトでは対象能力と方針までを定め、具体値は要件定義・仕様化の段階で承認済み資料を確認する。
