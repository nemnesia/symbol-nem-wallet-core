# React Native release consumer

This directory is the complete source-controlled RN 0.87.0 New Architecture
consumer used by the release producer. The producer copies this checkout to a
clean temporary workspace and installs its dependency graph with `npm ci`.
The Gradle wrapper, iOS project, Podfile, application-level `appmodules` CMake
entry point, and provider smoke app are all part of this input.

The package CMake target is linked by the application CMake target, and the
application owns RN New Architecture provider registration in `OnLoad.cpp`.
The producer passes only the target-specific C ABI archive created in the same
controlled checkout.

The iOS producer creates both approved static archive slices and the
XCFramework before the artifact-consuming `pod install` and consumer link.
No install-time download or compilation is part of the published package
contract.
