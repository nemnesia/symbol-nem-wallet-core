# Native / WASM Binding 実装方針

## 決定

- WASM は `wasm-bindgen` を使い、`Uint8Array` と JavaScript object を公開する。
- Native は独立crate `bindings/native` の C ABI (`cdylib` / `staticlib`) と公開ヘッダーを使う。
- Bindingは入力buffer、固定長ID、DTO、error code、warningおよび所有権の変換だけを担当する。

本決定は v1 の Binding 方式を固定する。外部可視のBinding契約は仕様書 §13 に定め、本方式を変更する場合は本決定と仕様書 §13 を更新する。

## 選択理由

`wasm-bindgen` は、仕様で定められた `Uint8Array` とJavaScript側の構造化結果を直接表現でき、
WASM専用の生成器やpackage layoutを追加で固定せずに公開APIを提供できる。NativeはC ABIを
選ぶことで、Rust以外の利用者から同じCore APIへアクセスでき、ヘッダーにbyte sequenceと
buffer解放規約を明示できる。どちらもCoreを単一の実装源として利用できるため、暗号化、
Mnemonic validation、HD derivation、signing、duplicate detectionをBindingへ複製しない。

## 共通境界

- mnemonicとpasswordはUTF-8 byte列としてCoreへ渡す。
- private key、payload、signature、public key、StoreおよびPending Profileはraw byte列として扱う。
- UUID、network、chain、originはBindingのDTOへ変換するが、意味の検証と処理はCoreへ委譲する。
- Coreの安定error codeだけを返し、秘密情報をerrorまたはwarningへ含めない。
- WASMの一時入力とNativeの出力解放では、秘密byte列が長く残らないようzeroize対応を行う。
- Nativeの入力は借用、出力は明示的に解放する。WASMの戻り値はJavaScript側が所有するコピーである。

## WASM / Browser security contract

WASMはJavaScriptと同じexecution context内で動作するため、JavaScriptから秘密情報を隔離する
security boundaryではない。Rust側の`zeroize`はCoreが所有する一時bufferに適用されるが、
呼び出し側のJavaScript `Uint8Array`、WASM glue codeまたはruntimeが保持するコピーを自動的に
消去するものではない。

同じJavaScript execution contextがXSSまたは悪意あるextensionに奪われた場合、攻撃者はWASM
APIを呼び出せる。WebページのJavaScriptへWallet Coreを直接公開する設計は推奨せず、Browser
Extensionでは可能な限りpage contextから分離されたbackground / extension contextでCoreを
管理する。

`sign()`はTransaction内容を解釈しないraw byte列への署名primitiveである。Transaction parsing、
human-readable確認、署名承認UIおよび権限管理は呼び出し側の責務であり、Coreはこれらを提供しない。
`export_mnemonic`と`export_private_key`は明示的な秘密情報exportであり、通常の署名処理では
使用しない。秘密情報をJavaScript `string`へ変換すると明示的zeroizeが困難になるため、入力は
可能な限り`Uint8Array`で扱う。

## Native C ABI safety contract

- `SnwcBytes`は呼び出し側が所有するborrowed inputであり、`len == 0`なら`ptr == NULL`を許容する。
  `len != 0`では、呼び出し中に有効で読み取り可能なbufferを渡さなければならない。
- output pointerはNULLを許容せず、NULLなら`InvalidArgument`を返す。呼び出し側はoutput構造体を
  初期化し、既存のowned bufferをfreeしてから再利用する。
- エラー時は既存のcaller-owned outputを上書きせず、途中生成したowned bufferはBinding側で
  解放する。panicはC ABIを越えず、安定したerror codeへ変換する。
- 成功した`SnwcOwnedBytes`、warning配列、Profile一覧、Software Key一覧は、対応する
  `snwc_free_*`を一度だけ呼び出して解放する。`snwc_free_bytes`は内容をzeroizeしてから解放する。
- free APIへ任意のpointerや不整合なlengthを渡すことは未定義であり、BindingはC callerの完全に
  不正なpointerを安全化するAPIではない。
