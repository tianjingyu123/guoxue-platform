import { Injectable, Logger, Inject } from "@nestjs/common";
import * as fs from "fs";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { StorageProvider, UploadResult, STORAGE_PROVIDER } from "./storage.interface";
import { validateImageMagic, validateAudioMagic, validateVideoMagic } from "../../common/file-magic.util";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a", "audio/ogg"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-matroska"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  async upload(file: Express.Multer.File): Promise<UploadResult> {
    return this.provider.upload(file);
  }

  async uploadMany(files: Express.Multer.File[]): Promise<UploadResult[]> {
    if (!files || files.length === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "未选择文件");
    if (files.length > 9) throw new BusinessException(ErrorCode.BAD_REQUEST, "单次最多上传9个文件");
    const results = await Promise.all(files.map((f) => this.provider.upload(f)));
    return results;
  }

  async delete(key: string): Promise<void> {
    if (this.provider.delete) {
      return this.provider.delete(key);
    }
  }

  validateImage(file: Express.Multer.File) {
    if (!file) throw new BusinessException(ErrorCode.BAD_REQUEST, "未选择文件");
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_TYPE_DENIED, `不支持的图片格式: ${file.mimetype}，仅支持 ${ALLOWED_IMAGE_TYPES.join(", ")}`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_TOO_LARGE, `图片大小不能超过 ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }
    // 魔数校验：防止伪造 MIME 类型
    const head = this.readHead(file, 12);
    const magic = validateImageMagic(head);
    if (!magic.valid) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_TYPE_DENIED, "文件内容与声明类型不符，拒绝上传");
    }
  }

  validateAudio(file: Express.Multer.File) {
    if (!file) throw new BusinessException(ErrorCode.BAD_REQUEST, "未选择文件");
    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_TYPE_DENIED, `不支持的音频格式: ${file.mimetype}，仅支持 ${ALLOWED_AUDIO_TYPES.join(", ")}`);
    }
    if (file.size > MAX_AUDIO_SIZE) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_TOO_LARGE, `音频大小不能超过 ${MAX_AUDIO_SIZE / 1024 / 1024}MB`);
    }
    // 魔数校验：防止伪造 MIME 类型
    const head = this.readHead(file, 12);
    const magic = validateAudioMagic(head);
    if (!magic.valid) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_TYPE_DENIED, "文件内容与声明类型不符，拒绝上传");
    }
  }

  validateVideo(file: Express.Multer.File) {
    if (!file) throw new BusinessException(ErrorCode.BAD_REQUEST, "未选择文件");
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_TYPE_DENIED, `不支持的视频格式: ${file.mimetype}，仅支持 ${ALLOWED_VIDEO_TYPES.join(", ")}`);
    }
    if (file.size > MAX_VIDEO_SIZE) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_TOO_LARGE, `视频大小不能超过 ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
    }
    const head = this.readHead(file, 12);
    const magic = validateVideoMagic(head);
    if (!magic.valid) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_TYPE_DENIED, "文件内容与声明类型不符，拒绝上传");
    }
  }

  /** 读取文件头部魔数字节（优先 buffer，其次读磁盘） */
  private readHead(file: Express.Multer.File, bytes: number): Buffer {
    if (file.buffer && file.buffer.length >= bytes) {
      return file.buffer.subarray(0, bytes);
    }
    if (file.path) {
      try {
        const fd = fs.openSync(file.path, "r");
        const buf = Buffer.alloc(bytes);
        fs.readSync(fd, buf, 0, bytes, 0);
        fs.closeSync(fd);
        return buf;
      } catch (err: unknown) {
        this.logger.warn(`读取文件头部失败: ${(err as Error).message}`);
        return Buffer.alloc(0);
      }
    }
    return Buffer.alloc(0);
  }
}
