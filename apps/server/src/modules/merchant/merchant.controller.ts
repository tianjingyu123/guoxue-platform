import { Controller, Get, Post, Put, Body, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RequireFeature } from "../../common/feature-flag.decorator";
import { MerchantService } from "./merchant.service";
import { MerchantDepositService } from "./merchant-deposit.service";
import { MerchantAgreementService } from "./merchant-agreement.service";
import { MerchantMetricService } from "./merchant-metric.service";
import { MerchantCreditService } from "./merchant-credit.service";
import { MerchantGuard } from "./merchant.guard";
import {
  CreateMerchantApplyDto, UpdateMerchantApplyDto,
  PayDepositDto, SignAgreementDto,
} from "./merchant.dto";
import { MERCHANT_FEATURE_FLAGS } from "./merchant.types";

type AuthRequest = Omit<Request, "user"> & { user: { id: string; [key: string]: unknown } };

@ApiTags("商家入驻")
@Controller("merchant")
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@RequireFeature(MERCHANT_FEATURE_FLAGS.ONBOARDING)
@ApiBearerAuth()
export class MerchantController {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly depositService: MerchantDepositService,
    private readonly agreementService: MerchantAgreementService,
    private readonly metricService: MerchantMetricService,
    private readonly creditService: MerchantCreditService,
  ) {}

  @Get("my/metrics")
  @ApiOperation({ summary: "商家本人履约健康指标（近 N 日·履-P1）" })
  @ApiResponse({ status: 200, description: "成功" })
  // 方法级覆盖类级 ONBOARDING 开关：本端点属经营后台能力；MerchantGuard=模块现有商家身份守卫（ACTIVE 商家·挂 request.merchant）
  @RequireFeature(MERCHANT_FEATURE_FLAGS.BACKEND)
  @UseGuards(MerchantGuard)
  getMyMetrics(@Req() req: AuthRequest, @Query("days") days?: string) {
    const merchant = (req as unknown as { merchant: { id: string } }).merchant;
    return this.metricService.getMyMetrics(merchant.id, days);
  }

  @Get("my/credit")
  @ApiOperation({ summary: "商家本人信用分与等级权益（含变动 log 明细·履-P2）" })
  @ApiResponse({ status: 200, description: "成功" })
  // 同 my/metrics：方法级覆盖类级 ONBOARDING 开关，MerchantGuard 校验 ACTIVE 商家身份
  @RequireFeature(MERCHANT_FEATURE_FLAGS.BACKEND)
  @UseGuards(MerchantGuard)
  getMyCredit(@Req() req: AuthRequest) {
    const merchant = (req as unknown as { merchant: { id: string } }).merchant;
    return this.creditService.getMyCredit(merchant.id);
  }

  @Post("apply")
  @ApiOperation({ summary: "提交入驻申请" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createApplication(@Req() req: AuthRequest, @Body() dto: CreateMerchantApplyDto) {
    return this.merchantService.createApplication(req.user.id, dto);
  }

  @Get("application")
  @ApiOperation({ summary: "获取入驻申请状态" })
  @ApiResponse({ status: 200, description: "成功" })
  getApplication(@Req() req: AuthRequest) {
    return this.merchantService.getApplication(req.user.id);
  }

  @Put("application")
  @ApiOperation({ summary: "修改入驻申请（驳回后可重新提交）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  updateApplication(@Req() req: AuthRequest, @Body() dto: UpdateMerchantApplyDto) {
    return this.merchantService.updateApplication(req.user.id, dto);
  }

  @Post("submit")
  @ApiOperation({ summary: "提交审核" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  submitForReview(@Req() req: AuthRequest) {
    return this.merchantService.submitForReview(req.user.id);
  }

  @Get("deposit-info")
  @ApiOperation({ summary: "获取保证金信息" })
  @ApiResponse({ status: 200, description: "成功" })
  getDepositInfo(@Req() req: AuthRequest) {
    return this.depositService.getDepositInfo(req.user.id);
  }

  @Post("pay-deposit")
  @ApiOperation({ summary: "保证金支付（当前免缴，在线收款未开放）" })
  @ApiResponse({ status: 400, description: "当前免缴或在线收款未开放" })
  payDeposit(@Req() req: AuthRequest, @Body() dto: PayDepositDto) {
    return this.depositService.payDeposit(req.user.id, dto);
  }

  @Get("agreement-preview")
  @ApiOperation({ summary: "获取最新协议预览" })
  @ApiResponse({ status: 200, description: "成功" })
  previewAgreement() {
    return this.agreementService.getLatestAgreement();
  }

  @Post("sign-agreement")
  @ApiOperation({ summary: "签署入驻协议" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  signAgreement(@Req() req: AuthRequest, @Body() dto: SignAgreementDto) {
    const ip = (req as any).ip || req.socket?.remoteAddress || "";
    return this.agreementService.signAgreement(req.user.id, ip, dto);
  }
}
