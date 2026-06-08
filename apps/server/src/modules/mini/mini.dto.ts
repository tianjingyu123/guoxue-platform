import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, Min, Max, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class MiniHomeQueryDto {
  @ApiPropertyOptional({ description: "分站ID", example: "station-1" })
  @IsString()
  @IsOptional()
  stationId?: string;

  @ApiPropertyOptional({ description: "内容类型筛选", example: "ARTICLE" })
  @IsString()
  @IsOptional()
  contentType?: string;
}

export class MiniContentQueryDto {
  @ApiPropertyOptional({ description: "分站ID" })
  @IsString()
  @IsOptional()
  stationId?: string;

  @ApiPropertyOptional({ description: "内容类型", example: "ARTICLE" })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: "页码", default: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({ description: "每页条数", default: 10, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  pageSize: number = 10;
}

export class CreateMiniAppDto {
  @ApiProperty({ description: "小程序AppId" })
  @IsString() @MinLength(1)
  appId: string;

  @ApiProperty({ description: "小程序名称" })
  @IsString() @MinLength(1)
  appName: string;

  @ApiPropertyOptional({ description: "类型" })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "域名" })
  @IsOptional() @IsString()
  domain?: string;

  @ApiPropertyOptional({ description: "H5域名" })
  @IsOptional() @IsString()
  h5Domain?: string;

  @ApiPropertyOptional({ description: "路径映射" })
  @IsOptional()
  pathMappings?: Record<string, string>;
}

export class MiniShareQueryDto {
  @ApiProperty({ description: "分享目标类型", example: "CONTENT" })
  @IsString()
  @MinLength(1)
  targetType: string;

  @ApiProperty({ description: "分享目标ID" })
  @IsString()
  @MinLength(1)
  targetId: string;

  @ApiPropertyOptional({ description: "分站ID" })
  @IsString()
  @IsOptional()
  stationId?: string;
}
