import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";
import { PayeeAccountService } from "./payee-account.service";
import { SaveQualificationDto } from "./payee-account.dto";

/**
 * 收款主体（分账接收方）—— 资金架构地基。
 *
 * 进件让驿站/商家/圈主在汇付眼里「存在」（拿到 huifu_id），持牌机构才有分账的分发对象。
 * 没有它，任何分账都无从谈起 —— 平台就只能「代收再转」，那是二清。
 */
@ApiTags("收款主体进件")
@ApiBearerAuth()
@Controller("payee-accounts")
export class PayeeAccountController {
  constructor(private readonly svc: PayeeAccountService) {}

  @Get(":subjectType/:subjectId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查主体的收款账户（敏感字段只回尾号）" })
  @ApiResponse({ status: 200, description: "成功；未进件则返回 null" })
  @ApiResponse({ status: 401, description: "未登录" })
  getAccount(@Param("subjectType") subjectType: string, @Param("subjectId") subjectId: string) {
    return this.svc.getAccount(subjectType, subjectId);
  }

  @Get(":subjectType/:subjectId/settlement")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "解析主体收款口径（下单/分账用）",
    description:
      "返回 settlementMode（PLATFORM_COLLECT 平台收款 / SELF_COLLECT 主体自收）、" +
      "payeeHuifuId（自收款时的分账接收方）与 platformRate（平台分成）。" +
      "未进件或未 ACTIVE 一律按 PLATFORM_COLLECT 处理，保守不分错人。",
  })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  resolveSettlement(@Param("subjectType") subjectType: string, @Param("subjectId") subjectId: string) {
    return this.svc.resolveSettlement(subjectType, subjectId);
  }

  @Post("qualification")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard)
  @Auditable({ action: "提交收款主体资质", targetType: "PAYEE_ACCOUNT" })
  @ApiOperation({
    summary: "提交/更新进件资质（DRAFT）",
    description: "法人身份证号与结算账号加密落库；已提交渠道的主体不可再改资料（否则与渠道档案不一致，无从对账）。",
  })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 400, description: "参数校验失败 / 已提交不可改" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "只能提交自己主体的资质" })
  saveQualification(@Req() req: Request, @Body() dto: SaveQualificationDto) {
    return this.svc.saveQualification(req.user.id, dto);
  }

  // ───────── 管理端 ─────────

  @Post("admin/:id/submit")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @Auditable({ action: "提交汇付进件", targetType: "PAYEE_ACCOUNT" })
  @ApiOperation({
    summary: "提交汇付进件（DRAFT/REJECTED → SUBMITTED）",
    description: "CAS 防并发重复开户；渠道调用异常会把状态放回，不会永久卡在 SUBMITTED。",
  })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 400, description: "状态不允许 / 资料不完整 / 渠道拒绝" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "收款账户不存在" })
  submit(@Req() req: Request, @Param("id") id: string) {
    return this.svc.submitToChannel(id, req.user.id);
  }

  @Post("admin/:id/sync")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "同步渠道审核进度（APPROVING → ACTIVE / REJECTED）" })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "收款账户不存在" })
  sync(@Param("id") id: string) {
    return this.svc.syncChannelStatus(id);
  }
}
