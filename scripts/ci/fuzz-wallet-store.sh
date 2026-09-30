#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"
command -v cargo-fuzz >/dev/null 2>&1 || { echo 'ERROR: cargo-fuzz is required' >&2; exit 1; }
cargo fuzz run wallet_store_decode -- -max_total_time=60 -timeout=5
