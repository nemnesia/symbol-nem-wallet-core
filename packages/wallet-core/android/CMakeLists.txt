cmake_minimum_required(VERSION 3.13)

# This is a package CMakeLists consumed by the RN CLI from the application's
# appmodules CMakeLists. Provider registration and OnLoad.cpp are attached to
# that application target by the checked-in consumer integration.
set(SNWC_RN_PACKAGE_ROOT "${CMAKE_CURRENT_LIST_DIR}/..")
set(SNWC_RN_C_ABI_LIBRARY "${SNWC_C_ABI_LIBRARY}")
set(SNWC_RN_PREBUILT "${SNWC_RN_PACKAGE_ROOT}/dist/react-native/android/jni/${ANDROID_ABI}/libsymbol_nem_wallet_core_rn.so")

if(NOT DEFINED ANDROID_ABI OR ANDROID_ABI STREQUAL "")
    message(FATAL_ERROR "ANDROID_ABI is required for SymbolNemWalletCoreRN")
endif()
if(NOT ANDROID_ABI STREQUAL "arm64-v8a" AND NOT ANDROID_ABI STREQUAL "x86_64")
    message(FATAL_ERROR "unsupported Android ABI for SymbolNemWalletCoreRN: ${ANDROID_ABI}")
endif()

if(SNWC_RN_C_ABI_LIBRARY)
    if(NOT EXISTS "${SNWC_RN_C_ABI_LIBRARY}")
        message(FATAL_ERROR "SNWC_C_ABI_LIBRARY does not exist for ${ANDROID_ABI}")
    endif()
    add_library(symbol_nem_wallet_core_rn STATIC
        ../cpp/NativeSymbolNemWalletCore.cpp
        ../cpp/NativeSymbolNemWalletCoreProvider.cpp
        ../cpp/RnLifecycleCoordinator.cpp
    )
    if(TARGET react_codegen_symbolnemwalletcore)
        target_link_libraries(symbol_nem_wallet_core_rn PUBLIC react_codegen_symbolnemwalletcore)
    elseif(TARGET react_codegen_SymbolNemWalletCoreSpec)
        target_link_libraries(symbol_nem_wallet_core_rn PUBLIC react_codegen_SymbolNemWalletCoreSpec)
    elseif(TARGET react_codegen_symbol_nem_wallet_core)
        target_link_libraries(symbol_nem_wallet_core_rn PUBLIC react_codegen_symbol_nem_wallet_core)
    else()
        message(FATAL_ERROR "RN Codegen target for SymbolNemWalletCoreSpec is missing")
    endif()
    target_link_libraries(symbol_nem_wallet_core_rn PUBLIC "${SNWC_RN_C_ABI_LIBRARY}")
    # The package target compiles these sources itself. INTERFACE-only include
    # paths are not visible while NativeSymbolNemWalletCore.cpp is compiled.
    target_include_directories(symbol_nem_wallet_core_rn PRIVATE
        "${SNWC_RN_PACKAGE_ROOT}/cpp"
        "${SNWC_RN_PACKAGE_ROOT}/cpp/include"
    )
    target_compile_definitions(symbol_nem_wallet_core_rn PRIVATE
        SNWC_RN_PLATFORM_ANDROID=1
        SNWC_RN_ANDROID_ABI="${ANDROID_ABI}"
        SNWC_RN_TARGET_ID="android-${ANDROID_ABI}"
    )
else()
    if(NOT EXISTS "${SNWC_RN_PREBUILT}")
        message(FATAL_ERROR "published RN artifact is missing for ${ANDROID_ABI}")
    endif()
    add_library(symbol_nem_wallet_core_rn SHARED IMPORTED GLOBAL)
    set_target_properties(symbol_nem_wallet_core_rn PROPERTIES
        IMPORTED_LOCATION "${SNWC_RN_PREBUILT}"
    )
endif()

target_include_directories(symbol_nem_wallet_core_rn INTERFACE
    "${SNWC_RN_PACKAGE_ROOT}/cpp"
    "${SNWC_RN_PACKAGE_ROOT}/cpp/include"
)
