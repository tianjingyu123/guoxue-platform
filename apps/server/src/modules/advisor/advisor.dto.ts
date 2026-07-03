import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const ADVISOR_ROLE_TYPES = [
  "CIRCLE_OWNER",
  "LECTURER",
  "STATION_MASTER",
  "OPERATOR",
  "STATION_OFFLINE_OWNER",
] as const;

export const ADVISOR_SEVERITIES = ["INFO", "WARN", "CRITICAL"] as const;

/**
 * 智能顾问规则管理 DTO（C7 后台规则管理）
 * metric 是否为合法探针（AdvisorService PROBES key）在服务层校验。
 */
export class CreateAdvisorRuleDto {
  @ApiProperty({ description: "适用角色", enum: ADVISOR_ROLE_TYPES })
  @IsString()
  @IsIn([...ADVISOR_ROLE_TYPES])
  roleType: string;

  @ApiProperty({ description: "规则唯一键（如 station_earning_wow_drop）" })
  @IsString()
  @MinLength(1)
  ruleKey: string;

  @ApiProperty({ description: "探针名（须为 AdvisorService PROBES 支持的 key）" })
  @IsString()
  @MinLength(1)
  metric: string;

  @ApiProperty({ description: "探针参数对象，如 { thresholdPct: 30, days: 7 }", type: "object", additionalProperties: true })
  @IsObject()
  condition: Record<string, unknown>;

  @ApiPropertyOptional({ description: "严重程度", enum: ADVISOR_SEVERITIES, default: "INFO" })
  @IsOptional()
  @IsString()
  @IsIn([...ADVISOR_SEVERITIES])
  severity?: string;

  @ApiProperty({ description: "建议模板文案（{{占位符}} 用探针 facts 渲染）" })
  @IsString()
  @MinLength(1)
  suggestion: string;

  @ApiPropertyOptional({
    description: "动作数组 [{ label, type: 'NAVIGATE', target }]",
    type: "array",
    items: { type: "object" },
  })
  @IsOptional()
  @IsArray()
  actions?: unknown[];

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** 更新 DTO：禁止改 ruleKey（不收该字段，forbidNonWhitelisted 收到即 400）与 roleType（主体解析键） */
export class UpdateAdvisorRuleDto {
  @ApiPropertyOptional({ description: "探针名（须为 AdvisorService PROBES 支持的 key）" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  metric?: string;

  @ApiPropertyOptional({ description: "探针参数对象", type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "严重程度", enum: ADVISOR_SEVERITIES })
  @IsOptional()
  @IsString()
  @IsIn([...ADVISOR_SEVERITIES])
  severity?: string;

  @ApiPropertyOptional({ description: "建议模板文案" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  suggestion?: string;

  @ApiPropertyOptional({
    description: "动作数组 [{ label, type, target }]",
    type: "array",
    items: { type: "object" },
  })
  @IsOptional()
  @IsArray()
  actions?: unknown[];

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
