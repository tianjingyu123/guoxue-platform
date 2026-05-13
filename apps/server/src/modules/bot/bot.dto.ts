import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, MinLength } from "class-validator";

export class CreateBotDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  type: string;

  @IsOptional() @IsString()
  avatar?: string;

  @IsOptional() @IsString()
  intro?: string;

  @IsString()
  @MinLength(1)
  botId: string;

  @IsString()
  @MinLength(1)
  apiKey: string;

  @IsOptional() @IsBoolean()
  isFree?: boolean;

  @IsOptional() @IsInt()
  dailyLimit?: number;

  @IsOptional() @IsNumber()
  price?: number;

  @IsOptional() @IsNumber()
  monthlyPrice?: number;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  voiceEnabled?: boolean;
}

export class UpdateBotDto {
  @IsOptional() @IsString()
  apiKey?: string;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  avatar?: string;

  @IsOptional() @IsString()
  intro?: string;

  @IsOptional() @IsBoolean()
  isFree?: boolean;

  @IsOptional() @IsInt()
  dailyLimit?: number;

  @IsOptional() @IsNumber()
  price?: number;

  @IsOptional() @IsNumber()
  monthlyPrice?: number;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  voiceEnabled?: boolean;
}

export class BindBotToCircleDto {
  @IsString()
  @MinLength(1)
  circleId: string;

  @IsOptional() @IsString()
  knowledgeBaseId?: string;
}

export class AddKnowledgeDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional() @IsString()
  sourceType?: string;

  @IsOptional() @IsString()
  sourceId?: string;
}

export class ChatDto {
  @IsString()
  @MinLength(1)
  query: string;

  @IsOptional() @IsString()
  conversationId?: string;

  @IsOptional() @IsBoolean()
  stream?: boolean;
}

// ───────── 圈主助理管理 DTO ─────────

export class AddBotKnowledgeItemDto {
  @IsString()
  @MinLength(1)
  question: string;

  @IsString()
  @MinLength(1)
  answer: string;
}

export class UpdateBotKnowledgeItemDto {
  @IsOptional() @IsString()
  question?: string;

  @IsOptional() @IsString()
  answer?: string;
}

// ───────── 工作流 / 同步 DTO ─────────

export class RunWorkflowDto {
  @IsString()
  @MinLength(1)
  workflowId: string;

  @IsOptional() @IsString()
  botConfigId?: string;

  @IsOptional()
  parameters?: Record<string, unknown>;
}
