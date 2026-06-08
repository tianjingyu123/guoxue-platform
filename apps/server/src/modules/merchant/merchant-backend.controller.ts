import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { MerchantService } from "./merchant.service";
import { MerchantSettlementService } from "./merchant-settlement.service";
import { MerchantGuard } from "./merchant.guard";
import {
  UpdateMerchantProfileDto, ProductQueryDto, MerchantOrderQueryDto,
  ShipOrderDto, RejectRefundDto, ReviewQueryDto, ReplyReviewDto,
  PaginationDto, AppealViolationDto, MerchantProductDto, ProcessAfterSaleDto,
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

  // ── 数据概览 ──

  @Get("dashboard")
  @ApiOperation({ summary: "商家数据概览" })
  getDashboard(@Req() req: AuthRequest) {
    return this.merchantService.getDashboard(req.user.id);
  }

  // ── 店铺信息 ──

  @Get("profile")
  @ApiOperation({ summary: "获取店铺信息" })
  getProfile(@Req() req: AuthRequest) {
    return this.merchantService.getMerchantById(this.getMerchant(req).id);
  }

  @Put("profile")
  @ApiOperation({ summary: "更新店铺信息" })
  updateProfile(@Req() req: AuthRequest, @Body() dto: UpdateMerchantProfileDto) {
    return this.merchantService.updateProfile(this.getMerchant(req).id, dto);
  }

  // ── 商品管理 ──

  @Get("products")
  @ApiOperation({ summary: "商品列表" })
  listProducts(@Req() req: AuthRequest, @Query() q: ProductQueryDto) {
    return this.merchantService.listProducts(req.user.id, q);
  }

  @Post("products")
  @ApiOperation({ summary: "发布商品" })
  createProduct(@Req() req: AuthRequest, @Body() dto: MerchantProductDto) {
    return this.merchantService.createProduct(req.user.id, dto);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "商品详情" })
  getProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.getProduct(req.user.id, id);
  }

  @Put("products/:id")
  @ApiOperation({ summary: "更新商品" })
  updateProduct(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: Partial<MerchantProductDto>) {
    return this.merchantService.updateProduct(req.user.id, id, dto);
  }

  @Delete("products/:id")
  @ApiOperation({ summary: "删除商品" })
  deleteProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.deleteProduct(req.user.id, id);
  }

  @Post("products/:id/list")
  @ApiOperation({ summary: "上架商品" })
  listProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.listProduct(req.user.id, id);
  }

  @Post("products/:id/unlist")
  @ApiOperation({ summary: "下架商品" })
  unlistProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.unlistProduct(req.user.id, id);
  }

  // ── 订单管理 ──

  @Get("orders")
  @ApiOperation({ summary: "订单列表" })
  listOrders(@Req() req: AuthRequest, @Query() q: MerchantOrderQueryDto) {
    return this.merchantService.listOrders(this.getMerchant(req).id, q);
  }

  @Get("orders/:id")
  @ApiOperation({ summary: "订单详情" })
  getOrder(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.getOrder(this.getMerchant(req).id, id);
  }

  @Put("orders/:id/ship")
  @ApiOperation({ summary: "发货" })
  shipOrder(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: ShipOrderDto) {
    return this.merchantService.shipOrder(this.getMerchant(req).id, id, dto);
  }

  @Post("orders/:id/refund/approve")
  @ApiOperation({ summary: "同意退款" })
  approveRefund(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.approveRefund(this.getMerchant(req).id, id);
  }

  @Post("orders/:id/refund/reject")
  @ApiOperation({ summary: "拒绝退款" })
  rejectRefund(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: RejectRefundDto) {
    return this.merchantService.rejectRefund(this.getMerchant(req).id, id, dto.reason);
  }

  // ── 评价管理 ──

  @Get("reviews")
  @ApiOperation({ summary: "评价列表" })
  listReviews(@Req() req: AuthRequest, @Query() q: ReviewQueryDto) {
    return this.merchantService.listReviews(req.user.id, q);
  }

  @Post("reviews/:id/reply")
  @ApiOperation({ summary: "回复评价" })
  replyReview(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: ReplyReviewDto) {
    return this.merchantService.replyReview(req.user.id, id, dto.reply);
  }

  // ── 收入概览 ──

  @Get("revenue")
  @ApiOperation({ summary: "收入概览" })
  getRevenue(@Req() req: AuthRequest) {
    return this.settlementService.getRevenueOverview(this.getMerchant(req).id);
  }

  @Get("settlements")
  @ApiOperation({ summary: "结算记录" })
  listSettlements(@Req() req: AuthRequest, @Query() q: PaginationDto) {
    return this.settlementService.listSettlements(this.getMerchant(req).id, q);
  }

  // ── 违规申诉 ──

  @Get("violations")
  @ApiOperation({ summary: "违规记录" })
  listViolations(@Req() req: AuthRequest, @Query() q: PaginationDto) {
    return this.merchantService.listViolations(this.getMerchant(req).id, q);
  }

  @Post("violations/:id/appeal")
  @ApiOperation({ summary: "违规申诉" })
  appealViolation(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: AppealViolationDto) {
    return this.merchantService.appealViolation(this.getMerchant(req).id, id, dto.appeal);
  }

  // ── 售后管理 ──

  @Get("after-sales")
  @ApiOperation({ summary: "售后列表" })
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
  getAfterSale(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.getAfterSale(this.getMerchant(req).id, id);
  }

  @Put("after-sales/:id/process")
  @ApiOperation({ summary: "处理售后（approve/reject/complete）" })
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
}
