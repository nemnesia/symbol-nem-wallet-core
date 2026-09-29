module.exports = {
  dependency: {
    platforms: {
      // The package uses RN 0.87's CxxReactPackage provider API, which needs
      // the actual ReactApplicationContext and must not be synthesized by the
      // CLI's generic Cxx module provider or PackageList. The app registers
      // the provider explicitly through getDefaultReactHost.
      android: null,
    },
  },
};
