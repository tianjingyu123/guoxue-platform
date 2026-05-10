import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class InstituteService {
  constructor(private prisma: PrismaService) {}

  // ───────── 成员管理 ─────────

  async join(userId: string, dto: { role: string; joinYear: number; deposit?: number }) {
    const existing = await this.prisma.instituteMember.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException("已是研究院成员");

    return this.prisma.instituteMember.create({
      data: {
        userId,
        role: dto.role as any,
        joinYear: dto.joinYear,
        deposit: dto.deposit || 10000,
        tasksRequired: 3, // 默认3项年度任务
      },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });
  }

  async getMember(memberId: string) {
    const member = await this.prisma.instituteMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        tasks: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!member) throw new NotFoundException("成员不存在");
    return member;
  }

  async getMyMembership(userId: string) {
    return this.prisma.instituteMember.findUnique({
      where: { userId },
      include: { tasks: { orderBy: { createdAt: "desc" } } },
    });
  }

  async listMembers(params: { role?: string; status?: string; joinYear?: number; page?: number; pageSize?: number }) {
    const { role, status, joinYear, page = 1, pageSize = 20 } = params;
    const where: Prisma.InstituteMemberWhereInput = {};
    if (role) where.role = role as any;
    if (status) where.status = status as any;
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
    if (!member) throw new NotFoundException("成员不存在");

    return this.prisma.instituteMember.update({
      where: { id: memberId },
      data: { lecturerLevel: dto.lecturerLevel },
    });
  }

  // ───────── 任务管理 ─────────

  async addTask(memberId: string, dto: { taskType: string; title: string; description?: string }) {
    return this.prisma.instituteTask.create({
      data: {
        memberId,
        taskType: dto.taskType,
        title: dto.title,
        description: dto.description,
        status: "PENDING",
      },
    });
  }

  async completeTask(taskId: string, userId: string) {
    const task = await this.prisma.instituteTask.findUnique({
      where: { id: taskId },
      include: { member: true },
    });
    if (!task) throw new NotFoundException("任务不存在");
    if (task.member.userId !== userId) throw new ForbiddenException("只能完成自己的任务");
    if (task.status !== "PENDING") throw new BadRequestException("任务状态不允许");

    const updated = await this.prisma.instituteTask.update({
      where: { id: taskId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // 更新成员完成任务数
    await this.prisma.instituteMember.update({
      where: { id: task.memberId },
      data: { tasksCompleted: { increment: 1 } },
    });

    return updated;
  }

  async verifyTask(taskId: string, verifierId: string) {
    const task = await this.prisma.instituteTask.findUnique({
      where: { id: taskId },
      include: { member: true },
    });
    if (!task) throw new NotFoundException("任务不存在");
    if (task.status !== "COMPLETED") throw new BadRequestException("任务尚未完成，无法验证");

    const updated = await this.prisma.instituteTask.update({
      where: { id: taskId },
      data: { status: "VERIFIED", verifiedBy: verifierId },
    });

    // 检查是否所有任务都完成，自动退保证金
    const member = await this.prisma.instituteMember.findUnique({
      where: { id: task.memberId },
      include: { tasks: true },
    });
    if (member && member.tasks.filter(t => t.status === "VERIFIED").length >= member.tasksRequired) {
      await this.prisma.instituteMember.update({
        where: { id: member.id },
        data: { depositRefunded: true, status: "GRADUATED" },
      });
    }

    return updated;
  }

  // ───────── 活动排期 ─────────

  async createEvent(dto: { title: string; type: string; lecturerId?: string; description?: string; location?: string; scheduleAt: string; maxAttendees?: number }) {
    return this.prisma.instituteEvent.create({
      data: {
        title: dto.title,
        type: dto.type,
        lecturerId: dto.lecturerId,
        description: dto.description,
        location: dto.location,
        scheduleAt: new Date(dto.scheduleAt),
        maxAttendees: dto.maxAttendees || 50,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
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

  /** 获取候选签约讲师列表（3次高满意度活动） */
  async getSigningCandidates() {
    return this.prisma.instituteMember.findMany({
      where: {
        role: { in: ["TYPE_A", "INITIATOR" as any] },
        tasksCompleted: { gte: 3 },
        lecturerLevel: { notIn: ["SIGNED", "NONE"] },
      },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
      orderBy: { tasksCompleted: "desc" },
    });
  }
}
