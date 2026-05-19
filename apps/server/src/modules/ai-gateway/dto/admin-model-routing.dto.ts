import { IsString, IsOptional, IsNumber, IsObject, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GrayReleaseDto {
  @ApiProperty({ description: "灰度新模型名称" })
  @IsString()
  newModel: string;

  @ApiProperty({ description: "灰度比例 0-100" })
  @Type(() => Number) @IsInt() @Min(0) @Max(100)
  percentage: number;
}

export class BudgetControlDto {
  @ApiProperty({ description: "月度Token上限" })
  @Type(() => Number) @IsInt()
  monthlyTokenLimit: number;

  @ApiProperty({ description: "超预算降级模型" })
  @IsString()
  lightModel: string;
}

export class SceneRoutingDto {
  @ApiProperty({ description: "主模型" })
  @IsString()
  model: string;

  @ApiPropertyOptional({ description: "降级模型" })
  @IsOptional() @IsString()
  fallbackModel?: string;

  @ApiPropertyOptional({ description: "温度 0-2", default: 0.3 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: "最大Token数", default: 2048 })
  @IsOptional() @Type(() => Number) @IsInt()
  maxTokens?: number;

  @ApiPropertyOptional({ description: "TopP 0-1", default: 0.9 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1)
  topP?: number;

  @ApiPropertyOptional({ description: "灰度发布配置" })
  @IsOptional() @Type(() => GrayReleaseDto)
  grayRelease?: GrayReleaseDto;

  @ApiPropertyOptional({ description: "预算控制配置" })
  @IsOptional() @Type(() => BudgetControlDto)
  budgetControl?: BudgetControlDto;
}

export class UpdateRoutingConfigDto {
  @ApiProperty({ description: "默认路由配置" })
  @Type(() => SceneRoutingDto)
  default: SceneRoutingDto;

  @ApiPropertyOptional({ description: "各场景配置" })
  @IsOptional() @IsObject()
  scenes?: Record<string, SceneRoutingDto>;
}

export class UpdateSceneRoutingDto {
  @ApiProperty({ description: "主模型" })
  @IsString()
  model: string;

  @ApiPropertyOptional({ description: "降级模型" })
  @IsOptional() @IsString()
  fallbackModel?: string;

  @ApiPropertyOptional({ description: "温度" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: "最大Token数" })
  @IsOptional() @Type(() => Number) @IsInt()
  maxTokens?: number;

  @ApiPropertyOptional({ description: "TopP" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1)
  topP?: number;

  @ApiPropertyOptional({ description: "灰度发布配置" })
  @IsOptional() @Type(() => GrayReleaseDto)
  grayRelease?: GrayReleaseDto;

  @ApiPropertyOptional({ description: "预算控制配置" })
  @IsOptional() @Type(() => BudgetControlDto)
  budgetControl?: BudgetControlDto;
}
