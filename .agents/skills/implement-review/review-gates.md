# Review Gates

目的は、実装を完璧にすることではなく、対象範囲が承認済み仕様を安全かつ検証可能に満たすかを判断することである。Implementation Review の release-quality gate として、具体的な security defect、memory unsafety、cryptographic misuse、FFI / binding 境界の破綻を、仕様に個別の防御策が列挙されていないことだけを理由に見逃さない。一方、仕様にない新しい要求、任意の hardening、将来機能、API、policy は不合格理由にしない。

1. 仕様適合性: 入力、出力、制約、処理、状態、error、禁止事項を満たす。
2. セキュリティ: 資産、権限、秘密情報、信頼境界、失敗時の安全性を満たす。
3. 相互運用性: encoding、署名対象、数値、chain、network、外部形式が別実装でも一致する。
4. 異常系: malformed、境界、認証失敗、改ざん、truncated、重複、未知値を仕様どおりに扱う。
5. テスト十分性: 重要な仕様違反、退行、非互換、失敗を独立して検出できる。
6. 変更範囲内の品質: 型、依存、例外、非同期、コメントが具体的欠陥を生じさせていない。

各ゲートの観察結果は、対象箇所、発生条件、根拠、影響、完了条件へ追跡する。仕様が曖昧で正否を決められない事項は、ゲート不合格や implementation defect と断定せず、`specification ambiguity / feedback` として分離する。

## Severity と判定

CRITICAL / HIGH / MEDIUM / LOW の判定は、実際の発生条件、影響、到達可能性、既存の trust boundary および緩和要因を総合して行う。単に暗号コード、秘密情報、`unsafe` または FFI を含むことだけで CRITICAL にはしない。

- `CRITICAL`: private key / Mnemonic の直接漏えい、attacker による secret 取得、signature forgery / arbitrary signing、重大な authentication / authorization bypass、cryptographic protection の実質的崩壊、攻撃者入力による UB 等で秘密情報保護が成立しないもの。
- `HIGH`: 現実的な条件での秘密情報漏えい、nonce reuse 等の重大な cryptographic misuse、signing target / chain / network confusion、重大な secret lifecycle 破綻、FFI ownership による memory safety / security risk、攻撃者入力による重大な security property の破壊、重大な defect を独立検出できない security-sensitive test gap。
- `MEDIUM`: 既存の security invariant または具体的な attack surface に関係するが、重大な security invariant を直接破らない限定的な hardening gap、局所的な robustness issue、低影響の maintainability-related security risk。対象と影響が具体的であることを要する。
- `LOW`: 既存の security property に関係し、影響と到達可能性が限定的な defensive / security hygiene の不足。一般論や好みだけでは採用しない。

`CRITICAL` または `HIGH` の New / Open / Reopened finding が1件以上ある場合、該当 finding は Required Change とし、`REVISE IMPLEMENTATION` とする。`MEDIUM` / `LOW` のみ、または解決済み・Deferred のみの場合は、Optional Improvement として `READY` とできる。したがって、`READY` と `Required Changes: HIGH` の組み合わせは成立しない。coverage の任意の数値目標は新設しない。
