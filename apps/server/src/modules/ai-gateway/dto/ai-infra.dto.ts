import { Type } from "class-transformer";
import { IsString, IsDateString, IsOptional, IsArray, IsNumber, IsInt, IsObject, IsIn, IsBoolean, IsNotEmpty, Min, Max, MaxLength, ValidateNested } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PublishEventDto {
  @ApiProperty({ description: "事件类型，如 user.registered / order.paid / system.error_burst" })
  @IsString()
  type: string;

  @ApiProperty({ description: "来源维度", enum: ["user", "admin", "marketing", "ops", "dev"] })
  @IsIn(["user", "admin", "marketing", "ops", "dev"])
  source: "user" | "admin" | "marketing" | "ops" | "dev";

  @ApiPropertyOptional({ description: "严重级别", enum: ["info", "warning", "critical"], default: "info" })
  @IsOptional()
  @IsIn(["info", "warning", "critical"])
  severity?: "info" | "warning" | "critical";

  @ApiProperty({ description: "事件载荷" })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({ description: "上下文信息" })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class QueryEventDto {
  @ApiPropertyOptional({ description: "事件类型" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "来源维度" })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: "严重级别" })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "开始日期" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "每页数量", default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: "偏移量", default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class RegisterCapabilityDto {
  @ApiProperty({ description: "能力名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "中文描述" })
  @IsString()
  description: string;

  @ApiProperty({ description: "适用场景" })
  @IsArray()
  @IsString({ each: true })
  scene: string[];

  @ApiProperty({ description: "模态" })
  @IsArray()
  @IsString({ each: true })
  modality: string[];

  @ApiProperty({ description: "能力类型", enum: ["generation", "analysis", "detection", "recommendation"] })
  @IsIn(["generation", "analysis", "detection", "recommendation"])
  capabilityType: "generation" | "analysis" | "detection" | "recommendation";

  @ApiProperty({ description: "提供者" })
  @IsString()
  provider: string;

  @ApiProperty({ description: "模型" })
  @IsString()
  model: string;

  @ApiProperty({ description: "输入 JSON Schema" })
  @IsObject()
  inputSchema: Record<string, unknown>;

  @ApiProperty({ description: "输出 JSON Schema" })
  @IsObject()
  outputSchema: Record<string, unknown>;

  @ApiPropertyOptional({ description: "单次调用成本" })
  @IsOptional()
  @IsNumber()
  costPerCall?: number;
}

export class SetCapabilityStatusDto {
  @ApiProperty({ description: "能力状态", enum: ["active", "degraded", "offline"] })
  @IsIn(["active", "degraded", "offline"])
  status: "active" | "degraded" | "offline";
}

export class RegisterAnomalyRuleDto {
  @ApiProperty({ description: "规则ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "监测指标" })
  @IsString()
  metric: string;

  @ApiProperty({ description: "维度", enum: ["revenue", "user", "content", "performance"] })
  @IsIn(["revenue", "user", "content", "performance"])
  dimension: "revenue" | "user" | "content" | "performance";

  @ApiPropertyOptional({ description: "只检测上升、下降或双向偏离", enum: ["up", "down", "both"] })
  @IsOptional()
  @IsIn(["up", "down", "both"])
  direction?: "up" | "down" | "both";

  @ApiProperty({ description: "基线窗口（天数）", minimum: 1, maximum: 365 })
  @IsNumber()
  @Min(1)
  @Max(365)
  baselineWindow: number;

  @ApiProperty({ description: "偏差阈值（标准差倍数）", minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  deviationThreshold: number;

  @ApiProperty({ description: "严重级别", enum: ["info", "warning", "critical"] })
  @IsIn(["info", "warning", "critical"])
  severity: "info" | "warning" | "critical";

  @ApiProperty({ description: "是否启用" })
  @IsBoolean()
  enabled: boolean;
}

export class ReviewDecisionDto {
  @ApiProperty({ description: "审核动作", enum: ["approved", "rejected", "modified"] })
  @IsIn(["approved", "rejected", "modified"])
  action: "approved" | "rejected" | "modified";

  @ApiPropertyOptional({ description: "审核备注" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class QueryDecisionDto {
  @ApiPropertyOptional({ description: "智能体标识" })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  agentId?: string;

  @ApiPropertyOptional({ description: "能力标识" })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  capabilityId?: string;

  @ApiPropertyOptional({ description: "风险级别", enum: ["low", "medium", "high"] })
  @IsOptional()
  @IsIn(["low", "medium", "high"])
  riskLevel?: "low" | "medium" | "high";

  @ApiPropertyOptional({ description: "人工审核结论", enum: ["pending", "approved", "rejected", "modified"] })
  @IsOptional()
  @IsIn(["pending", "approved", "rejected", "modified"])
  humanAction?: "pending" | "approved" | "rejected" | "modified";

  @ApiPropertyOptional({ description: "开始日期" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "每页数量", default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: "偏移量", default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class CompareDecisionModelsDto {
  @ApiProperty({ description: "模型 A 标识" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  modelA: string;

  @ApiProperty({ description: "模型 B 标识" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  modelB: string;

  @ApiProperty({ description: "智能体标识" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agentId: string;
}

// ─────────── 人机协作协议 DTO ───────────
// 注意：操作人字段（proposedBy/reviewer/executor/operator）一律由 req.user.id 注入，
// 不在 DTO 中接收，防止审计字段被伪造。

export class ProposeCollaborationDto {
  @ApiProperty({ description: "建议类型" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type: string;

  @ApiProperty({ description: "标题" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: "详细描述" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ description: "置信度 0-1" })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: "影响范围" })
  @IsObject()
  impactScope: Record<string, unknown>;

  @ApiPropertyOptional({ description: "备选方案" })
  @IsOptional()
  @IsArray()
  alternatives?: Array<{ option: string; description: string; score: number }>;

  @ApiProperty({ description: "风险级别", enum: ["low", "medium", "high"] })
  @IsIn(["low", "medium", "high"])
  riskLevel: "low" | "medium" | "high";

  @ApiProperty({ description: "执行计划" })
  @IsObject()
  executionPlan: Record<string, unknown>;

  @ApiPropertyOptional({ description: "回滚计划" })
  @IsOptional()
  @IsObject()
  rollbackPlan?: Record<string, unknown>;
}

export class CollaborationModificationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsObject()
  executionPlan?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  rollbackPlan?: Record<string, unknown>;
}

export class ReviewCollaborationDto {
  @ApiProperty({ description: "审核动作", enum: ["approved", "rejected", "modified"] })
  @IsIn(["approved", "rejected", "modified"])
  action: "approved" | "rejected" | "modified";

  @ApiPropertyOptional({ description: "修改内容" })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CollaborationModificationsDto)
  modifications?: CollaborationModificationsDto;

  @ApiPropertyOptional({ description: "审核备注" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RollbackCollaborationDto {
  @ApiProperty({ description: "回滚原因" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class FeedbackCollaborationDto {
  @ApiProperty({ description: "评分" })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: "评价备注" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class QueryCollaborationDto {
  @IsOptional()
  @IsIn(["pending_review", "approved", "rejected", "modified", "executing", "executed", "failed", "rolling_back", "rolled_back", "rollback_failed"])
  status?: string;

  @IsOptional()
  @IsIn(["low", "medium", "high"])
  riskLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  proposedBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  offset?: number;
}

export class RecordOutcomeDto {
  @ApiProperty({ description: "指标名称" })
  @IsString()
  @IsNotEmpty()
  metric: string;

  @ApiProperty({ description: "预期值" })
  @IsNumber()
  expectedValue: number;

  @ApiProperty({ description: "实际值" })
  @IsNumber()
  actualValue: number;
}

export class DataExplorerQueryDto {
  @ApiProperty({ description: "自然语言数据问题", maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;
}
