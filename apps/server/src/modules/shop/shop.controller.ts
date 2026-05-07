import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from "@nestjs/common";
import { ShopService } from "./shop.service";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto, CreateCouponDto,
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

  // ───────── 优惠券 ─────────

  @Post("coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.shop.createCoupon(dto);
  }

  @Get("coupons")
  listCoupons(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.listCoupons(+page, +pageSize);
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
}
