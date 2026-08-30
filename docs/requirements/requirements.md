# symbol-nem-wallet-core 要件定義書

## 1. 概要

### 1.1 目的

symbol-nem-wallet-core v1 は、Desktop / Mobile / Web の Symbol / NEM ウォレット向けに、Mainnet または Testnet に所属する Profile を秘密情報管理の基本単位とし、Mnemonic と Software Key の生成・復元・導出・取込み・暗号化保存・処理単位の認証・署名・個別エクスポート・削除を Rust Wallet Core へ集約する。

Web には Web Application および Browser Extension を含む。Desktop / Mobile は Native Binding、Web は Web Binding を介して同一 Core を利用する。

### 1.2 上位方針と承認履歴

本書は次を上位根拠および現行の要件正本として扱う。

- `docs/consept/concept-sheet.md`: 製品目的、v1範囲、責任境界
- コンセプトとの追跡: 背景・課題は `docs/consept/concept-sheet.md` §1〜§2、目的は§3、対象利用者・主要利用場面は§4、責任境界は§7〜§8に対応する。

初期承認ベースラインは commit `99fa54bb4bd64ca4ae9ecb7452f91c679a4c5fba`、blob `930d22b30bb1b48126895dd7bdbaedc9bfcb601f` である。現行の統合要件ベースラインは commit `2ef959be4a57cf25623a81edfb7750db161128af`、blob `e6a5eae4a30f357f5b1b40d57be5b51cf2a05330` とし、互換性基準の明確化は commit `b2969dc2011aff7d339848b793b5b5e03088d877`、パスワード品質方針の amendment 取り込みは commit `6eaaa2ba0462e18025d1966c397a4710cea4aedd` から追跡する。

旧要件本文に存在した「独立した承認記録は存在しない」という記述および解消済みの OPEN 項目は現行要件では失効している。本書の確定事項と承認履歴は本文、Git 履歴および `docs/reviews/requirements/` の履歴記録から追跡する。

### 1.3 本書で決定しない事項

API、型、保存レコード構造、暗号方式、KDF、salt / nonce、具体的な HD 導出パス値、Binding 実装、メモリ配置、zeroize 方法、署名内容の提示・承認に関する具体的な UI、対象 OS / Browser バージョン等は本要件書では詳細を定めず、仕様設計またはリリース要件で決定する。

---

## 2. 対象範囲と責任境界

### 2.1 Profile 管理モデル

```text
Profile
├─ Network [Mainnet | Testnet、必須・作成時に固定]
├─ Mnemonic [必須・1つ]
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
Desktop / Mobile Application       Web / Browser Extension
             │                              │
        Native Binding                  Web Binding
             │                              │
             └──────────────┬───────────────┘
                            ▼
                    Rust Wallet Core
```

Native Binding / Web Binding は Core を利用する境界とし、Core と別系統の秘密情報管理、暗号化、署名、導出、Profile パスワード認可を実装しない。

Binding 方式によって Core の秘密情報管理方針、認可責務、秘密情報公開範囲を変更しない。Desktop / Mobile / Web のどの環境でも、Core が保持する責任と通常処理での秘密情報非開示の原則を共通に適用する。

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
- UI / Application: ユーザー操作、公開情報表示、利用する Account の選択、署名対象内容の提示、利用者が署名内容を確認できる状態の提供、利用者からの明示的な署名承認、ウォレット固有設定。承認された署名要求だけを Core へ送る。
- 上位 Application / Package: Profile パスワード品質ポリシー。利便性のためパスワードを一時保持する場合の管理。
- Web Application / Browser Extension: Web 固有の状態、Browser 固有 Storage、ページ / Extension 実行環境のセキュリティ。
- Desktop / Mobile Application、Web Application、Browser、OS、host process: それぞれの実行環境の安全性。Application、Browser、OS または host process の侵害を Core が防止する保証はしない。ただし、Core / Binding が不要に秘密情報を公開しない責任は維持する。
- Network 層: REST、WebSocket、announce 等。
- Transaction 構築層: Transaction の生成・シリアライズ。
- Application / 上流側: 暗号化 Profile データのバックアップ、端末間移行、消失・破損からの復旧を提供する場合の責任。
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
- Node.js 代替実装
- 特定 Wallet Application 専用ロジック
- Application が提供する、保存済み暗号化 Profile データそのもののバックアップ・端末間移行・外部復旧。Core が管理する Store の version 判定、未知・未対応データの安全な扱いおよび明示的 migration 方針は v1 の要件とする。

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

Core が新規 Mnemonic を生成して Profile を作成できる。また既存 Mnemonic、Profile パスワード、Network から Profile を復元・作成できる。

新規生成経路では、利用者が初回バックアップを明示的に要求し、意図された呼出し元 Application への Mnemonic の受渡しが成功した場合だけ Profile 作成を成功させる。受渡しの成功は外部から判定可能でなければならず、失敗・中断時は新規 Profile を正常状態として残さない。Core は紙への記録、外部バックアップの保存、将来の紛失を保証しないため、受渡し後の Mnemonic の保管・紛失防止は利用者および上位 Application / Package の責任とする。

保存済み Mnemonic は通常処理結果として取得せず、対象 Profile、処理単位の正しい Profile パスワードおよび利用者の明示的な要求を伴う UC-011 の場合だけ返却する。

### UC-002 追加アカウントを導出する

保存済み Mnemonic、Profile の Network、指定 Chain、正しい Profile パスワードから秘密鍵を導出し、妥当性確認に成功した Derived Software Key として保存する。導出、妥当性確認または保存に失敗した場合は、Profile や既存 Software Key を部分変更しない。

### UC-003 秘密鍵をインポートする

正しい Profile パスワードを Core が認可した後、妥当な外部秘密鍵を Imported Software Key として既存 Profile へ保存する。認可・検証・保存失敗時は Profile 状態を変更しない。

### UC-004 Software Key を個別生成する

正しい Profile パスワードを Core が認可した後、Core が秘密鍵を生成し Generated Software Key として既存 Profile へ保存する。生成・検証・保存失敗時は Profile 状態を変更しない。

### UC-005 秘密情報を必要とする処理を行う

正しい Profile パスワードを処理ごとに提示した場合のみ秘密情報を一時利用する。v1 は処理をまたぐ継続的・永続的な Unlocked 状態や、Application が保持する unlock session を提供しない。ある処理の認証結果を次の秘密情報処理へ持ち越さない。

### UC-006 Software Key で署名する

UI / Application が利用する Account と署名対象内容を選択・提示し、利用者から明示的な署名承認を得た署名要求だけを Core へ送る。Core は処理単位の正しい Profile パスワードを認証し、指定された Account / Software Key に対応する秘密鍵で署名し、署名結果を返却する。Profile パスワードが正しいことだけでは利用者の署名承認済みとはみなさない。Core は Transaction の意味判断、利用者への説明、内容確認 UI または Transaction 構築を担わない。

### UC-007 Profile パスワードを変更する

正しい現在パスワードを必要とする。成功時は Profile 配下すべてを新パスワードで利用可能にし、旧パスワードを無効化する。失敗・中断時に部分変更を残さない。

### UC-008 Software Key / Profile を削除する

個別 Software Key 削除は対象鍵だけを削除する。Profile 削除は Mnemonic と配下の全 Software Key と Profile 自体をCore管理下から破棄する。いずれも正しい Profile パスワードを必要とし、部分削除を残さない。削除前から利用者が保持しているMnemonicを使い、同一Networkの新しいProfileを再作成することは許可する。これは削除済みCoreデータの復旧または再利用とは扱わない。

### UC-009 Chain / Network を区別して利用する

同一 Profile 内で Profile の Network に対応する Symbol / NEM 双方の Derived / Imported / Generated Software Key を扱う。Profile は Network を固定するが Chain は固定せず、各 Software Key は Chain に固定される。Account は Software Key をその Chain と Profile Network 上で利用する概念であり、Chain / Network の暗黙変換や不正な組合せは受け付けない。

### UC-010 Binding 経由で Core を利用する

Desktop / Mobile は Native Binding、Web は Web Binding から v1 Core 主要機能を利用できる。Binding により Core の責任・認可・秘密情報公開方針は変化しない。Desktop / Mobile / Web のホスト環境の侵害を Core が防止する保証はしないが、Core / Binding が不要に秘密情報を公開しない責任は共通に適用する。

### UC-011 Mnemonic / Software Key を個別エクスポートする

対象 Profile の指定、処理単位の正しい Profile パスワード、利用者が秘密情報の取得を明示的に要求したこと、および Application / UI がその意思を確認して Core へ要求することを条件として、Mnemonic の回復 / export または指定 Software Key の秘密鍵 export を行う。単なる API 呼出しや Application がパスワードを保有していることだけでは明示的要求とみなさない。Core は UI を表示せず、利用者意思を推測せず、通常処理から暗黙に export へ遷移しない。

エクスポート対象は要求した秘密情報だけとし、Profile 全体の一括バックアップは提供しない。成功時も Core が保持する Mnemonic / Software Key 原本の継続管理責任は Core に残る。Core 外へ渡されたコピーの表示・保管・利用・紛失防止は受領した Application / 利用者の責任とする。

---

## 5. 機能要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| FR-001 | MUST | Core は新規 Mnemonic 生成または既存 Mnemonic から、未指定でも空でもない Profile パスワードと Mainnet / Testnet を使用して Profile を作成・復元できること。Mnemonic なし Profile を作成しないこと。新規Mnemonic生成経路では、初回バックアップ受渡しが完了した場合だけProfile作成を成功させ、受渡し失敗・中断時に新規Profileを正常状態として残さないこと。 |
| FR-002 | MUST | Mnemonic を Profile のルート秘密情報として Profile 管理下へ保存すること。 |
| FR-003 | MUST | 保存済み Mnemonic から Profile の Network と指定 Chain に対応する Derived Software Key を導出し、§3.3 の妥当性確認に成功した場合だけ保存すること。導出、妥当性確認または保存に失敗した場合は Profile と既存 Software Key を変更しないこと。 |
| FR-004 | MUST | 正しい Profile パスワードを Core が処理単位で認可し、§3.3 の妥当性基準を満たした外部秘密鍵だけを Imported Software Key として保存すること。認可、妥当性確認または保存に失敗した場合は Profile 状態を変更しないこと。 |
| FR-005 | MUST | 正しい Profile パスワードを Core が処理単位で認可し、§3.3 の妥当性基準を満たした独立生成秘密鍵だけを Generated Software Key として保存すること。認可、生成、妥当性確認または保存に失敗した場合は Profile 状態を変更しないこと。 |
| FR-006 | MUST | Mnemonic と全 Software Key を暗号化保存対象とし、平文で永続保存しないこと。 |
| FR-007 | MUST | 秘密情報を必要とする処理ごとに Profile パスワードで認証し、継続的・永続的な Unlocked 状態を外部へ提供しないこと。Application が unlock session を保持する方式を提供せず、認証結果を次の秘密情報処理へ持ち越さないこと。 |
| FR-008 | MUST | Derived / Imported / Generated を同じ秘密鍵利用ライフサイクルで扱うこと。 |
| FR-009 | MUST | UI / Application が利用者へ提示し、明示的に承認した署名要求だけを対象とし、Core が指定 Chain、Account / Software Key、処理単位の Profile パスワード、署名対象データから署名を生成し、`symbol-sdk` 3.3.2 と互換な外部検証結果を返却すること。正しいパスワードだけで利用者の署名承認済みとはみなさず、Profile の Network と要求の Chain / Network が矛盾する処理を許可しないこと。Core は Transaction の意味説明、利用者意思の確認および UI を担わないこと。 |
| FR-010 | MUST | 正しい現在パスワードを要求して Profile パスワードを変更でき、失敗・中断時に部分変更を残さないこと。 |
| FR-011 | MUST | 正しい Profile パスワードを要求して個別 Software Key を削除でき、失敗・中断時に部分適用を残さないこと。 |
| FR-012 | MUST | 正しい Profile パスワードを要求して、Profile、Mnemonic、全 Software KeyをCore管理下から破棄でき、失敗・中断時に部分削除を残さないこと。削除前から利用者が保持するMnemonicを使った同一Networkの新しいProfile作成は、削除済みProfileの復旧・再利用とはみなさず許可すること。 |
| FR-013 | MUST | Profile を Chain に固定せず、Network は固定し、Software Key は指定 Chain に固定すること。指定 Chain と Profile Network に対応する Derived / Imported / Generated Software Key の公開鍵・アドレス・署名結果を扱い、Chain / Network を暗黙に別の値へ変換しないこと。 |
| FR-014 | MUST | Mnemonic 生成、秘密鍵導出、暗号化を含む Profile / Software Key の管理責任、認証、保存、削除およびライフサイクルを Symbol / NEM で共通の Core 管理方針として扱うこと。ただし Chain 固有の鍵・アドレス・署名処理まで同一仕様とみなさないこと。 |
| FR-015 | MUST | Profile 作成時に Mainnet / Testnet を必須指定し保存すること。 |
| FR-016 | MUST | Profile の Network を作成後変更できないこと。 |
| FR-017 | MUST | Core が生成・維持する、本要件・仕様に適合した整合した Store を対象として、同一 Mnemonic + 同一 Network の Profile 重複登録を拒否し、異なる Network なら別 Profile を許可すること。 |
| FR-018 | MUST | 同一 Profile 内かつ同一 Chain で同一秘密鍵に対応する Software Key の重複登録を由来をまたいで拒否すること。異なる Chain では同一秘密鍵に対応する Software Key を別 Software Key として許可すること。 |
| FR-019 | MUST | Native / Web Binding から Profile 作成・復元、初回 Mnemonic バックアップ受渡し、Profile / 公開情報取得、追加導出、秘密鍵インポート、Software Key 生成、署名、パスワード変更、Software Key 削除、Profile 削除、Mnemonic の個別エクスポート、Software Key 秘密鍵の個別エクスポートを利用できること。新規 Profile 作成は初回バックアップ受渡しの完了を条件とし、Profile 全体の一括バックアップ・復旧は含めないこと。 |
| FR-020 | MUST | Profile 作成・パスワード変更で未指定・空・Core 内部既定値の Profile パスワードを拒否すること。パスワード品質条件は上位 Application / Package の責任とし、Core は独自に要求しないこと。 |
| FR-021 | MUST | Mnemonic は生成、復元および取込みのすべてで §3.2 の BIP-0039（英語 24 語）基準を満たした値だけを登録・利用すること。Software Key は生成、取込みおよび HD Wallet からの導出のすべてで §3.3 の妥当性基準を満たした値だけを登録・利用すること。各経路の失敗時に不完全状態を登録せず、既存 Profile と既存 Software Key を変更しないこと。 |
| FR-022 | MUST | Core は、対象 Profile の指定、処理単位の正しい Profile パスワード、利用者の秘密情報取得に関する明示的要求、および Application / UI による意思確認を伴う要求に対して、保存済み Mnemonic を個別にエクスポートできること。単なる API 呼出しやパスワード所有だけでは明示的要求とみなさないこと。誤認証、意思確認のない要求、対象不存在または処理失敗時は Mnemonic を返さず、Profile 状態を変更しないこと。成功後も Core 内の Mnemonic 原本は Core が継続管理し、Core 外へ渡されたコピーの保護・保存・利用責任は受領側へ移ること。 |
| FR-023 | MUST | Core は、対象 Profile / Software Key の指定、処理単位の正しい Profile パスワード、利用者の秘密情報取得に関する明示的要求、および Application / UI による意思確認を伴う要求に対して、指定 Software Key の秘密鍵を個別にエクスポートできること。単なる API 呼出しやパスワード所有だけでは明示的要求とみなさないこと。誤認証、意思確認のない要求、対象不存在または処理失敗時は秘密鍵を返さず、Profile 状態を変更しないこと。成功後も Core は原本の継続管理責任を保持し、Core 外へ渡されたコピーの保護・保存・利用責任は受領側へ移ること。 |
| FR-024 | MUST | unsupported Chain、unsupported Network、Profile Network と要求 Network の不一致、Software Key の固定 Chain と要求 Chain の不一致、および不正な Chain / Network 組合せを拒否すること。拒否時は Profile 状態と既存 Software Key を変更せず、Software Key を登録せず、秘密情報を返さず、別 Chain / Network へ fallback または暗黙変換しないこと。具体的な Chain 識別子、Network 識別子および導出規則は仕様へ委譲すること。 |

---

## 6. 非機能要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| NFR-001 | MUST | Desktop / Mobile / Web が対応 Binding 経由で共通 Core を利用し、秘密鍵処理を各 Application で再実装しないこと。 |
| NFR-002 | MUST | Core、Binding、Application の実装・レビュー・保守責任を区別でき、Binding が Core 責任や外部責任を重複実装しないこと。 |
| NFR-003 | MUST | Core、Binding、UI / Application、上位 Application / Package の責任境界を第三者が説明できること。 |
| NFR-004 | MUST | Desktop / Mobile / Native / Web Application / Browser Extension の違いによって、秘密情報管理方針、認可責務、責任境界および Core の通常処理での非開示原則が変わらないこと。 |
| NFR-005 | SHOULD | Core の自動検証では、行・関数カバレッジ90%以上、分岐カバレッジ85%以上を目標とし、未達時は未カバー範囲、理由および影響を確認可能にすること。カバレッジ率だけで仕様適合性、セキュリティまたは相互運用性を合格判定しないこと。 |

---

## 7. セキュリティ要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| SEC-001 | MUST | 保存状態の Mnemonic / Software Key を暗号化対象とし平文永続保存しないこと。 |
| SEC-002 | MUST | 正しい Profile パスワードがない場合、秘密情報処理および Software Key 登録を成功させないこと。認証は処理単位で行い、認証済み Unlocked 状態を次の処理へ持ち越さないこと。 |
| SEC-003 | MUST | 処理後に Mnemonic / 秘密鍵を平文で継続利用可能な状態として保持しないこと。 |
| SEC-004 | MUST | 破損または認証失敗した保存データを正常な秘密情報として利用しないこと。 |
| SEC-005 | MUST | Core管理下から削除済みとなったSoftware Key / Profileの秘密情報を、Coreの署名、導出、登録その他の秘密情報処理へ再利用できないこと。削除前から利用者が保持するMnemonicを外部入力として新しいProfileへ登録することは、本要件の禁止対象に含めない。 |
| SEC-006 | MUST | Profile パスワード変更は正しい現在パスワードと未指定でも空でもない新パスワードを要求し、成功後は旧パスワードを無効化すること。 |
| SEC-007 | MUST | Core は Profile パスワードを永続保存・継続キャッシュしないこと。上位が一時保持する場合の責任は上位にあること。 |
| SEC-008 | MUST | Profile 削除は正しい Profile パスワードを Core が認可し、認可失敗時は状態を変更しないこと。 |
| SEC-009 | MUST | 個別 Software Key 削除は正しい Profile パスワードを Core が認可し、認可失敗時は状態を変更しないこと。 |
| SEC-010 | MUST | 保存済み Mnemonic / 秘密鍵を通常結果として Application へ返さないこと。新規 Mnemonic 生成直後の初回バックアップ受渡し、および対象指定、処理単位の正しい Profile パスワード、利用者の明示的要求、Application / UI の意思確認を伴う個別エクスポートだけを例外とする。初回受渡しまたはエクスポートの失敗・中断時は秘密情報を返却せず、Core / Binding が外部受渡しのための一時的な複製を継続保持しないこと。成功したエクスポート後も Core 内原本の継続管理責任は Core に残り、Core 外のコピーの保護・保存・利用責任は受領側へ移ること。 |
| SEC-011 | MUST | Binding は Mnemonic、秘密鍵、Profile パスワードを永続保存・継続キャッシュせず、別の秘密情報管理主体にならないこと。 |
| SEC-012 | MUST | Binding 境界を通過する秘密情報について、不必要な複製・長期保持を前提としないこと。具体方式は仕様設計で決定すること。 |
| SEC-013 | MUST | Profile パスワード紛失時に v1 は復旧・リセットを提供せず、正しいパスワードを必要とする処理を成功させないこと。 |
| SEC-014 | MUST | Profile パスワードを必要とする処理の認可は Core が行い、Binding / Application は認可を代替・回避できないこと。 |
| SEC-015 | MUST | 通常結果、失敗結果、入力エラー、認証失敗、破損データ処理、診断・補助出力へ Mnemonic、秘密鍵、Profile パスワードまたは復元可能表現を含めないこと。SEC-010 の初回 Mnemonic 受渡しおよび利用者の明示的要求に基づく個別エクスポートの成功結果だけを例外とし、エラー・診断・補助出力には含めないこと。Core は UI を表示せず、利用者意思を推測せず、通常処理から秘密情報アクセスへ暗黙に遷移しないこと。 |
| SEC-017 | MUST | UI / Application / Binding / 上位側で秘密情報を一時的に扱う場合、取込み・初回バックアップ・利用者が明示的に要求した個別エクスポート等の必要な処理範囲に限定し、外部受渡し・処理のための一時的な複製を成功・失敗・中断後に Core または Binding が継続利用可能な状態や診断出力として残さないこと。一時的な仲介は Core 管理下の原本の継続管理責任が Application / UI へ移転したことを意味しない。初回バックアップおよび個別エクスポート後に Core 外へ渡されたコピーの保管・紛失防止・利用は利用者および上位 Application / Package の責任とし、Core は失われた Mnemonic または秘密鍵を復旧しない。 |
| SEC-018 | MUST | Profile 作成（新規 Mnemonic の初回受渡しを含む）、Derived / Imported / Generated Software Key 登録、Profile パスワード変更、Software Key 削除、Profile 削除を外部観測上 atomic / fail-closed に扱い、導出、生成、検証、認証、保存、受渡しまたは削除の失敗・中断時に不完全な秘密情報、部分適用または部分 Profile を成功状態として残さないこと。既存 Profile と既存 Software Key を壊さず、失敗時に秘密情報を返さないこと。 |
| SEC-019 | MUST | 認証、署名、導出、Software Key 登録・削除、パスワード変更、Profile 削除は要求対象 Profile のみに作用し、他 Profile へ越境しないこと。 |
| SEC-020 | MUST | Desktop、Mobile、Native、Web Application、Browser Extension、Browser、OS および host process のいずれの境界も、秘密情報の恒久的な保護境界や host compromise 防止の保証とはみなさないこと。Application、Browser、OS または host process の侵害を Core が防止する保証はしない。一方、Core / Binding は環境の違いにかかわらず、通常処理で保存済み Mnemonic / 秘密鍵を外部へ公開せず、不要な秘密情報の返却・共有・保持・ログ出力を行わない責任を負うこと。利用者が明示的に要求した個別エクスポートの成功結果は例外とする。 |
| SEC-021 | MUST | Mnemonic または Software Key 秘密鍵の個別エクスポートは、対象指定、利用者の明示的要求、Application / UI による意思確認、および要求ごとの正しい Profile パスワードを Core が認可した場合だけ成功させること。単なる API 呼出しやパスワード所有だけでは利用者の明示的要求とみなさないこと。誤ったパスワード、意思確認のない要求、対象不存在または処理失敗では秘密情報を返さず、Profile 状態を変更しないこと。 |
| SEC-022 | MUST | Profile パスワードの正しさと、利用者が指定 Transaction への署名を明示的に承認したことを別の security property とすること。UI / Application は署名対象内容を利用者へ提示して明示的承認を得た要求だけを Core へ送る責任を負い、Core はその要求を受けて指定 Account / Software Key を利用し署名するが、Transaction の意味説明、利用者意思の推測または確認 UI を担わないこと。 |

`SEC-016` は OPEN-002 により廃止した。Wallet Core 自身にパスワード品質または推測攻撃耐性の判定を要求しない。パスワードから保存秘密情報を保護する KDF 等の暗号学的設計は別途仕様設計で定める。

---

## 8. データ要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| DR-001 | MUST | Profile は Network、1つの Mnemonic、0個以上の Derived / Imported / Generated Software Key を持つこと。 |
| DR-002 | MUST | Mnemonic を Profile のルート秘密情報として全 Software Key と同じ秘密情報管理対象にすること。 |
| DR-003 | MUST | Profile 配下の Mnemonic / Software Key を同一 Profile パスワード保護対象とし、個別鍵パスワードを持たないこと。 |
| DR-004 | MUST | Software Key の由来を区別可能としても基本的な秘密鍵利用処理は同じライフサイクルで扱うこと。 |
| DR-005 | MUST | Profile は Network を固定し Chain には固定せず、Software Key は Chain を固定すること。Account は Software Key を対象 Chain と Profile Network 上で利用する概念とし、各 Software Key の指定 Chain / Profile Network に対応する公開情報・署名結果を扱うこと。Chain / Network の暗黙変換や不正な組合せを許可しないこと。 |
| DR-006 | MUST | Profile 重複は Mnemonic + Network の組み合わせで判定すること。 |
| DR-007 | MUST | 同一 Profile 内かつ同一 Chain では同一秘密鍵を重複管理しないこと。異なる Chain では同一秘密鍵を別 Software Key として管理できること。 |
| DR-008 | MUST | Symbol / NEM の秘密鍵・公開鍵、アドレス、署名および Network 処理結果は `symbol-sdk` 3.3.2 と互換であること。HD Wallet の復元互換性は、本仕様で固定した導出規則および deterministic fixture との一致を受入基準とすること。特定の既存 Wallet 製品との包括的互換性は v1 の保証対象とせず、名称、version または commit、入力、期待値および fixture を明示した場合に限り、その fixture の範囲で保証すること。 |
| DR-009 | MUST | Core 管理下の Store は、対応する version を識別できること。Core は明示的に対応する version だけを読み込み、unsupported version、破損または整合しないデータを黙って解釈・無視・fallback せず、正常な秘密情報として利用しないこと。migration を行う場合は明示的な操作として扱い、暗黙 migration を行わず、読込みまたは migration の失敗時に既存状態を変更しないこと。対応 version 内の未知データは、その意味を推測して処理しないこと。非意味的な将来拡張として安全に保持できる場合は保持し、未知の意味を持つ値や安全に保持できない変更は拒否すること。保存データは同じ論理値から deterministic で安定した結果を得られ、対応範囲で相互運用可能であること。具体的な保存表現、未知値の表現および migration 手順は仕様へ委譲すること。 |

---

## 9. 受け入れ条件

| ID | 対応 | 受け入れ条件 |
| --- | --- | --- |
| AC-001 | FR-001, FR-015, FR-020, DR-001 | 未指定・空・Core 既定値でない Profile パスワードと Network でのみ Profile を作成でき、Mnemonic なし Profile を作成しない。新規Mnemonic生成経路では初回バックアップ受渡しが完了した場合だけProfile作成が成功し、受渡し失敗・中断時は新規Profileを正常状態として残さない。既存Mnemonic復元経路では、指定Mnemonicを持つProfileを作成できる。 |
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
| AC-012 | FR-012, SEC-005, SEC-008 | Profile 削除でCore管理下のProfile、Mnemonic、全 Software Keyを破棄し、認可失敗時は変更しない。削除前から利用者が保持するMnemonicを使って同一Networkの新しいProfileを作成することは許可され、削除済みCoreデータの復旧・再利用とは扱わない。 |
| AC-013 | FR-013, DR-005, FR-024 | Derived / Imported / Generated すべてで指定 Chain / Profile Network の公開鍵・アドレス・署名結果を扱え、Profile Network と要求 Network または Software Key の固定 Chain と要求 Chain が不一致の要求を拒否する。 |
| AC-014 | FR-014 | Symbol / NEM の Profile / Software Key について、Core による管理責任、認証、保存、削除およびライフサイクルを共通に扱える。ただし Chain 固有の鍵・アドレス・署名処理は各基準に従う。 |
| AC-015 | NFR-001, NFR-002 | Desktop / Mobile / Web から Binding 経由で共通 Core を利用でき、Core と Application の責任を区別できる。 |
| AC-016 | NFR-003 | Core、Binding、Application、上位 Package の秘密情報・パスワード責任を第三者が説明できる。 |
| AC-017 | SEC-004 | 破損・認証失敗データで秘密情報処理が成功しない。 |
| AC-018 | FR-001, FR-017, DR-006, DR-009, SEC-004 | Core が生成・維持する、要件・仕様に適合した整合した Store では、同一 Mnemonic + 同一 Network の重複 Profile 作成を拒否し、異なる Network は別 Profile として作成できる。破損、unsupported version、認証失敗または整合しない Store は正常データとして扱わず、黙って解釈・無視・fallback せず、読込み失敗時に既存状態を変更しない。未知データの意味を推測して処理せず、対応 version の拡張を安全に保持できない変更は拒否する。Profile 削除後に利用者が保持する同一 Mnemonic + 同一 Network から新しい Profile を作成することは、削除済み Core データの再利用ではないため許可する。 |
| AC-019 | FR-016, DR-005 | Profile Network を作成後変更できない。 |
| AC-020 | FR-018, DR-007 | 同一 Profile・同一 Chain では同一秘密鍵を別由来または再導出で重複登録しない。異なる Chain では同一秘密鍵を異なる Software Key として登録できる。 |
| AC-021 | FR-019, NFR-001 | Desktop Native Binding から v1 主要機能を利用できる。 |
| AC-022 | FR-019, NFR-001 | Mobile Native Binding から v1 主要機能を利用できる。 |
| AC-023 | NFR-002 | Binding が Core 責任、Wallet 固有ロジック、Network、Transaction 構築を独自実装しない。 |
| AC-024 | NFR-004, SEC-020 | Desktop / Mobile / Native / Web Application / Browser Extension で Core の秘密情報管理・認可・責任境界・通常処理での非開示原則が同じである。Application、Browser、OS または host process の侵害を Core が防止する保証とは区別する。 |
| AC-025 | SEC-010, SEC-021 | 通常処理結果として秘密鍵を Application へ返さない。対象指定、処理単位の正しいパスワード、利用者の明示的要求および Application / UI の意思確認を伴う個別エクスポートの成功結果だけを例外とし、成功後のコピーの保護・保存・利用は受領側責任、Core 内原本の継続管理は Core の責任とする。 |
| AC-026 | SEC-010, SEC-021 | 保存済み Mnemonic を通常処理結果として Application へ返さない。対象指定、処理単位の正しいパスワード、利用者の明示的要求および Application / UI の意思確認を伴う個別エクスポートの成功結果だけを例外とし、成功後のコピーの保護・保存・利用は受領側責任、Core 内原本の継続管理は Core の責任とする。 |
| AC-027 | SEC-011 | 処理後に Core / Binding が Profile パスワードを永続保存・継続キャッシュしない。 |
| AC-028 | SEC-012 | Binding 境界で不要な秘密情報複製・長期保持を前提としない。 |
| AC-029 | FR-020 | 未指定・空・Core 既定値の Profile パスワードで Profile 作成・パスワード変更が成功しない。Core は品質ポリシーを独自判定しない。 |
| AC-030 | SEC-013 | パスワード紛失時に復旧・リセット、秘密情報処理、パスワード変更、削除が成功しない。 |
| AC-031 | SEC-014 | Binding / Application の要求だけでは認可できず、Core が正しい Profile パスワードを認可する。 |
| AC-032 | SEC-015 | 初回 Mnemonic バックアップおよび明示的な個別エクスポートの成功結果を除き、外部出力・診断へ秘密情報または復元可能表現を含めない。エクスポートの失敗結果・診断出力には含めない。 |
| AC-033 | DR-008 | Symbol / NEM の鍵・公開鍵・アドレス・署名・Network の互換性を `symbol-sdk` 3.3.2 と比較して判定できる。HD 復元互換性は仕様で固定した導出規則および deterministic fixture により判定する。特定の既存 Wallet 製品との互換性は、名称、version または commit、入力、期待値および fixture を明示した範囲に限り判定する。 |
| AC-034 | FR-001, FR-019, SEC-010, SEC-017, SEC-018 | 新規 Mnemonic 生成時は、利用者の明示的要求に基づき意図された呼出し元 Application への初回バックアップ用受渡しが成功した場合だけ Profile 作成が成功する。受渡し成功を外部から判定でき、受渡し失敗・中断時は新規 Profile を正常状態として残さず、不要な宛先へ公開せず、途中内容をログ・診断情報へ残さない。受渡し後の保管・紛失防止は利用者および上位 Application / Package の責任とし、保存済み Mnemonic の通常取得には使用しない。 |
| AC-035 | FR-004, FR-005, FR-021, §3.2, §3.3 | Mnemonic の生成・復元・取込みには BIP-0039（英語 24 語）基準を、Software Key の生成・取込み・HD Wallet からの導出には §3.3 の基準を一貫して適用し、Core が妥当性を判定する。失敗時に不完全状態、既存 Profile 変更または秘密情報返却を残さない。 |
| AC-037 | SEC-017 | 一時的に扱った秘密情報を成功・失敗・中断後に継続利用可能状態または診断出力として残さない。 |
| AC-038 | SEC-018 | Profile 作成、Derived / Imported / Generated Software Key 登録、パスワード変更・鍵削除・Profile 削除は成功時に全体反映し、失敗時に外部観測上の部分適用、不完全な秘密情報または既存データの破壊を残さない。 |
| AC-039 | SEC-019 | 1つの Profile 操作が他 Profile の秘密情報・認証状態・利用可否・削除結果へ影響しない。 |
| AC-040 | FR-019, NFR-004, SEC-020 | Web / Browser Extension から Web Binding 経由で v1 主要機能を利用でき、Native と同じ秘密情報管理・認可方針が適用される。ホスト環境の侵害防止保証とは区別する。 |
| AC-041 | FR-022, SEC-010, SEC-021 | 対象 Profile、利用者の明示的要求、Application / UI の意思確認および正しい Profile パスワードで Mnemonic を個別エクスポートでき、誤パスワード・意思確認のない要求・対象不存在・処理失敗時は Mnemonic を返さず Profile 状態を変更しない。成功後も Core 内原本は Core が継続管理し、Core 外のコピーは受領側が保護する。 |
| AC-042 | FR-023, SEC-010, SEC-021 | 対象 Profile / Software Key、利用者の明示的要求、Application / UI の意思確認および正しい Profile パスワードで Software Key の秘密鍵を個別エクスポートでき、誤パスワード・意思確認のない要求・対象不存在・処理失敗時は秘密鍵を返さず Profile 状態を変更しない。成功後も Core 内原本は Core が継続管理し、Core 外のコピーは受領側が保護する。 |
| AC-043 | FR-019, SEC-017, SEC-020 | Native / Web Binding は個別エクスポート結果を Application へ受け渡せるが、秘密情報を継続保持・キャッシュ・ログ出力せず、Profile 全体の一括バックアップ機能を提供しない。 |
| AC-044 | NFR-005 | Core の行・関数・分岐カバレッジの計測結果を確認でき、目標未達の場合は未カバー範囲、理由および影響が記録されている。重要な仕様・セキュリティ・相互運用性・異常系の未検証を、カバレッジ目標達成だけで合格扱いしない。 |
| AC-045 | DR-009, SEC-004 | Store の version を識別し、unsupported version、破損または整合しないデータを正常データとして利用しない。暗黙 migration、黙った解釈・無視・fallback を行わず、読込みまたは明示的 migration の失敗時に既存状態を変更しない。未知データの意味を推測せず、非意味的な将来拡張として安全に保持できない変更を拒否し、対応範囲で deterministic かつ相互運用可能な保存結果を確認できる。 |
| AC-046 | FR-003, FR-021, SEC-018 | HD Wallet からの Software Key 導出、妥当性確認、登録または保存のいずれかが失敗・中断した場合、不完全な Software Key、部分変更、既存 Software Key の破壊または秘密情報返却を残さず、外部観測上 fail-closed に扱う。 |
| AC-047 | FR-024, DR-005 | unsupported または不整合な Chain / Network、Profile Network と要求 Network の不一致、Software Key の固定 Chain と要求 Chain の不一致を拒否し、Profile、Software Key および秘密情報を変更・返却せず、別 Chain / Network へ fallback または暗黙変換しない。 |

`AC-036` は OPEN-002 により廃止した。Wallet Core による Profile パスワード品質判定は受入対象としない。

---

## 10. 状態変更と失敗時整合性

次の状態変更操作は、成功時は要求結果を全体として反映し、保存失敗・処理中断・その他失敗時には外部観測可能な部分適用を成功状態として残さない。

- Profile パスワード変更
- 新規 Profile 作成・復元（新規 Mnemonic の初回バックアップ受渡しを含む）
- Derived Software Key 登録
- Imported / Generated Software Key 登録
- Software Key 削除
- Profile 削除

Mnemonic / Software Key 秘密鍵の個別エクスポートは状態変更操作ではなく、Store を変更しない。認証・対象確認・返却に失敗した場合も既存 Store を変更しない。

Store の読み込みまたは明示的 migration が version 非対応、破損、整合性不備または未知データの安全な保持不能により失敗した場合は、既存状態を変更せず、未対応データを正常な秘密情報として利用しない。Store の migration を自動的・暗黙的に行わない。

要求対象 Profile 以外の秘密情報・認証状態・利用可否へ作用してはならない。

---

## 11. 未決定事項

**要件レベルの未決定事項はない。**

過去に OPEN-001、OPEN-002 および OPEN-VALIDITY-001 として管理した事項は、本書の互換性、パスワード責任および妥当性・安全性の条項へ取り込んだため、現行要件では解消済みである。今回の Requirements review-006 で指摘された RR-006、RR-013、RR-020、RR-022〜RR-029 も、本書の認証、妥当性、責任境界、Store、Chain / Network、失敗安全性および下流委譲の条項へ取り込んだため、要件レベルでは解消済みである。旧 OPEN 項目および過去レビューは Git 履歴と `docs/reviews/requirements/` の履歴記録で追跡する。

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
- 生成 Mnemonic の初回バックアップ受渡しにおける、成功判定、失敗時の Profile 作成扱いおよび受渡し方式
- Mnemonic 回復 / export、Software Key 秘密鍵 export の認可条件、利用者意思の確認方法および受渡し方式
- 署名対象内容の提示、利用者の明示的承認および署名要求の受渡し方式

Profile パスワードの品質ポリシーそのものは Core 仕様設計の対象外である。

### 12.3 Binding

- Native / Web Binding の外部契約、言語間の値変換およびエラー表現
- Web Binding / JavaScript 境界の秘密情報受渡し・コピー・消去
- Browser 固有 Storage と Application の責任分界
- 対象 OS / Browser / バージョン、ビルド・配布方式

### 12.4 状態管理

- Profile / Software Key の識別、データ形式および保存表現
- 重複判定方式
- Store version の識別、対応範囲、未知データの保持または拒否、明示的 migration を実現する保存方式
- atomic な Profile 作成、パスワード変更、登録・削除を実現する保存方式
- Profile 間分離を保証する識別・アクセス方式
- カバレッジ計測の対象範囲、除外範囲および継続検証への適用方式

---

## 13. レビュー指摘への対応状態

`requirements-review-006.md` までの RR-001〜RR-029 を、現在の要件および参照可能な決定記録に照らして整理する。過去の review ファイル自体は監査記録として変更しない。

| ID | 現在の状態 | 対応 |
| --- | --- | --- |
| RR-001 | Resolved | OPEN-001 を `symbol-sdk` 3.3.2 互換基準として確定。HD導出パスは仕様設計へ分離。 |
| RR-002 | Resolved | 未指定・空・Core既定値を拒否。 |
| RR-003 | Resolved | Mnemonic / Software Key の暗号化保存を明示。 |
| RR-004 | Resolved | 公開情報と秘密情報の返却境界を明示。 |
| RR-005 | Resolved | `DEC-REQ-001` により第三者追跡可能な承認記録を追加。 |
| RR-006 | Resolved | Concept の lock / unlock を処理単位の Profile パスワード認証として具体化し、継続・永続 Unlocked 状態、Application の unlock session および認証結果の持越しを禁止。 |
| RR-007 | Resolved | パスワード復旧非提供、Core認可責任を明示。 |
| RR-008 | Resolved | 失敗・診断を含む秘密情報非開示を明示。 |
| RR-009 | Resolved | Imported / Generated 登録のパスワード認可と失敗時状態不変を明示。 |
| RR-010 | Resolved | 初回 Mnemonic 受渡しの完了条件、失敗・中断時のProfile非作成、保管・紛失防止責任、Profileデータバックアップ責任を明示。 |
| RR-011 | Resolved | Derived / Imported / Generated すべての公開情報利用を明示。 |
| RR-012 | Resolved by approved requirement | パスワード品質ポリシーは上位責任とし、Coreの品質判定要求を廃止。 |
| RR-013 | Resolved by approved requirement | Mnemonic は BIP-0039（英語 24 語）とし、生成・復元・取込みへ同一基準を適用。Software Key は生成・取込み・HD 導出の妥当性を Core が判定し、互換性基準を §3.1〜§3.3 へ追跡可能にした。具体方式は仕様設計へ分離。 |
| RR-014 | Resolved | 一時秘密情報の処理範囲・終了後非保持を明示。 |
| RR-015 | Resolved | `symbol-sdk` 3.3.2 互換の外部検証基準を明示。 |
| RR-016 | Resolved | 状態変更の部分適用禁止を明示。 |
| RR-017 | Resolved | Profile 間の越境禁止を明示。 |
| RR-018 | Resolved | §1.2で背景・課題、目的、対象利用者・主要利用場面、責任境界をコンセプトの該当節へ追跡可能にした。 |
| RR-019 | Resolved | Profile削除後の外部Mnemonicによる同一Networkの新規Profile再作成を許可し、SEC-005をCore管理下の削除済みデータの再利用禁止へ限定した。 |
| RR-020 | Resolved | Profile は Network 固定・Chain 非固定、Software Key は Chain 固定、Account は対象 Chain / Profile Network 上で Software Key を利用する概念として統一。 |
| RR-021 | Resolved | 既存 Wallet との包括的互換性を保証せず、追加保証を明示した名称・version / commit・入力・期待値・fixture の範囲に限定。 |
| RR-022 | Resolved | 初回 Mnemonic backup handoff の対象、意図された受領主体、成功判定、失敗・中断時の Profile 非作成、不要な公開禁止および受渡し後の保管責任を明示。 |
| RR-023 | Resolved | Password 認証、Account 選択、Transaction 内容提示、利用者の明示的承認、Core の署名、署名結果返却を分離し、パスワード正当性だけで承認済みとみなさないことを明示。 |
| RR-024 | Resolved | Mnemonic / Software Key 秘密鍵の export に対象指定、処理単位認証、利用者の明示的要求および Application / UI の意思確認を要求し、原本と Core 外コピーの責任を分離。 |
| RR-025 | Resolved | Desktop / Mobile / Native / Web Application / Browser Extension 等に共通する Core の非開示責任と、Application / Browser / OS / host process の侵害防止が Core の保証外であることを分離。 |
| RR-026 | Resolved | Store version の識別、unsupported / 破損データの拒否、明示的 migration、暗黙 migration 禁止、未知データの安全な保持または変更拒否、既存状態不変および安定性・相互運用性を要件化。 |
| RR-027 | Resolved | HD Wallet からの Software Key 導出、妥当性確認、登録、保存の失敗時に不完全状態、Profile 部分変更、既存鍵破壊または秘密情報返却を残さない fail-closed 条件を追加。 |
| RR-028 | Resolved | unsupported / 不一致の Chain / Network を拒否し、Profile、Software Key、秘密情報を変更・返却せず、別 Chain / Network へ fallback または暗黙変換しないことを FR-024 / AC-047 へ追加。 |
| RR-029 | Resolved | Requirements の Binding、Store、重複および invalid data の外部要求を一般化し、具体的な境界契約、保存表現、内部動作およびエラー表現を下流へ委譲。 |

過去の review ファイルはその時点の監査記録であり、履歴性を保つため内容を書き換えない。

---

## 14. 参照資料

| 資料 | 用途 |
| --- | --- |
| `docs/consept/concept-sheet.md` | 上位コンセプト、v1範囲、責任境界 |
| `docs/design/architecture.md` | 要件を実装配置へつなぐ基本設計と責任境界 |
| `docs/knowledge/symbol-technicalref-jp.pdf` | Symbolの鍵・署名・Network・アドレス前提 |
| `docs/knowledge/nem-technicalref.pdf` | NEMの鍵・署名・Network・アドレス前提 |
| `docs/reviews/requirements/requirements-review-002.md` | RR-001〜RR-017の履歴レビュー |
| `docs/reviews/requirements/requirements-review-003.md` | RR-001〜RR-019の履歴レビュー |
| `docs/reviews/requirements/requirements-review-006.md` | RR-006、RR-013、RR-020、RR-022〜RR-029の再レビュー結果 |

本書を v1 要件の単一の現行正本とする。要件上の承認履歴と変更理由は本書、Git 履歴および `docs/reviews/requirements/` から追跡し、要件本文と矛盾する別 amendment を並存させない。設計上の判断は `docs/design/` を参照する。
