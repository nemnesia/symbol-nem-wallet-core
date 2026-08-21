# Native / WASM Binding 実装方針

## 決定

- WASM は `wasm-bindgen` を使い、`Uint8Array` と JavaScript object を公開する。
- Native は独立crate `bindings/native` の C ABI (`cdylib` / `staticlib`) と公開ヘッダーを使う。
- Bindingは入力buffer、固定長ID、DTO、error code、warningおよび所有権の変換だけを担当する。

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
