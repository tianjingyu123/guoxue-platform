import { IsString, IsInt, IsOptional, IsNumber, IsArray, ValidateNested, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BundleType, BundleTarget } from "@prisma/client";

export class CreateBundleItemDto {
  @ApiProperty({ description: "项目类型 COURSE/PRODUCT/EBOOK" })
  @IsString()
  itemType: string;

  @ApiProperty({ description: "项目ID" })
  @IsString()
  itemId: string;

  @ApiPropertyOptional({ description: "排序" })
  @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

export class CreateBundleDto {
  @ApiProperty({ description: "组合包名称" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "简介" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ enum: BundleType, description: "类型" })
  @IsOptional() @IsString()
  type?: BundleType;

  @ApiPropertyOptional({ enum: BundleTarget, description: "目标人群" })
  @IsOptional() @IsString()
  target?: BundleTarget;

  @ApiPropertyOptional({ description: "原价" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  originalPrice?: number;

  @ApiPropertyOptional({ description: "售价" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  sellPrice?: number;

  @ApiPropertyOptional({ description: "排序" })
  @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "组合项列表" })
  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBundleItemDto)
  items?: CreateBundleItemDto[];
}

export class UpdateBundleDto {
  @ApiPropertyOptional({ description: "组合包名称" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "简介" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ enum: BundleType, description: "类型" })
  @IsOptional() @IsString()
  type?: BundleType;

  @ApiPropertyOptional({ enum: BundleTarget, description: "目标人群" })
  @IsOptional() @IsString()
  target?: BundleTarget;

  @ApiPropertyOptional({ description: "原价" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  originalPrice?: number;

  @ApiPropertyOptional({ description: "售价" })
  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  sellPrice?: number;

  @ApiPropertyOptional({ description: "排序" })
  @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "状态 ACTIVE/DISABLED" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "组合项列表（全量替换）" })
  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBundleItemDto)
  items?: CreateBundleItemDto[];
}

export class BundleQueryDto {
  @ApiPropertyOptional({ enum: BundleType, description: "类型筛选" })
  @IsOptional() @IsString()
  type?: BundleType;

  @ApiPropertyOptional({ enum: BundleTarget, description: "目标人群筛选" })
  @IsOptional() @IsString()
  target?: BundleTarget;

  @ApiPropertyOptional({ description: "状态筛选" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "关键词搜索" })
  @IsOptional() @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "页码" })
  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "每页条数" })
  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  pageSize?: number;
}
