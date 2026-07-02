import { IsString, IsDateString, IsOptional, IsInt, IsBoolean, Min, IsObject, MinLength, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

// ─── 通用分页 ───

export class PaginationDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number = 20;
}

// ─── 预警规则 ───

export class CreateRuleDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  type: string;

  @IsObject()
  conditions: Record<string, any>;

  @IsString()
  @MinLength(1)
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
  @ApiPropertyOptional({ description: "规则类型" })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "启用状态" })
  @IsOptional() @IsBoolean()
  enabled?: boolean;
}

// ─── 预警 ───

export class AlertListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "预警类型" })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "预警级别" })
  @IsOptional() @IsString()
  level?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "分站ID" })
  @IsOptional() @IsString()
  stationId?: string;
}

export class HandleAlertDto {
  @IsOptional() @IsString()
  note?: string;
}

export class AlertActionDto {
  @ApiPropertyOptional({ description: "处置动作：ban_user(封禁目标用户)/escalate(升级为严重)" })
  @IsString() @IsIn(["ban_user", "escalate"])
  action: string;

  @ApiPropertyOptional({ description: "处置备注" })
  @IsOptional() @IsString()
  note?: string;
}

// ─── 用户行为时间线 ───

export class UserTimelineQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "行为类型（子串匹配，如 ORDER/LOGIN）" })
  @IsOptional() @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "起始时间（ISO 字符串）" })
  @IsOptional() @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: "截止时间（ISO 字符串）" })
  @IsOptional() @IsDateString()
  dateTo?: string;
}

// ─── 刷单检测 ───

export class FraudDetectionListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "分站ID" })
  @IsOptional() @IsString()
  stationId?: string;
}

// ─── 申诉 ───

export class AppealListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "申诉状态" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "申诉类型：USER_BAN/CONTENT_BLOCK/WITHDRAWAL_REJECT" })
  @IsOptional() @IsString()
  type?: string;
}

export class RejectAppealDto {
  @IsString()
  @MinLength(1)
  reviewNote: string;
}

// ─── 设备指纹 ───

export class DeviceFingerprintQueryDto {
  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsString()
  deviceId?: string;
}
