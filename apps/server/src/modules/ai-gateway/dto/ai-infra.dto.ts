import { IsString, IsOptional, IsArray, IsNumber, IsObject, IsIn } from "class-validator";
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
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: "每页数量", default: 50 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: "偏移量", default: 0 })
  @IsOptional()
  @IsNumber()
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

export class RecordDecisionDto {
  @ApiProperty({ description: "Agent 标识" })
  @IsString()
  agentId: string;

  @ApiPropertyOptional({ description: "关联能力ID" })
  @IsOptional()
  @IsString()
  capabilityId?: string;

  @ApiProperty({ description: "模型ID" })
  @IsString()
  modelId: string;

  @ApiProperty({ description: "模型版本" })
  @IsString()
  modelVersion: string;

  @ApiProperty({ description: "输入摘要（脱敏）" })
  @IsString()
  inputSummary: string;

  @ApiProperty({ description: "使用的上下文字段" })
  @IsArray()
  @IsString({ each: true })
  contextKeys: string[];

  @ApiPropertyOptional({ description: "推理链" })
  @IsOptional()
  @IsObject()
  reasoning?: Record<string, unknown>;

  @ApiProperty({ description: "决策输出" })
  @IsObject()
  output: Record<string, unknown>;

  @ApiProperty({ description: "置信度 0-1" })
  @IsNumber()
  confidence: number;

  @ApiProperty({ description: "风险级别", enum: ["low", "medium", "high"], default: "low" })
  @IsIn(["low", "medium", "high"])
  riskLevel: "low" | "medium" | "high";
}

export class ReviewDecisionDto {
  @ApiProperty({ description: "审核动作", enum: ["approved", "rejected", "modified"] })
  @IsIn(["approved", "rejected", "modified"])
  action: "approved" | "rejected" | "modified";

  @ApiProperty({ description: "审核人" })
  @IsString()
  reviewer: string;

  @ApiPropertyOptional({ description: "审核备注" })
  @IsOptional()
  @IsString()
  note?: string;
}
