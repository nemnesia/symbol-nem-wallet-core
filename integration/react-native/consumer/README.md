# React Native リリース検証用 consumer

このdirectoryには、release producerが使用するRN 0.87.0 New Architecture consumerの全sourceを置く。
producerはこのcheckoutを新しいtemporary workspaceへcopyし、`npm ci`で依存関係をinstallする。
Gradle wrapper、iOS project、Podfile、アプリ用`appmodules` CMake entry point、provider smoke appを含む。

package CMake targetはアプリのCMake targetからlinkし、RN New Architecture providerは
アプリ側の`OnLoad.cpp`で登録する。producerが渡すC ABI archiveは、同じ管理下checkout内で
作成された対象target用のものに限る。

iOS producerは、artifactを使う`pod install`とconsumerのlinkより前に、承認済みstatic archiveの
両sliceとXCFrameworkを作成する。install時のdownloadやcompileは公開packageの契約に含めない。
