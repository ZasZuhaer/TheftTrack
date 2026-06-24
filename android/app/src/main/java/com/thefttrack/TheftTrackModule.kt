package com.thefttrack

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject

class TheftTrackModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "TheftTrackModule"

    private val dpm: DevicePolicyManager
        get() = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

    private val adminComponent: ComponentName
        get() = ComponentName(reactContext, TheftTrackAdminReceiver::class.java)

    private val prefs
        get() = reactContext.getSharedPreferences("TheftTrackPrefs", Context.MODE_PRIVATE)

    // ── Device Admin ──────────────────────────────────────────────────────────

    @ReactMethod
    fun isDeviceAdminActive(promise: Promise) {
        promise.resolve(dpm.isAdminActive(adminComponent))
    }

    @ReactMethod
    fun requestDeviceAdmin() {
        val activity = reactContext.currentActivity ?: return
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "TheftTrack needs Device Administrator access to detect failed unlock attempts and trigger intrusion capture."
            )
        }
        activity.startActivity(intent)
    }

    @ReactMethod
    fun removeDeviceAdmin(promise: Promise) {
        dpm.removeActiveAdmin(adminComponent)
        promise.resolve(true)
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    @ReactMethod
    fun getSettings(promise: Promise) {
        val map = Arguments.createMap().apply {
            putString("email", prefs.getString("email", "") ?: "")
            putString("password", prefs.getString("email_password", "") ?: "")
            putString("recipient", prefs.getString("recipient_email", "") ?: "")
            putInt("threshold", prefs.getInt("threshold", 3))
            putBoolean("enabled", prefs.getBoolean("enabled", false))
            putBoolean("locationEnabled", prefs.getBoolean("location_enabled", false))
            putInt("frontShots", prefs.getInt("front_shots", 1))
            putInt("backShots", prefs.getInt("back_shots", 1))
            putBoolean("watermarkEnabled", prefs.getBoolean("watermark_enabled", true))
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun savePictureSettings(frontShots: Int, backShots: Int, watermarkEnabled: Boolean, promise: Promise) {
        prefs.edit()
            .putInt("front_shots", frontShots.coerceIn(1, 5))
            .putInt("back_shots", backShots.coerceIn(1, 5))
            .putBoolean("watermark_enabled", watermarkEnabled)
            .apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun saveSettings(
        email: String,
        password: String,
        recipient: String,
        threshold: Int,
        enabled: Boolean,
        promise: Promise
    ) {
        prefs.edit()
            .putString("email", email)
            .putString("email_password", password)
            .putString("recipient_email", recipient)
            .putInt("threshold", threshold)
            .putBoolean("enabled", enabled)
            .apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun setLocationEnabled(enabled: Boolean, promise: Promise) {
        prefs.edit().putBoolean("location_enabled", enabled).apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun getAppLock(promise: Promise) {
        val map = Arguments.createMap().apply {
            putBoolean("enabled", prefs.getBoolean("app_lock_enabled", false))
            putString("pin", prefs.getString("app_lock_pin", "") ?: "")
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun setAppLock(enabled: Boolean, pin: String, promise: Promise) {
        prefs.edit()
            .putBoolean("app_lock_enabled", enabled)
            .putString("app_lock_pin", pin)
            .apply()
        promise.resolve(true)
    }

    // ── Logs ──────────────────────────────────────────────────────────────────

    @ReactMethod
    fun getIntrusionLogs(promise: Promise) {
        try {
            val jsonArray = JSONArray(prefs.getString("intrusion_logs", "[]") ?: "[]")
            val result = Arguments.createArray()
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val rawFront = obj.optJSONArray("frontPhotos")
                    ?: obj.optString("frontPhoto").takeIf { it.isNotEmpty() }
                        ?.let { s -> JSONArray().apply { put(s) } }
                    ?: JSONArray()
                val rawBack = obj.optJSONArray("backPhotos")
                    ?: obj.optString("backPhoto").takeIf { it.isNotEmpty() }
                        ?.let { s -> JSONArray().apply { put(s) } }
                    ?: JSONArray()
                result.pushMap(Arguments.createMap().apply {
                    putString("id", obj.optString("id"))
                    putDouble("timestamp", obj.optDouble("timestamp"))
                    putArray("frontPhotos", Arguments.createArray().also { a ->
                        for (j in 0 until rawFront.length()) a.pushString(rawFront.optString(j))
                    })
                    putArray("backPhotos", Arguments.createArray().also { a ->
                        for (j in 0 until rawBack.length()) a.pushString(rawBack.optString(j))
                    })
                    putDouble("latitude", obj.optDouble("latitude"))
                    putDouble("longitude", obj.optDouble("longitude"))
                    putString("address", obj.optString("address"))
                    putBoolean("emailSent", obj.optBoolean("emailSent"))
                    putInt("failedAttempts", obj.optInt("failedAttempts"))
                })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("LOG_ERROR", e)
        }
    }

    @ReactMethod
    fun clearIntrusionLogs(promise: Promise) {
        prefs.edit().putString("intrusion_logs", "[]").apply()
        reactContext.filesDir.listFiles()
            ?.filter { it.name.startsWith("intrusion_") }
            ?.forEach { it.delete() }
        promise.resolve(true)
    }

    // ── Test Capture ──────────────────────────────────────────────────────────

    @ReactMethod
    fun triggerTestCapture(promise: Promise) {
        val intent = Intent(reactContext, IntrusionDetectionService::class.java)
            .putExtra(IntrusionDetectionService.EXTRA_TEST, true)
            .putExtra(IntrusionDetectionService.EXTRA_FAILED_ATTEMPTS, 0)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
        promise.resolve(true)
    }

    // ── Onboarding ────────────────────────────────────────────────────────────

    @ReactMethod
    fun isFirstLaunch(promise: Promise) {
        promise.resolve(!prefs.getBoolean("onboarding_complete", false))
    }

    @ReactMethod
    fun markOnboardingComplete(promise: Promise) {
        prefs.edit().putBoolean("onboarding_complete", true).apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun saveRecipientEmail(email: String, promise: Promise) {
        prefs.edit().putString("recipient_email", email).apply()
        promise.resolve(true)
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    @ReactMethod
    fun getFailedCount(promise: Promise) {
        promise.resolve(prefs.getInt("failed_count", 0))
    }

    @ReactMethod
    fun resetFailedCount(promise: Promise) {
        prefs.edit().putInt("failed_count", 0).apply()
        promise.resolve(true)
    }
}
