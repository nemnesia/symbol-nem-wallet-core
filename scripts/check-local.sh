#!/usr/bin/env bash
# Shared local / CI checks. Run from any working directory.
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

usage() {
    cat <<'EOF'
Usage: bash scripts/check-local.sh [rust-fast|rust|wasm|native|native-sanitizers|dependencies|all]
Default: rust (invisible characters, formatting, Clippy, locked fuzz build, tests).
rust-fast runs invisible-character, format, and locked Clippy checks without tests.
all runs every group; requires Rust, Python 3, Node, Corepack, npm,
wasm32-unknown-unknown, wasm-bindgen, wasm-pack and a C/C++ compiler.
Coverage, npm artifact assembly and OS/mobile matrices remain separate CI gates.
EOF
}

run() {
    printf '\n>>> %s\n' "$*"
    "$@"
}

check_rust() {
    run python3 scripts/check-invisible-characters.py
    run cargo fmt --all -- --check
    run cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
    run cargo check --manifest-path fuzz/Cargo.toml --locked --bin wallet_store_decode
    run cargo test --workspace --all-features --locked
}

check_rust_fast() {
    run python3 scripts/check-invisible-characters.py
    run cargo fmt --all -- --check
    run cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
}

check_wasm() {
    run node scripts/verify-wasm-bindgen.mjs
    run wasm-pack test --node --mode no-install crates/wasm --locked
    run cargo check --package symbol-nem-wallet-core-wasm --target wasm32-unknown-unknown --locked
}

check_native() {
    run cargo build --package symbol-nem-wallet-core-native --release --locked
    run cc -std=c11 -Wall -Wextra -Werror -I crates/c-abi/include -fsyntax-only crates/c-abi/tests/header_compile.c
    run bash crates/c-abi/tests/run_c_abi_runtime.sh
}

check_native_sanitizers() {
    run env SNWC_C_ABI_SANITIZERS=1 bash crates/c-abi/tests/run_c_abi_runtime.sh
}

check_dependencies() {
    run bash scripts/ci/install-workspace.sh
    run bash scripts/ci/install-react-native-consumer.sh
}

if (( $# > 1 )); then
    usage >&2
    exit 2
fi
case "${1:-rust}" in
    rust-fast) check_rust_fast ;;
    rust) check_rust ;;
    wasm) check_wasm ;;
    native) check_native ;;
    native-sanitizers) check_native_sanitizers ;;
    dependencies) check_dependencies ;;
    all)
        check_rust
        check_wasm
        check_native
        check_native_sanitizers
        check_dependencies
        ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
esac
printf '\nChecks passed: %s\n' "${1:-rust}"
