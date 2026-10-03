import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsIn, IsInt, Min, Max, MinLength, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateChurnRuleDto {
  @ApiProperty({ description: "规则名称" })
  @IsString() @MinLength(1) @MaxLength(80) name: string;

  @ApiProperty({ description: "风险等级 LOW/MEDIUM/HIGH/CRITICAL" })
  @IsString() @IsIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]) riskLevel: string;

  @ApiPropertyOptional({ description: "分数阈值" })
  @IsOptional() @IsNumber() @Min(0) @Max(100) scoreThreshold?: number;

  @ApiPropertyOptional({ description: "天数阈值" })
  @IsOptional() @IsInt() @Min(1) @Max(365) daysThreshold?: number;

  @ApiProperty({ description: "动作类型 COUPON/SMS" })
  @IsString() @IsIn(["COUPON", "SMS"]) actionType: string;

  @ApiProperty({ description: "动作配置" })
  @IsObject() actionConfig: Record<string, unknown>;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateChurnRuleDto {
  @ApiPropertyOptional({ description: "规则名称" })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;

  @ApiPropertyOptional({ description: "风险等级" })
  @IsOptional() @IsString() @IsIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]) riskLevel?: string;

  @ApiPropertyOptional({ description: "分数阈值" })
  @IsOptional() @IsNumber() @Min(0) @Max(100) scoreThreshold?: number;

  @ApiPropertyOptional({ description: "天数阈值" })
  @IsOptional() @IsInt() @Min(1) @Max(365) daysThreshold?: number;

  @ApiPropertyOptional({ description: "动作类型" })
  @IsOptional() @IsString() @IsIn(["COUPON", "SMS"]) actionType?: string;

  @ApiPropertyOptional({ description: "动作配置" })
  @IsOptional() @IsObject() actionConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional() @IsBoolean() isActive?: boolean;
}
