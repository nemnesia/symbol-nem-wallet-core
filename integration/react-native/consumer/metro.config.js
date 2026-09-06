const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// The release producer installs the consumer from a frozen local file
// dependency. Metro does not reliably resolve that npm symlink, while the
// native build and Podfile intentionally consume the same source-controlled
// package copy. Make the package root explicit for the clean consumer.
const walletCoreRoot = path.resolve(__dirname, '../../../packages/wallet-core');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  ...config,
  watchFolders: [walletCoreRoot],
  resolver: {
    ...config.resolver,
    extraNodeModules: {
      ...config.resolver?.extraNodeModules,
      '@nemnesia/symbol-nem-wallet-core': walletCoreRoot,
    },
  },
});
