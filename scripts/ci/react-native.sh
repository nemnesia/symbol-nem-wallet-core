#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
consumer="$repo_root/integration/react-native/consumer"

for tool in node npm cargo rustup wasm-bindgen grep; do
    command -v "$tool" >/dev/null 2>&1 || { printf 'ERROR: %s is required\n' "$tool" >&2; exit 1; }
done

wasm_file=${SNWC_WASM_FILE:-$repo_root/target/wasm32-unknown-unknown/release/symbol_nem_wallet_core_wasm.wasm}
if [[ -z "${SNWC_WASM_FILE:-}" ]]; then
    rustup target list --installed | grep -Fxq 'wasm32-unknown-unknown' || {
        echo 'ERROR: Rust target wasm32-unknown-unknown is required' >&2
        exit 1
    }
    cargo build --package symbol-nem-wallet-core-wasm --target wasm32-unknown-unknown --release --locked
fi
test -f "$wasm_file" || { printf 'ERROR: WASM artifact is missing: %s\n' "$wasm_file" >&2; exit 1; }
node "$repo_root/scripts/verify-wasm-bindgen.mjs"
node "$repo_root/scripts/build-npm-package.mjs" --wasm "$wasm_file"

bash "$repo_root/scripts/ci/install-react-native-consumer.sh"
(cd "$consumer" && npx eslint App.tsx index.js __tests__ --max-warnings=0)
(cd "$consumer" && npx tsc --noEmit)
(cd "$consumer" && npx jest --listTests --runInBand)
(cd "$consumer" && npx react-native config >/dev/null)
