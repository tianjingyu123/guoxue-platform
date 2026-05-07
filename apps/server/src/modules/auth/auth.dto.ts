import { IsString, IsOptional, MinLength, MaxLength, IsPhoneNumber } from "class-validator";

export class PhoneRegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password: string;

  @IsString()
  @IsOptional()
  referrerCode?: string;
}

export class PhoneLoginDto {
  @IsString()
  phone: string;

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
  @IsString()
  code: string;

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
