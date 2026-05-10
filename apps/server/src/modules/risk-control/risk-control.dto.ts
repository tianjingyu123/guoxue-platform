import { IsString, IsOptional, IsInt, IsBoolean, Min, IsObject } from "class-validator";
import { Type } from "class-transformer";

// ─── 通用分页 ───

export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number = 20;
}

// ─── 预警规则 ───

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsObject()
  conditions: Record<string, any>;

  @IsString()
  action: string;

  @IsOptional() @IsBoolean()
  enabled?: boolean;
}

export class UpdateRuleDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsObject()
  conditions?: Record<string, any>;

  @IsOptional() @IsString()
  action?: string;

  @IsOptional() @IsBoolean()
  enabled?: boolean;
}

export class RuleListQueryDto extends PaginationDto {
  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsBoolean()
  enabled?: boolean;
}

// ─── 预警 ───

export class AlertListQueryDto extends PaginationDto {
  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsString()
  level?: string;

  @IsOptional() @IsString()
  status?: string;
}

export class HandleAlertDto {
  @IsOptional() @IsString()
  note?: string;
}

// ─── 刷单检测 ───

export class FraudDetectionListQueryDto extends PaginationDto {
  @IsOptional() @IsString()
  status?: string;
}

// ─── 申诉 ───

export class AppealListQueryDto extends PaginationDto {
  @IsOptional() @IsString()
  status?: string;
}

export class RejectAppealDto {
  @IsString()
  reviewNote: string;
}

// ─── 设备指纹 ───

export class DeviceFingerprintQueryDto {
  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsString()
  deviceId?: string;
}
