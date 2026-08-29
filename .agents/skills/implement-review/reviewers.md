# Reviewers

メインエージェントは Review Board Chair として、対象確定、根拠管理、重複排除、重大度・状態、ゲート、成果物を担当する。Phase 1 では次の4観点を独立して確認する。

## Reviewer A: 仕様適合性

入力、出力、事前・事後条件、field、制約、処理順序、状態、error、warning、replacement Store、禁止事項、公開動作を承認済み仕様と照合する。仕様が曖昧な場合は欠陥と断定しない。

## Reviewer B: セキュリティ

変更から attack surface と secret path を特定し、`security-checklist.md` の該当項目を適用する。Mnemonic、private key、derived private key、seed、KDF-derived key、Profile password、復号済み Wallet Store material、temporary signing secret の generation、import、derivation、use、copy、storage、replacement、deletion、drop、error path を追跡する。ログ・error・panic・warning・debug、zeroization、KDF、AEAD、nonce、salt、AAD、tag、RNG、署名対象、replay、parser、trust boundary、Native C ABI、WASM / JS boundary、`unsafe`、side-channel、依存 feature、security-sensitive test を対象にする。

レビューは、仕様に存在しない新しい製品要求、任意の hardening、将来機能、API、policy を発明しない。ただし、private key / Mnemonic の漏えい、不要な secret copy、必要以上に長い lifetime、欠落した zeroization、nonce reuse、CSPRNG failure、AEAD authentication result の未検証、仕様と異なる signing bytes、具体的な secret-dependent leakage、FFI の use-after-free / double-free、WASM / JS への不要な secret 露出、memory safety invariant の破壊、攻撃者入力による panic / UB / resource exhaustion、Symbol / NEM または Mainnet / Testnet の混同による誤署名など、既存の security property や言語・境界の安全性を破る具体的 defect は、個別の防御策が仕様へ列挙されていなくても指摘する。これは optional hardening の要求ではない。

仕様・設計・要件または確認済みの cryptographic / protocol fact で正否を判定できる事項は finding として根拠へ追跡する。仕様不足、競合、方式の選択だけでは implementation defect と断定せず、`specification ambiguity / feedback` として分離する。成果物の `Domain Checks` には、適用項目、主要な適用外項目、未確認範囲を明記する。

## Reviewer C: 相互運用性・プロトコル

文字コード、正規化、byte order、整数と精度、deterministic encoding、hex / raw bytes、canonical signing bytes、未知値、fixture、Native / WASM の外部形式、SDK表現、Symbol / NEM、Mainnet / Testnetを確認する。署名対象、domain separation、chain / network binding、replay / substitution の観点は Security Reviewer と重なってよい。内部方式の好みは指摘しない。

## Reviewer D: ソフトウェア品質・テスト

変更範囲内の責務、ownership、型、依存、panic、公開互換性、正常・異常・境界・改ざん・不正署名・認証失敗・replay・未知version・サイズ超過・不正encoding・deterministic encodingのテストを確認する。Security-sensitive path では wrong password / chain / network、corrupted ciphertext、invalid signature、malformed input、zeroization / failure path、fuzz、differential test、known vector、独立した oracle を対象にし、実装ロジックを複製した期待値や出典不明fixtureだけで独立検証したことにしない。重大な security property を独立検出できない test gap は、到達可能性と影響に応じて finding とする。

## Chair の採用基準

対象箇所、発生条件、既存根拠、影響、必要条件が揃い、現在の変更範囲に直接関係するものだけを採用する。重複する Security / Protocol / Test finding は根拠を失わないよう統合する。CRITICAL / HIGH は Required Change、MEDIUM / LOW は Optional Improvement として扱い、状態が New / Open / Reopened の CRITICAL / HIGH を残したまま `READY` にしない。新規設計、将来拡張、好みのリファクタリング、optional hardening は却下する。仕様の未決定だけなら Deferred Findings へ分離する。
