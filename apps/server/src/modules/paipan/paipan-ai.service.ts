import { Injectable, NotFoundException, Inject, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { BaziResult } from "@guoxue/bazi-engine";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { MetricsService } from "../../common/metrics.service";

/**
 * AI 排盘解析服务
 *
 * 使用 DeepSeek API（OpenAI 兼容协议）对八字排盘结果进行 AI 命理分析。
 * API Key 从环境变量 DEEPSEEK_API_KEY 读取，未配置时返回友好提示。
 */
@Injectable()
export class PaipanAiService {
  private apiKey: string;

  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
  }

  /**
   * 对八字排盘结果进行 AI 分析
   * @param userId 用户 ID
   * @param paipanRecordId 排盘记录 ID
   * @param baziResult 排盘结果
   * @returns 分析结果
   */
  async analyzeBazi(
    userId: string,
    paipanRecordId: string,
    baziResult: BaziResult,
  ) {
    // 检查是否已有分析记录，避免重复调用 API
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

    // 无 API Key 返回友好提示
    if (!this.apiKey) {
      const record = await this.prisma.aiAnalysisRecord.create({
        data: {
          userId,
          paipanRecordId,
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

    // 构建 prompt 并调用 API
    const prompt = this.buildPrompt(baziResult);
    const { content, tokenUsage } = await this.callDeepSeek(prompt);

    // 保存分析结果
    const record = await this.prisma.aiAnalysisRecord.create({
      data: {
        userId,
        paipanRecordId,
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

  /** 根据分析记录 ID 获取单条分析 */
  async getAnalysisRecord(id: string, userId: string) {
    const record = await this.prisma.aiAnalysisRecord.findFirst({
      where: { id, userId },
      select: {
        id: true,
        paipanRecordId: true,
        analyzeType: true,
        analysisContent: true,
        modelName: true,
        tokenUsage: true,
        isCached: true,
        createdAt: true,
      },
    });
    if (!record) throw new NotFoundException("分析记录不存在");
    return record;
  }

  /** 根据排盘记录 ID 获取 AI 分析结果 */
  async getAnalysisByPaipanRecord(paipanRecordId: string, userId: string) {
    const record = await this.prisma.aiAnalysisRecord.findFirst({
      where: { paipanRecordId, userId },
      select: {
        id: true,
        paipanRecordId: true,
        analyzeType: true,
        analysisContent: true,
        modelName: true,
        tokenUsage: true,
        isCached: true,
        createdAt: true,
      },
    });
    if (!record) throw new NotFoundException("该排盘记录暂无 AI 分析结果");
    return record;
  }

  /** 获取用户 AI 分析历史 */
  async getUserAnalysisHistory(
    userId: string,
    page = 1,
    pageSize = 20,
  ) {
    const where = { userId };

    const [records, total] = await Promise.all([
      this.prisma.aiAnalysisRecord.findMany({
        where,
        select: {
          id: true,
          paipanRecordId: true,
          analyzeType: true,
          isCached: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.aiAnalysisRecord.count({ where }),
    ]);

    return { records, total, page, pageSize };
  }

  /** 构建专业八字分析 prompt */
  private buildPrompt(result: BaziResult): string {
    const { input, siZhu, qiYun, shenSha, geJu, wuXingEnergy, kongWang, shengXiao, fenXiTiShi, taiYuan, mingGong, shenGong } = result;

    // 格式化一柱
    const fmtPillar = (p: typeof siZhu.nian) =>
      `${p.gan}${p.zhi}（${p.nayin}）`;

    // 十神分布
    const shiShenLines = [
      `年干：${siZhu.nian.ganShiShen}  年支：${siZhu.nian.zhiShiShen}`,
      `月干：${siZhu.yue.ganShiShen}  月支：${siZhu.yue.zhiShiShen}`,
      `日干：${siZhu.ri.gan}（日主）  日支：${siZhu.ri.zhiShiShen}`,
      `时干：${siZhu.shi.ganShiShen}  时支：${siZhu.shi.zhiShiShen}`,
    ];

    // 大运
    const daYunLines = qiYun.daYun.map(
      (d) => `${d.ganZhi}（${d.startAge}-${d.endAge}岁）`,
    );

    // 神煞（取前 15 个最关键的）
    const shenShaLines = shenSha
      .slice(0, 15)
      .map((s) => `${s.name}（${s.pillar}，${s.type === "ji" ? "吉" : "凶"}）：${s.desc}`);

    // 藏干
    const cangGanLines = [
      `年支${siZhu.nian.zhi}藏：${siZhu.nian.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
      `月支${siZhu.yue.zhi}藏：${siZhu.yue.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
      `日支${siZhu.ri.zhi}藏：${siZhu.ri.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
      `时支${siZhu.shi.zhi}藏：${siZhu.shi.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
    ];

    // 分析提示
    const fenXiLines: string[] = [];
    if (fenXiTiShi.ganHe.length) fenXiLines.push(`天干五合：${fenXiTiShi.ganHe.join("、")}`);
    if (fenXiTiShi.sanHe.length) fenXiLines.push(`地支三合：${fenXiTiShi.sanHe.join("、")}`);
    if (fenXiTiShi.sanHui.length) fenXiLines.push(`地支三会：${fenXiTiShi.sanHui.join("、")}`);
    if (fenXiTiShi.liuChong.length) fenXiLines.push(`地支六冲：${fenXiTiShi.liuChong.join("、")}`);
    if (fenXiTiShi.liuHe.length) fenXiLines.push(`地支六合：${fenXiTiShi.liuHe.join("、")}`);
    if (fenXiTiShi.liuHai.length) fenXiLines.push(`地支六害：${fenXiTiShi.liuHai.join("、")}`);
    if (fenXiTiShi.sanXing.length) fenXiLines.push(`三刑：${fenXiTiShi.sanXing.join("、")}`);

    const prompt = `你是精通中国传统八字命理学的资深专家，请根据以下排盘数据进行详细专业的命理分析。

## 出生信息
- 姓名：${input.name || "未知"}
- 性别：${input.gender}
- 出生时间：${input.year}年${input.month}月${input.day}日 ${input.hour}时${input.minute}分
- 生肖：${shengXiao}

## 四柱八字
- 年柱：${fmtPillar(siZhu.nian)}
- 月柱：${fmtPillar(siZhu.yue)}
- 日柱：${fmtPillar(siZhu.ri)}
- 时柱：${fmtPillar(siZhu.shi)}
- 空亡：${kongWang}
- 胎元：${fmtPillar(taiYuan)}
- 命宫：${fmtPillar(mingGong)}
- 身宫：${fmtPillar(shenGong)}

## 藏干
${cangGanLines.join("\n")}

## 十神分布
${shiShenLines.join("\n")}

## 五行能量
${wuXingEnergy ? `木 ${wuXingEnergy.mu}% | 火 ${wuXingEnergy.huo}% | 土 ${wuXingEnergy.tu}% | 金 ${wuXingEnergy.jin}% | 水 ${wuXingEnergy.shui}%\n${wuXingEnergy.desc}` : "暂无"}

## 格局分析
${geJu ? `格局：${geJu.name}（${geJu.type === "zheng" ? "正格" : "变格"}）\n用神：${geJu.yongShen}  喜神：${geJu.xiShen}  忌神：${geJu.jiShen}\n描述：${geJu.desc}` : "暂无格局信息"}

## 旺相休囚死
${result.wangXiang}

## 大运走势
起运年龄：${qiYun.startAge}岁  起运时间：${qiYun.desc}
${daYunLines.join("\n")}

## 神煞
${shenShaLines.join("\n")}

## 合冲刑害
${fenXiLines.join("\n") || "无显著合冲刑害关系"}

---

请从以下 8 个方面进行详细分析，每个方面用 2-4 句话，总篇幅约 1500-2000 字：

1. **格局与用神**：分析日主强弱、格局类型，明确用神喜忌。
2. **性格特征**：结合日主五行属性、十神组合和神煞，分析性格优势与不足。
3. **事业发展**：适合的行业领域、职场贵人、创业机遇与风险提示。
4. **财运分析**：正财偏财运走势、财富积累的关键时期、理财建议。
5. **婚姻感情**：姻缘时机、配偶特征、感情相处模式及注意事项。
6. **健康状况**：先天体质强弱、易感疾病、养生调理方向。
7. **大运走势**：当前所处大运的影响、未来运势转折点、各阶段机遇与挑战。
8. **流年建议**：近期流年的吉凶宜忌、开运方向和注意事项。

要求：语言专业严谨但不晦涩，多用生动比喻，给出切实可行的人生建议。`;

    return prompt;
  }

  /** 调用 DeepSeek API */
  private async callDeepSeek(prompt: string): Promise<{ content: string; tokenUsage: { promptTokens: number; completionTokens: number } }> {
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
              content:
                "你是一位精通中国传统八字命理学的资深专家，擅长根据八字排盘结果进行详细专业的命理分析。请用简体中文回答，语言专业但通俗易懂，多举实例，给出实用的人生建议。",
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
        const reason = `HTTP_${response.status}`;
        this.metrics?.recordExternalApi("deepseek", "chat/completions", false, duration, reason);
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `DeepSeek API 调用失败 (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
        usage: { prompt_tokens: number; completion_tokens: number };
      };

      this.metrics?.recordExternalApi("deepseek", "chat/completions", true, duration);
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
      this.metrics?.recordExternalApi("deepseek", "chat/completions", false, duration, reason);
      throw err;
    }
  }
}
