import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards, Logger,
} from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { SkipFormat } from "../../common/skip-format.decorator";
import { ShopService } from "./shop.service";
import { LogisticsService } from "./logistics.service";
import { SystemService } from "../system/system.service";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto, CreateCouponDto,
  CreateCouponV2Dto, CreateReviewDto, UpdateLogisticsDto,
  ProductListQueryDto, OrderListQueryDto,
  CreateSkuDto, JsapiPayDto, NativePayDto, RefundOrderDto,
} from "./shop.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictThrottleGuard } from "../../common/throttle.guard";

/** 已认证请求，附带 JWT 解析后的 user 信息 */
type AuthRequest = Omit<Request, "user"> & {
  user: { id: string; [key: string]: unknown };
};

@ApiTags("商城")
@Controller("shop")
export class ShopController {
  private readonly logger = new Logger(ShopController.name);
  constructor(
    private shop: ShopService,
    private logistics: LogisticsService,
    private systemService: SystemService,
  ) {}

  // ───────── 商品 ─────────

  @Post("products")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建商品" })
  @ApiBearerAuth()
  createProduct(@Req() req: AuthRequest, @Body() dto: CreateProductDto) {
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
  updateProduct(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.shop.updateProduct(req.user.id, id, dto);
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
  addSku(@Param("id") id: string, @Body() dto: CreateSkuDto) {
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
  async createOrder(@Req() req: AuthRequest, @Body() dto: CreateOrderDto) {
    const result = await this.shop.createOrder(req.user.id, dto);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "CREATE",
      targetType: "ORDER",
      targetId: result.id,
      detail: `创建订单: ¥${result.amount}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
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
  myOrders(@Req() req: AuthRequest, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.getUserOrders(req.user.id, +page, +pageSize);
  }

  @Get("orders/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取订单详情" })
  @ApiBearerAuth()
  getOrder(@Param("id") id: string) {
    return this.shop.getOrder(id);
  }

  @Post("orders/:id/pay/jsapi")
  @UseGuards(JwtAuthGuard, StrictThrottleGuard)
  @ApiOperation({ summary: "JSAPI支付（小程序/公众号内支付）" })
  @ApiBearerAuth()
  async jsapiPay(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: JsapiPayDto,
  ) {
    return this.shop.createJsapiPayment(req.user.id, body.openid, id, body.notifyUrl);
  }

  @Post("orders/:id/pay/native")
  @UseGuards(JwtAuthGuard, StrictThrottleGuard)
  @ApiOperation({ summary: "Native扫码支付（PC端）" })
  @ApiBearerAuth()
  async nativePay(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body?: NativePayDto,
  ) {
    return this.shop.createNativePayment(id, req.user.id, body?.notifyUrl);
  }

  @Get("orders/:id/payment-status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查询订单支付状态" })
  @ApiBearerAuth()
  queryPaymentStatus(@Param("id") id: string) {
    return this.shop.queryPaymentStatus(id);
  }

  @Put("orders/:id/ship")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发货（管理员）" })
  @ApiBearerAuth()
  shipOrder(@Param("id") id: string) {
    return this.shop.shipOrder(id);
  }

  @Put("orders/:id/pay")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员确认支付" })
  @ApiBearerAuth()
  adminPayOrder(@Param("id") id: string) {
    return this.shop.adminPayOrder(id);
  }

  @Put("orders/:id/complete")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "完成订单（管理员）" })
  @ApiBearerAuth()
  completeOrder(@Param("id") id: string) {
    return this.shop.completeOrder(id);
  }

  @Put("orders/:id/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "退款（管理员），对接微信支付退款" })
  @ApiBearerAuth()
  async refundOrder(
    @Param("id") id: string,
    @Req() req: AuthRequest,
    @Body() body?: RefundOrderDto,
  ) {
    const result = await this.shop.refundOrder(id, body?.reason);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "REFUND",
      targetType: "ORDER",
      targetId: id,
      detail: `退款: ${id}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  // ───────── 支付回调（微信/支付宝/银联） ─────────

  @Post("pay/notify")
  @SkipFormat()
  @ApiOperation({ summary: "微信支付回调通知" })
  async handlePayNotify(@Req() req: AuthRequest) {
    const signHeader = (req.headers["wechatpay-signature"] as string) || "";
    const timestamp = (req.headers["wechatpay-timestamp"] as string) || "";
    const nonce = (req.headers["wechatpay-nonce"] as string) || "";
    const serialNo = (req.headers["wechatpay-serial"] as string) || "";
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    const { valid, data, error } = await this.shop.verifyAndDecryptNotify(
      signHeader, rawBody, timestamp, nonce, serialNo,
    );
    if (!valid || !data) {
      return { code: "FAIL", message: error || "验签失败" };
    }
    await this.shop.handlePaymentNotify(data);
    return { code: "SUCCESS", message: "OK" };
  }

  @Post("alipay/notify")
  @SkipFormat()
  @ApiOperation({ summary: "支付宝支付回调通知" })
  async handleAlipayNotify(@Req() req: AuthRequest) {
    const params = req.body;
    const { valid, data, error } = await this.shop.verifyAlipayNotify(params);
    if (!valid || !data) return "fail";
    if ((data as any).dedup) return "success"; // 重复通知，返回成功避免重发
    await this.shop.handleAlipayNotify(data);
    return "success";
  }

  @Post("unionpay/notify")
  @SkipFormat()
  @ApiOperation({ summary: "银联支付回调通知" })
  async handleUnionpayNotify(@Req() req: AuthRequest) {
    const params = req.body;
    const { valid, data, error } = await this.shop.verifyUnionpayNotify(params);
    if (!valid || !data) return "fail";
    if ((data as any).dedup) return "success";
    await this.shop.handleUnionpayNotify(data);
    return "success";
  }

  // ───────── 支付管理（管理员） ─────────

  @Post("alipay/query")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查询支付宝订单" })
  @ApiBearerAuth()
  alipayQuery(@Body("outTradeNo") outTradeNo: string) {
    return this.shop.alipayQuery(outTradeNo);
  }

  @Post("alipay/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "支付宝退款" })
  @ApiBearerAuth()
  alipayRefund(@Body() body: { outTradeNo: string; refundAmount: number; outRefundNo: string; reason?: string }) {
    return this.shop.alipayRefund(body);
  }

  @Post("unionpay/query")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查询银联订单" })
  @ApiBearerAuth()
  unionpayQuery(@Body("outTradeNo") outTradeNo: string) {
    return this.shop.unionpayQuery(outTradeNo);
  }

  @Post("unionpay/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "银联退款" })
  @ApiBearerAuth()
  unionpayRefund(@Body() body: { outTradeNo: string; outRefundNo: string; amount: number; origQryId?: string }) {
    return this.shop.unionpayRefund(body);
  }

  @Put("orders/:id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消订单" })
  @ApiBearerAuth()
  cancelOrder(@Req() req: AuthRequest, @Param("id") id: string) {
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

  @Delete("coupons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除优惠券" })
  @ApiBearerAuth()
  deleteCoupon(@Param("id") id: string) {
    return this.shop.deleteCoupon(id);
  }

  @Post("coupons/:id/claim")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "领取优惠券" })
  @ApiBearerAuth()
  claimCoupon(@Req() req: AuthRequest, @Param("id") id: string) {
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
  myCoupons(@Req() req: AuthRequest) {
    return this.shop.getUserCoupons(req.user.id);
  }

  // ───────── 商品评价 ─────────

  @Post("products/:id/reviews")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建商品评价" })
  @ApiBearerAuth()
  createReview(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: CreateReviewDto) {
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

  @Get("logistics/track")
  @ApiOperation({ summary: "查询物流轨迹（快递100）" })
  @ApiQuery({ name: "no", required: true, type: String, description: "快递单号" })
  @ApiQuery({ name: "company", required: false, type: String, description: "快递公司" })
  trackLogistics(@Query("no") no: string, @Query("company") company?: string) {
    return this.logistics.queryTrack(no, company);
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
