import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

/**
 * 报告工坊 · AI 初稿
 *
 * 定位：AI 只写「解读文字」，盘面由已交叉验证的排盘引擎算好并存档；起草时只读本人报告的快照。
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: AiGatewayService,
  ) {}

  private static readonly MINUTE_LIMIT = 20;

  private static readonly SYSTEM =
    "你是资深命理咨询师的写作助手，为从业者起草客户报告初稿。用简体中文，语言雅正、克制、具体。" +
    "严禁断生死、预言灾祸疾病、诊断病症或给医疗建议；严禁承诺财运姻缘等结果；" +
    "措辞使用「倾向于/宜/可留意」，不得使用「必将/一定/注定」。" +
    "有盘面时只依据存档盘面解读；只有老师原稿时只润色原文。不得自行推算或改动任何干支/星曜/卦爻。";

  /**
   * 生成某一章节的正文
   * 只接收报告与章节标识；客户称呼、章节标题及盘面必须从本人存档读取。
   */
  async draftChapter(userId: string, input: { reportId: string; chapterKey: string; hint?: string }): Promise<{ text: string }> {
    if (!input?.reportId || !input?.chapterKey) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请更新工作台后重新打开报告章节");
    }
    const report = await this.prisma.practitionerReport.findFirst({
      where: { id: input.reportId, ownerId: userId },
    });
    if (!report) throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在");
    if (report.shareToken) throw new BusinessException(ErrorCode.BAD_REQUEST, "报告已交付，请先撤回交付链接再起草");
    const chapters = Array.isArray(report.chapters) ? (report.chapters as any[]) : [];
    const chapter = chapters.find((item) => item?.key === input.chapterKey);
    if (!chapter) throw new BusinessException(ErrorCode.BAD_REQUEST, "报告章节不存在，请重新加载");
    if (chapter.deterministic === true || /盘面事实|起盘校验|起卦校验|起局校验|起课校验/.test(String(chapter.title || ""))) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "盘面事实由排盘引擎生成，不能用 AI 起草覆盖");
    }
    const hasPaipan = !!report.paipan && typeof report.paipan === "object" && Object.keys(report.paipan).length > 0;
    const originalBody = String(chapter.body || "").trim();
    if (!hasPaipan && !originalBody) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "手建报告没有盘面，请先写下本章要点，再用 AI 润色");
    }

    const key = `practitioner:report-draft:${userId}`;
    let used: number;
    try {
      ({ count: used } = await this.redis.incrWithTtl(key, 60));
    } catch {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "起草服务暂时繁忙，请稍后再试");
    }
    if (used > ReportAiService.MINUTE_LIMIT) {
      await this.redis.decrFloorZero(key).catch(() => undefined);
      throw new BusinessException(ErrorCode.RATE_LIMITED, "起草太频繁了，请稍后再试");
    }

    const source = hasPaipan
      ? `盘面数据（已由排盘引擎算定，直接引用，不得改动）：\n${JSON.stringify(report.paipan).slice(0, 4000)}`
      : `老师原稿（唯一依据，只润色文字，不增加新判断）：\n${originalBody.slice(0, 4000)}`;
    const prompt = [
      `报告类型：${report.typeLabel}`,
      `客户称呼：${report.clientName || "客户"}`,
      `本章标题：${String(chapter.title || "")}`,
      input.hint ? `老师的补充要求：${String(input.hint).slice(0, 300)}` : "",
      source,
      ``,
      hasPaipan ? `请只写这一章的正文，300-500 字。要求：` : `请只润色这一章的原稿。要求：`,
      hasPaipan
        ? `①紧扣本章标题，先落到盘面上的具体依据（引用干支/十神/星曜/卦爻等原文），再给解读；`
        : `①保留原稿里的事实、判断和分寸，不新增命理结论、盘面数据或建议；`,
      hasPaipan ? `②给出可执行的建议，不空泛；` : `②用客户听得懂的话表达，不编造原稿没有的依据；`,
      `③不写标题、不写分点编号以外的多余寒暄。`,
      `④结尾另起一行写：（本报告为传统文化解读，仅供参考，不构成医疗、投资或法律建议。）`,
    ]
      .filter(Boolean)
      .join("\n");

    let text: string;
    try {
      const res = await this.gateway.chat({
        scene: "practitioner_report_draft",
        userId,
        messages: [
          { role: "system", content: ReportAiService.SYSTEM },
          { role: "user", content: prompt },
        ],
        options: { maxTokens: 1200, temperature: 0.7 },
        skipCache: true,
      });
      text = (res.content || "").trim();
    } catch {
      await this.redis.decrFloorZero(key).catch(() => undefined);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 起草暂不可用，请稍后再试");
    }
    if (!text) {
      await this.redis.decrFloorZero(key).catch(() => undefined);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 起草没有返回内容，请稍后再试");
    }
    const latest = await this.prisma.practitionerReport.findFirst({
      where: { id: report.id, ownerId: userId },
      select: { shareToken: true, updatedAt: true },
    });
    if (!latest) throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在");
    if (latest.shareToken) throw new BusinessException(ErrorCode.BAD_REQUEST, "报告已交付，请重新加载后查看当前状态");
    if (latest.updatedAt.getTime() !== report.updatedAt.getTime()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "报告已在其他设备修改，请重新加载后再起草");
    }
    return { text };
  }
}
