package com.thefttrack

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Typeface
import android.hardware.camera2.*
import android.graphics.ImageFormat
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class CameraCapture(private val context: Context) {

    suspend fun captureMultipleFront(count: Int, watermarkEnabled: Boolean): List<File> =
        captureMultiple(CameraCharacteristics.LENS_FACING_FRONT, "front", count, watermarkEnabled)

    suspend fun captureMultipleBack(count: Int, watermarkEnabled: Boolean): List<File> =
        captureMultiple(CameraCharacteristics.LENS_FACING_BACK, "back", count, watermarkEnabled)

    private suspend fun captureMultiple(
        facing: Int,
        tag: String,
        count: Int,
        watermarkEnabled: Boolean
    ): List<File> {
        val files = mutableListOf<File>()
        for (i in 0 until count) {
            if (i > 0) delay(800)
            val file = captureByFacing(facing, "${tag}_${i + 1}", watermarkEnabled)
            if (file != null) files.add(file)
        }
        return files
    }

    private suspend fun captureByFacing(facing: Int, tag: String, watermarkEnabled: Boolean): File? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) return null

        val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val cameraId = manager.cameraIdList.firstOrNull { id ->
            manager.getCameraCharacteristics(id)
                .get(CameraCharacteristics.LENS_FACING) == facing
        } ?: return null

        val sensorOrientation = manager.getCameraCharacteristics(cameraId)
            .get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 90

        return captureFromCamera(manager, cameraId, tag, watermarkEnabled, sensorOrientation)
    }

    private suspend fun captureFromCamera(
        manager: CameraManager,
        cameraId: String,
        tag: String,
        watermarkEnabled: Boolean,
        rotationDegrees: Int
    ): File? = suspendCoroutine { cont ->
        val thread = HandlerThread("CameraThread_$tag").also { it.start() }
        val handler = Handler(thread.looper)

        val imageReader = ImageReader.newInstance(1280, 960, ImageFormat.JPEG, 1)
        var resumed = false

        fun finish(file: File?) {
            if (!resumed) {
                resumed = true
                cont.resume(file)
            }
            thread.quitSafely()
        }

        imageReader.setOnImageAvailableListener({ reader ->
            val image = reader.acquireLatestImage() ?: run { finish(null); return@setOnImageAvailableListener }
            try {
                val buffer = image.planes[0].buffer
                val bytes = ByteArray(buffer.remaining()).also { buffer.get(it) }
                val processed = processImage(bytes, watermarkEnabled, rotationDegrees)
                val file = File(context.filesDir, "intrusion_${System.currentTimeMillis()}_$tag.jpg")
                file.writeBytes(processed)
                finish(file)
            } finally {
                image.close()
                reader.close()
            }
        }, handler)

        val stateCallback = object : CameraDevice.StateCallback() {
            override fun onOpened(camera: CameraDevice) {
                try {
                    camera.createCaptureSession(
                        listOf(imageReader.surface),
                        object : CameraCaptureSession.StateCallback() {
                            override fun onConfigured(session: CameraCaptureSession) {
                                try {
                                    val request = camera.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE).apply {
                                        addTarget(imageReader.surface)
                                        set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
                                        set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON)
                                        set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_OFF)
                                        set(CaptureRequest.JPEG_QUALITY, 95.toByte())
                                    }
                                    session.capture(request.build(), object : CameraCaptureSession.CaptureCallback() {
                                        override fun onCaptureCompleted(
                                            session: CameraCaptureSession,
                                            request: CaptureRequest,
                                            result: TotalCaptureResult
                                        ) {
                                            camera.close()
                                        }
                                    }, handler)
                                } catch (e: Exception) {
                                    camera.close()
                                    finish(null)
                                }
                            }
                            override fun onConfigureFailed(session: CameraCaptureSession) {
                                camera.close()
                                finish(null)
                            }
                        },
                        handler
                    )
                } catch (e: Exception) {
                    camera.close()
                    finish(null)
                }
            }

            override fun onDisconnected(camera: CameraDevice) { camera.close(); finish(null) }
            override fun onError(camera: CameraDevice, error: Int) { camera.close(); finish(null) }
        }

        try {
            manager.openCamera(cameraId, stateCallback, handler)
        } catch (e: Exception) {
            finish(null)
            thread.quitSafely()
        }
    }

    private fun processImage(bytes: ByteArray, watermarkEnabled: Boolean, rotationDegrees: Int): ByteArray {
        var bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return bytes

        // Rotate using sensor orientation (more reliable than EXIF on Camera2 streams)
        if (rotationDegrees != 0) {
            bmp = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height,
                Matrix().apply { postRotate(rotationDegrees.toFloat()) }, true)
        }

        if (watermarkEnabled) {
            val mutable = bmp.copy(Bitmap.Config.ARGB_8888, true)
            val canvas = Canvas(mutable)
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
                alpha = 38                      // ~15% opacity — barely visible
                textSize = mutable.width * 0.065f
                textAlign = Paint.Align.CENTER
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                canvas.drawText("TheftTrack", mutable.width / 2f, mutable.height / 2f, this)
            }
            bmp = mutable
        }

        return ByteArrayOutputStream().also { bmp.compress(Bitmap.CompressFormat.JPEG, 95, it) }.toByteArray()
    }
}
