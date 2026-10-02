cmake_minimum_required(VERSION 3.13)

# RN CLIがアプリのappmodules CMakeListsから読み込むpackage用CMakeListsである。
# provider登録とOnLoad.cppは、管理対象のconsumer integrationがアプリtargetへ追加する。
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
        SymbolNemWalletCoreCxxReactPackage.cpp
        ../cpp/NativeSymbolNemWalletCore.cpp
        ../cpp/NativeSymbolNemWalletCoreProvider.cpp
        ../cpp/RnLifecycleCoordinator.cpp
    )
    # RN 0.87の生成C++ bridgeはC++20 conceptsとstd::spanを使う。
    # consumer側の標準設定（多くの場合C++17）を継承せず、package target内で完結させる。
    set_target_properties(symbol_nem_wallet_core_rn PROPERTIES
        CXX_STANDARD 20
        CXX_STANDARD_REQUIRED YES
        CXX_EXTENSIONS NO
    )
    if(DEFINED SNWC_RN_CODEGEN_TARGET AND TARGET "${SNWC_RN_CODEGEN_TARGET}")
        target_link_libraries(symbol_nem_wallet_core_rn PUBLIC "${SNWC_RN_CODEGEN_TARGET}")
    elseif(TARGET react_codegen_symbolnemwalletcore)
        target_link_libraries(symbol_nem_wallet_core_rn PUBLIC react_codegen_symbolnemwalletcore)
    elseif(TARGET react_codegen_SymbolNemWalletCoreSpec)
        target_link_libraries(symbol_nem_wallet_core_rn PUBLIC react_codegen_SymbolNemWalletCoreSpec)
    elseif(TARGET react_codegen_symbol_nem_wallet_core)
        target_link_libraries(symbol_nem_wallet_core_rn PUBLIC react_codegen_symbol_nem_wallet_core)
    else()
        message(FATAL_ERROR "RN Codegen target for SymbolNemWalletCoreSpec is missing")
    endif()
    target_link_libraries(symbol_nem_wallet_core_rn PUBLIC "${SNWC_RN_C_ABI_LIBRARY}" log)
    # package target自身がこれらのsourceをcompileする。
    # NativeSymbolNemWalletCore.cppのcompile時にINTERFACE専用include pathは参照できない。
    target_include_directories(symbol_nem_wallet_core_rn PRIVATE
        "${SNWC_RN_PACKAGE_ROOT}/cpp"
        "${SNWC_RN_PACKAGE_ROOT}/cpp/include"
    )
    target_compile_definitions(symbol_nem_wallet_core_rn PRIVATE
        SNWC_RN_PLATFORM_ANDROID=1
        SNWC_RN_ANDROID_ABI="${ANDROID_ABI}"
        SNWC_RN_TARGET_ID="android-${ANDROID_ABI}"
    )
    if(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
        target_compile_definitions(symbol_nem_wallet_core_rn PRIVATE
            SNWC_RN_LIFECYCLE_INTEGRATION_TEST=1
        )
    endif()
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
