import { Request } from "express";
import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { VideoCreatorService } from "./video-creator.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";

@ApiTags("视频创作者中心")
@Controller("videos/creator")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VideoCreatorController {
  constructor(private readonly svc: VideoCreatorService) {}

  @Get("overview")
  @ApiOperation({ summary: "创作者数据概览" })
  @ApiResponse({ status: 200, description: "返回创作者核心指标" })
  getOverview(@Req() req: Request) {
    return this.svc.getOverview(req.user.id);
  }

  @Get("videos")
  @ApiOperation({ summary: "我的作品列表" })
  @ApiResponse({ status: 200, description: "返回创作者所有视频" })
  getMyVideos(@Req() req: Request) {
    return this.svc.getMyVideos(req.user.id);
  }

  @Get("products")
  @ApiOperation({ summary: "可带货商品库" })
  @ApiResponse({ status: 200, description: "返回平台商品列表" })
  getProducts() {
    return this.svc.getProducts();
  }

  @Get("earnings/preview")
  @ApiOperation({ summary: "收益预览 — 最近收益明细" })
  @ApiResponse({ status: 200, description: "返回最近10笔收益" })
  getEarningsPreview(@Req() req: Request) {
    return this.svc.getEarningsPreview(req.user.id);
  }

  @Get("analytics")
  @ApiOperation({ summary: "数据分析 — 播放互动趋势" })
  @ApiResponse({ status: 200, description: "返回播放趋势与视频指标" })
  getAnalytics(@Req() req: Request) {
    return this.svc.getAnalytics(req.user.id);
  }

  @Get("sales")
  @ApiOperation({ summary: "销售数据 — 带货统计" })
  @ApiResponse({ status: 200, description: "返回销售趋势与TOP商品" })
  getSales(@Req() req: Request) {
    return this.svc.getSales(req.user.id);
  }

  @Get("revenue")
  @ApiOperation({ summary: "收益概览 — 可提现/冻结/累计" })
  @ApiResponse({ status: 200, description: "返回收益账户概览" })
  getRevenueOverview(@Req() req: Request) {
    return this.svc.getRevenueOverview(req.user.id);
  }

  @Get("withdraw-history")
  @ApiOperation({ summary: "提现记录列表" })
  @ApiResponse({ status: 200, description: "返回提现历史" })
  getWithdrawHistory(@Req() req: Request) {
    return this.svc.getWithdrawHistory(req.user.id);
  }

  @Get("earnings/history")
  @ApiOperation({ summary: "收益历史 — 月度汇总" })
  @ApiResponse({ status: 200, description: "返回月度收益记录" })
  getEarningsHistory(@Req() req: Request) {
    return this.svc.getEarningsHistory(req.user.id);
  }

  @Post("withdraw")
  @ApiOperation({ summary: "提交提现申请" })
  @ApiResponse({ status: 201, description: "提现申请已提交" })
  @ApiResponse({ status: 400, description: "余额不足" })
  submitWithdraw(@Req() req: Request, @Body() data: { amount: number; method: string; account: string }) {
    return this.svc.submitWithdraw(req.user.id, data);
  }

  @Post("products")
  @ApiOperation({ summary: "添加商品到视频" })
  @ApiResponse({ status: 201, description: "商品已关联" })
  addProduct(@Req() req: Request, @Body() data: { videoId: string; productId: string }) {
    return this.svc.addProduct(req.user.id, data);
  }

  @Get("settings")
  @ApiOperation({ summary: "读取创作者设置 — 资料/通知/隐私" })
  @ApiResponse({ status: 200, description: "返回当前创作者设置" })
  getSettings(@Req() req: Request) {
    return this.svc.getSettings(req.user.id);
  }

  @Put("settings")
  @ApiOperation({ summary: "保存创作者设置" })
  @ApiResponse({ status: 200, description: "设置已保存" })
  saveSettings(@Req() req: Request, @Body() data: Record<string, any>) {
    return this.svc.saveSettings(req.user.id, data);
  }

  // ───────── 管理后台（SUPER_ADMIN / OPERATION_ADMIN） ─────────

  @Get("admin/creators")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创作者列表（管理员）— 含数据概览" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "keyword", required: false, type: String, description: "昵称/手机号搜索" })
  adminListCreators(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("keyword") keyword?: string,
  ) {
    return this.svc.adminListCreators(+page, +pageSize, keyword);
  }

  @Get("admin/creators/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创作者详情（管理员）— 资料/概览/作品" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminGetCreator(@Param("id") id: string) {
    return this.svc.adminGetCreator(id);
  }

  @Get("admin/withdrawals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "创作者提现申请列表（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "keyword", required: false, type: String, description: "昵称/手机号搜索" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态过滤 PENDING/APPROVED/REJECTED/PAID" })
  adminListWithdrawals(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("keyword") keyword?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.adminListWithdrawals(+page, +pageSize, keyword, status);
  }

  @Post("admin/withdrawals/:id/review")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @Auditable({ action: "创作者提现审批", targetType: "VIDEO_CREATOR_WITHDRAWAL" })
  @ApiOperation({ summary: "审批创作者提现申请（通过/拒绝/打款）" })
  @ApiResponse({ status: 200, description: "审批成功" })
  @ApiResponse({ status: 400, description: "状态非法或参数错误" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "申请不存在" })
  reviewWithdrawal(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() data: { action: "approve" | "reject" | "pay"; note?: string },
  ) {
    return this.svc.reviewWithdrawal(id, req.user.id, data);
  }
}
