export interface UploadResult {
  url: string;
  key?: string; // COS 对象 key，用于后续删除
}

/** 服务端自产内容（TTS 音频等）的上传参数 */
export interface BufferUploadRequest {
  body: Buffer;
  /** 已知的 MIME，决定落地扩展名；未在白名单内则落 .bin */
  mimetype: string;
  /**
   * 对象前缀目录，如 "audio/classic"。仅允许小写字母、数字、斜杠、连字符、下划线。
   * 文件名由服务端生成，调用方不能指定，避免路径穿越与覆盖既有对象。
   */
  prefix: string;
}

export interface StorageProvider {
  /** 上传文件，返回访问 URL */
  upload(file: Express.Multer.File): Promise<UploadResult>;
  /**
   * 上传服务端自产的 Buffer（TTS 合成音频等），不经过 multipart。
   * 与 upload 分开是因为这类内容没有 Express.Multer.File，且前缀由业务侧决定。
   */
  uploadBuffer(req: BufferUploadRequest): Promise<UploadResult>;
  /**
   * 按对象键读取服务端自产内容（音频资产复用）。对象不存在时抛出 code="NOT_FOUND" 的错误。
   */
  download?(key: string): Promise<Buffer>;
  /** 删除文件（可选实现） */
  delete?(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = "STORAGE_PROVIDER";
