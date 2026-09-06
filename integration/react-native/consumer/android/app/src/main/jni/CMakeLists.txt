cmake_minimum_required(VERSION 3.13)

# RN 0.87's application-level New Architecture entry point. The package CMake
# target is supplied by the published npm package and is linked once per ABI.
project(appmodules)

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# RN CLI's C++ autolinking metadata is not part of the application source
# contract.  The clean consumer therefore registers the package target from
# the installed, lockfile-selected npm package explicitly.  This keeps the
# target and its C ABI input in the same CMake graph that owns appmodules.
set(SNWC_RN_PACKAGE_ROOT
    "${PROJECT_ROOT_DIR}/../node_modules/@nemnesia/symbol-nem-wallet-core")
if(NOT EXISTS "${SNWC_RN_PACKAGE_ROOT}/android/CMakeLists.txt")
    message(FATAL_ERROR "installed SymbolNemWalletCoreRN package CMakeLists.txt is missing")
endif()
if(NOT TARGET symbol_nem_wallet_core_rn)
    add_subdirectory(
        "${SNWC_RN_PACKAGE_ROOT}/android"
        "${CMAKE_CURRENT_BINARY_DIR}/symbol_nem_wallet_core_rn_package"
    )
endif()

if(NOT TARGET symbol_nem_wallet_core_rn)
    message(FATAL_ERROR "SymbolNemWalletCoreRN CMake target was not registered")
endif()
target_link_libraries(${CMAKE_PROJECT_NAME} PRIVATE symbol_nem_wallet_core_rn)

set_target_properties(${CMAKE_PROJECT_NAME} PROPERTIES
    LINK_FLAGS "-Wl,-soname,libsymbol_nem_wallet_core_rn.so"
)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
    "${CMAKE_CURRENT_LIST_DIR}/../../../../node_modules/@nemnesia/symbol-nem-wallet-core/android/OnLoad.cpp"
)
