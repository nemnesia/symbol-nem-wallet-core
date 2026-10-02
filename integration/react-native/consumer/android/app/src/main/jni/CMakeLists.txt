cmake_minimum_required(VERSION 3.13)

# RN 0.87のアプリ用New Architecture entry point。package CMake targetは公開npm packageが提供し、
# ABIごとに一度だけlinkする。
project(appmodules)

# React Native 0.87 Codegen自体がC++20を必要とする。アプリ用CMake entry pointが生成targetを
# 作成する前に設定する。
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

get_property(SNWC_RN_CODEGEN_TARGETS
    DIRECTORY "${PROJECT_BUILD_DIR}/generated/source/codegen/jni"
    PROPERTY BUILDSYSTEM_TARGETS
)
list(FILTER SNWC_RN_CODEGEN_TARGETS INCLUDE REGEX "^react_codegen_")
if(NOT SNWC_RN_CODEGEN_TARGETS)
    message(FATAL_ERROR "RN app-level Codegen target is missing")
endif()
list(LENGTH SNWC_RN_CODEGEN_TARGETS SNWC_RN_CODEGEN_TARGET_COUNT)
if(NOT SNWC_RN_CODEGEN_TARGET_COUNT EQUAL 1)
    message(FATAL_ERROR "RN app-level Codegen target count is not exactly one")
endif()
list(GET SNWC_RN_CODEGEN_TARGETS 0 SNWC_RN_CODEGEN_TARGET)

# RN CLIのC++ autolinking metadataはアプリsourceの契約に含まれない。
# そのためclean consumerでは、lockfileで選択されたinstall済みnpm packageからtargetを明示登録する。
# これによりtargetとC ABI入力が、appmodulesを所有する同じCMake graphに入る。
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

# CMakeの標準shared-library規則はtarget optionの後にappmodules SONAMEを追加する。
# その標準設定を無効にして、最終load unitの名前を公開manifestのfile名と一致させる。
# 下記の明示的linker optionだけをlldへ渡すSONAMEとする。
set_target_properties(${CMAKE_PROJECT_NAME} PROPERTIES
    NO_SONAME TRUE
)

# appmodules shared objectはAndroid RNのload unitである。RN / AGPがpackage static archiveを
# hidden visibilityでlinkする場合に備え、providerと正確な埋め込みidentityをこのload unitの
# dynamic symbol契約に含める。
target_link_options(${CMAKE_PROJECT_NAME} PRIVATE
    "-Wl,-soname,libsymbol_nem_wallet_core_rn.so"
    "-Wl,--export-dynamic"
    "-Wl,--export-dynamic-symbol=snwc_rn_module_identity"
    "-Wl,--export-dynamic-symbol=snwc_rn_artifact_identity"
    "-Wl,--export-dynamic-symbol=snwc_rn_target_id"
    "-Wl,--export-dynamic-symbol=snwc_rn_artifact_identity_value"
    "-Wl,--export-dynamic-symbol=symbolNemWalletCoreCxxModuleProvider"
)
