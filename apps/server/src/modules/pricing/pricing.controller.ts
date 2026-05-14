import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PricingService } from "./pricing.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("智能定价")
@Controller("pricing")
export class PricingController {
  constructor(private svc: PricingService) {}

  @Get("calc-price")
  @ApiOperation({ summary: "计算动态价格" })
  calcPrice(@Query("type") type: string, @Query("id") id: string, @Query("basePrice") basePrice?: string) {
    return this.svc.calculatePrice(type, id, undefined, basePrice ? +basePrice : undefined);
  }

  // ───────── 管理 ─────────

  @Get("admin/rules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "定价规则列表" })
  listRules() { return this.svc.listRules(); }

  @Post("admin/rules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建定价规则" })
  createRule(@Body() body: Record<string, unknown>) { return this.svc.createRule(body); }

  @Put("admin/rules/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新规则" })
  updateRule(@Param("id") id: string, @Body() body: Record<string, unknown>) { return this.svc.updateRule(id, body); }

  @Delete("admin/rules/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除规则" })
  deleteRule(@Param("id") id: string) { return this.svc.deleteRule(id); }

  @Get("admin/demand")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "需求热力图" })
  getDemand() { return this.svc.getDemandHeatmap(); }
}
