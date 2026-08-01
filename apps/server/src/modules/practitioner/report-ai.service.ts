import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 报告工坊 · AI 初稿
 *
 * 定位：AI 只写「解读文字」，**盘面数据一律由前端已交叉验证的排盘引擎算好后传进来**。
 * 绝不让模型去算四柱/星曜/卦象——那是算法的事，模型算了就会错，而工具是平台的脸面。
 *
 * 合规红线（R3/R4，写死在 prompt 里）：
 *  · 不得断生死、不得预言灾祸疾病、不得诊断或给医疗建议
 *  · 不得承诺财运/姻缘结果，不得诱导消费或转介绍
 *  · 措辞用「倾向/宜/可留意」，不用「必将/一定」
 *  · 结尾统一提示：传统文化解读，仅供参考，不构成决策依据
 */
@Injectable()
export class ReportAiService {
  private apiKey = process.env.DEEPSEEK_API_KEY || "";

  private static readonly SYSTEM =
    "你是资深命理咨询师的写作助手，为从业者起草客户报告初稿。用简体中文，语言雅正、克制、具体。" +
    "严禁断生死、预言灾祸疾病、诊断病症或给医疗建议；严禁承诺财运姻缘等结果；" +
    "措辞使用「倾向于/宜/可留意」，不得使用「必将/一定/注定」。" +
    "盘面数据由用户提供，你只做解读，不得自行推算或改动任何干支/星曜/卦爻。";

  /**
   * 生成某一章节的正文
   * @param chapterTitle 章节标题（如「格局总述」）
   * @param reportTypeLabel 报告类型（如「八字精批」）
   * @param paipan 盘面数据快照（引擎算好的结构化结果）
   */
  async draftChapter(input: {
    chapterTitle: string;
    reportTypeLabel: string;
    clientName: string;
    paipan: unknown;
    hint?: string;
  }): Promise<{ text: string }> {
    if (!this.apiKey) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 服务暂未开通，请联系管理员配置密钥");
    }
    const snapshot = JSON.stringify(input.paipan ?? {}).slice(0, 4000);
    const prompt = [
      `报告类型：${input.reportTypeLabel}`,
      `客户称呼：${input.clientName || "客户"}`,
      `本章标题：${input.chapterTitle}`,
      input.hint ? `老师的补充要求：${input.hint}` : "",
      `盘面数据（已由排盘引擎算定，直接引用，不得改动）：`,
      snapshot,
      ``,
      `请只写这一章的正文，300-500 字。要求：`,
      `①紧扣本章标题，先落到盘面上的具体依据（引用干支/十神/星曜/卦爻等原文），再给解读；`,
      `②给出可执行的建议，不空泛；`,
      `③不写标题、不写分点编号以外的多余寒暄。`,
      `④结尾另起一行写：（本报告为传统文化解读，仅供参考，不构成医疗、投资或法律建议。）`,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: ReportAiService.SYSTEM },
          { role: "user", content: prompt },
        ],
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `AI 服务暂不可用 (${res.status}): ${t.slice(0, 100)}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return { text: data.choices?.[0]?.message?.content ?? "" };
  }
}
