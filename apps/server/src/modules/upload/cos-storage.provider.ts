import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import COS from "cos-nodejs-sdk-v5";
import {
  getTencentCredentialMode,
  getTencentInstanceRoleCredentialProvider,
  TencentInstanceRoleCredentialProvider,
} from "../../common/tencent-instance-role-credentials";
import { StorageProvider, UploadResult } from "./storage.interface";

@Injectable()
export class CosStorageProvider implements StorageProvider {
  private readonly logger = new Logger(CosStorageProvider.name);
  private readonly cos: COS;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnBase?: string;

  constructor(
    instanceRoleCredentials?: TencentInstanceRoleCredentialProvider,
  ) {
    const secretId = process.env.COS_SECRET_ID || "";
    const secretKey = process.env.COS_SECRET_KEY || "";
    const credentialMode = getTencentCredentialMode();
    this.bucket = process.env.COS_BUCKET || "";
    this.region = process.env.COS_REGION || "ap-guangzhou";
    this.cdnBase = process.env.COS_CDN_BASE || "";

    if (credentialMode === "instance-role") {
      const provider =
        instanceRoleCredentials || getTencentInstanceRoleCredentialProvider();
      this.cos = new COS({
        getAuthorization: (_options, callback) => {
          provider
            .getCredentials()
            .then((credentials) => callback(credentials))
            .catch((error: unknown) => {
              this.logger.error(
                "获取 CVM 实例角色临时凭据失败",
                error instanceof Error ? error.message : String(error),
              );
              // 让 COS SDK 把当前请求转换为明确失败，绝不静默回退到匿名上传。
              callback({
                TmpSecretId: "",
                TmpSecretKey: "",
                SecurityToken: "",
                StartTime: Math.floor(Date.now() / 1000),
                ExpiredTime: Math.floor(Date.now() / 1000) + 60,
              });
            });
        },
      });
      return;
    }

    if (!secretId || !secretKey) {
      this.logger.warn(
        "COS 静态凭据未配置，COS 上传将不可用。生产环境建议使用 CVM 实例角色。",
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
