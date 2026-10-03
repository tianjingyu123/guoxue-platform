import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, ForbiddenException } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";
import { MerchantService } from "./merchant.service";
import { MerchantSettlementService } from "./merchant-settlement.service";
import { MerchantInventoryService } from "./merchant-inventory.service";
import { MerchantShippingService } from "./merchant-shipping.service";
import { MerchantGuard } from "./merchant.guard";
import {
  UpdateMerchantProfileDto, ProductQueryDto, MerchantOrderQueryDto,
  ShipOrderDto, RejectRefundDto, ReviewQueryDto, ReplyReviewDto,
  PaginationDto, AppealViolationDto, MerchantProductDto, MerchantSkuDto, ProcessAfterSaleDto,
  AddMerchantMemberDto,
  InventoryListQueryDto, InventoryMovementQueryDto, InventoryAdjustmentDto,
  InventoryAlertSettingDto, CreatePurchaseOrderDto, PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto, SupplierQueryDto, SupplierStatusDto, UpsertSupplierDto,
  ReturnInspectionDto,
  BatchShipOrdersDto,
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
    private readonly inventoryService: MerchantInventoryService,
    private readonly shippingService: MerchantShippingService,
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
  async getProfile(@Req() req: AuthRequest) {
    const profile = await this.merchantService.getMerchantById(this.getMerchant(req).id);
    return {
      ...profile,
      viewerRole: (req as any).merchantRole || "OWNER",
    };
  }

  @Put("profile")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
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
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
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
  @RedLineGate(RedLine.MONEY, RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "商家商品编辑（含价格变更）", targetType: "PRODUCT" })
  @ApiOperation({ summary: "更新商品" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateProduct(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: Partial<MerchantProductDto>) {
    return this.merchantService.updateProduct(this.shopUserId(req), id, dto);
  }

  @Delete("products/:id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "删除商品" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.deleteProduct(this.shopUserId(req), id);
  }

  @Post("products/:id/skus")
  @RedLineGate(RedLine.MONEY, RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "添加商品SKU（店铺身份·操作员可用）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  addSku(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: MerchantSkuDto) {
    return this.merchantService.addProductSku(this.shopUserId(req), id, dto);
  }

  @Delete("skus/:skuId")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "删除商品SKU（店铺身份·操作员可用）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  deleteSku(@Req() req: AuthRequest, @Param("skuId") skuId: string) {
    return this.merchantService.deleteProductSku(this.shopUserId(req), skuId);
  }

  @Post("products/:id/list")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "上架商品" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  listProduct(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.listProduct(this.shopUserId(req), id);
  }

  @Post("products/:id/unlist")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
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
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "发货" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  shipOrder(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: ShipOrderDto) {
    return this.shippingService.shipOrder(this.getMerchant(req).id, req.user.id, id, dto);
  }

  @Post("orders/batch-ship")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "批量发货（逐单隔离，返回成功与失败明细）" })
  @ApiResponse({ status: 201, description: "批量处理完成" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  batchShipOrders(@Req() req: AuthRequest, @Body() dto: BatchShipOrdersDto) {
    return this.shippingService.batchShipOrders(this.getMerchant(req).id, req.user.id, dto);
  }

  @Get("orders/:id/shipment")
  @ApiOperation({ summary: "获取商家订单运单及快递100实时轨迹" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getShipment(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.shippingService.getShipment(this.getMerchant(req).id, id);
  }

  @Put("orders/:id/shipment")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "修改已发货订单运单" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  updateShipment(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: ShipOrderDto) {
    return this.shippingService.updateShipment(this.getMerchant(req).id, req.user.id, id, dto);
  }

  @Post("orders/:id/refund/approve")
  @RedLineGate(RedLine.MONEY)
  @ApiOperation({ summary: "同意退款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  approveRefund(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.approveRefund(this.getMerchant(req).id, id);
  }

  @Post("orders/:id/refund/reject")
  @RedLineGate(RedLine.MONEY)
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
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
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
  @RedLineGate(RedLine.MONEY)
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
    @Query("keyword") keyword?: string,
  ) {
    return this.merchantService.listCustomers(this.getMerchant(req).id, {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      keyword,
    });
  }

  @Get("customers/:id")
  @ApiOperation({ summary: "客户详情（交易画像与最近订单）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "客户不存在或不属于当前商家" })
  getCustomerDetail(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.merchantService.getCustomerDetail(this.getMerchant(req).id, id);
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

  @Post("after-sales/:id/return-inspection")
  @RedLineGate(RedLine.MONEY)
  @Auditable({ action: "商家退货验收入库", targetType: "AFTER_SALE" })
  @ApiOperation({ summary: "退货验收；合格才回补库存" })
  inspectReturn(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: ReturnInspectionDto) {
    return this.inventoryService.inspectReturn(
      this.getMerchant(req).id, this.shopUserId(req),
      (req as unknown as { actingUserId: string }).actingUserId, id, dto,
    );
  }

  // ── 进销存 ──

  @Get("inventory/overview")
  @ApiOperation({ summary: "库存总览" })
  inventoryOverview(@Req() req: AuthRequest) {
    return this.inventoryService.overview(this.getMerchant(req).id, this.shopUserId(req));
  }

  @Get("inventory/stocks")
  @ApiOperation({ summary: "商品与SKU库存列表" })
  inventoryStocks(@Req() req: AuthRequest, @Query() q: InventoryListQueryDto) {
    return this.inventoryService.stocks(this.getMerchant(req).id, this.shopUserId(req), q);
  }

  @Get("inventory/movements")
  @ApiOperation({ summary: "库存流水" })
  inventoryMovements(@Req() req: AuthRequest, @Query() q: InventoryMovementQueryDto) {
    return this.inventoryService.movements(this.getMerchant(req).id, q);
  }

  @Post("inventory/adjustments")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "商家库存调整", targetType: "PRODUCT" })
  @ApiOperation({ summary: "手工调整或盘点库存（幂等）" })
  adjustInventory(@Req() req: AuthRequest, @Body() dto: InventoryAdjustmentDto) {
    return this.inventoryService.adjust(
      this.getMerchant(req).id, this.shopUserId(req),
      (req as unknown as { actingUserId: string }).actingUserId, dto,
    );
  }

  @Get("inventory/alerts")
  @ApiOperation({ summary: "低库存预警" })
  inventoryAlerts(@Req() req: AuthRequest) {
    return this.inventoryService.alerts(this.getMerchant(req).id, this.shopUserId(req));
  }

  @Put("inventory/alerts")
  @ApiOperation({ summary: "设置低库存阈值" })
  setInventoryAlert(@Req() req: AuthRequest, @Body() dto: InventoryAlertSettingDto) {
    return this.inventoryService.setAlert(this.getMerchant(req).id, this.shopUserId(req), dto);
  }

  @Get("suppliers")
  @ApiOperation({ summary: "供应商档案列表" })
  listSuppliers(@Req() req: AuthRequest, @Query() q: SupplierQueryDto) {
    return this.inventoryService.listSuppliers(this.getMerchant(req).id, q);
  }

  @Post("suppliers")
  @Auditable({ action: "商家创建供应商档案", targetType: "MERCHANT_SUPPLIER" })
  @ApiOperation({ summary: "创建供应商档案" })
  createSupplier(@Req() req: AuthRequest, @Body() dto: UpsertSupplierDto) {
    return this.inventoryService.createSupplier(this.getMerchant(req).id, dto);
  }

  @Put("suppliers/:id")
  @Auditable({ action: "商家更新供应商档案", targetType: "MERCHANT_SUPPLIER" })
  @ApiOperation({ summary: "更新供应商档案" })
  updateSupplier(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpsertSupplierDto) {
    return this.inventoryService.updateSupplier(this.getMerchant(req).id, id, dto);
  }

  @Put("suppliers/:id/status")
  @Auditable({ action: "商家变更供应商状态", targetType: "MERCHANT_SUPPLIER" })
  @ApiOperation({ summary: "启用或停用供应商档案" })
  setSupplierStatus(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: SupplierStatusDto) {
    return this.inventoryService.setSupplierStatus(this.getMerchant(req).id, id, dto);
  }

  @Post("purchase-orders")
  @ApiOperation({ summary: "创建采购单" })
  createPurchaseOrder(@Req() req: AuthRequest, @Body() dto: CreatePurchaseOrderDto) {
    return this.inventoryService.createPurchaseOrder(
      this.getMerchant(req).id, this.shopUserId(req),
      (req as unknown as { actingUserId: string }).actingUserId, dto,
    );
  }

  @Get("purchase-orders")
  @ApiOperation({ summary: "采购单列表" })
  listPurchaseOrders(@Req() req: AuthRequest, @Query() q: PurchaseOrderQueryDto) {
    return this.inventoryService.listPurchaseOrders(this.getMerchant(req).id, q);
  }

  @Get("purchase-orders/:id")
  @ApiOperation({ summary: "采购单详情" })
  getPurchaseOrder(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.inventoryService.getPurchaseOrder(this.getMerchant(req).id, id);
  }

  @Get("purchase-orders/:id/receipts")
  @ApiOperation({ summary: "采购单到货质检批次记录" })
  listPurchaseReceipts(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.inventoryService.listPurchaseReceipts(this.getMerchant(req).id, id);
  }

  @Post("purchase-orders/:id/submit")
  @RedLineGate(RedLine.MONEY, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "确认采购下单" })
  submitPurchaseOrder(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.inventoryService.submitPurchaseOrder(this.getMerchant(req).id, id);
  }

  @Post("purchase-orders/:id/receive")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @Auditable({ action: "采购到货入库", targetType: "PURCHASE_ORDER" })
  @ApiOperation({ summary: "采购到货入库（支持部分到货、幂等）" })
  receivePurchaseOrder(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: ReceivePurchaseOrderDto) {
    return this.inventoryService.receivePurchaseOrder(
      this.getMerchant(req).id, this.shopUserId(req),
      (req as unknown as { actingUserId: string }).actingUserId, id, dto,
    );
  }

  @Post("purchase-orders/:id/cancel")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "取消未入库采购单" })
  cancelPurchaseOrder(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.inventoryService.cancelPurchaseOrder(this.getMerchant(req).id, id);
  }

  // ── 操作员管理（B8）──
  // 🔴 2026-07-14 补齐：前端 B8「操作员管理」页早就做好并在调 /merchant-backend/members，
  //    但后端只有 admin 侧的 /admin/merchants/:id/members（平台管理员专用）——
  //    商家自己点进操作员管理必定 404。这是"前端做了、后端没做"的反向缺口。
  //    店铺 id 由 MerchantGuard 注入，商家只能管自己的店（不接受 :id 入参，杜绝越权）。

  /** 仅店主可增删操作员：操作员自己不能再拉人/踢人 */
  private assertOwner(req: AuthRequest) {
    if ((req as unknown as { merchantRole?: string }).merchantRole !== "OWNER") {
      throw new ForbiddenException("仅店主可管理操作员");
    }
  }

  @Get("members")
  @ApiOperation({ summary: "本店成员列表（店主 + 操作员·手机号脱敏）" })
  @ApiResponse({ status: 200, description: "成功" })
  listMembers(@Req() req: AuthRequest) {
    return this.merchantService.listMembers(
      this.getMerchant(req).id,
      (req as unknown as { actingUserId: string }).actingUserId,
    );
  }

  @Get("members/audit")
  @ApiOperation({ summary: "本店操作审计（仅店主）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "仅店主可查看" })
  listMemberAudit(@Req() req: AuthRequest, @Query() q: PaginationDto) {
    this.assertOwner(req);
    return this.merchantService.listMemberAudit(this.getMerchant(req).id, q);
  }

  @Post("members")
  @RedLineGate(RedLine.USER_DATA, RedLine.COMPLIANCE)
  @Auditable({ action: "商家操作员添加", targetType: "MERCHANT" })
  @ApiOperation({ summary: "添加操作员（按手机号·须已注册平台）" })
  @ApiResponse({ status: 201, description: "添加成功" })
  @ApiResponse({ status: 400, description: "手机号未注册/该用户是店主" })
  @ApiResponse({ status: 403, description: "仅店主可管理操作员" })
  addMember(@Req() req: AuthRequest, @Body() dto: AddMerchantMemberDto) {
    this.assertOwner(req);
    return this.merchantService.addMemberByPhone(
      this.getMerchant(req).id,
      dto.phone,
      (req as unknown as { actingUserId: string }).actingUserId,
    );
  }

  @Delete("members/:userId")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @Auditable({ action: "商家操作员移除", targetType: "MERCHANT" })
  @ApiOperation({ summary: "移除操作员（软删·不可移除店主）" })
  @ApiResponse({ status: 200, description: "移除成功" })
  @ApiResponse({ status: 403, description: "仅店主可管理操作员" })
  removeMember(@Req() req: AuthRequest, @Param("userId") userId: string) {
    this.assertOwner(req);
    return this.merchantService.removeMember(this.getMerchant(req).id, userId);
  }
}
