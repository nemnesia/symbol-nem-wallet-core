# symbol-nem-wallet-core 要件定義書

## 1. 概要

### 1.1 目的

symbol-nem-wallet-core v1 は、Desktop / Mobile / Web の Symbol / NEM ウォレット向けに、Mainnet または Testnet に所属する Profile を秘密情報管理の基本単位とし、Mnemonic と Software Key の生成・復元・導出・取込み・暗号化保存・署名・削除を Rust Wallet Core へ集約する。

Web には Web Application および Browser Extension を含む。Desktop / Mobile は Native Binding、Web は WASM Binding を介して同一 Core を利用する。

### 1.2 上位方針と決定記録

本書は次を上位根拠および承認済み決定として扱う。

- `docs/consept/concept-sheet.md`: 製品目的、v1範囲、責任境界
- `docs/decisions/requirements-baseline-001.md` (`DEC-REQ-001`): 初期要件ベースラインの承認・追跡記録
- `docs/decisions/open-001.md`: Symbol / NEM 互換性基準の決定
- `docs/decisions/open-002.md`: Profile パスワード品質ポリシーの責任境界の決定

旧要件本文に存在した「独立した承認記録は存在しない」という記述は `DEC-REQ-001` により失効している。本書の確定事項は Git 履歴および上記決定記録から追跡する。

### 1.3 本書で決定しない事項

API、型、保存レコード構造、暗号方式、KDF、salt / nonce、具体的な HD 導出パス値、FFI / WASM 実装、メモリ配置、zeroize 方法、対象 OS / Browser バージョン等は仕様設計またはリリース要件で決定する。

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
- Profile は Symbol / NEM の特定 Chain へ固定しない。
- Derived Software Key は Profile の Mnemonic から導出する。
- Imported Software Key は外部秘密鍵を既存 Profile へ取り込む。
- Generated Software Key は Core が独立生成し既存 Profile へ追加する。
- Imported / Generated Software Key だけで Profile を作成できない。
- 同一 Mnemonic + 同一 Network の Profile 重複登録を拒否する。同一 Mnemonic + 異なる Network は別 Profile として許可する。
- 同一 Profile 内で同一秘密鍵に対応する Software Key を由来をまたいで重複登録しない。

### 2.2 Binding と Core

```text
Desktop / Mobile Application       Web / Browser Extension
             │                              │
        Native Binding                  WASM Binding
             │                              │
             └──────────────┬───────────────┘
                            ▼
                    Rust Wallet Core
```

Native Binding / WASM Binding は薄い境界層とし、Core と別系統の秘密情報管理、暗号化、署名、導出、Profile パスワード認可を実装しない。

Binding 方式によって Core の秘密情報管理方針、認可責務、秘密情報公開範囲を変更しない。

### 2.3 Profile パスワード

- Profile ごとに 1 つの Profile パスワードを使用する。
- Profile 配下の Mnemonic とすべての Software Key を同一 Profile パスワード保護単位とする。
- Software Key ごとの個別パスワードは設けない。
- Core は Profile パスワードを永続保存または継続的にキャッシュしない。
- Core は処理をまたぐ継続的な Unlocked 状態を保持しない。
- 秘密情報を必要とする処理ごとに Profile パスワードを受け取り、正しい場合だけ現在の処理を認可する。
- Profile パスワード紛失時の復旧・リセットは v1 で提供しない。
- Profile 作成およびパスワード変更では、未指定・空・Core が内部で補う既定値を拒否する。
- **最小長、最大長、文字種、複雑性、辞書チェック、既知の弱いパスワード拒否、強度表示等の品質ポリシーは上位 Application / Package の責任とし、Wallet Core は独自に評価しない。**
- KDF、salt、暗号方式、パラメータ等の暗号学的保護は Wallet Core の仕様設計で決定する。

### 2.4 外部へ委ねる責任

- UI / Application: ユーザー操作、公開情報表示、アカウント選択、ウォレット固有設定。
- 上位 Application / Package: Profile パスワード品質ポリシー。利便性のためパスワードを一時保持する場合の管理。
- Web Application / Browser Extension: JavaScript 側状態、Browser 固有 Storage、ページ / Extension 実行環境のセキュリティ。
- Network 層: REST、WebSocket、announce 等。
- Transaction 構築層: Transaction の生成・シリアライズ。
- Application / 上流側: 暗号化 Profile データのバックアップ、端末間移行、消失・破損からの復旧を提供する場合の責任。

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
- 保存済み暗号化 Profile データそのもののバックアップ・移行・復旧

---

## 3. 互換性基準

### 3.1 Symbol / NEM

v1 の Symbol / NEM における秘密鍵・公開鍵の対応、アドレス生成、署名および Mainnet / Testnet の Chain / Network 処理は、2026-08-17 時点の `symbol-sdk` **3.3.2** と互換であることを基準とする。

`symbol-sdk` の将来バージョンへ自動追従しない。基準変更時は互換性影響を別途判断する。

### 3.2 HD Wallet

HD Wallet は v1 対象とするが、具体的な Mnemonic 方式、seed 生成方式、導出パス、index 表現は本要件書で固定しない。

`symbol-sdk` 3.3.2 は Symbol / NEM の鍵・アドレス・署名結果の互換性検証基準として使用する。HD 導出パスそのものを `symbol-sdk` が規定しているとは扱わず、既存 Symbol / NEM Wallet との復元互換性を損なわない具体方式を仕様設計で固定する。

---

## 4. ユースケース

### UC-001 Profile を作成・復元する

Core が新規 Mnemonic を生成して Profile を作成できる。また既存 Mnemonic、Profile パスワード、Network から Profile を復元・作成できる。新規生成時は初回バックアップ確定のため Mnemonic を一時的に受け渡せるが、保存済み Mnemonic を後から通常結果として取得する機能は提供しない。

### UC-002 追加アカウントを導出する

保存済み Mnemonic、Profile の Network、指定 Chain、正しい Profile パスワードから秘密鍵を導出し、Derived Software Key として保存する。

### UC-003 秘密鍵をインポートする

正しい Profile パスワードを Core が認可した後、妥当な外部秘密鍵を Imported Software Key として既存 Profile へ保存する。認可・検証・保存失敗時は Profile 状態を変更しない。

### UC-004 Software Key を個別生成する

正しい Profile パスワードを Core が認可した後、Core が秘密鍵を生成し Generated Software Key として既存 Profile へ保存する。生成・検証・保存失敗時は Profile 状態を変更しない。

### UC-005 秘密情報を必要とする処理を行う

正しい Profile パスワードを処理ごとに提示した場合のみ秘密情報を一時利用する。処理終了後に継続的な Unlocked 状態を残さない。

### UC-006 Software Key で署名する

指定 Chain、Software Key、Profile パスワード、上流から渡された署名対象データを使用して署名する。Transaction の意味判断や構築は行わない。

### UC-007 Profile パスワードを変更する

正しい現在パスワードを必要とする。成功時は Profile 配下すべてを新パスワードで利用可能にし、旧パスワードを無効化する。失敗・中断時に部分変更を残さない。

### UC-008 Software Key / Profile を削除する

個別 Software Key 削除は対象鍵だけを削除する。Profile 削除は Mnemonic と配下の全 Software Key と Profile 自体を破棄する。いずれも正しい Profile パスワードを必要とし、部分削除を残さない。

### UC-009 Chain / Network を区別して利用する

同一 Profile 内で Profile の Network に対応する Symbol / NEM 双方の Derived / Imported / Generated Software Key を扱う。各 Software Key について指定 Chain の公開鍵・アドレス等を取得できる。

### UC-010 Binding 経由で Core を利用する

Desktop / Mobile は Native Binding、Web は WASM Binding から v1 Core 主要機能を利用できる。Binding により Core の責任・認可・秘密情報公開方針は変化しない。

---

## 5. 機能要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| FR-001 | MUST | Core は新規 Mnemonic 生成または既存 Mnemonic から、未指定でも空でもない Profile パスワードと Mainnet / Testnet を使用して Profile を作成・復元できること。Mnemonic なし Profile を作成しないこと。 |
| FR-002 | MUST | Mnemonic を Profile のルート秘密情報として Profile 管理下へ保存すること。 |
| FR-003 | MUST | 保存済み Mnemonic から Profile の Network と指定 Chain に対応する Derived Software Key を導出・保存できること。 |
| FR-004 | MUST | 正しい Profile パスワードを Core が認可し、妥当性を確認した外部秘密鍵だけを Imported Software Key として保存すること。失敗時は Profile 状態を変更しないこと。 |
| FR-005 | MUST | 正しい Profile パスワードを Core が認可し、妥当な独立生成秘密鍵だけを Generated Software Key として保存すること。失敗時は Profile 状態を変更しないこと。 |
| FR-006 | MUST | Mnemonic と全 Software Key を暗号化保存対象とし、平文で永続保存しないこと。 |
| FR-007 | MUST | 秘密情報を必要とする処理ごとに Profile パスワードを使用し、継続的な Unlocked 状態を保持しないこと。 |
| FR-008 | MUST | Derived / Imported / Generated を同じ秘密鍵利用ライフサイクルで扱うこと。 |
| FR-009 | MUST | 指定 Chain、Software Key、Profile パスワード、署名対象データから署名を生成し、`symbol-sdk` 3.3.2 と互換な外部検証結果となること。Profile の Network と矛盾する処理を許可しないこと。 |
| FR-010 | MUST | 正しい現在パスワードを要求して Profile パスワードを変更でき、失敗・中断時に部分変更を残さないこと。 |
| FR-011 | MUST | 正しい Profile パスワードを要求して個別 Software Key を削除でき、失敗・中断時に部分適用を残さないこと。 |
| FR-012 | MUST | 正しい Profile パスワードを要求して Profile、Mnemonic、全 Software Key を破棄でき、失敗・中断時に部分削除を残さないこと。 |
| FR-013 | MUST | Profile を Chain に固定せず、指定 Chain と Profile Network に対応する Derived / Imported / Generated Software Key の公開鍵・アドレス・署名結果を扱えること。 |
| FR-014 | MUST | Mnemonic 生成、秘密鍵導出、暗号化を含む Profile / Software Key 管理を Symbol / NEM で共通管理方針として扱うこと。 |
| FR-015 | MUST | Profile 作成時に Mainnet / Testnet を必須指定し保存すること。 |
| FR-016 | MUST | Profile の Network を作成後変更できないこと。 |
| FR-017 | MUST | 同一 Mnemonic + 同一 Network の Profile 重複登録を拒否し、異なる Network なら別 Profile を許可すること。 |
| FR-018 | MUST | 同一 Profile 内で同一秘密鍵に対応する Software Key の重複登録を由来をまたいで拒否すること。 |
| FR-019 | MUST | Native / WASM Binding から Profile 作成・復元、初回 Mnemonic バックアップ受渡し、Profile / 公開情報取得、追加導出、秘密鍵インポート、Software Key 生成、署名、パスワード変更、Software Key 削除、Profile 削除を利用できること。保存済み Mnemonic の通常取得および Profile データのバックアップ・復旧は含めないこと。 |
| FR-020 | MUST | Profile 作成・パスワード変更で未指定・空・Core 内部既定値の Profile パスワードを拒否すること。パスワード品質条件は上位 Application / Package の責任とし、Core は独自に要求しないこと。 |
| FR-021 | MUST | 新規生成または外部入力の Mnemonic / 秘密鍵について、承認済み妥当性基準を満たした値だけを登録・利用し、生成・検証・保存失敗時に不完全状態を登録せず既存 Profile を変更しないこと。 |

---

## 6. 非機能要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| NFR-001 | MUST | Desktop / Mobile / Web が対応 Binding 経由で共通 Core を利用し、秘密鍵処理を各 Application で再実装しないこと。 |
| NFR-002 | MUST | Core、Binding、Application の実装・レビュー・保守責任を区別でき、Binding が Core 責任や外部責任を重複実装しないこと。 |
| NFR-003 | MUST | Core、Binding、UI / Application、上位 Application / Package の責任境界を第三者が説明できること。 |
| NFR-004 | MUST | Native / WASM の違いによって秘密情報管理方針、認可責務、責任境界が変わらないこと。 |

---

## 7. セキュリティ要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| SEC-001 | MUST | 保存状態の Mnemonic / Software Key を暗号化対象とし平文永続保存しないこと。 |
| SEC-002 | MUST | 正しい Profile パスワードがない場合、秘密情報処理および Software Key 登録を成功させないこと。 |
| SEC-003 | MUST | 処理後に Mnemonic / 秘密鍵を平文で継続利用可能な状態として保持しないこと。 |
| SEC-004 | MUST | 破損または認証失敗した保存データを正常な秘密情報として利用しないこと。 |
| SEC-005 | MUST | 削除済み Software Key / Profile の秘密情報を再利用できないこと。 |
| SEC-006 | MUST | Profile パスワード変更は正しい現在パスワードと未指定でも空でもない新パスワードを要求し、成功後は旧パスワードを無効化すること。 |
| SEC-007 | MUST | Core は Profile パスワードを永続保存・継続キャッシュしないこと。上位が一時保持する場合の責任は上位にあること。 |
| SEC-008 | MUST | Profile 削除は正しい Profile パスワードを Core が認可し、認可失敗時は状態を変更しないこと。 |
| SEC-009 | MUST | 個別 Software Key 削除は正しい Profile パスワードを Core が認可し、認可失敗時は状態を変更しないこと。 |
| SEC-010 | MUST | 保存済み Mnemonic / 秘密鍵を通常結果として Application へ返さないこと。新規 Mnemonic 生成直後の初回バックアップ受渡しのみ例外とすること。 |
| SEC-011 | MUST | Binding は Mnemonic、秘密鍵、Profile パスワードを永続保存・継続キャッシュせず、別の秘密情報管理主体にならないこと。 |
| SEC-012 | MUST | Binding 境界を通過する秘密情報について、不必要な複製・長期保持を前提としないこと。具体方式は仕様設計で決定すること。 |
| SEC-013 | MUST | Profile パスワード紛失時に v1 は復旧・リセットを提供せず、正しいパスワードを必要とする処理を成功させないこと。 |
| SEC-014 | MUST | Profile パスワードを必要とする処理の認可は Core が行い、Binding / Application は認可を代替・回避できないこと。 |
| SEC-015 | MUST | 通常結果、失敗結果、入力エラー、認証失敗、破損データ処理、診断・補助出力へ Mnemonic、秘密鍵、Profile パスワードまたは復元可能表現を含めないこと。SEC-010 の初回 Mnemonic 受渡しを除く。 |
| SEC-017 | MUST | UI / Application / Binding / 上位側で秘密情報を一時的に扱う場合、取込み・初回バックアップ等の必要な処理範囲に限定し、成功・失敗・中断後に継続利用可能な状態や診断出力として残さないこと。 |
| SEC-018 | MUST | Profile パスワード変更、Software Key 削除、Profile 削除を外部観測上 atomic に扱い、失敗・中断時に部分適用を成功状態として残さないこと。 |
| SEC-019 | MUST | 認証、署名、導出、Software Key 登録・削除、パスワード変更、Profile 削除は要求対象 Profile のみに作用し、他 Profile へ越境しないこと。 |
| SEC-020 | MUST | WASM Binding / Application 境界を秘密情報の恒久的保護境界とみなさず、保存済み Mnemonic / 秘密鍵を通常結果として Web Application へ公開しないこと。 |

`SEC-016` は OPEN-002 により廃止した。Wallet Core 自身にパスワード品質または推測攻撃耐性の判定を要求しない。パスワードから保存秘密情報を保護する KDF 等の暗号学的設計は別途仕様設計で定める。

---

## 8. データ要件

| ID | 優先度 | 要件 |
| --- | --- | --- |
| DR-001 | MUST | Profile は Network、1つの Mnemonic、0個以上の Derived / Imported / Generated Software Key を持つこと。 |
| DR-002 | MUST | Mnemonic を Profile のルート秘密情報として全 Software Key と同じ秘密情報管理対象にすること。 |
| DR-003 | MUST | Profile 配下の Mnemonic / Software Key を同一 Profile パスワード保護対象とし、個別鍵パスワードを持たないこと。 |
| DR-004 | MUST | Software Key の由来を区別可能としても基本的な秘密鍵利用処理は同じライフサイクルで扱うこと。 |
| DR-005 | MUST | Profile は固定 Network を持ち Chain には固定されず、各 Software Key の指定 Chain / Network に対応する公開情報・署名結果を扱うこと。 |
| DR-006 | MUST | Profile 重複は Mnemonic + Network の組み合わせで判定すること。 |
| DR-007 | MUST | 同一 Profile 内で同一秘密鍵を重複管理しないこと。 |
| DR-008 | MUST | Symbol / NEM の秘密鍵・公開鍵、アドレス、署名および Network 処理結果は `symbol-sdk` 3.3.2 と互換であること。HD Wallet の具体的導出方式は既存 Wallet の復元互換性を維持する形で仕様設計に固定すること。 |

---

## 9. 受け入れ条件

| ID | 対応 | 受け入れ条件 |
| --- | --- | --- |
| AC-001 | FR-001, FR-015, FR-020 | 未指定・空・Core 既定値でない Profile パスワードと Network でのみ Profile を作成でき、Mnemonic なし Profile を作成しない。 |
| AC-002 | FR-002, FR-006, SEC-001 | 保存 Mnemonic は暗号化対象であり平文永続保存されない。 |
| AC-003 | FR-003, DR-005, DR-007 | 正しいパスワード、Profile Network、指定 Chain から Derived Software Key を追加でき、重複鍵を追加しない。 |
| AC-004 | FR-004, FR-018, FR-021 | 認可・妥当性確認・保存に成功した Imported Software Key だけを登録し、失敗時は Profile 状態を変更しない。 |
| AC-005 | FR-005, FR-018, FR-021 | 認可・生成・妥当性確認・保存に成功した Generated Software Key だけを登録し、失敗時は Profile 状態を変更しない。 |
| AC-006 | FR-006, SEC-001 | 全 Software Key が暗号化保存対象であり平文永続保存されない。 |
| AC-007 | FR-007, SEC-002, SEC-003, SEC-007 | 正しいパスワードの場合だけ現在の秘密情報処理が成功し、終了後に継続 Unlocked 状態を残さない。 |
| AC-008 | FR-008, DR-004 | Derived / Imported / Generated の由来にかかわらず同じ秘密鍵利用ライフサイクルで処理できる。 |
| AC-009 | FR-009, DR-008 | 署名結果が指定 Chain / Network に対する `symbol-sdk` 3.3.2 と互換な外部検証結果となる。 |
| AC-010 | FR-010, SEC-006 | パスワード変更成功後は新パスワードだけで秘密情報を利用できる。 |
| AC-011 | FR-011, SEC-009 | 個別 Software Key 削除で対象だけを削除し Profile / Mnemonic / 他鍵を保持する。認可失敗時は変更しない。 |
| AC-012 | FR-012, SEC-008 | Profile 削除で Profile、Mnemonic、全 Software Key を破棄し、認可失敗時は変更しない。 |
| AC-013 | FR-013, DR-005 | Derived / Imported / Generated すべてで指定 Chain / Profile Network の公開鍵・アドレス・署名結果を扱える。 |
| AC-014 | FR-014 | Symbol / NEM の Profile / Software Key 管理を共通管理方針で扱える。 |
| AC-015 | NFR-001, NFR-002 | Desktop / Mobile / Web から Binding 経由で共通 Core を利用でき、Core と Application の責任を区別できる。 |
| AC-016 | NFR-003 | Core、Binding、Application、上位 Package の秘密情報・パスワード責任を第三者が説明できる。 |
| AC-017 | SEC-004 | 破損・認証失敗データで秘密情報処理が成功しない。 |
| AC-018 | FR-001, FR-017, DR-006 | 同一 Mnemonic + 同一 Network を重複作成せず、異なる Network は別 Profile として作成できる。 |
| AC-019 | FR-016, DR-005 | Profile Network を作成後変更できない。 |
| AC-020 | FR-018, DR-007 | 同一秘密鍵を別由来または再導出で重複登録しない。 |
| AC-021 | FR-019, NFR-001 | Desktop Native Binding から v1 主要機能を利用できる。 |
| AC-022 | FR-019, NFR-001 | Mobile Native Binding から v1 主要機能を利用できる。 |
| AC-023 | NFR-002 | Binding が Core 責任、Wallet 固有ロジック、Network、Transaction 構築を独自実装しない。 |
| AC-024 | NFR-004 | Native / WASM で Core の秘密情報管理・認可・責任境界が同じである。 |
| AC-025 | SEC-010 | 通常処理結果として秘密鍵を Application へ返さない。 |
| AC-026 | SEC-010 | 保存済み Mnemonic を通常処理結果として Application へ返さない。 |
| AC-027 | SEC-011 | 処理後に Core / Binding が Profile パスワードを永続保存・継続キャッシュしない。 |
| AC-028 | SEC-012 | Binding 境界で不要な秘密情報複製・長期保持を前提としない。 |
| AC-029 | FR-020 | 未指定・空・Core 既定値の Profile パスワードで Profile 作成・パスワード変更が成功しない。Core は品質ポリシーを独自判定しない。 |
| AC-030 | SEC-013 | パスワード紛失時に復旧・リセット、秘密情報処理、パスワード変更、削除が成功しない。 |
| AC-031 | SEC-014 | Binding / Application の要求だけでは認可できず、Core が正しい Profile パスワードを認可する。 |
| AC-032 | SEC-015 | 初回 Mnemonic バックアップ例外を除き、外部出力・診断へ秘密情報または復元可能表現を含めない。 |
| AC-033 | DR-008 | Symbol / NEM の鍵・公開鍵・アドレス・署名・Network の互換性を `symbol-sdk` 3.3.2 と比較して判定できる。HD 導出方式は仕様で固定した互換ベクタにより判定する。 |
| AC-034 | FR-001, FR-019, SEC-010 | 新規 Mnemonic 生成成功時だけ初回バックアップ用の一時受渡しができ、保存済み Mnemonic の通常取得には使用しない。 |
| AC-035 | FR-021 | 妥当性基準を満たした Mnemonic / 秘密鍵だけを登録し、生成・検証・保存失敗時に不完全状態や既存 Profile 変更を残さない。 |
| AC-037 | SEC-017 | 一時的に扱った秘密情報を成功・失敗・中断後に継続利用可能状態または診断出力として残さない。 |
| AC-038 | SEC-018 | パスワード変更・鍵削除・Profile 削除は成功時に全体反映し、失敗時に外部観測上の部分適用を残さない。 |
| AC-039 | SEC-019 | 1つの Profile 操作が他 Profile の秘密情報・認証状態・利用可否・削除結果へ影響しない。 |
| AC-040 | FR-019, NFR-004, SEC-020 | Web / Browser Extension から WASM Binding 経由で v1 主要機能を利用でき、Native と同じ秘密情報管理・認可方針が適用される。 |

`AC-036` は OPEN-002 により廃止した。Wallet Core による Profile パスワード品質判定は受入対象としない。

---

## 10. 状態変更と失敗時整合性

次の操作は、成功時は要求結果を全体として反映し、保存失敗・処理中断・その他失敗時には外部観測可能な部分適用を成功状態として残さない。

- Profile パスワード変更
- Imported / Generated Software Key 登録
- Software Key 削除
- Profile 削除

要求対象 Profile 以外の秘密情報・認証状態・利用可否へ作用してはならない。

---

## 11. 未決定事項

**要件レベルの未決定事項は現時点でない。**

- `OPEN-001`: Closed。`docs/decisions/open-001.md` を参照。
- `OPEN-002`: Closed。`docs/decisions/open-002.md` を参照。
- 旧 `OPEN-003` 以降の解消済み事項は Git 履歴および過去レビューを参照する。

仕様設計で決定する具体方式は未決定事項ではなく、要件から仕様へ引き継ぐ設計事項として管理する。

---

## 12. 仕様設計への引継ぎ

### 12.1 Chain / HD Wallet

- `symbol-sdk` 3.3.2 と互換な秘密鍵・公開鍵、アドレス、署名、Network 処理
- Mnemonic の具体方式、seed 生成、HD 導出パス、index、Chain / Network 対応
- 既存 Symbol / NEM Wallet と復元互換性を確認する固定テストベクタ

### 12.2 秘密情報保護

- 暗号方式、KDF、salt / nonce、パラメータ
- Vault / 保存形式、再暗号化方式
- Profile パスワード受渡し方式
- メモリ上の秘密情報保持時間、所有権、コピー回数、zeroize / 解放方法
- 生成 Mnemonic 初回バックアップ受渡し方式

Profile パスワードの品質ポリシーそのものは Core 仕様設計の対象外である。

### 12.3 Binding

- Native Binding / WASM Binding の具体方式
- FFI、言語間型変換、エラー表現
- WASM / JavaScript 境界の秘密情報受渡し・コピー・消去
- Browser 固有 Storage と Application の責任分界
- 対象 OS / Browser / バージョン、ビルド・配布方式

### 12.4 状態管理

- Profile / Software Key ID、データ形式、スキーマ
- 重複判定方式
- atomic なパスワード変更・登録・削除を実現する保存方式
- Profile 間分離を保証する識別・アクセス方式

---

## 13. レビュー指摘への対応状態

`requirements-review-002.md` の RR-001〜RR-017 を、現在の要件および決定記録に照らして整理する。

| ID | 現在の状態 | 対応 |
| --- | --- | --- |
| RR-001 | Resolved | OPEN-001 を `symbol-sdk` 3.3.2 互換基準として確定。HD導出パスは仕様設計へ分離。 |
| RR-002 | Resolved | 未指定・空・Core既定値を拒否。 |
| RR-003 | Resolved | Mnemonic / Software Key の暗号化保存を明示。 |
| RR-004 | Resolved | 公開情報と秘密情報の返却境界を明示。 |
| RR-005 | Resolved | `DEC-REQ-001` により第三者追跡可能な承認記録を追加。 |
| RR-006 | Resolved | 処理単位の認可と継続 Unlocked 状態禁止を明示。 |
| RR-007 | Resolved | パスワード復旧非提供、Core認可責任を明示。 |
| RR-008 | Resolved | 失敗・診断を含む秘密情報非開示を明示。 |
| RR-009 | Resolved | Imported / Generated 登録のパスワード認可と失敗時状態不変を明示。 |
| RR-010 | Resolved | 初回 Mnemonic 受渡しと Profile データバックアップ責任を分離。 |
| RR-011 | Resolved | Derived / Imported / Generated すべての公開情報利用を明示。 |
| RR-012 | Resolved by decision | OPEN-002 によりパスワード品質ポリシーは上位責任と決定。Coreの品質判定要求は廃止。 |
| RR-013 | Resolved | Mnemonic / 秘密鍵の妥当性確認と失敗時未登録を明示。 |
| RR-014 | Resolved | 一時秘密情報の処理範囲・終了後非保持を明示。 |
| RR-015 | Resolved | `symbol-sdk` 3.3.2 互換の外部検証基準を明示。 |
| RR-016 | Resolved | 状態変更の部分適用禁止を明示。 |
| RR-017 | Resolved | Profile 間の越境禁止を明示。 |

過去の review ファイルはその時点の監査記録であり、履歴性を保つため内容を書き換えない。

---

## 14. 参照資料

| 資料 | 用途 |
| --- | --- |
| `docs/consept/concept-sheet.md` | 上位コンセプト、v1範囲、責任境界 |
| `docs/decisions/requirements-baseline-001.md` | 初期承認ベースライン、RR-005追跡 |
| `docs/decisions/open-001.md` | Symbol / NEM互換性基準 |
| `docs/decisions/open-002.md` | Profileパスワード品質の責任分界 |
| `docs/knowledge/symbol-technicalref-jp.pdf` | Symbolの鍵・署名・Network・アドレス前提 |
| `docs/knowledge/nem-technicalref.pdf` | NEMの鍵・署名・Network・アドレス前提 |
| `docs/reviews/requirements/requirements-review-002.md` | RR-001〜RR-017の履歴レビュー |

本書を v1 要件の単一の現行正本とする。決定記録は本書の根拠・変更理由・追跡性を提供し、要件本文と矛盾する別 amendment を並存させない。