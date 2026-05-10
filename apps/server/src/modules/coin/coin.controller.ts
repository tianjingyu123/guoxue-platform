import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { CoinService } from "./coin.service";
import { AdminRechargeDto, CoinTransactionQueryDto, SpendDto, CreateGiftDto, SendGiftDto } from "./coin.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("虚拟币")
@ApiBearerAuth()
@Controller("coin")
export class CoinController {
  constructor(private coin: CoinService) {}

  @Get("balance")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的余额" })
  getBalance(@Req() req: Request) {
    return this.coin.getBalance(req.user.id);
  }

  @Get("transactions")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的交易流水" })
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
  getTiers() {
    return this.coin.getRechargeTiers();
  }

  @Post("admin/recharge")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员充值", description: "管理员为用户账户充值虚拟币" })
  adminRecharge(@Body() dto: AdminRechargeDto) {
    return this.coin.recharge(dto.userId, { amountCoin: dto.amountCoin, description: dto.description });
  }

  @Get("admin/recharges")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看充值记录" })
  getRecharges(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("userId") userId?: string) {
    return this.coin.getRecharges(+page, +pageSize, userId);
  }

  @Post("spend")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "消费虚拟币", description: "按场景扣除余额（提问/打赏/入圈等）" })
  spend(@Req() req: Request, @Body() dto: SpendDto) {
    return this.coin.spend(req.user.id, dto);
  }

  // ───────── 礼物系统 ─────────

  @Get("gifts")
  @ApiOperation({ summary: "获取礼物列表", description: "获取所有可用礼物及其价格" })
  getGifts() {
    return this.coin.getGifts();
  }

  @Post("gifts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建礼物", description: "管理员创建新礼物类型" })
  createGift(@Body() dto: CreateGiftDto) {
    return this.coin.createGift(dto);
  }

  @Delete("gifts/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除礼物", description: "管理员删除礼物类型" })
  deleteGift(@Param("id") id: string) {
    return this.coin.deleteGift(id);
  }

  @Post("gifts/send")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "赠送礼物", description: "在直播间向主播赠送礼物" })
  sendGift(@Req() req: Request, @Body() dto: SendGiftDto) {
    return this.coin.sendGift(req.user.id, dto.liveRoomId, dto.toUserId, dto.giftId, dto.quantity || 1);
  }

  @Get("gifts/rank/:liveRoomId")
  @ApiOperation({ summary: "直播礼物排行榜", description: "获取指定直播间的送礼排行" })
  getGiftRank(@Param("liveRoomId") liveRoomId: string) {
    return this.coin.getGiftRank(liveRoomId);
  }
}
