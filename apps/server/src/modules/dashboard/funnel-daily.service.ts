import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

const DAY_MS = 86_400_000;

/**
 * 核心转化漏斗日聚合（D-T1·设计真源 docs/design/数据运营引擎-看板漏斗标签周报-20260705.md §二）
 *
 * 五条漏斗（distinct 用户口径·当日窗口）：
 * - F1_activation  注册 → 当日首次排盘 → 次日回访（cohort=注册日；step3 依赖 D+1 数据，
 *   每日 cron 同时重算 昨日+前日 两天，前日行幂等修正为完整值）
 * - F2_member      会员页曝光(member_page_view) → 支付点击(member_pay_click) → 会员购买(MemberPurchase)
 * - F3_commerce    商详曝光(page_view path 含课程/商品详情) → 购买点击(buy_click) → 支付成功(Order)
 * - F4_practitioner 工具使用(PaipanRecord) → B端入口曝光 → 认证申请(TeacherCertification) → 出佣(LedgerEntry)
 * - F5_customer_service 提问 → 问题已处理 → 推荐展示 → 推荐点击 → 点击后支付
 *
 * 事件源最小化：仅 member_page_view / member_pay_click / buy_click 三个前端新埋点，
 * 其余全部复用现有表与 page_view 的 path（勿再加埋点）。
 * 幂等：date+funnel+step 唯一 + upsert，可任意重跑。
 */
@Injectable()
export class FunnelDailyService {
  private readonly logger = new Logger(FunnelDailyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ───────── 日期工具（与 DashboardDailyService 同口径·Asia/Shanghai） ─────────

  dateStrShanghai(offsetDays = 0): string {
    const sh = new Date(new Date(Date.now() + offsetDays * DAY_MS).toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}`;
  }

  private dayRange(date: string): { gte: Date; lt: Date } {
    const gte = new Date(`${date}T00:00:00+08:00`);
    return { gte, lt: new Date(gte.getTime() + DAY_MS) };
  }

  private addDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00+08:00`);
    const nd = new Date(d.getTime() + days * DAY_MS);
    const pad = (n: number) => String(n).padStart(2, "0");
    const sh = new Date(nd.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    return `${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}`;
  }

  private isValidDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00+08:00`).getTime());
  }

  // ───────── 聚合 cron（00:40·错开 dashboard-daily 的 00:30） ─────────

  @Cron("40 0 * * *")
  async aggregateCron(): Promise<void> {
    await this.redis.runExclusive("funnel-daily", 600, async () => {
      // 昨日全量 + 前日幂等修正（F1 的次日回访在 D+1 才完整）
      for (const offset of [-1, -2]) {
        const date = this.dateStrShanghai(offset);
        try {
          await this.rebuildDate(date);
        } catch (e) {
          this.logger.error(`漏斗日聚合失败：${date}`, e instanceof Error ? e.stack : String(e));
        }
      }
      this.logger.log("漏斗日聚合完成");
    });
  }

  /** 聚合指定日期 5 条漏斗并 upsert（幂等） */
  async rebuildDate(date: string): Promise<void> {
    if (!this.isValidDate(date)) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "日期格式须为 YYYY-MM-DD");
    }
    const range = this.dayRange(date);
    const nextRange = this.dayRange(this.addDays(date, 1));

    // ── F1 激活（cohort=当日注册用户） ──
    const registered = await this.prisma.user.findMany({
      where: { createdAt: range },
      select: { id: true },
    });
    const regIds = registered.map((u) => u.id);
    const [paipanUsers, returnUsers] = regIds.length
      ? await Promise.all([
          this.prisma.paipanRecord.findMany({
            where: { userId: { in: regIds }, createdAt: range },
            select: { userId: true }, distinct: ["userId"],
          }),
          this.prisma.trackEvent.findMany({
            where: { userId: { in: regIds }, action: "page_view", createdAt: nextRange },
            select: { userId: true }, distinct: ["userId"],
          }),
        ])
      : [[], []];
    await this.upsertSteps(date, "F1_activation", [
      ["register", regIds.length],
      ["first_paipan", paipanUsers.length],
      ["d1_return", returnUsers.length],
    ]);

    // ── F2 会员 ──
    const [memberView, memberPayClick, memberPaid] = await Promise.all([
      this.distinctEventUsers("member_page_view", range),
      this.distinctEventUsers("member_pay_click", range),
      this.prisma.memberPurchase.findMany({
        where: { paidAt: range },
        select: { userId: true }, distinct: ["userId"],
      }).then((r) => r.length),
    ]);
    await this.upsertSteps(date, "F2_member", [
      ["member_page_view", memberView],
      ["member_pay_click", memberPayClick],
      ["member_paid", memberPaid],
    ]);

    // ── F3 电商 ──
    const [detailView, buyClick, paidUsers] = await Promise.all([
      this.prisma.trackEvent.findMany({
        where: {
          action: "page_view", userId: { not: null }, createdAt: range,
          OR: [
            { path: { contains: "pkg-course/detail" } },
            { path: { contains: "pkg-mall/product" } },
          ],
        },
        select: { userId: true }, distinct: ["userId"],
      }).then((r) => r.length),
      this.distinctEventUsers("buy_click", range),
      this.prisma.order.findMany({
        where: { createdAt: range, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
        select: { userId: true }, distinct: ["userId"],
      }).then((r) => r.length),
    ]);
    await this.upsertSteps(date, "F3_commerce", [
      ["detail_view", detailView],
      ["buy_click", buyClick],
      ["paid", paidUsers],
    ]);

    // ── F4 从业者 ──
    const [toolUsers, bEntryView, certApply, earnUsers] = await Promise.all([
      this.prisma.paipanRecord.findMany({
        where: { createdAt: range },
        select: { userId: true }, distinct: ["userId"],
      }).then((r) => r.length),
      this.prisma.trackEvent.findMany({
        where: {
          action: "page_view", userId: { not: null }, createdAt: range,
          OR: [
            { path: { contains: "pkg-operator" } },
            { path: { contains: "pkg-creator" } },
            { path: { contains: "merchant" } },
          ],
        },
        select: { userId: true }, distinct: ["userId"],
      }).then((r) => r.length),
      this.prisma.teacherCertification.count({ where: { createdAt: range } }),
      this.prisma.ledgerEntry.findMany({
        where: { createdAt: range, amount: { gt: 0 } },
        select: { beneficiaryId: true }, distinct: ["beneficiaryId"],
      }).then((r) => r.length),
    ]);
    await this.upsertSteps(date, "F4_practitioner", [
      ["tool_use", toolUsers],
      ["b_entry_view", bEntryView],
      ["cert_apply", certApply],
      ["commission_earned", earnUsers],
    ]);

    // ── F5 智能客服（只统计登录用户，不记录对话正文） ──
    const [askedUsers, resolvedUsers, offeredUsers] = await Promise.all([
      this.distinctEventUsers("cs_question_submitted", range),
      this.distinctEventUsers("cs_reply_completed", range),
      this.distinctEventUsers("cs_recommend_offered", range),
    ]);
    const clickRows = await this.prisma.trackEvent.findMany({
      where: { action: "cs_recommend_click", userId: { not: null }, createdAt: range },
      select: { userId: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    });
    const firstClickByUser = new Map<string, Date>();
    for (const row of clickRows) {
      if (row.userId && !firstClickByUser.has(row.userId)) firstClickByUser.set(row.userId, row.occurredAt);
    }
    const clickedIds = [...firstClickByUser.keys()];
    const paidAfterService = clickedIds.length
      ? await this.prisma.order.findMany({
          where: {
            userId: { in: clickedIds },
            status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
            paidAt: range,
          },
          select: { userId: true, paidAt: true },
        }).then((rows) => new Set(rows
          .filter((row) => row.paidAt && row.paidAt >= firstClickByUser.get(row.userId)!)
          .map((row) => row.userId)).size)
      : 0;
    await this.upsertSteps(date, "F5_customer_service", [
      ["cs_question", askedUsers],
      ["cs_resolved", resolvedUsers],
      ["cs_recommend_offered", offeredUsers],
      ["cs_recommend_clicked", clickedIds.length],
      ["cs_attributed_paid", paidAfterService],
    ]);
  }

  private async distinctEventUsers(action: string, range: { gte: Date; lt: Date }): Promise<number> {
    const rows = await this.prisma.trackEvent.findMany({
      where: { action, userId: { not: null }, createdAt: range },
      select: { userId: true }, distinct: ["userId"],
    });
    return rows.length;
  }

  private async upsertSteps(date: string, funnel: string, steps: Array<[string, number]>): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      const [stepKey, count] = steps[i];
      await this.prisma.funnelDaily.upsert({
        where: { date_funnel_step: { date, funnel, step: i + 1 } },
        create: { date, funnel, step: i + 1, stepKey, count },
        update: { stepKey, count },
      });
    }
  }

  // ───────── 查询（admin 看板用） ─────────

  /** 某漏斗近 N 天序列：[{date, steps:[{stepKey,count}]}] */
  async series(funnel: string, days = 14) {
    const safeDays = Math.min(Math.max(1, days), 90);
    const since = this.dateStrShanghai(-safeDays);
    const rows = await this.prisma.funnelDaily.findMany({
      where: { funnel, date: { gte: since } },
      orderBy: [{ date: "asc" }, { step: "asc" }],
    });
    const byDate = new Map<string, Array<{ step: number; stepKey: string; count: number }>>();
    for (const r of rows) {
      if (!byDate.has(r.date)) byDate.set(r.date, []);
      byDate.get(r.date)!.push({ step: r.step, stepKey: r.stepKey, count: r.count });
    }
    return Array.from(byDate.entries()).map(([date, steps]) => ({ date, steps }));
  }
}
