import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { EmailService } from "./email.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SendEmailDto, SendVerifyCodeDto, TestEmailDto, CreateEmailTemplateDto, UpdateEmailTemplateDto } from "./email.dto";

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
  @UseGuards(StrictRedisThrottleGuard)
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

  // ───────── 模板管理 ─────────

  @Get("templates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取邮件模板列表" })
  @ApiBearerAuth()
  getTemplates() {
    return this.email.getTemplates();
  }

  @Post("templates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "创建邮件模板" })
  @ApiBearerAuth()
  createTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.email.createTemplate(dto);
  }

  @Put("templates/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新邮件模板" })
  @ApiBearerAuth()
  updateTemplate(@Param("id") id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.email.updateTemplate(id, dto);
  }

  @Delete("templates/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除邮件模板" })
  @ApiBearerAuth()
  deleteTemplate(@Param("id") id: string) {
    return this.email.deleteTemplate(id);
  }

  @Post("send-template")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "使用模板发送邮件" })
  @ApiBearerAuth()
  sendWithTemplate(
    @Body() body: { templateId: string; to: string | string[]; vars?: Record<string, string> },
  ) {
    return this.email.sendWithTemplate(body.templateId, body.to, body.vars);
  }

  // ───────── 退订管理 ─────────

  @Post("unsubscribe")
  @ApiOperation({ summary: "退订邮件" })
  unsubscribe(@Body() body: { email: string; reason?: string }) {
    return this.email.unsubscribe(body.email, body.reason);
  }

  @Post("resubscribe")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "重新订阅（管理员）" })
  @ApiBearerAuth()
  resubscribe(@Body() body: { email: string }) {
    return this.email.resubscribe(body.email);
  }

  @Get("unsubscribe/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "退订列表（管理员）" })
  @ApiBearerAuth()
  getUnsubscribeList() {
    return this.email.getUnsubscribeList();
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
