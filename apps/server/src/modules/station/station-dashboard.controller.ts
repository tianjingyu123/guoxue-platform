import { Controller, Get, Post, Put, Body, Param, Req, Query, UseGuards, NotFoundException, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { StationDashboardService, computeTeamHealth } from "./station-dashboard.service";
import { TeamTaskService, CreateTeamTaskDto } from "./team-task.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateMyOperatorDto } from "./station.dto";

/** 平台管理角色（后台可代查任意站长/运营商仪表盘）。仅这两类角色允许透传 stationId/operatorId 指定查看对象。 */
function isPlatformAdmin(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  return roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN");
}

/** ApiQuery 复用：admin 代查参数说明 */
const ADMIN_STATION_QUERY = { name: "stationId", required: false, description: "指定分站ID（仅 SUPER_ADMIN/OPERATION_ADMIN 生效·后台代查）" } as const;
const ADMIN_OPERATOR_QUERY = { name: "operatorId", required: false, description: "指定运营商ID（仅 SUPER_ADMIN/OPERATION_ADMIN 生效·后台代查）" } as const;

@ApiTags("站长仪表盘")
@Controller("station/dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StationDashboardController {
  constructor(
    private readonly svc: StationDashboardService,
    private readonly teamTask: TeamTaskService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 解析目标分站：
   * - 管理角色 + 传 stationId → 按指定分站查（校验存在性），供后台代查任意站长仪表盘；
   * - 其余（C 端自视角）→ 原逻辑：按当前用户查自己的分站，无站抛 404。
   */
  private async getStationId(req: Request, stationId?: string): Promise<string> {
    if (stationId && isPlatformAdmin(req)) {
      const station = await this.prisma.station.findUnique({ where: { id: stationId }, select: { id: true } });
      if (!station) throw new NotFoundException("指定的分站不存在");
      return station.id;
    }
    const userId = req.user.id;
    const station = await this.prisma.station.findFirst({ where: { userId }, select: { id: true } });
    if (!station) throw new NotFoundException("未找到关联站点，请先创建站点");
    return station.id;
  }

  @Get("overview")
  @ApiOperation({ summary: "站长仪表盘概览 — 本月佣金/成交额/新用户/转化率" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_STATION_QUERY)
  async getOverview(@Req() req: Request, @Query("stationId") stationId?: string) {
    return this.svc.getOverview(await this.getStationId(req, stationId));
  }

  @Get("trends")
  @ApiOperation({ summary: "每日佣金趋势（近30天）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_STATION_QUERY)
  async getTrends(@Req() req: Request, @Query("stationId") stationId?: string) {
    return this.svc.getTrends(await this.getStationId(req, stationId));
  }

  @Get("link-ranking")
  @ApiOperation({ summary: "推广渠道收益分布" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_STATION_QUERY)
  async getLinkRanking(@Req() req: Request, @Query("stationId") stationId?: string) {
    return this.svc.getLinkRanking(await this.getStationId(req, stationId));
  }

  @Get("silent-users")
  @ApiOperation({ summary: "沉默用户提醒（7天未活跃）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_STATION_QUERY)
  async getSilentUsers(@Req() req: Request, @Query("stationId") stationId?: string) {
    return this.svc.getSilentUsers(await this.getStationId(req, stationId));
  }

  @Get("settlement-timer")
  @ApiOperation({ summary: "佣金结算倒计时" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_STATION_QUERY)
  async getSettlementTimer(@Req() req: Request, @Query("stationId") stationId?: string) {
    return this.svc.getSettlementTimer(await this.getStationId(req, stationId));
  }

  // ───────── 团队任务（商-P2·站长视角）─────────

  @Get("team-tasks/my")
  @ApiOperation({ summary: "我的团队任务（站长视角·仅本人进度）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getMyTeamTasks(@Req() req: Request) {
    return this.teamTask.listMine(req.user.id);
  }

  @Put("team-tasks/:id/complete")
  @ApiOperation({ summary: "标记自定义任务完成（仅 CUSTOM 类型·自动结算类型不允许手报）" })
  @ApiResponse({ status: 200, description: "成功" })
  async completeTeamTask(@Req() req: Request, @Param("id") id: string) {
    return this.teamTask.markComplete(req.user.id, id);
  }
}

@ApiTags("运营商仪表盘")
@Controller("station/operator-dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OperatorDashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamTask: TeamTaskService,
    private readonly dashboard: StationDashboardService,
  ) {}

  /**
   * 解析目标运营商：
   * - 管理角色 + 传 operatorId → 按指定运营商查（校验存在性），供后台代查任意运营商收益/权益中心；
   * - 其余（C 端自视角）→ 原逻辑：按当前用户查自己的运营商身份，非运营商抛 403。
   */
  private async resolveOperator(req: Request, operatorId?: string) {
    if (operatorId && isPlatformAdmin(req)) {
      const operator = await this.prisma.operator.findUnique({
        where: { id: operatorId },
        select: { id: true, userId: true, containQuota: true },
      });
      if (!operator) throw new NotFoundException("指定的运营商不存在");
      return operator;
    }
    const userId = req.user.id;
    const operator = await this.prisma.operator.findFirst({ where: { userId }, select: { id: true, userId: true, containQuota: true } });
    if (!operator) throw new ForbiddenException("当前用户不是运营商");
    return operator;
  }

  private async getOperatorStations(req: Request, operatorId?: string) {
    const operator = await this.resolveOperator(req, operatorId);
    // 名下站长按 operatorId 归属查询（原按 userId 只能查到运营商自己的分站，漏掉团队成员）
    const stations = await this.prisma.station.findMany({ where: { operatorId: operator.id }, select: { id: true, name: true, totalEarning: true, status: true } });
    return { operator, stations };
  }

  @Get("overview")
  @ApiOperation({ summary: "运营商概览 — 团队总佣金/名下站长统计/名额使用" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_OPERATOR_QUERY)
  async getOverview(@Req() req: Request, @Query("operatorId") operatorId?: string) {
    const { operator, stations } = await this.getOperatorStations(req, operatorId);
    const stationIds = stations.map(s => s.id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const earningsAgg = await this.prisma.stationEarning.aggregate({
      where: { stationId: { in: stationIds }, createdAt: { gte: monthStart } },
      _sum: { earned: true, amount: true },
      _count: true,
    });

    const activeCount = stations.filter(s => s.status === "ACTIVE").length;

    // 团队健康度（课题二工作台 P3·纯函数·基于团队真实经营数据加权）
    const teamHealth = computeTeamHealth({
      totalStations: stations.length,
      activeStations: activeCount,
      monthTeamEarned: Number(earningsAgg._sum.earned || 0),
      monthTeamOrders: earningsAgg._count,
    });

    return {
      totalStations: stations.length,
      activeStations: activeCount,
      silentStations: stations.length - activeCount,
      quotaUsed: stations.length,
      quotaTotal: operator?.containQuota || 0,
      monthTeamEarned: earningsAgg._sum.earned || 0,
      monthTeamAmount: earningsAgg._sum.amount || 0,
      monthTeamOrders: earningsAgg._count,
      teamHealth,
    };
  }

  @Get("team-ranking")
  @ApiOperation({ summary: "名下站长业绩排行 Top10" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_OPERATOR_QUERY)
  async getTeamRanking(@Req() req: Request, @Query("operatorId") operatorId?: string) {
    const { stations } = await this.getOperatorStations(req, operatorId);
    return {
      ranking: stations.sort((a, b) => Number(b.totalEarning) - Number(a.totalEarning)).slice(0, 10),
    };
  }

  @Get("quota-usage")
  @ApiOperation({ summary: "名额使用情况（已用/总量）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_OPERATOR_QUERY)
  async getQuotaUsage(@Req() req: Request, @Query("operatorId") operatorId?: string) {
    const { operator, stations } = await this.getOperatorStations(req, operatorId);
    return { used: stations.length, total: operator?.containQuota || 0 };
  }

  @Get("mgmt-report")
  @ApiOperation({ summary: "管理奖新口径月报（佣-V2-P4·本月名下站长佣金合计×我的比率(mgmtRate??渠道默认10%/20%)·按站长分组明细·线下高级标识）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "非运营商" })
  @ApiQuery(ADMIN_OPERATOR_QUERY)
  async getMgmtReport(@Req() req: Request, @Query("operatorId") operatorId?: string) {
    // admin 代查：先解析目标运营商（校验存在性），再以其 userId 走原月报口径（Operator.userId 唯一，无歧义）
    const op = await this.resolveOperator(req, operatorId);
    return this.dashboard.getOperatorMgmtReport(op.userId);
  }

  // ───────── 自服务 API ─────────

  @Get("my")
  @ApiOperation({ summary: "获取当前运营商完整信息（自服务·admin 可传 operatorId 代查）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_OPERATOR_QUERY)
  async getMyOperator(@Req() req: Request, @Query("operatorId") operatorId?: string) {
    const target = await this.resolveOperator(req, operatorId);
    const operator = await this.prisma.operator.findUnique({
      where: { id: target.id },
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
    const userId = req.user.id;
    const operator = await this.prisma.operator.findFirst({ where: { userId } });
    if (!operator) throw new ForbiddenException("当前用户不是运营商");

    const data: Record<string, unknown> = {};
    if (body.brandName !== undefined) data.brandName = body.brandName;
    if (body.brandLogo !== undefined) data.brandLogo = body.brandLogo;
    if (body.brandThemeColor !== undefined) data.brandThemeColor = body.brandThemeColor;

    return this.prisma.operator.update({ where: { id: operator.id }, data });
  }

  @Get("my/earnings")
  @ApiOperation({ summary: "运营商收益明细（自服务·admin 可传 operatorId 代查）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiQuery(ADMIN_OPERATOR_QUERY)
  async getMyEarnings(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("operatorId") operatorId?: string) {
    const operator = await this.resolveOperator(req, operatorId);

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
  @ApiOperation({ summary: "名下站长列表（自服务·admin 可传 operatorId 代查）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_OPERATOR_QUERY)
  async getMyStations(@Req() req: Request, @Query("operatorId") operatorId?: string) {
    const operator = await this.resolveOperator(req, operatorId);

    const stations = await this.prisma.station.findMany({
      where: { operatorId: operator.id },
      select: { id: true, name: true, code: true, totalEarning: true, status: true, createdAt: true },
      orderBy: { totalEarning: "desc" },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const stationIds = stations.map(s => s.id);

    const [monthEarnings, monthMgmtBonuses] = await Promise.all([
      this.prisma.stationEarning.groupBy({
        by: ["stationId"],
        where: { stationId: { in: stationIds }, createdAt: { gte: monthStart } },
        _sum: { earned: true },
      }),
      this.prisma.operatorEarning.groupBy({
        by: ["sourceStationId"],
        where: {
          operatorId: operator.id,
          source: "MGMT_BONUS",
          sourceStationId: { in: stationIds },
          createdAt: { gte: monthStart },
        },
        _sum: { earned: true },
      }),
    ]);
    const earningsMap = new Map(monthEarnings.map(e => [e.stationId, e._sum.earned || 0]));
    const mgmtBonusMap = new Map(monthMgmtBonuses.map(e => [e.sourceStationId, e._sum.earned || 0]));

    // 管理奖只展示本运营商真实入账：与该站长本单实际获得的直接推荐奖励同源，含退款冲正净额。
    // 禁止按团队佣金乘固定比例估算，否则临时链接覆盖永久归属时会把管理奖错误展示给原归属运营商。
    return stations.map(s => ({
      ...s,
      monthEarning: earningsMap.get(s.id) || 0,
      mgmtBonus: Math.round(Number(mgmtBonusMap.get(s.id) ?? 0) * 100) / 100,
    }));
  }

  // ───────── 团队任务下发（商-P2·运营商视角）─────────
  // 合规红线 R1：任务奖励仅限荣誉/资源位，不含现金奖励字段

  @Post("team-tasks")
  @ApiOperation({ summary: "下发团队任务（校验目标站长归属本团队·奖励仅荣誉/资源位）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  async createTeamTask(@Req() req: Request, @Body() body: CreateTeamTaskDto) {
    return this.teamTask.create(req.user.id, body);
  }

  @Get("team-tasks")
  @ApiOperation({ summary: "团队任务列表（运营商视角·带各站长进度与完成度聚合·admin 可传 operatorId 代查）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery(ADMIN_OPERATOR_QUERY)
  async listTeamTasks(@Req() req: Request, @Query("operatorId") operatorId?: string) {
    // 只读代查放开；下发/关闭等写操作保持仅运营商本人（不接 operatorId），防后台误代操
    const op = await this.resolveOperator(req, operatorId);
    return this.teamTask.listForOperator(op.userId);
  }

  @Put("team-tasks/:id/close")
  @ApiOperation({ summary: "关闭团队任务（关闭后进度不再更新）" })
  @ApiResponse({ status: 200, description: "成功" })
  async closeTeamTask(@Req() req: Request, @Param("id") id: string) {
    return this.teamTask.close(req.user.id, id);
  }
}

@ApiTags("平台管理-运营商汇总")
@Controller("station/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StationAdminOverviewController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 平台视角运营商总览（/operators/earnings 页转型平台视角的数据源）：
   * 全运营商总数/分渠道数、名下分站总数、本月管理奖佣金合计、按本月管理奖排序的 Top 榜。
   * 全部聚合自现有表（Operator/Station/OperatorEarning），不新增 schema。
   */
  @Get("operators-overview")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "全运营商汇总（总数/本月佣金合计/Top榜·平台视角）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "top", required: false, description: "Top 榜条数（默认 10，上限 50）" })
  async getOperatorsOverview(@Query("top") top = 10) {
    const topN = Math.min(Math.max(Number(top) || 10, 1), 50);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalOperators, activeOperators, offlineOperators, totalStations, monthAgg, monthByOperator] = await Promise.all([
      this.prisma.operator.count(),
      this.prisma.operator.count({ where: { status: "ACTIVE" } }),
      this.prisma.operator.count({ where: { channelType: "OFFLINE" } }),
      this.prisma.station.count({ where: { operatorId: { not: null } } }),
      this.prisma.operatorEarning.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { earned: true },
        _count: true,
      }),
      this.prisma.operatorEarning.groupBy({
        by: ["operatorId"],
        where: { createdAt: { gte: monthStart } },
        _sum: { earned: true },
        _count: true,
      }),
    ]);

    // Top 榜：本月管理奖（earned 净额·含冲正）降序
    const sorted = monthByOperator
      .map((g) => ({ operatorId: g.operatorId, monthEarned: Number(g._sum.earned || 0), monthOrders: g._count }))
      .sort((a, b) => b.monthEarned - a.monthEarned)
      .slice(0, topN);

    const topIds = sorted.map((t) => t.operatorId);
    const operators = topIds.length
      ? await this.prisma.operator.findMany({
          where: { id: { in: topIds } },
          select: {
            id: true, brandName: true, channelType: true, level: true, status: true, containQuota: true,
            user: { select: { id: true, nickname: true, avatar: true } },
          },
        })
      : [];
    const stationCounts = topIds.length
      ? await this.prisma.station.groupBy({ by: ["operatorId"], where: { operatorId: { in: topIds } }, _count: true })
      : [];
    const opMap = new Map(operators.map((o) => [o.id, o] as const));
    const stationCountMap = new Map(stationCounts.map((s) => [s.operatorId, s._count] as const));

    return {
      totalOperators,
      activeOperators,
      onlineOperators: totalOperators - offlineOperators,
      offlineOperators,
      totalStations,
      monthMgmtEarned: Math.round(Number(monthAgg._sum.earned || 0) * 100) / 100, // 本月全平台管理奖合计（元）
      monthMgmtOrders: monthAgg._count,
      top: sorted.map((t) => {
        const op = opMap.get(t.operatorId);
        return {
          operatorId: t.operatorId,
          brandName: op?.brandName || null,
          nickname: op?.user?.nickname || null,
          avatar: op?.user?.avatar || null,
          channelType: op?.channelType || "ONLINE",
          level: op?.level || null,
          status: op?.status || null,
          stationCount: stationCountMap.get(t.operatorId) || 0,
          monthEarned: Math.round(t.monthEarned * 100) / 100,
          monthOrders: t.monthOrders,
        };
      }),
    };
  }
}
