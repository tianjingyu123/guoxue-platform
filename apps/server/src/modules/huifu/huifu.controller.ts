import { Controller, Get, Post, Put, Body, Param, Req, UseGuards, Headers, HttpCode } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { HuifuService } from "./huifu.service";
import { HuifuPayDto, HuifuSplitDto, HuifuRefundDto, UpdateConfigDto } from "./huifu.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { SkipFormat } from "../../common/skip-format.decorator";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

@ApiTags("汇付天下支付")
@Controller("huifu")
export class HuifuController {
  constructor(private svc: HuifuService) {}

  // ───────── 配置管理（管理端） ─────────

  @Get("configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取汇付配置列表（敏感信息脱敏）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getAllConfigs() {
    return this.svc.getAllConfigs();
  }

  @Put("config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新汇付配置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.svc.setConfig(dto.key, dto.value, dto.description);
  }

  @Get("status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "检查汇付支付是否已启用" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async checkStatus() {
    const enabled = await this.svc.isEnabled();
    return { enabled };
  }

  @Get("ping")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "汇付连通性探针（商户基本信息查询·不抛异常）" })
  @ApiResponse({ status: 200, description: "成功（ok=true 表示通道可用）" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  ping() {
    return this.svc.ping();
  }

  // ───────── 支付 ─────────

  @Post("pay")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建汇付天下支付" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  createPayment(@Req() req: Request, @Body() dto: HuifuPayDto) {
    return this.svc.createPayment(req.user.id, dto);
  }

  @Post("notify")
  @HttpCode(200)
  @SkipFormat()
  @ApiOperation({ summary: "汇付斗拱支付异步通知（公开接口·sign 在通知体内）" })
  @ApiResponse({ status: 200, description: "回调处理成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async handleNotify(@Body() body: Record<string, unknown>, @Headers("X-HF-Signature") headerSign?: string) {
    // 斗拱异步通知：POST 表单/JSON 含 resp_data(JSON字符串) 与 sign（兼容旧 header 签名）
    const signature = (typeof body?.sign === "string" ? body.sign : "") || headerSign;
    if (!signature) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付回调缺少签名");
    }
    const isValid = await this.svc.verifyNotify(body, signature);
    if (!isValid) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付回调签名验证失败");
    }
    const outTradeNo = await this.svc.handleNotify(body);
    return `RECV_ORD_ID_${outTradeNo}`;
  }

  @Post("query")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询支付状态" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  queryPayment(@Body("outTradeNo") outTradeNo: string, @Req() req: Request) {
    return this.svc.queryPayment(outTradeNo, req.user.id);
  }

  // ───────── 分账 ─────────

  @Post("split")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "发起分账（提交资金审批·财务审批通过后才真正向汇付发起）" })
  @ApiResponse({ status: 201, description: "已提交审批" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  createSplit(@Body() dto: HuifuSplitDto, @Req() req: Request) {
    return this.svc.requestSplit(dto, req.user.id);
  }

  @Get("split/:orderId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询分账结果" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  querySplit(@Param("orderId") orderId: string) {
    return this.svc.querySplit(orderId);
  }

  // ───────── 退款 ─────────

  @Post("refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "汇付退款" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  createRefund(@Body() dto: HuifuRefundDto, @Req() req: Request) {
    return this.svc.requestRefund(dto, req.user.id);
  }

  // ───────── 账单与余额 ─────────

  @Get("balance")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询商户余额" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  queryBalance() {
    return this.svc.queryBalance();
  }

  @Get("bill/:date")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "下载账单" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  downloadBill(@Param("date") date: string) {
    return this.svc.downloadBill(date);
  }
}
