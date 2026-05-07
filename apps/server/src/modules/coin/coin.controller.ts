import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CoinService } from "./coin.service";
import { AdminRechargeDto, CoinTransactionQueryDto } from "./coin.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("虚拟币")
@ApiBearerAuth()
@Controller("coin")
export class CoinController {
  constructor(private coin: CoinService) {}

  /** 获取我的余额 */
  @Get("balance")
  @UseGuards(JwtAuthGuard)
  getBalance(@Req() req: any) {
    return this.coin.getBalance(req.user.id);
  }

  /** 我的交易流水 */
  @Get("transactions")
  @UseGuards(JwtAuthGuard)
  getTransactions(
    @Req() req: any,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("type") type?: string,
    @Query("scene") scene?: string,
  ) {
    return this.coin.getTransactions(req.user.id, +page, +pageSize, type, scene);
  }

  /** 充值档位 */
  @Get("tiers")
  getTiers() {
    return this.coin.getRechargeTiers();
  }

  /** 管理员充值 */
  @Post("admin/recharge")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  adminRecharge(@Body() dto: AdminRechargeDto) {
    return this.coin.recharge(dto.userId, { amountCoin: dto.amountCoin, description: dto.description });
  }

  /** 管理员查看充值记录 */
  @Get("admin/recharges")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  getRecharges(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("userId") userId?: string) {
    return this.coin.getRecharges(+page, +pageSize, userId);
  }

  /** 消费虚拟币（内部调用，也暴露为API供前端异步扣款） */
  @Post("spend")
  @UseGuards(JwtAuthGuard)
  spend(@Req() req: any, @Body() dto: { amountCoin: number; scene: string; refId?: string; description?: string }) {
    return this.coin.spend(req.user.id, dto);
  }

  // ───────── 礼物系统 ─────────

  @Get("gifts")
  getGifts() {
    return this.coin.getGifts();
  }

  @Post("gifts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  createGift(@Body() dto: any) {
    return this.coin.createGift(dto);
  }

  @Post("gifts/send")
  @UseGuards(JwtAuthGuard)
  sendGift(@Req() req: any, @Body() dto: { liveRoomId: string; toUserId: string; giftId: string; quantity?: number }) {
    return this.coin.sendGift(req.user.id, dto.liveRoomId, dto.toUserId, dto.giftId, dto.quantity || 1);
  }

  @Get("gifts/rank/:liveRoomId")
  getGiftRank(@Param("liveRoomId") liveRoomId: string) {
    return this.coin.getGiftRank(liveRoomId);
  }
}
