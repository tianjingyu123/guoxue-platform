import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CreateCircleDto, UpdateCircleDto, CreatePostDto, JoinCircleDto, UpdateMemberRoleDto } from "./circle.dto";
import { Prisma, CircleMemberRole } from "@prisma/client";

@Injectable()
export class CircleService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ───────── 圈子 CRUD ─────────

  async create(ownerId: string, dto: CreateCircleDto) {
    const circle = await this.prisma.circle.create({
      data: {
        name: dto.name,
        intro: dto.intro,
        cover: dto.cover,
        tags: dto.tags,
        type: dto.type as any,
        price: dto.price ?? 0,
        depositAmount: dto.depositAmount ?? 0,
        stationId: dto.stationId || undefined,
        ownerId,
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
    await this.checkOwnership(circleId, userId);
    const updated = await this.prisma.circle.update({
      where: { id: circleId },
      data: dto,
    });
    await Promise.all([
      this.redis.delByPattern("circles:list:*"),
      this.redis.del(`circles:detail:${circleId}`),
    ]);
    return updated;
  }

  async getDetail(circleId: string, userId?: string) {
    const cacheKey = `circles:detail:${circleId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      if (userId) {
        // 成员关系独立缓存，避免缓存命中后重复查 DB
        const memKey = `circles:member:${circleId}:${userId}`;
        let membership = await this.redis.getJson<any>(memKey);
        if (membership === undefined) {
          membership = await this.prisma.circleMember.findUnique({
            where: { circleId_userId: { circleId, userId } },
          });
          await this.redis.setJson(memKey, membership, 60);
        }
        return { ...cached, membership: membership || null };
      }
      return cached;
    }

    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        _count: { select: { posts: true, articles: true, courses: true } },
      },
    });
    if (!circle) throw new NotFoundException("圈子不存在");

    // 检查当前用户是否已加入
    let membership = null;
    if (userId) {
      membership = await this.prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId } },
      });
      const memKey = `circles:member:${circleId}:${userId}`;
      await this.redis.setJson(memKey, membership, 60);
    }

    const data = { ...circle, membership };
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
    const { page, pageSize, keyword, tag, type, stationId } = params;
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
    if (type) where.type = type as any;
    if (stationId) where.stationId = stationId;

    const [circles, total] = await Promise.all([
      this.prisma.circle.findMany({
        where,
        select: {
          id: true, name: true, intro: true, cover: true, tags: true,
          type: true, price: true, memberCount: true, postCount: true,
          owner: { select: { id: true, nickname: true, avatar: true } },
        },
        skip: (page - 1) * pageSize,
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

  // ───────── 圈子公告 ─────────

  async getAnnouncement(circleId: string) {
    const key = `circle:announcement:${circleId}`;
    const content = await this.redis.get(key);
    return { content: content || "", updatedAt: null };
  }

  async setAnnouncement(circleId: string, userId: string, content: string) {
    await this.checkAdmin(circleId, userId);
    const key = `circle:announcement:${circleId}`;
    await this.redis.set(key, content, 86400 * 90); // 90天过期
    return { content, updatedAt: new Date().toISOString() };
  }

  // ───────── 成员管理 ─────────

  async join(circleId: string, userId: string, dto?: JoinCircleDto) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new NotFoundException("圈子不存在或已下架");

    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing) throw new ConflictException("已加入该圈子");

    let member: Awaited<ReturnType<typeof this.prisma.circleMember.create>> | undefined;
    try {
      member = await this.prisma.circleMember.create({
        data: { circleId, userId, role: "MEMBER" },
      });
    } catch (e: unknown) {
      if ((e as any)?.code === "P2002") throw new ConflictException("已加入该圈子");
      throw e;
    }

    await Promise.all([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { increment: 1 } },
      }),
      this.redis.del(`circles:member:${circleId}:${userId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    return member;
  }

  async leave(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new NotFoundException("未加入该圈子");
    if (member.role === "OWNER") throw new ForbiddenException("圈主不能退出，请先转让圈子");

    await this.prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId } },
    });
    await Promise.all([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { decrement: 1 } },
      }),
      this.redis.del(`circles:member:${circleId}:${userId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    return { success: true };
  }

  async updateMemberRole(circleId: string, operatorId: string, targetUserId: string, dto: UpdateMemberRoleDto) {
    await this.checkOwnership(circleId, operatorId);

    if (dto.role === "OWNER") {
      // 转让圈主
      await this.prisma.$transaction([
        this.prisma.circleMember.update({
          where: { circleId_userId: { circleId, userId: operatorId } },
          data: { role: "MEMBER" },
        }),
        this.prisma.circleMember.update({
          where: { circleId_userId: { circleId, userId: targetUserId } },
          data: { role: "OWNER" },
        }),
        this.prisma.circle.update({
          where: { id: circleId },
          data: { ownerId: targetUserId },
        }),
      ]);
    } else {
      await this.prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: targetUserId } },
        data: { role: dto.role as CircleMemberRole },
      });
    }

    await this.redis.del(`circles:member:${circleId}:${targetUserId}`);
    return { success: true };
  }

  async removeMember(circleId: string, operatorId: string, targetUserId: string) {
    await this.checkAdmin(circleId, operatorId);

    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException("成员不存在");
    if (member.role === "OWNER") throw new ForbiddenException("不能移除圈主");

    await this.prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    await Promise.all([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { decrement: 1 } },
      }),
      this.redis.del(`circles:member:${circleId}:${targetUserId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    return { success: true };
  }

  async listMembers(circleId: string, page = 1, pageSize = 20) {
    const [members, total] = await Promise.all([
      this.prisma.circleMember.findMany({
        where: { circleId },
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { joinedAt: "asc" },
      }),
      this.prisma.circleMember.count({ where: { circleId } }),
    ]);

    return { members, total, page, pageSize };
  }

  // ───────── 帖子 ─────────

  async createPost(circleId: string, userId: string, dto: CreatePostDto) {
    await this.ensureMember(circleId, userId);

    const post = await this.prisma.post.create({
      data: {
        circleId,
        userId,
        type: dto.type as any,
        title: dto.title,
        content: dto.content,
        images: dto.images ?? [],
        videoUrl: dto.videoUrl,
        fileUrl: dto.fileUrl,
        linkUrl: dto.linkUrl,
        status: dto.status ?? "PUBLISHED",
      },
    });

    // 只有发布状态的帖子才计入统计
    if (!dto.status || dto.status === "PUBLISHED") {
      await this.prisma.circle.update({
        where: { id: circleId },
        data: { postCount: { increment: 1 } },
      });
    }

    return post;
  }

  /** 获取我的草稿列表 */
  async getMyDrafts(userId: string, page = 1, pageSize = 20) {
    const where = { userId, status: "DRAFT" };
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: { circle: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.post.count({ where }),
    ]);
    return { posts, total, page, pageSize };
  }

  /** 发布草稿 */
  async publishPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("帖子不存在");
    if (post.userId !== userId) throw new ForbiddenException("只能发布自己的帖子");
    if (post.status !== "DRAFT") throw new BadRequestException("该帖子不是草稿");

    await this.prisma.circle.update({
      where: { id: post.circleId },
      data: { postCount: { increment: 1 } },
    });

    return this.prisma.post.update({
      where: { id: postId },
      data: { status: "PUBLISHED", createdAt: new Date() },
    });
  }

  async updatePost(postId: string, userId: string, dto: Partial<CreatePostDto>) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("帖子不存在");
    if (post.userId !== userId) throw new ForbiddenException("只能编辑自己的帖子");

    return this.prisma.post.update({ where: { id: postId }, data: dto as Prisma.PostUpdateInput });
  }

  async deletePost(postId: string, userId: string, circleId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("帖子不存在");

    // 检查权限：作者、圈主、管理员可删除
    if (post.userId !== userId) {
      await this.checkAdmin(circleId, userId);
    }

    await this.prisma.post.delete({ where: { id: postId } });
    await this.prisma.circle.update({
      where: { id: circleId },
      data: { postCount: { decrement: 1 } },
    });

    return { success: true };
  }

  async getPosts(circleId: string, query: { type?: string; isEssence?: string; page?: number; pageSize?: number }) {
    const { type, isEssence, page = 1, pageSize = 20 } = query;
    const where: Prisma.PostWhereInput = { circleId, status: "PUBLISHED" };

    if (type) where.type = type as any;
    if (isEssence === "true") where.isEssence = true;
    if (isEssence === "top") where.isTop = true;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ isTop: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.post.count({ where }),
    ]);

    return { posts, total, page, pageSize };
  }

  async getPostDetail(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
      },
    });
    if (!post) throw new NotFoundException("帖子不存在");
    return post;
  }

  async toggleEssence(postId: string, circleId: string, userId: string) {
    await this.checkAdmin(circleId, userId);
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("帖子不存在");

    return this.prisma.post.update({
      where: { id: postId },
      data: { isEssence: !post.isEssence },
    });
  }

  async toggleTop(postId: string, circleId: string, userId: string) {
    await this.checkAdmin(circleId, userId);
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("帖子不存在");

    return this.prisma.post.update({
      where: { id: postId },
      data: { isTop: !post.isTop },
    });
  }

  // ───────── 达人咨询配置 ─────────

  async setExpertConfig(circleId: string, userId: string, dto: {
    questionPriceCoin: number;
    questionTimeoutHours: number;
    callPricePerMinuteCoin: number;
    callAvailableHours?: Array<{ day: string; start: string; end: string }>;
  }) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new NotFoundException("成员不存在");
    if (!["OWNER", "PARTNER", "GUEST"].includes(member.role)) {
      throw new ForbiddenException("只有圈主、合伙人和嘉宾可以配置咨询价格");
    }

    const updated = await this.prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId } },
      data: {
        questionPriceCoin: dto.questionPriceCoin,
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
        questionTimeoutHours: true,
        callPricePerMinuteCoin: true,
        callAvailableHours: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
    if (!member) throw new NotFoundException("成员不存在");
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
        questionTimeoutHours: true,
        callPricePerMinuteCoin: true,
        callAvailableHours: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
  }

  // ───────── 私有辅助 ─────────

  private async checkOwnership(circleId: string, userId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.ownerId !== userId) {
      throw new ForbiddenException("仅圈主可执行此操作");
    }
  }

  private async checkAdmin(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member || !["OWNER", "PARTNER", "ADMIN"].includes(member.role)) {
      throw new ForbiddenException("权限不足");
    }
  }

  private async ensureMember(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new ForbiddenException("请先加入圈子");
  }
}
