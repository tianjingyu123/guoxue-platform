import { IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsObject, IsArray, MinLength } from "class-validator";

export class CreateConfigDto {
  @IsString()
  @MinLength(1)
  key: string;

  @IsString()
  @MinLength(1)
  value: string;

  @IsOptional() @IsString()
  description?: string;
}

export class ToggleMaintenanceDto {
  @IsBoolean()
  enabled: boolean;
}

export class ToggleAutomationDto {
  @IsBoolean()
  enabled: boolean;
}

export class SetConfigDto {
  @IsString()
  @MinLength(1)
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
  @MinLength(1)
  pageRoute: string;

  @IsString()
  @MinLength(1)
  fieldKey: string;

  @IsString()
  @MinLength(1)
  content: string;
}

// ───────── 全站弹窗公告 DTO ─────────

export class CreateSiteNoticeDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
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
  @MinLength(1)
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

export class SetPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class UpsertMemberConfigDto {
  @IsString()
  @MinLength(1)
  level: string;

  @IsString()
  @MinLength(1)
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
