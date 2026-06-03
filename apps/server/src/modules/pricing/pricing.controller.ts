import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { PricingService } from "./pricing.service";
import { UnifiedPricingService } from "./unified-pricing.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("智能定价")
@Controller("pricing")
export class PricingController {
  constructor(
    private svc: PricingService,
    private unified: UnifiedPricingService,
  ) {}

  // ───────── 统一价格（公开接口） ─────────

  @Get("unified-price")
  @ApiOperation({ summary: "计算商品统一有效价格" })
  @ApiQuery({ name: "productId", required: true })
  @ApiQuery({ name: "skuId", required: false })
  @ApiQuery({ name: "pageId", required: false })
  @ApiQuery({ name: "scene", required: false })
  async getUnifiedPrice(
    @Query("productId") productId: string,
    @Query("skuId") skuId?: string,
    @Query("pageId") pageId?: string,
    @Query("scene") scene?: string,
  ) {
    return this.unified.calculateEffectivePrice(productId, skuId, undefined, { pageId, scene });
  }

  @Post("unified-price/batch")
  @ApiOperation({ summary: "批量计算商品统一价格" })
  async batchUnifiedPrice(
    @Body() body: { items: { productId: string; skuId?: string }[]; pageId?: string; scene?: string },
  ) {
    const results = await this.unified.batchCalculateEffectivePrice(
      body.items,
      undefined,
      { pageId: body.pageId, scene: body.scene },
    );
    return { items: results };
  }

  // ───────── 动态价格计算（旧接口兼容） ─────────

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
