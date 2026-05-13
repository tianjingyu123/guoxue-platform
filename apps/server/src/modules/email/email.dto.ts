import { MinLength,  IsString, IsOptional, Validate } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";

@ValidatorConstraint({ name: "stringOrStringArray", async: false })
export class IsStringOrStringArray implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments) {
    if (typeof value === "string") return value.length > 0;
    if (Array.isArray(value)) return value.length > 0 && value.every((v) => typeof v === "string");
    return false;
  }
  defaultMessage(_args: ValidationArguments) {
    return "to 必须为字符串或字符串数组";
  }
}

export class SendEmailDto {
  @ApiProperty({ description: "收件人，支持单个或多个", example: "user@example.com" })
  @Validate(IsStringOrStringArray)
  to: string | string[];

  @ApiProperty({ description: "邮件主题", example: "国学平台通知" })
  @IsString()
  @MinLength(1)
  subject: string;

  @ApiPropertyOptional({ description: "HTML正文" })
  @IsOptional() @IsString()
  html?: string;

  @ApiPropertyOptional({ description: "纯文本正文" })
  @IsOptional() @IsString()
  text?: string;
}

export class SendVerifyCodeDto {
  @ApiProperty({ description: "接收验证码的邮箱", example: "user@example.com" })
  @IsString()
  @MinLength(1)
  email: string;
}

export class TestEmailDto {
  @ApiProperty({ description: "测试收件人邮箱", example: "admin@example.com" })
  @IsString()
  @MinLength(1)
  to: string;
}
