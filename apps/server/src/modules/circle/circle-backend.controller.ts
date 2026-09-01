import { Controller, Get, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { SetGuestShareRateDto } from "./circle.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

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

  /** 平台管理角色判定（SUPER_ADMIN/OPERATION_ADMIN） */
  private isPlatformAdmin(req: Request): boolean {
    const roles: string[] = (req.user?.roles as string[]) || [];
    return roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN");
  }

  /**
   * 圈子定位：管理角色且显式传 circleId 时按该圈操作（跳过 getMyCircle）；
   * 否则回落原逻辑（取调用者自己是圈主/管理员的圈子）——C 端行为零变化。
   */
  private async resolveCircle(req: Request, circleId?: string) {
    if (circleId && this.isPlatformAdmin(req)) {
      const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
      if (!circle) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在");
      return circle;
    }
    const { circle } = await this.getMyCircle(req.user.id);
    return circle;
  }

  @Get("overview")
  @ApiOperation({ summary: "圈主仪表盘概览" })
  @ApiResponse({ status: 200, description: "成功" })
  async getOverview(@Req() req: Request) {
    const { circle } = await this.getMyCircle(req.user.id);
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
    const { circle } = await this.getMyCircle(req.user.id);
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
  @ApiQuery({ name: "circleId", required: false, description: "管理角色（SUPER_ADMIN/OPERATION_ADMIN）跨圈查看时传入" })
  @ApiResponse({ status: 200, description: "成功" })
  async getGuests(@Req() req: Request, @Query("circleId") circleId?: string) {
    const circle = await this.resolveCircle(req, circleId);
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

    return guests.map(g => {
      // splitRate 库内规范语义为 0-1 小数（schema.prisma:5849 如 0.3=30%），对外统一还原成 0-100 百分比；
      // 兼容修正前旧代码把百分比原样写入的存量脏数据：>1 的值只可能是旧写入（新写入恒 ≤1），直接按百分比返回
      const raw = Number(splitMap.get(g.userId) || 0);
      return {
        id: g.id,
        userId: g.userId,
        user: g.user,
        shareRate: raw > 1 ? raw : raw * 100,
        totalEarned: Number(earningsMap.get(g.userId) || 0),
      };
    });
  }

  @Put("guests/:userId/share-rate")
  @RedLineGate(RedLine.MONEY)
  @ApiOperation({ summary: "设置嘉宾分账比例" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async setGuestShareRate(@Req() req: Request, @Param("userId") userId: string, @Body() body: SetGuestShareRateDto) {
    const circle = await this.resolveCircle(req, body.circleId);

    // 验证目标用户是当前圈子的嘉宾
    const isGuest = await this.prisma.circleMember.findFirst({
      where: { circleId: circle.id, userId, role: "GUEST" },
    });
    if (!isGuest) throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户不是本圈子的嘉宾");

    // 资金修正：DTO 收 0-100 百分比，DB CircleRevenueSplit.splitRate 为 Decimal(5,4)、语义 0-1 小数
    // （schema.prisma:5849 「如 0.3 = 30%」）。修正前把百分比原样写入 → >9.9999 直接溢出报错、≤9.9999 单位错 100 倍。
    const splitRateFraction = body.shareRate / 100;

    const existing = await this.prisma.circleRevenueSplit.findFirst({
      where: { circleId: circle.id, guestId: userId },
    });
    if (existing) {
      await this.prisma.circleRevenueSplit.update({
        where: { id: existing.id },
        data: { splitRate: splitRateFraction },
      });
    } else {
      await this.prisma.circleRevenueSplit.create({
        data: { circleId: circle.id, guestId: userId, splitRate: splitRateFraction },
      });
    }
    return { success: true };
  }

  @Get("revenue")
  @ApiOperation({ summary: "圈主收益概览" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "period", required: false, description: "月份 如 2026-06" })
  @ApiQuery({ name: "circleId", required: false, description: "管理角色（SUPER_ADMIN/OPERATION_ADMIN）跨圈查看时传入" })
  async getRevenue(@Req() req: Request, @Query("period") period?: string, @Query("circleId") circleId?: string) {
    const circle = await this.resolveCircle(req, circleId);
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

  @Get("calendar-events")
  @ApiOperation({ summary: "圈子活动日历" })
  @ApiQuery({ name: "circleId", required: true })
  @ApiQuery({ name: "year", required: false, type: Number })
  @ApiQuery({ name: "month", required: false, type: Number })
  async getCalendarEvents(
    @Req() req: Request,
    @Query("circleId") circleId: string,
    @Query("year") year?: number,
    @Query("month") month?: number,
  ) {
    // 验证用户是否是该圈子成员
    const uid = req.user.id
    const member = await this.prisma.circleMember.findFirst({
      where: { circleId, userId: uid },
    })
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "你不是该圈子成员")

    const now = new Date()
    const y = year || now.getFullYear()
    const m = month || now.getMonth() + 1
    const startDate = new Date(y, m - 1, 1)
    const endDate = new Date(y, m, 0, 23, 59, 59)

    const events = await this.prisma.circleEvent.findMany({
      where: { circleId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "asc" },
    })

    return events.map(e => ({
      id: e.id,
      date: e.date.toISOString().slice(0, 10),
      title: e.title,
      time: e.time,
      circle: e.circle,
      type: e.type,
    }))
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
