import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards, Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { MarketingService } from "./marketing.service";
import {
  CreateFlashSaleDto, UpdateFlashSaleDto, FlashSaleFilterDto,
  CreateFlashSaleItemDto, UpdateFlashSaleItemDto,
  CreateGroupBuyDto, UpdateGroupBuyDto, GroupBuyFilterDto,
  CreateCouponTemplateDto, UpdateCouponTemplateDto, CouponFilterDto,
  GrantCouponDto, BatchGrantCouponDto, CouponRecordFilterDto, MyCouponFilterDto,
  CreateDiscountDto, UpdateDiscountDto, DiscountFilterDto,
  CreateMarketingPageDto, UpdateMarketingPageDto,
  CreatePageComponentDto, UpdatePageComponentDto, SortComponentsDto,
  CreateActivityDto, UpdateActivityDto, ActivityFilterDto,
  CreateFullReductionDto, UpdateFullReductionDto,
} from "./marketing.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("营销管理")
@Controller("marketing")
export class MarketingController {
  private readonly logger = new Logger(MarketingController.name);

  constructor(private marketing: MarketingService) {}

  // ═══════════════════════════════════════
  // 秒杀管理
  // ═══════════════════════════════════════

  @Post("flash-sales")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建秒杀活动" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createFlashSale(@Body() dto: CreateFlashSaleDto) {
    return this.marketing.createFlashSale(dto);
  }

  @Get("flash-sales")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "秒杀活动列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  listFlashSales(@Query() dto: FlashSaleFilterDto) {
    return this.marketing.listFlashSales(dto);
  }

  @Put("flash-sales/:id")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新秒杀活动" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateFlashSale(@Param("id") id: string, @Body() dto: UpdateFlashSaleDto) {
    return this.marketing.updateFlashSale(id, dto);
  }

  @Delete("flash-sales/:id")
  @RedLineGate(RedLine.MONEY, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除秒杀活动" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteFlashSale(@Param("id") id: string) {
    return this.marketing.deleteFlashSale(id);
  }

  @Post("flash-sales/:id/items")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "添加秒杀商品" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  addFlashSaleItem(@Param("id") id: string, @Body() dto: CreateFlashSaleItemDto) {
    return this.marketing.addFlashSaleItem(id, dto);
  }

  @Put("flash-sales/:id/items/:itemId")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新秒杀商品" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateFlashSaleItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateFlashSaleItemDto,
  ) {
    return this.marketing.updateFlashSaleItem(id, itemId, dto);
  }

  @Delete("flash-sales/:id/items/:itemId")
  @RedLineGate(RedLine.MONEY, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除秒杀商品" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteFlashSaleItem(@Param("id") id: string, @Param("itemId") itemId: string) {
    return this.marketing.deleteFlashSaleItem(id, itemId);
  }

  @Post("flash-sales/:id/start")
  @RedLineGate(RedLine.MONEY, RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "启动秒杀活动" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  startFlashSale(@Param("id") id: string) {
    return this.marketing.startFlashSale(id);
  }

  @Post("flash-sales/:id/end")
  @RedLineGate(RedLine.MONEY, RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "提前结束秒杀活动" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  endFlashSale(@Param("id") id: string) {
    return this.marketing.endFlashSale(id);
  }

  // ═══════════════════════════════════════
  // 拼团管理
  // ═══════════════════════════════════════

  @Post("group-buys")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建拼团活动" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createGroupBuy(@Body() dto: CreateGroupBuyDto) {
    return this.marketing.createGroupBuy(dto);
  }

  @Get("group-buys")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "拼团活动列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  listGroupBuys(@Query() dto: GroupBuyFilterDto) {
    return this.marketing.listGroupBuys(dto);
  }

  @Put("group-buys/:id")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新拼团活动" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateGroupBuy(@Param("id") id: string, @Body() dto: UpdateGroupBuyDto) {
    return this.marketing.updateGroupBuy(id, dto);
  }

  @Delete("group-buys/:id")
  @RedLineGate(RedLine.MONEY, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除拼团活动" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteGroupBuy(@Param("id") id: string) {
    return this.marketing.deleteGroupBuy(id);
  }

  @Get("group-buys/:id/participants")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查看拼团参与者" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getGroupBuyParticipants(@Param("id") id: string) {
    return this.marketing.getGroupBuyParticipants(id);
  }

  // ═══════════════════════════════════════
  // 优惠券管理
  // ═══════════════════════════════════════

  @Post("coupons")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建优惠券模板" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createCouponTemplate(@Body() dto: CreateCouponTemplateDto) {
    return this.marketing.createCouponTemplate(dto);
  }

  @Get("coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "优惠券模板列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  @ApiQuery({ name: "type", required: false, type: String, description: "类型筛选" })
  listCouponTemplates(@Query() dto: CouponFilterDto) {
    return this.marketing.listCouponTemplates(dto);
  }

  @Put("coupons/:id")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新优惠券模板" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateCouponTemplate(@Param("id") id: string, @Body() dto: UpdateCouponTemplateDto) {
    return this.marketing.updateCouponTemplate(id, dto);
  }

  @Delete("coupons/:id")
  @RedLineGate(RedLine.MONEY, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除优惠券模板" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteCouponTemplate(@Param("id") id: string) {
    return this.marketing.deleteCouponTemplate(id);
  }

  @Post("coupons/:id/grant")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发放优惠券给指定用户（券体系已统一，:id 为「商城优惠券」ID，发放即建可下单核销的 UserCoupon）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  grantCoupon(@Param("id") id: string, @Body() dto: GrantCouponDto) {
    return this.marketing.grantCoupon(id, dto);
  }

  @Post("coupons/:id/batch-grant")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量发放优惠券（券体系已统一，:id 为「商城优惠券」ID，发放即建可下单核销的 UserCoupon）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  batchGrantCoupon(@Param("id") id: string, @Body() dto: BatchGrantCouponDto) {
    return this.marketing.batchGrantCoupon(id, dto);
  }

  @Get("coupons/:id/records")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查看优惠券领取/使用记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  getCouponRecords(@Param("id") id: string, @Query() dto: CouponRecordFilterDto) {
    return this.marketing.getCouponRecords(id, dto);
  }

  // ═══════════════════════════════════════
  // 优惠券中心（用户端·主动领券）
  // ═══════════════════════════════════════

  @Get("coupons/available")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "[已废弃·此体系不通下单核销，C端请用 /shop/coupons] 可领取的优惠券模板列表", deprecated: true })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  listAvailableCoupons(@Req() req: Request) {
    return this.marketing.listAvailableCoupons(req.user.id);
  }

  @Post("coupons/templates/:id/claim")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "[已废弃·此体系不通下单核销，C端请用 /shop/coupons/:id/claim] 领取优惠券", deprecated: true })
  @ApiResponse({ status: 201, description: "领取成功，返回券记录 couponId" })
  @ApiResponse({ status: 400, description: "已抢完/已达领取上限/活动未开始或已结束" })
  @ApiResponse({ status: 404, description: "优惠券模板不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  claimCoupon(@Req() req: Request, @Param("id") id: string) {
    return this.marketing.claimCouponTemplate(req.user.id, id);
  }

  @Get("coupons/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "[已废弃·此体系不通下单核销，C端请用 /shop/coupons/my] 我的优惠券列表", deprecated: true })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "status", required: false, enum: ["UNUSED", "USED", "EXPIRED"], description: "券状态筛选" })
  getMyCoupons(@Req() req: Request, @Query() dto: MyCouponFilterDto) {
    return this.marketing.getMyCoupons(req.user.id, dto);
  }

  // ═══════════════════════════════════════
  // 限时折扣
  // ═══════════════════════════════════════

  @Post("discounts")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建限时折扣" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.marketing.createDiscount(dto);
  }

  @Get("discounts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "限时折扣列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  listDiscounts(@Query() dto: DiscountFilterDto) {
    return this.marketing.listDiscounts(dto);
  }

  @Put("discounts/:id")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新限时折扣" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateDiscount(@Param("id") id: string, @Body() dto: UpdateDiscountDto) {
    return this.marketing.updateDiscount(id, dto);
  }

  @Delete("discounts/:id")
  @RedLineGate(RedLine.MONEY, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除限时折扣" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteDiscount(@Param("id") id: string) {
    return this.marketing.deleteDiscount(id);
  }

  // ═══════════════════════════════════════
  // 微页面编辑器后端
  // ═══════════════════════════════════════

  @Post("pages")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建微页面" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createPage(@Body() dto: CreateMarketingPageDto) {
    return this.marketing.createPage(dto);
  }

  @Get("pages")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "微页面列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  listPages(@Query("stationId") stationId?: string) {
    return this.marketing.listPages(stationId);
  }

  // 用户端公开接口：须声明在 pages/:id 之前，否则 /pages/by-route 被 :id 动态段捕获→命中鉴权 401
  @Get("pages/by-route")
  @ApiOperation({ summary: "根据路由获取已发布的微页面（用户端公开·游客可读）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "route", required: true, type: String, description: "页面路由路径" })
  getPublishedPageByRoute(@Query("route") route: string) {
    return this.marketing.getPublishedPageByRoute(route);
  }

  @Get("pages/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取微页面详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getPage(@Param("id") id: string) {
    return this.marketing.getPage(id);
  }

  @Put("pages/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新微页面" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updatePage(@Param("id") id: string, @Body() dto: UpdateMarketingPageDto) {
    return this.marketing.updatePage(id, dto);
  }

  @Delete("pages/:id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除微页面" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deletePage(@Param("id") id: string) {
    return this.marketing.deletePage(id);
  }

  @Post("pages/:id/components")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "添加页面组件" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  addPageComponent(@Param("id") id: string, @Body() dto: CreatePageComponentDto) {
    return this.marketing.addPageComponent(id, dto);
  }

  @Put("pages/:id/components/:compId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新页面组件" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updatePageComponent(
    @Param("id") id: string,
    @Param("compId") compId: string,
    @Body() dto: UpdatePageComponentDto,
  ) {
    return this.marketing.updatePageComponent(id, compId, dto);
  }

  @Delete("pages/:id/components/:compId")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除页面组件" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deletePageComponent(@Param("id") id: string, @Param("compId") compId: string) {
    return this.marketing.deletePageComponent(id, compId);
  }

  @Put("pages/:id/components/sort")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "组件排序" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  sortPageComponents(@Param("id") id: string, @Body() dto: SortComponentsDto) {
    return this.marketing.sortPageComponents(id, dto);
  }

  @Post("pages/:id/publish")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发布微页面" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  publishPage(@Param("id") id: string) {
    return this.marketing.publishPage(id);
  }

  @Get("pages/:id/versions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "微页面历史版本列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getPageVersions(@Param("id") id: string) {
    return this.marketing.getPageVersions(id);
  }

  @Post("pages/:id/rollback/:versionId")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "回滚微页面到指定版本" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  rollbackPage(@Param("id") id: string, @Param("versionId") versionId: string) {
    return this.marketing.rollbackPage(id, versionId);
  }

  // ═══════════════════════════════════════
  // 活动管理
  // ═══════════════════════════════════════

  @Post("activities")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建活动" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createActivity(@Body() dto: CreateActivityDto) {
    return this.marketing.createActivity(dto);
  }

  @Get("activities")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "活动列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  listActivities(@Query() dto: ActivityFilterDto) {
    return this.marketing.listActivities(dto);
  }

  @Put("activities/:id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新活动" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateActivity(@Param("id") id: string, @Body() dto: UpdateActivityDto) {
    return this.marketing.updateActivity(id, dto);
  }

  @Delete("activities/:id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除活动" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteActivity(@Param("id") id: string) {
    return this.marketing.deleteActivity(id);
  }

  @Get("activities/:id/metrics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查看活动实时指标" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getActivityMetrics(@Param("id") id: string) {
    return this.marketing.getActivityMetrics(id);
  }

  // ═══════════════════════════════════════
  // 满减送管理
  // ═══════════════════════════════════════

  @Post("full-reductions")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建满减送活动" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createFullReduction(@Body() dto: CreateFullReductionDto) {
    return this.marketing.createFullReduction(dto);
  }

  @Put("full-reductions/:id")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新满减送活动" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateFullReduction(@Param("id") id: string, @Body() dto: UpdateFullReductionDto) {
    return this.marketing.updateFullReduction(id, dto);
  }

  @Delete("full-reductions/:id")
  @RedLineGate(RedLine.MONEY, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除满减送活动" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteFullReduction(@Param("id") id: string) {
    return this.marketing.deleteFullReduction(id);
  }

  @Get("full-reductions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "满减送活动分页列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  getFullReductions(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
  ) {
    return this.marketing.getFullReductions(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      status,
    );
  }

  @Get("full-reductions/active")
  @ApiOperation({ summary: "获取进行中的满减送活动（公开接口）" })
  @ApiResponse({ status: 200, description: "成功" })
  getActiveFullReductions() {
    return this.marketing.getActiveFullReductions();
  }

  // ═══════════════════════════════════════
  // 用户端公开接口
  // ═══════════════════════════════════════

  @Get("flash-sales/active")
  @ApiOperation({ summary: "获取进行中和预告中的秒杀活动（用户端公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  getActiveFlashSales() {
    return this.marketing.getActiveFlashSales();
  }

  @Get("group-buys/active")
  @ApiOperation({ summary: "获取进行中的拼团活动（用户端公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  getActiveGroupBuys() {
    return this.marketing.getActiveGroupBuys();
  }

  @Get("group-buys/:id/detail")
  @ApiOperation({ summary: "拼团详情（用户端公开·含商品与进行中的团）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "拼团不存在" })
  getGroupBuyDetailPublic(@Param("id") id: string) {
    return this.marketing.getGroupBuyDetailPublic(id);
  }

  @Post("group-buys/:id/join")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "参与拼团" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  joinGroupBuy(@Req() req: Request, @Param("id") id: string, @Body() dto?: { groupId?: string }) {
    return this.marketing.joinGroupBuy(req.user.id, id, dto?.groupId);
  }

  @Get("group-buys/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的拼团记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getMyGroupBuys(@Req() req: Request) {
    return this.marketing.getMyGroupBuys(req.user.id);
  }

  @Get("group-buys/:id/my-result")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的拼团结果（成功/失败结果页数据源）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "未参与该拼团" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getMyGroupBuyResult(@Req() req: Request, @Param("id") id: string) {
    return this.marketing.getMyGroupBuyResult(req.user.id, id);
  }

  @Get("full-reductions/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取满减送活动详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getFullReduction(@Param("id") id: string) {
    return this.marketing.getFullReduction(id);
  }
}
