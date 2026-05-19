import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CockpitService } from "./cockpit.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("管理驾驶舱")
@Controller("admin/cockpit")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CockpitController {
  constructor(private readonly svc: CockpitService) {}

  @Get("overview")
  @ApiOperation({ summary: "核心指标卡片 — 实时GMV/付费用户数/活跃用户数/分佣支出/净利润预估" })
  getOverview() {
    return this.svc.getOverview();
  }

  @Get("revenue-composition")
  @ApiOperation({ summary: "收入构成堆叠图 — 课程/商品/会员/打赏/入圈等" })
  getRevenueComposition() {
    return this.svc.getRevenueComposition();
  }

  @Get("user-growth")
  @ApiOperation({ summary: "用户增长与获客成本双Y轴数据（近30天）" })
  getUserGrowth() {
    return this.svc.getUserGrowth();
  }

  @Get("business-trends")
  @ApiOperation({ summary: "各业务线收入趋势（近30天）" })
  getBusinessTrends() {
    return this.svc.getBusinessTrends();
  }

  @Get("alerts")
  @ApiOperation({ summary: "异常预警 — 支付中断/退款异常/风控告警" })
  getAlerts() {
    return this.svc.getAlerts();
  }

  @Get("rankings")
  @ApiOperation({ summary: "排行榜 — 热门课程/活跃圈子/推广达人/新站Top5" })
  getRankings() {
    return this.svc.getRankings();
  }
}
