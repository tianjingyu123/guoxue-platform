import { Injectable } from "@nestjs/common";
import { StorageProvider, UploadResult } from "./storage.interface";
import { LocalStorageProvider } from "./local-storage.provider";
import { CosStorageProvider } from "./cos-storage.provider";

@Injectable()
export class UploadService {
  private provider: StorageProvider;

  constructor() {
    const useCos = process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY && process.env.COS_BUCKET;
    if (useCos) {
      this.provider = new CosStorageProvider();
    } else {
      this.provider = new LocalStorageProvider();
    }
  }

  async upload(file: Express.Multer.File): Promise<UploadResult> {
    return this.provider.upload(file);
  }

  async delete(key: string): Promise<void> {
    if (this.provider.delete) {
      return this.provider.delete(key);
    }
  }
}
