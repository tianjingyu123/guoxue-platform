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

  @ApiPropertyOptional({ description: "是否启用真太阳时校正（需city或longitude）" })
  @IsOptional()
  @Type(() => Boolean)
  useTrueSolarTime?: boolean;

  @ApiPropertyOptional({ description: "是否启用夏令时校正（1986-1991年出生建议开启）" })
  @IsOptional()
  @Type(() => Boolean)
  useDaylightSaving?: boolean;

  @ApiPropertyOptional({ description: "早晚子时模式", enum: ["traditional", "modern"], default: "traditional" })
  @IsOptional()
  @IsString()
  @IsIn(["traditional", "modern"])
  ziShiMode?: string;

  @ApiPropertyOptional({ description: "手动指定出生地经度（可选，优先级高于city）" })
  @IsOptional()
  @Type(() => Number)
  longitude?: number;
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

/** 奇门遁甲排盘输入 DTO */
export class QimenInputDto {
  @ApiPropertyOptional({ description: "事项内容（选填）" })
  @IsOptional()
  @IsString()
  matter?: string;

  @ApiProperty({ description: "排盘年份", minimum: 1900, maximum: 2100, example: 2026 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiProperty({ description: "排盘月份", minimum: 1, maximum: 12, example: 5 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ description: "排盘日", minimum: 1, maximum: 31, example: 17 })
  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @ApiProperty({ description: "小时（24时制）", minimum: 0, maximum: 23, example: 13 })
  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @ApiPropertyOptional({ description: "分钟（0-59）", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  minute?: number;

  @ApiProperty({ description: "排盘方法", enum: ["zhuan", "fei"], example: "fei" })
  @IsString()
  @IsIn(["zhuan", "fei"])
  panMethod: string;

  @ApiPropertyOptional({ description: "飞宫方式（飞盘时生效）", enum: ["yangshun", "yinyang"], default: "yinyang" })
  @IsOptional()
  @IsString()
  @IsIn(["yangshun", "yinyang"])
  flyMethod?: string;

  @ApiProperty({ description: "起局方式", enum: ["chaibu", "maoshan", "zhirun", "custom"], example: "chaibu" })
  @IsString()
  @IsIn(["chaibu", "maoshan", "zhirun", "custom"])
  startMethod: string;

  @ApiPropertyOptional({ description: "自选局数（startMethod=custom时生效）", example: "阳遁1局" })
  @IsOptional()
  @IsString()
  customJu?: string;

  @ApiProperty({ description: "暗干起法", enum: ["zhishi", "dipan"], example: "dipan" })
  @IsString()
  @IsIn(["zhishi", "dipan"])
  anganMethod: string;

  @ApiPropertyOptional({ description: "是否启用真太阳时", default: false })
  @IsOptional()
  @Type(() => Boolean)
  useTrueSolar?: boolean;

  @ApiPropertyOptional({ description: "纬度（真太阳时时使用）" })
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ description: "经度（真太阳时时使用）" })
  @IsOptional()
  @Type(() => Number)
  lng?: number;
}

/** 阳盘命理奇门排盘输入 DTO */
export class YangpanInputDto {
  @ApiPropertyOptional({ description: "客户姓名（选填）" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "性别", enum: ["male", "female"], example: "male" })
  @IsString()
  @IsIn(["male", "female"])
  gender: string;

  @ApiProperty({ description: "出生年份", minimum: 1900, maximum: 2100, example: 1990 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiProperty({ description: "出生月份", minimum: 1, maximum: 12, example: 1 })
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

  @ApiPropertyOptional({ description: "出生分钟（0-59）", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  minute?: number;

  @ApiProperty({ description: "排盘方法", enum: ["zhuan", "fei"], example: "zhuan" })
  @IsString()
  @IsIn(["zhuan", "fei"])
  panMethod: string;

  @ApiProperty({ description: "寄宫方式", enum: ["kungong", "yanggenyin"], example: "kungong" })
  @IsString()
  @IsIn(["kungong", "yanggenyin"])
  jigongMethod: string;

  @ApiProperty({ description: "起局方式", enum: ["chaibu", "maoshan", "zhirun"], example: "chaibu" })
  @IsString()
  @IsIn(["chaibu", "maoshan", "zhirun"])
  startMethod: string;

  @ApiProperty({ description: "暗干起法", enum: ["zhishi", "dipan"], example: "zhishi" })
  @IsString()
  @IsIn(["zhishi", "dipan"])
  anganMethod: string;

  @ApiPropertyOptional({ description: "出生地点" })
  @IsOptional()
  @IsString()
  place?: string;

  @ApiPropertyOptional({ description: "是否启用真太阳时", default: true })
  @IsOptional()
  @Type(() => Boolean)
  trueSolar?: boolean;

  @ApiPropertyOptional({ description: "早晚子时", default: false })
  @IsOptional()
  @Type(() => Boolean)
  earlyLateZi?: boolean;

  @ApiPropertyOptional({ description: "夏令时", default: false })
  @IsOptional()
  @Type(() => Boolean)
  daylightSaving?: boolean;
}

// ────────── 分组管理 ──────────

export class GroupListQueryDto {
  @ApiProperty({ description: "排盘类型", enum: ["BAZI", "QIMEN", "YANGPAN"], example: "BAZI" })
  @IsString()
  @IsIn(["BAZI", "QIMEN", "YANGPAN"])
  paipanType: string;
}

export class CreateGroupDto {
  @ApiProperty({ description: "排盘类型", enum: ["BAZI", "QIMEN", "YANGPAN"] })
  @IsString()
  @IsIn(["BAZI", "QIMEN", "YANGPAN"])
  paipanType: string;

  @ApiProperty({ description: "分组名称" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: "分组颜色" })
  @IsOptional()
  @IsString()
  color?: string;
}

export class RenameGroupDto {
  @ApiProperty({ description: "排盘类型", enum: ["BAZI", "QIMEN", "YANGPAN"] })
  @IsString()
  @IsIn(["BAZI", "QIMEN", "YANGPAN"])
  paipanType: string;

  @ApiProperty({ description: "旧分组名称" })
  @IsString()
  @MinLength(1)
  oldName: string;

  @ApiProperty({ description: "新分组名称" })
  @IsString()
  @MinLength(1)
  newName: string;
}

export class DeleteGroupDto {
  @ApiProperty({ description: "排盘类型", enum: ["BAZI", "QIMEN", "YANGPAN"] })
  @IsString()
  @IsIn(["BAZI", "QIMEN", "YANGPAN"])
  paipanType: string;

  @ApiProperty({ description: "分组名称" })
  @IsString()
  @MinLength(1)
  name: string;
}

// ────────── 案例库 ──────────

export class CaseQueryDto {
  @ApiPropertyOptional({ description: "一级分类", example: "名人案例" })
  @IsOptional()
  @IsString()
  primaryCat?: string;

  @ApiPropertyOptional({ description: "二级分类", example: "君主" })
  @IsOptional()
  @IsString()
  secondaryCat?: string;

  @ApiPropertyOptional({ description: "搜索关键词" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
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
