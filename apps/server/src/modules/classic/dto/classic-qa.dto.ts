import { IsString, IsArray, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ClassicQaDto {
  @ApiProperty({ description: "用户问题", example: "什么是仁？" })
  @IsString()
  question!: string;

  @ApiPropertyOptional({ description: "对话历史（多轮对话上下文）" })
  @IsOptional()
  @IsArray()
  history?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}
