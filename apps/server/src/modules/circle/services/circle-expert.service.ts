import { HttpStatus, Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { safePagination } from "../../../common/pagination";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { Prisma } from "@prisma/client";
import { CircleSharedService } from "./circle-shared.service";
import { circleExpertWhere, lockCircleExpertRows } from "../../../common/circle-expert-availability";
import { buildExpertSlots } from "../../../common/circle-expert-slots";
import { CircleConsultVisibilityService, ConsultCandidate } from "../circle-consult-visibility.service";
import { CircleCapabilityRepository } from "../circle-capability.repository";
import { CircleCapabilityService } from "../circle-capability.service";
import { assertHumanForRedLine, ExecutorType, RedLine } from "../../../common/red-lines";
import { isValidConsultCallPrice } from "../../../common/consult-call-pricing";

const consultCandidateWhere = () => {
  const where = circleExpertWhere();
  delete where.role; // 仅用于候选扫描，必须经过独立能力投影才能返回公开列表。
  return where;
};

/**
 * 圈子-达人咨询与成员分组域（从 circle.service 拆出，咨询新增业务统一校验基础准入）。
 * 职责：达人咨询价格配置/达人列表/跨圈咨询服务聚合 + 达人预约时段/下单 + 成员分组 CRUD。
 * 依赖：共享叶子域（ensureMember/checkAdmin）·单向不循环。
 */
@Injectable()
export class CircleExpertService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private shared: CircleSharedService,
    private visibility: CircleConsultVisibilityService,
    private capabilityRepo: CircleCapabilityRepository,
    private capabilities: CircleCapabilityService,
  ) {}

  // ───────── 达人咨询配置 ─────────

  async setExpertConfig(circleId: string, userId: string, dto: {
    questionPriceCoin: number;
    peekPriceCoin?: number;
    questionTimeoutHours: number;
    callPricePerMinuteCoin: number;
    callAvailableHours?: Array<{ day: string; start: string; end: string }>;
  }, actor: { userId: string; executor: ExecutorType }) {
    assertHumanForRedLine(actor.executor, [RedLine.MONEY]);
    if (![dto.questionPriceCoin, dto.peekPriceCoin ?? 0, dto.callPricePerMinuteCoin].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 2147483647)
      || !isValidConsultCallPrice(dto.callPricePerMinuteCoin, true)
      || !Number.isInteger(dto.questionTimeoutHours) || dto.questionTimeoutHours < 1 || dto.questionTimeoutHours > 720) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "咨询价格或响应时限无效");
    }
    const updated = await this.prisma.$transaction(async tx => {
      await this.capabilityRepo.lockCircle(tx, circleId);
      const circle = await tx.circle.findUnique({ where: { id: circleId }, select: { ownerId: true } });
      if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
      const locked = await this.capabilityRepo.lockPeople(tx, circleId, actor.userId, [userId, circle.ownerId]);
      const operator = locked.userIds.includes(actor.userId) && await tx.user.findFirst({ where: { id: actor.userId, status: "ACTIVE", deletedAt: null }, select: { id: true } });
      const admin = actor.userId !== userId && await tx.userRole.findFirst({ where: { id: { in: locked.roleIds }, userId: actor.userId, bindId: null,
        roleType: { in: ["SUPER_ADMIN", "OPERATION_ADMIN"] } }, select: { id: true } });
      if (!operator || actor.userId !== userId && !admin) throw new BusinessException(ErrorCode.FORBIDDEN, "无权修改该成员咨询设置");
      const base = circleExpertWhere("CONFIG"); delete base.role;
      const member = await tx.circleMember.findFirst({ where: { ...base, id: { in: locked.memberIds }, circleId, userId } });
      if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在或已失效");
      if (!["OWNER", "PARTNER", "GUEST"].includes(member.role) && (dto.questionPriceCoin > 0 || (dto.peekPriceCoin ?? 0) > 0)) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "当前身份未开放图文提问定价，请只配置已授权的音视频服务");
      }
      if (dto.callPricePerMinuteCoin > 0) {
        const [current] = await this.visibility.projectInTransaction(tx, [member]);
        if (!current.audioCallApproved && !current.videoCallApproved) throw new BusinessException(ErrorCode.FORBIDDEN, "音视频服务尚未获准或已停用，可以将连麦价格设为零关闭服务");
        await this.capabilities.assertAuthorizationInTransaction(tx, circleId,
          current.audioCallApproved ? "AUDIO_QUESTION" : "VIDEO_QUESTION", actor, userId);
      }
      return tx.circleMember.update({ where: { id: member.id }, data: {
        questionPriceCoin: dto.questionPriceCoin, peekPriceCoin: dto.peekPriceCoin ?? 0,
        questionTimeoutHours: dto.questionTimeoutHours, callPricePerMinuteCoin: dto.callPricePerMinuteCoin,
        callAvailableHours: dto.callAvailableHours || undefined,
      } });
    }, { timeout: 15000 });

    await this.redis.del(`circles:detail:${circleId}`);
    return updated;
  }

  async getExpertConfig(circleId: string, userId: string) {
    const where = circleExpertWhere("CONFIG"); delete where.role;
    const member = await this.prisma.circleMember.findFirst({
      where: { ...where, circleId, userId },
      select: {
        circleId: true,
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
    return (await this.visibility.project([member]))[0];
  }

  /** 本人可读历史定价以关闭服务；公开查询只显示当前获准价格。 */
  async getOwnExpertConfig(circleId: string, userId: string) {
    const where = circleExpertWhere("CONFIG"); delete where.role;
    const member = await this.prisma.circleMember.findFirst({ where: { ...where, circleId, userId }, select: {
      circleId: true, userId: true, role: true, questionPriceCoin: true, peekPriceCoin: true, questionTimeoutHours: true,
      callPricePerMinuteCoin: true, callAvailableHours: true,
    } });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在或已失效");
    const [current] = await this.visibility.project([member]);
    return { ...member, audioCallApproved: current.audioCallApproved, videoCallApproved: current.videoCallApproved,
      textConfigAllowed: ["OWNER", "PARTNER", "GUEST"].includes(member.role) };
  }

  /** 获取圈子内所有可咨询的达人列表 */
  async listCircleExperts(circleId: string) {
    const rows = await this.prisma.circleMember.findMany({
      where: {
        ...consultCandidateWhere(),
        circleId,
      },
      select: {
        circleId: true,
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
    return this.visibleExperts(rows);
  }

  /**
   * 全平台达人列表（跨圈聚合·发现页全局入口用）。
   * 与圈内列表使用同一可见性投影；平台直授普通成员可以出现，未授权通话价格不构成入口。
   * 必须带回 circle —— 定价按圈子走，前端提问时要用这一项的 circleId 下单。
   */
  async listAllExperts(limit = 50) {
    const take = Math.min(Math.max(Math.trunc(limit) || 50, 1), 100);
    const rows = await this.prisma.circleMember.findMany({
      where: {
        ...consultCandidateWhere(),
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
    return this.visibleExperts(rows);
  }

  /**
   * 聚合某用户在所有圈子中开通的达人咨询服务（个人主页"付费咨询"入口用）。
   * 文字提问保持既有规则；音视频仅显示当前对应授权允许的服务。
   */
  async listUserConsultServices(userId: string) {
    const rows = await this.prisma.circleMember.findMany({
      where: {
        ...consultCandidateWhere(),
        userId,
      },
      select: {
        circleId: true,
        userId: true,
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
    return this.visibleExperts(rows);
  }

  private async visibleExperts<T extends ConsultCandidate>(rows: T[]) {
    return (await this.visibility.project(rows)).filter(row => row.questionPriceCoin > 0 || row.callPricePerMinuteCoin > 0);
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

  private async findBookableExpert(tx: Prisma.TransactionClient, expertId: string, circleId: string) {
    const where = circleExpertWhere("CALL"); delete where.role;
    // 必须使用用户选中的圈子，不能在查时段与提交之间自动切换到另一圈子。
    const rows = await tx.circleMember.findMany({ where: { ...where, userId: expertId, circleId }, take: 1 });
    return (await this.visibility.projectInTransaction(tx, rows)).find(row => row.audioCallEnabled || row.videoCallEnabled) ?? null;
  }

  private requireBookingCircle(circleId: unknown): asserts circleId is string {
    if (typeof circleId !== "string" || !circleId.trim() || circleId !== circleId.trim() || circleId.length > 128) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择本次预约所属圈子");
    }
  }

  async getExpertSlots(expertId: string, date?: string, circleId?: string) {
    this.requireBookingCircle(circleId);
    return this.prisma.$transaction(async tx => {
      const member = await this.findBookableExpert(tx, expertId, circleId);
      if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "达人不存在或未开通咨询");
      const targetDate = date || new Date().toISOString().slice(0, 10);
      // 查询当天已有预约，过滤已占用的时段。
      const bookings = await tx.circleExpertBooking.findMany({ where: {
        expertUserId: expertId, slotDate: targetDate, status: { in: ["PENDING", "CONFIRMED"] },
      } });
      const bookedSlots = bookings.map((b) => ({ start: b.slotStart, end: b.slotEnd }));
      const slots = buildExpertSlots(member.callAvailableHours, targetDate, bookedSlots);
      return { date: targetDate, expertId, circleId: member.circleId, slots };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 });
  }

  async createExpertBooking(
    expertId: string,
    bookerUserId: string,
    body: { circleId: string; slotDate: string; slotStart: string; slotEnd: string; topic?: string; notes?: string },
    executor: ExecutorType = "HUMAN",
  ) {
    assertHumanForRedLine(executor, [RedLine.EXTERNAL_PUBLISH]);
    this.requireBookingCircle(body?.circleId);
    if (!body || typeof body.slotDate !== "string" || typeof body.slotStart !== "string" || typeof body.slotEnd !== "string") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "预约日期或时段无效");
    }
    const day = new Date(`${body.slotDate}T00:00:00Z`);
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.slotDate) || !Number.isFinite(day.getTime()) ||
        day.toISOString().slice(0, 10) !== body.slotDate || !timePattern.test(body.slotStart) ||
        !timePattern.test(body.slotEnd) || body.slotStart >= body.slotEnd) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "预约日期或时段无效");
    }
    return this.prisma.$transaction(async (tx) => {
      // 同一达人同一天跨实例串行检查；检查与创建必须在同一事务，不能只比较起点。
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`circle-expert-booking:${expertId}:${body.slotDate}`}))`;
      const member = await this.findBookableExpert(tx, expertId, body.circleId);
      if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "达人不存在或未开通咨询");
      await this.capabilities.assertAuthorizationInTransaction(tx, member.circleId,
        member.audioCallEnabled ? "AUDIO_QUESTION" : "VIDEO_QUESTION", { userId: bookerUserId, executor }, expertId);
      await lockCircleExpertRows(tx, member.circleId, expertId);
      const buyerLocks = await lockCircleExpertRows(tx, member.circleId, bookerUserId);
      const buyerWhere = circleExpertWhere("CONFIG"); delete buyerWhere.role;
      const buyer = buyerLocks.userIds.includes(bookerUserId) && await tx.circleMember.findFirst({ where: {
        ...buyerWhere, id: { in: buyerLocks.memberIds }, circleId: member.circleId, userId: bookerUserId }, select: { id: true } });
      if (!buyer) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入圈子，或刷新已失效的成员身份");
      const currentWhere = circleExpertWhere("CALL"); delete currentWhere.role;
      const currentMember = await tx.circleMember.findFirst({
        where: { ...currentWhere, id: member.id, circleId: member.circleId, userId: expertId },
      });
      if (!currentMember) throw new BusinessException(ErrorCode.FORBIDDEN, "咨询服务已停用，请重新选择");
      const configuredSlot = buildExpertSlots(currentMember.callAvailableHours, body.slotDate)
        .some(slot => slot.start === body.slotStart && slot.end === body.slotEnd);
      if (!configuredSlot) throw new BusinessException(ErrorCode.BAD_REQUEST, "该时段未开放预约，请重新选择");
      const conflict = await tx.circleExpertBooking.findFirst({
        where: {
          expertUserId: expertId,
          slotDate: body.slotDate,
          slotStart: { lt: body.slotEnd },
          slotEnd: { gt: body.slotStart },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });
      if (conflict) throw new BusinessException(ErrorCode.CONFLICT, "该时段已被预约", HttpStatus.CONFLICT);
      return tx.circleExpertBooking.create({
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
    }, { timeout: 15000 });
  }

  /** 校验分组属于该圈子，防止跨圈越权操作分组（IDOR） */
  private async assertGroupInCircle(groupId: string, circleId: string) {
    const group = await this.prisma.circleMemberGroup.findUnique({ where: { id: groupId }, select: { circleId: true } });
    if (!group || group.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "分组不存在");
  }
}
