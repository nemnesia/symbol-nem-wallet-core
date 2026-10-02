package com.nemnesia.symbolnemwalletcore

import com.facebook.react.ReactHost
import com.facebook.react.bridge.ReactContext
import java.util.IdentityHashMap

/** RN 0.87 ReactHostと実際のReactContextに無効化処理を結び付ける。 */
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
        // ReactHostは古いReactContextの破棄前にcallbackを呼ぶが、同じ遷移中でも
        // currentReactContextがnullになる場合がある。無効化対象はこのhostへ登録したpackage instanceなので、
        // contextがnullでも処理を省略してはならない。
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
