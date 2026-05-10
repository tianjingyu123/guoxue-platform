import { IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsObject } from "class-validator";

export class SetConfigDto {
  @IsString()
  value: string;

  @IsOptional() @IsString()
  description?: string;
}

export class ExportUsersDto {
  @IsOptional() @IsString()
  startDate?: string;

  @IsOptional() @IsString()
  endDate?: string;

  @IsOptional() @IsString()
  role?: string;
}

export class ExportOrdersDto {
  @IsOptional() @IsString()
  startDate?: string;

  @IsOptional() @IsString()
  endDate?: string;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  type?: string;
}

export class ExportContentsDto {
  @IsOptional() @IsString()
  startDate?: string;

  @IsOptional() @IsString()
  endDate?: string;

  @IsOptional() @IsString()
  type?: string;
}

export class ExportAuditLogsDto {
  @IsOptional() @IsString()
  startDate?: string;

  @IsOptional() @IsString()
  endDate?: string;

  @IsOptional() @IsString()
  action?: string;
}

export class ExportEarningsDto {
  @IsOptional() @IsString()
  stationId?: string;

  @IsOptional() @IsString()
  startDate?: string;

  @IsOptional() @IsString()
  endDate?: string;
}

// ───────── 页面文案配置 DTO ─────────

export class UpsertPageContentDto {
  @IsString()
  pageRoute: string;

  @IsString()
  fieldKey: string;

  @IsString()
  content: string;
}

// ───────── 全站弹窗公告 DTO ─────────

export class CreateSiteNoticeDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString()
  startTime?: string;

  @IsOptional() @IsString()
  endTime?: string;
}

export class UpdateSiteNoticeDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString()
  startTime?: string;

  @IsOptional() @IsString()
  endTime?: string;
}

// ───────── 配置版本管理 DTO ─────────

export class RollbackConfigDto {
  @IsString()
  configKey: string;

  @IsInt()
  version: number;
}

// ───────── 会员配置 DTO ─────────

export class ExportExcelDto {
  @IsString()
  type: "users" | "orders";

  @IsOptional()
  filters?: Record<string, any>;
}

export class UpsertMemberConfigDto {
  @IsString()
  level: string;

  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsOptional() @IsInt()
  coinBonus?: number;

  @IsOptional() @IsObject()
  benefits?: Record<string, any>;

  @IsOptional() @IsInt()
  maxBorrowDays?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
