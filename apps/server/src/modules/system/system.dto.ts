import { IsString, IsDateString, IsOptional, IsInt, IsNumber, IsBoolean, IsObject, IsArray, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/** 更新角色权限入参（防止裸内联类型绕过校验） */
export class SetRolePermissionsDto {
  @ApiProperty({ description: "权限标识数组", type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

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

/** 更新品牌配置入参（租-T0 品牌抽象·所有字段可选·只更新传入字段） */
export class UpdateBrandConfigDto {
  @ApiProperty({ description: "站名（全称）", required: false })
  @IsOptional() @IsString() @MaxLength(50)
  siteName?: string;

  @ApiProperty({ description: "站名（简称·印章两字）", required: false })
  @IsOptional() @IsString() @MaxLength(10)
  siteNameShort?: string;

  @ApiProperty({ description: "英文名", required: false })
  @IsOptional() @IsString() @MaxLength(50)
  siteNameEn?: string;

  @ApiProperty({ description: "主标语", required: false })
  @IsOptional() @IsString() @MaxLength(100)
  slogan?: string;

  @ApiProperty({ description: "备用标语", required: false })
  @IsOptional() @IsString() @MaxLength(100)
  sloganAlt?: string;

  @ApiProperty({ description: "副标题", required: false })
  @IsOptional() @IsString() @MaxLength(100)
  tagline?: string;

  @ApiProperty({ description: "版权/页脚文案", required: false })
  @IsOptional() @IsString() @MaxLength(100)
  copyright?: string;

  @ApiProperty({ description: "二维码引导语", required: false })
  @IsOptional() @IsString() @MaxLength(100)
  qrGuide?: string;

  @ApiProperty({ description: "Logo 图片地址（空=内置印章 Logo）", required: false })
  @IsOptional() @IsString() @MaxLength(500)
  logoUrl?: string;

  @ApiProperty({ description: "品牌主色（如 #c41e3a）", required: false })
  @IsOptional() @IsString() @MaxLength(20)
  primaryColor?: string;

  @ApiProperty({ description: "主域名", required: false })
  @IsOptional() @IsString() @MaxLength(200)
  domain?: string;

  @ApiProperty({ description: "H5 入口地址", required: false })
  @IsOptional() @IsString() @MaxLength(500)
  h5Url?: string;

  @ApiProperty({ description: "客服电话", required: false })
  @IsOptional() @IsString() @MaxLength(30)
  servicePhone?: string;

  @ApiProperty({ description: "客服邮箱", required: false })
  @IsOptional() @IsString() @MaxLength(100)
  serviceEmail?: string;

  @ApiProperty({ description: "客服微信", required: false })
  @IsOptional() @IsString() @MaxLength(50)
  serviceWechat?: string;

  @ApiProperty({ description: "协议主体：公司全称", required: false })
  @IsOptional() @IsString() @MaxLength(100)
  companyName?: string;

  @ApiProperty({ description: "协议主体：平台名", required: false })
  @IsOptional() @IsString() @MaxLength(50)
  platformName?: string;

  @ApiProperty({ description: "协议主体：网址", required: false })
  @IsOptional() @IsString() @MaxLength(200)
  websiteUrl?: string;

  @ApiProperty({ description: "协议主体：联系人", required: false })
  @IsOptional() @IsString() @MaxLength(50)
  contactPerson?: string;

  @ApiProperty({ description: "协议主体：联系电话", required: false })
  @IsOptional() @IsString() @MaxLength(30)
  contactPhone?: string;

  @ApiProperty({ description: "协议主体：联系邮箱", required: false })
  @IsOptional() @IsString() @MaxLength(100)
  contactEmail?: string;
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
  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsString()
  role?: string;
}

export class ExportOrdersDto {
  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  type?: string;
}

export class ExportContentsDto {
  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsString()
  type?: string;
}

export class ExportAuditLogsDto {
  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsString()
  action?: string;
}

export class ExportEarningsDto {
  @IsOptional() @IsString()
  stationId?: string;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
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

  @IsOptional() @IsDateString()
  startTime?: string;

  @IsOptional() @IsDateString()
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

  @IsOptional() @IsDateString()
  startTime?: string;

  @IsOptional() @IsDateString()
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
