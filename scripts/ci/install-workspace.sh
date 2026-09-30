#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"
command -v corepack >/dev/null 2>&1 || { echo 'ERROR: corepack is required' >&2; exit 1; }
corepack pnpm install --frozen-lockfile --ignore-scripts
