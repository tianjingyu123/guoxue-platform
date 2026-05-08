import { Controller, Post, Get, Put, Body, Query, UseGuards, Req, BadRequestException } from "@nestjs/common";
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
  UpdateProfileDto,
  ChangePasswordDto,
} from "./auth.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictThrottleGuard } from "../../common/throttle.guard";

@ApiTags("认证")
@Controller("auth")
export class AuthController {
  constructor(
    private auth: AuthService,
    private wechat: WechatService,
    private systemService: SystemService,
  ) {}

  @Post("register/phone")
  @ApiOperation({ summary: "手机号注册", description: "使用手机号和密码注册新用户" })
  @UseGuards(StrictThrottleGuard)
  async phoneRegister(@Body() dto: PhoneRegisterDto, @Req() req: any) {
    const result = await this.auth.phoneRegister(dto);
    this.systemService.logAudit({
      userId: result.user.id,
      action: "CREATE",
      targetType: "USER",
      targetId: result.user.id,
      detail: `手机号注册: ${dto.phone}`,
      ip: req.ip,
    }).catch(() => {});
    return result;
  }

  @Post("login/phone")
  @ApiOperation({ summary: "手机号登录", description: "使用手机号和密码登录" })
  @UseGuards(StrictThrottleGuard)
  async phoneLogin(@Body() dto: PhoneLoginDto, @Req() req: any) {
    try {
      const result = await this.auth.phoneLogin(dto);
      this.systemService.logAudit({
        userId: result.user.id,
        action: "LOGIN",
        detail: `手机号登录`,
        ip: req.ip,
      }).catch(() => {});
      return result;
    } catch (err) {
      this.systemService.logAudit({
        action: "LOGIN_FAILED",
        targetType: "PHONE",
        targetId: dto.phone,
        detail: `登录失败: ${dto.phone}`,
        ip: req.ip,
      }).catch(() => {});
      throw err;
    }
  }

  @Post("login/sms")
  @ApiOperation({ summary: "短信验证码登录", description: "使用手机号和短信验证码登录" })
  @UseGuards(StrictThrottleGuard)
  async smsLogin(@Body() dto: SmsLoginDto, @Req() req: any) {
    try {
      const result = await this.auth.smsLogin(dto);
      this.systemService.logAudit({
        userId: result.user.id,
        action: "LOGIN",
        detail: `短信验证码登录`,
        ip: req.ip,
      }).catch(() => {});
      return result;
    } catch (err) {
      this.systemService.logAudit({
        action: "LOGIN_FAILED",
        targetType: "PHONE",
        targetId: dto.phone,
        detail: `短信登录失败: ${dto.phone}`,
        ip: req.ip,
      }).catch(() => {});
      throw err;
    }
  }

  @Post("sms/send")
  @ApiOperation({ summary: "发送短信验证码", description: "向指定手机号发送验证码" })
  @UseGuards(StrictThrottleGuard)
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendSmsCode(dto);
  }

  @Get("wechat/oauth-url")
  @ApiOperation({ summary: "获取微信 OAuth 授权 URL", description: "H5 微信登录：前端跳转到该 URL 完成授权后回调" })
  @ApiQuery({ name: "redirectUri", description: "授权后回调地址", example: "https://example.com/callback" })
  @ApiQuery({ name: "scope", description: "授权范围", example: "snsapi_userinfo", required: false })
  getWechatOAuthUrl(
    @Query("redirectUri") redirectUri: string,
    @Query("scope") scope?: string,
  ) {
    if (!redirectUri) throw new BadRequestException("redirectUri 参数必填");
    const url = this.wechat.buildOAuthUrl(redirectUri, (scope as any) || "snsapi_userinfo");
    return { url };
  }

  @Post("login/wechat")
  @ApiOperation({ summary: "微信登录（H5/小程序）", description: "使用微信授权 code 登录，自动判断 H5 OAuth 或小程序" })
  @UseGuards(StrictThrottleGuard)
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.auth.wechatLogin(dto);
  }

  @Get("me")
  @ApiOperation({ summary: "获取当前用户信息", description: "获取已登录用户的个人信息（需 JWT）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    return this.auth.getProfile(req.user.id);
  }

  @Put("profile")
  @ApiOperation({ summary: "更新用户信息", description: "更新已登录用户的个人资料（需 JWT）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.id, dto);
  }

  @Put("password")
  @ApiOperation({ summary: "修改密码", description: "修改当前用户的登录密码（需 JWT）" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto);
  }
}
