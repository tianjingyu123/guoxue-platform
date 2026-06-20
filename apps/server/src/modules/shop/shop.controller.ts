import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards, Logger, ForbiddenException,
} from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { SkipFormat } from "../../common/skip-format.decorator";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { ShopService } from "./shop.service";
import { ShopCouponService } from "./shop-coupon.service";
import { LogisticsService } from "./logistics.service";
import { SystemService } from "../system/system.service";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto,
  CreateCouponV2Dto, CreateReviewDto, UpdateLogisticsDto,
  CreateFreightTemplateDto, UpdateFreightTemplateDto, ReplyReviewDto,
  ProductListQueryDto, OrderListQueryDto,
  CreateSkuDto, JsapiPayDto, NativePayDto, RefundOrderDto,
  AddToCartDto, AdminPayOrderDto, AlipayRefundDto,
  UnionpayRefundDto, ApplyAfterSaleDto,
} from "./shop.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RequireFeature } from "../../common/feature-flag.decorator";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";

/** 已认证请求，附带 JWT 解析后的 user 信息 */
type AuthRequest = Omit<Request, "user"> & {
  user: { id: string; roles: string[]; nickname?: string; [key: string]: unknown };
};

@ApiTags("商城")
@Controller("shop")
export class ShopController {
  private readonly logger = new Logger(ShopController.name);
  constructor(
    private shop: ShopService,
    private couponSvc: ShopCouponService,
    private logistics: LogisticsService,
    private systemService: SystemService,
  ) {}

  // ───────── 商品 ─────────

  @Post("products")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建商品" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createProduct(@Req() req: AuthRequest, @Body() dto: CreateProductDto) {
    return this.shop.createProduct(req.user.id, dto);
  }

  @Get("products")
  @ApiOperation({ summary: "获取商品列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listProducts(@Query() q: ProductListQueryDto) {
    return this.shop.listProducts(q);
  }

  @Get("products/:id")
  @UseGuards(OptionalAuthGuard, StationIsolationGuard)
  @ApiOperation({ summary: "获取商品详情（含统一活动价格）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "scene", required: false, description: "场景: detail/cart/checkout" })
  @ApiQuery({ name: "pageId", required: false, description: "当前微页面ID" })
  getProduct(@Param("id") id: string, @Query("scene") scene?: string, @Query("pageId") pageId?: string) {
    return this.shop.getProduct(id, scene, pageId);
  }

  @Put("products/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新商品" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  updateProduct(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.shop.updateProduct(req.user.id, id, dto);
  }

  @Put("products/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR")
  @ApiOperation({ summary: "更新商品状态" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateProductStatus(@Param("id") id: string, @Body("status") status: string) {
    return this.shop.updateProductStatus(id, status);
  }

  @Delete("products/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除商品" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  deleteProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    const isAdmin = req.user.roles?.includes("SUPER_ADMIN") || req.user.roles?.includes("OPERATION_ADMIN");
    return this.shop.deleteProduct(req.user.id, id, isAdmin);
  }

  // ───────── SKU ─────────

  @Post("products/:id/skus")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加商品SKU" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  addSku(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: CreateSkuDto) {
    const isAdmin = req.user.roles?.includes("SUPER_ADMIN") || req.user.roles?.includes("OPERATION_ADMIN");
    return this.shop.addSku(req.user.id, id, dto, isAdmin);
  }

  @Delete("skus/:skuId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除商品SKU" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  deleteSku(@Req() req: AuthRequest, @Param("skuId") skuId: string) {
    const isAdmin = req.user.roles?.includes("SUPER_ADMIN") || req.user.roles?.includes("OPERATION_ADMIN");
    return this.shop.deleteSku(req.user.id, skuId, isAdmin);
  }

  // ───────── 订单 ─────────

  @Post("orders")
  @UseGuards(JwtAuthGuard, ActiveUserGuard, FeatureFlagGuard)
  @RequireFeature("shop_checkout")
  @ApiOperation({ summary: "创建订单" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  listOrders(@Query() q: OrderListQueryDto) {
    return this.shop.listOrders(q);
  }

  @Get("orders/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的订单" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  myOrders(@Req() req: AuthRequest, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.getUserOrders(req.user.id, +page, +pageSize);
  }

  @Get("orders/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取订单详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getOrder(@Req() req: AuthRequest, @Param("id") id: string) {
    const isAdmin = req.user.roles?.includes("SUPER_ADMIN") || req.user.roles?.includes("OPERATION_ADMIN");
    return this.shop.getOrder(id, req.user.id, isAdmin);
  }

  @Post("orders/:id/pay/jsapi")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "JSAPI支付（小程序/公众号内支付）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async jsapiPay(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: JsapiPayDto,
  ) {
    return this.shop.createJsapiPayment(req.user.id, body.openid, id, body.notifyUrl);
  }

  @Post("orders/:id/pay/native")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "Native扫码支付（PC端）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  queryPaymentStatus(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.shop.queryPaymentStatus(id, req.user.id);
  }

  @Put("orders/:id/ship")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发货（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  shipOrder(@Param("id") id: string) {
    return this.shop.shipOrder(id);
  }

  @Put("orders/:id/pay")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "管理员确认支付（需提供实际支付流水号）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  adminPayOrder(@Req() req: AuthRequest, @Param("id") id: string, @Body() body: AdminPayOrderDto) {
    const u = req.user;
    return this.shop.adminPayOrder(id, body.payTransactionId, u.nickname || u.id);
  }

  @Put("orders/:id/complete")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "完成订单（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  completeOrder(@Param("id") id: string) {
    return this.shop.completeOrder(id);
  }

  @Put("orders/:id/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "退款（管理员），对接微信支付退款" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handleAlipayNotify(@Req() req: AuthRequest) {
    const params = req.body;
    const { valid, data } = await this.shop.verifyAlipayNotify(params);
    if (!valid || !data) return "fail";
    if ((data as any).dedup) return "success"; // 重复通知，返回成功避免重发
    await this.shop.handleAlipayNotify(data);
    return "success";
  }

  @Post("unionpay/notify")
  @SkipFormat()
  @ApiOperation({ summary: "银联支付回调通知" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handleUnionpayNotify(@Req() req: AuthRequest) {
    const params = req.body;
    const { valid, data } = await this.shop.verifyUnionpayNotify(params);
    if (!valid || !data) return "fail";
    if ((data as any).dedup) return "success";
    await this.shop.handleUnionpayNotify(data);
    return "success";
  }

  @Post("refund/notify")
  @SkipFormat()
  @ApiOperation({ summary: "微信退款回调通知" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handleRefundNotify(@Req() req: AuthRequest) {
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
    await this.shop.handleRefundNotify(data);
    return { code: "SUCCESS", message: "OK" };
  }

  // ───────── 支付管理（管理员） ─────────

  @Post("alipay/query")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查询支付宝订单" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  alipayQuery(@Body("outTradeNo") outTradeNo: string) {
    return this.shop.alipayQuery(outTradeNo);
  }

  @Post("alipay/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "支付宝退款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  alipayRefund(@Body() body: AlipayRefundDto) {
    return this.shop.alipayRefund(body);
  }

  @Post("unionpay/query")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查询银联订单" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  unionpayQuery(@Body("outTradeNo") outTradeNo: string) {
    return this.shop.unionpayQuery(outTradeNo);
  }

  @Post("unionpay/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "银联退款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  unionpayRefund(@Body() dto: UnionpayRefundDto) {
    return this.shop.unionpayRefund(dto);
  }

  @Put("orders/:id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消订单" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  cancelOrder(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.shop.cancelOrder(id, req.user.id);
  }

  // ───────── 优惠券 ─────────

  @Post("coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR")
  @ApiOperation({ summary: "创建优惠券" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createCoupon(@Body() dto: CreateCouponV2Dto) {
    return this.couponSvc.createCoupon(dto);
  }

  @Get("coupons")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取优惠券列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "admin", required: false, type: String, description: "是否管理员查看" })
  listCoupons(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("admin") admin?: string, @Req() req?: AuthRequest) {
    if (admin === "true") {
      const roles: string[] = (req?.user as any)?.roles ?? [];
      if (!roles.includes("SUPER_ADMIN") && !roles.includes("OPERATION_ADMIN") && !roles.includes("GOODS_AUDITOR")) {
        throw new ForbiddenException("无权查看管理端优惠券");
      }
    }
    return this.couponSvc.listCoupons(+page, +pageSize, admin === "true");
  }

  @Get("coupons/:id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取优惠券详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "优惠券不存在" })
  getCouponDetail(@Param("id") id: string) {
    return this.couponSvc.getCouponById(id);
  }

  @Put("coupons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR")
  @ApiOperation({ summary: "更新优惠券" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateCoupon(@Param("id") id: string, @Body() dto: CreateCouponV2Dto) {
    return this.couponSvc.updateCoupon(id, dto);
  }

  @Delete("coupons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR")
  @ApiOperation({ summary: "删除优惠券" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteCoupon(@Param("id") id: string) {
    return this.couponSvc.deleteCoupon(id);
  }

  @Put("coupons/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR")
  @ApiOperation({ summary: "更新优惠券状态" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateCouponStatus(@Param("id") id: string, @Body("status") status: string) {
    return this.couponSvc.updateCouponStatus(id, status);
  }

  @Post("coupons/:id/claim")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "领取优惠券" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  claimCoupon(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.couponSvc.claimCoupon(req.user.id, id);
  }

  @Post("coupons/:id/grant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR")
  @ApiOperation({ summary: "发放优惠券给用户" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  grantCoupon(@Param("id") id: string, @Body("userId") userId: string) {
    return this.couponSvc.grantCoupon(id, userId);
  }

  @Get("coupons/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的优惠券" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  myCoupons(@Req() req: AuthRequest) {
    return this.couponSvc.getUserCoupons(req.user.id);
  }

  // ───────── 运费模板 ─────────

  @Post("freight-templates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建运费模板" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createFreightTemplate(@Body() dto: CreateFreightTemplateDto) {
    return this.shop.createFreightTemplate(dto);
  }

  @Get("freight-templates")
  @ApiOperation({ summary: "获取运费模板列表（分页）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  listFreightTemplates(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.getFreightTemplates(+page, +pageSize);
  }

  @Get("freight-templates/:id")
  @ApiOperation({ summary: "获取运费模板详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getFreightTemplate(@Param("id") id: string) {
    return this.shop.getFreightTemplate(id);
  }

  @Put("freight-templates/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新运费模板" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateFreightTemplate(@Param("id") id: string, @Body() dto: UpdateFreightTemplateDto) {
    return this.shop.updateFreightTemplate(id, dto);
  }

  @Delete("freight-templates/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除运费模板" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteFreightTemplate(@Param("id") id: string) {
    return this.shop.deleteFreightTemplate(id);
  }

  // ───────── 商品评价 ─────────

  @Post("products/:id/reviews")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建商品评价" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createReview(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: CreateReviewDto) {
    return this.shop.createReview(req.user.id, id, dto);
  }

  @Get("products/:id/reviews")
  @ApiOperation({ summary: "获取商品评价列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  listReviews(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.listReviews(id, +page, +pageSize);
  }

  @Post("reviews/:id/reply")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员回复评价" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  replyReview(@Param("id") id: string, @Body() dto: ReplyReviewDto) {
    return this.shop.replyProductReview(id, dto.reply);
  }

  @Delete("reviews/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "管理员删除评价" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteReview(@Param("id") id: string) {
    return this.shop.deleteProductReview(id);
  }

  // ───────── 店铺评价 ─────────

  @Get("reviews")
  @ApiOperation({ summary: "获取店铺评价列表（聚合所有商品评价）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  listShopReviews(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.listShopReviews(+page, +pageSize);
  }

  // ───────── 物流追踪 ─────────

  @Get("orders/:id/logistics")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取物流信息" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getLogistics(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.shop.getLogistics(id);
  }

  @Get("logistics/track")
  @ApiOperation({ summary: "查询物流轨迹（快递100）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "no", required: true, type: String, description: "快递单号" })
  @ApiQuery({ name: "company", required: false, type: String, description: "快递公司" })
  trackLogistics(@Query("no") no: string, @Query("company") company?: string) {
    return this.logistics.queryTrack(no, company);
  }

  @Put("orders/:id/logistics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新物流信息（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateLogistics(@Param("id") id: string, @Body() dto: UpdateLogisticsDto) {
    return this.shop.updateLogistics(id, dto);
  }

  // ───────── 售后 ─────────

  @Post("orders/:id/after-sale")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "申请售后" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  applyAfterSale(@Req() req: AuthRequest, @Param("id") orderId: string, @Body() dto: ApplyAfterSaleDto) {
    return this.couponSvc.applyAfterSale(req.user.id, orderId, dto.type, dto.reason, dto.amount);
  }

  @Get("after-sales")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的售后列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  myAfterSales(@Req() req: AuthRequest, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.couponSvc.getUserAfterSales(req.user.id, +page, +pageSize);
  }

  @Get("after-sales/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取售后详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getAfterSale(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.couponSvc.getAfterSale(id, req.user.id);
  }

  @Put("after-sales/:id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消售后申请" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  cancelAfterSale(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.couponSvc.cancelAfterSale(id, req.user.id);
  }

  @Get("admin/after-sales")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取售后列表（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiQuery({ name: "status", required: false })
  listAfterSales(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("status") status?: string) {
    return this.couponSvc.listAfterSales(+page, +pageSize, status);
  }

  @Put("admin/after-sales/:id/process")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "处理售后（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  processAfterSale(@Param("id") id: string, @Body("action") action: string, @Body("remark") remark?: string) {
    return this.couponSvc.processAfterSale(id, action, remark);
  }

  // ───────── 购物车（Redis） ─────────

  @Get("cart")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取购物车" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getCart(@Req() req: AuthRequest) {
    return this.shop.getCart(req.user.id);
  }

  @Post("cart")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "加入购物车" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  addToCart(@Req() req: AuthRequest, @Body() body: AddToCartDto) {
    return this.shop.addToCart(req.user.id, body.productId, body.skuId, body.quantity || 1);
  }

  @Put("cart/:itemId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新购物车商品数量" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  updateCartItem(@Req() req: AuthRequest, @Param("itemId") itemId: string, @Body("quantity") quantity: number) {
    return this.shop.updateCartItem(req.user.id, itemId, quantity);
  }

  @Delete("cart/:itemId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "移除购物车商品" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  removeCartItem(@Req() req: AuthRequest, @Param("itemId") itemId: string) {
    return this.shop.removeCartItem(req.user.id, itemId);
  }

  @Delete("cart")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "清空购物车" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  clearCart(@Req() req: AuthRequest) {
    return this.shop.clearCart(req.user.id);
  }
}
