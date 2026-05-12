import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { MerchantService } from "./merchant.service";
import { MerchantDepositService } from "./merchant-deposit.service";
import { MerchantAgreementService } from "./merchant-agreement.service";
import { MerchantSettlementService } from "./merchant-settlement.service";
import {
  MerchantListQueryDto, ApproveMerchantDto, RejectMerchantDto, UpdateMerchantStatusDto,
  CreateViolationDto, HandleViolationDto, RefundDepositDto, AdjustDepositDto,
  SetCommissionRateDto, PaySettlementDto, CreateAgreementDto, UpdateAgreementDto, PaginationDto,
} from "./merchant.dto";

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
  ) {}

  // ── 协议管理（必须在 :id 路由之前） ──

  @Get("agreements")
  @ApiOperation({ summary: "协议版本列表" })
  listAgreements(@Query() q: PaginationDto) {
    return this.agreementService.listAgreements(q);
  }

  @Post("agreements")
  @ApiOperation({ summary: "创建新协议版本" })
  createAgreement(@Body() dto: CreateAgreementDto) {
    return this.agreementService.createAgreement(dto);
  }

  @Put("agreements/:agreementId")
  @ApiOperation({ summary: "更新协议版本" })
  updateAgreement(@Param("agreementId") id: string, @Body() dto: UpdateAgreementDto) {
    return this.agreementService.updateAgreement(id, dto);
  }

  @Delete("agreements/:agreementId")
  @ApiOperation({ summary: "删除协议版本" })
  deleteAgreement(@Param("agreementId") id: string) {
    return this.agreementService.deleteAgreement(id);
  }

  // ── 商家列表/详情 ──

  @Get()
  @ApiOperation({ summary: "商家列表" })
  listMerchants(@Query() q: MerchantListQueryDto) {
    return this.merchantService.listMerchants(q);
  }

  @Get(":id")
  @ApiOperation({ summary: "商家详情" })
  getMerchant(@Param("id") id: string) {
    return this.merchantService.getMerchantById(id);
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "商家经营统计" })
  getMerchantStats(@Param("id") id: string) {
    return this.merchantService.getMerchantStats(id);
  }

  // ── 入驻审核 ──

  @Post(":id/approve")
  @ApiOperation({ summary: "审核通过" })
  approveApplication(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: ApproveMerchantDto) {
    return this.merchantService.approveApplication(id, req.user.id, dto);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "审核驳回" })
  rejectApplication(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: RejectMerchantDto) {
    return this.merchantService.rejectApplication(id, req.user.id, dto.reason);
  }

  // ── 状态管理 ──

  @Put(":id/status")
  @ApiOperation({ summary: "变更商家状态" })
  updateStatus(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: UpdateMerchantStatusDto) {
    return this.merchantService.updateMerchantStatus(id, req.user.id, dto);
  }

  // ── 保证金管理 ──

  @Get(":id/deposits")
  @ApiOperation({ summary: "保证金记录" })
  listDeposits(@Param("id") id: string, @Query() q: PaginationDto) {
    return this.depositService.listDepositRecords(id, q.page, q.pageSize);
  }

  @Post(":id/deposits/refund")
  @ApiOperation({ summary: "退还保证金" })
  refundDeposit(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: RefundDepositDto) {
    return this.depositService.refundDeposit(id, req.user.id, dto);
  }

  @Post(":id/deposits/adjust")
  @ApiOperation({ summary: "调整保证金金额" })
  adjustDeposit(@Param("id") id: string, @Body() dto: AdjustDepositDto) {
    return this.depositService.adjustDeposit(id, dto);
  }

  // ── 违规管理 ──

  @Get(":id/violations")
  @ApiOperation({ summary: "违规记录列表" })
  listViolations(@Param("id") id: string, @Query() q: PaginationDto) {
    return this.merchantService.listViolations(id, q);
  }

  @Post(":id/violations")
  @ApiOperation({ summary: "创建违规记录" })
  createViolation(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: CreateViolationDto) {
    return this.merchantService.createViolation(id, dto, req.user.id);
  }

  @Put(":id/violations/:violationId")
  @ApiOperation({ summary: "处理违规" })
  handleViolation(@Param("violationId") vid: string, @Req() req: AuthRequest, @Body() dto: HandleViolationDto) {
    return this.merchantService.handleViolation(vid, dto, req.user.id);
  }

  // ── 分佣设置 ──

  @Put(":id/commission")
  @ApiOperation({ summary: "设置商家分佣比例" })
  setCommissionRate(@Param("id") id: string, @Body() dto: SetCommissionRateDto) {
    return this.settlementService.setCommissionRate(id, dto);
  }

  // ── 结算 ──

  @Get(":id/settlements")
  @ApiOperation({ summary: "结算记录" })
  listSettlements(@Param("id") id: string, @Query() q: PaginationDto) {
    return this.settlementService.listSettlements(id, q);
  }

  @Post(":id/settlements/pay")
  @ApiOperation({ summary: "标记结算已支付" })
  paySettlement(@Param("id") id: string, @Body() dto: PaySettlementDto) {
    return { merchantId: id, amount: dto.amount, status: "PAID", remark: dto.remark };
  }
}
