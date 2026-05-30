import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards, Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { MarketingService } from "./marketing.service";
import {
  CreateFlashSaleDto, UpdateFlashSaleDto, FlashSaleFilterDto,
  CreateFlashSaleItemDto, UpdateFlashSaleItemDto,
  CreateGroupBuyDto, UpdateGroupBuyDto, GroupBuyFilterDto,
  CreateCouponTemplateDto, UpdateCouponTemplateDto, CouponFilterDto,
  GrantCouponDto, BatchGrantCouponDto, CouponRecordFilterDto,
  CreateDiscountDto, UpdateDiscountDto, DiscountFilterDto,
  CreateMarketingPageDto, UpdateMarketingPageDto,
  CreatePageComponentDto, UpdatePageComponentDto, SortComponentsDto,
  CreateActivityDto, UpdateActivityDto, ActivityFilterDto,
  CreateFullReductionDto, UpdateFullReductionDto,
} from "./marketing.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("营销管理")
@Controller("marketing")
export class MarketingController {
  private readonly logger = new Logger(MarketingController.name);

  constructor(private marketing: MarketingService) {}

  // ═══════════════════════════════════════
  // 秒杀管理
  // ═══════════════════════════════════════

  @Post("flash-sales")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建秒杀活动" })
  @ApiBearerAuth()
  createFlashSale(@Body() dto: CreateFlashSaleDto) {
    return this.marketing.createFlashSale(dto);
  }

  @Get("flash-sales")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "秒杀活动列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  listFlashSales(@Query() dto: FlashSaleFilterDto) {
    return this.marketing.listFlashSales(dto);
  }

  @Put("flash-sales/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新秒杀活动" })
  @ApiBearerAuth()
  updateFlashSale(@Param("id") id: string, @Body() dto: UpdateFlashSaleDto) {
    return this.marketing.updateFlashSale(id, dto);
  }

  @Delete("flash-sales/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除秒杀活动" })
  @ApiBearerAuth()
  deleteFlashSale(@Param("id") id: string) {
    return this.marketing.deleteFlashSale(id);
  }

  @Post("flash-sales/:id/items")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "添加秒杀商品" })
  @ApiBearerAuth()
  addFlashSaleItem(@Param("id") id: string, @Body() dto: CreateFlashSaleItemDto) {
    return this.marketing.addFlashSaleItem(id, dto);
  }

  @Put("flash-sales/:id/items/:itemId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新秒杀商品" })
  @ApiBearerAuth()
  updateFlashSaleItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateFlashSaleItemDto,
  ) {
    return this.marketing.updateFlashSaleItem(id, itemId, dto);
  }

  @Delete("flash-sales/:id/items/:itemId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除秒杀商品" })
  @ApiBearerAuth()
  deleteFlashSaleItem(@Param("id") id: string, @Param("itemId") itemId: string) {
    return this.marketing.deleteFlashSaleItem(id, itemId);
  }

  @Post("flash-sales/:id/start")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "启动秒杀活动" })
  @ApiBearerAuth()
  startFlashSale(@Param("id") id: string) {
    return this.marketing.startFlashSale(id);
  }

  @Post("flash-sales/:id/end")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "提前结束秒杀活动" })
  @ApiBearerAuth()
  endFlashSale(@Param("id") id: string) {
    return this.marketing.endFlashSale(id);
  }

  // ═══════════════════════════════════════
  // 拼团管理
  // ═══════════════════════════════════════

  @Post("group-buys")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建拼团活动" })
  @ApiBearerAuth()
  createGroupBuy(@Body() dto: CreateGroupBuyDto) {
    return this.marketing.createGroupBuy(dto);
  }

  @Get("group-buys")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "拼团活动列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  listGroupBuys(@Query() dto: GroupBuyFilterDto) {
    return this.marketing.listGroupBuys(dto);
  }

  @Put("group-buys/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新拼团活动" })
  @ApiBearerAuth()
  updateGroupBuy(@Param("id") id: string, @Body() dto: UpdateGroupBuyDto) {
    return this.marketing.updateGroupBuy(id, dto);
  }

  @Delete("group-buys/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除拼团活动" })
  @ApiBearerAuth()
  deleteGroupBuy(@Param("id") id: string) {
    return this.marketing.deleteGroupBuy(id);
  }

  @Get("group-buys/:id/participants")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查看拼团参与者" })
  @ApiBearerAuth()
  getGroupBuyParticipants(@Param("id") id: string) {
    return this.marketing.getGroupBuyParticipants(id);
  }

  // ═══════════════════════════════════════
  // 优惠券管理
  // ═══════════════════════════════════════

  @Post("coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建优惠券模板" })
  @ApiBearerAuth()
  createCouponTemplate(@Body() dto: CreateCouponTemplateDto) {
    return this.marketing.createCouponTemplate(dto);
  }

  @Get("coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "优惠券模板列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  @ApiQuery({ name: "type", required: false, type: String, description: "类型筛选" })
  listCouponTemplates(@Query() dto: CouponFilterDto) {
    return this.marketing.listCouponTemplates(dto);
  }

  @Put("coupons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新优惠券模板" })
  @ApiBearerAuth()
  updateCouponTemplate(@Param("id") id: string, @Body() dto: UpdateCouponTemplateDto) {
    return this.marketing.updateCouponTemplate(id, dto);
  }

  @Delete("coupons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除优惠券模板" })
  @ApiBearerAuth()
  deleteCouponTemplate(@Param("id") id: string) {
    return this.marketing.deleteCouponTemplate(id);
  }

  @Post("coupons/:id/grant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发放优惠券给指定用户" })
  @ApiBearerAuth()
  grantCoupon(@Param("id") id: string, @Body() dto: GrantCouponDto) {
    return this.marketing.grantCoupon(id, dto);
  }

  @Post("coupons/:id/batch-grant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量发放优惠券" })
  @ApiBearerAuth()
  batchGrantCoupon(@Param("id") id: string, @Body() dto: BatchGrantCouponDto) {
    return this.marketing.batchGrantCoupon(id, dto);
  }

  @Get("coupons/:id/records")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查看优惠券领取/使用记录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  getCouponRecords(@Param("id") id: string, @Query() dto: CouponRecordFilterDto) {
    return this.marketing.getCouponRecords(id, dto);
  }

  // ═══════════════════════════════════════
  // 限时折扣
  // ═══════════════════════════════════════

  @Post("discounts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建限时折扣" })
  @ApiBearerAuth()
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.marketing.createDiscount(dto);
  }

  @Get("discounts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "限时折扣列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  listDiscounts(@Query() dto: DiscountFilterDto) {
    return this.marketing.listDiscounts(dto);
  }

  @Put("discounts/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新限时折扣" })
  @ApiBearerAuth()
  updateDiscount(@Param("id") id: string, @Body() dto: UpdateDiscountDto) {
    return this.marketing.updateDiscount(id, dto);
  }

  @Delete("discounts/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除限时折扣" })
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
  @ApiBearerAuth()
  createPage(@Body() dto: CreateMarketingPageDto) {
    return this.marketing.createPage(dto);
  }

  @Get("pages")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "微页面列表" })
  @ApiBearerAuth()
  listPages() {
    return this.marketing.listPages();
  }

  @Get("pages/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取微页面详情" })
  @ApiBearerAuth()
  getPage(@Param("id") id: string) {
    return this.marketing.getPage(id);
  }

  @Put("pages/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新微页面" })
  @ApiBearerAuth()
  updatePage(@Param("id") id: string, @Body() dto: UpdateMarketingPageDto) {
    return this.marketing.updatePage(id, dto);
  }

  @Delete("pages/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除微页面" })
  @ApiBearerAuth()
  deletePage(@Param("id") id: string) {
    return this.marketing.deletePage(id);
  }

  @Post("pages/:id/components")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "添加页面组件" })
  @ApiBearerAuth()
  addPageComponent(@Param("id") id: string, @Body() dto: CreatePageComponentDto) {
    return this.marketing.addPageComponent(id, dto);
  }

  @Put("pages/:id/components/:compId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新页面组件" })
  @ApiBearerAuth()
  updatePageComponent(
    @Param("id") id: string,
    @Param("compId") compId: string,
    @Body() dto: UpdatePageComponentDto,
  ) {
    return this.marketing.updatePageComponent(id, compId, dto);
  }

  @Delete("pages/:id/components/:compId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除页面组件" })
  @ApiBearerAuth()
  deletePageComponent(@Param("id") id: string, @Param("compId") compId: string) {
    return this.marketing.deletePageComponent(id, compId);
  }

  @Put("pages/:id/components/sort")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "组件排序" })
  @ApiBearerAuth()
  sortPageComponents(@Param("id") id: string, @Body() dto: SortComponentsDto) {
    return this.marketing.sortPageComponents(id, dto);
  }

  @Post("pages/:id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发布微页面" })
  @ApiBearerAuth()
  publishPage(@Param("id") id: string) {
    return this.marketing.publishPage(id);
  }

  @Get("pages/:id/versions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "微页面历史版本列表" })
  @ApiBearerAuth()
  getPageVersions(@Param("id") id: string) {
    return this.marketing.getPageVersions(id);
  }

  @Post("pages/:id/rollback/:versionId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "回滚微页面到指定版本" })
  @ApiBearerAuth()
  rollbackPage(@Param("id") id: string, @Param("versionId") versionId: string) {
    return this.marketing.rollbackPage(id, versionId);
  }

  // ═══════════════════════════════════════
  // 用户端公开接口
  // ═══════════════════════════════════════

  @Get("pages/by-route")
  @ApiOperation({ summary: "根据路由获取已发布的微页面（用户端公开）" })
  @ApiQuery({ name: "route", required: true, type: String, description: "页面路由路径" })
  getPublishedPageByRoute(@Query("route") route: string) {
    return this.marketing.getPublishedPageByRoute(route);
  }

  // ═══════════════════════════════════════
  // 活动管理
  // ═══════════════════════════════════════

  @Post("activities")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建活动" })
  @ApiBearerAuth()
  createActivity(@Body() dto: CreateActivityDto) {
    return this.marketing.createActivity(dto);
  }

  @Get("activities")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "活动列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选" })
  listActivities(@Query() dto: ActivityFilterDto) {
    return this.marketing.listActivities(dto);
  }

  @Put("activities/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新活动" })
  @ApiBearerAuth()
  updateActivity(@Param("id") id: string, @Body() dto: UpdateActivityDto) {
    return this.marketing.updateActivity(id, dto);
  }

  @Delete("activities/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除活动" })
  @ApiBearerAuth()
  deleteActivity(@Param("id") id: string) {
    return this.marketing.deleteActivity(id);
  }

  @Get("activities/:id/metrics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查看活动实时指标" })
  @ApiBearerAuth()
  getActivityMetrics(@Param("id") id: string) {
    return this.marketing.getActivityMetrics(id);
  }

  // ═══════════════════════════════════════
  // 满减送管理
  // ═══════════════════════════════════════

  @Post("full-reductions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建满减送活动" })
  @ApiBearerAuth()
  createFullReduction(@Body() dto: CreateFullReductionDto) {
    return this.marketing.createFullReduction(dto);
  }

  @Put("full-reductions/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新满减送活动" })
  @ApiBearerAuth()
  updateFullReduction(@Param("id") id: string, @Body() dto: UpdateFullReductionDto) {
    return this.marketing.updateFullReduction(id, dto);
  }

  @Delete("full-reductions/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除满减送活动" })
  @ApiBearerAuth()
  deleteFullReduction(@Param("id") id: string) {
    return this.marketing.deleteFullReduction(id);
  }

  @Get("full-reductions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "满减送活动分页列表" })
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
  getActiveFullReductions() {
    return this.marketing.getActiveFullReductions();
  }

  // ═══════════════════════════════════════
  // 用户端公开接口
  // ═══════════════════════════════════════

  @Get("flash-sales/active")
  @ApiOperation({ summary: "获取进行中和预告中的秒杀活动（用户端公开）" })
  getActiveFlashSales() {
    return this.marketing.getActiveFlashSales();
  }

  @Get("group-buys/active")
  @ApiOperation({ summary: "获取进行中的拼团活动（用户端公开）" })
  getActiveGroupBuys() {
    return this.marketing.getActiveGroupBuys();
  }

  @Post("group-buys/:id/join")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "参与拼团" })
  @ApiBearerAuth()
  joinGroupBuy(@Req() req: any, @Param("id") id: string, @Body() dto?: { groupId?: string }) {
    return this.marketing.joinGroupBuy(req.user.id, id, dto?.groupId);
  }

  @Get("group-buys/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的拼团记录" })
  @ApiBearerAuth()
  getMyGroupBuys(@Req() req: any) {
    return this.marketing.getMyGroupBuys(req.user.id);
  }

  @Get("full-reductions/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取满减送活动详情" })
  @ApiBearerAuth()
  getFullReduction(@Param("id") id: string) {
    return this.marketing.getFullReduction(id);
  }
}
