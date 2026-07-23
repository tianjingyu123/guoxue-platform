import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsNumber, IsArray, IsDateString, IsIn, IsUrl, Min, Max, MinLength, MaxLength, ValidateIf } from "class-validator";
import { Type, Transform } from "class-transformer";

export enum CourseType {
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  TEXT = "TEXT",
  EBOOK = "EBOOK",
  COMBO = "COMBO",
}

const PERSISTENT_MEDIA_URL_OPTIONS = {
  protocols: ["http", "https"],
  require_protocol: true,
  require_tld: false,
};

export class CreateCourseDto {
  @ApiPropertyOptional({ description: "关联圈子ID" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiProperty({ description: "课程标题" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional()
  @ValidateIf((_o, value) => value !== "")
  @IsString()
  @IsUrl(PERSISTENT_MEDIA_URL_OPTIONS, { message: "封面图仅支持持久化 http/https 地址" })
  cover?: string;

  @ApiPropertyOptional({ description: "课程简介" })
  @IsOptional() @IsString()
  intro?: string;

  @ApiPropertyOptional({ description: "课程类型", enum: CourseType, default: "VIDEO" })
  @IsOptional() @IsEnum(CourseType)
  type?: CourseType;

  @ApiPropertyOptional({ description: "售价（元），0=免费", default: 0 })
  @IsOptional() @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: "原价（元）" })
  @IsOptional() @IsNumber()
  originalPrice?: number;

  @ApiPropertyOptional({ description: "所属分站ID" })
  @IsOptional() @IsString()
  stationId?: string;

  @ApiPropertyOptional({ description: "标签列表" })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "一级品类" })
  @IsOptional() @IsString()
  categoryLevel1?: string;

  @ApiPropertyOptional({ description: "二级品类" })
  @IsOptional() @IsString()
  categoryLevel2?: string;

  @ApiPropertyOptional({ description: "购买后有效期（天），0=永久", default: 0 })
  @IsOptional() @IsInt()
  validityDays?: number;

  @ApiPropertyOptional({ description: "开放范围：CIRCLE_ONLY=仅本圈（默认）/ PLATFORM=全平台（需平台审核）", enum: ["CIRCLE_ONLY", "PLATFORM"] })
  @IsOptional() @IsIn(["CIRCLE_ONLY", "PLATFORM"])
  visibility?: "CIRCLE_ONLY" | "PLATFORM";

  @ApiPropertyOptional({ description: "课程介绍详情图（最多6张·展示在课程详情页介绍区）" })
  @IsOptional() @IsArray() @IsString({ each: true })
  @IsUrl(PERSISTENT_MEDIA_URL_OPTIONS, { each: true, message: "详情图仅支持持久化 http/https 地址" })
  detailImages?: string[];

  @ApiPropertyOptional({ description: "定时发布时间" })
  @IsOptional() @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: "定时上架时间（到点自动 APPROVED·null/空串=清除）" })
  @IsOptional() @ValidateIf((o) => o.scheduledOnAt !== null && o.scheduledOnAt !== "") @IsDateString()
  scheduledOnAt?: string | null;

  @ApiPropertyOptional({ description: "定时下架时间（到点自动 DRAFT·null/空串=清除）" })
  @IsOptional() @ValidateIf((o) => o.scheduledOffAt !== null && o.scheduledOffAt !== "") @IsDateString()
  scheduledOffAt?: string | null;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: "课程标题" })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional()
  @ValidateIf((_o, value) => value !== "")
  @IsString()
  @IsUrl(PERSISTENT_MEDIA_URL_OPTIONS, { message: "封面图仅支持持久化 http/https 地址" })
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

  @ApiPropertyOptional({ description: "标签列表" })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "一级品类" })
  @IsOptional() @IsString()
  categoryLevel1?: string;

  @ApiPropertyOptional({ description: "二级品类" })
  @IsOptional() @IsString()
  categoryLevel2?: string;

  @ApiPropertyOptional({ description: "购买后有效期（天），0=永久" })
  @IsOptional() @IsInt()
  validityDays?: number;

  @ApiPropertyOptional({ description: "定时发布时间" })
  @IsOptional() @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: "关联圈子ID" })
  @IsOptional() @IsString()
  circleId?: string;

  @ApiPropertyOptional({ description: "所属分站ID" })
  @IsOptional() @IsString()
  stationId?: string;

  @ApiPropertyOptional({ description: "课程介绍详情图（最多6张·2026-07-11 编辑器重做：whitelist 会 strip 未声明字段，DTO 必须显式声明）" })
  @IsOptional() @IsArray() @IsString({ each: true })
  @IsUrl(PERSISTENT_MEDIA_URL_OPTIONS, { each: true, message: "详情图仅支持持久化 http/https 地址" })
  detailImages?: string[];

  @ApiPropertyOptional({ description: "开放范围：CIRCLE_ONLY=仅本圈 / PLATFORM=全平台", enum: ["CIRCLE_ONLY", "PLATFORM"] })
  @IsOptional() @IsIn(["CIRCLE_ONLY", "PLATFORM"])
  visibility?: "CIRCLE_ONLY" | "PLATFORM";

  @ApiPropertyOptional({ description: "定时上架时间（到点自动 APPROVED·null/空串=清除）" })
  @IsOptional() @ValidateIf((o) => o.scheduledOnAt !== null && o.scheduledOnAt !== "") @IsDateString()
  scheduledOnAt?: string | null;

  @ApiPropertyOptional({ description: "定时下架时间（到点自动 DRAFT·null/空串=清除）" })
  @IsOptional() @ValidateIf((o) => o.scheduledOffAt !== null && o.scheduledOffAt !== "") @IsDateString()
  scheduledOffAt?: string | null;
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
  @Max(100)
  progress: number;
}

export class SubmitWorkDto {
  @ApiProperty({ description: "作业内容" })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({ description: "图片URL列表" })
  @IsOptional()
  @IsArray()
  images?: string[];
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

  @ApiPropertyOptional({ description: "课程类型筛选" })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "标题关键词搜索" })
  @IsOptional() @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "一级品类(categoryLevel1)" })
  @IsOptional() @IsString()
  categoryLevel1?: string;

  @ApiPropertyOptional({ description: "排序: recommend/popular(学习人数) / newest(默认,最新) / price-asc(价格升序)" })
  @IsOptional() @IsString()
  sort?: string;

  @ApiPropertyOptional({ description: "仅看免费课程(price=0)" })
  @IsOptional() @Transform(({ value }) => value === "true" || value === true) @IsBoolean()
  free?: boolean;

  @ApiPropertyOptional({ description: "价格区间下限(元·含)" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: "价格区间上限(元·含)" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  maxPrice?: number;
}

// ═══════════════════ 课程购买 ═══════════════════

export class PurchaseCourseDto {
  @ApiPropertyOptional({ description: "优惠券ID" })
  @IsOptional() @IsString()
  couponId?: string;

  @ApiPropertyOptional({ description: "推荐人ID" })
  @IsOptional() @IsString()
  referrerId?: string;

  @ApiPropertyOptional({ description: "最近一次分享链接推荐人ID（7天临时归因，优先于永久归属）" })
  @IsOptional() @IsString()
  tempReferrerId?: string;
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

// ═══════════════════ 课程问答 ═══════════════════

export class AskQuestionDto {
  @ApiProperty({ description: "问题内容" })
  @IsString()
  @MinLength(1)
  question: string;

  @ApiPropertyOptional({ description: "关联章节ID" })
  @IsOptional() @IsString()
  chapterId?: string;
}

export class AnswerQuestionDto {
  @ApiProperty({ description: "回答内容" })
  @IsString()
  @MinLength(1)
  answer: string;
}

export class QaListQueryDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: "章节ID筛选" })
  @IsOptional() @IsString()
  chapterId?: string;

  @ApiPropertyOptional({ description: "状态筛选：PENDING/ANSWERED/CLOSED" })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "标签筛选" })
  @IsOptional() @IsString()
  tag?: string;
}
