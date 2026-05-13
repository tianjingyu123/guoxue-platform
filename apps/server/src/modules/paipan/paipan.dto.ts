import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsInt, IsOptional, Min, Max, IsIn, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class BaziInputDto {
  @ApiPropertyOptional({ description: "姓名" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "性别", enum: ["男", "女"], example: "男" })
  @IsString()
  @IsIn(["男", "女"])
  gender: string;

  @ApiProperty({ description: "出生年份", minimum: 1900, maximum: 2100, example: 1984 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiProperty({ description: "出生月份", minimum: 1, maximum: 12, example: 11 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ description: "出生日", minimum: 1, maximum: 31, example: 15 })
  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @ApiProperty({ description: "出生小时（24时制）", minimum: 0, maximum: 23, example: 8 })
  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @ApiPropertyOptional({ description: "出生分钟（0-59）" })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(59)
  minute?: number;

  @ApiPropertyOptional({ description: "出生城市" })
  @IsOptional()
  @IsString()
  city?: string;
}

/** 紫微斗数排盘输入 DTO */
export class ZiweiInputDto {
  @ApiProperty({ description: "姓名", example: "测试" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ description: "性别", enum: ["男", "女"], example: "女" })
  @IsString()
  @IsIn(["男", "女"])
  gender: string;

  @ApiProperty({ description: "出生年份", minimum: 1900, maximum: 2100, example: 1990 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiProperty({ description: "出生月份", minimum: 1, maximum: 12, example: 6 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ description: "出生日", minimum: 1, maximum: 31, example: 1 })
  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @ApiProperty({ description: "出生小时（24时制）", minimum: 0, maximum: 23, example: 12 })
  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @ApiProperty({ description: "农历月", minimum: 1, maximum: 12, example: 5 })
  @IsInt()
  @Min(1)
  @Max(12)
  lunarMonth: number;

  @ApiProperty({ description: "农历日", minimum: 1, maximum: 30, example: 9 })
  @IsInt()
  @Min(1)
  @Max(30)
  lunarDay: number;

  @ApiProperty({ description: "农历时辰", enum: ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"], example: "午" })
  @IsString()
  @IsIn(["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"])
  lunarHour: string;

  @ApiProperty({ description: "农历年天干", enum: ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"], example: "庚" })
  @IsString()
  @IsIn(["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"])
  lunarYearGan: string;

  @ApiProperty({ description: "农历年地支", enum: ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"], example: "午" })
  @IsString()
  @IsIn(["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"])
  lunarYearZhi: string;
}

export class BaziRecordQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/** AI 分析请求参数 */
export class AnalyzeDto {
  @ApiProperty({ description: "排盘记录ID" })
  @IsString()
  @MinLength(1)
  recordId: string;
}

/** AI 分析历史查询参数 */
export class AnalysisQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @IsInt()
  pageSize?: number;
}
