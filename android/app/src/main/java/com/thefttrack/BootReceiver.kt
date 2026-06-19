package com.thefttrack

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            context.getSharedPreferences(TheftTrackAdminReceiver.PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putInt(TheftTrackAdminReceiver.KEY_FAILED_COUNT, 0).apply()
        }
    }
}
