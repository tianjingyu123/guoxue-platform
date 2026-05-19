/**
 * 文件魔数校验工具
 *
 * 通过检查文件头字节（Magic Bytes）验证文件真实类型，
 * 防止攻击者伪造 MIME 类型上传恶意文件。
 */
export function validateImageMagic(buffer: Buffer): { valid: boolean; actualType?: string } {
  if (buffer.length < 4) return { valid: false };

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, actualType: "image/jpeg" };
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true, actualType: "image/png" };
  }

  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { valid: true, actualType: "image/gif" };
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return { valid: true, actualType: "image/webp" };
  }

  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return { valid: true, actualType: "image/bmp" };
  }

  return { valid: false };
}

export function validateAudioMagic(buffer: Buffer): { valid: boolean; actualType?: string } {
  if (buffer.length < 4) return { valid: false };

  // MP3: FF FB / FF F3 / FF F2 / ID3 tag (49 44 33)
  if ((buffer[0] === 0xff && (buffer[1] & 0xfe) === 0xfa) ||
      (buffer[0] === 0xff && (buffer[1] & 0xfe) === 0xf2) ||
      (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33)) {
    return { valid: true, actualType: "audio/mpeg" };
  }

  // WAV: 52 49 46 46 ... 57 41 56 45
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45) {
    return { valid: true, actualType: "audio/wav" };
  }

  // OGG: 4F 67 67 53
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return { valid: true, actualType: "audio/ogg" };
  }

  // M4A/MP4: ... 66 74 79 70 (ftyp box at offset 4)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return { valid: true, actualType: "audio/mp4" };
  }

  return { valid: false };
}

export function validateVideoMagic(buffer: Buffer): { valid: boolean; actualType?: string } {
  if (buffer.length < 12) return { valid: false };

  // MP4/M4V: ... ftyp box at offset 4
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return { valid: true, actualType: "video/mp4" };
  }

  // WebM: 1A 45 DF A3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { valid: true, actualType: "video/webm" };
  }

  // AVI: 52 49 46 46 ... 41 56 49 20
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x41 && buffer[9] === 0x56 && buffer[10] === 0x49 && buffer[11] === 0x20) {
    return { valid: true, actualType: "video/x-msvideo" };
  }

  // MOV/QuickTime: ... ftyp (same pattern as MP4 — "ftyp" at 4-7 handles mov too)
  // MOV 的 "moov" 容器格式也以 ftyp 开头，被 MP4 分支命中

  // MKV: 1A 45 DF A3 (Matroska, same magic as WebM)
  // 已被 WebM 分支命中

  return { valid: false };
}

/** 获取文件魔数字节特征串（用于日志/调试） */
export function getMagicHex(buffer: Buffer, length = 16): string {
  return buffer.subarray(0, Math.min(length, buffer.length)).toString("hex");
}
