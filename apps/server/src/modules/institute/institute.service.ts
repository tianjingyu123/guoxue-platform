import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, InstituteRole } from "@prisma/client";

const MGMT_ROLES: InstituteRole[] = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"];

@Injectable()
export class InstituteService {
  constructor(private prisma: PrismaService) {}

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
    const { level, page, pageSize } = params;
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
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { lecturerLevel: "asc" },
      }),
      this.prisma.instituteMember.count({ where }),
    ]);
    return { teachers, total, page, pageSize };
  }

  // ════════════════════════════════════════
  // 加入
  // ════════════════════════════════════════

  async join(userId: string, dto: { role: string; joinYear: number; deposit?: number }) {
    const existing = await this.prisma.instituteMember.findUnique({ where: { userId } });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "已是研究院成员");

    const institute = await this.prisma.institute.findFirst();
    if (!institute) throw new BusinessException(ErrorCode.NOT_FOUND, "研究院尚未建立");

    // 默认一年有效期
    const expireAt = new Date(`${dto.joinYear}-12-31T23:59:59`);

    return this.prisma.instituteMember.create({
      data: {
        instituteId: institute.id,
        userId,
        role: dto.role as InstituteRole,
        joinYear: dto.joinYear,
        deposit: dto.deposit || 10000,
        tasksRequired: 3,
        expireAt,
      },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });
  }

  // ════════════════════════════════════════
  // 成员个人中心
  // ════════════════════════════════════════

  async getMyDashboard(userId: string) {
    const member = await this.prisma.instituteMember.findUnique({
      where: { userId },
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

    // 所有任务已验证 → 可退保证金
    const canRefund = !member.depositRefunded && verifiedCount >= member.tasksRequired;

    return {
      ...member,
      taskProgress: { total: member.tasksRequired, completed: completedCount, verified: verifiedCount },
      depositStatus: {
        deposited: Number(member.deposit),
        refunded: member.depositRefunded,
        canRefund,
        refundCondition: `完成${member.tasksRequired}项年度任务且全部通过验证`,
      },
      expireStatus: { isExpiring, isExpired, expireAt: member.expireAt },
    };
  }

  async getMyTasks(userId: string) {
    const member = await this.prisma.instituteMember.findUnique({
      where: { userId },
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

  async requestDepositRefund(userId: string) {
    const member = await this.prisma.instituteMember.findUnique({
      where: { userId },
      include: { tasks: true },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "不是研究院成员");
    if (member.depositRefunded) throw new BusinessException(ErrorCode.BAD_REQUEST, "保证金已退还");

    const verifiedCount = member.tasks.filter(t => t.status === "VERIFIED").length;
    if (verifiedCount < member.tasksRequired) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `还需完成${member.tasksRequired - verifiedCount}项任务`);
    }

    await this.prisma.instituteMember.update({
      where: { id: member.id },
      data: { depositRefunded: true, status: "GRADUATED" },
    });

    return { success: true, message: "保证金退还申请已提交" };
  }

  async getMyDividends(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [dividends, total] = await Promise.all([
      this.prisma.instituteDividend.findMany({
        where,
        skip: (page - 1) * pageSize,
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

  private async assertManagement(userId: string) {
    const member = await this.prisma.instituteMember.findUnique({
      where: { userId },
      select: { id: true, instituteId: true, role: true },
    });
    if (!member || !MGMT_ROLES.includes(member.role as InstituteRole)) {
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

  async approveMember(userId: string, memberId: string, status: string, reason?: string) {
    await this.assertManagement(userId);
    const member = await this.prisma.instituteMember.findUnique({ where: { id: memberId } });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");

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
    return this.prisma.instituteMember.update({
      where: { id: memberId },
      data: { role: role as InstituteRole },
    });
  }

  async getFinanceOverview(userId: string, period?: string) {
    await this.assertManagement(userId);
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
    return member;
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
    const { role, status, joinYear, page = 1, pageSize = 20 } = params;
    const where: Prisma.InstituteMemberWhereInput = {};
    if (role) where.role = role as InstituteRole;
    if (status) where.status = status;
    if (joinYear) where.joinYear = joinYear;

    const [members, total] = await Promise.all([
      this.prisma.instituteMember.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize,
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
    const { type, status, upcoming, page = 1, pageSize = 20 } = params;
    const where: Prisma.InstituteEventWhereInput = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (upcoming) where.scheduleAt = { gte: new Date() };

    const [events, total] = await Promise.all([
      this.prisma.instituteEvent.findMany({
        where,
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { scheduleAt: "asc" },
      }),
      this.prisma.instituteEvent.count({ where }),
    ]);
    return { events, total, page, pageSize };
  }

  async updateEvent(id: string, dto: { status?: string; title?: string; description?: string; location?: string }) {
    return this.prisma.instituteEvent.update({ where: { id }, data: dto as Prisma.InstituteEventUpdateInput });
  }

  // ───────── 选拔路径 ─────────

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
