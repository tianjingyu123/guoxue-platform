import { Controller, Get, Post, Body, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { WalletService } from "./wallet.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("钱包")
@Controller("users/wallet")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly svc: WalletService) {}

  @Get("balance")
  @ApiOperation({ summary: "钱包余额概览" })
  @ApiResponse({ status: 200, description: "成功" })
  getBalance(@Req() req: Request) {
    return this.svc.getBalance(req.user.id);
  }

  @Get("transactions")
  @ApiOperation({ summary: "交易记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "month", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getTransactions(
    @Req() req: Request,
    @Query("type") type?: string,
    @Query("month") month?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getTransactions(req.user.id, { type, month, page: +page, pageSize: +pageSize });
  }

  @Get("recharge-options")
  @ApiOperation({ summary: "充值选项列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getRechargeOptions() {
    return this.svc.getRechargeOptions();
  }

  @Get("withdraw-info")
  @ApiOperation({ summary: "提现信息（余额/费率/已存账户）" })
  @ApiResponse({ status: 200, description: "成功" })
  getWithdrawInfo(@Req() req: Request) {
    return this.svc.getWithdrawInfo(req.user.id);
  }

  @Post("withdraw")
  @RedLineGate(RedLine.MONEY)
  @ApiOperation({ summary: "提交提现申请" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  submitWithdraw(@Req() req: Request, @Body() body: { amount: number; method: string; account: Record<string, string> }) {
    return this.svc.submitWithdraw(req.user.id, body);
  }

  @Post("convert-to-coin")
  @RedLineGate(RedLine.MONEY)
  @ApiOperation({ summary: "收益转金币（可提现余额→金币·1元=10币·单向不可逆）" })
  @ApiResponse({ status: 201, description: "转换成功" })
  @ApiResponse({ status: 400, description: "余额不足/金额非法" })
  convertToCoin(@Req() req: Request, @Body() body: { amountRmb: number }) {
    return this.svc.convertToCoin(req.user.id, Number(body?.amountRmb));
  }

  @Post("recharge")
  @ApiOperation({ summary: "充值国学币（微信/支付宝/云闪付；演示模式下单后模拟到账）" })
  @ApiResponse({ status: 201, description: "充值成功" })
  @ApiResponse({ status: 400, description: "金额/支付方式错误" })
  async recharge(@Req() req: Request, @Body() body: { amountCoin: number; payMethod: string }) {
    const order = await this.svc.createRecharge(req.user.id, body);
    // 安全：生产环境绝不自动到账——只下单返回支付参数，必须由支付渠道回调（验签）标记 PAID 后到账，杜绝免费刷币。
    if (process.env.NODE_ENV === "production") {
      return { ...order, demo: false, payParams: { note: "请通过微信/支付宝/云闪付完成支付" }, message: "订单已创建，请完成支付" };
    }
    // 非生产（开发/联调）：模拟到账，便于真机演示。
    const pay = await this.svc.mockPayRecharge(req.user.id, order.orderNo);
    return { ...order, ...pay, demo: true, message: "演示模式·已模拟到账（仅非生产环境）" };
  }
}
