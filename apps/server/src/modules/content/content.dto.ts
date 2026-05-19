import { IsString, IsOptional, IsArray, IsEnum, IsInt, Min, MinLength, MaxLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export enum ContentType {
  ARTICLE = "ARTICLE",
  POEM = "POEM",
  CLASSIC = "CLASSIC",
}

export class CreateContentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  dynasty?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  stationId?: string;
}

export class UpdateContentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  dynasty?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  auditReason?: string;
}

export class ContentListQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: "内容类型", enum: ContentType })
  @IsOptional() @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({ description: "搜索关键词" })
  @IsOptional() @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "状态筛选" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "分站ID" })
  @IsOptional() @IsString()
  stationId?: string;
}
