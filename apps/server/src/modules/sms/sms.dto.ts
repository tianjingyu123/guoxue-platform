import { IsString, IsOptional, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SendSmsDto {
  @ApiProperty({ description: "手机号", example: "13800000000" })
  @IsString()
  @MinLength(1)
  phone: string;

  @ApiPropertyOptional({ description: "业务场景标识", example: "login" })
  @IsOptional() @IsString()
  scene?: string;
}

export class VerifySmsDto {
  @ApiProperty({ description: "手机号", example: "13800000000" })
  @IsString()
  @MinLength(1)
  phone: string;

  @ApiProperty({ description: "短信验证码", example: "123456" })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiPropertyOptional({ description: "业务场景标识" })
  @IsOptional() @IsString()
  scene?: string;
}
