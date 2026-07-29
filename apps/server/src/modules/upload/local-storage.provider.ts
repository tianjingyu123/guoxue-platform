import { Injectable } from "@nestjs/common";
import { join } from "path";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { StorageProvider, UploadResult } from "./storage.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private uploadDir = join(__dirname, "..", "..", "..", "uploads");

  async upload(file: Express.Multer.File): Promise<UploadResult> {
    // 使用安全扩展名：根据已验证的 MIME 类型映射，避免用户传入 .html/.svg 等危险扩展名
    const safeExt = this.getSafeExtension(file.mimetype);
    const filename = `${randomUUID()}${safeExt}`;
    const destPath = join(this.uploadDir, filename);

    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(destPath, file.buffer);

    return { url: `/uploads/${filename}` };
  }

  /** 根据已验证的 MIME 类型返回安全扩展名，不回退用户提供的原始扩展名 */
  private getSafeExtension(mime: string): string {
    const map: Record<string, string> = {
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
      "text/plain": ".txt", "text/markdown": ".md",
      "application/zip": ".zip", "application/x-zip-compressed": ".zip",
    };
    return map[mime] || ".bin"; // 未识别类型用 .bin，不会被执行
  }
}
