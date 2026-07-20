import { IsString, IsOptional, IsEnum, IsInt, IsArray, ArrayMinSize, Min, MinLength, IsDateString, IsBoolean, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { MemberLevel, RoleType, UserStatus } from "@prisma/client";

export class AssignRoleDto {
  @IsEnum(RoleType)
  roleType: RoleType;

  @IsOptional() @IsString()
  bindId?: string;
}

export class RemoveRoleDto {
  @IsOptional() @IsString()
  bindId?: string;
}

export class UserListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number;

  @IsOptional() @IsString()
  keyword?: string;

  @IsOptional() @IsEnum(RoleType)
  roleType?: RoleType;

  @IsOptional() @IsEnum(MemberLevel)
  memberLevel?: MemberLevel;

  @IsOptional() @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional() @IsDateString()
  dateFrom?: string;

  @IsOptional() @IsDateString()
  dateTo?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString()
  nickname?: string;

  @IsOptional() @IsString()
  avatar?: string;

  @IsOptional() @IsString()
  bio?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  gender?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  interestCategories?: string[];
}

export class UpdateUserStatusDto {
  @IsString()
  @MinLength(1)
  status: string;

  /** 封禁/解封理由（可选·落 AuditLog 并通知用户） */
  @IsOptional() @IsString()
  reason?: string;
}

export class BatchUpdateUserStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];

  @IsString()
  @MinLength(1)
  status: string;

  /** 批量封禁/解封理由（可选·落 AuditLog 并通知用户） */
  @IsOptional() @IsString()
  reason?: string;
}

export class PushByTagDto {
  /**
   * 真实用户标签（UserTag 表·如 active_7d/pay_once/whale，见 push-audience.service.ts）。
   * 可选：不传则必须带 memberLevel/activeDays；全员推送必须显式传 "ALL"（防误推）。
   */
  @IsOptional() @IsString()
  tag?: string;

  @IsOptional() @IsString()
  memberLevel?: string;

  @IsOptional() @Type(() => Number)
  activeDays?: number;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;
}

export class AddWhitelistDto {
  @IsString()
  @MinLength(1)
  userId: string;
}

export const NOTIFY_SETTING_KEYS = [
  "message", "course", "live", "interact", "system", "marketingSms",
] as const;

export class UpdateNotifySettingsDto {
  @IsString() @IsIn(NOTIFY_SETTING_KEYS)
  key: string;

  @IsBoolean()
  value: boolean;
}
