import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, IsArray } from "class-validator";

export class CreateBotDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional() @IsString()
  avatar?: string;

  @IsOptional() @IsString()
  intro?: string;

  @IsString()
  botId: string;

  @IsString()
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
}

export class UpdateBotDto {
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
}

export class BindBotToCircleDto {
  @IsString()
  circleId: string;

  @IsOptional() @IsString()
  knowledgeBaseId?: string;
}

export class AddKnowledgeDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional() @IsString()
  sourceType?: string;

  @IsOptional() @IsString()
  sourceId?: string;
}

export class ChatDto {
  @IsString()
  query: string;

  @IsOptional() @IsString()
  conversationId?: string;

  @IsOptional() @IsBoolean()
  stream?: boolean;
}

// ───────── 圈主助理管理 DTO ─────────

export class AddBotKnowledgeItemDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;
}

export class UpdateBotKnowledgeItemDto {
  @IsOptional() @IsString()
  question?: string;

  @IsOptional() @IsString()
  answer?: string;
}
