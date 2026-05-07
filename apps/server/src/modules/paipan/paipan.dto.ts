import { IsString, IsInt, IsOptional, Min, Max, IsIn } from "class-validator";

export class BaziInputDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @IsIn(["男", "女"])
  gender: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(59)
  minute?: number;

  @IsOptional()
  @IsString()
  city?: string;
}

/** 紫微斗数排盘输入 DTO */
export class ZiweiInputDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(["男", "女"])
  gender: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @IsInt()
  @Min(1)
  @Max(12)
  lunarMonth: number;

  @IsInt()
  @Min(1)
  @Max(30)
  lunarDay: number;

  @IsString()
  @IsIn(["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"])
  lunarHour: string;

  @IsString()
  @IsIn(["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"])
  lunarYearGan: string;

  @IsString()
  @IsIn(["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"])
  lunarYearZhi: string;
}

export class BaziRecordQueryDto {
  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  pageSize?: number;
}

/** AI 分析请求参数 */
export class AnalyzeDto {
  @IsString()
  recordId: string;
}

/** AI 分析历史查询参数 */
export class AnalysisQueryDto {
  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  pageSize?: number;
}
