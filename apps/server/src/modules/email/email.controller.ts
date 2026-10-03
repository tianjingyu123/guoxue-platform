import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { randomInt } from "crypto";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { EmailService } from "./email.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SendEmailDto, SendVerifyCodeDto, TestEmailDto, CreateEmailTemplateDto, UpdateEmailTemplateDto, SendTemplateDto, UnsubscribeDto, ResubscribeDto } from "./email.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("邮件")
@Controller("email")
export class EmailController {
  constructor(private email: EmailService) {}

  @Post("send")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "发送邮件（管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  send(@Body() dto: SendEmailDto) {
    return this.email.send(dto);
  }

  @Post("send-verify-code")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "发送邮件验证码" })
  @ApiResponse({ status: 201, description: "发送成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  sendVerifyCode(@Body() dto: SendVerifyCodeDto) {
    return this.email.sendVerifyCode(dto.email, this.generateCode());
  }

  @Post("test")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "测试邮件配置" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getTemplates() {
    return this.email.getTemplates();
  }

  @Post("templates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "创建邮件模板" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.email.createTemplate(dto);
  }

  @Put("templates/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新邮件模板" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateTemplate(@Param("id") id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.email.updateTemplate(id, dto);
  }

  @Delete("templates/:id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除邮件模板" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteTemplate(@Param("id") id: string) {
    return this.email.deleteTemplate(id);
  }

  @Post("send-template")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "使用模板发送邮件" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  sendWithTemplate(
    @Body() body: SendTemplateDto,
  ) {
    return this.email.sendWithTemplate(body.templateId, body.to, body.vars);
  }

  // ───────── 退订管理 ─────────

  @Post("unsubscribe")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "退订邮件" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  unsubscribe(@Body() body: UnsubscribeDto) {
    return this.email.unsubscribe(body.email, body.reason);
  }

  @Post("resubscribe")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "重新订阅（管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  resubscribe(@Body() body: ResubscribeDto) {
    return this.email.resubscribe(body.email);
  }

  @Get("unsubscribe/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "退订列表（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getUnsubscribeList() {
    return this.email.getUnsubscribeList();
  }

  private generateCode(): string {
    const chars = "0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[randomInt(0, chars.length)];
    }
    return code;
  }
}
