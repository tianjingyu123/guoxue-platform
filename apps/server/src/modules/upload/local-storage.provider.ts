import { Injectable } from "@nestjs/common";
import { extname, join } from "path";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { StorageProvider, UploadResult } from "./storage.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private uploadDir = join(__dirname, "..", "..", "..", "uploads");

  async upload(file: Express.Multer.File): Promise<UploadResult> {
    const ext = extname(file.originalname) || ".png";
    const filename = `${randomUUID()}${ext}`;
    const destPath = join(this.uploadDir, filename);

    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(destPath, file.buffer);

    return { url: `/uploads/${filename}` };
  }
}
