import { Controller, Get, Post, Body, Param, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { Request } from "express";
import { BigScreenService } from "./bigscreen.service";
import { BigScreenAuthService } from "./bigscreen-auth.service";
import { BigScreenAuthGuard } from "./bigscreen-auth.guard";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("对外数字大屏")
@Controller("bigscreen")
export class BigScreenController {
  constructor(
    private readonly svc: BigScreenService,
    private readonly authSvc: BigScreenAuthService,
  ) {}

  @Get("platform")
  @UseGuards(BigScreenAuthGuard)
  @ApiHeader({ name: "x-bigscreen-token", required: true })
  @ApiOperation({ summary: "平台综合实力大屏" })
  getPlatform() {
    return this.svc.getPlatformScreen();
  }

  @Get("transactions")
  @UseGuards(BigScreenAuthGuard)
  @ApiHeader({ name: "x-bigscreen-token", required: true })
  @ApiOperation({ summary: "实时交易大屏" })
  getTransactions() {
    return this.svc.getTransactionsScreen();
  }

  @Get("content-eco")
  @UseGuards(BigScreenAuthGuard)
  @ApiHeader({ name: "x-bigscreen-token", required: true })
  @ApiOperation({ summary: "内容生态大屏" })
  getContentEco() {
    return this.svc.getContentEcoScreen();
  }

  @Get("ai-capability")
  @UseGuards(BigScreenAuthGuard)
  @ApiHeader({ name: "x-bigscreen-token", required: true })
  @ApiOperation({ summary: "AI能力大屏" })
  getAiCapability() {
    return this.svc.getAiCapabilityScreen();
  }

  @Get("offline-map")
  @UseGuards(BigScreenAuthGuard)
  @ApiHeader({ name: "x-bigscreen-token", required: true })
  @ApiOperation({ summary: "线下驿站分布大屏" })
  getOfflineMap() {
    return this.svc.getOfflineMapScreen();
  }
}

@ApiTags("大屏令牌管理")
@Controller("admin/bigscreen-tokens")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BigScreenTokenController {
  constructor(private readonly authSvc: BigScreenAuthService) {}

  @Post()
  @ApiOperation({ summary: "创建大屏访问令牌" })
  create(@Body() body: { type: string; validHours: number; ipWhitelist?: string }, @Req() req: Request) {
    const userId = (req.user as any).id;
    return this.authSvc.createToken({ ...body, createdBy: userId });
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "审批大屏令牌" })
  approve(@Param("id") id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    return this.authSvc.approveToken(id, userId);
  }

  @Post(":id/revoke")
  @ApiOperation({ summary: "撤销大屏令牌" })
  revoke(@Param("id") id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    return this.authSvc.revokeToken(id, userId);
  }

  @Get()
  @ApiOperation({ summary: "大屏令牌列表" })
  list() {
    return this.authSvc.listTokens();
  }

  @Post("clean-expired")
  @ApiOperation({ summary: "清理过期令牌" })
  cleanExpired() {
    return this.authSvc.cleanExpired();
  }
}
