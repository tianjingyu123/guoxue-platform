import { IsString, IsOptional, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateZiweiKnowledgeDto {
  @ApiProperty({ description: "标题" })
  @IsString()
  title: string;

  @ApiProperty({ description: "分类: 十四主星/辅星煞星/四化/十二宫/格局/实战案例" })
  @IsString()
  category: string;

  @ApiProperty({ description: "内容（Markdown）" })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: "标签" })
  @IsOptional() @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: "来源" })
  @IsOptional() @IsString()
  source?: string;
}

export class UpdateZiweiKnowledgeDto {
  @ApiPropertyOptional({ description: "标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "分类" })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "内容" })
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "标签" })
  @IsOptional() @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: "来源" })
  @IsOptional() @IsString()
  source?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional() @IsString()
  status?: string;
}
