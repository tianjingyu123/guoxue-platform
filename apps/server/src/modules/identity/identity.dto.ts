import { IsString, IsOptional, IsEnum, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IdCardOcrDto {
  @ApiPropertyOptional({ description: "身份证图片URL" })
  @IsOptional() @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "身份证图片Base64" })
  @IsOptional() @IsString()
  imageBase64?: string;

  @ApiProperty({ description: "身份证面", enum: ["FRONT", "BACK"] })
  @IsEnum(["FRONT", "BACK"])
  side: "FRONT" | "BACK";
}

export class IdCardVerifyDto {
  @ApiProperty({ description: "真实姓名", example: "张三" })
  @IsString()
  name: string;

  @ApiProperty({ description: "身份证号码", example: "110101199001011234" })
  @IsString()
  idCard: string;
}

export class FaceTokenDto {
  @ApiProperty({ description: "真实姓名" })
  @IsString()
  name: string;

  @ApiProperty({ description: "身份证号码" })
  @IsString()
  idCard: string;

  @ApiPropertyOptional({ description: "鉴权完成跳转URL" })
  @IsOptional() @IsString()
  returnUrl?: string;
}

// ───────── 审核 ─────────

export class AuditIdentityDto {
  @ApiProperty({ description: "认证记录ID" })
  @IsString()
  id: string;

  @ApiPropertyOptional({ description: "审核备注" })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class IdentityAuditQueryDto {
  @ApiPropertyOptional({ description: "审核状态" })
  @IsOptional()
  @IsString()
  @IsIn(["PENDING", "APPROVED", "REJECTED"])
  status?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;
}
