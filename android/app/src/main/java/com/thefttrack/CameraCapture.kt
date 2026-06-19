package com.thefttrack

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.*
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import androidx.core.content.ContextCompat
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class CameraCapture(private val context: Context) {

    suspend fun captureFront(): File? = captureByFacing(CameraCharacteristics.LENS_FACING_FRONT, "front")
    suspend fun captureBack(): File?  = captureByFacing(CameraCharacteristics.LENS_FACING_BACK,  "back")

    private suspend fun captureByFacing(facing: Int, tag: String): File? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) return null

        val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val cameraId = manager.cameraIdList.firstOrNull { id ->
            manager.getCameraCharacteristics(id)
                .get(CameraCharacteristics.LENS_FACING) == facing
        } ?: return null

        return captureFromCamera(manager, cameraId, tag)
    }

    private suspend fun captureFromCamera(
        manager: CameraManager,
        cameraId: String,
        tag: String
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
                val file = File(context.filesDir, "intrusion_${System.currentTimeMillis()}_$tag.jpg")
                file.writeBytes(bytes)
                finish(file)
            } finally {
                image.close()
                reader.close()
            }
        }, handler)

        val stateCallback = object : CameraDevice.StateCallback() {
            override fun onOpened(camera: CameraDevice) {
                try {
                    val surfaces = listOf(imageReader.surface)
                    camera.createCaptureSession(
                        surfaces,
                        object : CameraCaptureSession.StateCallback() {
                            override fun onConfigured(session: CameraCaptureSession) {
                                try {
                                    val request = camera.createCaptureRequest(
                                        CameraDevice.TEMPLATE_STILL_CAPTURE
                                    ).apply {
                                        addTarget(imageReader.surface)
                                        set(CaptureRequest.CONTROL_AF_MODE,
                                            CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
                                        set(CaptureRequest.CONTROL_AE_MODE,
                                            CaptureRequest.CONTROL_AE_MODE_ON_AUTO_FLASH)
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

            override fun onDisconnected(camera: CameraDevice) {
                camera.close()
                finish(null)
            }

            override fun onError(camera: CameraDevice, error: Int) {
                camera.close()
                finish(null)
            }
        }

        try {
            manager.openCamera(cameraId, stateCallback, handler)
        } catch (e: Exception) {
            finish(null)
            thread.quitSafely()
        }
    }
}
