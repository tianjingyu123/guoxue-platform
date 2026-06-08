import { IsString, IsOptional, IsInt, Min, Max, Length } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBookDto {
  @ApiProperty({ description: "书籍标题", example: "论语" })
  @IsString() title: string;
  @ApiPropertyOptional({ description: "作者/编者", example: "孔子" })
  @IsOptional() @IsString() author?: string;
  @ApiPropertyOptional({ description: "朝代", example: "春秋" })
  @IsOptional() @IsString() dynasty?: string;
  @ApiPropertyOptional({ description: "分类（经/史/子/集/释/道）", example: "经" })
  @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ description: "封面图片URL" })
  @IsOptional() @IsString() cover?: string;
  @ApiPropertyOptional({ description: "简介" })
  @IsOptional() @IsString() intro?: string;
  @ApiPropertyOptional({ description: "版本来源" })
  @IsOptional() @IsString() source?: string;
}

export class UpdateBookDto {
  @ApiPropertyOptional({ description: "书籍标题" })
  @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ description: "作者/编者" })
  @IsOptional() @IsString() author?: string;
  @ApiPropertyOptional({ description: "朝代" })
  @IsOptional() @IsString() dynasty?: string;
  @ApiPropertyOptional({ description: "分类" })
  @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ description: "封面图片URL" })
  @IsOptional() @IsString() cover?: string;
  @ApiPropertyOptional({ description: "简介" })
  @IsOptional() @IsString() intro?: string;
  @ApiPropertyOptional({ description: "版本来源" })
  @IsOptional() @IsString() source?: string;
}

export class CreateChapterDto {
  @ApiProperty({ description: "章节标题", example: "学而篇" })
  @IsString() title: string;
  @ApiProperty({ description: "正文内容" })
  @IsString() content: string;
  @ApiPropertyOptional({ description: "白话译文" })
  @IsOptional() @IsString() translation?: string;
  @ApiPropertyOptional({ description: "注释" })
  @IsOptional() @IsString() annotation?: string;
  @ApiPropertyOptional({ description: "排序序号", example: 1 })
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateChapterDto {
  @ApiPropertyOptional({ description: "章节标题" })
  @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ description: "正文内容" })
  @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional({ description: "白话译文" })
  @IsOptional() @IsString() translation?: string;
  @ApiPropertyOptional({ description: "注释" })
  @IsOptional() @IsString() annotation?: string;
}

export class UpdateProgressDto {
  @ApiProperty({ description: "当前章节ID" })
  @IsString() chapterId: string;
  @ApiProperty({ description: "阅读进度（0-100）", minimum: 0, maximum: 100 })
  @IsInt() @Min(0) progress: number;
}

export class CreateBookmarkDto {
  @ApiProperty({ description: "章节ID" })
  @IsString() chapterId: string;
  @ApiProperty({ description: "文中位置（字符偏移）" })
  @IsInt() position: number;
  @ApiPropertyOptional({ description: "笔记" })
  @IsOptional() @IsString() note?: string;
}

export class UpdateBookmarkDto {
  @ApiPropertyOptional({ description: "文中位置（字符偏移）" })
  @IsOptional() @IsInt() position?: number;
  @ApiPropertyOptional({ description: "笔记" })
  @IsOptional() @IsString() note?: string;
}

export class BookListQueryDto {
  @ApiPropertyOptional({ description: "分类筛选", example: "经" })
  @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ description: "关键词搜索（标题/作者/简介）", example: "论语" })
  @IsOptional() @IsString() keyword?: string;
  @ApiPropertyOptional({ description: "排序字段：createdAt/viewCount/title", default: "createdAt" })
  @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

// ── 字典查询 ──
export class DictionaryLookupDto {
  @ApiProperty({ description: "要查询的字或词", example: "仁", minLength: 1, maxLength: 10 })
  @IsString()
  @Length(1, 10)
  word: string;
}

// ── 文言翻译 ──
export class TranslateDto {
  @ApiProperty({ description: "要翻译的文言文段落", example: "学而时习之，不亦说乎？" })
  @IsString()
  @Length(1, 5000)
  text: string;

  @ApiPropertyOptional({ description: "章节上下文（帮助准确翻译）", example: "论语·学而篇" })
  @IsOptional()
  @IsString()
  context?: string;
}

// ── 注疏标记 ──
export class CreateAnnotationDto {
  @ApiPropertyOptional({ description: "章节ID" })
  @IsOptional() @IsString() chapterId?: string;

  @ApiPropertyOptional({ description: "注疏类型（注疏/夹注/眉批/校勘记）", default: "注疏" })
  @IsOptional() @IsString() type?: string;

  @ApiProperty({ description: "正文起始位置（字符偏移）" })
  @Type(() => Number) @IsInt() @Min(0)
  startPos: number;

  @ApiProperty({ description: "正文结束位置（字符偏移）" })
  @Type(() => Number) @IsInt() @Min(0)
  endPos: number;

  @ApiProperty({ description: "注疏内容" })
  @IsString() content: string;

  @ApiPropertyOptional({ description: "注者" })
  @IsOptional() @IsString() author?: string;

  @ApiPropertyOptional({ description: "注者朝代" })
  @IsOptional() @IsString() dynasty?: string;

  @ApiProperty({ description: "书籍ID" })
  @IsString() bookId: string;
}

// ── 继续阅读 ──
export class ContinueReadingQueryDto {
  @ApiPropertyOptional({ description: "返回数量", default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

// ── 读书笔记 ──
export class CreateNoteDto {
  @ApiProperty({ description: "章节ID" })
  @IsString()
  chapterId: string;

  @ApiProperty({ description: "笔记内容" })
  @IsString()
  content: string;
}

export class UpdateNoteDto {
  @ApiProperty({ description: "笔记内容" })
  @IsString()
  content: string;
}
