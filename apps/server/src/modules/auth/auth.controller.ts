import { Controller, Post, Get, Put, Body, UseGuards, Req } from "@nestjs/common";
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

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register/phone")
  @UseGuards(StrictThrottleGuard)
  phoneRegister(@Body() dto: PhoneRegisterDto) {
    return this.auth.phoneRegister(dto);
  }

  @Post("login/phone")
  @UseGuards(StrictThrottleGuard)
  phoneLogin(@Body() dto: PhoneLoginDto) {
    return this.auth.phoneLogin(dto);
  }

  @Post("login/sms")
  @UseGuards(StrictThrottleGuard)
  smsLogin(@Body() dto: SmsLoginDto) {
    return this.auth.smsLogin(dto);
  }

  @Post("sms/send")
  @UseGuards(StrictThrottleGuard)
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendSmsCode(dto);
  }

  @Post("login/wechat")
  @UseGuards(StrictThrottleGuard)
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.auth.wechatLogin(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    return this.auth.getProfile(req.user.id);
  }

  @Put("profile")
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.id, dto);
  }

  @Put("password")
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto);
  }
}
