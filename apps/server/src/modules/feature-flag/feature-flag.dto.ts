import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const FEATURE_FLAG_KEY_PATTERN = /^[a-z][a-z0-9._-]{1,63}$/;

export class UpsertFeatureFlagDto {
  @ApiPropertyOptional({ description: "名称" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ description: "描述" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  @ArrayMaxSize(500)
  @IsString({ each: true })
  targetUserIds?: string[];
}

export class CreateFeatureFlagDto extends UpsertFeatureFlagDto {
  @ApiProperty({ description: "开关标识键；客户端可见开关使用 client_ 前缀" })
  @IsString()
  @Matches(FEATURE_FLAG_KEY_PATTERN, {
    message: "key 必须以小写字母开头，且只能包含小写字母、数字、点、下划线或短横线，长度 2-64",
  })
  key: string;
}
