import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional, IsInt, IsNumber, Min, Max, MinLength } from "class-validator";
import { Type } from "class-transformer";

// ═══════════════ 电子书 CRUD ═══════════════

export class CreateEbookDto {
  @ApiProperty({ description: "书名" })
  @IsString() title: string;

  @ApiPropertyOptional({ description: "作者" })
  @IsOptional() @IsString() author?: string;

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString() cover?: string;

  @ApiPropertyOptional({ description: "简介" })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ description: "分类ID" })
  @IsOptional() @IsString() categoryId?: string;

  @ApiPropertyOptional({ description: "价格", default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() price?: number;

  @ApiPropertyOptional({ description: "原价" })
  @IsOptional() @Type(() => Number) @IsNumber() originalPrice?: number;

  @ApiPropertyOptional({ description: "文件地址" })
  @IsOptional() @IsString() fileUrl?: string;

  @ApiPropertyOptional({ description: "文件类型", default: "PDF" })
  @IsOptional() @IsString() fileType?: string;

  @ApiPropertyOptional({ description: "文件大小(bytes)" })
  @IsOptional() @Type(() => Number) @IsInt() fileSize?: number;

  @ApiPropertyOptional({ description: "语言", default: "zh-CN" })
  @IsOptional() @IsString() language?: string;

  @ApiPropertyOptional({ description: "会员免费读", default: false })
  @IsOptional() @IsBoolean() memberFree?: boolean;

  @ApiPropertyOptional({ description: "版权水印", default: true })
  @IsOptional() @IsBoolean() hasWatermark?: boolean;

  @ApiPropertyOptional({ description: "所属分站ID" })
  @IsOptional() @IsString() stationId?: string;
}

export class UpdateEbookDto {
  @ApiPropertyOptional({ description: "书名" })
  @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ description: "作者" })
  @IsOptional() @IsString() author?: string;

  @ApiPropertyOptional({ description: "封面图" })
  @IsOptional() @IsString() cover?: string;

  @ApiPropertyOptional({ description: "简介" })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ description: "分类ID" })
  @IsOptional() @IsString() categoryId?: string;

  @ApiPropertyOptional({ description: "价格" })
  @IsOptional() @Type(() => Number) @IsNumber() price?: number;

  @ApiPropertyOptional({ description: "原价" })
  @IsOptional() @Type(() => Number) @IsNumber() originalPrice?: number;

  @ApiPropertyOptional({ description: "文件地址" })
  @IsOptional() @IsString() fileUrl?: string;

  @ApiPropertyOptional({ description: "文件类型" })
  @IsOptional() @IsString() fileType?: string;

  @ApiPropertyOptional({ description: "文件大小(bytes)" })
  @IsOptional() @Type(() => Number) @IsInt() fileSize?: number;

  @ApiPropertyOptional({ description: "语言" })
  @IsOptional() @IsString() language?: string;

  @ApiPropertyOptional({ description: "会员免费读" })
  @IsOptional() @IsBoolean() memberFree?: boolean;

  @ApiPropertyOptional({ description: "版权水印" })
  @IsOptional() @IsBoolean() hasWatermark?: boolean;
}

// ═══════════════ 分类 ═══════════════

export class CreateCategoryDto {
  @ApiProperty({ description: "分类名称" })
  @IsString() name: string;

  @ApiPropertyOptional({ description: "排序", default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: "分类名称" })
  @IsOptional() @IsString() name?: string;

  @ApiPropertyOptional({ description: "排序" })
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

// ═══════════════ 章节 ═══════════════

export class CreateChapterDto {
  @ApiProperty({ description: "章节标题" })
  @IsString() title: string;

  @ApiPropertyOptional({ description: "章节内容" })
  @IsOptional() @IsString() content?: string;

  @ApiPropertyOptional({ description: "起始页码", default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() pageStart?: number;

  @ApiPropertyOptional({ description: "结束页码", default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() pageEnd?: number;

  @ApiPropertyOptional({ description: "排序", default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;

  @ApiPropertyOptional({ description: "免费试读", default: false })
  @IsOptional() @IsBoolean() freeTrial?: boolean;
}

export class UpdateChapterDto {
  @ApiPropertyOptional({ description: "章节标题" })
  @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ description: "章节内容" })
  @IsOptional() @IsString() content?: string;

  @ApiPropertyOptional({ description: "起始页码" })
  @IsOptional() @Type(() => Number) @IsInt() pageStart?: number;

  @ApiPropertyOptional({ description: "结束页码" })
  @IsOptional() @Type(() => Number) @IsInt() pageEnd?: number;

  @ApiPropertyOptional({ description: "排序" })
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;

  @ApiPropertyOptional({ description: "免费试读" })
  @IsOptional() @IsBoolean() freeTrial?: boolean;
}

// ═══════════════ 阅读进度 ═══════════════

export class UpdateProgressDto {
  @ApiPropertyOptional({ description: "章节ID" })
  @IsOptional() @IsString() chapterId?: string;

  @ApiPropertyOptional({ description: "阅读进度 0-100" })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) progress?: number;

  @ApiPropertyOptional({ description: "当前页码" })
  @IsOptional() @Type(() => Number) @IsInt() currentPage?: number;
}

// ═══════════════ 书签 ═══════════════

export class CreateBookmarkDto {
  @ApiPropertyOptional({ description: "章节ID" })
  @IsOptional() @IsString() chapterId?: string;

  @ApiProperty({ description: "页码" })
  @Type(() => Number) @IsInt() page: number;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional() @IsString() note?: string;
}

// ═══════════════ 笔记 ═══════════════

export class CreateNoteDto {
  @ApiProperty({ description: "笔记内容" })
  @IsString() content: string;

  @ApiPropertyOptional({ description: "章节ID" })
  @IsOptional() @IsString() chapterId?: string;

  @ApiPropertyOptional({ description: "页码", default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() page?: number;

  @ApiPropertyOptional({ description: "是否公开", default: false })
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class UpdateNoteDto {
  @ApiPropertyOptional({ description: "笔记内容" })
  @IsOptional() @IsString() content?: string;

  @ApiPropertyOptional({ description: "是否公开" })
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

// ═══════════════ 查询 ═══════════════

export class EbookListQueryDto {
  @ApiPropertyOptional({ description: "分类ID" })
  @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ description: "关键词搜索" })
  @IsOptional() @IsString() keyword?: string;
  @ApiPropertyOptional({ description: "状态筛选" })
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

// ═══════════════ 购买 ═══════════════

export class PurchaseEbookDto {
  @ApiPropertyOptional({ description: "优惠券ID" })
  @IsOptional() @IsString() couponId?: string;
}

// ═══════════════ AI ═══════════════

export class TranslateEbookDto {
  @ApiProperty({ description: "待翻译文本" })
  @IsString() text: string;
  @ApiPropertyOptional({ description: "源语言", default: "zh" })
  @IsOptional() @IsString() sourceLang?: string;
  @ApiPropertyOptional({ description: "目标语言", default: "en" })
  @IsOptional() @IsString() targetLang?: string;
}

export class LookupWordDto {
  @ApiProperty({ description: "待查词语" })
  @IsString() text: string;
  @ApiPropertyOptional({ description: "上下文" })
  @IsOptional() @IsString() context?: string;
}

export class CreateReviewDto {
  @ApiProperty({ description: "评分1-5" })
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiProperty({ description: "评价内容" })
  @IsString() @MinLength(2)
  content: string;
}

export class RecordReadingDto {
  @ApiProperty({ description: "电子书ID" })
  @IsString() ebookId: string;

  @ApiProperty({ description: "阅读时长(秒)" })
  @IsInt() @Min(1)
  duration: number;

  @ApiPropertyOptional({ description: "阅读页数" })
  @IsOptional() @IsInt() @Min(0)
  pages?: number;
}
