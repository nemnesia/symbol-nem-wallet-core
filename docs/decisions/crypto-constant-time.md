# 署名用Scalar算術のconstant-time方針

## 決定

`src/crypto.rs` の `scalar_add_mod_order` と `scalar_mul_mod_order` は、秘密値に依存する
分岐、loop count、配列indexを持たない固定長byte演算として維持する。

- 加算・減算は32 byteを固定回数走査する。
- 乗算は256 bitを固定回数処理する。
- 加算結果の選択はmask演算で行い、秘密値によるbranchを追加しない。
- 中間byte列、mask、carry、borrowは `Zeroizing` または明示的zeroizeで管理する。
- `sign()` は引き続きraw byte列への署名primitiveであり、Transactionの意味解釈は行わない。

## 根拠と検証範囲

Rust sourceをレビューし、秘密値でloopを早期終了させる処理、secret-dependent indexing、
分岐による結果選択がないことを確認する。`tests/unit/crypto.rs` の参照演算fixtureと
Symbol/NEMの公開鍵・署名fixtureをconstant-time実装の回帰検知に使用する。

最終的なmachine codeのbranch生成、compiler・target固有の最適化およびtiming leakageは
このdecisionだけでは保証しない。release/security auditでは対象targetのoptimized
assembly inspectionまたは専門的なconstant-time検証を実施する。wall-clock thresholdに
依存するdudect相当のテストはCIへ追加しない。

## 変更条件

秘密値に依存するbranch、loop、indexが必要になった場合は、実装変更前に本decisionを更新し、
対象targetのassemblyとSymbol/NEM固定fixtureを再確認する。
