import { Injectable, Logger, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Prisma, InstituteRole } from "@prisma/client";
import { FundApprovalService } from "../fund-approval/fund-approval.service";
import { InstituteAssessmentService } from "./institute-assessment.service";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

const MGMT_ROLES: InstituteRole[] = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"];

/** 讲师影响力榜单缓存 TTL（1 小时） */
const RANKINGS_CACHE_TTL = 3600;
/** 资历满分封顶年限（≥5 年满分） */
const SENIORITY_CAP_YEARS = 5;

/** 榜单条目（公开·不含任何收入/资金字段） */
export interface LecturerRankingItem {
  rank: number;
  userId: string;
  nickname: string;
  avatar: string | null;
  lecturerLevel: string;
  /** 加权总分 0-100，1 位小数 */
  score: number;
  /** 四维分值（各自归一化到 0-100，1 位小数）：任务40% + 授课30% + 驿站20% + 资历10% */
  dims: { tasks: number; events: number; stations: number; seniority: number };
  tasksCompleted: number;
  eventCount: number;
  stationCount: number;
  joinYear: number;
}

export interface LecturerRankingsResponse {
  items: LecturerRankingItem[];
  updatedAt: string;
}

/** 研究院保证金固定金额（元）——服务端定价，杜绝客户端传任意/负数金额 */
const INSTITUTE_DEFAULT_DEPOSIT = 10000;

@Injectable()
export class InstituteService {
  private readonly logger = new Logger(InstituteService.name);
  constructor(
    private prisma: PrismaService,
    @Optional() private fundApproval?: FundApprovalService,
    @Optional() private redis?: RedisService,
    @Optional() private assessment?: InstituteAssessmentService,
  ) {}

  // ════════════════════════════════════════
  // 公开页
  // ════════════════════════════════════════

  async getIntro() {
    const institute = await this.prisma.institute.findFirst({
      select: {
        id: true, name: true, intro: true, logo: true,
        legalEntity: true, status: true, createdAt: true,
        _count: { select: { members: true, events: true, courses: true } },
      },
    });
    if (!institute) throw new BusinessException(ErrorCode.NOT_FOUND, "研究院尚未建立");

    // 管理层列表
    const management = await this.prisma.instituteMember.findMany({
      where: { role: { in: MGMT_ROLES }, status: "ACTIVE" },
      select: { id: true, role: true, user: { select: { id: true, nickname: true, avatar: true } } },
    });

    return { ...institute, management };
  }

  async getTalentPool(params: { level?: string; page: number; pageSize: number }) {
    const { level } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.InstituteMemberWhereInput = {
      lecturerLevel: { notIn: ["NONE"] },
      status: "ACTIVE",
    };
    if (level) where.lecturerLevel = level;

    const [teachers, total] = await Promise.all([
      this.prisma.instituteMember.findMany({
        where,
        select: {
          id: true, lecturerLevel: true,
          user: { select: { id: true, nickname: true, avatar: true } },
        },
        skip,
        take: pageSize,
        orderBy: { lecturerLevel: "asc" },
      }),
      this.prisma.instituteMember.count({ where }),
    ]);
    return { teachers, total, page, pageSize };
  }

  // ───────── 讲师影响力榜单（T9-P0a·公开·学术榜单不谈钱：不聚合不返回任何收入字段）─────────

  /**
   * 讲师影响力榜单（默认当年，Redis 缓存 1h）。
   * 聚合对象：ACTIVE 且 lecturerLevel≠NONE 的研究院成员。
   * 计分：各维度归一化到 0-100 后加权 —— 任务完成 40% + 授课场次 30% + 驿站覆盖 20% + 资历年限 10%（封顶 5 年满分）。
   */
  async getRankings(year?: number): Promise<LecturerRankingsResponse> {
    const nowYear = new Date().getFullYear();
    // 参数防御：非法/越界年份回落到当年
    const y = year && Number.isFinite(year) && year >= 2000 && year <= nowYear + 1 ? Math.floor(year) : nowYear;

    const cacheKey = `institute:rankings:${y}`;
    if (this.redis) {
      const cached = await this.redis.getJson<LecturerRankingsResponse>(cacheKey);
      if (cached) return cached;
    }

    const data = await this.buildRankings(y);
    if (this.redis) await this.redis.setJson(cacheKey, data, RANKINGS_CACHE_TTL);
    return data;
  }

  private async buildRankings(year: number): Promise<LecturerRankingsResponse> {
    const updatedAt = new Date().toISOString();

    const members = await this.prisma.instituteMember.findMany({
      where: { status: "ACTIVE", lecturerLevel: { notIn: ["NONE"] } },
      select: {
        userId: true,
        lecturerLevel: true,
        tasksCompleted: true,
        joinYear: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
    if (!members.length) return { items: [], updatedAt };

    const userIds = members.map((m) => m.userId);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    // 当年授课场次（含已排期/进行中/已完成，不含已取消）+ 在岗驿站覆盖数
    const [eventGroups, stationGroups] = await Promise.all([
      this.prisma.instituteEvent.groupBy({
        by: ["lecturerId"],
        where: {
          lecturerId: { in: userIds },
          status: { in: ["COMPLETED", "ONGOING", "SCHEDULED"] },
          scheduleAt: { gte: yearStart, lt: yearEnd },
        },
        _count: { _all: true },
      }),
      this.prisma.stationTeacher.groupBy({
        by: ["sourceUserId"],
        where: { sourceUserId: { in: userIds }, status: "ACTIVE" },
        _count: { _all: true },
      }),
    ]);
    const eventMap = new Map<string, number>();
    for (const g of eventGroups) if (g.lecturerId) eventMap.set(g.lecturerId, g._count._all);
    const stationMap = new Map<string, number>();
    for (const g of stationGroups) if (g.sourceUserId) stationMap.set(g.sourceUserId, g._count._all);

    const rows = members.map((m) => {
      const eventCount = eventMap.get(m.userId) || 0;
      const stationCount = stationMap.get(m.userId) || 0;
      // 资历年限：加入当年即算 1 年，封顶 5 年
      const seniorityYears = Math.min(Math.max(year - m.joinYear + 1, 0), SENIORITY_CAP_YEARS);
      return { member: m, eventCount, stationCount, seniorityYears };
    });

    const maxTasks = Math.max(...rows.map((r) => r.member.tasksCompleted), 1);
    const maxEvents = Math.max(...rows.map((r) => r.eventCount), 1);
    const maxStations = Math.max(...rows.map((r) => r.stationCount), 1);

    const round1 = (n: number) => Math.round(n * 10) / 10;

    const scored = rows.map((r) => {
      const dims = {
        tasks: round1((r.member.tasksCompleted / maxTasks) * 100),
        events: round1((r.eventCount / maxEvents) * 100),
        stations: round1((r.stationCount / maxStations) * 100),
        seniority: round1((r.seniorityYears / SENIORITY_CAP_YEARS) * 100),
      };
      const score = round1(dims.tasks * 0.4 + dims.events * 0.3 + dims.stations * 0.2 + dims.seniority * 0.1);
      return { ...r, dims, score };
    });

    // 总分降序；同分按任务数降序、资历（加入年份早者）优先
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        b.member.tasksCompleted - a.member.tasksCompleted ||
        a.member.joinYear - b.member.joinYear,
    );

    const items: LecturerRankingItem[] = scored.map((r, i) => ({
      rank: i + 1,
      userId: r.member.userId,
      nickname: r.member.user?.nickname || "研究院讲师",
      avatar: r.member.user?.avatar ?? null,
      lecturerLevel: r.member.lecturerLevel,
      score: r.score,
      dims: r.dims,
      tasksCompleted: r.member.tasksCompleted,
      eventCount: r.eventCount,
      stationCount: r.stationCount,
      joinYear: r.member.joinYear,
    }));

    return { items, updatedAt };
  }

  // ════════════════════════════════════════
  // 加入
  // ════════════════════════════════════════

  async join(userId: string, dto: { role: string; joinYear: number; deposit?: number; seatType?: string }) {
    const institute = await this.prisma.institute.findFirst();
    if (!institute) throw new BusinessException(ErrorCode.NOT_FOUND, "研究院尚未建立");

    // 多院化约束（V4 拍板）：同院内一人一席（复合唯一 instituteId+userId），跨院可多入
    const existing = await this.prisma.instituteMember.findFirst({
      where: { instituteId: institute.id, userId },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "已是研究院成员");

    // 越权防护：管理层角色只能由现任管理层经 assignMemberRole 任命，禁止自助申请时自封
    if (MGMT_ROLES.includes(dto.role as InstituteRole)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "管理层角色（主席/副主席/秘书长）只能由现任管理层任命，不能自助申请");
    }

    // T9-P1 双轨席位：讲席五维/研修席三维准入·服务端强制校验（不合格 400 带未通过项）
    const seatType = dto.seatType === "STUDY" ? "STUDY" : "LECTURE";
    if (this.assessment) {
      const elig = await this.assessment.getEligibility(userId, seatType);
      if (!elig.eligible) {
        const failed = elig.checks.filter((c) => !c.pass).map((c) => c.label).join("；");
        throw new BusinessException(ErrorCode.BAD_REQUEST, `入会条件未满足：${failed}`);
      }
    }

    // 默认一年有效期
    const expireAt = new Date(`${dto.joinYear}-12-31T23:59:59`);

    const member = await this.prisma.instituteMember.create({
      data: {
        instituteId: institute.id,
        userId,
        role: dto.role as InstituteRole,
        seatType,
        joinYear: dto.joinYear,
        deposit: INSTITUTE_DEFAULT_DEPOSIT, // 服务端固定，不信客户端
        tasksRequired: 3,
        status: "PENDING", // 申请入会先进入待审核，管理层通过后转 ACTIVE
        expireAt,
      },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });

    // 圈层社交地基（§3.6.5）：研究院有专属大圈时，入会自动入圈（幂等）
    if (institute.circleId) {
      await this.autoJoinInstituteCircle(institute.circleId, userId);
    }
    return member;
  }

  /**
   * 特邀席位（§3.2 V6·平台管理角色专用）：名师破格引入——跳过全部准入门槛（不走 eligibility），
   * 直接建 ACTIVE 会籍；feeExempt=true 时 deposit=0 且无到期时间（永久免会费·豁免返还与转席，
   * 分享积分照记进榜单）；invitedBy/inviteRemark 操作留痕。
   */
  async inviteMember(
    operatorUserId: string,
    dto: { userId: string; seatType?: string; feeExempt?: boolean; remark?: string },
  ) {
    const institute = await this.prisma.institute.findFirst();
    if (!institute) throw new BusinessException(ErrorCode.NOT_FOUND, "研究院尚未建立");

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "被特邀用户不存在");

    // 同院重复会籍拒（复合唯一 instituteId+userId 语义）
    const existing = await this.prisma.instituteMember.findFirst({
      where: { instituteId: institute.id, userId: dto.userId },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户已是研究院成员");

    const seatType = dto.seatType === "STUDY" ? "STUDY" : "LECTURE";
    const feeExempt = dto.feeExempt === true;
    const joinYear = new Date().getFullYear();

    let member;
    try {
      member = await this.prisma.instituteMember.create({
        data: {
          instituteId: institute.id,
          userId: dto.userId,
          role: "TYPE_A", // 特邀名师按潜力讲师角色入册（管理层角色仍须任命流程）
          seatType,
          joinYear,
          deposit: feeExempt ? 0 : 10000,
          feeExempt,
          invitedBy: operatorUserId,
          inviteRemark: dto.remark || null,
          tasksRequired: 3,
          status: "ACTIVE", // 特邀直接生效，无需审核
          expireAt: feeExempt ? null : new Date(`${joinYear}-12-31T23:59:59`),
        },
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
      });
    } catch (e: unknown) {
      // 并发防重：复合唯一约束冲突 = 已有会籍
      if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户已是研究院成员");
      throw e;
    }

    // 复用入会自动入专属大圈（幂等）
    if (institute.circleId) {
      await this.autoJoinInstituteCircle(institute.circleId, dto.userId);
    }
    return member;
  }

  /** 入会自动入研究院专属大圈（prisma 直建 CircleMember·照圈子模块字段惯例·幂等） */
  private async autoJoinInstituteCircle(circleId: string, userId: string) {
    const exist = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (exist) return;
    // 治理 #10 旁路补全（2026-07-11）：被移出且禁入者不自动入圈——静默跳过不阻断研究院入会主流程
    const ban = await this.prisma.circleViolation.findFirst({
      where: { circleId, userId, type: "REMOVE", status: "ACTIVE" },
      select: { id: true },
    });
    if (ban) {
      this.logger.warn(`用户 ${userId} 在圈子 ${circleId} 有禁入记录，跳过研究院自动入圈`);
      return;
    }
    try {
      await this.prisma.$transaction([
        this.prisma.circleMember.create({ data: { circleId, userId, role: "MEMBER" } }),
        this.prisma.circle.update({ where: { id: circleId }, data: { memberCount: { increment: 1 } } }),
      ]);
    } catch (e: unknown) {
      // 并发下唯一约束冲突 = 已在圈内，幂等忽略
      if (!isUniqueConstraintError(e)) throw e;
    }
  }

  // ════════════════════════════════════════
  // 成员个人中心
  // ════════════════════════════════════════

  async getMyDashboard(userId: string) {
    // 多院化：userId 不再全局唯一，按最早加入的会籍展示（现阶段单院数据行为不变）
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      include: {
        institute: { select: { id: true, name: true } },
        tasks: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!member) return null;

    // 计算任务进度
    const verifiedCount = member.tasks.filter(t => t.status === "VERIFIED").length;
    const completedCount = member.tasks.filter(t => t.status === "COMPLETED").length;

    // 检查续费状态
    const now = new Date();
    const isExpiring = member.expireAt ? member.expireAt <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : false;
    const isExpired = member.expireAt ? member.expireAt < now : false;

    // 当前没有研究院线上支付订单，deposit 仅为历史名义金额，绝不能当作已收款或可退款凭证。
    return {
      ...member,
      taskProgress: { total: member.tasksRequired, completed: completedCount, verified: verifiedCount },
      depositStatus: {
        deposited: 0,
        refunded: false,
        canRefund: false,
        refundCondition: "线上会费收退款尚未开放，当前没有可退线上订单",
      },
      expireStatus: { isExpiring, isExpired, expireAt: member.expireAt },
    };
  }

  async getMyTasks(userId: string) {
    // 多院化：findFirst（按最早会籍·现阶段单院行为不变）
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      select: { id: true },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "不是研究院成员");

    const tasks = await this.prisma.instituteTask.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
    });

    // 获取任务模板（平台标准）
    const templates = await this.prisma.instituteTaskTemplate.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
    });

    return { tasks, templates };
  }

  async requestDepositRefund(_userId: string) {
    // 资金铁律：没有真实支付订单与退款流水时，绝不写“已退款”状态。
    throw new BusinessException(
      ErrorCode.BAD_REQUEST,
      "研究院线上会费收退款尚未开放；如有线下缴费凭证，请联系平台客服人工核验",
    );
  }

  async getMyDividends(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { userId };
    const [dividends, total] = await Promise.all([
      this.prisma.instituteDividend.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.instituteDividend.count({ where }),
    ]);
    return { dividends, total, page, pageSize };
  }

  // ════════════════════════════════════════
  // 管理层中心
  // ════════════════════════════════════════

  /**
   * 管理层守卫。
   * @param opts.asAdmin 平台管理角色豁免（SUPER_ADMIN/OPERATION_ADMIN/FINANCE_ADMIN·由 controller 判角色后传入，
   *        service 不自行判角色）：无需研究院会籍即可进入，视角落到默认研究院。C 端调用不传 opts，行为零变化。
   */
  private async assertManagement(userId: string, opts?: { asAdmin?: boolean }) {
    if (opts?.asAdmin) {
      const institute = await this.prisma.institute.findFirst({ select: { id: true } });
      if (!institute) throw new BusinessException(ErrorCode.NOT_FOUND, "研究院尚未建立");
      return { id: "", instituteId: institute.id, role: "PRESIDENT" as InstituteRole, status: "ACTIVE" };
    }
    // 多院化：直接按「ACTIVE 管理层会籍」查找（findFirst·防止 PENDING 记录绕过授权的语义不变）
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId, status: "ACTIVE", role: { in: MGMT_ROLES } },
      select: { id: true, instituteId: true, role: true, status: true },
    });
    if (!member) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅研究院管理层可操作");
    }
    return member;
  }

  async getManageOverview(userId: string) {
    const mgr = await this.assertManagement(userId);
    const instituteId = mgr.instituteId;

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [totalMembers, activeMembers, expiringMembers, totalEvents, financeSummary] = await Promise.all([
      this.prisma.instituteMember.count({ where: { instituteId } }),
      this.prisma.instituteMember.count({ where: { instituteId, status: "ACTIVE" } }),
      this.prisma.instituteMember.count({
        where: { instituteId, status: "ACTIVE", expireAt: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.instituteEvent.count({ where: { instituteId, scheduleAt: { gte: yearStart } } }),
      this.prisma.instituteRevenue.aggregate({
        where: { instituteId, createdAt: { gte: yearStart } },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalMembers,
      activeMembers,
      expiringMembers,
      yearEvents: totalEvents,
      yearRevenue: financeSummary._sum.amount || 0,
    };
  }

  async getPendingMembers(userId: string) {
    await this.assertManagement(userId);
    return this.prisma.instituteMember.findMany({
      where: { status: "PENDING" as any },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
      orderBy: { joinedAt: "desc" },
    });
  }

  async approveMember(userId: string, memberId: string, status: string, _reason?: string) {
    await this.assertManagement(userId);
    const member = await this.prisma.instituteMember.findUnique({ where: { id: memberId } });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    if (member.userId === userId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能审批自己的成员申请");

    return this.prisma.instituteMember.update({
      where: { id: memberId },
      data: { status },
    });
  }

  async assignMemberRole(userId: string, memberId: string, role: string) {
    await this.assertManagement(userId);
    if (!MGMT_ROLES.includes(role as InstituteRole)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "仅可任命主席/副主席/秘书长");
    }
    const existing = await this.prisma.instituteMember.findUnique({ where: { id: memberId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "书院成员不存在");
    return this.prisma.instituteMember.update({
      where: { id: memberId },
      data: { role: role as InstituteRole },
    });
  }

  async getFinanceOverview(userId: string, period?: string, opts?: { asAdmin?: boolean }) {
    // 财务概览（只读）：平台管理角色可 asAdmin 豁免会籍；分红发放等资金写操作不豁免，仍须真实管理层会籍
    await this.assertManagement(userId, opts);
    const where: Prisma.InstituteRevenueWhereInput = {};
    const dividendWhere: Prisma.InstituteDividendWhereInput = {};

    if (period) {
      // period format: 2026-Q1 or 2026
      if (period.includes("-Q")) {
        const [year, q] = period.split("-Q");
        const quarterStart = new Date(+year, (+q - 1) * 3, 1);
        const quarterEnd = new Date(+year, +q * 3, 0);
        where.createdAt = { gte: quarterStart, lte: quarterEnd };
        dividendWhere.createdAt = { gte: quarterStart, lte: quarterEnd };
      } else {
        const yearStart = new Date(+period, 0, 1);
        const yearEnd = new Date(+period, 11, 31);
        where.createdAt = { gte: yearStart, lte: yearEnd };
        dividendWhere.createdAt = { gte: yearStart, lte: yearEnd };
      }
    }

    const [revenue, dividends, revenueAgg] = await Promise.all([
      this.prisma.instituteRevenue.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
      this.prisma.instituteDividend.findMany({ where: dividendWhere, include: { user: { select: { id: true, nickname: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
      this.prisma.instituteRevenue.aggregate({ where, _sum: { amount: true } }),
    ]);

    const totalRevenue = revenueAgg._sum.amount || 0;
    const platformShare = Number(totalRevenue) * 0.5;
    const instituteShare = Number(totalRevenue) * 0.5;
    const totalDividends = dividends.reduce((sum, d) => sum + Number(d.amount), 0);

    return {
      totalRevenue,
      platformShare,
      instituteShare,
      totalDividends,
      remaining: instituteShare - totalDividends,
      revenues: revenue,
      dividends,
    };
  }

  /**
   * 发起分红发放审批（不立即发放）。校验管理层身份后创建 FundApproval(PENDING)，
   * 审批通过后由 FundApprovalExecutor 调用 createDividend 真正发放。
   */
  async requestDividend(userId: string, dto: { userId: string; type: string; amount: number; description?: string; period?: string }) {
    const mgr = await this.assertManagement(userId);
    if (!this.fundApproval) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批服务不可用");
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "发放金额必须大于 0");
    }

    // 资金双查：只能从同院已入账留存中发起审批，名义会费与申请金额绝不计入余额。
    const [revenueAgg, dividendAgg] = await Promise.all([
      this.prisma.instituteRevenue.aggregate({
        where: { instituteId: mgr.instituteId },
        _sum: { amount: true },
      }),
      this.prisma.instituteDividend.aggregate({
        where: { instituteId: mgr.instituteId },
        _sum: { amount: true },
      }),
    ]);
    const instituteShare = Number(revenueAgg._sum.amount || 0) * 0.5;
    const distributed = Number(dividendAgg._sum.amount || 0);
    const remaining = Math.max(0, instituteShare - distributed);
    if (dto.amount > remaining) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `可分配余额不足，当前为 ¥${remaining.toFixed(2)}`);
    }

    return this.fundApproval.create({
      type: "DIVIDEND",
      payload: {
        instituteId: mgr.instituteId,
        userId: dto.userId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        period: dto.period,
      },
      amount: dto.amount,
      summary: `研究院发放分红/奖励 ¥${dto.amount}（对象用户 ${dto.userId}，类型 ${dto.type}）`,
      requestedBy: userId,
    });
  }

  async createDividend(userId: string, dto: { userId: string; type: string; amount: number; description?: string; period?: string }) {
    const mgr = await this.assertManagement(userId);
    return this.prisma.instituteDividend.create({
      data: {
        instituteId: mgr.instituteId,
        userId: dto.userId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        period: dto.period,
      },
    });
  }

  async recommendToTalentPool(userId: string, memberId: string, lecturerLevel: string) {
    await this.assertManagement(userId);
    const existing = await this.prisma.instituteMember.findUnique({ where: { id: memberId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "书院成员不存在");
    if (existing.userId === userId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能推荐自己进入人才库");
    return this.prisma.instituteMember.update({
      where: { id: memberId },
      data: { lecturerLevel },
    });
  }

  // ════════════════════════════════════════
  // 任务模板管理
  // ════════════════════════════════════════

  async listTaskTemplates() {
    return this.prisma.instituteTaskTemplate.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async createTaskTemplate(dto: { taskType: string; title: string; description?: string; requiredCount?: number; periodUnit?: string; sortOrder?: number }) {
    return this.prisma.instituteTaskTemplate.create({ data: dto });
  }

  async updateTaskTemplate(id: string, dto: { taskType?: string; title?: string; description?: string; requiredCount?: number; periodUnit?: string; sortOrder?: number; status?: string }) {
    const existing = await this.prisma.instituteTaskTemplate.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "任务模板不存在");
    return this.prisma.instituteTaskTemplate.update({ where: { id }, data: dto });
  }

  // ════════════════════════════════════════
  // 基础CRUD（保留）
  // ════════════════════════════════════════

  async getMember(memberId: string) {
    const member = await this.prisma.instituteMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        tasks: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");

    // 签约讲师：补充已入驻的驿站（研究院→驿站供给闭环可视化）
    let enrolledStations: { stationId: string; name: string }[] = [];
    if (member.lecturerLevel === "SIGNED") {
      const sts = await this.prisma.stationTeacher.findMany({
        where: { sourceUserId: member.userId, status: "ACTIVE" },
        select: { stationId: true, station: { select: { name: true } } },
      });
      enrolledStations = sts.map((s) => ({ stationId: s.stationId, name: s.station?.name || "" }));
    }
    return { ...member, enrolledStations };
  }

  async updateMember(memberId: string, dto: { role?: string; status?: string; deposit?: number }) {
    const member = await this.prisma.instituteMember.findUnique({ where: { id: memberId } });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    return this.prisma.instituteMember.update({
      where: { id: memberId },
      data: {
        ...(dto.role ? { role: dto.role as InstituteRole } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.deposit !== undefined ? { deposit: dto.deposit } : {}),
      },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });
  }

  async getMyMembership(userId: string) {
    return this.getMyDashboard(userId);
  }

  async listMembers(params: { role?: string; status?: string; joinYear?: number; page?: number; pageSize?: number }) {
    const { role, status, joinYear } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.InstituteMemberWhereInput = {};
    if (role) where.role = role as InstituteRole;
    if (status) where.status = status;
    if (joinYear) where.joinYear = joinYear;

    const [members, total] = await Promise.all([
      this.prisma.instituteMember.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip,
        take: pageSize,
        orderBy: { joinedAt: "desc" },
      }),
      this.prisma.instituteMember.count({ where }),
    ]);
    return { members, total, page, pageSize };
  }

  async updateLecturerLevel(memberId: string, dto: { lecturerLevel: string }) {
    const member = await this.prisma.instituteMember.findUnique({ where: { id: memberId } });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    return this.prisma.instituteMember.update({
      where: { id: memberId },
      data: { lecturerLevel: dto.lecturerLevel },
    });
  }

  // ───────── 任务管理 ─────────

  async addTask(memberId: string, dto: { taskType: string; title: string; description?: string }) {
    return this.prisma.instituteTask.create({
      data: { memberId, taskType: dto.taskType, title: dto.title, description: dto.description, status: "PENDING" },
    });
  }

  async completeTask(taskId: string, userId: string) {
    const task = await this.prisma.instituteTask.findUnique({
      where: { id: taskId },
      include: { member: true },
    });
    if (!task) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
    if (task.member.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能完成自己的任务");
    if (task.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "任务状态不允许");

    const updated = await this.prisma.instituteTask.update({
      where: { id: taskId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await this.prisma.instituteMember.update({
      where: { id: task.memberId },
      data: { tasksCompleted: { increment: 1 } },
    });
    return updated;
  }

  async verifyTask(taskId: string, verifierId: string) {
    const task = await this.prisma.instituteTask.findUnique({
      where: { id: taskId }, include: { member: true },
    });
    if (!task) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
    if (task.status !== "COMPLETED") throw new BusinessException(ErrorCode.BAD_REQUEST, "任务尚未完成，无法验证");

    return this.prisma.instituteTask.update({
      where: { id: taskId },
      data: { status: "VERIFIED", verifiedBy: verifierId },
    });
  }

  // ───────── 活动排期 ─────────

  async createEvent(userId: string, dto: { title: string; type: string; lecturerId?: string; description?: string; location?: string; scheduleAt: string; maxAttendees?: number; instituteId?: string }) {
    const mgr = await this.assertManagement(userId);
    const instituteId = dto.instituteId || mgr.instituteId;
    return this.prisma.instituteEvent.create({
      data: {
        title: dto.title, type: dto.type, lecturerId: dto.lecturerId,
        description: dto.description, location: dto.location,
        scheduleAt: new Date(dto.scheduleAt), maxAttendees: dto.maxAttendees || 50,
        instituteId,
      },
    });
  }

  async listEvents(params: { type?: string; status?: string; upcoming?: boolean; page?: number; pageSize?: number }) {
    const { type, status, upcoming } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.InstituteEventWhereInput = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (upcoming) where.scheduleAt = { gte: new Date() };

    const [events, total] = await Promise.all([
      this.prisma.instituteEvent.findMany({
        where,
        skip, take: pageSize,
        orderBy: { scheduleAt: "asc" },
      }),
      this.prisma.instituteEvent.count({ where }),
    ]);
    return { events, total, page, pageSize };
  }

  async getEvent(id: string) {
    const event = await this.prisma.instituteEvent.findUnique({
      where: { id },
      include: { institute: { select: { id: true, name: true, logo: true } } },
    });
    if (!event) throw new BusinessException(ErrorCode.NOT_FOUND, "活动不存在");
    // 讲师信息（lecturerId 存的是 user.id）
    let lecturer: { id: string; nickname: string; avatar: string | null } | null = null;
    if (event.lecturerId) {
      lecturer = await this.prisma.user.findUnique({
        where: { id: event.lecturerId },
        select: { id: true, nickname: true, avatar: true },
      });
    }
    return { ...event, lecturer };
  }

  async updateEvent(id: string, dto: { status?: string; title?: string; description?: string; location?: string }) {
    const existing = await this.prisma.instituteEvent.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "活动不存在");
    const updated = await this.prisma.instituteEvent.update({ where: { id }, data: dto as Prisma.InstituteEventUpdateInput });

    // T9-P1 自动记分挂点：状态首次流转到 COMPLETED 时给讲师记分享积分（refId=eventId 幂等查重）
    if (this.assessment && dto.status === "COMPLETED" && existing.status !== "COMPLETED") {
      await this.assessment.awardEventPointsForCompletedEvent({
        id: updated.id,
        type: updated.type,
        title: updated.title,
        lecturerId: updated.lecturerId,
        instituteId: updated.instituteId,
      });
    }
    return updated;
  }

  // ───────── 选拔路径 ─────────

  // ───────── 签约讲师库（供驿站选用·研究院→驿站师资供给闭环）─────────

  async getSignedLecturers() {
    const lecturers = await this.prisma.instituteMember.findMany({
      where: { lecturerLevel: "SIGNED", status: "ACTIVE" },
      select: {
        id: true,
        userId: true,
        lecturerLevel: true,
        joinYear: true,
        tasksCompleted: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    // 每位签约讲师已入驻的驿站
    const userIds = lecturers.map((l) => l.userId);
    const enrolled = userIds.length
      ? await this.prisma.stationTeacher.findMany({
          where: { sourceUserId: { in: userIds }, status: "ACTIVE" },
          select: { sourceUserId: true, stationId: true, station: { select: { id: true, name: true } } },
        })
      : [];

    return lecturers.map((l) => ({
      ...l,
      enrolledStations: enrolled
        .filter((e) => e.sourceUserId === l.userId)
        .map((e) => ({ stationId: e.stationId, name: e.station?.name || "" })),
    }));
  }

  async getSigningCandidates() {
    return this.prisma.instituteMember.findMany({
      where: {
        role: { in: ["TYPE_A", "INITIATOR"] as InstituteRole[] },
        tasksCompleted: { gte: 3 },
        lecturerLevel: { notIn: ["SIGNED", "NONE"] },
      },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
      orderBy: { tasksCompleted: "desc" },
    });
  }
}
