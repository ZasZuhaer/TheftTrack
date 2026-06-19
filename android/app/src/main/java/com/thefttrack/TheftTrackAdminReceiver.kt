package com.thefttrack

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class TheftTrackAdminReceiver : DeviceAdminReceiver() {

    override fun onPasswordFailed(context: Context, intent: Intent) {
        super.onPasswordFailed(context, intent)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_ENABLED, false)) return

        val threshold = prefs.getInt(KEY_THRESHOLD, 3)
        val newCount = prefs.getInt(KEY_FAILED_COUNT, 0) + 1
        prefs.edit().putInt(KEY_FAILED_COUNT, newCount).apply()

        if (newCount >= threshold) {
            prefs.edit().putInt(KEY_FAILED_COUNT, 0).apply()
            val serviceIntent = Intent(context, IntrusionDetectionService::class.java)
                .putExtra(IntrusionDetectionService.EXTRA_FAILED_ATTEMPTS, newCount)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }

    override fun onPasswordSucceeded(context: Context, intent: Intent) {
        super.onPasswordSucceeded(context, intent)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putInt(KEY_FAILED_COUNT, 0).apply()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_ENABLED, false).apply()
    }

    companion object {
        const val PREFS_NAME = "TheftTrackPrefs"
        const val KEY_ENABLED = "enabled"
        const val KEY_THRESHOLD = "threshold"
        const val KEY_FAILED_COUNT = "failed_count"
    }
}
