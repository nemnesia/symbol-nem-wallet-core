package com.snwcrnbuild

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.os.Handler
import android.os.Looper
import android.util.Log

class MainActivity : ReactActivity() {

  private val lifecycleReloadHandler = Handler(Looper.getMainLooper())
  private var lifecycleReloadScheduled = false

  /**
   * JavaScriptから登録されたmain componentの名前を返す。componentのrendering開始時に使われる。
   */
  override fun getMainComponentName(): String = "SnwcRnBuild"

  /**
   * [ReactActivityDelegate]のinstanceを返す。[DefaultReactActivityDelegate]を使うと、
   * boolean flag [fabricEnabled]ひとつでNew Architectureを有効にできる。
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: android.os.Bundle?) {
    super.onCreate(savedInstanceState)
    if (intent.getBooleanExtra("snwc_rn_lifecycle_reload_request", false)) {
      reloadReactHost()
    }
  }

  override fun onNewIntent(intent: android.content.Intent?) {
    super.onNewIntent(intent)
    if (intent?.getBooleanExtra("snwc_rn_lifecycle_reload_request", false) == true) {
      reloadReactHost()
    }
  }

  private fun reloadReactHost() {
    if (!lifecycleReloadScheduled) {
      lifecycleReloadScheduled = true
      lifecycleReloadHandler.post {
        Log.i("SnwcRnBuild", "SNWC_RN_NATIVE_LIFECYCLE_RELOAD_REQUESTED")
        val reloadTask =
            (application as MainApplication).reactHost.reload("SNWC_RN_NATIVE_LIFECYCLE_RELOAD")
        Thread {
          try {
            reloadTask.waitForCompletion()
            val error = reloadTask.getError()
            if (error == null) {
              Log.i("SnwcRnBuild", "SNWC_RN_NATIVE_LIFECYCLE_RELOAD_COMPLETED")
            } else {
              Log.e("SnwcRnBuild", "SNWC_RN_NATIVE_LIFECYCLE_RELOAD_FAILED:${error::class.java.name}")
            }
          } catch (interrupted: InterruptedException) {
            Thread.currentThread().interrupt()
            Log.e("SnwcRnBuild", "SNWC_RN_NATIVE_LIFECYCLE_RELOAD_FAILED:InterruptedException")
          }
        }.start()
      }
    }
  }

  override fun onDestroy() {
    lifecycleReloadHandler.removeCallbacksAndMessages(null)
    super.onDestroy()
  }
}
