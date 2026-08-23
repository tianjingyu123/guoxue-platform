import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, UsePipes, Req, BadRequestException, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
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
  RegisterDeviceDto,
  BindPhoneDto,
  ForgotPasswordDto,
  OaOpenidDto,
  BindWechatDto,
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @UseGuards(StrictRedisThrottleGuard)
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendSmsCode(dto);
  }

  @Post("reset-password")
  @ApiOperation({ summary: "忘记密码：短信验证码重置密码" })
  @UseGuards(StrictRedisThrottleGuard)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Get("wechat/oauth-url")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "获取微信 OAuth 授权 URL", description: "H5 微信登录：前端跳转到该 URL 完成授权后回调" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "redirectUri", description: "授权后回调地址", example: "https://example.com/callback" })
  @ApiQuery({ name: "scope", description: "授权范围", example: "snsapi_userinfo", required: false })
  @ApiQuery({ name: "state", description: "前端生成的一次性 OAuth state", required: false })
  getWechatOAuthUrl(
    @Query("redirectUri") redirectUri: string,
    @Query("scope") scope?: string,
    @Query("clientKey") clientKey?: string,
    @Query("state") state?: string,
  ) {
    if (!redirectUri) throw new BadRequestException("redirectUri 参数必填");
    const url = this.wechat.buildOAuthUrl(
      redirectUri,
      (scope || "snsapi_userinfo") as "snsapi_base" | "snsapi_userinfo",
      clientKey,
      state,
    );
    return { url };
  }

  @Post("wechat/oa-openid")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "公众号网页授权 code 换 openid（微信内 JSAPI 支付用）",
    description: "已登录用户在公众号内 H5 完成 snsapi_base 静默授权后，用 code 换取公众号 openid。仅返回 openid，不落库、不影响登录态与已绑定的小程序微信记录。",
  })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  async oaOpenid(@Body() dto: OaOpenidDto) {
    const { openId } = await this.wechat.exchangeOAuthCode(dto.code, dto.clientKey);
    return { openid: openId };
  }

  @Post("login/wechat")
  @ApiOperation({ summary: "微信登录（H5/小程序）", description: "使用微信授权 code 登录，自动判断 H5 OAuth 或小程序" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @UseGuards(StrictRedisThrottleGuard)
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.auth.wechatLogin(dto);
  }

  @Post("login/mini-phone")
  @ApiOperation({ summary: "小程序手机号快速登录", description: "微信小程序一键登录：wx.login + getPhoneNumber 获取手机号后自动登录/注册" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @UseGuards(StrictRedisThrottleGuard)
  miniPhoneLogin(@Body() dto: MiniPhoneLoginDto) {
    return this.auth.miniPhoneLogin(dto);
  }

  @Get("me")
  @ApiOperation({ summary: "获取当前用户信息", description: "获取已登录用户的个人信息（需 JWT）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return this.auth.getProfile(req.user.id);
  }

  @Post("refresh")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "刷新 Token", description: "使用 refreshToken 换取新的 accessToken + refreshToken（轮换防重放）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async refresh(@Body("refreshToken") refreshToken: string) {
    if (!refreshToken) throw new BadRequestException("refreshToken 参数必填");
    return this.auth.refreshToken(refreshToken);
  }

  @Post("handoff/issue")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "签发跨端无感登录握手码", description: "登录态签发一次性短时码（60s·绑定本人），用于后台跳 C 端等跨端无感登录，避免 token 进 URL" })
  @ApiResponse({ status: 201, description: "签发成功" })
  issueHandoff(@Req() req: Request) {
    return this.auth.issueHandoffCode(req.user.id);
  }

  @Post("handoff/exchange")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "握手码换会话", description: "用一次性握手码换取新的 accessToken + refreshToken（用后即焚）" })
  @ApiResponse({ status: 201, description: "换取成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async exchangeHandoff(@Body("code") code: string) {
    if (!code) throw new BadRequestException("code 参数必填");
    return this.auth.exchangeHandoffCode(code);
  }

  @Put("profile")
  @ApiOperation({ summary: "更新用户信息", description: "更新已登录用户的个人资料（需 JWT）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.id, dto);
  }

  @Put("password")
  @ApiOperation({ summary: "修改密码", description: "修改当前用户的登录密码（需 JWT）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto);
  }

  // ── 账号安全 ──

  @Post("devices/register")
  @ApiOperation({ summary: "注册当前登录设备" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  registerDevice(@Req() req: Request, @Body() body: RegisterDeviceDto) {
    return this.auth.registerDevice(req.user.id, body.deviceName, body.deviceType, req.ip || undefined);
  }

  @Get("devices")
  @ApiOperation({ summary: "登录设备列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listDevices(@Req() req: Request) {
    return this.auth.listDevices(req.user.id);
  }

  @Post("devices/:id/logout")
  @ApiOperation({ summary: "踢出指定设备" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeDevice(@Req() req: Request, @Param("id") id: string) {
    return this.auth.removeDevice(req.user.id, id);
  }

  @Post("bind/phone")
  @ApiOperation({ summary: "绑定手机号" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  bindPhone(@Req() req: Request, @Body() body: BindPhoneDto) {
    return this.auth.bindPhone(req.user.id, body.phone, body.code);
  }

  @Post("bind/wechat")
  @ApiOperation({ summary: "绑定微信" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  bindWechat(@Req() req: Request, @Body() dto: BindWechatDto) {
    return this.auth.bindWechat(req.user.id, dto.code, (dto.loginType || "h5") as "h5" | "miniprogram" | "app", dto.clientKey);
  }
}
