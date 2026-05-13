import { IsString, IsInt, IsOptional, IsObject, Min, Max, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** A/B 实验状态 */
export enum AbTestStatus {
  DRAFT = "DRAFT",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
}

/** 策略权重覆写 */
export interface StrategyWeightOverride {
  /** 策略名 */
  strategy: string;
  /** 覆写后的权重（0=禁用该策略） */
  weight: number;
}

/** A/B 实验配置 */
export interface AbTestConfig {
  id: string;
  name: string;
  description: string;
  /** 实验组流量占比（0-100） */
  experimentTraffic: number;
  /** 对照组策略覆写（通常为空，即默认配置） */
  controlOverrides: StrategyWeightOverride[];
  /** 实验组策略覆写 */
  experimentOverrides: StrategyWeightOverride[];
  status: AbTestStatus;
  startAt: string;
  endAt: string;
  createdBy: string;
}

export class CreateAbTestDto {
  @ApiProperty({ description: "实验名称" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: "实验描述" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "实验组流量占比（0-100）", default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  experimentTraffic?: number = 50;

  @ApiPropertyOptional({ description: "实验组策略覆写" })
  @IsOptional()
  @IsObject({ each: true })
  experimentOverrides?: StrategyWeightOverride[];

  @ApiPropertyOptional({ description: "对照组策略覆写" })
  @IsOptional()
  @IsObject({ each: true })
  controlOverrides?: StrategyWeightOverride[];
}

export class UpdateAbTestDto {
  @ApiPropertyOptional({ description: "实验名称" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "实验描述" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "实验组流量占比" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  experimentTraffic?: number;

  @ApiPropertyOptional({ description: "实验状态" })
  @IsOptional()
  @IsString()
  status?: AbTestStatus;

  @ApiPropertyOptional({ description: "实验组策略覆写" })
  @IsOptional()
  @IsObject({ each: true })
  experimentOverrides?: StrategyWeightOverride[];

  @ApiPropertyOptional({ description: "对照组策略覆写" })
  @IsOptional()
  @IsObject({ each: true })
  controlOverrides?: StrategyWeightOverride[];
}

/** A/B 实验效果指标 */
export interface AbTestMetrics {
  experimentId: string;
  /** 对照组曝光/点击数 */
  control: { impressions: number; clicks: number; ctr: number };
  /** 实验组曝光/点击数 */
  experiment: { impressions: number; clicks: number; ctr: number };
  /** CTR 提升（百分点） */
  lift: number;
  /** 是否有统计显著性（简化：样本>100 且 lift>1%） */
  significant: boolean;
}

/** 用户分桶结果 */
export interface AbTestAssignment {
  experimentId: string;
  group: "control" | "experiment";
  bucket: number;
}
