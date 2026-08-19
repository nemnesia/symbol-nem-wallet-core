# Specification Review 003 対応方針

## SR-002

初回 Mnemonic の受渡し完了は、Application が利用者へ Mnemonic を提示し、利用者からバックアップ完了の明示的な確認を取得した状態とする。

Application は確認取得後に限り `finalize_generated_profile` を呼ぶ。確認未取得、キャンセル、提示失敗または中断時は呼び出さず、`PendingProfileBlob` を破棄する。

確認 UI と実際の保存状態は Application / 利用者の責任とし、Core は検証しない。`confirmation: true` のような追加フラグは設けず、`finalize_generated_profile` の呼び出し自体を確認済みの境界イベントとして扱う。

## SR-011

Profile 名、Software Key の Account 名、ラベルその他の表示用 metadata は Wallet Core v1 の責務から除外する。

Core は Profile と Software Key を `profile_id` / `key_id` で管理する。表示名や Wallet 固有 metadata は Application が ID に紐付けて管理する。

Core v1 では次を行わない。

- 表示名を Wallet Store に保存する。
- 表示名を AAD に含める。
- `set_profile_name` / `set_software_key_name` を提供する。
- Profile / Software Key の作成 API や DTO に表示名を含める。
- 表示名変更を理由とする Store mutation を行う。

Software Key の一覧取得に必要な平文情報は `key_id` と `chain` に限定し、`software_key_index` として保持する。

`docs/specifications/specification.md` に残る名称管理の記述は本方針により v1 の有効な契約から除外し、仕様本文整理時に削除する。
