import { Controller, Post, Get, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SmsService } from "./sms.service";
import { StrictThrottleGuard } from "../../common/throttle.guard";
import { SendSmsDto, VerifySmsDto } from "./sms.dto";

@ApiTags("短信服务")
@Controller("sms")
export class SmsController {
  constructor(private sms: SmsService) {}

  @Post("send")
  @UseGuards(StrictThrottleGuard)
  @ApiOperation({ summary: "发送短信验证码" })
  sendCode(
    @Body() body: SendSmsDto,
  ) {
    return this.sms.sendVerifyCode(body.phone, body.scene || "LOGIN");
  }

  @Post("verify")
  @UseGuards(StrictThrottleGuard)
  @ApiOperation({ summary: "验证短信验证码" })
  verifyCode(
    @Body() body: VerifySmsDto,
  ) {
    return this.sms.verifyCode(body.phone, body.code, body.scene || "LOGIN");
  }

  @Get("status")
  @ApiOperation({ summary: "查询发送状态/倒计时" })
  getStatus(@Query("phone") phone: string) {
    return this.sms.getSendStatus(phone);
  }
}
