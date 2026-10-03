/**
 * 存储对象键构造辅助（LocalStorageProvider 与 CosStorageProvider 共用）。
 *
 * MIME → 扩展名只按已校验的 MIME 决定，绝不回退用户提供的原始扩展名，
 * 避免 .svg/.html/.js 等可被浏览器执行的内容落到存储桶上造成 XSS。
 * 未识别类型统一 .bin（不会被当作可执行内容处理）。
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/m4a": ".m4a",
  "audio/ogg": ".ogg",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-msvideo": ".avi",
  "video/x-matroska": ".mkv",
  // 文档附件（帖子文件卡 /upload/file）：白名单校验后的安全扩展名
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
};

export function getSafeExtension(mime: string): string {
  return MIME_TO_EXTENSION[mime] || ".bin";
}

/** 前缀白名单：小写字母、数字、连字符、下划线，用斜杠分层 */
const SAFE_PREFIX = /^[a-z0-9_-]+(\/[a-z0-9_-]+)*$/;

/**
 * 校验并归一化服务端自产内容的对象前缀。
 *
 * 前缀由业务代码给出（如 "audio/classic"），但仍强校验：一旦出现 ".." 或反斜杠等
 * 穿越片段就直接拒绝，避免写到预期目录之外或覆盖既有对象。返回值统一带尾部斜杠。
 */
export function normalizeStoragePrefix(prefix: string): string {
  const trimmed = (prefix || "").trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed || !SAFE_PREFIX.test(trimmed)) {
    throw new Error(
      `非法存储前缀：${prefix}。仅允许小写字母、数字、连字符、下划线，以斜杠分层。`,
    );
  }
  return `${trimmed}/`;
}
