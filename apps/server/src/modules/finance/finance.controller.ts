import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { FinanceService } from "./finance.service";
import {
  CreateReconciliationDto,
  CreateInvoiceDto,
  IssueInvoiceDto,
  MailInvoiceDto,
  RejectInvoiceDto,
  GenerateSettlementDto,
  ApproveWithdrawalDto,
  RejectWithdrawalDto,
  FreezeAmountDto,
  UnfreezeAmountDto,
} from "./finance.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";

@ApiTags("财务管理")
@ApiBearerAuth()
@Controller("finance")
export class FinanceController {
  constructor(private svc: FinanceService) {}

  // ───────── 1. 对账中心 ─────────

  @Post("reconciliation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "触发对账" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  triggerReconciliation(@Body() dto: CreateReconciliationDto) {
    return this.svc.triggerReconciliation(dto);
  }

  @Get("reconciliation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "对账记录列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "对账详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getReconciliationDetail(@Param("id") id: string) {
    return this.svc.getReconciliationDetail(id);
  }

  // ───────── 2. 发票管理（用户端） ─────────

  @Get("my/invoices")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的发票列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getMyInvoices(
    @Req() req: Request,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getMyInvoices(req.user.id, status, +page, +pageSize);
  }

  @Post("my/invoices")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "申请开票" })
  @ApiResponse({ status: 201, description: "申请成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  createMyInvoice(
    @Req() req: Request,
    @Body() body: { orderId: string; type: string; title: string; taxNo?: string; email?: string },
  ) {
    return this.svc.createMyInvoice(req.user.id, body.orderId, body.type, body.title, body.taxNo, body.email);
  }

  // ───────── 2b. 发票管理（管理端） ─────────

  @Post("invoices")
  @Auditable({ action: "创建发票", targetType: "INVOICE" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "创建发票申请" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.svc.createInvoice(dto);
  }

  @Get("invoices")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "发票列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @Auditable({ action: "开具发票", targetType: "INVOICE" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "开具发票" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  issueInvoice(@Param("id") id: string, @Body() dto: IssueInvoiceDto) {
    return this.svc.issueInvoice(id, dto.invoiceUrl);
  }

  @Put("invoices/:id/mail")
  @Auditable({ action: "发票邮寄", targetType: "INVOICE" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "标记已邮寄" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  mailInvoice(@Param("id") id: string, @Body() dto: MailInvoiceDto) {
    return this.svc.mailInvoice(id, dto.expressNo);
  }

  @Put("invoices/:id/reject")
  @Auditable({ action: "发票驳回", targetType: "INVOICE" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "驳回发票申请" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  rejectInvoice(@Param("id") id: string, @Body() dto: RejectInvoiceDto, @Req() req: Request) {
    return this.svc.rejectInvoice(id, req.user.id, dto.reason);
  }

  // ───────── 3. 结算单 ─────────

  @Get("settlements")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "结算单列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "按周期生成结算单" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  generateSettlement(@Body() dto: GenerateSettlementDto) {
    return this.svc.generateSettlement(dto);
  }

  @Put("settlements/:id/approve")
  @Auditable({ action: "结算审批", targetType: "SETTLEMENT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "审批通过结算单" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  approveSettlement(@Param("id") id: string, @Req() req: Request) {
    return this.svc.approveSettlement(id, req.user.id);
  }

  @Put("settlements/:id/pay")
  @Auditable({ action: "结算打款", targetType: "SETTLEMENT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "标记已打款" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  paySettlement(@Param("id") id: string) {
    return this.svc.paySettlement(id);
  }

  // ───────── 4. 提现审批 ─────────

  @Get("withdrawals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "提现申请列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @Auditable({ action: "提现审批通过", targetType: "WITHDRAWAL" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "批准提现" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  approveWithdrawal(@Param("id") id: string, @Body() dto: ApproveWithdrawalDto, @Req() req: Request) {
    return this.svc.approveWithdrawal(id, req.user.id, dto.reviewNote);
  }

  @Put("withdrawals/:id/reject")
  @Auditable({ action: "提现驳回", targetType: "WITHDRAWAL" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "驳回提现" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  rejectWithdrawal(@Param("id") id: string, @Body() dto: RejectWithdrawalDto, @Req() req: Request) {
    return this.svc.rejectWithdrawal(id, req.user.id, dto.reviewNote);
  }

  @Post("withdrawals/:id/pay")
  @Auditable({ action: "提现打款", targetType: "WITHDRAWAL" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "确认打款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  confirmWithdrawalPay(@Param("id") id: string) {
    return this.svc.confirmWithdrawalPay(id);
  }

  // ───────── 6. 资金冻结/解冻 ─────────

  @Post("freeze")
  @Auditable({ action: "资金冻结", targetType: "FUND" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "冻结订单资金" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  freezeAmount(@Body() dto: FreezeAmountDto) {
    return this.svc.freezeAmount(dto);
  }

  @Post("unfreeze")
  @Auditable({ action: "资金解冻", targetType: "FUND" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "解冻订单资金" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  unfreezeAmount(@Body() dto: UnfreezeAmountDto) {
    return this.svc.unfreezeAmount(dto);
  }

  @Get("freeze-records")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "冻结记录列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "月报数据（不传period则返回全部已保存报表列表）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "period", required: false, type: String, description: "报表周期（如 2026-05）" })
  getMonthlyReport(@Query("period") period?: string) {
    return this.svc.getMonthlyReport(period);
  }

  @Post("reports/monthly/generate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "生成月报并保存" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "period", required: true, type: String, description: "报表周期（如 2026-05）" })
  generateMonthlyReport(@Query("period") period: string, @Req() req: Request) {
    return this.svc.generateMonthlyReport(period, req.user.id);
  }
}
