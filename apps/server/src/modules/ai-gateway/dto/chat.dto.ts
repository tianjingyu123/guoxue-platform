import { IsString, IsArray, IsOptional, IsNumber } from "class-validator";

export class ChatDto {
  @IsString()
  scene!: string;

  @IsArray()
  messages!: Array<{ role: "system" | "user" | "assistant"; content: string }>;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  topP?: number;
}
