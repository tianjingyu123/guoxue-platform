import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { VoiceQuotaService } from "./voice-quota.service";

/**
 * 广场智能体试聊（2026-09-18）
 *
 * 决策人定的规则与用意：广场智能体 2 元/分钟，**每个智能体每人试聊 3 分钟，最多试 5 个**；
 * 「目的是通过试聊让用户感兴趣、有好的体验，有助于提高他的付费意愿，
 * 所以试聊和用户服务期间的逻辑和节奏设计很重要」。
 *
 * 据此定下三条做法：
 * 1. **按「人 × 智能体」计量**：换一个智能体还能再试，同一个不能反复试。
 *    体验的是「这个智能体合不合我意」，不是「我能白聊多久」。
 * 2. **不倒计时，只在快结束时提示一次**。全程显示剩余秒数会让人一直惦记着时间，
 *    体验反而差——那是把试聊做成了催付费。
 * 3. **试聊结束不是拦路，而是接住**：明确告诉用户刚才聊的是哪一个、继续要多少钱、
 *    以及还能换几个别的试。用户愿不愿意付，取决于他刚才那三分钟是否值。
 */
@Injectable()
export class VoiceTrialService {
  private readonly logger = new Logger(VoiceTrialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: VoiceQuotaService,
  ) {}

  /**
   * 试聊资格与剩余。
   * 页面进入智能体详情时调用，据此决定按钮是「免费试聊 3 分钟」还是「继续聊（2 元/分钟）」。
   */
  async status(userId: string, agentId: string) {
    const cfg = await this.quota.getConfig();
    const p = cfg.pricing;

    const [mine, triedCount] = await Promise.all([
      this.prisma.voiceTrialUsage.findUnique({ where: { userId_agentId: { userId, agentId } } }),
      this.prisma.voiceTrialUsage.count({ where: { userId } }),
    ]);

    const used = mine?.usedSeconds ?? 0;
    const remaining = Math.max(0, p.trialSecondsPerAgent - used);
    // 已经试过这个智能体的，不占新名额；没试过的才要看名额还够不够
    const agentQuotaLeft = mine ? true : triedCount < p.trialMaxAgents;

    return {
      agentId,
      /** 本智能体还能试多少秒 */
      remainingSeconds: agentQuotaLeft ? remaining : 0,
      trialSecondsPerAgent: p.trialSecondsPerAgent,
      /** 还能试几个没试过的智能体 */
      agentsLeft: Math.max(0, p.trialMaxAgents - triedCount),
      triedAgents: triedCount,
      maxAgents: p.trialMaxAgents,
      canTrial: agentQuotaLeft && remaining > 0,
      /** 试聊结束后的单价（分/分钟）：2 元 */
      pricePerMinuteCents: Math.round(p.agentMicroPerMinute / 10_000),
      /** 快结束时提示一次的节点（秒）——不做全程倒计时 */
      warnAtSeconds: p.trialWarnAtSeconds,
      /** 用户自己的语音余额：试聊用完后可以直接用余额继续，不必现充 */
      balanceSeconds: (await this.quota.getAvailable("user", userId)).availableSeconds,
    };
  }

  /**
   * 开始试聊：占用名额并返回本次可用时长。
   * 名额不足或本智能体已试完时明确拒绝，由调用方转入付费流程。
   */
  async start(userId: string, agentId: string) {
    const st = await this.status(userId, agentId);
    if (!st.canTrial) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        st.agentsLeft <= 0 && st.remainingSeconds === 0
          ? `试聊名额已用完（最多试聊 ${st.maxAgents} 个智能体），继续聊按 ${(st.pricePerMinuteCents / 100).toFixed(0)} 元/分钟计费`
          : `这个智能体的 ${Math.round(st.trialSecondsPerAgent / 60)} 分钟试聊已用完，继续聊按 ${(st.pricePerMinuteCents / 100).toFixed(0)} 元/分钟计费`,
      );
    }

    // upsert 占位：并发下靠唯一约束兜底，不靠先查后写
    await this.prisma.voiceTrialUsage.upsert({
      where: { userId_agentId: { userId, agentId } },
      create: { userId, agentId, usedSeconds: 0, sessions: 1 },
      update: { sessions: { increment: 1 }, lastAt: new Date() },
    });

    return { agentId, maxSeconds: st.remainingSeconds, warnAtSeconds: st.warnAtSeconds };
  }

  /**
   * 结束试聊：记录实际用量，并给出「接下来怎么办」。
   *
   * 用量按实际时长累加，超出部分截断到本智能体的试聊上限——
   * 客户端上报的秒数不可全信，但也不因为它多报而去扣用户的付费余额。
   */
  async finish(userId: string, agentId: string, seconds: number) {
    const cfg = await this.quota.getConfig();
    const p = cfg.pricing;
    const mine = await this.prisma.voiceTrialUsage.findUnique({ where: { userId_agentId: { userId, agentId } } });
    if (!mine) throw new BusinessException(ErrorCode.NOT_FOUND, "没有进行中的试聊记录");

    const add = Math.max(0, Math.min(Math.floor(seconds) || 0, p.trialSecondsPerAgent - mine.usedSeconds));
    const updated = await this.prisma.voiceTrialUsage.update({
      where: { id: mine.id },
      data: { usedSeconds: { increment: add }, lastAt: new Date() },
    });

    const triedCount = await this.prisma.voiceTrialUsage.count({ where: { userId } });
    const agentsLeft = Math.max(0, p.trialMaxAgents - triedCount);
    const balance = (await this.quota.getAvailable("user", userId)).availableSeconds;
    const usedUp = updated.usedSeconds >= p.trialSecondsPerAgent;

    return {
      usedSeconds: updated.usedSeconds,
      remainingSeconds: Math.max(0, p.trialSecondsPerAgent - updated.usedSeconds),
      agentsLeft,
      balanceSeconds: balance,
      /**
       * 试聊结束的去处。这一步是转化的关键：不拦路，而是接住——
       * 用户刚聊完还有印象，此时告诉他「继续要多少钱、还能换几个试」最有效。
       */
      next: !usedUp
        ? ("continue_trial" as const) // 还没聊满，随时可以接着试
        : balance > 0
          ? ("use_balance" as const) // 有余额，直接接着聊，不必现充
          : agentsLeft > 0
            ? ("try_other" as const) // 试聊名额还有，换一个看看
            : ("pay" as const), // 都用完了，该付费了
      pricePerMinuteCents: Math.round(p.agentMicroPerMinute / 10_000),
    };
  }

  /** 我试过哪些智能体（页面上标注「已试聊」，避免用户重复点进去才发现没得试） */
  async mine(userId: string) {
    const rows = await this.prisma.voiceTrialUsage.findMany({
      where: { userId },
      orderBy: { lastAt: "desc" },
      select: { agentId: true, usedSeconds: true, sessions: true, lastAt: true },
    });
    const cfg = await this.quota.getConfig();
    return {
      items: rows.map((r) => ({
        ...r,
        remainingSeconds: Math.max(0, cfg.pricing.trialSecondsPerAgent - r.usedSeconds),
      })),
      agentsLeft: Math.max(0, cfg.pricing.trialMaxAgents - rows.length),
      maxAgents: cfg.pricing.trialMaxAgents,
    };
  }
}
