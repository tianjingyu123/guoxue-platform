import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { randomBytes } from "node:crypto";

/**
 * 从业者工作台（V0「从业者工作台」的真后端）
 *
 * 数据边界（很重要，别再开第二张表）：
 *  · 客户档案  → 复用 CRM 的 ClientBook（已有 ownerId 隔离 / 生辰加密 / RFM），本模块不碰。
 *  · 平台收入  → revenue 模块（课程/商品/咨询分成），只读；本模块只管**线下手记**。
 *  · 命理字段（日主/五行/喜忌）→ 前端由生辰用已交叉验证的排盘引擎现算，不落库。
 *
 * 权益分级（董事长 2026-07-14 拍板：入口对所有登录用户开放，功能分级）：
 *  · 免费：排盘中心、客户档案、账本手记、案例库、报告草稿（上限 FREE_REPORT_QUOTA 份）
 *  · 从业者会员 ¥98/月：报告不限份数 + 只读链接交付客户 + 自定义品牌落款
 *  会员与书院会员（user.memberLevel）完全独立，互不影响。
 */
@Injectable()
export class PractitionerService {
  private readonly logger = new Logger(PractitionerService.name);
  /** 免费用户可保留的报告份数（超出需开通会员） */
  static readonly FREE_REPORT_QUOTA = 3;

  constructor(private prisma: PrismaService) {}

  // ───────────────────────── 会员与档案 ─────────────────────────

  /** 是否为有效期内的从业者会员 */
  async isPro(userId: string): Promise<boolean> {
    const p = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
      select: { proExpireAt: true },
    });
    return !!p?.proExpireAt && p.proExpireAt > new Date();
  }

  /** 会员专属动作的闸门 */
  private async requirePro(userId: string, action: string) {
    if (!(await this.isPro(userId))) {
      throw new BusinessException(ErrorCode.FORBIDDEN, `${action}是从业者会员专属功能，请先开通`);
    }
  }

  /** 会员状态 + 价格（价格真源 CommissionConfig，不硬编码 98） */
  async getProStatus(userId: string) {
    const [profile, cfg] = await Promise.all([
      this.prisma.practitionerProfile.findUnique({ where: { userId } }),
      this.prisma.commissionConfig.findUnique({ where: { configKey: "practitioner_pro_monthly" } }),
    ]);
    const now = new Date();
    const active = !!profile?.proExpireAt && profile.proExpireAt > now;
    return {
      isPro: active,
      expireAt: profile?.proExpireAt ?? null,
      firstPaidAt: profile?.proFirstAt ?? null,
      /** 剩余天数（非会员为 0） */
      daysLeft: active ? Math.ceil((profile!.proExpireAt!.getTime() - now.getTime()) / 86400000) : 0,
      price: Number(cfg?.rateA ?? 0),
      period: "月",
      freeReportQuota: PractitionerService.FREE_REPORT_QUOTA,
    };
  }

  /** 从业者档案（品牌落款 + 会员 + 执业统计） */
  async getProfile(userId: string) {
    const [profile, pro, user, reportCount, caseCount, clientCount] = await Promise.all([
      this.prisma.practitionerProfile.findUnique({ where: { userId } }),
      this.getProStatus(userId),
      this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, avatar: true, createdAt: true } }),
      this.prisma.practitionerReport.count({ where: { ownerId: userId } }),
      this.prisma.practitionerCase.count({ where: { ownerId: userId } }),
      this.prisma.clientBook.count({ where: { ownerId: userId } }),
    ]);
    const joinDays = user?.createdAt
      ? Math.max(1, Math.floor((Date.now() - user.createdAt.getTime()) / 86400000))
      : 0;
    return {
      pro,
      brand: {
        brandName: profile?.brandName ?? "",
        title: profile?.title ?? "",
        avatarText: profile?.avatarText ?? (user?.nickname ?? "").slice(0, 1),
        logoUrl: profile?.logoUrl ?? "",
        sealText: profile?.sealText ?? "",
        slogan: profile?.slogan ?? "",
        contact: profile?.contact ?? "",
        disclaimer: profile?.disclaimer ?? "",
      },
      name: user?.nickname ?? "",
      avatar: user?.avatar ?? "",
      stats: { joinDays, reportCount, caseCount, clientCount },
    };
  }

  /** 品牌落款设置（会员专属：报告上的署名/印章是交付物的一部分） */
  async updateBrand(userId: string, dto: Record<string, string | undefined>) {
    await this.requirePro(userId, "自定义品牌落款");
    const data = {
      brandName: dto.brandName,
      title: dto.title,
      avatarText: dto.avatarText,
      logoUrl: dto.logoUrl,
      sealText: dto.sealText,
      slogan: dto.slogan,
      contact: dto.contact,
      disclaimer: dto.disclaimer,
    };
    await this.prisma.practitionerProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.getProfile(userId);
  }

  // ───────────────────────── 报告工坊 ─────────────────────────

  async listReports(userId: string, query: { status?: string; keyword?: string }) {
    const where: any = { ownerId: userId };
    if (query.status) where.status = query.status;
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { clientName: { contains: query.keyword } },
      ];
    }
    const list = await this.prisma.practitionerReport.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return { list, total: list.length, quota: await this.reportQuota(userId) };
  }

  /** 报告配额：会员不限，免费用户 FREE_REPORT_QUOTA 份 */
  private async reportQuota(userId: string) {
    const [pro, used] = await Promise.all([
      this.isPro(userId),
      this.prisma.practitionerReport.count({ where: { ownerId: userId } }),
    ]);
    return { used, limit: pro ? null : PractitionerService.FREE_REPORT_QUOTA, unlimited: pro };
  }

  async getReport(userId: string, id: string) {
    const r = await this.prisma.practitionerReport.findFirst({ where: { id, ownerId: userId } });
    if (!r) throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在");
    return r;
  }

  async createReport(userId: string, dto: any) {
    const q = await this.reportQuota(userId);
    if (!q.unlimited && q.used >= (q.limit ?? 0)) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `免费版最多保存 ${q.limit} 份报告（已用 ${q.used} 份），开通从业者会员可不限份数`,
      );
    }
    return this.prisma.practitionerReport.create({
      data: {
        ownerId: userId,
        clientId: dto.clientId ?? null,
        toolKey: dto.toolKey ?? null,
        type: dto.type,
        typeLabel: dto.typeLabel,
        title: dto.title,
        clientName: dto.clientName,
        clientBirth: dto.clientBirth ?? null,
        status: dto.status ?? "draft",
        style: dto.style ?? "classic",
        paipan: dto.paipan ?? undefined,
        chapters: dto.chapters ?? undefined,
      },
    });
  }

  async updateReport(userId: string, id: string, dto: any) {
    await this.getReport(userId, id); // 归属校验（他人的 id 与不存在同样 404）
    return this.prisma.practitionerReport.update({
      where: { id },
      data: {
        title: dto.title,
        type: dto.type,
        typeLabel: dto.typeLabel,
        clientId: dto.clientId,
        clientName: dto.clientName,
        clientBirth: dto.clientBirth,
        status: dto.status,
        style: dto.style,
        paipan: dto.paipan ?? undefined,
        chapters: dto.chapters ?? undefined,
      },
    });
  }

  async deleteReport(userId: string, id: string) {
    await this.getReport(userId, id);
    await this.prisma.practitionerReport.delete({ where: { id } });
    return { success: true };
  }

  /**
   * 交付客户：生成只读分享令牌（会员专属）
   * 令牌即凭证 —— 拿到链接的人（客户，通常没有本平台账号）无需登录即可查看这一份报告。
   * 因此令牌必须是高熵随机（非自增/非可猜），且只暴露这一份报告的内容。
   */
  async shareReport(userId: string, id: string) {
    await this.requirePro(userId, "交付报告给客户");
    const r = await this.getReport(userId, id);
    const token = r.shareToken ?? randomBytes(16).toString("hex");
    const updated = await this.prisma.practitionerReport.update({
      where: { id },
      data: { shareToken: token, sharedAt: new Date(), status: r.status === "draft" ? "delivered" : r.status },
    });
    return { shareToken: updated.shareToken, sharedAt: updated.sharedAt };
  }

  /** 撤回交付链接 */
  async unshareReport(userId: string, id: string) {
    await this.getReport(userId, id);
    await this.prisma.practitionerReport.update({
      where: { id },
      data: { shareToken: null, sharedAt: null },
    });
    return { success: true };
  }

  /** 公开：按令牌读一份报告（无需登录 · 只读 · 不返回 ownerId 等内部字段） */
  async getSharedReport(token: string) {
    const r = await this.prisma.practitionerReport.findUnique({ where: { shareToken: token } });
    if (!r) throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在或已被撤回");
    const profile = await this.prisma.practitionerProfile.findUnique({ where: { userId: r.ownerId } });
    const author = await this.prisma.user.findUnique({
      where: { id: r.ownerId },
      select: { nickname: true, avatar: true },
    });
    return {
      title: r.title,
      typeLabel: r.typeLabel,
      clientName: r.clientName,
      clientBirth: r.clientBirth,
      style: r.style,
      paipan: r.paipan,
      chapters: r.chapters,
      sharedAt: r.sharedAt,
      brand: {
        brandName: profile?.brandName ?? author?.nickname ?? "",
        title: profile?.title ?? "",
        sealText: profile?.sealText ?? "",
        slogan: profile?.slogan ?? "",
        contact: profile?.contact ?? "",
        disclaimer: profile?.disclaimer ?? "",
        logoUrl: profile?.logoUrl ?? "",
        avatar: author?.avatar ?? "",
      },
    };
  }

  // ───────────────────────── 案例库 ─────────────────────────

  async listCases(userId: string, query: { category?: string; keyword?: string }) {
    const where: any = { ownerId: userId };
    if (query.category && query.category !== "all") where.category = query.category;
    if (query.keyword) {
      where.OR = [{ title: { contains: query.keyword } }, { clientName: { contains: query.keyword } }];
    }
    const list = await this.prisma.practitionerCase.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 200,
    });
    return { list, total: list.length };
  }

  async createCase(userId: string, dto: any) {
    return this.prisma.practitionerCase.create({
      data: {
        ownerId: userId,
        reportId: dto.reportId ?? null,
        title: dto.title,
        clientName: dto.clientName ?? null,
        category: dto.category ?? "bazi",
        summary: dto.summary ?? null,
        tags: dto.tags ?? [],
        fee: dto.fee ?? 0,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
    });
  }

  async updateCase(userId: string, id: string, dto: any) {
    const c = await this.prisma.practitionerCase.findFirst({ where: { id, ownerId: userId } });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "案例不存在");
    return this.prisma.practitionerCase.update({
      where: { id },
      data: {
        title: dto.title,
        clientName: dto.clientName,
        category: dto.category,
        summary: dto.summary,
        tags: dto.tags,
        fee: dto.fee,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
    });
  }

  async deleteCase(userId: string, id: string) {
    const c = await this.prisma.practitionerCase.findFirst({ where: { id, ownerId: userId } });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "案例不存在");
    await this.prisma.practitionerCase.delete({ where: { id } });
    return { success: true };
  }

  // ───────────────────────── 执业日程 ─────────────────────────

  async listAppointments(userId: string, query: { from?: string; to?: string; status?: string }) {
    const where: any = { ownerId: userId };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.startAt = {};
      if (query.from) where.startAt.gte = new Date(query.from);
      if (query.to) where.startAt.lte = new Date(query.to);
    }
    const list = await this.prisma.practitionerAppointment.findMany({
      where,
      orderBy: { startAt: "asc" },
      take: 200,
    });
    return { list, total: list.length };
  }

  async createAppointment(userId: string, dto: any) {
    if (!dto.startAt) throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写预约时间");
    return this.prisma.practitionerAppointment.create({
      data: {
        ownerId: userId,
        clientId: dto.clientId ?? null,
        clientName: dto.clientName,
        startAt: new Date(dto.startAt),
        service: dto.service,
        channel: dto.channel ?? "到店",
        status: dto.status ?? "pending",
        note: dto.note ?? null,
        fee: dto.fee ?? null,
      },
    });
  }

  async updateAppointment(userId: string, id: string, dto: any) {
    const a = await this.prisma.practitionerAppointment.findFirst({ where: { id, ownerId: userId } });
    if (!a) throw new BusinessException(ErrorCode.NOT_FOUND, "预约不存在");
    return this.prisma.practitionerAppointment.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        clientName: dto.clientName,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        service: dto.service,
        channel: dto.channel,
        status: dto.status,
        note: dto.note,
        fee: dto.fee,
      },
    });
  }

  async deleteAppointment(userId: string, id: string) {
    const a = await this.prisma.practitionerAppointment.findFirst({ where: { id, ownerId: userId } });
    if (!a) throw new BusinessException(ErrorCode.NOT_FOUND, "预约不存在");
    await this.prisma.practitionerAppointment.delete({ where: { id } });
    return { success: true };
  }

  // ───────────────────────── 收入账本 ─────────────────────────

  /**
   * 账本 = 线下手记 + 平台内已结算收入（CommissionRecord）。
   * 平台侧只读——那部分钱是平台算的，从业者不能改，只能看；能改的只有自己手记的线下单。
   */
  async getLedger(userId: string, query: { month?: string }) {
    // month = YYYY-MM，缺省取当月（按北京时间的自然月）
    const now = new Date();
    const [y, m] = (query.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
      .split("-")
      .map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    const [manual, commissions] = await Promise.all([
      this.prisma.practitionerLedger.findMany({
        where: { ownerId: userId, occurredAt: { gte: start, lt: end } },
        orderBy: { occurredAt: "desc" },
      }),
      this.prisma.userEarning.findMany({
        where: { userId, createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { id: true, amountRmb: true, scene: true, createdAt: true },
      }),
    ]);

    const entries = [
      ...manual.map((e) => ({
        id: e.id,
        source: "manual" as const,
        clientName: e.clientName ?? "",
        service: e.service,
        amount: Number(e.amount),
        payMethod: e.payMethod,
        note: e.note ?? "",
        occurredAt: e.occurredAt,
        editable: true,
      })),
      ...commissions.map((c) => ({
        id: c.id,
        source: "platform" as const,
        clientName: "",
        service: this.sceneLabel(c.scene),
        amount: Number(c.amountRmb),
        payMethod: "平台结算",
        note: "平台内成交",
        occurredAt: c.createdAt,
        editable: false,
      })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const total = entries.reduce((s, e) => s + e.amount, 0);
    const manualTotal = entries.filter((e) => e.source === "manual").reduce((s, e) => s + e.amount, 0);
    const byService = new Map<string, { count: number; amount: number }>();
    for (const e of entries) {
      const cur = byService.get(e.service) ?? { count: 0, amount: 0 };
      byService.set(e.service, { count: cur.count + 1, amount: cur.amount + e.amount });
    }

    return {
      month: `${y}-${String(m).padStart(2, "0")}`,
      entries,
      stats: {
        total: Math.round(total * 100) / 100,
        manualTotal: Math.round(manualTotal * 100) / 100,
        platformTotal: Math.round((total - manualTotal) * 100) / 100,
        count: entries.length,
        avg: entries.length ? Math.round((total / entries.length) * 100) / 100 : 0,
      },
      byService: [...byService.entries()]
        .map(([service, v]) => ({ service, ...v, amount: Math.round(v.amount * 100) / 100 }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  /** 平台内收益场景 → 账本上的服务名（对齐 enum EarningScene） */
  private sceneLabel(scene: string): string {
    const MAP: Record<string, string> = {
      QUESTION: "付费提问",
      PEEK: "围观分成",
      PEEK_ASKER: "围观分成(提问者)",
      AUDIO_CALL: "语音连麦",
      LIVE_GIFT: "直播打赏",
    };
    return MAP[scene] ?? "平台收入";
  }

  async createLedgerEntry(userId: string, dto: any) {
    const amount = Number(dto.amount);
    if (!(amount > 0)) throw new BusinessException(ErrorCode.BAD_REQUEST, "金额必须大于 0");
    return this.prisma.practitionerLedger.create({
      data: {
        ownerId: userId,
        clientName: dto.clientName ?? null,
        service: dto.service,
        amount,
        payMethod: dto.payMethod ?? "现金",
        note: dto.note ?? null,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
    });
  }

  async deleteLedgerEntry(userId: string, id: string) {
    const e = await this.prisma.practitionerLedger.findFirst({ where: { id, ownerId: userId } });
    if (!e) throw new BusinessException(ErrorCode.NOT_FOUND, "记录不存在");
    await this.prisma.practitionerLedger.delete({ where: { id } });
    return { success: true };
  }

  // ───────────────────────── 工作台首页聚合 ─────────────────────────

  /** 今日概览：日程、待办提醒、本月收入、客户数 —— 一次拿全，首页不打散请求 */
  async getHome(userId: string) {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [appointments, reminders, clientCount, monthCommission, monthManual, pendingQuestions, reports] =
      await Promise.all([
        this.prisma.practitionerAppointment.findMany({
          where: { ownerId: userId, startAt: { gte: dayStart, lt: dayEnd } },
          orderBy: { startAt: "asc" },
        }),
        // 客户回访提醒（CRM 已有 ClientReminder：生日/回访/事件）
        this.prisma.clientReminder.findMany({
          where: { ownerId: userId, status: "PENDING", dueAt: { lte: dayEnd } },
          orderBy: { dueAt: "asc" },
          take: 10,
          include: { client: { select: { name: true } } },
        }),
        this.prisma.clientBook.count({ where: { ownerId: userId } }),
        this.prisma.userEarning.aggregate({
          where: { userId, createdAt: { gte: monthStart } },
          _sum: { amountRmb: true },
        }),
        this.prisma.practitionerLedger.aggregate({
          where: { ownerId: userId, occurredAt: { gte: monthStart } },
          _sum: { amount: true },
        }),
        // 平台内待回答的付费提问（老师的另一条真实待办）
        this.prisma.paidQuestion.count({ where: { answererId: userId, status: "PENDING" } }),
        this.prisma.practitionerReport.findMany({
          where: { ownerId: userId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { id: true, title: true, typeLabel: true, clientName: true, status: true, updatedAt: true },
        }),
      ]);

    const monthIncome =
      Number(monthCommission._sum.amountRmb ?? 0) + Number(monthManual._sum.amount ?? 0);
    const draftCount = await this.prisma.practitionerReport.count({
      where: { ownerId: userId, status: "draft" },
    });

    return {
      stats: [
        { key: "appointments", label: "今日预约", value: String(appointments.length), hint: "件" },
        { key: "pending", label: "待回答", value: String(pendingQuestions), hint: "条" },
        { key: "income", label: "本月收入", value: `¥${Math.round(monthIncome * 100) / 100}`, hint: "含线下手记" },
        { key: "clients", label: "客户档案", value: String(clientCount), hint: "人" },
      ],
      appointments,
      reminders,
      recentReports: reports,
      draftCount,
      pro: await this.getProStatus(userId),
    };
  }
}
