#!/usr/bin/env bash
set -eu

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

cd "$repo_root"
cargo build --package symbol-nem-wallet-core-native --offline
cc -std=c11 -Wall -Wextra -Werror \
    -I "$repo_root/bindings/native/include" \
    "$repo_root/bindings/native/tests/caller_runtime.c" \
    "$repo_root/target/debug/libsymbol_nem_wallet_core_native.a" \
    -ldl -lpthread -lm -o "$temp_dir/caller_runtime"

"$temp_dir/caller_runtime"
