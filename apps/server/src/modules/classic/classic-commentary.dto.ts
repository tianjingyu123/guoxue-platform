import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class CreateCommentaryDto {
  @ApiProperty({ description: "关联经典书籍 ID" })
  @IsString()
  bookId: string;

  @ApiPropertyOptional({ description: "关联章节 ID" })
  @IsOptional()
  @IsString()
  chapterId?: string;

  @ApiProperty({ description: "注解标题" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "作者" })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: "朝代" })
  @IsOptional()
  @IsString()
  dynasty?: string;

  @ApiPropertyOptional({ description: "学派（儒/道/释等）" })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ description: "类型（注释/翻译/解读/论文/讲义）" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: "注解正文" })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: "来源链接" })
  @IsOptional()
  @IsString()
  sourceUrl?: string;
}

export class UpdateCommentaryDto {
  @ApiPropertyOptional({ description: "注解标题" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "注解正文" })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "类型" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "学派" })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional()
  @IsString()
  status?: string;
}
