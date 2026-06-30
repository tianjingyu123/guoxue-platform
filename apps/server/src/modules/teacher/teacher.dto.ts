import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsArray, IsIn, MinLength } from "class-validator";

export class ApplyCertificationDto {
  @ApiProperty({ description: "讲师署名（资历展示用，非证件信息；身份核验复用平台实名认证）" })
  @IsString()
  @MinLength(2)
  realName: string;

  @ApiPropertyOptional({ description: "申请头衔/职称" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "教学背景/资历简介" })
  @IsOptional()
  @IsString()
  intro?: string;

  @ApiPropertyOptional({ description: "资质证明材料图片URL", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  credentials?: string[];
}

export class ReviewCertificationDto {
  @ApiProperty({ description: "审核动作", enum: ["APPROVE", "REJECT"] })
  @IsIn(["APPROVE", "REJECT"])
  action: "APPROVE" | "REJECT";

  @ApiPropertyOptional({ description: "认证头衔（通过时授予）" })
  @IsOptional()
  @IsString()
  verifiedTitle?: string;

  @ApiPropertyOptional({ description: "驳回原因（驳回时必填）" })
  @IsOptional()
  @IsString()
  rejectReason?: string;
}
