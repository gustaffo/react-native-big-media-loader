package com.yourorg.bigmedialoader

import android.net.Uri
import android.content.ContentResolver
import android.os.ParcelFileDescriptor
import java.io.FileInputStream
import java.nio.channels.FileChannel

data class BigMediaHandle(
  val id: Int,
  val uri: Uri,
  val pfd: ParcelFileDescriptor,
  val channel: FileChannel,
  val size: Long,
  val mime: String?,
  val name: String?
)
