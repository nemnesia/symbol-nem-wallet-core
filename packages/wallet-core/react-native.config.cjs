module.exports = {
  dependency: {
    platforms: {
      android: {
        // RN CLI joins sourceDir to the installed package root. This must stay
        // relative; an absolute value would be concatenated and produce an
        // unusable package-root-plus-filesystem path.
        sourceDir: "android",
        cxxModuleCMakeListsPath: "CMakeLists.txt",
        cxxModuleCMakeListsModuleName: "symbol_nem_wallet_core_rn",
        // RN CLI appends .h to this base name when it generates
        // autolinking.cpp.
        cxxModuleHeaderName: "NativeSymbolNemWalletCore",
      },
    },
  },
};
