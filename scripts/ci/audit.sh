#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"
command -v cargo-audit >/dev/null 2>&1 || { echo 'ERROR: cargo-audit is required' >&2; exit 1; }
cargo audit
