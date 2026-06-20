import { Controller, Get, Put, Body, Req, Query, UseGuards, NotFoundException, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { StationDashboardService } from "./station-dashboard.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateMyOperatorDto } from "./station.dto";

@ApiTags("站长仪表盘")
@Controller("station/dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StationDashboardController {
  constructor(
    private readonly svc: StationDashboardService,
    private readonly prisma: PrismaService,
  ) {}

  private async getStationId(req: Request): Promise<string> {
    const userId = (req.user as any).id;
    const station = await this.prisma.station.findFirst({ where: { userId }, select: { id: true } });
    if (!station) throw new NotFoundException("未找到关联站点，请先创建站点");
    return station.id;
  }

  @Get("overview")
  @ApiOperation({ summary: "站长仪表盘概览 — 本月佣金/成交额/新用户/转化率" })
  @ApiResponse({ status: 200, description: "成功" })
  async getOverview(@Req() req: Request) {
    return this.svc.getOverview(await this.getStationId(req));
  }

  @Get("trends")
  @ApiOperation({ summary: "每日佣金趋势（近30天）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getTrends(@Req() req: Request) {
    return this.svc.getTrends(await this.getStationId(req));
  }

  @Get("link-ranking")
  @ApiOperation({ summary: "推广渠道收益分布" })
  @ApiResponse({ status: 200, description: "成功" })
  async getLinkRanking(@Req() req: Request) {
    return this.svc.getLinkRanking(await this.getStationId(req));
  }

  @Get("silent-users")
  @ApiOperation({ summary: "沉默用户提醒（7天未活跃）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getSilentUsers(@Req() req: Request) {
    return this.svc.getSilentUsers(await this.getStationId(req));
  }

  @Get("settlement-timer")
  @ApiOperation({ summary: "佣金结算倒计时" })
  @ApiResponse({ status: 200, description: "成功" })
  async getSettlementTimer(@Req() req: Request) {
    return this.svc.getSettlementTimer(await this.getStationId(req));
  }
}

@ApiTags("运营商仪表盘")
@Controller("station/operator-dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OperatorDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  private async getOperatorStations(req: Request) {
    const userId = (req.user as any).id;
    const operator = await this.prisma.operator.findFirst({ where: { userId }, select: { id: true, containQuota: true } });
    if (!operator) throw new ForbiddenException("当前用户不是运营商");
    const stations = await this.prisma.station.findMany({ where: { userId }, select: { id: true, name: true, totalEarning: true, status: true } });
    return { operator, stations };
  }

  @Get("overview")
  @ApiOperation({ summary: "运营商概览 — 团队总佣金/名下站长统计/名额使用" })
  @ApiResponse({ status: 200, description: "成功" })
  async getOverview(@Req() req: Request) {
    const { operator, stations } = await this.getOperatorStations(req);
    const stationIds = stations.map(s => s.id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const earningsAgg = await this.prisma.stationEarning.aggregate({
      where: { stationId: { in: stationIds }, createdAt: { gte: monthStart } },
      _sum: { earned: true, amount: true },
      _count: true,
    });

    const activeCount = stations.filter(s => s.status === "ACTIVE").length;

    return {
      totalStations: stations.length,
      activeStations: activeCount,
      silentStations: stations.length - activeCount,
      quotaUsed: stations.length,
      quotaTotal: operator?.containQuota || 0,
      monthTeamEarned: earningsAgg._sum.earned || 0,
      monthTeamAmount: earningsAgg._sum.amount || 0,
      monthTeamOrders: earningsAgg._count,
    };
  }

  @Get("team-ranking")
  @ApiOperation({ summary: "名下站长业绩排行 Top10" })
  @ApiResponse({ status: 200, description: "成功" })
  async getTeamRanking(@Req() req: Request) {
    const { stations } = await this.getOperatorStations(req);
    return {
      ranking: stations.sort((a, b) => Number(b.totalEarning) - Number(a.totalEarning)).slice(0, 10),
    };
  }

  @Get("quota-usage")
  @ApiOperation({ summary: "名额使用情况（已用/总量）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getQuotaUsage(@Req() req: Request) {
    const { operator, stations } = await this.getOperatorStations(req);
    return { used: stations.length, total: operator?.containQuota || 0 };
  }

  // ───────── 自服务 API ─────────

  @Get("my")
  @ApiOperation({ summary: "获取当前运营商完整信息（自服务）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getMyOperator(@Req() req: Request) {
    const userId = (req.user as any).id;
    const operator = await this.prisma.operator.findFirst({
      where: { userId },
      include: { user: { select: { id: true, nickname: true, avatar: true, station: true } } },
    });
    if (!operator) throw new ForbiddenException("当前用户不是运营商");

    const stations = await this.prisma.station.findMany({
      where: { operatorId: operator.id },
      select: { id: true, name: true, code: true, totalEarning: true, status: true, createdAt: true },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const stationIds = stations.map(s => s.id);
    const monthEarnings = await this.prisma.stationEarning.aggregate({
      where: { stationId: { in: stationIds }, createdAt: { gte: monthStart } },
      _sum: { earned: true },
    });

    return {
      ...operator,
      stationCount: stations.length,
      monthNewStations: stations.filter(s => new Date(s.createdAt) >= monthStart).length,
      monthEarning: monthEarnings._sum.earned || 0,
      usedQuota: stations.length,
      fullRebateSlots: 5, // 全返名额上限（后续由运营策略配置）
      usedRebateSlots: 0, // 全返名额已使用数（待实现 RebateUsage 跟踪表）
    };
  }

  @Put("my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新运营商品牌信息（自服务）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  async updateMyOperator(@Req() req: Request, @Body() body: UpdateMyOperatorDto) {
    const userId = (req.user as any).id;
    const operator = await this.prisma.operator.findFirst({ where: { userId } });
    if (!operator) throw new ForbiddenException("当前用户不是运营商");

    const data: Record<string, unknown> = {};
    if (body.brandName !== undefined) data.brandName = body.brandName;
    if (body.brandLogo !== undefined) data.brandLogo = body.brandLogo;
    if (body.brandThemeColor !== undefined) data.brandThemeColor = body.brandThemeColor;

    return this.prisma.operator.update({ where: { id: operator.id }, data });
  }

  @Get("my/earnings")
  @ApiOperation({ summary: "运营商收益明细（自服务）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  async getMyEarnings(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    const userId = (req.user as any).id;
    const operator = await this.prisma.operator.findFirst({ where: { userId } });
    if (!operator) throw new ForbiddenException("当前用户不是运营商");

    const stations = await this.prisma.station.findMany({
      where: { operatorId: operator.id },
      select: { id: true },
    });
    const stationIds = stations.map(s => s.id);

    const [operatorEarnings, stationEarnings] = await Promise.all([
      this.prisma.operatorEarning.findMany({
        where: { operatorId: operator.id },
        orderBy: { createdAt: "desc" },
        take: +pageSize,
        skip: (+page - 1) * +pageSize,
      }),
      this.prisma.stationEarning.findMany({
        where: { stationId: { in: stationIds } },
        orderBy: { createdAt: "desc" },
        take: +pageSize,
        skip: (+page - 1) * +pageSize,
      }),
    ]);

    // 合并，管理奖标记 source=MGMT_BONUS
    const merged = [
      ...operatorEarnings.map(e => ({ ...e, source: "MGMT_BONUS", earned: e.earned, amount: e.amount, rate: e.rate })),
      ...stationEarnings.map(e => ({ ...e, source: "COMMISSION", earned: e.earned, amount: e.amount, rate: e.rate })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { list: merged.slice(0, +pageSize), total: merged.length };
  }

  @Get("my/stations")
  @ApiOperation({ summary: "名下站长列表（自服务）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getMyStations(@Req() req: Request) {
    const userId = (req.user as any).id;
    const operator = await this.prisma.operator.findFirst({ where: { userId } });
    if (!operator) throw new ForbiddenException("当前用户不是运营商");

    const stations = await this.prisma.station.findMany({
      where: { operatorId: operator.id },
      select: { id: true, name: true, code: true, totalEarning: true, status: true, createdAt: true },
      orderBy: { totalEarning: "desc" },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const stationIds = stations.map(s => s.id);

    const monthEarnings = await this.prisma.stationEarning.groupBy({
      by: ["stationId"],
      where: { stationId: { in: stationIds }, createdAt: { gte: monthStart } },
      _sum: { earned: true },
    });
    const earningsMap = new Map(monthEarnings.map(e => [e.stationId, e._sum.earned || 0]));

    // 管理奖估算（当月站长佣金 * 5%）
    return stations.map(s => ({
      ...s,
      monthEarning: earningsMap.get(s.id) || 0,
      mgmtBonus: Math.round(Number(earningsMap.get(s.id) ?? 0) * 0.05 * 100) / 100,
    }));
  }
}
