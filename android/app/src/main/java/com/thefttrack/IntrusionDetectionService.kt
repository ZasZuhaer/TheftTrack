package com.thefttrack

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class IntrusionDetectionService : Service() {

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val failedAttempts = intent?.getIntExtra(EXTRA_FAILED_ATTEMPTS, 0) ?: 0
        val isTest = intent?.getBooleanExtra(EXTRA_TEST, false) ?: false

        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())

        scope.launch {
            runCapture(failedAttempts, isTest)
            stopSelf()
        }

        return START_NOT_STICKY
    }

    private suspend fun runCapture(failedAttempts: Int, isTest: Boolean) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val locationEnabled  = prefs.getBoolean("location_enabled", false)
        val frontShots       = prefs.getInt("front_shots", 1).coerceIn(1, 5)
        val backShots        = prefs.getInt("back_shots", 1).coerceIn(1, 5)
        val watermarkEnabled = prefs.getBoolean("watermark_enabled", true)

        val camera = CameraCapture(this)
        val frontFiles = try { camera.captureMultipleFront(frontShots, watermarkEnabled) } catch (e: Exception) { emptyList() }
        delay(500)
        val backFiles  = try { camera.captureMultipleBack(backShots, watermarkEnabled) } catch (e: Exception) { emptyList() }

        val location = if (locationEnabled) tryGetLocation() else null

        val id = UUID.randomUUID().toString()
        val timestamp = System.currentTimeMillis()

        val log = JSONObject().apply {
            put("id", id)
            put("timestamp", timestamp)
            put("frontPhotos", JSONArray().also { arr -> frontFiles.forEach { arr.put(it.absolutePath) } })
            put("backPhotos",  JSONArray().also { arr -> backFiles.forEach  { arr.put(it.absolutePath) } })
            put("latitude",  location?.latitude  ?: 0.0)
            put("longitude", location?.longitude ?: 0.0)
            put("address", "")
            put("emailSent", false)
            put("failedAttempts", failedAttempts)
        }

        appendLog(log)

        val fromEmail   = prefs.getString(KEY_EMAIL,     "") ?: ""
        val appPassword = prefs.getString(KEY_PASSWORD,  "") ?: ""
        val toEmail     = prefs.getString(KEY_RECIPIENT, "") ?: ""

        if (fromEmail.isNotEmpty() && appPassword.isNotEmpty() && toEmail.isNotEmpty()) {
            val dateStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                .format(Date(timestamp))
            val locationStr = if (location != null)
                "Lat: ${location.latitude}, Lng: ${location.longitude}\nhttps://maps.google.com/?q=${location.latitude},${location.longitude}"
            else "Location unavailable"

            val body = """
                |TheftTrack Intrusion Alert
                |
                |Time: $dateStr
                |Failed unlock attempts: $failedAttempts
                |Location: $locationStr
                |${if (isTest) "\n(This is a test capture)" else ""}
            """.trimMargin()

            val attachments = frontFiles + backFiles
            val sent = withContext(Dispatchers.IO) {
                EmailSender.send(
                    fromEmail = fromEmail,
                    appPassword = appPassword,
                    toEmail = toEmail,
                    subject = "TheftTrack Alert - $dateStr",
                    body = body,
                    attachments = attachments
                )
            }

            if (sent) {
                updateEmailStatus(id, true)
            }
        }
    }

    private suspend fun tryGetLocation(): Location? = suspendCoroutine { cont ->
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            cont.resume(null)
            return@suspendCoroutine
        }

        val locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        var resumed = false

        val timeout = Timer().apply {
            schedule(object : TimerTask() {
                override fun run() {
                    if (!resumed) { resumed = true; cont.resume(null) }
                }
            }, 8000)
        }

        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                if (!resumed) {
                    resumed = true
                    timeout.cancel()
                    locationManager.removeUpdates(this)
                    cont.resume(location)
                }
            }
            @Deprecated("Deprecated in Java")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        try {
            val lastKnown = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)

            if (lastKnown != null && (System.currentTimeMillis() - lastKnown.time) < 60_000) {
                timeout.cancel()
                resumed = true
                cont.resume(lastKnown)
                return@suspendCoroutine
            }

            val mainLooper = Looper.getMainLooper()
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER, 0, 0f, listener, mainLooper
                )
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER, 0, 0f, listener, mainLooper
                )
            }
        } catch (e: Exception) {
            if (!resumed) { resumed = true; timeout.cancel(); cont.resume(null) }
        }
    }

    private fun appendLog(entry: JSONObject) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = JSONArray(prefs.getString(KEY_LOGS, "[]") ?: "[]")
        val updated = JSONArray().apply {
            put(entry)
            for (i in 0 until existing.length()) put(existing.getJSONObject(i))
        }
        // Keep only latest 100 entries
        val trimmed = JSONArray()
        for (i in 0 until minOf(100, updated.length())) trimmed.put(updated.getJSONObject(i))
        prefs.edit().putString(KEY_LOGS, trimmed.toString()).apply()
    }

    private fun updateEmailStatus(id: String, sent: Boolean) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = JSONArray(prefs.getString(KEY_LOGS, "[]") ?: "[]")
        for (i in 0 until existing.length()) {
            val obj = existing.getJSONObject(i)
            if (obj.optString("id") == id) {
                obj.put("emailSent", sent)
                break
            }
        }
        prefs.edit().putString(KEY_LOGS, existing.toString()).apply()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "TheftTrack Detection",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Used during intrusion capture" }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TheftTrack")
            .setContentText("Intrusion detected — capturing evidence...")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

    override fun onDestroy() {
        super.onDestroy()
        job.cancel()
    }

    companion object {
        const val EXTRA_FAILED_ATTEMPTS = "failedAttempts"
        const val EXTRA_TEST = "test"
        const val CHANNEL_ID = "thefttrack_channel"
        const val NOTIFICATION_ID = 9001
        const val PREFS_NAME = "TheftTrackPrefs"
        const val KEY_EMAIL = "email"
        const val KEY_PASSWORD = "email_password"
        const val KEY_RECIPIENT = "recipient_email"
        const val KEY_LOGS = "intrusion_logs"
    }
}
