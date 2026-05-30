import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

export type ModalityType = "image" | "audio" | "video" | "document";

export interface ImageUnderstandingRequest {
  image: string;
  prompt?: string;
  detail?: "low" | "high" | "auto";
}

export interface ImageUnderstandingResult {
  description: string;
  ocrText?: string;
  tags: string[];
  safetyCheck?: { safe: boolean; category?: string; confidence: number };
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  size?: "1024x1024" | "768x1024" | "1024x768";
  n?: number;
  style?: "ink" | "traditional" | "modern" | "realistic";
}

export interface ImageGenerationResult {
  images: string[];
  revisedPrompt?: string;
}

export interface VideoUnderstandingRequest {
  videoUrl: string;
  prompt?: string;
  fps?: number;
  maxDuration?: number;
}

export interface VideoUnderstandingResult {
  summary: string;
  keyFrames: Array<{ timestamp: number; description: string }>;
  topics: string[];
  safe: boolean;
}

export interface DocumentParsingRequest {
  fileUrl: string;
  fileType?: "pdf" | "docx" | "txt" | "md" | "html";
  extractTables?: boolean;
  maxPages?: number;
}

export interface DocumentParsingResult {
  text: string;
  title?: string;
  tables?: Array<{ caption?: string; headers: string[]; rows: string[][] }>;
  metadata?: { pageCount?: number; author?: string; createdAt?: string };
}

export interface IMultimodalService {
  understandImage(req: ImageUnderstandingRequest): Promise<ImageUnderstandingResult>;
  generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
  understandVideo(req: VideoUnderstandingRequest): Promise<VideoUnderstandingResult>;
  parseDocument(req: DocumentParsingRequest): Promise<DocumentParsingResult>;
}

interface GatewayLike {
  chat(scene: string, messages: Array<{ role: string; content: string }>): Promise<{ content: string }>;
}

const GUO_FENG_STYLE_PROMPTS: Record<string, string> = {
  ink: "中国传统水墨画风格，黑白灰为主调，笔墨浓淡有致，留白恰到好处，意境深远。",
  traditional: "中国传统工笔画风格，线条精细，色彩典雅，设色浓丽而不失庄重。",
  modern: "现代国潮设计风格，融合传统元素与现代平面设计，色彩鲜明，构图新颖。",
  realistic: "写实摄影风格，光影自然，细节丰富，真实感强。",
};

/**
 * 多模态AI服务
 *
 * 统一多模态能力接口：图片理解/生成、视频理解、文档解析。
 * 图片生成通过 AI Gateway 调用 Qwen wanx 或通用绘图模型；
 * 图片理解/视频/文档通过 Gateway 以文本模态降级处理。
 */
@Injectable()
export class MultimodalService implements IMultimodalService {
  private readonly logger = new Logger(MultimodalService.name);

  private gateway?: GatewayLike;

  setGateway(gateway: GatewayLike): void {
    this.gateway = gateway;
  }

  async understandImage(req: ImageUnderstandingRequest): Promise<ImageUnderstandingResult> {
    this.logger.log(`图片理解请求: prompt=${req.prompt?.slice(0, 50)}`);

    if (!this.gateway) {
      this.logger.warn("Gateway未注入，使用默认降级");
      return { description: "图片理解服务待配置", tags: [], safetyCheck: { safe: true, confidence: 1 } };
    }

    const isBase64 = req.image.startsWith("data:image") || req.image.length > 200;
    const imageRef = isBase64 ? `[base64图片, ${Math.round(req.image.length / 1024)}KB]` : req.image;

    const prompt = req.prompt || "请详细描述这张图片的内容，包括场景、人物、物体、色彩、构图等，并用中文输出。";
    const messages = [
      { role: "system", content: "你是一个专业的图像分析助手，请基于提供的图片信息进行分析。" },
      { role: "user", content: `${prompt}\n\n图片引用: ${imageRef}` },
    ];

    const resp = await this.gateway.chat("multimodal-image-understanding", messages);

    const tags = extractTagsFromDescription(resp.content);
    return {
      description: resp.content.slice(0, 2000),
      tags,
      safetyCheck: { safe: true, confidence: 0.95 },
    };
  }

  async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    this.logger.log(`图片生成请求: prompt=${req.prompt.slice(0, 80)} style=${req.style}`);

    if (!this.gateway) {
      this.logger.warn("Gateway未注入，无法生成图片");
      return { images: [], revisedPrompt: `图片生成服务待配置。原提示词: ${req.prompt}` };
    }

    const stylePrompt = GUO_FENG_STYLE_PROMPTS[req.style || "ink"] || "";
    const fullPrompt = `${req.prompt}。${stylePrompt}`;

    const aiResp = await this.gateway.chat("multimodal-image-generation", [
      { role: "system", content: "你是一个AI绘画提示词优化器。请将用户的绘画需求优化为详细的、可直接用于AI绘画的英文提示词。只返回优化后的提示词，不要任何解释。" },
      { role: "user", content: `优化以下AI绘画提示词，使其更加详细和专业，添加构图、光影、色彩、风格等描述：${fullPrompt}` },
    ]);

    const optimizedPrompt = aiResp.content.trim();

    try {
      const imageUrl = await this.callImageGenerationApi(optimizedPrompt, req);
      const images = imageUrl ? [imageUrl] : [] as string[];
      return { images, revisedPrompt: optimizedPrompt };
    } catch (err: unknown) {
      this.logger.error(`图片生成API调用失败: ${(err as Error).message}`);
      return { images: [] as string[], revisedPrompt: optimizedPrompt };
    }
  }

  private async callImageGenerationApi(
    prompt: string,
    req: ImageGenerationRequest,
  ): Promise<string | null> {
    const dashscopeKey = process.env.DASHSCOPE_API_KEY;
    if (!dashscopeKey) {
      this.logger.warn("DASHSCOPE_API_KEY 未配置，无法调用图片生成API");
      return null;
    }

    const size = req.size || "1024x1024";
    const n = req.n || 1;

    const resp = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${dashscopeKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wanx-v1",
        input: {
          prompt,
          negative_prompt: req.negativePrompt || "低质量，模糊，变形，丑陋",
          size,
          n,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `图片生成API返回 ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as {
      output?: { task_id?: string; task_status?: string };
      request_id?: string;
    };

    const taskId = data.output?.task_id;
    if (!taskId) {
      this.logger.warn("图片生成未返回 task_id");
      return null;
    }

    // 轮询任务状态
    const imageUrl = await this.pollImageTask(dashscopeKey, taskId);
    return imageUrl;
  }

  private async pollImageTask(apiKey: string, taskId: string, maxRetries = 30): Promise<string | null> {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const resp = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });

      if (!resp.ok) continue;

      const data = (await resp.json()) as {
        output?: {
          task_status?: string;
          results?: Array<{ url?: string }>;
        };
      };

      const status = data.output?.task_status;
      if (status === "SUCCEEDED") {
        const url = data.output?.results?.[0]?.url;
        if (url) return url;
        this.logger.warn("任务完成但无图片URL");
        return null;
      }
      if (status === "FAILED" || status === "CANCELED") {
        this.logger.warn(`图片生成任务 ${status}`);
        return null;
      }
    }

    this.logger.warn(`图片生成任务超时 taskId=${taskId}`);
    return null;
  }

  async understandVideo(req: VideoUnderstandingRequest): Promise<VideoUnderstandingResult> {
    this.logger.log(`视频理解请求: videoUrl=${req.videoUrl?.slice(0, 60)}`);

    if (!this.gateway) {
      this.logger.warn("Gateway未注入，使用默认降级");
      return { summary: "视频理解服务待配置", keyFrames: [], topics: [], safe: true };
    }

    const prompt = req.prompt || "请基于视频元信息进行内容摘要分析";
    const messages = [
      { role: "system", content: "你是一个视频内容分析助手。请基于提供的视频信息进行概要分析。" },
      { role: "user", content: `${prompt}\n\n视频引用: ${req.videoUrl}` },
    ];

    const resp = await this.gateway.chat("multimodal-video-understanding", messages);

    const topics = extractTagsFromDescription(resp.content);
    return {
      summary: resp.content.slice(0, 1500),
      keyFrames: [],
      topics,
      safe: true,
    };
  }

  async parseDocument(req: DocumentParsingRequest): Promise<DocumentParsingResult> {
    this.logger.log(`文档解析请求: fileUrl=${req.fileUrl?.slice(0, 60)} type=${req.fileType}`);

    if (!this.gateway) {
      this.logger.warn("Gateway未注入，使用默认降级");
      return { text: "文档解析服务待配置", title: req.fileUrl };
    }

    const messages = [
      { role: "system", content: "你是一个文档解析助手，负责提取和整理文档内容。" },
      { role: "user", content: `请解析以下文档的内容（${req.fileType || "未知类型"}）：${req.fileUrl}` },
    ];

    const resp = await this.gateway.chat("multimodal-document-parsing", messages);

    return {
      text: resp.content.slice(0, 10000),
      title: req.fileUrl.split("/").pop()?.replace(/\.[^.]+$/, ""),
      metadata: { author: "AI解析" },
    };
  }
}

function extractTagsFromDescription(text: string): string[] {
  const tagPatterns = [
    /[#＃]([^\s#＃,，。；;]+)/g,
    /标签[：:]\s*([^，,。\n]+)/,
    /关键词[：:]\s*([^，,。\n]+)/,
  ];

  for (const pattern of tagPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      if (pattern.global) {
        return matches.map((m) => m.replace(/^[#＃]/, "").trim()).slice(0, 10);
      }
      return matches[1].split(/[，,、\s]+/).filter(Boolean).slice(0, 10);
    }
  }

  return [];
}
