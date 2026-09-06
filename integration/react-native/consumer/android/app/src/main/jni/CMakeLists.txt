cmake_minimum_required(VERSION 3.13)

# RN 0.87's application-level New Architecture entry point. The package CMake
# target is supplied by the published npm package and is linked once per ABI.
project(appmodules)

# React Native 0.87 Codegen itself requires C++20. Set this before the
# application CMake entry point creates the generated targets.
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

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
target_link_libraries(${CMAKE_PROJECT_NAME} symbol_nem_wallet_core_rn)

# CMake's default shared-library rule adds an appmodules SONAME after the
# target options. Suppress that default so the final load unit has exactly the
# published manifest filename, while the explicit linker option below remains
# the only SONAME supplied to lld.
set_target_properties(${CMAKE_PROJECT_NAME} PROPERTIES
    NO_SONAME TRUE
)

# The appmodules shared object is the Android RN load unit.  RN/AGP may link
# package static archives with hidden visibility, so make the provider and
# exact embedded identity part of this load unit's dynamic symbol contract.
target_link_options(${CMAKE_PROJECT_NAME} PRIVATE
    "-Wl,-soname,libsymbol_nem_wallet_core_rn.so"
    "-Wl,--export-dynamic"
    "-Wl,--export-dynamic-symbol=snwc_rn_module_identity"
    "-Wl,--export-dynamic-symbol=snwc_rn_artifact_identity"
    "-Wl,--export-dynamic-symbol=snwc_rn_target_id"
    "-Wl,--export-dynamic-symbol=snwc_rn_artifact_identity_value"
    "-Wl,--export-dynamic-symbol=symbolNemWalletCoreCxxModuleProvider"
)
