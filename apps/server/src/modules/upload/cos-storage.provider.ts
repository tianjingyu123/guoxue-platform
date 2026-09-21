import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import COS from "cos-nodejs-sdk-v5";
import {
  getTencentCredentialMode,
  getTencentInstanceRoleCredentialProvider,
  TencentInstanceRoleCredentialProvider,
} from "../../common/tencent-instance-role-credentials";
import {
  BufferUploadRequest,
  StorageProvider,
  UploadResult,
} from "./storage.interface";
import { getSafeExtension, normalizeStoragePrefix } from "./storage-extension";

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
    const ext = getSafeExtension(file.mimetype);
    const key = `uploads/${randomUUID()}${ext}`;
    await this.putObject(key, file.buffer, file.mimetype);
    return { url: this.buildUrl(key), key };
  }

  async uploadBuffer(req: BufferUploadRequest): Promise<UploadResult> {
    const prefix = normalizeStoragePrefix(req.prefix);
    const key = `${prefix}${randomUUID()}${getSafeExtension(req.mimetype)}`;
    await this.putObject(key, req.body, req.mimetype);
    return { url: this.buildUrl(key), key };
  }

  private async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: body,
          ContentType: contentType,
        },
        (err, _data) => {
          if (err) {
            this.logger.error("COS 上传失败", err.message);
            return reject(err);
          }
          resolve();
        },
      );
    });
  }

  private buildUrl(key: string): string {
    const base = this.cdnBase
      ? this.cdnBase.replace(/\/$/, "")
      : `https://${this.bucket}.cos.${this.region}.myqcloud.com`;
    return `${base}/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.cos.getObject(
        { Bucket: this.bucket, Region: this.region, Key: key },
        (err, data) => {
          if (err) {
            const status = (err as any)?.statusCode;
            if (status === 404) {
              return reject(Object.assign(new Error("对象不存在"), { code: "NOT_FOUND" }));
            }
            return reject(err);
          }
          const body = data?.Body;
          resolve(Buffer.isBuffer(body) ? body : Buffer.from(body as any));
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
