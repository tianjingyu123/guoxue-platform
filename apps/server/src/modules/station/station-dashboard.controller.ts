import { Controller, Get, Req, UseGuards, NotFoundException, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { StationDashboardService } from "./station-dashboard.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";

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
  async getOverview(@Req() req: Request) {
    return this.svc.getOverview(await this.getStationId(req));
  }

  @Get("trends")
  @ApiOperation({ summary: "每日佣金趋势（近30天）" })
  async getTrends(@Req() req: Request) {
    return this.svc.getTrends(await this.getStationId(req));
  }

  @Get("link-ranking")
  @ApiOperation({ summary: "推广渠道收益分布" })
  async getLinkRanking(@Req() req: Request) {
    return this.svc.getLinkRanking(await this.getStationId(req));
  }

  @Get("silent-users")
  @ApiOperation({ summary: "沉默用户提醒（7天未活跃）" })
  async getSilentUsers(@Req() req: Request) {
    return this.svc.getSilentUsers(await this.getStationId(req));
  }

  @Get("settlement-timer")
  @ApiOperation({ summary: "佣金结算倒计时" })
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
  async getTeamRanking(@Req() req: Request) {
    const { stations } = await this.getOperatorStations(req);
    return {
      ranking: stations.sort((a, b) => Number(b.totalEarning) - Number(a.totalEarning)).slice(0, 10),
    };
  }

  @Get("quota-usage")
  @ApiOperation({ summary: "名额使用情况（已用/总量）" })
  async getQuotaUsage(@Req() req: Request) {
    const { operator, stations } = await this.getOperatorStations(req);
    return { used: stations.length, total: operator?.containQuota || 0 };
  }
}
