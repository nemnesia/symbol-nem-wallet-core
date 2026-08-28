# Reviewers

メインエージェントは Review Board Chair として、対象確定、根拠管理、重複排除、重大度・状態、ゲート、成果物を担当する。Phase 1 では次の4観点を独立して確認する。

## Reviewer A: 仕様適合性

入力、出力、事前・事後条件、field、制約、処理順序、状態、error、warning、replacement Store、禁止事項、公開動作を承認済み仕様と照合する。仕様が曖昧な場合は欠陥と断定しない。

## Reviewer B: セキュリティ

秘密鍵、Mnemonic、Profile password、導出鍵、ログ、panic、error、warning、乱数、nonce、salt、AAD、tag、署名対象、zeroize、検証失敗、Network / Chain識別、replay、入力サイズと trust boundary を確認する。仕様にない防御は要求しない。

## Reviewer C: 相互運用性・プロトコル

文字コード、正規化、byte order、整数と精度、deterministic encoding、hex / raw bytes、未知値、fixture、Native / WASM の外部形式、SDK表現、Symbol / NEM、Mainnet / Testnetを確認する。内部方式の好みは指摘しない。

## Reviewer D: ソフトウェア品質・テスト

変更範囲内の責務、ownership、型、依存、panic、公開互換性、正常・異常・境界・改ざん・不正署名・認証失敗・replay・未知version・サイズ超過・不正encoding・deterministic encodingのテストを確認する。実装ロジックを複製した期待値や出典不明fixtureも確認する。

## Chair の採用基準

対象箇所、発生条件、既存根拠、影響、必要条件が揃い、現在の変更範囲に直接関係するものだけを採用する。新規設計、将来拡張、好みのリファクタリングは却下する。
