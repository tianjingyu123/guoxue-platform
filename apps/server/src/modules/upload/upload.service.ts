import { Injectable, BadRequestException } from "@nestjs/common";
import { StorageProvider, UploadResult } from "./storage.interface";
import { LocalStorageProvider } from "./local-storage.provider";
import { CosStorageProvider } from "./cos-storage.provider";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a", "audio/ogg"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

@Injectable()
export class UploadService {
  private provider: StorageProvider;

  constructor() {
    const useCos = process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY && process.env.COS_BUCKET;
    this.provider = useCos ? new CosStorageProvider() : new LocalStorageProvider();
  }

  async upload(file: Express.Multer.File): Promise<UploadResult> {
    return this.provider.upload(file);
  }

  async uploadMany(files: Express.Multer.File[]): Promise<UploadResult[]> {
    if (!files || files.length === 0) throw new BadRequestException("未选择文件");
    if (files.length > 9) throw new BadRequestException("单次最多上传9个文件");
    const results = await Promise.all(files.map((f) => this.provider.upload(f)));
    return results;
  }

  async delete(key: string): Promise<void> {
    if (this.provider.delete) {
      return this.provider.delete(key);
    }
  }

  validateImage(file: Express.Multer.File) {
    if (!file) throw new BadRequestException("未选择文件");
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`不支持的图片格式: ${file.mimetype}，仅支持 ${ALLOWED_IMAGE_TYPES.join(", ")}`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(`图片大小不能超过 ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }
  }

  validateAudio(file: Express.Multer.File) {
    if (!file) throw new BadRequestException("未选择文件");
    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`不支持的音频格式: ${file.mimetype}，仅支持 ${ALLOWED_AUDIO_TYPES.join(", ")}`);
    }
    if (file.size > MAX_AUDIO_SIZE) {
      throw new BadRequestException(`音频大小不能超过 ${MAX_AUDIO_SIZE / 1024 / 1024}MB`);
    }
  }
}
