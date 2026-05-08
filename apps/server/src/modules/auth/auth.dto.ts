import { IsString, IsOptional, MinLength, MaxLength, IsPhoneNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PhoneRegisterDto {
  @ApiProperty({ description: "用户昵称", example: "张三" })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;

  @ApiProperty({ description: "手机号", example: "13800138000" })
  @IsString()
  phone: string;

  @ApiProperty({ description: "密码，至少6位", example: "123456" })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password: string;

  @ApiPropertyOptional({ description: "推荐码（可选）", example: "ABC123" })
  @IsString()
  @IsOptional()
  referrerCode?: string;
}

export class PhoneLoginDto {
  @ApiProperty({ description: "手机号", example: "13800138000" })
  @IsString()
  phone: string;

  @ApiProperty({ description: "密码", example: "123456" })
  @IsString()
  password: string;
}

export class SmsLoginDto {
  @IsString()
  phone: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  referrerCode?: string;
}

export class SendCodeDto {
  @IsString()
  phone: string;
}

export class WechatLoginDto {
  @ApiProperty({ description: "微信授权 code", example: "081xxx" })
  @IsString()
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

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(20)
  nickname?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsOptional()
  gender?: number;

  @IsString()
  @IsOptional()
  birthday?: string;
}

export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
