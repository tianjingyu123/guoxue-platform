import { IsString, IsOptional, IsInt, IsIn, MinLength, MaxLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({ description: "品类名称" })
  @IsString() @MinLength(1) @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: "父级品类ID（二级品类必填）" })
  @IsOptional() @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: "层级 1=一级 2=二级", default: 2 })
  @IsOptional() @Type(() => Number) @IsInt() @IsIn([1, 2])
  level?: number;

  @ApiPropertyOptional({ description: "排序序号" })
  @IsOptional() @Type(() => Number) @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: "图标URL" })
  @IsOptional() @IsString()
  icon?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: "品类名称" })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: "排序序号" })
  @IsOptional() @Type(() => Number) @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: "图标URL" })
  @IsOptional() @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: "状态 ACTIVE/INACTIVE" })
  @IsOptional() @IsString() @IsIn(["ACTIVE", "INACTIVE"])
  status?: string;
}

export class CategoryTreeQueryDto {
  @ApiPropertyOptional({ description: "是否包含统计信息" })
  @IsOptional() @Type(() => Boolean)
  withStats?: boolean;
}
