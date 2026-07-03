import { Controller, Get, Param, Query, Req, UseGuards, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { OfflineStationDashboardService } from "./offline-station-dashboard.service";
import { OfflineOnboardingService } from "./offline-onboarding.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("驿站仪表盘")
@Controller("offline/dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OfflineStationDashboardController {
  constructor(
    private readonly svc: OfflineStationDashboardService,
    private readonly onboarding: OfflineOnboardingService,
    private readonly prisma: PrismaService,
  ) {}

  private async getStationId(req: Request): Promise<string> {
    const userId = req.user.id;
    const station = await this.prisma.stationOffline.findFirst({ where: { ownerUserId: userId }, select: { id: true } });
    if (!station) throw new NotFoundException("未找到关联驿站，请先创建驿站");
    return station.id;
  }

  @Get("overview")
  @ApiOperation({ summary: "驿站概览 — 本月课程收入/商品收入/开课场次/学员数/到课率" })
  @ApiResponse({ status: 200, description: "成功" })
  async getOverview(@Req() req: Request) {
    return this.svc.getOverview(await this.getStationId(req));
  }

  @Get("trends")
  @ApiOperation({ summary: "收入趋势 — 课程/商品双线" })
  @ApiResponse({ status: 200, description: "成功" })
  async getTrends(@Req() req: Request) {
    return this.svc.getTrends(await this.getStationId(req));
  }

  @Get("course-ranking")
  @ApiOperation({ summary: "最受欢迎课程排行" })
  @ApiResponse({ status: 200, description: "成功" })
  async getCourseRanking(@Req() req: Request) {
    return this.svc.getCourseRanking(await this.getStationId(req));
  }

  @Get("product-ranking")
  @ApiOperation({ summary: "热销商品排行" })
  @ApiResponse({ status: 200, description: "成功" })
  async getProductRanking(@Req() req: Request) {
    return this.svc.getProductRanking(await this.getStationId(req));
  }

  @Get("recent-students")
  @ApiOperation({ summary: "最近学员报名列表" })
  @ApiResponse({ status: 200, description: "成功" })
  async getRecentStudents(@Req() req: Request) {
    return this.svc.getRecentStudents(await this.getStationId(req));
  }

  @Get("stock-alerts")
  @ApiOperation({ summary: "库存预警商品（库存<=5）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getStockAlerts(@Req() req: Request) {
    return this.svc.getStockAlerts(await this.getStationId(req));
  }

  @Get("pending-bookings")
  @ApiOperation({ summary: "待确认讲师预约" })
  @ApiResponse({ status: 200, description: "成功" })
  async getPendingBookings(@Req() req: Request) {
    return this.svc.getPendingBookings(await this.getStationId(req));
  }

  @Get("upcoming-courses")
  @ApiOperation({ summary: "即将开课提醒（未来7天）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getUpcomingCourses(@Req() req: Request) {
    return this.svc.getUpcomingCourses(await this.getStationId(req));
  }

  @Get("onboarding")
  @ApiOperation({ summary: "开业 SOP 进度（T8-P1b）：三阶段清单 done 判定 + 总进度（引导项不计分母）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getOnboarding(@Req() req: Request) {
    return this.onboarding.getOnboarding(await this.getStationId(req));
  }

  @Get("students")
  @ApiOperation({ summary: "学员洞察：本驿站报名学员画像列表（活跃/消费/兴趣标签·智能名片）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getStudents(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listStudents(req.user.id, +page || 1, Math.min(50, +pageSize || 20));
  }

  @Get("students/:id/timeline")
  @ApiOperation({ summary: "学员洞察：单个报名学员最近行为时间线（归属校验防越权）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getStudentTimeline(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getStudentTimeline(req.user.id, id);
  }
}
