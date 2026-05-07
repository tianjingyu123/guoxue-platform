import { Controller, Post, Get, Put, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
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

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register/phone")
  @ApiOperation({ summary: "手机号注册", description: "使用手机号和密码注册新用户" })
  @UseGuards(StrictThrottleGuard)
  phoneRegister(@Body() dto: PhoneRegisterDto) {
    return this.auth.phoneRegister(dto);
  }

  @Post("login/phone")
  @ApiOperation({ summary: "手机号登录", description: "使用手机号和密码登录" })
  @UseGuards(StrictThrottleGuard)
  phoneLogin(@Body() dto: PhoneLoginDto) {
    return this.auth.phoneLogin(dto);
  }

  @Post("login/sms")
  @ApiOperation({ summary: "短信验证码登录", description: "使用手机号和短信验证码登录" })
  @UseGuards(StrictThrottleGuard)
  smsLogin(@Body() dto: SmsLoginDto) {
    return this.auth.smsLogin(dto);
  }

  @Post("sms/send")
  @ApiOperation({ summary: "发送短信验证码", description: "向指定手机号发送验证码" })
  @UseGuards(StrictThrottleGuard)
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendSmsCode(dto);
  }

  @Post("login/wechat")
  @ApiOperation({ summary: "微信登录", description: "使用微信授权码登录" })
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
