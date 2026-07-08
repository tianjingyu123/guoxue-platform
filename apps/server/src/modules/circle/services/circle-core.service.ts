import { Injectable } from "@nestjs/common";
import { randomInt } from "crypto";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { Cacheable } from "../../../common/cache.decorator";
import { safePagination } from "../../../common/pagination";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { AuditService } from "../../audit/audit.service";
import { CreateCircleDto, UpdateCircleDto } from "../circle.dto";
import { Prisma, CircleType } from "@prisma/client";
import { CircleSharedService } from "./circle-shared.service";

/**
 * 圈子-核心域（从 circle.service 拆出·纯搬家不改逻辑）。
 * 职责：圈子 CRUD + 我的圈子汇总 + 公告 + 邀请码 + 推荐电子书。
 * 依赖：共享叶子域（checkOwnership/checkAdmin/ensureMember）·单向不循环。
 */
@Injectable()
export class CircleCoreService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private audit: AuditService,
    private shared: CircleSharedService,
  ) {}

  // ───────── 圈子 CRUD ─────────

  async create(ownerId: string, dto: CreateCircleDto) {
    // 内容审核（圈子名称+简介，先审后建）
    await this.audit.moderateTextOrThrow([dto.name, dto.intro].filter(Boolean).join(" "), {
      scene: "CIRCLE",
      userId: ownerId,
    });

    const circle = await this.prisma.circle.create({
      data: {
        name: dto.name,
        intro: dto.intro,
        cover: dto.cover,
        tags: dto.tags,
        type: dto.type as CircleType,
        price: dto.price ?? 0,
        depositAmount: dto.depositAmount ?? 0,
        stationId: dto.stationId || undefined,
        ownerId,
        // 创建时已做名称+简介文本审核（见上 moderateTextOrThrow），直接 ACTIVE 上架，
        // 否则默认 PENDING 会被「发现/广场」列表(status:ACTIVE)过滤掉，用户创建后前台看不到、无法测试。
        status: "ACTIVE",
        members: {
          create: { userId: ownerId, role: "OWNER" },
        },
        memberCount: 1,
      },
      include: { members: { select: { userId: true, role: true } } },
    });

    // 给创建者分配圈主角色
    await this.prisma.userRole.upsert({
      where: { userId_roleType_bindId: { userId: ownerId, roleType: "CIRCLE_OWNER", bindId: circle.id } },
      create: { userId: ownerId, roleType: "CIRCLE_OWNER", bindId: circle.id },
      update: {},
    });

    await this.redis.delByPattern("circles:list:*");
    return circle;
  }

  async update(circleId: string, userId: string, dto: UpdateCircleDto) {
    await this.shared.checkOwnership(circleId, userId);
    // 内容审核（编辑后重新过审名称+简介）
    await this.audit.moderateTextOrThrow([dto.name, dto.intro].filter(Boolean).join(" "), {
      scene: "CIRCLE_EDIT",
      userId,
      dataId: circleId,
    });
    // needApproval 是绕过 prisma generate 锁的新列，prisma client 不认识 → 从 dto 抽出单独原生更新
    const { needApproval, ...rest } = dto as UpdateCircleDto & { needApproval?: boolean };
    const updated = await this.prisma.circle.update({
      where: { id: circleId },
      data: rest,
    });
    if (needApproval !== undefined) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Circle" SET "needApproval"=$2 WHERE id=$1`,
        circleId, !!needApproval,
      );
    }
    await Promise.all([
      this.redis.delByPattern("circles:list:*"),
      this.redis.del(`circles:detail:${circleId}`),
    ]);
    return { ...updated, ...(needApproval !== undefined ? { needApproval: !!needApproval } : {}) };
  }

  async getDetail(circleId: string, userId?: string) {
    const cacheKey = `circles:detail:${circleId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      if (userId) {
        // 成员关系独立缓存，避免缓存命中后重复查 DB
        const memKey = `circles:member:${circleId}:${userId}`;
        let membership = await this.redis.getJson<any>(memKey);
        if (membership === null) {
          membership = await this.prisma.circleMember.findUnique({
            where: { circleId_userId: { circleId, userId } },
          });
          await this.redis.setJson(memKey, membership, 300);
        }
        return { ...cached, membership: membership || null };
      }
      return cached;
    }

    const [circle, membership, apprRows] = await Promise.all([
      this.prisma.circle.findUnique({
        where: { id: circleId },
        include: {
          owner: { select: { id: true, nickname: true, avatar: true } },
          _count: { select: { posts: true, articles: true, courses: true } },
        },
      }),
      userId
        ? this.prisma.circleMember.findUnique({
            where: { circleId_userId: { circleId, userId } },
          })
        : Promise.resolve(null),
      // needApproval 列绕过 generate 锁，原生查后并入返回
      this.prisma.$queryRawUnsafe<any[]>(`SELECT "needApproval" FROM "Circle" WHERE id=$1`, circleId),
    ]);
    if (!circle) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在");

    if (membership) {
      const memKey = `circles:member:${circleId}:${userId}`;
      await this.redis.setJson(memKey, membership, 60);
    }

    const data = { ...circle, needApproval: apprRows?.[0]?.needApproval === true, membership };
    await this.redis.setJson(cacheKey, data, 300);
    return data;
  }

  async listCircles(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    tag?: string;
    type?: string;
    stationId?: string;
  }) {
    const { keyword, tag, type, stationId } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const filterHash = `${keyword ?? ""}:${tag ?? ""}:${type ?? ""}`;
    const cacheKey = `circles:list:${page}:${pageSize}:${filterHash}`;

    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const where: Prisma.CircleWhereInput = { status: "ACTIVE" };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { intro: { contains: keyword } },
      ];
    }
    if (tag) where.tags = { has: tag };
    if (type) where.type = type as CircleType;
    if (stationId) where.stationId = stationId;

    const [circles, total] = await Promise.all([
      this.prisma.circle.findMany({
        where,
        select: {
          id: true, name: true, intro: true, cover: true, tags: true,
          type: true, price: true, memberCount: true, postCount: true,
          owner: { select: { id: true, nickname: true, avatar: true } },
        },
        skip,
        take: pageSize,
        orderBy: { memberCount: "desc" },
      }),
      this.prisma.circle.count({ where }),
    ]);

    const data = { circles, total, page, pageSize };
    await this.redis.setJson(cacheKey, data, 300);
    return data;
  }

  async getMyCircles(userId: string) {
    return this.prisma.circleMember.findMany({
      where: { userId },
      include: {
        circle: {
          select: {
            id: true, name: true, cover: true, type: true,
            memberCount: true, postCount: true, updatedAt: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  /** 我的圈子数据汇总：已加入数 / 发帖数 / 累计获赞（真实聚合，替代前端写死的假数据） */
  async getMyCircleStats(userId: string) {
    const [joinedCount, myPosts] = await Promise.all([
      this.prisma.circleMember.count({ where: { userId } }),
      this.prisma.post.findMany({
        where: { userId, status: "PUBLISHED" },
        select: { id: true },
      }),
    ]);
    const postCount = myPosts.length;
    // 累计获赞 = 我发布的所有帖子收到的点赞总数（Like 表按 POST 聚合）
    const likeReceived = postCount
      ? await this.prisma.like.count({
          where: { targetType: "POST", targetId: { in: myPosts.map((p) => p.id) } },
        })
      : 0;
    return { joinedCount, postCount, likeReceived };
  }

  // ───────── 圈子公告 ─────────

  @Cacheable({ key: (args: any[]) => `circle:announcement:${args[0]}`, ttl: 30 })
  async getAnnouncement(circleId: string) {
    const latest = await this.prisma.circleAnnouncement.findFirst({
      where: { circleId, isTop: true },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });
    if (latest) return { ...latest, content: latest.content, updatedAt: latest.updatedAt.toISOString() };
    const fallback = await this.prisma.circleAnnouncement.findFirst({
      where: { circleId },
      orderBy: { createdAt: "desc" },
    });
    return { content: fallback?.content || "", updatedAt: fallback?.updatedAt?.toISOString() || null };
  }

  async setAnnouncement(circleId: string, userId: string, content: string, isTop?: boolean) {
    await this.shared.checkAdmin(circleId, userId);
    // 内容审核（公告文本，先审后发）
    await this.audit.moderateTextOrThrow(content, {
      scene: "CIRCLE_ANNOUNCEMENT",
      userId,
      dataId: circleId,
    });
    if (isTop) {
      await this.prisma.circleAnnouncement.updateMany({
        where: { circleId, isTop: true },
        data: { isTop: false },
      });
    }
    const announcement = await this.prisma.circleAnnouncement.create({
      data: { circleId, userId, content, isTop: isTop ?? true },
    });
    return { ...announcement, content: announcement.content, updatedAt: announcement.updatedAt.toISOString() };
  }

  async listAnnouncements(circleId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const [list, total] = await Promise.all([
      this.prisma.circleAnnouncement.findMany({
        where: { circleId },
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        orderBy: [{ isTop: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.circleAnnouncement.count({ where: { circleId } }),
    ]);
    return { list, total, page, pageSize };
  }

  async deleteAnnouncement(circleId: string, userId: string, announcementId: string) {
    await this.shared.checkAdmin(circleId, userId);
    // 校验公告确实属于该圈子，防止跨圈越权删除（IDOR）
    const ann = await this.prisma.circleAnnouncement.findUnique({ where: { id: announcementId }, select: { circleId: true } });
    if (!ann || ann.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "公告不存在");
    await this.prisma.circleAnnouncement.delete({ where: { id: announcementId } });
    return { success: true };
  }

  // ───────── 公告已读 ─────────

  async markAnnouncementRead(circleId: string, announcementId: string, userId: string) {
    await this.shared.ensureMember(circleId, userId);
    const ann = await this.prisma.circleAnnouncement.findFirst({
      where: { id: announcementId, circleId },
    });
    if (!ann) throw new BusinessException(ErrorCode.NOT_FOUND, "公告不存在");

    await this.prisma.circleAnnouncementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      create: { announcementId, userId },
      update: { readAt: new Date() },
    });
    return { success: true };
  }

  // ───────── 圈子邀请 ─────────

  async generateInviteCode(circleId: string, userId: string, maxUses = 0) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.CIRCLE_NOT_MEMBER, "你不是该圈子成员");

    const existing = await this.prisma.circleInviteCode.findFirst({
      where: { circleId, userId, expiredAt: { gte: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;

    const prefix = circleId.replace(/-/g, "").slice(0, 6).toUpperCase();
    const random = randomInt(0, 36 ** 6).toString(36).padStart(6, "0").toUpperCase();
    const code = `${prefix}${random}`;

    return this.prisma.circleInviteCode.create({
      data: { circleId, userId, code, maxUses },
    });
  }

  async joinByInviteCode(code: string, inviteeId: string) {
    const inviteCode = await this.prisma.circleInviteCode.findUnique({ where: { code } });
    if (!inviteCode) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "邀请码无效");
    if (inviteCode.expiredAt && new Date(inviteCode.expiredAt) < new Date()) {
      throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "邀请码已过期");
    }
    if (inviteCode.maxUses > 0 && inviteCode.useCount >= inviteCode.maxUses) {
      throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "邀请码已达使用上限");
    }

    const circle = await this.prisma.circle.findUnique({ where: { id: inviteCode.circleId } });
    if (!circle || circle.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");
    }

    const existingMember = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: inviteCode.circleId, userId: inviteeId } },
    });
    if (existingMember) throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已加入该圈子");

    await this.prisma.$transaction(async (tx) => {
      await tx.circleMember.create({
        data: { circleId: inviteCode.circleId, userId: inviteeId, role: "MEMBER" },
      });
      await tx.circleInviteCode.update({
        where: { id: inviteCode.id },
        data: { useCount: { increment: 1 } },
      });
      await tx.circleInvitation.create({
        data: {
          circleId: inviteCode.circleId,
          inviterId: inviteCode.userId,
          inviteeId,
          inviteCodeId: inviteCode.id,
        },
      });
      await tx.circle.update({
        where: { id: inviteCode.circleId },
        data: { memberCount: { increment: 1 } },
      });
    });

    return { success: true, circleId: inviteCode.circleId };
  }

  async listMyInviteCodes(circleId: string, userId: string) {
    return this.prisma.circleInviteCode.findMany({
      where: { circleId, userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getInvitationStats(circleId: string, userId: string) {
    const [total, records] = await Promise.all([
      this.prisma.circleInvitation.count({ where: { circleId, inviterId: userId } }),
      this.prisma.circleInvitation.findMany({
        where: { circleId, inviterId: userId },
        include: { invitee: { select: { id: true, nickname: true, avatar: true } } },
        orderBy: { joinedAt: "desc" },
        take: 20,
      }),
    ]);
    return { total, records };
  }

  // ───────── 推荐电子书 ─────────

  async getRecommendedEbooks(circleId: string, userId: string) {
    // 验证圈子存在且用户是成员
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入圈子");

    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      select: { recommendedEbookIds: true },
    });
    const ids = (circle?.recommendedEbookIds as string[]) ?? [];
    return { ebookIds: ids };
  }

  async setRecommendedEbooks(circleId: string, userId: string, ebookIds: string[]) {
    // 验证圈子存在且用户是圈主或管理员
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入圈子");
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅圈主和管理员可以设置推荐电子书");
    }

    await this.prisma.circle.update({
      where: { id: circleId },
      data: { recommendedEbookIds: ebookIds as any },
    });
    return { success: true, ebookIds };
  }
}
