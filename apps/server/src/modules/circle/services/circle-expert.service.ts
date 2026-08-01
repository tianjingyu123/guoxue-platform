import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { safePagination } from "../../../common/pagination";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { Prisma } from "@prisma/client";
import { CircleSharedService } from "./circle-shared.service";

/**
 * 圈子-达人咨询与成员分组域（从 circle.service 拆出·纯搬家不改逻辑）。
 * 职责：达人咨询价格配置/达人列表/跨圈咨询服务聚合 + 达人预约时段/下单 + 成员分组 CRUD。
 * 依赖：共享叶子域（ensureMember/checkAdmin）·单向不循环。
 */
@Injectable()
export class CircleExpertService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private shared: CircleSharedService,
  ) {}

  // ───────── 达人咨询配置 ─────────

  async setExpertConfig(circleId: string, userId: string, dto: {
    questionPriceCoin: number;
    peekPriceCoin?: number;
    questionTimeoutHours: number;
    callPricePerMinuteCoin: number;
    callAvailableHours?: Array<{ day: string; start: string; end: string }>;
  }) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    if (!["OWNER", "PARTNER", "GUEST"].includes(member.role)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有圈主、合伙人和嘉宾可以配置咨询价格");
    }

    const updated = await this.prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId } },
      data: {
        questionPriceCoin: dto.questionPriceCoin,
        // 围观价由达人本人定（0=不开放围观）；提问定价权归收款方，见 question.service.ask
        peekPriceCoin: dto.peekPriceCoin ?? 0,
        questionTimeoutHours: dto.questionTimeoutHours,
        callPricePerMinuteCoin: dto.callPricePerMinuteCoin,
        callAvailableHours: dto.callAvailableHours || undefined,
      },
    });

    await this.redis.del(`circles:detail:${circleId}`);
    return updated;
  }

  async getExpertConfig(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: {
        userId: true,
        role: true,
        questionPriceCoin: true,
        peekPriceCoin: true,
        questionTimeoutHours: true,
        callPricePerMinuteCoin: true,
        callAvailableHours: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    return member;
  }

  /** 获取圈子内所有可咨询的达人列表 */
  async listCircleExperts(circleId: string) {
    return this.prisma.circleMember.findMany({
      where: {
        circleId,
        role: { in: ["OWNER", "PARTNER", "GUEST"] },
        OR: [
          { questionPriceCoin: { gt: 0 } },
          { callPricePerMinuteCoin: { gt: 0 } },
        ],
      },
      select: {
        userId: true,
        role: true,
        questionPriceCoin: true,
        peekPriceCoin: true,
        questionTimeoutHours: true,
        callPricePerMinuteCoin: true,
        callAvailableHours: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
  }

  /**
   * 全平台达人列表（跨圈聚合·发现页全局入口用）。
   * 达人判定与 listCircleExperts 一致：角色 ∈ OWNER/PARTNER/GUEST 且 提问价或连麦价 > 0。
   * 必须带回 circle —— 定价按圈子走，前端提问时要用这一项的 circleId 下单。
   */
  async listAllExperts(limit = 50) {
    const take = Math.min(Math.max(Math.trunc(limit) || 50, 1), 100);
    return this.prisma.circleMember.findMany({
      where: {
        role: { in: ["OWNER", "PARTNER", "GUEST"] },
        OR: [
          { questionPriceCoin: { gt: 0 } },
          { callPricePerMinuteCoin: { gt: 0 } },
        ],
      },
      select: {
        circleId: true,
        userId: true,
        role: true,
        questionPriceCoin: true,
        peekPriceCoin: true,
        questionTimeoutHours: true,
        callPricePerMinuteCoin: true,
        circle: { select: { id: true, name: true, cover: true } },
        user: { select: { id: true, nickname: true, avatar: true } },
      },
      orderBy: { questionPriceCoin: "desc" },
      take,
    });
  }

  /**
   * 聚合某用户在所有圈子中开通的达人咨询服务（个人主页"付费咨询"入口用）。
   * 达人判定与 listCircleExperts 一致：角色 ∈ OWNER/PARTNER/GUEST 且 提问价或连麦价 > 0。
   */
  async listUserConsultServices(userId: string) {
    return this.prisma.circleMember.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "PARTNER", "GUEST"] },
        OR: [
          { questionPriceCoin: { gt: 0 } },
          { callPricePerMinuteCoin: { gt: 0 } },
        ],
      },
      select: {
        circleId: true,
        role: true,
        questionPriceCoin: true,
        // 围观价：与 listCircleExperts 口径一致，缺了会导致前端回填时被重置为 0
        peekPriceCoin: true,
        questionTimeoutHours: true,
        callPricePerMinuteCoin: true,
        callAvailableHours: true,
        circle: { select: { id: true, name: true, cover: true } },
        user: { select: { id: true, nickname: true, avatar: true } },
      },
      orderBy: { questionPriceCoin: "desc" },
    });
  }

  // ───────── 成员分组 ─────────

  async createMemberGroup(circleId: string, userId: string, name: string, color?: string) {
    await this.shared.checkAdmin(circleId, userId);
    return this.prisma.circleMemberGroup.create({
      data: { circleId, name, color: color || "#3b82f6" },
    });
  }

  async listMemberGroups(circleId: string) {
    return this.prisma.circleMemberGroup.findMany({
      where: { circleId },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateMemberGroup(circleId: string, groupId: string, userId: string, name?: string, color?: string) {
    await this.shared.checkAdmin(circleId, userId);
    await this.assertGroupInCircle(groupId, circleId);
    const data: Prisma.CircleMemberGroupUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    return this.prisma.circleMemberGroup.update({ where: { id: groupId }, data });
  }

  async deleteMemberGroup(circleId: string, groupId: string, userId: string) {
    await this.shared.checkAdmin(circleId, userId);
    await this.assertGroupInCircle(groupId, circleId);
    await this.prisma.circleMemberGroupRelation.deleteMany({ where: { groupId } });
    await this.prisma.circleMemberGroup.delete({ where: { id: groupId } });
    return { success: true };
  }

  async addMembersToGroup(circleId: string, groupId: string, userId: string, userIds: string[]) {
    await this.shared.checkAdmin(circleId, userId);
    await this.assertGroupInCircle(groupId, circleId);
    const data = userIds.map((uid) => ({ groupId, userId: uid }));
    await this.prisma.circleMemberGroupRelation.createMany({ data, skipDuplicates: true });
    return { success: true };
  }

  async removeMemberFromGroup(circleId: string, groupId: string, userId: string, targetUserId: string) {
    await this.shared.checkAdmin(circleId, userId);
    await this.assertGroupInCircle(groupId, circleId);
    await this.prisma.circleMemberGroupRelation.deleteMany({
      where: { groupId, userId: targetUserId },
    });
    return { success: true };
  }

  async getGroupMembers(circleId: string, groupId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { groupId };
    const [relations, total] = await Promise.all([
      this.prisma.circleMemberGroupRelation.findMany({
        where,
        skip,
        take: pageSize,
      }),
      this.prisma.circleMemberGroupRelation.count({ where }),
    ]);
    const userIds = relations.map((r) => r.userId);
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, nickname: true, avatar: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const members = relations.map((r) => userMap.get(r.userId) || { id: r.userId, nickname: "", avatar: null });
    return { members, total, page, pageSize };
  }

  // ───────── 达人预约 ─────────

  async getExpertSlots(expertId: string, date?: string) {
    const member = await this.prisma.circleMember.findFirst({
      where: { userId: expertId, role: { not: "MEMBER" } },
      include: { circle: true },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "达人不存在或未开通咨询");

    const targetDate = date || new Date().toISOString().slice(0, 10);
    const availableHours = (member.callAvailableHours as any[]) || [];

    // 查询当天已有预约，过滤已占用的时段
    const bookings = await this.prisma.circleExpertBooking.findMany({
      where: {
        expertUserId: expertId,
        slotDate: targetDate,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    const bookedSlots = bookings.map((b) => ({ start: b.slotStart, end: b.slotEnd }));

    // 从 callAvailableHours 生成时段并标记是否已被预约
    const slots = availableHours
      .filter((h: any) => {
        const days = h.days || [0, 1, 2, 3, 4, 5, 6];
        const dayOfWeek = new Date(targetDate).getDay();
        return days.includes(dayOfWeek);
      })
      .flatMap((h: any) => {
        const startH = parseInt(h.start?.split(":")[0] || "9");
        const endH = parseInt(h.end?.split(":")[0] || "18");
        const interval = h.interval || 60;
        const result: { start: string; end: string; available: boolean }[] = [];
        for (let hour = startH; hour < endH; hour += interval / 60) {
          const start = `${String(hour).padStart(2, "0")}:${String((hour % 1) * 60).padStart(2, "0")}`;
          const endHr = hour + interval / 60;
          const end = `${String(Math.floor(endHr)).padStart(2, "0")}:${String((endHr % 1) * 60).padStart(2, "0")}`;
          const isBooked = bookedSlots.some((b) => b.start <= start && b.end >= end);
          result.push({ start, end, available: !isBooked });
        }
        return result;
      });

    return { date: targetDate, expertId, slots };
  }

  async createExpertBooking(
    expertId: string,
    bookerUserId: string,
    body: { slotDate: string; slotStart: string; slotEnd: string; topic?: string; notes?: string },
  ) {
    const member = await this.prisma.circleMember.findFirst({
      where: { userId: expertId, role: { not: "MEMBER" } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "达人不存在或未开通咨询");

    await this.shared.ensureMember(member.circleId, bookerUserId);

    // 检查冲突
    const conflict = await this.prisma.circleExpertBooking.findFirst({
      where: {
        expertUserId: expertId,
        slotDate: body.slotDate,
        slotStart: body.slotStart,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    if (conflict) throw new BusinessException(ErrorCode.CONFLICT, "该时段已被预约");

    return this.prisma.circleExpertBooking.create({
      data: {
        circleId: member.circleId,
        expertUserId: expertId,
        bookerUserId,
        slotDate: body.slotDate,
        slotStart: body.slotStart,
        slotEnd: body.slotEnd,
        topic: body.topic,
        notes: body.notes,
      },
    });
  }

  /** 校验分组属于该圈子，防止跨圈越权操作分组（IDOR） */
  private async assertGroupInCircle(groupId: string, circleId: string) {
    const group = await this.prisma.circleMemberGroup.findUnique({ where: { id: groupId }, select: { circleId: true } });
    if (!group || group.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "分组不存在");
  }
}
