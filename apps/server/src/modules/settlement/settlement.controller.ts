import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";
import { SettlementRuleAdminService } from "./settlement-rule-admin.service";
import { SettlementFreezeService } from "./settlement-freeze.service";
import { SettlementBalanceReconcileService } from "./settlement-balance-reconcile.service";
import { CreateSettlementRuleDto, UpdateSettlementRuleDto } from "./settlement-rule.dto";
import { FreezeBeneficiaryDto } from "./settlement-freeze.dto";

/**
 * 结算规则后台管理（C7）—— 资金敏感：仅超管/财务管理员。
 * 规则只停用不删除（无 DELETE 端点），防止结算引擎回退到错误默认行为。
 */
@ApiTags("结算规则管理")
@ApiBearerAuth()
@Controller("settlement")
export class SettlementController {
  constructor(
    private readonly adminSvc: SettlementRuleAdminService,
    private readonly freezeSvc: SettlementFreezeService,
    private readonly balanceReconcileSvc: SettlementBalanceReconcileService,
  ) {}

  @Get("reconcile-balances")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({
    summary: "余额级对账：引擎口径转正的红绿灯（只读）",
    description:
      "逐受益主体核对「旧口径余额」与「总账全量净额」，回答唯一重要的问题：现在打开 " +
      "settlement.ledger_withdrawable.enabled，每个人的可提现余额会凭空变动多少。" +
      "canSwitch=true（全部 gap 在 1 分容差内）是转正的唯一放行条件。" +
      "注意这与每日 2AM 的逐订单对账不同：那个只覆盖双写订单，查不出「旧口径有、总账没有」的存量缺口。",
  })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  reconcileBalances() {
    return this.balanceReconcileSvc.reconcileBalances();
  }

  @Post("switch-authoritative")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "切换引擎口径转正开关", targetType: "SETTLEMENT_FLAG" })
  @ApiOperation({
    summary: "安全切换引擎口径转正开关（顺序守卫）",
    description:
      "开启(enable=true)前强制先跑余额对账，canSwitch=false 一律拒绝——防止在账没对平时转正导致" +
      "达人/站长可提现余额瞬间归零。force=true 仅极端人工兜底，会留审计告警。关闭永远安全无需对账。",
  })
  @ApiResponse({ status: 201, description: "切换成功" })
  @ApiResponse({ status: 400, description: "对账未通过，禁止转正" })
  @ApiResponse({ status: 403, description: "无权限" })
  switchAuthoritative(@Req() req: Request, @Body() body: { enable: boolean; force?: boolean }) {
    return this.balanceReconcileSvc.setAuthoritativeMode(!!body?.enable, req.user.id, !!body?.force);
  }

  @Get("rules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "分佣结算规则列表（全量按场景排序）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  listRules() {
    return this.adminSvc.listRules();
  }

  @Post("rules")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @Auditable({ action: "创建结算规则", targetType: "SETTLEMENT_RULE" })
  @ApiOperation({ summary: "创建分佣结算规则（scene 唯一；splits 比例服务端强校验）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 409, description: "场景已存在规则" })
  createRule(@Req() req: Request, @Body() dto: CreateSettlementRuleDto) {
    return this.adminSvc.createRule(dto, req.user.id);
  }

  @Put("rules/:id")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @Auditable({ action: "更新结算规则", targetType: "SETTLEMENT_RULE" })
  @ApiOperation({ summary: "更新分佣结算规则（禁止改 scene；只停用不删除）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "规则不存在" })
  updateRule(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateSettlementRuleDto) {
    return this.adminSvc.updateRule(id, dto, req.user.id);
  }

  @Post("freeze")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "事后冻结受益人待结算佣金", targetType: "LEDGER_BENEFICIARY" })
  @ApiOperation({ summary: "事后冻结：受益人全部 PENDING 台账行翻 FROZEN（不动已 SETTLED·幂等）" })
  @ApiResponse({ status: 201, description: "成功，返回冻结行数" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  freeze(@Req() req: Request, @Body() dto: FreezeBeneficiaryDto) {
    return this.freezeSvc.freezeBeneficiary(dto.beneficiaryType, dto.beneficiaryId, dto.reason, req.user.id);
  }

  @Post("unfreeze")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "解冻受益人佣金", targetType: "LEDGER_BENEFICIARY" })
  @ApiOperation({ summary: "解冻：仅解事后冻结的行（reason 前缀标记）FROZEN→PENDING；大额审批冻结行不受影响" })
  @ApiResponse({ status: 201, description: "成功，返回解冻行数" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  unfreeze(@Req() req: Request, @Body() dto: FreezeBeneficiaryDto) {
    return this.freezeSvc.unfreezeBeneficiary(dto.beneficiaryType, dto.beneficiaryId, dto.reason, req.user.id);
  }
}
