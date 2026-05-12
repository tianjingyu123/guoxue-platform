import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { FinanceService } from "./finance.service";
import {
  CreateReconciliationDto,
  ReconciliationQueryDto,
  CreateInvoiceDto,
  InvoiceQueryDto,
  IssueInvoiceDto,
  MailInvoiceDto,
  SettlementQueryDto,
  GenerateSettlementDto,
  WithdrawalQueryDto,
  ApproveWithdrawalDto,
  RejectWithdrawalDto,
  MonthlyReportDto,
  FreezeAmountDto,
  UnfreezeAmountDto,
  FreezeRecordQueryDto,
} from "./finance.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("财务管理")
@ApiBearerAuth()
@Controller("finance")
export class FinanceController {
  constructor(private svc: FinanceService) {}

  // ───────── 1. 对账中心 ─────────

  @Post("reconciliation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "触发对账" })
  triggerReconciliation(@Body() dto: CreateReconciliationDto) {
    return this.svc.triggerReconciliation(dto);
  }

  @Get("reconciliation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "对账记录列表" })
  @ApiQuery({ name: "source", required: false, type: String, description: "支付渠道" })
  @ApiQuery({ name: "status", required: false, type: String, description: "对账状态" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getReconciliationList(
    @Query("source") source?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getReconciliationList({ source, status, page: +page, pageSize: +pageSize });
  }

  @Get("reconciliation/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "对账详情" })
  getReconciliationDetail(@Param("id") id: string) {
    return this.svc.getReconciliationDetail(id);
  }

  // ───────── 2. 发票管理 ─────────

  @Post("invoices")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建发票申请" })
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.svc.createInvoice(dto);
  }

  @Get("invoices")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发票列表" })
  @ApiQuery({ name: "status", required: false, type: String, description: "发票状态" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getInvoiceList(
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getInvoiceList({ status, page: +page, pageSize: +pageSize });
  }

  @Put("invoices/:id/issue")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "开具发票" })
  issueInvoice(@Param("id") id: string, @Body() dto: IssueInvoiceDto) {
    return this.svc.issueInvoice(id, dto.invoiceUrl);
  }

  @Put("invoices/:id/mail")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "标记已邮寄" })
  mailInvoice(@Param("id") id: string, @Body() dto: MailInvoiceDto) {
    return this.svc.mailInvoice(id, dto.expressNo);
  }

  // ───────── 3. 结算单 ─────────

  @Get("settlements")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "结算单列表" })
  @ApiQuery({ name: "userId", required: false, type: String, description: "用户ID" })
  @ApiQuery({ name: "period", required: false, type: String, description: "结算周期" })
  @ApiQuery({ name: "status", required: false, type: String, description: "结算状态" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getSettlementList(
    @Query("userId") userId?: string,
    @Query("period") period?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getSettlementList({ userId, period, status, page: +page, pageSize: +pageSize });
  }

  @Post("settlements/generate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "按周期生成结算单" })
  generateSettlement(@Body() dto: GenerateSettlementDto) {
    return this.svc.generateSettlement(dto);
  }

  @Put("settlements/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审批通过结算单" })
  approveSettlement(@Param("id") id: string, @Req() req: Request) {
    return this.svc.approveSettlement(id, req.user.id);
  }

  @Put("settlements/:id/pay")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "标记已打款" })
  paySettlement(@Param("id") id: string) {
    return this.svc.paySettlement(id);
  }

  // ───────── 4. 提现审批 ─────────

  @Get("withdrawals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "提现申请列表" })
  @ApiQuery({ name: "status", required: false, type: String, description: "提现状态" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getWithdrawalList(
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getWithdrawalList({ status, page: +page, pageSize: +pageSize });
  }

  @Put("withdrawals/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批准提现" })
  approveWithdrawal(@Param("id") id: string, @Body() dto: ApproveWithdrawalDto, @Req() req: Request) {
    return this.svc.approveWithdrawal(id, req.user.id, dto.reviewNote);
  }

  @Put("withdrawals/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "驳回提现" })
  rejectWithdrawal(@Param("id") id: string, @Body() dto: RejectWithdrawalDto, @Req() req: Request) {
    return this.svc.rejectWithdrawal(id, req.user.id, dto.reviewNote);
  }

  @Post("withdrawals/:id/pay")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "确认打款" })
  confirmWithdrawalPay(@Param("id") id: string) {
    return this.svc.confirmWithdrawalPay(id);
  }

  // ───────── 6. 资金冻结/解冻 ─────────

  @Post("freeze")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "冻结订单资金" })
  freezeAmount(@Body() dto: FreezeAmountDto) {
    return this.svc.freezeAmount(dto);
  }

  @Post("unfreeze")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "解冻订单资金" })
  unfreezeAmount(@Body() dto: UnfreezeAmountDto) {
    return this.svc.unfreezeAmount(dto);
  }

  @Get("freeze-records")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "冻结记录列表" })
  @ApiQuery({ name: "orderId", required: false, type: String, description: "订单ID" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getFreezeRecords(
    @Query("orderId") orderId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getFreezeRecords({ orderId, page: +page, pageSize: +pageSize });
  }

  // ───────── 5. 财务报表 ─────────

  @Get("reports/monthly")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "月报数据（不传period则返回全部已保存报表列表）" })
  @ApiQuery({ name: "period", required: false, type: String, description: "报表周期（如 2026-05）" })
  getMonthlyReport(@Query("period") period?: string) {
    return this.svc.getMonthlyReport(period);
  }

  @Post("reports/monthly/generate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "生成月报并保存" })
  @ApiQuery({ name: "period", required: true, type: String, description: "报表周期（如 2026-05）" })
  generateMonthlyReport(@Query("period") period: string, @Req() req: Request) {
    return this.svc.generateMonthlyReport(period, req.user.id);
  }
}
