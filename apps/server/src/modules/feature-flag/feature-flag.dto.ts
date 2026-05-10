import { IsString, IsOptional, IsBoolean, IsInt, IsArray, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpsertFeatureFlagDto {
  @ApiPropertyOptional({ description: "名称" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "描述" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: "灰度百分比 0-100" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({ description: "白名单用户ID列表" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetUserIds?: string[];
}
