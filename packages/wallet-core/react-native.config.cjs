module.exports = {
  dependency: {
    platforms: {
      // このpackageは実際のReactApplicationContextを必要とするRN 0.87のCxxReactPackage provider APIを使う。
      // CLIの汎用Cxx module providerやPackageListでcontextを生成してはならない。
      // アプリはgetDefaultReactHost経由でproviderを明示的に登録する。
      android: null,
    },
  },
};
