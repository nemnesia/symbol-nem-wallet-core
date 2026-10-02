// このsource fileにより、RN 0.87のアプリ用CMake entry pointはpackageのprovider対応OnLoad実装を使う。
// React Native標準のOnLoad.cppを同時にcompileすることを防ぐ。
#include "../../../../../node_modules/@nemnesia/symbol-nem-wallet-core/android/OnLoad.cpp"
