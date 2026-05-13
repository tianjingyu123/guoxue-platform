import { IsString, IsOptional, IsBoolean, IsObject, IsIn, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const TASK_TYPES = ["CODE_DEVELOP", "BUG_FIX", "DATA_ANALYSIS", "USER_FEEDBACK", "CONTENT_REVIEW", "FINANCE_CHECK", "SYSTEM_HEALTH", "SCHEDULED_TASK"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "NEEDS_REVIEW", "CANCELLED"] as const;
const EXECUTOR_TYPES = ["CLAUDE", "HUMAN"] as const;

export class CreateTaskDto {
  @ApiProperty({ description: "任务类型", enum: TASK_TYPES })
  @IsIn(TASK_TYPES)
  type: string;

  @ApiPropertyOptional({ description: "优先级", enum: PRIORITIES })
  @IsOptional() @IsIn(PRIORITIES)
  priority?: string;

  @ApiProperty({ description: "任务标题" })
  @IsString() @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "任务描述" })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "执行者类型", default: "CLAUDE", enum: EXECUTOR_TYPES })
  @IsOptional() @IsIn(EXECUTOR_TYPES)
  executorType?: string;

  @ApiPropertyOptional({ description: "执行者ID" })
  @IsOptional() @IsString()
  executorId?: string;

  @ApiPropertyOptional({ description: "任务数据快照" })
  @IsOptional() @IsObject()
  snapshot?: Record<string, any>;

  @ApiPropertyOptional({ description: "需审批" })
  @IsOptional() @IsBoolean()
  needsApproval?: boolean;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: "任务状态", enum: TASK_STATUSES })
  @IsOptional() @IsIn(TASK_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: "优先级", enum: PRIORITIES })
  @IsOptional() @IsIn(PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({ description: "执行结果" })
  @IsOptional() @IsObject()
  result?: Record<string, any>;

  @ApiPropertyOptional({ description: "错误日志" })
  @IsOptional() @IsString()
  errorLog?: string;

  @ApiPropertyOptional({ description: "执行者ID" })
  @IsOptional() @IsString()
  executorId?: string;
}

export class QueryTaskDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional({ description: "每页条数", default: 20 })
  @IsOptional() @IsString()
  pageSize?: string;

  @ApiPropertyOptional({ description: "状态筛选", enum: TASK_STATUSES })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "类型筛选", enum: TASK_TYPES })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "优先级筛选", enum: PRIORITIES })
  @IsOptional() @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: "执行者类型筛选", enum: EXECUTOR_TYPES })
  @IsOptional() @IsString()
  executorType?: string;

  @ApiPropertyOptional({ description: "需审批筛选" })
  @IsOptional() @IsString()
  needsApproval?: string;
}

export class TransferTaskDto {
  @ApiProperty({ description: "目标执行者类型", enum: EXECUTOR_TYPES })
  @IsIn(EXECUTOR_TYPES)
  toType: string;

  @ApiPropertyOptional({ description: "目标执行者ID" })
  @IsOptional() @IsString()
  toId?: string;

  @ApiProperty({ description: "转交原因" })
  @IsString()
  reason: string;
}

export class ClaimTaskDto {
  @ApiProperty({ description: "认领者类型", enum: EXECUTOR_TYPES })
  @IsIn(EXECUTOR_TYPES)
  executorType: string;

  @ApiPropertyOptional({ description: "认领者ID" })
  @IsOptional() @IsString()
  executorId?: string;
}

export class ApproveTaskDto {
  @ApiProperty({ description: "是否通过" })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ description: "审批备注" })
  @IsOptional() @IsString()
  remark?: string;
}
