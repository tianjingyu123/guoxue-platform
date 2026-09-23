import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

/**
 * 交付报告问答（2026-09-18）
 *
 * 场景：客户拿到老师的报告（纸质扫码 / 电子版 / 在线链接），对某段看不懂，直接问。
 * 回答的是**老师的助理**，不是平台的机器人——客户全程感知到的都是这位老师。
 *
 * 几条硬性约束：
 *  · 只依据这份报告的内容回答，报告里没写的不编；
 *  · 不替老师做承诺、不给新的断语（那是老师的活），超出范围就请客户联系老师本人；
 *  · 客户是匿名的（令牌即凭证），所以按报告做频次闸门，防止链接外泄后被刷；
 *  · 用量算在老师头上（是他在给客户提供这项服务），记入 AiUsageRecord 供运营核账。
 */
@Injectable()
export class ReportAskService {
  private readonly logger = new Logger(ReportAskService.name);

  /** 每份报告每天允许的提问次数：够正常客户问，挡得住脚本刷 */
  static readonly DAILY_LIMIT = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: AiGatewayService,
  ) {}

  private systemPrompt(opts: { brandName: string; clientName: string; title: string }) {
    return [
      `你是${opts.brandName || "这位老师"}的助理，正在帮客户读懂老师给他出的这份《${opts.title}》。`,
      "",
      "【立场】你代表老师说话。客户看到的是老师的服务，因此：",
      "1. **不得提及任何平台、产品或 AI 的名字**，不得说「系统」「模型」「我是 AI」之类的话；",
      "2. 用第二人称对客户说话，语气像老师身边稳妥的助手：客气、简洁、说人话。",
      "【依据】只能依据【报告内容】回答：",
      "3. 报告里写了的，用通俗的话讲清楚，必要时说明这句话出现在报告哪一节；",
      "4. 报告里没写的，直说这份报告没有涉及，请客户直接问老师，**不要自己推断或补充断语**；",
      "5. 客户问新的事（换个时间、换个人、另起一卦等），说明这需要老师另外为他看，请他联系老师。",
      "【红线】不断生死、不预言灾祸疾病、不做医疗与投资建议、不承诺姻缘财运结果、不替老师承诺任何服务或价格。",
      "【长度】每次回答不超过 180 字，先直接回答，再补一句依据出自报告哪一节。",
    ].join("\n");
  }

  /** 剩余可问次数（供前端展示，用完给客户一个明确说法而不是干等） */
  private quotaKey(reportId: string) {
    const day = new Date().toISOString().slice(0, 10);
    return `report-ask:${reportId}:${day}`;
  }

  async ask(token: string, question: string, history?: { role: string; content: string }[]) {
    const q = (question || "").trim();
    if (!q) throw new BusinessException(ErrorCode.BAD_REQUEST, "请先输入问题");
    if (q.length > 200) throw new BusinessException(ErrorCode.BAD_REQUEST, "问题太长了，请说得简短一些");

    const report = await this.prisma.practitionerReport.findUnique({ where: { shareToken: token } });
    if (!report) throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在或已被撤回");

    // 频次闸门：客户匿名，只能按报告限；超出给出明确说法，让客户去找老师
    const key = this.quotaKey(report.id);
    // 原子自增 + 首次设 TTL（平台既有实现，含 Redis 不可用时的内存降级）
    let reserved = false;
    const { count: used } = await this.redis
      .incrWithTtl(key, 86400)
      .then((result) => { reserved = true; return result; })
      .catch(() => ({ count: 1, ttl: 86400 }));
    const release = async () => {
      if (reserved) await this.redis.decrFloorZero(key).catch(() => undefined);
    };
    if (used > ReportAskService.DAILY_LIMIT) {
      await release();
      throw new BusinessException(
        ErrorCode.RATE_LIMITED,
        "今天的提问次数已用完，如还有想问的，请直接联系老师",
      );
    }

    const profile = await this.prisma.practitionerProfile.findUnique({ where: { userId: report.ownerId } });
    const author = await this.prisma.user.findUnique({
      where: { id: report.ownerId },
      select: { nickname: true },
    });
    const brandName = profile?.brandName || author?.nickname || "";

    const chapters = Array.isArray(report.chapters) ? (report.chapters as any[]) : [];
    const body = chapters
      .map((c) => `【${String(c?.title ?? "")}】\n${String(c?.body ?? "").slice(0, 800)}`)
      .join("\n\n")
      .slice(0, 6000);

    const recent = (history ?? [])
      .slice(-4)
      .filter((m) => m?.content)
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(m.content).slice(0, 300),
      }));

    let res;
    try {
      res = await this.gateway.chat({
        scene: "practitioner_report_ask",
        // 用量算在老师头上：是他在给客户提供这项服务
        userId: report.ownerId,
        messages: [
          { role: "system", content: this.systemPrompt({ brandName, clientName: report.clientName, title: report.title }) },
          { role: "system", content: `【报告内容】\n${body}` },
          ...recent,
          { role: "user", content: q },
        ],
        options: { temperature: 0.4, maxTokens: 500 },
        // 每位客户的问题与报告都不同，语义缓存会串稿
        skipCache: true,
      });
    } catch (error: any) {
      await release();
      this.logger.warn(`交付报告问答失败：${error?.message || error}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "暂时没能回答，请稍后再试，或直接联系老师");
    }

    const answer = (res.content || "").trim();
    if (!answer) {
      await release();
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "暂时没能回答，请稍后再试");
    }

    return {
      answer,
      brandName,
      remaining: Math.max(0, ReportAskService.DAILY_LIMIT - used),
    };
  }
}
