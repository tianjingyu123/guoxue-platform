import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateIf } from "class-validator";
import { CIRCLE_CAPABILITIES, CircleCapability } from "./circle-capability.policy";

export class CircleCapabilityQueryDto {
  @IsIn(CIRCLE_CAPABILITIES)
  capability: CircleCapability;
}

export class DirectCircleCapabilityContextDto extends CircleCapabilityQueryDto {
  @IsOptional()
  @IsUUID("4")
  subjectUserId?: string;
}

export class ApplyCircleCapabilityDto extends CircleCapabilityQueryDto {
  @IsOptional()
  @IsUUID("4")
  subjectUserId?: string;

  @IsString()
  @MaxLength(500)
  reason: string;
}

export class ReviewCircleCapabilityDto {
  @IsIn(["APPROVE", "REJECT", "SUSPEND", "RESUME", "REVOKE"])
  action: "APPROVE" | "REJECT" | "SUSPEND" | "RESUME" | "REVOKE";

  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedRevision: number;

  @IsString()
  @MaxLength(500)
  reason: string;

  @ValidateIf(o => o.action === "APPROVE")
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  expiresAt?: string;

  @ValidateIf(o => o.action === "APPROVE")
  @IsInt()
  @Min(1)
  @Max(2147483647)
  maxUnits?: number;

  @ValidateIf(o => o.action === "APPROVE")
  @IsInt()
  @Min(1)
  @Max(2147483647)
  maxConcurrent?: number;
}

export class DirectCircleCapabilityDto extends ApplyCircleCapabilityDto {
  @IsOptional()
  @IsUUID("4")
  expectedLatestId?: string;

  @IsInt()
  @Min(0)
  @Max(2147483646)
  expectedLatestRevision: number;

  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  expiresAt: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  maxUnits: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  maxConcurrent: number;
}

export class EnableCircleCapabilityDto {
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedRevision: number;

  @IsBoolean()
  enabled: boolean;

  @IsString()
  @MaxLength(500)
  reason: string;
}

export class ListCircleCapabilitiesDto {
  @IsOptional()
  @IsIn(CIRCLE_CAPABILITIES)
  capability?: CircleCapability;

  @IsOptional()
  @IsIn(["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "REVOKED"])
  state?: string;

  @IsOptional()
  @IsUUID("4")
  circleId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
