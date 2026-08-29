# Security Review Checklist

この文書は Implementation Review のレビュー観点であり、新しい製品要求、security requirement、仕様、設計判断、API、policy を定義しない。Security Reviewer は対象変更から attack surface と secret path を特定し、該当する項目だけを適用する。全項目を機械的なチェックボックスとして実行・出力しない。各 finding は、実装、テスト、適用可能な specification / design / requirements、または確認済みの cryptographic / protocol fact へ追跡する。

## A. Secret lifecycle

対象は Mnemonic、private key、derived private key、seed、KDF-derived key、Profile password、復号済み Wallet Store material、temporary signing secret とする。generation、import、derivation、use、temporary copy、storage、replacement、deletion、drop、error path を追跡し、秘密情報が必要以上に長く生存していないか、失敗時や置換時にも古い値が残らないかを確認する。

## B. Copies / Zeroization

unnecessary clone / copy、temporary buffer、stack / heap temporary、serialization buffer、intermediate cryptographic value、`zeroize`、Drop path、early return、error path、必要に応じて panic path を確認する。`zeroize` crate の利用だけを根拠に安全と判定せず、実際の secret ownership、全 copy の所在、lifetime、cleanup 到達性を確認する。

## C. Logging / Error / Panic leakage

`Debug`、`Display`、error message、warning、panic、assert、tracing、test failure output、serialization diagnostics を確認する。秘密情報または復号済みデータが外部出力、診断情報、テスト出力へ漏れないかを、正常系と失敗系の双方で確認する。

## D. Cryptographic primitive usage

対象に応じて KDF、AEAD、hash、signature、key derivation、RNG / entropy、nonce、salt、AAD、authentication tag、key length、domain separation、canonical signing bytes を確認する。独自暗号処理、primitive の組み合わせ、認証結果の扱い、失敗時の状態遷移、秘密鍵と暗号文の取り違えを具体的に確認する。

## E. Custom cryptographic arithmetic

暗号ライブラリの primitive を使わず scalar arithmetic、modular reduction、signature arithmetic、finite-field operation、byte-level cryptographic arithmetic を独自実装している場合は、明示的な review target とする。mathematical correctness、reduction correctness、canonical representation、overflow / carry、edge case、secret-dependent な timing behavior、reference implementation / differential test、known vector、独立に導出した expected value を確認する。「テストが通る」ことだけを correctness の根拠にしない。

## F. Side-channel considerations

対象に応じて secret-dependent branch、secret-dependent memory access、variable-time cryptographic arithmetic、comparison、early exit、timing-sensitive behavior を確認する。constant-time 化を一般論として要求せず、秘密情報に依存する具体的な leakage path、到達可能性、影響、既存の境界を根拠に finding とする。

## G. RNG / entropy

対象に応じて cryptographically secure RNG、error handling、deterministic test RNG と production RNG の混同、seed reuse、nonce generation、key generation を確認する。乱数取得の失敗を成功として扱わないこと、再利用や予測可能性が既存の security property を破らないことを確認する。

## H. Signing safety

signing target、canonical bytes、chain / network binding、domain separation、wrong account、wrong chain、wrong network、replay、substitution、malformed payload、signature verification assumptions を確認する。Core と Application / UI の責任境界を維持し、UI 機能や未承認の新しい policy を Implementation Review から要求しない。

## I. Serialization / attacker-controlled input

Wallet Store 等の外部入力について malformed、truncated、oversized、duplicate、unknown field、unknown enum、unknown version、non-canonical form、integer boundary、nesting / allocation amplification、panic、denial-of-service relevant behavior を確認する。fuzzing が適切な parser / decoder では、既存要求、risk、attack surface、独立した oracle を根拠に必要な確認を行う。

## J. Native C ABI

pointer validity、null、length、ownership、allocation / free pairing、double free、use-after-free、aliasing、lifetime、output initialization、partial failure、secret buffer handling、panic crossing FFI、ABI compatibility を確認する。secret buffer の返却・解放・失敗時の扱いを、C caller と Rust implementation の双方の責任境界に沿って追跡する。

## K. WASM / JS boundary

secret material crossing boundary、JS managed memory exposure、copying、`Uint8Array` / `String` conversions、error conversion、lifetime、browser-visible output、Core / binding responsibility を確認する。WASM binding が secret management や cryptographic meaning を肩代わりしていないか、不要な secret が JS へ返されないかを確認する。

## L. Unsafe Rust

対象範囲に `unsafe` が存在する場合は必ず safety invariant、pointer validity、aliasing、lifetime、initialization、bounds、ownership、該当時の concurrency、FFI assumptions を確認する。`unsafe` が存在するだけでは finding にせず、安全条件が証明できない、または実際に破られている場合に指摘する。

## M. Dependency / feature interaction

対象変更に直接関連する場合だけ cryptographic dependency、default feature、optional feature、WASM feature、platform-specific implementation、version mismatch、unsafe feature combination を確認する。一般的な dependency freshness review を無制限に行わず、変更された security property、build target、実行経路への具体的影響を根拠にする。

## N. Tests

security-sensitive path について positive、negative、tamper、malformed、boundary、wrong password、wrong chain、wrong network、corrupted ciphertext、invalid signature、deterministic serialization、differential test、known vector、適切な fuzz を確認する。テスト実装と production 実装が同じロジックを複製しているだけなら、独立した oracle / fixture / reference になっているか確認する。テスト不足を finding とする場合は、未検出となる具体的な重大 defect、攻撃面、影響、必要な最小の検証を示す。
