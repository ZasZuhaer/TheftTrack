package com.thefttrack

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.*
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import androidx.core.content.ContextCompat
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class VideoCapture(private val context: Context) {

    suspend fun captureFront(durationMs: Long): File? =
        captureByFacing(CameraCharacteristics.LENS_FACING_FRONT, durationMs)

    private suspend fun captureByFacing(facing: Int, durationMs: Long): File? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) return null

        val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val cameraId = manager.cameraIdList.firstOrNull { id ->
            manager.getCameraCharacteristics(id)
                .get(CameraCharacteristics.LENS_FACING) == facing
        } ?: return null

        return captureFromCamera(manager, cameraId, durationMs)
    }

    private suspend fun captureFromCamera(
        manager: CameraManager,
        cameraId: String,
        durationMs: Long
    ): File? = suspendCoroutine { cont ->
        val thread = HandlerThread("VideoThread_$cameraId").also { it.start() }
        val handler = Handler(thread.looper)
        var resumed = false

        val outputFile = File(context.filesDir, "intrusion_${System.currentTimeMillis()}_video.mp4")

        val mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }

        fun finish(file: File?) {
            if (!resumed) {
                resumed = true
                cont.resume(file)
            }
            thread.quitSafely()
        }

        try {
            mediaRecorder.apply {
                setVideoSource(MediaRecorder.VideoSource.SURFACE)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setVideoEncoder(MediaRecorder.VideoEncoder.H264)
                setVideoSize(640, 480)
                setVideoFrameRate(30)
                setVideoEncodingBitRate(1_000_000)
                setOutputFile(outputFile.absolutePath)
                prepare()
            }
        } catch (e: Exception) {
            mediaRecorder.release()
            finish(null)
            return@suspendCoroutine
        }

        val recorderSurface = mediaRecorder.surface

        val stateCallback = object : CameraDevice.StateCallback() {
            override fun onOpened(camera: CameraDevice) {
                try {
                    camera.createCaptureSession(
                        listOf(recorderSurface),
                        object : CameraCaptureSession.StateCallback() {
                            override fun onConfigured(session: CameraCaptureSession) {
                                try {
                                    val request = camera.createCaptureRequest(CameraDevice.TEMPLATE_RECORD).apply {
                                        addTarget(recorderSurface)
                                        set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_VIDEO)
                                        set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON)
                                        set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_OFF)
                                    }
                                    session.setRepeatingRequest(request.build(), null, handler)
                                    mediaRecorder.start()

                                    handler.postDelayed({
                                        try {
                                            mediaRecorder.stop()
                                            mediaRecorder.release()
                                        } catch (_: Exception) {}
                                        try { session.stopRepeating() } catch (_: Exception) {}
                                        recorderSurface.release()
                                        camera.close()
                                        finish(outputFile)
                                    }, durationMs)
                                } catch (e: Exception) {
                                    recorderSurface.release()
                                    camera.close()
                                    mediaRecorder.release()
                                    finish(null)
                                }
                            }

                            override fun onConfigureFailed(session: CameraCaptureSession) {
                                recorderSurface.release()
                                camera.close()
                                mediaRecorder.release()
                                finish(null)
                            }
                        },
                        handler
                    )
                } catch (e: Exception) {
                    recorderSurface.release()
                    camera.close()
                    mediaRecorder.release()
                    finish(null)
                }
            }

            override fun onDisconnected(camera: CameraDevice) {
                camera.close()
                mediaRecorder.release()
                finish(null)
            }

            override fun onError(camera: CameraDevice, error: Int) {
                camera.close()
                mediaRecorder.release()
                finish(null)
            }
        }

        try {
            manager.openCamera(cameraId, stateCallback, handler)
        } catch (e: Exception) {
            mediaRecorder.release()
            finish(null)
            thread.quitSafely()
        }
    }
}
