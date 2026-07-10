import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { Auditable } from "../../common/audit.decorator";
import { MerchantService } from "./merchant.service";
import { MerchantSettlementService } from "./merchant-settlement.service";
import { MerchantGuard } from "./merchant.guard";
import {
  UpdateMerchantProfileDto, ProductQueryDto, MerchantOrderQueryDto,
  ShipOrderDto, RejectRefundDto, ReviewQueryDto, ReplyReviewDto,
  PaginationDto, AppealViolationDto, MerchantProductDto, MerchantSkuDto, ProcessAfterSaleDto,
} from "./merchant.dto";

type AuthRequest = Omit<Request, "user"> & { user: { id: string; [key: string]: unknown } };

@ApiTags("商家后台")
@Controller("merchant-backend")
@UseGuards(JwtAuthGuard, MerchantGuard)
@ApiBearerAuth()
export class MerchantBackendController {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly settlementService: MerchantSettlementService,
  ) {}

  private getMerchant(req: AuthRequest) {
    return (req as any).merchant;
  }

  // 店铺归属统一取 owner 的 userId：这样操作员(非 owner)以店铺身份操作时，
  // 商品/评价/通知等仍按店铺 owner 归属，既有 Product.userId→Merchant 反查链路不受影响。
  private shopUserId(req: AuthRequest): string {
    return this.getMerchant(req).userId;
  }

  // ── 数据概览 ──

  @Get("dashboard")
  @ApiOperation({ summary: "商家数据概览" })
  @ApiResponse({ status: 200, description: "成功" })
  getDashboard(@Req() req: AuthRequest) {
    return this.merchantService.getDashboard(this.shopUserId(req));
  }

  // ── 店铺信息 ──

  @Get("profile")
  @ApiOperation({ summary: "获取店铺信息" })
  @ApiResponse({ status: 200, description: "成功" })
  getProfile(@Req() req: AuthRequest) {
    return this.merchantService.getMerchantById(this.getMerchant(req).id);
  }

  @Put("profile")
  @ApiOperation({ summary: "更新店铺信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  updateProfile(@Req() req: AuthRequest, @Body() dto: UpdateMerchantProfileDto) {
    return this.merchantService.updateProfile(this.getMerchant(req).id, dto);
  }

  // ── 商品管理 ──

  @Get("products")
  @ApiOperation({ summary: "商品列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listProducts(@Req() req: AuthRequest, @Query() q: ProductQueryDto) {
    return this.merchantService.listProducts(this.shopUserId(req), q);
  }

  @Post("products")
  @ApiOperation({ summary: "发布商品" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createProduct(@Req() req: AuthRequest, @Body() dto: MerchantProductDto) {
    return this.merchantService.createProduct(this.shopUserId(req), dto);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "商品详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.getProduct(this.shopUserId(req), id);
  }

  @Put("products/:id")
  @Auditable({ action: "商家商品编辑（含价格变更）", targetType: "PRODUCT" })
  @ApiOperation({ summary: "更新商品" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateProduct(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: Partial<MerchantProductDto>) {
    return this.merchantService.updateProduct(this.shopUserId(req), id, dto);
  }

  @Delete("products/:id")
  @ApiOperation({ summary: "删除商品" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.deleteProduct(this.shopUserId(req), id);
  }

  @Post("products/:id/skus")
  @ApiOperation({ summary: "添加商品SKU（店铺身份·操作员可用）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  addSku(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: MerchantSkuDto) {
    return this.merchantService.addProductSku(this.shopUserId(req), id, dto);
  }

  @Delete("skus/:skuId")
  @ApiOperation({ summary: "删除商品SKU（店铺身份·操作员可用）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  deleteSku(@Req() req: AuthRequest, @Param("skuId") skuId: string) {
    return this.merchantService.deleteProductSku(this.shopUserId(req), skuId);
  }

  @Post("products/:id/list")
  @ApiOperation({ summary: "上架商品" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  listProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.listProduct(this.shopUserId(req), id);
  }

  @Post("products/:id/unlist")
  @ApiOperation({ summary: "下架商品" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  unlistProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.unlistProduct(this.shopUserId(req), id);
  }

  // ── 订单管理 ──

  @Get("orders")
  @ApiOperation({ summary: "订单列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listOrders(@Req() req: AuthRequest, @Query() q: MerchantOrderQueryDto) {
    return this.merchantService.listOrders(this.getMerchant(req).id, q);
  }

  @Get("orders/:id")
  @ApiOperation({ summary: "订单详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getOrder(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.getOrder(this.getMerchant(req).id, id);
  }

  @Put("orders/:id/ship")
  @ApiOperation({ summary: "发货" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  shipOrder(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: ShipOrderDto) {
    return this.merchantService.shipOrder(this.getMerchant(req).id, id, dto);
  }

  @Post("orders/:id/refund/approve")
  @ApiOperation({ summary: "同意退款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  approveRefund(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.approveRefund(this.getMerchant(req).id, id);
  }

  @Post("orders/:id/refund/reject")
  @ApiOperation({ summary: "拒绝退款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  rejectRefund(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: RejectRefundDto) {
    return this.merchantService.rejectRefund(this.getMerchant(req).id, id, dto.reason);
  }

  // ── 评价管理 ──

  @Get("reviews")
  @ApiOperation({ summary: "评价列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listReviews(@Req() req: AuthRequest, @Query() q: ReviewQueryDto) {
    return this.merchantService.listReviews(this.shopUserId(req), q);
  }

  @Post("reviews/:id/reply")
  @ApiOperation({ summary: "回复评价" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  replyReview(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: ReplyReviewDto) {
    return this.merchantService.replyReview(this.shopUserId(req), id, dto.reply);
  }

  // ── 收入概览 ──

  @Get("revenue")
  @ApiOperation({ summary: "收入概览" })
  @ApiResponse({ status: 200, description: "成功" })
  getRevenue(@Req() req: AuthRequest) {
    return this.settlementService.getRevenueOverview(this.getMerchant(req).id);
  }

  @Get("settlements")
  @ApiOperation({ summary: "结算记录" })
  @ApiResponse({ status: 200, description: "成功" })
  listSettlements(@Req() req: AuthRequest, @Query() q: PaginationDto) {
    return this.settlementService.listSettlements(this.getMerchant(req).id, q);
  }

  // ── 违规申诉 ──

  @Get("violations")
  @ApiOperation({ summary: "违规记录" })
  @ApiResponse({ status: 200, description: "成功" })
  listViolations(@Req() req: AuthRequest, @Query() q: PaginationDto) {
    return this.merchantService.listViolations(this.getMerchant(req).id, q);
  }

  @Post("violations/:id/appeal")
  @ApiOperation({ summary: "违规申诉" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  appealViolation(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: AppealViolationDto) {
    return this.merchantService.appealViolation(this.getMerchant(req).id, id, dto.appeal);
  }

  // ── 售后管理 ──

  @Get("after-sales")
  @ApiOperation({ summary: "售后列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listAfterSales(
    @Req() req: AuthRequest,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.merchantService.listAfterSales(this.getMerchant(req).id, {
      type, status,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get("after-sales/:id")
  @ApiOperation({ summary: "售后详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getAfterSale(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.getAfterSale(this.getMerchant(req).id, id);
  }

  @Put("after-sales/:id/process")
  @ApiOperation({ summary: "处理售后（approve/reject/complete）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  processAfterSale(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: ProcessAfterSaleDto,
  ) {
    return this.merchantService.processAfterSale(this.getMerchant(req).id, id, dto);
  }

  // ── 客户管理 ──

  @Get("customers")
  @ApiOperation({ summary: "客户列表（在本店下过单的用户）" })
  @ApiResponse({ status: 200, description: "成功" })
  listCustomers(
    @Req() req: AuthRequest,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.merchantService.listCustomers(this.getMerchant(req).id, {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  // ── 平台通知 / 客户咨询 / 内容统计 ──

  @Get("notices")
  @ApiOperation({ summary: "平台通知列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getNotices(@Req() req: AuthRequest) {
    return this.merchantService.getNotices(this.shopUserId(req));
  }

  @Get("inquiries")
  @ApiOperation({ summary: "客户咨询列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listInquiries(
    @Req() req: AuthRequest,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.merchantService.listInquiries(this.getMerchant(req).id, {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get("content-stats")
  @ApiOperation({ summary: "内容统计（商品/文章数量与浏览点赞）" })
  @ApiResponse({ status: 200, description: "成功" })
  getContentStats(@Req() req: AuthRequest) {
    return this.merchantService.getContentStats(this.getMerchant(req).id);
  }
}
