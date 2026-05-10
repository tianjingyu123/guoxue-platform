import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { EmailService } from "./email.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictThrottleGuard } from "../../common/throttle.guard";
import { SendEmailDto, SendVerifyCodeDto, TestEmailDto } from "./email.dto";

@ApiTags("邮件")
@Controller("email")
export class EmailController {
  constructor(private email: EmailService) {}

  @Post("send")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "发送邮件（管理员）" })
  @ApiBearerAuth()
  send(@Body() dto: SendEmailDto) {
    return this.email.send(dto);
  }

  @Post("send-code")
  @UseGuards(StrictThrottleGuard)
  @ApiOperation({ summary: "发送邮件验证码" })
  sendVerifyCode(@Body() dto: SendVerifyCodeDto) {
    return this.email.sendVerifyCode(dto.email, this.generateCode());
  }

  @Post("test")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "测试邮件配置" })
  @ApiBearerAuth()
  testEmail(@Body() dto: TestEmailDto) {
    return this.email.sendNotification(
      dto.to,
      "邮件服务测试",
      "如果您收到此邮件，说明邮件服务配置正确。",
    );
  }

  private generateCode(): string {
    const chars = "0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
