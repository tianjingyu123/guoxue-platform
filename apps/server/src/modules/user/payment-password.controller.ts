import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { PaymentPasswordService } from "./payment-password.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SetPaymentPasswordDto, UpdatePaymentPasswordDto, VerifyPaymentPasswordDto, ResetPaymentPasswordDto } from "./dto/payment-password.dto";

@ApiTags("支付密码")
@Controller("users/me")
@UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
@ApiBearerAuth()
export class PaymentPasswordController {
  constructor(private readonly svc: PaymentPasswordService) {}

  @Post("payment-password")
  @ApiOperation({ summary: "设置支付密码（首次，6位数字）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  setPassword(@Req() req: Request, @Body() dto: SetPaymentPasswordDto) {
    return this.svc.setPassword(req.user.id, dto.password, dto.smsCode);
  }

  @Post("payment-password/update")
  @ApiOperation({ summary: "修改支付密码" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  updatePassword(@Req() req: Request, @Body() dto: UpdatePaymentPasswordDto) {
    return this.svc.updatePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }

  @Post("payment-password/verify")
  @ApiOperation({ summary: "验证支付密码" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  verifyPassword(@Req() req: Request, @Body() dto: VerifyPaymentPasswordDto) {
    return this.svc.verifyPassword(req.user.id, dto.password);
  }

  @Post("payment-password/reset")
  @ApiOperation({ summary: "重置支付密码（短信验证码校验后）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  resetPassword(@Req() req: Request, @Body() dto: ResetPaymentPasswordDto) {
    return this.svc.resetPassword(req.user.id, dto.newPassword, dto.smsCode);
  }
}
