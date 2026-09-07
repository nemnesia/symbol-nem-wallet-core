package com.nemnesia.symbolnemwalletcore

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.runtime.cxxreactpackage.CxxReactPackage

/**
 * RN 0.87 New Architecture registration for one actual ReactApplicationContext.
 * The context is never used as a secret lifetime anchor; it identifies the RN
 * registration that owns the CxxReactPackage instance.
 */
@OptIn(FrameworkAPI::class)
@DoNotStrip
public class SymbolNemWalletCoreCxxReactPackage private constructor(
    hybridData: HybridData,
    reactContext: ReactContext,
) : CxxReactPackage(hybridData) {

  init {
    SymbolNemWalletCoreRnLifecycle.register(reactContext, this)
  }

  public companion object {
    @JvmStatic
    public fun create(reactContext: ReactContext): SymbolNemWalletCoreCxxReactPackage =
        SymbolNemWalletCoreCxxReactPackage(initHybrid(reactContext), reactContext)

    @JvmStatic
    @DoNotStrip
    private external fun initHybrid(reactContext: ReactContext): HybridData
  }
}
