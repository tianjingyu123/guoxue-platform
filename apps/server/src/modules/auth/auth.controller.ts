import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, UsePipes, Req, BadRequestException, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { WechatService } from "./wechat.service";
import { SystemService } from "../system/system.service";
import {
  PhoneRegisterDto,
  PhoneLoginDto,
  SmsLoginDto,
  SendCodeDto,
  WechatLoginDto,
  MiniPhoneLoginDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from "./auth.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SanitizePipe } from "../../common/sanitize.pipe";
import { maskPhone } from "../../common/crypto.util";
import { Request } from "express";

@ApiTags("认证")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private auth: AuthService,
    private wechat: WechatService,
    private systemService: SystemService,
  ) {}

  @Post("register/phone")
  @ApiOperation({ summary: "手机号注册", description: "使用手机号和密码注册新用户" })
  @UseGuards(StrictRedisThrottleGuard)
  async phoneRegister(@Body() dto: PhoneRegisterDto, @Req() req: Request) {
    const result = await this.auth.phoneRegister(dto);
    this.systemService.logAudit({
      userId: result.user.id,
      action: "CREATE",
      targetType: "USER",
      targetId: result.user.id,
      detail: `手机号注册: ${maskPhone(dto.phone)}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Post("login/phone")
  @ApiOperation({ summary: "手机号登录", description: "使用手机号和密码登录" })
  @UseGuards(StrictRedisThrottleGuard)
  async phoneLogin(@Body() dto: PhoneLoginDto, @Req() req: Request) {
    try {
      const result = await this.auth.phoneLogin(dto);
      this.systemService.logAudit({
        userId: result.user.id,
        action: "LOGIN",
        detail: `手机号登录`,
        ip: req.ip,
      }).catch((err) => this.logger.warn("Webhook 发送失败", err));
      return result;
    } catch (err) {
      this.systemService.logAudit({
        action: "LOGIN_FAILED",
        targetType: "PHONE",
        targetId: maskPhone(dto.phone),
        detail: `登录失败: ${maskPhone(dto.phone)}`,
        ip: req.ip,
      }).catch((err) => this.logger.warn("Webhook 发送失败", err));
      throw err;
    }
  }

  @Post("login/sms")
  @ApiOperation({ summary: "短信验证码登录", description: "使用手机号和短信验证码登录" })
  @UseGuards(StrictRedisThrottleGuard)
  async smsLogin(@Body() dto: SmsLoginDto, @Req() req: Request) {
    try {
      const result = await this.auth.smsLogin(dto);
      this.systemService.logAudit({
        userId: result.user.id,
        action: "LOGIN",
        detail: `短信验证码登录`,
        ip: req.ip,
      }).catch((err) => this.logger.warn("Webhook 发送失败", err));
      return result;
    } catch (err) {
      this.systemService.logAudit({
        action: "LOGIN_FAILED",
        targetType: "PHONE",
        targetId: maskPhone(dto.phone),
        detail: `短信登录失败: ${maskPhone(dto.phone)}`,
        ip: req.ip,
      }).catch((err) => this.logger.warn("Webhook 发送失败", err));
      throw err;
    }
  }

  @Post("sms/send")
  @ApiOperation({ summary: "发送短信验证码", description: "向指定手机号发送验证码" })
  @UseGuards(StrictRedisThrottleGuard)
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendSmsCode(dto);
  }

  @Get("wechat/oauth-url")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "获取微信 OAuth 授权 URL", description: "H5 微信登录：前端跳转到该 URL 完成授权后回调" })
  @ApiQuery({ name: "redirectUri", description: "授权后回调地址", example: "https://example.com/callback" })
  @ApiQuery({ name: "scope", description: "授权范围", example: "snsapi_userinfo", required: false })
  getWechatOAuthUrl(
    @Query("redirectUri") redirectUri: string,
    @Query("scope") scope?: string,
  ) {
    if (!redirectUri) throw new BadRequestException("redirectUri 参数必填");
    const url = this.wechat.buildOAuthUrl(redirectUri, (scope || "snsapi_userinfo") as "snsapi_base" | "snsapi_userinfo");
    return { url };
  }

  @Post("login/wechat")
  @ApiOperation({ summary: "微信登录（H5/小程序）", description: "使用微信授权 code 登录，自动判断 H5 OAuth 或小程序" })
  @UseGuards(StrictRedisThrottleGuard)
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.auth.wechatLogin(dto);
  }

  @Post("login/mini-phone")
  @ApiOperation({ summary: "小程序手机号快速登录", description: "微信小程序一键登录：wx.login + getPhoneNumber 获取手机号后自动登录/注册" })
  @UseGuards(StrictRedisThrottleGuard)
  miniPhoneLogin(@Body() dto: MiniPhoneLoginDto) {
    return this.auth.miniPhoneLogin(dto);
  }

  @Get("me")
  @ApiOperation({ summary: "获取当前用户信息", description: "获取已登录用户的个人信息（需 JWT）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return this.auth.getProfile(req.user.id);
  }

  @Post("refresh")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "刷新 Token", description: "使用 refreshToken 换取新的 accessToken + refreshToken（轮换防重放）" })
  async refresh(@Body("refreshToken") refreshToken: string) {
    if (!refreshToken) throw new BadRequestException("refreshToken 参数必填");
    return this.auth.refreshToken(refreshToken);
  }

  @Put("profile")
  @ApiOperation({ summary: "更新用户信息", description: "更新已登录用户的个人资料（需 JWT）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.id, dto);
  }

  @Put("password")
  @ApiOperation({ summary: "修改密码", description: "修改当前用户的登录密码（需 JWT）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto);
  }

  // ── 账号安全 ──

  @Post("devices/register")
  @ApiOperation({ summary: "注册当前登录设备" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  registerDevice(@Req() req: Request, @Body() body: { deviceName?: string; deviceType?: string }) {
    return this.auth.registerDevice(req.user.id, body.deviceName, body.deviceType, req.ip || undefined);
  }

  @Get("devices")
  @ApiOperation({ summary: "登录设备列表" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listDevices(@Req() req: Request) {
    return this.auth.listDevices(req.user.id);
  }

  @Post("devices/:id/logout")
  @ApiOperation({ summary: "踢出指定设备" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeDevice(@Req() req: Request, @Param("id") id: string) {
    return this.auth.removeDevice(req.user.id, id);
  }

  @Post("bind/phone")
  @ApiOperation({ summary: "绑定手机号" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  bindPhone(@Req() req: Request, @Body() body: { phone: string; code: string }) {
    return this.auth.bindPhone(req.user.id, body.phone, body.code);
  }

  @Post("bind/wechat")
  @ApiOperation({ summary: "绑定微信" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  bindWechat(@Req() req: Request, @Body("code") code: string) {
    return this.auth.bindWechat(req.user.id, code);
  }
}
