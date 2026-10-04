#!/usr/bin/env bash
set -eu

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

cd "$repo_root"
cargo build --package symbol-nem-wallet-core-native --offline --locked
target_dir=${CARGO_TARGET_DIR:-"$repo_root/target"}
if [[ -n "${CARGO_BUILD_TARGET:-}" ]]; then
    native_library="$target_dir/$CARGO_BUILD_TARGET/debug/libsymbol_nem_wallet_core_native.a"
else
    native_library="$target_dir/debug/libsymbol_nem_wallet_core_native.a"
fi
cc_flags=(-std=c11 -Wall -Wextra -Werror)
if test "${SNWC_C_ABI_SANITIZERS:-0}" = 1; then
    cc "${cc_flags[@]}" \
        -fsanitize=address,undefined -fno-omit-frame-pointer \
        -I "$repo_root/crates/c-abi/include" \
        "$repo_root/crates/c-abi/tests/caller_runtime.c" \
        "$native_library" \
        -ldl -lpthread -lm \
        -fsanitize=address,undefined -fno-omit-frame-pointer \
        -o "$temp_dir/caller_runtime"
else
    cc "${cc_flags[@]}" \
        -I "$repo_root/crates/c-abi/include" \
        "$repo_root/crates/c-abi/tests/caller_runtime.c" \
        "$native_library" \
        -ldl -lpthread -lm \
        -o "$temp_dir/caller_runtime"
fi

"$temp_dir/caller_runtime"
