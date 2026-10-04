#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"
command -v cargo-fuzz >/dev/null 2>&1 || { echo 'ERROR: cargo-fuzz is required' >&2; exit 1; }
host_target=$(rustc -vV | awk '$1 == "host:" { print $2 }')
if [[ -z "$host_target" ]]; then
    echo 'ERROR: unable to determine the Rust host target' >&2
    exit 1
fi
cargo fuzz run --target "$host_target" wallet_store_decode -- -max_total_time=60 -timeout=5
