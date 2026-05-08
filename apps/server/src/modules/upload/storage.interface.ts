export interface UploadResult {
  url: string;
  key?: string; // COS 对象 key，用于后续删除
}

export interface StorageProvider {
  /** 上传文件，返回访问 URL */
  upload(file: Express.Multer.File): Promise<UploadResult>;
  /** 删除文件（可选实现） */
  delete?(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = "STORAGE_PROVIDER";
