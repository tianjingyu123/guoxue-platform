import { Controller, Post, Get, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { SmsService } from "./sms.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SendSmsDto, VerifySmsDto } from "./sms.dto";

@ApiTags("短信服务")
@Controller("sms")
export class SmsController {
  constructor(private sms: SmsService) {}

  @Post("send")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "发送短信验证码" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  sendCode(
    @Body() body: SendSmsDto,
  ) {
    return this.sms.sendVerifyCode(body.phone, body.scene || "LOGIN");
  }

  @Post("verify")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "验证短信验证码" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  verifyCode(
    @Body() body: VerifySmsDto,
  ) {
    return this.sms.verifyCode(body.phone, body.code, body.scene || "LOGIN");
  }

  @Get("status")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "查询发送状态/倒计时" })
  @ApiResponse({ status: 200, description: "成功" })
  getStatus(@Query("phone") phone: string) {
    return this.sms.getSendStatus(phone);
  }

  // ───────── 管理端 ─────────

  @Get("admin/logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "短信发送日志（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getAdminLogs(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("status") status?: string,
  ) {
    return this.sms.getAdminLogs(+page, +pageSize, status);
  }

  @Get("admin/config-status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "短信配置状态（只读存在性·绝不返回密钥明文）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getConfigStatus() {
    return this.sms.getConfigStatus();
  }

  @Get("admin/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "短信发送统计（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getAdminStats() {
    return this.sms.getAdminStats();
  }
}
