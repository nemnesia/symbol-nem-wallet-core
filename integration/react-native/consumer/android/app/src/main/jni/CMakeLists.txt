cmake_minimum_required(VERSION 3.13)

# RN 0.87's application-level New Architecture entry point. The package CMake
# target is supplied by the published npm package and is linked once per ABI.
project(appmodules)

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# The release artifact is the same loadable appmodules image used by this
# consumer. The RN CLI-generated Android-rncli.cmake adds the package's
# cxxModule target and links it to appmodules. Give the final image the
# package SONAME before normalization so the artifact manifest cannot bless a
# renamed binary with an unrelated identity.
set_target_properties(${CMAKE_PROJECT_NAME} PROPERTIES
    LINK_FLAGS "-Wl,-soname,libsymbol_nem_wallet_core_rn.so"
)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
    "${CMAKE_CURRENT_LIST_DIR}/../../../../../node_modules/@nemnesia/symbol-nem-wallet-core/android/OnLoad.cpp"
)
