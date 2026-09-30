#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"

usage() {
    cat <<'EOF'
Usage: ./scripts/ci/local-ci.sh [quick|full|rust|node|react-native|package|wasm|native|linux-glibc|audit|coverage|fuzz|browser|android]
Default: quick

quick: Rust quality checks, deterministic Node/release tooling checks, and React Native consumer static checks.
full: quick plus WASM, Native C ABI, sanitizers, dependencies, packed npm consumer, and cargo audit.
linux-glibc/android/browser/coverage are explicit platform or tool dependent checks.
EOF
}

require_tools() {
    local tool
    for tool in "$@"; do
        command -v "$tool" >/dev/null 2>&1 || { printf 'ERROR: %s is required\n' "$tool" >&2; exit 1; }
    done
}

check_node_version() {
    local expected actual
    expected=$(tr -d '[:space:]' < .node-version)
    actual=$(node -p 'process.versions.node.split(".")[0]')
    [[ "$actual" == "$expected" ]] || {
        printf 'ERROR: Node.js %s.x is required by .node-version (found %s)\n' "$expected" "$(node --version)" >&2
        exit 1
    }
}

run_rust() {
    require_tools cargo rustc rustfmt rustup python3 rg
    rustup component list --installed | rg -q '^clippy-' || { echo 'ERROR: Rust clippy component is required' >&2; exit 1; }
    bash scripts/check-local.sh rust
}

run_node() {
    require_tools node
    check_node_version
    bash scripts/ci/node-source.sh
}

run_react_native() {
    require_tools node npm
    check_node_version
    bash scripts/ci/react-native.sh
}

case "${1:-quick}" in
    quick)
        run_rust
        run_node
        run_react_native
        ;;
    full)
        run_rust
        run_node
        run_react_native
        require_tools cargo rustc rustfmt rustup python3 rg node npm corepack cc wasm-pack wasm-bindgen
        bash scripts/ci/verify-wasm-tools.sh
        bash scripts/check-local.sh wasm
        bash scripts/check-local.sh native
        bash scripts/check-local.sh native-sanitizers
        bash scripts/ci/build-manylinux.sh symbol-nem-wallet-core-node
        bash scripts/ci/build-manylinux.sh symbol-nem-wallet-core-native
        bash scripts/ci/install-workspace.sh
        bash scripts/ci/npm-package.sh
        require_tools cargo-audit
        bash scripts/ci/audit.sh
        ;;
    rust) run_rust ;;
    node) run_node ;;
    react-native) run_react_native ;;
    package)
        require_tools cargo rustc node npm wasm-bindgen
        check_node_version
        bash scripts/ci/npm-package.sh
        ;;
    wasm)
        require_tools cargo rustc node wasm-pack
        check_node_version
        bash scripts/ci/verify-wasm-tools.sh
        bash scripts/check-local.sh wasm
        ;;
    native)
        require_tools cargo rustc cc
        bash scripts/check-local.sh native
        ;;
    linux-glibc)
        require_tools cargo rustc docker
        bash scripts/ci/build-manylinux.sh symbol-nem-wallet-core-node
        bash scripts/ci/build-manylinux.sh symbol-nem-wallet-core-native
        ;;
    audit)
        require_tools cargo-audit
        bash scripts/ci/audit.sh
        ;;
    coverage)
        require_tools cargo cargo-llvm-cov
        bash scripts/ci/coverage.sh
        ;;
    fuzz)
        require_tools cargo cargo-fuzz
        bash scripts/ci/fuzz-wallet-store.sh
        ;;
    browser)
        require_tools node corepack google-chrome chromium
        check_node_version
        bash scripts/ci/install-workspace.sh
        temporary_directory=$(mktemp -d)
        trap 'rm -rf "$temporary_directory"' EXIT
        bash scripts/ci/pack-npm-package.sh "$temporary_directory"
        shopt -s nullglob
        tarballs=("$temporary_directory"/*.tgz)
        ((${#tarballs[@]} == 1)) || { echo 'ERROR: npm pack must produce exactly one tarball' >&2; exit 1; }
        SNWC_BROWSER=google-chrome SNWC_MV3_BROWSER=chromium node scripts/test-npm-bundlers.mjs --tarball "${tarballs[0]}"
        ;;
    android)
        require_tools node npm java sdkmanager adb
        check_node_version
        expected_java=$(tr -d '[:space:]' < .java-version)
        actual_java=$(java -version 2>&1 | sed -n '1s/.*version "\([0-9]*\).*/\1/p')
        [[ "$actual_java" == "$expected_java" ]] || { printf 'ERROR: Java %s is required by .java-version (found %s)\n' "$expected_java" "${actual_java:-unknown}" >&2; exit 1; }
        [[ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]] || { echo 'ERROR: ANDROID_HOME or ANDROID_SDK_ROOT is required' >&2; exit 1; }
        bash scripts/ci/react-native.sh
        (cd integration/react-native/consumer/android && ./gradlew assembleDebug)
        ;;
    -h|--help) usage ;;
    *) usage >&2; exit 2 ;;
esac
