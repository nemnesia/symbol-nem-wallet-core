# symbol-nem-wallet-core コンセプトシート

## 1. 概要

symbol-nem-wallet-core v1 は、Symbol / NEM ウォレットで使う秘密情報を管理し、Software Key（Core が管理し、署名に利用する秘密鍵）を扱う、共通の Rust 製 Core を作るプロジェクトである。Symbol / NEM は、取引や Account を扱う仕組みである。対象は Desktop / Mobile / Web のウォレットで、Web には Web Application と Browser Extension を含む。

Core は Mnemonic と Software Key を管理し、Software Key を署名に利用する。UI / Application は、ユーザー操作、表示、ウォレット固有の設定を担当する。どの実行環境から利用しても、Core が担う秘密情報の管理責任と公開範囲は共通に保つ。

ウォレットでは、Mnemonic、秘密鍵、HD Wallet、暗号化保存、ロック、署名などの高リスクな処理を扱う。これらが UI / Application や実行環境ごとに分散すると、秘密情報の露出箇所、実装差異、レビューと保守の対象範囲が増える可能性がある。本プロジェクトは、v1 の製品像をソフトウェアウォレットの秘密鍵ライフサイクルを担う鍵管理 Core に絞る。External Signer（Core 外部で署名を担う仕組み）や OS-backed Key（OS 固有の鍵保管機能）は同じ製品責任に含めない。

秘密鍵または Mnemonic の取込み時に UI / Application がユーザー入力を一時的に仲介する場合がある。この一時的な仲介は管理責任の移転を意味せず、取込み後の秘密情報の継続的な管理責任は Core が担う。Mnemonic は生成・復元・取込み後も Core 管理下にある、HD Wallet の元となる秘密情報であり、そこから導出された Software Key とは別の管理対象として扱う。Core 管理下の秘密情報に関する原則は、7章で定める。

## 2. 解決したい課題

### 利用者が実際に直面する課題

- 対象者: Symbol / NEM ウォレットを開発するソフトウェア開発者。
- 現在の課題: ウォレットの UI / Application が、Mnemonic や秘密鍵の生成、導出、保存、ロック、署名などを直接扱う可能性がある。
- 課題の原因: Desktop / Mobile / Web など実行環境ごとに鍵管理処理が分散し、秘密情報の扱いと責任境界が一貫しない可能性がある。また、Symbol / NEM および Mainnet / Testnet の区別を共通処理の中で曖昧に扱う可能性がある。
- 放置した場合の影響: 秘密情報の露出箇所や実装差異が増え、セキュリティレビューと保守の対象範囲が広がる可能性がある。

### プロジェクト上の仮定

ウォレット開発者が、UI から秘密鍵処理を分離した Software Key 管理の責任領域を、Desktop / Mobile / Web で共通に利用できる形は、現時点で確定していないと本プロジェクトは仮定する。

### 未検証の価値仮説

UI から秘密鍵処理を分離して Core へ責任を集約することで、秘密情報の露出箇所や実装差異、セキュリティレビューと保守の対象範囲を抑えられる可能性がある。

利用者の課題、プロジェクト上の仮定、未検証の価値仮説は別のものとして扱う。具体的な脅威モデルやリスク低減効果は、このコンセプトで検証済みの事実とはしない。

## 3. 目的

symbol-nem-wallet-core v1 は、Desktop / Mobile / Web の Symbol / NEM ウォレットから、次の状態を実現することを目的とする。

1. Mnemonic を基礎とする HD Wallet の生成・復元と、そこからの鍵導出を Core の責任領域で扱う。導出された秘密鍵、外部から直接取り込んだ秘密鍵、Core 内で独立して生成した秘密鍵を、Software Key として扱う。
2. Software Key の暗号化保存、ロック、アンロック、署名への利用、破棄までを、Core の鍵管理責任として扱う。
3. Symbol / NEM と Mainnet / Testnet を区別し、HD Wallet の導出パスを対象ネットワークに合わせる。
4. 取込み時のユーザー入力を UI / Application が一時的に仲介する場合でも、取込み後の秘密情報の継続的な管理責任を Core に集約する。
5. UI / Application を秘密鍵や Mnemonic の継続的な管理・保存主体とせず、Core 管理下の秘密情報を通常の処理結果として Core 外へ返却・共有せずに、Core の鍵管理と署名の結果を利用できる状態を作る。
6. 実行環境が Desktop / Mobile / Web のいずれであっても、Core の秘密情報管理責任と秘密情報の公開範囲を変えない。

## 4. 対象ユーザーと主要利用場面

### 対象ユーザー

Symbol / NEM ウォレット開発者。Desktop / Mobile / Web ウォレットへ、共通の Software Key 管理・署名 Core を組み込む。利用者に必要な専門知識の範囲は要件定義で確認する。

### 主要利用場面

ウォレット開発者が、Desktop / Mobile / Web ウォレットに、HD Wallet からの Account 導出、秘密鍵の直接取込み、Software Key の生成・保管・ロック、署名を組み込む場面を想定する。この場面では、UI / Application が秘密鍵を継続的に保持・管理したまま、鍵管理と署名を実装することに課題がある。秘密鍵または Mnemonic の取込み時には、UI / Application がユーザー入力を一時的に仲介する場合がある。

この場面で、Mnemonic を基礎とする HD Wallet から導出された秘密鍵や、他の経路から取り込まれた秘密鍵を、Core 管理下の Software Key として扱い、Account として利用できる状態を目指す。どの Account を利用するかは UI / Application が選択するが、秘密鍵や Mnemonic の継続的な管理責任を UI / Application が持つことを意味しない。Core 管理下の秘密情報は、通常の処理結果として Core 外へ返却・共有しない。

一般利用者が Core を直接操作することは想定しない。CLI、署名専用アプリ、認証・SSO 向けクライアントは、v1 の成功判定対象ではなく、将来の利用候補とする。

## 5. 用語

- **Symbol / NEM**: 取引を記録し、ウォレットが Account を利用する対象の仕組み。Symbol と NEM は同一のものとして扱わない。
- **Chain / Network**: Chain は Symbol または NEM のように取引や Account を扱うブロックチェーンの区分。Network は同じ Chain の Mainnet（本番用）または Testnet（検証用）を区別する区分。
- **Core**: Mnemonic と Software Key を管理し、Software Key を署名に利用する中心部分。
- **UI / Application**: ユーザー操作、表示、ウォレット固有の設定を担当する画面やアプリケーション本体。秘密鍵または Mnemonic の取込み時には、ユーザー入力を一時的に仲介する場合がある。
- **秘密鍵**: Account の利用や署名に使う、他者に知られてはいけない鍵。Core 管理下では Software Key として扱う。
- **秘密鍵処理**: 秘密鍵そのものを扱う処理の総称。生成、導出、直接取込み、署名、暗号化などを含む。
- **Mnemonic**: HD Wallet の元になる秘密情報。生成・復元・取込みの後も Core が継続的に管理し、導出後も Core の責任から外れない。Software Key とは別の管理対象として扱う。
- **HD Wallet**: Mnemonic を基礎として、複数の Software Key を導出するウォレットの考え方。HD Wallet から導出された秘密鍵は、Core の管理下では Software Key として扱う。
- **鍵管理**: Mnemonic を Core 管理下の秘密情報として扱い、Software Key について、生成、秘密鍵の直接取込み、HD Wallet からの導出、暗号化保存、ロック、アンロック、署名への利用、破棄までを扱う領域。
- **署名処理**: 管理下の秘密鍵を利用して、取引などを鍵の持ち主の操作として扱うための結果を生成する処理。
- **Signer**: 署名能力を持つ主体。v1 では Core が管理する Software Key のみを指す。
- **Software Key**: Core が管理し、署名に利用する秘密鍵の総称。HD Wallet から導出された鍵、外部から直接取り込まれた鍵、Core が独立して生成した鍵を含み、Mnemonic とは別の管理対象とする。
- **Account**: Chain 上で資産や取引の主体として扱う利用単位。Software Key を利用する対象。
- **Core 管理下の秘密情報**: この Concept で対象とする Mnemonic および Software Key に属する秘密情報。これらは Core が継続的な管理主体となる。
- **Watch-only**: 署名能力を持たない Account の利用形態。Signer および Signer 実装候補とは別の概念として扱う。
- **Web**: Web Application および Browser Extension を含む実行環境。Web 固有の実装方式やブラウザ API はコンセプトシートでは定義しない。

関係を簡単に言うと、Mnemonic が HD Wallet の元になり、HD Wallet から Software Key が導出される。Core はその Mnemonic と Software Key を管理し、Software Key を Account で利用できるようにする。どの Account を利用するかは UI / Application が選択するが、秘密情報の管理責任を持つことを意味しない。

## 6. 提供価値

| 対象ユーザー | 得られる価値 | 利用する理由 |
| --- | --- | --- |
| Symbol / NEM ウォレット開発者 | UI / Application から秘密鍵処理を分離し、鍵管理の責任範囲を限定しやすくなる | ウォレットごとの秘密鍵処理の実装・レビュー・保守負担を抑えるため |
| Symbol / NEM ウォレット開発者 | HD Wallet から導出した鍵、直接取り込んだ鍵、Core が生成した鍵を共通の Software Key として扱いやすくなる | 実行環境ごとの鍵管理処理の差異を抑えるため |
| Symbol / NEM ウォレット開発者 | Symbol / NEM と Mainnet / Testnet を区別した鍵管理の前提を共有できる | Chain や Network の混同を避けるため |

## 7. v1 のスコープと責任境界

### v1 で扱う範囲

v1 は、Desktop / Mobile / Web の Symbol / NEM ウォレット向け Software Key 管理 Core として、次の能力と責任を担う。

- Mnemonic を生成・復元・取込みした後も、Mnemonic を Core 管理下の秘密情報として継続的に扱う。Mnemonic は HD Wallet の基礎であり、導出された Software Key とは別の管理対象とする。
- Mnemonic を基礎とする HD Wallet を生成・復元し、Account を導出する。
- HD Wallet から秘密鍵を導出し、導出された秘密鍵を Software Key として扱う。
- 外部から秘密鍵そのものを直接取り込み、取り込んだ秘密鍵を Software Key として扱う。
- Core 内で独立した Software Key を新規生成する。
- Symbol / NEM と Mainnet / Testnet を区別して Account を導出し、現行の対象ネットワークに合わせた HD Wallet 導出パスを扱う。
- Software Key を暗号化保存し、ロック、アンロック、署名への利用、破棄を行う。
- 取込み時のユーザー入力を UI / Application が一時的に仲介する場合を含め、取込み後の秘密情報の管理責任を Core に集約する。
- Core 管理下の秘密情報を、通常の処理結果として Core 外へ返却・共有しない。
- Desktop / Mobile / Web のいずれから利用する場合も、Core の秘密情報管理責任と秘密情報の公開範囲を共通に保つ。

具体的な導出パスの値、秘密鍵の入力形式・検証方法、暗号方式、保存形式、API、データ形式、Binding 方式、受渡し方法、メモリ上の保持方法、破棄の安全性保証・消去方式は後続工程で決定する。

### Core 管理下の秘密情報に関する Security Invariant

ここでいう Security Invariant は、利用する環境や場面が変わっても維持する、秘密情報の管理主体と責任境界の原則である。Core 管理下の秘密情報は、Mnemonic および Software Key に属する秘密情報を指す。

- Mnemonic および Software Key に属する秘密情報は、生成・復元・取込み後も Core が継続的な管理主体となる。
- UI / Application が取込み時などに秘密情報を一時的に仲介しても、それは継続的な管理責任が UI / Application へ移転することを意味しない。
- Core 管理下の秘密情報は、通常の処理結果として Core 外へ返却・共有しない。
- Desktop / Mobile / Web の違いによって、この管理責任と通常処理での非開示原則を変えない。
- UI / Application、Browser、OS などのホスト環境そのものの侵害を Core が防止できるという保証は、この原則とは別であり、Core の保証範囲に含めない。

ユーザーが明示的に求める Mnemonic や Software Key の回復、表示、export などは、通常の処理とは異なる「意図的な秘密情報アクセス」として扱う。その可否、認可条件、UX、受渡し方式は、この Concept では決定せず、Requirements / Design で決定する。

### v1 で実施しないこと

Hardware Wallet、External Signer、OS Keychain・Secure Enclave・TPM などの OS-backed Key、Watch-only Account、SNIF 連携は v1 の製品責任に含めない。これらは11章に示す将来の拡張候補である。

### プロジェクトとして扱わないこと

次の領域は、v1 に限らず本プロジェクトの責任範囲に含めない。

- REST Client、WebSocket Client、ノード選択、Blockchain Explorer
- 一般的なトランザクション構築・シリアライズ
- UI コンポーネント、Wallet UI そのもの
- Node.js 代替実装
- 特定ウォレットアプリ専用ロジック

### 外部へ委ねること

| 担当 | Core 外の責任 |
| --- | --- |
| UI / Application | どの Account を利用するかの選択、公開情報の表示、ユーザー操作、ウォレット固有の表示や設定。秘密鍵または Mnemonic の取込み時にユーザー入力を一時的に仲介する場合があるが、取込み後の秘密情報の継続的な保存・管理主体とはしない。 |
| Web Application / Browser Extension | Web 固有の Application 状態、Browser 固有 Storage、ページまたは Extension の実行環境とそのセキュリティ。これらを Core の秘密情報管理責任には含めない。 |
| Network 層 | REST、WebSocket、announce などのネットワーク通信。 |
| Transaction 構築層 | Transaction の生成とシリアライズ。 |

具体的な Binding 方式、受渡し方式、メモリ上の保持方法および消去方式は後続工程で決定する。

## 8. 成功条件

v1 は、少なくとも次の状態を満たしたときに、コンセプト上の目的を達成したとみなす。

1. Desktop / Mobile / Web の Symbol / NEM ウォレットから、同じ Rust 製 Core へ鍵管理と署名の責任を集約できる。
2. HD Wallet 由来、直接取込み、Core 独立生成の秘密鍵を、共通の Software Key として扱える。
3. UI / Application が取込み時などに秘密情報を一時的に仲介しても、取込み後の Mnemonic および Software Key の継続的な秘密情報管理主体にならない。
4. Core 管理下の秘密情報が、通常の処理結果として Core 外へ返却・共有されない。
5. Symbol / NEM と Mainnet / Testnet の区別を保った鍵管理ができる。
6. Desktop / Mobile / Web の実行環境の違いによって、Core の秘密情報管理責任や秘密情報公開方針が変化しない。

具体的な暗号方式、API、Binding 方式、保存形式、対象 OS・Browser、配布方式、メモリ消去方式は、上記の成功条件を満たすための後続設計事項とする。

## 9. 前提・制約

- Rust 製のポータブル Core として提供し、Desktop / Mobile / Web から共通利用できることを前提とする。Web には Web Application および Browser Extension を含む。
- Desktop / Mobile / Web の各実行環境へ Core を接続する具体的な Binding 方式は後続工程で決定する。
- Web 実行環境そのものを、秘密情報を恒久的に隔離できる保護境界とは前提にしない。
- Symbol と NEM、Mainnet と Testnet を暗黙に同一視しない。
- OS-backed Key は v1 の Core 責任外とする。
- 秘密情報の保存方式、暗号方式、消去方式などの具体設計はコンセプトシートでは決定しない。

## 10. リスクと注意点

- Web を v1 対象に含めることで、Desktop / Mobile に加えて Browser 環境の実装・レビュー対象が増える。ただし、Web 固有の秘密情報管理ロジックを別実装せず、Core へ責任を集約する方針は維持する。
- UI / Application や Binding の境界を越える秘密情報の扱いは、実行環境によってコピーや保持の性質が異なる可能性があるため、具体的な保護方式は後続工程で検証する必要がある。
- Core へ秘密情報管理を集約しても、UI / Application、Browser、OS などのホスト環境そのものの侵害を防止できることを意味しない。これは Core の秘密情報管理に関する Security Invariant とは別の責任範囲である。
- 対象 Chain / Network との互換性、秘密情報の保護強度、状態変更時の整合性などは、要件定義および仕様設計で受入基準を具体化する必要がある。

## 11. 将来の拡張候補

次の項目は v1 の製品責任および成功条件には含めない。

- Hardware Wallet
- External Signer
- OS Keychain、Secure Enclave、TPM などの OS-backed Key
- Watch-only Account
- SNIF 連携
- CLI、署名専用アプリ、認証・SSO 向けクライアント

Watch-only は署名能力を持たない別の Account 利用形態であり、Signer には含めない。Hardware Wallet、External Signer、OS-backed Key は、将来の Signer 実装候補として扱う。

## 12. 未決定事項

次の具体事項は要件定義または仕様設計で決定する。

- 対象とする Symbol / NEM のプロトコル版、互換性基準、基準時点。
- Profile、Mnemonic、Software Key などの具体的な管理単位、保存・保護・消去などの詳細なライフサイクル。Mnemonic を Core 管理下の秘密情報とする責任境界はコンセプトで定める。
- 秘密情報保護に必要なパスワード安全性や認可条件。
- ユーザーが明示的に求める Mnemonic や Software Key の回復、表示、export などを v1 で許可するか、その認可条件、UX、受渡し方式。
- Native / Web を含む具体的な Binding 方式とパッケージ構成。
- 対象 OS・Browser・バージョン、ビルド・配布方式。
- Web 環境における秘密情報の具体的な受渡し、コピー、保持、消去方式。

## 13. 次工程への引継ぎ

要件定義では、12章の未決定事項を、次の観点から一意に判定できる状態へ具体化する。

- Desktop / Mobile / Web から利用する Core と Application の責任境界、通常処理と意図的な秘密情報アクセスの区別、および通常処理で Core 管理下の秘密情報を Core 外へ返却・共有しない境界。
- Profile、Mnemonic、Software Key の具体的な管理単位と詳細なライフサイクル。
- Symbol / NEM と Mainnet / Testnet の区別、および v1 の互換性基準。
- Native Binding / Web 向け Binding を含む v1 機能の利用可能範囲。
- Web 環境を秘密情報の恒久的な保護境界とみなさない前提。

具体的な API、データ形式、暗号方式、保存形式、Binding 実装方式、メモリ消去方式は要件定義を超えるため、必要な受入条件を要件で定めたうえで仕様設計へ引き継ぐ。
