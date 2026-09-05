# symbol-nem-wallet-core 要件定義書

## 1. 概要

### 1.1 目的

symbol-nem-wallet-core v1 は、Desktop、Node.js、Browser、Browser Extension、React Native Android および React Native iOS の Symbol / NEM ウォレット向けに、Mainnet または Testnet に所属する Profile を秘密情報管理の基本単位とし、Mnemonic と Software Key の生成・復元・導出・取込み・暗号化保存・処理単位の認証・署名・個別エクスポート・削除を Rust Wallet Core へ集約する。

Browser Extension は Browser runtime の利用形態として扱う。Desktop Application は Native C ABI、Node.js は Node-API Binding、Browser は WASM Binding を介して同一 Rust Wallet Core を利用し、React Native Android / iOS は具体方式を固定しない platform-specific binding boundary を介して同一 Rust Wallet Core を利用する。Node.js の v1 support は、Rust Wallet Core と独立した Node.js / TypeScript 等による Wallet Core の別実装を意味しない。

### 1.2 上位根拠

上位コンセプトは `docs/consept/concept-sheet.md` である。

- コンセプトとの追跡: 背景・課題は `docs/consept/concept-sheet.md` §1〜§2、目的は§3、対象利用者・主要利用場面は§4、責任境界は§7〜§8に対応する。
- React Native 対応方針との追跡: 対象 runtime / platform、単一 repository / npm package、共通 Rust Core および環境共通の責任境界は `docs/consept/concept-sheet.md` §1、§7〜§10、§13 に対応する。
- Concept における Mobile は React Native Android / iOS のアプリケーション実行環境を指し、本書では独立した consumer target として扱わない。

### 1.3 本書で決定しない事項

API、型、保存レコード構造、暗号方式、KDF、salt / nonce、具体的な HD 導出パス値、Binding 実装、メモリ配置、zeroize 方法、署名内容の提示・承認に関する具体的な UI、対象 OS / Browser バージョン、CPU architecture matrix 等は本要件書では詳細を定めず、仕様設計またはリリース要件で決定する。対象 runtime / platform、サポート対象 version および architecture matrix の明示・検証は NFR-006、NFR-012 および NFR-013 に従う。秘密情報処理における side-channel の具体方式および検証方法も、SEC-023 の保証範囲を保ったまま下流へ委譲する。React Native における同期実行の安全性、blocking、responsiveness、resource boundedness および async 化の判断条件は NFR-008、NFR-015 および AC-061 で要求し、具体的な閾値・実行方式・API は下流へ委譲する。

---

## 2. 対象範囲と責任境界

### 2.1 Profile 管理モデル

```text
Profile
├─ Network [Mainnet | Testnet、必須・作成時に固定]
├─ Mnemonic [必須・1 つ]
├─ Derived Software Key [0..n]
├─ Imported Software Key [0..n]
└─ Generated Software Key [0..n]
```

- Profile は必ず 1 つの Mnemonic と Mainnet / Testnet の Network を持つ。
- Mnemonic を持たない Profile は v1 で許可しない。
- Network は Profile 作成時に確定し、変更できない。別 Network は別 Profile とする。
- Profile は Symbol / NEM の特定 Chain へ固定しない。Chain は Software Key ごとに固定する。
- Chain は Symbol または NEM の区分、Network は Mainnet または Testnet の区分である。Profile は Network を固定し、Software Key は指定 Chain に固定する。Account は、Software Key をその Chain と Profile の Network 上で利用する概念である。
- Derived Software Key は Profile の Mnemonic から導出する。
- Imported Software Key は外部秘密鍵を既存 Profile へ取り込む。
- Generated Software Key は Core が独立生成し既存 Profile へ追加する。
- Imported / Generated Software Key だけで Profile を作成できない。
- Core が生成・維持する、本要件・仕様に適合した整合した Store では、同一 Mnemonic + 同一 Network の Profile 重複登録を拒否する。同一 Mnemonic + 異なる Network は別 Profile として許可する。
- 同一 Profile 内かつ同一 Chain で、同一秘密鍵に対応する Software Key を由来をまたいで重複登録しない。異なる Chain では同一秘密鍵に対応する Software Key を別 Software Key として許可する。Chain / Network を別の値へ暗黙に変換しない。

### 2.2 Binding と Core

```text
Desktop Application ──────────> Native C ABI ───────────────┐
Node.js Application ──────────> Node-API Binding ────────────┤
Web / Browser Extension ──────> WASM Binding ────────────────┤──> Rust Wallet Core
React Native Android / iOS ──> platform-specific binding ───┘
```

Native C ABI / Node-API Binding / WASM Binding および React Native Android / iOS の platform-specific binding boundary は Core を利用する境界とし、Core と別系統の秘密情報管理、暗号化、署名、導出、Profile パスワード認可を実装しない。

Binding 方式によって Core の秘密情報管理方針、認可責務、秘密情報公開範囲を変更しない。Desktop Application、Node.js、Browser / Browser Extension、React Native Android / React Native iOS のどの環境でも、Core が保持する責任と通常処理での秘密情報非開示の原則を共通に適用する。Binding は platform integration、データ受渡し、Core invocation の境界を担い、Core と Application の入力・出力検証を迂回せず、所有権・lifetime・error propagation を要件どおりに扱う。

Node.js Application / Node-API Binding は、Node.js 専用の暗号、Store、authorization、secret management または signing implementation を持たず、同じ Rust Wallet Core の処理を利用する。

### 2.3 Profile パスワード

- Mnemonic および Software Key に属する秘密情報は、Core が継続的な管理主体となる。UI / Application が取込み等で秘密情報を一時的に仲介しても、継続管理責任が UI / Application へ移転したことを意味しない。
- Core 管理下の秘密情報は通常の処理結果として Core 外へ返却・共有しない。利用者が意図的に秘密情報へアクセスする初回バックアップ受渡しまたは個別エクスポートは、通常処理とは別の操作として扱い、§4 UC-001 / UC-011 および §7 SEC-010 / SEC-021 の条件に従う。
- Profile ごとに 1 つの Profile パスワードを使用する。
- Profile 配下の Mnemonic とすべての Software Key を同一 Profile パスワード保護単位とする。
- Software Key ごとの個別パスワードは設けない。
- Core は Profile パスワードを永続保存または継続的にキャッシュしない。
- v1 は、処理をまたぐ継続的・永続的な Unlocked 状態を外部へ提供しない。独立した unlock session を Application が保持する利用モデルも提供しない。
- Concept における lock / unlock は、秘密情報を通常時には利用不可とし、処理単位の Profile パスワード認証に成功した処理中だけ利用可能にする責任境界として扱う。独立した継続 Unlocked 状態を公開能力とはしない。
- 秘密情報を必要とする処理ごとに Profile パスワードを受け取り、正しい場合だけ現在の処理を認可する。ある処理の認証結果を、次の秘密情報処理へ持ち越さない。
- Profile パスワード紛失時の復旧・リセットは v1 で提供しない。
- Profile 作成およびパスワード変更では、未指定・空・Core が内部で補う既定値を拒否する。
- **最小長、最大長、文字種、複雑性、辞書チェック、既知の弱いパスワード拒否、強度表示等の品質ポリシーは上位 Application / Package の責任とし、Wallet Core は独自に評価しない。**
- KDF、salt、暗号方式、パラメータ等の暗号学的保護は Wallet Core の仕様設計で決定する。

### 2.4 外部へ委ねる責任

- Core: Profile パスワードによる処理単位の鍵利用認可、指定された Account / Software Key に対応する秘密鍵の利用、署名および署名結果の返却。Transaction の意味を利用者へ説明すること、利用者の意思を推測すること、署名内容を表示する UI を提供することは担わない。
- Core: 新規 Mnemonic を生成し、初回 handoff の完了確認を受けるまでは新規 Profile を成功状態として確定しない。意図された呼出し元 Application への完全な Mnemonic の受渡し、Application からの完了確認およびその確認に基づく Profile 作成の確定を担う。Core が新しい Mnemonic を生成するが、handoff を行わずに Profile を成功させる経路は v1 で提供しない。
- UI / Application: ユーザー操作、公開情報表示、利用する Account の選択、署名対象内容の提示、利用者が署名内容を確認できる状態の提供、利用者からの明示的な署名承認、ウォレット固有設定を担う。承認された署名要求だけを Core へ送る。新規 Mnemonic 生成では、Core から受け取った完全な Mnemonic を意図した利用者へ提示し、利用者の明示的な受領確認が成立した場合だけ、その事実を Core へ伝える。利用者確認前に Profile 作成を成功扱いしない。署名 approval、export confirmation および handoff confirmation の freshness は Application / UI が管理し、過去に保存した `Approved`、`Confirmed` または `Requested` を新しい利用者意思として再利用しない。
- 上位 Application / Package: Profile パスワード品質ポリシー。利便性のためパスワードを一時保持する場合の管理。
- Web Application / Browser Extension: Web 固有の状態、Browser 固有 Storage、ページ / Extension 実行環境のセキュリティ。
- Desktop Application、React Native Application、Web Application、Browser、OS、host process: それぞれの実行環境の安全性。Application、Browser、OS または host process の侵害を Core が防止する保証はしない。ただし、Core / Binding が不要に秘密情報を公開しない責任は維持する。
- Network 層: REST、WebSocket、announce 等。
- Transaction 構築層: Transaction の生成・シリアライズ。
- Application / 上流側: Application が current Store を選択・保存し、Core が返した replacement Store を正しく適用する責任。stale / historical Store の再適用防止、backup / snapshot の最新版管理、端末間移行および消失・破損からの復旧を提供する場合の責任。Core は Store の過去 snapshot を永続記憶せず、valid historical Store の freshness または rollback を単独では判定しない。
- 利用者: 初回 handoff 後の Mnemonic の外部バックアップ、保存および紛失防止。Core は、利用者が紙や外部媒体へ正しく保存したこと、または将来紛失しないことを独立して検証・保証しない。Application が利用者から受領確認を得た事実は、この handoff における責任境界として Core が扱う。
- Application / 利用者: 明示的な秘密情報アクセスで Core 外へ渡された Mnemonic / 秘密鍵のコピーの表示、保管、利用、紛失防止。エクスポート後も Core が保持する Mnemonic / Software Key 原本の継続管理責任は Core に残る。

### 2.5 v1 対象外

- Hardware Wallet
- External Signer
- OS Keychain / Secure Enclave / TPM 等 OS 固有鍵保管機能
- Watch-only
- SNIF
- CLI、署名専用アプリ、認証・SSO向けクライアントへの v1 提供
- REST Client、WebSocket Client、ノード選択、Explorer
- Transaction 構築・シリアライズ
- Wallet UI / UI コンポーネント
- Node.js 代替実装（Rust Wallet Core と独立した Node.js / TypeScript 等による Wallet Core の別実装）
- 特定 Wallet Application 専用ロジック
- Application が提供する、保存済み暗号化 Profile データそのもののバックアップ・端末間移行・外部復旧。v1 は Store / Profile の version migration 機能を提供せず、Core は v1 が明示的に対応する version だけを処理する。Application が unsupported version を独自に読み替えたデータを、Core が v1 の正常 Store として扱うことは前提にしない。将来 migration を提供する場合は、将来 version の Requirements / Design / Specification で別途定義する。

---

## 3. 互換性基準

### 3.1 Symbol / NEM

v1 の Symbol / NEM における秘密鍵・公開鍵の対応、アドレス生成、署名および Mainnet / Testnet の Chain / Network 処理は、2026-08-17 時点の `symbol-sdk` **3.3.2** と互換であることを基準とする。

`symbol-sdk` の将来バージョンへ自動追従しない。基準変更時は互換性影響を別途判断する。

### 3.2 HD Wallet

v1 の Mnemonic は、採用する標準および互換性基準として **BIP-0039（英語 24 語）**を固定する。Core が Mnemonic を生成する場合、既存 Mnemonic を復元する場合、および外部から Mnemonic を取り込む場合に、同じ BIP-0039 24 語基準を適用する。Mnemonic の妥当性を判定する責任は Core にあり、Binding / Application が別の基準で代替または回避してはならない。

HD Wallet は v1 対象とする。入力表現の正規化、seed 生成、導出パスおよび index の具体的な規則は本要件書で固定せず、採用した BIP-0039 24 語基準および下記の Symbol / NEM 互換性基準に追跡可能な仕様へ委譲する。

`symbol-sdk` 3.3.2 は Symbol / NEM の鍵・アドレス・署名結果の互換性検証基準として使用する。HD 導出パスそのものを `symbol-sdk` が規定しているとは扱わず、v1 の HD 復元互換性は仕様で固定した導出規則および deterministic fixture との一致を受入基準とする。特定の既存 Symbol / NEM Wallet 製品との包括的互換性は保証せず、名称、version または commit、入力、期待値および fixture を明示した場合に限り、その fixture の範囲で保証対象とする。

### 3.3 Software Key の妥当性

Generated / Imported / Derived Software Key は、選択された Chain と Profile の Network で利用でき、§3.1 の Symbol / NEM 互換性基準に適合する値だけを登録・利用する。生成、取込みおよび HD Wallet からの導出を含む各経路の妥当性判定は Core の責任とし、Binding / Application が別の判定で代替または回避してはならない。秘密鍵の具体的な表現、検証手順および導出・生成方式は仕様設計へ委譲する。

---

## 4. ユースケース

### UC-001 Profile を作成・復元する

Core が新規 Mnemonic を生成し、初回 handoff の成立条件を満たした後に Profile を作成できる。また既存 Mnemonic、Profile パスワード、Network から Profile を復元・作成できる。新規生成と既存 Mnemonic の restore は別経路であり、restore は生成時の初回 handoff confirmation の対象外とする。

新規生成経路では、Mnemonic handoff を通常処理とは異なる明示的な秘密情報アクセスとして扱う。handoff が成功したとみなせるのは、次のすべてが成立し、最後に Core が Profile 作成を成功状態として確定した場合だけである。

1. Core が完全な Mnemonic を生成し、意図された呼出し元 Application へ渡す。
2. Application がその完全な Mnemonic を意図した利用者へ提示する。
3. 利用者が Mnemonic を受領したことを明示的に確認する。
4. Application が利用者の確認成立を Core へ伝える。
5. Core がその確認に基づいて Profile 作成を成功状態として確定する。

Core が Mnemonic を生成したことだけ、一時的に保持できることだけ、Binding を介して Application へ渡したことだけ、または Application が呼出しを行ったことだけでは handoff 成功とみなさない。受領不能、提示不能、利用者の拒否または確認未取得、Application から Core への完了確認不能、handoff の中断、または Core の最終確定処理の失敗時は、新規 Profile を成功状態として残さず、部分状態を残さず、Mnemonic を通常結果または診断へ漏らさない。Core は紙への記録、外部バックアップの保存、将来の紛失を保証しないため、受渡し後の Mnemonic の保管・紛失防止は利用者および上位 Application / Package の責任とする。

保存済み Mnemonic は通常処理結果として取得せず、対象 Profile、処理単位の正しい Profile パスワードおよび利用者の明示的な要求を伴う UC-011 の場合だけ返却する。既存 Mnemonic による restore は、Mnemonic validity、password、Store および duplicate 等の通常 restore 条件に従い、生成時の handoff confirmation を要求しない。

### UC-002 追加アカウントを導出する

保存済み Mnemonic、Profile の Network、指定 Chain、正しい Profile パスワードから秘密鍵を導出し、妥当性確認に成功した Derived Software Key として保存する。導出、妥当性確認または保存に失敗した場合は、Profile や既存 Software Key を部分変更しない。

### UC-003 秘密鍵をインポートする

正しい Profile パスワードを Core が認可した後、妥当な外部秘密鍵を Imported Software Key として既存 Profile へ保存する。認可・検証・保存失敗時は Profile 状態を変更しない。

### UC-004 Software Key を個別生成する

正しい Profile パスワードを Core が認可した後、Core が秘密鍵を生成し Generated Software Key として既存 Profile へ保存する。生成・検証・保存失敗時は Profile 状態を変更しない。

### UC-005 秘密情報を必要とする処理を行う

正しい Profile パスワードを処理ごとに提示した場合のみ秘密情報を一時利用する。v1 は処理をまたぐ継続的・永続的な Unlocked 状態や、Application が保持する unlock session を提供しない。ある処理の認証結果を次の秘密情報処理へ持ち越さない。

### UC-006 Software Key で署名する

UI / Application が利用する Account と署名対象内容を選択・提示し、現在の署名操作について利用者から明示的に承認を得た署名要求だけを Core へ送る。過去に保存した承認済み要求を新しい利用者意思として再利用しない。Core は処理単位の正しい Profile パスワードを認証し、指定された Account / Software Key に対応する秘密鍵で署名し、署名結果を返却する。Profile パスワードが正しいことだけでは利用者の署名承認済みとはみなさない。Core は Transaction の意味判断、利用者への説明、内容確認 UI または Transaction 構築を担わない。

### UC-007 Profile パスワードを変更する

正しい現在パスワードを必要とする。成功時は Profile 配下すべてを新パスワードで利用可能にし、旧パスワードを無効化する。失敗・中断時に部分変更を残さない。

### UC-008 Software Key / Profile を削除する

個別 Software Key 削除は対象鍵だけを削除する。Profile 削除は Mnemonic と配下の全 Software Key と Profile 自体を Core 管理下から破棄する。いずれも正しい Profile パスワードを必要とし、部分削除を残さない。削除前から利用者が保持している Mnemonic を使い、同一 Network の新しい Profile を再作成することは許可する。これは削除済み Core データの復旧または再利用とは扱わない。

### UC-009 Chain / Network を区別して利用する

同一 Profile 内で Profile の Network に対応する Symbol / NEM 双方の Derived / Imported / Generated Software Key を扱う。Profile は Network を固定するが Chain は固定せず、各 Software Key は Chain に固定される。Account は Software Key をその Chain と Profile Network 上で利用する概念であり、Chain / Network の暗黙変換や不正な組合せは受け付けない。

### UC-010 Binding 経由で Core を利用する

Desktop Application は Native C ABI、Node.js は Node-API Binding、Browser / Browser Extension は WASM Binding、React Native Android / iOS は具体方式を固定しない platform-specific binding boundary から v1 Core 主要機能を利用できる。Binding により Core の責任・認可・秘密情報公開方針は変化しない。Desktop / Node.js / Browser / React Native のホスト環境の侵害を Core が防止する保証はしないが、Core / Binding が不要に秘密情報を公開しない責任は共通に適用する。

### UC-011 Mnemonic / Software Key を個別エクスポートする

対象 Profile の指定、処理単位の正しい Profile パスワード、利用者が秘密情報の取得を明示的に要求したこと、および Application / UI がその意思を確認して Core へ要求することを条件として、Mnemonic の回復 / export または指定 Software Key の秘密鍵 export を行う。単なる API 呼出しや Application がパスワードを保有していることだけでは明示的要求とみなさない。Core は UI を表示せず、利用者意思を推測せず、通常処理から暗黙に export へ遷移しない。

エクスポート対象は要求した秘密情報だけとし、Profile 全体の一括バックアップは提供しない。成功時も Core が保持する Mnemonic / Software Key 原本の継続管理責任は Core に残る。Core 外へ渡されたコピーの表示・保管・利用・紛失防止は受領した Application / 利用者の責任とする。

---

## 5. 機能要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| FR-001 | MUST | Core は新規 Mnemonic 生成または既存 Mnemonic から、未指定でも空でもない Profile パスワードと Mainnet / Testnet を使用して Profile を作成・復元できること。Mnemonic なし Profile を作成しないこと。新規 Mnemonic 生成では、完全な Mnemonic が意図された呼出し元 Application へ渡され、Application が意図された利用者へ提示し、利用者の明示的な受領確認を Application が Core へ伝え、Core がその確認に基づいて Profile 作成を成功状態として確定した場合だけ成功させること。handoff を行わずに新規 Profile を成功させる経路を提供しないこと。受領・提示・確認・完了確認または最終確定のいずれかが失敗・中断・未確認の場合は、新規 Profile または部分状態を成功状態として残さず、Mnemonic を通常結果や診断へ漏らさないこと。既存 Mnemonic の restore はこの生成時 handoff の対象外とし、通常の restore 条件で成功させること。 |
| FR-002 | MUST | Mnemonic を Profile のルート秘密情報として Profile 管理下へ保存すること。 |
| FR-003 | MUST | 保存済み Mnemonic から Profile の Network と指定 Chain に対応する Derived Software Key を導出し、§3.3 の妥当性確認に成功した場合だけ保存すること。導出、妥当性確認または保存に失敗した場合は Profile と既存 Software Key を変更しないこと。 |
| FR-004 | MUST | 正しい Profile パスワードを Core が処理単位で認可し、§3.3 の妥当性基準を満たした外部秘密鍵だけを Imported Software Key として保存すること。認可、妥当性確認または保存に失敗した場合は Profile 状態を変更しないこと。 |
| FR-005 | MUST | 正しい Profile パスワードを Core が処理単位で認可し、§3.3 の妥当性基準を満たした独立生成秘密鍵だけを Generated Software Key として保存すること。認可、生成、妥当性確認または保存に失敗した場合は Profile 状態を変更しないこと。 |
| FR-006 | MUST | Mnemonic と全 Software Key を暗号化保存対象とし、平文で永続保存しないこと。 |
| FR-007 | MUST | 秘密情報を必要とする処理ごとに Profile パスワードで認証し、継続的・永続的な Unlocked 状態を外部へ提供しないこと。Application が unlock session を保持する方式を提供せず、認証結果を次の秘密情報処理へ持ち越さないこと。 |
| FR-008 | MUST | Derived / Imported / Generated を同じ秘密鍵利用ライフサイクルで扱うこと。 |
| FR-009 | MUST | UI / Application が利用者へ提示し、現在の署名操作について明示的に承認した署名要求だけを対象とし、過去に保存した承認済み要求を新しい利用者意思として再利用せず、Core が指定 Chain、Account / Software Key、処理単位の Profile パスワード、署名対象データから署名を生成し、`symbol-sdk` 3.3.2 と互換な外部検証結果を返却すること。正しいパスワードだけで利用者の署名承認済みとはみなさず、Profile の Network と要求の Chain / Network が矛盾する処理を許可しないこと。Core は Transaction の意味説明、利用者意思の確認および UI を担わないこと。 |
| FR-010 | MUST | 正しい現在パスワードを要求して Profile パスワードを変更でき、失敗・中断時に部分変更を残さないこと。 |
| FR-011 | MUST | 正しい Profile パスワードを要求して個別 Software Key を削除でき、失敗・中断時に部分適用を残さないこと。 |
| FR-012 | MUST | 正しい Profile パスワードを要求して、Profile、Mnemonic、全 Software Key を Core 管理下から破棄でき、成功時に返す replacement Store でも対象秘密情報が削除済みであり、失敗・中断時に部分削除を残さないこと。Core の deletion guarantee は Application が current Store として正しく選択した committed state および成功 replacement の状態に適用する。Core は返却済みの過去 Store を永続記憶せず、Application が提示する valid historical Store が削除前の snapshot であることを単独で検出・拒否する保証を持たない。削除前から利用者が保持する Mnemonic を使った同一 Network の新しい Profile 作成は、削除済み Profile の復旧・再利用とはみなさず許可すること。 |
| FR-013 | MUST | Profile を Chain に固定せず、Network は固定し、Software Key は指定 Chain に固定すること。指定 Chain と Profile Network に対応する Derived / Imported / Generated Software Key の公開鍵・アドレス・署名結果を扱い、Chain / Network を暗黙に別の値へ変換しないこと。 |
| FR-014 | MUST | Mnemonic 生成、秘密鍵導出、暗号化を含む Profile / Software Key の管理責任、認証、保存、削除およびライフサイクルを Symbol / NEM で共通の Core 管理方針として扱うこと。ただし Chain 固有の鍵・アドレス・署名処理まで同一仕様とみなさないこと。 |
| FR-015 | MUST | Profile 作成時に Mainnet / Testnet を必須指定し保存すること。 |
| FR-016 | MUST | Profile の Network を作成後変更できないこと。 |
| FR-017 | MUST | Core が生成・維持する、本要件・仕様に適合した整合した Store を対象として、同一 Mnemonic + 同一 Network の Profile 重複登録を拒否し、異なる Network なら別 Profile を許可すること。Core は入力された Store の validity、authentication / integrity および consistency を処理するが、過去に返した Store snapshot を記憶して currentness や historical rollback を判定しない。 |
| FR-018 | MUST | 同一 Profile 内かつ同一 Chain で同一秘密鍵に対応する Software Key の重複登録を由来をまたいで拒否すること。異なる Chain では同一秘密鍵に対応する Software Key を別 Software Key として許可すること。 |
| FR-019 | MUST | Native C ABI / Node-API / WASM Binding から Profile 作成・復元、初回 Mnemonic バックアップ受渡し、Profile / 公開情報取得、追加導出、秘密鍵インポート、Software Key 生成、署名、パスワード変更、Software Key 削除、Profile 削除、Mnemonic の個別エクスポート、Software Key 秘密鍵の個別エクスポートを利用できること。React Native Android / iOS からも、具体方式を固定しない platform-specific binding boundary を介して同等の v1 Core 主要機能を利用できること。新規 Profile 作成は FR-001 の生成時 handoff 成立条件を満たすことを条件とし、restore は生成時 handoff confirmation の対象外とし、Profile 全体の一括バックアップ・復旧は含めないこと。 |
| FR-020 | MUST | Profile 作成・パスワード変更で未指定・空・Core 内部既定値の Profile パスワードを拒否すること。パスワード品質条件は上位 Application / Package の責任とし、Core は独自に要求しないこと。 |
| FR-021 | MUST | Mnemonic は生成、復元および取込みのすべてで §3.2 の BIP-0039（英語 24 語）基準を満たした値だけを登録・利用すること。Software Key は生成、取込みおよび HD Wallet からの導出のすべてで §3.3 の妥当性基準を満たした値だけを登録・利用すること。各経路の失敗時に不完全状態を登録せず、既存 Profile と既存 Software Key を変更しないこと。 |
| FR-022 | MUST | Core は、対象 Profile の指定、処理単位の正しい Profile パスワード、利用者の秘密情報取得に関する明示的要求、および Application / UI による意思確認を伴う要求に対して、保存済み Mnemonic を個別にエクスポートできること。単なる API 呼出しやパスワード所有だけでは明示的要求とみなさないこと。誤認証、意思確認のない要求、対象不存在または処理失敗時は Mnemonic を返さず、Profile 状態を変更しないこと。成功後も Core 内の Mnemonic 原本は Core が継続管理し、Core 外へ渡されたコピーの保護・保存・利用責任は受領側へ移ること。 |
| FR-023 | MUST | Core は、対象 Profile / Software Key の指定、処理単位の正しい Profile パスワード、利用者の秘密情報取得に関する明示的要求、および Application / UI による意思確認を伴う要求に対して、指定 Software Key の秘密鍵を個別にエクスポートできること。単なる API 呼出しやパスワード所有だけでは明示的要求とみなさないこと。誤認証、意思確認のない要求、対象不存在または処理失敗時は秘密鍵を返さず、Profile 状態を変更しないこと。成功後も Core は原本の継続管理責任を保持し、Core 外へ渡されたコピーの保護・保存・利用責任は受領側へ移ること。 |
| FR-024 | MUST | unsupported Chain、unsupported Network、Profile Network と要求 Network の不一致、Software Key の固定 Chain と要求 Chain の不一致、および不正な Chain / Network 組合せを拒否すること。拒否時は Profile 状態と既存 Software Key を変更せず、Software Key を登録せず、秘密情報を返さず、別 Chain / Network へ fallback または暗黙変換しないこと。具体的な Chain 識別子、Network 識別子および導出規則は仕様へ委譲すること。 |

---

## 6. 非機能要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| NFR-001 | MUST | Desktop Application / Node.js / Browser / Browser Extension / React Native Android / React Native iOS が対応 Binding 経由で共通 Core を利用し、秘密鍵処理を各 Application で再実装しないこと。 |
| NFR-002 | MUST | Core、Binding、Application の実装・レビュー・保守責任を区別でき、Binding が Core 責任や外部責任を重複実装しないこと。 |
| NFR-003 | MUST | Core、Binding、UI / Application、上位 Application / Package の責任境界を第三者が説明できること。 |
| NFR-004 | MUST | Desktop Application / Node.js / Browser / Browser Extension / React Native Android / React Native iOS の違いによって、秘密情報管理方針、認可責務、責任境界および Core の通常処理での非開示原則が変わらないこと。 |
| NFR-005 | SHOULD | Core の自動検証では、行・関数カバレッジ90%以上、分岐カバレッジ85%以上を目標とし、未達時は未カバー範囲、理由および影響を確認可能にすること。カバレッジ率だけで仕様適合性、セキュリティまたは相互運用性を合格判定しないこと。 |
| NFR-006 | MUST | Wallet Core は Desktop、Node.js、Browser、Browser Extension、React Native Android および React Native iOS を v1 の対象 runtime / platform として、同一 Rust Wallet Core の対象機能を利用可能にすること。Browser Extension は Browser runtime の利用形態として扱い、Browser と同じ Core の責任境界を適用すること。 |
| NFR-007 | MUST | React Native 対応を理由に repository を分割せず、`nemnesia/symbol-nem-wallet-core` を単一 repository として維持すること。npm consumer 向け公開 package は `@nemnesia/symbol-nem-wallet-core` に統一し、React Native 専用 npm package を新設せず、platform-specific implementation を単一 package 内の責任として扱うこと。内部ディレクトリ構造、build artifact および package exports の具体形式は本要件で固定しないこと。 |
| NFR-008 | MUST | 機能的に同一の operation は各対象 runtime / platform で一貫した公開 API 契約により利用できること。Android / iOS の差異だけを理由に application-facing API を分岐させず、共通契約では満たせない明示的な platform / runtime 要求がある場合に限り runtime-specific API を設け、その必要性を正当化すること。React Native 対応だけを理由に既存の公開 API surface を拡張しないこと。現行の synchronous public contract は compatibility baseline とするが、React Native の安全性、responsiveness または resource boundedness を犠牲にしてまで同期性を強制しないこと。同期契約を安全に維持可能かを、測定可能な evidence により評価できること。async 化または runtime-specific divergence が必要な場合は、対象 operation、影響範囲および compatibility impact を明示し、user decision なしに public API semantics を変更しないこと。runtime ごとに黙って同期 / 非同期 semantics を分岐させないこと。 |
| NFR-009 | MUST | cryptographic operation、key derivation、signing、Wallet Store processing、private key handling、Mnemonic handling および secret zeroization 等の security-sensitive processing は既存 Rust Core の責任境界に維持すること。React Native binding は platform integration、データ受渡しおよび invocation boundary を担うが、同等の暗号ロジックまたは security-sensitive business logic の authoritative implementation を新たに持たず、入力・出力検証を bypass しないこと。 |
| NFR-010 | MUST | unsupported platform / runtime、native binding の初期化・load・invocation failure および security-sensitive operation の failure を fail-closed に扱い、silent fallback、未定義動作または成功として扱わないこと。failure は application が成功と区別して識別でき、platform 差異によって error semantics を不必要に変えないこと。exact error code、error class および mapping は仕様へ委譲すること。 |
| NFR-011 | MUST | React Native 対応の追加により、既存の Node.js runtime と Node.js 22.x / 24.x の support / verification policy、Browser runtime、Browser Extension use case、WASM behavior、native Node behavior、public API compatibility、security boundary および既存 release / supply-chain guarantees を退行させないこと。既存 runtime の routing または fallback の変更が必要となる場合は、採用前に明示的な互換性影響評価を行うこと。 |
| NFR-012 | MUST | 各対象 runtime / platform のサポート対象 version を support matrix として明示し、CI または release gate でその matrix の適合性を検証可能にすること。Node.js の version policy は既存 npm / release contract を継承し、`engines.node >=22.0.0`、Node.js 22.x の minimum / support line および Node.js 24.x の primary verification line を変更または再オープンしないこと。minimum React Native version、minimum Android API level、minimum iOS version および supported browser baseline の具体値は、本要件の更新時点では固定しないこと。 |
| NFR-013 | MUST | React Native Android / iOS の supported CPU architecture、device / simulator を含む対象 architecture matrix を明示し、CI または release gate で検証可能にすること。arm64、x86_64、legacy ARM その他の具体 target の採否は、本要件の更新時点では固定しないこと。 |
| NFR-014 | MUST | Node.js、Browser および Browser Extension の consumer に React Native 固有設定を文書化された通常利用経路の前提として要求せず、React Native consumer に Node.js native addon または Browser / WASM runtime を文書化された通常利用経路として要求しないこと。各 consumer が同一 package から対象 runtime / platform に対応した Core 利用経路を選択できること。 |
| NFR-015 | MUST | React Native で高コストとなる可能性がある operation について、execution cost、JS runtime thread の blocking behavior、responsiveness impact、bounded input / Store size との関係、cancellation / interruption の可能性および failure 時の cleanup を、代表的な実行環境と入力条件で downstream の prototype、benchmark または実測により検証可能にすること。対象には password KDF、Wallet Store の encrypt / decrypt、Mnemonic seed / derivation、key derivation、signing および大きな Store processing を含め得るが、これらが常に高コストであるとは仮定しないこと。具体的な閾値、device 名、queue / worker、timeout および cancellation API は仕様・実装・性能検証へ委譲する。同期実行が安全な responsiveness、resource boundedness、lifetime / cleanup または必要な interruption semantics を満たせない evidence がある場合、対象 operation の async contract または RN support exclusion は API design / compatibility change として扱い、明示的な user decision なしに採用しないこと。async 化を同期実行の自動 fallback として扱わないこと。 |

---

## 7. セキュリティ要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| SEC-001 | MUST | 保存状態の Mnemonic / Software Key を暗号化対象とし平文永続保存しないこと。 |
| SEC-002 | MUST | 正しい Profile パスワードがない場合、秘密情報処理および Software Key 登録を成功させないこと。認証は処理単位で行い、認証済み Unlocked 状態を次の処理へ持ち越さないこと。 |
| SEC-003 | MUST | 処理後に Mnemonic / 秘密鍵を平文で継続利用可能な状態として保持しないこと。 |
| SEC-004 | MUST | 破損または認証失敗した保存データを正常な秘密情報として利用しないこと。 |
| SEC-005 | MUST | Application が current Store として正しく選択した committed state および Core が削除成功時に返す replacement Store の状態では、Core 管理下から削除済みとなった Software Key / Profile の秘密情報を、Core の署名、導出、登録その他の秘密情報処理へ再利用しないこと。Core は返却済みの過去 Store を永続記憶せず、Application が削除前の valid historical Store を再提示した場合に、それが過去 snapshot であることを単独で検出・拒否する保証を持たない。この current-state / historical rollback の防止は Application / persistence layer の責任とする。malformed、tampered、authentication failure または unsupported version の Store を正常な秘密情報として利用しない保証は SEC-004、DR-009 および SEC-018 に従い維持する。削除前から利用者が保持する Mnemonic を外部入力として新しい Profile へ登録することは、本要件の禁止対象に含めない。 |
| SEC-006 | MUST | Profile パスワード変更は正しい現在パスワードと未指定でも空でもない新パスワードを要求し、成功後は旧パスワードを無効化すること。 |
| SEC-007 | MUST | Core は Profile パスワードを永続保存・継続キャッシュしないこと。上位が一時保持する場合の責任は上位にあること。 |
| SEC-008 | MUST | Profile 削除は正しい Profile パスワードを Core が認可し、認可失敗時は状態を変更しないこと。 |
| SEC-009 | MUST | 個別 Software Key 削除は正しい Profile パスワードを Core が認可し、認可失敗時は状態を変更しないこと。 |
| SEC-010 | MUST | 保存済み Mnemonic / 秘密鍵を通常結果として Application へ返さないこと。新規 Mnemonic 生成直後の FR-001 に定める初回バックアップ受渡し、および対象指定、処理単位の正しい Profile パスワード、利用者の明示的要求、Application / UI の意思確認を伴う個別エクスポートだけを例外とする。初回受渡しまたはエクスポートの失敗・中断時は秘密情報を返却せず、Core / Binding が外部受渡しのための一時的な複製を継続保持しないこと。成功したエクスポート後も Core 内原本の継続管理責任は Core に残り、Core 外のコピーの保護・保存・利用責任は受領側へ移ること。 |
| SEC-011 | MUST | Native C ABI / Node-API / WASM Binding および React Native binding は Mnemonic、秘密鍵、Profile パスワードを永続保存・継続キャッシュせず、別の秘密情報管理主体にならないこと。 |
| SEC-012 | MUST | Native C ABI / Node-API / WASM Binding および React Native binding の境界を通過する秘密情報について、不必要な複製・長期保持を前提とせず、処理終了・失敗・中断時に lifetime を不必要に延長しないこと。具体的な buffer implementation、memory layout、zeroization 方法は仕様設計で決定すること。 |
| SEC-013 | MUST | Profile パスワード紛失時に v1 は復旧・リセットを提供せず、正しいパスワードを必要とする処理を成功させないこと。 |
| SEC-014 | MUST | Profile パスワードを必要とする処理の認可は Core が行い、Binding / Application は認可を代替・回避できないこと。 |
| SEC-015 | MUST | 通常結果、失敗結果、入力エラー、認証失敗、破損データ処理、診断・補助出力へ Mnemonic、秘密鍵、Profile パスワードまたは復元可能表現を含めないこと。SEC-010 の FR-001 に定める初回 Mnemonic 受渡しおよび利用者の明示的要求に基づく個別エクスポートの成功結果だけを例外とし、エラー・診断・補助出力には含めないこと。Core は UI を表示せず、利用者意思を推測せず、通常処理から秘密情報アクセスへ暗黙に遷移しないこと。 |
| SEC-017 | MUST | UI / Application / Native C ABI / Node-API / WASM / React Native binding / 上位側で秘密情報を一時的に扱う場合、取込み・初回バックアップ・利用者が明示的に要求した個別エクスポート等の必要な処理範囲に限定し、外部受渡し・処理のための一時的な複製を成功・失敗・中断後に Core または binding が継続利用可能な状態や診断出力として残さないこと。一時的な仲介は Core 管理下の原本の継続管理責任が Application / UI へ移転したことを意味しない。初回バックアップおよび個別エクスポート後に Core 外へ渡されたコピーの保管・紛失防止・利用は利用者および上位 Application / Package の責任とし、Core は失われた Mnemonic または秘密鍵を復旧しない。 |
| SEC-018 | MUST | Profile 作成（新規 Mnemonic の初回受渡しを含む）、Derived / Imported / Generated Software Key 登録、Profile パスワード変更、Software Key 削除、Profile 削除を、Native C ABI / Node-API / WASM / React Native binding のいずれの境界から呼び出しても外部観測上 atomic / fail-closed に扱い、導出、生成、検証、認証、保存、受渡しまたは削除の失敗・中断時に不完全な秘密情報、部分適用または部分 Profile を成功状態として残さないこと。既存 Profile と既存 Software Key を壊さず、失敗時に秘密情報を返さないこと。 |
| SEC-019 | MUST | 認証、署名、導出、Software Key 登録・削除、パスワード変更、Profile 削除は要求対象 Profile のみに作用し、他 Profile へ越境しないこと。 |
| SEC-020 | MUST | Desktop Application、Native C ABI、Web Application、Browser Extension、Browser、React Native Android、React Native iOS、OS および host process のいずれの境界も、秘密情報の恒久的な保護境界や host compromise 防止の保証とはみなさないこと。Application、Browser、React Native host、OS または host process の侵害を Core が防止する保証はしない。一方、Core / Binding は環境の違いにかかわらず、通常処理で保存済み Mnemonic / 秘密鍵を外部へ公開せず、不要な秘密情報の返却・共有・保持・ログ出力を行わない責任を負うこと。利用者が明示的に要求した個別エクスポートの成功結果は例外とする。 |
| SEC-021 | MUST | Mnemonic または Software Key 秘密鍵の個別エクスポートは、対象指定、現在の export 操作について利用者が明示的に要求したこと、Application / UI による意思確認、および要求ごとの正しい Profile パスワードを Core が認可した場合だけ成功させること。Application / UI は過去に保存した `Approved`、`Confirmed` または `Requested` を新しい利用者意思として再利用せず、assertion の freshness を管理すること。Core は Application が本当に表示・確認を取得したこと、または assertion が fresh であることを独立には証明しない。単なる API 呼出しやパスワード所有だけでは利用者の明示的要求とみなさないこと。誤ったパスワード、意思確認のない要求、対象不存在または処理失敗では秘密情報を返さず、Profile 状態を変更しないこと。v1 Core に challenge、nonce、expiry または one-shot token による assertion freshness 機構を追加することは要求しない。 |
| SEC-022 | MUST | Profile パスワードの正しさと、利用者が指定 Transaction への署名を明示的に承認したことを別の security property とすること。UI / Application は現在の署名操作について署名対象内容を利用者へ提示して明示的承認を得た要求だけを Core へ送る責任を負い、過去に保存した承認済み assertion を新しい利用者意思として再利用せず、assertion の freshness を管理すること。Core は Application が本当に表示・承認を取得したこと、または assertion が fresh であることを独立には証明しない。Core はその要求を受けて指定 Account / Software Key を利用し署名するが、Transaction の意味説明、利用者意思の推測または確認 UI を担わないこと。v1 Core に challenge、nonce、expiry または one-shot token による assertion freshness 機構を追加することは要求しない。 |
| SEC-023 | MUST | Core 自身が実装・管理する秘密情報処理では、secret-dependent control flow、secret-dependent timing behavior または secret-dependent data access を不必要に導入しないこと。この要件は Core 自身の責任範囲に適用し、third-party cryptographic library の内部、compiler、runtime、OS、browser、hardware または CPU microarchitecture における完全な side-channel absence を保証対象に含めない。特定の constant-time library、assembly inspection、third-party library fork、zeroize technique、compiler option または side-channel test tool は本要件で固定せず、具体方式および検証は Specification / Implementation / Release verification へ委譲すること。 |

---

## 8. データ要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| DR-001 | MUST | Profile は Network、1 つの Mnemonic、0 個以上の Derived / Imported / Generated Software Key を持つこと。 |
| DR-002 | MUST | Mnemonic を Profile のルート秘密情報として全 Software Key と同じ秘密情報管理対象にすること。 |
| DR-003 | MUST | Profile 配下の Mnemonic / Software Key を同一 Profile パスワード保護対象とし、個別鍵パスワードを持たないこと。 |
| DR-004 | MUST | Software Key の由来を区別可能としても基本的な秘密鍵利用処理は同じライフサイクルで扱うこと。 |
| DR-005 | MUST | Profile は Network を固定し Chain には固定せず、Software Key は Chain を固定すること。Account は Software Key を対象 Chain と Profile Network 上で利用する概念とし、各 Software Key の指定 Chain / Profile Network に対応する公開情報・署名結果を扱うこと。Chain / Network の暗黙変換や不正な組合せを許可しないこと。 |
| DR-006 | MUST | Profile 重複は Mnemonic + Network の組み合わせで判定すること。 |
| DR-007 | MUST | 同一 Profile 内かつ同一 Chain では同一秘密鍵を重複管理しないこと。異なる Chain では同一秘密鍵を別 Software Key として管理できること。 |
| DR-008 | MUST | Symbol / NEM の秘密鍵・公開鍵、アドレス、署名および Network 処理結果は `symbol-sdk` 3.3.2 と互換であること。HD Wallet の復元互換性は、本仕様で固定した導出規則および deterministic fixture との一致を受入基準とすること。特定の既存 Wallet 製品との包括的互換性は v1 の保証対象とせず、名称、version または commit、入力、期待値および fixture を明示した場合に限り、その fixture の範囲で保証すること。 |
| DR-009 | MUST | Core 管理下の Store は、Store / Profile の version を識別できること。v1 Core は v1 が明示的に対応すると定めた version だけを処理し、Store / Profile の version migration 機能を提供しない。unsupported または unknown version、破損または整合しないデータを黙って解釈・無視・fallback せず、正常な秘密情報として利用しないこと。対応 version 内の未知データは、その意味を推測して処理しないこと。非意味的な将来拡張として安全に保持できる場合は保持し、未知の意味を持つ値や安全に保持できない変更は拒否すること。保存データは同じ論理値から deterministic で安定した結果を得られ、対応範囲で相互運用可能であること。既存 version の意味を後から変更して migration とみなさないこと。v1 より後に migration を提供する場合は、将来 version の Requirements / Design / Specification で source version、target version、明示的な開始、target version として利用可能になったことを外部から判定できる成功および失敗時の既存状態不変を新たに定義し、通常結果への秘密情報漏えいを許さないこと。具体的な保存表現、未知値の表現および migration 手順は仕様へ委譲すること。 |

---

## 9. 受け入れ条件

| ID | 対応 | 受け入れ条件 |
| --- | --- | --- |
| AC-001 | FR-001, FR-015, FR-020, DR-001 | 未指定・空・Core 既定値でない Profile パスワードと Network でのみ Profile を作成でき、Mnemonic なし Profile を作成しない。すべての新規 Mnemonic 生成では、(1) 完全な Mnemonic が意図された呼出し元 Application へ渡り、(2) Application が意図した利用者へ提示し、(3) 利用者が受領を明示的に確認し、(4) Application がその確認成立を Core へ伝え、(5) Core がその確認に基づき Profile 作成を成功状態として確定した場合だけ成功する。handoff を行わない新規生成経路は提供せず、いずれかが失敗・中断・未確認の場合は新規 Profile または部分状態を成功状態として残さない。既存 Mnemonic の restore では、指定 Mnemonic、password、Store、duplicate 等の通常条件で Profile を作成でき、生成時の handoff confirmation は要求しない。 |
| AC-002 | FR-002, FR-006, DR-002, SEC-001 | 保存 Mnemonic は暗号化対象であり平文永続保存されない。 |
| AC-003 | FR-003, DR-005, DR-007, FR-024 | 正しいパスワード、Profile Network、指定 Chain から Derived Software Key を導出・妥当性確認・保存でき、同一 Chain の重複鍵を追加しない。導出、妥当性確認または保存に失敗した場合は Profile、既存 Software Key および秘密情報を変更しない。 |
| AC-004 | FR-004, FR-018, FR-021, FR-024 | 認可・妥当性確認・保存に成功した Imported Software Key だけを登録し、失敗時は Profile、既存 Software Key および秘密情報を変更しない。 |
| AC-005 | FR-005, FR-018, FR-021, FR-024 | 認可・生成・妥当性確認・保存に成功した Generated Software Key だけを登録し、失敗時は Profile、既存 Software Key および秘密情報を変更しない。 |
| AC-006 | FR-006, DR-003, SEC-001 | 全 Software Key が暗号化保存対象であり平文永続保存されない。 |
| AC-007 | FR-007, SEC-002, SEC-003, SEC-007 | 正しいパスワードの場合だけ現在の秘密情報処理が成功し、終了後に継続・永続 Unlocked 状態、Application の unlock session または次の処理へ持ち越される認証結果を残さない。 |
| AC-008 | FR-008, DR-004 | Derived / Imported / Generated の由来にかかわらず同じ秘密鍵利用ライフサイクルで処理できる。 |
| AC-009 | FR-009, SEC-022, DR-008 | UI / Application が利用者へ提示し明示的に承認した署名要求だけが Core へ送られ、Core が処理単位の正しいパスワードで指定 Account / Software Key を利用して署名する。署名結果が指定 Chain / Network に対する `symbol-sdk` 3.3.2 と互換な外部検証結果となり、パスワードの正しさだけを利用者承認の根拠としない。 |
| AC-010 | FR-010, SEC-006 | パスワード変更成功後は新パスワードだけで秘密情報を利用できる。 |
| AC-011 | FR-011, SEC-009 | 個別 Software Key 削除で対象だけを削除し Profile / Mnemonic / 他鍵を保持する。認可失敗時は変更しない。 |
| AC-012 | FR-012, SEC-005, SEC-008 | Application が current Store として正しく選択した状態の Profile 削除では、Core が Profile、Mnemonic、全 Software Key を破棄し、削除成功時の replacement Store に対象秘密情報を残さず、認可失敗時は変更しない。削除前から利用者が保持する Mnemonic を使って同一 Network の新しい Profile を作成することは許可され、削除済み Core データの復旧・再利用とは扱わない。 |
| AC-013 | FR-013, DR-005, FR-024 | Derived / Imported / Generated すべてで指定 Chain / Profile Network の公開鍵・アドレス・署名結果を扱え、Profile Network と要求 Network または Software Key の固定 Chain と要求 Chain が不一致の要求を拒否する。 |
| AC-014 | FR-014 | Symbol / NEM の Profile / Software Key について、Core による管理責任、認証、保存、削除およびライフサイクルを共通に扱える。ただし Chain 固有の鍵・アドレス・署名処理は各基準に従う。 |
| AC-015 | NFR-001, NFR-002 | Desktop Application / Node.js / Browser / Browser Extension から対応する Binding 経由で共通 Core を利用でき、Core と Application の責任を区別できる。Node.js は Node-API Binding を使用し、独立した Wallet Core 実装を使用しない。React Native Android / iOS は本書で方式を固定しない binding boundary から共通 Core を利用する。 |
| AC-016 | NFR-003 | Core、Binding、Application、上位 Package の秘密情報・パスワード責任を第三者が説明できる。 |
| AC-017 | SEC-004 | 破損・認証失敗データで秘密情報処理が成功しない。 |
| AC-018 | FR-001, FR-017, DR-006, DR-009, SEC-004 | Core が生成・維持する、要件・仕様に適合した整合した Store では、同一 Mnemonic + 同一 Network の重複 Profile 作成を拒否し、異なる Network は別 Profile として作成できる。破損、unsupported version、認証失敗または整合しない Store は正常データとして扱わず、黙って解釈・無視・fallback せず、読込み失敗時に既存状態を変更しない。未知データの意味を推測して処理せず、対応 version の拡張を安全に保持できない変更は拒否する。Profile 削除後に利用者が保持する同一 Mnemonic + 同一 Network から新しい Profile を作成することは、削除済み Core データの再利用ではないため許可する。Core は、valid historical Store が過去 snapshot であることを理由に単独で拒否することを保証せず、その再適用防止と current Store の選択は Application / persistence layer が担う。 |
| AC-019 | FR-016, DR-005 | Profile Network を作成後変更できない。 |
| AC-020 | FR-018, DR-007 | 同一 Profile・同一 Chain では同一秘密鍵を別由来または再導出で重複登録しない。異なる Chain では同一秘密鍵を異なる Software Key として登録できる。 |
| AC-021 | FR-019, NFR-001 | Desktop Native C ABI から v1 主要機能を利用できる。 |
| AC-022 | FR-019, NFR-001 | React Native Android / iOS application から、方式を固定しない platform-specific binding boundary を介して v1 主要機能を利用でき、同一 Rust Wallet Core の処理を使用する。React Native が Native C ABI を直接利用することは本要件から導かず、内部 implementation path は下流へ委譲する。 |
| AC-023 | NFR-002 | Binding が Core 責任、Wallet 固有ロジック、Network、Transaction 構築を独自実装しない。 |
| AC-024 | NFR-004, SEC-020 | Desktop Application / Node.js / Browser / Browser Extension / React Native Android / React Native iOS で Core の秘密情報管理・認可・責任境界・通常処理での非開示原則が同じである。Application、Browser、React Native host、OS、Node.js または host process の侵害を Core が防止する保証とは区別する。 |
| AC-025 | SEC-010, SEC-021 | 通常処理結果として秘密鍵を Application へ返さない。対象指定、処理単位の正しいパスワード、利用者の明示的要求および Application / UI の意思確認を伴う個別エクスポートの成功結果だけを例外とし、成功後のコピーの保護・保存・利用は受領側責任、Core 内原本の継続管理は Core の責任とする。 |
| AC-026 | SEC-010, SEC-021 | 保存済み Mnemonic を通常処理結果として Application へ返さない。対象指定、処理単位の正しいパスワード、利用者の明示的要求および Application / UI の意思確認を伴う個別エクスポートの成功結果だけを例外とし、成功後のコピーの保護・保存・利用は受領側責任、Core 内原本の継続管理は Core の責任とする。 |
| AC-027 | SEC-011 | 処理後に Core / Binding が Profile パスワードを永続保存・継続キャッシュしない。 |
| AC-028 | SEC-012 | Binding 境界で不要な秘密情報複製・長期保持を前提としない。 |
| AC-029 | FR-020 | 未指定・空・Core 既定値の Profile パスワードで Profile 作成・パスワード変更が成功しない。Core は品質ポリシーを独自判定しない。 |
| AC-030 | SEC-013 | パスワード紛失時に復旧・リセット、秘密情報処理、パスワード変更、削除が成功しない。 |
| AC-031 | SEC-014 | Binding / Application の要求だけでは認可できず、Core が正しい Profile パスワードを認可する。 |
| AC-032 | SEC-015 | 初回 Mnemonic バックアップおよび明示的な個別エクスポートの成功結果を除き、外部出力・診断へ秘密情報または復元可能表現を含めない。エクスポートの失敗結果・診断出力には含めない。 |
| AC-033 | DR-008 | Symbol / NEM の鍵・公開鍵・アドレス・署名・Network の互換性を `symbol-sdk` 3.3.2 と比較して判定できる。HD 復元互換性は仕様で固定した導出規則および deterministic fixture により判定する。特定の既存 Wallet 製品との互換性は、名称、version または commit、入力、期待値および fixture を明示した範囲に限り判定する。 |
| AC-034 | FR-001, FR-019, SEC-010, SEC-017, SEC-018 | すべての新規 Mnemonic 生成時の初回 handoff は、(1) Core が完全な Mnemonic を意図された呼出し元 Application へ渡し、(2) Application が意図した利用者へ提示し、(3) 利用者が受領を明示的に確認し、(4) Application が確認成立を Core へ伝え、(5) Core がその確認に基づいて Profile 作成を成功状態として確定した場合だけ成功する。Core が生成したことだけ、Application が呼出しを行ったことだけ、handoff の未確認、受領不能、提示不能、利用者の拒否または確認未取得、完了確認不能、handoff の中断、最終確定処理の失敗では、新規 Profile または部分状態を成功状態として残さず、不要な宛先へ公開せず、途中内容をログ・診断情報へ残さない。handoff を行わずに新規 Profile を成功させる経路は提供しない。既存 Mnemonic の restore はこの handoff confirmation の対象外であり、受渡し後の保管・紛失防止は利用者および上位 Application / Package の責任とし、保存済み Mnemonic の通常取得には使用しない。 |
| AC-035 | FR-004, FR-005, FR-021, §3.2, §3.3 | Mnemonic の生成・復元・取込みには BIP-0039（英語 24 語）基準を、Software Key の生成・取込み・HD Wallet からの導出には §3.3 の基準を一貫して適用し、Core が妥当性を判定する。失敗時に不完全状態、既存 Profile 変更または秘密情報返却を残さない。 |
| AC-037 | SEC-017 | 一時的に扱った秘密情報を成功・失敗・中断後に継続利用可能状態または診断出力として残さない。 |
| AC-038 | SEC-018 | Profile 作成、Derived / Imported / Generated Software Key 登録、パスワード変更・鍵削除・Profile 削除は成功時に全体反映し、失敗時に外部観測上の部分適用、不完全な秘密情報または既存データの破壊を残さない。 |
| AC-039 | SEC-019 | 1 つの Profile 操作が他 Profile の秘密情報・認証状態・利用可否・削除結果へ影響しない。 |
| AC-040 | FR-019, NFR-004, SEC-020 | Web / Browser Extension から WASM Binding 経由で v1 主要機能を利用でき、Native と同じ秘密情報管理・認可方針が適用される。ホスト環境の侵害防止保証とは区別する。 |
| AC-041 | FR-022, SEC-010, SEC-021 | 対象 Profile、利用者の明示的要求、Application / UI の意思確認および正しい Profile パスワードで Mnemonic を個別エクスポートでき、誤パスワード・意思確認のない要求・対象不存在・処理失敗時は Mnemonic を返さず Profile 状態を変更しない。成功後も Core 内原本は Core が継続管理し、Core 外のコピーは受領側が保護する。 |
| AC-042 | FR-023, SEC-010, SEC-021 | 対象 Profile / Software Key、利用者の明示的要求、Application / UI の意思確認および正しい Profile パスワードで Software Key の秘密鍵を個別エクスポートでき、誤パスワード・意思確認のない要求・対象不存在・処理失敗時は秘密鍵を返さず Profile 状態を変更しない。成功後も Core 内原本は Core が継続管理し、Core 外のコピーは受領側が保護する。 |
| AC-043 | FR-019, SEC-017, SEC-020 | Native / Node-API / WASM Binding は個別エクスポート結果を Application へ受け渡せるが、秘密情報を継続保持・キャッシュ・ログ出力せず、Profile 全体の一括バックアップ機能を提供しない。 |
| AC-044 | NFR-005 | Core の行・関数・分岐カバレッジの計測結果を確認でき、目標未達の場合は未カバー範囲、理由および影響が記録されている。重要な仕様・セキュリティ・相互運用性・異常系の未検証を、カバレッジ目標達成だけで合格扱いしない。 |
| AC-045 | DR-009, SEC-004 | v1 Core が Store / Profile の version を識別し、明示的に対応する version だけを処理できる。v1 では version migration を提供せず、unsupported または unknown version、破損または整合しないデータを正常データとして利用しない。暗黙 migration、Application による独自の読み替えを前提とした処理、黙った解釈・無視・fallback を行わず、拒否時に既存状態を変更しない。未知データの意味を推測せず、非意味的な将来拡張として安全に保持できない変更を拒否し、対応範囲で deterministic かつ相互運用可能な保存結果を確認できる。既存 version の意味を後から変更して migration とみなさない。将来 migration を提供する場合は、別途定義された source / target version、明示的な開始、target version として利用可能になったことを外部から判定できる成功および失敗時の既存状態不変を満たし、通常結果へ秘密情報を漏らさない。 |
| AC-046 | FR-003, FR-021, SEC-018 | HD Wallet からの Software Key 導出、妥当性確認、登録または保存のいずれかが失敗・中断した場合、不完全な Software Key、部分変更、既存 Software Key の破壊または秘密情報返却を残さず、外部観測上 fail-closed に扱う。 |
| AC-047 | FR-024, DR-005 | unsupported または不整合な Chain / Network、Profile Network と要求 Network の不一致、Software Key の固定 Chain と要求 Chain の不一致を拒否し、Profile、Software Key および秘密情報を変更・返却せず、別 Chain / Network へ fallback または暗黙変換しない。 |
| AC-048 | FR-012, FR-017, SEC-005, SEC-018 | Application / persistence layer が current Store を選択・保存し、Core が成功時に返した replacement Store を適用し、stale / historical Store の再適用を防止する。Core は過去に返した Store を記憶せず、valid historical Store の freshness または rollback を単独で検出・拒否しない。current Store として正しく選択された状態で削除が成功した場合、Core の committed state と成功 replacement Store から対象秘密情報を再利用できない。malformed、tampered、authentication failure または unsupported version の fail-closed は SEC-004、DR-009 および SEC-018 に従い維持する。 |
| AC-049 | SEC-023 | Core 自身が実装・管理する秘密情報処理に、不要な secret-dependent control flow、timing behavior または data access が導入されていないことを確認できる。third-party cryptographic library、compiler、runtime、OS、browser、hardware または CPU microarchitecture 内部の完全な side-channel absence はこの受入条件の保証対象外であり、具体方式・検証方法は下流へ委譲する。 |
| AC-050 | FR-009, SEC-021, SEC-022 | Application / UI が現在の handoff、export または signing operation に対する利用者の確認・承認を取得し、過去に保存した `Approved`、`Confirmed` または `Requested` を新しい利用者意思として再利用しない。Core は operation ごとの password authorization、request target / payload / AccountContext と assertion の仕様どおりの検証、pending の未確認状態からの非昇格を行うが、Application が実際に表示・確認したことや assertion freshness を独立には証明しない。retry / restart で Core 内 authorization を暗黙継承せず、v1 Core は challenge、nonce、expiry または one-shot token を追加しない。 |
| AC-051 | NFR-006, NFR-014, FR-019 | React Native Android application から、platform-specific binding boundary を介して Wallet Core の v1 対象 operation を利用できる。利用経路は同一 Rust Wallet Core の処理を使用し、Node.js native addon または Browser / WASM runtime を通常経路として要求しない。 |
| AC-052 | NFR-006, NFR-014, FR-019 | React Native iOS application から、platform-specific binding boundary を介して Wallet Core の v1 対象 operation を利用できる。利用経路は同一 Rust Wallet Core の処理を使用し、Node.js native addon または Browser / WASM runtime を通常経路として要求しない。 |
| AC-053 | NFR-007 | repository が `nemnesia/symbol-nem-wallet-core` の単一 repository として維持され、npm consumer 向け公開 package が `@nemnesia/symbol-nem-wallet-core` に統一されている。React Native 専用 npm package がなく、内部ディレクトリ構造・build artifact・package exports の具体形式をこの受入条件だけで固定しない。 |
| AC-054 | NFR-008 | React Native Android / iOS の機能的に同一の operation が、既存 runtime と一貫した application-facing API 契約で利用できる。Android / iOS の差異だけによる不要な API 分岐または React Native 対応だけを理由とする不要な公開 API 拡張がなく、runtime-specific API の必要性を説明できる。 |
| AC-055 | NFR-009, SEC-011, SEC-012, SEC-017 | React Native binding に cryptographic operation、key derivation、signing、Wallet Store processing、private key handling、Mnemonic handling または secret zeroization の authoritative implementation がなく、Core の validation を bypass しない。秘密情報を不要に複製・長期保持せず、成功・失敗・中断後に継続利用可能な状態または診断出力として残さない。 |
| AC-056 | NFR-010 | unsupported platform / runtime、native binding の初期化・load・invocation failure および security-sensitive operation の failure が成功として観測されず、silent fallback または未定義動作にならない。application が failure を成功と区別して識別でき、exact error code / class / mapping は仕様で確認可能である。 |
| AC-057 | NFR-011 | Node.js、Browser、Browser Extension、WASM、native Node および既存 public API / security boundary / release・supply-chain guarantee の React Native 対応前後の互換性を確認できる。既存 runtime の routing / fallback を変更する場合は、変更を適用する前に互換性影響評価が存在する。 |
| AC-058 | NFR-012 | Node.js、Browser、Browser Extension、React Native Android / iOS および既存 Desktop target ごとの supported version が support matrix に明示され、CI または release gate で適合性を判定できる。Node.js は既存 contract の `engines.node >=22.0.0`、Node.js 22.x minimum / support line および Node.js 24.x primary verification line を継承し、未確定として扱わない。minimum React Native version、minimum Android API level、minimum iOS version および browser baseline の具体値は、別途決定されるまで未確定として扱う。 |
| AC-059 | NFR-013 | React Native Android / iOS の device / simulator を含む supported CPU architecture matrix が明示され、CI または release gate で適合性を判定できる。arm64、x86_64、legacy ARM その他の具体 target の採否は、別途決定されるまで未確定として扱う。 |
| AC-060 | NFR-014 | Node.js、Browser および Browser Extension consumer が React Native 固有設定なしに同一 package の通常利用経路を使用でき、React Native Android / iOS consumer が Node.js native addon または Browser / WASM runtime を通常利用経路として要求されない。 |
| AC-061 | NFR-008, NFR-015 | React Native の高コストとなる可能性がある operation について、代表的な Android / iOS 実行環境、production-equivalent native build、代表的な Store / input size および合理的な worst-case input class における execution cost、JS runtime thread の blocking、responsiveness、resource behavior、cancellation / interruption および failure cleanup を測定・評価できる。debug build だけを根拠にせず、exact threshold は仕様・性能検証へ委譲する。synchronous public contract を安全に維持できない evidence が確認された場合、対象 operation と影響範囲、compatibility impact および async contract または support exclusion の選択肢が記録されるまで、同期性を黙って強制せず、async 化も user decision なしに採用しない。runtime-specific な sync / async semantics を黙って分岐させない。 |

---

## 10. 状態変更と失敗時整合性

次の状態変更操作は、成功時は要求結果を全体として反映し、保存失敗・処理中断・その他失敗時には外部観測可能な部分適用を成功状態として残さない。削除を含む成功 replacement Store の適用後に current Store として扱う値の選択・保存は Application / persistence layer の責任である。

- Profile パスワード変更
- 新規 Profile 作成・復元（新規 Mnemonic の初回バックアップ受渡しを含む）
- Derived Software Key 登録
- Imported / Generated Software Key 登録
- Software Key 削除
- Profile 削除

Mnemonic / Software Key 秘密鍵の個別エクスポートは状態変更操作ではなく、Store を変更しない。認証・対象確認・返却に失敗した場合も既存 Store を変更しない。

v1 は Store / Profile の version migration 機能を提供しない。Store の読み込みが unsupported または unknown version、破損、整合性不備または未知データの安全な保持不能により失敗した場合は、既存状態を変更せず、未対応データを正常な秘密情報として利用しない。Application が独自に version を読み替えたデータを Core が v1 の正常 Store として解釈することも前提にしない。将来 migration を提供する場合だけ、将来 version の Requirements / Design / Specification で source version、target version、明示的な開始、target version として利用可能になったことを外部から判定できる成功、失敗時の既存状態不変および通常結果への秘密情報非開示を定義する。既存 version の意味を後から変更して migration とみなさず、v1 では migration を自動的・暗黙的に行わない。

要求対象 Profile 以外の秘密情報・認証状態・利用可否へ作用してはならない。

Core は stateless な opaque Store processor として、現在の operation に入力された Store の validity、authentication / integrity、consistency および mutation を処理する。Core は自身が返した過去の Store snapshot を永続記憶せず、valid historical Store が削除・変更前の値であることを単独で検出・拒否する rollback protection を提供しない。Application / persistence layer は current Store の authority として、成功 replacement Store の正しい適用、stale / historical Store の再適用防止および最新版の backup / snapshot 管理を担う。

---

## 11. 未決定事項

Node.js support policy は既存の npm package / release contract を継承し、`NEEDS USER DECISION` ではない。`engines.node >=22.0.0`、Node.js 22.x の minimum / support line および Node.js 24.x の primary verification line は、React Native 対応によって変更または再オープンしない。

次の product support policy は `NEEDS USER DECISION` とする。具体値が決定されるまで、該当 target をサポート済みとして宣言する version / architecture claim は行わない。

- minimum React Native version
- minimum Android API level
- minimum iOS version
- supported browser baseline
- React Native Android の supported CPU architectures（device / simulator、arm64、x86_64、legacy ARM その他を含む対象範囲）
- React Native iOS の supported device / simulator architectures
- React Native New Architecture を必須とするか
- Expo compatibility を保証対象とするか

上記の具体値・採否は、NFR-012 / NFR-013 の support matrix と release gate で検証可能な形にしたうえで、ユーザー判断後に確定する。API、型、保存レコード構造、暗号方式、KDF、salt / nonce、具体的な HD 導出パス値、Binding 実装、メモリ配置、zeroize 方法、署名内容の提示・承認に関する具体的な UI、package exports の exact JSON、error code / error class / mapping および具体的な test command は本書の未決定事項ではなく、要件から仕様・設計・リリース検証へ引き継ぐ事項として扱う。

同期 / 非同期については、単純な方針未決定ではなく、次の条件付き future decision とする。

- 現時点の compatibility baseline は、既存 synchronous public API を React Native でも原則として維持することである。
- NFR-015 / AC-061 の prototype、benchmark または実測 evidence により、対象 operation の synchronous execution が reasonable responsiveness、resource boundedness、safe lifetime / cleanup または必要な cancellation / interruption semantics を満たせないと確認された場合に限り、対象 operation の async contract または React Native support exclusion を再提案できる。
- その場合は対象 operation、evidence、影響範囲、compatibility impact および候補 contract を記録し、async 化の採否を `NEEDS USER DECISION` とする。user decision 前に Promise 化、async 化または runtime ごとの黙った semantics 分岐を行わない。
- native worker への移送、同期 wait、timeout または cancellation の具体方式だけでは async 採用の決定とみなさず、下流の仕様・実測検証へ引き継ぐ。

仕様設計で決定する具体方式は未決定事項ではなく、要件から仕様へ引き継ぐ設計事項として管理する。

---

## 12. 仕様設計への引継ぎ

### 12.1 Chain / HD Wallet

- `symbol-sdk` 3.3.2 と互換な秘密鍵・公開鍵、アドレス、署名、Network 処理
- BIP-0039（英語 24 語）に基づく Mnemonic の入力表現、seed 生成、HD 導出パス、index、Chain / Network 対応の具体方式
- §3.2 / §3.3 の妥当性基準に基づく、Mnemonic の生成・復元・取込みおよび Software Key の生成・取込み・導出の具体的な検証方式
- 仕様で固定した HD 導出規則と deterministic fixture による復元互換性の検証。特定の既存 Symbol / NEM Wallet 製品を追加対象とする場合は、名称、version または commit、入力、期待値および fixture を明示する。

### 12.2 秘密情報保護

- 暗号方式、KDF、salt / nonce、パラメータ
- Vault / 保存形式、再暗号化方式
- Profile パスワード受渡し方式
- メモリ上の秘密情報保持時間、所有権、コピー回数、zeroize / 解放方法
- 生成 Mnemonic の初回 handoff の具体的な方式。すべての新規 Mnemonic 生成において handoff と利用者の受領確認を完了させる外部事実、責任主体、Profile 作成の成功条件および失敗時の扱いは本書で定める。既存 Mnemonic の restore は生成時 handoff の対象外とする。
- Mnemonic 回復 / export、Software Key 秘密鍵 export の認可条件、利用者意思の確認方法および受渡し方式
- handoff、export および signing における assertion の対象結合と、Application / UI が現在の利用者意思に基づく freshness を管理する具体方式。Core が Application の表示・確認または assertion freshness を独立証明しない境界は本書で定める。Core に challenge、nonce、expiry または one-shot token を追加する方式は v1 要件に含めない。
- 署名対象内容の提示、利用者の明示的承認および署名要求の受渡し方式
- Core 自身の秘密情報処理における SEC-023 の side-channel property の具体方式および検証。third-party library、compiler、runtime、OS、browser、hardware および CPU microarchitecture の保証範囲は本書で限定し、具体確認を下流へ委譲する。

Profile パスワードの品質ポリシーそのものは Core 仕様設計の対象外である。

### 12.3 Binding

- Native / Node-API / WASM Binding および React Native Android / iOS binding boundary の外部契約、言語間の値変換、入力・出力検証およびエラー伝播
- Node-API / WASM Binding と JavaScript 境界、React Native binding と application 境界の秘密情報受渡し・コピー・所有権・lifetime・消去
- React Native binding における platform integration、Core invocation、初期化・load・invocation failure、ならびに高コスト operation の execution cost、JS blocking、responsiveness、resource behavior、cancellation / interruption および failure cleanup を測定・評価する具体的な扱い。JSI、TurboModule、Legacy Native Module、JNI、Swift、Objective-C++ その他の採用方式は本書で固定しない。
- Browser 固有 Storage と Application の責任分界。current Store の選択、成功 replacement の適用、stale / historical Store の再適用防止および backup / snapshot の最新版管理は Application / persistence layer の責任とする。
- 対象 OS / Browser / runtime の version、React Native Android / iOS の CPU architecture matrix、ビルド・配布方式。Node.js 22.x / 24.x の version policy は既存 npm / release contract を継承し、React Native 対応のために再定義しない。その他の具体値は NFR-012 / NFR-013 の support matrix と release gate による検証を満たす形で定義する。
- `@nemnesia/symbol-nem-wallet-core` の package exports、runtime / platform resolution、build artifact および package 内部の platform-specific implementation。NFR-007 の単一 repository / package 制約を満たす具体形式を定義する。

### 12.4 状態管理

- Profile / Software Key の識別、データ形式および保存表現
- 重複判定方式
- v1 Store / Profile version の識別、対応 version の拒否境界、未知データの保持または拒否を実現する保存方式。v1 は migration を提供せず、将来 migration の具体方式は将来 version で定義する。
- atomic な Profile 作成、パスワード変更、登録・削除を実現する保存方式。Core の返した replacement Store を current Store として正しく選択・保存する方式、valid historical Store の rollback prevention を上位で提供する場合の方式は Application / persistence layer へ委譲する。
- Profile 間分離を保証する識別・アクセス方式
- カバレッジ計測の対象範囲、除外範囲および継続検証への適用方式

---

---

## 13. 参照資料

| 資料 | 用途 |
| --- | --- |
| `docs/consept/concept-sheet.md` | 上位コンセプト、v1範囲、責任境界 |
| `docs/design/architecture.md` | 要件を実装配置へつなぐ基本設計と責任境界 |
| `packages/wallet-core/package.json` | 現行 npm package の package identity と `engines.node` contract |
| `docs/specifications/npm-typescript-facade.md` | Node.js consumer の minimum / primary verification policy |
| `docs/migration/release-supply-chain-gate.md` | Node.js 22 / 24 consumer の release verification evidence |
| `docs/knowledge/symbol-technicalref-jp.pdf` | Symbolの鍵・署名・Network・アドレス前提 |
| `docs/knowledge/nem-technicalref.pdf` | NEMの鍵・署名・Network・アドレス前提 |
| `docs/reviews/requirements/` | 要件レビュー記録 |

本書を v1 要件の現行正本とする。設計上の判断は `docs/design/` を参照する。
