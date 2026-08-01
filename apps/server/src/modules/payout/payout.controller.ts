import { Body, Controller, Get, Logger, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";
import { SkipFormat } from "../../common/skip-format.decorator";
import { PayoutService } from "./payout.service";
import { WechatPayService } from "../shop/wechat-pay.service";

/** 微信 V3 回调需对原始报文字节验签（JSON.stringify 会改变字节序/空白导致验签失败） */
type RawRequest = Request & { rawBody?: Buffer };

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
  private readonly logger = new Logger(PayoutController.name);

  constructor(
    private readonly svc: PayoutService,
    private readonly wechat: WechatPayService,
  ) {}

  /**
   * 微信商家转账结果回调。
   *
   * 【为什么必须有它】不接回调，钱到账了系统也不知道 —— 提现会永远卡在 TRANSFERRING，
   * 用户余额被占着、状态永远不变 PAID。
   *
   * 【只把回调当触发信号，不信任其内容】验签通过后仍主动向微信查一次真实状态
   * （syncTransferState → queryTransferByOutBillNo）。回调内容是外部输入，
   * 而这里决定的是「钱到没到账」—— 以我们主动查到的结果为准，最稳。
   *
   * 【回 SUCCESS 要慎重】只有确凿处理才回 SUCCESS；未处理回 FAIL 让微信重试。
   * 否则会出现「钱已到账、系统却没记上，微信还不再重试」的黑洞。
   */
  @Post("wechat/transfer-notify")
  @SkipFormat()
  @ApiOperation({ summary: "微信商家转账结果回调（微信服务器调用·无需登录）" })
  @ApiResponse({ status: 201, description: "SUCCESS=已确凿处理；FAIL=请重试" })
  async handleTransferNotify(@Req() req: RawRequest) {
    // 微信把签名信息拆在多个 header 里，需拼回 parseNotifySign 认的格式
    const signHeader =
      `timestamp="${req.headers["wechatpay-timestamp"] ?? ""}",` +
      `nonce_str="${req.headers["wechatpay-nonce"] ?? ""}",` +
      `signature="${req.headers["wechatpay-signature"] ?? ""}",` +
      `serial_no="${req.headers["wechatpay-serial"] ?? ""}"`;

    const rawBody =
      req.rawBody?.toString("utf8") ??
      (typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    const { valid, data, error } = await this.wechat.verifyAndDecryptNotify(signHeader, rawBody);
    if (!valid || !data) {
      this.logger.error(`转账回调验签失败: ${error}`);
      return { code: "FAIL", message: error || "验签失败" };
    }

    const outBillNo = (data as Record<string, unknown>).out_bill_no as string;
    if (!outBillNo) {
      this.logger.warn("转账回调缺少 out_bill_no，忽略", data);
      return { code: "SUCCESS", message: "OK" }; // 无从处理的通知，不让微信空转重试
    }

    try {
      // 不信任回调里的 state，主动查渠道确认真实状态
      await this.svc.syncTransferState(outBillNo);
      return { code: "SUCCESS", message: "OK" };
    } catch (e) {
      // 处理失败必须回 FAIL 让微信重试，绝不能吞掉 —— 否则钱到账了系统却永远不知道
      this.logger.error(`转账回调处理失败 outBillNo=${outBillNo}`, e as Error);
      return { code: "FAIL", message: "处理中，请重试" };
    }
  }

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

  @Post("admin/withdrawals/sync")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({
    summary: "同步渠道转账状态（回调之外的兜底核实）",
    description: "按 payoutRef(=渠道 out_bill_no) 主动查微信真实状态并落地。回调丢失时用它兜底。",
  })
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
