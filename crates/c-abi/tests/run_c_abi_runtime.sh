#!/usr/bin/env bash
set -eu

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

cd "$repo_root"
cargo build --package symbol-nem-wallet-core-native --offline --locked
cc_flags=(-std=c11 -Wall -Wextra -Werror)
sanitizer_flags=()
if test "${SNWC_C_ABI_SANITIZERS:-0}" = 1; then
    sanitizer_flags+=(-fsanitize=address,undefined -fno-omit-frame-pointer)
fi
cc "${cc_flags[@]}" \
    "${sanitizer_flags[@]}" \
    -I "$repo_root/crates/c-abi/include" \
    "$repo_root/crates/c-abi/tests/caller_runtime.c" \
    "$repo_root/target/debug/libsymbol_nem_wallet_core_native.a" \
    -ldl -lpthread -lm \
    "${sanitizer_flags[@]}" \
    -o "$temp_dir/caller_runtime"

"$temp_dir/caller_runtime"
