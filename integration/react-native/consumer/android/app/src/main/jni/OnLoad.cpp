// The presence of this source file makes RN 0.87's application CMake entry
// point use the package's provider-aware OnLoad implementation instead of
// compiling React Native's default OnLoad.cpp alongside it.
#include "../../../../../node_modules/@nemnesia/symbol-nem-wallet-core/android/OnLoad.cpp"
