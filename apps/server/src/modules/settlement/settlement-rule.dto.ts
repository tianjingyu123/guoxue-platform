import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 分佣结算规则管理 DTO（C7 后台规则管理）
 * splits 为 Json 嵌套结构（role/rate/basis/category/parentRole），
 * 深度校验在 SettlementRuleAdminService 服务层强校验（资金安全，不依赖 DTO 浅校验）。
 */
export class CreateSettlementRuleDto {
  @ApiProperty({ description: "结算场景（引擎唯一查找键，如 QUESTION / LIVE_GIFT / COURSE_ORDER）" })
  @IsString()
  @MinLength(1)
  scene: string;

  @ApiProperty({
    description: "分账规则数组 [{ role, rate, basis: GROSS|PARENT_SPLIT, category: COMMISSION|SERVICE|PLATFORM, parentRole? }]",
    type: "array",
    items: { type: "object" },
  })
  @IsArray()
  splits: unknown[];

  @ApiPropertyOptional({ description: "结算缓冲期天数（0-90，0=实时可提）", minimum: 0, maximum: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  bufferDays?: number;

  @ApiPropertyOptional({ description: "大额人工复核开关" })
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional({ description: "单笔收益冻结复核阈值（元，≥0）", minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvalThreshold?: number;

  @ApiPropertyOptional({ description: "是否启用（规则只停用不删除）" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  remark?: string;
}

/** 更新 DTO：禁止改 scene（引擎查找键）—— 不收该字段，全局 forbidNonWhitelisted 收到即 400；服务层另有防御性拒绝 */
export class UpdateSettlementRuleDto {
  @ApiPropertyOptional({
    description: "分账规则数组 [{ role, rate, basis, category, parentRole? }]",
    type: "array",
    items: { type: "object" },
  })
  @IsOptional()
  @IsArray()
  splits?: unknown[];

  @ApiPropertyOptional({ description: "结算缓冲期天数（0-90）", minimum: 0, maximum: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  bufferDays?: number;

  @ApiPropertyOptional({ description: "大额人工复核开关" })
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional({ description: "单笔收益冻结复核阈值（元，≥0）", minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvalThreshold?: number;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  remark?: string;
}
