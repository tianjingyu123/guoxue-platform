import { Module } from "@nestjs/common";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";
import { STORAGE_PROVIDER } from "./storage.interface";
import { LocalStorageProvider } from "./local-storage.provider";
import { CosStorageProvider } from "./cos-storage.provider";
import { getTencentCredentialMode } from "../../common/tencent-instance-role-credentials";

type StorageMode = "auto" | "local" | "cos";

export function createStorageProvider(): LocalStorageProvider | CosStorageProvider {
  const mode = (process.env.STORAGE_PROVIDER || "auto").trim().toLowerCase() as StorageMode;
  if (!["auto", "local", "cos"].includes(mode)) {
    throw new Error(`STORAGE_PROVIDER 仅支持 auto、local 或 cos，当前值为 ${mode}`);
  }

  const credentialMode = getTencentCredentialMode();
  const requiredKeys =
    credentialMode === "instance-role"
      ? (["TENCENT_CVM_ROLE_NAME", "COS_BUCKET", "COS_REGION"] as const)
      : (["COS_SECRET_ID", "COS_SECRET_KEY", "COS_BUCKET"] as const);
  const missingKeys = requiredKeys.filter((key) => !process.env[key]?.trim());
  const configuredCount = requiredKeys.length - missingKeys.length;

  if (mode === "local") return new LocalStorageProvider();

  if (mode === "cos") {
    if (missingKeys.length > 0) {
      throw new Error(`STORAGE_PROVIDER=cos 时缺少必需配置：${missingKeys.join(", ")}`);
    }
    return new CosStorageProvider();
  }

  // auto 模式只允许“全部配置”或“全部未配置”，避免漏填一个字段后悄悄回退到本地盘。
  if (configuredCount > 0 && missingKeys.length > 0) {
    throw new Error(`COS 配置不完整：缺少 ${missingKeys.join(", ")}`);
  }
  return configuredCount === requiredKeys.length
    ? new CosStorageProvider()
    : new LocalStorageProvider();
}

@Module({
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: createStorageProvider,
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}
