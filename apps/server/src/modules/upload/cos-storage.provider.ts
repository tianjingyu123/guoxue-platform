import { Injectable, Logger } from "@nestjs/common";
import { extname } from "path";
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
    const ext = extname(file.originalname) || ".png";
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
