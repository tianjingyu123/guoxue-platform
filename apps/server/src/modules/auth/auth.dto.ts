import { IsString, IsOptional, IsInt, MinLength, MaxLength, Matches } from "class-validator";
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

export class WechatLoginDto {
  @ApiProperty({ description: "微信授权 code", example: "081xxx" })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiPropertyOptional({ description: "登录类型：h5 或 miniprogram", example: "h5", default: "h5" })
  @IsString()
  @IsOptional()
  loginType?: string;

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
  @IsString()
  @MinLength(1)
  oldPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: "新密码需包含大小写字母和数字，至少8位" })
  newPassword: string;
}
