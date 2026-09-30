#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"

for tool in node; do
    command -v "$tool" >/dev/null 2>&1 || { printf 'ERROR: %s is required\n' "$tool" >&2; exit 1; }
done

node scripts/test-release-evidence.mjs
node scripts/test-release-identity.mjs
node --test scripts/test-facade-secret-cleanup.mjs
node scripts/test-release-license-policy.mjs
node scripts/test-react-native-lifecycle.mjs
node scripts/test-react-native-pod-lock.mjs
node scripts/test-npm-provenance.mjs
node scripts/test-github-release.mjs
node scripts/test-release-record.mjs
node scripts/test-release-recovery.mjs
node scripts/test-browser-parity.mjs
