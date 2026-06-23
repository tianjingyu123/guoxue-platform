import { Request } from "express";
import { Controller, Get, Post, Put, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { VideoCreatorService } from "./video-creator.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

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

  @Put("settings")
  @ApiOperation({ summary: "保存创作者设置" })
  @ApiResponse({ status: 200, description: "设置已保存" })
  saveSettings(@Req() req: Request, @Body() data: Record<string, any>) {
    return this.svc.saveSettings(req.user.id, data);
  }
}
