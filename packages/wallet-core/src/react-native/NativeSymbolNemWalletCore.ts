import {TurboModule, TurboModuleRegistry} from "react-native";

export interface Spec extends TurboModule {
  readonly invoke: (operation: string, args: Object) => Object;
}

export default TurboModuleRegistry.getEnforcing<Spec>("NativeSymbolNemWalletCore");
