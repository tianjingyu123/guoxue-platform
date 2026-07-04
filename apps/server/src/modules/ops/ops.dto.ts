import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export const OPS_TASK_TYPES = ["INSPECT", "FIX", "REVIEW", "OPS"] as const;
export const OPS_TASK_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export const OPS_TASK_STATUSES = ["pending", "in_progress", "completed", "needs_review"] as const;

export type OpsTaskType = (typeof OPS_TASK_TYPES)[number];
export type OpsTaskPriority = (typeof OPS_TASK_PRIORITIES)[number];
export type OpsTaskStatus = (typeof OPS_TASK_STATUSES)[number];

export class QueryOpsTaskDto {
  @IsOptional() @IsIn(OPS_TASK_STATUSES)
  status?: OpsTaskStatus;

  @IsOptional() @IsIn(OPS_TASK_TYPES)
  type?: OpsTaskType;

  @IsOptional() @IsIn(OPS_TASK_PRIORITIES)
  priority?: OpsTaskPriority;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

export class CreateOpsTaskDto {
  @IsIn(OPS_TASK_TYPES)
  type: OpsTaskType;

  @IsString() @MinLength(1) @MaxLength(200)
  title: string;

  @IsOptional() @IsIn(OPS_TASK_PRIORITIES)
  priority?: OpsTaskPriority;

  @IsOptional() @IsObject()
  payload?: Record<string, any>;

  @IsOptional() @IsBoolean()
  needsApproval?: boolean;
}

export class ClaimOpsTaskDto {
  /** 认领者标识（缺省=当前登录用户；数字员工传 "CLAUDE"） */
  @IsOptional() @IsString() @MaxLength(64)
  executor?: string;
}

export class CompleteOpsTaskDto {
  @IsOptional() @IsObject()
  result?: Record<string, any>;
}

export class ReviewOpsTaskDto {
  /** 转人工复核原因 */
  @IsString() @MinLength(1) @MaxLength(500)
  reason: string;
}
