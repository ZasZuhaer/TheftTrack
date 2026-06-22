package com.thefttrack

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // Switch from SplashTheme to AppTheme before RN draws its first frame.
    // The splash window background stays visible until RN renders, then
    // AppTheme's #121212 background takes over — no white flash.
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)
  }

  override fun getMainComponentName(): String = "TheftTrack"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
