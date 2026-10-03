import { Injectable } from "@nestjs/common";
import { join } from "path";
import { randomUUID } from "crypto";
import { writeFile, mkdir, readFile } from "fs/promises";
import {
  BufferUploadRequest,
  StorageProvider,
  UploadResult,
} from "./storage.interface";
import { getSafeExtension, normalizeStoragePrefix } from "./storage-extension";

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

  async uploadBuffer(req: BufferUploadRequest): Promise<UploadResult> {
    // 前缀经白名单校验后才拼进路径，杜绝 ".." 穿越写到 uploads 之外
    const prefix = normalizeStoragePrefix(req.prefix);
    const key = `${prefix}${randomUUID()}${getSafeExtension(req.mimetype)}`;
    const destPath = join(this.uploadDir, key);

    await mkdir(join(destPath, ".."), { recursive: true });
    await writeFile(destPath, req.body);

    return { url: `/uploads/${key}`, key };
  }

  async download(key: string): Promise<Buffer> {
    const prefix = normalizeStoragePrefix(key.split("/").slice(0, -1).join("/"));
    const name = key.split("/").pop() || "";
    if (!/^[A-Za-z0-9-]+\.[a-z0-9]+$/.test(name)) {
      throw Object.assign(new Error("非法对象键"), { code: "NOT_FOUND" });
    }
    try {
      return await readFile(join(this.uploadDir, `${prefix}${name}`));
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        throw Object.assign(new Error("对象不存在"), { code: "NOT_FOUND" });
      }
      throw error;
    }
  }

  /** 根据已验证的 MIME 类型返回安全扩展名，不回退用户提供的原始扩展名 */
  private getSafeExtension(mime: string): string {
    return getSafeExtension(mime);
  }
}
