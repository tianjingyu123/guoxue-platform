import { IsString, IsOptional, IsIn, IsArray, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRagTemplateDto {
  @ApiProperty({ description: "场景: circle_assistant/customer_service/smart_search/course_assistant" })
  @IsString() @IsIn(["circle_assistant", "customer_service", "smart_search", "course_assistant"])
  scene: string;

  @ApiProperty({ description: "模板名称" })
  @IsString() @MinLength(1)
  templateName: string;

  @ApiProperty({ description: "系统提示词" })
  @IsString() @MinLength(1)
  systemPrompt: string;

  @ApiPropertyOptional({ description: "用户提示词模板（支持 {{variable}} 占位）" })
  @IsOptional() @IsString()
  userPromptTemplate?: string;

  @ApiPropertyOptional({ description: "可用变量列表 [{name, description, required}]" })
  @IsOptional() @IsArray()
  variables?: Record<string, unknown>[];
}

export class UpdateRagTemplateDto {
  @ApiPropertyOptional({ description: "场景" })
  @IsOptional() @IsString() @IsIn(["circle_assistant", "customer_service", "smart_search", "course_assistant"])
  scene?: string;

  @ApiPropertyOptional({ description: "模板名称" })
  @IsOptional() @IsString()
  templateName?: string;

  @ApiPropertyOptional({ description: "系统提示词" })
  @IsOptional() @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ description: "用户提示词模板" })
  @IsOptional() @IsString()
  userPromptTemplate?: string;

  @ApiPropertyOptional({ description: "可用变量列表" })
  @IsOptional() @IsArray()
  variables?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: "状态 ACTIVE/INACTIVE" })
  @IsOptional() @IsString() @IsIn(["ACTIVE", "INACTIVE"])
  status?: string;
}
