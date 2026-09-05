module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: "./android",
        cxxModuleCMakeListsPath: "CMakeLists.txt",
        cxxModuleCMakeListsModuleName: "symbol_nem_wallet_core_rn",
        cxxModuleHeaderName: "NativeSymbolNemWalletCore.h",
      },
    },
  },
};
