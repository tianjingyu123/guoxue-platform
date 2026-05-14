import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { TenantService } from "./tenant.service";
import { CreateTenantDto, UpdateTenantDto, TenantRechargeDto, TenantListDto } from "./tenant.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("SaaS租户管理（Admin）")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
@Controller("admin/tenants")
export class TenantAdminController {
  constructor(private svc: TenantService) {}

  @Post()
  @ApiOperation({ summary: "创建租户" })
  create(@Req() req: Request, @Body() dto: CreateTenantDto) {
    return this.svc.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: "租户列表" })
  list(@Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("status") status?: string, @Query("keyword") keyword?: string) {
    return this.svc.list({ page: page ? +page : 1, pageSize: pageSize ? +pageSize : 20, status, keyword });
  }

  @Get(":id")
  @ApiOperation({ summary: "租户详情" })
  getById(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新租户" })
  update(@Param("id") id: string, @Body() dto: UpdateTenantDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除租户" })
  delete(@Param("id") id: string) {
    return this.svc.deleteTenant(id);
  }

  @Post(":id/recharge")
  @ApiOperation({ summary: "充值配额" })
  recharge(@Req() req: Request, @Param("id") id: string, @Body() dto: TenantRechargeDto) {
    return this.svc.recharge(id, dto, req.user.id);
  }

  @Post(":id/reset-key")
  @ApiOperation({ summary: "重置 API Key" })
  regenerateKey(@Param("id") id: string) {
    return this.svc.regenerateApiKey(id);
  }

  @Get(":id/usage")
  @ApiOperation({ summary: "用量统计" })
  getUsage(@Param("id") id: string, @Query("days") days?: string) {
    return this.svc.getUsageStats(id, days ? +days : 30);
  }

  @Post("reset-quotas")
  @ApiOperation({ summary: "手动触发月度配额重置" })
  resetMonthlyQuotas() {
    return this.svc.resetMonthlyQuotas();
  }
}
