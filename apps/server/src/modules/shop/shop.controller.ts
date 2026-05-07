import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ShopService } from "./shop.service";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto, CreateCouponDto,
  CreateCouponV2Dto, CreateReviewDto, UpdateLogisticsDto,
  ProductListQueryDto, OrderListQueryDto,
} from "./shop.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("商城")
@Controller("shop")
export class ShopController {
  constructor(private shop: ShopService) {}

  // ───────── 商品 ─────────

  @Post("products")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建商品" })
  @ApiBearerAuth()
  createProduct(@Req() req: any, @Body() dto: CreateProductDto) {
    return this.shop.createProduct(req.user.id, dto);
  }

  @Get("products")
  @ApiOperation({ summary: "获取商品列表" })
  listProducts(@Query() q: ProductListQueryDto) {
    return this.shop.listProducts(q);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "获取商品详情" })
  getProduct(@Param("id") id: string) {
    return this.shop.getProduct(id);
  }

  @Put("products/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新商品" })
  @ApiBearerAuth()
  updateProduct(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.shop.updateProduct(id, dto);
  }

  @Delete("products/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除商品" })
  @ApiBearerAuth()
  deleteProduct(@Param("id") id: string) {
    return this.shop.deleteProduct(id);
  }

  // ───────── SKU ─────────

  @Post("products/:id/skus")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加商品SKU" })
  @ApiBearerAuth()
  addSku(@Param("id") id: string, @Body() dto: { specs: Record<string, string>; price: number; stock?: number; skuCode?: string }) {
    return this.shop.addSku(id, dto);
  }

  @Delete("skus/:skuId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除商品SKU" })
  @ApiBearerAuth()
  deleteSku(@Param("skuId") skuId: string) {
    return this.shop.deleteSku(skuId);
  }

  // ───────── 订单 ─────────

  @Post("orders")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建订单" })
  @ApiBearerAuth()
  createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.shop.createOrder(req.user.id, dto);
  }

  @Get("orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取订单列表（管理员）" })
  @ApiBearerAuth()
  listOrders(@Query() q: OrderListQueryDto) {
    return this.shop.listOrders(q);
  }

  @Get("orders/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的订单" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  myOrders(@Req() req: any, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.getUserOrders(req.user.id, +page, +pageSize);
  }

  @Get("orders/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取订单详情" })
  @ApiBearerAuth()
  getOrder(@Param("id") id: string) {
    return this.shop.getOrder(id);
  }

  @Put("orders/:id/pay")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "支付订单" })
  @ApiBearerAuth()
  payOrder(@Param("id") id: string) {
    return this.shop.payOrder(id);
  }

  @Put("orders/:id/ship")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发货（管理员）" })
  @ApiBearerAuth()
  shipOrder(@Param("id") id: string) {
    return this.shop.shipOrder(id);
  }

  @Put("orders/:id/complete")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "完成订单" })
  @ApiBearerAuth()
  completeOrder(@Param("id") id: string) {
    return this.shop.completeOrder(id);
  }

  @Put("orders/:id/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "退款（管理员）" })
  @ApiBearerAuth()
  refundOrder(@Param("id") id: string) {
    return this.shop.refundOrder(id);
  }

  @Put("orders/:id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消订单" })
  @ApiBearerAuth()
  cancelOrder(@Req() req: any, @Param("id") id: string) {
    return this.shop.cancelOrder(id, req.user.id);
  }

  // ───────── 优惠券 ─────────

  @Post("coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建优惠券" })
  @ApiBearerAuth()
  createCoupon(@Body() dto: CreateCouponV2Dto) {
    return this.shop.createCoupon(dto);
  }

  @Get("coupons")
  @ApiOperation({ summary: "获取优惠券列表" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "admin", required: false, type: String, description: "是否管理员查看" })
  listCoupons(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("admin") admin?: string) {
    return this.shop.listCoupons(+page, +pageSize, admin === "true");
  }

  @Put("coupons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新优惠券" })
  @ApiBearerAuth()
  updateCoupon(@Param("id") id: string, @Body() dto: CreateCouponV2Dto) {
    return this.shop.updateCoupon(id, dto);
  }

  @Post("coupons/:id/claim")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "领取优惠券" })
  @ApiBearerAuth()
  claimCoupon(@Req() req: any, @Param("id") id: string) {
    return this.shop.claimCoupon(req.user.id, id);
  }

  @Post("coupons/:id/grant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发放优惠券给用户" })
  @ApiBearerAuth()
  grantCoupon(@Param("id") id: string, @Body("userId") userId: string) {
    return this.shop.grantCoupon(id, userId);
  }

  @Get("coupons/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的优惠券" })
  @ApiBearerAuth()
  myCoupons(@Req() req: any) {
    return this.shop.getUserCoupons(req.user.id);
  }

  // ───────── 商品评价 ─────────

  @Post("products/:id/reviews")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建商品评价" })
  @ApiBearerAuth()
  createReview(@Req() req: any, @Param("id") id: string, @Body() dto: CreateReviewDto) {
    return this.shop.createReview(req.user.id, id, dto);
  }

  @Get("products/:id/reviews")
  @ApiOperation({ summary: "获取商品评价列表" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  listReviews(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.listReviews(id, +page, +pageSize);
  }

  // ───────── 物流追踪 ─────────

  @Get("orders/:id/logistics")
  @ApiOperation({ summary: "获取物流信息" })
  getLogistics(@Param("id") id: string) {
    return this.shop.getLogistics(id);
  }

  @Put("orders/:id/logistics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新物流信息（管理员）" })
  @ApiBearerAuth()
  updateLogistics(@Param("id") id: string, @Body() dto: UpdateLogisticsDto) {
    return this.shop.updateLogistics(id, dto);
  }
}
