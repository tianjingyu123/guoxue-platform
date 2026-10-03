import {
  IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString,
  Matches, Max, MaxLength, Min,
} from "class-validator";
import { Type } from "class-transformer";

// ───────── 常量（RFM 分层 / 体验档限额）─────────

/** RFM 四层（查询时实时计算·常量导出供前后端/单测共用） */
export const RFM_TIERS = ["HIGH_VALUE", "ACTIVE", "AT_RISK", "DORMANT"] as const;
export type RfmTier = (typeof RFM_TIERS)[number];

/** RFM 分层阈值（R=lastServeAt 距今天数 / F=serveCount / M=totalSpend）
 * 高价值 HIGH_VALUE：(M ≥ highValueSpend 或 F ≥ highValueServeCount) 且 R ≤ dormantDays
 * 活跃   ACTIVE    ：R ≤ activeDays
 * 流失预警 AT_RISK ：activeDays < R ≤ dormantDays（曾服务过·正在流失）
 * 沉睡   DORMANT   ：R > dormantDays 或从未服务
 */
export const RFM_THRESHOLDS = {
  activeDays: 30,
  dormantDays: 90,
  highValueSpend: 1000,
  highValueServeCount: 5,
} as const;

/** 体验档（无 B 端角色）客户档案上限；B 端角色（站长/商家/驿站/研究院成员等）不限 */
export const CLIENT_LIMIT_TRIAL = 20;

/** 复购提醒阈值：上次服务距今 ≥ 90 天 */
export const REPURCHASE_DAYS = 90;

/** 服务记录类型 */
export const SERVE_TYPES = ["consult", "course", "product", "paipan"] as const;

/** 提醒类型（DAYUN 大运切换暂不生成——需盘存档深度联动，见 service TODO） */
export const REMINDER_KINDS = ["BIRTHDAY", "LICHUN", "REPURCHASE", "DAYUN"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

// ───────── 客户档案 ─────────

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: "客户称呼不能为空" })
  @MaxLength(30, { message: "客户称呼最长30字" })
  name!: string;

  /** 手机号（明文入参·服务层 M4 加密落库；宽松格式兼容座机） */
  @IsOptional()
  @IsString()
  @Matches(/^\d{6,15}$/, { message: "联系电话格式不正确" })
  phone?: string;

  /** 生辰（明文入参·M4 加密落库·仅用于生日/流年提醒，表单需明示用途） */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/, { message: "生辰格式应为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm" })
  birth?: string;

  @IsOptional()
  @IsIn(["male", "female"])
  /** 出生地（排盘真太阳时校正用·非敏感，明文存） */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "出生地最长50字" })
  birthPlace?: string;

  gender?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(12, { each: true, message: "单个标签最长12字" })
  tags?: string[];

  /** 来源（订单归因入库走专用端点，此处只收 manual/card） */
  @IsOptional()
  @IsIn(["manual", "card"])
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注最长500字" })
  notes?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "客户称呼不能为空" })
  @MaxLength(30, { message: "客户称呼最长30字" })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{6,15})?$/, { message: "联系电话格式不正确" })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?)?$/, { message: "生辰格式应为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm" })
  birth?: string;

  @IsOptional()
  @IsIn(["male", "female", ""])
  /** 出生地（排盘真太阳时校正用·非敏感，明文存） */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "出生地最长50字" })
  birthPlace?: string;

  gender?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(12, { each: true, message: "单个标签最长12字" })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注最长500字" })
  notes?: string;
}

export class ClientListQueryDto {
  /** RFM 层筛选（缺省=全部） */
  @IsOptional()
  @IsIn(RFM_TIERS as unknown as string[])
  tier?: RfmTier;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;
}

// ───────── 服务记录 ─────────

export class CreateServeLogDto {
  @IsIn(SERVE_TYPES as unknown as string[], { message: "服务类型不正确" })
  type!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "金额格式不正确" })
  @Min(0, { message: "金额不能为负" })
  @Max(1_000_000, { message: "金额超出范围" })
  amount?: number;

  @IsString()
  @IsNotEmpty({ message: "服务摘要不能为空" })
  @MaxLength(200, { message: "服务摘要最长200字" })
  summary!: string;

  /** 服务时间（ISO 字符串·缺省=当前时间） */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}/, { message: "服务时间格式不正确" })
  servedAt?: string;
}

export class UpdateServeLogDto {
  @IsOptional()
  @IsIn(SERVE_TYPES as unknown as string[], { message: "服务类型不正确" })
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "金额格式不正确" })
  @Min(0, { message: "金额不能为负" })
  @Max(1_000_000, { message: "金额超出范围" })
  amount?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "服务摘要不能为空" })
  @MaxLength(200, { message: "服务摘要最长200字" })
  summary?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}/, { message: "服务时间格式不正确" })
  servedAt?: string;
}

// ───────── 提醒 / 订单归因入库 ─────────

export class ReminderQueryDto {
  @IsOptional()
  @IsIn(["PENDING", "DONE"])
  status?: string;
}

export class FromOrderDto {
  @IsString()
  @IsNotEmpty({ message: "orderId 不能为空" })
  orderId!: string;
}
