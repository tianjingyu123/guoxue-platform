import { Body, Controller, Delete, Get, GoneException, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { PricingService } from "./pricing.service";
import { UnifiedPricingService } from "./unified-pricing.service";
import { BatchUnifiedPriceDto } from "./pricing.dto";
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

  // ───────── 统一价格（公开接口，真实交易同源） ─────────

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
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async batchUnifiedPrice(@Body() body: BatchUnifiedPriceDto) {
    const results = await this.unified.batchCalculateEffectivePrice(
      body.items,
      undefined,
      { pageId: body.pageId, scene: body.scene },
    );
    return { items: results };
  }

  // ───────── 旧动态规则（未接入交易，保留路由只为明确拒绝旧客户端） ─────────

  @Get("calc-price")
  @ApiOperation({ summary: "旧动态规则试算（已停用）", deprecated: true })
  @ApiResponse({ status: 410, description: "旧动态规则未接入真实交易，接口已停用" })
  calcPrice(): never {
    return this.legacyPricingGone();
  }

  // ───────── 历史记录只读 ─────────

  @Get("admin/rules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "旧定价规则历史记录（只读）", deprecated: true })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  listRules() {
    return this.svc.listRules();
  }

  @Post("admin/rules")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "旧定价规则写入（已停用）", deprecated: true })
  @ApiResponse({ status: 410, description: "请改用真实基础价与营销活动入口" })
  createRule(): never {
    return this.legacyPricingGone();
  }

  @Put("admin/rules/:id")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "旧定价规则更新（已停用）", deprecated: true })
  @ApiResponse({ status: 410, description: "请改用真实基础价与营销活动入口" })
  updateRule(): never {
    return this.legacyPricingGone();
  }

  @Delete("admin/rules/:id")
  @RedLineGate(RedLine.MONEY, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "旧定价规则删除（已停用）", deprecated: true })
  @ApiResponse({ status: 410, description: "历史记录只读保留，不再删除" })
  deleteRule(): never {
    return this.legacyPricingGone();
  }

  @Get("admin/demand")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "需求热力图" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getDemand() {
    return this.svc.getDemandHeatmap();
  }

  private legacyPricingGone(): never {
    throw new GoneException(
      "旧动态定价规则未接入真实下单计价，已停用写入与试算；请在商品、课程、圈子或营销活动中维护真实价格",
    );
  }
}
