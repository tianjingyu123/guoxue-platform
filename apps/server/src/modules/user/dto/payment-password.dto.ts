import { IsString, MinLength, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SetPaymentPasswordDto {
  @ApiProperty({ description: "6位数字支付密码" })
  @IsString() @Matches(/^\d{6}$/)
  password: string;

  @ApiProperty({ description: "短信验证码" })
  @IsString() @MinLength(4)
  smsCode: string;
}

export class UpdatePaymentPasswordDto {
  @ApiProperty({ description: "旧支付密码" })
  @IsString() @Matches(/^\d{6}$/)
  oldPassword: string;

  @ApiProperty({ description: "新6位数字支付密码" })
  @IsString() @Matches(/^\d{6}$/)
  newPassword: string;
}

export class VerifyPaymentPasswordDto {
  @ApiProperty({ description: "6位数字支付密码" })
  @IsString() @Matches(/^\d{6}$/)
  password: string;
}

export class ResetPaymentPasswordDto {
  @ApiProperty({ description: "新6位数字支付密码" })
  @IsString() @Matches(/^\d{6}$/)
  newPassword: string;

  @ApiProperty({ description: "短信验证码" })
  @IsString() @MinLength(4)
  smsCode: string;
}
