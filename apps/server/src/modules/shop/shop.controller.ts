import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from "@nestjs/common";
import { ShopService } from "./shop.service";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto, CreateCouponDto,
  CreateCouponV2Dto, CreateReviewDto, UpdateLogisticsDto,
  ProductListQueryDto, OrderListQueryDto,
} from "./shop.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@Controller("shop")
export class ShopController {
  constructor(private shop: ShopService) {}

  // ───────── 商品 ─────────

  @Post("products")
  @UseGuards(JwtAuthGuard)
  createProduct(@Req() req: any, @Body() dto: CreateProductDto) {
    return this.shop.createProduct(req.user.id, dto);
  }

  @Get("products")
  listProducts(@Query() q: ProductListQueryDto) {
    return this.shop.listProducts(q);
  }

  @Get("products/:id")
  getProduct(@Param("id") id: string) {
    return this.shop.getProduct(id);
  }

  @Put("products/:id")
  @UseGuards(JwtAuthGuard)
  updateProduct(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.shop.updateProduct(id, dto);
  }

  @Delete("products/:id")
  @UseGuards(JwtAuthGuard)
  deleteProduct(@Param("id") id: string) {
    return this.shop.deleteProduct(id);
  }

  // ───────── SKU ─────────

  @Post("products/:id/skus")
  @UseGuards(JwtAuthGuard)
  addSku(@Param("id") id: string, @Body() dto: { specs: Record<string, string>; price: number; stock?: number; skuCode?: string }) {
    return this.shop.addSku(id, dto);
  }

  @Delete("skus/:skuId")
  @UseGuards(JwtAuthGuard)
  deleteSku(@Param("skuId") skuId: string) {
    return this.shop.deleteSku(skuId);
  }

  // ───────── 订单 ─────────

  @Post("orders")
  @UseGuards(JwtAuthGuard)
  createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.shop.createOrder(req.user.id, dto);
  }

  @Get("orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  listOrders(@Query() q: OrderListQueryDto) {
    return this.shop.listOrders(q);
  }

  @Get("orders/my")
  @UseGuards(JwtAuthGuard)
  myOrders(@Req() req: any, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.getUserOrders(req.user.id, +page, +pageSize);
  }

  @Get("orders/:id")
  @UseGuards(JwtAuthGuard)
  getOrder(@Param("id") id: string) {
    return this.shop.getOrder(id);
  }

  @Put("orders/:id/pay")
  @UseGuards(JwtAuthGuard)
  payOrder(@Param("id") id: string) {
    return this.shop.payOrder(id);
  }

  @Put("orders/:id/ship")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  shipOrder(@Param("id") id: string) {
    return this.shop.shipOrder(id);
  }

  @Put("orders/:id/complete")
  @UseGuards(JwtAuthGuard)
  completeOrder(@Param("id") id: string) {
    return this.shop.completeOrder(id);
  }

  @Put("orders/:id/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  refundOrder(@Param("id") id: string) {
    return this.shop.refundOrder(id);
  }

  @Put("orders/:id/cancel")
  @UseGuards(JwtAuthGuard)
  cancelOrder(@Req() req: any, @Param("id") id: string) {
    return this.shop.cancelOrder(id, req.user.id);
  }

  // ───────── 优惠券 ─────────

  @Post("coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  createCoupon(@Body() dto: CreateCouponV2Dto) {
    return this.shop.createCoupon(dto);
  }

  @Get("coupons")
  listCoupons(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("admin") admin?: string) {
    return this.shop.listCoupons(+page, +pageSize, admin === "true");
  }

  @Put("coupons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  updateCoupon(@Param("id") id: string, @Body() dto: CreateCouponV2Dto) {
    return this.shop.updateCoupon(id, dto);
  }

  @Post("coupons/:id/claim")
  @UseGuards(JwtAuthGuard)
  claimCoupon(@Req() req: any, @Param("id") id: string) {
    return this.shop.claimCoupon(req.user.id, id);
  }

  @Post("coupons/:id/grant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  grantCoupon(@Param("id") id: string, @Body("userId") userId: string) {
    return this.shop.grantCoupon(id, userId);
  }

  @Get("coupons/my")
  @UseGuards(JwtAuthGuard)
  myCoupons(@Req() req: any) {
    return this.shop.getUserCoupons(req.user.id);
  }

  // ───────── 商品评价 ─────────

  @Post("products/:id/reviews")
  @UseGuards(JwtAuthGuard)
  createReview(@Req() req: any, @Param("id") id: string, @Body() dto: CreateReviewDto) {
    return this.shop.createReview(req.user.id, id, dto);
  }

  @Get("products/:id/reviews")
  listReviews(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.listReviews(id, +page, +pageSize);
  }

  // ───────── 物流追踪 ─────────

  @Get("orders/:id/logistics")
  getLogistics(@Param("id") id: string) {
    return this.shop.getLogistics(id);
  }

  @Put("orders/:id/logistics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  updateLogistics(@Param("id") id: string, @Body() dto: UpdateLogisticsDto) {
    return this.shop.updateLogistics(id, dto);
  }
}
