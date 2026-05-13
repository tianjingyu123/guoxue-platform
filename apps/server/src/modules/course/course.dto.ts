import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsNumber, Min, Max, MinLength } from "class-validator";
import { Type } from "class-transformer";

export enum CourseType {
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  TEXT = "TEXT",
  EBOOK = "EBOOK",
  COMBO = "COMBO",
}

export class CreateCourseDto {
  @ApiPropertyOptional({ description: "关联圈子ID" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiProperty({ description: "课程标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "课程简介" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ description: "课程类型", enum: CourseType, default: "VIDEO" })
  @IsOptional() @IsEnum(CourseType)
  type?: CourseType;

  @ApiPropertyOptional({ description: "售价（分），0=免费", default: 0 })
  @IsOptional() @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: "原价（分）" })
  @IsOptional() @IsNumber()
  originalPrice?: number;

  @ApiPropertyOptional({ description: "所属分站ID" })
  @IsOptional() @IsString()
  stationId?: string;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: "课程标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional() @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: "课程简介" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ description: "课程类型" })
  @IsOptional() @IsEnum(CourseType)
  type?: CourseType;

  @ApiPropertyOptional({ description: "售价" })
  @IsOptional() @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: "原价" })
  @IsOptional() @IsNumber()
  originalPrice?: number;
}

export class CreateChapterDto {
  @ApiProperty({ description: "章节标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "章节内容" })
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "媒体资源URL（视频/音频）" })
  @IsOptional() @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: "时长（秒）" })
  @IsOptional() @IsInt()
  duration?: number;

  @ApiPropertyOptional({ description: "排序号", default: 0 })
  @IsOptional() @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: "是否免费试看", default: false })
  @IsOptional() @IsBoolean()
  freeTrial?: boolean;
}

export class UpdateChapterDto {
  @ApiPropertyOptional({ description: "章节标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "章节内容" })
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "媒体资源URL" })
  @IsOptional() @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: "时长（秒）" })
  @IsOptional() @IsInt()
  duration?: number;

  @ApiPropertyOptional({ description: "排序号" })
  @IsOptional() @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: "是否免费" })
  @IsOptional() @IsBoolean()
  freeTrial?: boolean;
}

export class UpdateProgressDto {
  @ApiProperty({ description: "进度百分比 0-100", minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  progress: number;
}

export class SubmitWorkDto {
  @ApiProperty({ description: "作业内容" })
  @IsString()
  @MinLength(1)
  content: string;
}

export class CourseListQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({ description: "圈子ID筛选" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiPropertyOptional({ description: "审核状态" })
  @IsOptional() @IsString()
  auditStatus?: string;

  @ApiPropertyOptional({ description: "状态筛选（前端兼容字段，等同auditStatus）" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "分站ID" })
  @IsOptional() @IsString()
  stationId?: string;

  @ApiPropertyOptional({ description: "标题关键词搜索" })
  @IsOptional() @IsString()
  keyword?: string;
}

// ═══════════════════ 课程购买 ═══════════════════

export class PurchaseCourseDto {
  @ApiPropertyOptional({ description: "优惠券ID" })
  @IsOptional() @IsString()
  couponId?: string;

  @ApiPropertyOptional({ description: "推荐人ID" })
  @IsOptional() @IsString()
  referrerId?: string;
}

// ═══════════════════ 课程评价 ═══════════════════

export class CreateReviewDto {
  @ApiProperty({ description: "评分 1-5", minimum: 1, maximum: 5 })
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiProperty({ description: "评价内容" })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: "订单ID" })
  @IsOptional() @IsString()
  orderId?: string;
}

export class ReviewListQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}
