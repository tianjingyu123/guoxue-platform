import { Injectable, Logger } from "@nestjs/common";

/**
 * 多模态输入类型
 */
export type ModalityType = "image" | "audio" | "video" | "document";

/**
 * 图片理解请求
 */
export interface ImageUnderstandingRequest {
  /** 图片URL或Base64 */
  image: string;
  /** 分析提示词 */
  prompt?: string;
  /** 返回详细程度 */
  detail?: "low" | "high" | "auto";
}

/**
 * 图片理解结果
 */
export interface ImageUnderstandingResult {
  /** 图片描述 */
  description: string;
  /** 识别到的文字（OCR） */
  ocrText?: string;
  /** 内容标签 */
  tags: string[];
  /** 内容安全审核 */
  safetyCheck?: {
    safe: boolean;
    category?: string;
    confidence: number;
  };
}

/**
 * 图片生成请求
 */
export interface ImageGenerationRequest {
  /** 生成提示词 */
  prompt: string;
  /** 负向提示词 */
  negativePrompt?: string;
  /** 图片尺寸 */
  size?: "1024x1024" | "768x1024" | "1024x768";
  /** 生成数量 */
  n?: number;
  /** 风格 */
  style?: "ink" | "traditional" | "modern" | "realistic";
}

/**
 * 图片生成结果
 */
export interface ImageGenerationResult {
  /** 生成的图片URL列表 */
  images: string[];
  /** 修订后的提示词 */
  revisedPrompt?: string;
}

/**
 * 视频理解请求
 */
export interface VideoUnderstandingRequest {
  /** 视频URL */
  videoUrl: string;
  /** 分析提示词 */
  prompt?: string;
  /** 采样帧率（每秒帧数） */
  fps?: number;
  /** 最大处理时长(秒) */
  maxDuration?: number;
}

/**
 * 视频理解结果
 */
export interface VideoUnderstandingResult {
  /** 视频摘要 */
  summary: string;
  /** 关键帧描述 */
  keyFrames: Array<{
    timestamp: number;
    description: string;
  }>;
  /** 检测到的场景/话题 */
  topics: string[];
  /** 整体内容安全 */
  safe: boolean;
}

/**
 * 文档解析请求
 */
export interface DocumentParsingRequest {
  /** 文档URL */
  fileUrl: string;
  /** 文档类型 */
  fileType?: "pdf" | "docx" | "txt" | "md" | "html";
  /** 是否提取结构化数据 */
  extractTables?: boolean;
  /** 最大页面数 */
  maxPages?: number;
}

/**
 * 文档解析结果
 */
export interface DocumentParsingResult {
  /** 解析后的纯文本 */
  text: string;
  /** 文档标题 */
  title?: string;
  /** 提取的表格数据 */
  tables?: Array<{
    caption?: string;
    headers: string[];
    rows: string[][];
  }>;
  /** 元数据 */
  metadata?: {
    pageCount?: number;
    author?: string;
    createdAt?: string;
  };
}

/**
 * 多模态AI接口定义
 */
export interface IMultimodalService {
  /** 图片理解（OCR+描述+标签） */
  understandImage(req: ImageUnderstandingRequest): Promise<ImageUnderstandingResult>;

  /** 图片生成 */
  generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult>;

  /** 视频理解（摘要+关键帧+场景检测） */
  understandVideo(req: VideoUnderstandingRequest): Promise<VideoUnderstandingResult>;

  /** 文档解析（PDF/DOCX→结构化文本） */
  parseDocument(req: DocumentParsingRequest): Promise<DocumentParsingResult>;
}

/**
 * 多模态AI服务（P1 预留）
 *
 * 统一多模态能力接口：图片理解/生成、视频理解、文档解析。
 * 目前为架构桩代码，待接入具体多模态模型后补全。
 *
 * 设计目标：
 * - 多模态统一通过 AiGatewayService 路由
 * - 支持多供应商切换（混元/通义/DALL·E/Gemini）
 * - 图片生成内置国风样式（水墨/工笔/传统纹样）
 */
@Injectable()
export class MultimodalService implements IMultimodalService {
  private readonly logger = new Logger(MultimodalService.name);

  async understandImage(req: ImageUnderstandingRequest): Promise<ImageUnderstandingResult> {
    this.logger.warn("图片理解功能尚未实现");
    return {
      description: "多模态图片理解能力待接入（混元/通义/Gemini Vision）",
      tags: [],
      safetyCheck: { safe: true, confidence: 1 },
    };
  }

  async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    this.logger.warn("图片生成功能尚未实现");
    return {
      images: [],
      revisedPrompt: `多模态图片生成能力待接入。原提示词: ${req.prompt}`,
    };
  }

  async understandVideo(req: VideoUnderstandingRequest): Promise<VideoUnderstandingResult> {
    this.logger.warn("视频理解功能尚未实现");
    return {
      summary: "多模态视频理解能力待接入",
      keyFrames: [],
      topics: [],
      safe: true,
    };
  }

  async parseDocument(req: DocumentParsingRequest): Promise<DocumentParsingResult> {
    this.logger.warn("文档解析功能尚未实现");
    return {
      text: "多模态文档解析能力待接入（PDF/DOCX→结构化Markdown）",
      title: req.fileUrl,
    };
  }
}
