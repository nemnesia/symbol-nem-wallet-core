#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "${script_dir}/.." && pwd)"
output_dir="${1:-${repo_root}/pkg}"

if [[ "${output_dir}" != /* ]]; then
    output_dir="${repo_root}/${output_dir}"
fi

if ! command -v wasm-bindgen >/dev/null 2>&1; then
    echo "error: wasm-bindgen CLI is required but was not found in PATH" >&2
    exit 1
fi

cargo build \
    --manifest-path "${repo_root}/Cargo.toml" \
    --target wasm32-unknown-unknown \
    --features wasm \
    --release

wasm_file="${repo_root}/target/wasm32-unknown-unknown/release/symbol_nem_wallet_core.wasm"
if [[ ! -f "${wasm_file}" ]]; then
    echo "error: WASM binary was not found: ${wasm_file}" >&2
    exit 1
fi

mkdir -p "${output_dir}"
wasm-bindgen \
    "${wasm_file}" \
    --target web \
    --out-dir "${output_dir}"

echo "WASM package generated in ${output_dir}"
