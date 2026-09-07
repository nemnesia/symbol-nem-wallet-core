package com.nemnesia.symbolnemwalletcore

import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.ReactContext
import java.lang.ref.WeakReference
import java.util.IdentityHashMap

/** Binds invalidation to the RN 0.87 ReactHost and its actual ReactContext. */
public object SymbolNemWalletCoreRnLifecycle {
  private val lock = Any()
  private val packages = IdentityHashMap<ReactContext, SymbolNemWalletCoreCxxReactPackage>()
  private var attachedHost: ReactHost? = null
  private var beforeDestroy: (() -> Unit)? = null
  private var lastInitializedContext: WeakReference<ReactContext>? = null
  private val instanceListener =
      object : ReactInstanceEventListener {
        override fun onReactContextInitialized(context: ReactContext) {
          // The package provider is invoked for each newly constructed
          // ReactApplicationContext. Keep the actual callback visible to the
          // lifecycle owner; identity remains the context/package objects.
          synchronized(lock) {
            lastInitializedContext = WeakReference(context)
          }
        }
      }

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
        oldHost.removeReactInstanceEventListener(instanceListener)
      }
      val listener: () -> Unit = listener@{
        val context = host.currentReactContext ?: return@listener
        val packageInstance = synchronized(lock) { packages.remove(context) }
        if (packageInstance != null) nativeInvalidate(packageInstance)
      }
      beforeDestroy = listener
      attachedHost = host
      host.addBeforeDestroyListener(listener)
      host.addReactInstanceEventListener(instanceListener)
    }
  }

  @JvmStatic
  private external fun nativeInvalidate(
      packageInstance: SymbolNemWalletCoreCxxReactPackage,
  )
}
