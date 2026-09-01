import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { BigScreenService } from "./bigscreen.service";
import { BigScreenAuthService } from "./bigscreen-auth.service";
import { BigScreenAuthGuard } from "./bigscreen-auth.guard";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

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
  @ApiResponse({ status: 200, description: "成功" })
  getPlatform() {
    return this.svc.getPlatformScreen();
  }

  @Get("transactions")
  @UseGuards(BigScreenAuthGuard)
  @ApiHeader({ name: "x-bigscreen-token", required: true })
  @ApiOperation({ summary: "实时交易大屏" })
  @ApiResponse({ status: 200, description: "成功" })
  getTransactions() {
    return this.svc.getTransactionsScreen();
  }

  @Get("content-eco")
  @UseGuards(BigScreenAuthGuard)
  @ApiHeader({ name: "x-bigscreen-token", required: true })
  @ApiOperation({ summary: "内容生态大屏" })
  @ApiResponse({ status: 200, description: "成功" })
  getContentEco() {
    return this.svc.getContentEcoScreen();
  }

  @Get("ai-capability")
  @UseGuards(BigScreenAuthGuard)
  @ApiHeader({ name: "x-bigscreen-token", required: true })
  @ApiOperation({ summary: "AI能力大屏" })
  @ApiResponse({ status: 200, description: "成功" })
  getAiCapability() {
    return this.svc.getAiCapabilityScreen();
  }

  @Get("offline-map")
  @UseGuards(BigScreenAuthGuard)
  @ApiHeader({ name: "x-bigscreen-token", required: true })
  @ApiOperation({ summary: "线下驿站分布大屏" })
  @ApiResponse({ status: 200, description: "成功" })
  getOfflineMap() {
    return this.svc.getOfflineMapScreen();
  }
}

@ApiTags("大屏令牌管理")
@Controller("admin/bigscreen-tokens")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
@ApiBearerAuth()
export class BigScreenTokenController {
  constructor(private readonly authSvc: BigScreenAuthService) {}

  @Post()
  @RedLineGate(RedLine.USER_DATA)
  @ApiOperation({ summary: "创建大屏访问令牌" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  create(@Body() body: { type: string; validHours: number; ipWhitelist?: string }, @Req() req: Request) {
    const userId = req.user.id;
    return this.authSvc.createToken({ ...body, createdBy: userId });
  }

  @Post(":id/approve")
  @RedLineGate(RedLine.USER_DATA)
  @ApiOperation({ summary: "审批大屏令牌" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  approve(@Param("id") id: string, @Req() req: Request) {
    const userId = req.user.id;
    return this.authSvc.approveToken(id, userId);
  }

  @Post(":id/revoke")
  @RedLineGate(RedLine.USER_DATA, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "撤销大屏令牌" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  revoke(@Param("id") id: string, @Req() req: Request) {
    const userId = req.user.id;
    return this.authSvc.revokeToken(id, userId);
  }

  @Get()
  @ApiOperation({ summary: "大屏令牌列表" })
  @ApiResponse({ status: 200, description: "成功" })
  list() {
    return this.authSvc.listTokens();
  }

  @Get("logs")
  @ApiOperation({ summary: "大屏访问日志" })
  @ApiResponse({ status: 200, description: "成功" })
  logs(@Query("pageSize") pageSize?: number) {
    return this.authSvc.getAccessLogs({ pageSize: pageSize ? Number(pageSize) : 50 });
  }

  @Delete(":id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "删除大屏令牌" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  delete(@Param("id") id: string) {
    return this.authSvc.deleteToken(id);
  }

  @Post("clean-expired")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "清理过期令牌" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  cleanExpired() {
    return this.authSvc.cleanExpired();
  }
}
