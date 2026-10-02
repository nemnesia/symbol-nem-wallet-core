const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// release producerは固定されたlocal file dependencyからconsumerをinstallする。
// Metroはそのnpm symlinkを安定して解決できない一方、native buildとPodfileは同じrepository管理下の
// package copyを使う。clean consumerでpackage rootを明示する。
const walletCoreRoot = path.resolve(__dirname, '../../../packages/wallet-core');
const consumerNodeModules = path.resolve(__dirname, 'node_modules');

/**
 * Metroの設定
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
      '@babel/runtime': path.join(consumerNodeModules, '@babel/runtime'),
      'react-native': path.join(consumerNodeModules, 'react-native'),
    },
  },
});
