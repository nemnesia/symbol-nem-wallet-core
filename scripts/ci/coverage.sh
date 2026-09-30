#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"
command -v cargo-llvm-cov >/dev/null 2>&1 || { echo 'ERROR: cargo-llvm-cov is required' >&2; exit 1; }

line_target=${CORE_LINE_COVERAGE_TARGET:-90}
function_target=${CORE_FUNCTION_COVERAGE_TARGET:-90}
mkdir -p coverage
cargo llvm-cov \
    --package symbol-nem-wallet-core \
    --all-features \
    --locked \
    --json \
    --output-path coverage/core.json
cargo llvm-cov report \
    --package symbol-nem-wallet-core \
    --text \
    --show-missing-lines \
    --output-path coverage/core.txt
cargo llvm-cov report \
    --package symbol-nem-wallet-core \
    --fail-under-lines "$line_target" \
    --fail-under-functions "$function_target"
