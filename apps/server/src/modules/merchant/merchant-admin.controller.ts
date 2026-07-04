import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { MerchantService } from "./merchant.service";
import { MerchantDepositService } from "./merchant-deposit.service";
import { MerchantAgreementService } from "./merchant-agreement.service";
import { MerchantSettlementService } from "./merchant-settlement.service";
import { MerchantPunishmentService } from "./merchant-punishment.service";
import {
  MerchantListQueryDto, ApproveMerchantDto, RejectMerchantDto, UpdateMerchantStatusDto,
  CreateViolationDto, HandleViolationDto, RefundDepositDto, AdjustDepositDto,
  SetCommissionRateDto, PaySettlementDto, GenerateSettlementDto, SettlementListQueryDto,
  CreateAgreementDto, UpdateAgreementDto, PaginationDto,
  CreatePunishmentDto, PunishmentListQueryDto, RevokePunishmentDto,
} from "./merchant.dto";
import { Auditable } from "../../common/audit.decorator";

type AuthRequest = Omit<Request, "user"> & { user: { id: string; [key: string]: unknown } };

@ApiTags("商家管理")
@Controller("admin/merchants")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class MerchantAdminController {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly depositService: MerchantDepositService,
    private readonly agreementService: MerchantAgreementService,
    private readonly settlementService: MerchantSettlementService,
    private readonly punishmentService: MerchantPunishmentService,
  ) {}

  // ── 处罚管理（履-P3·必须在 :id 路由之前） ──

  @Get("punishments")
  @ApiOperation({ summary: "处罚记录列表（可按商家/状态/类型筛选）" })
  @ApiResponse({ status: 200, description: "成功" })
  listPunishments(@Query() q: PunishmentListQueryDto) {
    return this.punishmentService.list(q);
  }

  @Post("punishments")
  @Auditable({ action: "商家处罚执行", targetType: "MERCHANT_PUNISHMENT" })
  @ApiOperation({ summary: "执行处罚（WARNING/PRODUCT_DOWN/SHOP_SUSPEND/CLEAR_OUT）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 409, description: "同原因处罚已存在且未撤销" })
  createPunishment(@Req() req: AuthRequest, @Body() dto: CreatePunishmentDto) {
    return this.punishmentService.createPunishment(dto, req.user.id);
  }

  @Put("punishments/:punishmentId/revoke")
  @Auditable({ action: "商家处罚撤销", targetType: "MERCHANT_PUNISHMENT" })
  @ApiOperation({ summary: "撤销处罚（按执行快照恢复原状态·已被其他原因改变的诚实跳过）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 409, description: "该处罚已撤销" })
  revokePunishment(@Param("punishmentId") pid: string, @Req() req: AuthRequest, @Body() dto: RevokePunishmentDto) {
    return this.punishmentService.revoke(pid, req.user.id, dto.reason);
  }

  // ── 协议管理（必须在 :id 路由之前） ──

  @Get("agreements")
  @ApiOperation({ summary: "协议版本列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listAgreements(@Query() q: PaginationDto) {
    return this.agreementService.listAgreements(q);
  }

  @Post("agreements")
  @ApiOperation({ summary: "创建新协议版本" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createAgreement(@Body() dto: CreateAgreementDto) {
    return this.agreementService.createAgreement(dto);
  }

  @Put("agreements/:agreementId")
  @ApiOperation({ summary: "更新协议版本" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  updateAgreement(@Param("agreementId") id: string, @Body() dto: UpdateAgreementDto) {
    return this.agreementService.updateAgreement(id, dto);
  }

  @Delete("agreements/:agreementId")
  @ApiOperation({ summary: "删除协议版本" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  deleteAgreement(@Param("agreementId") id: string) {
    return this.agreementService.deleteAgreement(id);
  }

  // ── 商家列表/详情 ──

  @Get()
  @ApiOperation({ summary: "商家列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listMerchants(@Query() q: MerchantListQueryDto) {
    return this.merchantService.listMerchants(q);
  }

  @Get(":id")
  @ApiOperation({ summary: "商家详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getMerchant(@Param("id") id: string) {
    return this.merchantService.getMerchantById(id);
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "商家经营统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getMerchantStats(@Param("id") id: string) {
    return this.merchantService.getMerchantStats(id);
  }

  // ── 入驻审核 ──

  @Post(":id/approve")
  @Auditable({ action: "商家审核通过", targetType: "MERCHANT" })
  @ApiOperation({ summary: "审核通过" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  approveApplication(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: ApproveMerchantDto) {
    return this.merchantService.approveApplication(id, req.user.id, dto);
  }

  @Post(":id/reject")
  @Auditable({ action: "商家审核驳回", targetType: "MERCHANT" })
  @ApiOperation({ summary: "审核驳回" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  rejectApplication(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: RejectMerchantDto) {
    return this.merchantService.rejectApplication(id, req.user.id, dto.reason);
  }

  // ── 状态管理 ──

  @Put(":id/status")
  @Auditable({ action: "商家状态变更", targetType: "MERCHANT" })
  @ApiOperation({ summary: "变更商家状态" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateStatus(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: UpdateMerchantStatusDto) {
    return this.merchantService.updateMerchantStatus(id, req.user.id, dto);
  }

  // ── 保证金管理 ──

  @Get(":id/deposits")
  @ApiOperation({ summary: "保证金记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  listDeposits(@Param("id") id: string, @Query() q: PaginationDto) {
    return this.depositService.listDepositRecords(id, q.page, q.pageSize);
  }

  @Post(":id/deposits/refund")
  @Auditable({ action: "退还保证金", targetType: "MERCHANT" })
  @ApiOperation({ summary: "退还保证金" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  refundDeposit(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: RefundDepositDto) {
    return this.depositService.refundDeposit(id, req.user.id, dto);
  }

  @Post(":id/deposits/adjust")
  @Auditable({ action: "调整保证金", targetType: "MERCHANT" })
  @ApiOperation({ summary: "调整保证金金额" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  adjustDeposit(@Param("id") id: string, @Body() dto: AdjustDepositDto) {
    return this.depositService.adjustDeposit(id, dto);
  }

  // ── 违规管理 ──

  @Get(":id/violations")
  @ApiOperation({ summary: "违规记录列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  listViolations(@Param("id") id: string, @Query() q: PaginationDto) {
    return this.merchantService.listViolations(id, q);
  }

  @Post(":id/violations")
  @Auditable({ action: "商家违规记录", targetType: "MERCHANT" })
  @ApiOperation({ summary: "创建违规记录" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createViolation(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: CreateViolationDto) {
    return this.merchantService.createViolation(id, dto, req.user.id);
  }

  @Put(":id/violations/:violationId")
  @Auditable({ action: "处理商家违规", targetType: "MERCHANT" })
  @ApiOperation({ summary: "处理违规" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  handleViolation(@Param("violationId") vid: string, @Req() req: AuthRequest, @Body() dto: HandleViolationDto) {
    return this.merchantService.handleViolation(vid, dto, req.user.id);
  }

  // ── 分佣设置 ──

  @Put(":id/commission")
  @ApiOperation({ summary: "设置商家分佣比例" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  setCommissionRate(@Param("id") id: string, @Body() dto: SetCommissionRateDto) {
    return this.settlementService.setCommissionRate(id, dto);
  }

  // ── 结算 ──

  @Post(":id/settlements/generate")
  @ApiOperation({ summary: "生成结算单" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  generateSettlement(@Param("id") id: string, @Body() dto: GenerateSettlementDto) {
    return this.settlementService.generateSettlement(id, dto);
  }

  @Get(":id/settlements")
  @ApiOperation({ summary: "结算记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  listSettlements(@Param("id") id: string, @Query() q: SettlementListQueryDto) {
    return this.settlementService.listSettlements(id, q);
  }

  @Get(":id/settlements/:settlementId")
  @ApiOperation({ summary: "结算详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getSettlement(@Param("settlementId") sid: string) {
    return this.settlementService.getSettlement(sid);
  }

  @Post(":id/settlements/:settlementId/pay")
  @Auditable({ action: "商家结算打款", targetType: "MERCHANT" })
  @ApiOperation({ summary: "标记结算已支付" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  paySettlement(@Param("settlementId") sid: string, @Req() req: AuthRequest, @Body() dto: PaySettlementDto) {
    return this.settlementService.paySettlement(sid, dto, req.user.id);
  }

  @Post(":id/settlements/:settlementId/cancel")
  @ApiOperation({ summary: "取消结算单" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  cancelSettlement(@Param("settlementId") sid: string) {
    return this.settlementService.cancelSettlement(sid);
  }
}
