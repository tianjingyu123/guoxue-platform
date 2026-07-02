import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { CoinService } from "./coin.service";
import { AdminRechargeDto, AdminRefundDto, SpendDto, CreateGiftDto, SendGiftDto } from "./coin.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";

@ApiTags("虚拟币")
@ApiBearerAuth()
@Controller("coin")
export class CoinController {
  constructor(private coin: CoinService) {}

  @Get("balance")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的余额" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getBalance(@Req() req: Request) {
    return this.coin.getBalance(req.user.id);
  }

  @Get("transactions")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的交易流水" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getTransactions(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("type") type?: string,
    @Query("scene") scene?: string,
  ) {
    return this.coin.getTransactions(req.user.id, +page, +pageSize, type, scene);
  }

  @Get("tiers")
  @ApiOperation({ summary: "获取充值档位列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getTiers() {
    return this.coin.getRechargeTiers();
  }

  @Post("admin/recharge")
  @Auditable({ action: "管理员充值", targetType: "COIN" })
  @UseGuards(JwtAuthGuard, RolesGuard, StrictRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员充值", description: "管理员为用户账户充值虚拟币" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminRecharge(@Body() dto: AdminRechargeDto, @Req() req: Request) {
    return this.coin.requestRecharge(dto, req.user.id);
  }

  @Post("admin/refund")
  @Auditable({ action: "管理员发起虚拟币退款", targetType: "COIN" })
  @UseGuards(JwtAuthGuard, RolesGuard, StrictRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "管理员/客服发起虚拟币退款申请", description: "虚拟币默认不可退款；客诉等场景由管理人员发起退款（可协商金额），经财务审批通过后退回用户账户" })
  @ApiResponse({ status: 201, description: "已提交审批" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminRefund(@Body() dto: AdminRefundDto, @Req() req: Request) {
    return this.coin.requestRefund(dto, req.user.id);
  }

  @Get("admin/transactions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "管理员查看所有交易流水" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getAdminTransactions(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("userId") userId?: string,
    @Query("type") type?: string,
    @Query("scene") scene?: string,
  ) {
    return this.coin.getAdminTransactions(+page, +pageSize, userId, type, scene);
  }

  @Get("admin/recharges")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看充值记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getRecharges(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("userId") userId?: string) {
    return this.coin.getRecharges(+page, +pageSize, userId);
  }

  @Post("spend")
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "消费虚拟币", description: "按场景扣除余额（提问/打赏/入圈等）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  spend(@Req() req: Request, @Body() dto: SpendDto) {
    return this.coin.spend(req.user.id, dto);
  }

  // ───────── 礼物系统 ─────────

  @Get("gifts")
  @ApiOperation({ summary: "获取礼物列表", description: "获取所有可用礼物及其价格" })
  @ApiResponse({ status: 200, description: "成功" })
  getGifts() {
    return this.coin.getGifts();
  }

  @Post("gifts")
  @Auditable({ action: "创建礼物", targetType: "GIFT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建礼物", description: "管理员创建新礼物类型" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  createGift(@Body() dto: CreateGiftDto) {
    return this.coin.createGift(dto);
  }

  @Put("gifts/:id")
  @Auditable({ action: "更新礼物", targetType: "GIFT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新礼物", description: "管理员更新礼物信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  updateGift(@Param("id") id: string, @Body() dto: CreateGiftDto) {
    return this.coin.updateGift(id, dto);
  }

  @Delete("gifts/:id")
  @Auditable({ action: "删除礼物", targetType: "GIFT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除礼物", description: "管理员删除礼物类型" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  deleteGift(@Param("id") id: string) {
    return this.coin.deleteGift(id);
  }

  @Post("gifts/send")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "赠送礼物", description: "在直播间向主播赠送礼物" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  sendGift(@Req() req: Request, @Body() dto: SendGiftDto) {
    const targetUserId = dto.toUserId || dto.userId;
    if (!targetUserId) throw new BadRequestException("请指定接收用户ID");
    return this.coin.sendGift(req.user.id, dto.liveRoomId || "admin", targetUserId, dto.giftId, dto.quantity || 1);
  }

  @Get("gifts/rank/:liveRoomId")
  @ApiOperation({ summary: "直播礼物排行榜", description: "获取指定直播间的送礼排行" })
  @ApiResponse({ status: 200, description: "成功" })
  getGiftRank(@Param("liveRoomId") liveRoomId: string) {
    return this.coin.getGiftRank(liveRoomId);
  }
}
