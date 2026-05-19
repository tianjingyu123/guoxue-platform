import { IsString, IsOptional, IsArray, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BaziClassicQueryDto {
  @ApiProperty({ description: "八字概念标签列表", example: ["甲木", "正官格", "天乙贵人"] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiPropertyOptional({ description: "日主天干", example: "甲" })
  @IsOptional()
  @IsString()
  dayMaster?: string;

  @ApiPropertyOptional({ description: "月令地支", example: "寅" })
  @IsOptional()
  @IsString()
  monthBranch?: string;

  @ApiPropertyOptional({ description: "关键词全文搜索", example: "伤官见官" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "每本书最多返回章节数", default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPerBook?: number;
}

export class BaziClassicSearchDto {
  @ApiProperty({ description: "搜索关键词", example: "甲木寅月" })
  @IsString()
  keyword: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
