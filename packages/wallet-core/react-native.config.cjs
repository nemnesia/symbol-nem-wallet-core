const path = require("node:path");

module.exports = {
  dependency: {
    platforms: {
      android: {
        // The RN CLI resolves sourceDir from the application Android project.
        // Keep this package-local and absolute so a clean consumer never
        // probes consumer/android/node_modules for the installed package.
        sourceDir: path.join(__dirname, "android"),
        cxxModuleCMakeListsPath: "CMakeLists.txt",
        cxxModuleCMakeListsModuleName: "symbol_nem_wallet_core_rn",
        // RN CLI appends .h to this base name when it generates
        // autolinking.cpp.
        cxxModuleHeaderName: "NativeSymbolNemWalletCore",
      },
    },
  },
};
