import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";
import { PayoutService } from "./payout.service";

/**
 * 自动代付（提现出款）。
 *
 * 新版微信商家转账不是无感到账：发起后用户要在微信里点「确认收款」，钱才到账。
 * 所以这里的 admin/payout 只是「发起」，不等于「已打款」——
 * 真正标 PAID 的是渠道回调/状态同步确认 SUCCESS 之后。
 */
@ApiTags("提现代付")
@ApiBearerAuth()
@Controller("payout")
export class PayoutController {
  constructor(private readonly svc: PayoutService) {}

  @Post("admin/withdrawals/:id/auto")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @Auditable({ action: "发起提现自动代付", targetType: "WITHDRAWAL_APPLICATION" })
  @ApiOperation({
    summary: "发起自动代付（微信商家转账）",
    description:
      "仅 APPROVED 可发起。CAS 防并发重复打款；payoutRef(=out_bill_no) 是幂等键。" +
      "发起成功后状态转 TRANSFERRING（钱还没到用户手上），需用户在微信内确认收款，" +
      "渠道回调 SUCCESS 后才标 PAID。发起失败会把状态放回 APPROVED，不会卡死。",
  })
  @ApiResponse({ status: 201, description: "已发起；needUserConfirm=true 表示待用户确认收款" })
  @ApiResponse({ status: 400, description: "状态不允许 / 未绑微信 / 渠道拒绝" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "提现申请不存在" })
  autoPayout(@Req() req: Request, @Param("id") id: string) {
    return this.svc.autoPayout(id, req.user.id);
  }

  @Post("admin/withdrawals/:id/sync")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "同步渠道转账状态（回调之外的兜底核实）" })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 403, description: "无权限" })
  syncByOutBillNo(@Body() body: { payoutRef: string }) {
    return this.svc.syncTransferState(body.payoutRef);
  }

  @Get("my/:id/confirm")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "查我的待确认转账（拿 packageInfo 调起微信确认页）",
    description:
      "packageInfo 能唤起转账确认，是敏感凭据，只返回给提现人本人。" +
      "前端拿到后调 wx.requestMerchantTransfer 让用户确认收款 —— 不确认钱永远不到账。",
  })
  @ApiResponse({ status: 200, description: "needConfirm=true 时带 packageInfo" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "只能查看自己的提现" })
  getMyConfirm(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getMyTransferConfirm(req.user.id, id);
  }
}
