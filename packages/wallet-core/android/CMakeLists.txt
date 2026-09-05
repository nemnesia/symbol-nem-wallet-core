cmake_minimum_required(VERSION 3.13)

# This is the application-level New Architecture CMake entry point described by
# React Native's pure C++ TurboModule integration. It is intentionally an
# appmodules target: a library OBJECT target alone cannot register a provider.
project(appmodules)

if(NOT DEFINED REACT_ANDROID_DIR)
    message(FATAL_ERROR "REACT_ANDROID_DIR is required for React Native New Architecture")
endif()
if(NOT DEFINED SNWC_C_ABI_LIBRARY OR NOT EXISTS "${SNWC_C_ABI_LIBRARY}")
    message(FATAL_ERROR "SNWC_C_ABI_LIBRARY must point to the approved C ABI/Rust artifact")
endif()

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

target_sources(${CMAKE_PROJECT_NAME} PRIVATE
    ../cpp/NativeSymbolNemWalletCore.cpp
    ../cpp/NativeSymbolNemWalletCoreProvider.cpp
    OnLoad.cpp
)
target_include_directories(${CMAKE_PROJECT_NAME} PRIVATE
    ../cpp
    ../cpp/include
)
target_link_libraries(${CMAKE_PROJECT_NAME} PRIVATE "${SNWC_C_ABI_LIBRARY}")
