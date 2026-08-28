# 秘密情報・署名 Security 基本設計

## 1. 目的、対象、対象外

本書は、Wallet Core v1 における秘密情報の所有、trust boundary、保持・破棄、認可、署名処理およびconstant-time方針に関する基本設計と設計判断を定める。

対象は Rust Core と Native / WASM binding が明示的に所有または生成する秘密情報、およびその境界である。暗号方式、KDF、nonce、salt、署名対象byte列、error codeおよびwire formatの具体契約は `docs/specifications/` の正本に従う。

## 2. 上流根拠と security boundary

- `docs/consept/concept-sheet.md` §1、§7、§9〜§10
- `docs/requirements/requirements.md` §2.3〜§2.4、§7、§12.2〜§12.3
- `docs/specifications/specification.md` §2、§6、§8、§10〜§13
- `docs/design/architecture.md` §3〜§6
- `docs/design/bindings.md` §5〜§6

```text
User / Application input
          │ temporary boundary
          ▼
 Native / WASM Binding
          │ thin boundary
          ▼
      Rust Core  ─────── opaque Wallet Store
          │
          └────── Symbol / NEM signing and derivation rules
```

CoreとBindingは、ApplicationやBrowserの侵害そのものを防止する境界ではない。境界の目的は、秘密情報処理の責任、認可、返却範囲、所有期間および失敗時の扱いを一貫させることである。

## 3. 秘密情報の所有とライフサイクル

### 3.1 Coreの所有範囲

Coreが明示的に所有または生成する次のbufferは、仕様で定める利用終了時にzeroize対象とする。

- Profile passwordのRust側コピー
- Mnemonic entropyおよび正規化済みMnemonic buffer
- seed
- private key
- Profile encryption key
- 復号済みProfile payload
- Coreが明示的に確保した秘密情報を含む署名temporary

Coreは不要なsecret copyを作成せず、秘密情報を `Debug`、`Display`、serde diagnostic、error、warningまたはlogへ含めない。Application / Bindingが保持する入力buffer、JavaScript string、runtime、allocator、OSまたはプロセス全体の全copy消去はCoreの保証範囲外である。

### 3.2 Password と unlocked state

Profile passwordは処理ごとに受け取り、その処理の認可にだけ使用する。Coreはpasswordを永続保存・継続cacheせず、処理をまたぐ継続的なUnlocked stateを持たない。パスワード品質方針は上位Application / Packageの責任であり、Coreの暗号学的保護方式とは分離する。

### 3.3 外部へ返す秘密情報

Mnemonic、private key、seed、復号済みpayloadおよびpasswordを通常処理の結果として返さない。初回Mnemonic backup handoffと、正しいProfile passwordを伴う明示的な個別exportだけを仕様上の例外とする。返却後の表示・保管・紛失防止はApplication / 利用者の責任とする。

### 3.4 失敗時

認証失敗、Store破損、入力不正、妥当性検証失敗、暗号失敗または保存bytes生成失敗時は、秘密情報、復号済み結果、replacement Storeおよび部分適用を返さない。失敗した操作は既存Storeを変更せず、秘密情報を継続利用可能な状態、診断出力またはcacheに残さない。

## 4. Chain / Network と署名境界

- Profile Networkは Mainnet / Testnet のいずれかに固定し、Software Keyの Chain は Symbol / NEM のいずれかに固定する。
- Symbol / NEM、Mainnet / Testnet、HD導出、公開情報および署名の差異をCoreが扱う。BindingやApplicationはchain・networkを暗黙に変換しない。
- `sign()` は上位層から渡されたraw payloadへの署名primitiveであり、Transactionの意味、generation hash、権限またはユーザー意図を判断しない。
- 署名対象の正確なbyte列、公開鍵・アドレス、Chain / Network互換性および具体的暗号方式は仕様とfixtureで固定する。

## 5. Constant-time 方針

### 5.1 Scalar算術の設計判断

秘密値を扱う scalar 加算・乗算は、固定長byte演算として維持する。`scalar_add_mod_order` と `scalar_mul_mod_order` では、秘密値に依存する分岐、loop countまたは配列indexを導入しない。

- 加算・減算は固定回数のbyte走査とする。
- 乗算は固定回数のbit処理とする。
- 結果選択はmask演算とし、秘密値依存のbranchを追加しない。
- 中間byte列、mask、carryおよびborrowは、仕様・実装で定める所有期間内にzeroize対象とする。
- 署名はraw payloadに対するprimitiveであり、Transactionの意味解釈を追加しない。

### 5.2 保証範囲

この方針はsource-levelの処理形状とCoreが所有するtemporaryを対象とする。最終machine codeのbranch生成、compiler / target固有の最適化、timing leakage、register、stack spill、runtime、allocator、OSおよび第三者ライブラリ内部の算術temporaryの完全消去は、この設計だけでは保証しない。

第三者暗号ライブラリ内部のtemporaryをzeroizeするためだけに、依存ライブラリのforkをv1の必須構成としない。現在の公開鍵生成・署名互換性と、Core側の所有期間・不要copy回避は別々に検証する。

### 5.3 変更条件

秘密値に依存するbranch、loopまたはindexが必要になった場合は、実装変更前に本設計の方針、仕様上の保証範囲、対象targetの検証方法およびSymbol / NEM固定fixtureへの影響を再確認する。optimized assembly inspectionや専門的なconstant-time検証が必要な場合は、対象releaseの検証計画へ引き継ぐ。wall-clock thresholdだけに依存する検証を単独の保証根拠としない。

## 6. Native / WASM の秘密情報境界

Native bindingの入力は借用、出力は明示的所有とし、解放時のzeroize範囲とC ABIの不正pointer前提は公開仕様・ヘッダーに従う。

WASMはJavaScriptと同じexecution context内で動作する。Mnemonic、Profile password、private keyおよび個別export結果は、仕様で定める場合だけmutable byte sequenceとして受け渡し、JavaScript stringへ暗黙変換しない。JavaScript `Uint8Array`、glue code、runtimeまたはBrowser processが保持するcopyの完全消去は保証しない。

Bindingはsecretをcomponent state、global state、cache、log、diagnostic、localStorage、sessionStorageまたはIndexedDBへ保存しない。必要な一時コピーは可能な範囲でzeroizeし、Application側の表示・保管責任とCoreの秘密情報責任を混同しない。

## 7. 採用した設計判断と代替案

### Core / Bindingの保護責任を分離する

- 判断: Coreは意味、認可、暗号、導出、署名およびsecret lifecycleを所有し、Bindingはownershipと型の橋渡しだけを行う。
- 根拠: 共通Coreを単一実装源とし、実行環境ごとの秘密情報管理差異を抑える要件・設計。
- 代替案: Bindingへ秘密情報処理を移す方式は、Coreとの実装・検証の二重化と境界漏れを生むため採用しない。
- 影響: Native / WASMの形式差は存在するが、認可責任とsecret公開範囲は一致する。
- 見直し条件: 上位要件またはtrust boundaryが変わり、CoreとBindingの責任再配置が必要になった場合。

### local patchを必須設計としない

- 判断: 依存暗号ライブラリ内部の算術temporaryをzeroizeするためだけのlocal patch / forkを、v1の規範構成・適合条件としない。
- 根拠: v1のzeroize保証対象をCore / Bindingが明示的に所有または生成するbufferに限定し、第三者ライブラリ内部やcompiler由来の全copyを保証しないsecurity boundary。
- 代替案: local patchを必須化する方式は、保証範囲を越える完全消去を暗黙に約束するため採用しない。
- 影響: local patchが存在する場合も、現行の公開API、署名bytes、公開鍵、address、Storeおよびwire formatの正本を変更しない。依存更新時は互換性とzeroize境界を再確認する。
- 見直し条件: 上位仕様が第三者ライブラリ内部のtemporaryまで保証対象に含める場合、または対象依存が公式に同等の保証を提供する場合。

## 8. 未決定事項と仕様への引継ぎ

- KDF、AEAD、salt、nonce、key length、parameterおよび保存schema
- 署名対象byte列、Symbol / NEMの具体的crypto constant、HD導出およびfixture
- Native C ABI / WASMの正確な公開型、error、free、copyおよびbuffer契約
- compiler、target、runtime、allocatorおよびBrowserを含む実行環境全体の消去保証
- releaseごとのassembly inspection、専門監査およびconstant-time検証の範囲

方式やパラメータを本書の判断だけで変更しない。上記は承認済み仕様、対象targetの検証計画およびリリースレビューへ引き継ぐ。

## 9. Traceability と参照資料

| 設計領域 | 参照 |
| --- | --- |
| Coreの責任、lifecycle、trust boundary | `docs/design/architecture.md` §3〜§6 |
| Bindingの秘密情報境界 | `docs/design/bindings.md` §5〜§6 |
| Profile / password / secret要件 | `docs/requirements/requirements.md` §2.3、§2.4、§7 |
| 暗号、認証、zeroize、Binding契約 | `docs/specifications/specification.md` §6、§10〜§13 |
| Wallet Storeの認証・保存形式 | `docs/specifications/wallet-store-format-v1.md` §5〜§12 |

設計判断の現在の正本は本書であり、過去のレビュー記録は `docs/reviews/` に履歴として保持する。
