import { IsString, IsOptional, IsInt, IsIn, MinLength, MaxLength, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PhoneRegisterDto {
  @ApiProperty({ description: "用户昵称", example: "张三" })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;

  @ApiProperty({ description: "手机号", example: "13800138000" })
  @IsString()
  @MinLength(1)
  phone: string;

  @ApiProperty({ description: "注册短信验证码", example: "123456" })
  @IsString()
  @Matches(/^\d{6}$/, { message: "验证码必须为 6 位数字" })
  code: string;

  @ApiProperty({ description: "密码，至少8位，需包含大小写字母和数字", example: "Abc12345" })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: "密码需包含大小写字母和数字，至少8位" })
  password: string;

  @ApiPropertyOptional({ description: "推荐码（可选）", example: "ABC123" })
  @IsString()
  @IsOptional()
  referrerCode?: string;
}

export class PhoneLoginDto {
  @ApiProperty({ description: "手机号", example: "13800138000" })
  @IsString()
  @MinLength(1)
  phone: string;

  @ApiProperty({ description: "密码", example: "123456" })
  @IsString()
  @MinLength(1)
  password: string;
}

export class SmsLoginDto {
  @IsString()
  @MinLength(1)
  phone: string;

  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @IsOptional()
  referrerCode?: string;
}

export class SendCodeDto {
  @IsString()
  @MinLength(1)
  phone: string;

  @IsOptional()
  @IsString()
  scene?: string;
}

export class OaOpenidDto {
  @ApiProperty({ description: "公众号网页授权 code", example: "081xxx" })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiPropertyOptional({ description: "微信登录客户端标识；多公众号/网站应用时必填" })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  clientKey?: string;
}

export class WechatLoginDto {
  @ApiProperty({ description: "微信授权 code", example: "081xxx" })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiPropertyOptional({ description: "登录类型：h5、miniprogram 或 app", example: "h5", default: "h5" })
  @IsString()
  @IsOptional()
  @IsIn(["h5", "miniprogram", "app"])
  loginType?: string;

  @ApiPropertyOptional({ description: "微信登录客户端标识；配置多个同类型应用时必填，也可传公开 appId" })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_.:-]+$/)
  clientKey?: string;

  @ApiPropertyOptional({ description: "用户昵称（新用户注册时使用）", example: "张三" })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: "头像URL（新用户注册时使用）" })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ description: "推荐码（可选）", example: "ABC123" })
  @IsString()
  @IsOptional()
  referrerCode?: string;
}

export class MiniPhoneLoginDto {
  @ApiProperty({ description: "wx.login 返回的 code", example: "081xxx" })
  @IsString()
  @MinLength(1)
  wxCode: string;

  @ApiProperty({ description: "getPhoneNumber 返回的 code（新API）或加密数据", example: "xxx" })
  @IsString()
  @MinLength(1)
  phoneCode: string;

  @ApiPropertyOptional({ description: "加密数据iv（旧版getPhoneNumber需要）" })
  @IsString()
  @IsOptional()
  iv?: string;

  @ApiPropertyOptional({ description: "推荐码（可选）", example: "ABC123" })
  @IsString()
  @IsOptional()
  referrerCode?: string;

  @ApiPropertyOptional({ description: "小程序客户端标识；多小程序时必填，也可传公开 appId" })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_.:-]+$/)
  clientKey?: string;
}

export class BindWechatDto {
  @ApiProperty({ description: "微信授权 code" })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiPropertyOptional({ description: "登录类型：h5、miniprogram 或 app", default: "h5" })
  @IsString()
  @IsOptional()
  @IsIn(["h5", "miniprogram", "app"])
  loginType?: string;

  @ApiPropertyOptional({ description: "微信登录客户端标识，也可传公开 appId" })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_.:-]+$/)
  clientKey?: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(20)
  nickname?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsOptional() @IsInt()
  gender?: number;

  @IsString()
  @IsOptional()
  birthday?: string;
}

export class ChangePasswordDto {
  // 首次设置密码（验证码/微信登录用户无旧密码）时可不传；已有密码时后端强制校验
  @IsString()
  @IsOptional()
  oldPassword?: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: "新密码需包含大小写字母和数字，至少8位" })
  newPassword: string;
}

export class DeleteAccountDto {
  @ApiProperty({ description: "当前密码验证" })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiPropertyOptional({ description: "注销原因" })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RegisterDeviceDto {
  @IsOptional() @IsString()
  deviceName?: string;

  @IsOptional() @IsString()
  deviceType?: string;
}

export class BindPhoneDto {
  @IsString()
  @MinLength(1)
  phone: string;

  @IsString()
  @MinLength(1)
  code: string;
}

export class ChangePhoneDto {
  @ApiProperty({ description: "旧手机号验证码" })
  @IsString()
  @MinLength(4)
  oldCode: string;

  @ApiProperty({ description: "新手机号" })
  @IsString()
  @MinLength(1)
  newPhone: string;

  @ApiProperty({ description: "新手机号验证码" })
  @IsString()
  @MinLength(4)
  newCode: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: "手机号", example: "13800138000" })
  @IsString()
  @MinLength(1)
  phone: string;

  @ApiProperty({ description: "短信验证码" })
  @IsString()
  @MinLength(4)
  code: string;

  @ApiProperty({ description: "新密码，至少8位，需包含大小写字母和数字", example: "Abc12345" })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: "密码需包含大小写字母和数字，至少8位" })
  password: string;
}
