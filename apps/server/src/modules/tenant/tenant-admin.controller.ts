import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { TenantService } from "./tenant.service";
import { CreateTenantDto, UpdateTenantDto, TenantRechargeDto } from "./tenant.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("SaaS租户管理（Admin）")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
@Controller("admin/tenants")
export class TenantAdminController {
  constructor(private svc: TenantService) {}

  @Post()
  @RedLineGate(RedLine.USER_DATA)
  @ApiOperation({ summary: "创建租户" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  create(@Req() req: Request, @Body() dto: CreateTenantDto) {
    return this.svc.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: "租户列表" })
  @ApiResponse({ status: 200, description: "成功" })
  list(@Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("status") status?: string, @Query("keyword") keyword?: string) {
    return this.svc.list({ page: page ? +page : 1, pageSize: pageSize ? +pageSize : 20, status, keyword });
  }

  @Get(":id")
  @ApiOperation({ summary: "租户详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getById(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @Put(":id")
  @RedLineGate(RedLine.USER_DATA)
  @ApiOperation({ summary: "更新租户" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  update(@Param("id") id: string, @Body() dto: UpdateTenantDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "删除租户" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  delete(@Param("id") id: string) {
    return this.svc.deleteTenant(id);
  }

  @Post(":id/recharge")
  @RedLineGate(RedLine.MONEY)
  @ApiOperation({ summary: "充值配额" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  recharge(@Req() req: Request, @Param("id") id: string, @Body() dto: TenantRechargeDto) {
    return this.svc.recharge(id, dto, req.user.id);
  }

  @Post(":id/reset-key")
  @RedLineGate(RedLine.USER_DATA, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "重置 API Key" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  regenerateKey(@Param("id") id: string) {
    return this.svc.regenerateApiKey(id);
  }

  @Get(":id/usage")
  @ApiOperation({ summary: "用量统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getUsage(@Param("id") id: string, @Query("days") days?: string) {
    return this.svc.getUsageStats(id, days ? +days : 30);
  }

  @Get(":id/logs")
  @ApiOperation({ summary: "API调用日志（分页）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getLogs(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.getApiLogs(id, { page: page ? +page : 1, pageSize: pageSize ? +pageSize : 20, status });
  }

  @Post("reset-quotas")
  @ApiOperation({ summary: "手动触发月度配额重置" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  resetMonthlyQuotas() {
    return this.svc.resetMonthlyQuotas();
  }
}
