#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "usage: $0 <built-node-addon>" >&2
  exit 2
fi

addon_source=$1
addon_path="${TMPDIR:-/tmp}/symbol_nem_wallet_core_node_$$.node"
trap 'rm -f "$addon_path"' EXIT
cp "$addon_source" "$addon_path"
node "$(dirname "$0")/smoke.js" "$addon_path"
