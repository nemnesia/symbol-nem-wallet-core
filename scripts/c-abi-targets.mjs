const C_ABI_TARGET_ORDER = Object.freeze([
  "win32-x64-msvc",
  "darwin-x64",
  "darwin-arm64",
  "linux-x64-gnu",
]);

const C_ABI_TARGETS = Object.freeze({
  "win32-x64-msvc": Object.freeze({
    target_id: "win32-x64-msvc",
    rust_target: "x86_64-pc-windows-msvc",
    runner: "windows-2025-vs2026",
    platform: "windows-x64-msvc",
    static_library: "symbol_nem_wallet_core_native.lib",
    dynamic_library: "symbol_nem_wallet_core_native.dll",
    companion_libraries: Object.freeze(["symbol_nem_wallet_core_native.dll.lib"]),
  }),
  "darwin-x64": Object.freeze({
    target_id: "darwin-x64",
    rust_target: "x86_64-apple-darwin",
    runner: "macos-15-intel",
    platform: "macos-x64",
    static_library: "libsymbol_nem_wallet_core_native.a",
    dynamic_library: "libsymbol_nem_wallet_core_native.dylib",
    companion_libraries: Object.freeze([]),
  }),
  "darwin-arm64": Object.freeze({
    target_id: "darwin-arm64",
    rust_target: "aarch64-apple-darwin",
    runner: "macos-15",
    platform: "macos-arm64",
    static_library: "libsymbol_nem_wallet_core_native.a",
    dynamic_library: "libsymbol_nem_wallet_core_native.dylib",
    companion_libraries: Object.freeze([]),
  }),
  "linux-x64-gnu": Object.freeze({
    target_id: "linux-x64-gnu",
    rust_target: "x86_64-unknown-linux-gnu",
    runner: "ubuntu-24.04",
    platform: "linux-x64-glibc",
    glibc_baseline: "2.28",
    static_library: "libsymbol_nem_wallet_core_native.a",
    dynamic_library: "libsymbol_nem_wallet_core_native.so",
    companion_libraries: Object.freeze([]),
  }),
});

function cAbiTarget(targetId) {
  return C_ABI_TARGETS[targetId];
}

function cAbiArchiveFilename(version, targetId) {
  return `symbol-nem-wallet-core-c-abi-${version}-${targetId}.tar.gz`;
}

export {
  C_ABI_TARGET_ORDER,
  C_ABI_TARGETS,
  cAbiArchiveFilename,
  cAbiTarget,
};
