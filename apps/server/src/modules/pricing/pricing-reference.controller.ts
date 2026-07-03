import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { PricingReferenceService } from "./pricing-reference.service";
import { PricingReferenceQueryDto } from "./pricing-reference.dto";

/**
 * T3 供给侧定价顾问 — 对外端点。
 *
 * 服务对象 = 定价者（讲师/商家），登录后使用。给出同类目市场价格分布参考，
 * 定价权仍完全在用户手中（R2：平台不干预、不按用户差别定价）。
 */
@ApiTags("定价顾问")
@Controller("pricing")
export class PricingReferenceController {
  constructor(private readonly svc: PricingReferenceService) {}

  @Get("reference")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "同类目定价参考（供给侧·非杀熟·仅类目维度聚合）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  async getReference(@Query() query: PricingReferenceQueryDto) {
    return this.svc.getReference({
      bizType: query.bizType,
      categoryLevel1: query.categoryLevel1,
      categoryLevel2: query.categoryLevel2,
      currentPrice: query.currentPrice,
    });
  }
}
