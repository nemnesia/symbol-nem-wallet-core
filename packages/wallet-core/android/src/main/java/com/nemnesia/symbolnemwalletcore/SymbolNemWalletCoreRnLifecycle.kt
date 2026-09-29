package com.nemnesia.symbolnemwalletcore

import com.facebook.react.ReactHost
import com.facebook.react.bridge.ReactContext
import java.util.IdentityHashMap

/** Binds invalidation to the RN 0.87 ReactHost and its actual ReactContext. */
public object SymbolNemWalletCoreRnLifecycle {
  private val lock = Any()
  private val packages = IdentityHashMap<ReactContext, SymbolNemWalletCoreCxxReactPackage>()
  private var attachedHost: ReactHost? = null
  private var beforeDestroy: (() -> Unit)? = null

  @JvmStatic
  public fun register(
      context: ReactContext,
      packageInstance: SymbolNemWalletCoreCxxReactPackage,
  ) {
    synchronized(lock) { packages[context] = packageInstance }
  }

  @JvmStatic
  public fun attach(host: ReactHost) {
    synchronized(lock) {
      if (attachedHost === host) return
      attachedHost?.let { oldHost ->
        beforeDestroy?.let { oldListener -> oldHost.removeBeforeDestroyListener(oldListener) }
      }
      val listener: () -> Unit = {
        // ReactHost invokes this callback before the old ReactContext is
        // destroyed, but currentReactContext is nullable during the same
        // transition. Invalidation is owned by the package instances we
        // registered for this host, so a null context must never skip it.
        val packageInstances = synchronized(lock) {
          val values = packages.values.toList()
          packages.clear()
          values
        }
        packageInstances.forEach { it.invalidateFromReactHost() }
      }
      beforeDestroy = listener
      attachedHost = host
      host.addBeforeDestroyListener(listener)
    }
  }

}
