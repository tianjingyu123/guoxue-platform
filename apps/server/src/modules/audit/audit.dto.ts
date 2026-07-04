import { IsString, IsDateString, IsOptional, IsInt, IsArray, ArrayNotEmpty, MinLength, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuditListQueryDto {
  @ApiPropertyOptional({ description: "用户ID" })
  @IsOptional() @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "操作类型" })
  @IsOptional() @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "目标类型" })
  @IsOptional() @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: "目标ID" })
  @IsOptional() @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({ description: "开始日期" })
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional() @IsDateString()
  endDate?: string;
}

export class ModerateImageDto {
  @IsOptional() @IsString()
  imageUrl?: string;

  @IsOptional() @IsString()
  imageBase64?: string;

  @IsOptional() @IsString()
  bizType?: string;
}

export class ModerateTextDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional() @IsString()
  bizType?: string;

  @IsOptional() @IsString()
  dataId?: string;
}

export class AddSensitiveWordDto {
  @ApiProperty({ description: "敏感词" })
  @IsString()
  @MinLength(1)
  word: string;

  @ApiPropertyOptional({ description: "分类", enum: ["GENERAL", "COMPLIANCE_A", "COMPLIANCE_B"], default: "GENERAL" })
  @IsOptional() @IsIn(["GENERAL", "COMPLIANCE_A", "COMPLIANCE_B"])
  category?: "GENERAL" | "COMPLIANCE_A" | "COMPLIANCE_B";

  @ApiPropertyOptional({ description: "B 级替换建议" })
  @IsOptional() @IsString()
  replacement?: string;

  @ApiPropertyOptional({ description: "备注（豁免边界说明等）" })
  @IsOptional() @IsString()
  remark?: string;
}

export class AddSensitiveWordsDto {
  @ApiProperty({ description: "敏感词数组", type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  words: string[];

  @ApiPropertyOptional({ description: "分类", enum: ["GENERAL", "COMPLIANCE_A", "COMPLIANCE_B"], default: "GENERAL" })
  @IsOptional() @IsIn(["GENERAL", "COMPLIANCE_A", "COMPLIANCE_B"])
  category?: "GENERAL" | "COMPLIANCE_A" | "COMPLIANCE_B";
}

export class ComplianceScanQueryDto {
  @ApiPropertyOptional({ description: "级别 A/B" })
  @IsOptional() @IsIn(["A", "B"])
  level?: string;

  @ApiPropertyOptional({ description: "状态 OPEN/RESOLVED/IGNORED" })
  @IsOptional() @IsIn(["OPEN", "RESOLVED", "IGNORED"])
  status?: string;

  @ApiPropertyOptional({ description: "内容域类型" })
  @IsOptional() @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: "命中词（模糊）" })
  @IsOptional() @IsString()
  word?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;
}

export class ComplianceScanStatusDto {
  @ApiProperty({ description: "处置状态", enum: ["RESOLVED", "IGNORED", "OPEN"] })
  @IsIn(["RESOLVED", "IGNORED", "OPEN"])
  status: "RESOLVED" | "IGNORED" | "OPEN";
}

export class CheckSensitiveDto {
  @ApiProperty({ description: "待检测文本" })
  @IsString()
  @MinLength(1)
  text: string;
}

export class OperationLogListQueryDto {
  @ApiPropertyOptional({ description: "用户ID" })
  @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional({ description: "操作类型" })
  @IsOptional() @IsString() action?: string;
  @ApiPropertyOptional({ description: "目标类型" })
  @IsOptional() @IsString() targetType?: string;
  @ApiPropertyOptional({ description: "目标ID" })
  @IsOptional() @IsString() targetId?: string;
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
  @ApiPropertyOptional({ description: "开始日期" })
  @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional() @IsDateString() endDate?: string;
}
