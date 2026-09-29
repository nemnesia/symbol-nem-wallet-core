package com.snwcrnbuild

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.nemnesia.symbolnemwalletcore.SymbolNemWalletCoreCxxReactPackage
import com.nemnesia.symbolnemwalletcore.SymbolNemWalletCoreRnLifecycle

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    val host = getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
      cxxReactPackageProviders = listOf { context ->
        SymbolNemWalletCoreCxxReactPackage.create(context)
      },
    )
    SymbolNemWalletCoreRnLifecycle.attach(host)
    host
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
