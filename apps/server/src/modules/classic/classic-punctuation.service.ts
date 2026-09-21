import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { TextDerivedAssetService, type TextAssetRequest } from "./text-derived-asset.service";

/**
 * 古籍按需标点（S03）
 *
 * - 只处理用户点到的那一段，不批量重写底本；原文段落（ClassicSegment.originalContent）只读
 * - 模型只允许增删标点与空白：结果去掉标点/空白后必须与原文逐字一致，否则判为不合格，不保存、不展示
 * - 结果是“AI 断句草稿（未经人工校对）”，不替换原文展示；同一段落内容跨用户复用（TextDerivedAsset）
 * - 原文已有足够标点时直接返回原文，不调用模型
 */

/** 允许模型增删的标点（全角/半角常用标点）与空白 */
const PUNCT_RE = /[\s，。、；：？！“”‘’「」『』（）《》〈〉【】—…·,.;:?!"'()\[\]<>\-]/g;

export function stripPunctuation(text: string): string {
  return (text || "").replace(PUNCT_RE, "");
}

/** 标点结果是否只改动了标点与空白（字序与字符完全一致） */
export function onlyPunctuationChanged(original: string, punctuated: string): boolean {
  const a = stripPunctuation(original);
  return a.length > 0 && a === stripPunctuation(punctuated);
}

/** 原文是否已有足够标点：平均每 25 个汉字至少 1 个句读 */
export function hasEnoughPunctuation(text: string): boolean {
  const chars = stripPunctuation(text).length;
  const marks = (text.match(/[，。、；：？！,.;:?!]/g) || []).length;
  return chars > 0 && marks * 25 >= chars;
}

const PROMPT_VERSION = "punctuate-v1";

@Injectable()
export class ClassicPunctuationService {
  private readonly logger = new Logger(ClassicPunctuationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
    private readonly textAssets: TextDerivedAssetService,
  ) {}

  private assetRequest(segment: { id: string; originalContent: string }): TextAssetRequest {
    return {
      sourceType: "classic_segment",
      sourceId: segment.id,
      content: segment.originalContent,
      processingType: "punctuation",
      strategy: "char_preserving",
      modelPolicy: "gateway:classic_punctuate",
      promptVersion: PROMPT_VERSION,
      language: "zh-Hant-classical",
      qualityVersion: "ai_draft",
    };
  }

  private async loadSegment(segmentId: string) {
    const seg = await this.prisma.classicSegment.findUnique({
      where: { id: segmentId },
      select: { id: true, originalContent: true, deletedAt: true, chapterId: true },
    });
    if (!seg || seg.deletedAt) throw new BusinessException(ErrorCode.NOT_FOUND, "段落不存在");
    if (stripPunctuation(seg.originalContent).length > 1500) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "段落过长，暂不支持自动断句");
    }
    return seg;
  }

  /** 查询已有结果（不调用模型、不计次数）；无结果返回 null */
  async peek(segmentId: string) {
    const seg = await this.loadSegment(segmentId);
    if (hasEnoughPunctuation(seg.originalContent)) {
      return { segmentId, text: seg.originalContent, source: "original" as const, cached: true };
    }
    const hit = await this.textAssets.findCompletedAsset(this.assetRequest(seg));
    return hit ? { segmentId, text: hit.result, source: "ai_draft" as const, cached: true } : null;
  }

  async punctuate(segmentId: string, userId?: string) {
    const seg = await this.loadSegment(segmentId);
    if (hasEnoughPunctuation(seg.originalContent)) {
      return { segmentId, text: seg.originalContent, source: "original" as const, cached: true };
    }
    const original = seg.originalContent;
    const result = await this.textAssets.getOrCreateTextAsset(
      this.assetRequest(seg),
      async () => {
        let res;
        try {
          res = await this.gateway.chat({
            scene: "classic_punctuate",
            userId,
            messages: [
              {
                role: "system",
                content:
                  "你是古籍句读助手。只为用户给出的古文加上现代中文标点（，。、；：？！“”‘’《》），" +
                  "严禁增加、删除、替换或调换任何汉字，严禁改写、翻译或解释。无法确定的地方宁可少加标点。只输出加好标点的原文，不要任何其他文字。",
              },
              { role: "user", content: original },
            ],
            options: { temperature: 0, maxTokens: Math.min(4000, original.length * 3 + 200) },
            skipCache: true,
          });
        } catch (error: any) {
          this.logger.warn(`断句模型调用失败：${error?.message || error}`);
          throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "自动断句暂不可用，请稍后重试");
        }
        return { result: (res.content || "").trim(), model: res.model };
      },
      (text) => onlyPunctuationChanged(original, text),
    );
    return { segmentId, text: result.result, source: "ai_draft" as const, cached: result.cached };
  }
}
