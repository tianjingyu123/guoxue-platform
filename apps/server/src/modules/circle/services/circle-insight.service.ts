import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { AiGatewayService } from "../../ai-gateway/ai-gateway.service";
import type { AiMessage } from "../../ai-gateway/adapters/base.adapter";

/**
 * 圈子增长项服务（V0 待办 #33 年度报告 / #37 AI 搜索推荐·2026-07-11 新建）。
 * - annualReport：当前成员本人过去 365 天在本圈的真实聚合（全部查真表，查不到的数据源不编造）。
 * - aiSearchRecommend：组合用户已加入圈子偏好 + 平台圈子清单 → AiGateway 生成推荐与追问；
 *   AI 失败/未配置一律 fail-open 返回 {}（前端不渲染 AI 区块，保持既有热门推荐降级）。
 */
@Injectable()
export class CircleInsightService {
  private readonly logger = new Logger(CircleInsightService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly aiGateway: AiGatewayService,
  ) {}

  // ───────── #33 年度报告（实时聚合·cron 预生成 TODO：当前实时聚合已满足展示） ─────────

  /**
   * 成员年度报告：过去 365 天本人在本圈的发帖数/提问数/参与直播数/获赞数/分成收益 + 入圈天数。
   * 数据口径（全真实·无编造）：
   * - posts：Post(circleId, userId, PUBLISHED, createdAt≥since)
   * - questions：PaidQuestion(circleId, askerId=本人, createdAt≥since)
   * - liveCount：本圈期内直播间中，本人有「上麦 LiveMic / 打赏 GiftRecord / Redis 预约 live:bookings:*」
   *   任一参与痕迹的房间数（平台无逐用户观看记录表——观看进度目前是前端本地存储，后端进度表 TODO）
   * - likesReceived：期内他人对本人本圈帖子的点赞（Like ⋈ Post）
   * - earningsRmb：UserEarning 中能关联回本圈的分成（问答/围观⋈PaidQuestion、连麦⋈AudioCallRecord、
   *   打赏⋈GiftRecord⋈LiveRoom）·期内无任何关联记录则不返回该项
   */
  async annualReport(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { joinedAt: true },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "未加入该圈子");

    const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const [posts, questions, likeRows, liveCount, earning] = await Promise.all([
      this.prisma.post.count({
        where: { circleId, userId, status: "PUBLISHED", createdAt: { gte: since } },
      }),
      this.prisma.paidQuestion.count({
        where: { circleId, askerId: userId, createdAt: { gte: since } },
      }),
      // 获赞数：期内落在本人本圈帖子上的点赞（排除自赞）
      this.prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS n
        FROM "Like" l
        JOIN "Post" p ON p."id" = l."targetId"
        WHERE l."targetType" = 'POST'
          AND l."createdAt" >= ${since}
          AND l."userId" <> ${userId}
          AND p."circleId" = ${circleId}
          AND p."userId" = ${userId}
      `),
      this.countLiveParticipation(circleId, userId, since),
      this.aggregateCircleEarnings(circleId, userId, since),
    ]);

    const joinedAt = member.joinedAt;
    const joinedDays = Math.max(1, Math.floor((Date.now() - new Date(joinedAt).getTime()) / 86400000) + 1);

    const report: Record<string, unknown> = {
      circleId,
      periodDays: 365,
      since: since.toISOString(),
      joinedAt,
      joinedDays,
      posts,
      questions,
      liveCount,
      likesReceived: Number(likeRows?.[0]?.n ?? 0),
    };
    // 期内无任何可关联分成记录 → 不返回该项（不编造 0 收益语义）
    if (earning.count > 0) report.earningsRmb = earning.sumRmb;
    return report;
  }

  /** 参与直播数：期内本圈直播间 ∩（上麦/打赏/Redis 预约）去重房间数 */
  private async countLiveParticipation(circleId: string, userId: string, since: Date): Promise<number> {
    const rooms = await this.prisma.liveRoom.findMany({
      where: { circleId, createdAt: { gte: since } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    if (rooms.length === 0) return 0;
    const roomIds = rooms.map((r) => r.id);

    const participated = new Set<string>();
    const [mics, gifts] = await Promise.all([
      this.prisma.liveMic.findMany({ where: { userId, liveRoomId: { in: roomIds } }, select: { liveRoomId: true } }),
      this.prisma.giftRecord.findMany({ where: { userId, liveRoomId: { in: roomIds } }, select: { liveRoomId: true } }),
    ]);
    mics.forEach((m) => participated.add(m.liveRoomId));
    gifts.forEach((g) => participated.add(g.liveRoomId));

    // Redis 预约记录（live.service.bookRoom 写 live:bookings:{roomId} set）·失败静默不阻断
    try {
      const toCheck = roomIds.filter((id) => !participated.has(id)).slice(0, 100);
      const flags = await Promise.all(toCheck.map((id) => this.redis.sismember(`live:bookings:${id}`, userId).catch(() => false)));
      toCheck.forEach((id, i) => { if (flags[i]) participated.add(id); });
    } catch { /* redis 不可用 → 仅按 DB 痕迹统计 */ }

    return participated.size;
  }

  /** 本圈可关联分成收益（元）：QUESTION/PEEK/PEEK_ASKER⋈问答、AUDIO_CALL⋈连麦、LIVE_GIFT⋈打赏 */
  private async aggregateCircleEarnings(circleId: string, userId: string, since: Date): Promise<{ sumRmb: number; count: number }> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ s: unknown; n: bigint }>>(Prisma.sql`
        SELECT COALESCE(SUM(e."amountRmb"), 0) AS s, COUNT(*)::bigint AS n
        FROM "UserEarning" e
        WHERE e."userId" = ${userId}
          AND e."createdAt" >= ${since}
          AND (
            (e."scene"::text IN ('QUESTION', 'PEEK', 'PEEK_ASKER')
              AND e."refId" IN (SELECT "id" FROM "PaidQuestion" WHERE "circleId" = ${circleId}))
            OR (e."scene"::text = 'AUDIO_CALL'
              AND e."refId" IN (SELECT "id" FROM "AudioCallRecord" WHERE "circleId" = ${circleId}))
            OR (e."scene"::text = 'LIVE_GIFT'
              AND e."refId" IN (
                SELECT g."id" FROM "GiftRecord" g
                JOIN "LiveRoom" r ON r."id" = g."liveRoomId"
                WHERE r."circleId" = ${circleId}
              ))
          )
      `);
      return { sumRmb: Math.round(Number(rows?.[0]?.s ?? 0) * 100) / 100, count: Number(rows?.[0]?.n ?? 0) };
    } catch (err) {
      this.logger.warn(`年度报告收益聚合失败 circleId=${circleId}`, err);
      return { sumRmb: 0, count: 0 }; // 聚合失败 → 该项不返回，不阻断其余统计
    }
  }

  // ───────── #37 AI 搜索推荐（fail-open） ─────────

  /**
   * AI 搜索推荐：{query} → { recommendCircleIds, circles, reason, followUps }。
   * 未登录可用（偏好部分为空）；AI 失败/未配置/输出不可解析 → 返回 {}（前端不渲染 AI 区块）。
   */
  async aiSearchRecommend(query: string, userId?: string): Promise<Record<string, unknown>> {
    const q = String(query || "").trim().slice(0, 100);
    if (!q) return {};

    try {
      // ① 用户已加入圈子偏好（未登录为空）
      let preference = "";
      if (userId) {
        const joined = await this.prisma.circleMember.findMany({
          where: { userId },
          select: { circle: { select: { name: true, tags: true, categoryLevel1: true } } },
          take: 20,
        });
        const parts = joined
          .map((m) => `${m.circle.name}(${[m.circle.categoryLevel1, ...(m.circle.tags || [])].filter(Boolean).slice(0, 3).join("/")})`)
          .filter(Boolean);
        if (parts.length) preference = parts.join("、");
      }

      // ② 平台圈子清单（成员数 top50）
      const circles = await this.prisma.circle.findMany({
        where: { status: "ACTIVE", deletedAt: null },
        select: { id: true, name: true, intro: true, cover: true, tags: true, categoryLevel1: true, memberCount: true },
        orderBy: { memberCount: "desc" },
        take: 50,
      });
      if (circles.length === 0) return {};

      const catalog = circles
        .map((c) => `- id:${c.id} 名称:${c.name} 分类:${c.categoryLevel1 || c.tags?.[0] || "无"} 成员:${c.memberCount} 简介:${(c.intro || "").slice(0, 40)}`)
        .join("\n");

      const messages: AiMessage[] = [
        {
          role: "system",
          content:
            "你是国学平台的圈子搜索助手。根据用户搜索词、用户已加入圈子的偏好、平台圈子清单，推荐最匹配的圈子并给出追问建议。" +
            '只输出 JSON（不要 markdown 代码块），格式：{"recommendCircleIds":["清单中的id，最多3个"],"reason":"一句话推荐理由（60字内，提及圈子名）","followUps":["追问搜索词1","追问搜索词2","追问搜索词3"]}。' +
            "recommendCircleIds 只能取清单里出现过的 id；没有合适的就返回空数组；followUps 是与搜索意图相关的短搜索词（8字内）。",
        },
        {
          role: "user",
          content: `搜索词：${q}\n用户已加入圈子偏好：${preference || "（无·未登录或未加入）"}\n平台圈子清单：\n${catalog}`,
        },
      ];

      const result = await this.aiGateway.chat({ scene: "circle_search_recommend", userId, messages });
      const parsed = this.parseJsonObject(result?.content || "");
      if (!parsed) return {};

      const validIds = new Set(circles.map((c) => c.id));
      const recommendCircleIds = (Array.isArray(parsed.recommendCircleIds) ? parsed.recommendCircleIds : [])
        .filter((id): id is string => typeof id === "string" && validIds.has(id))
        .slice(0, 3);
      const followUps = (Array.isArray(parsed.followUps) ? parsed.followUps : [])
        .filter((s): s is string => typeof s === "string" && !!s.trim())
        .map((s) => s.trim().slice(0, 20))
        .slice(0, 3);
      const reason = typeof parsed.reason === "string" ? parsed.reason.trim().slice(0, 120) : "";

      if (!recommendCircleIds.length && !followUps.length && !reason) return {};

      const byId = new Map(circles.map((c) => [c.id, c]));
      return {
        recommendCircleIds,
        circles: recommendCircleIds.map((id) => {
          const c = byId.get(id)!;
          return { id: c.id, name: c.name, cover: c.cover, intro: c.intro, memberCount: c.memberCount, category: c.categoryLevel1 || c.tags?.[0] || "" };
        }),
        reason,
        followUps,
      };
    } catch (err) {
      // fail-open：AI 未配置/超时/限流等一律静默降级
      this.logger.warn(`AI 搜索推荐降级（fail-open）: ${(err as Error)?.message}`);
      return {};
    }
  }

  /** 宽容解析模型输出中的 JSON 对象（剥 ```json 围栏 / 截取首尾大括号） */
  private parseJsonObject(text: string): { recommendCircleIds?: unknown[]; reason?: unknown; followUps?: unknown[] } | null {
    const stripped = text.replace(/```json|```/g, "").trim();
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const obj = JSON.parse(stripped.slice(start, end + 1));
      return obj && typeof obj === "object" ? obj : null;
    } catch {
      return null;
    }
  }
}
