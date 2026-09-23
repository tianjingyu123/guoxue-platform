import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

/**
 * 交付稿改写（2026-09-18，决策人定位）
 *
 * 平台报告与交付报告是两种东西，读者不同：
 *  · 平台报告（小卜命书/卦书/局书/课书）：给平台用户看，帮他学习进步、整理知识点，
 *    也是对话机器人的依据来源 —— 所以术语直出、依据可追溯、口径客观。
 *  · 交付报告（工作台）：老师交给自己客户的成果物 —— 要通俗易懂、老师视角，
 *    让客户觉得就是这位老师写给他的。平台只是帮老师省下从白纸开始的时间。
 *
 * 因此这里做的是「口径转换」，不是重新解读：盘面结论不变，换一种说法。
 * 改写结果仍是草稿，老师可以继续改——最终署名的是老师，不是平台。
 */
@Injectable()
export class ClientReportService {
  private readonly logger = new Logger(ClientReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
  ) {}

  private static readonly SYSTEM = [
    "你在帮一位命理老师，把他自己的分析稿整理成交给客户看的稿子。",
    "",
    "【身份】你写出来的文字会以这位老师的名义交给他的客户，所以是老师在对客户说话，用第二人称「你」。",
    "【口径】",
    "1. 通俗易懂：术语第一次出现时用一句话说清楚它是什么，再往下讲；能用生活里的说法就不用行话。",
    "2. 老师视角：像面对面讲给客户听，语气平和、有分寸，不端着也不油滑。",
    "3. **不得出现任何平台、产品或 AI 的名字**，不得说「本报告由系统生成」「AI 分析」之类的话。",
    "4. 结论与盘面事实**一个字都不能改**：干支、星曜、卦爻、格局、旺衰等一律照搬，只换说法。",
    "5. 不添加原稿里没有的判断；原稿说「倾向」就不能写成「一定」。",
    "【红线】不断生死、不预言灾祸疾病、不做医疗与投资建议、不承诺姻缘财运结果、不推销任何服务。",
    "【输出】只输出改写后的正文，不要标题、不要前言、不要解释你做了什么。",
  ].join("\n");

  /**
   * 把一章改写成交给客户看的话。
   * @param chapterTitle 章节标题
   * @param text 老师稿（通常来自平台报告导入）
   * @param clientName 客户称呼
   */
  async rewriteChapter(input: { chapterTitle: string; text: string; clientName?: string; userId?: string }) {
    const body = (input.text || "").trim();
    if (!body) throw new BusinessException(ErrorCode.BAD_REQUEST, "这一章还没有内容，无法改写");

    const user = [
      `本章标题：${input.chapterTitle}`,
      input.clientName ? `客户称呼：${input.clientName}` : "",
      "",
      "原稿：",
      body.slice(0, 3000),
    ]
      .filter(Boolean)
      .join("\n");

    const res = await this.gateway.chat({
      scene: "practitioner_report_rewrite",
      userId: input.userId,
      messages: [
        { role: "system", content: ClientReportService.SYSTEM },
        { role: "user", content: user },
      ],
      options: { temperature: 0.5, maxTokens: 1200 },
      // 每位老师的客户不同、称呼不同，语义缓存会串稿
      skipCache: true,
    });

    const out = (res.content || "").trim();
    if (!out) throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "改写没有返回内容，请稍后重试");
    return { text: out, model: res.model ?? null };
  }

  /** 整份报告逐章改写（老师点一次，省下从白纸开始的时间） */
  async rewriteReport(userId: string, reportId: string) {
    const report = await this.prisma.practitionerReport.findFirst({ where: { id: reportId, ownerId: userId } });
    if (!report) throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在");
    if (report.shareToken) throw new BusinessException(ErrorCode.BAD_REQUEST, "报告已交付，请先撤回交付链接再改写");

    const chapters = Array.isArray(report.chapters) ? (report.chapters as any[]) : [];
    if (!chapters.length) throw new BusinessException(ErrorCode.BAD_REQUEST, "这份报告还没有章节内容");

    const out: any[] = [];
    let failed = 0;
    for (const ch of chapters) {
      const text = String(ch?.body || "").trim();
      // 盘面事实章保持原样：那是排盘数据，改写没有意义也不该改。
      // 认标记不认标题——老师改了标题（「你的八字」之类），靠标题识别就会把盘面数据送去重写；
      // 标题正则只作老报告（导入时还没有这个标记）的兜底。
      const isFact =
        ch?.deterministic === true ||
        /盘面事实|起盘校验|起卦校验|起局校验|起课校验/.test(String(ch?.title || ""));
      if (!text || isFact) {
        out.push(ch);
        continue;
      }
      try {
        const r = await this.rewriteChapter({
          chapterTitle: String(ch.title || ""),
          text,
          clientName: report.clientName,
          userId,
        });
        out.push({ ...ch, body: r.text, rewritten: true, ai: true });
      } catch (error: any) {
        this.logger.warn(`交付稿改写失败（保留原文）：${error?.message || error}`);
        out.push(ch);
        failed++;
      }
    }

    const updated = await this.prisma.practitionerReport.updateMany({
      where: { id: reportId, ownerId: userId, shareToken: null, updatedAt: report.updatedAt },
      data: { chapters: out as any },
    });
    if (!updated.count) {
      const current = await this.prisma.practitionerReport.findFirst({
        where: { id: reportId, ownerId: userId },
        select: { shareToken: true },
      });
      if (current?.shareToken) throw new BusinessException(ErrorCode.BAD_REQUEST, "报告已交付，请先撤回交付链接再改写");
      throw new BusinessException(ErrorCode.BAD_REQUEST, "报告已在其他设备修改，请重新加载后再改写");
    }
    const saved = await this.prisma.practitionerReport.findFirst({ where: { id: reportId, ownerId: userId } });
    if (!saved) throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在");
    return { report: saved, rewritten: out.filter((c) => c.rewritten).length, failed };
  }
}
