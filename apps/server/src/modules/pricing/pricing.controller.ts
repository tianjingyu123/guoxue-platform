import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { PricingService } from "./pricing.service";
import { UnifiedPricingService } from "./unified-pricing.service";
import { BatchUnifiedPriceDto, CreatePricingRuleDto, UpdatePricingRuleDto } from "./pricing.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

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
  @ApiResponse({ status: 200, description: "成功" })
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
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "批量计算商品统一价格" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async batchUnifiedPrice(
    @Body() body: BatchUnifiedPriceDto,
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
  @ApiResponse({ status: 200, description: "成功" })
  calcPrice(@Query("type") type: string, @Query("id") id: string, @Query("basePrice") basePrice?: string) {
    return this.svc.calculatePrice(type, id, undefined, basePrice ? +basePrice : undefined);
  }

  // ───────── 管理 ─────────

  @Get("admin/rules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "定价规则列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  listRules() { return this.svc.listRules(); }

  @Post("admin/rules")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建定价规则" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  createRule(@Body() body: CreatePricingRuleDto) { return this.svc.createRule(body); }

  @Put("admin/rules/:id")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新规则" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  updateRule(@Param("id") id: string, @Body() body: UpdatePricingRuleDto) { return this.svc.updateRule(id, body); }

  @Delete("admin/rules/:id")
  @RedLineGate(RedLine.MONEY, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除规则" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  deleteRule(@Param("id") id: string) { return this.svc.deleteRule(id); }

  @Get("admin/demand")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "需求热力图" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getDemand() { return this.svc.getDemandHeatmap(); }
}
