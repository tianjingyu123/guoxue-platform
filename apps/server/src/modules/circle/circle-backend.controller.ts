import { Controller, Get, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

@ApiTags("圈主个人中心")
@Controller("circle-backend")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CircleBackendController {
  constructor(private readonly prisma: PrismaService) {}

  private async getMyCircle(userId: string) {
    const membership = await this.prisma.circleMember.findFirst({
      where: { userId, role: { in: ["OWNER", "ADMIN"] } },
      include: { circle: true },
    });
    if (!membership) throw new BusinessException(ErrorCode.FORBIDDEN, "你不是任何圈子的圈主或管理员");
    return membership;
  }

  @Get("overview")
  @ApiOperation({ summary: "圈主仪表盘概览" })
  @ApiResponse({ status: 200, description: "成功" })
  async getOverview(@Req() req: Request) {
    const { circle } = await this.getMyCircle((req.user as any).id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [memberCount, activeCount, monthNewMembers] = await Promise.all([
      this.prisma.circleMember.count({ where: { circleId: circle.id } }),
      this.prisma.circleMember.count({
        where: { circleId: circle.id, OR: [{ expireAt: null }, { expireAt: { gte: now } }] },
      }),
      this.prisma.circleMember.count({ where: { circleId: circle.id, joinedAt: { gte: monthStart } } }),
    ]);

    return { circle, memberCount, activeMembers: activeCount, monthNewMembers };
  }

  @Get("members")
  @ApiOperation({ summary: "圈子成员管理" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, description: "ACTIVE/EXPIRED" })
  async getMembers(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("status") status?: string,
  ) {
    const { circle } = await this.getMyCircle((req.user as any).id);
    const now = new Date();
    const where: any = { circleId: circle.id };
    if (status === "ACTIVE") where.OR = [{ expireAt: null }, { expireAt: { gte: now } }];
    if (status === "EXPIRED") where.expireAt = { lt: now };

    const [members, total] = await Promise.all([
      this.prisma.circleMember.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip: (+page - 1) * +pageSize,
        take: +pageSize,
        orderBy: { joinedAt: "desc" },
      }),
      this.prisma.circleMember.count({ where }),
    ]);
    return { members, total, page: +page, pageSize: +pageSize };
  }

  @Get("guests")
  @ApiOperation({ summary: "嘉宾列表（含分账比例）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getGuests(@Req() req: Request) {
    const { circle } = await this.getMyCircle((req.user as any).id);
    const guests = await this.prisma.circleMember.findMany({
      where: { circleId: circle.id, role: "GUEST" },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });

    // 获取每个嘉宾的分账比例
    const splitConfigs = await this.prisma.circleRevenueSplit.findMany({
      where: { circleId: circle.id, status: "ACTIVE" },
    });
    const splitMap = new Map(splitConfigs.map(s => [s.guestId, s.splitRate]));

    // 获取每个嘉宾的收益汇总
    const earnings = await this.prisma.circleGuestEarning.groupBy({
      by: ["guestId"],
      where: { circleId: circle.id },
      _sum: { earned: true },
    });
    const earningsMap = new Map(earnings.map(e => [e.guestId, e._sum.earned || 0]));

    return guests.map(g => ({
      id: g.id,
      userId: g.userId,
      user: g.user,
      shareRate: Number(splitMap.get(g.userId) || 0),
      totalEarned: Number(earningsMap.get(g.userId) || 0),
    }));
  }

  @Put("guests/:userId/share-rate")
  @ApiOperation({ summary: "设置嘉宾分账比例" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async setGuestShareRate(@Req() req: Request, @Param("userId") userId: string, @Body() body: { shareRate: number }) {
    const { circle } = await this.getMyCircle((req.user as any).id);

    // 验证目标用户是当前圈子的嘉宾
    const isGuest = await this.prisma.circleMember.findFirst({
      where: { circleId: circle.id, userId, role: "GUEST" },
    });
    if (!isGuest) throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户不是本圈子的嘉宾");

    const existing = await this.prisma.circleRevenueSplit.findFirst({
      where: { circleId: circle.id, guestId: userId },
    });
    if (existing) {
      await this.prisma.circleRevenueSplit.update({
        where: { id: existing.id },
        data: { splitRate: body.shareRate },
      });
    } else {
      await this.prisma.circleRevenueSplit.create({
        data: { circleId: circle.id, guestId: userId, splitRate: body.shareRate },
      });
    }
    return { success: true };
  }

  @Get("revenue")
  @ApiOperation({ summary: "圈主收益概览" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "period", required: false, description: "月份 如 2026-06" })
  async getRevenue(@Req() req: Request, @Query("period") period?: string) {
    const { circle } = await this.getMyCircle((req.user as any).id);
    const now = new Date();
    const monthStart = period ? new Date(period + "-01") : new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = period
      ? new Date(+period.split("-")[0], +period.split("-")[1], 0, 23, 59, 59)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [earnings, guestPayouts] = await Promise.all([
      this.prisma.circleGuestEarning.aggregate({
        where: { circleId: circle.id, createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true, earned: true },
        _count: true,
      }),
      this.prisma.circleGuestEarning.aggregate({
        where: { circleId: circle.id, createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { earned: true },
      }),
    ]);

    return {
      circleId: circle.id,
      period: period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      totalTransactions: earnings._count,
      totalAmount: earnings._sum.amount || 0,
      totalGuestPayouts: guestPayouts._sum.earned || 0,
      ownerRevenue: Number(earnings._sum.amount || 0) - Number(guestPayouts._sum.earned || 0),
    };
  }

  // ── 管理员端点 ──

  @Get("admin/circles")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看所有圈子列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权限" })
  async adminCircles(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    const [circles, total] = await Promise.all([
      this.prisma.circle.findMany({
        skip: (+page - 1) * +pageSize,
        take: +pageSize,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.circle.count(),
    ]);
    return { circles, total, page: +page, pageSize: +pageSize };
  }

  @Get("admin/circles/:circleId/overview")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看圈子概览" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权限" })
  async adminCircleOverview(@Param("circleId") circleId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [circle, memberCount, activeCount, monthNewMembers] = await Promise.all([
      this.prisma.circle.findUnique({ where: { id: circleId } }),
      this.prisma.circleMember.count({ where: { circleId } }),
      this.prisma.circleMember.count({
        where: { circleId, OR: [{ expireAt: null }, { expireAt: { gte: now } }] },
      }),
      this.prisma.circleMember.count({ where: { circleId, joinedAt: { gte: monthStart } } }),
    ]);
    if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    return { circle, memberCount, activeMembers: activeCount, monthNewMembers };
  }
}
