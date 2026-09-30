#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"

if (($# != 1)); then
    echo "Usage: scripts/ci/npm-consumer.sh <package-tarball.tgz>" >&2
    exit 2
fi
command -v node >/dev/null 2>&1 || { echo "ERROR: node is required" >&2; exit 1; }
node scripts/test-npm-consumer.mjs --tarball "$1"
