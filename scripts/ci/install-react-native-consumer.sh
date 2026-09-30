#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
consumer="$repo_root/integration/react-native/consumer"
command -v npm >/dev/null 2>&1 || { echo 'ERROR: npm is required' >&2; exit 1; }
npm ci --prefix "$consumer" --ignore-scripts --install-links
