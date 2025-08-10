package com.yourorg.bigmedialoader

import com.facebook.react.bridge.*
import java.nio.ByteBuffer
import android.util.Base64
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class BigMediaLoaderModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var nextId = 1
  private val handles = HashMap<Int, BigMediaHandle>()
  private var pickImageResolve: Promise? = null
  private var pickVideoResolve: Promise? = null
  private var pickMediaResolve: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "BigMediaLoader"

  override fun onNewIntent(intent: android.content.Intent) {
    // Not needed for media picker
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun open(uriString: String): Int {
    val uri = Uri.parse(uriString)
    val cr = reactContext.contentResolver
    val mime = cr.getType(uri)
    val name = queryDisplayName(cr, uri)

    val pfd = cr.openFileDescriptor(uri, "r")
      ?: throw RuntimeException("Cannot open uri: $uriString")
    val fis = FileInputStream(pfd.fileDescriptor)
    val channel = fis.channel
    val size = channel.size()

    val id = nextId++
    handles[id] = BigMediaHandle(id, uri, pfd, channel, size, mime, name)
    return id
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun close(handle: Int) {
    handles.remove(handle)?.let {
      it.channel.close()
      it.pfd.close()
    }
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun stat(handle: Int): WritableMap {
    val h = handles[handle] ?: throw RuntimeException("Invalid handle")
    val map = Arguments.createMap()
    map.putDouble("size", h.size.toDouble())
    map.putString("mime", h.mime)
    map.putString("name", h.name)
    map.putString("uri", h.uri.toString())
    return map
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun playableUri(handle: Int): String {
    val h = handles[handle] ?: throw RuntimeException("Invalid handle")
    return h.uri.toString() // Pass this to your media player
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun readBase64(handle: Int, offset: Double, length: Double): WritableMap {
    val h = handles[handle] ?: throw RuntimeException("Invalid handle")
    val off = offset.toLong()
    val len = length.toLong().coerceAtMost(4L * 1024L * 1024L) // cap to 4MB per sync call

    val buf = ByteBuffer.allocate(len.toInt())
    h.channel.position(off)
    val read = h.channel.read(buf)
    val out = Arguments.createMap()

    if (read <= 0) {
      out.putDouble("offset", off.toDouble())
      out.putInt("bytesRead", 0)
      out.putBoolean("eof", true)
      out.putString("base64", "")
      return out
    }

    buf.flip()
    val bytes = ByteArray(read)
    buf.get(bytes)
    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

    out.putDouble("offset", off.toDouble())
    out.putInt("bytesRead", read)
    out.putBoolean("eof", (off + read) >= h.size)
    out.putString("base64", base64)
    return out
  }

  private fun queryDisplayName(cr: ContentResolver, uri: Uri): String? {
    val proj = arrayOf(android.provider.OpenableColumns.DISPLAY_NAME)
    cr.query(uri, proj, null, null, null)?.use { c ->
      val idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
      if (idx >= 0 && c.moveToFirst()) return c.getString(idx)
    }
    return null
  }

  // MARK: - Media Picker Methods

  @ReactMethod
  fun pickImage(options: ReadableMap, promise: Promise) {
    pickImageResolve = promise
    val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
    intent.type = "image/*"
    
    if (options.hasKey("multiple") && options.getBoolean("multiple")) {
      intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
    }
    
    try {
      val activity = currentActivity
      if (activity != null) {
        activity.startActivityForResult(intent, REQUEST_PICK_IMAGE)
      } else {
        promise.reject("NO_ACTIVITY", "No activity available")
      }
    } catch (e: Exception) {
      promise.reject("PICKER_ERROR", e.message)
    }
  }

  @ReactMethod
  fun pickVideo(options: ReadableMap, promise: Promise) {
    pickVideoResolve = promise
    val intent = Intent(Intent.ACTION_PICK, MediaStore.Video.Media.EXTERNAL_CONTENT_URI)
    intent.type = "video/*"
    
    if (options.hasKey("multiple") && options.getBoolean("multiple")) {
      intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
    }
    
    try {
      val activity = currentActivity
      if (activity != null) {
        activity.startActivityForResult(intent, REQUEST_PICK_VIDEO)
      } else {
        promise.reject("NO_ACTIVITY", "No activity available")
      }
    } catch (e: Exception) {
      promise.reject("PICKER_ERROR", e.message)
    }
  }

  @ReactMethod
  fun pickMedia(options: ReadableMap, promise: Promise) {
    pickMediaResolve = promise
    val intent = Intent(Intent.ACTION_PICK)
    intent.type = "*/*"
    intent.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
    
    if (options.hasKey("multiple") && options.getBoolean("multiple")) {
      intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
    }
    
    try {
      val activity = currentActivity
      if (activity != null) {
        activity.startActivityForResult(intent, REQUEST_PICK_MEDIA)
      } else {
        promise.reject("NO_ACTIVITY", "No activity available")
      }
    } catch (e: Exception) {
      promise.reject("PICKER_ERROR", e.message)
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    when (requestCode) {
      REQUEST_PICK_IMAGE -> handleImageResult(resultCode, data, pickImageResolve)
      REQUEST_PICK_VIDEO -> handleVideoResult(resultCode, data, pickVideoResolve)
      REQUEST_PICK_MEDIA -> handleMediaResult(resultCode, data, pickMediaResolve)
    }
  }

  private fun handleImageResult(resultCode: Int, data: Intent?, promise: Promise?) {
    if (resultCode == Activity.RESULT_CANCELED) {
      promise?.resolve(createCanceledResult())
      return
    }
    
    if (resultCode == Activity.RESULT_OK && data != null) {
      val assets = mutableListOf<WritableMap>()
      
      if (data.clipData != null) {
        // Multiple images selected
        for (i in 0 until data.clipData!!.itemCount) {
          val uri = data.clipData!!.getItemAt(i).uri
          val asset = createAssetFromUri(uri, "image")
          assets.add(asset)
        }
      } else {
        // Single image selected
        val uri = data.data
        if (uri != null) {
          val asset = createAssetFromUri(uri, "image")
          assets.add(asset)
        }
      }
      
      promise?.resolve(createSuccessResult(assets))
    }
  }

  private fun handleVideoResult(resultCode: Int, data: Intent?, promise: Promise?) {
    if (resultCode == Activity.RESULT_CANCELED) {
      promise?.resolve(createCanceledResult())
      return
    }
    
    if (resultCode == Activity.RESULT_OK && data != null) {
      val assets = mutableListOf<WritableMap>()
      
      if (data.clipData != null) {
        // Multiple videos selected
        for (i in 0 until data.clipData!!.itemCount) {
          val uri = data.clipData!!.getItemAt(i).uri
          val asset = createAssetFromUri(uri, "video")
          assets.add(asset)
        }
      } else {
        // Single video selected
        val uri = data.data
        if (uri != null) {
          val asset = createAssetFromUri(uri, "video")
          assets.add(asset)
        }
      }
      
      promise?.resolve(createSuccessResult(assets))
    }
  }

  private fun handleMediaResult(resultCode: Int, data: Intent?, promise: Promise?) {
    if (resultCode == Activity.RESULT_CANCELED) {
      promise?.resolve(createCanceledResult())
      return
    }
    
    if (resultCode == Activity.RESULT_OK && data != null) {
      val assets = mutableListOf<WritableMap>()
      
      if (data.clipData != null) {
        // Multiple media files selected
        for (i in 0 until data.clipData!!.itemCount) {
          val uri = data.clipData!!.getItemAt(i).uri
          val mimeType = reactContext.contentResolver.getType(uri)
          val type = if (mimeType?.startsWith("image/") == true) "image" else "video"
          val asset = createAssetFromUri(uri, type)
          assets.add(asset)
        }
      } else {
        // Single media file selected
        val uri = data.data
        if (uri != null) {
          val mimeType = reactContext.contentResolver.getType(uri)
          val type = if (mimeType?.startsWith("image/") == true) "image" else "video"
          val asset = createAssetFromUri(uri, type)
          assets.add(asset)
        }
      }
      
      promise?.resolve(createSuccessResult(assets))
    }
  }

  private fun createAssetFromUri(uri: Uri, type: String): WritableMap {
    val asset = Arguments.createMap()
    asset.putString("uri", uri.toString())
    asset.putString("type", type)
    
    // Get file info
    val cursor = reactContext.contentResolver.query(uri, null, null, null, null)
    cursor?.use {
      if (it.moveToFirst()) {
        val nameIndex = it.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
        val sizeIndex = it.getColumnIndex(MediaStore.MediaColumns.SIZE)
        
        if (nameIndex >= 0) {
          asset.putString("fileName", it.getString(nameIndex))
        }
        if (sizeIndex >= 0) {
          asset.putDouble("fileSize", it.getLong(sizeIndex).toDouble())
        }
      }
    }
    
    return asset
  }

  private fun createSuccessResult(assets: List<WritableMap>): WritableMap {
    val result = Arguments.createMap()
    val assetsArray = Arguments.createArray()
    assets.forEach { assetsArray.pushMap(it) }
    result.putArray("assets", assetsArray)
    result.putBoolean("canceled", false)
    return result
  }

  private fun createCanceledResult(): WritableMap {
    val result = Arguments.createMap()
    result.putArray("assets", Arguments.createArray())
    result.putBoolean("canceled", true)
    return result
  }

  companion object {
    private const val REQUEST_PICK_IMAGE = 1001
    private const val REQUEST_PICK_VIDEO = 1002
    private const val REQUEST_PICK_MEDIA = 1003
  }
}
