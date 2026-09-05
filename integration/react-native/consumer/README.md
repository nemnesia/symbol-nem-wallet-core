# React Native release consumer

This directory is the source-controlled RN 0.87.0 New Architecture consumer
input used by the release producer. It is deliberately a template: the
producer creates the actual clean consumer checkout, installs the published
package, and applies this application-level `appmodules` CMake entry point.

The package CMake file is a library entry point. It does not require an
external consumer repository path or repository variable during ordinary npm
consumption. The consumer application owns the RN
`ReactNative-application.cmake` include and the `OnLoad.cpp` registration;
RN CLI autolinking contributes the package CMake target and the package
contributes its per-ABI prebuilt `.so` and C++ provider. The release producer
passes only the target-specific C ABI archive it built in the same checkout.

The iOS producer creates both approved static archive slices and the
XCFramework before the artifact-consuming `pod install`. No install-time
download or compilation is part of the published package contract.
