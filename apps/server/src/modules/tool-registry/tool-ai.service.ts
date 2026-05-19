import { Injectable, Inject, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { MetricsService } from "../../common/metrics.service";
import { ALL_TOOLS } from "@guoxue/shared";
import { buildBaziPrompt, buildZiWeiPrompt } from "./prompts/bazi-ziwei";
import { buildQimenYangPrompt, buildQimenYangMingLiPrompt, buildQimenYinPrompt, buildQimenYinMingLiPrompt, buildShanXiangQimenPrompt, buildQimenChuanRenPrompt } from "./prompts/qimen";
import { buildLiuYaoPrompt, buildMeiHuaPrompt, buildXiaoChengTuPrompt, buildJinQianKePrompt, buildZhuGePrompt, buildKongMingPrompt } from "./prompts/divination";
import { buildDaLiuRenPrompt, buildXiaoLiuRenPrompt, buildJinKouJuePrompt } from "./prompts/liuren";
import { buildXuanKongPrompt, buildBaZhaiPrompt, buildLuoPanPrompt, buildLiJiChiPrompt, buildShanXiangMapPrompt } from "./prompts/fengshui";
import { buildTaiYiPrompt, buildQiZhengPrompt, buildWuYunLiuQiPrompt } from "./prompts/xingming";
import { buildQiMingPrompt, buildXingMingJieXiPrompt } from "./prompts/naming";
import { buildFeiGongQiMenPrompt, buildPhoneAnalysisPrompt, buildWanNianLiPrompt, buildKangXiPrompt, buildHanZiFilterPrompt } from "./prompts/utility";

/** AI分析请求 */
export interface ToolAiAnalyzeRequest {
  toolId: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

/** AI分析响应 */
export interface ToolAiAnalyzeResponse {
  id: string;
  analysisContent: string;
  createdAt: Date;
  isCached: boolean;
}

/**
 * 统一工具 AI 分析服务
 *
 * 泛化 PaipanAiService，支持全部 32 个工具的 AI 命理分析。
 * 每个工具有独立的 prompt 构建器，通过 toolId 分发。
 */
@Injectable()
export class ToolAiService {
  private apiKey: string;

  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
  }

  /** 对任意工具结果进行 AI 分析 */
  async analyze(
    userId: string,
    paipanRecordId: string | undefined,
    req: ToolAiAnalyzeRequest,
  ): Promise<ToolAiAnalyzeResponse> {
    // 校验工具存在
    const tool = ALL_TOOLS.find((t) => t.id === req.toolId);
    if (!tool) throw new BusinessException(ErrorCode.NOT_FOUND, `工具 ${req.toolId} 不存在`);

    // 检查缓存
    if (paipanRecordId) {
      const existing = await this.prisma.aiAnalysisRecord.findFirst({
        where: { userId, paipanRecordId, analyzeType: "GENERAL" },
      });
      if (existing) {
        return {
          id: existing.id,
          analysisContent: existing.analysisContent,
          createdAt: existing.createdAt,
          isCached: true,
        };
      }
    }

    // 无 API Key
    if (!this.apiKey) {
      const record = await this.prisma.aiAnalysisRecord.create({
        data: {
          userId,
          paipanRecordId,
          toolId: req.toolId,
          analyzeType: "GENERAL",
          analysisContent: "AI解析服务暂未配置，请联系管理员",
          isCached: false,
        },
      });
      return {
        id: record.id,
        analysisContent: record.analysisContent,
        createdAt: record.createdAt,
        isCached: false,
      };
    }

    // 构建 prompt 并调用
    const prompt = this.buildPrompt(req.toolId, req.input, req.result);
    const { content, tokenUsage } = await this.callDeepSeek(prompt, req.toolId);

    const record = await this.prisma.aiAnalysisRecord.create({
      data: {
        userId,
        paipanRecordId,
        toolId: req.toolId,
        analyzeType: "GENERAL",
        analysisContent: content,
        tokenUsage: tokenUsage as any,
        isCached: false,
      },
    });

    return {
      id: record.id,
      analysisContent: record.analysisContent,
      createdAt: record.createdAt,
      isCached: false,
    };
  }

  /** 获取分析记录 */
  async getAnalysisRecord(id: string, userId: string) {
    const record = await this.prisma.aiAnalysisRecord.findFirst({
      where: { id, userId },
      select: {
        id: true, paipanRecordId: true, toolId: true,
        analyzeType: true, analysisContent: true,
        modelName: true, tokenUsage: true, isCached: true, createdAt: true,
      },
    });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "分析记录不存在");
    return record;
  }

  /** 获取用户所有分析历史 */
  async getUserHistory(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [records, total] = await Promise.all([
      this.prisma.aiAnalysisRecord.findMany({
        where,
        select: {
          id: true, paipanRecordId: true, toolId: true,
          analyzeType: true, isCached: true, createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.aiAnalysisRecord.count({ where }),
    ]);
    return { records, total, page, pageSize };
  }

  /** 分发 prompt 构建（32工具全覆盖） */
  private buildPrompt(
    toolId: string,
    input: Record<string, unknown>,
    result: Record<string, unknown>,
  ): string {
    switch (toolId) {
      // 八字紫微
      case "bazi": return buildBaziPrompt(input as any, result as any);
      case "ziwei": return buildZiWeiPrompt(input as any, result as any);
      // 奇门遁甲
      case "qimen-yang": return buildQimenYangPrompt(input as any, result as any);
      case "qimen-yang-mingli": return buildQimenYangMingLiPrompt(input as any, result as any);
      case "qimen-yin": return buildQimenYinPrompt(input as any, result as any);
      case "qimen-yin-mingli": return buildQimenYinMingLiPrompt(input as any, result as any);
      case "shanxiang-qimen": return buildShanXiangQimenPrompt(input as any, result as any);
      case "qimen-chuanren": return buildQimenChuanRenPrompt(input as any, result as any);
      // 占卜
      case "liuyao": return buildLiuYaoPrompt(input as any, result as any);
      case "meihua": return buildMeiHuaPrompt(input as any, result as any);
      case "xiaochengtu": return buildXiaoChengTuPrompt(input as any, result as any);
      case "jinqianke": return buildJinQianKePrompt(input as any, result as any);
      case "zhugeshenshu": return buildZhuGePrompt(input as any, result as any);
      case "kongmingshengua": return buildKongMingPrompt(input as any, result as any);
      // 六壬
      case "daliuren": return buildDaLiuRenPrompt(input as any, result as any);
      case "xiaoliuren": return buildXiaoLiuRenPrompt(input as any, result as any);
      case "jinkoujue": return buildJinKouJuePrompt(input as any, result as any);
      // 风水
      case "xuankong-feixing": return buildXuanKongPrompt(input as any, result as any);
      case "bazhai": return buildBaZhaiPrompt(input as any, result as any);
      case "dianzi-luopan": return buildLuoPanPrompt(input as any, result as any);
      case "liji-chi": return buildLiJiChiPrompt(input as any, result as any);
      case "shanxiang-ditu": return buildShanXiangMapPrompt(input as any, result as any);
      // 星命
      case "taiyi": return buildTaiYiPrompt(input as any, result as any);
      case "qizheng-siyu": return buildQiZhengPrompt(input as any, result as any);
      case "wuyun-liuqi": return buildWuYunLiuQiPrompt(input as any, result as any);
      // 起名
      case "qiming": return buildQiMingPrompt(input as any, result as any);
      case "xingming-jiexi": return buildXingMingJieXiPrompt(input as any, result as any);
      // 工具字典
      case "feigong-xiaoqimen": return buildFeiGongQiMenPrompt(input as any, result as any);
      case "shoujihao-fenxi": return buildPhoneAnalysisPrompt(input as any, result as any);
      case "wannianli": return buildWanNianLiPrompt(input as any, result as any);
      case "kangxi-zidian": return buildKangXiPrompt(input as any, result as any);
      case "hanzi-shaixuan": return buildHanZiFilterPrompt(input as any, result as any);
      default: return buildGenericPrompt(toolId, input, result);
    }
  }

  /** 调用 DeepSeek API */
  private async callDeepSeek(
    prompt: string,
    toolId: string,
  ): Promise<{ content: string; tokenUsage: { promptTokens: number; completionTokens: number } }> {
    const start = Date.now();
    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "你是一位精通中国传统玄学与易学的资深专家，擅长根据排盘/起卦结果进行详细专业的分析。请用简体中文回答，语言专业但通俗易懂，多举实例，给出实用的人生建议。",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      const duration = Date.now() - start;
      if (!response.ok) {
        const errorText = await response.text();
        this.metrics?.recordExternalApi("deepseek", "chat/completions", false, duration, `HTTP_${response.status}`);
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `DeepSeek API 调用失败 (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
        usage: { prompt_tokens: number; completion_tokens: number };
      };

      this.metrics?.recordExternalApi("deepseek", `tool/${toolId}`, true, duration);
      return {
        content: data.choices[0].message.content,
        tokenUsage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (err) {
      const duration = Date.now() - start;
      if (err instanceof BusinessException) throw err;
      const reason = (err as Error).message?.substring(0, 50) ?? "network_error";
      this.metrics?.recordExternalApi("deepseek", `tool/${toolId}`, false, duration, reason);
      throw err;
    }
  }
}

/** 通用工具 AI 分析 prompt（尚未定制 prompt 的工具） */
function buildGenericPrompt(
  toolId: string,
  input: Record<string, unknown>,
  result: Record<string, unknown>,
): string {
  const tool = ALL_TOOLS.find((t) => t.id === toolId);
  return `你是精通${tool?.name ?? toolId}的资深专家，请根据以下排盘/计算结果进行专业分析。

## 工具说明
${tool?.description ?? toolId}

## 输入参数
${JSON.stringify(input, null, 2)}

## 计算结果
${JSON.stringify(result, null, 2)}

---

请从多个维度进行专业分析，给出具体可操作的建议。`;
}
