import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import COS from "cos-nodejs-sdk-v5";
import { StorageProvider, UploadResult } from "./storage.interface";

@Injectable()
export class CosStorageProvider implements StorageProvider {
  private readonly logger = new Logger(CosStorageProvider.name);
  private readonly cos: COS;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnBase?: string;

  constructor() {
    const secretId = process.env.COS_SECRET_ID || "";
    const secretKey = process.env.COS_SECRET_KEY || "";
    this.bucket = process.env.COS_BUCKET || "";
    this.region = process.env.COS_REGION || "ap-guangzhou";
    this.cdnBase = process.env.COS_CDN_BASE || "";

    if (!secretId || !secretKey) {
      this.logger.warn(
        "COS 凭证未配置，COS 上传将不可用。请在 .env 中设置 COS_SECRET_ID 和 COS_SECRET_KEY。",
      );
    }

    this.cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  }

  async upload(file: Express.Multer.File): Promise<UploadResult> {
    // 安全扩展名：按已验证的 MIME 映射，不回退用户原始扩展名（与 LocalStorageProvider 一致，防 .svg/.html 落地）
    const ext = this.getSafeExtension(file.mimetype);
    const key = `uploads/${randomUUID()}${ext}`;

    return new Promise((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
        (err, _data) => {
          if (err) {
            this.logger.error("COS 上传失败", err.message);
            return reject(err);
          }
          const base = this.cdnBase
            ? this.cdnBase.replace(/\/$/, "")
            : `https://${this.bucket}.cos.${this.region}.myqcloud.com`;
          resolve({ url: `${base}/${key}`, key });
        },
      );
    });
  }

  /** 根据已验证的 MIME 类型返回安全扩展名，不回退用户原始扩展名 */
  private getSafeExtension(mime: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp",
      "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/wav": ".wav", "audio/m4a": ".m4a", "audio/ogg": ".ogg",
      "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm", "video/x-msvideo": ".avi", "video/x-matroska": ".mkv",
    };
    return map[mime] || ".bin";
  }

  async delete(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cos.deleteObject(
        { Bucket: this.bucket, Region: this.region, Key: key },
        (err, _data) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });
  }
}
