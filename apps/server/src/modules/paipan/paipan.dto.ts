import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsInt, IsOptional, Min, Max, IsIn, MinLength, MaxLength, IsArray, ArrayMaxSize, IsBoolean, IsNumber, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { BAZI_SCHOOL_IDS } from "./bazi-schools";

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

/** 管理员排盘记录查询参数（覆盖全部排盘类型） */
export class AdminRecordQueryDto {
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

  @ApiPropertyOptional({
    description: "排盘类型（ALL=全部）",
    enum: ["ALL", "BAZI", "ZIWEI", "QIMEN", "YANGPAN", "LIUYAO", "DALIUREN"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["ALL", "BAZI", "ZIWEI", "QIMEN", "YANGPAN", "LIUYAO", "DALIUREN"])
  type?: string;

  @ApiPropertyOptional({ description: "搜索关键词（姓名/事项）" })
  @IsOptional()
  @IsString()
  keyword?: string;
}

/** AI 分析请求参数 */
export class AnalyzeDto {
  @ApiProperty({ description: "排盘记录ID" })
  @IsString()
  @MinLength(1)
  recordId: string;

  @ApiPropertyOptional({
    description: "AI 师徒流派 id（ziping=子平格局派/mangpai=盲派/xinpai=新派应用），缺省=通用分析",
    enum: BAZI_SCHOOL_IDS,
  })
  @IsOptional()
  @IsIn([...BAZI_SCHOOL_IDS])
  school?: string;
}

/** 八字合婚输入 DTO */
export class HehunDto {
  @ApiProperty({ description: "男方八字排盘记录ID" })
  @IsString()
  @MinLength(1)
  male: string;

  @ApiProperty({ description: "女方八字排盘记录ID" })
  @IsString()
  @MinLength(1)
  female: string;
}

/** 围绕报告提问 DTO（小卜文字问答） */
export class AskReportDto {
  @ApiProperty({ description: "用户问题", maxLength: 300 })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  question: string;

  @ApiPropertyOptional({ description: "页面当前所在小节编号，如 s2" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  sectionId?: string;

  @ApiPropertyOptional({ description: "最近几轮对话（最多取 6 轮）", type: "array" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  history?: { role: "user" | "assistant"; content: string }[];
}

/** 排盘报告生成 DTO */
export class GenerateReportDto {
  @ApiProperty({ description: "排盘记录ID" })
  @IsString()
  @MinLength(1)
  recordId: string;

  @ApiPropertyOptional({
    description: "报告类型",
    enum: ["general", "career", "love", "wealth", "health"],
    default: "general",
  })
  @IsOptional()
  @IsIn(["general", "career", "love", "wealth", "health"])
  reportType?: string;

  @ApiPropertyOptional({ description: "是否包含古籍引用", default: true })
  @IsOptional()
  @Type(() => Boolean)
  includeReferences?: boolean;

  @ApiPropertyOptional({ description: "流派 id" })
  @IsOptional()
  @IsIn([...BAZI_SCHOOL_IDS])
  school?: string;

  @ApiPropertyOptional({ description: "是否强制重新生成", default: false })
  @IsOptional()
  @Type(() => Boolean)
  regenerate?: boolean;
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

// ────────── 六爻排盘 ──────────
export class LiuYaoInputDto {
  @ApiPropertyOptional({ description: "事项内容" })
  @IsOptional() @IsString()
  matter?: string;

  @ApiProperty({ description: "年份", example: 2026 })
  @IsInt() @Min(1900) @Max(2100)
  year: number;

  @ApiProperty({ description: "月份", example: 6 })
  @IsInt() @Min(1) @Max(12)
  month: number;

  @ApiProperty({ description: "日", example: 22 })
  @IsInt() @Min(1) @Max(31)
  day: number;

  @ApiPropertyOptional({ description: "小时", example: 12 })
  @IsOptional() @IsInt() @Min(0) @Max(23)
  hour?: number;

  @ApiPropertyOptional({ description: "起卦方式: coin/time/manual", example: "time" })
  @IsOptional() @IsString()
  method?: string;

  @ApiPropertyOptional({ description: "手动摇卦结果(6爻数组，每爻 6/7/8/9)" })
  @IsOptional()
  manualYao?: number[];

  // 起卦参数：此前只声明了 manualYao 且未传入引擎，任何摇卦结果都被忽略、一律按时间起卦。
  // 补齐与前端一致的参数（铜钱/数字/卦名），并在 service 中真正传给引擎。
  @ApiPropertyOptional({ description: "铜钱摇卦结果，逗号分隔的 6 个数（6/7/8/9）" })
  @IsOptional() @IsString()
  coins?: string;

  @ApiPropertyOptional({ description: "数字起卦输入" })
  @IsOptional() @IsString()
  numberInput?: string;

  @ApiPropertyOptional({ description: "按卦名起卦：本卦与变卦的上下卦" })
  @IsOptional()
  guaPick?: { benUp: string; benDown: string; bianUp: string; bianDown: string };
}

// ────────── 梅花易数 ──────────

export class MeihuaInputDto {
  @ApiPropertyOptional({ description: "所问之事" })
  @IsOptional() @IsString() @MaxLength(60)
  matter?: string;

  @ApiProperty({ example: 2026 }) @IsInt() @Min(1900) @Max(2100) year: number;
  @ApiProperty({ example: 6 }) @IsInt() @Min(1) @Max(12) month: number;
  @ApiProperty({ example: 22 }) @IsInt() @Min(1) @Max(31) day: number;
  @ApiPropertyOptional({ example: 12 }) @IsOptional() @IsInt() @Min(0) @Max(23) hour?: number;
  @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsInt() @Min(0) @Max(59) minute?: number;

  @ApiPropertyOptional({ description: "起卦方式：time/number1/number2/manual/auto" })
  @IsOptional() @IsIn(["time", "number1", "number2", "manual", "auto"])
  mode?: string;

  @ApiPropertyOptional({ description: "数字起卦输入" })
  @IsOptional() @IsString() @MaxLength(20)
  numbers?: string;

  @ApiPropertyOptional({ description: "数字起卦是否加时辰数" })
  @IsOptional()
  plusHour?: boolean | string;

  @ApiPropertyOptional({ description: "手动起卦：自上而下六位「1阳0阴」" })
  @IsOptional() @IsString() @MaxLength(6)
  yaos?: string;

  @ApiPropertyOptional({ description: "手动起卦：动爻，自上而下索引 0=上爻" })
  @IsOptional() @IsString() @MaxLength(2)
  moving?: string;

  // 农历由起卦端算好后一并存入：服务端内置历法与移动端 lunar 库在闰月上可能有差，
  // 报告重算时直接复用，保证与用户看到的卦完全一致
  @ApiPropertyOptional({ description: "起卦时的农历月（与页面一致）" })
  @IsOptional() @IsInt() @Min(1) @Max(12)
  lunarMonth?: number;

  @ApiPropertyOptional({ description: "起卦时的农历日" })
  @IsOptional() @IsInt() @Min(1) @Max(30)
  lunarDay?: number;

  @ApiPropertyOptional({ description: "农历文本，如「五月初八」" })
  @IsOptional() @IsString() @MaxLength(30)
  lunarText?: string;

  @ApiPropertyOptional({ description: "四柱文本" })
  @IsOptional() @IsString() @MaxLength(60)
  ganzhi?: string;

  @ApiPropertyOptional({ description: "节气文本" })
  @IsOptional() @IsString() @MaxLength(60)
  jieqi?: string;
}

// ────────── 大六壬排盘 ──────────
export class DaLiuRenInputDto {
  @ApiPropertyOptional({ description: "事项内容" })
  @IsOptional() @IsString()
  matter?: string;

  @ApiProperty({ description: "年份", example: 2026 })
  @IsInt() @Min(1900) @Max(2100)
  year: number;

  @ApiProperty({ description: "月份", example: 6 })
  @IsInt() @Min(1) @Max(12)
  month: number;

  @ApiProperty({ description: "日", example: 22 })
  @IsInt() @Min(1) @Max(31)
  day: number;

  @ApiPropertyOptional({ description: "小时", example: 12 })
  @IsOptional() @IsInt() @Min(0) @Max(23)
  hour?: number;

  @ApiPropertyOptional({ description: "起课方式: chushi/qimen", example: "chushi" })
  @IsOptional() @IsString()
  method?: string;

  // 流派参数：此前未传给引擎，用户在页面选了非默认流派，存到服务端的记录会是另一课。
  @ApiPropertyOptional({ description: "换将方式：zhongqi(默认)/jiaojie" })
  @IsOptional() @IsIn(["zhongqi", "jiaojie"])
  jiangMethod?: "zhongqi" | "jiaojie";

  @ApiPropertyOptional({ description: "贵人求法：standard(默认)/alt" })
  @IsOptional() @IsIn(["standard", "alt"])
  guirenMethod?: "standard" | "alt";

  @ApiPropertyOptional({ description: "贵神昼夜：auto(默认)/day/night" })
  @IsOptional() @IsIn(["auto", "day", "night"])
  guishenType?: "auto" | "day" | "night";

  @ApiPropertyOptional({ description: "涉害类型：mengzhongji(默认)/shenqian" })
  @IsOptional() @IsIn(["mengzhongji", "shenqian"])
  shehaiType?: "mengzhongji" | "shenqian";

  @ApiPropertyOptional({ description: "出生年份（算年命行年）" })
  @IsOptional() @IsInt() @Min(1900) @Max(2100)
  birthYear?: number;

  @ApiPropertyOptional({ description: "性别（年命行年用）" })
  @IsOptional() @IsIn(["男", "女"])
  gender?: string;
}

/**
 * 小六壬起课（2026-09-18 第 9 个工具）
 *
 * 此前小六壬只在前端算、存本地，服务端没有记录，所以出不了报告。
 * 推算已迁至 shared（前后端共用一份，缘由见 xiaoliuren-engine.ts），这里只收参数。
 */
export class XiaoliurenInputDto {
  @ApiPropertyOptional({ description: "所问之事" })
  @IsOptional() @IsString() @MaxLength(60)
  matter?: string;

  @ApiProperty({ example: 2026 }) @IsInt() @Min(1900) @Max(2100) year: number;
  @ApiProperty({ example: 9 }) @IsInt() @Min(1) @Max(12) month: number;
  @ApiProperty({ example: 18 }) @IsInt() @Min(1) @Max(31) day: number;
  @ApiPropertyOptional({ example: 14 }) @IsOptional() @IsInt() @Min(0) @Max(23) hour?: number;
  @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsInt() @Min(0) @Max(59) minute?: number;

  @ApiPropertyOptional({ description: "流派：daojia 道家 / jiangshi 江氏 / jiangshi2 江氏活六神" })
  @IsOptional() @IsIn(["daojia", "jiangshi", "jiangshi2"])
  school?: "daojia" | "jiangshi" | "jiangshi2";

  /** 报数起课：三个数，给了就用它代替月日时 */
  @ApiPropertyOptional({ description: "报数起课的三个数（1-99）", type: [Number] })
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsInt({ each: true }) @Min(1, { each: true }) @Max(99, { each: true })
  numbers?: number[];
}

/** 二十四山 */
const SHAN_24_LIST = [
  "壬", "子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳",
  "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥",
] as const;

/**
 * 玄空飞星（2026-09-18 第 10 个工具）
 *
 * 与小六壬不同：玄空的算法后端早就有（tool-registry/calculators/xuankong.calculator.ts，
 * 含运盘山盘向盘、替卦、格局判定），缺的只是落库——没有 paipanRecord 就出不了报告。
 */
export class XuankongInputDto {
  @ApiPropertyOptional({ description: "宅名或客户名" })
  @IsOptional() @IsString() @MaxLength(40)
  name?: string;

  @ApiProperty({ description: "坐山（二十四山）", example: "子" })
  @IsIn(SHAN_24_LIST as unknown as string[])
  shan: string;

  @ApiProperty({ description: "朝向（二十四山）", example: "午" })
  @IsIn(SHAN_24_LIST as unknown as string[])
  xiang: string;

  @ApiProperty({ description: "建造或入伙年份（定元运）", example: 2026 })
  @IsInt() @Min(1864) @Max(2100)
  year: number;

  @ApiPropertyOptional({ description: "是否起替卦（默认起）" })
  @IsOptional() @IsBoolean()
  tiGua?: boolean;
}

/**
 * 八宅（2026-09-19 第 12 个工具）
 *
 * 与玄空的输入差别正是两者的分野所在：玄空要**年份**（定元运，宅运二十年一换），
 * 八宅要**生年与性别**（定命卦，终身不变）。两者都要坐山。
 *
 * 坐山这里收八卦名而不是二十四山——八宅按卦论方位，二十四山那一层用不上。
 */
export class BazhaiInputDto {
  @ApiPropertyOptional({ description: "宅名或客户名" })
  @IsOptional() @IsString() @MaxLength(40)
  name?: string;

  @ApiProperty({ description: "出生年份（定命卦）", example: 1990 })
  @IsInt() @Min(1900) @Max(2100)
  birthYear: number;

  /**
   * 命卦按命理年取，命理年以立春分界。只给年份的话，生于立春前者会被算成下一年，
   * 东四/西四判反、整份宅书吉凶颠倒（约每年 1/10 的出生日期会中招）。
   * 设为可选以兼容既有调用方，但**新接入方应当传**。
   */
  @ApiPropertyOptional({ description: "出生月（用于立春分界，强烈建议传）", example: 6 })
  @IsOptional() @IsInt() @Min(1) @Max(12)
  birthMonth?: number;

  @ApiPropertyOptional({ description: "出生日（用于立春分界，强烈建议传）", example: 20 })
  @IsOptional() @IsInt() @Min(1) @Max(31)
  birthDay?: number;

  @ApiProperty({ description: "性别", example: "男" })
  @IsIn(["男", "女"])
  gender: string;

  @ApiProperty({ description: "坐山（八卦名）", example: "坎" })
  @IsIn(["坎", "艮", "震", "巽", "离", "坤", "兑", "乾"])
  zuoShan: string;
}

/**
 * 阴盘奇门起局（2026-09-19 第 13 个工具）
 *
 * 与阳盘同样收时间，但**定局法完全不同**：阴盘按年月日时取数除九，不查节气，
 * 逐时辰换盘（详见 shared/paipan/yinpan-qimen.ts）。
 *
 * `matter` 在阴盘里比别的工具要紧得多——取象直读要按所问之事挑象意分支，
 * 问的是什么决定了同一组符号读成什么。不填也能出盘，但只能讲问事人自身的状态。
 */
export class YinpanInputDto {
  @ApiPropertyOptional({ description: "所问之事（影响取象，建议填写）" })
  @IsOptional() @IsString() @MaxLength(60)
  matter?: string;

  @ApiProperty({ example: 2026 }) @IsInt() @Min(1900) @Max(2100) year: number;
  @ApiProperty({ example: 9 }) @IsInt() @Min(1) @Max(12) month: number;
  @ApiProperty({ example: 19 }) @IsInt() @Min(1) @Max(31) day: number;
  @ApiPropertyOptional({ example: 14 }) @IsOptional() @IsInt() @Min(0) @Max(23) hour?: number;
  @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsInt() @Min(0) @Max(59) minute?: number;
}

/**
 * 金口诀起课（2026-09-18 第 11 个工具）
 *
 * 推算走 shared 的 `computeJinkoujue`——与前端页面同一份算法。
 * 后端原有的 `jinkoujue.calculator.ts` 月将算错半年，已删除（见接续文档 §2.47、§2.50）。
 */
export class JinkoujueInputDto {
  @ApiPropertyOptional({ description: "所问之事" })
  @IsOptional() @IsString() @MaxLength(60)
  matter?: string;

  @ApiProperty({ example: 2026 }) @IsInt() @Min(1900) @Max(2100) year: number;
  @ApiProperty({ example: 9 }) @IsInt() @Min(1) @Max(12) month: number;
  @ApiProperty({ example: 18 }) @IsInt() @Min(1) @Max(31) day: number;
  @ApiPropertyOptional({ example: 14 }) @IsOptional() @IsInt() @Min(0) @Max(23) hour?: number;
  @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsInt() @Min(0) @Max(59) minute?: number;

  @ApiPropertyOptional({ description: "地分取法：manual 自选 / number 报数 / random 随机" })
  @IsOptional() @IsIn(["manual", "number", "random"])
  difenMethod?: "manual" | "number" | "random";

  @ApiPropertyOptional({ description: "地分地支（difenMethod=manual 时必填）", example: "子" })
  @IsOptional() @IsIn(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"])
  difenZhi?: string;

  @ApiPropertyOptional({ description: "报数（difenMethod=number 时用）" })
  @IsOptional() @IsInt() @Min(1) @Max(9999)
  difenNumber?: number;

  @ApiPropertyOptional({ description: "换将方式：jie 交节 / zhong 中气（默认中气）" })
  @IsOptional() @IsIn(["jie", "zhong"])
  jiangMethod?: "jie" | "zhong";

  @ApiPropertyOptional({ description: "贵人诀：A 甲戊庚牛羊 / B 甲羊戊庚牛" })
  @IsOptional() @IsIn(["A", "B"])
  guirenSchool?: "A" | "B";

  @ApiPropertyOptional({ description: "贵神昼夜：auto 卯酉区分 / day 白天 / night 夜晚" })
  @IsOptional() @IsIn(["auto", "day", "night"])
  guiType?: "auto" | "day" | "night";
}

/**
 * 山向地图（2026-09-19）
 *
 * 以太极点为心，算周边标注各落何山、距离多远、是否触犯八曜煞与黄泉。
 * 计算走 `@guoxue/shared/paipan` 的 `readShanxiangMap`，**不依赖任何地图服务**——
 * 底图是小程序原生 `<map>` 还是用户上传的卫星图截图，都不影响本接口。
 *
 * ⚠️ 经纬度一律按 **WGS-84**（GPS 原始坐标）传入。
 * 国内地图服务多用 GCJ-02（火星坐标），两者在城市尺度上相差**数十到上百米**——
 * 在太极点附近这点偏差足以让一个标注跨山。转换由调用端负责，接口只认 WGS-84，
 * 并在响应里注明，免得两边各以为对方转过了。
 */
export class MapPointDto {
  @ApiProperty({ example: 39.9042, description: "纬度（WGS-84，北正南负）" })
  @IsNumber() @Min(-90) @Max(90) lat: number;

  @ApiProperty({ example: 116.4074, description: "经度（WGS-84，东正西负）" })
  @IsNumber() @Min(-180) @Max(180) lng: number;
}

export class MapFeatureDto {
  @ApiProperty({ example: "水口", description: "标注名称" })
  @IsString() @MaxLength(30) label: string;

  @ApiProperty({ enum: ["水", "砂", "路", "建筑", "其他"], description: "类别。黄泉只对「水」生效，故必须分类" })
  @IsIn(["水", "砂", "路", "建筑", "其他"]) kind: "水" | "砂" | "路" | "建筑" | "其他";

  @ApiProperty({ type: MapPointDto })
  @ValidateNested() @Type(() => MapPointDto) point: MapPointDto;
}

const SHAN_24_VALUES = [
  "壬", "子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳",
  "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥",
];

export class ShanxiangMapDto {
  @ApiProperty({ type: MapPointDto, description: "太极点（宅/穴中心）" })
  @ValidateNested() @Type(() => MapPointDto) center: MapPointDto;

  @ApiPropertyOptional({ description: "坐山。给了才判八曜煞", enum: SHAN_24_VALUES })
  @IsOptional() @IsIn(SHAN_24_VALUES) zuoShan?: string;

  @ApiPropertyOptional({ description: "向。给了才判黄泉", enum: SHAN_24_VALUES })
  @IsOptional() @IsIn(SHAN_24_VALUES) xiangShan?: string;

  @ApiProperty({ type: [MapFeatureDto], description: "地图上的标注，最多 50 个" })
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => MapFeatureDto)
  features: MapFeatureDto[];

  @ApiPropertyOptional({
    description: "磁偏角（度，东偏为正）。给了则响应里一并附上各标注的罗盘（磁北）读数，便于实地核对",
    example: -6.5,
  })
  @IsOptional() @IsNumber() @Min(-30) @Max(30) declination?: number;
}

/**
 * 山向地图·截图路径（2026-09-19）
 *
 * 原生 `<map>` 只在微信端开箱可用，H5/App 需各自配 key；
 * 本路径**零依赖**——用户自己传一张卫星图或平面图截图，在图上点太极点与标注即可。
 * 与经纬度路径共用同一份煞忌判据，结论不会两条路走岔。
 */
export class ImagePointDto {
  @ApiProperty({ example: 512, description: "像素 x（原点在图左上角，向右为正）" })
  @IsNumber() @Min(0) @Max(100000) x: number;

  @ApiProperty({ example: 384, description: "像素 y（**向下为正**，图像坐标系）" })
  @IsNumber() @Min(0) @Max(100000) y: number;
}

export class ImageFeatureDto {
  @ApiProperty({ example: "水口" })
  @IsString() @MaxLength(30) label: string;

  @ApiProperty({ enum: ["水", "砂", "路", "建筑", "其他"], description: "黄泉只对「水」生效，故必填" })
  @IsIn(["水", "砂", "路", "建筑", "其他"]) kind: "水" | "砂" | "路" | "建筑" | "其他";

  @ApiProperty({ type: ImagePointDto })
  @ValidateNested() @Type(() => ImagePointDto) point: ImagePointDto;
}

export class ShanxiangImageDto {
  @ApiProperty({ type: ImagePointDto, description: "太极点在图上的像素位置" })
  @ValidateNested() @Type(() => ImagePointDto) center: ImagePointDto;

  @ApiPropertyOptional({
    description: "图上正北的朝向（度，自图像正上方顺时针）。图片正上方即正北时传 0",
    example: 0,
  })
  @IsOptional() @IsNumber() @Min(-360) @Max(360) northOffset?: number;

  @ApiPropertyOptional({
    description: "比例尺：一像素等于多少米。**不给就按像素输出**，不猜——猜出来的距离看着像真的，危害更大",
    example: 2.5,
  })
  @IsOptional() @IsNumber() @Min(0.0001) @Max(10000) metersPerPixel?: number;

  @ApiPropertyOptional({ enum: SHAN_24_VALUES }) @IsOptional() @IsIn(SHAN_24_VALUES) zuoShan?: string;
  @ApiPropertyOptional({ enum: SHAN_24_VALUES }) @IsOptional() @IsIn(SHAN_24_VALUES) xiangShan?: string;

  @ApiProperty({ type: [ImageFeatureDto], description: "图上的标注，最多 50 个" })
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ImageFeatureDto)
  features: ImageFeatureDto[];
}
