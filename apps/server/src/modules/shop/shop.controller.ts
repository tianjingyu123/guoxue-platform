import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards, Logger, ForbiddenException, BadRequestException, ServiceUnavailableException, HttpCode,
} from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { SkipFormat } from "../../common/skip-format.decorator";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { ShopService } from "./shop.service";
import { ShopCouponService } from "./shop-coupon.service";
import { AfterSaleSlaService } from "./after-sale-sla.service";
import { LogisticsService } from "./logistics.service";
import { SystemService } from "../system/system.service";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto,
  CreateCouponV2Dto, CreateReviewDto, UpdateLogisticsDto,
  CreateFreightTemplateDto, UpdateFreightTemplateDto, ReplyReviewDto,
  ProductListQueryDto, OrderListQueryDto,
  CreateSkuDto, JsapiPayDto, NativePayDto, H5PayDto, EstimateOrderDto, RefundOrderDto, RechargeJsapiDto, RechargeH5Dto,
  AddToCartDto, AdminPayOrderDto, AlipayRefundDto,
  UnionpayRefundDto, ApplyAfterSaleDto, SubmitReturnLogisticsDto, ModerateProductDto, SetCommissionRateDto, BatchGrantShopCouponDto,
} from "./shop.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RequireFeature } from "../../common/feature-flag.decorator";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { Auditable } from "../../common/audit.decorator";

/** 已认证请求，附带 JWT 解析后的 user 信息 */
type AuthRequest = Omit<Request, "user"> & {
  user: { id: string; roles: string[]; nickname?: string; [key: string]: unknown };
  rawBody?: Buffer; // main.ts rawBody:true 注入的请求原始字节（支付回调验签用）
};

@ApiTags("商城")
@Controller("shop")
export class ShopController {
  private readonly logger = new Logger(ShopController.name);
  constructor(
    private shop: ShopService,
    private couponSvc: ShopCouponService,
    private afterSaleSla: AfterSaleSlaService,
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
    // 管理员/运营建的商品直接上架（跳过 PENDING 审核），避免"保存后列表看不到"
    const isAdmin = (req.user.roles || []).some((r) => r === "SUPER_ADMIN" || r === "OPERATION_ADMIN");
    return this.shop.createProduct(req.user.id, dto, isAdmin);
  }

  @Get("products")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取商品列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listProducts(@Query() q: ProductListQueryDto, @Req() req?: Request) {
    // 状态筛选仅管理角色可用；游客即使手工传 ALL/PENDING/OFF_SHELF 也强制回到公开在售口径。
    const roles = ((req?.user as { roles?: string[] } | undefined)?.roles) || [];
    const isAdmin = roles.some((r) => ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"].includes(r));
    return this.shop.listProducts(isAdmin ? q : { ...q, status: undefined });
  }

  @Get("products/category-tabs")
  @ApiOperation({ summary: "商品一级分类聚合(商城分类页 tab)" })
  @ApiResponse({ status: 200, description: "成功" })
  productCategoryTabs() {
    return this.shop.listProductCategoryL1();
  }

  @Get("products/by-scene")
  @ApiOperation({ summary: "按场景标签取货（供-P1·无痕商业化触点接线口·公开）" })
  @ApiQuery({ name: "tag", required: true, description: "场景标签（白名单七值：乔迁新居/合婚嫁娶/开业大吉/本命年/学业考试/长辈寿诞/节气时令）" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "取货数量（默认 6·上限 50）" })
  @ApiResponse({ status: 200, description: "成功（无匹配商品返回空数组）" })
  @ApiResponse({ status: 400, description: "非法场景标签" })
  listProductsByScene(@Query("tag") tag: string, @Query("limit") limit?: string) {
    // 注意：本路由必须声明在 products/:id 之前，否则 by-scene 会被 :id 吞掉
    return this.shop.listProductsByScene(tag, limit !== undefined ? Number(limit) : undefined);
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

  @Get("store/:merchantId")
  @ApiOperation({ summary: "C端店铺主页（商家公开信息+在售商品）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "店铺不存在或未开通" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getStore(@Param("merchantId") merchantId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.shop.getStore(merchantId, +page, +pageSize);
  }

  @Put("products/:id")
  @Auditable({ action: "商品编辑（含价格变更）", targetType: "PRODUCT" })
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
  @Auditable({ action: "商品状态变更", targetType: "PRODUCT" })
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

  @Put("products/:id/commission-rate")
  @Auditable({ action: "商品佣金率设置", targetType: "PRODUCT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "设置商品站长推广佣金率（佣-V2·仅平台运营·不传=清除回落类目默认）" })
  @ApiResponse({ status: 200, description: "设置成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  setCommissionRate(@Param("id") id: string, @Body() dto: SetCommissionRateDto) {
    return this.shop.setProductCommissionRate(id, dto.commissionRate ?? null);
  }

  @Put("admin/products/:id/moderate")
  @Auditable({ action: "商品品控", targetType: "PRODUCT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR")
  @ApiOperation({ summary: "商品品控巡检（违规下架/恢复/警告）" })
  @ApiResponse({ status: 200, description: "处理成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async moderateProduct(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: ModerateProductDto) {
    const result = await this.shop.moderateProduct(id, dto.action, dto.reason);
    const actionLabel = ({ takedown: "违规下架", restore: "恢复上架", warn: "警告" } as Record<string, string>)[dto.action] ?? dto.action;
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "MODERATE",
      targetType: "PRODUCT",
      targetId: id,
      detail: `商品品控-${actionLabel}${dto.reason ? `：${dto.reason}` : ""}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志记录失败", err));
    return result;
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
  @ApiQuery({ name: "status", required: false, type: String, description: "订单状态过滤(PENDING/PAID/SHIPPED/COMPLETED/REFUNDED/CANCELLED)" })
  myOrders(@Req() req: AuthRequest, @Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("status") status?: string) {
    return this.shop.getUserOrders(req.user.id, +page, +pageSize, status);
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
    return this.shop.createJsapiPayment(req.user.id, body.openid, id, body.notifyUrl, body.channel);
  }

  @Post("recharge/jsapi")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "国学币充值-微信JSAPI下单（小程序/公众号）" })
  @ApiResponse({ status: 201, description: "返回 uni.requestPayment 所需支付参数" })
  @ApiResponse({ status: 400, description: "金额错误/微信授权缺失/支付未配置" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async rechargeJsapi(@Req() req: AuthRequest, @Body() body: RechargeJsapiDto) {
    return this.shop.createCoinRechargeJsapi(
      req.user.id,
      body.amountCoin,
      body.openid,
      body.channel,
    );
  }

  @Post("recharge/h5")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "国学币充值-微信H5下单（外部浏览器 mweb_url）" })
  @ApiResponse({ status: 201, description: "返回 { mwebUrl, orderNo, amountRmb }" })
  @ApiResponse({ status: 400, description: "金额错误/支付未配置" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async rechargeH5(@Req() req: AuthRequest, @Body() body: RechargeH5Dto) {
    const fwd = req.headers["x-forwarded-for"];
    const clientIp = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim() || req.ip || "127.0.0.1";
    return this.shop.createCoinRechargeH5(
      req.user.id,
      body.amountCoin,
      clientIp,
    );
  }

  @Get("recharge/:orderNo/payment-status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查询本人国学币充值支付状态" })
  @ApiResponse({ status: 200, description: "返回 PENDING/PAID/FAILED/REFUNDED" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "订单不存在或不属于当前用户" })
  @ApiBearerAuth()
  rechargePaymentStatus(@Req() req: AuthRequest, @Param("orderNo") orderNo: string) {
    return this.shop.queryCoinRechargeStatus(req.user.id, orderNo);
  }

  @Post("pay/h5")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "H5支付（外部浏览器·返回 mwebUrl 跳转微信收银台）" })
  @ApiResponse({ status: 201, description: "创建成功，返回 { mwebUrl }" })
  @ApiResponse({ status: 400, description: "订单状态不可支付 / 微信支付未配置" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "只能支付自己的订单" })
  @ApiResponse({ status: 404, description: "订单不存在" })
  @ApiBearerAuth()
  async h5Pay(@Req() req: AuthRequest, @Body() body: H5PayDto) {
    // 微信 H5 下单要求 payer_client_ip：优先代理头（生产 nginx 转发），否则连接 IP
    const fwd = req.headers["x-forwarded-for"];
    const clientIp = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim() || req.ip || "127.0.0.1";
    return this.shop.createH5Payment(body.orderId, req.user.id, clientIp, body.notifyUrl);
  }

  @Post("orders/estimate")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "订单试算（结算页价格明细·与下单定价引擎同口径·不落库不占券）" })
  @ApiResponse({ status: 201, description: "返回 { goodsAmount, couponDiscount, selfDiscount, payableAmount }" })
  @ApiResponse({ status: 400, description: "商品不可购买/优惠券无效" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  estimateOrder(@Req() req: AuthRequest, @Body() dto: EstimateOrderDto) {
    return this.shop.estimateOrder(req.user.id, dto);
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
  @Auditable({ action: "管理员确认支付", targetType: "ORDER" })
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
    // 超管测试端点保留（H5 真实支付已接线，前端 mockPayForTest 调用点已删）：
    // 显式落 AuditLog 记录谁用了（@Auditable 拦截器之外再落一条明细，防止测试通道被滥用无迹可查）
    this.systemService.logAudit({
      userId: u.id,
      action: "ADMIN_MARK_PAID",
      targetType: "ORDER",
      targetId: id,
      detail: `管理员确认支付（测试通道）: order=${id}, tx=${body.payTransactionId}, operator=${u.nickname || u.id}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志写入失败", err));
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
  @Auditable({ action: "订单退款", targetType: "ORDER" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：财务角色前端路由放行退款页(/orders/refund)，后端对齐放行 FINANCE_ADMIN。仅加角色，逻辑不动。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
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
    const result = await this.shop.requestOrderRefund(id, body?.reason, req.user.id);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "REFUND_REQUEST",
      targetType: "ORDER",
      targetId: id,
      detail: `退款: ${id}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  // ───────── 支付回调（微信/支付宝/银联） ─────────

  @Post("pay/notify")
  @HttpCode(200) // 微信V3仅认 200/204 为成功，Nest默认201会被判失败导致无限重试
  @SkipFormat()
  @ApiOperation({ summary: "微信支付回调通知" })
  @ApiResponse({ status: 200, description: "回调处理成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handlePayNotify(@Req() req: AuthRequest) {
    const signHeader = (req.headers["wechatpay-signature"] as string) || "";
    const timestamp = (req.headers["wechatpay-timestamp"] as string) || "";
    const nonce = (req.headers["wechatpay-nonce"] as string) || "";
    const serialNo = (req.headers["wechatpay-serial"] as string) || "";
    // 微信 V3 对原始报文字节验签：优先用 rawBody(main.ts rawBody:true)，JSON.stringify 会改变字节序/空白致验签失败
    const rawBody = req.rawBody?.toString("utf8") ?? (typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    const { valid, data, error } = await this.shop.verifyAndDecryptNotify(
      signHeader, rawBody, timestamp, nonce, serialNo,
    );
    if (!valid || !data) {
      throw new BadRequestException(error || "微信支付通知验签失败");
    }
    // 微信 API v3 只有 HTTP 200/204 才停止重试；本地未入账必须返回非 2xx，不能只在 200 body 中写 FAIL。
    const ack = await this.shop.handlePaymentNotify(data);
    if (!ack) throw new ServiceUnavailableException("微信支付通知尚未完成本地入账，请重试");
    return { code: "SUCCESS", message: "OK" };
  }

  @Post("alipay/notify")
  @HttpCode(200) // 支付宝要求 HTTP 200 + body "success"
  @SkipFormat()
  @ApiOperation({ summary: "支付宝支付回调通知" })
  @ApiResponse({ status: 200, description: "回调处理成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handleAlipayNotify(@Req() req: AuthRequest) {
    const params = req.body;
    const { valid, data } = await this.shop.verifyAlipayNotify(params);
    if (!valid || !data) return "fail";
    if ((data as any).dedup) return "success"; // 重复通知，返回成功避免重发
    const handled = await this.shop.handleAlipayNotify(data);
    return handled ? "success" : "fail";
  }

  @Post("unionpay/notify")
  @HttpCode(200) // 银联要求 HTTP 200 为成功应答
  @SkipFormat()
  @ApiOperation({ summary: "银联支付回调通知" })
  @ApiResponse({ status: 200, description: "回调处理成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handleUnionpayNotify(@Req() req: AuthRequest) {
    const params = req.body;
    const { valid, data } = await this.shop.verifyUnionpayNotify(params);
    if (!valid || !data) return "fail";
    if ((data as any).dedup) return "success";
    const handled = await this.shop.handleUnionpayNotify(data);
    return handled ? "success" : "fail";
  }

  @Post("refund/notify")
  @HttpCode(200) // 微信V3仅认 200/204 为成功
  @SkipFormat()
  @ApiOperation({ summary: "微信退款回调通知" })
  @ApiResponse({ status: 200, description: "回调处理成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handleRefundNotify(@Req() req: AuthRequest) {
    const signHeader = (req.headers["wechatpay-signature"] as string) || "";
    const timestamp = (req.headers["wechatpay-timestamp"] as string) || "";
    const nonce = (req.headers["wechatpay-nonce"] as string) || "";
    const serialNo = (req.headers["wechatpay-serial"] as string) || "";
    // 微信 V3 退款回调同样对原始报文验签，优先用 rawBody 原始字节
    const rawBody = req.rawBody?.toString("utf8") ?? (typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    const { valid, data, error } = await this.shop.verifyAndDecryptNotify(
      signHeader, rawBody, timestamp, nonce, serialNo,
    );
    if (!valid || !data) {
      throw new BadRequestException(error || "微信退款通知验签失败");
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
  @Auditable({ action: "支付宝退款", targetType: "ORDER" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "支付宝退款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async alipayRefund(@Req() req: AuthRequest, @Body() body: AlipayRefundDto) {
    const result = await this.shop.requestAlipayRefund(body, req.user.id);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "REFUND_REQUEST",
      targetType: "ORDER",
      targetId: body.outTradeNo,
      detail: `支付宝退款: 订单 ${body.outTradeNo}, 退款单 ${body.outRefundNo}, 金额 ${body.refundAmount}元`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志记录失败", err));
    return result;
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
  @Auditable({ action: "银联退款", targetType: "ORDER" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "银联退款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async unionpayRefund(@Req() req: AuthRequest, @Body() dto: UnionpayRefundDto) {
    const result = await this.shop.requestUnionpayRefund(dto, req.user.id);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "REFUND_REQUEST",
      targetType: "ORDER",
      targetId: dto.outTradeNo,
      detail: `银联退款: 订单 ${dto.outTradeNo}, 退款单 ${dto.outRefundNo}, 金额 ${dto.amount}分`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志记录失败", err));
    return result;
  }

  @Put("orders/:id/cancel")
  @Auditable({ action: "取消订单", targetType: "ORDER" })
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

  @Post("orders/:id/confirm")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "确认收货（买家）" })
  @ApiResponse({ status: 200, description: "确认成功" })
  @ApiResponse({ status: 400, description: "订单状态不可确认" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  confirmReceipt(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.shop.confirmOrder(id, req.user.id);
  }

  @Post("group-buys/refund-expired")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "扫描并退款超时未成团的拼团（管理员/定时触发）" })
  @ApiResponse({ status: 201, description: "处理完成" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  refundExpiredGroupBuys() {
    return this.shop.refundExpiredGroupBuys();
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

  // 注意：coupons/my 必须注册在 coupons/:id 之前，否则被 :id 吞掉（id="my"→优惠券不存在）
  @Get("coupons/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的优惠券" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  myCoupons(@Req() req: AuthRequest) {
    return this.couponSvc.getUserCoupons(req.user.id);
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

  @Post("coupons/:id/batch-grant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR")
  @ApiOperation({ summary: "批量发放优惠券（券体系统一后的唯一批量发放口）" })
  @ApiResponse({ status: 201, description: "发放完成，返回 granted/skipped 统计" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  batchGrantCoupon(@Param("id") id: string, @Body() dto: BatchGrantShopCouponDto) {
    return this.couponSvc.batchGrantCoupon(id, dto.userIds);
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
  @ApiQuery({ name: "sort", required: false, type: String, description: "排序: newest(默认,最新) / withImages(有图优先)" })
  @ApiQuery({ name: "filter", required: false, type: String, description: "评分筛选: all(默认) / good(好评≥4星) / medium(中评3星) / bad(差评≤2星) / images(有图)" })
  listReviews(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("sort") sort?: string, @Query("filter") filter?: string) {
    return this.shop.listReviews(id, +page, +pageSize, sort, filter);
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

  // ───────── 评价治理（管理员） ─────────

  @Put("admin/reviews/:id/hide")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @Auditable({ action: "评价隐藏", targetType: "PRODUCT_REVIEW" })
  @ApiOperation({ summary: "管理员隐藏评价（C端不可见，可恢复，区别于删除）" })
  @ApiResponse({ status: 200, description: "隐藏成功" })
  @ApiResponse({ status: 404, description: "评价不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  hideReview(@Param("id") id: string) {
    return this.shop.setProductReviewStatus(id, "HIDDEN");
  }

  @Put("admin/reviews/:id/show")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @Auditable({ action: "评价恢复展示", targetType: "PRODUCT_REVIEW" })
  @ApiOperation({ summary: "管理员恢复已隐藏评价" })
  @ApiResponse({ status: 200, description: "恢复成功" })
  @ApiResponse({ status: 404, description: "评价不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  showReview(@Param("id") id: string) {
    return this.shop.setProductReviewStatus(id, "PUBLISHED");
  }

  @Get("admin/reviews")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "管理员评价列表（聚合全部商品评价·默认含已隐藏·支持状态筛选）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态筛选: PUBLISHED / HIDDEN，不传=全部" })
  @ApiBearerAuth()
  listAdminReviews(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("status") status?: string) {
    return this.shop.listShopReviewsAdmin(+page, +pageSize, status);
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
    return this.shop.getLogistics(id, req.user.id);
  }

  @Get("logistics/track")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "查询物流轨迹（快递100）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "no", required: true, type: String, description: "快递单号" })
  @ApiQuery({ name: "company", required: false, type: String, description: "快递公司" })
  @ApiBearerAuth()
  trackLogistics(@Query("no") no: string, @Query("company") company?: string) {
    return this.logistics.queryTrack(no, company);
  }

  @Post("logistics/kuaidi100/callback")
  @HttpCode(200)
  @SkipFormat()
  @ApiOperation({ summary: "快递100轨迹推送回调（公开接口·MD5 salt 验签）" })
  async handleKuaidi100Callback(@Body() body: { param?: string; sign?: string }) {
    await this.logistics.handlePush(body.param || "", body.sign || "");
    return { result: true, returnCode: "200", message: "成功" };
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
  async updateLogistics(@Param("id") id: string, @Body() dto: UpdateLogisticsDto) {
    const result = await this.shop.updateLogistics(id, dto);
    if (dto.logisticsNo && dto.company) {
      await this.logistics.subscribeTrack(dto.logisticsNo, dto.company)
        .catch((error) => this.logger.warn(`快递100订阅失败 order=${id}: ${(error as Error).message}`));
    }
    return result;
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
    return this.couponSvc.applyAfterSale(req.user.id, orderId, dto.type, dto.reason, dto.amount, dto.images);
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

  @Put("after-sales/:id/return-logistics")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "买家登记退货运单" })
  @ApiResponse({ status: 200, description: "登记成功" })
  @ApiResponse({ status: 400, description: "售后状态不可登记" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  submitReturnLogistics(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: SubmitReturnLogisticsDto,
  ) {
    return this.couponSvc.submitReturnLogistics(id, req.user.id, dto.company, dto.logisticsNo);
  }

  @Get("admin/after-sales")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 客服可查看并处理非资金售后；真实退款仍由运营/财务/超级管理员批准。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "获取售后列表（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiQuery({ name: "status", required: false })
  listAfterSales(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("status") status?: string) {
    // F5 投诉 SLA：列表行附 slaDueAt/slaOverdue（createdAt+24h 推导）与 fastRefundEligible（结算缓冲期标注）
    return this.afterSaleSla.listWithSla(+page, +pageSize, status);
  }

  @Put("admin/after-sales/:id/process")
  @Auditable({ action: "售后处理", targetType: "AFTER_SALE" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 客服可查看并处理非资金售后；真实退款仍由运营/财务/超级管理员批准。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "处理售后（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  processAfterSale(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body("action") action: string,
    @Body("remark") remark?: string,
  ) {
    const allowRefundActions = req.user.roles.some((role) =>
      ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"].includes(role),
    );
    return this.couponSvc.processAfterSale(id, action, remark, allowRefundActions);
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
