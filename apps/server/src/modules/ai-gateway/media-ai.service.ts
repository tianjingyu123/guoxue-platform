import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { AiGatewayService } from "./ai-gateway.service";
import { TtsService } from "../tts/tts.service";
import { tc3Sign } from "../../common/tc3.util";
import {
  hasTencentCloudCredentialConfiguration,
  resolveTencentCloudCredentials,
} from "../../common/tencent-instance-role-credentials";

interface AuditResult {
  safe: boolean;
  category: string | null;
  reason: string;
  confidence: number;
  /** 需人工复审：AI 无法给出明确判定时置 true（fail-close，不放行） */
  needsManualReview?: boolean;
  rawResponse?: string;
}

interface TranscribeResult {
  text: string;
  language: string;
  confidence: number;
  model?: string;
}

interface TencentAsrResponse {
  Response?: {
    Result?: string;
    Confidence?: number;
    Error?: { Message: string };
  };
}
@Injectable()
export class MediaAiService {
  private readonly logger = new Logger(MediaAiService.name);

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly tts: TtsService,
  ) {}

  /**
   * AI 图像内容审核（辅助建议·fail-close）
   *
   * ⚠️ 能力边界(后端审计P1)：当前经文本模型对图片 URL 作判断，非真·视觉理解，仅作
   * "人工审核辅助建议"，未接入发帖/评论发布流水线。真发布审核在 circle-post/comment
   * 走关键词+人工。接入真·多模态视觉模型(qwen-vl)是后续架构项。
   * 本次修复：由 fail-open 改为 fail-close——AI 无法明确判定(未返JSON/解析失败/调用异常)
   * 一律返回 safe:false + needsManualReview:true，绝不默认放行。
   */
  async auditImage(params: {
    imageUrl: string;
    context?: string;
    userId?: string;
  }) {
    const prompt = [
      "你是一个内容审核助手。请根据提供的图片信息进行审核，判断是否包含违规内容。",
      "审核维度：",
      "1. 色情/低俗内容",
      "2. 暴力/血腥内容",
      "3. 违法违规内容（赌博、毒品等）",
      "4. 政治敏感内容",
      "5. 侵权/盗版内容",
      "",
      `图片URL: ${params.imageUrl}`,
      params.context ? `图片上下文: ${params.context}` : "",
      "",
      "请用JSON格式返回审核结果:",
      '{ "safe": true/false, "category": "违规类别或null", "reason": "判断理由", "confidence": 0.0-1.0 }',
    ].join("\n");

    try {
      const result = await this.gateway.chat({
        scene: "media_audit",
        userId: params.userId,
        messages: [{ role: "user", content: prompt }],
        options: { temperature: 0.1, maxTokens: 512 },
      });

      // 尝试从回复中提取 JSON。fail-close：默认「不安全·转人工」，仅当 AI 明确判定 safe:true 才放行。
      let auditResult: AuditResult = {
        safe: false,
        category: "UNKNOWN",
        reason: "AI 未能给出明确判定，转人工复审",
        confidence: 0,
        needsManualReview: true,
      };
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Partial<AuditResult>;
          // 仅信任模型显式给出的布尔结论；缺失/非法一律按不安全处理。
          const safe = parsed.safe === true;
          auditResult = {
            safe,
            category: parsed.category ?? (safe ? null : "UNKNOWN"),
            reason: parsed.reason || (safe ? "AI判定通过" : "AI判定疑似违规，转人工复审"),
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
            needsManualReview: !safe,
          };
        } else {
          auditResult.rawResponse = result.content;
        }
      } catch (err) {
        this.logger.warn(`AI 审核 JSON 解析失败，按不安全转人工`, err);
        auditResult.rawResponse = result.content;
      }

      return {
        imageUrl: params.imageUrl,
        ...auditResult,
        model: result.model,
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (err: unknown) {
      // 调用异常同样 fail-close：不抛错阻断，返回「不安全·转人工」，避免异常被上游当作放行。
      this.logger.error(`图片审核失败，按不安全转人工: ${(err as Error).message}`);
      return {
        imageUrl: params.imageUrl,
        safe: false,
        category: "AUDIT_ERROR",
        reason: "审核服务异常，转人工复审",
        confidence: 0,
        needsManualReview: true,
        model: "none",
        tokensUsed: 0,
      };
    }
  }

  /** 文字转语音 — 调用 TtsService 生成真实音频 */
  async textToSpeech(params: {
    text: string;
    voice?: string;
    speed?: number;
    userId?: string;
  }) {
    try {
      const voice = params.voice || "xiaoxiao";
      const rate = params.speed ? `${Math.round((params.speed - 1) * 100)}%` : "0%";

      const { audio, contentType } = await this.tts.synthesize({
        text: params.text,
        voice,
        rate,
      });

      return {
        text: params.text,
        voice,
        audioBase64: audio.toString("base64"),
        contentType,
        size: audio.length,
      };
    } catch (err: unknown) {
      this.logger.error(`TTS失败: ${(err as Error).message}`);
      throw err;
    }
  }

  /** 语音转文字 — 腾讯云 ASR 一句话识别 */
  async transcribeAudio(params: {
    audioUrl: string;
    language?: string;
    userId?: string;
  }) {
    const secretId = process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || "";
    const secretKey = process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || "";

    if (!hasTencentCloudCredentialConfiguration(secretId, secretKey)) {
      // 腾讯云未配置时回退到 AI 网关文本模拟
      return this.transcribeFallback(params);
    }

    try {
      // SSRF 防护：仅允许白名单域名
      this.validateAudioUrl(params.audioUrl);
      const credentials = await resolveTencentCloudCredentials(secretId, secretKey);
      // 下载音频文件
      const audioResp = await fetch(params.audioUrl);
      if (!audioResp.ok) throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `下载音频失败: ${audioResp.status}`);
      const { host, headers, payloadStr } = tc3Sign({
        secretId: credentials.secretId,
        secretKey: credentials.secretKey,
        securityToken: credentials.securityToken,
        service: "asr",
        action: "SentenceRecognition",
        version: "2019-06-14",
        // 腾讯云要求 Region，漏传则恒报 missing required parameter `Region`（同 2026-07-14 短信事故）
        region: process.env.TENCENT_ASR_REGION || process.env.COS_REGION || "ap-guangzhou",
        payload: {
          ProjectId: 0,
          SubServiceType: 2,
          EngSerViceType: process.env.TENCENT_ASR_ENGINE || ((params.language || "zh-CN").includes("en") ? "16k_en" : "16k_zh"),
          // 腾讯云约定：0=公网 URL，1=请求体内的 Base64 音频数据。
          // 此处传入 Url，必须使用 0，否则会报缺少 Data/DataLen。
          SourceType: 0,
          Url: params.audioUrl,
          VoiceFormat: "mp3",
          UsrAudioKey: params.audioUrl,
        },
      });

      const resp = await fetch(`https://${host}`, {
        method: "POST",
        headers,
        body: payloadStr,
      });

      const data = await resp.json() as TencentAsrResponse;
      if (data.Response?.Error) {
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `ASR错误: ${data.Response.Error.Message}`);
      }

      return {
        audioUrl: params.audioUrl,
        text: data.Response?.Result || "",
        language: params.language || "zh-CN",
        confidence: data.Response?.Confidence || 0,
        model: "tencent-asr",
      };
    } catch (err: unknown) {
      this.logger.error(`语音转写失败: ${(err as Error).message}`);
      throw err;
    }
  }

  /** AI 文本模拟转写（腾讯云未配置时使用） */
  /** SSRF 防护：仅允许白名单域名的音频URL */
  private validateAudioUrl(url: string) {
    try {
      const parsed = new URL(url);
      const allowedHosts = [
        "cos.ap-beijing.myqcloud.com",
        "cos.ap-shanghai.myqcloud.com",
        "cos.ap-guangzhou.myqcloud.com",
        process.env.COS_DOMAIN,
        process.env.CDN_DOMAIN,
      ].filter(Boolean) as string[];

      // 允许本地开发环境
      if (process.env.NODE_ENV === "development" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
        return;
      }

      const isAllowed = allowedHosts.some((host) => parsed.hostname === host || parsed.hostname?.endsWith(`.${host}`));
      if (!isAllowed) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的音频来源");
      }
    } catch (err) {
      if (err instanceof BusinessException) throw err;
      throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的音频URL");
    }
  }

  private async transcribeFallback(params: { audioUrl: string; language?: string }) {
    const prompt = [
      "你是一个语音转文字助手。请根据提供的音频信息进行转写。",
      `音频URL: ${params.audioUrl}`,
      `语言: ${params.language || "zh-CN"}`,
      '返回JSON: { "text": "转写文本", "language": "检测语言", "confidence": 0.0-1.0 }',
    ].join("\n");

    const result = await this.gateway.chat({
      scene: "media_transcribe",
      messages: [{ role: "user", content: prompt }],
      options: { temperature: 0.1, maxTokens: 256 },
    });

    let transResult: TranscribeResult = { text: "", language: params.language || "zh", confidence: 0.5 };
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) transResult = JSON.parse(jsonMatch[0]);
    } catch (err) {
      this.logger.warn(`转写 JSON 解析失败`, err);
      transResult.text = result.content;
    }

    return { audioUrl: params.audioUrl, ...transResult, model: result.model };
  }
}
