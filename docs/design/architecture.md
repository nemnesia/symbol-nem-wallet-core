# Wallet Core 基本設計

## 1. 目的、対象、対象外

本書は、`symbol-nem-wallet-core` v1 の責務、境界、依存方向、データ所有および主要ライフサイクルを定める基本設計と、その設計判断の現行正本である。

対象は、Desktop / Mobile / Web の Symbol / NEM ウォレットから利用する Rust Wallet Core と、Coreへ接続する Native / WASM binding である。Webには Web Application と Browser Extension を含める。

Coreは、Profileを単位として Mnemonic と Software Key の生成、復元、導出、取込み、暗号化保存、署名、個別エクスポートおよび削除を扱う。Profile の Network、Software Key の Chain、Symbol / NEM の違いは明示的に扱い、暗黙に共通化しない。

次は本設計の対象外である。

- Wallet UI、ユーザー操作、表示名およびウォレット固有設定
- REST / WebSocket / announce、ノード選択および Explorer
- Transaction の構築、シリアライズ、意味解釈および署名承認UI
- Hardware Wallet、External Signer、OS Keychain / Secure Enclave / TPM
- Profile データの保存先選択、バックアップUI、同期、端末間移行および復旧

対象外の具体的な契約は、上位要件および仕様で定めた責任境界に従う。

## 2. 上流根拠と用語

### 2.1 上流根拠

- `docs/consept/concept-sheet.md`: 製品目的、v1範囲、対象ユーザーおよび責任境界
- `docs/requirements/requirements.md`: Profile、Mnemonic、Software Key、Chain / Network、責任、セキュリティおよび受入条件
- `docs/specifications/specification.md`: Core、状態遷移、暗号利用、API境界および Binding 契約
- `docs/specifications/wallet-store-format-v1.md`: Wallet Store の wire-level 契約

本書は、上記の要求・仕様を実装へ配置するための責務と境界を整理する。API、wire format、暗号パラメータおよび protocol constant の正本は本書ではなく、それぞれの要件・仕様である。

### 2.2 用語

- **Profile**: Network と1つの Mnemonic、および0個以上の Software Keyを持つ秘密情報管理の単位。
- **Mnemonic**: Profile のルート秘密情報。Coreは生成、復元、導出および保護を担う。
- **Software Key**: Derived、Imported または Generated の秘密鍵を、同じ鍵管理ライフサイクルで扱う単位。
- **Wallet Store**: Coreが読み込み・検証・更新する opaque な保存blob。保存先はCoreの責任外である。
- **Binding**: CoreとNative / WASMの実行環境の間で型、buffer、errorおよび所有権を橋渡しする薄い境界層。

## 3. システムコンテキストと trust boundary

```text
Desktop / Mobile Application       Web Application / Browser Extension
             │                                  │
        Native Binding                       WASM Binding
             │                                  │
             └──────────────┬───────────────────┘
                            ▼
                    Rust Wallet Core
                     │              │
             opaque Store       Symbol / NEM crypto rules
                     │              │
           Application storage    上位 Transaction / Network 層
```

### 3.1 Core boundary

Coreは秘密情報を必要とする処理の意味、認可、検証、暗号化・復号、導出、署名および状態変更を所有する。Coreは処理をまたぐ継続的な Unlocked 状態や Profile password の永続保存・継続キャッシュを持たない。

Core管理下の秘密情報は、通常の処理結果としてApplicationへ返さない。初回 Mnemonic backup handoff と、正しい Profile password を伴う明示的な個別エクスポートは、上位仕様で定めた限定的な例外である。返却後の表示、保管および紛失防止は利用者と上位Applicationの責任とする。

### 3.2 Application / storage boundary

Applicationはユーザー操作、公開情報表示、アカウント選択、ウォレット固有設定および Core が返す opaque Store の永続化を担う。保存先が filesystem、IndexedDB その他のどれであるかはApplicationの責任であり、Coreへ移さない。

Application / Binding は秘密情報を別の継続管理主体にしてはならない。Web実行環境、JavaScript状態およびBrowser固有Storageは恒久的な秘密情報保護境界ではない。

### 3.3 外部層の境界

Network層は通信、Transaction構築層はTransactionの生成・シリアライズを担う。Coreの署名は上位から受け取った payload に対する primitive であり、Transactionの意味解釈や利用者の承認判断を行わない。

## 4. コンポーネント責務と依存方向

### 4.1 Rust Wallet Core

Coreは次を所有する。

- Profile、Mnemonic、Software Key の状態とライフサイクル
- Profile password の処理単位ごとの認可
- Mnemonic の生成・検証・復元、HD導出および Software Key の生成・取込み
- Symbol / NEM の Chain、Profile Network、公開情報および署名の処理
- Store の構造検証、秘密情報の暗号化・復号、重複判定および atomic replacement image の生成
- 失敗時に既存状態を変更しないこと、対象外 Profileへ越境しないこと

### 4.2 Binding

Native / WASM binding は、Coreの共通動作を各実行環境へ公開するための型変換、buffer transfer、error / warning mapping、lifecycle および memory ownership の橋渡しだけを行う。暗号化、認可、Mnemonic validation、導出、署名、重複判定を複製しない。

### 4.3 Application

Applicationは Core が返す公開情報と識別子を表示し、アカウント選択、ユーザーへの Mnemonic backup handoff、秘密情報の明示的な個別エクスポート後の取扱い、Storeの保存・置換および外部通信を担う。Coreが返した秘密情報を通常の状態管理や永続Storageへ移さない。

### 4.4 依存方向

依存方向は `Application → Binding → Rust Core` とする。Network / Transaction層はCoreの署名primitiveへ payload を渡すが、Coreの秘密情報管理を代替しない。Binding固有の判断をCoreや別Bindingへ横展開せず、Coreを単一の実装源とする。

## 5. データ所有、秘密情報境界、lifecycle

### 5.1 Profile と秘密情報

Profileは、固定された Mainnet / Testnet Network、Mnemonic、Derived / Imported / Generated Software Keyを所有する。MnemonicとSoftware Keyは同じ Profile password 保護単位に属する。Software Keyの由来によって、Coreの管理・認可・削除・署名利用の責任を分けない。

Mnemonicの具体的な保存表現、seedの生成、導出規則、暗号方式、保存schemaおよび入力・出力形式は仕様の責任とする。本書は、MnemonicがProfileのルート秘密情報であり、Profile lifecycleの対象であるという所有関係だけを定める。

### 5.2 Store

Coreは保存先を所有せず、opaque な Wallet Store を入力として完全な replacement Store を生成する。Applicationは成功した replacement Storeを環境固有のatomicな方法で保存し、Coreは更新途中の断片を外部へ返さない。

Storeの wire encoding、version、unknown field、AAD、migrationおよび公開 error は `wallet-store-format-v1.md` と `specification.md` の正本とする。Core外のApplicationは opaque blob の内部意味を解釈して編集しない。

### 5.3 Lifecycle と失敗時責任

主要なmutationは、Profile作成・復元、Software Key登録、Profile password変更、Software Key削除およびProfile削除である。成功時は対象操作を全体として反映した replacement Storeだけを返し、失敗・中断時は既存Storeを成功状態として変更しない。

新規Mnemonic生成では、Applicationによる初回backup handoffとCoreのProfile確定を分離する。handoff未完了・中断・失敗時に正常なProfileを残さず、Applicationと利用者が受渡し後のMnemonicを保管する。Profile削除ではCore管理下のMnemonicとSoftware Keyを破棄するが、削除前から利用者が保持するMnemonicによる新規Profile作成は、削除済みCoreデータの復旧とは扱わない。

## 6. 主要フロー、失敗、atomicity、再試行・再起動

### 6.1 秘密情報を必要とする処理

1. Applicationが対象Profileと処理に必要な入力を指定する。
2. CoreがStoreを構造検証し、対象を一意に解決する。
3. Coreが処理ごとのProfile password認可を行う。
4. Coreが必要な秘密情報を一時利用し、導出・検証・署名・mutationを実行する。
5. Coreが秘密情報を利用終了し、成功時だけ結果またはreplacement Storeを返す。

認証失敗、入力不正、Store破損、検証失敗または保存bytes生成失敗時は、秘密情報処理を安全側に終了し、秘密情報や部分適用を返さない。

### 6.2 再試行・再起動

Coreは処理をまたぐ unlocked stateを保持しないため、再試行は入力Storeと処理入力を再提供して行う。Applicationは成功したreplacement Storeを保存できなかった場合、旧Storeを維持し、未確定の途中状態をCoreの成功状態として扱わない。Pending Profileの再利用、期限および具体的な再試行条件は仕様へ委譲する。

### 6.3 個別エクスポート

MnemonicまたはSoftware Key秘密鍵の個別エクスポートは、正しいProfile passwordを伴う明示的な要求に限定する。返却対象は要求した秘密情報だけであり、失敗時は秘密情報とStore変更を返さない。Applicationは返却後の表示・保管・紛失防止を担う。

## 7. Symbol / NEM、Mainnet / Testnet、Core / Binding の境界

- Profile Networkは Mainnet / Testnet のいずれかに固定し、作成後に変更しない。
- Software Keyは指定された Symbol または NEM Chainに固定する。
- Chainごとの鍵、公開情報、署名およびHD導出の違いはCoreが扱う。Symbolの処理をNEMへ、MainnetをTestnetへ暗黙に流用しない。
- Native / WASM は同一Coreの責務、認可および秘密情報公開方針を共有する。
- Bindingはopaque byte列、公開識別情報および仕様で定めるDTOを橋渡しするが、Chain / Networkの意味検証や秘密情報処理の責任を引き取らない。
- Chain / Network、HD導出、署名対象byte列、Store wire formatおよび error code の具体契約は仕様正本に従う。

## 8. 運用前提、resource、検証方針

- CoreのStore入力、Profile数、Software Key数、CBOR構造および秘密情報bufferには、保存フォーマット仕様で定めるresource limitを適用する。
- Applicationは保存先のatomic replacement、バックアップ、同期、移行および復旧の責任を明示する。
- Web実行環境ではJavaScript、WASM runtime、Browser process内の全コピー消去を保証しない。これは秘密情報の長期保持を正当化しない。
- Native / WASMの同一入力・同一fixtureに対する結果一致を検証境界とする。Binding固有の変換・所有権・free契約は `docs/design/bindings.md` と仕様で確認する。
- Symbol / NEMの互換性、HD導出、Store wire format、error mappingおよび異常系は仕様・fixture・テストで検証する。Coverageだけを仕様適合性やSecurityの単独証拠としない。

## 9. 採用した設計判断と代替案

### 単一Rust Coreを実装源とする

- 判断: Desktop / Mobile / Webから同じRust Coreを利用し、秘密情報処理をBindingやApplicationへ複製しない。
- 根拠: 要件の共通責任境界、同一Core利用および責任分離。
- 代替案: 実行環境ごとに鍵管理を実装する方式は、処理差異と秘密情報の管理主体を増やすため採用しない。
- 影響: 各環境の接続方式は異なっても、Coreの秘密情報方針と認可責任は変わらない。
- 見直し条件: v1の対象環境または上位要件が変更され、単一Coreを維持できない場合は、責任境界と相互運用性を再評価する。

### Profileを秘密情報管理の単位とする

- 判断: Network、Mnemonic、Software KeyおよびProfile password保護をProfile単位で扱う。
- 根拠: 要件のProfile管理モデルと、Software Key由来をまたいだ共通ライフサイクル。
- 代替案: Software Keyごとに独立した保護単位を設ける方式は、v1のProfile password責任と異なるため採用しない。
- 影響: Profile password変更・削除・復号のatomicityはProfile全体を対象とする。
- 見直し条件: Profileの秘密情報単位、Network固定またはpassword責任の上位要件が変更された場合。

### Storeをopaque blobとしてApplicationへ返す

- 判断: Coreが検証とreplacement Store生成を行い、Applicationは保存先とatomic replacementだけを担う。
- 根拠: Store wire仕様、Applicationへの内部意味解釈の移転禁止および失敗時部分適用禁止。
- 代替案: ApplicationがStore fieldを直接編集する方式は、認証・AAD・unknown field保持の責任を分散させるため採用しない。
- 影響: Store mutation、migrationおよびunknown fieldの扱いはCoreの仕様契約に従う。
- 見直し条件: Store保存責任、wire formatまたはmigration責任の変更時。

## 10. 未決定事項と仕様への引継ぎ

次は本書で新たに決定せず、要件・仕様の正本へ引き継ぐ。

- 公開 API、DTO、error code、Native ABI、WASM exportおよび所有権の詳細
- Wallet Store / Pending Profile のwire field、version、canonical encoding、AADおよびmigration
- Mnemonic、HD導出、Symbol / NEMの暗号・署名・アドレスに関する具体的な方式とprotocol constant
- KDF、AEAD、salt、nonce、鍵長、署名対象byte列およびzeroizeの細かな契約
- 対象OS・Browser、package layout、配布方式、保存先APIおよびUI
- timeout、Pending再利用、resource上限を超えた入力の公開errorおよび個別テストケース

上記が本書の責務境界やtrust boundaryを変更する場合は、先に要件と本書の整合を再確認する。

## 11. Traceability と参照資料

| 設計領域 | 上流・下流参照 |
| --- | --- |
| 目的、対象、対象外 | `docs/consept/concept-sheet.md` §1〜§13、`docs/requirements/requirements.md` §1〜§2 |
| Profile / Mnemonic / Software Key | `docs/requirements/requirements.md` §2、§4〜§7、`docs/specifications/specification.md` §1〜§5 |
| 暗号化、認可、atomicity | `docs/requirements/requirements.md` §7、§10、`docs/specifications/specification.md` §6、§11〜§12 |
| Store | `docs/specifications/specification.md` §7、`docs/specifications/wallet-store-format-v1.md` §1〜§14 |
| Binding | `docs/requirements/requirements.md` §2.2、§12.3、`docs/specifications/specification.md` §13、`docs/design/bindings.md` |
| Security設計 | `docs/requirements/requirements.md` §7、`docs/specifications/specification.md` §12、`docs/design/security.md` |

設計判断の背景を含む過去のレビュー記録は `docs/reviews/` に履歴として残る。本書および関連する現行文書が設計・設計判断の正本である。
