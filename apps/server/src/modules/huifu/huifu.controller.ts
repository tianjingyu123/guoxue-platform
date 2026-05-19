import { Controller, Get, Post, Put, Body, Param, Req, UseGuards, Headers } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { HuifuService } from "./huifu.service";
import { HuifuPayDto, HuifuSplitDto, HuifuRefundDto, UpdateConfigDto } from "./huifu.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

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
  getAllConfigs() {
    return this.svc.getAllConfigs();
  }

  @Put("config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新汇付配置" })
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.svc.setConfig(dto.key, dto.value, dto.description);
  }

  @Get("status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "检查汇付支付是否已启用" })
  async checkStatus() {
    const enabled = await this.svc.isEnabled();
    return { enabled };
  }

  // ───────── 支付 ─────────

  @Post("pay")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建汇付天下支付" })
  createPayment(@Req() req: Request, @Body() dto: HuifuPayDto) {
    return this.svc.createPayment(req.user.id, dto);
  }

  @Post("notify")
  @ApiOperation({ summary: "汇付天下支付回调（公开接口）" })
  async handleNotify(@Body() body: Record<string, unknown>, @Headers("X-HF-Signature") signature?: string) {
    if (!signature) {
      return { resp_code: "FAIL", resp_msg: "缺少签名" };
    }
    const isValid = await this.svc.verifyNotify(body, signature);
    if (!isValid) {
      return { resp_code: "FAIL", resp_msg: "签名验证失败" };
    }
    await this.svc.handleNotify(body);
    return { resp_code: "10000", resp_msg: "成功" };
  }

  @Post("query")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询支付状态" })
  queryPayment(@Body("outTradeNo") outTradeNo: string) {
    return this.svc.queryPayment(outTradeNo);
  }

  // ───────── 分账 ─────────

  @Post("split")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "发起分账" })
  createSplit(@Body() dto: HuifuSplitDto) {
    return this.svc.createSplit(dto);
  }

  @Get("split/:orderId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询分账结果" })
  querySplit(@Param("orderId") orderId: string) {
    return this.svc.querySplit(orderId);
  }

  // ───────── 退款 ─────────

  @Post("refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "汇付退款" })
  createRefund(@Body() dto: HuifuRefundDto) {
    return this.svc.createRefund(dto);
  }

  // ───────── 账单与余额 ─────────

  @Get("balance")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询商户余额" })
  queryBalance() {
    return this.svc.queryBalance();
  }

  @Get("bill/:date")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "下载账单" })
  downloadBill(@Param("date") date: string) {
    return this.svc.downloadBill(date);
  }
}
