import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { SettlementRuleAdminService } from "./settlement-rule-admin.service";
import { CreateSettlementRuleDto, UpdateSettlementRuleDto } from "./settlement-rule.dto";

/**
 * 结算规则后台管理（C7）—— 资金敏感：仅超管/财务管理员。
 * 规则只停用不删除（无 DELETE 端点），防止结算引擎回退到错误默认行为。
 */
@ApiTags("结算规则管理")
@ApiBearerAuth()
@Controller("settlement")
export class SettlementController {
  constructor(private readonly adminSvc: SettlementRuleAdminService) {}

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
}
