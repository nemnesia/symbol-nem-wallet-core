# Native / WASM Binding 基本設計

## 1. 目的、対象、対象外

本書は、Rust Wallet Coreを Desktop / Mobile / Web のApplicationへ接続する Native / WASM binding の責務、依存方向、trust boundary、所有権および設計判断を定める。

対象は `bindings/native` の Native C ABI と `wasm-bindgen` を使用する WASM binding である。BindingはCoreの単一実装を各環境へ橋渡しする。Coreの暗号化、Mnemonic validation、HD導出、署名、Profile password認可および重複判定をbindingへ複製しない。

API名、DTO field、wire format、error code、free関数の全契約は `docs/specifications/specification.md` と公開ヘッダーの正本に従う。本書は、それらの責務と境界を定める。

## 2. 上流根拠とコンテキスト

- `docs/requirements/requirements.md` §2.2、§6〜§7、§12.3
- `docs/specifications/specification.md` §2、§9〜§13
- `docs/design/architecture.md` §3〜§7

```text
Desktop / Mobile Application       Web Application / Browser Extension
             │                                  │
        Native C ABI                        wasm-bindgen
             │                                  │
             └──────────────┬───────────────────┘
                            ▼
                    Rust Wallet Core
```

NativeとWASMは異なる実行環境の境界であるが、Coreの秘密情報管理、認可責任、公開範囲および失敗時方針を変更しない。

## 3. Bindingの責務と依存方向

Bindingが行うのは次の橋渡しである。

- 入力・出力の型変換
- raw byte列、opaque Store、Pending Profileおよび署名payloadの受渡し
- 固定長ID、Network、Chainおよび公開DTOの変換
- Coreの安定error / warningを実行環境へ写像すること
- Native / WASM側のlifecycle、buffer ownershipおよび解放契約の橋渡し

依存方向は `Application → Binding → Rust Wallet Core` とする。Bindingは意味検証、認証、暗号、導出、署名、Transaction解釈またはWallet固有の表示判断を行わない。

入力の意味と処理可否はCoreへ委譲する。BindingがSymbol / NEM、Mainnet / TestnetまたはNetworkとChainの組合せを独自に解釈して、Coreと異なる結果を返してはならない。

## 4. Native C ABI

Native bindingは独立crateとして `cdylib` / `staticlib` を提供する。入力は呼び出し側が所有する借用buffer、出力はBindingが生成・所有するbufferまたは配列とし、対応する公開解放契約によって呼び出し側へ所有権を移す。

呼び出し側の任意の不正pointerを安全化する層ではない。NULL、length、出力初期化、出力bufferの再利用および解放の条件は、公開ヘッダーと仕様に定める。BindingはC ABI境界をpanicで越えず、安定したerrorへ変換する。

成功したowned bytes、warning配列、Profile一覧およびSoftware Key一覧は、対応する解放操作を一度だけ行う契約とする。秘密byte列を解放する際のzeroize範囲は `docs/design/security.md` と仕様に従う。

## 5. WASM / JavaScript boundary

WASMはJavaScriptと同じexecution contextで動作し、JavaScriptから秘密情報を隔離するtrust boundaryではない。WASM側のzeroizeはCoreまたはBindingが所有する一時bufferに対するものであり、呼び出し側のJavaScript `Uint8Array`、glue code、runtimeまたはBrowser processのコピーを完全消去するものではない。

秘密情報の入力・出力は、仕様で定める限定的な処理だけで raw / UTF-8 byte sequence として扱う。Mnemonic、Profile passwordおよびprivate keyをJavaScript string、hexまたはBase64へ暗黙変換しない。ApplicationがMnemonicを利用者へ表示するために文字列化する場合、その文字列の保持と表示責任はApplication側にあり、長期state、cache、storageまたはlogへ渡さない。

WebページのJavaScriptや悪意あるextensionに実行contextを奪われた場合、攻撃者は公開されたWASM APIを呼び出し得る。Browser Extensionでは可能な限りpage contextから分離したbackground / extension contextでCoreを管理する方針とする。これは実行環境の侵害を防止する保証ではない。

## 6. Secret boundary と公開範囲

通常処理では Mnemonic、private key、Profile password または復号済みpayloadをBindingから返さない。初回 Mnemonic backup handoff、復元時の入力および正しいProfile passwordを伴う明示的な個別エクスポートは、要件・仕様に定める処理でのみ受け渡す。

`sign()` は上位層から受け取ったraw payloadに対する署名primitiveである。BindingはTransaction内容の解釈、human-readable確認、署名承認UIまたは権限管理を行わない。

Bindingは秘密入力を処理完了後まで保持せず、不要なコピーを作らない。必要な一時コピーは可能な範囲でzeroizeする。Bindingのmemory best effortを理由に、秘密情報の継続保持、cache、global state、diagnostic、log、localStorage、sessionStorageまたはIndexedDBへの保存を許容しない。

## 7. 採用した設計判断と代替案

### wasm-bindgen と Native C ABI

- 判断: WASMは `wasm-bindgen`、Nativeは独立crateのC ABI (`cdylib` / `staticlib`) を使用する。
- 根拠: 各環境から同一Coreへ接続し、WASMではbyte列とJavaScript境界、Nativeでは言語非依存のABIと所有権を表現する必要がある。
- 代替案: 実行環境ごとにCoreの秘密情報処理を実装する方式は、責任と検証の重複を生むため採用しない。
- 影響: Bindingの方式が変わっても、Coreの責任、認可および秘密情報公開範囲は変わらない。
- 見直し条件: v1の公開対象環境、ABI / WASMの上位要件または公開仕様を変更する場合。

### Bindingをthin boundaryとする

- 判断: Bindingは型、buffer、error、warning、lifecycleおよびownershipの変換だけを行う。
- 根拠: Coreを単一の実装源とし、暗号、Mnemonic、導出、署名および重複判定の実装差異を防ぐ。
- 代替案: Bindingに利便的なvalidationや署名前処理を追加する方式は、Coreと異なる外部可視動作を生むため採用しない。
- 影響: Coreの公開契約をBindingへ写像する検証が必要になる。Bindingの固有契約はCoreの正本を上書きしない。
- 見直し条件: CoreとBindingの責任分担を変更する上位要求が承認された場合。

### WASMを秘密情報の保護境界としない

- 判断: JavaScript / WASM execution contextを恒久的な秘密情報隔離境界とみなさない。
- 根拠: 同一context内のJavaScript、glue code、runtimeおよびBrowser侵害時の到達可能性。
- 代替案: WASMがJavaScriptやBrowserの侵害を防ぐと扱う方式は、Coreの保証範囲を越えるため採用しない。
- 影響: Application側のstate、表示、StorageおよびBrowser構成を別責任として明示する。
- 見直し条件: 実行環境のtrust boundaryに関する上位要求または仕様が変更された場合。

## 8. 未決定事項と仕様への引継ぎ

- 公開APIの全method、parameter、DTO field、error / warningの詳細
- Native headerの正確なstruct、pointer、length、aliasおよびfree契約
- WASM exportの正確な型、生成物、package layoutおよびJavaScript側の呼び出し契約
- byte列のencoding、Wallet Store / Pending Profileのwire format、schemaおよびversion
- secret bufferの具体的なcopy、保持期間、zeroizeおよびruntime制約
- 対象OS・Browser、build、distribution、page / extensionの具体的な分離方式

これらは本書で推測せず、承認済み仕様と公開ヘッダーへ引き継ぐ。

## 9. Traceability と参照資料

| 設計領域 | 参照 |
| --- | --- |
| 共通責任と依存方向 | `docs/design/architecture.md` §3〜§4 |
| Binding要求と責任境界 | `docs/requirements/requirements.md` §2.2、§2.4、§6、§7 |
| API、error、secret入出力 | `docs/specifications/specification.md` §9〜§10、§12〜§13 |
| Store / Pendingのopaque境界 | `docs/specifications/specification.md` §2.3、§8、`docs/specifications/wallet-store-format-v1.md` |

設計判断の履歴ではなく、現在有効なBindingの設計・判断は本書に統合する。
