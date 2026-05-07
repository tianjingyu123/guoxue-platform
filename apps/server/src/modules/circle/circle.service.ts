import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CreateCircleDto, UpdateCircleDto, CreatePostDto, JoinCircleDto, UpdateMemberRoleDto } from "./circle.dto";

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
      // 如果缓存中有数据但缺少当前用户的 membership 信息
      if (userId && !cached.membership) {
        const membership = await this.prisma.circleMember.findUnique({
          where: { circleId_userId: { circleId, userId } },
        });
        return { ...cached, membership };
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
  }) {
    const { page, pageSize, keyword, tag, type } = params;
    const filterHash = `${keyword ?? ""}:${tag ?? ""}:${type ?? ""}`;
    const cacheKey = `circles:list:${page}:${pageSize}:${filterHash}`;

    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const where: any = { status: "ACTIVE" };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { intro: { contains: keyword } },
      ];
    }
    if (tag) where.tags = { has: tag };
    if (type) where.type = type;

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

  // ───────── 成员管理 ─────────

  async join(circleId: string, userId: string, dto?: JoinCircleDto) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new NotFoundException("圈子不存在或已下架");

    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing) throw new ConflictException("已加入该圈子");

    const member = await this.prisma.circleMember.create({
      data: { circleId, userId, role: "MEMBER" },
    });

    await this.prisma.circle.update({
      where: { id: circleId },
      data: { memberCount: { increment: 1 } },
    });

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
    await this.prisma.circle.update({
      where: { id: circleId },
      data: { memberCount: { decrement: 1 } },
    });

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
        data: { role: dto.role as any },
      });
    }

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
    await this.prisma.circle.update({
      where: { id: circleId },
      data: { memberCount: { decrement: 1 } },
    });

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
      },
    });

    await this.prisma.circle.update({
      where: { id: circleId },
      data: { postCount: { increment: 1 } },
    });

    return post;
  }

  async updatePost(postId: string, userId: string, dto: Partial<CreatePostDto>) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("帖子不存在");
    if (post.userId !== userId) throw new ForbiddenException("只能编辑自己的帖子");

    return this.prisma.post.update({ where: { id: postId }, data: dto as any });
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
    const where: any = { circleId, status: "PUBLISHED" };

    if (type) where.type = type;
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
