package com.thefttrack

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DriveUploader(private val accessToken: String) {

    fun upload(logsJson: String, uploadPictures: Boolean, uploadVideos: Boolean) {
        val logs = JSONArray(logsJson)
        val rootId = findOrCreateFolder("TheftTrack Backups", null)

        for (i in 0 until logs.length()) {
            val log = logs.getJSONObject(i)
            val ts = log.getLong("timestamp")
            val dateLabel = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(Date(ts))
            val logFolderId = findOrCreateFolder(dateLabel, rootId)

            if (uploadPictures) {
                val front = log.optJSONArray("frontPhotos") ?: JSONArray()
                for (j in 0 until front.length()) uploadFile(File(front.getString(j)), "image/jpeg", logFolderId)

                val back = log.optJSONArray("backPhotos") ?: JSONArray()
                for (j in 0 until back.length()) uploadFile(File(back.getString(j)), "image/jpeg", logFolderId)
            }

            if (uploadVideos) {
                val videoPath = log.optString("videoPath", "")
                if (videoPath.isNotEmpty()) {
                    val f = File(videoPath)
                    if (f.exists()) uploadFile(f, "video/mp4", logFolderId)
                }
            }
        }
    }

    private fun findOrCreateFolder(name: String, parentId: String?): String {
        val parentClause = if (parentId != null) " and '${parentId}' in parents" else ""
        val q = URLEncoder.encode(
            "name='$name' and mimeType='application/vnd.google-apps.folder' and trashed=false$parentClause",
            "UTF-8"
        )

        val listConn = get("https://www.googleapis.com/drive/v3/files?q=$q&fields=files(id)")
        val listJson = readBody(listConn)
        listConn.disconnect()

        val files = JSONObject(listJson).optJSONArray("files")
        if (files != null && files.length() > 0) return files.getJSONObject(0).getString("id")

        // Create new folder
        val body = JSONObject().apply {
            put("name", name)
            put("mimeType", "application/vnd.google-apps.folder")
            if (parentId != null) put("parents", JSONArray().put(parentId))
        }
        val createConn = post("https://www.googleapis.com/drive/v3/files", body.toString())
        val createJson = readBody(createConn)
        createConn.disconnect()
        return JSONObject(createJson).getString("id")
    }

    private fun fileExistsInFolder(fileName: String, parentId: String): Boolean {
        val q = URLEncoder.encode(
            "name='$fileName' and '$parentId' in parents and trashed=false",
            "UTF-8"
        )
        val conn = get("https://www.googleapis.com/drive/v3/files?q=$q&fields=files(id)")
        val json = readBody(conn)
        conn.disconnect()
        val files = JSONObject(json).optJSONArray("files")
        return files != null && files.length() > 0
    }

    private fun uploadFile(file: File, mimeType: String, parentId: String) {
        if (!file.exists()) return
        if (fileExistsInFolder(file.name, parentId)) return

        // Step 1 — initiate resumable upload session
        val metadata = JSONObject().apply {
            put("name", file.name)
            put("parents", JSONArray().put(parentId))
        }
        val initConn = openConn("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable") { conn ->
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("X-Upload-Content-Type", mimeType)
            conn.setRequestProperty("X-Upload-Content-Length", file.length().toString())
            conn.doOutput = true
            conn.outputStream.bufferedWriter().use { it.write(metadata.toString()) }
        }
        val initCode = initConn.responseCode
        val sessionUri = initConn.getHeaderField("Location")
        initConn.disconnect()

        if (initCode !in 200..299 || sessionUri == null) {
            throw Exception("Upload init failed for ${file.name}: HTTP $initCode")
        }

        // Step 2 — stream file content to session URI
        val uploadConn = (URL(sessionUri).openConnection() as HttpURLConnection).apply {
            requestMethod = "PUT"
            setRequestProperty("Content-Type", mimeType)
            setRequestProperty("Content-Length", file.length().toString())
            connectTimeout = 30_000
            readTimeout = 300_000
            doOutput = true
            setFixedLengthStreamingMode(file.length())
        }
        file.inputStream().use { it.copyTo(uploadConn.outputStream, bufferSize = 65_536) }

        val uploadCode = uploadConn.responseCode
        uploadConn.disconnect()

        if (uploadCode !in 200..299) {
            throw Exception("Content upload failed for ${file.name}: HTTP $uploadCode")
        }
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private fun get(urlStr: String): HttpURLConnection =
        openConn(urlStr) { it.requestMethod = "GET" }

    private fun post(urlStr: String, jsonBody: String): HttpURLConnection =
        openConn(urlStr) { conn ->
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.outputStream.bufferedWriter().use { it.write(jsonBody) }
        }

    private fun openConn(urlStr: String, configure: (HttpURLConnection) -> Unit): HttpURLConnection {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.setRequestProperty("Authorization", "Bearer $accessToken")
        conn.connectTimeout = 15_000
        conn.readTimeout = 60_000
        configure(conn)
        return conn
    }

    private fun readBody(conn: HttpURLConnection): String {
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        return stream?.bufferedReader()?.readText() ?: ""
    }
}
